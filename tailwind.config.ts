import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        panel: '#111827',
        panelSoft: '#1f2937',
        accent: '#10a37f',
        accentSoft: '#a7f3d0',
        textSoft: '#d1d5db'
      },
      boxShadow: {
        glow: '0 10px 30px rgba(16, 163, 127, 0.25)'
      }
    }
  },
  plugins: []
};

export default config;
