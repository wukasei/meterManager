import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

const mode = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${mode}` });

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
