/** PHB 2014 Eldritch Invocations (core set for sheet picks). */

export type WarlockInvocationDef = {
  id: string
  nameRu: string
  nameEn: string
  /** Minimum warlock level, if any. */
  minLevel?: number
  /** Pact boon prerequisite. */
  requiresPact?: 'blade' | 'chain' | 'tome'
  summaryRu: string
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

export const WARLOCK_PACT_BOONS = [
  { id: 'blade', nameRu: 'Клинок' },
  { id: 'chain', nameRu: 'Цепь' },
  { id: 'tome', nameRu: 'Гримуар' },
] as const
