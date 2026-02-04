import type { Database } from "@bantuanku/db";

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  ENVIRONMENT: string;
  API_URL?: string;
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;
  // Cloudflare bindings (optional)
  CACHE?: KVNamespace;
  STORAGE?: R2Bucket;
  QUEUE?: Queue;
}

export interface Variables {
  db: Database;
  user?: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    whatsappNumber?: string | null;
    roles: string[];
  };
  coordinatorEmployeeId?: string | null;
}
