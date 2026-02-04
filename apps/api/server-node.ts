import { serve } from "@hono/node-server";
import app from "./src/index";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables from .dev.vars (Cloudflare format)
const devVarsPath = path.join(process.cwd(), ".dev.vars");
if (fs.existsSync(devVarsPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(devVarsPath));
  Object.entries(envConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
  console.log("Loaded environment variables from .dev.vars");
}

const port = Number(process.env.API_PORT) || 50245;
const host = process.env.API_HOST || "127.0.0.1";
console.log(`Starting Node.js server on ${host}:${port}...`);
console.log(`Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}

serve({
  fetch: (request) => {
    // Inject environment variables into Hono context for Node.js compatibility
    return app.fetch(request, {
      JWT_SECRET: process.env.JWT_SECRET || "",
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
      DATABASE_URL: process.env.DATABASE_URL || "",
      ENVIRONMENT: process.env.ENVIRONMENT || "development",
      API_URL: process.env.API_URL || "http://localhost:50245",
    });
  },
  port,
  hostname: host,
});

console.log(`Server running at http://${host}:${port}`);
