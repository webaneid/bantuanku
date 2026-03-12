import crypto from "crypto";

// Use JWT secret as the encryption key basis, or a dedicated one if provided
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "default_fallback_secret_key_32_bytes";
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

export function decrypt(text: string): string {
    if (!text || !text.includes(":")) return text;

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
        console.error("Decryption failed:", error);
        // Return empty or original text on failure depending on security requirements
        return text;
    }
}
