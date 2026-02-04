import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // PRIMARY: Hijau Darunnajah
        primary: {
          50: '#e6f2f1',
          100: '#cce3e1',  // Hijau light
          200: '#99c7c3',
          300: '#66aba5',
          400: '#338f87',
          500: '#035a52',  // Base hijau
          600: '#025850',  // Hijau 2
          700: '#024842',
          800: '#023834',
          900: '#012826',
        },
        // SECONDARY/ACCENT: Emas
        secondary: {
          50: '#faf7f0',
          100: '#dccfb4',  // Emas light
          200: '#d9c49a',
          300: '#d6b980',
          400: '#d4af6b',
          500: '#d2aa55',  // Base emas
          600: '#a88843',  // Emas 2
          700: '#8a6f37',
          800: '#6c562b',
          900: '#4e3d1f',
        },
        // Keep secondary same as accent for backward compatibility
        accent: {
          50: '#faf7f0',
          100: '#dccfb4',
          200: '#d9c49a',
          300: '#d6b980',
          400: '#d4af6b',
          500: '#d2aa55',
          600: '#a88843',
          700: '#8a6f37',
          800: '#6c562b',
          900: '#4e3d1f',
        },
        // SUCCESS: Aksen hijau
        success: {
          50: '#f3f7e8',
          100: '#e6efd1',
          200: '#cddfa3',
          300: '#b4cf75',
          400: '#9bbf47',
          500: '#678f0c',  // Aksen sukses
          600: '#52720a',
          700: '#3e5508',
          800: '#293805',
          900: '#151c03',
        },
        // DANGER: Merah
        danger: {
          50: '#fceaed',
          100: '#f9d5db',
          200: '#f3abb7',
          300: '#ed8193',
          400: '#e7576f',
          500: '#8f132f',  // Danger red
          600: '#720f26',
          700: '#560b1c',
          800: '#390813',
          900: '#1d0409',
        },
        // WARNING: Emas (same as secondary)
        warning: {
          50: '#faf7f0',
          100: '#dccfb4',
          200: '#d9c49a',
          300: '#d6b980',
          400: '#d4af6b',
          500: '#d2aa55',
          600: '#a88843',
          700: '#8a6f37',
          800: '#6c562b',
          900: '#4e3d1f',
        },
        // INFO: Biru tua
        info: {
          50: '#e9f1f5',
          100: '#d3e3eb',
          200: '#a7c7d7',
          300: '#7babc3',
          400: '#4f8faf',
          500: '#296585',  // Biru tua
          600: '#21516a',
          700: '#193d50',
          800: '#102835',
          900: '#08141b',
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
        'gradient-gold': 'linear-gradient(135deg, #d2aa55 0%, #a88843 100%)',
        'gradient-green': 'linear-gradient(135deg, #02756b 0%, #035a52 100%)',
        'gradient-blue': 'linear-gradient(135deg, #296585 0%, #21516a 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
