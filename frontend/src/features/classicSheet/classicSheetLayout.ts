import { asRecord } from '../characters/sheetTypes'
import type { CharacterDetail } from '../../shared/api/characters'
import { cloneSheet, type ClassicPatch } from './fromApi'

/** Visual layout of the classic printable sheet (independent of rules_edition). */
export type ClassicSheetLayout = '2014' | '2024'

export const CLASSIC_SHEET_LAYOUTS: ClassicSheetLayout[] = ['2014', '2024']

export function readClassicSheetLayout(
  sheet: Record<string, unknown> | CharacterDetail,
): ClassicSheetLayout {
  const root = 'sheet' in sheet ? asRecord(sheet.sheet) : asRecord(sheet)
  const ui = asRecord(root.ui)
  return ui.classic_sheet_layout === '2024' ? '2024' : '2014'
}

export function setClassicSheetLayout(
  character: CharacterDetail,
  layout: ClassicSheetLayout,
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const ui = asRecord(sheet.ui)
  ui.classic_sheet_layout = layout
  sheet.ui = ui
  return { sheet }
}
