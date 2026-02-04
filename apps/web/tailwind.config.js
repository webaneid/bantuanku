/** @type {import('tailwindcss').Config} */
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
        primary: {
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
        },
        // Success (Hijau)
        success: {
          50: '#f3f8e6',
          100: '#dceab3',
          200: '#c5dc80',
          300: '#aece4d',
          400: '#97c01a',
          500: '#678f0c',
          600: '#537309',
          700: '#4a6a09',
          800: '#3e5707',
          900: '#324406',
        },
        // Warning (Emas)
        warning: {
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
        // Danger (Merah)
        danger: {
          50: '#fce8ec',
          100: '#f5bdc7',
          200: '#ee92a2',
          300: '#e7677d',
          400: '#e03c58',
          500: '#8f132f',
          600: '#7a1028',
          700: '#6b0e23',
          800: '#5c0b1e',
          900: '#4d0919',
        },
        // Info (Biru)
        info: {
          50: '#e8f1f5',
          100: '#bdd8e4',
          200: '#92bfd3',
          300: '#67a6c2',
          400: '#3c8db1',
          500: '#296585',
          600: '#225470',
          700: '#1e4b63',
          800: '#1a4256',
          900: '#163949',
        },
        // Accent (sama dengan Warning - Emas)
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
