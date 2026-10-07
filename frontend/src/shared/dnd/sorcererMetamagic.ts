/** PHB 2014 sorcerer Metamagic options. */

export type MetamagicDef = {
  id: string
  nameRu: string
  nameEn: string
  costRu: string
  summaryRu: string
}

export const SORCERER_METAMAGIC: MetamagicDef[] = [
  {
    id: 'careful',
    nameRu: 'Осторожное заклинание',
    nameEn: 'Careful Spell',
    costRu: '1',
    summaryRu: 'Выбранные существа (≤ Хар.) автоуспех на спас твоего заклинания.',
  },
  {
    id: 'distant',
    nameRu: 'Далёкое заклинание',
    nameEn: 'Distant Spell',
    costRu: '1',
    summaryRu: 'Дистанция ×2; касание → 30 фт.',
  },
  {
    id: 'empowered',
    nameRu: 'Усиленное заклинание',
    nameEn: 'Empowered Spell',
    costRu: '1',
    summaryRu: 'Перебросить до Хар. костей урона заклинания.',
  },
  {
    id: 'extended',
    nameRu: 'Продлённое заклинание',
    nameEn: 'Extended Spell',
    costRu: '1',
    summaryRu: 'Длительность ×2 (макс. 24 ч.), если ≥1 мин.',
  },
  {
    id: 'heightened',
    nameRu: 'Напряжённое заклинание',
    nameEn: 'Heightened Spell',
    costRu: '3',
    summaryRu: 'Одна цель с помехой на первый спас заклинания.',
  },
  {
    id: 'quickened',
    nameRu: 'Ускоренное заклинание',
    nameEn: 'Quickened Spell',
    costRu: '2',
    summaryRu: 'Время накладывания действием → бонусное.',
  },
  {
    id: 'subtle',
    nameRu: 'Тонкое заклинание',
    nameEn: 'Subtle Spell',
    costRu: '1',
    summaryRu: 'Без вербальных и соматических компонентов.',
  },
  {
    id: 'twinned',
    nameRu: 'Разделённое заклинание',
    nameEn: 'Twinned Spell',
    costRu: 'ур. ячейки (заговор = 1)',
    summaryRu: 'Заклинание на одну цель → вторая цель в пределах дистанции.',
  },
]

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
