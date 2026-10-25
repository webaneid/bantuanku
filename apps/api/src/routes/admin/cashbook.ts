import { Hono } from "hono";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
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
  revenueShareReport,
  revenueShareTransactions,
} from "../../services/cash-book-reports";

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

export default cashbook;
