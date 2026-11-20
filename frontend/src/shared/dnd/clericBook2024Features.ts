/**
 * P24-M02B-cleric: AU Arcana + FRHoF Knowledge + RTW Grave book subclass helpers.
 * Callers must branch on rules_edition === '2024'; does not feed the 2014 pack.
 */

import type { FeatureChoiceDef } from './classFeatures'
import { alwaysPreparedForSubclass2024 } from './edition2024Subclasses'
import {
  getFeatureChoicePick,
  getFeatureChoicePickList,
  getFeaturePick,
  type FeaturePicksState,
} from './featurePicks'

export const M02B_CLERIC_BOOK_SLUGS = [
  'cleric__arcana-domain',
  'cleric__knowledge-domain',
  'cleric__grave-domain',
] as const

export type M02bClericBookSlug = (typeof M02B_CLERIC_BOOK_SLUGS)[number]

export function isM02bClericBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_CLERIC_BOOK_SLUGS as readonly string[]).includes(key)
}

export function isArcanaDomain2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === 'cleric__arcana-domain'
}

export function isKnowledgeDomain2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === 'cleric__knowledge-domain'
}

export function isGraveDomain2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === 'cleric__grave-domain'
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL for this pack)                                    */
/* ------------------------------------------------------------------ */

export const ARCANA_DOMAIN_NAME_RU = 'Домен магии'
export const KNOWLEDGE_DOMAIN_NAME_RU = 'Домен знания'
export const GRAVE_DOMAIN_NAME_RU = 'Домен упокоения'

export const ARCANA_DOMAIN_SPELLS_NAME_RU = 'Заклинания домена магии'
export const MODIFY_MAGIC_NAME_RU = 'Изменение магии'
export const FORTIFYING_SPELL_NAME_RU = 'Укрепляющее заклинание'
export const TENACIOUS_SPELL_NAME_RU = 'Упорное заклинание'
export const STUDENT_OF_ARCANA_NAME_RU = 'Изучающий магию'
export const DISPELLING_RECOVERY_NAME_RU = 'Рассеивающее восстановление'
export const MAGICAL_MASTERY_NAME_RU = 'Магическая искусность'

export const KNOWLEDGE_DOMAIN_SPELLS_NAME_RU = 'Заклинания домена знаний'
export const BLESSINGS_OF_KNOWLEDGE_NAME_RU = 'Благословенные знания'
export const MIND_MAGIC_NAME_RU = 'Магия разума'
export const UNFETTERED_MIND_NAME_RU = 'Разум освобождённый'
export const DIVINE_FOREKNOWLEDGE_NAME_RU = 'Божественное предзнание'

export const GRAVE_DOMAIN_SPELLS_NAME_RU = 'Заклинания домена упокоения'
export const CIRCLE_OF_MORTALITY_NAME_RU = 'Круговорот жизни и смерти'
export const PATH_TO_THE_GRAVE_NAME_RU = 'Путь к могиле'
export const SENTINEL_AT_DEATHS_DOOR_NAME_RU = 'Страж на пороге смерти'
export const DIVINE_REAPER_NAME_RU = 'Божественный жнец'
export const PUSH_TOWARD_DEATH_NAME_RU = 'Толчок к смерти'
export const RETURN_TO_LIFE_NAME_RU = 'Возвращение к жизни'
export const IMPROVED_NECROMANCY_NAME_RU = 'Усовершенствованная некромантия'
export const KEEPER_OF_SOULS_NAME_RU = 'Хранитель душ'

export const FORBIDDEN_PATH_TO_GRAVE_2014_NAME_RU = 'Путь в могилу'

/* ------------------------------------------------------------------ */
/* Feature / pool ids                                                  */
/* ------------------------------------------------------------------ */

export const ARCANA_DOMAIN_SPELLS_FEATURE_ID = 'arcana-domain-spells'
export const MODIFY_MAGIC_FEATURE_ID = 'modify-magic'
export const STUDENT_OF_ARCANA_FEATURE_ID = 'student-of-arcana'
export const DISPELLING_RECOVERY_FEATURE_ID = 'dispelling-recovery'
export const MAGICAL_MASTERY_FEATURE_ID = 'magical-mastery'

export const KNOWLEDGE_DOMAIN_SPELLS_FEATURE_ID = 'knowledge-domain-spells'
export const BLESSINGS_OF_KNOWLEDGE_FEATURE_ID = 'blessings-of-knowledge'
export const MIND_MAGIC_FEATURE_ID = 'mind-magic'
export const UNFETTERED_MIND_FEATURE_ID = 'unfettered-mind'
export const DIVINE_FOREKNOWLEDGE_FEATURE_ID = 'divine-foreknowledge'

export const GRAVE_DOMAIN_SPELLS_FEATURE_ID = 'grave-domain-spells'
export const CIRCLE_OF_MORTALITY_FEATURE_ID = 'circle-of-mortality'
export const PATH_TO_THE_GRAVE_FEATURE_ID = 'path-to-the-grave'
export const SENTINEL_AT_DEATHS_DOOR_FEATURE_ID = 'sentinel-at-death-s-door'
export const DIVINE_REAPER_FEATURE_ID = 'divine-reaper'

export const DISPELLING_RECOVERY_POOL_ID = 'dispelling_recovery'
export const DIVINE_FOREKNOWLEDGE_POOL_ID = 'divine_foreknowledge'
export const SENTINEL_AT_DEATHS_DOOR_POOL_ID = 'sentinel_at_deaths_door'
export const KEEPER_OF_SOULS_POOL_ID = 'keeper_of_souls'

export const PATH_TO_THE_GRAVE_ACTIVE_PICK = 'path_to_the_grave_active'
export const CIRCLE_MORTALITY_TURN_PICK = 'circle_mortality_used_this_turn'
export const DIVINE_FOREKNOWLEDGE_ACTIVE_PICK = 'divine_foreknowledge_active'

/* ------------------------------------------------------------------ */
/* Create picks                                                        */
/* ------------------------------------------------------------------ */

/** Cleric L1 skill list (PHB 2024) + Arcana for Student of Arcana. */
export const STUDENT_OF_ARCANA_SKILLS_2024 = [
  'history',
  'insight',
  'medicine',
  'persuasion',
  'religion',
  'arcana',
] as const

export const STUDENT_OF_ARCANA_SKILL_LABELS_RU: Record<string, string> = {
  history: 'История',
  insight: 'Проницательность',
  medicine: 'Медицина',
  persuasion: 'Убеждение',
  religion: 'Религия',
  arcana: 'Тайная магия',
}

/** Curated wizard cantrips for Student of Arcana (create / e2e). */
export const STUDENT_OF_ARCANA_CANTRIPS_2024 = [
  'mage-hand',
  'prestidigitation',
  'light',
  'minor-illusion',
  'ray-of-frost',
  'fire-bolt',
  'shocking-grasp',
  'blade-ward',
  'friends',
  'message',
  'mending',
  'dancing-lights',
  'acid-splash',
  'poison-spray',
  'true-strike',
] as const

export const STUDENT_OF_ARCANA_CANTRIP_LABELS_RU: Record<string, string> = {
  'mage-hand': 'Волшебная рука',
  prestidigitation: 'Фокусы',
  light: 'Свет',
  'minor-illusion': 'Малая иллюзия',
  'ray-of-frost': 'Луч холода',
  'fire-bolt': 'Огненный снаряд',
  'shocking-grasp': 'Шоковое касание',
  'blade-ward': 'Защита от оружия',
  friends: 'Дружба',
  message: 'Сообщение',
  mending: 'Починка',
  'dancing-lights': 'Пляшущие огоньки',
  'acid-splash': 'Брызги кислоты',
  'poison-spray': 'Ядовитые брызги',
  'true-strike': 'Меткий удар',
}

export const BLESSINGS_OF_KNOWLEDGE_SKILLS_2024 = [
  'history',
  'nature',
  'religion',
  'arcana',
] as const

export const BLESSINGS_OF_KNOWLEDGE_SKILL_LABELS_RU: Record<string, string> = {
  history: 'История',
  nature: 'Природа',
  religion: 'Религия',
  arcana: 'Тайная магия',
}

/** Artisan tool keys used in create (subset of kit). */
export const BLESSINGS_OF_KNOWLEDGE_TOOLS_2024 = [
  'alchemists-supplies',
  'brewers-supplies',
  'calligraphers-supplies',
  'carpenters-tools',
  'cartographers-tools',
  'cobblers-tools',
  'cooks-utensils',
  'glassblowers-tools',
  'jewelers-tools',
  'leatherworkers-tools',
  'masons-tools',
  'painters-supplies',
  'potters-tools',
  'smiths-tools',
  'tinkers-tools',
  'weavers-tools',
  'woodcarvers-tools',
] as const

export const BLESSINGS_OF_KNOWLEDGE_TOOL_LABELS_RU: Record<string, string> = {
  'alchemists-supplies': 'Инструменты алхимика',
  'brewers-supplies': 'Инструменты пивовара',
  'calligraphers-supplies': 'Инструменты каллиграфа',
  'carpenters-tools': 'Инструменты плотника',
  'cartographers-tools': 'Инструменты картографа',
  'cobblers-tools': 'Инструменты сапожника',
  'cooks-utensils': 'Кухонные принадлежности',
  'glassblowers-tools': 'Инструменты стеклодува',
  'jewelers-tools': 'Инструменты ювелира',
  'leatherworkers-tools': 'Инструменты кожевника',
  'masons-tools': 'Инструменты каменщика',
  'painters-supplies': 'Инструменты художника',
  'potters-tools': 'Инструменты гончара',
  'smiths-tools': 'Инструменты кузнеца',
  'tinkers-tools': 'Инструменты жестянщика',
  'weavers-tools': 'Инструменты ткача',
  'woodcarvers-tools': 'Инструменты резчика',
}

export const UNFETTERED_SAVE_OPTIONS_2024 = ['str', 'dex', 'con', 'cha'] as const

export const UNFETTERED_SAVE_LABELS_RU: Record<string, string> = {
  str: 'Сила',
  dex: 'Ловкость',
  con: 'Телосложение',
  cha: 'Харизма',
}

/** Curated wizard spells for Magical Mastery (one per circle 6–9). */
export const MAGICAL_MASTERY_SPELLS_BY_CIRCLE_2024: Record<6 | 7 | 8 | 9, readonly string[]> = {
  6: ['disintegrate', 'globe-of-invulnerability', 'mass-suggestion', 'true-seeing', 'chain-lightning'],
  7: ['teleport', 'finger-of-death', 'forcecage', 'plane-shift', 'etherealness'],
  8: ['dominate-monster', 'maze', 'mind-blank', 'power-word-stun', 'sunburst'],
  9: ['wish', 'foresight', 'time-stop', 'true-polymorph', 'power-word-kill'],
}

export const MAGICAL_MASTERY_SPELL_LABELS_RU: Record<string, string> = {
  disintegrate: 'Дезинтеграция',
  'globe-of-invulnerability': 'Шар неуязвимости',
  'mass-suggestion': 'Массовое внушение',
  'true-seeing': 'Истинное зрение',
  'chain-lightning': 'Цепная молния',
  teleport: 'Телепортация',
  'finger-of-death': 'Перст смерти',
  forcecage: 'Силовая клетка',
  'plane-shift': 'Уход в иной мир',
  etherealness: 'Эфирность',
  'dominate-monster': 'Подчинение чудовища',
  maze: 'Лабиринт',
  'mind-blank': 'Чистый разум',
  'power-word-stun': 'Слово силы: оглушение',
  sunburst: 'Солнечный всполох',
  wish: 'Исполнение желаний',
  foresight: 'Предвидение',
  'time-stop': 'Остановка времени',
  'true-polymorph': 'Истинное превращение',
  'power-word-kill': 'Слово силы: смерть',
}

/** Knowledge domain divination spells eligible for Mind Magic. */
export const KNOWLEDGE_DOMAIN_DIVINATION_SPELLS_2024 = [
  'detect-magic',
  'detect-thoughts',
  'identify',
  'comprehend-languages',
  'mind-spike',
  'tongues',
  'arcane-eye',
  'legend-lore',
  'scrying',
] as const

export const studentOfArcanaSkillChoice2024: FeatureChoiceDef = {
  id: 'student_of_arcana_skill',
  label_ru: `${STUDENT_OF_ARCANA_NAME_RU}: навык`,
  max_picks: 1,
  options: [...STUDENT_OF_ARCANA_SKILLS_2024],
  option_labels_ru: STUDENT_OF_ARCANA_SKILL_LABELS_RU,
}

export const studentOfArcanaCantripsChoice2024: FeatureChoiceDef = {
  id: 'student_of_arcana_cantrips',
  label_ru: `${STUDENT_OF_ARCANA_NAME_RU}: заговоры волшебника`,
  max_picks: 2,
  options: [...STUDENT_OF_ARCANA_CANTRIPS_2024],
  option_labels_ru: STUDENT_OF_ARCANA_CANTRIP_LABELS_RU,
}

export const blessingsOfKnowledgeToolChoice2024: FeatureChoiceDef = {
  id: 'blessings_of_knowledge_tool',
  label_ru: `${BLESSINGS_OF_KNOWLEDGE_NAME_RU}: инструмент`,
  max_picks: 1,
  options: [...BLESSINGS_OF_KNOWLEDGE_TOOLS_2024],
  option_labels_ru: BLESSINGS_OF_KNOWLEDGE_TOOL_LABELS_RU,
}

export const blessingsOfKnowledgeSkillsChoice2024: FeatureChoiceDef = {
  id: 'blessings_of_knowledge_skills',
  label_ru: `${BLESSINGS_OF_KNOWLEDGE_NAME_RU}: навыки`,
  max_picks: 2,
  options: [...BLESSINGS_OF_KNOWLEDGE_SKILLS_2024],
  option_labels_ru: BLESSINGS_OF_KNOWLEDGE_SKILL_LABELS_RU,
}

export const unfetteredMindSaveChoice2024: FeatureChoiceDef = {
  id: 'unfettered_mind_save',
  label_ru: `${UNFETTERED_MIND_NAME_RU}: спасбросок`,
  max_picks: 1,
  options: [...UNFETTERED_SAVE_OPTIONS_2024],
  option_labels_ru: UNFETTERED_SAVE_LABELS_RU,
}

export function magicalMasteryChoice2024(circle: 6 | 7 | 8 | 9): FeatureChoiceDef {
  return {
    id: `magical_mastery_${circle}`,
    label_ru: `${MAGICAL_MASTERY_NAME_RU}: ${circle}-й круг`,
    max_picks: 1,
    options: [...MAGICAL_MASTERY_SPELLS_BY_CIRCLE_2024[circle]],
    option_labels_ru: MAGICAL_MASTERY_SPELL_LABELS_RU,
  }
}

/* ------------------------------------------------------------------ */
/* Always-prepared + helpers                                           */
/* ------------------------------------------------------------------ */

export function arcanaAlwaysPrepared2024(clericLevel: number): string[] {
  return alwaysPreparedForSubclass2024('cleric__arcana-domain', Math.max(0, Math.floor(clericLevel)))
}

export function knowledgeAlwaysPrepared2024(clericLevel: number): string[] {
  return alwaysPreparedForSubclass2024(
    'cleric__knowledge-domain',
    Math.max(0, Math.floor(clericLevel)),
  )
}

export function graveAlwaysPrepared2024(clericLevel: number): string[] {
  return alwaysPreparedForSubclass2024('cleric__grave-domain', Math.max(0, Math.floor(clericLevel)))
}

export function circleMortalityExtraDie2024(clericLevel: number): string {
  return Math.max(0, Math.floor(clericLevel)) >= 11 ? '1к6' : '1к4'
}

export function modifyMagicTempHpFormulaRu2024(clericLevel: number): string {
  return `2к8+${Math.max(0, Math.floor(clericLevel))}`
}

export function pathToTheGraveExtraDamage2024(clericLevel: number): number {
  return Math.max(0, Math.floor(clericLevel))
}

export function keeperOfSoulsHeal2024(clericLevel: number): number {
  return Math.max(0, Math.floor(clericLevel)) * 2
}

export function sentinelPoolMax2024(wisMod: number): number {
  return Math.max(1, Math.floor(wisMod))
}

/* ------------------------------------------------------------------ */
/* Feature pick readers                                                */
/* ------------------------------------------------------------------ */

function readSingle(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
  featureId: string,
  choiceId: string,
  allowed: readonly string[],
): string | null {
  if (!picks) return null
  const raw =
    getFeatureChoicePick(picks, classEntryId, featureId, choiceId) ??
    getFeaturePick(picks, classEntryId, choiceId) ??
    getFeaturePick(picks, classEntryId, featureId)
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
  return allowed.includes(key) ? key : null
}

function readList(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
  featureId: string,
  choiceId: string,
  allowed: readonly string[],
  max: number,
): string[] {
  if (!picks) return []
  const raw = getFeatureChoicePickList(picks, classEntryId, featureId, choiceId)
  const out: string[] = []
  for (const item of raw) {
    const key = String(item || '')
      .trim()
      .toLowerCase()
    if (!allowed.includes(key) || out.includes(key)) continue
    out.push(key)
    if (out.length >= max) break
  }
  return out
}

export function readStudentOfArcanaSkill2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string | null {
  return readSingle(
    picks,
    classEntryId,
    STUDENT_OF_ARCANA_FEATURE_ID,
    'student_of_arcana_skill',
    STUDENT_OF_ARCANA_SKILLS_2024,
  )
}

export function readStudentOfArcanaCantrips2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string[] {
  return readList(
    picks,
    classEntryId,
    STUDENT_OF_ARCANA_FEATURE_ID,
    'student_of_arcana_cantrips',
    STUDENT_OF_ARCANA_CANTRIPS_2024,
    2,
  )
}

export function readBlessingsTool2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string | null {
  return readSingle(
    picks,
    classEntryId,
    BLESSINGS_OF_KNOWLEDGE_FEATURE_ID,
    'blessings_of_knowledge_tool',
    BLESSINGS_OF_KNOWLEDGE_TOOLS_2024,
  )
}

export function readBlessingsSkills2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string[] {
  return readList(
    picks,
    classEntryId,
    BLESSINGS_OF_KNOWLEDGE_FEATURE_ID,
    'blessings_of_knowledge_skills',
    BLESSINGS_OF_KNOWLEDGE_SKILLS_2024,
    2,
  )
}

export function readUnfetteredSave2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string | null {
  return readSingle(
    picks,
    classEntryId,
    UNFETTERED_MIND_FEATURE_ID,
    'unfettered_mind_save',
    UNFETTERED_SAVE_OPTIONS_2024,
  )
}

export function readMagicalMasterySpell2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
  circle: 6 | 7 | 8 | 9,
): string | null {
  return readSingle(
    picks,
    classEntryId,
    MAGICAL_MASTERY_FEATURE_ID,
    `magical_mastery_${circle}`,
    MAGICAL_MASTERY_SPELLS_BY_CIRCLE_2024[circle],
  )
}

export function magicalMasteryAlwaysPrepared2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
  clericLevel: number,
): string[] {
  if (Math.max(0, Math.floor(clericLevel)) < 17) return []
  const out: string[] = []
  for (const circle of [6, 7, 8, 9] as const) {
    const spell = readMagicalMasterySpell2024(picks, classEntryId, circle)
    if (spell) out.push(spell)
  }
  return out
}

export function clericBookFeatureIdsAtLevel2024(input: {
  subclassSlug: string | null | undefined
  clericLevel: number
}): string[] {
  const level = Math.max(0, Math.floor(input.clericLevel))
  const slug = String(input.subclassSlug || '')
    .trim()
    .toLowerCase()
  if (!isM02bClericBookSubclass(slug) || level < 3) return []
  const out: string[] = []
  if (isArcanaDomain2024(slug)) {
    out.push(
      ARCANA_DOMAIN_SPELLS_FEATURE_ID,
      MODIFY_MAGIC_FEATURE_ID,
      STUDENT_OF_ARCANA_FEATURE_ID,
    )
    if (level >= 6) out.push(DISPELLING_RECOVERY_FEATURE_ID)
    if (level >= 17) out.push(MAGICAL_MASTERY_FEATURE_ID)
  } else if (isKnowledgeDomain2024(slug)) {
    out.push(
      KNOWLEDGE_DOMAIN_SPELLS_FEATURE_ID,
      BLESSINGS_OF_KNOWLEDGE_FEATURE_ID,
      MIND_MAGIC_FEATURE_ID,
    )
    if (level >= 6) out.push(UNFETTERED_MIND_FEATURE_ID)
    if (level >= 17) out.push(DIVINE_FOREKNOWLEDGE_FEATURE_ID)
  } else if (isGraveDomain2024(slug)) {
    out.push(
      GRAVE_DOMAIN_SPELLS_FEATURE_ID,
      CIRCLE_OF_MORTALITY_FEATURE_ID,
      PATH_TO_THE_GRAVE_FEATURE_ID,
    )
    if (level >= 6) out.push(SENTINEL_AT_DEATHS_DOOR_FEATURE_ID)
    if (level >= 17) out.push(DIVINE_REAPER_FEATURE_ID)
  }
  return out
}
