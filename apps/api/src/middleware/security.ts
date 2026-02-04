import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";

export async function securityHeaders(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  await next();

  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  c.header(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );
}

export async function sanitizeInput(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  if (c.req.method === "POST" || c.req.method === "PUT" || c.req.method === "PATCH") {
    try {
      const contentType = c.req.header("content-type");
      if (contentType?.includes("application/json")) {
        const body = await c.req.json();
        sanitizeObject(body);
        c.req.raw = new Request(c.req.url, {
          method: c.req.method,
          headers: c.req.raw.headers,
          body: JSON.stringify(body),
        });
      }
    } catch (e) {
      // If parsing fails, let the route handler deal with it
    }
  }

  await next();
}

function sanitizeObject(obj: unknown): void {
  if (typeof obj !== "object" || obj === null) return;

  for (const key in obj) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === "string") {
      (obj as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitizeObject(value);
    }
  }
}

function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

export async function validateContentType(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  // Skip validation for OPTIONS requests (CORS preflight)
  if (c.req.method === "OPTIONS") {
    return await next();
  }

  if (c.req.method === "POST" || c.req.method === "PUT" || c.req.method === "PATCH") {
    const contentType = c.req.header("content-type");

    // Allow multipart/form-data for file uploads
    if (contentType?.includes("multipart/form-data")) {
      return await next();
    }

    if (!contentType || !contentType.includes("application/json")) {
      return c.json(
        {
          success: false,
          message: "Content-Type must be application/json",
        },
        415
      );
    }
  }

  await next();
}
