/**
 * Доправка 2 evidence shots: viewport only (1440×900 / 390×844), element in frame,
 * no toast overlay, never fullPage.
 */
import { expect, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { ARTIFACTS, scrollTop } from './druidLiveFlow'
import { expectInFrame, waitNoToast } from './fixup1Shots'

export const FIXUP2_DIR = path.join(ARTIFACTS, 'fixup2')

const SIZES: Record<string, { width: number; height: number }> = {
  '1440': { width: 1440, height: 900 },
  '390': { width: 390, height: 844 },
}

export function ensureFixup2Dir(dir = FIXUP2_DIR) {
  fs.mkdirSync(dir, { recursive: true })
}

export type FixupShotOpts = {
  frame?: Locator | Locator[]
  top?: boolean
  dir?: string
}

export async function fshot2(page: Page, name: string, project: string, opts: FixupShotOpts = {}) {
  const dir = opts.dir ?? FIXUP2_DIR
  ensureFixup2Dir(dir)
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
