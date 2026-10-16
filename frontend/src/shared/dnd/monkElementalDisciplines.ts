/** PHB Way of the Four Elements — elemental disciplines (sheet picks). */

export type ElementalDisciplineDef = {
  id: string
  nameRu: string
  nameEn: string
  /** Ki cost to cast/activate; null = free at-will. */
  kiCost: number | null
  minLevel?: number
  summaryRu: string
}

export const MONK_ELEMENTAL_DISCIPLINES: ElementalDisciplineDef[] = [
  {
    id: 'elemental_attunement',
    nameRu: "Гармония стихий",
    nameEn: "Elemental Attunement",
    kiCost: null,
    summaryRu: "Мелкие стихийные трюки (без ки).",
  },
  {
    id: 'fangs_of_the_fire_snake',
    nameRu: "Клыки огненной змеи",
    nameEn: "Fangs of the Fire Snake",
    kiCost: 1,
    summaryRu: "Безоружные +10 фт. досягаемости огнём; +1к10 огня за доп. ки при попадании.",
  },
  {
    id: 'fist_of_four_thunders',
    nameRu: "Кулак четырёх громов",
    nameEn: "Fist of Four Thunders",
    kiCost: 2,
    summaryRu: "Каст thunderwave (усиление +1 ки / ур.).",
  },
  {
    id: 'fist_of_unbroken_air',
    nameRu: "Кулак несломленного воздуха",
    nameEn: "Fist of Unbroken Air",
    kiCost: 2,
    summaryRu: "Действием: существо в 30 фт. — 3к10 дробящего + отталкивание (спас Сил.); +1к10 за ки.",
  },
  {
    id: 'rush_of_the_gale_spirits',
    nameRu: "Натиск духов шквала",
    nameEn: "Rush of the Gale Spirits",
    kiCost: 2,
    summaryRu: "Каст gust of wind.",
  },
  {
    id: 'shape_the_flowing_river',
    nameRu: "Форма текущей реки",
    nameEn: "Shape the Flowing River",
    kiCost: 1,
    summaryRu: "Лёд/вода в 30 фт. — заморозить/растопить/перестроить 30-фт. куб.",
  },
  {
    id: 'sweeping_cinder_strike',
    nameRu: "Сметающий удар искр",
    nameEn: "Sweeping Cinder Strike",
    kiCost: 2,
    summaryRu: "Каст burning hands.",
  },
  {
    id: 'water_whip',
    nameRu: "Водяной хлыст",
    nameEn: "Water Whip",
    kiCost: 2,
    summaryRu: "Действием/бонусным: 30 фт. — 3к10 дробящего + сбить/притянуть (спас Ловк.); +1к10 за ки.",
  },
  {
    id: 'clench_of_the_north_wind',
    nameRu: "Хватка северного ветра",
    nameEn: "Clench of the North Wind",
    kiCost: 3,
    minLevel: 6,
    summaryRu: "Каст hold person (с 3 ур.).",
  },
  {
    id: 'gong_of_the_summit',
    nameRu: "Гонг вершины",
    nameEn: "Gong of the Summit",
    kiCost: 3,
    minLevel: 6,
    summaryRu: "Каст shatter (с 6 ур.).",
  },
  {
    id: 'flames_of_the_phoenix',
    nameRu: "Пламя феникса",
    nameEn: "Flames of the Phoenix",
    kiCost: 4,
    minLevel: 11,
    summaryRu: "Каст fireball (с 11 ур.).",
  },
  {
    id: 'mist_stance',
    nameRu: "Стойка тумана",
    nameEn: "Mist Stance",
    kiCost: 4,
    minLevel: 11,
    summaryRu: "Каст gaseous form на себя (с 11 ур.).",
  },
  {
    id: 'ride_the_wind',
    nameRu: "Оседлать ветер",
    nameEn: "Ride the Wind",
    kiCost: 4,
    minLevel: 11,
    summaryRu: "Каст fly на себя (с 11 ур.).",
  },
  {
    id: 'eternal_mountain_defense',
    nameRu: "Вечная защита горы",
    nameEn: "Eternal Mountain Defense",
    kiCost: 5,
    minLevel: 17,
    summaryRu: "Каст stoneskin на себя (с 17 ур.).",
  },
  {
    id: 'river_of_hungry_flame',
    nameRu: "Река голодного пламени",
    nameEn: "River of Hungry Flame",
    kiCost: 5,
    minLevel: 17,
    summaryRu: "Каст wall of fire (с 17 ур.).",
  },
  {
    id: 'wave_of_rolling_earth',
    nameRu: "Волна катящейся земли",
    nameEn: "Wave of Rolling Earth",
    kiCost: 6,
    minLevel: 17,
    summaryRu: "Каст wall of stone (с 17 ур.).",
  },
]

export function elementalDisciplineById(id: string | null | undefined): ElementalDisciplineDef | null {
  if (!id) return null
  return MONK_ELEMENTAL_DISCIPLINES.find((row) => row.id === id) ?? null
}

export function elementalDisciplineLabel(id: string): string {
  return elementalDisciplineById(id)?.nameRu || id
}

/** Known disciplines by monk level (PHB: 1 at 3, +1 at 6/11/17). */
export function elementalDisciplinesKnown(classLevel: number): number {
  if (classLevel >= 17) return 4
  if (classLevel >= 11) return 3
  if (classLevel >= 6) return 2
  if (classLevel >= 3) return 1
  return 0
}
