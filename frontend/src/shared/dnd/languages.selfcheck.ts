import { canonicalLanguageList, canonicalLanguageName } from './languages'
import { mergeRaceLanguages } from './race'
import { LANGUAGE_PRESETS } from '../../features/characters/languagesTools'
import { commonLanguageOptions } from './featGrants'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

assert(canonicalLanguageName('Водяной') === 'Акван', 'Водяной alias')
assert(canonicalLanguageName('Aquan') === 'Акван', 'Aquan alias')
assert(canonicalLanguageName('Эльфийский') === 'Эльфийский', 'other names stay')

const merged = mergeRaceLanguages({
  current: ['Общий'],
  previousApplied: [],
  next: ['Общий', 'Эльфийский', 'Водяной'],
})
assert(merged.includes('Акван'), 'sea elf grant learns Акван')
assert(!merged.some((name) => name.toLowerCase() === 'водяной'), 'alias not stored twice')
assert(merged.filter((name) => name === 'Общий').length === 1, 'common once')

assert(LANGUAGE_PRESETS.includes('Акван'), 'sheet language picker')
assert(commonLanguageOptions().includes('Акван'), 'feat language picker')

console.log('languages.selfcheck ok')
