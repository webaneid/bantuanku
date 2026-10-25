/** @type {import('tailwindcss').Config} */
const primary = {
  50: '#e6f4f3',
  100: '#b3e0dc',
  200: '#80ccc5',
  300: '#4db8ae',
  400: '#1aa497',
  500: '#035a52',
  600: '#024741',
  700: '#023831',
  800: '#012920',
  900: '#011a17',
};

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
        light: '#f9fafb', // terang: latar halaman/permukaan
        dark: '#111827', // gelap: teks utama/permukaan gelap
        secondary: {
          50: '#fdf8ed',
          100: '#f7eacc',
          200: '#f1dcab',
          300: '#ebce8a',
          400: '#e5c069',
          500: '#d2aa55',
          600: '#b8964b',
          700: '#9e7f3f',
          800: '#846833',
          900: '#6a5127',
        },
        // Alias lama `accent` = secondary (dipertahankan untuk kode yang sudah ada)
        accent: {
          50: '#fdf8ed',
          100: '#f7eacc',
          200: '#f1dcab',
          300: '#ebce8a',
          400: '#e5c069',
          500: '#d2aa55',
          600: '#b8964b',
          700: '#9e7f3f',
          800: '#846833',
          900: '#6a5127',
        },
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
