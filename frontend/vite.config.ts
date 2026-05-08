// vite.config.ts — Vite build tool configuration
// I renamed this from .js to .ts so TypeScript can type-check it too
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // In development, I proxy all /api calls to my local backend
      // so I don't have to hardcode localhost:3001 in every fetch call.
      // In production, VITE_API_URL takes care of this instead.
      '/api': {
        target:      'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});