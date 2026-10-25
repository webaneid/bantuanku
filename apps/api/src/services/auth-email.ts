import { loadBrand } from "../lib/brand";
import { eq, inArray } from "drizzle-orm";
import { settings } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { createEmailService } from "./email";
import { issueEmailToken, isInCooldown } from "../lib/email-tokens";
import type { Env } from "../types";

// Nama brand untuk email: dari settings (bukan hardcode), sama seperti WhatsAppService.
async function getBrandName(db: Database): Promise<string> {
  const rows = await db.select().from(settings).where(inArray(settings.key, ["organization_name", "site_name"]));
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value || ""]));
  return map["site_name"] || map["organization_name"] || "";
}

export async function getFrontendBase(db: Database, env: Env): Promise<string> {
  if (env.FRONTEND_URL) return env.FRONTEND_URL.replace(/\/+$/, "");
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "frontend_url") });
  return (row?.value || "").replace(/\/+$/, "");
}

type TargetUser = { id: string; email: string; name: string };

// Kirim link verifikasi email. Mengembalikan "sent" | "cooldown" | "failed".
// Kegagalan kirim TIDAK dilempar: pendaftaran/login tetap berjalan dan pengguna bisa kirim ulang.
export async function sendVerificationEmail(db: Database, env: Env, user: TargetUser): Promise<"sent" | "cooldown" | "failed"> {
  if (await isInCooldown(db, user.id, "verify_email")) return "cooldown";
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
    console.error("[auth-email] RESEND_API_KEY/FROM_EMAIL belum di-set — email verifikasi tidak terkirim");
    return "failed";
  }
  try {
    const token = await issueEmailToken(db, { userId: user.id, email: user.email, purpose: "verify_email" });
    const base = await getFrontendBase(db, env);
    const brand = await getBrandName(db);
    const url = `${base}/verifikasi-email?token=${encodeURIComponent(token)}`;
    const mailer = createEmailService(env.RESEND_API_KEY, env.FROM_EMAIL, brand, base, env.ADMIN_URL, await loadBrand(db));
    return (await mailer.sendEmailVerification({ to: user.email, name: user.name, url })) ? "sent" : "failed";
  } catch (err) {
    console.error("[auth-email] gagal mengirim verifikasi:", err);
    return "failed";
  }
}

// Kirim link reset password (berlaku 1 jam). Mengembalikan "sent" | "cooldown" | "failed".
export async function sendPasswordResetEmail(db: Database, env: Env, user: TargetUser): Promise<"sent" | "cooldown" | "failed"> {
  if (await isInCooldown(db, user.id, "reset_password")) return "cooldown";
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
    console.error("[auth-email] RESEND_API_KEY/FROM_EMAIL belum di-set — email reset password tidak terkirim");
    return "failed";
  }
  try {
    const token = await issueEmailToken(db, { userId: user.id, email: user.email, purpose: "reset_password" });
    const base = await getFrontendBase(db, env);
    const brand = await getBrandName(db);
    const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;
    const mailer = createEmailService(env.RESEND_API_KEY, env.FROM_EMAIL, brand, base, env.ADMIN_URL, await loadBrand(db));
    return (await mailer.sendPasswordResetLink({ to: user.email, name: user.name, url })) ? "sent" : "failed";
  } catch (err) {
    console.error("[auth-email] gagal mengirim reset password:", err);
    return "failed";
  }
}
