/**
 * P24-M02a: 2024 class tables / resources / spell prep / multiclass.
 * Mirror of backend/app/dnd/edition_2024_classes.py. Never feeds 2014 packs.
 */

import classesSrd from './data/edition2024/classes_srd.json'
import classesEfa from './data/edition2024/classes_efa.json'
import type {
  ClassFeatureDef,
  FeatureChoiceDef,
  FeatureKind,
  FeatureResource,
  UnlockedFeature,
} from './classFeatures'
import type { ClassLevelEntry } from './classLevels'
import type { DesiredFeatureResource } from './featureResources'
import type { SheetResource } from './rest'
import {
  blessedStrikesChoice2024,
  clericBaseChannelOptionsAtLevel2024,
  DIVINE_SPARK_FEATURE_ID,
  divineSparkFormulaRu2024,
} from './cleric2024Features'
import { elementalFuryChoice2024 } from './druid2024Features'
import {
  alwaysPreparedForSubclass2024,
  buildPermanentBonuses2024,
  buildSubclassResources2024,
  featureAutomationMode2024,
  sharedOptionsForSubclass2024,
  SUBCLASS_CATALOG_2024,
  thirdCasterBlock2024,
  THIRD_CASTER_SUBCLASSES,
} from './edition2024Subclasses'

type CatalogFile = {
  entries: Array<{
    slug: string
    name_ru?: string
    name_en?: string
    data: Record<string, unknown>
  }>
}

const CLASS_SLUG_ALIASES: Record<string, string> = {
  варвар: 'barbarian',
  бард: 'bard',
  жрец: 'cleric',
  друид: 'druid',
  боец: 'fighter',
  воин: 'fighter',
  монах: 'monk',
  паладин: 'paladin',
  следопыт: 'ranger',
  плут: 'rogue',
  разбойник: 'rogue',
  чародей: 'sorcerer',
  колдун: 'warlock',
  варлок: 'warlock',
  волшебник: 'wizard',
  маг: 'wizard',
  изобретатель: 'artificer',
  артефактор: 'artificer',
  артифицер: 'artificer',
}

export const SRD_SUBCLASS_BY_PARENT: Record<string, string> = {
  barbarian: 'barbarian__berserker',
  bard: 'bard__lore',
  cleric: 'cleric__life-domain',
  druid: 'druid__land',
  fighter: 'fighter__champion',
  monk: 'monk__warrior-of-the-hand',
  paladin: 'paladin__oath-of-devotion',
  ranger: 'ranger__hunter-ranger',
  rogue: 'rogue__thief',
  sorcerer: 'sorcerer__draconic-sorcery',
  warlock: 'warlock__fiend-patron',
  wizard: 'wizard__evoker',
}

const MULTICLASS_MODE: Record<string, 'any' | 'all'> = {
  fighter: 'any',
  barbarian: 'all',
  bard: 'all',
  cleric: 'all',
  druid: 'all',
  monk: 'all',
  paladin: 'all',
  ranger: 'all',
  rogue: 'all',
  sorcerer: 'all',
  warlock: 'all',
  wizard: 'all',
  artificer: 'all',
}

export const MULTICLASS_PROFICIENCIES_2024: Record<
  string,
  { armor: string[]; weapons: string[]; tools: string[]; skills: number }
> = {
  barbarian: { armor: ['shields'], weapons: ['simple', 'martial'], tools: [], skills: 0 },
  bard: { armor: ['light'], weapons: [], tools: ['one_musical_instrument'], skills: 1 },
  cleric: { armor: ['light', 'medium', 'shields'], weapons: [], tools: [], skills: 0 },
  druid: { armor: ['light', 'shields'], weapons: [], tools: [], skills: 0 },
  fighter: {
    armor: ['light', 'medium', 'shields'],
    weapons: ['simple', 'martial'],
    tools: [],
    skills: 0,
  },
  monk: {
    armor: [],
    weapons: ['simple', 'light_martial_melee'],
    tools: ['one_artisan_or_instrument'],
    skills: 0,
  },
  paladin: {
    armor: ['light', 'medium', 'shields'],
    weapons: ['simple', 'martial'],
    tools: [],
    skills: 0,
  },
  ranger: {
    armor: ['light', 'medium', 'shields'],
    weapons: ['simple', 'martial'],
    tools: [],
    skills: 1,
  },
  rogue: { armor: ['light'], weapons: [], tools: ['thieves_tools'], skills: 1 },
  sorcerer: { armor: [], weapons: [], tools: [], skills: 0 },
  warlock: { armor: ['light'], weapons: [], tools: [], skills: 0 },
  wizard: { armor: [], weapons: [], tools: [], skills: 0 },
  artificer: {
    armor: ['light', 'medium', 'shields'],
    weapons: ['simple'],
    tools: ['thieves_tools', 'tinkers_tools', 'one_artisan'],
    skills: 0,
  },
}

const CASTER_PROGRESSION: Record<string, string> = {
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  sorcerer: 'full',
  wizard: 'full',
  paladin: 'half',
  ranger: 'half',
  artificer: 'half_up',
  warlock: 'pact',
  barbarian: 'none',
  fighter: 'none',
  monk: 'none',
  rogue: 'none',
}

const FULL_CASTER_SLOTS: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

type ResourceMeta = {
  name_ru: string
  reset: 'short' | 'long'
  short_rest_regain?: number
  track?: 'spend' | 'stock'
  on_hot?: boolean
  feature_id: string
  blocks_magic_action?: boolean
  distinct_from_heroic?: boolean
  uses_from?: 'proficiency_bonus' | 'cha_mod_min_1' | 'int_mod_min_1'
  fixed_uses?: number
  kind?: FeatureKind
  /** Unlock level for the badge (defaults to current class level if omitted). */
  unlock_level?: number
}

function abilityMod2024(score: number): number {
  return Math.floor((Math.max(1, Math.floor(score)) - 10) / 2)
}

const RESOURCE_META: Record<string, ResourceMeta> = {
  second_wind: {
    name_ru: 'Второе дыхание',
    reset: 'long',
    short_rest_regain: 1,
    feature_id: 'second-wind',
    kind: 'bonus',
  },
  action_surge: {
    name_ru: 'Всплеск действий',
    reset: 'short',
    feature_id: 'action-surge',
    blocks_magic_action: true,
    kind: 'resource',
  },
  indomitable: {
    name_ru: 'Непоколебимость',
    reset: 'long',
    feature_id: 'indomitable',
    kind: 'resource',
  },
  rages: {
    name_ru: 'Ярость',
    reset: 'long',
    short_rest_regain: 1,
    feature_id: 'rage',
    kind: 'bonus',
  },
  focus_points: {
    name_ru: 'Очки сосредоточенности',
    reset: 'short',
    feature_id: 'monks-focus',
    kind: 'resource',
  },
  uncanny_metabolism: {
    name_ru: 'Феноменальный метаболизм',
    reset: 'long',
    feature_id: 'uncanny-metabolism',
    fixed_uses: 1,
    kind: 'resource',
    on_hot: false,
    unlock_level: 2,
  },
  bardic_inspiration: {
    name_ru: 'Бардовское вдохновение',
    reset: 'long',
    feature_id: 'bardic-inspiration',
    distinct_from_heroic: true,
    uses_from: 'cha_mod_min_1',
    kind: 'bonus',
  },
  channel_divinity: {
    name_ru: 'Проведение божественности',
    reset: 'long',
    short_rest_regain: 1,
    feature_id: 'channel-divinity',
    kind: 'resource',
  },
  wild_shape: {
    name_ru: 'Дикий облик',
    reset: 'long',
    short_rest_regain: 1,
    feature_id: 'wild-shape',
    kind: 'action',
  },
  magic_of_making: {
    name_ru: 'Магия вещей',
    reset: 'long',
    feature_id: 'magic-of-making',
    uses_from: 'int_mod_min_1',
    kind: 'resource',
  },
  lay_on_hands_hp: {
    name_ru: 'Наложение рук',
    reset: 'long',
    feature_id: 'lay-on-hands',
    kind: 'action',
  },
  sorcery_points: {
    name_ru: 'Очки чародейства',
    reset: 'long',
    feature_id: 'font-of-magic',
    kind: 'resource',
  },
  innate_sorcery_uses: {
    name_ru: 'Врождённое чародейство',
    reset: 'long',
    feature_id: 'innate-sorcery',
    kind: 'resource',
  },
  sorcerous_restoration: {
    name_ru: 'Чародейское восстановление',
    reset: 'long',
    feature_id: 'sorcerous-restoration',
    fixed_uses: 1,
    kind: 'resource',
    on_hot: false,
    unlock_level: 5,
  },
  divine_intervention: {
    name_ru: 'Божественное вмешательство',
    reset: 'long',
    feature_id: 'divine-intervention',
    fixed_uses: 1,
    kind: 'resource',
    on_hot: false,
    unlock_level: 10,
  },
  magical_cunning: {
    name_ru: 'Магическая искусность',
    reset: 'long',
    feature_id: 'magical-cunning',
    fixed_uses: 1,
    kind: 'resource',
    on_hot: false,
    unlock_level: 2,
  },
  contact_patron: {
    name_ru: 'Связь с покровителем',
    reset: 'long',
    feature_id: 'contact-patron',
    fixed_uses: 1,
    kind: 'resource',
    on_hot: false,
    unlock_level: 9,
  },
  mystic_arcanum_6: {
    name_ru: 'Таинственный арканум (6 круг)',
    reset: 'long',
    feature_id: 'mystic-arcanum-6',
    fixed_uses: 1,
    kind: 'resource',
    on_hot: false,
    unlock_level: 11,
  },
  mystic_arcanum_7: {
    name_ru: 'Таинственный арканум (7 круг)',
    reset: 'long',
    feature_id: 'mystic-arcanum-7',
    fixed_uses: 1,
    kind: 'resource',
    on_hot: false,
    unlock_level: 13,
  },
  mystic_arcanum_8: {
    name_ru: 'Таинственный арканум (8 круг)',
    reset: 'long',
    feature_id: 'mystic-arcanum-8',
    fixed_uses: 1,
    kind: 'resource',
    on_hot: false,
    unlock_level: 15,
  },
  mystic_arcanum_9: {
    name_ru: 'Таинственный арканум (9 круг)',
    reset: 'long',
    feature_id: 'mystic-arcanum-9',
    fixed_uses: 1,
    kind: 'resource',
    on_hot: false,
    unlock_level: 17,
  },
  favored_enemy_uses: {
    name_ru: 'Заклятый враг',
    reset: 'long',
    feature_id: 'favored-enemy',
    kind: 'resource',
  },
  arcane_recovery: {
    name_ru: 'Магическое восстановление',
    reset: 'long',
    feature_id: 'arcane-recovery',
    fixed_uses: 1,
    kind: 'resource',
    on_hot: false,
  },
}

const SCALE_KEYS = new Set([
  'rage_damage',
  'bardic_inspiration_die',
  'sneak_attack',
  'martial_arts_die',
  'unarmored_movement_ft',
  'eldritch_invocations',
  'replicate_plans_known',
  'replicate_magic_items',
  'weapon_mastery',
])

function buildClassCatalog(): Record<string, { slug: string; name_ru: string; data: Record<string, unknown> }> {
  const out: Record<string, { slug: string; name_ru: string; data: Record<string, unknown> }> = {}
  for (const file of [classesSrd, classesEfa] as CatalogFile[]) {
    for (const entry of file.entries) {
      const slug = String(entry.slug || '')
        .trim()
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/_/g, '-')
      if (!slug) continue
      out[slug] = {
        slug,
        name_ru: entry.name_ru || slug,
        data: entry.data || {},
      }
    }
  }
  return out
}

const CLASS_CATALOG = buildClassCatalog()
const SUBCLASS_CATALOG = SUBCLASS_CATALOG_2024

export function normalizeClassSlug2024(value: string | null | undefined): string | null {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (!raw) return null
  if (CLASS_SLUG_ALIASES[raw]) return CLASS_SLUG_ALIASES[raw]
  const cleaned = raw.replace(/ /g, '-').replace(/_/g, '-')
  if (cleaned in CLASS_CATALOG) return cleaned
  return null
}

export function proficiencyBonusForLevel2024(totalLevel: number): number {
  const lv = Math.min(20, Math.max(1, Math.floor(totalLevel) || 1))
  return Math.floor((lv - 1) / 4) + 2
}

export function actionSurgeAllowsAction2024(actionKind: string | null | undefined): boolean {
  const kind = String(actionKind || '')
    .trim()
    .toLowerCase()
  if (kind === 'magic' || kind === 'магия' || kind === 'cast' || kind === 'spell') return false
  return true
}

export type SpellcastingBlock2024 = {
  class_slug: string
  progression: string
  cantrips: number
  prepared_spells: number
  slots: Record<string, number>
  pact_slots: { level: number; count: number } | null
  always_prepared: string[]
  subclass_slug?: string | null
  spells_known?: number | null
  ability?: string | null
}

export type ClassProgressSnapshot2024 = {
  total_level: number
  proficiency_bonus: number
  features: UnlockedFeature[]
  desiredResources: DesiredFeatureResource[]
  scales: Record<string, unknown>
  spellcasting: SpellcastingBlock2024[]
  multiclass_slots: Record<string, number>
  multiclass_pact: { level: number; count: number } | null
  feat_levels_reached: number[]
  epic_boon_reached: boolean
  subclass_level: number
}

function classLevelRow(slug: string, level: number): Record<string, unknown> | null {
  const catalog = CLASS_CATALOG[slug]
  if (!catalog) return null
  const lv = Math.min(20, Math.max(1, Math.floor(level) || 1))
  const levels = (catalog.data.levels as Array<Record<string, unknown>>) || []
  return levels.find((row) => Number(row.level) === lv) || null
}

function stockLabels2024(poolId: string): {
  stock_gain_label_ru?: string
  stock_spend_label_ru?: string
} {
  if (poolId === 'arcane_ward') {
    return { stock_gain_label_ru: 'Ручная поправка +1', stock_spend_label_ru: 'Урон по щиту' }
  }
  if (poolId === 'portent') {
    return { stock_gain_label_ru: 'Записать кость', stock_spend_label_ru: 'Потратить знамение' }
  }
  return {}
}

function featureKindFor(id: string, meta?: ResourceMeta): FeatureKind {
  if (meta?.kind) return meta.kind
  if (id.includes('action') || id === 'wild-shape') return 'action'
  if (id.includes('bonus') || id === 'rage' || id === 'cunning-action') return 'bonus'
  if (id.includes('reaction')) return 'reaction'
  return 'passive'
}

function alwaysPrepared(
  subclassSlug: string | null,
  classLevel: number,
  landChoice?: string | null,
): string[] {
  return alwaysPreparedForSubclass2024(subclassSlug, classLevel, landChoice)
}

export function multiclassCasterLevel2024(entries: Array<{ slug: string; level: number }>): number {
  let total = 0
  for (const row of entries) {
    const prog = CASTER_PROGRESSION[row.slug] || 'none'
    const lv = Math.max(0, Math.floor(row.level) || 0)
    if (prog === 'full') total += lv
    else if (prog === 'half') total += Math.floor(lv / 2)
    else if (prog === 'half_up') total += Math.floor((lv + 1) / 2)
    else if (prog === 'third') total += Math.floor(lv / 3)
  }
  return total
}

export function slotsForCasterLevel2024(casterLevel: number): Record<string, number> {
  if (casterLevel < 1) {
    return Object.fromEntries(Array.from({ length: 9 }, (_, i) => [String(i + 1), 0]))
  }
  const row = FULL_CASTER_SLOTS[Math.min(20, casterLevel) - 1]
  return Object.fromEntries(row.map((n, i) => [String(i + 1), n]))
}

const ABILITY_NAME_RU: Record<string, string> = {
  str: 'Сила',
  dex: 'Ловкость',
  con: 'Телосложение',
  int: 'Интеллект',
  wis: 'Мудрость',
  cha: 'Харизма',
}

function primaryNeedRu(primaries: string[], mode: string): string {
  const names = primaries.map((a) => ABILITY_NAME_RU[a] || a)
  if (mode === 'any') {
    if (names.length === 1) return `Нужен ${names[0]} 13+`
    return `Нужен ${names.join(' или ')} 13+`
  }
  if (names.length === 1) return `Нужен ${names[0]} 13+`
  return `Нужны ${names.join(' и ')} 13+`
}

export function checkMulticlassPrerequisites2024(input: {
  currentClasses: string[]
  newClass: string
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}): { ok: boolean; reasonRu: string } {
  const newSlug = normalizeClassSlug2024(input.newClass)
  if (!newSlug || !CLASS_CATALOG[newSlug]) {
    return { ok: false, reasonRu: `Неизвестный класс: ${input.newClass}` }
  }
  const involved: string[] = []
  for (const name of input.currentClasses) {
    const s = normalizeClassSlug2024(name)
    if (s) involved.push(s)
  }
  if (!involved.includes(newSlug)) involved.push(newSlug)
  for (const slug of involved) {
    const catalog = CLASS_CATALOG[slug]
    const primaries = (catalog.data.primary_abilities as string[]) || []
    if (!primaries.length) continue
    const mode = MULTICLASS_MODE[slug] || 'all'
    const scores = primaries.map((a) => Number(input.abilities[a as keyof typeof input.abilities] || 0))
    if (mode === 'any') {
      if (!scores.some((s) => s >= 13)) {
        return {
          ok: false,
          reasonRu: `${catalog.name_ru}: ${primaryNeedRu(primaries, 'any')}`,
        }
      }
    } else if (!scores.every((s) => s >= 13)) {
      return {
        ok: false,
        reasonRu: `${catalog.name_ru}: ${primaryNeedRu(primaries, 'all')}`,
      }
    }
  }
  return { ok: true, reasonRu: '' }
}

type ParsedClass = {
  entryId: string
  slug: string
  name: string
  level: number
  subclassSlug: string | null
  subclassName: string | null
}

function parseClasses(
  classes: ClassLevelEntry[],
  subclassSlugByEntryId?: Record<string, string | null | undefined>,
): ParsedClass[] {
  const out: ParsedClass[] = []
  for (const row of classes) {
    const slug =
      normalizeClassSlug2024(row.catalog_id || undefined) ||
      normalizeClassSlug2024(row.name)
    if (!slug) continue
    const level = Math.min(20, Math.max(1, Math.floor(row.level) || 1))
    let sub =
      subclassSlugByEntryId?.[row.id] ||
      row.subclass_catalog_id ||
      null
    const subS = sub ? String(sub).trim() : null
    out.push({
      entryId: row.id,
      slug,
      name: row.name || CLASS_CATALOG[slug]?.name_ru || slug,
      level,
      subclassSlug: subS,
      subclassName: row.subclass_name || null,
    })
  }
  return out
}

function resolveResourceMax(
  meta: ResourceMeta,
  poolKey: string,
  rawValue: unknown,
  totalLevel: number,
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>,
): number {
  if (meta.fixed_uses != null) return meta.fixed_uses
  if (meta.uses_from === 'cha_mod_min_1' || poolKey === 'bardic_inspiration') {
    return Math.max(1, abilityMod2024(abilities.cha ?? 10))
  }
  if (meta.uses_from === 'int_mod_min_1') {
    return Math.max(1, abilityMod2024(abilities.int ?? 10))
  }
  if (meta.uses_from === 'proficiency_bonus') {
    return proficiencyBonusForLevel2024(totalLevel)
  }
  return typeof rawValue === 'number' ? rawValue : 0
}

function buildResourceFeature(
  slug: string,
  _entryId: string,
  poolKey: string,
  max: number,
  classLevel: number,
  _totalLevel: number,
  unlockLevel?: number,
): { def: ClassFeatureDef; desired: DesiredFeatureResource } | null {
  const meta = RESOURCE_META[poolKey]
  if (!meta || max <= 0) return null
  let reset = meta.reset
  if (poolKey === 'bardic_inspiration' && classLevel >= 5) reset = 'short'
  const featureId = meta.feature_id.replace(/-/g, '_')
  const resource: FeatureResource = {
    uses: max,
    recharge: reset === 'short' ? 'short_rest' : 'long_rest',
    pool_id: poolKey,
    pool_name_ru: meta.name_ru,
    track: meta.track || 'spend',
  }
  const badgeLevel =
    typeof unlockLevel === 'number' && unlockLevel > 0
      ? unlockLevel
      : typeof meta.unlock_level === 'number' && meta.unlock_level > 0
        ? meta.unlock_level
        : classLevel
  const def: ClassFeatureDef = {
    id: featureId,
    level: badgeLevel,
    name_ru: meta.name_ru,
    name_en: poolKey,
    summary_ru: meta.name_ru,
    kind: featureKindFor(meta.feature_id, meta),
    resource,
  }
  const desired: DesiredFeatureResource = {
    id: `feat:${slug}:${poolKey}:${featureId}`,
    name: meta.name_ru,
    max,
    reset,
    track: 'spend',
    classSlug: slug,
    classLabelRu: CLASS_CATALOG[slug]?.name_ru,
  }
  return { def, desired }
}

/** Wizard Scholar (2024): Expertise in one of six lore skills the wizard already knows. */
export const SCHOLAR_SKILL_KEYS_2024 = [
  'history',
  'medicine',
  'nature',
  'investigation',
  'religion',
  'arcana',
] as const

export const SCHOLAR_CHOICE_2024: FeatureChoiceDef = {
  id: 'scholar',
  label_ru: 'Академические знания',
  options_from: 'expertise_skills_tools',
  max_picks: 1,
  options: [...SCHOLAR_SKILL_KEYS_2024],
}

function catalogSummaryFor(
  levels: Array<Record<string, unknown>>,
  featureId: string,
): string {
  for (const lr of levels) {
    for (const f of (lr.features as Array<Record<string, unknown>>) || []) {
      if (f.id === featureId) return String(f.summary_ru || '').trim()
    }
  }
  return ''
}

function divineSparkSummaryRu2024(clericLevel: number, wisScore: number | undefined): string {
  const formula = divineSparkFormulaRu2024(clericLevel, abilityMod2024(wisScore ?? 10))
  return `Проведение (Магия): ${formula} — лечение или урон Некротический/Излучением (спас Тел на половину).`
}

export function computeProgression2024(input: {
  classes: ClassLevelEntry[]
  subclassSlugByEntryId?: Record<string, string | null | undefined>
  abilities?: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}): ClassProgressSnapshot2024 {
  const parsed = parseClasses(input.classes, input.subclassSlugByEntryId)
  const totalLevel = Math.min(
    20,
    Math.max(
      1,
      parsed.reduce((sum, row) => sum + row.level, 0),
    ),
  )
  const pb = proficiencyBonusForLevel2024(totalLevel)
  const features: UnlockedFeature[] = []
  const desiredResources: DesiredFeatureResource[] = []
  const scales: Record<string, unknown> = {}
  const spellcasting: SpellcastingBlock2024[] = []
  const featLevels = new Set<number>()
  let epic = false
  let subclassLevel = 3

  for (const cls of parsed) {
    const catalog = CLASS_CATALOG[cls.slug]
    if (!catalog) continue
    subclassLevel = Number(catalog.data.subclass_level || 3)
    for (const fl of (catalog.data.feat_levels as number[]) || []) {
      if (fl <= cls.level) featLevels.add(fl)
    }
    if (cls.level >= Number(catalog.data.epic_boon_level || 19)) epic = true

    const levels = (catalog.data.levels as Array<Record<string, unknown>>) || []
    const resourceOwnerIds = new Set<string>()
    /** First unlock level for resource features (badge), from pack feature rows. */
    const resourceUnlockLevels = new Map<string, number>()
    /** Catalog summaries for Mystic Arcanum circle cards (dedupe text rows). */
    const mysticArcanumSummary = new Map<string, string>()

    for (const row of levels) {
      const lv = Number(row.level || 0)
      if (lv < 1 || lv > cls.level) continue
      for (const feat of (row.features as Array<Record<string, unknown>>) || []) {
        const fidRaw = String(feat.id || '').trim()
        if (!fidRaw) continue
        if (fidRaw.endsWith('-subclass') || fidRaw === 'subclass-feature') continue
        const fid = fidRaw.replace(/-/g, '_')
        // Cleric Divine Spark / Turn Undead are materialised as channel_divinity options below.
        if (cls.slug === 'cleric' && (fid === 'divine_spark' || fid === 'turn_undead')) continue
        // Generic class row `mystic-arcanum` at 11/13/15/17 → one resource card per circle.
        if (fidRaw === 'mystic-arcanum' || fid === 'mystic_arcanum') {
          const circle =
            lv >= 17 ? 9 : lv >= 15 ? 8 : lv >= 13 ? 7 : lv >= 11 ? 6 : null
          if (circle != null) {
            const poolKey = `mystic_arcanum_${circle}`
            resourceOwnerIds.add(poolKey)
            if (!resourceUnlockLevels.has(poolKey)) resourceUnlockLevels.set(poolKey, lv)
            const summary = String(feat.summary_ru || '').trim()
            if (summary) mysticArcanumSummary.set(poolKey, summary)
          }
          continue
        }
        const metaKey = Object.entries(RESOURCE_META).find(
          ([, m]) => m.feature_id === fidRaw || m.feature_id.replace(/-/g, '_') === fid,
        )?.[0]
        // Resource-bearing features are materialised from the resources table below.
        if (metaKey) {
          resourceOwnerIds.add(metaKey)
          if (!resourceUnlockLevels.has(metaKey)) {
            resourceUnlockLevels.set(metaKey, lv)
          }
          continue
        }
        features.push({
          id: fid,
          level: lv,
          name_ru: String(feat.name_ru || fid),
          name_en: String(feat.name_en || fid),
          summary_ru: String(feat.summary_ru || ''),
          kind: featureKindFor(fidRaw),
          classEntryId: cls.entryId,
          className: cls.name,
          classLevel: cls.level,
          source: 'class',
          subclassSlug: null,
          subclassName: null,
          scaleValue: null,
          resourceUses: null,
          ...(fid === 'scholar' ? { choice: SCHOLAR_CHOICE_2024 } : {}),
          ...(fid === 'blessed_strikes' && cls.slug === 'cleric'
            ? { choice: blessedStrikesChoice2024 }
            : {}),
          ...(fid === 'elemental_fury' && cls.slug === 'druid'
            ? { choice: elementalFuryChoice2024 }
            : {}),
          // Disciplined Survivor (2024): proficiency in all saving throws (like Diamond Soul 2014).
          ...(fid === 'disciplined_survivor' ? { save_proficiency: 'all' as const } : {}),
        })
      }
    }

    const subclassPools = cls.subclassSlug
      ? buildSubclassResources2024({
          subclassSlug: cls.subclassSlug,
          classLevel: cls.level,
          abilities: input.abilities,
        })
      : []
    const subclassShared = cls.subclassSlug
      ? sharedOptionsForSubclass2024(cls.subclassSlug, cls.level)
      : []
    const subclassBonuses = cls.subclassSlug
      ? buildPermanentBonuses2024({
          subclassSlug: cls.subclassSlug,
          classLevel: cls.level,
          abilities: input.abilities,
        })
      : []
    const subclassResourceFids = new Set(subclassPools.map((p) => p.feature_id))
    /** Badge = catalog unlock level for subclass resource pools (not current class level). */
    const subclassResourceUnlock = new Map<string, number>()
    const sharedByFid = new Map(subclassShared.map((o) => [o.feature_id, o]))
    const calcFids = new Set(subclassBonuses.map((b) => b.feature_id))

    if (cls.subclassSlug && cls.level >= subclassLevel) {
      const sub = SUBCLASS_CATALOG[cls.subclassSlug]
      if (sub) {
        for (const block of (sub.data.features as Array<Record<string, unknown>>) || []) {
          const blv = Number(block.level || 0)
          if (blv < 1 || blv > cls.level) continue
          for (const feat of (block.features as Array<Record<string, unknown>>) || []) {
            const fidRaw = String(feat.id || '').trim()
            if (!fidRaw) continue
            if (subclassResourceFids.has(fidRaw)) {
              if (!subclassResourceUnlock.has(fidRaw)) {
                subclassResourceUnlock.set(fidRaw, blv)
              }
              continue
            }
            const shared = sharedByFid.get(fidRaw)
            const mode = featureAutomationMode2024({
              featureId: fidRaw,
              subclassSlug: cls.subclassSlug,
              hasResource: false,
              hasSharedOption: Boolean(shared),
              hasCalc: calcFids.has(fidRaw),
            })
            const sharedResource: FeatureResource | undefined = shared
              ? {
                  uses: 1,
                  recharge: 'long_rest',
                  pool_id: shared.spend_pool,
                  pool_name_ru: shared.name_ru,
                  track: 'spend',
                  spend_cost: Math.max(0, shared.cost),
                  ...(shared.cost_max != null
                    ? {
                        linked_spend: {
                          pool_id: shared.spend_pool,
                          label_ru: shared.name_ru,
                          mode: 'spend' as const,
                          amount: shared.cost,
                          amount_max: shared.cost_max,
                        },
                      }
                    : {}),
                }
              : undefined
            features.push({
              id: fidRaw.replace(/-/g, '_'),
              level: blv,
              name_ru: String(feat.name_ru || fidRaw),
              name_en: String(feat.name_en || fidRaw),
              summary_ru: String(feat.summary_ru || ''),
              kind:
                shared?.kind === 'bonus'
                  ? 'bonus'
                  : shared?.kind === 'reaction'
                    ? 'reaction'
                    : shared
                      ? 'action'
                      : 'passive',
              resource: sharedResource,
              classEntryId: cls.entryId,
              className: cls.name,
              classLevel: cls.level,
              source: 'subclass',
              subclassSlug: cls.subclassSlug,
              subclassName: cls.subclassName || sub.name_ru,
              scaleValue: null,
              automationMode: mode === 'text' ? null : mode,
              resourceUses: null,
            })
          }
        }
      }
    }

    const row = classLevelRow(cls.slug, cls.level)
    const rawRes = { ...((row?.resources as Record<string, unknown>) || {}) }
    if (rawRes.bardic_inspiration_die != null) {
      scales[`${cls.slug}:bardic_inspiration_die`] = rawRes.bardic_inspiration_die
      rawRes.bardic_inspiration = true
    }
    // Arcane recovery / Sorcerous Restoration / Uncanny Metabolism (not always in raw table)
    let hasArcane = false
    let hasSorcerousRestoration = false
    let hasUncannyMetabolism = false
    for (const lr of levels) {
      if (Number(lr.level || 0) > cls.level) continue
      for (const f of (lr.features as Array<Record<string, unknown>>) || []) {
        if (f.id === 'arcane-recovery') hasArcane = true
        if (f.id === 'sorcerous-restoration') hasSorcerousRestoration = true
        if (f.id === 'uncanny-metabolism') hasUncannyMetabolism = true
      }
    }
    if (hasArcane && cls.slug === 'wizard') rawRes.arcane_recovery = 1
    if (hasSorcerousRestoration && cls.slug === 'sorcerer') rawRes.sorcerous_restoration = 1
    if (hasUncannyMetabolism && cls.slug === 'monk') rawRes.uncanny_metabolism = 1
    if (cls.slug === 'artificer' && cls.level >= 1) rawRes.magic_of_making = true
    if (cls.slug === 'cleric' && cls.level >= 10) {
      for (const lr of levels) {
        if (Number(lr.level || 0) > cls.level) continue
        for (const f of (lr.features as Array<Record<string, unknown>>) || []) {
          if (f.id === 'divine-intervention') rawRes.divine_intervention = 1
        }
      }
    }
    if (cls.slug === 'warlock') {
      let hasMagicalCunning = false
      let hasContactPatron = false
      for (const lr of levels) {
        if (Number(lr.level || 0) > cls.level) continue
        for (const f of (lr.features as Array<Record<string, unknown>>) || []) {
          if (f.id === 'magical-cunning') hasMagicalCunning = true
          if (f.id === 'contact-patron') hasContactPatron = true
        }
      }
      if (hasMagicalCunning) rawRes.magical_cunning = 1
      if (hasContactPatron) rawRes.contact_patron = 1
      if (cls.level >= 11) rawRes.mystic_arcanum_6 = 1
      if (cls.level >= 13) rawRes.mystic_arcanum_7 = 1
      if (cls.level >= 15) rawRes.mystic_arcanum_8 = 1
      if (cls.level >= 17) rawRes.mystic_arcanum_9 = 1
    }

    for (const [key, value] of Object.entries(rawRes)) {
      if (SCALE_KEYS.has(key) || key === 'bardic_inspiration_die') {
        if (key !== 'bardic_inspiration') scales[`${cls.slug}:${key}`] = value
        continue
      }
      const meta = RESOURCE_META[key]
      if (!meta) {
        scales[`${cls.slug}:${key}`] = value
        continue
      }
      const max = resolveResourceMax(meta, key, value, totalLevel, input.abilities || {})
      if (max <= 0) continue
      const built = buildResourceFeature(
        cls.slug,
        cls.entryId,
        key,
        max,
        cls.level,
        totalLevel,
        resourceUnlockLevels.get(key),
      )
      if (!built) continue
      const arcanumSummary = mysticArcanumSummary.get(key)
      features.push({
        ...built.def,
        ...(arcanumSummary ? { summary_ru: arcanumSummary } : {}),
        classEntryId: cls.entryId,
        className: cls.name,
        classLevel: cls.level,
        source: 'class',
        subclassSlug: null,
        subclassName: null,
        scaleValue:
          key === 'bardic_inspiration'
            ? String(scales[`${cls.slug}:bardic_inspiration_die`] || '')
            : key === 'rages'
              ? String(rawRes.rage_damage ?? '')
              : null,
        resourceUses: built.desired.max,
      })
      const desired = { ...built.desired }
      // Font of Inspiration (L5+): full short-rest restore → no shortRestRegain partial.
      if (key === 'bardic_inspiration' && cls.level >= 5) {
        // reset already flipped to short in buildResourceFeature
      } else if (meta.short_rest_regain != null) {
        desired.shortRestRegain = meta.short_rest_regain
      }
      desiredResources.push(desired)

      // Monk's Focus techniques — synthetic unlocked bonus actions (2024 only).
      if (key === 'focus_points' && cls.slug === 'monk' && cls.level >= 2) {
        const focusResource: FeatureResource = {
          uses: 1,
          recharge: 'short_rest',
          pool_id: 'focus_points',
          pool_name_ru: 'Очки сосредоточенности',
          track: 'spend',
          spend_cost: 1,
        }
        const techniques: Array<{ id: string; name_ru: string; name_en: string }> = [
          { id: 'flurry_of_blows', name_ru: 'Шквал ударов', name_en: 'Flurry of Blows' },
          { id: 'patient_defense', name_ru: 'Терпеливая защита', name_en: 'Patient Defense' },
          { id: 'step_of_the_wind', name_ru: 'Поступь ветра', name_en: 'Step of the Wind' },
        ]
        for (const tech of techniques) {
          features.push({
            id: tech.id,
            level: 2,
            name_ru: tech.name_ru,
            name_en: tech.name_en,
            summary_ru: tech.name_ru,
            kind: 'bonus',
            resource: focusResource,
            classEntryId: cls.entryId,
            className: cls.name,
            classLevel: cls.level,
            source: 'class',
            subclassSlug: null,
            subclassName: null,
            scaleValue: null,
            resourceUses: null,
          })
        }
      }

      // Cleric Channel Divinity base options — synthetic cards sharing the pool (2024 only).
      if (key === 'channel_divinity' && cls.slug === 'cleric') {
        const channelResource: FeatureResource = {
          uses: max,
          recharge: 'long_rest',
          pool_id: 'channel_divinity',
          pool_name_ru: RESOURCE_META.channel_divinity!.name_ru,
          track: 'spend',
          spend_cost: 1,
        }
        for (const option of clericBaseChannelOptionsAtLevel2024(cls.level)) {
          features.push({
            id: option.feature_id.replace(/-/g, '_'),
            level: option.min_level,
            name_ru: option.name_ru,
            name_en: option.feature_id,
            summary_ru:
              option.feature_id === DIVINE_SPARK_FEATURE_ID
                ? divineSparkSummaryRu2024(cls.level, input.abilities?.wis)
                : catalogSummaryFor(levels, option.feature_id) || option.name_ru,
            kind: option.kind === 'bonus' ? 'bonus' : 'action',
            resource: channelResource,
            classEntryId: cls.entryId,
            className: cls.name,
            classLevel: cls.level,
            source: 'class',
            subclassSlug: null,
            subclassName: null,
            scaleValue: null,
            resourceUses: null,
          })
        }
      }
    }

    // Patch Martial Arts die / Unarmored Movement scale labels from resources table.
    const maDieRaw = scales[`${cls.slug}:martial_arts_die`]
    const maDie =
      maDieRaw != null ? String(maDieRaw).replace(/d/gi, 'к') : null
    if (maDie) scales[`${cls.slug}:martial_arts_die`] = maDie
    const umFtRaw = scales[`${cls.slug}:unarmored_movement_ft`]
    const umFt =
      umFtRaw != null && Number(umFtRaw) > 0 ? `+${Number(umFtRaw)} фт.` : null
    for (const feat of features) {
      if (feat.classEntryId !== cls.entryId) continue
      if (feat.id === 'martial_arts' && maDie) feat.scaleValue = maDie
      if (feat.id === 'unarmored_movement' && umFt) feat.scaleValue = umFt
    }

    const prog = CASTER_PROGRESSION[cls.slug] || 'none'
    const sc = row?.spellcasting as Record<string, unknown> | null | undefined
    if (prog !== 'none' && sc) {
      const slots: Record<string, number> = Object.fromEntries(
        Array.from({ length: 9 }, (_, i) => [String(i + 1), 0]),
      )
      let pact: { level: number; count: number } | null = null
      if (prog === 'pact') {
        const src =
          (sc.pact_slots as Record<string, number> | undefined) ||
          (sc.slots as Record<string, number> | undefined) ||
          {}
        pact = {
          level: Number(src.slot_level || src.level || 1),
          count: Number(src.count || 0),
        }
      } else {
        const rawSlots = (sc.slots as Record<string, number>) || {}
        for (const [k, v] of Object.entries(rawSlots)) {
          if (/^\d+$/.test(k) && Number(k) >= 1 && Number(k) <= 9) slots[k] = Number(v || 0)
        }
      }
      const free = alwaysPrepared(cls.subclassSlug, cls.level)
      const unlockedIds = new Set<string>()
      for (const lr of levels) {
        if (Number(lr.level || 0) > cls.level) continue
        for (const f of (lr.features as Array<Record<string, unknown>>) || []) {
          unlockedIds.add(String(f.id))
        }
      }
      if (unlockedIds.has('favored-enemy') && !free.includes('hunters-mark')) free.push('hunters-mark')
      if (unlockedIds.has('paladins-smite') && !free.includes('divine-smite')) free.push('divine-smite')
      if (unlockedIds.has('magic-of-making') && !free.includes('mending')) free.push('mending')

      spellcasting.push({
        class_slug: cls.slug,
        progression: prog,
        cantrips: Number(sc.cantrips || 0),
        prepared_spells: Number(sc.prepared_spells || 0),
        slots,
        pact_slots: pact,
        always_prepared: free,
        subclass_slug: cls.subclassSlug,
      })
    }

    for (const pool of subclassPools) {
      const unlock =
        subclassResourceUnlock.get(pool.feature_id) ??
        subclassResourceUnlock.get(pool.feature_id.replace(/_/g, '-')) ??
        null
      features.push({
        id: pool.feature_id.replace(/-/g, '_'),
        level: unlock != null && unlock > 0 ? unlock : cls.level,
        name_ru: pool.name,
        name_en: pool.pool_id,
        summary_ru: pool.die ? `${pool.name} (${pool.die})` : pool.name,
        kind: 'resource',
        resource: {
          uses: pool.max,
          recharge: pool.reset === 'short' ? 'short_rest' : 'long_rest',
          pool_id: pool.pool_id,
          pool_name_ru: pool.name,
          track: pool.track ?? 'spend',
          ...(pool.track === 'stock' ? stockLabels2024(pool.pool_id) : {}),
        },
        classEntryId: cls.entryId,
        className: cls.name,
        classLevel: cls.level,
        source: 'subclass',
        subclassSlug: cls.subclassSlug,
        subclassName: cls.subclassName,
        scaleValue: pool.die || null,
        automationMode: 'resource',
        resourceUses: pool.max,
      })
      const desired: DesiredFeatureResource = {
        id: pool.id,
        name: pool.name,
        max: pool.max,
        reset: pool.reset,
        track: pool.track ?? 'spend',
        classSlug: pool.class_slug,
        classLabelRu: CLASS_CATALOG[pool.class_slug]?.name_ru,
      }
      if (pool.shortRestRegain != null) desired.shortRestRegain = pool.shortRestRegain
      desiredResources.push(desired)
      if (pool.die) scales[`${cls.slug}:${pool.pool_id}:die`] = pool.die
    }

    if (subclassShared.length) {
      scales[`${cls.slug}:subclass_shared_options`] = subclassShared
    }
    if (subclassBonuses.length) {
      scales[`${cls.slug}:subclass_permanent_bonuses`] = subclassBonuses
      const crits = subclassBonuses.filter((b) => b.kind === 'crit_threshold')
      if (crits.length) {
        scales[`${cls.slug}:crit_threshold`] = Math.min(
          ...crits.map((b) => Number(b.value)),
        )
      }
      const initMod = subclassBonuses.find((b) => b.kind === 'initiative_mod')
      if (initMod) scales[`${cls.slug}:initiative_mod`] = initMod.value
      const hpPl = subclassBonuses.find((b) => b.kind === 'hp_per_level')
      if (hpPl) scales[`${cls.slug}:hp_per_level`] = hpPl.value
      const ac = subclassBonuses.find((b) => b.kind === 'ac_formula')
      if (ac) scales[`${cls.slug}:ac_formula`] = ac.value
      const aura = subclassBonuses.find((b) => b.kind === 'aura_radius')
      if (aura) {
        const val = aura.value as { ft?: number } | number
        scales[`${cls.slug}:aura_radius_ft`] =
          typeof val === 'object' && val ? val.ft : val
      }
    }

    // Body and Mind (monk 20): permanent DEX/WIS +4, cap 25.
    if (cls.slug === 'monk' && cls.level >= 20) {
      const bodyMind = {
        feature_id: 'body-and-mind',
        name_ru: 'Тело и разум',
        kind: 'ability_scores',
        value: { dex: 4, wis: 4, cap: 25 },
        min_level: 20,
      }
      const existing = Array.isArray(scales[`${cls.slug}:subclass_permanent_bonuses`])
        ? (scales[`${cls.slug}:subclass_permanent_bonuses`] as unknown[])
        : []
      scales[`${cls.slug}:subclass_permanent_bonuses`] = [...existing, bodyMind]
      scales[`${cls.slug}:body_and_mind`] = { dex: 4, wis: 4, cap: 25 }
    }

    if (cls.subclassSlug && THIRD_CASTER_SUBCLASSES[cls.subclassSlug]) {
      const third = thirdCasterBlock2024(cls.subclassSlug, cls.level)
      if (third) {
        spellcasting.push({
          class_slug: third.class_slug,
          progression: 'third',
          cantrips: third.cantrips,
          prepared_spells: 0,
          slots: third.slots,
          pact_slots: null,
          always_prepared: [],
          subclass_slug: cls.subclassSlug,
          spells_known: third.spells_known,
          ability: third.ability,
        })
        scales[`${cls.slug}:third_caster_known`] = third.spells_known
      }
    }
  }

  const nonPact = spellcasting.filter((b) => b.progression !== 'pact')
  const primarySlots = nonPact.filter((b) => b.progression !== 'third')
  const thirdOnly = nonPact.filter((b) => b.progression === 'third')
  const pactBlocks = spellcasting.filter((b) => b.progression === 'pact')
  let multiclassSlots: Record<string, number>
  if (parsed.length <= 1 && primarySlots[0]) multiclassSlots = { ...primarySlots[0].slots }
  else if (parsed.length <= 1 && thirdOnly[0] && !primarySlots[0]) {
    multiclassSlots = { ...thirdOnly[0].slots }
  } else if (nonPact.length) {
    let casterLv = multiclassCasterLevel2024(
      parsed.map((p) => ({ slug: p.slug, level: p.level })),
    )
    for (const p of parsed) {
      if (p.subclassSlug && THIRD_CASTER_SUBCLASSES[p.subclassSlug]) {
        casterLv += Math.floor(p.level / 3)
      }
    }
    multiclassSlots = slotsForCasterLevel2024(casterLv)
  } else {
    multiclassSlots = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [String(i + 1), 0]))
  }
  let multiclassPact: { level: number; count: number } | null = null
  if (pactBlocks.length) {
    multiclassPact = pactBlocks.reduce((best, cur) => {
      const b = best.pact_slots || { level: 0, count: 0 }
      const c = cur.pact_slots || { level: 0, count: 0 }
      return c.count + 10 * c.level >= b.count + 10 * b.level ? cur : best
    }).pact_slots
  }

  return {
    total_level: totalLevel,
    proficiency_bonus: pb,
    features,
    desiredResources,
    scales,
    spellcasting,
    multiclass_slots: multiclassSlots,
    multiclass_pact: multiclassPact,
    feat_levels_reached: [...featLevels].sort((a, b) => a - b),
    epic_boon_reached: epic,
    subclass_level: subclassLevel,
  }
}

/** Apply 2024 short-rest policy (Second Wind regain 1). */
export function applyShortRestResources2024(resources: SheetResource[]): SheetResource[] {
  return resources.map((raw) => {
    const reset = raw.reset
    const used = Math.max(0, Math.floor(raw.used || 0))
    const regain = (raw as SheetResource & { shortRestRegain?: number }).shortRestRegain
    if (reset === 'short') return { ...raw, used: 0 }
    if (typeof regain === 'number') {
      return { ...raw, used: Math.max(0, used - Math.floor(regain)) }
    }
    if (raw.id.includes(':second_wind:')) {
      return { ...raw, used: Math.max(0, used - 1) }
    }
    return raw
  })
}

export function snapshotToSheetFragment2024(snap: ClassProgressSnapshot2024): Record<string, unknown> {
  return {
    total_level: snap.total_level,
    proficiency_bonus: snap.proficiency_bonus,
    subclass_level: snap.subclass_level,
    feat_levels_reached: snap.feat_levels_reached,
    epic_boon_reached: snap.epic_boon_reached,
    features: snap.features.map((f) => ({
      id: f.id,
      class_slug: normalizeClassSlug2024(f.className) || f.classEntryId,
      class_level: f.classLevel,
      name_ru: f.name_ru,
      name_en: f.name_en,
      summary_ru: f.summary_ru,
      source: f.source,
      subclass_slug: f.subclassSlug,
    })),
    resources: snap.desiredResources.map((r) => ({
      id: r.id,
      pool_id: r.id.split(':')[2],
      class_slug: r.classSlug,
      name: r.name,
      max: r.max,
      used: 0,
      reset: r.reset,
      track: r.track,
      onHot: true,
      short_rest_regain: (r as DesiredFeatureResource & { shortRestRegain?: number }).shortRestRegain,
      distinct_from_heroic: r.id.includes('bardic_inspiration'),
      blocks_magic_action: r.id.includes('action_surge'),
    })),
    scales: snap.scales,
    spellcasting: snap.spellcasting,
    multiclass_slots: snap.multiclass_slots,
    multiclass_pact: snap.multiclass_pact,
  }
}

export function listClassSlugs2024(): string[] {
  return Object.keys(CLASS_CATALOG).sort()
}

export function classCatalog2024() {
  return CLASS_CATALOG
}
