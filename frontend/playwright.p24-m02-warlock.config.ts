import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.P24_E2E_PORT || 5184)
const BASE = process.env.P24_E2E_BASE || `http://127.0.0.1:${PORT}`
const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-warlock'

/**
 * P24-M02-warlock e2e — real 2024 create pipeline + sheet + 2014 regression.
 * Run: npm run test:e2e:p24-m02-warlock
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/p24-m02-warlock.spec.ts', '**/p24-m02-warlock-live.spec.ts'],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  outputDir: path.join(ARTIFACTS, 'test-results'),
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
    {
      name: 'phone-390',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
})
