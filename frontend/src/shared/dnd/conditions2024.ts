/**
 * SRD 5.2.1 condition effect cards that diverge from 2014 copy.
 * Names stay the same; 2014 FALLBACK_CONDITIONS texts are not overwritten.
 * Homebrew «Опьянение» is not part of official 2024.
 */

export type ConditionEffectCard2024 = {
  slug: string
  nameRu: string
  nameEn: string
  /** Short mechanical bullets — paraphrase, not book prose. */
  effectsRu: string[]
  /** Page in SRD 5.2.1 (conditions chapter). */
  srdPage: number
}

/**
 * Exhaustion stage labels for 2024 UI (not the 2014 ladder).
 */
export const EXHAUSTION_LEVEL_LABELS_2024: string[] = [
  '−2 к D20 Test · скорость −5 фт',
  '−4 к D20 Test · скорость −10 фт',
  '−6 к D20 Test · скорость −15 фт',
  '−8 к D20 Test · скорость −20 фт',
  '−10 к D20 Test · скорость −25 фт',
  'смерть',
]

export const CONDITION_CARDS_2024: ConditionEffectCard2024[] = [
  {
    slug: 'grappled',
    nameRu: 'Схваченный',
    nameEn: 'Grappled',
    srdPage: 182,
    effectsRu: [
      'скорость 0 и не повышается',
      'помеха к атакам по любой цели, кроме захватчика',
      'захватчик может тащить/нести вас (лишний фут за фут; Tiny / −2 размера — без штрафа)',
    ],
  },
  {
    slug: 'incapacitated',
    nameRu: 'Недееспособный',
    nameEn: 'Incapacitated',
    srdPage: 184,
    effectsRu: [
      'нельзя действие, бонусное действие и реакцию',
      'концентрация прерывается',
      'нельзя говорить',
      'при броске инициативы — помеха',
    ],
  },
  {
    slug: 'invisible',
    nameRu: 'Невидимый',
    nameEn: 'Invisible',
    srdPage: 184,
    effectsRu: [
      'при броске инициативы — преимущество',
      'эффекты, требующие видеть цель, не действуют, если создатель вас не видит',
      'атаки по вам с помехой; ваши атаки с преимуществом (если цель вас не видит)',
    ],
  },
  {
    slug: 'exhaustion',
    nameRu: 'Истощение',
    nameEn: 'Exhaustion',
    srdPage: 181,
    effectsRu: [
      'уровни 1–6; на 6 — смерть',
      'каждый уровень: −2 ко всем D20 Test и −5 фт скорости',
      'длинный отдых снимает 1 уровень',
    ],
  },
]

const BY_SLUG = new Map(CONDITION_CARDS_2024.map((c) => [c.slug, c]))

export function conditionCard2024(slug: string): ConditionEffectCard2024 | null {
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null
}

export function exhaustionLevelLabel2024FromCard(level: number): string | null {
  const n = Math.floor(level)
  if (n < 1 || n > 6) return null
  return EXHAUSTION_LEVEL_LABELS_2024[n - 1] ?? null
}

/** Incapacitated (2024) → disadvantage on Initiative. */
export function incapacitatedInitiativeDisadvantage2024(
  hasIncapacitated: boolean,
): boolean {
  return Boolean(hasIncapacitated)
}

/** Invisible (2024) → advantage on Initiative. */
export function invisibleInitiativeAdvantage2024(hasInvisible: boolean): boolean {
  return Boolean(hasInvisible)
}

/**
 * Merge initiative modes from conditions + surprise (2024).
 * Advantage + disadvantage → normal.
 */
export function mergeInitiativeMode2024(input: {
  base?: 'normal' | 'advantage' | 'disadvantage'
  surprised?: boolean
  incapacitated?: boolean
  invisible?: boolean
}): 'normal' | 'advantage' | 'disadvantage' {
  let adv = input.base === 'advantage'
  let dis = input.base === 'disadvantage'
  if (input.invisible) adv = true
  if (input.surprised || input.incapacitated) dis = true
  if (adv && dis) return 'normal'
  if (adv) return 'advantage'
  if (dis) return 'disadvantage'
  return 'normal'
}

/** Official 2024 preset list excludes homebrew intoxicated. */
export function officialConditionSlugs2024(): string[] {
  return [
    'blinded',
    'charmed',
    'deafened',
    'frightened',
    'grappled',
    'incapacitated',
    'invisible',
    'paralyzed',
    'petrified',
    'poisoned',
    'prone',
    'restrained',
    'stunned',
    'unconscious',
    'exhaustion',
  ]
}
