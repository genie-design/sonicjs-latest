export interface Env {
  D1: D1Database;
  KV?: KVNamespace;
  AUTH_ITERATIONS?: string;
  AUTH_HASH?: 'SHA512' | 'SHA384' | 'SHA256';
  AUTH_KDF?: 'pbkdf2' | 'scrypt';
  JWT_SECRET: string;
}
