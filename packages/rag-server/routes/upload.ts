import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getDocumentProxy, extractText } from "unpdf";
import { drizzle } from "drizzle-orm/d1";
import { documentChunks, documents } from "../schema";
import { ulid } from "ulidx";

// Define the environment interface
type Bindings = {
  rate_limiter: KVNamespace;
  GROQ_API_KEY: string;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  R2_BUCKET: R2Bucket;
  DB: D1Database;
  VECTORIZE_INDEX: VectorizeIndex;
  AI: Ai;
};

// Create a new Hono router
const app = new Hono<{ Bindings: Bindings }>();

/**
 * Uploads a file to Cloudflare R2 storage
 */
async function storeFileInR2({
  pdfFile,
  storageContainer,
  sessionIdentifier,
}: {
  pdfFile: File;
  storageContainer: R2Bucket;
  sessionIdentifier: string;
}): Promise<string> {
  // Create a unique key using sessionIdentifier, timestamp, and filename
  const storageKey = `${sessionIdentifier}/${Date.now()}-${pdfFile.name}`;
  await storageContainer.put(storageKey, await pdfFile.arrayBuffer(), {
    httpMetadata: { contentType: pdfFile.type },
  });

  return `${storageKey}`;
}

/**
 * Extracts text content from a PDF file
 */
async function parsePdfContent({
  pdfFile,
}: {
  pdfFile: File;
}): Promise<string> {
  const fileBuffer = await pdfFile.arrayBuffer();
  const pdfDocument = await getDocumentProxy(new Uint8Array(fileBuffer));
  const extractionResult = await extractText(pdfDocument, { mergePages: true });
  // Handle different return types from extractText
  return Array.isArray(extractionResult.text)
    ? extractionResult.text.join(" ")
    : extractionResult.text;
}

/**
 * Inserts document metadata into the database
 */
async function saveDocumentMetadata({
  dbConnection,
  pdfFile,
  extractedContent,
  sessionIdentifier,
  storageUrl,
}: {
  dbConnection: any;
  pdfFile: File;
  extractedContent: string;
  sessionIdentifier: string;
  storageUrl: string;
}) {
  // Create document record with ULID as primary key
  const documentRecord = {
    id: ulid(),
    name: pdfFile.name,
    size: pdfFile.size,
    textContent: extractedContent,
    sessionId: sessionIdentifier,
    r2Url: storageUrl,
  };

  return dbConnection
    .insert(documents)
    .values(documentRecord)
    .returning({ insertedId: documents.id });
}

/**
 * Processes text chunks, generates embeddings, and inserts vectors into the database
 */
async function processAndStoreEmbeddings({
  dbConnection,
  vectorIndex,
  aiService,
  textChunks,
  pdfFile,
  sessionIdentifier,
  documentIdentifier,
  sendProgressUpdate,
}: {
  dbConnection: any;
  vectorIndex: VectorizeIndex;
  aiService: any;
  textChunks: string[];
  pdfFile: File;
  sessionIdentifier: string;
  documentIdentifier: string;
  sendProgressUpdate: (message: any) => Promise<void>;
}) {
  // Process chunks in batches to avoid overwhelming the AI service
  const batchSize = 10;
  const processingTasks = [];
  let completionPercentage = 0;

  for (let i = 0; i < textChunks.length; i += batchSize) {
    const currentBatch = textChunks.slice(i, i + batchSize);

    processingTasks.push(
      (async () => {
        // Generate embeddings for the current batch using Cloudflare AI
        const embeddingResponse = await aiService.run(
          "@cf/baai/bge-large-en-v1.5",
          {
            text: currentBatch,
          }
        );
        const embeddingVectors: number[][] = embeddingResponse.data;

        // Insert chunks into the database and get their IDs
        const chunkInsertResults = await dbConnection
          .insert(documentChunks)
          .values(
            currentBatch.map((chunkText) => ({
              id: ulid(),
              text: chunkText,
              sessionId: sessionIdentifier,
              documentId: documentIdentifier,
            }))
          )
          .returning({ insertedChunkId: documentChunks.id });

        // Extract the inserted chunk IDs
        const chunkIdentifiers = chunkInsertResults.map(
          (result: { insertedChunkId: string }) => result.insertedChunkId
        );

        // Insert vectors into Vectorize index with metadata for retrieval
        await vectorIndex.insert(
          embeddingVectors.map((embedding, index) => ({
            id: chunkIdentifiers[index],
            values: embedding,
            namespace: "default",
            metadata: {
              sessionId: sessionIdentifier,
              documentId: documentIdentifier,
              chunkId: chunkIdentifiers[index],
              text: currentBatch[index],
            },
          }))
        );

        // Update and stream progress to client
        completionPercentage += (batchSize / textChunks.length) * 100;
        await sendProgressUpdate({
          message: `Embedding... (${completionPercentage.toFixed(2)}%)`,
          progress: completionPercentage,
        });
      })()
    );
  }

  // Wait for all batches to complete processing
  await Promise.all(processingTasks);
}

// POST endpoint for file upload with streaming response
app.post("/", async (c) => {
  return streamText(c, async (stream) => {
    try {
      const clientIpAddress = c.req.header("cf-connecting-ip") || "";

      // Basic rate limiting to prevent abuse
      const previousRequestTimestamp =
        await c.env.rate_limiter.get(clientIpAddress);
      if (previousRequestTimestamp) {
        const lastRequestTime = parseInt(previousRequestTimestamp);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (currentTimestamp - lastRequestTime < 3) {
          await stream.write(
            `Too many requests (${currentTimestamp - lastRequestTime}s since last request, ${clientIpAddress})`
          );
          return;
        }
      }

      // Update rate limit timestamp
      await c.env.rate_limiter.put(
        clientIpAddress,
        Math.floor(Date.now() / 1000).toString(),
        {
          expirationTtl: 60, // Expire after 60 seconds
        }
      );

      // Helper function to stream progress updates to client
      const sendProgressUpdate = async (message: any) => {
        await stream.write(JSON.stringify(message) + "\n");
      };

      // Parse form data
      const formData = await c.req.formData();
      const pdfFile = formData.get("file") as File;
      const sessionId = (formData.get("sessionId") as string) || ulid();

      // Validate input
      if (!pdfFile || !(pdfFile instanceof File)) {
        await sendProgressUpdate({ error: "No file provided or invalid file" });
        return;
      }

      if (pdfFile.type !== "application/pdf") {
        await sendProgressUpdate({ error: "Only PDF files are supported" });
        return;
      }

      // Initialize database connection
      const db = drizzle(c.env.DB);

      // Step 1: Upload file to R2
      await sendProgressUpdate({ message: "Uploading file..." });
      const r2Url = await storeFileInR2({
        pdfFile,
        storageContainer: c.env.R2_BUCKET,
        sessionIdentifier: sessionId,
      });

      // Step 2: Extract text from PDF
      await sendProgressUpdate({ message: "Extracting text..." });
      const extractedText = await parsePdfContent({ pdfFile });

      // Step 3: Save document metadata
      await sendProgressUpdate({ message: "Saving document metadata..." });
      const documentResult = await saveDocumentMetadata({
        dbConnection: db,
        pdfFile,
        extractedContent: extractedText,
        sessionIdentifier: sessionId,
        storageUrl: r2Url,
      });

      const documentId = documentResult[0].insertedId;

      // Step 4: Split text into chunks
      await sendProgressUpdate({ message: "Splitting text into chunks..." });
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const textChunks = await textSplitter.splitText(extractedText);

      // Step 5: Process chunks and generate embeddings
      await sendProgressUpdate({
        message: "Processing chunks and generating embeddings...",
        totalChunks: textChunks.length,
      });

      await processAndStoreEmbeddings({
        dbConnection: db,
        vectorIndex: c.env.VECTORIZE_INDEX,
        aiService: c.env.AI,
        textChunks,
        pdfFile,
        sessionIdentifier: sessionId,
        documentIdentifier: documentId,
        sendProgressUpdate,
      });

      // Step 6: Complete
      await sendProgressUpdate({
        message: "Processing complete",
        documentId,
        sessionId,
        status: "success",
      });
    } catch (error) {
      // Handle errors
      await stream.write(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
          status: "error",
        }) + "\n"
      );
    }
  });
});

export default app;
