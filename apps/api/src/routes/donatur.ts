import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { donatur, createId } from "@bantuanku/db";
import { success, error } from "../lib/response";
import { normalizeContactData } from "../lib/contact-helpers";
import { hashPassword } from "../lib/password";
import type { Env, Variables } from "../types";

const donaturRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /donatur/search - Search donatur by email or phone (public)
donaturRoute.get("/search", async (c) => {
  const db = c.get("db");
  const email = c.req.query("email");
  const phone = c.req.query("phone");

  if (!email && !phone) {
    return error(c, "Email or phone parameter required", 400);
  }

  const conditions = [];
  if (email) {
    conditions.push(eq(donatur.email, email.toLowerCase().trim()));
  }
  if (phone) {
    conditions.push(eq(donatur.phone, phone.trim()));
  }

  const found = await db.query.donatur.findFirst({
    where: or(...conditions),
    columns: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsappNumber: true,
    },
  });

  if (!found) {
    return error(c, "Donatur not found", 404);
  }

  return success(c, found);
});

// POST /donatur - Create donatur (public, for guest checkout)
const createDonaturSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10),
  whatsappNumber: z.string().trim().min(10).optional(),
  password: z.string().trim().min(8).optional(),
});

donaturRoute.post("/", zValidator("json", createDonaturSchema), async (c) => {
  const body = c.req.valid("json");
  const db = c.get("db");

  // Normalize contact data
  const normalizedBody = normalizeContactData(body);

  // Check if email already exists
  const existing = await db.query.donatur.findFirst({
    where: eq(donatur.email, normalizedBody.email),
  });

  if (existing) {
    return success(c, { id: existing.id }, "Donatur already exists");
  }

  const donaturId = createId();
  const insertData: any = {
    id: donaturId,
    email: normalizedBody.email,
    name: normalizedBody.name,
    phone: normalizedBody.phone,
    whatsappNumber: normalizedBody.whatsappNumber || normalizedBody.phone,
    isActive: true,
  };

  // Hash password if provided
  if (body.password) {
    insertData.passwordHash = await hashPassword(body.password);
  }

  await db.insert(donatur).values(insertData);

  return success(
    c,
    { id: donaturId },
    "Donatur created successfully",
    201
  );
});

export default donaturRoute;
