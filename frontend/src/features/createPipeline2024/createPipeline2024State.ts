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
import { ELDRITCH_INVOCATIONS_2024 } from '../../shared/dnd/edition2024ClassOptions'
import { SKILL_DEFS } from '../characters/sheetTypes'
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

export function weaponMasteryLimit(classSlug: string | null): number {
  if (!classSlug) return 0
  const rule = WEAPON_MASTERY_CLASS_RULES[classSlug]
  if (!rule?.enabled) return 0
  return masteryLimitForClass(rule, 1)
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
  const wm = weaponMasteryLimit(state.classSlug)
  if (wm > 0 && !uniqueCount(state.weaponMasteryIds, wm)) {
    issues.push(`Мастерство оружия: выбрано ${state.weaponMasteryIds.length} из ${wm}`)
  }
  if (state.classSlug === 'fighter' && !state.fightingStyleSlug) {
    issues.push('Выберите боевой стиль')
  }
  if (state.classSlug === 'cleric') {
    const order = String(state.classOptionPicks.divine_order || '')
    if (order !== 'protector' && order !== 'thaumaturge') {
      issues.push('Выберите Божественный указ')
    }
  }
  if (state.classSlug === 'druid') {
    const order = String(state.classOptionPicks.primal_order || '')
    if (order !== 'magician' && order !== 'warden') issues.push('Выберите Изначальный указ')
  }
  if (state.classSlug === 'rogue') {
    const expertise = Array.isArray(state.classOptionPicks.expertise)
      ? (state.classOptionPicks.expertise as string[])
      : []
    if (!uniqueCount(expertise, 2)) {
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
  const sc =
    classSpellcastingAtLevel(ctx.classEntry, classLevel) ?? classL1Spellcasting(ctx.classEntry)
  const bookNeed = WIZARD_BOOK_SPELLS_AT_L1 + Math.max(0, wizardLevel - 1) * 2
  if (sc) {
    if (state.cantripIds.length < sc.cantrips || new Set(state.cantripIds).size !== state.cantripIds.length) {
      issues.push(`Заговоры: выбрано ${state.cantripIds.length} из ${sc.cantrips}`)
    }
    if (usesSpellbook(state.classSlug)) {
      if (
        state.spellbookSpellIds.length < bookNeed ||
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
