import { eq } from "drizzle-orm";
import { donatur } from "@bantuanku/db";
import { maskEmail, maskName, maskPhone } from "./contact-helpers";

/** Role staf yang boleh melihat data donatur lengkap pada transaksi (selain pemilik transaksi). */
const STAFF_ROLES = ["super_admin", "admin_finance", "admin_campaign"];

/** Tanda di `type_specific_data` bahwa identitas donatur transaksi ini diambil dari profil donatur terdaftar. */
export const DONOR_FROM_PROFILE_KEY = "donor_from_profile";

type RequestUser = { id: string; email?: string | null; roles?: string[] } | undefined;

/**
 * Data donatur pada transaksi yang identitasnya diambil dari profil terdaftar (bukan diketik sendiri)
 * hanya boleh dilihat lengkap oleh staf atau pemilik transaksi (user yang login dan cocok dengan
 * donatur/user transaksi). Selain itu tersamar, karena endpoint baca transaksi bersifat publik.
 */
export async function canSeeFullDonor(db: any, user: RequestUser, txn: any): Promise<boolean> {
  if (!user) return false;
  if ((user.roles || []).some((role) => STAFF_ROLES.includes(role))) return true;
  if (txn.userId && txn.userId === user.id) return true;

  if (txn.donaturId) {
    const owner = await db.query.donatur.findFirst({
      where: eq(donatur.id, txn.donaturId),
      columns: { email: true, userId: true },
    });
    if (owner?.userId && owner.userId === user.id) return true;
    if (owner?.email && user.email && owner.email.toLowerCase() === user.email.toLowerCase()) return true;
  }

  return false;
}

/** Samarkan nama/email/HP donatur bila transaksi bertanda "data dari profil" dan pembaca bukan pemilik/staf. */
export async function protectTransactionDonor<T extends Record<string, any>>(
  db: any,
  user: RequestUser,
  txn: T
): Promise<T> {
  if (!txn?.typeSpecificData?.[DONOR_FROM_PROFILE_KEY]) return txn;
  if (await canSeeFullDonor(db, user, txn)) return txn;

  return {
    ...txn,
    donorName: maskName(txn.donorName),
    donorEmail: txn.donorEmail ? maskEmail(txn.donorEmail) : txn.donorEmail,
    donorPhone: txn.donorPhone ? maskPhone(txn.donorPhone) : txn.donorPhone,
  };
}

/**
 * Nama donor untuk keluaran PUBLIK (daftar donatur campaign, laporan zakat/qurban, dsb.).
 * Transaksi yang identitasnya diambil dari profil terdaftar tidak boleh menampilkan nama lengkap:
 * tanpanya, orang yang mengetik email/HP orang lain lalu membayar bisa membaca nama pemiliknya dari daftar publik.
 */
export function publicDonorName(donorName: string, typeSpecificData: unknown): string {
  const flagged = Boolean((typeSpecificData as Record<string, unknown> | null | undefined)?.[DONOR_FROM_PROFILE_KEY]);
  return flagged ? maskName(donorName) : donorName;
}
