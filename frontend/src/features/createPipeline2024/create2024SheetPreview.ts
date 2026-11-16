/**
 * P24-M03: level-1 sheet preview for the summary step (mirrors the server builder so the
 * numbers match the sheet that «Готово» creates; live validate can override combat stats).
 */

import type { CatalogEntry } from '../../shared/api/catalog'
import { ABILITY_LABEL_RU, ABILITY_ORDER, type AbilityKey } from '../../shared/dnd/pointBuy'
import { masteryPropertyNameRu } from '../../shared/dnd/weaponMastery'
import { abilityModifier, SKILL_DEFS } from '../characters/sheetTypes'
import {
  abilityLabelRuById,
  buildItemNameIndex,
  COMMON_LANGUAGE_NAME_RU,
  damageTypeLabelRu,
  hitDieLabel,
  itemNameRu,
  normalizeSlug,
  sizeLabelRu,
  type ItemNameIndex,
} from './create2024Labels'
import {
  featPickFields,
  featPicksLabelsRu,
  originFeatNameOf,
  originFeatSlugOf,
  speciesPickFields,
  type FeatPicks,
  type FeatPickContext,
  type PickField,
} from './create2024FeatPicks'
import {
  backgroundAsiOverlay,
  classStartingPacks,
  classToolChoice,
  findFeat,
  speciesLineages,
} from './createPipeline2024State'
import {
  classL1Spellcasting,
  entryData,
  usesSpellbook,
  type Create2024CatalogBundle,
  type Create2024State,
  type LanguagesBundle,
} from './createPipeline2024Types'

const ARMOR_BASE: Record<string, number> = {
  padded: 11,
  leather: 11,
  'leather-armor': 11,
  'studded-leather': 12,
  'studded-leather-armor': 12,
  hide: 12,
  'chain-shirt': 13,
  'scale-mail': 14,
  breastplate: 14,
  'half-plate': 15,
  'ring-mail': 14,
  'chain-mail': 16,
  splint: 17,
  plate: 18,
}
const ARMOR_LIGHT = new Set([
  'padded',
  'leather',
  'leather-armor',
  'studded-leather',
  'studded-leather-armor',
])
const ARMOR_MEDIUM = new Set(['hide', 'chain-shirt', 'scale-mail', 'breastplate', 'half-plate'])

export type SheetPreviewAbility = {
  key: AbilityKey
  label: string
  score: number
  mod: number
  base: number
  bonus: number
  saveProficient: boolean
  saveMod: number
}

export type SheetPreviewSkill = {
  key: string
  label: string
  mod: number
  proficient: boolean
  expertise: boolean
}

export type SheetPreviewFeat = { name: string; source: string; details: string[] }

export type SheetPreviewItem = { name: string; qty: number; equipped: boolean; note?: string }

export type SheetPreviewModel = {
  name: string
  className: string
  speciesName: string
  backgroundName: string
  level: number
  hitDie: string
  hpMax: number
  ac: number
  initiative: number
  speed: number
  darkvision: number
  proficiencyBonus: number
  size: string
  abilities: SheetPreviewAbility[]
  skills: SheetPreviewSkill[]
  feats: SheetPreviewFeat[]
  weaponMastery: Array<{ name: string; property: string }>
  inventory: SheetPreviewItem[]
  coinsGp: number
  cantrips: string[]
  /** Wizard spellbook contents (empty for other classes). */
  spellbook: string[]
  preparedSpells: string[]
  featSpells: string[]
  castingAbility: string | null
  languages: string[]
  tools: string[]
  classFeatures: string[]
  traits: string[]
}

function spellName(spells: readonly CatalogEntry[], slug: string): string {
  return spells.find((s) => s.slug === slug)?.name_ru ?? 'Заклинание'
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((x) => String(x)) : []
}

export type SheetPreviewInput = {
  state: Create2024State
  catalog: Create2024CatalogBundle
  languages: LanguagesBundle
  classEntry: CatalogEntry
  backgroundEntry: CatalogEntry
  speciesEntry: CatalogEntry
  items?: ItemNameIndex
}

function pickedFeat(
  slug: string | null,
  picks: FeatPicks,
  source: string,
  input: SheetPreviewInput,
  ctx: FeatPickContext,
): { feat: SheetPreviewFeat; fields: PickField[] } | null {
  if (!slug) return null
  const entry = findFeat(input.catalog.feats, slug)
  const fields = featPickFields(slug, entry, picks, ctx)
  const details = featPicksLabelsRu(fields, picks).map((row) => `${row.label}: ${row.values.join(', ')}`)
  return {
    feat: { name: entry?.name_ru ?? 'Черта', source, details },
    fields,
  }
}

function skillsFromPicks(picks: FeatPicks, fields: readonly PickField[]): string[] {
  const skillIds = new Set(SKILL_DEFS.map((s) => s.key))
  const out: string[] = []
  for (const field of fields) {
    if (!['skilled', 'skill', 'skills'].includes(field.id)) continue
    for (const id of picks[field.id] ?? []) if (skillIds.has(id)) out.push(id)
  }
  return out
}

function toolsFromPicks(picks: FeatPicks, fields: readonly PickField[]): string[] {
  const skillIds = new Set(SKILL_DEFS.map((s) => s.key))
  const out: string[] = []
  for (const field of fields) {
    if (!['skilled', 'tools', 'instruments'].includes(field.id)) continue
    for (const id of picks[field.id] ?? []) if (!skillIds.has(id)) out.push(id)
  }
  return out
}

export function buildCreate2024SheetPreview(input: SheetPreviewInput): SheetPreviewModel {
  const { state, catalog, languages, classEntry, backgroundEntry, speciesEntry } = input
  const items = input.items ?? buildItemNameIndex(catalog.items)
  const pickCtx: FeatPickContext = { spells: catalog.spells, items }
  const classData = entryData(classEntry)
  const bgData = entryData(backgroundEntry)
  const speciesData = entryData(speciesEntry)

  const overlay = backgroundAsiOverlay(state)
  const saveProf = new Set(stringList(classData.saving_throws).map((x) => x.toLowerCase()))
  const abilities: SheetPreviewAbility[] = ABILITY_ORDER.map((key) => {
    const base = state.baseAbilities[key]
    const bonus = overlay[key] ?? 0
    const score = base + bonus
    const mod = abilityModifier(score)
    const saveProficient = saveProf.has(key)
    return {
      key,
      label: ABILITY_LABEL_RU[key],
      score,
      mod,
      base,
      bonus,
      saveProficient,
      saveMod: mod + (saveProficient ? 2 : 0),
    }
  })
  const score = (key: AbilityKey) => abilities.find((a) => a.key === key)!.score
  const dexMod = abilityModifier(score('dex'))
  const conMod = abilityModifier(score('con'))
  const hitDieN = Number(classData.hit_die || 8)

  // Feats + their picks.
  const bgFeatSlug = originFeatSlugOf(backgroundEntry)
  const bgFeat = pickedFeat(bgFeatSlug, state.originFeatPicks, 'Предыстория', input, pickCtx)
  if (bgFeat && !bgFeat.feat.name && originFeatNameOf(backgroundEntry)) {
    bgFeat.feat.name = originFeatNameOf(backgroundEntry) ?? 'Черта'
  }
  const humanFeat = pickedFeat(
    state.speciesFeatSlug,
    state.speciesFeatPicks,
    'Вид',
    input,
    pickCtx,
  )
  const feats: SheetPreviewFeat[] = []
  if (bgFeat) feats.push(bgFeat.feat)
  if (humanFeat) feats.push(humanFeat.feat)
  if (state.fightingStyleSlug) {
    const style = findFeat(catalog.feats, state.fightingStyleSlug)
    feats.push({ name: style?.name_ru ?? 'Боевой стиль', source: 'Класс', details: [] })
  }

  const speciesFields = speciesPickFields(state.speciesSlug, speciesEntry, pickCtx)

  // Skills.
  const proficient = new Set<string>([
    ...stringList(bgData.skill_proficiencies),
    ...state.classSkillIds,
    ...skillsFromPicks(state.originFeatPicks, bgFeat?.fields ?? []),
    ...skillsFromPicks(state.speciesPicks, speciesFields),
    ...skillsFromPicks(state.speciesFeatPicks, humanFeat?.fields ?? []),
  ])
  const expertiseRaw = Array.isArray(state.classOptionPicks.expertise)
    ? (state.classOptionPicks.expertise as string[])
    : []
  const skillKeys = new Set(SKILL_DEFS.map((s) => s.key))
  const expertise = new Set(expertiseRaw.filter((id) => skillKeys.has(id)))
  const skills: SheetPreviewSkill[] = SKILL_DEFS.map((def) => {
    const isProf = proficient.has(def.key)
    const isExp = expertise.has(def.key)
    const mod =
      abilityModifier(score(def.base)) + (isProf ? 2 : 0) + (isProf && isExp ? 2 : 0)
    return { key: def.key, label: def.label, mod, proficient: isProf, expertise: isExp }
  })

  // Tools.
  const tools: string[] = []
  const bgTools = stringList(bgData.tool_proficiencies)
  if (state.backgroundToolId) tools.push(itemNameRu(state.backgroundToolId, items))
  else for (const tool of bgTools) tools.push(itemNameRu(tool, items))
  for (const tool of stringList(classData.tools_fixed)) tools.push(itemNameRu(tool, items))
  if (classToolChoice(classEntry)) {
    for (const tool of state.classToolIds) tools.push(itemNameRu(tool, items))
  }
  if (expertiseRaw.includes('thieves-tools')) tools.push(itemNameRu('thieves-tools', items))
  for (const tool of toolsFromPicks(state.originFeatPicks, bgFeat?.fields ?? [])) {
    tools.push(itemNameRu(tool, items))
  }
  for (const tool of toolsFromPicks(state.speciesFeatPicks, humanFeat?.fields ?? [])) {
    tools.push(itemNameRu(tool, items))
  }

  // Species traits.
  const lineage = speciesLineages(speciesEntry).find((row) => row.id === state.speciesLineageId)
  let speed = Number(speciesData.speed || 30)
  let darkvision = Number(speciesData.darkvision || 0)
  const lineageRaw = (Array.isArray(speciesData.lineages) ? speciesData.lineages : []).find(
    (row) =>
      row &&
      typeof row === 'object' &&
      normalizeSlug(String((row as { id?: string }).id || '')) === state.speciesLineageId,
  ) as { speed?: number; darkvision?: number } | undefined
  if (lineageRaw?.speed) speed = Number(lineageRaw.speed)
  if (lineageRaw?.darkvision) darkvision = Number(lineageRaw.darkvision)
  const traits: string[] = []
  if (lineage) traits.push(`Родословная: ${lineage.name_ru}`)
  if (state.speciesAncestryId) {
    traits.push(`Наследие дракона: ${damageTypeLabelRu(state.speciesAncestryId)}`)
  }
  const speciesAbility = state.speciesPicks.ability?.[0]
  if (speciesAbility) traits.push(`Заклинательная характеристика вида: ${abilityLabelRuById(speciesAbility)}`)

  // Inventory + AC (mirrors the server table; first armor in the pack is worn).
  const packs = classStartingPacks(classEntry)
  const pack = packs.find((p) => p.id === state.classEquipment) ?? packs[0]
  const inventory: SheetPreviewItem[] = []
  let coinsGp = pack?.coinsGp ?? 0
  let armorSlug: string | null = null
  let shieldWorn = false
  for (const row of pack?.items ?? []) {
    const slug = normalizeSlug(row.id || '')
    const name = row.id ? itemNameRu(row.id, items) : row.nameRu
    if (!name) continue
    let equipped = false
    if (slug in ARMOR_BASE && !armorSlug) {
      armorSlug = slug
      equipped = true
    }
    if (slug === 'shield') {
      shieldWorn = true
      equipped = true
    }
    inventory.push({ name, qty: row.qty, equipped })
  }
  if (state.backgroundEquipment === 'gold') {
    coinsGp += 50
  } else {
    const summary = (bgData.equipment_or_gold as { pack_summary_ru?: string } | undefined)
      ?.pack_summary_ru
    inventory.push({
      name: 'Пакет предыстории',
      qty: 1,
      equipped: false,
      note: summary || undefined,
    })
  }

  let ac = 10 + dexMod
  if (armorSlug) {
    const base = ARMOR_BASE[armorSlug]!
    if (ARMOR_LIGHT.has(armorSlug)) ac = base + dexMod
    else if (ARMOR_MEDIUM.has(armorSlug)) ac = base + Math.min(dexMod, 2)
    else ac = base
  }
  if (shieldWorn) ac += 2
  if (!armorSlug) {
    if (state.classSlug === 'barbarian') ac = 10 + dexMod + conMod
    if (state.classSlug === 'monk') ac = 10 + dexMod + abilityModifier(score('wis'))
  }

  // Spells.
  const sc = classL1Spellcasting(classEntry)
  const primary = stringList(classData.primary_abilities)[0]
  const featSpells: string[] = []
  for (const id of state.originFeatPicks.cantrips ?? []) featSpells.push(spellName(catalog.spells, id))
  for (const id of state.originFeatPicks.spell ?? []) featSpells.push(spellName(catalog.spells, id))
  for (const id of state.originFeatPicks.cantrip ?? []) featSpells.push(spellName(catalog.spells, id))
  for (const id of state.speciesFeatPicks.cantrips ?? []) featSpells.push(spellName(catalog.spells, id))
  for (const id of state.speciesFeatPicks.spell ?? []) featSpells.push(spellName(catalog.spells, id))
  for (const id of state.speciesFeatPicks.cantrip ?? []) featSpells.push(spellName(catalog.spells, id))

  const l1 = Array.isArray(classData.levels)
    ? (classData.levels.find(
        (row) => row && typeof row === 'object' && (row as { level?: number }).level === 1,
      ) as { features?: Array<{ name_ru?: string }> } | undefined)
    : undefined

  const languageNames = [
    COMMON_LANGUAGE_NAME_RU,
    ...state.languageIds.map(
      (id) => languages.languages.find((l) => l.id === id)?.name_ru ?? 'Язык',
    ),
  ]
  if (state.classSlug === 'druid') languageNames.push('Друидический')
  if (state.classSlug === 'rogue') languageNames.push('Воровской жаргон')

  return {
    name: state.characterName.trim() || 'Новый персонаж',
    className: classEntry.name_ru,
    speciesName: speciesEntry.name_ru,
    backgroundName: backgroundEntry.name_ru,
    level: 1,
    hitDie: hitDieLabel(hitDieN),
    hpMax: hitDieN + conMod,
    ac,
    initiative: dexMod,
    speed,
    darkvision,
    proficiencyBonus: 2,
    size: sizeLabelRu(state.speciesSize),
    abilities,
    skills,
    feats,
    weaponMastery: state.weaponMasteryIds.map((slug) => {
      const weapon = catalog.weapons.find((w) => w.slug === slug)
      return {
        name: weapon?.name_ru ?? 'Оружие',
        property: masteryPropertyNameRu(String(entryData(weapon).mastery || '')),
      }
    }),
    inventory,
    coinsGp,
    cantrips: state.cantripIds.map((id) => spellName(catalog.spells, id)),
    spellbook: usesSpellbook(state.classSlug)
      ? state.spellbookSpellIds.map((id) => spellName(catalog.spells, id))
      : [],
    preparedSpells: state.preparedSpellIds.map((id) => spellName(catalog.spells, id)),
    featSpells,
    castingAbility: sc && primary ? ABILITY_LABEL_RU[primary as AbilityKey] ?? null : null,
    languages: languageNames,
    tools: [...new Set(tools)],
    classFeatures: (l1?.features ?? []).map((f) => String(f.name_ru || '')).filter(Boolean),
    traits,
  }
}

/** Apply server validate numbers (live mode) over the local mirror. */
export function overlayServerCombat(
  model: SheetPreviewModel,
  sheet: Record<string, unknown> | null | undefined,
): SheetPreviewModel {
  const combat = sheet && typeof sheet.combat === 'object' ? (sheet.combat as Record<string, unknown>) : null
  if (!combat) return model
  const num = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return {
    ...model,
    hpMax: num(combat.hp_max, model.hpMax),
    ac: num(combat.ac, model.ac),
    initiative: num(combat.initiative, model.initiative),
    speed: num(combat.speed, model.speed),
    darkvision: num(combat.darkvision, model.darkvision),
  }
}
