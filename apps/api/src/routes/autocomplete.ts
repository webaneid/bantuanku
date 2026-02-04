import { Hono } from "hono";
import { eq, like, desc, and } from "drizzle-orm";
import { campaigns, categories, users } from "@bantuanku/db";
import { success } from "../lib/response";
import type { Env, Variables } from "../types";

const autocompleteRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

autocompleteRoute.get("/campaigns", async (c) => {
  const db = c.get("db");
  const q = c.req.query("q") || "";
  const limit = parseInt(c.req.query("limit") || "10");

  const results = await db.query.campaigns.findMany({
    where: and(eq(campaigns.status, "active"), like(campaigns.title, `%${q}%`)),
    limit,
    orderBy: [desc(campaigns.createdAt)],
    columns: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
    },
  });

  return success(c, results);
});

autocompleteRoute.get("/categories", async (c) => {
  const db = c.get("db");
  const q = c.req.query("q") || "";
  const limit = parseInt(c.req.query("limit") || "10");

  const results = await db.query.categories.findMany({
    where: like(categories.name, `%${q}%`),
    limit,
    orderBy: [desc(categories.createdAt)],
    columns: {
      id: true,
      name: true,
      slug: true,
      icon: true,
    },
  });

  return success(c, results);
});

autocompleteRoute.get("/users", async (c) => {
  const db = c.get("db");
  const q = c.req.query("q") || "";
  const limit = parseInt(c.req.query("limit") || "10");

  const results = await db.query.users.findMany({
    where: like(users.name, `%${q}%`),
    limit,
    orderBy: [desc(users.createdAt)],
    columns: {
      id: true,
      name: true,
      email: true,
    },
  });

  return success(c, results);
});

autocompleteRoute.get("/pillars", async (c) => {
  const pillars = [
    { id: "kemanusiaan", name: "Kemanusiaan" },
    { id: "pendidikan", name: "Pendidikan" },
    { id: "kesehatan", name: "Kesehatan" },
    { id: "ekonomi", name: "Ekonomi" },
    { id: "lingkungan", name: "Lingkungan" },
  ];

  const q = c.req.query("q") || "";
  const filtered = q ? pillars.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : pillars;

  return success(c, filtered);
});

autocompleteRoute.get("/payment-status", async (c) => {
  const statuses = [
    { id: "pending", name: "Pending" },
    { id: "processing", name: "Processing" },
    { id: "success", name: "Success" },
    { id: "failed", name: "Failed" },
    { id: "expired", name: "Expired" },
  ];

  const q = c.req.query("q") || "";
  const filtered = q ? statuses.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())) : statuses;

  return success(c, filtered);
});

autocompleteRoute.get("/campaign-status", async (c) => {
  const statuses = [
    { id: "draft", name: "Draft" },
    { id: "active", name: "Active" },
    { id: "completed", name: "Completed" },
    { id: "cancelled", name: "Cancelled" },
  ];

  const q = c.req.query("q") || "";
  const filtered = q ? statuses.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())) : statuses;

  return success(c, filtered);
});

export default autocompleteRoute;
