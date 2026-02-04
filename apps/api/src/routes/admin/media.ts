import { Hono } from "hono";
import { desc, like, or, sql, eq, and } from "drizzle-orm";
import { media as mediaTable, settings as settingsTable } from "@bantuanku/db";
import type { Env, Variables } from "../../types";
import * as fs from "fs";
import * as pathModule from "path";
import { uploadToGCS, generateGCSPath, type GCSConfig } from "../../lib/gcs";

// Simple ID generator
const createId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Helper to extract path from full URL or return as-is if already a path
export const extractPath = (urlOrPath: string): string => {
  if (!urlOrPath) return "";

  // If already a path (starts with /), return as-is
  if (urlOrPath.startsWith("/")) {
    return urlOrPath;
  }

  // If full URL, extract pathname
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    try {
      const url = new URL(urlOrPath);
      return url.pathname;
    } catch {
      // If parsing fails, try to extract /uploads/... pattern
      const match = urlOrPath.match(/\/uploads\/.+$/);
      return match ? match[0] : urlOrPath;
    }
  }

  // Default: return as-is
  return urlOrPath;
};

// Helper to fetch CDN settings from database
const fetchCDNSettings = async (db: any): Promise<GCSConfig | null> => {
  try {
    const settings = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.category, "cdn"));

    const cdnEnabled = settings.find((s: any) => s.key === "cdn_enabled")?.value === "true";

    if (!cdnEnabled) {
      return null;
    }

    const config = {
      bucketName: settings.find((s: any) => s.key === "gcs_bucket_name")?.value || "",
      projectId: settings.find((s: any) => s.key === "gcs_project_id")?.value || "",
      clientEmail: settings.find((s: any) => s.key === "gcs_client_email")?.value || "",
      privateKey: settings.find((s: any) => s.key === "gcs_private_key")?.value || "",
    };

    // Validate all required fields are present
    if (!config.bucketName || !config.projectId || !config.clientEmail || !config.privateKey) {
      console.warn("CDN enabled but missing required configuration");
      return null;
    }

    return config;
  } catch (error) {
    console.error("Failed to fetch CDN settings:", error);
    return null;
  }
};

const media = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get all media items
media.get("/", async (c) => {
  try {
    const search = c.req.query("search") || "";
    const category = c.req.query("category") || ""; // general, financial, activity, document
    const db = c.get("db");

    let query = db.select().from(mediaTable).orderBy(desc(mediaTable.createdAt));

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(mediaTable.filename, `%${search}%`),
          like(mediaTable.originalName, `%${search}%`)
        )
      );
    }

    if (category) {
      conditions.push(eq(mediaTable.category, category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;

    // Construct URL from path at runtime
    // Support both Cloudflare Workers (c.env) and Node.js (process.env)
    const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";

    // Transform to match frontend interface
    const transformedData = result.map((item) => {
      let finalUrl: string;

      // Check if path is already a full URL (GCS CDN)
      if (item.path && (item.path.startsWith('http://') || item.path.startsWith('https://'))) {
        // GCS mode: use full URL as-is
        finalUrl = item.path;
      } else {
        // Local mode: construct URL from API_URL + path
        finalUrl = `${apiUrl}${item.path}`;
      }

      return {
        id: item.id,
        url: finalUrl,
        title: item.originalName,
        alt: "",
        description: "",
        filename: item.filename,
        size: item.size,
        mimeType: item.mimeType,
        category: item.category,
        createdAt: item.createdAt.toISOString(),
      };
    });

    return c.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error("Error fetching media:", error);
    return c.json(
      {
        success: false,
        message: "Failed to fetch media",
      },
      500
    );
  }
});

// Upload media
media.post("/upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    console.log("Form data keys:", Object.keys(body));
    const file = body.file as File;
    const category = (body.category as string) || "general"; // Get category from form data

    if (!file) {
      console.log("No file found in body:", body);
      return c.json(
        {
          success: false,
          message: "No file provided",
        },
        400
      );
    }

    // Validate category
    const validCategories = ["general", "financial", "activity", "document"];
    if (!validCategories.includes(category)) {
      return c.json(
        {
          success: false,
          message: "Invalid category. Must be one of: general, financial, activity, document",
        },
        400
      );
    }

    // Validate file type based on category
    if (category === "financial" || category === "document") {
      // Allow images and PDFs for financial/document
      const allowedTypes = ["image/", "application/pdf"];
      if (!allowedTypes.some(type => file.type.startsWith(type))) {
        return c.json(
          {
            success: false,
            message: "Only image and PDF files are allowed for financial/document categories",
          },
          400
        );
      }
    } else if (category === "activity") {
      // Only images for activity photos
      if (!file.type.startsWith("image/")) {
        return c.json(
          {
            success: false,
            message: "Only image files are allowed for activity category",
          },
          400
        );
      }
    } else {
      // General: allow images
      if (!file.type.startsWith("image/")) {
        return c.json(
          {
            success: false,
            message: "Only image files are allowed",
          },
          400
        );
      }
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json(
        {
          success: false,
          message: "File size must be less than 5MB",
        },
        400
      );
    }

    const db = c.get("db");

    const id = createId();
    // Sanitize filename: replace spaces and special chars with dash
    const sanitizedName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '-');

    // Get original buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const finalFilename = `${Date.now()}-${sanitizedName}`;

    // Check if CDN is enabled
    const cdnConfig = await fetchCDNSettings(db);
    let path: string;
    let fullUrl: string;

    if (cdnConfig) {
      // CDN Mode: Upload to Google Cloud Storage
      console.log("CDN enabled, uploading to GCS...");

      try {
        const gcsPath = generateGCSPath(finalFilename);
        fullUrl = await uploadToGCS(cdnConfig, buffer, gcsPath, file.type);
        path = fullUrl; // Store full GCS URL
        console.log("File uploaded to GCS:", fullUrl);
      } catch (error) {
        console.error("GCS upload failed, falling back to local storage:", error);
        // Fallback to local storage if GCS fails
        path = `/uploads/${finalFilename}`;
        fullUrl = path;

        // Store locally as fallback
        try {
          const uploadsDir = pathModule.join(process.cwd(), "uploads");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          fs.writeFileSync(pathModule.join(uploadsDir, finalFilename), buffer);
        } catch (fsError) {
          console.error("Local storage also failed:", fsError);
        }
      }
    } else {
      // Local Mode: Store in filesystem
      console.log("CDN disabled, using local storage");
      path = `/uploads/${finalFilename}`;
      fullUrl = path;

      // Store in filesystem for dev mode (persistent across restarts)
      try {
        const uploadsDir = pathModule.join(process.cwd(), "uploads");
        console.log("Upload directory:", uploadsDir);
        if (!fs.existsSync(uploadsDir)) {
          console.log("Creating uploads directory...");
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = pathModule.join(uploadsDir, finalFilename);
        console.log("Writing file to:", filePath);
        fs.writeFileSync(filePath, buffer);
        console.log("File written successfully:", filePath);
      } catch (error) {
        // Filesystem not available (Cloudflare Workers edge environment)
        console.error("Filesystem error:", error);
        console.log("Filesystem not available, using memory only");
      }

      // Also store in global map for immediate access (local mode only)
      if (!global.uploadedFiles) {
        global.uploadedFiles = new Map();
      }
      global.uploadedFiles.set(finalFilename, buffer);
    }

    // Save to database
    const result = await db
      .insert(mediaTable)
      .values({
        id,
        filename: finalFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: path, // Full GCS URL or local path
        path,
        folder: cdnConfig ? "gcs" : "uploads",
        category,
      })
      .returning();

    // Construct URL for response
    // If CDN mode, use the GCS URL directly; otherwise construct from API_URL
    const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";
    const responseUrl = cdnConfig ? fullUrl : `${apiUrl}${path}`;

    // Transform to match frontend interface
    const uploadedMedia = {
      id: result[0].id,
      url: responseUrl, // Use GCS URL or construct from API_URL
      title: result[0].originalName,
      alt: "",
      description: "",
      filename: result[0].filename,
      size: result[0].size,
      mimeType: result[0].mimeType,
      category: result[0].category,
      createdAt: result[0].createdAt.toISOString(),
    };

    return c.json({
      success: true,
      message: "File uploaded successfully",
      data: uploadedMedia,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return c.json(
      {
        success: false,
        message: "Failed to upload file",
      },
      500
    );
  }
});

// Update media metadata
media.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    // TODO: Update in database
    return c.json({
      success: true,
      message: "Media updated successfully",
      data: {
        id,
        ...body,
      },
    });
  } catch (error) {
    console.error("Error updating media:", error);
    return c.json(
      {
        success: false,
        message: "Failed to update media",
      },
      500
    );
  }
});

// Delete media
media.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    // TODO: Delete from database and R2 storage
    return c.json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting media:", error);
    return c.json(
      {
        success: false,
        message: "Failed to delete media",
      },
      500
    );
  }
});

export default media;
