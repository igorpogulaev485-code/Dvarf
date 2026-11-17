import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.DICE_E2E_PORT || 5175)
const BASE = process.env.DICE_E2E_BASE || `http://127.0.0.1:${PORT}`

/**
 * DICE-01 e2e — preview route, no API.
 * Run: npm run test:e2e:dice
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/dice-*.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 12_000 },
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
      name: 'mobile-390',
      use: {
        ...devices['Pixel 5'],
        // CSS pixels for comparable before/after md5 (not device pixels).
        deviceScaleFactor: 1,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})
