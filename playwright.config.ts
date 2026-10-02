import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra la API real con el seed de desarrollo (FRONTEND.md §9). Antes de correrlas:
 * levanta LuContigo-backend (`npm run dev`, con `prisma db seed`). La web se levanta sola.
 */
const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: WEB_URL,
    locale: 'es-CO',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'tableta', use: { ...devices['Galaxy Tab S4'] }, grep: /@tableta/ },
  ],
  webServer: {
    command: 'npm run dev',
    url: WEB_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
