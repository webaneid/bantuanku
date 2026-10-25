/** @type {import('tailwindcss').Config} */
// Warna brand dibaca dari CSS variable `--color-*` ("r g b") yang disuntik root layout dari settings (src/lib/brand.ts, ADR-0015).
// Nilai bawaan (tenant pertama) ada di src/lib/brand.ts; di sini hanya pemetaan nama -> variable.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const brandVar = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;
const brandScale = (name) => Object.fromEntries(SHADES.map((s) => [s, brandVar(`${name}-${s}`)]));
const primary = brandScale('primary');
const secondary = brandScale('secondary');

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary (Hijau Darunnajah)
        primary,
        // Success = primary (ADR-0015)
        success: primary,
        // === Token brand (ADR-0015): 4 warna yang ditentukan klien — primary, secondary, light, dark ===
        // Nilai di bawah = brand tenant saat ini; nantinya dibaca dari settings (CSS variable)
        light: brandVar('light'), // terang: latar halaman/permukaan
        dark: brandVar('dark'), // gelap: teks utama/permukaan gelap
        secondary,
        // Alias lama `accent` = secondary (dipertahankan untuk kode yang sudah ada)
        accent: secondary,
        // === Token semantik (ADR-0015): TIDAK mengikuti brand ===
        // Success = primary (alias), diisi dari skala primary di bawah lewat tailwind.config
        // Warning/Danger/Info = palet bawaan Tailwind (amber/red/blue) agar maknanya sama di semua tema
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        arabic: ['var(--font-scheherazade)', 'Scheherazade New', 'Traditional Arabic', 'serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'Courier New', 'monospace'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
