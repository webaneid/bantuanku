/**
 * E2E verifikasi email, reset password via email, pre-hijack, pencabutan sesi (ADR-0010 + ADR-0011).
 *
 * Jalankan terhadap database LOKAL saja:
 *   1. cd apps/api && npx tsx server-node.ts            (API di :50245; tanpa RESEND_API_KEY agar tidak ada email)
 *   2. cd apps/api && npx tsx scripts/e2e-auth-email.ts
 * Data uji berawalan "f4test-" dan dibersihkan sendiri. Skrip MENOLAK jalan bila DATABASE_URL bukan localhost.
 * whatsapp_enabled dimatikan sementara selama uji lalu dikembalikan: register/verifikasi memicu WA selamat datang,
 * dan DB dev bisa menunjuk gateway GOWA nyata (jangan mengirim WA sungguhan ke nomor karangan).
 */
import "../load-env";
import { createDb } from "@bantuanku/db/client";
import { sql } from "drizzle-orm";
import { issueEmailToken } from "../src/lib/email-tokens";
import { sanitizeReturnTo } from "../src/lib/google-oauth";
import { EmailService, esc } from "../src/services/email";

const API = "http://localhost:50245/v1";
const dbUrl = process.env.DATABASE_URL || "";
if (!/(@|\/\/)(localhost|127\.0\.0\.1)(:|\/)/.test(dbUrl)) { console.error("ABORT: DATABASE_URL bukan localhost"); process.exit(2); }

const _fetch = globalThis.fetch; let _n = 0;
globalThis.fetch = ((input: any, init: any = {}) => {
  if (String(input).startsWith(API) && !init.__fixedIp) init = { ...init, headers: { ...(init.headers || {}), "X-Forwarded-For": `10.8.${Math.floor(_n / 250)}.${_n++ % 250}` } };
  return _fetch(input, init);
}) as typeof fetch;

const db = createDb(dbUrl);
let fail = 0;
const ok = (n: string, c: boolean, x: any = "") => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const rows = async (q: any): Promise<any[]> => { const r: any = await db.execute(q); return Array.isArray(r) ? r : r.rows; };
const req = async (method: string, path: string, body?: any, token?: string, extra: any = {}) => {
  const r = await fetch(API + path, { method, ...extra, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: (await r.json().catch(() => ({}))) as any };
};
const post = (p: string, b: any, t?: string) => req("POST", p, b, t);
const TAG = "f4test"; const E = (n: string) => `${TAG}-${n}@test.invalid`;
const reg = (n: string, pw: string, extra: any = {}) => post("/auth/register", { email: E(n), password: pw, name: `Pengguna ${n}`, whatsappNumber: "081200000099", ...extra });
const userId = async (n: string) => (await rows(sql`select id from users where lower(email)=${E(n).toLowerCase()}`))[0]?.id;
const clean = async () => {
  await db.execute(sql`delete from transactions where donor_email like ${TAG + "-%"}`);
  await db.execute(sql`delete from donatur where email like ${TAG + "-%"}`);
  await db.execute(sql`delete from users where lower(email) like ${TAG + "-%"}`);
};

(async () => {
  const [waRow] = await rows(sql`select value from settings where key='whatsapp_enabled'`);
  const waOriginal = waRow?.value;
  await db.execute(sql`update settings set value='false' where key='whatsapp_enabled'`);
  try {
    await clean();

    // ===== A. register + gate login
    let r = await reg("a", "PasswordA123!");
    ok("register 201 + emailVerificationRequired", r.status === 201 && r.body.data?.emailVerificationRequired === true, r);
    const ua = await userId("a");
    r = await post("/auth/login", { email: E("a"), password: "PasswordA123!" });
    ok("login sebelum verifikasi -> 403 EMAIL_NOT_VERIFIED", r.status === 403 && r.body.code === "EMAIL_NOT_VERIFIED" && !r.body.data, r);
    r = await post("/auth/login", { email: E("a"), password: "SALAH-salah-1" });
    ok("password salah -> 401 (status akun tidak bocor)", r.status === 401 && !r.body.code, r);
    r = await post("/auth/login", { email: E("a").toUpperCase(), password: "PasswordA123!" });
    ok("login case-insensitive (email huruf besar) tetap kena gate", r.status === 403 && r.body.code === "EMAIL_NOT_VERIFIED", r);

    // ===== B. verifikasi: token + password
    const tokA = await issueEmailToken(db, { userId: ua, email: E("a"), purpose: "verify_email" });
    const [stored] = await rows(sql`select token_hash from auth_email_tokens where user_id=${ua} order by created_at desc limit 1`);
    ok("DB hanya menyimpan hash token", stored.token_hash !== tokA && stored.token_hash.length === 64);
    r = await post("/auth/email/verify", { token: "x".repeat(43), password: "PasswordA123!" });
    ok("token ngawur -> 400 INVALID_TOKEN", r.status === 400 && r.body.code === "INVALID_TOKEN", r);
    r = await post("/auth/email/verify", { token: tokA });
    ok("tanpa password -> 400 INVALID_PASSWORD (tidak terverifikasi)", r.status === 400 && r.body.code === "INVALID_PASSWORD", r);
    r = await post("/auth/email/verify", { token: tokA, password: "SALAH-salah-1" });
    ok("password salah -> 400 INVALID_PASSWORD", r.status === 400 && r.body.code === "INVALID_PASSWORD", r);
    const [va0] = await rows(sql`select email_verified_at from users where id=${ua}`);
    ok("salah password TIDAK memverifikasi dan TIDAK membakar token", va0.email_verified_at === null);
    r = await post("/auth/email/verify", { token: tokA, password: "PasswordA123!" });
    ok("verifikasi token + password benar -> 200 + sesi langsung", r.status === 200 && r.body.data?.verified === true && !!r.body.data?.accessToken && !!r.body.data?.refreshToken, r);
    const sessA = r.body.data;
    r = await post("/auth/email/verify", { token: tokA, password: "PasswordA123!" });
    ok("token dipakai ulang -> 400", r.status === 400, r);
    r = await post("/auth/login", { email: E("a"), password: "PasswordA123!" });
    ok("login setelah verifikasi -> 200", r.status === 200 && !!r.body.data?.accessToken, r);
    r = await reg("a", "LainLagi123!");
    ok("register email yang sudah TERVERIFIKASI -> 400", r.status === 400, r);

    // token kedaluwarsa / lama hangus / email berubah / purpose silang
    await reg("b", "PasswordB123!"); const ub = await userId("b");
    const tExp = await issueEmailToken(db, { userId: ub, email: E("b"), purpose: "verify_email" });
    await db.execute(sql`update auth_email_tokens set expires_at=now()-interval '1 minute' where user_id=${ub} and consumed_at is null`);
    r = await post("/auth/email/verify", { token: tExp, password: "PasswordB123!" });
    ok("token kedaluwarsa -> 400", r.status === 400, r);
    const tOld = await issueEmailToken(db, { userId: ub, email: E("b"), purpose: "verify_email" });
    const tNew = await issueEmailToken(db, { userId: ub, email: E("b"), purpose: "verify_email" });
    ok("token lama hangus saat token baru terbit", (await post("/auth/email/verify", { token: tOld, password: "PasswordB123!" })).status === 400);
    await db.execute(sql`update users set email=${E("b2")} where id=${ub}`);
    ok("email akun berubah setelah token terbit -> 400", (await post("/auth/email/verify", { token: tNew, password: "PasswordB123!" })).status === 400);
    await db.execute(sql`update users set email=${E("b")} where id=${ub}`);
    const tReset = await issueEmailToken(db, { userId: ub, email: E("b"), purpose: "reset_password" });
    ok("token reset TIDAK bisa dipakai untuk verifikasi", (await post("/auth/email/verify", { token: tReset, password: "PasswordB123!" })).status === 400);
    const tVer = await issueEmailToken(db, { userId: ub, email: E("b"), purpose: "verify_email" });
    ok("token verifikasi TIDAK bisa dipakai untuk reset", (await post("/auth/forgot-password/email/reset", { token: tVer, newPassword: "Penyerang123!" })).status === 400);

    // ===== C. PRE-HIJACK
    const vDon = "f4test-don-v", vTrx = "f4test-trx-v";
    await db.execute(sql`insert into donatur (id, email, name, phone) values (${vDon}, ${E("victim")}, 'Korban', '081299990000')`);
    await db.execute(sql`insert into transactions (id, transaction_number, product_type, product_id, category, product_name, donor_name, donor_email, donor_phone, quantity, unit_price, subtotal, total_amount, payment_status)
                         values (${vTrx}, 'TRX-F4TEST-0001', 'campaign', 'f4test-prod', 'donasi', 'Uji', 'Korban', ${E("victim")}, '081299990000', 1, 50000, 50000, 50000, 'paid')`);
    r = await reg("victim", "PasswordPenyerang1!", { name: "Penyerang" });
    ok("penyerang mendaftar dengan email korban -> 201", r.status === 201, r);
    const uv = await userId("victim");
    const tAtk = await issueEmailToken(db, { userId: uv, email: E("victim"), purpose: "verify_email" }); // link sampai ke KOTAK SURAT korban
    r = await post("/auth/email/verify", { token: tAtk, password: "tebakan-korban-123" });
    ok("korban mengklik link tapi tidak tahu password penyerang -> DITOLAK", r.status === 400 && r.body.code === "INVALID_PASSWORD", r);
    const [vd] = await rows(sql`select user_id from donatur where id=${vDon}`);
    const [vt] = await rows(sql`select user_id from transactions where id=${vTrx}`);
    ok("data korban TIDAK tertaut ke akun penyerang", vd.user_id === null && vt.user_id === null, [vd, vt]);
    r = await post("/auth/login", { email: E("victim"), password: "PasswordPenyerang1!" });
    ok("penyerang tetap tidak bisa login (email tak terbukti)", r.status === 403, r);

    // korban mendaftar sendiri -> daftar ulang menimpa password penyerang
    r = await reg("victim", "PasswordKorban1!", { name: "Korban Asli" });
    ok("korban daftar ulang akun belum terverifikasi -> 201, akun yang sama", r.status === 201 && r.body.data?.id === uv, r);
    const tVic = await issueEmailToken(db, { userId: uv, email: E("victim"), purpose: "verify_email" });
    r = await post("/auth/email/verify", { token: tVic, password: "PasswordPenyerang1!" });
    ok("password penyerang tidak berlaku lagi setelah daftar ulang", r.status === 400 && r.body.code === "INVALID_PASSWORD", r);
    r = await post("/auth/email/verify", { token: tVic, password: "PasswordKorban1!" });
    ok("korban verifikasi dengan password-nya -> 200", r.status === 200 && r.body.data?.verified === true, r);
    const [vt2] = await rows(sql`select user_id from transactions where id=${vTrx}`);
    const [vd2] = await rows(sql`select user_id from donatur where id=${vDon}`);
    ok("data guest korban ditautkan SETELAH verifikasi sah", vt2.user_id === uv && vd2.user_id === uv, [vt2, vd2]);
    r = await post("/auth/login", { email: E("victim"), password: "PasswordPenyerang1!" });
    ok("password penyerang ditolak", r.status === 401, r);
    const lgV = await post("/auth/login", { email: E("victim"), password: "PasswordKorban1!" });
    const listV = await req("GET", "/account/donations", undefined, lgV.body.data?.accessToken);
    ok("riwayat donasi korban tampil di akunnya", listV.status === 200 && JSON.stringify(listV.body).includes("TRX-F4TEST-0001"), listV.body?.pagination);

    // klaim nomor WA tidak memberi akses
    await db.execute(sql`insert into transactions (id, transaction_number, product_type, product_id, category, product_name, donor_name, donor_email, donor_phone, quantity, unit_price, subtotal, total_amount, payment_status)
                         values ('f4test-trx-p', 'TRX-F4TEST-0002', 'campaign', 'f4test-prod', 'donasi', 'Uji', 'Lain', ${E("lain")}, '081200000099', 1, 25000, 25000, 25000, 'paid')`);
    const listA = await req("GET", "/account/donations", undefined, sessA.accessToken);
    ok("nomor WA sama TIDAK memberi akses ke transaksi orang lain", !JSON.stringify(listA.body).includes("TRX-F4TEST-0002"), listA.body);
    ok("detail transaksi orang lain -> 404", (await req("GET", "/account/donations/f4test-trx-p", undefined, sessA.accessToken)).status === 404);

    // ===== D. reset via email + pencabutan sesi
    r = await post("/auth/forgot-password/email/request", { email: E("a") });
    const rUnknown = await post("/auth/forgot-password/email/request", { email: "tidak-ada@test.invalid" });
    ok("request reset: respons identik untuk email terdaftar/tidak", r.status === 200 && rUnknown.status === 200 && r.body.message === rUnknown.body.message, [r.body, rUnknown.body]);
    await new Promise((res) => setTimeout(res, 1100)); // iat berdetik: pastikan reset jatuh di detik berbeda dari login
    const lgA = await post("/auth/login", { email: E("a"), password: "PasswordA123!" });
    const refreshOld = lgA.body.data.refreshToken;
    ok("refresh token sebelum reset berfungsi", (await post("/auth/refresh", { refreshToken: refreshOld })).status === 200);
    await new Promise((res) => setTimeout(res, 1100));
    const tRes = await issueEmailToken(db, { userId: ua, email: E("a"), purpose: "reset_password" });
    ok("password baru < 8 karakter -> 400 dan token tidak hangus", (await post("/auth/forgot-password/email/reset", { token: tRes, newPassword: "short" })).status === 400);
    r = await post("/auth/forgot-password/email/reset", { token: tRes, newPassword: "PasswordBaruA1!" });
    ok("reset valid -> 200", r.status === 200 && r.body.data?.reset === true, r);
    ok("token reset dipakai ulang -> 400", (await post("/auth/forgot-password/email/reset", { token: tRes, newPassword: "LainLagi123!" })).status === 400);
    r = await post("/auth/refresh", { refreshToken: refreshOld });
    ok("refresh token LAMA dicabut setelah reset password -> 401", r.status === 401, r);
    const lgNew = await post("/auth/login", { email: E("a"), password: "PasswordBaruA1!" });
    ok("login password baru OK; refresh token baru berfungsi", lgNew.status === 200 && (await post("/auth/refresh", { refreshToken: lgNew.body.data.refreshToken })).status === 200, lgNew);
    ok("password lama ditolak", (await post("/auth/login", { email: E("a"), password: "PasswordA123!" })).status === 401);

    // refresh menolak akun belum terverifikasi
    await db.execute(sql`update users set email_verified_at=null where id=${ua}`);
    r = await post("/auth/refresh", { refreshToken: lgNew.body.data.refreshToken });
    ok("refresh untuk akun belum terverifikasi -> 401", r.status === 401, r);
    await db.execute(sql`update users set email_verified_at=now() where id=${ua}`);

    // ganti password (me/password) mencabut sesi
    await new Promise((res) => setTimeout(res, 1100));
    const lgC = await post("/auth/login", { email: E("a"), password: "PasswordBaruA1!" });
    await new Promise((res) => setTimeout(res, 1100));
    const cp = await req("PATCH", "/auth/me/password", { currentPassword: "PasswordBaruA1!", newPassword: "PasswordGanti1!" }, lgC.body.data.accessToken);
    ok("ganti password -> 200", cp.status === 200, cp);
    ok("refresh token lama dicabut setelah GANTI password", (await post("/auth/refresh", { refreshToken: lgC.body.data.refreshToken })).status === 401);

    // akun nonaktif
    await db.execute(sql`update users set is_active=false where id=${ua}`);
    const tIn = await issueEmailToken(db, { userId: ua, email: E("a"), purpose: "reset_password" });
    ok("reset untuk akun nonaktif -> 400", (await post("/auth/forgot-password/email/reset", { token: tIn, newPassword: "PasswordLagi1!" })).status === 400);
    await db.execute(sql`update users set is_active=true where id=${ua}`);

    // reset memverifikasi akun yang belum terverifikasi
    await reg("c", "PasswordC123!"); const uc = await userId("c");
    const tC = await issueEmailToken(db, { userId: uc, email: E("c"), purpose: "reset_password" });
    r = await post("/auth/forgot-password/email/reset", { token: tC, newPassword: "PasswordC999!" });
    const [vc] = await rows(sql`select email_verified_at from users where id=${uc}`);
    ok("reset via email memverifikasi email akun", r.status === 200 && vc.email_verified_at !== null, [r.status, vc]);
    ok("login setelah reset -> 200", (await post("/auth/login", { email: E("c"), password: "PasswordC999!" })).status === 200);

    // ===== E. enumerasi: check-registration tanpa PII; resend generik
    const cr = await req("GET", `/auth/check-registration?email=${encodeURIComponent(E("a"))}&phone=081200000099`);
    ok("check-registration: hanya exists/registered", cr.status === 200 && cr.body.data?.exists === true && Object.keys(cr.body.data).sort().join() === "exists,registered", cr.body);
    const rs = await post("/auth/email/resend", { email: "tidak-ada@test.invalid" });
    ok("resend email tak dikenal -> 200 generik", rs.status === 200 && rs.body.data?.sent === true, rs);

    // ===== F. email lowercase tersimpan; /donatur/search tanpa userId + rate limit
    await post("/auth/register", { email: `${TAG}-Mixed@Test.Invalid`, password: "PasswordM123!", name: "Mixed Case", whatsappNumber: "081200000098" });
    const [mc] = await rows(sql`select email from users where lower(email)=${E("mixed")}`);
    ok("email baru disimpan huruf kecil", mc?.email === E("mixed"), mc);
    const sr = await req("GET", `/donatur/search?email=${encodeURIComponent(E("victim"))}`);
    ok("/donatur/search: tanpa userId, dengan hasAccount", sr.status === 200 && !("userId" in (sr.body.data || {})) && sr.body.data?.hasAccount === true, sr.body);
    const sd = sr.body.data || {};
    ok("/donatur/search: data pribadi disamarkan", typeof sd.email === "string" && sd.email !== E("victim") && sd.email.includes("***@") && /\*/.test(sd.name || "") && !!sd.id, sd);
    let last = 0; for (let i = 0; i < 32; i++) { const x = await fetch(`${API}/donatur/search?email=nobody-${i}@test.invalid`, { headers: { "X-Forwarded-For": "10.77.0.1" }, __fixedIp: true } as any); last = x.status; }
    ok("/donatur/search kena rate limit ketat (429 setelah 30)", last === 429, last);

    // ===== G. unit: returnTo & escape HTML email
    const bad = ["//evil.com", "/\t/evil.com", "/\r\n/evil.com", "/\\evil.com", "https://evil.com", "/%09/evil.com".replace("%09", "\t"), "javascript:alert(1)", "", "evil.com", "/" + "a".repeat(400)];
    ok("returnTo berbahaya semuanya dinetralkan ke /account", bad.every((v) => sanitizeReturnTo(v) === "/account"), bad.map((v) => [v, sanitizeReturnTo(v)]));
    ok("returnTo sah dipertahankan", sanitizeReturnTo("/account/profile?x=1") === "/account/profile?x=1");
    let sent: any = null; const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => { if (String(url).includes("resend.com")) { sent = JSON.parse(init.body); return new Response("{}", { status: 200 }); } return realFetch(url, init); }) as any;
    await new EmailService("re_test", "noreply@test.invalid", 'Brand "X" <b>', "http://localhost:3002").sendEmailVerification({ to: "x@test.invalid", name: '<a href="https://evil.example">Klik di sini</a><script>1</script>', url: "http://localhost:3002/verifikasi-email?token=abc&x=1" });
    globalThis.fetch = realFetch;
    ok("nama berisi HTML TIDAK lolos mentah ke email", !!sent && !sent.html.includes('<a href="https://evil.example">') && !sent.html.includes("<script>") && sent.html.includes("&lt;a href=&quot;https://evil.example&quot;&gt;"), sent?.html?.slice(0, 400));
    ok("esc() menangani karakter khusus", esc(`<>&"'`) === "&lt;&gt;&amp;&quot;&#39;");

    await clean();
    const left = await rows(sql`select (select count(*) from users where lower(email) like ${TAG + "-%"}) u, (select count(*) from donatur where email like ${TAG + "-%"}) d, (select count(*) from transactions where donor_email like ${TAG + "-%"}) t`);
    ok("data uji dibersihkan", Number(left[0].u) + Number(left[0].d) + Number(left[0].t) === 0, left[0]);
  } finally {
    if (waOriginal !== undefined) await db.execute(sql`update settings set value=${waOriginal} where key='whatsapp_enabled'`);
  }
  console.log(fail ? `\n${fail} GAGAL` : "\nSEMUA LOLOS"); process.exit(fail ? 1 : 0);
})();
