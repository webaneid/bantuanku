import { Hono } from "hono";
import { desc, like, or, eq, and } from "drizzle-orm";
import { media as mediaTable, settings as settingsTable, type MediaVariant } from "@bantuanku/db";
import type { Env, Variables } from "../../types";
import * as fs from "fs";
import * as pathModule from "path";
import { uploadToGCS, generateGCSPath, type GCSConfig } from "../../lib/gcs";
import { processGeneralImage, processSingleWebp } from "../../lib/image-processor";

// Simple ID generator
const createId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const PDF_MAX_SIZE = 10 * 1024 * 1024;
const ORIGINAL_RETENTION_DAYS = 7;
const ORIGINAL_TEMP_FOLDER = "original-temp";

const sanitizeName = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
};

const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const isAbsoluteUrl = (value: string): boolean => {
  return value.startsWith("http://") || value.startsWith("https://");
};

const resolvePublicUrl = (apiUrl: string, value: string): string => {
  if (!value) return "";
  return isAbsoluteUrl(value) ? value : `${apiUrl}${value}`;
};

const removeExpiredOriginals = (uploadsDir: string): void => {
  const root = pathModule.join(uploadsDir, ORIGINAL_TEMP_FOLDER);
  if (!fs.existsSync(root)) return;

  const cutoffTime = Date.now() - ORIGINAL_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const cleanup = (currentPath: string): void => {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = pathModule.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        cleanup(fullPath);
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
        }
      } else {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs < cutoffTime) {
          fs.unlinkSync(fullPath);
        }
      }
    }
  };

  cleanup(root);
};

const storeOriginalTemp = (
  uploadsDir: string,
  source: Buffer,
  originalName: string,
  mediaId: string
): { relativePath: string; expiresAt: Date } => {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const ext = pathModule.extname(originalName).replace(".", "").toLowerCase() || "bin";
  const baseName = sanitizeName(originalName) || "media";
  const filename = `${Date.now()}-${mediaId}-${baseName}.${ext}`;
  const relativePath = pathModule
    .join(ORIGINAL_TEMP_FOLDER, yyyy, mm, dd, filename)
    .replace(/\\/g, "/");
  const absolutePath = pathModule.join(uploadsDir, relativePath);

  ensureDir(pathModule.dirname(absolutePath));
  fs.writeFileSync(absolutePath, source);

  const expiresAt = new Date(now.getTime() + ORIGINAL_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return { relativePath, expiresAt };
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
    const user = c.get("user");

    // Cek apakah user adalah mitra-only
    const isMitra = user?.roles?.length === 1 && user.roles.includes("mitra");

    let query = db.select().from(mediaTable).orderBy(desc(mediaTable.createdAt));

    const conditions = [];

    // Mitra hanya bisa lihat media yang dia upload sendiri
    if (isMitra && user) {
      conditions.push(eq(mediaTable.uploadedBy, user.id));
    }

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
      const finalUrl = resolvePublicUrl(apiUrl, item.path);
      const variants = item.variants
        ? Object.entries(item.variants as Record<string, MediaVariant>).reduce((acc, [key, variant]) => {
            const sourcePath = variant.path || variant.url;
            if (!sourcePath) return acc;
            acc[key] = {
              ...variant,
              url: resolvePublicUrl(apiUrl, sourcePath),
            };
            return acc;
          }, {} as Record<string, MediaVariant & { url: string }>)
        : undefined;

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
        width: item.width,
        height: item.height,
        variants,
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

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (category === "document") {
      if (!isImage && !isPdf) {
        return c.json(
          {
            success: false,
            message: "Kategori document hanya menerima gambar atau PDF",
          },
          400
        );
      }
    } else if (!isImage) {
      return c.json(
        {
          success: false,
          message: "Kategori ini hanya menerima file gambar",
        },
        400
      );
    }

    if (isPdf && file.size > PDF_MAX_SIZE) {
      return c.json(
        {
          success: false,
          message: "Ukuran PDF maksimal 10MB",
        },
        400
      );
    }

    if (isImage && file.size > IMAGE_MAX_SIZE) {
      return c.json(
        {
          success: false,
          message: "Ukuran gambar maksimal 5MB",
        },
        400
      );
    }

    const db = c.get("db");

    const id = createId();
    const sanitizedBaseName = sanitizeName(file.name) || "media";
    const uploadsDir = pathModule.join(process.cwd(), "uploads");
    ensureDir(uploadsDir);

    // Get original buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();

    // Keep local original for 7 days as rollback/debug source
    let originalLocalPath: string | null = null;
    let originalLocalExpiresAt: Date | null = null;

    if (isImage) {
      try {
        removeExpiredOriginals(uploadsDir);
        const originalInfo = storeOriginalTemp(uploadsDir, buffer, file.name, id);
        originalLocalPath = originalInfo.relativePath;
        originalLocalExpiresAt = originalInfo.expiresAt;
      } catch (originalStoreError) {
        console.warn("Failed to store local original:", originalStoreError);
      }
    }

    // Check if CDN is enabled
    const cdnConfig = await fetchCDNSettings(db);
    const uploadBinary = async (
      payload: Buffer,
      filename: string,
      mimeType: string
    ): Promise<{ path: string; url: string }> => {
      if (cdnConfig) {
        try {
          const gcsPath = generateGCSPath(filename);
          const gcsUrl = await uploadToGCS(cdnConfig, payload, gcsPath, mimeType);
          return { path: gcsUrl, url: gcsUrl };
        } catch (gcsError) {
          console.error("GCS upload failed, fallback to local storage:", gcsError);
        }
      }

      const localPath = `/uploads/${filename}`;
      fs.writeFileSync(pathModule.join(uploadsDir, filename), payload);

      if (!global.uploadedFiles) {
        global.uploadedFiles = new Map();
      }
      global.uploadedFiles.set(filename, payload);

      return { path: localPath, url: localPath };
    };

    let finalFilename = "";
    let path = "";
    let fullUrl = "";
    let mimeType = file.type;
    let finalSize = file.size;
    let finalWidth: number | null = null;
    let finalHeight: number | null = null;
    let variants: Record<string, MediaVariant> | null = null;

    if (isPdf) {
      finalFilename = `${timestamp}-${id}-${sanitizedBaseName}.pdf`;
      const uploaded = await uploadBinary(buffer, finalFilename, file.type);
      path = uploaded.path;
      fullUrl = uploaded.url;
    } else if (category === "general") {
      const processedVariants = await processGeneralImage(buffer);
      const variantMap: Record<string, MediaVariant> = {};
      const uploadedDetails: Record<string, { filename: string; variant: MediaVariant }> = {};

      for (const variant of processedVariants) {
        const variantFilename = `${timestamp}-${id}-${sanitizedBaseName}-${variant.variant}.webp`;
        const uploaded = await uploadBinary(variant.buffer, variantFilename, variant.mimeType);
        const variantData: MediaVariant = {
          variant: variant.variant,
          width: variant.width,
          height: variant.height,
          mimeType: variant.mimeType,
          size: variant.size,
          path: uploaded.path,
          url: uploaded.url,
        };
        variantMap[variant.variant] = variantData;
        uploadedDetails[variant.variant] = { filename: variantFilename, variant: variantData };
      }

      const primary = uploadedDetails.large || Object.values(uploadedDetails)[0];
      finalFilename = primary.filename;
      path = primary.variant.path;
      fullUrl = primary.variant.url;
      mimeType = primary.variant.mimeType;
      finalSize = primary.variant.size;
      finalWidth = primary.variant.width;
      finalHeight = primary.variant.height;
      variants = variantMap;
    } else {
      const processed = await processSingleWebp(buffer);
      finalFilename = `${timestamp}-${id}-${sanitizedBaseName}-original.webp`;
      const uploaded = await uploadBinary(processed.buffer, finalFilename, processed.mimeType);
      path = uploaded.path;
      fullUrl = uploaded.url;
      mimeType = processed.mimeType;
      finalSize = processed.size;
      finalWidth = processed.width;
      finalHeight = processed.height;
      variants = {
        original: {
          variant: "original",
          width: processed.width,
          height: processed.height,
          mimeType: processed.mimeType,
          size: processed.size,
          path: uploaded.path,
          url: uploaded.url,
        },
      };
    }

    // Save to database
    const user = c.get("user");
    const result = await db
      .insert(mediaTable)
      .values({
        id,
        filename: finalFilename,
        originalName: file.name,
        mimeType,
        size: finalSize,
        url: path, // Full GCS URL or local path
        path,
        width: finalWidth,
        height: finalHeight,
        variants,
        originalLocalPath,
        originalLocalExpiresAt,
        folder: isAbsoluteUrl(path) ? "gcs" : "uploads",
        category,
        uploadedBy: user?.id || null,
      })
      .returning();

    // Construct URL for response
    // If CDN mode, use the GCS URL directly; otherwise construct from API_URL
    const apiUrl = c.env?.API_URL || process.env.API_URL || "http://localhost:50245";
    const responseUrl = resolvePublicUrl(apiUrl, fullUrl);
    const responseVariants = result[0].variants
      ? Object.entries(result[0].variants as Record<string, MediaVariant>).reduce((acc, [key, variant]) => {
          const sourcePath = variant.path || variant.url;
          if (!sourcePath) return acc;
          acc[key] = {
            ...variant,
            url: resolvePublicUrl(apiUrl, sourcePath),
          };
          return acc;
        }, {} as Record<string, MediaVariant & { url: string }>)
      : undefined;

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
      width: result[0].width,
      height: result[0].height,
      variants: responseVariants,
      createdAt: result[0].createdAt.toISOString(),
    };

    return c.json({
      success: true,
      message: "File uploaded successfully",
      data: uploadedMedia,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    if (error instanceof Error && error.message.includes("Paket sharp belum terpasang")) {
      return c.json(
        {
          success: false,
          message: error.message,
        },
        500
      );
    }
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
