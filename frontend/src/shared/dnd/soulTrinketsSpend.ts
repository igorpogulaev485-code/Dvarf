import type { UnlockedFeature } from './classFeatures'

/** Option when burning a Phantom soul trinket (stock −1). */
export type SoulTrinketBurnOption = {
  key: string
  featureId: string
  classEntryId: string
  nameRu: string
  summaryRu: string
}

/**
 * Burn options for Tokens of the Departed.
 * Always: free Wail (if unlocked) + ask spirit question.
 */
export function listSoulTrinketBurnOptions(
  features: UnlockedFeature[],
  classEntryId: string,
): SoulTrinketBurnOption[] {
  const rows: SoulTrinketBurnOption[] = []
  const hasTrinkets = features.some(
    (f) =>
      f.classEntryId === classEntryId &&
      (f.id === 'tokens_of_the_departed' || f.resource?.pool_id === 'soul_trinkets'),
  )
  if (!hasTrinkets) return rows

  const hasWails = features.some(
    (f) => f.classEntryId === classEntryId && f.id === 'wails_from_the_grave',
  )
  if (hasWails) {
    rows.push({
      key: `${classEntryId}:burn_wail`,
      featureId: 'wails_from_the_grave',
      classEntryId,
      nameRu: 'Могильный вопль (сжечь частицу)',
      summaryRu:
        'После Скрытой атаки — вопль без траты заряда воплей (с 9 ур. Phantom).',
    })
  }

  rows.push({
    key: `${classEntryId}:burn_question`,
    featureId: 'tokens_of_the_departed',
    classEntryId,
    nameRu: 'Вопрос духу',
    summaryRu: 'Действием задай вопрос духу частицы (ответ да/нет/неясно и т.п.).',
  })

  return rows
}
