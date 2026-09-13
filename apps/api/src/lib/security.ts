import crypto from "crypto";

// Constant-time string comparison untuk signature/token webhook payment gateway.
// `===` biasa berhenti di karakter pertama yang beda, jadi durasi respons bisa
// dipakai attacker menebak signature yang benar sedikit demi sedikit (timing
// attack). Return false langsung kalau panjang beda — tidak bocorkan info lewat
// exception `crypto.timingSafeEqual` yang menolak buffer beda panjang.
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
