import { asRecord, readNumber } from '../characters/sheetTypes'
import type { CharacterDetail } from '../../shared/api/characters'
import { cloneSheet, type ClassicPatch } from './fromApi'

/** Font family presets for classic text blocks (LSS-style per-panel). */
export type ClassicBlockFontFamily = 'ui' | 'serif' | 'script' | 'mono'

export type ClassicBlockFont = {
  family: ClassicBlockFontFamily
  /** Point size for print/screen text, clamped 5–12. */
  size: number
}

export const CLASSIC_BLOCK_FONT_FAMILIES: Array<{
  id: ClassicBlockFontFamily
  label: string
}> = [
  { id: 'ui', label: 'Без засечек' },
  { id: 'serif', label: 'С засечками' },
  { id: 'script', label: 'Рукопись' },
  { id: 'mono', label: 'Моно' },
]

export const CLASSIC_BLOCK_FONT_MIN = 5
export const CLASSIC_BLOCK_FONT_MAX = 12
export const CLASSIC_BLOCK_FONT_DEFAULT: ClassicBlockFont = { family: 'ui', size: 8 }

export const CLASSIC_BLOCK_FONT_SIZES: number[] = Array.from(
  { length: CLASSIC_BLOCK_FONT_MAX - CLASSIC_BLOCK_FONT_MIN + 1 },
  (_, i) => CLASSIC_BLOCK_FONT_MIN + i,
)

export function clampClassicFontSize(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : readNumber(raw, CLASSIC_BLOCK_FONT_DEFAULT.size)
  return Math.max(
    CLASSIC_BLOCK_FONT_MIN,
    Math.min(CLASSIC_BLOCK_FONT_MAX, Math.round(n)),
  )
}

function normalizeFamily(raw: unknown): ClassicBlockFontFamily {
  if (raw === 'serif' || raw === 'script' || raw === 'mono' || raw === 'ui') return raw
  return CLASSIC_BLOCK_FONT_DEFAULT.family
}

export function readClassicBlockFonts(
  sheet: Record<string, unknown> | CharacterDetail,
): Record<string, ClassicBlockFont> {
  const root = 'sheet' in sheet ? asRecord(sheet.sheet) : asRecord(sheet)
  const ui = asRecord(root.ui)
  const raw = asRecord(ui.classic_block_fonts)
  const out: Record<string, ClassicBlockFont> = {}
  for (const [key, value] of Object.entries(raw)) {
    const row = asRecord(value)
    out[key] = {
      family: normalizeFamily(row.family),
      size: clampClassicFontSize(row.size),
    }
  }
  return out
}

export function readClassicBlockFont(
  sheet: Record<string, unknown> | CharacterDetail,
  blockId: string,
): ClassicBlockFont {
  return readClassicBlockFonts(sheet)[blockId] ?? { ...CLASSIC_BLOCK_FONT_DEFAULT }
}

export function setClassicBlockFont(
  character: CharacterDetail,
  blockId: string,
  next: Partial<ClassicBlockFont>,
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const ui = asRecord(sheet.ui)
  const fonts = asRecord(ui.classic_block_fonts)
  const current = readClassicBlockFont(character, blockId)
  fonts[blockId] = {
    family: next.family ? normalizeFamily(next.family) : current.family,
    size: next.size != null ? clampClassicFontSize(next.size) : current.size,
  }
  ui.classic_block_fonts = fonts
  sheet.ui = ui
  return { sheet }
}

export function classicFontFamilyCss(family: ClassicBlockFontFamily): string {
  switch (family) {
    case 'serif':
      return "var(--font-display)"
    case 'script':
      return "var(--font-classic-script)"
    case 'mono':
      return "var(--font-classic-mono)"
    case 'ui':
    default:
      return "var(--font-ui)"
  }
}
