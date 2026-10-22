import { sql } from "drizzle-orm";
import { users } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";

// users.email unik tetapi sensitif huruf besar-kecil, dan akun lama menyimpan email apa adanya.
// Pencarian berdasarkan email dari input pengguna harus selalu case-insensitive supaya satu mailbox
// tidak bisa menjadi dua akun yang berbeda hanya karena kapitalisasi.
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function findUserByEmail(db: Database, email: string) {
  return db.query.users.findFirst({
    where: sql`lower(${users.email}) = ${normalizeEmail(email)}`,
  });
}
