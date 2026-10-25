// BRAND-SHARED-START (salinan identik di apps/admin/src/lib/brand.ts; dijaga `npm run check:colors` — ubah KEDUANYA)
/**
 * Warna brand (ADR-0015): empat warna yang ditentukan klien — primary, secondary, light, dark — disimpan sebagai
 * settings `brand_color_*` (hex #rrggbb). Skala 50–900 untuk primary/secondary diturunkan dari satu warna dasar;
 * bila warna sama dengan bawaan tenant pertama, dipakai skala bawaan persis (tampilan tidak berubah).
 */
export type BrandKey = 'primary' | 'secondary' | 'light' | 'dark';
export type Brand = Record<BrandKey, string>;
export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type Scale = Record<(typeof SHADES)[number], string>;

export const BRAND_SETTING_KEYS: Record<BrandKey, string> = {
  primary: 'brand_color_primary',
  secondary: 'brand_color_secondary',
  light: 'brand_color_light',
  dark: 'brand_color_dark',
};

export const DEFAULT_BRAND: Brand = { primary: '#035a52', secondary: '#d2aa55', light: '#f9fafb', dark: '#111827' };

const DEFAULT_SCALES: Record<'primary' | 'secondary', Scale> = {
  primary: {
    50: '#e6f4f3', 100: '#b3e0dc', 200: '#80ccc5', 300: '#4db8ae', 400: '#1aa497',
    500: '#035a52', 600: '#024741', 700: '#023831', 800: '#012920', 900: '#011a17',
  },
  secondary: {
    50: '#fdf8ed', 100: '#f7eacc', 200: '#f1dcab', 300: '#ebce8a', 400: '#e5c069',
    500: '#d2aa55', 600: '#b8964b', 700: '#9e7f3f', 800: '#846833', 900: '#6a5127',
  },
};

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHexColor = (v: unknown): v is string => typeof v === 'string' && HEX.test(v.trim());

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.trim().slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = ([r, g, b]: number[]) =>
  '#' + [r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('');
const mix = (a: number[], b: number[], t: number) => a.map((x, i) => x + (b[i] - x) * t);

/** Skala 50–900: 500 = warna dasar; lebih terang = campur putih, lebih gelap = campur hitam. */
export function deriveScale(baseHex: string): Scale {
  const base = toRgb(baseHex);
  const white = [255, 255, 255];
  const black = [0, 0, 0];
  const light = { 50: 0.92, 100: 0.8, 200: 0.62, 300: 0.42, 400: 0.2 } as const;
  const dark = { 600: 0.2, 700: 0.38, 800: 0.55, 900: 0.71 } as const;
  return {
    50: toHex(mix(base, white, light[50])),
    100: toHex(mix(base, white, light[100])),
    200: toHex(mix(base, white, light[200])),
    300: toHex(mix(base, white, light[300])),
    400: toHex(mix(base, white, light[400])),
    500: toHex(base),
    600: toHex(mix(base, black, dark[600])),
    700: toHex(mix(base, black, dark[700])),
    800: toHex(mix(base, black, dark[800])),
    900: toHex(mix(base, black, dark[900])),
  };
}

/** Brand dari settings; nilai tak valid/kosong → bawaan (juga menjaga CSS tidak bisa disisipi). */
export function resolveBrand(settings: Record<string, any> | null | undefined): Brand {
  const out = { ...DEFAULT_BRAND };
  for (const key of Object.keys(BRAND_SETTING_KEYS) as BrandKey[]) {
    const v = settings?.[BRAND_SETTING_KEYS[key]];
    if (isHexColor(v)) out[key] = v.trim().toLowerCase();
  }
  return out;
}

export function scaleFor(key: 'primary' | 'secondary', brand: Brand): Scale {
  return brand[key] === DEFAULT_BRAND[key] ? DEFAULT_SCALES[key] : deriveScale(brand[key]);
}

const channels = (hex: string) => toRgb(hex).join(' ');

/** Isi `<style>:root{...}</style>`: variabel `--color-*` berisi "r g b" (dipakai Tailwind `rgb(var(--x) / alpha)`). */
export function brandCss(brand: Brand): string {
  const vars: string[] = [];
  for (const key of ['primary', 'secondary'] as const) {
    const scale = scaleFor(key, brand);
    for (const s of SHADES) vars.push(`--color-${key}-${s}:${channels(scale[s])}`);
  }
  vars.push(`--color-light:${channels(brand.light)}`, `--color-dark:${channels(brand.dark)}`);
  return `:root{${vars.join(';')}}`;
}

/** Rasio kontras WCAG (1–21) antara dua warna hex. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = toRgb(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
export interface BrandContrast {
  errors: string[];
  warnings: string[];
}

/**
 * Keterbacaan warna brand (WCAG): di bawah 3:1 = DITOLAK (tombol/teks tak terbaca); 3–4,5 = peringatan.
 * Dipakai API (menolak simpan) dan halaman admin (menonaktifkan simpan + peringatan).
 */
export function brandContrast(brand: Brand): BrandContrast {
  const errors: string[] = [];
  const warnings: string[] = [];
  const check = (ratio: number, bad: string, warn: string) => {
    if (ratio < 3) errors.push(bad);
    else if (ratio < 4.5) warnings.push(warn);
  };
  check(
    contrastRatio('#ffffff', brand.primary),
    'Warna Primary terlalu terang: teks putih pada tombol utama tidak terbaca. Pilih warna yang lebih gelap.',
    'Teks putih pada tombol utama kurang jelas (di bawah standar kontras 4,5:1). Pertimbangkan Primary yang lebih gelap.'
  );
  check(
    contrastRatio(brand.dark, brand.light),
    'Warna Gelap dan Warna Terang terlalu mirip: teks utama tidak terbaca.',
    'Kontras Warna Gelap terhadap Warna Terang rendah: teks utama kurang jelas.'
  );
  check(
    contrastRatio(brand.dark, '#ffffff'),
    'Warna Gelap terlalu terang untuk teks pada latar putih.',
    'Warna Gelap kurang gelap untuk teks pada latar putih.'
  );
  return { errors, warnings };
}
// BRAND-SHARED-END
