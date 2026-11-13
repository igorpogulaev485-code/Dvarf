import { CLASSIC_PAGE_WIDTH_PX } from './classicPageSize'

/** Screen-only fit: scale A4 canvas to available viewport width. */
export const CLASSIC_FIT_SCALE_MIN = 0.45
export const CLASSIC_FIT_SCALE_MAX = 1.75

/** Default sheet width used when measuring before layout. */
export const CLASSIC_SHEET_WIDTH_PX = CLASSIC_PAGE_WIDTH_PX

/**
 * Scale factor so an A4 sheet fills `availablePx` without horizontal scroll.
 * Caps keep the preview readable on tiny and ultra-wide windows.
 */
export function classicScreenFitScale(availablePx: number, sheetWidthPx: number): number {
  if (!(availablePx > 0) || !(sheetWidthPx > 0)) return 1
  const raw = availablePx / sheetWidthPx
  return Math.max(CLASSIC_FIT_SCALE_MIN, Math.min(CLASSIC_FIT_SCALE_MAX, raw))
}
