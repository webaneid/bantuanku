import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { donatur } from "@bantuanku/db";
import { verifyUnsubscribeToken } from "../lib/jwt";
import { success, error } from "../lib/response";
import { authMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../types";

const wa = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /wa/unsubscribe?t=TOKEN — publik, no auth
// Donatur klik link di pesan WA → opt-out dari broadcast
wa.get("/unsubscribe", async (c) => {
  const token = c.req.query("t");
  if (!token) {
    return error(c, "Token tidak valid", 400);
  }

  const donaturId = await verifyUnsubscribeToken(token, c.env.JWT_SECRET);
  if (!donaturId) {
    return error(c, "Link tidak valid atau sudah kedaluwarsa", 400);
  }

  const db = c.get("db");
  const existing = await db.query.donatur.findFirst({
    where: eq(donatur.id, donaturId),
    columns: { id: true, waOptOut: true },
  });

  if (!existing) {
    return error(c, "Donatur tidak ditemukan", 404);
  }

  if (existing.waOptOut) {
    return success(c, { alreadyOptedOut: true }, "Anda sudah berhenti berlangganan sebelumnya");
  }

  await db
    .update(donatur)
    .set({ waOptOut: true, waOptOutAt: new Date(), updatedAt: new Date() })
    .where(eq(donatur.id, donaturId));

  return success(c, { optedOut: true }, "Berhasil berhenti berlangganan pesan WhatsApp");
});

// POST /wa/opt-in — login required, donatur opt-in kembali
wa.post("/opt-in", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");

  const donaturProfile = await db.query.donatur.findFirst({
    where: eq(donatur.userId, currentUser!.id),
    columns: { id: true, waOptOut: true },
  });

  if (!donaturProfile) {
    return error(c, "Profil donatur tidak ditemukan", 404);
  }

  await db
    .update(donatur)
    .set({ waOptOut: false, waOptOutAt: null, updatedAt: new Date() })
    .where(eq(donatur.id, donaturProfile.id));

  return success(c, { optedIn: true }, "Berhasil berlangganan kembali pesan WhatsApp");
});

export default wa;
