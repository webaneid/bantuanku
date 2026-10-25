#!/usr/bin/env node
/**
 * Penjaga warna (arsitektur-color.md): kode web hanya boleh memakai token (primary, secondary/accent, success, warning,
 * danger, info, gray). Palet bawaan Tailwind (amber, emerald, blue, red, ...) tidak mengikuti brand/tema klien.
 * Mode:  (default) gagal bila ada file yang jumlah pemakaiannya NAIK atau file baru memakai palet liar (baseline: scripts/colors-baseline.json)
 *        --update  tulis ulang baseline (jalankan setelah migrasi; jumlah hanya boleh TURUN)
 *        --report  tampilkan jumlah per palet dan per file
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const baselineFile = path.join(root, "scripts/colors-baseline.json");
const PALETTES = "amber|emerald|red|blue|green|yellow|orange|purple|cyan|violet|pink|teal|indigo|sky|rose|lime|fuchsia|slate|zinc|stone|neutral";
const re = new RegExp(`(?<![\\w-])((?:[a-z0-9-]+:)*(?:text|bg|border|ring|ring-offset|from|to|via|fill|stroke|divide|outline|shadow|placeholder|decoration|accent|caret)-(?:${PALETTES})-\\d{2,3}(?:/\\d+)?)`, "g");

const counts = {};
const byPalette = {};
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts|css|scss)$/.test(e.name)) {
      const m = fs.readFileSync(p, "utf8").match(re);
      if (m) {
        counts[path.relative(root, p)] = m.length;
        for (const c of m) {
          const pal = c.match(new RegExp(`-(${PALETTES})-`))[1];
          byPalette[pal] = (byPalette[pal] || 0) + 1;
        }
      }
    }
  }
})(src);

const total = Object.values(counts).reduce((a, b) => a + b, 0);
if (process.argv.includes("--report")) {
  console.log(`Total ${total} pemakaian di ${Object.keys(counts).length} file`);
  console.log(Object.entries(byPalette).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(", "));
  for (const [f, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(4)}  ${f}`);
  process.exit(0);
}
if (process.argv.includes("--update")) {
  fs.writeFileSync(baselineFile, JSON.stringify(Object.fromEntries(Object.entries(counts).sort()), null, 2) + "\n");
  console.log(`Baseline ditulis: ${total} pemakaian di ${Object.keys(counts).length} file`);
  process.exit(0);
}
// Tiga salinan lib/brand.ts (web kanonik, admin, api) harus identik pada bagian BRAND-SHARED
const sharedBlock = (f) => {
  const t = fs.readFileSync(f, "utf8");
  return t.slice(t.indexOf("// BRAND-SHARED-START"), t.indexOf("// BRAND-SHARED-END"));
};
const canonical = sharedBlock(path.join(root, "..", "web/src/lib/brand.ts"));
for (const other of ["admin/src/lib/brand.ts", "api/src/lib/brand.ts"]) {
  const f = path.join(root, "..", other);
  if (fs.existsSync(f) && sharedBlock(f) !== canonical) {
    console.error(`✗ ${other} berbeda dari apps/web/src/lib/brand.ts (bagian BRAND-SHARED harus identik)`);
    process.exit(1);
  }
}
const baseline = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, "utf8")) : {};
const bad = Object.entries(counts).filter(([f, n]) => n > (baseline[f] ?? 0));
if (bad.length) {
  console.error("✗ Warna di luar token (pakai primary/accent/success/warning/danger/info/gray; lihat docs/arsitektur-color.md):");
  for (const [f, n] of bad) console.error(`   ${f}: ${n} (baseline ${baseline[f] ?? 0})`);
  process.exit(1);
}
const baseTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
console.log(`✓ Warna: tidak ada pemakaian palet liar baru (${total} tersisa, baseline ${baseTotal}; target 0)`);
