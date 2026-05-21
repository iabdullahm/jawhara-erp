import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'Cairo', 'system-ui', 'sans-serif'],
      },
      colors: {
        gold: {
          50: '#fdf8ed',
          100: '#fbecca',
          200: '#f6d791',
          300: '#f1bc58',
          400: '#eda232',
          500: '#d2841a',
          600: '#a76313',
          700: '#854a13',
          800: '#6f3c16',
          900: '#5d3216',
        },
        primary: {
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
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
