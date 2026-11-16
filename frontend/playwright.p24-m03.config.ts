import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fold7Projects } from './e2e/devices/fold7'

const PORT = Number(process.env.P24_E2E_PORT || 5178)
const BASE = process.env.P24_E2E_BASE || `http://127.0.0.1:${PORT}`
const here = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = path.resolve(here, '../artifacts/p24-m03')

/**
 * P24-M03 e2e — 2024 create wizard.
 * Devices: desktop-1440, phone-390, fold7-cover (412×960), fold7-open (750×832),
 * fold7-open-landscape (832×750). DPR 2.625 on Fold7.
 * Run: npm run test:e2e:p24-m03
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/p24-m03-*.spec.ts',
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
    ...fold7Projects.map((p) => ({ name: p.name, use: { ...p.use } })),
  ],
})
