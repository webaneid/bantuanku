import { sql, type SQL } from "drizzle-orm";
import type { Database } from "@bantuanku/db";
import { endOfDayWIB, startOfDayWIB } from "../utils/timezone";
import { COMPONENTS, FUNDS, METHODS, PROGRAM_FUNDS } from "./cash-book-rules";

/**
 * Laporan Buku Kas (ADR-0016, docs/arsitektur-buku-kas.md §5). Hanya BACA. Semua nilai dari request masuk lewat
 * parameter terikat (template `sql`); nilai enum divalidasi whitelist. Tanggal = batas hari WIB.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const n = (v: unknown) => Number(v || 0);

export class ReportInputError extends Error {}

export interface Range {
  from: Date | null;
  to: Date | null;
}

export function parseRange(startDate?: string, endDate?: string): Range {
  if ((startDate && !DATE_ONLY.test(startDate)) || (endDate && !DATE_ONLY.test(endDate))) {
    throw new ReportInputError("Format tanggal harus YYYY-MM-DD");
  }
  return { from: startDate ? startOfDayWIB(startDate) : null, to: endDate ? endOfDayWIB(endDate) : null };
}

/** `a >= from and a <= to` untuk kolom tanggal (null = tanpa batas). */
function rangeSql(column: SQL, range: Range): SQL[] {
  const out: SQL[] = [];
  if (range.from) out.push(sql`${column} >= ${range.from}`);
  if (range.to) out.push(sql`${column} <= ${range.to}`);
  return out;
}

const whereOf = (conds: SQL[]) => (conds.length ? sql`where ${sql.join(conds, sql` and `)}` : sql``);
const andOf = (conds: SQL[]) => (conds.length ? sql` and ${sql.join(conds, sql` and `)}` : sql``);

function oneOf<T extends readonly string[]>(value: string | undefined, allowed: T, label: string): T[number] | null {
  if (!value) return null;
  if (!(allowed as readonly string[]).includes(value)) throw new ReportInputError(`${label} tidak valid`);
  return value as T[number];
}

export function clampPaging(pageRaw?: string, limitRaw?: string, defaultLimit = 50, maxLimit = 200) {
  const page = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(limitRaw || String(defaultLimit), 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

/** Sumber dana sebuah transaksi (padanan SQL dari `fundForTransaction`). Alias: t = transactions, c = campaigns. */
const TXN_FUND = sql`(case t.product_type
  when 'zakat' then 'zakat'
  when 'qurban' then 'qurban'
  else (case lower(coalesce(t.type_specific_data->>'pillar', c.pillar, ''))
          when 'wakaf' then 'wakaf' when 'fidyah' then 'fidyah' else 'campaign' end)
end)`;
const TXN_FUND_DETAIL = sql`(case t.product_type
  when 'zakat' then regexp_replace(lower(coalesce(t.category, '')), '^zakat_', '')
  when 'qurban' then (case when t.type_specific_data->>'payment_type' = 'savings' then 'tabungan' else 'pembayaran' end)
  else (case lower(coalesce(t.type_specific_data->>'pillar', c.pillar, ''))
          when 'wakaf' then null when 'fidyah' then null
          else nullif(lower(coalesce(t.type_specific_data->>'pillar', c.pillar, '')), '') end)
end)`;

// ───────────────────────────── 1. Arus Kas ─────────────────────────────

export interface EntryFilters {
  range: Range;
  fund?: string;
  accountId?: string;
  method?: string;
  gateway?: string;
  direction?: string;
  component?: string;
  q?: string;
  page: number;
  limit: number;
  offset: number;
}

export async function listEntries(db: Database, f: EntryFilters) {
  const fund = oneOf(f.fund, FUNDS, "dana");
  const method = oneOf(f.method, METHODS, "metode");
  const component = oneOf(f.component, COMPONENTS, "komponen");
  const direction = oneOf(f.direction, ["in", "out"] as const, "arah");

  const conds: SQL[] = rangeSql(sql`e.entry_date`, f.range);
  if (fund) conds.push(sql`e.fund = ${fund}`);
  if (method) conds.push(sql`e.method = ${method}`);
  if (component) conds.push(sql`e.component = ${component}`);
  if (direction) conds.push(sql`e.direction = ${direction}`);
  if (f.accountId) conds.push(sql`e.cash_account_id = ${f.accountId}`);
  if (f.gateway) conds.push(sql`e.gateway_code = ${f.gateway.toLowerCase()}`);
  if (f.q) {
    const like = `%${f.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    conds.push(sql`(t.transaction_number ilike ${like} or e.ref_id ilike ${like} or t.product_name ilike ${like})`);
  }
  const where = whereOf(conds);

  const rows = (
    await db.execute(sql`
      select e.id, e.entry_date, e.direction, e.amount, e.component, e.fund, e.fund_detail, e.method, e.gateway_code,
             e.ref_type, e.ref_id, e.transaction_id, e.campaign_id, e.reverses_entry_id, e.note,
             a.id as account_id, a.name as account_name, a.kind as account_kind,
             t.transaction_number, t.product_name
      from cash_entries e
      join cash_accounts a on a.id = e.cash_account_id
      left join transactions t on t.id = e.transaction_id
      ${where}
      order by e.entry_date desc, e.id desc
      limit ${f.limit} offset ${f.offset}`)
  ).rows as any[];

  const [sum] = (
    await db.execute(sql`
      select count(*)::int as total,
             coalesce(sum(case when e.direction = 'in' then e.amount end), 0)::bigint as masuk,
             coalesce(sum(case when e.direction = 'out' then e.amount end), 0)::bigint as keluar
      from cash_entries e
      left join transactions t on t.id = e.transaction_id
      ${where}`)
  ).rows as any[];

  const byComponent = (
    await db.execute(sql`
      select e.direction, e.component, count(*)::int as n, coalesce(sum(e.amount), 0)::bigint as amount
      from cash_entries e left join transactions t on t.id = e.transaction_id
      ${where}
      group by 1, 2 order by 1, 2`)
  ).rows as any[];

  return {
    rows: rows.map((r) => ({
      id: r.id,
      date: r.entry_date,
      direction: r.direction,
      amount: n(r.amount),
      component: r.component,
      fund: r.fund,
      fundDetail: r.fund_detail,
      method: r.method,
      gateway: r.gateway_code,
      refType: r.ref_type,
      refId: r.ref_id,
      transactionId: r.transaction_id,
      transactionNumber: r.transaction_number,
      productName: r.product_name,
      campaignId: r.campaign_id,
      reversesEntryId: r.reverses_entry_id,
      note: r.note,
      account: { id: r.account_id, name: r.account_name, kind: r.account_kind },
    })),
    total: n(sum.total),
    summary: { masuk: n(sum.masuk), keluar: n(sum.keluar), netto: n(sum.masuk) - n(sum.keluar) },
    byComponent: byComponent.map((r) => ({ direction: r.direction, component: r.component, count: n(r.n), amount: n(r.amount) })),
  };
}

// ───────────────────────────── 2. Sirkulasi Rekening ─────────────────────────────

export async function accountsReport(db: Database, range: Range) {
  const dateConds = rangeSql(sql`e.entry_date`, range);
  const accounts = (
    await db.execute(sql`
      select a.id, a.kind, a.name, a.ref_key, a.gateway_code, a.purpose, a.is_active,
             count(e.id)::int as entries,
             coalesce(sum(case when e.direction = 'in' then e.amount end), 0)::bigint as masuk,
             coalesce(sum(case when e.direction = 'out' then e.amount end), 0)::bigint as keluar
      from cash_accounts a
      left join cash_entries e on e.cash_account_id = a.id ${andOf(dateConds)}
      group by a.id
      order by a.kind, a.name`)
  ).rows as any[];

  // Statistik per gateway dari SEMUA status pembayaran (percobaan, berhasil, tertunda, gagal) — keputusan D4
  const payConds = rangeSql(sql`p.created_at`, range);
  const gateways = (
    await db.execute(sql`
      select p.gateway_code,
             count(*)::int as percobaan,
             count(*) filter (where p.status = 'verified')::int as berhasil,
             count(*) filter (where p.status = 'pending')::int as tertunda,
             count(*) filter (where p.status not in ('verified', 'pending'))::int as gagal,
             coalesce(sum(p.amount) filter (where p.status = 'verified'), 0)::bigint as total_berhasil,
             coalesce(sum(p.amount) filter (where p.status = 'pending'), 0)::bigint as total_tertunda
      from transaction_payments p
      where p.gateway_code is not null ${andOf(payConds)}
      group by p.gateway_code
      order by p.gateway_code`)
  ).rows as any[];

  const zakatOut = (
    await db.execute(sql`
      select a.name, count(*)::int as n, coalesce(sum(e.amount), 0)::bigint as amount
      from cash_entries e join cash_accounts a on a.id = e.cash_account_id
      where e.direction = 'out' and e.fund = 'zakat' and a.purpose <> 'zakat' ${andOf(dateConds)}
      group by a.name`)
  ).rows as any[];

  const rows = accounts.map((a) => ({
    id: a.id,
    kind: a.kind,
    name: a.name,
    refKey: a.ref_key,
    gateway: a.gateway_code,
    purpose: a.purpose,
    entries: n(a.entries),
    masuk: n(a.masuk),
    keluar: n(a.keluar),
    sirkulasi: n(a.masuk) - n(a.keluar),
  }));
  return {
    note: "Sirkulasi = uang yang beredar di sistem (masuk − keluar), bukan saldo bank.",
    accounts: rows,
    totals: {
      masuk: rows.reduce((s, r) => s + r.masuk, 0),
      keluar: rows.reduce((s, r) => s + r.keluar, 0),
      sirkulasi: rows.reduce((s, r) => s + r.sirkulasi, 0),
    },
    gateways: gateways.map((g) => ({
      gateway: g.gateway_code,
      percobaan: n(g.percobaan),
      berhasil: n(g.berhasil),
      tertunda: n(g.tertunda),
      gagal: n(g.gagal),
      totalBerhasil: n(g.total_berhasil),
      totalTertunda: n(g.total_tertunda),
      tingkatBerhasil: n(g.percobaan) ? Math.round((n(g.berhasil) / n(g.percobaan)) * 1000) / 10 : 0,
    })),
    peringatan: zakatOut.map((z) => ({
      jenis: "zakat_dari_rekening_non_zakat",
      akun: z.name,
      jumlah: n(z.n),
      nominal: n(z.amount),
    })),
  };
}

// ───────────────────────────── 3. Dana per Sumber ─────────────────────────────

export async function fundsReport(db: Database, range: Range) {
  const entryConds = rangeSql(sql`e.entry_date`, range);
  const entries = (
    await db.execute(sql`
      select e.fund, e.fund_detail, e.direction, coalesce(sum(e.amount), 0)::bigint as amount, count(*)::int as n
      from cash_entries e ${whereOf(entryConds)}
      group by 1, 2, 3`)
  ).rows as any[];

  const hakConds = rangeSql(sql`rs.calculated_at`, range);
  const hak = (
    await db.execute(sql`
      select ${TXN_FUND} as fund, ${TXN_FUND_DETAIL} as fund_detail,
             coalesce(sum(rs.donation_amount - rs.program_amount), 0)::bigint as hak,
             count(*)::int as n
      from revenue_shares rs
      join transactions t on t.id = rs.transaction_id
      left join campaigns c on c.id = t.product_id and t.product_type = 'campaign'
      ${whereOf(hakConds)}
      group by 1, 2`)
  ).rows as any[];

  type Detail = { detail: string | null; masuk: number; hak: number };
  const funds = new Map<string, { masuk: number; keluar: number; hak: number; details: Map<string, Detail> }>();
  const get = (fund: string) => {
    if (!funds.has(fund)) funds.set(fund, { masuk: 0, keluar: 0, hak: 0, details: new Map() });
    return funds.get(fund)!;
  };
  const detailOf = (fund: string, detail: string | null) => {
    const f = get(fund);
    const key = detail || "";
    if (!f.details.has(key)) f.details.set(key, { detail, masuk: 0, hak: 0 });
    return f.details.get(key)!;
  };
  for (const r of entries) {
    const f = get(r.fund);
    if (r.direction === "in") {
      f.masuk += n(r.amount);
      detailOf(r.fund, r.fund_detail).masuk += n(r.amount);
    } else f.keluar += n(r.amount);
  }
  for (const r of hak) {
    const f = get(r.fund);
    f.hak += n(r.hak);
    detailOf(r.fund, r.fund_detail).hak += n(r.hak);
  }

  const program = PROGRAM_FUNDS.map((fund) => {
    const f = funds.get(fund) || { masuk: 0, keluar: 0, hak: 0, details: new Map() };
    return {
      fund,
      masuk: f.masuk,
      hakPihakLain: f.hak,
      disalurkan: f.keluar,
      sisa: f.masuk - f.hak - f.keluar,
      rincian: Array.from(f.details.values())
        .sort((a, b) => b.masuk - a.masuk)
        .map((d) => ({ detail: d.detail, masuk: d.masuk, hakPihakLain: d.hak })),
    };
  });
  const nonProgram = (["bagi_hasil", "operasional", "lainnya"] as const).map((fund) => ({
    fund,
    keluar: funds.get(fund)?.keluar || 0,
    masuk: funds.get(fund)?.masuk || 0,
  }));

  const totalMasuk = Array.from(funds.values()).reduce((s, f) => s + f.masuk, 0);
  const totalKeluar = Array.from(funds.values()).reduce((s, f) => s + f.keluar, 0);
  const sisaProgram = program.reduce((s, p) => s + p.sisa, 0);
  const hakTotal = program.reduce((s, p) => s + p.hakPihakLain, 0);
  const keluarNonProgram = nonProgram.reduce((s, p) => s + p.keluar, 0);
  const hakTersisa = hakTotal - keluarNonProgram; // hak pihak lain yang belum keluar dari kas

  return {
    rumus: "sisa = masuk − hak pihak lain (amil, developer, mitra, influencer) − disalurkan; sisa tetap sisa program",
    program,
    nonProgram,
    identitas: {
      sirkulasiTotal: totalMasuk - totalKeluar,
      sisaProgram,
      hakTersisaDiKas: hakTersisa,
      selisih: totalMasuk - totalKeluar - (sisaProgram + hakTersisa),
    },
  };
}

// ───────────────────────────── 4. Bagi Hasil ─────────────────────────────

const PARTIES = ["amil", "developer", "mitra", "fundraiser"] as const;
export type Party = (typeof PARTIES)[number];
const PARTY_LABEL: Record<Party, string> = { amil: "Amil", developer: "Developer", mitra: "Mitra", fundraiser: "Influencer (Fundraiser)" };
const PARTY_COLUMN: Record<Party, SQL> = {
  amil: sql`rs.amil_net_amount`,
  developer: sql`rs.developer_amount`,
  mitra: sql`rs.mitra_amount`,
  fundraiser: sql`rs.fundraiser_amount`,
};

export function parseParty(value?: string): Party {
  if (!value || !(PARTIES as readonly string[]).includes(value)) throw new ReportInputError("pihak tidak valid");
  return value as Party;
}

export async function revenueShareReport(db: Database, range: Range) {
  const shareConds = rangeSql(sql`rs.calculated_at`, range);
  const hakRows = (
    await db.execute(sql`
      select coalesce(sum(rs.amil_net_amount), 0)::bigint as amil,
             coalesce(sum(rs.developer_amount), 0)::bigint as developer,
             coalesce(sum(rs.mitra_amount), 0)::bigint as mitra,
             coalesce(sum(rs.fundraiser_amount), 0)::bigint as fundraiser,
             count(*)::int as n
      from revenue_shares rs
      join transactions t on t.id = rs.transaction_id and t.payment_status = 'paid'
      ${whereOf(shareConds)}`)
  ).rows as any[];
  const hak = hakRows[0] || {};

  const paidRows = (
    await db.execute(sql`
      select i.share_type, coalesce(sum(i.allocated_amount), 0)::bigint as amount
      from disbursement_revenue_share_items i
      join disbursements d on d.id = i.disbursement_id and d.status = 'paid'
      join revenue_shares rs on rs.id = i.revenue_share_id
      ${whereOf(shareConds)}
      group by 1`)
  ).rows as any[];
  const paid = Object.fromEntries(paidRows.map((r) => [r.share_type, n(r.amount)]));

  const opsConds = rangeSql(sql`e.entry_date`, range);
  const [ops] = (
    await db.execute(sql`
      select coalesce(sum(e.amount), 0)::bigint as amount
      from cash_entries e
      where e.direction = 'out' and e.fund = 'operasional' ${andOf(opsConds)}`)
  ).rows as any[];

  const parties = PARTIES.map((party) => {
    const h = n((hak as any)[party]);
    const dibayar = party === "amil" ? n(ops?.amount) : n(paid[party]);
    return {
      party,
      label: PARTY_LABEL[party],
      hak: h,
      dibayar,
      sisa: h - dibayar,
      keterangan: party === "amil" ? "dibayar = pengeluaran operasional (tanggal pengeluaran)" : "dibayar = alokasi pada pencairan paid",
      status: party === "amil" ? null : h === 0 ? "kosong" : dibayar >= h ? "lunas" : dibayar > 0 ? "sebagian" : "belum",
    };
  });
  return { transaksiBerbagiHasil: n((hak as any).n), parties };
}

/** Per penerima (mitra / fundraiser): hak, dibayar, sisa. Developer dan amil satu entitas (tanpa rincian). */
export async function revenueShareRecipients(db: Database, party: Party, range: Range) {
  if (party !== "mitra" && party !== "fundraiser") throw new ReportInputError("rincian penerima hanya untuk mitra atau fundraiser");
  const shareConds = rangeSql(sql`rs.calculated_at`, range);
  const idColumn = party === "mitra" ? sql`rs.mitra_id` : sql`rs.fundraiser_id`;
  const amountColumn = PARTY_COLUMN[party];
  const nameJoin =
    party === "mitra"
      ? sql`left join mitra r on r.id = rs.mitra_id`
      : sql`left join fundraisers r on r.id = rs.fundraiser_id left join donatur dn on dn.id = r.donatur_id`;
  const nameCol = party === "mitra" ? sql`r.name` : sql`coalesce(dn.name, r.code)`;

  const rows = (
    await db.execute(sql`
      select ${idColumn} as recipient_id, ${nameCol} as recipient_name,
             coalesce(sum(${amountColumn}), 0)::bigint as hak,
             coalesce(sum((select coalesce(sum(i.allocated_amount), 0)
                           from disbursement_revenue_share_items i
                           join disbursements d on d.id = i.disbursement_id and d.status = 'paid'
                           where i.revenue_share_id = rs.id and i.share_type = ${party})), 0)::bigint as dibayar,
             count(*)::int as transaksi
      from revenue_shares rs
      join transactions t on t.id = rs.transaction_id and t.payment_status = 'paid'
      ${nameJoin}
      ${whereOf([...shareConds, sql`${idColumn} is not null`, sql`${amountColumn} > 0`])}
      group by 1, 2
      order by hak desc`)
  ).rows as any[];
  return rows.map((r) => ({
    recipientId: r.recipient_id,
    name: r.recipient_name,
    hak: n(r.hak),
    dibayar: n(r.dibayar),
    sisa: n(r.hak) - n(r.dibayar),
    transaksi: n(r.transaksi),
  }));
}

export async function revenueShareTransactions(
  db: Database,
  party: Party,
  range: Range,
  opts: { recipientId?: string; status?: string; page: number; limit: number; offset: number }
) {
  const amountColumn = PARTY_COLUMN[party];
  const conds: SQL[] = [...rangeSql(sql`rs.calculated_at`, range), sql`${amountColumn} > 0`];
  if (opts.recipientId) {
    if (party === "mitra") conds.push(sql`rs.mitra_id = ${opts.recipientId}`);
    else if (party === "fundraiser") conds.push(sql`rs.fundraiser_id = ${opts.recipientId}`);
  }
  const paidExpr =
    party === "amil"
      ? sql`0`
      : sql`(select coalesce(sum(i.allocated_amount), 0) from disbursement_revenue_share_items i
             join disbursements d on d.id = i.disbursement_id and d.status = 'paid'
             where i.revenue_share_id = rs.id and i.share_type = ${party})`;
  const base = sql`
    from revenue_shares rs
    join transactions t on t.id = rs.transaction_id and t.payment_status = 'paid'
    ${whereOf(conds)}`;

  const rows = (
    await db.execute(sql`
      select * from (
        select t.transaction_number, t.product_name, t.product_type, rs.calculated_at,
               ${amountColumn}::bigint as hak, ${paidExpr}::bigint as dibayar
        ${base}
      ) x
      ${opts.status === "belum" ? sql`where x.dibayar = 0` : opts.status === "sebagian" ? sql`where x.dibayar > 0 and x.dibayar < x.hak` : opts.status === "lunas" ? sql`where x.dibayar >= x.hak` : sql``}
      order by x.calculated_at desc
      limit ${opts.limit} offset ${opts.offset}`)
  ).rows as any[];
  const [count] = (await db.execute(sql`select count(*)::int as total ${base}`)).rows as any[];
  return {
    total: n(count.total),
    rows: rows.map((r) => ({
      transactionNumber: r.transaction_number,
      productName: r.product_name,
      productType: r.product_type,
      date: r.calculated_at,
      hak: n(r.hak),
      dibayar: n(r.dibayar),
      sisa: n(r.hak) - n(r.dibayar),
      status: party === "amil" ? null : n(r.dibayar) >= n(r.hak) ? "lunas" : n(r.dibayar) > 0 ? "sebagian" : "belum",
    })),
  };
}

// ───────────────────────────── 5. Rincian per Program ─────────────────────────────

export async function programsReport(
  db: Database,
  range: Range,
  opts: { fund?: string; q?: string; page: number; limit: number; offset: number }
) {
  const fund = oneOf(opts.fund, PROGRAM_FUNDS, "dana");
  const entryConds = rangeSql(sql`e.entry_date`, range);
  const hakConds = rangeSql(sql`rs.calculated_at`, range);
  const qLike = opts.q ? `%${opts.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%` : null;

  const rows = (
    await db.execute(sql`
      with masuk as (
        select t.product_type, t.product_id, max(t.product_name) as name, ${TXN_FUND} as fund,
               coalesce(sum(e.amount), 0)::bigint as masuk
        from cash_entries e
        join transactions t on t.id = e.transaction_id
        left join campaigns c on c.id = t.product_id and t.product_type = 'campaign'
        where e.direction = 'in' ${andOf(entryConds)}
        group by t.product_type, t.product_id, 4
      ),
      hak as (
        select t.product_id, coalesce(sum(rs.donation_amount - rs.program_amount), 0)::bigint as hak
        from revenue_shares rs join transactions t on t.id = rs.transaction_id
        ${whereOf(hakConds)}
        group by t.product_id
      ),
      keluar as (
        select e.campaign_id as product_id, coalesce(sum(e.amount), 0)::bigint as keluar
        from cash_entries e
        where e.direction = 'out' and e.campaign_id is not null ${andOf(entryConds)}
        group by e.campaign_id
      )
      select m.product_type, m.product_id, m.name, m.fund, m.masuk,
             coalesce(h.hak, 0)::bigint as hak, coalesce(k.keluar, 0)::bigint as keluar,
             count(*) over ()::int as total
      from masuk m
      left join hak h on h.product_id = m.product_id
      left join keluar k on k.product_id = m.product_id
      where true
        ${fund ? sql`and m.fund = ${fund}` : sql``}
        ${qLike ? sql`and m.name ilike ${qLike}` : sql``}
      order by m.masuk desc
      limit ${opts.limit} offset ${opts.offset}`)
  ).rows as any[];

  return {
    catatan: "Penyaluran (keluar) hanya terpetakan ke campaign; penyaluran zakat/qurban tampil di laporan Dana per Sumber.",
    total: rows.length ? n(rows[0].total) : 0,
    rows: rows.map((r) => ({
      productType: r.product_type,
      productId: r.product_id,
      name: r.name,
      fund: r.fund,
      masuk: n(r.masuk),
      hakPihakLain: n(r.hak),
      disalurkan: n(r.keluar),
      sisa: n(r.masuk) - n(r.hak) - n(r.keluar),
    })),
  };
}

// ───────────────────────────── Perlu ditinjau ─────────────────────────────

export async function reviewReport(db: Database) {
  const q = async (query: SQL) => ((await db.execute(query)).rows as any[])[0] || {};
  const verifiedMissing = await q(sql`
    select count(*)::int n, coalesce(sum(p.amount), 0)::bigint amount from transaction_payments p
    where p.status = 'verified' and not exists (select 1 from cash_entries e where e.ref_type = 'transaction_payment' and e.ref_id = p.id)`);
  const paidDisbMissing = await q(sql`
    select count(*)::int n, coalesce(sum(coalesce(d.transferred_amount, d.amount)), 0)::bigint amount from disbursements d
    where d.status = 'paid' and not exists (select 1 from cash_entries e where e.ref_type = 'disbursement' and e.ref_id = d.id)`);
  const unmapped = await q(sql`
    select count(*)::int n, coalesce(sum(e.amount), 0)::bigint amount from cash_entries e join cash_accounts a on a.id = e.cash_account_id where a.kind = 'unmapped'`);
  const kelebihan = await q(sql`select count(*)::int n, coalesce(sum(amount), 0)::bigint amount from cash_entries where component = 'kelebihan'`);
  const synthetic = await q(sql`select count(*)::int n, coalesce(sum(amount), 0)::bigint amount from cash_entries where ref_type = 'transaction_paid' and not exists (select 1 from cash_entries r where r.reverses_entry_id = cash_entries.id)`);
  const noShare = (
    await db.execute(sql`
      select t.transaction_number, t.product_type, t.product_name, t.total_amount, t.paid_at
      from transactions t
      left join campaigns c on c.id = t.product_id and t.product_type = 'campaign'
      where t.payment_status = 'paid' and t.total_amount > 0
        and coalesce((t.type_specific_data->>'is_non_cash')::boolean, false) = false
        and not exists (select 1 from revenue_shares rs where rs.transaction_id = t.id)
        and not (t.product_type = 'campaign' and lower(coalesce(t.type_specific_data->>'pillar', c.pillar, '')) in ('wakaf', 'fidyah'))
        and not (t.product_type = 'qurban' and coalesce(t.admin_fee, 0) <= 0)
      order by t.paid_at desc nulls last
      limit 20`)
  ).rows as any[];
  const [noShareCount] = (
    await db.execute(sql`
      select count(*)::int n, coalesce(sum(t.total_amount), 0)::bigint amount
      from transactions t left join campaigns c on c.id = t.product_id and t.product_type = 'campaign'
      where t.payment_status = 'paid' and t.total_amount > 0
        and coalesce((t.type_specific_data->>'is_non_cash')::boolean, false) = false
        and not exists (select 1 from revenue_shares rs where rs.transaction_id = t.id)
        and not (t.product_type = 'campaign' and lower(coalesce(t.type_specific_data->>'pillar', c.pillar, '')) in ('wakaf', 'fidyah'))
        and not (t.product_type = 'qurban' and coalesce(t.admin_fee, 0) <= 0)`)
  ).rows as any[];

  return {
    belumDiposting: {
      pembayaranVerified: { jumlah: n(verifiedMissing.n), nominal: n(verifiedMissing.amount) },
      pencairanPaid: { jumlah: n(paidDisbMissing.n), nominal: n(paidDisbMissing.amount) },
    },
    informasi: {
      akunBelumDipetakan: { jumlah: n(unmapped.n), nominal: n(unmapped.amount) },
      kelebihan: { jumlah: n(kelebihan.n), nominal: n(kelebihan.amount) },
      pemasukanSintetis: { jumlah: n(synthetic.n), nominal: n(synthetic.amount) },
    },
    paidTanpaBagiHasil: {
      jumlah: n(noShareCount.n),
      nominal: n(noShareCount.amount),
      contoh: noShare.map((r) => ({
        transactionNumber: r.transaction_number,
        productType: r.product_type,
        productName: r.product_name,
        total: n(r.total_amount),
        paidAt: r.paid_at,
      })),
    },
  };
}
