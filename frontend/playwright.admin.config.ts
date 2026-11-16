import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.ADM_E2E_PORT || 5174)
const BASE = process.env.ADM_E2E_BASE || `http://127.0.0.1:${PORT}`

/**
 * ADM-01 e2e — мок API, без реальных адресов прода.
 * Run: npm run test:e2e:admin
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/admin-adm01.spec.ts', '**/admin-adm02.spec.ts', '**/admin-adm03.spec.ts'],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-1440',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})
