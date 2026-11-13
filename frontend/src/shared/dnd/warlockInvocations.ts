/** PHB 2014 + TCE Eldritch Invocations (core set for sheet picks). */

export type WarlockInvocationDef = {
  id: string
  nameRu: string
  nameEn: string
  /** Minimum warlock level, if any. */
  minLevel?: number
  /** Pact boon prerequisite. */
  requiresPact?: 'blade' | 'chain' | 'tome' | 'talisman'
  summaryRu: string
  /** TCE option — gated by lobby book / badge outside lobby. */
  sourceBook?: 'tce'
  /**
   * Legacy id kept for sheet compatibility but no longer offered in the picker.
   * (pact_of_the_talisman → pact boon «talisman»).
   */
  deprecatedAsInvocation?: boolean
}

export const WARLOCK_INVOCATIONS: WarlockInvocationDef[] = [
  {
    id: 'agonizing_blast',
    nameRu: 'Мучительный заговор',
    nameEn: 'Agonizing Blast',
    summaryRu: 'К урону eldritch blast добавь мод. Харизмы (нужен eldritch blast).',
  },
  {
    id: 'armor_of_shadows',
    nameRu: 'Доспех теней',
    nameEn: 'Armor of Shadows',
    summaryRu: 'Бесплатный mage armor на себя по желанию.',
  },
  {
    id: 'beast_speech',
    nameRu: 'Речь зверей',
    nameEn: 'Beast Speech',
    summaryRu: 'Бесплатный speak with animals по желанию.',
  },
  {
    id: 'beguiling_influence',
    nameRu: 'Обманчивое влияние',
    nameEn: 'Beguiling Influence',
    summaryRu: 'Владение Обманом и Убеждением.',
  },
  {
    id: 'book_of_ancient_secrets',
    nameRu: 'Книга древних тайн',
    nameEn: 'Book of Ancient Secrets',
    requiresPact: 'tome',
    summaryRu: 'Два ритуала 1 ур. в книгу; можешь переписывать ритуалы любых классов.',
  },
  {
    id: 'devils_sight',
    nameRu: 'Дьявольское зрение',
    nameEn: "Devil's Sight",
    summaryRu: 'Нормальное зрение в магической и немагической тьме до 120 фт.',
  },
  {
    id: 'eldritch_sight',
    nameRu: 'Мистическое зрение',
    nameEn: 'Eldritch Sight',
    summaryRu: 'Бесплатный detect magic по желанию.',
  },
  {
    id: 'eldritch_spear',
    nameRu: 'Мистическое копьё',
    nameEn: 'Eldritch Spear',
    summaryRu: 'Дальность eldritch blast = 300 фт.',
  },
  {
    id: 'eyes_of_the_rune_keeper',
    nameRu: 'Глаза хранителя рун',
    nameEn: 'Eyes of the Rune Keeper',
    summaryRu: 'Можешь читать любые письмена.',
  },
  {
    id: 'fiendish_vigor',
    nameRu: 'Дьявольская мощь',
    nameEn: 'Fiendish Vigor',
    summaryRu: 'Бесплатный false life (1 ур.) на себя по желанию.',
  },
  {
    id: 'gaze_of_two_minds',
    nameRu: 'Взгляд двух разумов',
    nameEn: 'Gaze of Two Minds',
    summaryRu: 'Действием коснись согласного гуманоида: до конца след. хода видишь/слышишь через него (действие каждый ход).',
  },
  {
    id: 'lifedrinker',
    nameRu: 'Испивающий жизнь',
    nameEn: 'Lifedrinker',
    minLevel: 12,
    requiresPact: 'blade',
    summaryRu: 'Пактное оружие: +мод. Хар. некротического урона при попадании.',
  },
  {
    id: 'mask_of_many_faces',
    nameRu: 'Маска многих лиц',
    nameEn: 'Mask of Many Faces',
    summaryRu: 'Бесплатный disguise self по желанию.',
  },
  {
    id: 'master_of_myriad_forms',
    nameRu: 'Мастер множественных форм',
    nameEn: 'Master of Myriad Forms',
    minLevel: 15,
    summaryRu: 'Бесплатный alter self по желанию.',
  },
  {
    id: 'misty_visions',
    nameRu: 'Туманные видения',
    nameEn: 'Misty Visions',
    summaryRu: 'Бесплатный silent image по желанию.',
  },
  {
    id: 'one_with_shadows',
    nameRu: 'Един с тенями',
    nameEn: 'One with Shadows',
    minLevel: 5,
    summaryRu: 'В тусклом/тьме действием — невидимость, пока не двинешься/не атакуешь/не кастуешь.',
  },
  {
    id: 'otherworldly_leap',
    nameRu: 'Иной прыжок',
    nameEn: 'Otherworldly Leap',
    minLevel: 9,
    summaryRu: 'Бесплатный jump на себя по желанию.',
  },
  {
    id: 'repelling_blast',
    nameRu: 'Отталкивающий заговор',
    nameEn: 'Repelling Blast',
    summaryRu: 'При попадании eldritch blast можно оттолкнуть цель на 10 фт.',
  },
  {
    id: 'thirsting_blade',
    nameRu: 'Жаждущий клинок',
    nameEn: 'Thirsting Blade',
    minLevel: 5,
    requiresPact: 'blade',
    summaryRu: 'При Атаке пактным оружием — две атаки вместо одной.',
  },
  {
    id: 'visions_of_distant_realms',
    nameRu: 'Видения далёких миров',
    nameEn: 'Visions of Distant Realms',
    minLevel: 15,
    summaryRu: 'Бесплатный arcane eye по желанию.',
  },
  {
    id: 'voice_of_the_chain_master',
    nameRu: 'Голос хозяина цепи',
    nameEn: 'Voice of the Chain Master',
    requiresPact: 'chain',
    summaryRu: 'Телепатически говори через фамильяра; воспринимай его чувства на любом расстоянии (на одном плане).',
  },
  {
    id: 'whispers_of_the_grave',
    nameRu: 'Шёпот могилы',
    nameEn: 'Whispers of the Grave',
    minLevel: 9,
    summaryRu: 'Бесплатный speak with dead по желанию.',
  },
  {
    id: 'witch_sight',
    nameRu: 'Ведьмин взгляд',
    nameEn: 'Witch Sight',
    minLevel: 15,
    summaryRu: 'Истинное зрение 30 фт. на существ в облике (превращение/иллюзия).',
  },
  // XGE / TCE — B-05 sheet buffs
  {
    id: 'eldritch_mind',
    nameRu: 'Элдрический разум',
    nameEn: 'Eldritch Mind',
    summaryRu: 'Преимущество на спасброски Телосложения для концентрации.',
  },
  {
    id: 'improved_pact_weapon',
    nameRu: 'Улучшенное оружие договора',
    nameEn: 'Improved Pact Weapon',
    requiresPact: 'blade',
    summaryRu: '+1 к атаке и урону пактного оружия (если нет большего бонуса); можно как фокусировку.',
  },
  {
    id: 'tomb_of_levistus',
    nameRu: 'Гробница Левиста',
    nameEn: 'Tomb of Levistus',
    minLevel: 5,
    summaryRu: 'Реакция: 10×ур. временных хитов; до конца след. хода скорость 0, опутан, уязвим к огню.',
  },
  {
    id: 'pact_of_the_talisman',
    nameRu: 'Договор талисмана',
    nameEn: 'Pact of the Talisman',
    sourceBook: 'tce',
    deprecatedAsInvocation: true,
    summaryRu:
      'Устаревший id: теперь договор «Талисман». Носитель при провале проверки добавляет 1к4 (БМ раз / долгий отдых).',
  },
  // TCE — O-01
  {
    id: 'investment_of_the_chain_master',
    nameRu: 'Дар мастера цепи',
    nameEn: 'Investment of the Chain Master',
    requiresPact: 'chain',
    sourceBook: 'tce',
    summaryRu:
      'TCE: при «Поиске фамильяра» — полёт или плавание 40 фт; бонусным приказать фамильяру «Атака»; атаки оружием фамильяра магические; Сл спасбросков = Сл заклинаний колдуна; реакцией — сопротивление урону фамильяра.',
  },
  {
    id: 'gift_of_the_protectors',
    nameRu: 'Дар защитников',
    nameEn: 'Gift of the Protectors',
    minLevel: 9,
    requiresPact: 'tome',
    sourceBook: 'tce',
    summaryRu:
      'TCE: страница имён (до БМ); когда хиты записанного опускаются до 0 и он не умирает сразу — остаются 1 хит, 1 раз / долгий отдых на всех.',
  },
  {
    id: 'protection_of_the_talisman',
    nameRu: 'Защита талисмана',
    nameEn: 'Protection of the Talisman',
    minLevel: 7,
    requiresPact: 'talisman',
    sourceBook: 'tce',
    summaryRu: 'TCE: носитель при провале спасброска добавляет 1к4, БМ раз / долгий отдых.',
  },
  {
    id: 'rebuke_of_the_talisman',
    nameRu: 'Порицание талисмана',
    nameEn: 'Rebuke of the Talisman',
    requiresPact: 'talisman',
    sourceBook: 'tce',
    summaryRu:
      'TCE: реакция, когда по носителю попадают и ты видишь атакующего в 30 фт — урон психической энергией = БМ и толчок на 10 фт от носителя.',
  },
  {
    id: 'bond_of_the_talisman',
    nameRu: 'Связь с талисманом',
    nameEn: 'Bond of the Talisman',
    minLevel: 12,
    requiresPact: 'talisman',
    sourceBook: 'tce',
    summaryRu:
      'TCE: действием телепорт к носителю (или он к тебе), один план, БМ раз / долгий отдых.',
  },
  {
    id: 'far_scribe',
    nameRu: 'Книжник из дали',
    nameEn: 'Far Scribe',
    minLevel: 5,
    requiresPact: 'tome',
    sourceBook: 'tce',
    summaryRu: 'TCE: каст «Послания» без компонентов выбранным именам (без ячейки).',
  },
  {
    id: 'undying_servitude',
    nameRu: 'Бессмертный раб',
    nameEn: 'Undying Servitude',
    minLevel: 5,
    sourceBook: 'tce',
    summaryRu: 'TCE: «Восставший труп» без ячейки, 1 раз / долгий отдых.',
  },
]

/** Invocation count by warlock level (PHB). */
export function invocationKnownCount(classLevel: number): number {
  if (classLevel >= 18) return 8
  if (classLevel >= 15) return 7
  if (classLevel >= 12) return 6
  if (classLevel >= 9) return 5
  if (classLevel >= 7) return 4
  if (classLevel >= 5) return 3
  if (classLevel >= 2) return 2
  return 0
}

export function invocationById(id: string | null | undefined): WarlockInvocationDef | null {
  if (!id) return null
  return WARLOCK_INVOCATIONS.find((row) => row.id === id) ?? null
}

export function invocationLabel(id: string): string {
  return invocationById(id)?.nameRu || id
}

export const TCE_INVOCATION_IDS = WARLOCK_INVOCATIONS.filter(
  (row) => row.sourceBook === 'tce' && !row.deprecatedAsInvocation,
).map((row) => row.id)

export function isTceInvocation(id: string | null | undefined): boolean {
  if (!id) return false
  return invocationById(id)?.sourceBook === 'tce'
}

/** Ids offered in the invocation picker (excludes deprecated pact_of_the_talisman). */
export function warlockInvocationPickerIds(): string[] {
  return WARLOCK_INVOCATIONS.filter((row) => !row.deprecatedAsInvocation).map(
    (row) => row.id,
  )
}

/**
 * PHB invocations that are a spell cast. XGE rows are omitted: those
 * invocations are not in `WARLOCK_INVOCATIONS`, and this hotfix does not
 * invent the XGE catalog.
 * `pact_slot` is ready for a book line that spends a pact slot (and an
 * optional long-rest limit) instead of a regular slot.
 */
export type InvocationCastDef = {
  invocationId: string
  mode: 'at_will' | 'pact_slot'
  nameEn: string
  selfOnly?: boolean
  /** Lock the card to this circle. Fiendish Vigor is 1st level only. */
  fixedLevel?: number
  limitPerLongRest?: number
}

export const INVOCATION_CASTS: InvocationCastDef[] = [
  { invocationId: 'armor_of_shadows', mode: 'at_will', nameEn: 'Mage Armor', selfOnly: true },
  { invocationId: 'beast_speech', mode: 'at_will', nameEn: 'Speak with Animals' },
  { invocationId: 'eldritch_sight', mode: 'at_will', nameEn: 'Detect Magic' },
  {
    invocationId: 'fiendish_vigor',
    mode: 'at_will',
    nameEn: 'False Life',
    selfOnly: true,
    fixedLevel: 1,
  },
  { invocationId: 'mask_of_many_faces', mode: 'at_will', nameEn: 'Disguise Self' },
  { invocationId: 'misty_visions', mode: 'at_will', nameEn: 'Silent Image' },
  { invocationId: 'otherworldly_leap', mode: 'at_will', nameEn: 'Jump', selfOnly: true },
  { invocationId: 'whispers_of_the_grave', mode: 'at_will', nameEn: 'Speak with Dead' },
  { invocationId: 'master_of_myriad_forms', mode: 'at_will', nameEn: 'Alter Self' },
  { invocationId: 'visions_of_distant_realms', mode: 'at_will', nameEn: 'Arcane Eye' },
  {
    invocationId: 'far_scribe',
    mode: 'at_will',
    nameEn: 'Sending',
  },
  {
    invocationId: 'undying_servitude',
    mode: 'at_will',
    nameEn: 'Animate Dead',
    fixedLevel: 3,
    limitPerLongRest: 1,
  },
]

export function invocationCastById(id: string | null | undefined): InvocationCastDef | null {
  if (!id) return null
  return INVOCATION_CASTS.find((row) => row.invocationId === id) ?? null
}

export type WarlockPactBoonDef = {
  id: 'blade' | 'chain' | 'tome' | 'talisman'
  nameRu: string
  sourceBook?: 'tce'
}

export const WARLOCK_PACT_BOONS: WarlockPactBoonDef[] = [
  { id: 'blade', nameRu: 'Клинок' },
  { id: 'chain', nameRu: 'Цепь' },
  { id: 'tome', nameRu: 'Гримуар' },
  { id: 'talisman', nameRu: 'Талисман', sourceBook: 'tce' },
]

export type WarlockPactBoonId = WarlockPactBoonDef['id']

export function isTcePactBoon(id: string | null | undefined): boolean {
  return id === 'talisman'
}

/**
 * Systemic grants attached to a pact boon choice (slice F).
 * Tome: +3 known cantrips from any class list, outside warlock cantrip budget.
 */
export type PactBoonGrantBundle = {
  knownCantrips?: {
    count: number
    /** Feature-pick id that stores CSV of catalog slugs. */
    pickFeatureId: string
    lists: 'any_class'
  }
  notesRu?: string
}

export const WARLOCK_PACT_BOON_GRANTS: Record<
  WarlockPactBoonId,
  PactBoonGrantBundle
> = {
  blade: {},
  chain: {
    notesRu:
      'Учишь «Поиск фамильяра» и можешь кастовать его как ритуал; особые формы фамильяра (бес, псевдодракон…). Карточка напарника — после каста.',
  },
  tome: {
    knownCantrips: {
      count: 3,
      pickFeatureId: 'pact_tome_cantrips',
      lists: 'any_class',
    },
    notesRu:
      'Три заговора из списков любого класса. Не входят в лимит заговоров колдуна.',
  },
  talisman: {
    notesRu:
      'TCE: носитель талисмана при провале проверки характеристики добавляет 1к4 (применений = БМ / долгий отдых). Замена — 1-часовая церемония на отдыхе.',
  },
}
