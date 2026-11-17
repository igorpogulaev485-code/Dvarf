import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const PORT = Number(process.env.P24_E2E_PORT || 5186)
const BASE = process.env.P24_E2E_BASE || `http://127.0.0.1:${PORT}`
const ARTIFACTS = '/opt/cursor/artifacts/p24-m02-druid'

/**
 * P24-M02-druid e2e — real 2024 create pipeline (wizard clicked) + sheet + 2014 regression.
 * Run: npm run test:e2e:p24-m02-druid
 * 2014 baselines: P24_M02_DRUID_SHOT_TAG=before|after|main (see p24-m02-druid-regression-2014.spec.ts).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: [
    '**/p24-m02-druid-live.spec.ts',
    '**/p24-m02-druid-fixup1.spec.ts',
    '**/p24-m02-druid-fixup2.spec.ts',
    '**/p24-m02-druid-regression-2014.spec.ts',
    '**/p24-m02-druid-regression-2014-form-active.spec.ts',
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
