/** Run: npx tsx src/features/classicSheet/classicPrintSettings.selfcheck.ts */
import type { CharacterDetail } from '../../shared/api/characters.ts'
import {
  isClassicPrintSettingsOnlyPatch,
  setClassicPencilBlanks,
  setClassicExtraNotePages,
  setClassicTextStyle,
  setClassicPrintColor,
  readClassicTextStyle,
  readClassicPrintColor,
  readClassicGlobalFontScale,
  CLASSIC_FIT_MIN_PT,
  classicPrintFontFamilyCss,
} from './classicPrintSettings.ts'
import { setClassicSheetLayout } from './classicSheetLayout.ts'
import { asRecord } from '../characters/sheetTypes.ts'

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

const style = setClassicTextStyle(base, { fontFamily: 'sans', lineHeight: 'tight', nameScript: true })
assert(isClassicPrintSettingsOnlyPatch(base, style), 'text style ok')
const styleChar = { ...base, sheet: style.sheet! }
assert(readClassicTextStyle(styleChar).fontFamily === 'sans', 'sans family')
assert(readClassicTextStyle(styleChar).nameScript === true, 'name script')
assert(!('headingBold' in asRecord(asRecord(style.sheet).ui).classic_text_style), 'no headingBold')

const color = setClassicPrintColor(base, 'color')
assert(isClassicPrintSettingsOnlyPatch(base, color), 'color-only ok')
assert(readClassicPrintColor({ ...base, sheet: color.sheet! }) === 'color', 'color mode')
assert(readClassicPrintColor(base) === 'bw', 'default bw')

assert(readClassicGlobalFontScale(base) === 1, 'global scale always 1')

// Legacy script family → nameScript
const legacy: CharacterDetail = {
  ...base,
  sheet: {
    ...base.sheet,
    ui: { classic_text_style: { fontFamily: 'script', lineHeight: 'normal', align: 'left' } },
  },
}
assert(readClassicTextStyle(legacy).fontFamily === 'serif', 'legacy script → serif')
assert(readClassicTextStyle(legacy).nameScript === true, 'legacy script → nameScript')

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
