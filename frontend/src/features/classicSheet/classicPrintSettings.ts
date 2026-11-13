import { asRecord, readNumber } from '../characters/sheetTypes'
import type { CharacterDetail } from '../../shared/api/characters'
import { cloneSheet, type ClassicPatch } from './fromApi'

/** Keys under sheet.ui that classic print may write. */
export const CLASSIC_PRINT_UI_KEYS = [
  'classic_sheet_layout',
  'classic_block_fonts',
  'classic_pencil_blanks',
  'classic_extra_note_pages',
  'classic_text_style',
  'classic_block_sizes',
  'classic_global_font_scale',
] as const

export type ClassicPrintUiKey = (typeof CLASSIC_PRINT_UI_KEYS)[number]

export type ClassicLineHeight = 'tight' | 'normal' | 'loose'
export type ClassicTextAlign = 'left' | 'justify'
export type ClassicPrintFontFamily = 'serif' | 'sans' | 'script'

export type ClassicTextStyle = {
  lineHeight: ClassicLineHeight
  align: ClassicTextAlign
  headingBold: boolean
  headingItalic: boolean
  fontFamily: ClassicPrintFontFamily
}

export const CLASSIC_TEXT_STYLE_DEFAULT: ClassicTextStyle = {
  lineHeight: 'normal',
  align: 'left',
  headingBold: true,
  headingItalic: false,
  fontFamily: 'serif',
}

export const CLASSIC_GLOBAL_FONT_SCALE_DEFAULT = 1
export const CLASSIC_GLOBAL_FONT_SCALE_MIN = 0.85
export const CLASSIC_GLOBAL_FONT_SCALE_MAX = 1.25

/** Min readable print size (pt) — CL01 autofit floor. */
export const CLASSIC_FIT_MIN_PT = 7

function uiRoot(character: CharacterDetail): Record<string, unknown> {
  return asRecord(asRecord(character.sheet).ui)
}

export function readClassicPencilBlanks(character: CharacterDetail): boolean {
  return uiRoot(character).classic_pencil_blanks === true
}

export function setClassicPencilBlanks(
  character: CharacterDetail,
  enabled: boolean,
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const ui = asRecord(sheet.ui)
  ui.classic_pencil_blanks = enabled
  sheet.ui = ui
  return { sheet }
}

export function readClassicExtraNotePages(character: CharacterDetail): number {
  return Math.max(0, Math.min(12, Math.floor(readNumber(uiRoot(character).classic_extra_note_pages, 0))))
}

export function setClassicExtraNotePages(
  character: CharacterDetail,
  pages: number,
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const ui = asRecord(sheet.ui)
  ui.classic_extra_note_pages = Math.max(0, Math.min(12, Math.floor(pages)))
  sheet.ui = ui
  return { sheet }
}

export function readClassicTextStyle(character: CharacterDetail): ClassicTextStyle {
  const raw = asRecord(uiRoot(character).classic_text_style)
  const lineHeight =
    raw.lineHeight === 'tight' || raw.lineHeight === 'loose' || raw.lineHeight === 'normal'
      ? raw.lineHeight
      : CLASSIC_TEXT_STYLE_DEFAULT.lineHeight
  const align = raw.align === 'justify' ? 'justify' : 'left'
  const fontFamily =
    raw.fontFamily === 'sans' || raw.fontFamily === 'script' || raw.fontFamily === 'serif'
      ? raw.fontFamily
      : CLASSIC_TEXT_STYLE_DEFAULT.fontFamily
  return {
    lineHeight,
    align,
    headingBold: raw.headingBold === undefined ? true : Boolean(raw.headingBold),
    headingItalic: Boolean(raw.headingItalic),
    fontFamily,
  }
}

export function setClassicTextStyle(
  character: CharacterDetail,
  style: Partial<ClassicTextStyle>,
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const ui = asRecord(sheet.ui)
  const prev = readClassicTextStyle(character)
  ui.classic_text_style = { ...prev, ...style }
  sheet.ui = ui
  return { sheet }
}

export function readClassicGlobalFontScale(character: CharacterDetail): number {
  const n = readNumber(uiRoot(character).classic_global_font_scale, CLASSIC_GLOBAL_FONT_SCALE_DEFAULT)
  return Math.max(
    CLASSIC_GLOBAL_FONT_SCALE_MIN,
    Math.min(CLASSIC_GLOBAL_FONT_SCALE_MAX, Math.round(n * 100) / 100),
  )
}

export function setClassicGlobalFontScale(
  character: CharacterDetail,
  scale: number,
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const ui = asRecord(sheet.ui)
  ui.classic_global_font_scale = Math.max(
    CLASSIC_GLOBAL_FONT_SCALE_MIN,
    Math.min(CLASSIC_GLOBAL_FONT_SCALE_MAX, Math.round(scale * 100) / 100),
  )
  sheet.ui = ui
  return { sheet }
}

export type ClassicBlockSize = { heightRem?: number }

export function readClassicBlockSizes(
  character: CharacterDetail,
): Record<string, ClassicBlockSize> {
  const raw = asRecord(uiRoot(character).classic_block_sizes)
  const out: Record<string, ClassicBlockSize> = {}
  for (const [key, value] of Object.entries(raw)) {
    const row = asRecord(value)
    const heightRem = readNumber(row.heightRem, 0)
    if (heightRem > 0) out[key] = { heightRem }
  }
  return out
}

export function readClassicBlockSize(
  character: CharacterDetail,
  blockId: string,
): ClassicBlockSize | null {
  return readClassicBlockSizes(character)[blockId] ?? null
}

export function setClassicBlockSize(
  character: CharacterDetail,
  blockId: string,
  size: ClassicBlockSize | null,
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const ui = asRecord(sheet.ui)
  const sizes = asRecord(ui.classic_block_sizes)
  if (!size || !(size.heightRem && size.heightRem > 0)) {
    delete sizes[blockId]
  } else {
    sizes[blockId] = { heightRem: Math.max(2, Math.min(40, Math.round(size.heightRem * 10) / 10)) }
  }
  ui.classic_block_sizes = sizes
  sheet.ui = ui
  return { sheet }
}

/** Reset typography + block sizes (keeps layout / pencil / extra notes). */
export function resetClassicPrintTextSettings(character: CharacterDetail): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const ui = asRecord(sheet.ui)
  delete ui.classic_block_fonts
  delete ui.classic_text_style
  delete ui.classic_block_sizes
  delete ui.classic_global_font_scale
  sheet.ui = ui
  return { sheet }
}

/**
 * Narrow sheet.ui to classic print keys only — drop other ui noise from PATCH body.
 * Merges `nextUi` keys into a clone of current ui, then returns sheet with only
 * classic_* keys updated (other ui keys preserved from character).
 */
export function mergeClassicPrintUi(
  character: CharacterDetail,
  nextClassicUi: Record<string, unknown>,
): Record<string, unknown> {
  const sheet = cloneSheet(asRecord(character.sheet))
  const ui = asRecord(sheet.ui)
  for (const key of CLASSIC_PRINT_UI_KEYS) {
    if (key in nextClassicUi) {
      ui[key] = nextClassicUi[key]
    }
  }
  sheet.ui = ui
  return sheet
}

/** True when patch.sheet only touches classic print ui keys (no game data). */
export function isClassicPrintSettingsOnlyPatch(
  character: CharacterDetail,
  patch: ClassicPatch,
): boolean {
  if (
    patch.name !== undefined ||
    patch.level !== undefined ||
    patch.class_name !== undefined ||
    patch.race_name !== undefined ||
    patch.hp_current !== undefined ||
    patch.hp_max !== undefined
  ) {
    return false
  }
  if (!patch.sheet) return true
  const prev = asRecord(character.sheet)
  const next = asRecord(patch.sheet)
  for (const key of Object.keys(next)) {
    if (key === 'ui') continue
    if (JSON.stringify(next[key]) !== JSON.stringify(prev[key])) return false
  }
  const prevUi = asRecord(prev.ui)
  const nextUi = asRecord(next.ui)
  for (const key of Object.keys(nextUi)) {
    if (CLASSIC_PRINT_UI_KEYS.includes(key as ClassicPrintUiKey)) continue
    if (JSON.stringify(nextUi[key]) !== JSON.stringify(prevUi[key])) return false
  }
  for (const key of Object.keys(prevUi)) {
    if (CLASSIC_PRINT_UI_KEYS.includes(key as ClassicPrintUiKey)) continue
    if (!(key in nextUi) && prevUi[key] !== undefined) {
      // missing non-classic key would be a wipe
      return false
    }
  }
  return true
}

export function classicPrintFontFamilyCss(family: ClassicPrintFontFamily): string {
  if (family === 'sans') return "var(--font-ui)"
  if (family === 'script') return "var(--font-script)"
  return "var(--font-display)"
}

export function classicLineHeightCss(value: ClassicLineHeight): string {
  if (value === 'tight') return '1.15'
  if (value === 'loose') return '1.55'
  return '1.35'
}
