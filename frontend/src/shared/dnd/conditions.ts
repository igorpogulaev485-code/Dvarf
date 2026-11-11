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
  /** Max level inclusive; omit/null = no levels (binary PHB conditions). */
  maxLevel?: number | null
  /** Short RU labels for level picker (index 0 = level 1). */
  levelLabelsRu?: string[]
}

/**
 * PHB 2014: only Exhaustion is leveled (1–6).
 * Intoxicated is a Dvarf leveled homebrew (1–5) for drinking scenes.
 * All other SRD conditions are binary on/off.
 */
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
  {
    slug: 'exhaustion',
    name_ru: 'Истощение',
    name_en: 'Exhaustion',
    maxLevel: 6,
    levelLabelsRu: [
      'помеха к проверкам',
      'скорость ÷2',
      'помеха к атакам и сейвам',
      'макс. HP ÷2',
      'скорость 0',
      'смерть',
    ],
  },
  {
    slug: 'intoxicated',
    name_ru: 'Опьянение',
    name_en: 'Intoxicated',
    maxLevel: 5,
    levelLabelsRu: [
      'навеселе',
      'подвыпивший',
      'пьяный',
      'в стельку',
      'отключился',
    ],
  },
]

const BY_SLUG = new Map(FALLBACK_CONDITIONS.map((item) => [item.slug, item]))
const BY_EN = new Map(
  FALLBACK_CONDITIONS.map((item) => [item.name_en.toLowerCase(), item]),
)

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase()
}

export function conditionKey(ref: ConditionRef): string {
  return ref.catalog_id ?? ref.slug
}

/** Read max_level from catalog_entries.data when present. */
export function readConditionMaxLevelFromData(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null
  const row = data as Record<string, unknown>
  const raw = row.max_level ?? row.maxLevel
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  const n = Math.floor(raw)
  return n > 0 ? Math.min(20, n) : null
}

/**
 * Max level for a condition. Catalog data wins when provided;
 * otherwise FALLBACK (exhaustion 6, intoxicated 5). Binary → null.
 */
export function conditionMaxLevel(slug: string, catalogData?: unknown): number | null {
  const fromData = readConditionMaxLevelFromData(catalogData)
  if (fromData != null) return fromData
  const max = BY_SLUG.get(normalizeSlug(slug))?.maxLevel
  return max && max > 0 ? max : null
}

export function isLeveledCondition(slug: string, catalogData?: unknown): boolean {
  return conditionMaxLevel(slug, catalogData) != null
}

export function conditionLevelLabel(slug: string, level: number): string | null {
  const labels = BY_SLUG.get(normalizeSlug(slug))?.levelLabelsRu
  if (!labels?.length) return null
  const idx = Math.floor(level) - 1
  if (idx < 0 || idx >= labels.length) return null
  return labels[idx] ?? null
}

/** Prefer Russian label; map English catalog leftovers by slug/name. */
export function resolveConditionName(input: {
  slug: string
  name?: string | null
  name_ru?: string | null
  name_en?: string | null
}): string {
  const slug = normalizeSlug(input.slug)
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
    const stage = conditionLevelLabel(ref.slug, ref.level)
    return stage ? `${name} ${ref.level} (${stage})` : `${name} ${ref.level}`
  }
  return name
}

/**
 * Short toast so the player sees what just happened with a condition
 * (added / level changed / cleared), including stage meaning when leveled.
 */
export function conditionStatusToast(input: {
  action: 'add' | 'level' | 'remove'
  ref: ConditionRef
}): string {
  if (input.action === 'remove') {
    return `Снято: ${resolveConditionName(input.ref)}`
  }
  const label = formatConditionLabel(input.ref)
  if (input.action === 'level') return `Уровень: ${label}`
  return `Состояние: ${label}`
}

/** Toast for the dedicated exhaustion control (not in conditions[]). */
export function exhaustionStatusToast(level: number): string {
  if (level <= 0) return 'Снято: Истощение'
  const stage = conditionLevelLabel('exhaustion', level)
  return stage
    ? `Состояние: Истощение ${level} (${stage})`
    : `Состояние: Истощение ${level}`
}

export function clampConditionLevel(
  slug: string,
  level: number | null | undefined,
  catalogData?: unknown,
): number | null {
  const max = conditionMaxLevel(slug, catalogData)
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

/** Slugs that use levels in this app (for audits / UI copy). */
export function leveledConditionSlugs(): string[] {
  return FALLBACK_CONDITIONS.filter((row) => (row.maxLevel ?? 0) > 0).map((row) => row.slug)
}
