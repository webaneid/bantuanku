import crypto from "crypto";

// Use JWT secret as the encryption key basis, or a dedicated one if provided.
// No hardcoded fallback: a missing env var must fail loudly at startup, not
// silently encrypt with a key anyone can read from this file's git history.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY or JWT_SECRET must be set in env for encryption to work");
}
const ALGORITHM = "aes-256-cbc";

// Ensure key is exactly 32 bytes for aes-256
const getValidKey = () => {
    return crypto.createHash("sha256").update(String(ENCRYPTION_KEY)).digest("base64").substr(0, 32);
};

export function encrypt(text: string): string {
    if (!text) return text;

    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getValidKey()), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        // Format: iv:encryptedData
        return iv.toString("hex") + ":" + encrypted.toString("hex");
    } catch (error) {
        console.error("Encryption failed:", error);
        return text; // Return original if encryption fails to prevent app crash
    }
}

// Bentuk hasil encrypt(): "<iv 32 hex>:<data hex>". Nilai lain (mis. setting lama yang tersimpan
// plaintext) dianggap bukan ciphertext dan dikembalikan apa adanya oleh decrypt().
const CIPHERTEXT_PATTERN = /^[0-9a-f]{32}:[0-9a-f]+$/i;

export function looksEncrypted(text: string): boolean {
    return !!text && CIPHERTEXT_PATTERN.test(text);
}

// Dedup log: satu peringatan per label per proses, agar log tidak banjir tiap request.
const warnedLabels = new Set<string>();

/**
 * Dekripsi nilai setting.
 * - Bukan ciphertext (plaintext lama) → dikembalikan apa adanya.
 * - Ciphertext valid → plaintext.
 * - Ciphertext TAPI gagal dibuka (kunci beda / data rusak) → "" (string kosong), BUKAN ciphertext.
 *   Sebelumnya ciphertext dikembalikan dan terkirim ke pihak ketiga sebagai kredensial (mis. token Meta CAPI → 401).
 *   `label` (nama setting) hanya untuk log; nilai tidak pernah ikut di-log.
 */
export function decrypt(text: string, label?: string): string {
    if (!text || !text.includes(":")) return text;
    if (!looksEncrypted(text)) return text;

    try {
        const textParts = text.split(":");
        const ivStr = textParts.shift();
        if (!ivStr) return text;

        const iv = Buffer.from(ivStr, "hex");
        const encryptedText = Buffer.from(textParts.join(":"), "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(getValidKey()), iv);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        const tag = label || "(tanpa label)";
        if (!warnedLabels.has(tag)) {
            warnedLabels.add(tag);
            console.error(
                `[encryption] Gagal dekripsi setting ${tag}: kunci ENCRYPTION_KEY/JWT_SECRET berbeda dari saat disimpan, atau data rusak. Isi ulang nilainya di Settings.`,
                (error as any)?.code || ""
            );
        }
        return "";
    }
}
