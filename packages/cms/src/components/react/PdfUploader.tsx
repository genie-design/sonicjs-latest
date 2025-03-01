import React, { useState, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

interface ProgressMessage {
  message?: string;
  progress?: number;
  error?: string;
  status?: string;
  documentId?: string;
  sessionId?: string;
}

export default function PdfUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Generate a random session ID
  const generateSessionId = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const clearForm = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFile(null);
    setProgress(0);
    setStatus('');
    setError('');
    setLogs([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a PDF file to upload');
      return;
    }

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported');
      return;
    }

    setIsUploading(true);
    setStatus('Starting upload...');
    setLogs([]);
    setError('');

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', generateSessionId());

    try {
      const SERVER_URL = 'http://localhost:8787/api/upload';

      const response = await fetch(SERVER_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // Process the streaming response
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk and split by newlines
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim());

        // Process each line as a JSON message
        for (const line of lines) {
          try {
            const message = JSON.parse(line) as ProgressMessage;

            setLogs((prev) => [...prev, JSON.stringify(message, null, 2)]);

            // Scroll to bottom of log container
            if (logContainerRef.current) {
              logContainerRef.current.scrollTop =
                logContainerRef.current.scrollHeight;
            }

            // Update progress bar if progress is available
            if (message.progress) {
              setProgress(Math.min(message.progress, 100));
            }

            // Update status message
            if (message.message) {
              setStatus(message.message);
            }

            // Handle completion
            if (message.status === 'success') {
              setStatus('Processing complete!');
              setProgress(100);
            }

            // Handle errors
            if (message.error) {
              setError(message.error);
            }
          } catch (e) {
            console.error('Error parsing JSON:', e, line);
            setLogs((prev) => [...prev, `Error parsing: ${line}`]);
          }
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center">
      <div className="bg-base-200/80 container mx-auto flex justify-center rounded-2xl p-8">
        <div className="w-full max-w-lg">
          <h1 className="mb-8 text-center text-3xl font-bold">
            PDF Document Upload
          </h1>

          {error && (
            <div className="alert alert-error mb-4">
              <span className="icon-[solar--danger-circle-bold] text-xl"></span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Upload PDF File</legend>
              <input
                type="file"
                id="file-upload"
                ref={fileInputRef}
                accept="application/pdf"
                onChange={handleFileChange}
                className="file-input file-input-bordered file-input-lg w-full"
                disabled={isUploading}
              />
            </fieldset>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isUploading || !file}
            >
              {isUploading ? 'Processing...' : 'Upload and Process'}
            </button>

            {(isUploading || progress > 0) && (
              <div className="mt-6 space-y-4">
                <h3 className="font-bold">Processing Progress</h3>
                <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="font-semibold">{status}</div>

                <div
                  ref={logContainerRef}
                  className="bg-base-300 h-48 overflow-y-auto rounded-lg p-4 font-mono text-sm whitespace-pre-wrap"
                >
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>

                {!isUploading && progress === 100 && (
                  <button
                    type="button"
                    className="btn btn-outline w-full"
                    onClick={clearForm}
                  >
                    Upload Another File
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
