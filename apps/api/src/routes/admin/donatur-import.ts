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

interface RowResult {
  rowNumber: number;
  status: "valid" | "error" | "duplicate";
  duplicateType?: "whatsapp" | "email" | "in_file";
  existingId?: string;
  data: Partial<ParsedRow>;
  errors?: string[];
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

  // Alamat lengkap (opsional)
  const addr = String(raw["Alamat Lengkap"] || "").trim();
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

  // NIK (opsional)
  const nik = String(raw["NIK"] || "").trim().replace(/\s/g, "");
  if (nik) {
    if (!/^\d{16}$/.test(nik)) {
      errors.push("NIK harus 16 digit angka");
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

  // Tanggal lahir (opsional)
  const birthDateRaw = String(raw["Tanggal Lahir"] || "").trim();
  if (birthDateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw)) {
      errors.push('Format tanggal lahir harus YYYY-MM-DD (contoh: "1990-05-20")');
    } else {
      data.birthDate = birthDateRaw;
    }
  }

  return {
    rowNumber,
    status: errors.length > 0 ? "error" : "valid",
    data,
    errors: errors.length > 0 ? errors : undefined,
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

      const dbWaMap = new Map(existingDonatur.map((d) => [d.whatsappNumber, d.id]));
      const dbEmailMap = new Map(existingDonatur.map((d) => [d.email, d.id]));

      for (const result of validRows) {
        const wa = result.data.whatsappNumber;
        const email = result.data.email;
        if (wa && dbWaMap.has(wa)) {
          result.status = "duplicate";
          result.duplicateType = "whatsapp";
          result.existingId = dbWaMap.get(wa);
        } else if (email && dbEmailMap.has(email)) {
          result.status = "duplicate";
          result.duplicateType = "email";
          result.existingId = dbEmailMap.get(email);
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

    const dbWaMap = new Map(existingDonatur.map((d) => [d.whatsappNumber, d.id]));
    const dbEmailMap = new Map(existingDonatur.map((d) => [d.email, d.id]));

    for (const result of validRows) {
      const wa = result.data.whatsappNumber;
      const em = result.data.email;
      if (wa && dbWaMap.has(wa)) {
        result.status = "duplicate";
        result.duplicateType = "whatsapp";
        result.existingId = dbWaMap.get(wa);
      } else if (em && dbEmailMap.has(em)) {
        result.status = "duplicate";
        result.duplicateType = "email";
        result.existingId = dbEmailMap.get(em);
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
