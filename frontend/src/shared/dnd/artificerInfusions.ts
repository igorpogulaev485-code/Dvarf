/** TCoE / ERftLW Artificer infusions (core set for sheet picks). */

export type ArtificerInfusionDef = {
  id: string
  nameRu: string
  nameEn: string
  minLevel?: number
  summaryRu: string
}

export const ARTIFICER_INFUSIONS: ArtificerInfusionDef[] = [
  {
    id: 'boots_of_the_winding_path',
    nameRu: 'Сапоги извилистого пути',
    nameEn: 'Boots of the Winding Path',
    minLevel: 6,
    summaryRu: 'Носитель бонусным телепорт 15 фт. в видимое свободное место, где уже стоял в этом ходу.',
  },
  {
    id: 'enhanced_arcane_focus',
    nameRu: 'Усиленный магический фокус',
    nameEn: 'Enhanced Arcane Focus',
    summaryRu: '+1 к броскам атаки заклинаниями (+2 с 10 ур.).',
  },
  {
    id: 'enhanced_defense',
    nameRu: 'Усиленная защита',
    nameEn: 'Enhanced Defense',
    summaryRu: 'Доспех или щит: +1 КД (+2 с 10 ур.).',
  },
  {
    id: 'enhanced_weapon',
    nameRu: 'Усиленное оружие',
    nameEn: 'Enhanced Weapon',
    summaryRu: 'Оружие: +1 атака и урон (+2 с 10 ур.).',
  },
  {
    id: 'homunculus_servant',
    nameRu: 'Слуга-гомункул',
    nameEn: 'Homunculus Servant',
    summaryRu: 'Создай гомункула (статблок TCoE); телепатия, канал заклинания касания.',
  },
  {
    id: 'mind_sharpener',
    nameRu: 'Остриё разума',
    nameEn: 'Mind Sharpener',
    summaryRu: 'Доспех/мантия: при провале концентрации — можно преуспеть (4 заряда).',
  },
  {
    id: 'radiant_weapon',
    nameRu: 'Сияющее оружие',
    nameEn: 'Radiant Weapon',
    minLevel: 6,
    summaryRu: '+1 атака/урон; бонусным свет; реакция ослепить атакующего (4 заряда).',
  },
  {
    id: 'repeating_shot',
    nameRu: 'Повторяющий выстрел',
    nameEn: 'Repeating Shot',
    summaryRu: 'Дальнобойное со свойством «заряжаемое»: +1; игнорирует заряжание; создаёт боеприпасы.',
  },
  {
    id: 'repulsion_shield',
    nameRu: 'Щит отталкивания',
    nameEn: 'Repulsion Shield',
    minLevel: 6,
    summaryRu: 'Щит +1 КД; реакцией оттолкнуть атакующего на 15 фт. (4 заряда).',
  },
  {
    id: 'resistant_armor',
    nameRu: 'Стойкий доспех',
    nameEn: 'Resistant Armor',
    minLevel: 6,
    summaryRu: 'Доспех: сопротивление одному типу урона (на выбор при инфузии).',
  },
  {
    id: 'returning_weapon',
    nameRu: 'Возвращающееся оружие',
    nameEn: 'Returning Weapon',
    summaryRu: 'Метательное оружие: +1; возвращается в руку после атаки.',
  },
  {
    id: 'spell_refueling_ring',
    nameRu: 'Кольцо подзарядки заклинаний',
    nameEn: 'Spell-Refueling Ring',
    minLevel: 6,
    summaryRu: 'Действием восстанови ячейку ≤3 ур. 1× / рассвет.',
  },
]

export function infusionKnownCount(classLevel: number): number {
  if (classLevel >= 18) return 12
  if (classLevel >= 14) return 10
  if (classLevel >= 10) return 8
  if (classLevel >= 6) return 6
  if (classLevel >= 2) return 4
  return 0
}

export function infusedItemCount(classLevel: number): number {
  if (classLevel >= 18) return 6
  if (classLevel >= 14) return 5
  if (classLevel >= 10) return 4
  if (classLevel >= 6) return 3
  if (classLevel >= 2) return 2
  return 0
}

export function infusionById(id: string | null | undefined): ArtificerInfusionDef | null {
  if (!id) return null
  return ARTIFICER_INFUSIONS.find((row) => row.id === id) ?? null
}

export function infusionLabel(id: string): string {
  return infusionById(id)?.nameRu || id
}

export const ARMORER_ARMOR_MODELS = [
  { id: 'guardian', nameRu: 'Страж' },
  { id: 'infiltrator', nameRu: 'Диверсант' },
] as const
