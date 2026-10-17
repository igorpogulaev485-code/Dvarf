import { asRecord, readNumber } from '../characters/sheetTypes'
import type { CharacterDetail } from '../../shared/api/characters'
import { cloneSheet, type ClassicPatch } from './fromApi'

export const CLASSIC_BLOCK_FONT_MIN = 5
export const CLASSIC_BLOCK_FONT_MAX = 12
export const CLASSIC_BLOCK_FONT_DEFAULT = 8

/** Point size for a classic text block, clamped 5–12. */
export function clampClassicFontSize(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : readNumber(raw, CLASSIC_BLOCK_FONT_DEFAULT)
  return Math.max(
    CLASSIC_BLOCK_FONT_MIN,
    Math.min(CLASSIC_BLOCK_FONT_MAX, Math.round(n)),
  )
}

function sizeFromStored(value: unknown): number {
  if (typeof value === 'number' || typeof value === 'string') {
    return clampClassicFontSize(value)
  }
  const row = asRecord(value)
  if ('size' in row) return clampClassicFontSize(row.size)
  return CLASSIC_BLOCK_FONT_DEFAULT
}

/** Map of blockId → font size (pt). Accepts legacy `{ size }` objects. */
export function readClassicBlockFonts(
  sheet: Record<string, unknown> | CharacterDetail,
): Record<string, number> {
  const root = 'sheet' in sheet ? asRecord(sheet.sheet) : asRecord(sheet)
  const ui = asRecord(root.ui)
  const raw = asRecord(ui.classic_block_fonts)
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    out[key] = sizeFromStored(value)
  }
  return out
}

export function readClassicBlockFontSize(
  sheet: Record<string, unknown> | CharacterDetail,
  blockId: string,
): number {
  return readClassicBlockFonts(sheet)[blockId] ?? CLASSIC_BLOCK_FONT_DEFAULT
}

export function setClassicBlockFontSize(
  character: CharacterDetail,
  blockId: string,
  size: number,
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const ui = asRecord(sheet.ui)
  const fonts = asRecord(ui.classic_block_fonts)
  fonts[blockId] = clampClassicFontSize(size)
  ui.classic_block_fonts = fonts
  sheet.ui = ui
  return { sheet }
}
