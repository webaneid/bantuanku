import dotenv from "dotenv";
import path from "path";

// Side-effect-only module: must be the FIRST import in server-node.ts.
// ES module imports execute in the order they're written — this file's
// top-level code (dotenv.config) fully runs before the next import
// (`./src/index`) is evaluated, which is what modules like
// `src/lib/encryption.ts` need (they read process.env at import time).
const __scriptDir = path.dirname(new URL(import.meta.url).pathname);
dotenv.config({ path: path.join(__scriptDir, ".env") });
dotenv.config({ path: path.join(process.cwd(), ".env") });
