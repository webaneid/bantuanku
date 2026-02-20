import fs from "fs";
import path from "path";

const ORIGINAL_TEMP_FOLDER = "original-temp";
const RETENTION_DAYS = 7;

function cleanupExpiredFiles(rootDir: string, cutoffTime: number): { removed: number } {
  let removed = 0;

  if (!fs.existsSync(rootDir)) {
    return { removed };
  }

  const walk = (currentPath: string): void => {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
        }
      } else {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs < cutoffTime) {
          fs.unlinkSync(fullPath);
          removed += 1;
        }
      }
    }
  };

  walk(rootDir);
  return { removed };
}

function main(): void {
  const uploadsDir = path.join(process.cwd(), "uploads");
  const originalsDir = path.join(uploadsDir, ORIGINAL_TEMP_FOLDER);
  const cutoffTime = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const result = cleanupExpiredFiles(originalsDir, cutoffTime);
  console.log(
    `[cleanup-local-originals] removed ${result.removed} files older than ${RETENTION_DAYS} days`
  );
}

main();

