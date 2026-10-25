import { Hono } from "hono";
import { success, error, paginated } from "../../lib/response";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireRole } from "../../middleware/auth";
import { CashBookError, createAdjustment, reverseEntry } from "../../services/cash-book";
import type { Env, Variables } from "../../types";
import {
  ReportInputError,
  accountsReport,
  clampPaging,
  fundsReport,
  listEntries,
  parseParty,
  parseRange,
  programsReport,
  reviewReport,
  revenueShareRecipients,
  revenueShareDisbursements,
  revenueShareReport,
  revenueShareTransactions,
} from "../../services/cash-book-reports";
import { cashAccounts } from "@bantuanku/db";
import { startOfDayWIB } from "../../utils/timezone";

/**
 * Laporan Buku Kas (ADR-0016): 5 laporan + daftar "perlu ditinjau". Hanya baca.
 * Semua query memakai parameter terikat; nilai enum divalidasi whitelist di service.
 */
const cashbook = new Hono<{ Bindings: Env; Variables: Variables }>();

cashbook.use("*", requireRole("super_admin", "admin_finance"));

// Kesalahan input (format tanggal, enum) → 400 dengan pesan jelas; kesalahan lain → 500 tanpa membocorkan detail
async function guarded(c: any, run: () => Promise<Response>) {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ReportInputError) return error(c, err.message, 400);
    console.error("[cashbook] laporan gagal:", err);
    return error(c, "Gagal membuat laporan buku kas", 500);
  }
}

// 1. Arus Kas
cashbook.get("/entries", (c) =>
  guarded(c, async () => {
    const q = c.req.query();
    const { page, limit, offset } = clampPaging(q.page, q.limit);
    const result = await listEntries(c.get("db"), {
      range: parseRange(q.startDate, q.endDate),
      fund: q.fund,
      accountId: q.accountId,
      method: q.method,
      gateway: q.gateway,
      direction: q.direction,
      component: q.component,
      q: q.q?.slice(0, 80),
      page,
      limit,
      offset,
    });
    return c.json({
      success: true,
      data: result.rows,
      summary: result.summary,
      byComponent: result.byComponent,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    });
  })
);

// 2. Sirkulasi Rekening (+ statistik per gateway)
cashbook.get("/accounts", (c) =>
  guarded(c, async () => {
    const q = c.req.query();
    return success(c, await accountsReport(c.get("db"), parseRange(q.startDate, q.endDate)));
  })
);

// 3. Dana per Sumber
cashbook.get("/funds", (c) =>
  guarded(c, async () => {
    const q = c.req.query();
    return success(c, await fundsReport(c.get("db"), parseRange(q.startDate, q.endDate)));
  })
);

// 4. Bagi Hasil
cashbook.get("/revenue-share", (c) =>
  guarded(c, async () => {
    const q = c.req.query();
    return success(c, await revenueShareReport(c.get("db"), parseRange(q.startDate, q.endDate)));
  })
);

cashbook.get("/revenue-share/:party/recipients", (c) =>
  guarded(c, async () => {
    const q = c.req.query();
    const party = parseParty(c.req.param("party"));
    return success(c, await revenueShareRecipients(c.get("db"), party, parseRange(q.startDate, q.endDate)));
  })
);

cashbook.get("/revenue-share/:party/disbursements", (c) =>
  guarded(c, async () => {
    const q = c.req.query();
    const party = parseParty(c.req.param("party"));
    return success(c, await revenueShareDisbursements(c.get("db"), party, parseRange(q.startDate, q.endDate), q.recipientId || ""));
  })
);

cashbook.get("/revenue-share/:party/transactions", (c) =>
  guarded(c, async () => {
    const q = c.req.query();
    const party = parseParty(c.req.param("party"));
    const { page, limit, offset } = clampPaging(q.page, q.limit, 50, 200);
    const result = await revenueShareTransactions(c.get("db"), party, parseRange(q.startDate, q.endDate), {
      recipientId: q.recipientId,
      status: q.status,
      page,
      limit,
      offset,
    });
    return paginated(c, result.rows, { page, limit, total: result.total });
  })
);

// 5. Rincian per Program
cashbook.get("/programs", (c) =>
  guarded(c, async () => {
    const q = c.req.query();
    const { page, limit, offset } = clampPaging(q.page, q.limit, 20, 100);
    const result = await programsReport(c.get("db"), parseRange(q.startDate, q.endDate), {
      fund: q.fund,
      q: q.q?.slice(0, 80),
      page,
      limit,
      offset,
    });
    return c.json({
      success: true,
      data: result.rows,
      catatan: result.catatan,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    });
  })
);

// Perlu ditinjau (informasi + celah posting)
cashbook.get("/review", (c) => guarded(c, async () => success(c, await reviewReport(c.get("db")))));

// ── Koreksi (tulis; selalu dengan catatan dan jejak audit) ──
const writeMeta = (c: any) => ({
  userId: c.get("user")!.id as string,
  ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || null,
  userAgent: c.req.header("user-agent") || null,
});

async function guardedWrite(c: any, run: () => Promise<Response>) {
  try {
    return await run();
  } catch (err) {
    if (err instanceof CashBookError) return error(c, err.message, err.status);
    console.error("[cashbook] koreksi gagal:", err);
    return error(c, "Gagal menyimpan koreksi", 500);
  }
}

const reverseSchema = z.object({ note: z.string().min(5).max(500) });
cashbook.post("/entries/:id/reverse", zValidator("json", reverseSchema), (c) =>
  guardedWrite(c, async () => {
    const { note } = c.req.valid("json");
    const created = await reverseEntry(c.get("db"), c.req.param("id"), note, writeMeta(c));
    return success(c, { id: created.id }, "Entri dibalik", 201);
  })
);

const adjustmentSchema = z.object({
  direction: z.enum(["in", "out"]),
  amount: z.number().int().positive().max(100_000_000_000),
  fund: z.string().min(1).max(30),
  fundDetail: z.string().max(60).optional(),
  accountId: z.string().min(1).max(60),
  note: z.string().min(5).max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
cashbook.post("/adjustments", zValidator("json", adjustmentSchema), (c) =>
  guardedWrite(c, async () => {
    const body = c.req.valid("json");
    const created = await createAdjustment(
      c.get("db"),
      { ...body, date: body.date ? startOfDayWIB(body.date) : undefined },
      writeMeta(c)
    );
    return success(c, { id: created.id }, "Penyesuaian dicatat", 201);
  })
);

// Daftar akun kas untuk pilihan formulir (tanpa statistik)
cashbook.get("/account-options", (c) =>
  guarded(c, async () => {
    const rows = await c.get("db").select({ id: cashAccounts.id, name: cashAccounts.name, kind: cashAccounts.kind }).from(cashAccounts).orderBy(cashAccounts.kind, cashAccounts.name);
    return success(c, rows);
  })
);

export default cashbook;
