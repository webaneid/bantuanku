import { eq, or } from "drizzle-orm";
import { donatur } from "@bantuanku/db";
import { normalizeEmail, normalizePhone } from "../lib/contact-helpers";

export type DonaturIdentifier = { kind: "email"; value: string } | { kind: "phone"; value: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Isian checkout (satu kolom): ada "@" berarti email, selain itu nomor HP/WhatsApp.
 * Mengembalikan null bila formatnya tidak valid.
 */
export function parseDonaturIdentifier(input: string | null | undefined): DonaturIdentifier | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  if (raw.includes("@")) {
    const email = normalizeEmail(raw);
    return EMAIL_PATTERN.test(email) ? { kind: "email", value: email } : null;
  }

  const phone = normalizePhone(raw);
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 ? { kind: "phone", value: phone } : null;
}

/** Cari donatur dari email, atau dari nomor HP/WhatsApp. */
export async function findDonaturByIdentifier(db: any, identifier: DonaturIdentifier) {
  const where =
    identifier.kind === "email"
      ? eq(donatur.email, identifier.value)
      : or(eq(donatur.phone, identifier.value), eq(donatur.whatsappNumber, identifier.value));

  return db.query.donatur.findFirst({ where });
}

/** Email placeholder `donor-<id>@temp.local` dibuat bila donatur tidak punya email: bukan email nyata. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !email || email.endsWith("@temp.local");
}
