/**
 * PHB 2014 starting-gear weights (lb) for class/background grants.
 * Used when the grant row has no weight_lb — new sheets and catalog hydrate.
 * Pack totals mirror typical content sums from our gear catalog (packs themselves
 * often have null catalog weight_lb).
 */

/** Exact RU grant names → lb. Missing key means leave null / catalog hydrate. */
export const STARTING_GEAR_WEIGHT_LB: Record<string, number> = {
  // Weapons (PHB)
  Секира: 7,
  'Боевой топор': 4,
  Молот: 10,
  'Ручной топор': 2,
  'Метательное копьё': 2,
  'Метательное копье': 2,
  'Длинный меч': 3,
  'Короткий меч': 2,
  Рапира: 2,
  Ятаган: 3,
  Кинжал: 1,
  Булава: 4,
  'Боевой молот': 2,
  'Боевой посох': 4,
  Дубинка: 2,
  Дротик: 0.25,
  Копьё: 3,
  Копье: 3,
  'Лёгкий арбалет': 5,
  'Легкий арбалет': 5,
  'Ручной арбалет': 3,
  'Короткий лук': 2,
  'Длинный лук': 2,
  // Ammo stacks (PHB: 20 arrows 1 lb, 20 bolts 1.5 lb)
  Стрелы: 0.05,
  'Болты арбалета': 0.075,
  // Armor already set on helpers; keep for name-only grants
  'Кожаный доспех': 10,
  'Клёпаный кожаный доспех': 13,
  'Чешуйчатый доспех': 45,
  Кольчуга: 55,
  Щит: 6,
  // Adventuring / focus / tools
  'Книга заклинаний': 3,
  'Сумка с компонентами': 2,
  'Мешочек с компонентами': 2,
  'Воровские инструменты': 1,
  'Священный символ': 1,
  Ряса: 0,
  Облачение: 0,
  'Палочка благовоний': 0,
  'Комплект обычной одежды': 3,
  'Одежда, обычная': 3,
  // Packs — content-sum defaults from gear_backfill (catalog pack weight often null)
  'Набор учёного': 10,
  'Набор ученого': 10,
  'Набор путешественника': 59,
  'Набор исследователя': 59,
  'Набор исследователя подземелий': 48,
  'Набор взломщика': 46,
  'Набор дипломата': 36,
  'Набор артиста': 35,
  'Набор священника': 24,
  'Набор жреца': 24,
}

/** Grant / sheet name aliases → catalog slug (for live hydrate). */
export const STARTING_GEAR_NAME_ALIASES: Record<string, string[]> = {
  vestments: ['ряса', 'облачение'],
  clothes_common: ['комплект обычной одежды', 'одежда, обычная', 'обычная одежда'],
  amulet: ['священный символ'],
  block_of_incense: ['палочка благовоний', 'благовоние', 'благовоние (блок)'],
  component_pouch: ['сумка с компонентами', 'мешочек с компонентами'],
  spellbook: ['книга заклинаний'],
  thieves_tools: ['воровские инструменты'],
  scholars_pack: ['набор учёного', 'набор ученого'],
  explorers_pack: ['набор исследователя', 'набор путешественника'],
  dungeoneers_pack: ['набор исследователя подземелий'],
  burglars_pack: ['набор взломщика'],
  diplomats_pack: ['набор дипломата'],
  entertainers_pack: ['набор артиста'],
  priests_pack: ['набор священника', 'набор жреца'],
}

export function startingGearWeightLb(name: string): number | null {
  const key = name.trim()
  if (!key) return null
  if (Object.prototype.hasOwnProperty.call(STARTING_GEAR_WEIGHT_LB, key)) {
    return STARTING_GEAR_WEIGHT_LB[key]
  }
  const lower = key.toLowerCase()
  for (const [ru, lb] of Object.entries(STARTING_GEAR_WEIGHT_LB)) {
    if (ru.toLowerCase() === lower) return lb
  }
  return null
}

export function withStartingGearWeight<T extends { name: string; weight_lb?: number | null }>(
  row: T,
): T {
  if (row.weight_lb != null && Number.isFinite(row.weight_lb)) return row
  const weight = startingGearWeightLb(row.name)
  if (weight == null) return row
  return { ...row, weight_lb: weight }
}
