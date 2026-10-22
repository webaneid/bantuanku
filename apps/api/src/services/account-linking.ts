import { and, eq, isNull, sql } from "drizzle-orm";
import { donatur, transactions, users } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";

// Menautkan data yang dibuat sebagai guest (record donatur + transaksi) ke akun, BERDASARKAN
// EMAIL YANG BARU TERBUKTI dimiliki pengguna (link verifikasi / Google email_verified).
// Tidak pernah dipanggil dari register: sebelum email terbukti, pendaftar tidak boleh mengambil
// alih data siapa pun (lihat ADR-0010, audit 2026-10-22 temuan P).
export async function linkVerifiedAccountData(
  db: Database,
  user: { id: string; email: string; passwordHash: string | null }
): Promise<{ donaturLinked: boolean; transactionsLinked: number }> {
  const email = user.email.toLowerCase().trim();
  const now = new Date();

  let donaturLinked = false;
  const existing = await db.query.donatur.findFirst({ where: eq(donatur.email, email) });
  // Jangan merebut record yang sudah ditautkan ke akun lain
  if (existing && (!existing.userId || existing.userId === user.id)) {
    await db
      .update(donatur)
      .set({
        userId: user.id,
        emailVerifiedAt: existing.emailVerifiedAt ?? now,
        passwordHash: existing.passwordHash ?? user.passwordHash,
        updatedAt: now,
      })
      .where(eq(donatur.id, existing.id));
    donaturLinked = true;
  }

  const linked = await db
    .update(transactions)
    .set({ userId: user.id, updatedAt: now })
    .where(and(isNull(transactions.userId), sql`lower(${transactions.donorEmail}) = ${email}`))
    .returning({ id: transactions.id });

  return { donaturLinked, transactionsLinked: linked.length };
}

export async function markEmailVerified(db: Database, userId: string): Promise<void> {
  const now = new Date();
  await db.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
}
