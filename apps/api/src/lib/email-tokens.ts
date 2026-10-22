import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull, gt, sql } from "drizzle-orm";
import { authEmailTokens, createId } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";

// Token sekali pakai untuk verifikasi email, reset password, dan kode tukar login Google.
// Token mentah (base64url, 256-bit) hanya dikirim ke pengguna; DB hanya menyimpan hash SHA-256,
// jadi kebocoran DB tidak membocorkan link yang masih berlaku.

export type EmailTokenPurpose = "verify_email" | "reset_password" | "google_exchange";

export const EMAIL_TOKEN_TTL_MS: Record<EmailTokenPurpose, number> = {
  verify_email: 24 * 60 * 60 * 1000, // 24 jam
  reset_password: 60 * 60 * 1000, // 1 jam (lebih sensitif)
  google_exchange: 60 * 1000, // 60 detik
};

// Jeda minimum antar pengiriman untuk user + tujuan yang sama (cegah banjir email)
export const EMAIL_TOKEN_COOLDOWN_MS = 60 * 1000;

export function hashEmailToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Terbitkan token baru; token lama yang belum dipakai untuk tujuan yang sama dihanguskan
// supaya hanya link terbaru yang sah.
export async function issueEmailToken(
  db: Database,
  params: { userId: string; email: string; purpose: EmailTokenPurpose }
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();

  await db
    .update(authEmailTokens)
    .set({ consumedAt: now })
    .where(
      and(
        eq(authEmailTokens.userId, params.userId),
        eq(authEmailTokens.purpose, params.purpose),
        isNull(authEmailTokens.consumedAt)
      )
    );

  await db.insert(authEmailTokens).values({
    id: createId(),
    userId: params.userId,
    email: params.email,
    purpose: params.purpose,
    tokenHash: hashEmailToken(token),
    expiresAt: new Date(now.getTime() + EMAIL_TOKEN_TTL_MS[params.purpose]),
  });

  return token;
}

// True bila token untuk user + tujuan ini baru saja diterbitkan (masih dalam cooldown).
export async function isInCooldown(db: Database, userId: string, purpose: EmailTokenPurpose): Promise<boolean> {
  const [latest] = await db
    .select({ createdAt: authEmailTokens.createdAt })
    .from(authEmailTokens)
    .where(and(eq(authEmailTokens.userId, userId), eq(authEmailTokens.purpose, purpose)))
    .orderBy(desc(authEmailTokens.createdAt))
    .limit(1);
  return !!latest && Date.now() - latest.createdAt.getTime() < EMAIL_TOKEN_COOLDOWN_MS;
}

// Konsumsi token secara atomik (satu UPDATE ... RETURNING): hanya satu request yang bisa menang
// walau link dibuka bersamaan. Mengembalikan baris token, atau null bila tidak valid/kedaluwarsa/terpakai.
export async function consumeEmailToken(db: Database, token: string, purpose: EmailTokenPurpose) {
  if (!token || token.length > 200) return null;
  const rows = await db
    .update(authEmailTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(authEmailTokens.tokenHash, hashEmailToken(token)),
        eq(authEmailTokens.purpose, purpose),
        isNull(authEmailTokens.consumedAt),
        gt(authEmailTokens.expiresAt, sql`now()`)
      )
    )
    .returning();
  return rows[0] ?? null;
}

// Cek token tanpa menghanguskannya (valid, belum dipakai, belum kedaluwarsa). Dipakai saat ada bukti
// tambahan yang harus diperiksa SEBELUM token dikonsumsi (mis. password saat verifikasi email), supaya
// salah password tidak membakar token.
export async function peekEmailToken(db: Database, token: string, purpose: EmailTokenPurpose) {
  if (!token || token.length > 200) return null;
  const [row] = await db
    .select()
    .from(authEmailTokens)
    .where(
      and(
        eq(authEmailTokens.tokenHash, hashEmailToken(token)),
        eq(authEmailTokens.purpose, purpose),
        isNull(authEmailTokens.consumedAt),
        gt(authEmailTokens.expiresAt, sql`now()`)
      )
    )
    .limit(1);
  return row ?? null;
}

// Hanguskan SEMUA token tertunda milik user (semua tujuan). Dipakai saat kepemilikan akun berpindah
// (klaim Google) supaya link lama yang masih beredar tidak bisa dipakai lagi.
export async function revokePendingTokens(db: Database, userId: string): Promise<void> {
  await db
    .update(authEmailTokens)
    .set({ consumedAt: new Date() })
    .where(and(eq(authEmailTokens.userId, userId), isNull(authEmailTokens.consumedAt)));
}
