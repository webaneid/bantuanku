import { Hono } from "hono";
import * as XLSX from "xlsx";
import { eq, or } from "drizzle-orm";
import { mustahiqs, createId, type Database } from "@bantuanku/db";
import { requireRole } from "../../middleware/auth";
import { normalizePhone } from "../../lib/contact-helpers";
import { success, error } from "../../lib/response";
import type { Env, Variables } from "../../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const VALID_ASNAF = [
  "fakir", "miskin", "amil", "mualaf", "riqab", "gharim", "fisabilillah", "ibnus_sabil",
];

const VALID_MARITAL = [
  "menikah", "belum_menikah", "janda_cerai_hidup", "janda_cerai_mati",
  "duda_cerai_hidup", "duda_cerai_mati",
];

const TEMPLATE_HEADERS = [
  "Nama",
  "Kategori Asnaf",
  "No. Identitas",
  "NIK",
  "WhatsApp",
  "Telepon",
  "Email",
  "Jenis Kelamin",
  "Tempat Lahir",
  "Tanggal Lahir",
  "Nama Ibu",
  "Status Pernikahan",
  "Jumlah Tanggungan",
  "Alamat Lengkap",
  "Nama Bank",
  "No. Rekening",
  "Nama Pemilik Rekening",
  "Catatan",
];

const EXAMPLE_ROW = [
  "Siti Aminah",
  "fakir",
  "MSQ-001",
  "3201010101900001",
  "081234567890",
  "021-5551234",
  "siti@email.com",
  "perempuan",
  "Bogor",
  "1990-01-01",
  "Fatimah",
  "menikah",
  "3",
  "Jl. Pahlawan No. 5, RT 02/RW 03",
  "BSI",
  "7123456789",
  "Siti Aminah",
  "Penerima rutin sejak 2022",
];

type ImportMode = "skip" | "update";

interface ParsedRow {
  name: string;
  asnafCategory: string;
  mustahiqId?: string;
  nationalId?: string;
  whatsappNumber?: string;
  phone?: string;
  email?: string;
  gender?: string;
  birthPlace?: string;
  dateOfBirth?: string;
  motherName?: string;
  maritalStatus?: string;
  dependents?: number;
  detailAddress?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  notes?: string;
}

interface RowResult {
  rowNumber: number;
  status: "valid" | "error" | "duplicate";
  duplicateType?: "mustahiq_id" | "in_file";
  existingId?: string;
  data: Partial<ParsedRow>;
  errors?: string[];
}

function parseSheet(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
}

function normalizeAsnaf(raw: string): string | null {
  const v = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return VALID_ASNAF.includes(v) ? v : null;
}

function normalizeMarital(raw: string): string | null {
  const v = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return VALID_MARITAL.includes(v) ? v : null;
}

function validateAndNormalizeRow(raw: Record<string, string>, rowNumber: number): RowResult {
  const data: Partial<ParsedRow> = {};
  const errors: string[] = [];

  // Nama (wajib)
  const name = String(raw["Nama"] || "").trim();
  if (!name || name.length < 2) {
    errors.push("Nama wajib diisi (minimal 2 karakter)");
  } else {
    data.name = name;
  }

  // Kategori Asnaf (wajib)
  const asnafRaw = String(raw["Kategori Asnaf"] || "").trim();
  if (!asnafRaw) {
    errors.push("Kategori Asnaf wajib diisi");
  } else {
    const asnaf = normalizeAsnaf(asnafRaw);
    if (!asnaf) {
      errors.push(`Kategori Asnaf tidak valid: "${asnafRaw}". Pilihan: ${VALID_ASNAF.join(", ")}`);
    } else {
      data.asnafCategory = asnaf;
    }
  }

  // No. Identitas — mustahiqId (opsional, unique, used for dedup)
  const mustahiqId = String(raw["No. Identitas"] || "").trim();
  if (mustahiqId) data.mustahiqId = mustahiqId;

  // NIK — nationalId (opsional)
  const nik = String(raw["NIK"] || "").trim().replace(/\s/g, "");
  if (nik) {
    if (!/^\d{16}$/.test(nik)) {
      errors.push("NIK harus 16 digit angka");
    } else {
      data.nationalId = nik;
    }
  }

  // WhatsApp (opsional)
  const waRaw = String(raw["WhatsApp"] || "").trim();
  if (waRaw) {
    const wa = normalizePhone(waRaw);
    if (wa && wa.length >= 9) data.whatsappNumber = wa;
  }

  // Telepon (opsional)
  const phoneRaw = String(raw["Telepon"] || "").trim();
  if (phoneRaw) {
    data.phone = normalizePhone(phoneRaw) || phoneRaw;
  }

  // Email (opsional)
  const emailRaw = String(raw["Email"] || "").trim().toLowerCase();
  if (emailRaw) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      errors.push("Format email tidak valid");
    } else {
      data.email = emailRaw;
    }
  }

  // Gender (opsional)
  const genderRaw = String(raw["Jenis Kelamin"] || "").trim().toLowerCase();
  if (genderRaw) {
    if (genderRaw === "laki-laki" || genderRaw === "laki" || genderRaw === "l") {
      data.gender = "laki-laki";
    } else if (genderRaw === "perempuan" || genderRaw === "wanita" || genderRaw === "p") {
      data.gender = "perempuan";
    } else {
      errors.push('Jenis kelamin harus "laki-laki" atau "perempuan"');
    }
  }

  // Tempat Lahir (opsional)
  const birthPlace = String(raw["Tempat Lahir"] || "").trim();
  if (birthPlace) data.birthPlace = birthPlace;

  // Tanggal Lahir (opsional)
  const birthDateRaw = String(raw["Tanggal Lahir"] || "").trim();
  if (birthDateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw)) {
      errors.push('Format tanggal lahir harus YYYY-MM-DD (contoh: "1990-05-20")');
    } else {
      data.dateOfBirth = birthDateRaw;
    }
  }

  // Nama Ibu (opsional)
  const motherName = String(raw["Nama Ibu"] || "").trim();
  if (motherName) data.motherName = motherName;

  // Status Pernikahan (opsional)
  const maritalRaw = String(raw["Status Pernikahan"] || "").trim();
  if (maritalRaw) {
    const marital = normalizeMarital(maritalRaw);
    if (!marital) {
      errors.push(`Status pernikahan tidak valid: "${maritalRaw}"`);
    } else {
      data.maritalStatus = marital;
    }
  }

  // Jumlah Tanggungan (opsional)
  const dependentsRaw = String(raw["Jumlah Tanggungan"] || "").trim();
  if (dependentsRaw) {
    const n = parseInt(dependentsRaw, 10);
    if (isNaN(n) || n < 0) {
      errors.push("Jumlah tanggungan harus angka >= 0");
    } else {
      data.dependents = n;
    }
  }

  // Alamat Lengkap (opsional)
  const addr = String(raw["Alamat Lengkap"] || "").trim();
  if (addr) data.detailAddress = addr;

  // Bank fields (opsional)
  const bankName = String(raw["Nama Bank"] || "").trim();
  if (bankName) data.bankName = bankName;

  const bankAccount = String(raw["No. Rekening"] || "").trim().replace(/\s/g, "");
  if (bankAccount) data.bankAccount = bankAccount;

  const bankAccountName = String(raw["Nama Pemilik Rekening"] || "").trim();
  if (bankAccountName) data.bankAccountName = bankAccountName;

  // Catatan (opsional)
  const notes = String(raw["Catatan"] || "").trim();
  if (notes) data.notes = notes;

  return {
    rowNumber,
    status: errors.length > 0 ? "error" : "valid",
    data,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function checkDuplicates(results: RowResult[], db: Database) {
  // Dedup in-file by mustahiqId
  const seenMustahiqId = new Map<string, number>();
  for (const result of results) {
    if (result.status === "error") continue;
    const mid = result.data.mustahiqId;
    if (mid) {
      if (seenMustahiqId.has(mid)) {
        result.status = "error";
        result.errors = [`No. Identitas duplikat dengan baris ${seenMustahiqId.get(mid)} dalam file ini`];
      } else {
        seenMustahiqId.set(mid, result.rowNumber);
      }
    }
  }

  // Dedup with DB by mustahiqId
  const validRows = results.filter((r) => r.status === "valid" && r.data.mustahiqId);
  if (validRows.length > 0) {
    const ids = validRows.map((r) => r.data.mustahiqId!);
    const existing = await db
      .select({ id: mustahiqs.id, mustahiqId: mustahiqs.mustahiqId })
      .from(mustahiqs)
      .where(or(...ids.map((mid) => eq(mustahiqs.mustahiqId, mid))));

    const dbMap = new Map(existing.map((e) => [e.mustahiqId, e.id]));
    for (const result of validRows) {
      const mid = result.data.mustahiqId!;
      if (dbMap.has(mid)) {
        result.status = "duplicate";
        result.duplicateType = "mustahiq_id";
        result.existingId = dbMap.get(mid)!;
      }
    }
  }
}

// GET /admin/mustahiqs/import/template
app.get("/template", async (c) => {
  const wb = XLSX.utils.book_new();
  const wsData = [TEMPLATE_HEADERS, EXAMPLE_ROW];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 20) }));
  XLSX.utils.book_append_sheet(wb, ws, "Import Mustahiq");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-mustahiq.xlsx"',
    },
  });
});

// POST /admin/mustahiqs/import/preview
app.post("/preview", requireRole("super_admin", "admin_campaign", "program_coordinator"), async (c) => {
  const db = c.get("db");

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return error(c, "File wajib diupload", 400);

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["xlsx", "csv"].includes(ext)) return error(c, "Format file harus .xlsx atau .csv", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  let rawRows: Record<string, string>[];
  try {
    rawRows = parseSheet(buffer);
  } catch {
    return error(c, "File tidak dapat dibaca. Pastikan format .xlsx atau .csv yang valid.", 400);
  }

  if (rawRows.length === 0) return error(c, "File tidak berisi data (selain header)", 400);
  if (rawRows.length > 1000) return error(c, "Maksimal 1.000 baris per file", 400);

  const results: RowResult[] = rawRows.map((row, i) => validateAndNormalizeRow(row, i + 2));
  await checkDuplicates(results, db);

  return success(c, {
    totalRows: results.length,
    validRows: results.filter((r) => r.status === "valid").length,
    errorRows: results.filter((r) => r.status === "error").length,
    duplicateRows: results.filter((r) => r.status === "duplicate").length,
    rows: results,
  });
});

// POST /admin/mustahiqs/import/commit
app.post("/commit", requireRole("super_admin", "admin_campaign", "program_coordinator"), async (c) => {
  const db = c.get("db");
  const mode = (c.req.query("mode") as ImportMode) || "skip";

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return error(c, "File wajib diupload", 400);

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["xlsx", "csv"].includes(ext)) return error(c, "Format file harus .xlsx atau .csv", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  let rawRows: Record<string, string>[];
  try {
    rawRows = parseSheet(buffer);
  } catch {
    return error(c, "File tidak dapat dibaca.", 400);
  }

  if (rawRows.length === 0) return error(c, "File tidak berisi data", 400);
  if (rawRows.length > 1000) return error(c, "Maksimal 1.000 baris per file", 400);

  const results: RowResult[] = rawRows.map((row, i) => validateAndNormalizeRow(row, i + 2));
  await checkDuplicates(results, db);

  let imported = 0;
  let skipped = 0;
  let updated = 0;
  let errors = 0;

  for (const result of results) {
    if (result.status === "error") {
      errors++;
      continue;
    }

    if (result.status === "duplicate") {
      if (mode === "update" && result.existingId) {
        const d = result.data;
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (d.name) updateData.name = d.name;
        if (d.asnafCategory) updateData.asnafCategory = d.asnafCategory;
        if (d.nationalId) updateData.nationalId = d.nationalId;
        if (d.whatsappNumber) updateData.whatsappNumber = d.whatsappNumber;
        if (d.phone) updateData.phone = d.phone;
        if (d.email) updateData.email = d.email;
        if (d.gender) updateData.gender = d.gender;
        if (d.birthPlace) updateData.birthPlace = d.birthPlace;
        if (d.dateOfBirth) updateData.dateOfBirth = new Date(d.dateOfBirth + "T12:00:00");
        if (d.motherName) updateData.motherName = d.motherName;
        if (d.maritalStatus) updateData.maritalStatus = d.maritalStatus;
        if (d.dependents !== undefined) updateData.dependents = d.dependents;
        if (d.detailAddress) updateData.detailAddress = d.detailAddress;
        if (d.bankName) updateData.bankName = d.bankName;
        if (d.bankAccount) updateData.bankAccount = d.bankAccount;
        if (d.bankAccountName) updateData.bankAccountName = d.bankAccountName;
        if (d.notes) updateData.notes = d.notes;
        await db.update(mustahiqs).set(updateData).where(eq(mustahiqs.id, result.existingId));
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    const d = result.data;
    await db.insert(mustahiqs).values({
      id: createId(),
      name: d.name!,
      asnafCategory: d.asnafCategory!,
      mustahiqId: d.mustahiqId || null,
      nationalId: d.nationalId || null,
      whatsappNumber: d.whatsappNumber || null,
      phone: d.phone || null,
      email: d.email || null,
      gender: d.gender || null,
      birthPlace: d.birthPlace || null,
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth + "T12:00:00") : null,
      motherName: d.motherName || null,
      maritalStatus: d.maritalStatus || null,
      dependents: d.dependents ?? null,
      detailAddress: d.detailAddress || null,
      bankName: d.bankName || null,
      bankAccount: d.bankAccount || null,
      bankAccountName: d.bankAccountName || null,
      notes: d.notes || null,
      isActive: true,
    });
    imported++;
  }

  return success(
    c,
    { imported, skipped, updated, errors, mode },
    `Import selesai: ${imported} ditambahkan, ${skipped} dilewati, ${updated} diperbarui, ${errors} gagal`
  );
});

export default app;
