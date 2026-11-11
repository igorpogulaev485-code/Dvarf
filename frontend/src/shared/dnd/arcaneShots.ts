/** XGE Arcane Archer — Arcane Shot options (8). */

export type ArcaneShotDef = {
  id: string
  nameRu: string
  nameEn: string
  summaryRu: string
}

export const ARCANE_SHOTS: ArcaneShotDef[] = [
  {
    id: 'banishing_arrow',
    nameRu: 'Изгоняющая стрела',
    nameEn: 'Banishing Arrow',
    summaryRu:
      'Попадание: спас Хар. или цель изгнана до начала твоего следующего хода. С 18 ур. +2к6 силового.',
  },
  {
    id: 'beguiling_arrow',
    nameRu: 'Очаровывающая стрела',
    nameEn: 'Beguiling Arrow',
    summaryRu:
      '+2к6 психического; спас Мудр. или цель очарована выбранным союзником до начала твоего следующего хода. С 18 ур. +4к6.',
  },
  {
    id: 'bursting_arrow',
    nameRu: 'Взрывная стрела',
    nameEn: 'Bursting Arrow',
    summaryRu: 'Цель и существа в 10 фт. получают 2к6 силового. С 18 ур. 4к6.',
  },
  {
    id: 'enfeebling_arrow',
    nameRu: 'Ослабляющая стрела',
    nameEn: 'Enfeebling Arrow',
    summaryRu:
      '+2к6 некротического; спас Тел. или урон атак оружия цели делится пополам до начала твоего следующего хода. С 18 ур. +4к6.',
  },
  {
    id: 'grasping_arrow',
    nameRu: 'Хватающая стрела',
    nameEn: 'Grasping Arrow',
    summaryRu:
      '+2к6 яда, скорость −10 фт., 2к6 рубящего при движении. Снять: действие, Атлетика против Сл заклинаний. С 18 ур. +4к6.',
  },
  {
    id: 'piercing_arrow',
    nameRu: 'Пронзающая стрела',
    nameEn: 'Piercing Arrow',
    summaryRu:
      'Линия 30 фт. без броска атаки: спас Ловк., урон как от стрелы +1к6 колющего (успех — половина). С 18 ур. +2к6.',
  },
  {
    id: 'seeking_arrow',
    nameRu: 'Ищущая стрела',
    nameEn: 'Seeking Arrow',
    summaryRu:
      'Цель, виденная за последнюю минуту, без линии обзора: спас Ловк., урон стрелы +1к6 силового и ты узнаёшь, где она. С 18 ур. +2к6.',
  },
  {
    id: 'shadow_arrow',
    nameRu: 'Теневая стрела',
    nameEn: 'Shadow Arrow',
    summaryRu:
      '+2к6 психического; спас Мудр. или цель не видит дальше 5 фт. до начала твоего следующего хода. С 18 ур. +4к6.',
  },
]

export function arcaneShotById(id: string | null | undefined): ArcaneShotDef | null {
  if (!id) return null
  return ARCANE_SHOTS.find((row) => row.id === id) ?? null
}

/** Known options: 2 at 3, then +1 at 7, 10, 15 and 18. */
export function arcaneShotsKnown(classLevel: number): number {
  const lv = Math.max(0, Math.floor(classLevel))
  if (lv < 3) return 0
  let known = 2
  if (lv >= 7) known += 1
  if (lv >= 10) known += 1
  if (lv >= 15) known += 1
  if (lv >= 18) known += 1
  return known
}
