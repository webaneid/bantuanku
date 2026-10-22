import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import * as jose from "jose";
import type { Env } from "../types";

// Login/daftar Google (ADR-0010): Authorization Code + PKCE, ditangani sepenuhnya di API.
// Fitur aktif hanya bila GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET terisi.
// URL endpoint bisa di-override lewat env (GOOGLE_OAUTH_*_URL) HANYA untuk uji dengan server Google tiruan.

const DEFAULT_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export const GOOGLE_STATE_COOKIE = "g_oauth";
export const GOOGLE_STATE_TTL_SECONDS = 10 * 60;

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  jwksUrl: string;
}

export function getGoogleConfig(env: Env): GoogleConfig | null {
  const e = process.env;
  const clientId = e.GOOGLE_CLIENT_ID;
  const clientSecret = e.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const allowOverride = env.ENVIRONMENT !== "production";
  if (!allowOverride && (e.GOOGLE_OAUTH_AUTH_URL || e.GOOGLE_OAUTH_TOKEN_URL || e.GOOGLE_OAUTH_JWKS_URL)) {
    console.warn("[google-oauth] GOOGLE_OAUTH_*_URL diabaikan di production");
  }
  const apiBase = (e.API_URL || env.API_URL || "").replace(/\/+$/, "");
  const redirectUri = e.GOOGLE_REDIRECT_URI || `${apiBase}/v1/auth/google/callback`;
  return {
    clientId,
    clientSecret,
    redirectUri,
    // Override endpoint hanya untuk uji dengan server Google tiruan; di production diabaikan
    // (client_secret dikirim ke tokenUrl, jadi nilai override yang salah akan membocorkannya).
    authUrl: allowOverride ? e.GOOGLE_OAUTH_AUTH_URL || DEFAULT_AUTH_URL : DEFAULT_AUTH_URL,
    tokenUrl: allowOverride ? e.GOOGLE_OAUTH_TOKEN_URL || DEFAULT_TOKEN_URL : DEFAULT_TOKEN_URL,
    jwksUrl: allowOverride ? e.GOOGLE_OAUTH_JWKS_URL || DEFAULT_JWKS_URL : DEFAULT_JWKS_URL,
  };
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function generatePkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function randomToken(bytes = 24): string {
  return b64url(randomBytes(bytes));
}

// returnTo hanya boleh path relatif di situs sendiri (cegah open redirect). Parser URL browser membuang
// TAB/CR/LF, jadi "/\t/evil.com" menjadi "//evil.com": karakter kontrol ditolak dan hasil parse harus tetap di origin tiruan.
export function sanitizeReturnTo(value: string | undefined | null): string {
  if (!value || value.length > 300) return "/account";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return "/account";
  try {
    const parsed = new URL(value, "http://internal.invalid");
    if (parsed.origin !== "http://internal.invalid") return "/account";
  } catch {
    return "/account";
  }
  return value;
}

export interface OAuthStatePayload {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
}

// State/nonce/verifier disimpan di cookie httpOnly bertanda tangan (JWT 10 menit), bukan di server.
export async function signOAuthState(payload: OAuthStatePayload, secret: string): Promise<string> {
  return new jose.SignJWT({ ...payload, purpose: "google-oauth" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GOOGLE_STATE_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyOAuthState(token: string | undefined, secret: string): Promise<OAuthStatePayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    if (payload.purpose !== "google-oauth") return null;
    const { state, nonce, verifier, returnTo } = payload as any;
    if (![state, nonce, verifier, returnTo].every((v) => typeof v === "string")) return null;
    return { state, nonce, verifier, returnTo };
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function buildAuthUrl(cfg: GoogleConfig, params: { state: string; nonce: string; challenge: string }): string {
  const url = new URL(cfg.authUrl);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

// Tukar authorization code dengan ID token. Mengembalikan null bila Google menolak.
export async function exchangeCodeForIdToken(cfg: GoogleConfig, code: string, verifier: string): Promise<string | null> {
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: "authorization_code",
    code_verifier: verifier,
  });
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // Jangan log body respons utuh: bisa memuat detail permintaan
    console.error("[google-oauth] penukaran kode gagal:", res.status);
    return null;
  }
  const json = (await res.json().catch(() => null)) as { id_token?: unknown } | null;
  return typeof json?.id_token === "string" ? json.id_token : null;
}

export interface GoogleClaims {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

// JWKS di-cache oleh jose (createRemoteJWKSet) per URL.
const jwksCache = new Map<string, ReturnType<typeof jose.createRemoteJWKSet>>();
function getJwks(url: string) {
  let jwks = jwksCache.get(url);
  if (!jwks) {
    jwks = jose.createRemoteJWKSet(new URL(url), { timeoutDuration: 10_000 });
    jwksCache.set(url, jwks);
  }
  return jwks;
}

// Verifikasi ID token: tanda tangan RS256 (JWKS Google), issuer, audience, exp, nonce, dan email_verified === true.
export async function verifyGoogleIdToken(
  idToken: string,
  cfg: Pick<GoogleConfig, "clientId" | "jwksUrl">,
  expectedNonce: string,
  keyResolver: Parameters<typeof jose.jwtVerify>[1] = getJwks(cfg.jwksUrl) as any
): Promise<GoogleClaims | null> {
  try {
    const { payload } = await jose.jwtVerify(idToken, keyResolver as any, {
      issuer: GOOGLE_ISSUERS,
      audience: cfg.clientId,
      algorithms: ["RS256"],
    });
    if (typeof payload.nonce !== "string" || !safeEqual(payload.nonce, expectedNonce)) return null;
    if (payload.email_verified !== true) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    if (typeof payload.email !== "string" || !payload.email.includes("@")) return null;
    const email = payload.email.toLowerCase().trim();
    const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim().slice(0, 255) : email.split("@")[0];
    return { sub: payload.sub, email, name, picture: typeof payload.picture === "string" ? payload.picture : undefined };
  } catch {
    return null;
  }
}
