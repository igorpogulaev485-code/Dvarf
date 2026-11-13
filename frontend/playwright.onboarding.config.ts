import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.ONB_E2E_PORT || 5173)
const BASE = process.env.ONB_E2E_BASE || `http://127.0.0.1:${PORT}`

/**
 * Thin ONB-01 e2e contour — preview route only, no API.
 * Run: npm run test:e2e:onboarding
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/onboarding-display.spec.ts',
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
    {
      name: 'mobile-390',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})
