/** TCoE Path of Wild Magic — Wild Surge table (d8). */

export type WildSurgeRow = {
  roll: number
  summaryRu: string
}

export const WILD_SURGE_TABLE: WildSurgeRow[] = [
  {
    roll: 1,
    summaryRu:
      'Существа на выбор в 30 фт.: спас Тел. или 1к12 некротического. Ты получаешь 1к12 временных хитов.',
  },
  {
    roll: 2,
    summaryRu:
      'Телепорт до 30 фт. в видимую свободную клетку. До конца ярости можешь повторять бонусным действием.',
  },
  {
    roll: 3,
    summaryRu:
      'Дух в 5 фт. от выбранного существа в 30 фт. В конце хода взрыв: существа в 5 фт. спас Ловк. или 1к6 силового. До конца ярости можно призвать ещё бонусным.',
  },
  {
    roll: 4,
    summaryRu:
      'Одно оружие в руке до конца ярости наносит силовой урон и получает лёгкое и метательное (20/60). Если выпало из руки — возвращается в конце хода.',
  },
  {
    roll: 5,
    summaryRu: 'До конца ярости существо, попавшее по тебе атакой, получает 1к6 силового.',
  },
  {
    roll: 6,
    summaryRu:
      'До конца ярости +1 КД тебе и любому существу в 10 фт. от тебя.',
  },
  {
    roll: 7,
    summaryRu: 'До конца ярости земля в 15 фт. — труднопроходимая для врагов.',
  },
  {
    roll: 8,
    summaryRu: 'Брось ещё дважды, 8 перебрасывай.',
  },
]

export function wildSurgeByRoll(roll: number): WildSurgeRow | null {
  return WILD_SURGE_TABLE.find((row) => row.roll === roll) ?? null
}

/** Bolstering Magic (TCoE): one of two benefits, PB times / long rest. */
export const BOLSTERING_MAGIC_OPTIONS = [
  {
    id: 'd3_bonus',
    nameRu: 'd3 к атаке или проверке',
    summaryRu:
      '10 минут: существо (или ты) при атаке или проверке бросает d3 и прибавляет к d20.',
  },
  {
    id: 'slot',
    nameRu: 'Восстановить ячейку',
    summaryRu:
      'Брось d3. Существо восстанавливает ячейку этого круга или ниже. Повторно тому же существу — только после продолжительного отдыха.',
  },
] as const
