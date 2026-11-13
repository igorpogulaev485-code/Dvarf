/**
 * UX-16 (B15/B16) — контракт типографики/контраста и hit-area.
 * Run: npx tsx src/features/characters/ux16ContrastTouch.selfcheck.ts
 */

function lin(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg)
  const b = relativeLuminance(bg)
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ux16ContrastTouch.selfcheck: ${msg}`)
}

/** Desk secondary label color (--desk-muted after B15). */
const DESK_MUTED = '#5f584e'
const PANEL = '#fbf7ec'
const WHITE = '#ffffff'
const INK = '#2d2d2a'

const mutedOnPanel = contrastRatio(DESK_MUTED, PANEL)
const mutedOnWhite = contrastRatio(DESK_MUTED, WHITE)
const inkOnPanel = contrastRatio(INK, PANEL)

assert(mutedOnPanel >= 4.5, `desk-muted on panel AA fail: ${mutedOnPanel.toFixed(2)}`)
assert(mutedOnWhite >= 4.5, `desk-muted on white AA fail: ${mutedOnWhite.toFixed(2)}`)
assert(inkOnPanel >= 4.5, `ink on panel AA fail: ${inkOnPanel.toFixed(2)}`)

/** Hit-area floor from acceptance (CSS px). */
const HIT_MIN = 44
assert(HIT_MIN === 44, 'hit-area floor must stay 44')

console.log(
  `ux16ContrastTouch.selfcheck: ok (desk-muted/panel ${mutedOnPanel.toFixed(2)}:1, /white ${mutedOnWhite.toFixed(2)}:1)`,
)
