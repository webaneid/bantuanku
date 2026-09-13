import { Hono } from "hono";
import * as XLSX from "xlsx";
import { eq, or } from "drizzle-orm";
import { donatur, createId } from "@bantuanku/db";
import { requireRole } from "../../middleware/auth";
import { normalizePhone } from "../../lib/contact-helpers";
import { success, error } from "../../lib/response";
import type { Env, Variables } from "../../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Kolom template (urutan penting — sesuai dengan yang digenerate)
const TEMPLATE_HEADERS = [
  "Nama",
  "WhatsApp",
  "Email",
  "Telepon",
  "Alamat Lengkap",
  "Jenis Kelamin",
  "NIK",
  "NPWP",
  "Tempat Lahir",
  "Tanggal Lahir",
];

const EXAMPLE_ROW = [
  "Budi Santoso",
  "081234567890",
  "budi@email.com",
  "021-5551234",
  "Jl. Merdeka No. 10, RT 03/RW 05",
  "laki-laki",
  "3201010101900001",
  "12.345.678.9-012.000",
  "Jakarta",
  "1990-01-01",
];

type ImportMode = "skip" | "update";

interface ParsedRow {
  name: string;
  whatsappNumber: string;
  email?: string;
  phone?: string;
  detailAddress?: string;
  gender?: string;
  nik?: string;
  npwp?: string;
  birthPlace?: string;
  birthDate?: string;
}

interface RowConflict {
  field: "email" | "whatsapp";
  existingValue: string;
  newValue: string;
  // true kalau newValue sudah dipakai donatur LAIN (bukan yang match) — tidak boleh ditimpa
  conflictsWithOtherDonatur?: boolean;
}

interface RowResult {
  rowNumber: number;
  status: "valid" | "error" | "duplicate";
  duplicateType?: "whatsapp" | "email";
  existingId?: string;
  // Terisi kalau field lain (bukan yang jadi dasar match) berbeda nilainya dari data di DB —
  // admin perlu pilih: pertahankan nilai lama atau timpa dengan nilai baru dari file
  conflict?: RowConflict;
  data: Partial<ParsedRow>;
  errors?: string[];
  // Field opsional yang formatnya tidak valid & di-skip (bukan gagalkan seluruh baris) — lihat
  // NIK/Tanggal Lahir di validateAndNormalizeRow
  warnings?: string[];
}

const INDONESIAN_MONTHS: Record<string, string> = {
  januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06",
  juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12",
};

// Terima "YYYY-MM-DD" (format template) ATAU "D MMMM YYYY[ pukul HH.MM]" (format export
// donatur bahasa Indonesia, misal "22 Mei 2003 pukul 07.00") — dua format ini yang paling
// umum ditemukan di file yang diupload admin/client. Return null kalau tidak dikenali sama sekali.
function parseBirthDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+pukul\s+\d{1,2}[.:]\d{2})?$/i);
  if (match) {
    const [, day, monthName, year] = match;
    const month = INDONESIAN_MONTHS[monthName.toLowerCase()];
    if (month) return `${year}-${month}-${day.padStart(2, "0")}`;
  }
  return null;
}

type ImportResolution = "overwrite" | "keep";

function parseResolutions(raw: string | null): Record<string, ImportResolution> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Deteksi apakah baris duplicate punya conflict di field yang tidak jadi dasar match
// (dipakai sama persis di preview & commit supaya hasil klasifikasi konsisten)
type DonaturLookup = { id: string; whatsappNumber: string | null; email: string };

function detectConflict(
  matchedField: "whatsapp" | "email",
  fileData: Partial<ParsedRow>,
  existing: DonaturLookup,
  dbByWa: Map<string | null, DonaturLookup>,
  dbByEmail: Map<string | null, DonaturLookup>
): RowConflict | undefined {
  if (matchedField === "whatsapp") {
    const newEmail = fileData.email;
    if (newEmail && existing.email && newEmail !== existing.email) {
      const owner = dbByEmail.get(newEmail);
      return {
        field: "email",
        existingValue: existing.email,
        newValue: newEmail,
        conflictsWithOtherDonatur: !!owner && owner.id !== existing.id,
      };
    }
  } else {
    const newWa = fileData.whatsappNumber;
    if (newWa && existing.whatsappNumber && newWa !== existing.whatsappNumber) {
      const owner = dbByWa.get(newWa);
      return {
        field: "whatsapp",
        existingValue: existing.whatsappNumber,
        newValue: newWa,
        conflictsWithOtherDonatur: !!owner && owner.id !== existing.id,
      };
    }
  }
  return undefined;
}

function parseSheet(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });
}

function validateAndNormalizeRow(raw: Record<string, string>, rowNumber: number): RowResult {
  const data: Partial<ParsedRow> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  // Nama
  const name = String(raw["Nama"] || "").trim();
  if (!name || name.length < 2) {
    errors.push("Nama wajib diisi (minimal 2 karakter)");
  } else {
    data.name = name;
  }

  // WhatsApp (wajib)
  const waRaw = String(raw["WhatsApp"] || "").trim();
  if (!waRaw) {
    errors.push("Nomor WhatsApp wajib diisi");
  } else {
    const wa = normalizePhone(waRaw);
    if (!wa || wa.length < 9) {
      errors.push("Format nomor WhatsApp tidak valid");
    } else {
      data.whatsappNumber = wa;
    }
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

  // Telepon (opsional)
  const phoneRaw = String(raw["Telepon"] || "").trim();
  if (phoneRaw) {
    data.phone = normalizePhone(phoneRaw) || phoneRaw;
  }

  // Alamat lengkap (opsional) — "Alamat Detail" adalah nama kolom yang dipakai file hasil
  // export donatur (beda dari "Alamat Lengkap" di template import), diterima sebagai alias
  const addr = String(raw["Alamat Lengkap"] || raw["Alamat Detail"] || "").trim();
  if (addr) data.detailAddress = addr;

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

  // NIK (opsional) — kalau formatnya tidak valid, field ini di-skip (bukan gagalkan seluruh
  // baris) karena banyak data lama pakai placeholder seperti "0", "123", "-", "000000"
  const nik = String(raw["NIK"] || "").trim().replace(/\s/g, "");
  if (nik) {
    if (!/^\d{16}$/.test(nik)) {
      warnings.push(`NIK "${nik}" tidak valid (harus 16 digit angka), field ini dilewati`);
    } else {
      data.nik = nik;
    }
  }

  // NPWP (opsional)
  const npwp = String(raw["NPWP"] || "").trim();
  if (npwp) data.npwp = npwp;

  // Tempat lahir (opsional)
  const birthPlace = String(raw["Tempat Lahir"] || "").trim();
  if (birthPlace) data.birthPlace = birthPlace;

  // Tanggal lahir (opsional) — terima YYYY-MM-DD atau format export "D MMMM YYYY[ pukul HH.MM]".
  // Kalau tidak dikenali sama sekali, field ini di-skip (bukan gagalkan seluruh baris).
  const birthDateRaw = String(raw["Tanggal Lahir"] || "").trim();
  if (birthDateRaw) {
    const parsed = parseBirthDate(birthDateRaw);
    if (parsed) {
      data.birthDate = parsed;
    } else {
      warnings.push(`Tanggal lahir "${birthDateRaw}" tidak dikenali formatnya, field ini dilewati`);
    }
  }

  return {
    rowNumber,
    status: errors.length > 0 ? "error" : "valid",
    data,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// GET /admin/donatur/import/template
app.get("/template", async (c) => {
  const wb = XLSX.utils.book_new();
  const wsData = [TEMPLATE_HEADERS, EXAMPLE_ROW];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 20) }));

  XLSX.utils.book_append_sheet(wb, ws, "Import Donatur");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-donatur.xlsx"',
    },
  });
});

// POST /admin/donatur/import/preview
app.post(
  "/preview",
  requireRole("super_admin", "admin_campaign"),
  async (c) => {
    const db = c.get("db");

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return error(c, "File wajib diupload", 400);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "csv"].includes(ext)) {
      return error(c, "Format file harus .xlsx atau .csv", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawRows: Record<string, string>[];
    try {
      rawRows = parseSheet(buffer);
    } catch {
      return error(c, "File tidak dapat dibaca. Pastikan format .xlsx atau .csv yang valid.", 400);
    }

    if (rawRows.length === 0) return error(c, "File tidak berisi data (selain header)", 400);
    if (rawRows.length > 1000) return error(c, "Maksimal 1.000 baris per file", 400);

    // Validasi setiap baris
    const results: RowResult[] = rawRows.map((row, i) =>
      validateAndNormalizeRow(row, i + 2) // +2 karena baris 1 = header
    );

    // Cek duplikat dalam file
    const seenWa = new Map<string, number>();
    const seenEmail = new Map<string, number>();
    for (const result of results) {
      if (result.status === "error") continue;
      const wa = result.data.whatsappNumber;
      const email = result.data.email;
      if (wa) {
        if (seenWa.has(wa)) {
          result.status = "error";
          result.errors = [`Nomor WhatsApp duplikat dengan baris ${seenWa.get(wa)} dalam file ini`];
        } else {
          seenWa.set(wa, result.rowNumber);
        }
      }
      if (email) {
        if (seenEmail.has(email)) {
          result.status = "error";
          result.errors = [`Email duplikat dengan baris ${seenEmail.get(email)} dalam file ini`];
        } else {
          seenEmail.set(email, result.rowNumber);
        }
      }
    }

    // Cek duplikat dengan DB (batch query)
    const validRows = results.filter((r) => r.status === "valid");
    if (validRows.length > 0) {
      const waNumbers = validRows.map((r) => r.data.whatsappNumber!).filter(Boolean);
      const emails = validRows.map((r) => r.data.email!).filter(Boolean);

      const dbConditions = [
        ...waNumbers.map((wa) => eq(donatur.whatsappNumber, wa)),
        ...emails.map((em) => eq(donatur.email, em)),
      ];

      const existingDonatur = dbConditions.length > 0
        ? await db.select({ id: donatur.id, whatsappNumber: donatur.whatsappNumber, email: donatur.email })
            .from(donatur)
            .where(or(...dbConditions))
        : [];

      const dbByWa = new Map(existingDonatur.map((d) => [d.whatsappNumber, d]));
      const dbByEmail = new Map(existingDonatur.map((d) => [d.email, d]));

      for (const result of validRows) {
        const wa = result.data.whatsappNumber;
        const email = result.data.email;
        if (wa && dbByWa.has(wa)) {
          const existing = dbByWa.get(wa)!;
          result.status = "duplicate";
          result.duplicateType = "whatsapp";
          result.existingId = existing.id;
          result.conflict = detectConflict("whatsapp", result.data, existing, dbByWa, dbByEmail);
        } else if (email && dbByEmail.has(email)) {
          const existing = dbByEmail.get(email)!;
          result.status = "duplicate";
          result.duplicateType = "email";
          result.existingId = existing.id;
          result.conflict = detectConflict("email", result.data, existing, dbByWa, dbByEmail);
        }
      }
    }

    const totalRows = results.length;
    const validCount = results.filter((r) => r.status === "valid").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    const duplicateCount = results.filter((r) => r.status === "duplicate").length;

    return success(c, {
      totalRows,
      validRows: validCount,
      errorRows: errorCount,
      duplicateRows: duplicateCount,
      rows: results,
    });
  }
);

// POST /admin/donatur/import/commit
app.post(
  "/commit",
  requireRole("super_admin", "admin_campaign"),
  async (c) => {
    const db = c.get("db");
    const mode: ImportMode = (c.req.query("mode") as ImportMode) || "skip";

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return error(c, "File wajib diupload", 400);

    // Per-baris keputusan admin untuk conflict field (email/whatsapp) saat mode=update.
    // Key = rowNumber (string), value = "overwrite" | "keep". Tidak ada entry = "keep" (aman, default lama).
    const resolutions = parseResolutions(formData.get("resolutions") as string | null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "csv"].includes(ext)) {
      return error(c, "Format file harus .xlsx atau .csv", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawRows: Record<string, string>[];
    try {
      rawRows = parseSheet(buffer);
    } catch {
      return error(c, "File tidak dapat dibaca.", 400);
    }

    if (rawRows.length === 0) return error(c, "File tidak berisi data", 400);
    if (rawRows.length > 1000) return error(c, "Maksimal 1.000 baris per file", 400);

    // Parse ulang (sama dengan preview)
    const results: RowResult[] = rawRows.map((row, i) =>
      validateAndNormalizeRow(row, i + 2)
    );

    // Dedup dalam file
    const seenWa = new Map<string, number>();
    const seenEmail = new Map<string, number>();
    for (const result of results) {
      if (result.status === "error") continue;
      const wa = result.data.whatsappNumber;
      const email = result.data.email;
      if (wa) {
        if (seenWa.has(wa)) {
          result.status = "error";
          result.errors = [`Nomor WhatsApp duplikat dengan baris ${seenWa.get(wa)} dalam file ini`];
        } else seenWa.set(wa, result.rowNumber);
      }
      if (email) {
        if (seenEmail.has(email)) {
          result.status = "error";
          result.errors = [`Email duplikat dengan baris ${seenEmail.get(email)} dalam file ini`];
        } else seenEmail.set(email, result.rowNumber);
      }
    }

    // Cek duplikat dengan DB
    const validRows = results.filter((r) => r.status === "valid");
    const waNumbers = validRows.map((r) => r.data.whatsappNumber!).filter(Boolean);
    const emails = validRows.map((r) => r.data.email!).filter(Boolean);

    const dbConditions = [
      ...waNumbers.map((wa) => eq(donatur.whatsappNumber, wa)),
      ...emails.map((em) => eq(donatur.email, em)),
    ];

    const existingDonatur = dbConditions.length > 0
      ? await db.select({ id: donatur.id, whatsappNumber: donatur.whatsappNumber, email: donatur.email })
          .from(donatur)
          .where(or(...dbConditions))
      : [];

    const dbByWa = new Map(existingDonatur.map((d) => [d.whatsappNumber, d]));
    const dbByEmail = new Map(existingDonatur.map((d) => [d.email, d]));

    for (const result of validRows) {
      const wa = result.data.whatsappNumber;
      const em = result.data.email;
      if (wa && dbByWa.has(wa)) {
        const existing = dbByWa.get(wa)!;
        result.status = "duplicate";
        result.duplicateType = "whatsapp";
        result.existingId = existing.id;
        result.conflict = detectConflict("whatsapp", result.data, existing, dbByWa, dbByEmail);
      } else if (em && dbByEmail.has(em)) {
        const existing = dbByEmail.get(em)!;
        result.status = "duplicate";
        result.duplicateType = "email";
        result.existingId = existing.id;
        result.conflict = detectConflict("email", result.data, existing, dbByWa, dbByEmail);
      }
    }

    // Eksekusi
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
        if (mode === "skip") {
          skipped++;
          continue;
        }

        // mode === "update": update field yang tidak kosong
        if (mode === "update" && result.existingId) {
          const updateData: Record<string, unknown> = { updatedAt: new Date() };
          const d = result.data;
          if (d.name) updateData.name = d.name;
          if (d.phone) updateData.phone = d.phone;
          if (d.detailAddress) updateData.detailAddress = d.detailAddress;
          if (d.gender) updateData.gender = d.gender;
          if (d.nik) updateData.nik = d.nik;
          if (d.npwp) updateData.npwp = d.npwp;
          if (d.birthPlace) updateData.birthPlace = d.birthPlace;
          if (d.birthDate) updateData.birthDate = d.birthDate;

          // Email/WhatsApp (dedup key) hanya ditimpa kalau admin eksplisit pilih "overwrite"
          // untuk baris ini DAN nilai barunya tidak bentrok dengan donatur lain.
          if (result.conflict && resolutions[String(result.rowNumber)] === "overwrite") {
            if (result.conflict.conflictsWithOtherDonatur) {
              result.status = "error";
              result.errors = [
                `${result.conflict.field === "email" ? "Email" : "WhatsApp"} "${result.conflict.newValue}" sudah dipakai donatur lain, tidak bisa ditimpa`,
              ];
              errors++;
              continue;
            }
            if (result.conflict.field === "email" && d.email) updateData.email = d.email;
            if (result.conflict.field === "whatsapp" && d.whatsappNumber) updateData.whatsappNumber = d.whatsappNumber;
          }

          await db.update(donatur).set(updateData).where(eq(donatur.id, result.existingId));
          updated++;
          continue;
        }

        skipped++;
        continue;
      }

      // status === "valid" → insert baru
      const d = result.data;
      const newId = createId();
      await db.insert(donatur).values({
        id: newId,
        name: d.name!,
        whatsappNumber: d.whatsappNumber,
        email: d.email || `donor-${newId}@temp.local`,
        phone: d.phone || d.whatsappNumber,
        detailAddress: d.detailAddress || null,
        gender: d.gender || null,
        nik: d.nik || null,
        npwp: d.npwp || null,
        birthPlace: d.birthPlace || null,
        birthDate: d.birthDate || null,
        isActive: true,
      });
      imported++;
    }

    return success(c, {
      imported,
      skipped,
      updated,
      errors,
      mode,
    }, `Import selesai: ${imported} ditambahkan, ${skipped} dilewati, ${updated} diperbarui, ${errors} gagal`);
  }
);

export default app;
