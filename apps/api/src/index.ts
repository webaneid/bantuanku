import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import * as fs from "fs";
import * as pathModule from "path";

import { dbMiddleware } from "./middleware/db";
import { securityHeaders, validateContentType } from "./middleware/security";
import { apiRateLimit } from "./middleware/ratelimit";
import { compressionMiddleware } from "./middleware/compression";
import type { Env, Variables } from "./types";

// Global file storage for development
declare global {
  var uploadedFiles: Map<string, Buffer>;
}

import authRoutes from "./routes/auth";
import campaignsRoutes from "./routes/campaigns";
import categoriesRoutes from "./routes/categories";
import pillarsRoutes from "./routes/pillars";
import donationsRoutes from "./routes/donations";
import donaturRoutes from "./routes/donatur";
import paymentsRoutes from "./routes/payments";
import adminRoutes from "./routes/admin";
import zakatRoutes from "./routes/zakat";
import qurbanRoutes from "./routes/qurban";
import accountRoutes from "./routes/account";
import pagesRoutes from "./routes/pages";
import settingsPublicRoutes from "./routes/settings-public";
import searchRoutes from "./routes/search";
import autocompleteRoutes from "./routes/autocomplete";
import publicStatsRoutes from "./routes/public-stats";
import addressPublicRoutes from "./routes/address-public";
import activityReportsPublicRoutes from "./routes/activity-reports-public";
import indonesiaRoutes from "./routes/indonesia";
import transactionsRoutes from "./routes/transactions";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", logger());

// CORS must be before other middleware
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow all localhost and file:// for development
      if (origin?.startsWith("http://localhost") || origin?.startsWith("file://")) {
        return origin;
      }
      // Allow production domains
      if (origin === "https://bantuanku.org" || origin === "https://admin.bantuanku.org") {
        return origin;
      }
      return origin || "*";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["Content-Length", "Content-Type"],
    maxAge: 86400,
  })
);

app.use("*", securityHeaders);
app.use("*", compressionMiddleware);
app.use("*", prettyJSON());
app.use("*", apiRateLimit);
app.use("*", validateContentType);
app.use("*", dbMiddleware);

app.get("/", (c) => {
  return c.json({
    name: "Bantuanku API",
    version: "1.0.0",
    status: "ok",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve uploaded files
app.get("/uploads/:filename", async (c) => {
  try {
    const filename = c.req.param("filename");

    // Initialize global storage if not exists
    if (!global.uploadedFiles) {
      global.uploadedFiles = new Map();
    }

    let file = global.uploadedFiles.get(filename);

    // If not in memory, try to load from filesystem
    if (!file) {
      try {
        const filePath = pathModule.join(process.cwd(), "uploads", filename);
        if (fs.existsSync(filePath)) {
          file = fs.readFileSync(filePath);
          // Cache in memory for next request
          global.uploadedFiles.set(filename, file);
        }
      } catch (error) {
        // Filesystem not available (Cloudflare Workers edge environment)
      }
    }

    if (!file) {
      return c.json({ success: false, message: "File not found" }, 404);
    }

    // Determine content type based on file extension
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
    };
    const contentType = contentTypes[ext || ""] || "application/octet-stream";

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    return c.json({ success: false, message: "File not found" }, 404);
  }
});

app.route("/v1/auth", authRoutes);
app.route("/v1/campaigns", campaignsRoutes);
app.route("/v1/categories", categoriesRoutes);
app.route("/v1/pillars", pillarsRoutes);
app.route("/v1/donations", donationsRoutes);
app.route("/v1/donatur", donaturRoutes);
app.route("/v1/payments", paymentsRoutes);
app.route("/v1/admin", adminRoutes);
app.route("/v1/zakat", zakatRoutes);
app.route("/v1/qurban", qurbanRoutes);
app.route("/v1/account", accountRoutes);
app.route("/v1/pages", pagesRoutes);
app.route("/v1/settings", settingsPublicRoutes);
app.route("/v1/search", searchRoutes);
app.route("/v1/autocomplete", autocompleteRoutes);
app.route("/v1/public-stats", publicStatsRoutes);
app.route("/v1/address", addressPublicRoutes);
app.route("/v1/activity-reports", activityReportsPublicRoutes);
app.route("/v1/indonesia", indonesiaRoutes);
app.route("/v1/transactions", transactionsRoutes);

app.notFound((c) => {
  return c.json({ success: false, message: "Not found" }, 404);
});

app.onError((err, c) => {
  console.error("Error:", err);
  return c.json(
    {
      success: false,
      message: c.env.ENVIRONMENT === "production" ? "Internal server error" : err.message,
    },
    500
  );
});

export default app;
