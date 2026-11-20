/**
 * Доправка 1 evidence shots: viewport only (1440×900 / 390×844), element in frame,
 * header shots from scrollTop=0, no toast overlay, never fullPage.
 */
import { expect, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { ARTIFACTS, scrollTop } from './druidLiveFlow'

export const FIXUP1_DIR = path.join(ARTIFACTS, 'fixup1')

const SIZES: Record<string, { width: number; height: number }> = {
  '1440': { width: 1440, height: 900 },
  '390': { width: 390, height: 844 },
}

export function ensureFixup1Dir(dir = FIXUP1_DIR) {
  fs.mkdirSync(dir, { recursive: true })
}

export async function waitNoToast(page: Page) {
  await expect(page.locator('.ui-toast')).toHaveCount(0, { timeout: 20_000 })
}

export type FixupShotOpts = {
  /** Elements that must sit fully inside the viewport (scrolled into view first). */
  frame?: Locator | Locator[]
  /** Header shot: scroll everything to top before capture. */
  top?: boolean
  dir?: string
}

/** Fixed bottom scene nav on phone (390): content under it does not count as «in frame». */
const PHONE_BOTTOM_NAV_PX = 70

export async function expectInFrame(page: Page, target: Locator, label: string) {
  const size = page.viewportSize()!
  const isDialog = (await target.first().getAttribute('role').catch(() => null)) === 'dialog'
  if (!isDialog) {
    await target.first().evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }))
  }
  await page.waitForTimeout(200)
  const box = await target.first().boundingBox()
  expect(box, `${label}: no box`).not.toBeNull()
  const b = box!
  const bottomLimit =
    size.width <= 480 && !isDialog ? size.height - PHONE_BOTTOM_NAV_PX : size.height
  expect(b.x, `${label}: left edge`).toBeGreaterThanOrEqual(-1)
  expect(b.y, `${label}: top edge`).toBeGreaterThanOrEqual(-1)
  expect(b.x + b.width, `${label}: right edge`).toBeLessThanOrEqual(size.width + 1)
  expect(b.y + b.height, `${label}: bottom edge (limit ${bottomLimit})`).toBeLessThanOrEqual(
    bottomLimit + 1,
  )
}

export async function fshot(page: Page, name: string, project: string, opts: FixupShotOpts = {}) {
  const dir = opts.dir ?? FIXUP1_DIR
  ensureFixup1Dir(dir)
  const want = SIZES[project]!
  const size = page.viewportSize()!
  expect(size, 'viewport must be exactly the evidence size').toEqual(want)
  await page.mouse.move(2, 2)
  await waitNoToast(page)
  if (opts.top) await scrollTop(page)
  const frames = Array.isArray(opts.frame) ? opts.frame : opts.frame ? [opts.frame] : []
  for (const [i, loc] of frames.entries()) await expectInFrame(page, loc, `${name}#${i}`)
  if (opts.top) {
    const y = await page.evaluate(() => window.scrollY)
    expect(y, 'header shot needs scrollTop=0').toBe(0)
  }
  await page.waitForTimeout(350)
  await waitNoToast(page)
  await page.screenshot({
    path: path.join(dir, `${name}-${project}.png`),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  })
}
