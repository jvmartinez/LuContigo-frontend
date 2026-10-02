import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        // El panel de administración (Recharts) no debe pesar en la carga de la agenda.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          datos: ['@tanstack/react-query', 'ky', 'zod', 'date-fns', 'date-fns-tz'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Las pruebas de pantalla montan la app completa y cargan cada ruta de forma perezosa.
    testTimeout: 20_000,
    env: {
      VITE_API_URL: 'http://api.test/api/v1',
      VITE_APP_NOMBRE: 'MediCita',
    },
    css: false,
  },
});
