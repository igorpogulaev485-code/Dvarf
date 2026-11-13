/** Run: npx tsx src/features/classicSheet/classicPrintSettings.selfcheck.ts */
import type { CharacterDetail } from '../../shared/api/characters.ts'
import {
  isClassicPrintSettingsOnlyPatch,
  setClassicPencilBlanks,
  setClassicExtraNotePages,
  setClassicTextStyle,
  CLASSIC_FIT_MIN_PT,
  classicPrintFontFamilyCss,
} from './classicPrintSettings.ts'
import { setClassicSheetLayout } from './classicSheetLayout.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const base: CharacterDetail = {
  id: 't',
  name: 'Тест',
  avatar_url: null,
  level: 3,
  class_name: 'Следопыт',
  race_name: 'Эльф',
  hp_current: 20,
  hp_max: 20,
  rules_edition: '2014',
  sheet_version: 2,
  created_at: '',
  updated_at: '',
  sheet: {
    ui: {},
    abilities: { str: { score: 10 } },
    combat: { ac: 14 },
  },
}

assert(CLASSIC_FIT_MIN_PT === 7, 'min pt')
assert(classicPrintFontFamilyCss('serif').includes('font-display'), 'serif css')
assert(classicPrintFontFamilyCss('sans').includes('font-ui'), 'sans css')

const layout = setClassicSheetLayout(base, '2024')
assert(isClassicPrintSettingsOnlyPatch(base, layout), 'layout-only ok')

const pencil = setClassicPencilBlanks(base, true)
assert(isClassicPrintSettingsOnlyPatch(base, pencil), 'pencil-only ok')

const notes = setClassicExtraNotePages(base, 2)
assert(isClassicPrintSettingsOnlyPatch(base, notes), 'extra notes ok')

const style = setClassicTextStyle(base, { fontFamily: 'sans', lineHeight: 'tight' })
assert(isClassicPrintSettingsOnlyPatch(base, style), 'text style ok')

const dirty = {
  name: 'Хак',
  sheet: pencil.sheet,
}
assert(!isClassicPrintSettingsOnlyPatch(base, dirty), 'name patch rejected')

const gameSheet = {
  sheet: {
    ...(pencil.sheet as Record<string, unknown>),
    combat: { ac: 99 },
  },
}
assert(!isClassicPrintSettingsOnlyPatch(base, gameSheet), 'combat change rejected')

console.log('classicPrintSettings.selfcheck: ok')
