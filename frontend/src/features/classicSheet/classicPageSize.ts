/** Classic print canvas — ISO A4 (CL01). */
export const CLASSIC_PAGE_WIDTH_MM = 210
export const CLASSIC_PAGE_HEIGHT_MM = 297
export const CLASSIC_PAGE_WIDTH_IN = CLASSIC_PAGE_WIDTH_MM / 25.4
export const CLASSIC_PAGE_HEIGHT_IN = CLASSIC_PAGE_HEIGHT_MM / 25.4

/** Approx CSS px at 96dpi for fit-scale math. */
export const CLASSIC_PAGE_WIDTH_PX = Math.round(CLASSIC_PAGE_WIDTH_IN * 96)
export const CLASSIC_PAGE_HEIGHT_PX = Math.round(CLASSIC_PAGE_HEIGHT_IN * 96)

export const CLASSIC_PAGE_SIZE_CSS = `${CLASSIC_PAGE_WIDTH_MM}mm`
export const CLASSIC_PAGE_HEIGHT_CSS = `${CLASSIC_PAGE_HEIGHT_MM}mm`
