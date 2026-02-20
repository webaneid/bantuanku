import { serve } from "@hono/node-server";
import app from "./src/index";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { closeDb } from "@bantuanku/db";

// Load environment variables from .env (try both script directory and CWD)
const __scriptDir = path.dirname(new URL(import.meta.url).pathname);
dotenv.config({ path: path.join(__scriptDir, ".env") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const port = Number(process.env.API_PORT) || 50245;
const host = process.env.API_HOST || "127.0.0.1";
console.log(`Starting Node.js server on ${host}:${port}...`);
console.log(`Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@")}`);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}

const server = serve({
  fetch: (request) => {
    return app.fetch(request, {
      DATABASE_URL: process.env.DATABASE_URL || "",
      JWT_SECRET: process.env.JWT_SECRET || "",
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
      ENVIRONMENT: process.env.ENVIRONMENT || "development",
      API_URL: process.env.API_URL || `http://${host}:${port}`,
      FRONTEND_URL: process.env.FRONTEND_URL || "",
      ADMIN_URL: process.env.ADMIN_URL || "",
      RESEND_API_KEY: process.env.RESEND_API_KEY || "",
      FROM_EMAIL: process.env.FROM_EMAIL || "",
    });
  },
  port,
  hostname: host,
});

console.log(`Server running at http://${host}:${port}`);

// Start savings reminder scheduler (runs daily at 08:00 WIB)
let stopReminderScheduler: (() => void) | null = null;
let stopDeveloperAutoDisbursementScheduler: (() => void) | null = null;
if (process.env.DATABASE_URL) {
  import("@bantuanku/db")
    .then(async ({ createDb }) => {
      const db = createDb(process.env.DATABASE_URL!);

      try {
        const { startSavingsReminderScheduler } = await import("./src/services/savings-reminder");
        stopReminderScheduler = startSavingsReminderScheduler(db, process.env.FRONTEND_URL, 8);
      } catch (err) {
        console.error("[SavingsReminder] Failed to start scheduler:", err);
      }

      try {
        const { startDeveloperAutoDisbursementScheduler } = await import(
          "./src/services/developer-auto-disbursement"
        );
        stopDeveloperAutoDisbursementScheduler = startDeveloperAutoDisbursementScheduler(db);
      } catch (err) {
        console.error("[DeveloperAutoDisbursement] Failed to start scheduler:", err);
      }
    })
    .catch((err) => {
      console.error("[Scheduler] Failed to initialize DB for schedulers:", err);
    });
}

// Graceful shutdown
function shutdown() {
  console.log("\nShutting down...");
  if (stopReminderScheduler) stopReminderScheduler();
  if (stopDeveloperAutoDisbursementScheduler) stopDeveloperAutoDisbursementScheduler();
  server.close(() => {
    closeDb();
    console.log("Server closed.");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
