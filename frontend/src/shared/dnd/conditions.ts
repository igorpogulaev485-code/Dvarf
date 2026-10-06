/** Condition helpers — catalog slugs + sheet combat.conditions. */

export type ConditionRef = {
  /** Catalog slug when known; otherwise a free-form custom id. */
  slug: string
  name: string
  catalog_id: string | null
}

/** Fallback labels if catalog seed is empty / offline. */
export const FALLBACK_CONDITIONS: Array<{ slug: string; name_ru: string; name_en: string }> = [
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
]

export function conditionKey(ref: ConditionRef): string {
  return ref.catalog_id ?? ref.slug
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
  return [...current, next]
}

export function hasCondition(current: ConditionRef[], key: string): boolean {
  return current.some((item) => conditionKey(item) === key || item.slug === key)
}
