/** 2014 race catalog effects for the digital sheet (thin auto-apply). */

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type RaceEffectData = {
  speed: number
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'
  darkvision: number
  ability_bonuses: Partial<Record<AbilityKey, number>>
  languages: string[]
  languages_choose: number
  traits_text: string
}

const TRAIT_START = '<!-- dvarf-race-traits -->'
const TRAIT_END = '<!-- /dvarf-race-traits -->'

/** Fallback when catalog.data is still empty (pre-migration). */
export const RACE_EFFECTS_BY_SLUG: Record<string, RaceEffectData> = {
  human: {
    speed: 30,
    size: 'medium',
    darkvision: 0,
    ability_bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    languages: ['Общий'],
    languages_choose: 1,
    traits_text:
      'Человек (2014): +1 ко всем характеристикам. Дополнительный язык на выбор. Скорость 30 фт.',
  },
  elf: {
    speed: 30,
    size: 'medium',
    darkvision: 60,
    ability_bonuses: { dex: 2 },
    languages: ['Общий', 'Эльфийский'],
    languages_choose: 0,
    traits_text:
      'Эльф (2014): +2 Ловкость. Тёмное зрение 60 фт. Наследие фей. Транс. Острое чутьё.',
  },
  dwarf: {
    speed: 25,
    size: 'medium',
    darkvision: 60,
    ability_bonuses: { con: 2 },
    languages: ['Общий', 'Дварфийский'],
    languages_choose: 0,
    traits_text:
      'Дварф (2014): +2 Телосложение. Тёмное зрение 60 фт. Скорость 25 фт. Устойчивость к яду.',
  },
  orc: {
    speed: 30,
    size: 'medium',
    darkvision: 60,
    ability_bonuses: { str: 2, con: 1 },
    languages: ['Общий', 'Орочий'],
    languages_choose: 0,
    traits_text:
      'Орк (упрощ. 2014): +2 Сила, +1 Телосложение. Тёмное зрение 60 фт. Угрожающий вид.',
  },
  dragonborn: {
    speed: 30,
    size: 'medium',
    darkvision: 0,
    ability_bonuses: { str: 2, cha: 1 },
    languages: ['Общий', 'Драконий'],
    languages_choose: 0,
    traits_text:
      'Драконорожденный (2014): +2 Сила, +1 Харизма. Драконье происхождение (дыхание + сопротивление).',
  },
  halfling: {
    speed: 25,
    size: 'small',
    darkvision: 0,
    ability_bonuses: { dex: 2 },
    languages: ['Общий', 'Полуросликов'],
    languages_choose: 0,
    traits_text:
      'Полурослик (2014): +2 Ловкость. Скорость 25 фт. Удачливый. Храбрый. Полуросличья ловкость.',
  },
  gnome: {
    speed: 25,
    size: 'small',
    darkvision: 60,
    ability_bonuses: { int: 2 },
    languages: ['Общий', 'Гномий'],
    languages_choose: 0,
    traits_text:
      'Гном (2014): +2 Интеллект. Тёмное зрение 60 фт. Скорость 25 фт. Гномья хитрость.',
  },
  half_elf: {
    speed: 30,
    size: 'medium',
    darkvision: 60,
    ability_bonuses: { cha: 2 },
    languages: ['Общий', 'Эльфийский'],
    languages_choose: 1,
    traits_text:
      'Полуэльф (2014): +2 Харизма и +1 к двум другим (вручную). Тёмное зрение 60 фт. Наследие фей.',
  },
  half_orc: {
    speed: 30,
    size: 'medium',
    darkvision: 60,
    ability_bonuses: { str: 2, con: 1 },
    languages: ['Общий', 'Орочий'],
    languages_choose: 0,
    traits_text:
      'Полуорк (2014): +2 Сила, +1 Телосложение. Тёмное зрение 60 фт. Непреклонная выносливость. Свирепые атаки.',
  },
  tiefling: {
    speed: 30,
    size: 'medium',
    darkvision: 60,
    ability_bonuses: { cha: 2, int: 1 },
    languages: ['Общий', 'Инфернальный'],
    languages_choose: 0,
    traits_text:
      'Тифлинг (2014): +2 Харизма, +1 Интеллект. Тёмное зрение 60 фт. Сопротивление огню. Адское наследие.',
  },
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readSize(value: unknown): RaceEffectData['size'] {
  const allowed: RaceEffectData['size'][] = [
    'tiny',
    'small',
    'medium',
    'large',
    'huge',
    'gargantuan',
  ]
  return allowed.includes(value as RaceEffectData['size'])
    ? (value as RaceEffectData['size'])
    : 'medium'
}

function readAbilityBonuses(raw: unknown): Partial<Record<AbilityKey, number>> {
  const obj = asRecord(raw)
  const keys: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
  const result: Partial<Record<AbilityKey, number>> = {}
  for (const key of keys) {
    const n = readNumber(obj[key], NaN)
    if (Number.isFinite(n) && n !== 0) result[key] = Math.trunc(n)
  }
  return result
}

function readLanguages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const name = item.trim().replace(/\s+/g, ' ')
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(name)
  }
  return result
}

export function parseRaceEffectData(raw: unknown): RaceEffectData | null {
  const data = asRecord(raw)
  if (Object.keys(data).length === 0) return null
  const speed = Math.max(0, Math.floor(readNumber(data.speed, 30)))
  const darkvision = Math.max(0, Math.floor(readNumber(data.darkvision, 0)))
  const traits =
    typeof data.traits_text === 'string'
      ? data.traits_text.trim()
      : typeof data.traitsText === 'string'
        ? data.traitsText.trim()
        : ''
  return {
    speed,
    size: readSize(data.size),
    darkvision,
    ability_bonuses: readAbilityBonuses(data.ability_bonuses ?? data.abilityBonuses),
    languages: readLanguages(data.languages),
    languages_choose: Math.max(0, Math.floor(readNumber(data.languages_choose, 0))),
    traits_text: traits,
  }
}

export function resolveRaceEffects(input: {
  slug?: string | null
  data?: unknown
}): RaceEffectData | null {
  const fromData = parseRaceEffectData(input.data)
  if (fromData) return fromData
  const slug = input.slug?.trim().toLowerCase()
  if (!slug) return null
  return RACE_EFFECTS_BY_SLUG[slug] ?? null
}

export function mergeRaceLanguages(input: {
  current: string[]
  previousApplied: string[]
  next: string[]
}): string[] {
  const remove = new Set(input.previousApplied.map((item) => item.toLowerCase()))
  const kept = input.current.filter((item) => !remove.has(item.toLowerCase()))
  const seen = new Set(kept.map((item) => item.toLowerCase()))
  const result = [...kept]
  for (const lang of input.next) {
    const key = lang.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(lang)
  }
  return result
}

export function upsertRaceTraitsBlock(current: string, traitsText: string): string {
  const body = traitsText.trim()
  const block = body ? `${TRAIT_START}\n${body}\n${TRAIT_END}` : ''
  const start = current.indexOf(TRAIT_START)
  const end = current.indexOf(TRAIT_END)
  if (start >= 0 && end > start) {
    const afterEnd = end + TRAIT_END.length
    const before = current.slice(0, start).trimEnd()
    const after = current.slice(afterEnd).trimStart()
    const parts = [before, block, after].filter(Boolean)
    return parts.join('\n\n').trim()
  }
  if (!block) return current.trim()
  if (!current.trim()) return block
  return `${current.trim()}\n\n${block}`
}

export function formatRaceApplySummary(effects: RaceEffectData): string {
  const langs = effects.languages.join(', ') || '—'
  const choose =
    effects.languages_choose > 0 ? ` (+${effects.languages_choose} на выбор)` : ''
  const asi = Object.entries(effects.ability_bonuses)
    .map(([key, value]) => `${key.toUpperCase()} ${value! > 0 ? '+' : ''}${value}`)
    .join(', ')
  return [
    `скорость ${effects.speed}`,
    `ТЗ ${effects.darkvision || 'нет'}`,
    `языки: ${langs}${choose}`,
    asi ? `ASI в тексте (вручную: ${asi})` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
