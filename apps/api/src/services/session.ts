import { eq } from "drizzle-orm";
import { users, userRoles } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { signToken, signRefreshToken } from "../lib/jwt";
import type { Env } from "../types";

type UserRow = typeof users.$inferSelect;

// Penerbitan sesi (access + refresh token + ringkasan user) — dipakai login password DAN
// penukaran kode Google, agar kedua jalur selalu menghasilkan token dengan isi yang sama.
export async function buildSession(db: Database, env: Env, user: UserRow) {
  const userRolesList = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, user.id),
    with: { role: true },
  });
  const rolesSlugs = userRolesList.map((ur) => (ur as any).role?.slug).filter(Boolean) as string[];

  const accessToken = await signToken(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      roles: rolesSlugs,
      isDeveloper: Boolean(user.isDeveloper),
    },
    env.JWT_SECRET,
    env.JWT_EXPIRES_IN || "15m"
  );

  const refreshToken = await signRefreshToken(user.id, env.JWT_SECRET);

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      roles: rolesSlugs,
      isDeveloper: Boolean(user.isDeveloper),
    },
  };
}
