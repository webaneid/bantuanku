import { eq, sql } from "drizzle-orm";
import { users, userRoles, roles, donatur, userOauthAccounts, createId } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { linkVerifiedAccountData } from "./account-linking";
import { revokePendingTokens } from "../lib/email-tokens";
import type { GoogleClaims } from "../lib/google-oauth";

type UserRow = typeof users.$inferSelect;

export type GoogleResolution =
  | { ok: true; user: UserRow; created: boolean }
  | { ok: false; code: "staff" | "inactive"; user?: UserRow };

async function hasNonUserRole(db: Database, userId: string): Promise<boolean> {
  const list = await db.query.userRoles.findMany({ where: eq(userRoles.userId, userId), with: { role: true } });
  return list.some((ur) => (ur as any).role?.slug && (ur as any).role.slug !== "user");
}

// Menentukan akun untuk identitas Google yang SUDAH terverifikasi (ID token valid + email_verified).
// Aturan (ADR-0010):
//  - Google tidak berlaku untuk akun ber-peran selain 'user' (staf/mitra masuk dengan password).
//  - Akun lokal yang BELUM terverifikasi di-KLAIM oleh pemilik email (Google membuktikan kepemilikan):
//    password lama (mungkin ditanam penyerang yang mendaftar dengan email korban) dihapus, email ditandai
//    terverifikasi, token tertunda dan sesi lama dicabut (ADR-0011). Hanya menolak/kirim link tidak cukup:
//    link yang diklik korban akan memverifikasi akun yang password-nya masih dipegang penyerang.
//  - Email tak dikenal -> akun baru, langsung terverifikasi, peran 'user' saja.
export async function resolveGoogleUser(db: Database, claims: GoogleClaims): Promise<GoogleResolution> {
  const now = new Date();

  // 1. Sudah pernah ditautkan: cocokkan lewat sub Google (bukan email, yang bisa berubah)
  const linked = await db.query.userOauthAccounts.findFirst({
    where: sql`${userOauthAccounts.provider} = 'google' and ${userOauthAccounts.providerAccountId} = ${claims.sub}`,
  });
  let user: UserRow | undefined = linked
    ? await db.query.users.findFirst({ where: eq(users.id, linked.userId) })
    : undefined;

  // 2. Cocokkan lewat email
  if (!user) {
    user = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${claims.email}` });
    if (user) {
      if (!user.isActive) return { ok: false, code: "inactive", user };
      if (await hasNonUserRole(db, user.id)) return { ok: false, code: "staff", user };
      if (!user.emailVerifiedAt) {
        await db
          .update(users)
          .set({ passwordHash: null, emailVerifiedAt: now, sessionsValidAfter: now, updatedAt: now })
          .where(eq(users.id, user.id));
        await db.update(donatur).set({ passwordHash: null, updatedAt: now }).where(eq(donatur.userId, user.id));
        await revokePendingTokens(db, user.id);
        user = { ...user, passwordHash: null, emailVerifiedAt: now, sessionsValidAfter: now };
      }
      await db
        .insert(userOauthAccounts)
        .values({ id: createId(), userId: user.id, provider: "google", providerAccountId: claims.sub, email: claims.email })
        .onConflictDoNothing();
      await linkVerifiedAccountData(db, { id: user.id, email: user.email, passwordHash: user.passwordHash });
      return { ok: true, user, created: false };
    }
  } else {
    if (!user.isActive) return { ok: false, code: "inactive", user };
    if (await hasNonUserRole(db, user.id)) return { ok: false, code: "staff", user };
    return { ok: true, user, created: false };
  }

  // 3. Akun baru
  const userId = createId();
  try {
    await db.insert(users).values({
      id: userId,
      email: claims.email,
      passwordHash: null,
      name: claims.name,
      emailVerifiedAt: now,
    });
  } catch (err) {
    // Dua callback bersamaan untuk email yang sama: pemenang sudah membuat akun, pakai itu
    const existing = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${claims.email}` });
    if (!existing) throw err;
    if (await hasNonUserRole(db, existing.id)) return { ok: false, code: "staff", user: existing };
    return { ok: true, user: existing, created: false };
  }

  const userRole = await db.query.roles.findFirst({ where: eq(roles.slug, "user") });
  if (userRole) {
    await db.insert(userRoles).values({ userId, roleId: userRole.id });
  }
  await db.insert(userOauthAccounts).values({
    id: createId(),
    userId,
    provider: "google",
    providerAccountId: claims.sub,
    email: claims.email,
  });

  // Record donatur: tautkan yang sudah ada (email terbukti), atau buat baru
  const existingDonatur = await db.query.donatur.findFirst({ where: eq(donatur.email, claims.email) });
  if (!existingDonatur) {
    await db.insert(donatur).values({
      id: createId(),
      email: claims.email,
      name: claims.name,
      userId,
      emailVerifiedAt: now,
    });
  }
  await linkVerifiedAccountData(db, { id: userId, email: claims.email, passwordHash: null });

  const created = (await db.query.users.findFirst({ where: eq(users.id, userId) }))!;
  return { ok: true, user: created, created: true };
}
