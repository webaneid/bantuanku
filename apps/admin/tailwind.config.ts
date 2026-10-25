import type { Config } from "tailwindcss";

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const brandVar = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;
const brandScale = (name: string) => Object.fromEntries(SHADES.map((s) => [s, brandVar(`${name}-${s}`)]));
const primary = brandScale("primary");
const secondary = brandScale("secondary");

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // === Token brand (ADR-0015): dibaca dari CSS variable yang disuntik root layout dari settings (src/lib/brand.ts) ===
        primary,
        secondary,
        accent: secondary, // alias lama
        light: brandVar("light"),
        dark: brandVar("dark"),
        // === Semantik: success = primary; warning/danger/info = palet bawaan Tailwind (tidak mengikuti brand) ===
        success: primary,
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
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, rgb(var(--color-secondary-500)) 0%, rgb(var(--color-secondary-600)) 100%)',
        'gradient-green': 'linear-gradient(135deg, rgb(var(--color-primary-400)) 0%, rgb(var(--color-primary-500)) 100%)',
        'gradient-blue': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
