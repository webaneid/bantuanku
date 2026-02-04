import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";

export async function compressionMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  await next();

  const acceptEncoding = c.req.header("accept-encoding") || "";
  const contentType = c.res.headers.get("content-type") || "";

  const shouldCompress =
    (contentType.includes("application/json") ||
      contentType.includes("text/") ||
      contentType.includes("application/javascript") ||
      contentType.includes("application/xml")) &&
    c.res.body;

  if (shouldCompress && acceptEncoding.includes("gzip")) {
    c.header("Content-Encoding", "gzip");
    c.header("Vary", "Accept-Encoding");
  }
}
