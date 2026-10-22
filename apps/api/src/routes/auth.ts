import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createHash, randomInt } from "node:crypto";
import { eq, or, inArray, and, isNull, desc } from "drizzle-orm";
import { users, userRoles, roles, createId, authOtpCodes, donatur as donaturTable } from "@bantuanku/db";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { success, error } from "../lib/response";
import { normalizePhone } from "../lib/contact-helpers";
import { authMiddleware } from "../middleware/auth";
import { authRateLimit } from "../middleware/ratelimit";
import { WhatsAppService } from "../services/whatsapp";
import { sendVerificationEmail, sendPasswordResetEmail, getFrontendBase } from "../services/auth-email";
import { buildSession } from "../services/session";
import { resolveGoogleUser } from "../services/google-account";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import {
  getGoogleConfig,
  generatePkce,
  randomToken,
  sanitizeReturnTo,
  signOAuthState,
  verifyOAuthState,
  safeEqual,
  buildAuthUrl,
  exchangeCodeForIdToken,
  verifyGoogleIdToken,
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_TTL_SECONDS,
} from "../lib/google-oauth";
import { issueEmailToken } from "../lib/email-tokens";
import { linkVerifiedAccountData, markEmailVerified } from "../services/account-linking";
import { consumeEmailToken, peekEmailToken } from "../lib/email-tokens";
import { findUserByEmail, normalizeEmail } from "../lib/user-lookup";
import type { Env, Variables } from "../types";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(255),
  phone: z.string().max(20).optional(),
  whatsappNumber: z.string().min(10).max(20),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().max(128),
});

const forgotPasswordRequestSchema = z.object({
  phone: z.string().trim().min(8).max(30),
});

const forgotPasswordResetSchema = z.object({
  phone: z.string().trim().min(8).max(30),
  otp: z.string().trim().regex(/^\d{4,8}$/),
  newPassword: z.string().min(8).max(128),
});

const FORGOT_PASSWORD_PURPOSE = "forgot_password";
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

function toPhoneVariants(input: string): string[] {
  const normalized = normalizePhone(input);
  const digits = normalized.replace(/[^\d]/g, "");
  const national = digits.startsWith("0") ? digits : `0${digits}`;
  const intl = national.startsWith("0") ? `62${national.slice(1)}` : `62${national}`;
  const variants = [normalized, digits, national, intl, `+${intl}`]
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(variants));
}

function hashOtp(otp: string, secret: string): string {
  return createHash("sha256")
    .update(`${otp}:${secret}`)
    .digest("hex");
}

function formatOtpExpiry(date: Date): string {
  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return time.replace(".", ":");
}

auth.post("/register", authRateLimit, zValidator("json", registerSchema), async (c) => {
  const { password, name, phone, whatsappNumber } = c.req.valid("json");
  const email = normalizeEmail(c.req.valid("json").email);
  const db = c.get("db");

  const existingUser = await findUserByEmail(db, email);
  const passwordHash = await hashPassword(password);

  if (existingUser) {
    const existingRoles = await db.query.userRoles.findMany({ where: eq(userRoles.userId, existingUser.id), with: { role: true } });
    const hasStaffRole = existingRoles.some((ur) => (ur as any).role?.slug && (ur as any).role.slug !== "user");
    if (existingUser.emailVerifiedAt || hasStaffRole) {
      return error(c, "Email already registered", 400);
    }

    // Akun BELUM terverifikasi = belum ada yang membuktikan memiliki email ini: daftar ulang menimpa
    // password/data dan mencabut sesi. Aman karena verifikasi butuh mailbox DAN password terbaru
    // (ADR-0011); pihak lain yang menimpa tidak bisa memverifikasi tanpa mailbox pemilik.
    const now = new Date();
    await db
      .update(users)
      .set({ passwordHash, name, phone, whatsappNumber, sessionsValidAfter: now, updatedAt: now })
      .where(eq(users.id, existingUser.id));
    await db
      .update(donaturTable)
      .set({ passwordHash, name, phone, whatsappNumber, updatedAt: now })
      .where(eq(donaturTable.userId, existingUser.id));

    const verificationEmail = await sendVerificationEmail(db, c.env, { id: existingUser.id, email: existingUser.email, name });
    return success(
      c,
      { id: existingUser.id, email: existingUser.email, name, emailVerificationRequired: true, verificationEmail },
      "Registration successful",
      201
    );
  }

  const userId = createId();

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    name,
    phone,
    whatsappNumber,
  });

  const userRole = await db.query.roles.findFirst({
    where: eq(roles.slug, "user"),
  });

  if (userRole) {
    await db.insert(userRoles).values({
      userId,
      roleId: userRole.id,
    });
  }

  // Record donatur dibuat HANYA bila belum ada donatur dengan email ini. Donatur yang sudah ada
  // (mis. dari donasi guest) TIDAK diambil alih di sini: email belum terbukti milik pendaftar.
  // Penautan data lama terjadi saat email diverifikasi (linkVerifiedAccountData).
  const existingDonatur = await db.query.donatur.findFirst({
    where: eq(donaturTable.email, email),
  });

  if (!existingDonatur) {
    await db.insert(donaturTable).values({
      id: createId(),
      email,
      passwordHash,
      name,
      phone,
      whatsappNumber,
      userId,
    });
  }

  // Kirim link verifikasi; kegagalan tidak menggagalkan pendaftaran (pengguna bisa kirim ulang).
  // WA selamat datang dikirim SETELAH email terverifikasi (lihat /email/verify), bukan ke nomor tak terverifikasi.
  const verificationEmail = await sendVerificationEmail(db, c.env, { id: userId, email, name });

  return success(c, { id: userId, email, name, emailVerificationRequired: true, verificationEmail }, "Registration successful", 201);
});

auth.post("/login", authRateLimit, zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = c.get("db");

  const user = await findUserByEmail(db, email);

  if (!user || !user.passwordHash) {
    return error(c, "Invalid email or password", 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return error(c, "Invalid email or password", 401);
  }

  if (!user.isActive) {
    return error(c, "Account is disabled", 403);
  }

  // Wajib email terverifikasi (ADR-0010). Dicek SETELAH password benar supaya status akun tidak
  // bocor ke penebak. Link verifikasi dikirim ulang otomatis (ada cooldown di sendVerificationEmail).
  if (!user.emailVerifiedAt) {
    const verificationEmail = await sendVerificationEmail(db, c.env, { id: user.id, email: user.email, name: user.name });
    return c.json(
      {
        success: false,
        message: "Email belum diverifikasi. Kami telah mengirim tautan verifikasi ke email Anda.",
        code: "EMAIL_NOT_VERIFIED",
        verificationEmail,
      },
      403
    );
  }

  return success(c, await buildSession(db, c.env, user));
});

const emailVerifySchema = z.object({ token: z.string().min(20).max(200), password: z.string().max(128).optional() });
const emailResendSchema = z.object({ email: z.string().email().max(255) });

// Dipanggil oleh halaman web /verifikasi-email (POST, bukan GET yang mengubah state, agar link
// tidak terkonsumsi oleh prefetch/scanner email).
//
// Verifikasi butuh DUA bukti (ADR-0011): token dari kotak surat DAN password akun. Tanpa bukti kedua,
// orang yang mendaftar dengan email korban + password sendiri bisa membuat korban "memverifikasi"
// akun milik penyerang hanya dengan mengklik link di emailnya. Token baru dihanguskan setelah password benar,
// jadi salah password tidak membakar link.
auth.post("/email/verify", authRateLimit, zValidator("json", emailVerifySchema), async (c) => {
  const { token, password } = c.req.valid("json");
  const db = c.get("db");
  const invalid = (message = "Tautan verifikasi tidak valid atau sudah kedaluwarsa") =>
    c.json({ success: false, message, code: "INVALID_TOKEN" }, 400);

  const peek = await peekEmailToken(db, token, "verify_email");
  if (!peek) return invalid();

  const user = await db.query.users.findFirst({ where: eq(users.id, peek.userId) });
  // Token diterbitkan untuk email tertentu; bila email akun sudah berubah, tautan tidak berlaku
  if (!user || user.email !== peek.email || !user.isActive) return invalid();

  if (user.passwordHash) {
    if (!password || !(await verifyPassword(password, user.passwordHash))) {
      return c.json({ success: false, message: "Password salah", code: "INVALID_PASSWORD" }, 400);
    }
  }

  const row = await consumeEmailToken(db, token, "verify_email");
  if (!row) return invalid();

  await markEmailVerified(db, user.id);
  const linked = await linkVerifiedAccountData(db, { id: user.id, email: user.email, passwordHash: user.passwordHash });

  // WA selamat datang hanya setelah email terbukti (bukan saat register ke nomor tak terverifikasi)
  if (user.whatsappNumber) {
    void new WhatsAppService(db, c.env.FRONTEND_URL)
      .send({
        phone: user.whatsappNumber,
        templateKey: "wa_tpl_register_welcome",
        variables: { customer_name: user.name, customer_email: user.email, customer_phone: user.phone || user.whatsappNumber },
      })
      .catch((err) => console.error("[WA] welcome notification error:", err));
  }

  // Pemakai baru saja membuktikan mailbox + password: terbitkan sesi langsung (tanpa login ulang)
  const fresh = (await db.query.users.findFirst({ where: eq(users.id, user.id) }))!;
  return success(c, { verified: true, email: user.email, linked, ...(await buildSession(db, c.env, fresh)) }, "Email berhasil diverifikasi");
});

auth.post("/email/resend", authRateLimit, zValidator("json", emailResendSchema), async (c) => {
  const { email } = c.req.valid("json");
  const db = c.get("db");
  const generic = "Jika email terdaftar dan belum terverifikasi, tautan verifikasi baru telah dikirim.";

  const user = await findUserByEmail(db, email);

  // Di background (lihat catatan di forgot-password/email/request): cegah enumerasi lewat waktu respons
  if (user && user.isActive && !user.emailVerifiedAt) {
    const target = { id: user.id, email: user.email, name: user.name };
    void sendVerificationEmail(db, c.env, target).catch((err) => console.error("[auth] verification email error:", err));
  }
  // Respons identik di semua kasus: tidak membocorkan apakah email terdaftar
  return success(c, { sent: true }, generic);
});

auth.post(
  "/forgot-password/request-otp",
  authRateLimit,
  zValidator("json", forgotPasswordRequestSchema),
  async (c) => {
    const { phone } = c.req.valid("json");
    const db = c.get("db");
    const phoneVariants = toPhoneVariants(phone);
    const genericMessage = "Jika nomor terdaftar, kode OTP sudah dikirim ke WhatsApp.";

    if (phoneVariants.length === 0) {
      return success(c, { sent: true }, genericMessage);
    }

    const user = await db.query.users.findFirst({
      where: or(
        inArray(users.phone, phoneVariants),
        inArray(users.whatsappNumber, phoneVariants)
      ),
    });

    if (!user || !user.isActive) {
      return success(c, { sent: true }, genericMessage);
    }

    const recipientPhone = normalizePhone(user.whatsappNumber || user.phone || phone);
    if (!recipientPhone) {
      return success(c, { sent: true }, genericMessage);
    }

    const otp = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const otpHash = hashOtp(otp, c.env.JWT_SECRET);

    await db
      .update(authOtpCodes)
      .set({
        consumedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(authOtpCodes.userId, user.id),
          eq(authOtpCodes.purpose, FORGOT_PASSWORD_PURPOSE),
          isNull(authOtpCodes.consumedAt)
        )
      );

    await db.insert(authOtpCodes).values({
      id: createId(),
      userId: user.id,
      phone: recipientPhone,
      purpose: FORGOT_PASSWORD_PURPOSE,
      codeHash: otpHash,
      expiresAt,
      attemptCount: 0,
    });

    let sent = false;
    try {
      const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
      sent = await wa.send({
        phone: recipientPhone,
        templateKey: "wa_tpl_register_verify",
        variables: {
          customer_name: user.name,
          verification_code: otp,
          code_expires_at: formatOtpExpiry(expiresAt),
        },
      });

      if (!sent) {
        sent = await wa.sendMessage(
          recipientPhone,
          `Kode OTP reset password Anda: ${otp}\nBerlaku sampai ${formatOtpExpiry(expiresAt)} WIB.\nJangan bagikan kode ini.`
        );
      }
    } catch (waError) {
      console.error("[WA] forgot password OTP error:", waError);
      sent = false;
    }

    if (!sent) {
      return error(c, "Gagal mengirim OTP WhatsApp. Cek konfigurasi WhatsApp Anda.", 500);
    }

    return success(c, { sent: true }, genericMessage);
  }
);

auth.post(
  "/forgot-password/reset",
  authRateLimit,
  zValidator("json", forgotPasswordResetSchema),
  async (c) => {
    const { phone, otp, newPassword } = c.req.valid("json");
    const db = c.get("db");
    const phoneVariants = toPhoneVariants(phone);

    if (phoneVariants.length === 0) {
      return error(c, "OTP tidak valid atau sudah kedaluwarsa", 400);
    }

    const otpRow = await db.query.authOtpCodes.findFirst({
      where: and(
        inArray(authOtpCodes.phone, phoneVariants),
        eq(authOtpCodes.purpose, FORGOT_PASSWORD_PURPOSE),
        isNull(authOtpCodes.consumedAt)
      ),
      orderBy: [desc(authOtpCodes.createdAt)],
    });

    if (!otpRow) {
      return error(c, "OTP tidak valid atau sudah kedaluwarsa", 400);
    }

    if (otpRow.expiresAt.getTime() < Date.now()) {
      await db
        .update(authOtpCodes)
        .set({ consumedAt: new Date(), updatedAt: new Date() })
        .where(eq(authOtpCodes.id, otpRow.id));
      return error(c, "OTP tidak valid atau sudah kedaluwarsa", 400);
    }

    if (otpRow.attemptCount >= OTP_MAX_ATTEMPTS) {
      return error(c, "OTP tidak valid atau sudah kedaluwarsa", 400);
    }

    const otpHash = hashOtp(otp, c.env.JWT_SECRET);
    if (otpHash !== otpRow.codeHash) {
      const nextAttempts = otpRow.attemptCount + 1;
      await db
        .update(authOtpCodes)
        .set({
          attemptCount: nextAttempts,
          consumedAt: nextAttempts >= OTP_MAX_ATTEMPTS ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(authOtpCodes.id, otpRow.id));
      return error(c, "OTP tidak valid atau sudah kedaluwarsa", 400);
    }

    const user = otpRow.userId
      ? await db.query.users.findFirst({
          where: eq(users.id, otpRow.userId),
        })
      : await db.query.users.findFirst({
          where: or(
            inArray(users.phone, phoneVariants),
            inArray(users.whatsappNumber, phoneVariants)
          ),
        });

    if (!user) {
      return error(c, "Akun tidak ditemukan", 404);
    }

    const newPasswordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        sessionsValidAfter: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await db
      .update(donaturTable)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(or(eq(donaturTable.userId, user.id), eq(donaturTable.email, user.email)));

    await db
      .update(authOtpCodes)
      .set({
        consumedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(authOtpCodes.id, otpRow.id));

    return success(c, { reset: true }, "Password berhasil diubah");
  }
);

const forgotPasswordEmailRequestSchema = z.object({ email: z.string().trim().email().max(255) });
const forgotPasswordEmailResetSchema = z.object({
  token: z.string().min(20).max(200),
  newPassword: z.string().min(8).max(128),
});

// Alternatif OTP WhatsApp saat gateway WA tidak aktif (ADR-0010). Respons selalu generik.
auth.post(
  "/forgot-password/email/request",
  authRateLimit,
  zValidator("json", forgotPasswordEmailRequestSchema),
  async (c) => {
    const { email } = c.req.valid("json");
    const db = c.get("db");
    const generic = "Jika email terdaftar, tautan untuk mengatur ulang password telah dikirim.";

    const user = await findUserByEmail(db, email);

    // Kirim di background: waktu respons tidak boleh membedakan email terdaftar dari yang tidak
    // (pengiriman via Resend memakan ratusan ms, hanya terjadi untuk akun yang ada).
    if (user && user.isActive) {
      const target = { id: user.id, email: user.email, name: user.name };
      void sendPasswordResetEmail(db, c.env, target).catch((err) => console.error("[auth] reset email error:", err));
    }
    return success(c, { sent: true }, generic);
  }
);

auth.post(
  "/forgot-password/email/reset",
  authRateLimit,
  zValidator("json", forgotPasswordEmailResetSchema),
  async (c) => {
    const { token, newPassword } = c.req.valid("json");
    const db = c.get("db");
    const invalid = "Tautan tidak valid atau sudah kedaluwarsa";

    const row = await consumeEmailToken(db, token, "reset_password");
    if (!row) return error(c, invalid, 400);

    const user = await db.query.users.findFirst({ where: eq(users.id, row.userId) });
    // Token diterbitkan untuk email tertentu; bila email akun sudah berubah, tautan tidak berlaku
    if (!user || user.email !== row.email || !user.isActive) return error(c, invalid, 400);

    const newPasswordHash = await hashPassword(newPassword);
    // sessionsValidAfter: refresh token lama (mungkin milik pihak yang menguasai akun) tidak berlaku lagi
    await db.update(users).set({ passwordHash: newPasswordHash, sessionsValidAfter: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
    await db
      .update(donaturTable)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(donaturTable.userId, user.id));

    // Memakai tautan ini membuktikan pemilik mengakses kotak surat tersebut: email otomatis terverifikasi
    // (jika tidak, akun daftar-mandiri yang belum klik link verifikasi tetap ditolak login setelah reset).
    await markEmailVerified(db, user.id);
    await linkVerifiedAccountData(db, { id: user.id, email: user.email, passwordHash: newPasswordHash });

    return success(c, { reset: true }, "Password berhasil diubah");
  }
);

// Metode login yang tersedia (publik): frontend menyembunyikan tombol Google bila tidak dikonfigurasi
auth.get("/methods", async (c) => {
  return success(c, { google: !!getGoogleConfig(c.env) });
});

// Mulai login Google: simpan state/nonce/PKCE verifier di cookie httpOnly bertanda tangan lalu redirect ke Google
auth.get("/google/start", authRateLimit, async (c) => {
  const db = c.get("db");
  const front = await getFrontendBase(db, c.env);
  const cfg = getGoogleConfig(c.env);
  if (!cfg) return c.redirect(`${front}/login?error=google_disabled`, 302);

  const { verifier, challenge } = generatePkce();
  const state = randomToken();
  const nonce = randomToken();
  const returnTo = sanitizeReturnTo(c.req.query("returnTo"));

  setCookie(c, GOOGLE_STATE_COOKIE, await signOAuthState({ state, nonce, verifier, returnTo }, c.env.JWT_SECRET), {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === "production",
    sameSite: "Lax", // callback adalah navigasi top-level dari Google
    path: "/",
    maxAge: GOOGLE_STATE_TTL_SECONDS,
  });
  return c.redirect(buildAuthUrl(cfg, { state, nonce, challenge }), 302);
});

// Callback Google: verifikasi state, tukar code, verifikasi ID token, tentukan akun, lalu redirect ke web
// dengan kode tukar sekali pakai (token sesi TIDAK pernah muncul di URL).
auth.get("/google/callback", authRateLimit, async (c) => {
  const db = c.get("db");
  const front = await getFrontendBase(db, c.env);
  const fail = (code: string) => c.redirect(`${front}/login?error=${code}`, 302);

  const cfg = getGoogleConfig(c.env);
  if (!cfg) return fail("google_disabled");

  const stateCookie = getCookie(c, GOOGLE_STATE_COOKIE);
  deleteCookie(c, GOOGLE_STATE_COOKIE, { path: "/" }); // sekali pakai, apa pun hasilnya

  const q = c.req.query();
  if (q.error) return fail(q.error === "access_denied" ? "google_cancelled" : "google_failed");

  const saved = await verifyOAuthState(stateCookie, c.env.JWT_SECRET);
  if (!saved || !q.state || !q.code || !safeEqual(q.state, saved.state)) return fail("google_failed");

  let claims;
  try {
    const idToken = await exchangeCodeForIdToken(cfg, q.code, saved.verifier);
    claims = idToken ? await verifyGoogleIdToken(idToken, cfg, saved.nonce) : null;
  } catch (err) {
    console.error("[google-oauth] error:", (err as Error)?.message);
    return fail("google_failed");
  }
  if (!claims) return fail("google_failed");

  const resolution = await resolveGoogleUser(db, claims);
  if (!resolution.ok) return fail(`google_${resolution.code}`);

  const code = await issueEmailToken(db, { userId: resolution.user.id, email: resolution.user.email, purpose: "google_exchange" });
  return c.redirect(`${front}/auth/google?code=${encodeURIComponent(code)}&next=${encodeURIComponent(saved.returnTo)}`, 302);
});

const googleExchangeSchema = z.object({ code: z.string().min(20).max(200) });

// Tukar kode sekali pakai (60 detik) dengan sesi — dipanggil halaman web /auth/google
auth.post("/google/exchange", authRateLimit, zValidator("json", googleExchangeSchema), async (c) => {
  const { code } = c.req.valid("json");
  const db = c.get("db");

  const row = await consumeEmailToken(db, code, "google_exchange");
  if (!row) return error(c, "Kode login tidak valid atau sudah kedaluwarsa", 400);

  const user = await db.query.users.findFirst({ where: eq(users.id, row.userId) });
  if (!user || !user.isActive) return error(c, "Kode login tidak valid atau sudah kedaluwarsa", 400);

  return success(c, await buildSession(db, c.env, user));
});

auth.post("/refresh", authRateLimit, async (c) => {
  const body = await c.req.json();
  const { refreshToken } = body;

  if (!refreshToken) {
    return error(c, "Refresh token required", 400);
  }

  const verified = await verifyRefreshToken(refreshToken, c.env.JWT_SECRET);

  if (!verified) {
    return error(c, "Invalid refresh token", 401);
  }

  const db = c.get("db");
  const user = await db.query.users.findFirst({
    where: eq(users.id, verified.userId),
  });

  if (!user || !user.isActive) {
    return error(c, "User not found or disabled", 401);
  }

  // Sesi lama tidak boleh hidup melewati kewajiban verifikasi email (ADR-0010) maupun pencabutan
  // sesi (reset/ganti password, daftar ulang, klaim Google — ADR-0011). iat dalam detik, jadi
  // dibandingkan pada granularitas detik agar token yang terbit sesudah reset di detik yang sama tetap sah.
  if (!user.emailVerifiedAt) {
    return error(c, "Email belum diverifikasi", 401);
  }
  if (user.sessionsValidAfter && verified.issuedAt < Math.floor(user.sessionsValidAfter.getTime() / 1000)) {
    return error(c, "Sesi telah dicabut, silakan login kembali", 401);
  }

  const userRolesList = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, user.id),
    with: {
      role: true,
    },
  });

  const rolesSlugs = userRolesList.map((ur) => (ur as any).role?.slug).filter(Boolean);

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
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRES_IN || "15m"
  );

  const newRefreshToken = await signRefreshToken(user.id, c.env.JWT_SECRET);

  return success(c, {
    accessToken,
    refreshToken: newRefreshToken,
  });
});

auth.get("/me", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");

  // Fetch user auth data
  const user = await db.query.users.findFirst({
    where: eq(users.id, currentUser!.id),
    columns: {
      id: true,
      email: true,
      name: true,
      phone: true,
      whatsappNumber: true,
      avatar: true,
      emailVerifiedAt: true,
      isDeveloper: true,
      createdAt: true,
    },
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  // Fetch donatur profile data (full profile)
  const { donatur, entityBankAccounts } = await import("@bantuanku/db");
  const donaturProfile = await db.query.donatur.findFirst({
    where: eq(donatur.email, user.email.toLowerCase().trim()),
    with: {
      province: true,
      regency: true,
      district: true,
      village: true,
    },
  });

  // Fetch bank accounts (linked to donatur, not user)
  let bankAccounts: any[] = [];
  if (donaturProfile) {
    bankAccounts = await db.query.entityBankAccounts.findMany({
      where: eq(entityBankAccounts.entityId, donaturProfile.id),
    });
  }

  // Debug: fetch roles from database to compare
  const userRolesList = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, currentUser!.id),
    with: {
      role: true,
    },
  });

  const dbRoles = userRolesList.map((ur) => (ur as any).role?.slug).filter(Boolean);

  const responseData = {
    ...user,
    // Include donatur profile fields
    website: donaturProfile?.website,
    detailAddress: donaturProfile?.detailAddress,
    provinceCode: donaturProfile?.provinceCode,
    regencyCode: donaturProfile?.regencyCode,
    districtCode: donaturProfile?.districtCode,
    villageCode: donaturProfile?.villageCode,
    jobTitleId: donaturProfile?.jobTitleId,
    incomeRangeId: donaturProfile?.incomeRangeId,
    nik: donaturProfile?.nik,
    npwp: donaturProfile?.npwp,
    birthPlace: donaturProfile?.birthPlace,
    birthDate: donaturProfile?.birthDate,
    gender: donaturProfile?.gender,
    province: donaturProfile?.province,
    regency: donaturProfile?.regency,
    district: donaturProfile?.district,
    village: donaturProfile?.village,
    donaturId: donaturProfile?.id,
    waOptOut: donaturProfile?.waOptOut ?? false,
    bankAccounts,
    roles: currentUser!.roles,
    isDeveloper: Boolean(user.isDeveloper),
  };

  return success(c, responseData);
});

auth.patch("/me", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");
  const body = await c.req.json();

  const {
    name,
    phone,
    whatsappNumber,
    website,
    detailAddress,
    provinceCode,
    regencyCode,
    districtCode,
    villageCode,
    jobTitleId,
    incomeRangeId,
    nik,
    npwp,
    birthPlace,
    birthDate,
    gender,
    bankAccounts,
    waOptOut,
  } = body;

  // Get current user
  const user = await db.query.users.findFirst({
    where: eq(users.id, currentUser!.id),
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  // Update basic info in users table
  await db
    .update(users)
    .set({
      name: name || undefined,
      phone: phone || undefined,
      whatsappNumber: whatsappNumber || undefined,
      updatedAt: new Date(),
    })
    .where(eq(users.id, currentUser!.id));

  // Update donatur profile
  const { donatur, entityBankAccounts } = await import("@bantuanku/db");
  const donaturProfile = await db.query.donatur.findFirst({
    where: eq(donatur.email, user.email.toLowerCase().trim()),
  });

  if (donaturProfile) {
    // Update existing donatur profile
    await db
      .update(donatur)
      .set({
        name: name || undefined,
        phone: phone || undefined,
        whatsappNumber: whatsappNumber || undefined,
        website: website || undefined,
        detailAddress: detailAddress || undefined,
        provinceCode: provinceCode || undefined,
        regencyCode: regencyCode || undefined,
        districtCode: districtCode || undefined,
        villageCode: villageCode || undefined,
        jobTitleId: jobTitleId !== undefined ? (jobTitleId || null) : undefined,
        incomeRangeId: incomeRangeId !== undefined ? (incomeRangeId || null) : undefined,
        nik: nik !== undefined ? (nik || null) : undefined,
        npwp: npwp !== undefined ? (npwp || null) : undefined,
        birthPlace: birthPlace !== undefined ? (birthPlace || null) : undefined,
        birthDate: birthDate !== undefined ? (birthDate || null) : undefined,
        gender: gender !== undefined ? (gender || null) : undefined,
        waOptOut: waOptOut !== undefined ? Boolean(waOptOut) : undefined,
        waOptOutAt: waOptOut === true ? new Date() : waOptOut === false ? null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(donatur.id, donaturProfile.id));

    // Handle bank accounts if provided
    if (bankAccounts && Array.isArray(bankAccounts)) {
      const { and } = await import("drizzle-orm");

      // Delete existing bank accounts for this donatur
      await db
        .delete(entityBankAccounts)
        .where(
          and(
            eq(entityBankAccounts.entityId, donaturProfile.id),
            eq(entityBankAccounts.entityType, "donatur")
          )
        );

      // Insert new bank accounts
      if (bankAccounts.length > 0) {
        await db.insert(entityBankAccounts).values(
          bankAccounts.map((account: any) => ({
            id: createId(),
            entityId: donaturProfile.id,
            entityType: "donatur" as const,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName,
          }))
        );
      }
    }
  } else {
    // Create donatur profile if doesn't exist
    const newDonatur = await db.insert(donatur).values({
      id: createId(),
      email: user.email,
      passwordHash: user.passwordHash,
      name: name || user.name,
      phone: phone || user.phone,
      whatsappNumber: whatsappNumber || user.whatsappNumber,
      website,
      detailAddress,
      provinceCode,
      regencyCode,
      districtCode,
      villageCode,
      jobTitleId: jobTitleId || null,
      incomeRangeId: incomeRangeId || null,
      nik: nik || null,
      npwp: npwp || null,
      birthPlace: birthPlace || null,
      birthDate: birthDate || null,
      gender: gender || null,
    }).returning();

    // Insert bank accounts for new donatur
    if (bankAccounts && Array.isArray(bankAccounts) && bankAccounts.length > 0 && newDonatur[0]) {
      await db.insert(entityBankAccounts).values(
        bankAccounts.map((account: any) => ({
          id: createId(),
          entityId: newDonatur[0].id,
          entityType: "donatur" as const,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          accountHolderName: account.accountHolderName,
        }))
      );
    }
  }

  // Sync shared fields to employee if linked
  const { employees } = await import("@bantuanku/db");
  const linkedEmployee = await db.query.employees.findFirst({
    where: eq(employees.userId, currentUser!.id),
  });
  if (linkedEmployee) {
    const empSync: any = { updatedAt: new Date() };
    if (name) empSync.name = name;
    if (phone) empSync.phone = phone;
    if (whatsappNumber) empSync.whatsappNumber = whatsappNumber;
    if (website) empSync.website = website;
    if (detailAddress) empSync.detailAddress = detailAddress;
    if (provinceCode) empSync.provinceCode = provinceCode;
    if (regencyCode) empSync.regencyCode = regencyCode;
    if (districtCode) empSync.districtCode = districtCode;
    if (villageCode) empSync.villageCode = villageCode;
    if (nik !== undefined) empSync.nationalId = nik || null;
    if (npwp !== undefined) empSync.taxId = npwp || null;
    await db
      .update(employees)
      .set(empSync)
      .where(eq(employees.id, linkedEmployee.id));
  }

  return success(c, null, "Profile updated");
});

// Get unified profile data for ANY role (employee, mitra, donatur/user, super_admin, etc.)
auth.get("/me/profile-data", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");

  const { employees, mitra: mitraTable, donatur, entityBankAccounts, indonesiaProvinces, indonesiaRegencies, indonesiaDistricts, indonesiaVillages } = await import("@bantuanku/db");

  const user = await db.query.users.findFirst({
    where: eq(users.id, currentUser!.id),
    columns: {
      id: true,
      email: true,
      name: true,
      phone: true,
      whatsappNumber: true,
      avatar: true,
      isDeveloper: true,
      createdAt: true,
    },
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  const userRolesList = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, currentUser!.id),
    with: { role: true },
  });
  const rolesSlugs = userRolesList.map((ur) => (ur as any).role?.slug).filter(Boolean);

  // Determine entity type based on roles
  let entityType: "employee" | "mitra" | "donatur" | null = null;
  let entityData: any = null;
  let bankAccounts: any[] = [];

  // 1. Check employee (super_admin, admin_finance, admin_campaign, program_coordinator, employee)
  const employeeRecord = await db
    .select({
      id: employees.id,
      employeeId: employees.employeeId,
      name: employees.name,
      position: employees.position,
      department: employees.department,
      employmentType: employees.employmentType,
      email: employees.email,
      phone: employees.phone,
      whatsappNumber: employees.whatsappNumber,
      website: employees.website,
      detailAddress: employees.detailAddress,
      provinceCode: employees.provinceCode,
      regencyCode: employees.regencyCode,
      districtCode: employees.districtCode,
      villageCode: employees.villageCode,
      provinceName: indonesiaProvinces.name,
      regencyName: indonesiaRegencies.name,
      districtName: indonesiaDistricts.name,
      villageName: indonesiaVillages.name,
      joinDate: employees.joinDate,
      createdAt: employees.createdAt,
    })
    .from(employees)
    .leftJoin(indonesiaProvinces, eq(employees.provinceCode, indonesiaProvinces.code))
    .leftJoin(indonesiaRegencies, eq(employees.regencyCode, indonesiaRegencies.code))
    .leftJoin(indonesiaDistricts, eq(employees.districtCode, indonesiaDistricts.code))
    .leftJoin(indonesiaVillages, eq(employees.villageCode, indonesiaVillages.code))
    .where(eq(employees.userId, currentUser!.id))
    .limit(1);

  if (employeeRecord.length > 0) {
    entityType = "employee";
    entityData = employeeRecord[0];
    const { and } = await import("drizzle-orm");
    bankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(and(eq(entityBankAccounts.entityType, "employee"), eq(entityBankAccounts.entityId, entityData.id)));

    // Also fetch linked donatur personal data
    const { jobTitles, jobCategories, incomeRanges } = await import("@bantuanku/db");
    const donaturRecord = await db
      .select({
        nik: donatur.nik,
        npwp: donatur.npwp,
        birthPlace: donatur.birthPlace,
        birthDate: donatur.birthDate,
        gender: donatur.gender,
        jobTitleId: donatur.jobTitleId,
        incomeRangeId: donatur.incomeRangeId,
        jobTitleName: jobTitles.name,
        jobCategoryName: jobCategories.name,
        incomeRangeLabel: incomeRanges.label,
      })
      .from(donatur)
      .leftJoin(jobTitles, eq(donatur.jobTitleId, jobTitles.id))
      .leftJoin(jobCategories, eq(jobTitles.categoryId, jobCategories.id))
      .leftJoin(incomeRanges, eq(donatur.incomeRangeId, incomeRanges.id))
      .where(eq(donatur.userId, currentUser!.id))
      .limit(1);

    if (donaturRecord.length > 0) {
      entityData = { ...entityData, personalData: donaturRecord[0] };
    }
  }

  // 2. Check mitra (if no employee found and user has mitra role)
  if (!entityType && rolesSlugs.includes("mitra")) {
    const mitraRecord = await db
      .select({
        id: mitraTable.id,
        name: mitraTable.name,
        slug: mitraTable.slug,
        description: mitraTable.description,
        logoUrl: mitraTable.logoUrl,
        picName: mitraTable.picName,
        picPosition: mitraTable.picPosition,
        email: mitraTable.email,
        phone: mitraTable.phone,
        whatsappNumber: mitraTable.whatsappNumber,
        website: mitraTable.website,
        detailAddress: mitraTable.detailAddress,
        provinceCode: mitraTable.provinceCode,
        regencyCode: mitraTable.regencyCode,
        districtCode: mitraTable.districtCode,
        villageCode: mitraTable.villageCode,
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        ktpUrl: mitraTable.ktpUrl,
        bankBookUrl: mitraTable.bankBookUrl,
        npwpUrl: mitraTable.npwpUrl,
        status: mitraTable.status,
        createdAt: mitraTable.createdAt,
      })
      .from(mitraTable)
      .leftJoin(indonesiaProvinces, eq(mitraTable.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(mitraTable.regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq(mitraTable.districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq(mitraTable.villageCode, indonesiaVillages.code))
      .where(eq(mitraTable.userId, currentUser!.id))
      .limit(1);

    if (mitraRecord.length > 0) {
      entityType = "mitra";
      entityData = mitraRecord[0];
      const { and } = await import("drizzle-orm");
      bankAccounts = await db
        .select()
        .from(entityBankAccounts)
        .where(and(eq(entityBankAccounts.entityType, "mitra"), eq(entityBankAccounts.entityId, entityData.id)));
    }
  }

  // 3. Fallback to donatur (user role)
  if (!entityType) {
    const donaturRecord = await db
      .select({
        id: donatur.id,
        name: donatur.name,
        email: donatur.email,
        phone: donatur.phone,
        whatsappNumber: donatur.whatsappNumber,
        website: donatur.website,
        detailAddress: donatur.detailAddress,
        provinceCode: donatur.provinceCode,
        regencyCode: donatur.regencyCode,
        districtCode: donatur.districtCode,
        villageCode: donatur.villageCode,
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        createdAt: donatur.createdAt,
      })
      .from(donatur)
      .leftJoin(indonesiaProvinces, eq(donatur.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(donatur.regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq(donatur.districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq(donatur.villageCode, indonesiaVillages.code))
      .where(eq(donatur.userId, currentUser!.id))
      .limit(1);

    if (donaturRecord.length > 0) {
      entityType = "donatur";
      entityData = donaturRecord[0];
      const { and } = await import("drizzle-orm");
      bankAccounts = await db
        .select()
        .from(entityBankAccounts)
        .where(and(eq(entityBankAccounts.entityType, "donatur"), eq(entityBankAccounts.entityId, entityData.id)));
    }
  }

  return success(c, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      avatar: user.avatar,
      isDeveloper: Boolean(user.isDeveloper),
      createdAt: user.createdAt,
    },
    roles: rolesSlugs,
    entityType,
    entity: entityData,
    bankAccounts,
  });
});

// Update own profile (employee, mitra, or donatur - based on role)
auth.patch("/me/profile", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");
  const body = await c.req.json();

  const { employees, mitra: mitraTable, donatur, entityBankAccounts } = await import("@bantuanku/db");
  const { and } = await import("drizzle-orm");

  const {
    name,
    phone,
    whatsappNumber,
    website,
    detailAddress,
    provinceCode,
    regencyCode,
    districtCode,
    villageCode,
    bankAccounts,
    // Mitra-specific
    picName,
    picPosition,
    description,
  } = body;

  // Sync name to users table
  const userUpdateData: any = { updatedAt: new Date() };
  if (name) userUpdateData.name = name;
  if (phone !== undefined) userUpdateData.phone = phone || null;
  if (whatsappNumber !== undefined) userUpdateData.whatsappNumber = whatsappNumber || null;
  await db.update(users).set(userUpdateData).where(eq(users.id, currentUser!.id));

  // 1. Try employee first
  const employee = await db.query.employees.findFirst({
    where: eq(employees.userId, currentUser!.id),
  });

  if (employee) {
    await db
      .update(employees)
      .set({
        name: name || employee.name,
        phone: phone !== undefined ? (phone || null) : employee.phone,
        whatsappNumber: whatsappNumber !== undefined ? (whatsappNumber || null) : employee.whatsappNumber,
        website: website !== undefined ? (website || null) : employee.website,
        detailAddress: detailAddress !== undefined ? (detailAddress || null) : employee.detailAddress,
        provinceCode: provinceCode !== undefined ? (provinceCode || null) : employee.provinceCode,
        regencyCode: regencyCode !== undefined ? (regencyCode || null) : employee.regencyCode,
        districtCode: districtCode !== undefined ? (districtCode || null) : employee.districtCode,
        villageCode: villageCode !== undefined ? (villageCode || null) : employee.villageCode,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employee.id));

    // Handle bank accounts
    if (bankAccounts && Array.isArray(bankAccounts)) {
      await db.delete(entityBankAccounts).where(and(eq(entityBankAccounts.entityType, "employee"), eq(entityBankAccounts.entityId, employee.id)));
      if (bankAccounts.length > 0) {
        const { createId } = await import("@bantuanku/db");
        await db.insert(entityBankAccounts).values(
          bankAccounts.map((account: any) => ({
            id: createId(),
            entityType: "employee" as const,
            entityId: employee.id,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName,
          }))
        );
      }
    }

    return success(c, null, "Profile updated");
  }

  // 2. Try mitra
  const mitraRecord = await db.query.mitra.findFirst({
    where: eq(mitraTable.userId, currentUser!.id),
  });

  if (mitraRecord) {
    await db
      .update(mitraTable)
      .set({
        picName: picName !== undefined ? picName : mitraRecord.picName,
        picPosition: picPosition !== undefined ? (picPosition || null) : mitraRecord.picPosition,
        description: description !== undefined ? (description || null) : mitraRecord.description,
        email: mitraRecord.email, // email cannot change
        phone: phone !== undefined ? (phone || null) : mitraRecord.phone,
        whatsappNumber: whatsappNumber !== undefined ? (whatsappNumber || null) : mitraRecord.whatsappNumber,
        website: website !== undefined ? (website || null) : mitraRecord.website,
        detailAddress: detailAddress !== undefined ? (detailAddress || null) : mitraRecord.detailAddress,
        provinceCode: provinceCode !== undefined ? (provinceCode || null) : mitraRecord.provinceCode,
        regencyCode: regencyCode !== undefined ? (regencyCode || null) : mitraRecord.regencyCode,
        districtCode: districtCode !== undefined ? (districtCode || null) : mitraRecord.districtCode,
        villageCode: villageCode !== undefined ? (villageCode || null) : mitraRecord.villageCode,
        updatedAt: new Date(),
      })
      .where(eq(mitraTable.id, mitraRecord.id));

    // Handle bank accounts
    if (bankAccounts && Array.isArray(bankAccounts)) {
      await db.delete(entityBankAccounts).where(and(eq(entityBankAccounts.entityType, "mitra"), eq(entityBankAccounts.entityId, mitraRecord.id)));
      if (bankAccounts.length > 0) {
        const { createId } = await import("@bantuanku/db");
        await db.insert(entityBankAccounts).values(
          bankAccounts.map((account: any) => ({
            id: createId(),
            entityType: "mitra" as const,
            entityId: mitraRecord.id,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName,
          }))
        );
      }
    }

    return success(c, null, "Profile updated");
  }

  // 3. Fallback to donatur
  const donaturRecord = await db.query.donatur.findFirst({
    where: eq(donatur.userId, currentUser!.id),
  });

  if (donaturRecord) {
    await db
      .update(donatur)
      .set({
        name: name || donaturRecord.name,
        phone: phone !== undefined ? (phone || null) : donaturRecord.phone,
        whatsappNumber: whatsappNumber !== undefined ? (whatsappNumber || null) : donaturRecord.whatsappNumber,
        website: website !== undefined ? (website || null) : donaturRecord.website,
        detailAddress: detailAddress !== undefined ? (detailAddress || null) : donaturRecord.detailAddress,
        provinceCode: provinceCode !== undefined ? (provinceCode || null) : donaturRecord.provinceCode,
        regencyCode: regencyCode !== undefined ? (regencyCode || null) : donaturRecord.regencyCode,
        districtCode: districtCode !== undefined ? (districtCode || null) : donaturRecord.districtCode,
        villageCode: villageCode !== undefined ? (villageCode || null) : donaturRecord.villageCode,
        updatedAt: new Date(),
      })
      .where(eq(donatur.id, donaturRecord.id));

    // Handle bank accounts
    if (bankAccounts && Array.isArray(bankAccounts)) {
      await db.delete(entityBankAccounts).where(and(eq(entityBankAccounts.entityType, "donatur"), eq(entityBankAccounts.entityId, donaturRecord.id)));
      if (bankAccounts.length > 0) {
        const { createId } = await import("@bantuanku/db");
        await db.insert(entityBankAccounts).values(
          bankAccounts.map((account: any) => ({
            id: createId(),
            entityType: "donatur" as const,
            entityId: donaturRecord.id,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName,
          }))
        );
      }
    }

    return success(c, null, "Profile updated");
  }

  // No entity found - just update users table (already done above)
  return success(c, null, "Profile updated");
});

auth.patch("/me/password", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");
  const body = await c.req.json();

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return error(c, "Current password and new password required", 400);
  }

  if (newPassword.length < 8) {
    return error(c, "New password must be at least 8 characters", 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, currentUser!.id),
  });

  if (!user) {
    return error(c, "User not found", 404);
  }
  if (!user.passwordHash) {
    // Akun Google tanpa password: password pertama dibuat lewat "Lupa password" (tautan email)
    return error(c, "Akun ini belum memiliki password. Gunakan 'Lupa password' untuk membuatnya.", 400);
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValid) {
    return error(c, "Current password is incorrect", 400);
  }

  const newPasswordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      sessionsValidAfter: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, currentUser!.id));

  return success(c, null, "Password updated");
});

// Check if email/phone exists in users or donatur table
auth.get("/check-registration", authRateLimit, async (c) => {
  const db = c.get("db");
  const email = c.req.query("email");
  const phone = c.req.query("phone");

  if (!email && !phone) {
    return error(c, "Email or phone required", 400);
  }

  const normalizedPhone = phone ? normalizePhone(phone) : undefined;

  // Check in users table first
  let existingUser = null;
  if (email) {
    existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });
  }

  if (existingUser) {
    // Hanya status, tanpa data pribadi: endpoint ini publik (ADR-0010)
    return success(c, { exists: true, registered: !!existingUser.passwordHash });
  }

  // Check in donatur table
  const { donatur } = await import("@bantuanku/db");
  const { or } = await import("drizzle-orm");

  const conditions = [];
  if (email) conditions.push(eq(donatur.email, email.toLowerCase().trim()));
  if (normalizedPhone) {
    conditions.push(eq(donatur.phone, normalizedPhone));
    conditions.push(eq(donatur.whatsappNumber, normalizedPhone));
  }

  if (conditions.length === 0) {
    return success(c, { exists: false, registered: false });
  }

  const existingDonatur = await db.query.donatur.findFirst({
    where: or(...conditions),
  });

  if (existingDonatur) {
    return success(c, { exists: true, registered: !!existingDonatur.passwordHash });
  }

  return success(c, { exists: false, registered: false });
});

export default auth;
