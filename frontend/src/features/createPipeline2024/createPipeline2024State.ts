/** P24-M03: client-side step validation + helpers for the 2024 create wizard. */

import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import { parseCharacterGender } from '../../shared/dnd/characterGender'
import { ABILITY_ORDER, type AbilityKey } from '../../shared/dnd/pointBuy'
import {
  WEAPON_MASTERY_CLASS_RULES,
  masteryLimitForClass,
  weaponAllowedForMastery,
  type MasteryWeaponOption,
  type WeaponMasteryId,
} from '../../shared/dnd/weaponMastery'
import { FIGHTING_STYLE_MIN_LEVEL_2024, WEAPON_MASTERY_NAME_RU } from '../../shared/dnd/paladin2024Features'
import {
  DEFENSIVE_TACTICS_MIN_LEVEL_2024,
  DEFENSIVE_TACTICS_NAME_RU,
  HUNTERS_PREY_MIN_LEVEL_2024,
  HUNTERS_PREY_NAME_RU,
  isDefensiveTacticsOption2024,
  isHuntersPreyOption2024,
  isPrimalCompanionType2024,
  isDruidicWarriorStyleId,
  OTHERWORLDLY_GLAMOUR_NAME_RU,
  OTHERWORLDLY_GLAMOUR_SKILLS_2024,
  PRIMAL_COMPANION_NAME_RU,
  RANGER_SUBCLASS_SLUGS_2024,
} from '../../shared/dnd/ranger2024Features'
import {
  ARMOR_MODEL_NAME_RU,
  ARTIFICER_SUBCLASS_SLUGS_2024,
  isArmorModel2024,
  PLANS_KNOWN_COLUMN_RU,
  replicateLimits2024,
  SPELL_STORING_ITEM_MIN_LEVEL_2024,
  SPELL_STORING_ITEM_NAME_RU,
  SUBCLASS_MIN_LEVEL_2024 as ARTIFICER_SUBCLASS_MIN_LEVEL_2024,
} from '../../shared/dnd/artificer2024Features'
import { ELDRITCH_INVOCATIONS_2024 } from '../../shared/dnd/edition2024ClassOptions'
import {
  BARBARIAN_SUBCLASS_SLUGS_2024,
  isWildHeartAspectOption2024,
  isWildHeartPowerOption2024,
  isWildHeartRageOption2024,
  SUBCLASS_MIN_LEVEL_2024 as BARBARIAN_SUBCLASS_MIN_LEVEL_2024,
} from '../../shared/dnd/barbarian2024Features'
import { SKILL_DEFS } from '../characters/sheetTypes'
import {
  DRUID_SUBCLASS_SLUGS_2024,
  isCountedKnownForm2024,
  knownFormsBudget2024,
  LAND_TERRAINS_2024,
} from '../../shared/dnd/druid2024Features'
import {
  MAGICAL_SECRETS_MIN_LEVEL_2024,
  magicalSecretsOffListCap2024,
} from '../../shared/dnd/bard2024Features'
import {
  BLADESINGER_WAR_SONG_SKILLS_2024,
  ENCHANTER_ORATOR_SKILLS_2024,
  TRANSMUTER_STONE_BENEFITS_2024,
  TRANSMUTER_STONE_POTENT_EXTRA_2024,
} from '../../shared/dnd/wizardBook2024Features'
import {
  BLESSINGS_OF_KNOWLEDGE_SKILLS_2024,
  BLESSINGS_OF_KNOWLEDGE_TOOLS_2024,
  MAGICAL_MASTERY_SPELLS_BY_CIRCLE_2024,
  STUDENT_OF_ARCANA_CANTRIPS_2024,
  STUDENT_OF_ARCANA_SKILLS_2024,
} from '../../shared/dnd/clericBook2024Features'
import { wizardCreateBookNeed2024 } from '../../shared/dnd/wizardSpellbook2024'
import {
  isVestigeCompanionType2024,
  isVestigeDomain2024,
  isVestigePatron2024,
  VESTIGE_COMPANION_NAME_RU,
  VESTIGE_SPELLS_NAME_RU,
} from '../../shared/dnd/warlockBook2024Features'
import { readKnownForms } from '../characters/knownForms'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  ARTISAN_TOOL_IDS,
  GAMING_SET_IDS,
  MUSICAL_INSTRUMENT_IDS,
  normalizeSlug,
  ruPlural,
  type ItemNameIndex,
} from './create2024Labels'
import {
  catalogSpellLevel,
  featPickFields,
  isOriginFeatEntry,
  originFeatSlugOf,
  pickFieldsMissing,
  speciesPickFields,
  spellOnClassList,
  type FeatPickContext,
} from './create2024FeatPicks'
import {
  classL1Spellcasting,
  classSpellcastingAtLevel,
  entryData,
  speciesGrantsOriginFeat,
  usesSpellbook,
  WIZARD_BOOK_SPELLS_AT_L1,
  type Create2024CatalogBundle,
  type Create2024State,
  type Create2024StepId,
} from './createPipeline2024Types'

export { skillLabelRu } from './create2024FeatPicks'

/**
 * Catalog species the server cannot create yet (slug with `__` is rewritten by the API
 * normalizer to `--` and no longer matches the catalog row).
 */
export const UNSUPPORTED_SPECIES_SLUGS: readonly string[] = ['elf__lfl']

export function creatableSpecies(species: readonly CatalogEntry[]): CatalogEntry[] {
  return species.filter((row) => !UNSUPPORTED_SPECIES_SLUGS.includes(row.slug))
}

const DRAGONBORN_DAMAGE = ['acid', 'cold', 'fire', 'lightning', 'poison'] as const

export function backgroundAsiOverlay(state: Create2024State): Partial<AbilityScores> {
  const out: Partial<AbilityScores> = {}
  for (const key of ABILITY_ORDER) {
    const bonus = state.backgroundAsi[key]
    if (bonus) out[key] = bonus
  }
  return out
}

export function backgroundAsiTrio(bg: CatalogEntry | null | undefined): AbilityKey[] {
  const asi = entryData(bg).asi
  if (!asi || typeof asi !== 'object') return []
  const abilities = (asi as { abilities?: unknown }).abilities
  if (!Array.isArray(abilities)) return []
  return abilities
    .map((x) => String(x).toLowerCase())
    .filter((x): x is AbilityKey => (ABILITY_ORDER as readonly string[]).includes(x))
}

export function originFeatSlug(bg: CatalogEntry | null | undefined): string | null {
  return originFeatSlugOf(bg)
}

function categoryPool(category: string): string[] | null {
  const value = category.toLowerCase()
  if (value.includes('artisan') && (value.includes('musical') || value.includes('instrument'))) {
    return [...ARTISAN_TOOL_IDS, ...MUSICAL_INSTRUMENT_IDS]
  }
  if (value.includes('artisan')) return [...ARTISAN_TOOL_IDS]
  if (value.includes('gaming')) return [...GAMING_SET_IDS]
  if (value.includes('musical') || value.includes('instrument')) {
    return [...MUSICAL_INSTRUMENT_IDS]
  }
  return null
}

export function toolChoicePool(bg: CatalogEntry | null | undefined): string[] | null {
  const data = entryData(bg)
  const fixed = Array.isArray(data.tool_proficiencies)
    ? data.tool_proficiencies.map((x) => String(x))
    : []
  const choices = data.tool_choices
  if (fixed.length && !choices) return null
  if (!choices || typeof choices !== 'object') return null
  const row = choices as {
    from?: unknown
    category?: string
    from_category?: string
    from_group?: string
  }
  if (Array.isArray(row.from) && row.from.length) {
    return row.from.map((x) => String(x))
  }
  return categoryPool(String(row.category || row.from_category || row.from_group || ''))
}

export function backgroundNeedsToolPick(bg: CatalogEntry | null | undefined): boolean {
  return toolChoicePool(bg) != null
}

/** Class tool proficiencies the player picks (bard / monk / artificer). */
export function classToolChoice(
  classEntry: CatalogEntry | null | undefined,
): { count: number; pool: string[] } | null {
  const choices = entryData(classEntry).tool_choices
  if (!choices || typeof choices !== 'object') return null
  const row = choices as { count?: number; category?: string; from_group?: string }
  const pool = categoryPool(String(row.from_group || row.category || ''))
  const count = Number(row.count || 0)
  if (!pool || count <= 0) return null
  return { count, pool }
}

export function plannedPrimaryClassLevel(state: Create2024State): number {
  const primary =
    state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
  return Math.max(1, primary?.level ?? state.characterLevel ?? 1)
}

export function weaponMasteryLimit(classSlug: string | null, level?: number): number {
  if (!classSlug) return 0
  const rule = WEAPON_MASTERY_CLASS_RULES[classSlug]
  if (!rule?.enabled) return 0
  const lv = level ?? 1
  return masteryLimitForClass(rule, lv)
}

export function masteryWeaponOptions(
  classEntry: CatalogEntry | null | undefined,
  weapons: readonly CatalogEntry[],
): Array<{ entry: CatalogEntry; mastery: WeaponMasteryId }> {
  const slug = classEntry?.slug
  const rule = slug ? WEAPON_MASTERY_CLASS_RULES[slug] : undefined
  if (!rule?.enabled) return []
  const profs = entryData(classEntry).weapons
  const prof = profs && typeof profs === 'object' ? (profs as Record<string, unknown>) : {}
  const extras = Array.isArray(prof.extras) ? prof.extras.map((x) => normalizeSlug(String(x))) : []
  const out: Array<{ entry: CatalogEntry; mastery: WeaponMasteryId }> = []
  for (const entry of weapons) {
    const data = entryData(entry)
    const mastery = String(data.mastery || '') as WeaponMasteryId
    if (!mastery) continue
    const option: MasteryWeaponOption = {
      slug: entry.slug,
      nameRu: entry.name_ru,
      mastery,
      category: data.category === 'martial' ? 'martial' : 'simple',
      rangeKind: data.range_kind === 'ranged' ? 'ranged' : 'melee',
      properties: Array.isArray(data.properties) ? data.properties.map((p) => String(p)) : [],
    }
    const allowed = weaponAllowedForMastery(option, rule, {
      hasSimpleProf: prof.simple !== false,
      hasMartialProf: prof.martial === true,
      proficientSlugs: extras,
    })
    if (allowed) out.push({ entry, mastery })
  }
  return out
}

export function classSkillNeed(classEntry: CatalogEntry | null | undefined): {
  count: number
  from: string[]
} {
  const choices = entryData(classEntry).skill_choices
  if (!choices || typeof choices !== 'object') return { count: 0, from: [] }
  const row = choices as { count?: number; from?: unknown; from_any?: boolean }
  const count = Number(row.count || 0)
  const fromAny = Boolean(row.from_any)
  const from = Array.isArray(row.from) ? row.from.map((x) => String(x)) : []
  if (fromAny || !from.length) {
    return { count, from: SKILL_DEFS.map((s) => s.key) }
  }
  return { count, from }
}

export type ClassStartingPack = {
  id: string
  labelRu: string
  summaryRu?: string
  coinsGp: number
  items: Array<{ id: string | null; qty: number; nameRu?: string; choice?: string }>
  isGold: boolean
}

export function classStartingPacks(
  classEntry: CatalogEntry | null | undefined,
): ClassStartingPack[] {
  const packs = entryData(classEntry).starting_equipment
  if (!Array.isArray(packs)) return []
  return packs
    .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
    .map((p) => {
      const id = String(p.id || '')
      const coins = typeof p.coins_gp === 'number' ? p.coins_gp : 0
      const rawItems = Array.isArray(p.items) ? p.items : []
      const items = rawItems
        .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === 'object'))
        .map((it) => ({
          id: it.id ? String(it.id) : null,
          qty: Number(it.qty || 1),
          nameRu: typeof it.name_ru === 'string' ? it.name_ru : undefined,
          choice: typeof it.choice === 'string' ? it.choice : undefined,
        }))
      const isGold = id === 'gold' || (items.length === 0 && coins > 0)
      const baseLabel = typeof p.label_ru === 'string' && p.label_ru ? p.label_ru : 'Вариант'
      return {
        id,
        labelRu: isGold ? `Золото (${coins} зм)` : baseLabel,
        summaryRu: typeof p.summary_ru === 'string' ? p.summary_ru : undefined,
        coinsGp: coins,
        items,
        isGold,
      }
    })
    .filter((p) => p.id)
}

export function speciesSizeOptions(species: CatalogEntry | null | undefined): string[] {
  const data = entryData(species)
  const opts = Array.isArray(data.size_options)
    ? data.size_options.map((x) => String(x).toLowerCase())
    : []
  if (opts.length) return opts
  if (data.size) return [String(data.size).toLowerCase()]
  return ['medium']
}

export function speciesLineages(
  species: CatalogEntry | null | undefined,
): Array<{ id: string; name_ru: string; summary_ru?: string }> {
  const data = entryData(species)
  const rows = Array.isArray(data.lineages) ? data.lineages : []
  return rows
    .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
    .map((r) => ({
      id: normalizeSlug(String(r.id || r.slug || '')),
      name_ru: String(r.name_ru || ''),
      summary_ru: typeof r.summary_ru === 'string' ? r.summary_ru : undefined,
    }))
    .filter((r) => r.id)
}

export function speciesNeedsLineage(species: CatalogEntry | null | undefined): boolean {
  const data = entryData(species)
  return Boolean(data.lineage_required) || speciesLineages(species).length > 0
}

export function speciesNeedsAncestry(species: CatalogEntry | null | undefined): boolean {
  return Boolean(entryData(species).draconic_ancestry)
}

export function dragonbornDamageOptions(): readonly string[] {
  return DRAGONBORN_DAMAGE
}

export function speciesNeedsOriginFeat(species: CatalogEntry | null | undefined): boolean {
  return speciesGrantsOriginFeat(species)
}

export function l1Invocations(): typeof ELDRITCH_INVOCATIONS_2024 {
  return ELDRITCH_INVOCATIONS_2024.filter((row) => row.minLevel <= 1)
}

export function fightingStyleFeats(feats: CatalogEntry[]): CatalogEntry[] {
  return feats.filter((f) => entryData(f).category === 'fighting_style')
}

/** Origin feats a human may take via «Гибкий» (skip the background feat unless repeatable). */
export function humanOriginFeatOptions(
  feats: readonly CatalogEntry[],
  backgroundFeatSlug: string | null,
): CatalogEntry[] {
  return feats
    .filter((f) => isOriginFeatEntry(f))
    .filter((f) => {
      if (!backgroundFeatSlug || normalizeSlug(f.slug) !== backgroundFeatSlug) return true
      return Boolean(entryData(f).repeatable)
    })
}

export function findFeat(
  feats: readonly CatalogEntry[],
  slug: string | null | undefined,
): CatalogEntry | null {
  if (!slug) return null
  const key = normalizeSlug(slug)
  return feats.find((f) => normalizeSlug(f.slug) === key) ?? null
}

function uniqueCount(ids: string[], need: number): boolean {
  return ids.length === need && new Set(ids).size === need
}

export type StepIssueCtx = {
  classEntry: CatalogEntry | null
  backgroundEntry: CatalogEntry | null
  speciesEntry: CatalogEntry | null
  languageChoiceCount: number
  catalog?: Pick<Create2024CatalogBundle, 'feats' | 'spells' | 'weapons'> | null
  items?: ItemNameIndex
}

function pickCtx(ctx: StepIssueCtx): FeatPickContext {
  return { spells: ctx.catalog?.spells ?? [], items: ctx.items ?? new Map() }
}

/** True when the chosen species grants an origin feat (human «Гибкий») → show the feat step. */
export function speciesNeedsFeatStep(
  state: Pick<Create2024State, 'speciesSlug'>,
  catalog: Pick<Create2024CatalogBundle, 'species'> | null | undefined,
): boolean {
  if (!state.speciesSlug) return false
  const entry = catalog?.species.find((row) => row.slug === state.speciesSlug) ?? null
  return entry ? speciesGrantsOriginFeat(entry) : state.speciesSlug === 'human'
}

function speciesIssues(state: Create2024State, ctx: StepIssueCtx): string[] {
  const { speciesEntry } = ctx
  const issues: string[] = []
  if (!state.speciesSlug || !speciesEntry) return ['Выберите вид']
  if (!state.characterName.trim()) issues.push('Введите имя персонажа')
  if (!parseCharacterGender(state.gender)) issues.push('Выберите пол персонажа')
  const sizes = speciesSizeOptions(speciesEntry)
  if (sizes.length > 1 && !state.speciesSize) issues.push('Выберите размер')
  if (speciesNeedsLineage(speciesEntry) && !state.speciesLineageId) {
    issues.push('Выберите родословную')
  }
  if (speciesNeedsAncestry(speciesEntry) && !state.speciesAncestryId) {
    issues.push('Выберите наследие дракона')
  }
  const fields = speciesPickFields(state.speciesSlug, speciesEntry, pickCtx(ctx))
  for (const field of pickFieldsMissing(fields, state.speciesPicks)) {
    issues.push(`Вид — ${field.label.toLowerCase()}`)
  }
  return issues
}

function featIssues(state: Create2024State, ctx: StepIssueCtx): string[] {
  if (!ctx.speciesEntry || !speciesGrantsOriginFeat(ctx.speciesEntry)) return []
  const feat = findFeat(ctx.catalog?.feats ?? [], state.speciesFeatSlug)
  if (!feat) return ['Выберите черту происхождения (Гибкий)']
  const issues: string[] = []
  const fields = featPickFields(feat.slug, feat, state.speciesFeatPicks, pickCtx(ctx))
  for (const field of pickFieldsMissing(fields, state.speciesFeatPicks)) {
    issues.push(`Черта «${feat.name_ru}» — ${field.label.toLowerCase()}`)
  }
  return issues
}

function backgroundIssues(state: Create2024State, ctx: StepIssueCtx): string[] {
  const { backgroundEntry, languageChoiceCount } = ctx
  const issues: string[] = []
  if (!state.backgroundSlug || !backgroundEntry) return ['Выберите предысторию']
  const trio = backgroundAsiTrio(backgroundEntry)
  if (trio.length !== 3) return ['У предыстории нет тройки характеристик']
  if (state.backgroundAsiMode === '+2/+1') {
    const plus2 = trio.filter((k) => state.backgroundAsi[k] === 2)
    const plus1 = trio.filter((k) => state.backgroundAsi[k] === 1)
    if (plus2.length !== 1 || plus1.length !== 1) {
      issues.push('Увеличение характеристик: выберите +2 и +1')
    }
  } else if (!trio.every((k) => state.backgroundAsi[k] === 1)) {
    issues.push('Увеличение характеристик: +1 к каждой из трёх')
  }
  if (backgroundNeedsToolPick(backgroundEntry) && !state.backgroundToolId) {
    issues.push('Выберите инструмент предыстории')
  }
  const featSlug = originFeatSlugOf(backgroundEntry)
  const feat = findFeat(ctx.catalog?.feats ?? [], featSlug)
  const fields = featPickFields(featSlug, feat, state.originFeatPicks, pickCtx(ctx))
  for (const field of pickFieldsMissing(fields, state.originFeatPicks)) {
    issues.push(`Черта происхождения — ${field.label.toLowerCase()}`)
  }
  if (
    featSlug &&
    state.speciesFeatSlug &&
    normalizeSlug(state.speciesFeatSlug) === normalizeSlug(featSlug) &&
    !entryData(feat).repeatable
  ) {
    issues.push('Черта вида совпадает с чертой предыстории — выберите другую на шаге «Черта»')
  }
  const langNeed = languageChoiceCount || 2
  if (!uniqueCount(state.languageIds, langNeed)) {
    issues.push(`Языки: выбрано ${state.languageIds.length} из ${langNeed}`)
  }
  if (state.backgroundEquipment !== 'pack' && state.backgroundEquipment !== 'gold') {
    issues.push('Выберите снаряжение предыстории')
  }
  return issues
}

function classIssues(state: Create2024State, ctx: StepIssueCtx): string[] {
  const { classEntry } = ctx
  const issues: string[] = []
  if (!state.classSlug || !classEntry) return ['Выберите класс']
  const skills = classSkillNeed(classEntry)
  if (
    !uniqueCount(state.classSkillIds, skills.count) ||
    !state.classSkillIds.every((id) => skills.from.includes(id))
  ) {
    issues.push(`Навыки класса: выбрано ${state.classSkillIds.length} из ${skills.count}`)
  }
  // Barbarian create-at-N may already have planned level >1 when revisiting «Класс».
  const wm =
    state.classSlug === 'barbarian'
      ? weaponMasteryLimit(state.classSlug, plannedPrimaryClassLevel(state))
      : weaponMasteryLimit(state.classSlug)
  if (wm > 0 && !uniqueCount(state.weaponMasteryIds, wm)) {
    issues.push(
      `${WEAPON_MASTERY_NAME_RU}: выбрано ${state.weaponMasteryIds.length} из ${wm}`,
    )
  }
  if (state.classSlug === 'fighter' && !state.fightingStyleSlug) {
    issues.push('Выберите боевой стиль')
  }
  if (state.classSlug === 'paladin') {
    const paladinLevel = Math.max(
      state.characterLevel || 1,
      ...state.classes
        .filter((row) => /paladin|паладин/i.test(row.catalog_id || row.name || ''))
        .map((row) => row.level || 0),
      0,
    )
    if (paladinLevel >= FIGHTING_STYLE_MIN_LEVEL_2024 && !state.fightingStyleSlug) {
      issues.push('Выберите боевой стиль')
    }
  }
  if (state.classSlug === 'ranger') {
    const rangerLevel = Math.max(
      state.characterLevel || 1,
      ...state.classes
        .filter((row) => /ranger|следопыт/i.test(row.catalog_id || row.name || ''))
        .map((row) => row.level || 0),
      0,
    )
    if (rangerLevel >= FIGHTING_STYLE_MIN_LEVEL_2024 && !state.fightingStyleSlug) {
      issues.push('Выберите боевой стиль')
    }
    if (isDruidicWarriorStyleId(state.fightingStyleSlug)) {
      const cantrips = Array.isArray(state.classOptionPicks.druidic_warrior_cantrips)
        ? (state.classOptionPicks.druidic_warrior_cantrips as string[])
        : []
      if (!uniqueCount(cantrips, 2)) {
        issues.push(`Воин-друид: выберите 2 заговора друида (сейчас ${cantrips.length})`)
      }
    }
  }
  if (state.classSlug === 'cleric') {
    const order = String(state.classOptionPicks.divine_order || '')
    if (order !== 'protector' && order !== 'thaumaturge') {
      issues.push('Выберите Божественный орден')
    }
  }
  if (state.classSlug === 'druid') {
    const order = String(state.classOptionPicks.primal_order || '')
    if (order !== 'magician' && order !== 'warden') issues.push('Выберите Природный орден')
  }
  if (state.classSlug === 'rogue') {
    // Class step always collects the L1 pair (2). Extra @6 are validated in levelingIssues.
    const expertise = Array.isArray(state.classOptionPicks.expertise)
      ? (state.classOptionPicks.expertise as string[])
      : []
    if (new Set(expertise).size < 2) {
      issues.push(`Компетентность: выбрано ${expertise.length} из 2`)
    }
  }
  if (state.classSlug === 'warlock') {
    const inv = Array.isArray(state.classOptionPicks.eldritch_invocations)
      ? (state.classOptionPicks.eldritch_invocations as string[])
      : []
    if (!uniqueCount(inv, 1)) issues.push('Выберите мистическое воззвание')
  }
  const tools = classToolChoice(classEntry)
  if (tools && !uniqueCount(state.classToolIds, tools.count)) {
    issues.push(`Инструменты класса: выбрано ${state.classToolIds.length} из ${tools.count}`)
  }
  const packs = classStartingPacks(classEntry)
  if (!packs.some((p) => p.id === state.classEquipment)) {
    issues.push('Выберите снаряжение класса')
  }
  return issues
}

function abilitiesIssues(state: Create2024State): string[] {
  const scores = ABILITY_ORDER.map((k) => state.baseAbilities[k])
  if (scores.some((v) => !v || v < 3)) return ['Назначьте все характеристики']
  if (state.abilityMethod === 'standard_array') {
    const expected = [15, 14, 13, 12, 10, 8]
    if ([...scores].sort((a, b) => b - a).join() !== expected.join()) {
      return ['Массив: каждое число 15, 14, 13, 12, 10, 8 — один раз']
    }
  }
  const overlay = backgroundAsiOverlay(state)
  for (const key of ABILITY_ORDER) {
    if (state.baseAbilities[key] + (overlay[key] ?? 0) > 20) {
      return ['Характеристика после бонуса не может быть выше 20']
    }
  }
  return []
}

/** Artificer 2024 create-time picks: armor model, replicate plans N/M, SSI spell @11+. */
export function artificerCreatePicksNeed2024(state: Create2024State): {
  artificerLevel: number
  subclassSlug: string
  armorModel: boolean
  plansKnown: number
  spellStoring: boolean
} {
  if (state.classSlug !== 'artificer') {
    return {
      artificerLevel: 0,
      subclassSlug: '',
      armorModel: false,
      plansKnown: 0,
      spellStoring: false,
    }
  }
  const primary =
    state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
  const artificerLevel = Math.max(1, primary?.level ?? state.characterLevel ?? 1)
  const subclass =
    (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || ''
  const { plansKnown } = replicateLimits2024(artificerLevel)
  return {
    artificerLevel,
    subclassSlug: subclass,
    armorModel:
      subclass === ARTIFICER_SUBCLASS_SLUGS_2024.armorer &&
      artificerLevel >= ARTIFICER_SUBCLASS_MIN_LEVEL_2024,
    plansKnown,
    spellStoring: artificerLevel >= SPELL_STORING_ITEM_MIN_LEVEL_2024,
  }
}

export function barbarianCreatePicksNeed2024(state: Create2024State): {
  barbarianLevel: number
  subclassSlug: string
  wildHeartRage: boolean
  wildHeartAspect: boolean
  wildHeartPower: boolean
  masteryTopUp: boolean
  masteryLimit: number
} {
  if (state.classSlug !== 'barbarian') {
    return {
      barbarianLevel: 0,
      subclassSlug: '',
      wildHeartRage: false,
      wildHeartAspect: false,
      wildHeartPower: false,
      masteryTopUp: false,
      masteryLimit: 0,
    }
  }
  const primary =
    state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
  const barbarianLevel = plannedPrimaryClassLevel(state)
  const subclass =
    (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || ''
  const masteryLimit = weaponMasteryLimit('barbarian', barbarianLevel)
  const masteryAtL1 = weaponMasteryLimit('barbarian', 1)
  return {
    barbarianLevel,
    subclassSlug: subclass,
    wildHeartRage:
      subclass === BARBARIAN_SUBCLASS_SLUGS_2024.wildHeart &&
      barbarianLevel >= BARBARIAN_SUBCLASS_MIN_LEVEL_2024,
    wildHeartAspect:
      subclass === BARBARIAN_SUBCLASS_SLUGS_2024.wildHeart && barbarianLevel >= 6,
    wildHeartPower:
      subclass === BARBARIAN_SUBCLASS_SLUGS_2024.wildHeart && barbarianLevel >= 14,
    // Keep editor mounted for create-at-N (2→3→4) even after filled, so chips stay clickable.
    masteryTopUp: masteryLimit > masteryAtL1,
    masteryLimit,
  }
}

const TRANSMUTER_STONE_BENEFITS_2_2024 = [
  ...TRANSMUTER_STONE_BENEFITS_2024,
  ...TRANSMUTER_STONE_POTENT_EXTRA_2024,
] as const

export function wizardBookCreatePicksNeed2024(state: Create2024State): {
  wizardLevel: number
  subclassSlug: string
  oratorSkill: boolean
  warSongSkill: boolean
  stoneBenefit: boolean
  stoneBenefit2: boolean
} {
  if (state.classSlug !== 'wizard') {
    return {
      wizardLevel: 0,
      subclassSlug: '',
      oratorSkill: false,
      warSongSkill: false,
      stoneBenefit: false,
      stoneBenefit2: false,
    }
  }
  const primary =
    state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
  const wizardLevel = Math.max(1, primary?.level ?? state.characterLevel ?? 1)
  const subclass = String(
    (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || '',
  ).toLowerCase()
  return {
    wizardLevel,
    subclassSlug: subclass,
    oratorSkill: subclass === 'wizard__enchanter' && wizardLevel >= 3,
    warSongSkill: subclass === 'wizard__bladesinger' && wizardLevel >= 3,
    stoneBenefit: subclass === 'wizard__transmuter' && wizardLevel >= 3,
    stoneBenefit2: subclass === 'wizard__transmuter' && wizardLevel >= 10,
  }
}

export function clericBookCreatePicksNeed2024(state: Create2024State): {
  clericLevel: number
  subclassSlug: string
  studentSkill: boolean
  studentCantrips: boolean
  blessingsTool: boolean
  blessingsSkills: boolean
  unfetteredSave: boolean
  magicalMastery: boolean
} {
  if (state.classSlug !== 'cleric') {
    return {
      clericLevel: 0,
      subclassSlug: '',
      studentSkill: false,
      studentCantrips: false,
      blessingsTool: false,
      blessingsSkills: false,
      unfetteredSave: false,
      magicalMastery: false,
    }
  }
  const primary =
    state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
  const clericLevel = Math.max(1, primary?.level ?? state.characterLevel ?? 1)
  const subclass = String(
    (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || '',
  ).toLowerCase()
  return {
    clericLevel,
    subclassSlug: subclass,
    studentSkill: subclass === 'cleric__arcana-domain' && clericLevel >= 3,
    studentCantrips: subclass === 'cleric__arcana-domain' && clericLevel >= 3,
    blessingsTool: subclass === 'cleric__knowledge-domain' && clericLevel >= 3,
    blessingsSkills: subclass === 'cleric__knowledge-domain' && clericLevel >= 3,
    // Always offer alt-save pick at 6+; create seed can skip if INT not yet proficient.
    unfetteredSave: subclass === 'cleric__knowledge-domain' && clericLevel >= 6,
    magicalMastery: subclass === 'cleric__arcana-domain' && clericLevel >= 17,
  }
}

export function rangerCreatePicksNeed2024(state: Create2024State): {
  rangerLevel: number
  subclassSlug: string
  huntersPrey: boolean
  defensiveTactics: boolean
  primalCompanion: boolean
  otherworldlyGlamour: boolean
} {
  if (state.classSlug !== 'ranger') {
    return {
      rangerLevel: 0,
      subclassSlug: '',
      huntersPrey: false,
      defensiveTactics: false,
      primalCompanion: false,
      otherworldlyGlamour: false,
    }
  }
  const primary =
    state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
  const rangerLevel = Math.max(1, primary?.level ?? state.characterLevel ?? 1)
  const subclass =
    (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || ''
  return {
    rangerLevel,
    subclassSlug: subclass,
    huntersPrey:
      subclass === RANGER_SUBCLASS_SLUGS_2024.hunter && rangerLevel >= HUNTERS_PREY_MIN_LEVEL_2024,
    defensiveTactics:
      subclass === RANGER_SUBCLASS_SLUGS_2024.hunter &&
      rangerLevel >= DEFENSIVE_TACTICS_MIN_LEVEL_2024,
    primalCompanion:
      subclass === RANGER_SUBCLASS_SLUGS_2024.beastmaster &&
      rangerLevel >= HUNTERS_PREY_MIN_LEVEL_2024,
    otherworldlyGlamour:
      subclass === RANGER_SUBCLASS_SLUGS_2024.feyWanderer &&
      rangerLevel >= HUNTERS_PREY_MIN_LEVEL_2024,
  }
}

/** Warlock Vestige Patron (2024): domain + companion type required from L3. */
export function warlockCreatePicksNeed2024(state: Create2024State): {
  warlockLevel: number
  subclassSlug: string
  vestigeDomain: boolean
  vestigeCompanionType: boolean
} {
  if (state.classSlug !== 'warlock') {
    return {
      warlockLevel: 0,
      subclassSlug: '',
      vestigeDomain: false,
      vestigeCompanionType: false,
    }
  }
  const primary =
    state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
  const warlockLevel = Math.max(1, primary?.level ?? state.characterLevel ?? 1)
  const subclass =
    (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || ''
  const vestige = isVestigePatron2024(subclass) && warlockLevel >= 3
  return {
    warlockLevel,
    subclassSlug: subclass,
    vestigeDomain: vestige,
    vestigeCompanionType: vestige,
  }
}

/** Drop vestige domain/companion picks when subclass leaves Vestige or level < 3. */
export function clearVestigePicksIfNeeded2024(
  picks: Create2024State['classOptionPicks'],
  subclassSlug: string | null | undefined,
  warlockLevel: number,
): Create2024State['classOptionPicks'] {
  const keep = isVestigePatron2024(subclassSlug) && warlockLevel >= 3
  if (keep) return picks
  if (picks.vestige_domain == null && picks.vestige_companion_type == null) return picks
  const next = { ...picks }
  delete next.vestige_domain
  delete next.vestige_companion_type
  return next
}

export function bardCreatePicksNeed2024(state: Create2024State): {
  bardLevel: number
  expertise: number
  lore: number
  /** College of Lore level 6: two Wizard/Druid/Cleric spells (Magical Discoveries). */
  discoveries: number
} {
  if (state.classSlug !== 'bard') return { bardLevel: 0, expertise: 0, lore: 0, discoveries: 0 }
  const primary =
    state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
  const bardLevel = Math.max(1, primary?.level ?? state.characterLevel ?? 1)
  const subclass = (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || ''
  return {
    bardLevel,
    expertise: bardLevel >= 9 ? 4 : bardLevel >= 2 ? 2 : 0,
    lore: bardLevel >= 3 && subclass === 'bard__lore' ? 3 : 0,
    discoveries: bardLevel >= 6 && subclass === 'bard__lore' ? 2 : 0,
  }
}

/** Rogue 2024 create: Expertise 2 @1–5, 4 @6+ (skills/tools already proficient). */
export function rogueCreatePicksNeed2024(state: Create2024State): {
  rogueLevel: number
  expertise: number
} {
  if (state.classSlug !== 'rogue') return { rogueLevel: 0, expertise: 0 }
  const primary =
    state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
  const rogueLevel = Math.max(1, primary?.level ?? state.characterLevel ?? 1)
  return {
    rogueLevel,
    expertise: rogueLevel >= 6 ? 4 : rogueLevel >= 1 ? 2 : 0,
  }
}

function levelingIssues(state: Create2024State, ctx: StepIssueCtx): string[] {
  const issues: string[] = []
  const wizardLevel = Math.max(
    1,
    state.classes.find((row) => {
      const name = row.name.trim().toLowerCase()
      return name === 'волшебник' || state.classSlug === 'wizard'
    })?.level ?? (state.classSlug === 'wizard' ? state.characterLevel : 1),
  )
  const classLevel = Math.max(
    1,
    state.classes.find((row) => row.level > 0)?.level ?? state.characterLevel ?? 1,
  )
  if (state.classSlug === 'cleric') {
    const primary =
      state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
    const clericLevel = Math.max(1, primary?.level ?? state.characterLevel ?? 1)
    const pick = String(state.classOptionPicks.blessed_strikes || '')
    if (
      clericLevel >= 7 &&
      pick !== 'divine_strike' &&
      pick !== 'potent_spellcasting'
    ) {
      issues.push('Выберите Благословленные удары (с 7 ур. жреца)')
    }
  }
  if (state.classSlug === 'rogue') {
    const need = rogueCreatePicksNeed2024(state)
    const expertise = Array.isArray(state.classOptionPicks.expertise)
      ? (state.classOptionPicks.expertise as string[])
      : []
    if (need.expertise > 0 && !uniqueCount(expertise, need.expertise)) {
      issues.push(`Компетентность: выбрано ${expertise.length} из ${need.expertise}`)
    }
  }
  if (state.classSlug === 'bard') {
    const need = bardCreatePicksNeed2024(state)
    const expertise = Array.isArray(state.classOptionPicks.expertise)
      ? (state.classOptionPicks.expertise as string[])
      : []
    if (need.expertise > 0 && !uniqueCount(expertise, need.expertise)) {
      issues.push(`Компетентность: выбрано ${expertise.length} из ${need.expertise}`)
    }
    const lore = Array.isArray(state.classOptionPicks.lore_skills)
      ? (state.classOptionPicks.lore_skills as string[])
      : []
    if (need.lore > 0 && !uniqueCount(lore, need.lore)) {
      issues.push(`Доп. навыки Коллегии знаний: выбрано ${lore.length} из ${need.lore}`)
    }
    const discoveries = Array.isArray(state.classOptionPicks.magical_discoveries)
      ? (state.classOptionPicks.magical_discoveries as string[])
      : []
    if (need.discoveries > 0 && !uniqueCount(discoveries, need.discoveries)) {
      issues.push(`Доп. магические тайны: выбрано ${discoveries.length} из ${need.discoveries}`)
    }
  }
  if (state.classSlug === 'druid') {
    const primary =
      state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
    const druidLevel = Math.max(1, primary?.level ?? state.characterLevel ?? 1)
    const pick = String(state.classOptionPicks.elemental_fury || '')
    if (
      druidLevel >= 7 &&
      pick !== 'potent_spellcasting' &&
      pick !== 'primal_strike'
    ) {
      issues.push('Выберите Ярость стихий (с 7 ур. друида)')
    }
    const formsBudget = knownFormsBudget2024(druidLevel)
    if (formsBudget > 0) {
      const picked = readKnownForms(state.classOptionPicks.known_forms).filter(
        isCountedKnownForm2024,
      ).length
      if (picked !== formsBudget) {
        issues.push(`Известные облики Дикого облика: выбрано ${picked} из ${formsBudget}`)
      }
    }
    const subclass = (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || ''
    if (druidLevel >= 3 && subclass === DRUID_SUBCLASS_SLUGS_2024.land) {
      const land = String(state.classOptionPicks.land_choice || '')
      if (!LAND_TERRAINS_2024.some((row) => row.id === land)) {
        issues.push('Выберите местность Круга земли (с 3 ур. друида)')
      }
    }
  }
  if (state.classSlug === 'artificer') {
    const need = artificerCreatePicksNeed2024(state)
    const model = String(state.classOptionPicks.armor_model || '')
    if (need.armorModel && !isArmorModel2024(model)) {
      issues.push(`Выберите ${ARMOR_MODEL_NAME_RU} (с 3 ур. артефактора)`)
    }
    if (need.plansKnown > 0) {
      const plans = Array.isArray(state.classOptionPicks.replicate_plans)
        ? (state.classOptionPicks.replicate_plans as string[])
        : []
      const unique = [...new Set(plans.map((id) => String(id).trim()).filter(Boolean))]
      if (unique.length !== need.plansKnown) {
        issues.push(
          `${PLANS_KNOWN_COLUMN_RU}: выбрано ${unique.length} из ${need.plansKnown}`,
        )
      }
    }
    if (need.spellStoring) {
      const spell = String(state.classOptionPicks.spell_storing_spell || '').trim()
      if (!spell) {
        issues.push(`Выберите заклинание для «${SPELL_STORING_ITEM_NAME_RU}» (1–3 круг)`)
      }
    }
  }
  // Barbarian create-at-N must fill the table limit (2→3@4→4@10), not leave Готово open at 2/3.
  // Fighter keep soft L1-only class-step budget in this pack (separate fighter e2e).
  if (state.classSlug === 'barbarian') {
    const limit = weaponMasteryLimit(state.classSlug, plannedPrimaryClassLevel(state))
    if (limit > 0 && state.weaponMasteryIds.length !== limit) {
      issues.push(
        `${WEAPON_MASTERY_NAME_RU}: выбрано ${state.weaponMasteryIds.length} из ${limit}`,
      )
    }
  }
  if (state.classSlug === 'barbarian') {
    const need = barbarianCreatePicksNeed2024(state)
    const rageAnimal = String(state.classOptionPicks.wild_heart_rage || '')
    if (need.wildHeartRage && !isWildHeartRageOption2024(rageAnimal)) {
      issues.push('Выберите форму ярости дикой природы (Волк / Медведь / Орёл)')
    }
    const aspect = String(state.classOptionPicks.wild_heart_aspect || '')
    if (need.wildHeartAspect && !isWildHeartAspectOption2024(aspect)) {
      issues.push('Выберите Аспект дикой природы (с 6 ур.)')
    }
    const power = String(state.classOptionPicks.wild_heart_power || '')
    if (need.wildHeartPower && !isWildHeartPowerOption2024(power)) {
      issues.push('Выберите Силу дикой природы (с 14 ур.)')
    }
  }
  if (state.classSlug === 'ranger') {
    const need = rangerCreatePicksNeed2024(state)
    const huntersPrey = String(state.classOptionPicks.hunters_prey || '')
    if (need.huntersPrey && !isHuntersPreyOption2024(huntersPrey)) {
      issues.push(`Выберите ${HUNTERS_PREY_NAME_RU} (с 3 ур. следопыта)`)
    }
    const tactics = String(state.classOptionPicks.defensive_tactics || '')
    if (need.defensiveTactics && !isDefensiveTacticsOption2024(tactics)) {
      issues.push(`Выберите ${DEFENSIVE_TACTICS_NAME_RU} (с 7 ур. следопыта)`)
    }
    const primal = String(state.classOptionPicks.primal_companion || '')
    if (need.primalCompanion && !isPrimalCompanionType2024(primal)) {
      issues.push(`Выберите ${PRIMAL_COMPANION_NAME_RU} (с 3 ур. следопыта)`)
    }
    const glamour = String(state.classOptionPicks.otherworldly_glamour || '')
    if (
      need.otherworldlyGlamour &&
      !(OTHERWORLDLY_GLAMOUR_SKILLS_2024 as readonly string[]).includes(glamour)
    ) {
      issues.push(`Выберите ${OTHERWORLDLY_GLAMOUR_NAME_RU} (с 3 ур. следопыта)`)
    }
  }
  if (state.classSlug === 'warlock') {
    const need = warlockCreatePicksNeed2024(state)
    const domain = String(state.classOptionPicks.vestige_domain || '')
    if (need.vestigeDomain && !isVestigeDomain2024(domain)) {
      issues.push(`Выберите домен для «${VESTIGE_SPELLS_NAME_RU}» (с 3 ур. колдуна)`)
    }
    const companion = String(state.classOptionPicks.vestige_companion_type || '')
    if (need.vestigeCompanionType && !isVestigeCompanionType2024(companion)) {
      issues.push(`Выберите тип «${VESTIGE_COMPANION_NAME_RU}» (с 3 ур. колдуна)`)
    }
  }
  const divineOrder =
    ctx.classEntry?.slug === 'cleric'
      ? String(state.classOptionPicks.divine_order || '')
      : null
  const primalOrder =
    ctx.classEntry?.slug === 'druid'
      ? String(state.classOptionPicks.primal_order || '')
      : null
  const primary =
    state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
  const subclassSlug =
    (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || null
  const sc =
    classSpellcastingAtLevel(ctx.classEntry, classLevel, {
      divineOrder,
      primalOrder,
      subclassSlug,
    }) ??
    (subclassSlug
      ? null
      : classL1Spellcasting(ctx.classEntry))
  const bookNeed =
    state.classSlug === 'wizard'
      ? wizardCreateBookNeed2024({ wizardLevel, subclassSlug })
      : WIZARD_BOOK_SPELLS_AT_L1 + Math.max(0, wizardLevel - 1) * 2
  if (state.classSlug === 'wizard') {
    const need = wizardBookCreatePicksNeed2024(state)
    if (need.oratorSkill) {
      const pick = String(state.classOptionPicks.enchanting_conversationalist || '')
      if (!(ENCHANTER_ORATOR_SKILLS_2024 as readonly string[]).includes(pick)) {
        issues.push('Выберите навык «Чарующего оратора» (с 3 ур.)')
      }
    }
    if (need.warSongSkill) {
      const pick = String(state.classOptionPicks.training_in_war_and_song || '')
      if (!(BLADESINGER_WAR_SONG_SKILLS_2024 as readonly string[]).includes(pick)) {
        issues.push('Выберите навык «Учения песни и войны» (с 3 ур.)')
      }
    }
    if (need.stoneBenefit) {
      const pick = String(state.classOptionPicks.transmuter_stone_benefit || '')
      if (!(TRANSMUTER_STONE_BENEFITS_2024 as readonly string[]).includes(pick)) {
        issues.push('Выберите свойство «Камня преобразования» (с 3 ур.)')
      }
    }
    if (need.stoneBenefit2) {
      const pick = String(state.classOptionPicks.transmuter_stone_benefit_2 || '')
      if (!(TRANSMUTER_STONE_BENEFITS_2_2024 as readonly string[]).includes(pick)) {
        issues.push('Выберите второе свойство «Могущественного камня» (с 10 ур.)')
      }
    }
  }
  if (state.classSlug === 'cleric') {
    const need = clericBookCreatePicksNeed2024(state)
    if (need.studentSkill) {
      const pick = String(state.classOptionPicks.student_of_arcana_skill || '')
      if (!(STUDENT_OF_ARCANA_SKILLS_2024 as readonly string[]).includes(pick)) {
        issues.push('Домен магии 3+: выберите навык «Изучающего магию»')
      }
    }
    if (need.studentCantrips) {
      const raw = state.classOptionPicks.student_of_arcana_cantrips
      const list = Array.isArray(raw) ? raw.map((x) => String(x).toLowerCase()) : []
      const ok =
        list.length === 2 &&
        list.every((id) => (STUDENT_OF_ARCANA_CANTRIPS_2024 as readonly string[]).includes(id)) &&
        new Set(list).size === 2
      if (!ok) issues.push('Домен магии 3+: выберите два заговора волшебника')
    }
    if (need.blessingsTool) {
      const pick = String(state.classOptionPicks.blessings_of_knowledge_tool || '')
      if (!(BLESSINGS_OF_KNOWLEDGE_TOOLS_2024 as readonly string[]).includes(pick)) {
        issues.push('Домен знаний 3+: выберите ремесленный инструмент')
      }
    }
    if (need.blessingsSkills) {
      const raw = state.classOptionPicks.blessings_of_knowledge_skills
      const list = Array.isArray(raw) ? raw.map((x) => String(x).toLowerCase()) : []
      const ok =
        list.length === 2 &&
        list.every((id) => (BLESSINGS_OF_KNOWLEDGE_SKILLS_2024 as readonly string[]).includes(id)) &&
        new Set(list).size === 2
      if (!ok) issues.push('Домен знаний 3+: выберите два навыка с экспертностью')
    }
    if (need.magicalMastery) {
      for (const circle of [6, 7, 8, 9] as const) {
        const pick = String(state.classOptionPicks[`magical_mastery_${circle}`] || '')
        if (!(MAGICAL_MASTERY_SPELLS_BY_CIRCLE_2024[circle] as readonly string[]).includes(pick)) {
          issues.push(`Домен магии 17+: выберите заклинание волшебника ${circle}-го круга`)
        }
      }
    }
  }
  if (sc) {
    const locked = sc.lockedCantrips ?? []
    for (const id of locked) {
      if (!state.cantripIds.includes(id)) {
        issues.push(
          id === 'mage-hand'
            ? 'Мистический ловкач: «Волшебная рука» обязательна'
            : `Обязательный заговор не выбран: ${id}`,
        )
      }
    }
    if (state.cantripIds.length < sc.cantrips || new Set(state.cantripIds).size !== state.cantripIds.length) {
      issues.push(`Заговоры: выбрано ${state.cantripIds.length} из ${sc.cantrips}`)
    }
    if (usesSpellbook(state.classSlug)) {
      if (
        state.spellbookSpellIds.length !== bookNeed ||
        new Set(state.spellbookSpellIds).size !== state.spellbookSpellIds.length
      ) {
        issues.push(
          `Книга заклинаний: выбрано ${state.spellbookSpellIds.length} из ${bookNeed}`,
        )
      }
      const maxCircle = Math.max(1, sc.maxSlotLevel || 1)
      const overCircle = state.spellbookSpellIds.filter((id) => {
        const entry = (ctx.catalog?.spells ?? []).find((row) => row.slug === id || row.id === id)
        if (!entry) return false
        return catalogSpellLevel(entry) > maxCircle
      })
      if (overCircle.length) {
        issues.push(
          `В книгу нельзя брать круг выше ${maxCircle} (на ур. ${wizardLevel} нет таких ячеек)`,
        )
      }
      const l1InBook = state.spellbookSpellIds.filter((id) => {
        const entry = (ctx.catalog?.spells ?? []).find((row) => row.slug === id || row.id === id)
        return entry ? catalogSpellLevel(entry) === 1 : false
      }).length
      if (l1InBook < WIZARD_BOOK_SPELLS_AT_L1) {
        issues.push(
          `Стартовая книга: нужно минимум ${WIZARD_BOOK_SPELLS_AT_L1} заклинаний 1 круга (сейчас ${l1InBook})`,
        )
      }
      const book = new Set(state.spellbookSpellIds)
      if (state.preparedSpellIds.some((id) => !book.has(id))) {
        issues.push('Подготовить можно только заклинания из книги')
      }
      if (
        state.preparedSpellIds.length < sc.prepared_spells ||
        new Set(state.preparedSpellIds).size !== state.preparedSpellIds.length
      ) {
        issues.push(
          `Подготовка: нужно ${sc.prepared_spells} ${ruPlural(sc.prepared_spells, 'подготовленное заклинание', 'подготовленных заклинания', 'подготовленных заклинаний')} (выбрано ${state.preparedSpellIds.length})`,
        )
      }
    } else {
      const maxCircle = Math.max(1, sc.maxSlotLevel || 1)
      const overCircle = state.preparedSpellIds.filter((id) => {
        const entry = (ctx.catalog?.spells ?? []).find((row) => row.slug === id || row.id === id)
        if (!entry) return false
        return catalogSpellLevel(entry) > maxCircle
      })
      if (overCircle.length) {
        issues.push(
          `Подготовка: нельзя брать круг выше ${maxCircle} (на ур. ${classLevel} нет таких ячеек)`,
        )
      }
      if (state.classSlug === 'bard') {
        const spells = ctx.catalog?.spells ?? []
        const offList = state.preparedSpellIds.filter((id) => {
          const entry = spells.find((row) => row.slug === id || row.id === id)
          if (!entry) return false
          return !spellOnClassList(entry, 'bard')
        })
        const cap = magicalSecretsOffListCap2024(classLevel)
        if (classLevel < MAGICAL_SECRETS_MIN_LEVEL_2024 && offList.length) {
          issues.push(
            `Магические тайны с ${MAGICAL_SECRETS_MIN_LEVEL_2024} ур.: пока только список Барда (чужих ${offList.length})`,
          )
        } else if (offList.length > cap) {
          issues.push(`Магические тайны: вне списка Барда ${offList.length}/${cap}`)
        }
        for (const id of offList) {
          const entry = spells.find((row) => row.slug === id || row.id === id)
          if (!entry) continue
          const okExtra =
            classLevel >= MAGICAL_SECRETS_MIN_LEVEL_2024 &&
            (spellOnClassList(entry, 'wizard') ||
              spellOnClassList(entry, 'druid') ||
              spellOnClassList(entry, 'cleric'))
          if (!okExtra) {
            issues.push(`Подготовка: ${entry.name_ru || id} не из списков Магических тайн`)
            break
          }
        }
      }
      if (
        state.preparedSpellIds.length < sc.prepared_spells ||
        new Set(state.preparedSpellIds).size !== state.preparedSpellIds.length
      ) {
        issues.push(
          `Подготовка: выбрано ${state.preparedSpellIds.length} из ${sc.prepared_spells}`,
        )
      }
    }
  }
  return issues
}

/** Russian reasons why the step cannot advance yet (empty = ready). */
export function create2024StepIssues(
  step: Create2024StepId,
  state: Create2024State,
  ctx: StepIssueCtx,
): string[] {
  switch (step) {
    case 'species':
      return speciesIssues(state, ctx)
    case 'feat':
      return featIssues(state, ctx)
    case 'background':
      return backgroundIssues(state, ctx)
    case 'class':
      return classIssues(state, ctx)
    case 'abilities':
      return abilitiesIssues(state)
    case 'leveling':
      return levelingIssues(state, ctx)
    default:
      return ['Неизвестный шаг']
  }
}

export function canAdvanceCreate2024Step(
  step: Create2024StepId,
  state: Create2024State,
  ctx: StepIssueCtx,
): boolean {
  return create2024StepIssues(step, state, ctx).length === 0
}

export function nextCreate2024Step(
  step: Create2024StepId,
  steps: readonly Create2024StepId[],
): Create2024StepId | null {
  const idx = steps.indexOf(step)
  if (idx < 0 || idx >= steps.length - 1) return null
  return steps[idx + 1] ?? null
}

export function prevCreate2024Step(
  step: Create2024StepId,
  steps: readonly Create2024StepId[],
): Create2024StepId | null {
  const idx = steps.indexOf(step)
  if (idx <= 0) return null
  return steps[idx - 1] ?? null
}

/** Wizard book pick; dropping a spell from the book also unprepares it. */
export function toggleSpellbookPick(
  book: string[],
  prepared: string[],
  id: string,
  max = WIZARD_BOOK_SPELLS_AT_L1,
): { spellbookSpellIds: string[]; preparedSpellIds: string[] } {
  const spellbookSpellIds = toggleUniquePick(book, id, max)
  const inBook = new Set(spellbookSpellIds)
  return {
    spellbookSpellIds,
    preparedSpellIds: prepared.filter((x) => inBook.has(x)),
  }
}

export function toggleUniquePick(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id)
  if (list.length >= max) return [...list.slice(0, max - 1), id]
  return [...list, id]
}

export function setAsiPlus2Plus1(
  _trio: AbilityKey[],
  plus2: AbilityKey,
  plus1: AbilityKey,
): Partial<Record<AbilityKey, number>> {
  if (plus2 === plus1) return { [plus2]: 2 }
  return { [plus2]: 2, [plus1]: 1 }
}

export function setAsiFlat1(trio: AbilityKey[]): Partial<Record<AbilityKey, number>> {
  return Object.fromEntries(trio.map((k) => [k, 1])) as Partial<Record<AbilityKey, number>>
}
