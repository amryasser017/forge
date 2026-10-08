import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#F28C28',
          sky: '#83D3F5',
          green: '#8DDE75',
          navy: '#172B4D',
          gray: '#F5F7FA',
        },
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: { card: '0 1px 2px rgba(23,43,77,.06), 0 4px 14px rgba(23,43,77,.05)' },
    },
  },
  plugins: [],
};
export default config;
