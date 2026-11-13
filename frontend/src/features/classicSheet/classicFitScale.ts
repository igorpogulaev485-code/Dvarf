/** Screen-only fit: scale Letter canvas to available viewport width. */
export const CLASSIC_FIT_SCALE_MIN = 0.45
export const CLASSIC_FIT_SCALE_MAX = 1.75

/**
 * Scale factor so an 8.5in sheet fills `availablePx` without horizontal scroll.
 * Caps keep the preview readable on tiny and ultra-wide windows.
 */
export function classicScreenFitScale(availablePx: number, sheetWidthPx: number): number {
  if (!(availablePx > 0) || !(sheetWidthPx > 0)) return 1
  const raw = availablePx / sheetWidthPx
  return Math.max(CLASSIC_FIT_SCALE_MIN, Math.min(CLASSIC_FIT_SCALE_MAX, raw))
}
