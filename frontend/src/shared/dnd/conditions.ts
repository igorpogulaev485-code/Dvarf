/** Condition helpers — catalog slugs + sheet combat.conditions. */

export type ConditionRef = {
  /** Catalog slug when known; otherwise a free-form custom id. */
  slug: string
  name: string
  catalog_id: string | null
  /** Present for leveled conditions (exhaustion / intoxication / custom). */
  level?: number | null
}

export type ConditionPreset = {
  slug: string
  name_ru: string
  name_en: string
  /** Max level inclusive; omit/null = no levels. */
  maxLevel?: number | null
}

/** Fallback labels if catalog seed is empty / offline / English-only. */
export const FALLBACK_CONDITIONS: ConditionPreset[] = [
  { slug: 'blinded', name_ru: 'Ослеплённый', name_en: 'Blinded' },
  { slug: 'charmed', name_ru: 'Очарованный', name_en: 'Charmed' },
  { slug: 'deafened', name_ru: 'Оглохший', name_en: 'Deafened' },
  { slug: 'frightened', name_ru: 'Испуганный', name_en: 'Frightened' },
  { slug: 'grappled', name_ru: 'Схваченный', name_en: 'Grappled' },
  { slug: 'incapacitated', name_ru: 'Недееспособный', name_en: 'Incapacitated' },
  { slug: 'invisible', name_ru: 'Невидимый', name_en: 'Invisible' },
  { slug: 'paralyzed', name_ru: 'Парализованный', name_en: 'Paralyzed' },
  { slug: 'petrified', name_ru: 'Окаменевший', name_en: 'Petrified' },
  { slug: 'poisoned', name_ru: 'Отравленный', name_en: 'Poisoned' },
  { slug: 'prone', name_ru: 'Опрокинутый', name_en: 'Prone' },
  { slug: 'restrained', name_ru: 'Опутанный', name_en: 'Restrained' },
  { slug: 'stunned', name_ru: 'Ошеломлённый', name_en: 'Stunned' },
  { slug: 'unconscious', name_ru: 'Бессознательный', name_en: 'Unconscious' },
  { slug: 'exhaustion', name_ru: 'Истощение', name_en: 'Exhaustion', maxLevel: 6 },
  { slug: 'intoxicated', name_ru: 'Опьянение', name_en: 'Intoxicated', maxLevel: 5 },
]

const BY_SLUG = new Map(FALLBACK_CONDITIONS.map((item) => [item.slug, item]))
const BY_EN = new Map(
  FALLBACK_CONDITIONS.map((item) => [item.name_en.toLowerCase(), item]),
)

export function conditionKey(ref: ConditionRef): string {
  return ref.catalog_id ?? ref.slug
}

export function conditionMaxLevel(slug: string): number | null {
  const max = BY_SLUG.get(slug)?.maxLevel
  return max && max > 0 ? max : null
}

export function isLeveledCondition(slug: string): boolean {
  return conditionMaxLevel(slug) != null
}

/** Prefer Russian label; map English catalog leftovers by slug/name. */
export function resolveConditionName(input: {
  slug: string
  name?: string | null
  name_ru?: string | null
  name_en?: string | null
}): string {
  const slug = input.slug.trim().toLowerCase()
  const fallback = BY_SLUG.get(slug)
  const candidates = [input.name_ru, input.name, input.name_en]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)

  for (const candidate of candidates) {
    const byEn = BY_EN.get(candidate.toLowerCase())
    if (byEn) return byEn.name_ru
    // Cyrillic → keep as-is
    if (/[А-Яа-яЁё]/.test(candidate)) return candidate
  }

  return fallback?.name_ru ?? candidates[0] ?? input.slug
}

export function formatConditionLabel(ref: ConditionRef): string {
  const name = resolveConditionName(ref)
  const max = conditionMaxLevel(ref.slug)
  if (max && ref.level != null && ref.level > 0) {
    return `${name} ${ref.level}`
  }
  return name
}

export function clampConditionLevel(slug: string, level: number | null | undefined): number | null {
  const max = conditionMaxLevel(slug)
  if (max == null) return null
  const n = Math.floor(level ?? 1)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(max, n)
}

export function toggleCondition(
  current: ConditionRef[],
  next: ConditionRef,
): ConditionRef[] {
  const key = conditionKey(next)
  const exists = current.some((item) => conditionKey(item) === key)
  if (exists) {
    return current.filter((item) => conditionKey(item) !== key)
  }
  const level = isLeveledCondition(next.slug)
    ? clampConditionLevel(next.slug, next.level ?? 1)
    : null
  return [
    ...current,
    {
      ...next,
      name: resolveConditionName(next),
      level,
    },
  ]
}

export function hasCondition(current: ConditionRef[], key: string): boolean {
  return current.some((item) => conditionKey(item) === key || item.slug === key)
}

export function setConditionLevel(
  current: ConditionRef[],
  key: string,
  level: number,
): ConditionRef[] {
  return current.map((item) => {
    if (conditionKey(item) !== key && item.slug !== key) return item
    return {
      ...item,
      level: clampConditionLevel(item.slug, level),
      name: resolveConditionName(item),
    }
  })
}
