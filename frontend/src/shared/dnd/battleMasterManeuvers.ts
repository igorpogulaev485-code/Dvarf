/** PHB + TCE Battle Master maneuvers (core set for sheet picks). */

export type ManeuverDef = {
  id: string
  nameRu: string
  nameEn: string
  summaryRu: string
  /** TCE option — gated by lobby book / badge outside lobby. */
  sourceBook?: 'tce'
  /**
   * Display label in the superiority-die spend dialog.
   * Ambush must say «Приём: Засада» so it is not confused with T-02 Hide.
   */
  spendLabelRu?: string
}

export const BATTLE_MASTER_MANEUVERS: ManeuverDef[] = [
  {
    id: 'commanders_strike',
    nameRu: 'Удар командира',
    nameEn: "Commander's Strike",
    summaryRu: 'При Атаке: отказаться от атаки + бонусное — союзник реакцией атакует + кость превосходства к урону.',
  },
  {
    id: 'disarming_attack',
    nameRu: 'Обезоруживающая атака',
    nameEn: 'Disarming Attack',
    summaryRu: 'При попадании: +кость урона; спас Сил. или выронить предмет.',
  },
  {
    id: 'distracting_strike',
    nameRu: 'Отвлекающий удар',
    nameEn: 'Distracting Strike',
    summaryRu: 'При попадании: +кость урона; след. атака союзника до твоего хода — с преимуществом.',
  },
  {
    id: 'evasive_footwork',
    nameRu: 'Уклончивая работа ног',
    nameEn: 'Evasive Footwork',
    summaryRu: 'При перемещении: кость к КД, пока двигаешься.',
  },
  {
    id: 'feinting_attack',
    nameRu: 'Обманная атака',
    nameEn: 'Feinting Attack',
    summaryRu: 'Бонусным: преимущество на одну атаку + кость к урону при попадании.',
  },
  {
    id: 'goading_attack',
    nameRu: 'Провокационная атака',
    nameEn: 'Goading Attack',
    summaryRu: 'При попадании: +кость урона; спас Мудр. или помеха атаковать не тебя до конца твоего след. хода.',
  },
  {
    id: 'lunging_attack',
    nameRu: 'Выпад',
    nameEn: 'Lunging Attack',
    summaryRu: 'При атаке рукопашным: +5 фт. досягаемости; при попадании +кость урона.',
  },
  {
    id: 'maneuvering_attack',
    nameRu: 'Маневренная атака',
    nameEn: 'Maneuvering Attack',
    summaryRu: 'При попадании: +кость урона; союзник реакцией перемещается ½ скорости без провоцированных от цели.',
  },
  {
    id: 'menacing_attack',
    nameRu: 'Устрашающая атака',
    nameEn: 'Menacing Attack',
    summaryRu: 'При попадании: +кость урона; спас Мудр. или испуган до конца твоего след. хода.',
  },
  {
    id: 'parry',
    nameRu: 'Парирование',
    nameEn: 'Parry',
    summaryRu: 'Реакция при уроне оружием ближнего боя: снизить урон на кость + мод. Ловк.',
  },
  {
    id: 'precision_attack',
    nameRu: 'Точная атака',
    nameEn: 'Precision Attack',
    summaryRu: 'К броску атаки оружия добавить кость превосходства (до/после броска, до исхода).',
  },
  {
    id: 'pushing_attack',
    nameRu: 'Отталкивающая атака',
    nameEn: 'Pushing Attack',
    summaryRu: 'При попадании: +кость урона; Large или меньше — спас Сил. или оттолкнуть на 15 фт.',
  },
  {
    id: 'rally',
    nameRu: 'Сплочение',
    nameEn: 'Rally',
    summaryRu: 'Бонусным: союзник в 30 фт. получает вр. хиты = кость + мод. Хар.',
  },
  {
    id: 'riposte',
    nameRu: 'Ответный удар',
    nameEn: 'Riposte',
    summaryRu: 'Реакция при промахе рукопашной по тебе: атака оружием + кость к урону.',
  },
  {
    id: 'sweeping_attack',
    nameRu: 'Сметающая атака',
    nameEn: 'Sweeping Attack',
    summaryRu: 'При попадании рукопашным: другое существо в 5 фт. от цели и в досягаемости — урон = кость, если атака попала бы.',
  },
  {
    id: 'trip_attack',
    nameRu: 'Атака с подножкой',
    nameEn: 'Trip Attack',
    summaryRu: 'При попадании: +кость урона; Large или меньше — спас Сил. или сбит с ног.',
  },
  // TCE — O-01
  {
    id: 'grappling_strike',
    nameRu: 'Атака с захватом',
    nameEn: 'Grappling Strike',
    sourceBook: 'tce',
    summaryRu:
      'TCE: сразу после попадания рукопашным оружием в свой ход бонусным — попытка захвата; кость к проверке Атлетики.',
  },
  {
    id: 'quick_toss',
    nameRu: 'Быстрый бросок',
    nameEn: 'Quick Toss',
    sourceBook: 'tce',
    summaryRu:
      'TCE: бонусным — дальнобойная атака метательным (можно выхватить частью действия); при попадании кость к урону.',
  },
  {
    id: 'brace',
    nameRu: 'Готовность',
    nameEn: 'Brace',
    sourceBook: 'tce',
    summaryRu:
      'TCE: реакция, когда видимое существо входит в досягаемость твоего рукопашного оружия — одна атака этим оружием, при попадании кость к урону.',
  },
  {
    id: 'ambush',
    nameRu: 'Засада',
    nameEn: 'Ambush',
    sourceBook: 'tce',
    spendLabelRu: 'Приём: Засада',
    summaryRu:
      'TCE: кость к проверке Скрытности или к инициативе, если не недееспособен.',
  },
  {
    id: 'commanding_presence',
    nameRu: 'Командирский напор',
    nameEn: 'Commanding Presence',
    sourceBook: 'tce',
    summaryRu: 'TCE: кость к Запугиванию, Выступлению или Убеждению.',
  },
  {
    id: 'bait_and_switch',
    nameRu: 'Подмена',
    nameEn: 'Bait and Switch',
    sourceBook: 'tce',
    summaryRu:
      'TCE: в свой ход, существо в 5 фт согласно и не недееспособно; ≥5 фт движения — меняетесь местами без провокации; кость — бонус к КД до начала твоего следующего хода (себе или этому существу).',
  },
  {
    id: 'tactical_assessment',
    nameRu: 'Тактическая оценка',
    nameEn: 'Tactical Assessment',
    sourceBook: 'tce',
    summaryRu: 'TCE: кость к Проницательности, Истории или Расследованию.',
  },
]

export const TCE_MANEUVER_IDS = BATTLE_MASTER_MANEUVERS.filter(
  (row) => row.sourceBook === 'tce',
).map((row) => row.id)

export function isTceManeuver(id: string | null | undefined): boolean {
  if (!id) return false
  return maneuverById(id)?.sourceBook === 'tce'
}

export function maneuversKnownCount(classLevel: number): number {
  if (classLevel >= 15) return 9
  if (classLevel >= 10) return 7
  if (classLevel >= 7) return 5
  if (classLevel >= 3) return 3
  return 0
}

export function maneuverById(id: string | null | undefined): ManeuverDef | null {
  if (!id) return null
  return BATTLE_MASTER_MANEUVERS.find((row) => row.id === id) ?? null
}

export function maneuverLabel(id: string): string {
  return maneuverById(id)?.nameRu || id
}

/** Label for the superiority-die spend dialog (Ambush → «Приём: Засада»). */
export function maneuverSpendLabel(id: string): string {
  const def = maneuverById(id)
  return def?.spendLabelRu || def?.nameRu || id
}
