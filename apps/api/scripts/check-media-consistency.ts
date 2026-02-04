import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { createDb, media as mediaTable, eq } from "@bantuanku/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const envPath = path.join(repoRoot, "apps", "api", ".dev.vars");

if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.entries(envConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Please set it in .dev.vars or the environment.");
}

const uploadsDir = path.join(repoRoot, "apps", "api", "uploads");

async function main() {
  if (!fs.existsSync(uploadsDir)) {
    console.warn("Uploads directory does not exist:", uploadsDir);
  }

  const db = createDb(databaseUrl);

  const filesOnDisk = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir).filter((file) => file !== ".gitkeep")
    : [];

  const rows = await db.select().from(mediaTable);

  const fileMap = new Map<string, typeof rows[number]>();

  rows.forEach((row) => {
    fileMap.set(row.filename, row);
  });

  console.log(`Found ${filesOnDisk.length} files under ${uploadsDir}.`);
  console.log(`Found ${rows.length} rows in media table.`);

  const missingInDb: string[] = [];
  for (const file of filesOnDisk) {
    const match = fileMap.get(file);
    if (!match) {
      missingInDb.push(file);
      continue;
    }
    const expectedPath = `/uploads/${file}`;
    if (match.path !== expectedPath || match.url !== expectedPath) {
      console.warn(`Inconsistent row for ${file}: path=${match.path}, url=${match.url}`);
    }
  }

  const missingOnDisk: string[] = [];
  const diskSet = new Set(filesOnDisk);
  rows.forEach((row) => {
    if (!diskSet.has(row.filename)) {
      missingOnDisk.push(row.filename);
    }
  });

  if (missingInDb.length > 0) {
    console.warn("Files missing database rows:", missingInDb);
  } else {
    console.log("All disk files have matching media rows.");
  }

  if (missingOnDisk.length > 0) {
    console.warn("Database rows without files on disk:", missingOnDisk);
  } else {
    console.log("All media rows reference existing disk files.");
  }

  if (missingInDb.length === 0 && missingOnDisk.length === 0) {
    console.log("Media upload consistency check passed.");
  }
}

main()
  .catch((error) => {
    console.error("Media consistency check failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
