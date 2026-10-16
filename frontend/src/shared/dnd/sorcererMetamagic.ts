/** PHB 2014 sorcerer Metamagic options. */

export type MetamagicDef = {
  id: string
  nameRu: string
  nameEn: string
  costRu: string
  /** Fixed SP cost, or null when cost = spell slot level (Twinned; cantrip = 1). */
  costPoints: number | null
  summaryRu: string
}

export const SORCERER_METAMAGIC: MetamagicDef[] = [
  {
    id: 'careful',
    nameRu: 'Осторожное заклинание',
    nameEn: 'Careful Spell',
    costRu: '1',
    costPoints: 1,
    summaryRu: 'Выбранные существа (≤ Хар.) автоуспех на спас твоего заклинания.',
  },
  {
    id: 'distant',
    nameRu: 'Далёкое заклинание',
    nameEn: 'Distant Spell',
    costRu: '1',
    costPoints: 1,
    summaryRu: 'Дистанция ×2; касание → 30 фт.',
  },
  {
    id: 'empowered',
    nameRu: 'Усиленное заклинание',
    nameEn: 'Empowered Spell',
    costRu: '1',
    costPoints: 1,
    summaryRu: 'Перебросить до Хар. костей урона. Можно вместе с другой метамагией.',
  },
  {
    id: 'extended',
    nameRu: 'Продлённое заклинание',
    nameEn: 'Extended Spell',
    costRu: '1',
    costPoints: 1,
    summaryRu: 'Длительность ×2 (макс. 24 ч.), если ≥1 мин.',
  },
  {
    id: 'heightened',
    nameRu: 'Напряжённое заклинание',
    nameEn: 'Heightened Spell',
    costRu: '3',
    costPoints: 3,
    summaryRu: 'Одна цель с помехой на первый спас заклинания.',
  },
  {
    id: 'quickened',
    nameRu: 'Ускоренное заклинание',
    nameEn: 'Quickened Spell',
    costRu: '2',
    costPoints: 2,
    summaryRu: 'Время накладывания действием → бонусное.',
  },
  {
    id: 'subtle',
    nameRu: 'Тонкое заклинание',
    nameEn: 'Subtle Spell',
    costRu: '1',
    costPoints: 1,
    summaryRu: 'Без вербальных и соматических компонентов.',
  },
  {
    id: 'twinned',
    nameRu: 'Разделённое заклинание',
    nameEn: 'Twinned Spell',
    costRu: 'ур. ячейки (заговор = 1)',
    costPoints: null,
    summaryRu: 'Заклинание на одну цель → вторая цель в пределах дистанции.',
  },
]

/** PHB Flexible Casting: SP cost to create a spell slot of the given level. */
export const FLEXIBLE_CASTING_SLOT_COST: Record<number, number> = {
  1: 2,
  2: 3,
  3: 5,
  4: 6,
  5: 7,
}

export function metamagicSpendCost(
  def: MetamagicDef,
  spellSlotLevel: number = 1,
): number {
  if (def.costPoints != null) return def.costPoints
  // Twinned: cantrip costs 1; otherwise spell level
  return Math.max(1, Math.floor(spellSlotLevel))
}

export function metamagicById(id: string | null | undefined): MetamagicDef | null {
  if (!id) return null
  return SORCERER_METAMAGIC.find((row) => row.id === id) ?? null
}

export function metamagicLabel(id: string): string {
  return metamagicById(id)?.nameRu || id
}

/** Known metamagic count by sorcerer level. */
export function metamagicKnownCount(classLevel: number): number {
  if (classLevel >= 17) return 4
  if (classLevel >= 10) return 3
  if (classLevel >= 3) return 2
  return 0
}
