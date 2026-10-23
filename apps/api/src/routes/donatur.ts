import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { success, error } from "../lib/response";
import { lookupRateLimit } from "../middleware/ratelimit";
import { parseDonaturIdentifier, findDonaturByIdentifier } from "../services/donatur-lookup";
import type { Env, Variables } from "../types";

const donaturRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /donatur/check - Apakah email/nomor HP/WhatsApp sudah terdaftar sebagai donatur? (publik)
// Hanya menjawab ya/tidak: tanpa id dan tanpa data pribadi apa pun (nama, email, HP tidak ikut).
// Data donatur dipakai server saat membuat transaksi (`use_registered_donatur`), bukan oleh klien.
// Endpoint publik lama `GET /search` (mengembalikan id + data tersamar) dan `POST /` (mengembalikan id
// donatur yang sudah ada) dihapus 2026-10-24: tidak dipakai lagi dan keduanya membuka data/id donatur.
const checkDonaturSchema = z.object({
  identifier: z.string().trim().min(5).max(120),
});

donaturRoute.post("/check", lookupRateLimit, zValidator("json", checkDonaturSchema), async (c) => {
  const db = c.get("db");
  const { identifier } = c.req.valid("json");

  const parsed = parseDonaturIdentifier(identifier);
  if (!parsed) {
    return error(c, "Format email atau nomor HP tidak valid", 400);
  }

  const found = await findDonaturByIdentifier(db, parsed);

  return success(c, {
    type: parsed.kind,
    registered: !!found,
    hasAccount: !!found?.userId,
  });
});

export default donaturRoute;
