import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const PORT = Number(process.env.P24_E2E_PORT || 5190)
const BASE = process.env.P24_E2E_BASE || `http://127.0.0.1:${PORT}`
const ARTIFACTS = path.resolve(process.cwd(), '../artifacts/p24-m02-artificer')

/**
 * P24-M02-artificer e2e — real 2024 create pipeline (wizard clicked) + sheet + 2014 regression.
 * Run: npm run test:e2e:p24-m02-artificer
 * 2014 baselines: P24_M02_ARTIFICER_SHOT_TAG=before|after|main
 * (see p24-m02-artificer-regression-2014.spec.ts).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: [
    '**/p24-m02-artificer-*.spec.ts',
  ],
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
