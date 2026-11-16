/**
 * Reusable Playwright device presets for Samsung Galaxy Z Fold7.
 *
 * Cover (closed): 412×960 CSS px
 * Open (unfolded portrait): 750×832 CSS px — near-square
 * Open landscape: 832×750 CSS px
 * DPR: 2.625
 *
 * Import into any playwright.*.config.ts:
 *   import { fold7Cover, fold7Open, fold7OpenLandscape, fold7Projects } from './e2e/devices/fold7'
 */

export type Fold7Device = {
  userAgent: string
  viewport: { width: number; height: number }
  deviceScaleFactor: number
  isMobile: boolean
  hasTouch: boolean
  defaultBrowserType: 'chromium'
}

const FOLD7_DPR = 2.625
const FOLD7_UA =
  'Mozilla/5.0 (Linux; Android 15; SM-F966B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'

/** Closed cover screen — tall phone. */
export const fold7Cover: Fold7Device = {
  userAgent: FOLD7_UA,
  viewport: { width: 412, height: 960 },
  deviceScaleFactor: FOLD7_DPR,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium',
}

/** Unfolded inner screen — portrait, near-square. */
export const fold7Open: Fold7Device = {
  userAgent: FOLD7_UA,
  viewport: { width: 750, height: 832 },
  deviceScaleFactor: FOLD7_DPR,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium',
}

/** Unfolded inner screen — landscape. */
export const fold7OpenLandscape: Fold7Device = {
  userAgent: FOLD7_UA,
  viewport: { width: 832, height: 750 },
  deviceScaleFactor: FOLD7_DPR,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium',
}

/** Named project snippets for playwright configs. */
export const fold7Projects: ReadonlyArray<{ name: string; use: Fold7Device }> = [
  { name: 'fold7-cover', use: fold7Cover },
  { name: 'fold7-open', use: fold7Open },
  { name: 'fold7-open-landscape', use: fold7OpenLandscape },
]
