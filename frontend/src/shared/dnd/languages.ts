/** Canonical language names (2014). Aliases collapse onto the picker label. */

const LANGUAGE_ALIASES: Record<string, string> = {
  aquan: 'Акван',
  акван: 'Акван',
  водяной: 'Акван',
  'водяной язык': 'Акван',
  druidic: 'Друидический',
  друидический: 'Друидический',
  // 2024 create used to store raw ids on the sheet.
  common: 'Общий',
  'common-sign-language': 'Язык жестов',
  dwarvish: 'Дварфийский',
  elvish: 'Эльфийский',
  giant: 'Великаний',
  gnomish: 'Гномий',
  goblin: 'Гоблинский',
  halfling: 'Язык полуросликов',
  orc: 'Орочий',
  abyssal: 'Бездны',
  celestial: 'Небесный',
  'deep-speech': 'Глубинная речь',
  draconic: 'Драконий',
  infernal: 'Инфернальный',
  primordial: 'Первичный',
  sylvan: 'Сильван',
  undercommon: 'Подземный',
  'thieves-cant': 'Воровской жаргон',
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/** «Водяной» / Aquan → «Акван». Other names stay as written. */
export function canonicalLanguageName(name: string): string {
  const normalized = normalizeName(name)
  if (!normalized) return ''
  const key = normalized.toLowerCase()
  return LANGUAGE_ALIASES[key] ?? LANGUAGE_ALIASES[key.replace(/[_\s]+/g, '-')] ?? normalized
}

export function canonicalLanguageList(names: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of names) {
    const canonical = canonicalLanguageName(name)
    if (!canonical) continue
    const key = canonical.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(canonical)
  }
  return result
}
