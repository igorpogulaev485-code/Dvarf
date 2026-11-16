import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.ADM_E2E_PORT || 5175)
const BASE = process.env.ADM_E2E_BASE || `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    '**/admin-adm01-screenshots.spec.ts',
    '**/admin-adm02-screenshots.spec.ts',
    '**/admin-adm03-screenshots.spec.ts',
    '**/admin-adm04-screenshots.spec.ts',
    '**/admin-adm05-screenshots.spec.ts',
  ],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: BASE,
    trace: 'off',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'shots',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
