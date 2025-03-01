# RAG Server

A Retrieval-Augmented Generation (RAG) server for SonicJS, built on Cloudflare Workers.

## Features

- RAG API endpoint for answering questions based on provided documents
- Document storage and retrieval API
- JWT authentication
- CORS support
- Cloudflare D1 database integration

## API Endpoints

### Health Check

```
GET /health
```

Returns the health status of the server.

### RAG

```
POST /rag
```

Answers a question based on the provided documents or document IDs.

Request body:
```json
{
  "query": "What is RAG?",
  "documents": [
    {
      "id": "doc1",
      "content": "RAG stands for Retrieval-Augmented Generation...",
      "metadata": { "source": "Wikipedia" }
    }
  ],
  "options": {
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

Or using document IDs:
```json
{
  "query": "What is RAG?",
  "documentIds": ["doc1", "doc2"],
  "options": {
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

### Documents

```
POST /documents
```

Upload documents to the database.

Request body:
```json
[
  {
    "id": "doc1",
    "content": "RAG stands for Retrieval-Augmented Generation...",
    "metadata": { "source": "Wikipedia" }
  }
]
```

```
GET /documents
```

Retrieve all documents.

```
GET /documents?id=doc1
```

Retrieve a specific document by ID.

## Development

To run the server locally:

```bash
pnpm dev
```

To deploy to Cloudflare Workers:

```bash
pnpm deploy
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `JWT_SECRET`: Secret for JWT token verification
- `ENVIRONMENT`: Environment name (development, production)

## Database Setup

The server uses Cloudflare D1 for document storage. You need to create a D1 database and update the `database_id` in `wrangler.jsonc`.

Create the necessary tables:

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata TEXT NOT NULL
);
``` 