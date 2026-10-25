#!/usr/bin/env node
/**
 * Pemeriksa i18n (ADR-0014): (1) paritas key id vs en per namespace, (2) setiap namespace yang dipakai komponen klien
 * pada suatu halaman harus termasuk BASE_NAMESPACES atau diumumkan lewat <I18nNamespaces names={[...]}> di
 * layout.tsx/page.tsx rantai halaman itu. Jalankan: `npm run check:i18n` (exit 1 bila ada pelanggaran).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const localesDir = path.join(src, "lib/i18n/locales");
const verbose = process.argv.includes("--verbose");

const namespaces = fs.readdirSync(path.join(localesDir, "id")).filter((f) => f.endsWith(".ts") && f !== "index.ts").map((f) => f.slice(0, -3));

// ---- 1. paritas id vs en
function flatten(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, p, out); else out.add(p);
  }
  return out;
}
const { idMessages } = await import(path.join(localesDir, "id/index.ts"));
const { enMessages } = await import(path.join(localesDir, "en/index.ts"));
const idKeys = flatten(idMessages), enKeys = flatten(enMessages);
const missingEn = [...idKeys].filter((k) => !enKeys.has(k));
const missingId = [...enKeys].filter((k) => !idKeys.has(k));
let failed = false;
if (missingEn.length || missingId.length) {
  failed = true;
  console.error(`✗ Paritas: ${missingEn.length} key ada di id tapi tidak di en, ${missingId.length} sebaliknya`);
  for (const k of missingEn.slice(0, 20)) console.error(`   en kurang: ${k}`);
  for (const k of missingId.slice(0, 20)) console.error(`   id kurang: ${k}`);
} else console.log(`✓ Paritas id/en: ${idKeys.size} key`);

// ---- 2. graf impor
const nsPattern = new RegExp("[\"'`](" + namespaces.join("|") + ")\\.[A-Za-z0-9_.$]*", "g");
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
})(src);

const text = new Map(files.map((f) => [f, fs.readFileSync(f, "utf8")]));
function resolveImport(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(src, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const c of [base, base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (text.has(c)) return c;
  }
  return null;
}
const edges = new Map();
for (const [f, t] of text) {
  const set = new Set();
  for (const m of t.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)) {
    const r = resolveImport(f, m[1]);
    if (r) set.add(r);
  }
  edges.set(f, set);
}

// namespace yang dipakai komponen KLIEN (useI18n); file server memakai translate() penuh dan tidak dihitung
const used = new Map();
for (const [f, t] of text) {
  if (f.startsWith(path.join(src, "lib/i18n"))) continue;
  if (!/\buseI18n\b/.test(t)) continue;
  const s = new Set();
  for (const m of t.matchAll(nsPattern)) s.add(m[1]);
  if (s.size) used.set(f, s);
}

const baseSrc = fs.readFileSync(path.join(src, "lib/i18n/namespaces.ts"), "utf8");
const base = new Set([...baseSrc.matchAll(/["'](\w+)["']/g)].map((m) => m[1]).filter((n) => namespaces.includes(n)));

function declared(file) {
  const t = text.get(file);
  const s = new Set();
  if (!t) return s;
  for (const m of t.matchAll(/<I18nNamespaces\s+names=\{\[([^\]]*)\]\}/g)) {
    for (const n of m[1].matchAll(/["'](\w+)["']/g)) s.add(n[1]);
  }
  return s;
}
const appDir = path.join(src, "app");
const pages = files.filter((f) => path.basename(f) === "page.tsx" && f.startsWith(appDir));
const rootLayout = path.join(appDir, "layout.tsx");
let violations = 0;

for (const page of pages) {
  const chain = [];
  for (let d = path.dirname(page); d.startsWith(appDir); d = path.dirname(d)) {
    const l = path.join(d, "layout.tsx");
    if (text.has(l)) chain.push(l);
  }
  const ok = new Set(base);
  for (const f of [page, ...chain]) for (const n of declared(f)) ok.add(n);
  // closure dari halaman + semua layout rantainya
  const seen = new Set();
  const stack = [page, ...chain];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const n of edges.get(f) || []) stack.push(n);
  }
  const need = new Map();
  for (const f of seen) for (const n of used.get(f) || []) {
    if (!need.has(n)) need.set(n, []);
    need.get(n).push(path.relative(src, f));
  }
  const missing = [...need.keys()].filter((n) => !ok.has(n));
  const route = "/" + path.relative(appDir, path.dirname(page));
  if (missing.length) {
    violations++;
    failed = true;
    console.error(`✗ ${route}: namespace belum diumumkan: ${missing.join(", ")}`);
    for (const n of missing) console.error(`     ${n} ← ${need.get(n).slice(0, 3).join(", ")}`);
  } else if (verbose) console.log(`✓ ${route}: ${[...need.keys()].join(", ") || "-"}`);
}
console.log(violations ? `✗ ${violations} halaman bermasalah dari ${pages.length}` : `✓ Namespace: ${pages.length} halaman lengkap`);
process.exit(failed ? 1 : 0);
