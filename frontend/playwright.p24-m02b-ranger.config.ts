import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.P24_E2E_PORT || 5192)
const BASE = process.env.P24_E2E_BASE || `http://127.0.0.1:${PORT}`
const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS =
  process.env.P24_M02B_RANGER_ARTIFACTS ||
  path.resolve(here, '../artifacts/p24-m02b-ranger')

/**
 * P24-M02B-ranger e2e — Winter Walker + Hollow Warden + 2014 regression with md5 sidecars.
 * Run: npx playwright test --config=playwright.p24-m02b-ranger.config.ts
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/p24-m02b-ranger*.spec.ts'],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
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
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})
