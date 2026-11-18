/**
 * P24-M02B-bard: FRHoF College of the Moon + RTW College of Spirits helpers.
 * Callers must branch on rules_edition === '2024'; does not feed the 2014 pack
 * (Коллегия духов 2014 / «Сказания извне» / «Сеанс духов»).
 */

import type { FeatureChoiceDef } from './classFeatures'
import { alwaysPreparedForSubclass2024, isPhb2024CreateSubclass } from './edition2024Subclasses'
import {
  getFeatureChoicePick,
  getFeatureChoicePickList,
  getFeaturePick,
  type FeaturePicksState,
} from './featurePicks'

export const M02B_BARD_BOOK_SLUGS = [
  'bard__college-of-the-moon',
  'bard__college-of-the-spirits',
] as const

export type M02bBardBookSlug = (typeof M02B_BARD_BOOK_SLUGS)[number]

export function isM02bBardBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_BARD_BOOK_SLUGS as readonly string[]).includes(key)
}

export function isCollegeOfTheMoon2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === 'bard__college-of-the-moon'
}

export function isCollegeOfTheSpirits2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === 'bard__college-of-the-spirits'
}

/** Assert allowlist opens only these two book paths (selfcheck). */
export function bardBookAllowlistOpen2024(slug: string): boolean {
  return isPhb2024CreateSubclass(slug) && isM02bBardBookSubclass(slug)
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL for this pack)                                    */
/* ------------------------------------------------------------------ */

export const COLLEGE_OF_THE_MOON_NAME_RU = 'Коллегия луны'
export const COLLEGE_OF_THE_SPIRITS_NAME_RU = 'Коллегия духов'

export const MOONS_INSPIRATION_NAME_RU = 'Вдохновение луны'
export const INSPIRED_ECLIPSE_NAME_RU = 'Вдохновенное затмение'
export const LUNAR_VITALITY_NAME_RU = 'Лунная живучесть'
export const PRIMAL_LORE_NAME_RU = 'Древние знания'
export const BLESSING_OF_MOONLIGHT_NAME_RU = 'Благословение лунного света'
export const EVENTIDES_SPLENDOR_NAME_RU = 'Вечернее великолепие'
export const NEW_MOON_SHADOW_NAME_RU = 'Тень новолуния'
export const FULL_MOON_RESONANCE_NAME_RU = 'Резонанс полнолуния'
export const MOONBEAM_NAME_RU = 'Лунный луч'

export const CHANNELER_NAME_RU = 'Проводник'
export const GUIDING_WHISPER_NAME_RU = 'Направляющий шёпот'
export const SPIRITUAL_FOCUS_NAME_RU = 'Спиритическая фокусировка'
export const SPIRITS_FROM_BEYOND_NAME_RU = 'Замогильные духи'
export const GUIDED_SUMMON_NAME_RU = 'Управляемый призыв'
export const RELEASE_SPIRIT_NAME_RU = 'Выпустить духа'
export const EMPOWERED_CHANNELING_NAME_RU = 'Улучшенный призыв'
export const FORCES_FROM_BEYOND_NAME_RU = 'Силы с того света'
export const SPIRIT_MANIFESTATION_NAME_RU = 'Проявление духов'
export const MYSTICAL_CONNECTION_NAME_RU = 'Мистическая связь'
export const SPIRIT_GUARDIANS_NAME_RU = 'Духовные стражи'
export const GUIDANCE_NAME_RU = 'Указание'

export const FORBIDDEN_SPIRITS_FROM_BEYOND_NAME_RU = 'Духи извне'
export const FORBIDDEN_TALES_FROM_BEYOND_NAME_RU = 'Сказания извне'
export const FORBIDDEN_SPIRIT_SESSION_NAME_RU = 'Сеанс духов'

/* ------------------------------------------------------------------ */
/* Feature / pool ids                                                  */
/* ------------------------------------------------------------------ */

export const MOONS_INSPIRATION_FEATURE_ID = 'moons-inspiration'
export const PRIMAL_LORE_FEATURE_ID = 'primal-lore'
export const BLESSING_OF_MOONLIGHT_FEATURE_ID = 'blessing-of-moonlight'
export const EVENTIDES_SPLENDOR_FEATURE_ID = 'eventides-splendor'

export const CHANNELER_FEATURE_ID = 'channeler'
export const SPIRITS_FROM_BEYOND_FEATURE_ID = 'spirits-from-beyond'
export const EMPOWERED_CHANNELING_FEATURE_ID = 'empowered-channeling'
export const MYSTICAL_CONNECTION_FEATURE_ID = 'mystical-connection'

export const MOONLIGHT_BLESSING_POOL_ID = 'moonlight_blessing'
export const SPIRIT_GUARDIANS_FREE_POOL_ID = 'spirit_guardians_free'
export const SPIRIT_GUARDIANS_COVER_POOL_ID = 'spirit_guardians_cover'

export const PRIMAL_LORE_CANTRIP_PICK = 'primal_lore_cantrip'
export const PRIMAL_LORE_SKILL_PICK = 'primal_lore_skill'
export const SPIRITS_BANK_PICK = 'spirits_from_beyond_bank'
export const LUNAR_VITALITY_TURN_PICK = 'lunar_vitality_used_this_turn'
export const FORCES_FROM_BEYOND_TURN_PICK = 'forces_from_beyond_used_this_turn'

export const PLAYING_CARDS_TOOL_KEY = 'playing-card-set'
export const PLAYING_CARDS_TOOL_NAME_RU = 'Набор игральных карт'

/* ------------------------------------------------------------------ */
/* Create picks — Primal Lore                                          */
/* ------------------------------------------------------------------ */

export const PRIMAL_LORE_SKILLS_2024 = [
  'perception',
  'survival',
  'medicine',
  'animal_handling',
  'nature',
  'insight',
] as const

export const PRIMAL_LORE_SKILL_LABELS_RU: Record<string, string> = {
  perception: 'Восприятие',
  survival: 'Выживание',
  medicine: 'Медицина',
  animal_handling: 'Обращение с животными',
  nature: 'Природа',
  insight: 'Проницательность',
}

/** Curated Druid cantrips for Primal Lore (create / e2e). */
export const PRIMAL_LORE_CANTRIPS_2024 = [
  'druidcraft',
  'guidance',
  'mending',
  'message',
  'poison-spray',
  'produce-flame',
  'resistance',
  'shillelagh',
  'spare-the-dying',
  'starry-wisp',
  'elementalism',
] as const

export const PRIMAL_LORE_CANTRIP_LABELS_RU: Record<string, string> = {
  druidcraft: 'Искусство друидов',
  guidance: 'Указание',
  mending: 'Починка',
  message: 'Сообщение',
  'poison-spray': 'Ядовистые брызги',
  'produce-flame': 'Сотворение пламени',
  resistance: 'Сопротивление',
  shillelagh: 'Дубинка',
  'spare-the-dying': 'Уход за умирающим',
  'starry-wisp': 'Звёздный светлячок',
  elementalism: 'Элементализм',
}

export const primalLoreSkillChoice2024: FeatureChoiceDef = {
  id: PRIMAL_LORE_SKILL_PICK,
  label: `${PRIMAL_LORE_NAME_RU}: навык`,
  pick: 1,
  options: PRIMAL_LORE_SKILLS_2024.map((id) => ({
    id,
    label: PRIMAL_LORE_SKILL_LABELS_RU[id] || id,
  })),
}

export const primalLoreCantripChoice2024: FeatureChoiceDef = {
  id: PRIMAL_LORE_CANTRIP_PICK,
  label: `${PRIMAL_LORE_NAME_RU}: заговор друида`,
  pick: 1,
  options: PRIMAL_LORE_CANTRIPS_2024.map((id) => ({
    id,
    label: PRIMAL_LORE_CANTRIP_LABELS_RU[id] || id,
  })),
}

/* ------------------------------------------------------------------ */
/* Spirit table (RTW 2024 — not 2014 Tales from Beyond)                */
/* ------------------------------------------------------------------ */

export type SpiritFromBeyond2024 = {
  roll: number
  id: string
  nameRu: string
  /** Short effect hint for desk feed. */
  effectRu: string
  dieRolls: number
  usesCha: boolean
  usesBardLevel: boolean
  save?: 'wis' | 'dex' | 'con' | 'str' | null
}

export const SPIRITS_FROM_BEYOND_TABLE_2024: readonly SpiritFromBeyond2024[] = [
  {
    roll: 1,
    id: 'beloved',
    nameRu: 'Возлюбленный',
    effectRu: 'Хиты = кость + мод. Харизмы',
    dieRolls: 1,
    usesCha: true,
    usesBardLevel: false,
  },
  {
    roll: 2,
    id: 'archer',
    nameRu: 'Стрелок',
    effectRu: 'Силовой урон = кость + мод. Харизмы',
    dieRolls: 1,
    usesCha: true,
    usesBardLevel: false,
  },
  {
    roll: 3,
    id: 'avenger',
    nameRu: 'Мститель',
    effectRu: 'Силовой урон = кость каждому, кто попадает рукопашной',
    dieRolls: 1,
    usesCha: false,
    usesBardLevel: false,
  },
  {
    roll: 4,
    id: 'renegade',
    nameRu: 'Отступник',
    effectRu: 'Реакция: телепорт 30 фт.',
    dieRolls: 0,
    usesCha: false,
    usesBardLevel: false,
  },
  {
    roll: 5,
    id: 'seer',
    nameRu: 'Предсказатель',
    effectRu: 'Преимущество на Тесты к20',
    dieRolls: 0,
    usesCha: false,
    usesBardLevel: false,
  },
  {
    roll: 6,
    id: 'wanderer',
    nameRu: 'Странник',
    effectRu: 'Вр. хиты = кость + ур. Барда; Скорость +10',
    dieRolls: 1,
    usesCha: false,
    usesBardLevel: true,
  },
  {
    roll: 7,
    id: 'trickster',
    nameRu: 'Проказник',
    effectRu: 'Спас Мудрости; Психический = 2×кость; Очарованный',
    dieRolls: 2,
    usesCha: false,
    usesBardLevel: false,
    save: 'wis',
  },
  {
    roll: 8,
    id: 'shadow',
    nameRu: 'Тень',
    effectRu: 'Невидимость; затем Некротический = 2×кость в 5 фт.',
    dieRolls: 2,
    usesCha: false,
    usesBardLevel: false,
    save: 'con',
  },
  {
    roll: 9,
    id: 'firebrand',
    nameRu: 'Поджигатель',
    effectRu: 'Спас Ловкости; Огонь = 4×кость',
    dieRolls: 4,
    usesCha: false,
    usesBardLevel: false,
    save: 'dex',
  },
  {
    roll: 10,
    id: 'coward',
    nameRu: 'Трус',
    effectRu: 'Спас Мудрости или Испуганный (эманация 30 фт.)',
    dieRolls: 0,
    usesCha: false,
    usesBardLevel: false,
    save: 'wis',
  },
  {
    roll: 11,
    id: 'strongman',
    nameRu: 'Силач',
    effectRu: 'Спас Силы; Звук = 3×кость и Опрокинутый',
    dieRolls: 3,
    usesCha: false,
    usesBardLevel: false,
    save: 'str',
  },
  {
    roll: 12,
    id: 'priest',
    nameRu: 'Жрец',
    effectRu: 'Хиты = 2×кость; снять одно состояние',
    dieRolls: 2,
    usesCha: false,
    usesBardLevel: false,
  },
]

export function spiritFromBeyondByRoll2024(roll: number): SpiritFromBeyond2024 | null {
  return SPIRITS_FROM_BEYOND_TABLE_2024.find((row) => row.roll === roll) ?? null
}

/** Max spirit number selectable for guided summon given BI die faces. */
export function spiritsGuidedMaxRoll2024(dieFaces: number): number {
  const faces = Math.max(6, Math.min(12, Math.floor(dieFaces) || 6))
  return Math.min(12, faces)
}

export function spiritsAvailableForDie2024(dieFaces: number): SpiritFromBeyond2024[] {
  const max = spiritsGuidedMaxRoll2024(dieFaces)
  return SPIRITS_FROM_BEYOND_TABLE_2024.filter((row) => row.roll <= max)
}

export type SpiritBankEntry2024 = { roll: number; id: string; nameRu: string }

export function parseSpiritsBank2024(raw: string | null | undefined): SpiritBankEntry2024[] {
  const text = String(raw || '').trim()
  if (!text) return []
  const out: SpiritBankEntry2024[] = []
  for (const part of text.split('|')) {
    const [rollRaw, idRaw] = part.split(':')
    const roll = Number(rollRaw)
    const row = spiritFromBeyondByRoll2024(roll)
    if (!row) continue
    const id = String(idRaw || row.id).trim() || row.id
    out.push({ roll: row.roll, id, nameRu: row.nameRu })
  }
  return out
}

export function serializeSpiritsBank2024(bank: SpiritBankEntry2024[]): string {
  return bank.map((row) => `${row.roll}:${row.id}`).join('|')
}

export function readSpiritsBank2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): SpiritBankEntry2024[] {
  return parseSpiritsBank2024(getFeaturePick(picks, classEntryId, SPIRITS_BANK_PICK))
}

/* ------------------------------------------------------------------ */
/* Always-prepared wrappers                                            */
/* ------------------------------------------------------------------ */

export function moonAlwaysPrepared2024(level: number): string[] {
  return alwaysPreparedForSubclass2024('bard__college-of-the-moon', level)
}

export function spiritsAlwaysPrepared2024(level: number): string[] {
  return alwaysPreparedForSubclass2024('bard__college-of-the-spirits', level)
}

export function readPrimalLoreSkill2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string | null {
  const raw = getFeatureChoicePick(picks, classEntryId, PRIMAL_LORE_SKILL_PICK)
  const key = String(raw || '')
    .trim()
    .toLowerCase()
  return (PRIMAL_LORE_SKILLS_2024 as readonly string[]).includes(key) ? key : null
}

export function readPrimalLoreCantrip2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string | null {
  const list = getFeatureChoicePickList(picks, classEntryId, PRIMAL_LORE_CANTRIP_PICK)
  const fromList = list[0]
  const raw = fromList || getFeaturePick(picks, classEntryId, PRIMAL_LORE_CANTRIP_PICK)
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
  return (PRIMAL_LORE_CANTRIPS_2024 as readonly string[]).includes(key) ? key : null
}

export function bardBookFeatureIdsAtLevel2024(
  subclassSlug: string | null | undefined,
  level: number,
): string[] {
  const lv = Math.max(0, Math.floor(level))
  if (isCollegeOfTheMoon2024(subclassSlug)) {
    const out = ['moons-inspiration', 'primal-lore']
    if (lv >= 6) out.push('blessing-of-moonlight')
    if (lv >= 14) out.push('eventides-splendor')
    return out
  }
  if (isCollegeOfTheSpirits2024(subclassSlug)) {
    const out = ['channeler', 'spirits-from-beyond']
    if (lv >= 6) out.push('empowered-channeling')
    if (lv >= 14) out.push('mystical-connection')
    return out
  }
  return []
}

/** Create-pipeline need flags for Bard book picks. */
export function bardBookCreatePicksNeed2024(input: {
  subclassSlug: string | null | undefined
  bardLevel: number
  classOptionPicks: Record<string, unknown>
}): {
  primalCantrip: boolean
  primalSkill: boolean
  any: boolean
} {
  const level = Math.max(0, Math.floor(input.bardLevel))
  const moon = isCollegeOfTheMoon2024(input.subclassSlug) && level >= 3
  const skill = String(input.classOptionPicks.primal_lore_skill || '')
    .trim()
    .toLowerCase()
  const cantripRaw = input.classOptionPicks.primal_lore_cantrip
  const cantrip = Array.isArray(cantripRaw)
    ? String(cantripRaw[0] || '')
        .trim()
        .toLowerCase()
    : String(cantripRaw || '')
        .trim()
        .toLowerCase()
  const needSkill =
    moon && !(PRIMAL_LORE_SKILLS_2024 as readonly string[]).includes(skill)
  const needCantrip =
    moon &&
    !(PRIMAL_LORE_CANTRIPS_2024 as readonly string[]).includes(cantrip.replace(/_/g, '-'))
  return {
    primalCantrip: needCantrip,
    primalSkill: needSkill,
    any: needCantrip || needSkill,
  }
}
