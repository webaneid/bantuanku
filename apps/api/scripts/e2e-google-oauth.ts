/**
 * E2E login Google (ADR-0010) terhadap server Google TIRUAN — tidak memanggil Google sungguhan.
 * Menguji: PKCE, state/nonce, verifikasi ID token (aud/iss/exp/nonce/sig/alg), pre-hijack, staf, nonaktif,
 * penautan data guest, replay, open redirect, kode tukar sekali pakai.
 *
 * Jalankan (butuh PostgreSQL dev berisi seed; akun staf admin@bantuanku.org harus ada):
 *   1. Jalankan API dengan env:
 *      GOOGLE_CLIENT_ID=test-client GOOGLE_CLIENT_SECRET=test-secret \
 *      GOOGLE_OAUTH_AUTH_URL=http://127.0.0.1:59000/auth GOOGLE_OAUTH_TOKEN_URL=http://127.0.0.1:59000/token \
 *      GOOGLE_OAUTH_JWKS_URL=http://127.0.0.1:59000/certs API_URL=http://localhost:50245 \
 *      FRONTEND_URL=http://localhost:3002 npx tsx server-node.ts
 *   2. cd apps/api && npx tsx scripts/e2e-google-oauth.ts
 * Data uji berawalan "f3test-" dan dibersihkan sendiri. Menolak jalan bila DATABASE_URL bukan localhost.
 * whatsapp_enabled dimatikan sementara (register memicu WA; DB dev bisa menunjuk gateway GOWA nyata).
 */
import "../load-env";
import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import * as jose from "jose";
import { createDb } from "@bantuanku/db/client";
import { sql } from "drizzle-orm";
import { issueEmailToken } from "../src/lib/email-tokens";

const API = "http://localhost:50245/v1";
const CLIENT = "test-client";
// IP unik per request: rate limit auth (20/15 menit per IP) bukan bagian yang diuji di sini
const _fetch = globalThis.fetch; let _n = 0;
globalThis.fetch = ((input: any, init: any = {}) => {
  if (String(input).startsWith(API)) init = { ...init, headers: { ...(init.headers || {}), "X-Forwarded-For": `10.9.${Math.floor(_n / 250)}.${_n++ % 250}` } };
  return _fetch(input, init);
}) as typeof fetch;
const dbUrl = process.env.DATABASE_URL || "";
if (!/(@|\/\/)(localhost|127\.0\.0\.1)(:|\/)/.test(dbUrl)) { console.error("ABORT: DATABASE_URL bukan localhost"); process.exit(2); }
const db = createDb(dbUrl);
let fail = 0;
const ok = (n: string, c: boolean, x: any = "") => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const rows = async (q: any): Promise<any[]> => { const r: any = await db.execute(q); return Array.isArray(r) ? r : r.rows; };
const TAG = "f3test"; const E = (n: string) => `${TAG}-${n}@test.invalid`;

// ---- Google tiruan ----
let goodKey: jose.GenerateKeyPairResult, evilKey: jose.GenerateKeyPairResult;
type Minted = { claims: any; nonce: string; challenge: string; used: boolean };
const minted = new Map<string, Minted>();
let pkceFailures = 0;
async function signIdToken(key: any, claims: any, o: { aud?: string; iss?: string; exp?: string; nonce: string; alg?: string }) {
  return new jose.SignJWT({ ...claims, nonce: o.nonce })
    .setProtectedHeader({ alg: o.alg || "RS256", kid: "k1" }).setIssuer(o.iss || "https://accounts.google.com").setAudience(o.aud || CLIENT)
    .setIssuedAt().setExpirationTime(o.exp || "10m").sign(key);
}
let tokenMode: { key?: any; aud?: string; iss?: string; exp?: string; nonceOverride?: string; alg?: string } = {};
const server = http.createServer(async (req, res) => {
  if (req.url === "/certs") { const jwk = await jose.exportJWK(goodKey.publicKey); res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ keys: [{ ...jwk, kid: "k1", alg: "RS256", use: "sig" }] })); }
  if (req.url === "/token" && req.method === "POST") {
    let body = ""; for await (const ch of req) body += ch;
    const p = new URLSearchParams(body);
    const m = minted.get(p.get("code") || "");
    const bad = (s = 400) => { res.statusCode = s; res.end(JSON.stringify({ error: "invalid_grant" })); };
    if (!m || m.used) return bad();
    if (p.get("client_id") !== CLIENT || p.get("client_secret") !== "test-secret" || p.get("grant_type") !== "authorization_code") return bad();
    // PKCE: S256(verifier) harus sama dengan challenge dari permintaan awal
    const chal = createHash("sha256").update(p.get("code_verifier") || "").digest("base64url");
    if (chal !== m.challenge) { pkceFailures++; return bad(); }
    m.used = true;
    const idt = await signIdToken(tokenMode.key || goodKey.privateKey, m.claims, { aud: tokenMode.aud, iss: tokenMode.iss, exp: tokenMode.exp, nonce: tokenMode.nonceOverride ?? m.nonce, alg: tokenMode.alg });
    res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ id_token: idt }));
  }
  res.statusCode = 404; res.end();
});

// ---- alur login Google lewat API ----
async function startFlow(returnTo?: string) {
  const r = await fetch(`${API}/auth/google/start${returnTo !== undefined ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`, { redirect: "manual" });
  const loc = new URL(r.headers.get("location")!);
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  return { status: r.status, loc, cookie, setCookie: r.headers.get("set-cookie") || "" };
}
async function loginGoogle(claims: any, opts: { mode?: typeof tokenMode; returnTo?: string; tamperState?: boolean; dropCookie?: boolean; query?: string } = {}) {
  tokenMode = opts.mode || {};
  const f = await startFlow(opts.returnTo);
  const code = randomBytes(16).toString("hex");
  minted.set(code, { claims, nonce: f.loc.searchParams.get("nonce")!, challenge: f.loc.searchParams.get("code_challenge")!, used: false });
  const state = opts.tamperState ? "state-palsu" : f.loc.searchParams.get("state")!;
  const url = `${API}/auth/google/callback?${opts.query ?? `code=${code}&state=${encodeURIComponent(state)}`}`;
  const r = await fetch(url, { redirect: "manual", headers: opts.dropCookie ? {} : { Cookie: f.cookie } });
  return { status: r.status, loc: new URL(r.headers.get("location")!), code, cookie: f.cookie, state, setCookie: r.headers.get("set-cookie") || "" };
}
const exchange = async (code: string) => { const r = await fetch(`${API}/auth/google/exchange`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }); return { status: r.status, body: await r.json() as any }; };
const G = (n: string, extra: any = {}) => ({ sub: `sub-${TAG}-${n}`, email: E(n), email_verified: true, name: `Google ${n}`, ...extra });
const errOf = (l: URL) => l.pathname === "/login" ? l.searchParams.get("error") : null;
const clean = async () => { await db.execute(sql`delete from transactions where donor_email like ${TAG + "-%"}`); await db.execute(sql`delete from donatur where email like ${TAG + "-%"}`); await db.execute(sql`delete from users where email like ${TAG + "-%"}`); };

(async () => {
  const [waRow] = await rows(sql`select value from settings where key='whatsapp_enabled'`);
  const waOriginal = waRow?.value;
  await db.execute(sql`update settings set value='false' where key='whatsapp_enabled'`);
  goodKey = await jose.generateKeyPair("RS256"); evilKey = await jose.generateKeyPair("RS256");
  await new Promise<void>((r) => server.listen(59000, "127.0.0.1", r));
  await clean();

  let r: any = await (await fetch(`${API}/auth/methods`)).json();
  ok("/auth/methods: google aktif bila env diisi", r.data?.google === true, r);

  // ---- start: cookie & redirect
  const f = await startFlow("/account/profile");
  ok("start -> 302 ke Google tiruan dengan PKCE S256 + state + nonce", f.status === 302 && f.loc.origin === "http://127.0.0.1:59000" && f.loc.searchParams.get("code_challenge_method") === "S256" && !!f.loc.searchParams.get("state") && !!f.loc.searchParams.get("nonce") && f.loc.searchParams.get("scope") === "openid email profile" && f.loc.searchParams.get("redirect_uri") === "http://localhost:50245/v1/auth/google/callback" && f.loc.searchParams.get("client_id") === CLIENT, Object.fromEntries(f.loc.searchParams));
  ok("cookie state httpOnly + SameSite=Lax", /HttpOnly/i.test(f.setCookie) && /SameSite=Lax/i.test(f.setCookie), f.setCookie);
  ok("verifier TIDAK dikirim ke Google, hanya challenge", !f.loc.search.includes("code_verifier"));

  // ---- akun baru
  let g = await loginGoogle(G("a"));
  ok("akun baru: redirect ke web /auth/google dengan kode", g.status === 302 && g.loc.pathname === "/auth/google" && !!g.loc.searchParams.get("code"), g.loc.href);
  ok("token sesi TIDAK ada di URL redirect", !/accessToken|refreshToken|eyJ/.test(g.loc.href), g.loc.href);
  ok("cookie state dihapus setelah callback", /g_oauth=;|Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(g.setCookie), g.setCookie);
  const code1 = g.loc.searchParams.get("code")!;
  let ex = await exchange(code1);
  ok("exchange -> sesi (access+refresh+user)", ex.status === 200 && !!ex.body.data?.accessToken && !!ex.body.data?.refreshToken && ex.body.data?.user?.email === E("a"), ex);
  ok("user baru: whatsappNumber kosong (web akan minta lengkapi)", ex.body.data?.user?.whatsappNumber === null, ex.body.data?.user);
  ok("exchange dipakai ulang -> 400", (await exchange(code1)).status === 400);
  const [ua] = await rows(sql`select id, email_verified_at, password_hash from users where email=${E("a")}`);
  ok("user: terverifikasi, tanpa password", ua.email_verified_at !== null && ua.password_hash === null, ua);
  const rolesA = await rows(sql`select r.slug from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=${ua.id}`);
  ok("peran hanya 'user'", rolesA.length === 1 && rolesA[0].slug === "user", rolesA);
  ok("tautan oauth + record donatur dibuat", (await rows(sql`select 1 from user_oauth_accounts where user_id=${ua.id} and provider='google'`)).length === 1 && (await rows(sql`select 1 from donatur where user_id=${ua.id}`)).length === 1);
  const pw = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: E("a"), password: "apapun12345" }) });
  ok("akun Google-only tidak bisa login password", pw.status === 401, pw.status);
  const me = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${ex.body.data.accessToken}` } });
  ok("access token hasil exchange valid di /auth/me", me.status === 200, me.status);

  // ---- login ulang (match lewat sub)
  g = await loginGoogle(G("a", { email: E("a") }));
  ex = await exchange(g.loc.searchParams.get("code")!);
  ok("login ulang -> user yang sama, tidak ada duplikat", ex.body.data?.user?.id === ua.id && (await rows(sql`select 1 from users where email=${E("a")}`)).length === 1, ex.body);

  // ---- akun lokal terverifikasi -> ditautkan
  await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: E("b"), password: "PasswordLama1!", name: "Lokal B", whatsappNumber: "081200000021" }) });
  const [ub] = await rows(sql`select id from users where email=${E("b")}`);
  await db.execute(sql`update users set email_verified_at=now() where id=${ub.id}`);
  g = await loginGoogle(G("b"));
  ex = await exchange(g.loc.searchParams.get("code")!);
  ok("akun lokal TERVERIFIKASI ditautkan ke Google (user sama)", ex.body.data?.user?.id === ub.id && (await rows(sql`select 1 from user_oauth_accounts where user_id=${ub.id}`)).length === 1, ex.body);
  const lb = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: E("b"), password: "PasswordLama1!" }) });
  ok("password lokal tetap berfungsi setelah ditautkan", lb.status === 200, lb.status);

  // ---- PRE-HIJACK: akun lokal BELUM terverifikasi dibuat penyerang dengan email korban (ADR-0011)
  await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: E("c"), password: "PasswordPenyerang1!", name: "Penyerang C", whatsappNumber: "081200000022" }) });
  const [uc0] = await rows(sql`select id from users where email=${E("c")}`);
  const atkLogin0 = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: E("c"), password: "PasswordPenyerang1!" }) });
  ok("sebelum klaim: penyerang belum bisa login (belum terverifikasi)", atkLogin0.status === 403, atkLogin0.status);
  g = await loginGoogle(G("c"));
  ok("pemilik email (Google) MENGKLAIM akun belum terverifikasi -> sukses", g.loc.pathname === "/auth/google" && !!g.loc.searchParams.get("code"), g.loc.href);
  ex = await exchange(g.loc.searchParams.get("code")!);
  const [uc] = await rows(sql`select id, email_verified_at, password_hash, sessions_valid_after from users where email=${E("c")}`);
  ok("akun yang sama, kini terverifikasi", ex.body.data?.user?.id === uc0.id && uc.email_verified_at !== null, [ex.body, uc]);
  ok("PASSWORD PENYERANG DIHAPUS (password_hash NULL)", uc.password_hash === null, uc);
  ok("sesi lama dicabut (sessions_valid_after terisi)", uc.sessions_valid_after !== null, uc);
  const atkLogin1 = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: E("c"), password: "PasswordPenyerang1!" }) });
  ok("penyerang TIDAK bisa login dengan password yang ditanamnya", atkLogin1.status === 401, atkLogin1.status);
  ok("tautan oauth dibuat untuk akun yang diklaim", (await rows(sql`select 1 from user_oauth_accounts where user_id=${uc.id}`)).length === 1);
  ok("token tertunda akun itu dihanguskan", (await rows(sql`select 1 from auth_email_tokens where user_id=${uc.id} and consumed_at is null and purpose <> 'google_exchange'`)).length === 0);

  // ---- staf & nonaktif
  g = await loginGoogle(G("adm", { email: "admin@bantuanku.org" }));
  ok("Google untuk akun staf DITOLAK", errOf(g.loc) === "google_staff", g.loc.href);
  await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: E("d"), password: "PasswordLama1!", name: "Nonaktif D", whatsappNumber: "081200000023" }) });
  await db.execute(sql`update users set email_verified_at=now(), is_active=false where email=${E("d")}`);
  g = await loginGoogle(G("d"));
  ok("akun nonaktif DITOLAK", errOf(g.loc) === "google_inactive", g.loc.href);

  // ---- data guest ditautkan untuk akun Google baru
  await db.execute(sql`insert into donatur (id, email, name) values ('f3test-don-e', ${E("e")}, 'Donatur E')`);
  await db.execute(sql`insert into transactions (id, transaction_number, product_type, product_id, category, product_name, donor_name, donor_email, quantity, unit_price, subtotal, total_amount, payment_status)
                       values ('f3test-trx-e', 'TRX-F3TEST-0001', 'campaign', 'f3test-prod', 'donasi', 'Uji', 'E', ${E("e")}, 1, 10000, 10000, 10000, 'paid')`);
  g = await loginGoogle(G("e"));
  ex = await exchange(g.loc.searchParams.get("code")!);
  const [ue] = await rows(sql`select id from users where email=${E("e")}`);
  const [te] = await rows(sql`select user_id from transactions where id='f3test-trx-e'`);
  const [de] = await rows(sql`select user_id from donatur where id='f3test-don-e'`);
  ok("akun Google baru: donatur + transaksi guest (email sama) ditautkan", te.user_id === ue.id && de.user_id === ue.id, [te, de]);

  // ---- serangan pada callback
  g = await loginGoogle(G("x1"), { tamperState: true });
  ok("state tidak cocok -> ditolak", errOf(g.loc) === "google_failed", g.loc.href);
  g = await loginGoogle(G("x2"), { dropCookie: true });
  ok("tanpa cookie state -> ditolak", errOf(g.loc) === "google_failed", g.loc.href);
  g = await loginGoogle(G("x3"), { query: "error=access_denied" });
  ok("pengguna membatalkan di Google -> google_cancelled", errOf(g.loc) === "google_cancelled", g.loc.href);
  g = await loginGoogle(G("x4"), { query: "state=apa" });
  ok("tanpa code -> ditolak", errOf(g.loc) === "google_failed", g.loc.href);
  g = await loginGoogle(G("x5", { email_verified: false }));
  ok("email_verified=false -> ditolak", errOf(g.loc) === "google_failed", g.loc.href);
  g = await loginGoogle(G("x6"), { mode: { aud: "client-lain" } });
  ok("audience salah -> ditolak", errOf(g.loc) === "google_failed", g.loc.href);
  g = await loginGoogle(G("x7"), { mode: { iss: "https://evil.example" } });
  ok("issuer salah -> ditolak", errOf(g.loc) === "google_failed", g.loc.href);
  g = await loginGoogle(G("x8"), { mode: { exp: "-1m" as any } });
  ok("ID token kedaluwarsa -> ditolak", errOf(g.loc) === "google_failed", g.loc.href);
  g = await loginGoogle(G("x9"), { mode: { nonceOverride: "nonce-lain" } });
  ok("nonce tidak cocok -> ditolak", errOf(g.loc) === "google_failed", g.loc.href);
  g = await loginGoogle(G("x10"), { mode: { key: evilKey.privateKey } });
  ok("tanda tangan kunci lain -> ditolak", errOf(g.loc) === "google_failed", g.loc.href);
  // alg confusion: HS256 memakai JWKS/secret sebagai kunci
  g = await loginGoogle(G("x11"), { mode: { key: new TextEncoder().encode("test-secret"), alg: "HS256" } });
  ok("alg HS256 (confusion) -> ditolak", errOf(g.loc) === "google_failed", g.loc.href);
  ok("tidak ada akun dibuat dari semua serangan", (await rows(sql`select 1 from users where email like ${TAG + "-x%"}`)).length === 0);
  ok("PKCE verifier selalu cocok di jalur sah", pkceFailures === 0, pkceFailures);

  // replay callback dengan code & cookie yang sama
  const rp = await loginGoogle(G("a"));
  const replay = await fetch(`${API}/auth/google/callback?code=${rp.code}&state=${encodeURIComponent(rp.state)}`, { redirect: "manual", headers: { Cookie: rp.cookie } });
  ok("replay code (sekali pakai di Google) -> ditolak", errOf(new URL(replay.headers.get("location")!)) === "google_failed", replay.headers.get("location"));

  // ---- returnTo / open redirect
  g = await loginGoogle(G("a"), { returnTo: "//evil.example/phish" });
  ok("returnTo //evil.example dinetralkan ke /account", g.loc.searchParams.get("next") === "/account", g.loc.href);
  g = await loginGoogle(G("a"), { returnTo: "https://evil.example" });
  ok("returnTo URL absolut dinetralkan", g.loc.searchParams.get("next") === "/account", g.loc.href);
  g = await loginGoogle(G("a"), { returnTo: "/\\evil.example" });
  ok("returnTo backslash dinetralkan", g.loc.searchParams.get("next") === "/account", g.loc.href);
  g = await loginGoogle(G("a"), { returnTo: "/account/profile" });
  ok("returnTo path sah dipertahankan", g.loc.searchParams.get("next") === "/account/profile", g.loc.href);
  ok("redirect selalu ke origin web sendiri", g.loc.origin === "http://localhost:3002", g.loc.origin);

  // ---- exchange: kode tak sah / purpose lain / kedaluwarsa
  ok("exchange kode ngawur -> 400", (await exchange("x".repeat(43))).status === 400);
  const [ua2] = await rows(sql`select id from users where email=${E("a")}`);
  const tv = await issueEmailToken(db, { userId: ua2.id, email: E("a"), purpose: "verify_email" });
  ok("token verify_email TIDAK bisa ditukar jadi sesi", (await exchange(tv)).status === 400);
  const te2 = await issueEmailToken(db, { userId: ua2.id, email: E("a"), purpose: "google_exchange" });
  await db.execute(sql`update auth_email_tokens set expires_at=now()-interval '1 second' where user_id=${ua2.id} and purpose='google_exchange' and consumed_at is null`);
  ok("kode exchange kedaluwarsa -> 400", (await exchange(te2)).status === 400);
  const te3 = await issueEmailToken(db, { userId: ua2.id, email: E("a"), purpose: "google_exchange" });
  const rvf = await fetch(`${API}/auth/email/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: te3 }) });
  ok("kode google_exchange TIDAK bisa dipakai untuk verifikasi email", rvf.status === 400, rvf.status);

  // ---- tanpa konfigurasi
  const { getGoogleConfig } = await import("../src/lib/google-oauth");
  const saved = { id: process.env.GOOGLE_CLIENT_ID, sec: process.env.GOOGLE_CLIENT_SECRET };
  delete process.env.GOOGLE_CLIENT_ID;
  ok("tanpa GOOGLE_CLIENT_ID fitur nonaktif (config null)", getGoogleConfig({} as any) === null);
  process.env.GOOGLE_CLIENT_ID = saved.id; process.env.GOOGLE_CLIENT_SECRET = saved.sec;

  await clean();
  if (waOriginal !== undefined) await db.execute(sql`update settings set value=${waOriginal} where key='whatsapp_enabled'`);
  server.close();
  console.log(fail ? `\n${fail} GAGAL` : "\nSEMUA LOLOS"); process.exit(fail ? 1 : 0);
})();
