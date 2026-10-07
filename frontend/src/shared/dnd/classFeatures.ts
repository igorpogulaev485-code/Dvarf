/** Class/subclass feature unlock for the digital sheet (2014). */

import type { ClassLevelEntry } from './classLevels'
import {
  ARMORER_ARMOR_MODELS,
  ARTIFICER_INFUSIONS,
} from './artificerInfusions'
import artificerPack from './data/artificer_2014.json'
import barbarianPack from './data/barbarian_2014.json'
import bardPack from './data/bard_2014.json'
import clericPack from './data/cleric_2014.json'
import druidPack from './data/druid_2014.json'
import wizardPack from './data/wizard_2014.json'
import fighterPack from './data/fighter_2014.json'
import monkPack from './data/monk_2014.json'
import paladinPack from './data/paladin_2014.json'
import roguePack from './data/rogue_2014.json'
import {
  BARD_SWORDS_FIGHTING_STYLES,
  FIGHTER_FIGHTING_STYLES,
  PALADIN_FIGHTING_STYLES,
  RANGER_FIGHTING_STYLES,
} from './fightingStyles'
import { DRUID_LAND_TYPES } from './druidLandChoices'
import {
  RANGER_FAVORED_ENEMIES,
  RANGER_FAVORED_TERRAINS,
} from './rangerChoices'
import rangerPack from './data/ranger_2014.json'
import sorcererPack from './data/sorcerer_2014.json'
import warlockPack from './data/warlock_2014.json'
import { SORCERER_METAMAGIC } from './sorcererMetamagic'
import { BATTLE_MASTER_MANEUVERS } from './battleMasterManeuvers'
import { MONK_ELEMENTAL_DISCIPLINES } from './monkElementalDisciplines'
import {
  WARLOCK_INVOCATIONS,
  WARLOCK_PACT_BOONS,
} from './warlockInvocations'

export type AbilityScoreKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

function abilityModifierFromScore(score: number): number {
  return Math.floor((Math.max(1, Math.floor(score)) - 10) / 2)
}

export type FeatureKind = 'passive' | 'action' | 'bonus' | 'reaction' | 'resource'

export type FeatureScale = {
  labelRu: string
  by_level: Record<string, string>
}

export type FeatureResource = {
  /** Fallback / fixed max when uses_from is absent or 'fixed'. */
  uses: number
  /** Resolve max from character proficiency bonus (Phantom Wails / soul trinkets). */
  uses_from?:
    | 'fixed'
    | 'proficiency_bonus'
    | 'twice_proficiency_bonus'
    | 'ability_modifier'
    | 'one_plus_ability_modifier'
  /** For uses_from: ability_modifier / one_plus_ability_modifier (Divine Sense = 1+cha). */
  ability?: AbilityScoreKey
  recharge: 'short_rest' | 'long_rest' | 'dawn' | 'manual'
  scale_uses?: Record<string, number>
  /** Stable pool key for sheet.resources sync (`feat:{slug}:{pool_id}:{entry}`). */
  pool_id?: string
  /** Display name on the resource tracker (defaults to feature name). */
  pool_name_ru?: string
  /** spend = expended uses; stock = current holdings (soul trinkets). */
  track?: 'spend' | 'stock'
  /** If spend pool is empty, pay via linked pool (stock burn or spend die). */
  linked_spend?: {
    pool_id: string
    label_ru: string
    /** stock = decrement holdings; spend = expend one from linked spend pool. */
    mode?: 'stock' | 'spend'
  }
  /** Soulknife: regain 1 die as an action, once per short/long rest. */
  recover_one?: {
    label_ru: string
    recharge: 'short_rest' | 'long_rest'
  }
  /** Battle Master Relentless / Perfect Self: when pool empty at initiative, regain N. */
  grant_one_on_initiative_if_empty?: boolean
  /** How many to restore (default 1). Perfect Self = 4. */
  grant_amount_on_initiative_if_empty?: number
  /** Death's Friend: after long rest, if stock empty → grant 1. */
  grant_stock_on_long_rest_if_empty?: boolean
  stock_gain_label_ru?: string
  stock_spend_label_ru?: string
  /**
   * Dual-outcome spend (Divine Intervention): failure uses normal recharge;
   * success spends and switches the pool reset to manual until cleared.
   */
  success_lock?: {
    label_ru: string
    recharge: 'manual'
  }
  /** Label for the failure/normal spend button when success_lock is set. */
  failure_spend_label_ru?: string
  /**
   * PHB Rage: benefits require not wearing heavy armor.
   * When true, spend is blocked while heavy body armor is equipped.
   */
  blocked_while_heavy_armor?: boolean
}

export type FeatureChoiceDef = {
  id: string
  label_ru: string
  /** Preset catalog key or explicit option ids. */
  options_from?:
    | 'paladin_fighting_styles'
    | 'fighter_fighting_styles'
    | 'ranger_fighting_styles'
    | 'ranger_favored_enemies'
    | 'ranger_favored_terrains'
    | 'sorcerer_metamagic'
    | 'warlock_invocations'
    | 'warlock_pact_boons'
    | 'bard_swords_fighting_styles'
    | 'druid_land_types'
    | 'artificer_infusions'
    | 'armorer_armor_models'
    | 'monk_elemental_disciplines'
    | 'battle_master_maneuvers'
  options?: string[]
  /** Multi-select cap by class level (Metamagic 2/3/4). */
  max_picks_by_level?: Record<string, number>
}

export type FeatureSlotSpendDef = {
  label_ru: string
  min_slot: number
  max_slot: number
  /** When set with dice fields — show Smite-style damage; omit for slot-only spends. */
  dice_base?: number
  dice_per_slot_above?: number
  dice_cap?: number
  dice_size?: number
  extra_vs_note_ru?: string
}

export type FeatureSaveBonusSelfDef = {
  ability: AbilityScoreKey
  min_bonus: number
  label_ru: string
}

export type ClassFeatureDef = {
  id: string
  level: number
  name_ru: string
  name_en?: string
  summary_ru: string
  body_ru?: string
  kind: FeatureKind
  scale?: FeatureScale
  resource?: FeatureResource
  /** Persistent pick (fighting style). */
  choice?: FeatureChoiceDef
  /** Spend a spell slot from the feature row (Divine Smite). */
  slot_spend?: FeatureSlotSpendDef
  /** Add ability mod (min) to own saves while unlocked (Aura of Protection). */
  save_bonus_self?: FeatureSaveBonusSelfDef
}

export type UnlockedFeature = ClassFeatureDef & {
  classEntryId: string
  className: string
  classLevel: number
  source: 'class' | 'subclass'
  subclassSlug: string | null
  subclassName: string | null
  /** Resolved scale text for current class level, if any. */
  scaleValue: string | null
  /** Resolved resource uses for current class level. */
  resourceUses: number | null
}

type FeaturePack = {
  class_slug: string
  features: ClassFeatureDef[]
  subclasses: Record<string, ClassFeatureDef[]>
}

const LOCAL_PACKS: Record<string, FeaturePack> = {
  artificer: artificerPack as FeaturePack,
  barbarian: barbarianPack as FeaturePack,
  bard: bardPack as FeaturePack,
  cleric: clericPack as FeaturePack,
  druid: druidPack as FeaturePack,
  fighter: fighterPack as FeaturePack,
  wizard: wizardPack as FeaturePack,
  monk: monkPack as FeaturePack,
  paladin: paladinPack as FeaturePack,
  ranger: rangerPack as FeaturePack,
  rogue: roguePack as FeaturePack,
  sorcerer: sorcererPack as FeaturePack,
  warlock: warlockPack as FeaturePack,
}

function asFeatureList(raw: unknown): ClassFeatureDef[] {
  if (!Array.isArray(raw)) return []
  const out: ClassFeatureDef[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || typeof row.name_ru !== 'string') continue
    const kind =
      row.kind === 'action' ||
      row.kind === 'bonus' ||
      row.kind === 'reaction' ||
      row.kind === 'resource' ||
      row.kind === 'passive'
        ? row.kind
        : 'passive'
    const scaleRaw =
      row.scale && typeof row.scale === 'object'
        ? (row.scale as Record<string, unknown>)
        : null
    const resourceRaw =
      row.resource && typeof row.resource === 'object'
        ? (row.resource as Record<string, unknown>)
        : null
    const choiceRaw =
      row.choice && typeof row.choice === 'object'
        ? (row.choice as Record<string, unknown>)
        : null
    const slotSpendRaw =
      row.slot_spend && typeof row.slot_spend === 'object'
        ? (row.slot_spend as Record<string, unknown>)
        : null
    const saveBonusRaw =
      row.save_bonus_self && typeof row.save_bonus_self === 'object'
        ? (row.save_bonus_self as Record<string, unknown>)
        : null

    let choice: FeatureChoiceDef | undefined
    if (choiceRaw && typeof choiceRaw.id === 'string' && typeof choiceRaw.label_ru === 'string') {
      const optionsFrom =
        choiceRaw.options_from === 'paladin_fighting_styles' ||
        choiceRaw.options_from === 'fighter_fighting_styles' ||
        choiceRaw.options_from === 'ranger_fighting_styles' ||
        choiceRaw.options_from === 'ranger_favored_enemies' ||
        choiceRaw.options_from === 'ranger_favored_terrains' ||
        choiceRaw.options_from === 'sorcerer_metamagic' ||
        choiceRaw.options_from === 'warlock_invocations' ||
        choiceRaw.options_from === 'warlock_pact_boons' ||
        choiceRaw.options_from === 'bard_swords_fighting_styles' ||
        choiceRaw.options_from === 'druid_land_types' ||
        choiceRaw.options_from === 'artificer_infusions' ||
        choiceRaw.options_from === 'armorer_armor_models' ||
        choiceRaw.options_from === 'monk_elemental_disciplines' ||
        choiceRaw.options_from === 'battle_master_maneuvers'
          ? choiceRaw.options_from
          : undefined
      const options = Array.isArray(choiceRaw.options)
        ? choiceRaw.options.filter((item): item is string => typeof item === 'string')
        : undefined
      const maxPicksRaw =
        choiceRaw.max_picks_by_level && typeof choiceRaw.max_picks_by_level === 'object'
          ? (choiceRaw.max_picks_by_level as Record<string, unknown>)
          : null
      choice = {
        id: choiceRaw.id,
        label_ru: choiceRaw.label_ru,
        options_from: optionsFrom,
        options,
        max_picks_by_level: maxPicksRaw
          ? Object.fromEntries(
              Object.entries(maxPicksRaw).filter(
                (e): e is [string, number] => typeof e[1] === 'number',
              ),
            )
          : undefined,
      }
    }

    let slot_spend: FeatureSlotSpendDef | undefined
    if (slotSpendRaw && typeof slotSpendRaw.label_ru === 'string') {
      const hasDice = typeof slotSpendRaw.dice_base === 'number'
      slot_spend = {
        label_ru: slotSpendRaw.label_ru,
        min_slot: Math.max(1, Math.floor(Number(slotSpendRaw.min_slot) || 1)),
        max_slot: Math.max(1, Math.floor(Number(slotSpendRaw.max_slot) || 9)),
        dice_base: hasDice
          ? Math.max(1, Math.floor(Number(slotSpendRaw.dice_base)))
          : undefined,
        dice_per_slot_above: hasDice
          ? Math.max(0, Math.floor(Number(slotSpendRaw.dice_per_slot_above) || 1))
          : undefined,
        dice_cap: hasDice
          ? Math.max(1, Math.floor(Number(slotSpendRaw.dice_cap) || 5))
          : undefined,
        dice_size: hasDice
          ? Math.max(2, Math.floor(Number(slotSpendRaw.dice_size) || 8))
          : undefined,
        extra_vs_note_ru:
          typeof slotSpendRaw.extra_vs_note_ru === 'string'
            ? slotSpendRaw.extra_vs_note_ru
            : undefined,
      }
    }

    let save_bonus_self: FeatureSaveBonusSelfDef | undefined
    if (saveBonusRaw && typeof saveBonusRaw.label_ru === 'string') {
      const ability =
        saveBonusRaw.ability === 'str' ||
        saveBonusRaw.ability === 'dex' ||
        saveBonusRaw.ability === 'con' ||
        saveBonusRaw.ability === 'int' ||
        saveBonusRaw.ability === 'wis' ||
        saveBonusRaw.ability === 'cha'
          ? saveBonusRaw.ability
          : 'cha'
      save_bonus_self = {
        ability,
        min_bonus: Math.max(0, Math.floor(Number(saveBonusRaw.min_bonus) || 1)),
        label_ru: saveBonusRaw.label_ru,
      }
    }

    out.push({
      id: row.id,
      level: typeof row.level === 'number' ? Math.max(1, row.level) : 1,
      name_ru: row.name_ru,
      name_en: typeof row.name_en === 'string' ? row.name_en : undefined,
      summary_ru: typeof row.summary_ru === 'string' ? row.summary_ru : '',
      body_ru: typeof row.body_ru === 'string' ? row.body_ru : undefined,
      kind,
      scale:
        scaleRaw && scaleRaw.by_level && typeof scaleRaw.by_level === 'object'
          ? {
              labelRu:
                typeof scaleRaw.label_ru === 'string' ? scaleRaw.label_ru : 'Масштаб',
              by_level: Object.fromEntries(
                Object.entries(scaleRaw.by_level as Record<string, unknown>).filter(
                  (e): e is [string, string] => typeof e[1] === 'string',
                ),
              ),
            }
          : undefined,
      resource: parseFeatureResource(resourceRaw),
      choice,
      slot_spend,
      save_bonus_self,
    })
  }
  return out
}

export function resolveFeatureChoiceOptions(choice: FeatureChoiceDef): string[] {
  if (choice.options_from === 'paladin_fighting_styles') {
    return [...PALADIN_FIGHTING_STYLES]
  }
  if (choice.options_from === 'fighter_fighting_styles') {
    return [...FIGHTER_FIGHTING_STYLES]
  }
  if (choice.options_from === 'ranger_fighting_styles') {
    return [...RANGER_FIGHTING_STYLES]
  }
  if (choice.options_from === 'ranger_favored_enemies') {
    return RANGER_FAVORED_ENEMIES.map((row) => row.id)
  }
  if (choice.options_from === 'ranger_favored_terrains') {
    return RANGER_FAVORED_TERRAINS.map((row) => row.id)
  }
  if (choice.options_from === 'sorcerer_metamagic') {
    return SORCERER_METAMAGIC.map((row) => row.id)
  }
  if (choice.options_from === 'warlock_invocations') {
    return WARLOCK_INVOCATIONS.map((row) => row.id)
  }
  if (choice.options_from === 'warlock_pact_boons') {
    return WARLOCK_PACT_BOONS.map((row) => row.id)
  }
  if (choice.options_from === 'bard_swords_fighting_styles') {
    return [...BARD_SWORDS_FIGHTING_STYLES]
  }
  if (choice.options_from === 'druid_land_types') {
    return DRUID_LAND_TYPES.map((row) => row.id)
  }
  if (choice.options_from === 'artificer_infusions') {
    return ARTIFICER_INFUSIONS.map((row) => row.id)
  }
  if (choice.options_from === 'armorer_armor_models') {
    return ARMORER_ARMOR_MODELS.map((row) => row.id)
  }
  if (choice.options_from === 'monk_elemental_disciplines') {
    return MONK_ELEMENTAL_DISCIPLINES.map((row) => row.id)
  }
  if (choice.options_from === 'battle_master_maneuvers') {
    return BATTLE_MASTER_MANEUVERS.map((row) => row.id)
  }
  return choice.options ? [...choice.options] : []
}

export function resolveChoiceMaxPicks(
  choice: FeatureChoiceDef,
  classLevel: number,
): number {
  if (!choice.max_picks_by_level) return 1
  let best = 1
  for (const [lvlRaw, value] of Object.entries(choice.max_picks_by_level)) {
    const lvl = Number(lvlRaw)
    if (!Number.isFinite(lvl) || lvl > classLevel) continue
    if (value > best) best = value
  }
  return Math.max(1, best)
}

export function slotSpendHasDice(def: FeatureSlotSpendDef): boolean {
  return typeof def.dice_base === 'number'
}

export function slotSpendDiceCount(def: FeatureSlotSpendDef, slotLevel: number): number {
  if (!slotSpendHasDice(def)) return 0
  const lvl = Math.max(def.min_slot, Math.min(def.max_slot, Math.floor(slotLevel)))
  const dice =
    (def.dice_base ?? 0) + (def.dice_per_slot_above ?? 0) * (lvl - def.min_slot)
  return Math.min(def.dice_cap ?? dice, Math.max(1, dice))
}

export function parseClassFeaturesFromCatalogData(
  data: Record<string, unknown> | null | undefined,
): ClassFeatureDef[] {
  return asFeatureList(data?.features)
}

export function localFeaturePack(classSlug: string | null | undefined): FeaturePack | null {
  if (!classSlug) return null
  return LOCAL_PACKS[classSlug] ?? null
}

function resolveScaleValue(scale: FeatureScale | undefined, classLevel: number): string | null {
  if (!scale) return null
  let best: string | null = null
  let bestLevel = 0
  for (const [lvlRaw, value] of Object.entries(scale.by_level)) {
    const lvl = Number(lvlRaw)
    if (!Number.isFinite(lvl) || lvl > classLevel) continue
    if (lvl >= bestLevel) {
      bestLevel = lvl
      best = value
    }
  }
  return best
}

function parseFeatureResource(resourceRaw: Record<string, unknown> | null): FeatureResource | undefined {
  if (!resourceRaw) return undefined
  const hasUses = typeof resourceRaw.uses === 'number'
  const usesFrom =
    resourceRaw.uses_from === 'twice_proficiency_bonus'
      ? 'twice_proficiency_bonus'
      : resourceRaw.uses_from === 'proficiency_bonus'
        ? 'proficiency_bonus'
        : resourceRaw.uses_from === 'one_plus_ability_modifier'
          ? 'one_plus_ability_modifier'
          : resourceRaw.uses_from === 'ability_modifier'
            ? 'ability_modifier'
            : resourceRaw.uses_from === 'fixed'
              ? 'fixed'
              : undefined
  if (
    !hasUses &&
    usesFrom !== 'proficiency_bonus' &&
    usesFrom !== 'twice_proficiency_bonus' &&
    usesFrom !== 'ability_modifier' &&
    usesFrom !== 'one_plus_ability_modifier'
  ) {
    return undefined
  }

  const abilityRaw = resourceRaw.ability
  const ability: AbilityScoreKey | undefined =
    abilityRaw === 'str' ||
    abilityRaw === 'dex' ||
    abilityRaw === 'con' ||
    abilityRaw === 'int' ||
    abilityRaw === 'wis' ||
    abilityRaw === 'cha'
      ? abilityRaw
      : undefined

  const linkedRaw =
    resourceRaw.linked_spend && typeof resourceRaw.linked_spend === 'object'
      ? (resourceRaw.linked_spend as Record<string, unknown>)
      : null
  const recoverRaw =
    resourceRaw.recover_one && typeof resourceRaw.recover_one === 'object'
      ? (resourceRaw.recover_one as Record<string, unknown>)
      : null

  return {
    uses: hasUses ? (resourceRaw.uses as number) : 0,
    uses_from: usesFrom,
    ability,
    recharge:
      resourceRaw.recharge === 'short_rest' ||
      resourceRaw.recharge === 'long_rest' ||
      resourceRaw.recharge === 'dawn' ||
      resourceRaw.recharge === 'manual'
        ? resourceRaw.recharge
        : 'long_rest',
    scale_uses:
      resourceRaw.scale_uses && typeof resourceRaw.scale_uses === 'object'
        ? Object.fromEntries(
            Object.entries(resourceRaw.scale_uses as Record<string, unknown>).filter(
              (e): e is [string, number] => typeof e[1] === 'number',
            ),
          )
        : undefined,
    pool_id: typeof resourceRaw.pool_id === 'string' ? resourceRaw.pool_id : undefined,
    pool_name_ru:
      typeof resourceRaw.pool_name_ru === 'string' ? resourceRaw.pool_name_ru : undefined,
    track: resourceRaw.track === 'stock' ? 'stock' : resourceRaw.track === 'spend' ? 'spend' : undefined,
    linked_spend:
      linkedRaw && typeof linkedRaw.pool_id === 'string'
        ? {
            pool_id: linkedRaw.pool_id,
            label_ru:
              typeof linkedRaw.label_ru === 'string'
                ? linkedRaw.label_ru
                : 'сжечь частицу души',
            mode: linkedRaw.mode === 'spend' ? 'spend' : 'stock',
          }
        : undefined,
    recover_one:
      recoverRaw && typeof recoverRaw.label_ru === 'string'
        ? {
            label_ru: recoverRaw.label_ru,
            recharge:
              recoverRaw.recharge === 'long_rest' ? 'long_rest' : 'short_rest',
          }
        : undefined,
    grant_one_on_initiative_if_empty: Boolean(
      resourceRaw.grant_one_on_initiative_if_empty,
    ),
    grant_amount_on_initiative_if_empty:
      typeof resourceRaw.grant_amount_on_initiative_if_empty === 'number'
        ? Math.max(1, Math.floor(resourceRaw.grant_amount_on_initiative_if_empty))
        : undefined,
    grant_stock_on_long_rest_if_empty: Boolean(
      resourceRaw.grant_stock_on_long_rest_if_empty,
    ),
    stock_gain_label_ru:
      typeof resourceRaw.stock_gain_label_ru === 'string'
        ? resourceRaw.stock_gain_label_ru
        : undefined,
    stock_spend_label_ru:
      typeof resourceRaw.stock_spend_label_ru === 'string'
        ? resourceRaw.stock_spend_label_ru
        : undefined,
    success_lock: (() => {
      const raw =
        resourceRaw.success_lock && typeof resourceRaw.success_lock === 'object'
          ? (resourceRaw.success_lock as Record<string, unknown>)
          : null
      if (!raw || typeof raw.label_ru !== 'string') return undefined
      return {
        label_ru: raw.label_ru,
        recharge: 'manual' as const,
      }
    })(),
    failure_spend_label_ru:
      typeof resourceRaw.failure_spend_label_ru === 'string'
        ? resourceRaw.failure_spend_label_ru
        : undefined,
    blocked_while_heavy_armor: Boolean(resourceRaw.blocked_while_heavy_armor),
  }
}

function resolveResourceUses(
  resource: FeatureResource | undefined,
  classLevel: number,
  proficiencyBonus?: number,
  abilities?: Partial<Record<AbilityScoreKey, number>>,
): number | null {
  if (!resource) return null
  if (resource.uses_from === 'proficiency_bonus') {
    return typeof proficiencyBonus === 'number'
      ? Math.max(0, Math.floor(proficiencyBonus))
      : null
  }
  if (resource.uses_from === 'twice_proficiency_bonus') {
    return typeof proficiencyBonus === 'number'
      ? Math.max(0, Math.floor(proficiencyBonus) * 2)
      : null
  }
  if (resource.uses_from === 'ability_modifier') {
    const key = resource.ability ?? 'wis'
    const score = abilities?.[key]
    if (typeof score !== 'number') return Math.max(1, resource.uses || 1)
    return Math.max(1, abilityModifierFromScore(score))
  }
  if (resource.uses_from === 'one_plus_ability_modifier') {
    const key = resource.ability ?? 'cha'
    const score = abilities?.[key]
    if (typeof score !== 'number') return Math.max(1, resource.uses || 1)
    return Math.max(1, 1 + abilityModifierFromScore(score))
  }
  let uses = resource.uses
  if (resource.scale_uses) {
    for (const [lvlRaw, value] of Object.entries(resource.scale_uses)) {
      const lvl = Number(lvlRaw)
      if (!Number.isFinite(lvl) || lvl > classLevel) continue
      if (value > uses) uses = value
    }
  }
  return uses
}

export function proficiencyBonusForTotalLevel(totalLevel: number): number {
  return 2 + Math.floor((Math.max(totalLevel, 1) - 1) / 4)
}

const CLASS_NAME_TO_SLUG: Record<string, string> = {
  barbarian: 'barbarian',
  варвар: 'barbarian',
  rogue: 'rogue',
  плут: 'rogue',
  fighter: 'fighter',
  воин: 'fighter',
  monk: 'monk',
  монах: 'monk',
  cleric: 'cleric',
  жрец: 'cleric',
  paladin: 'paladin',
  паладин: 'paladin',
  ranger: 'ranger',
  следопыт: 'ranger',
  sorcerer: 'sorcerer',
  чародей: 'sorcerer',
  warlock: 'warlock',
  колдун: 'warlock',
  bard: 'bard',
  бард: 'bard',
  druid: 'druid',
  друид: 'druid',
  wizard: 'wizard',
  волшебник: 'wizard',
  artificer: 'artificer',
  изобретатель: 'artificer',
}

export function resolveClassFeatureSlug(className: string): string | null {
  const key = className.trim().toLowerCase()
  if (!key) return null
  return CLASS_NAME_TO_SLUG[key] ?? null
}

const SUBCLASS_NAME_TO_SLUG: Record<string, string> = {
  thief: 'thief',
  вор: 'thief',
  assassin: 'assassin',
  убийца: 'assassin',
  arcane_trickster: 'arcane_trickster',
  'мистический ловкач': 'arcane_trickster',
  'мистический плут': 'arcane_trickster',
  'арканный плут': 'arcane_trickster',
  'чародейский плут': 'arcane_trickster',
  'arcane trickster': 'arcane_trickster',
  phantom: 'phantom',
  фантом: 'phantom',
  soulknife: 'soulknife',
  'клинок души': 'soulknife',
  battle_master: 'battle_master',
  'мастер боевых искусств': 'battle_master',
  'боевой мастер': 'battle_master',
  path_of_the_berserker: 'path_of_the_berserker',
  berserker: 'path_of_the_berserker',
  берсерк: 'path_of_the_berserker',
  'путь берсерка': 'path_of_the_berserker',
  path_of_the_totem_warrior: 'path_of_the_totem_warrior',
  totem_warrior: 'path_of_the_totem_warrior',
  'тотемный воин': 'path_of_the_totem_warrior',
  'путь тотемного воина': 'path_of_the_totem_warrior',
  way_of_the_open_hand: 'way_of_the_open_hand',
  'открытая ладонь': 'way_of_the_open_hand',
  'путь открытой ладони': 'way_of_the_open_hand',
  way_of_shadow: 'way_of_shadow',
  тень: 'way_of_shadow',
  'путь тени': 'way_of_shadow',
  way_of_the_four_elements: 'way_of_the_four_elements',
  'четыре стихии': 'way_of_the_four_elements',
  'путь четырёх стихий': 'way_of_the_four_elements',
  'путь четырех стихий': 'way_of_the_four_elements',
  knowledge_domain: 'knowledge_domain',
  'домен знания': 'knowledge_domain',
  life_domain: 'life_domain',
  'домен жизни': 'life_domain',
  light_domain: 'light_domain',
  'домен света': 'light_domain',
  nature_domain: 'nature_domain',
  'домен природы': 'nature_domain',
  tempest_domain: 'tempest_domain',
  'домен бури': 'tempest_domain',
  trickery_domain: 'trickery_domain',
  'домен обмана': 'trickery_domain',
  war_domain: 'war_domain',
  'домен войны': 'war_domain',
  death_domain: 'death_domain',
  'домен смерти': 'death_domain',
  arcana_domain: 'arcana_domain',
  'домен тайной магии': 'arcana_domain',
  'домен магии': 'arcana_domain',
  forge_domain: 'forge_domain',
  'домен кузницы': 'forge_domain',
  grave_domain: 'grave_domain',
  'домен могилы': 'grave_domain',
  order_domain: 'order_domain',
  'домен порядка': 'order_domain',
  peace_domain: 'peace_domain',
  'домен мира': 'peace_domain',
  twilight_domain: 'twilight_domain',
  'домен сумерек': 'twilight_domain',
  oath_of_devotion: 'oath_of_devotion',
  'клятва преданности': 'oath_of_devotion',
  преданность: 'oath_of_devotion',
  oath_of_the_ancients: 'oath_of_the_ancients',
  'клятва древних': 'oath_of_the_ancients',
  древних: 'oath_of_the_ancients',
  oath_of_vengeance: 'oath_of_vengeance',
  'клятва мести': 'oath_of_vengeance',
  мести: 'oath_of_vengeance',
  oathbreaker: 'oathbreaker',
  клятвопреступник: 'oathbreaker',
  oath_of_the_crown: 'oath_of_the_crown',
  'клятва короны': 'oath_of_the_crown',
  короны: 'oath_of_the_crown',
  oath_of_conquest: 'oath_of_conquest',
  'клятва покорения': 'oath_of_conquest',
  покорения: 'oath_of_conquest',
  oath_of_redemption: 'oath_of_redemption',
  'клятва искупления': 'oath_of_redemption',
  искупления: 'oath_of_redemption',
  oath_of_glory: 'oath_of_glory',
  'клятва славы': 'oath_of_glory',
  славы: 'oath_of_glory',
  oath_of_the_watchers: 'oath_of_the_watchers',
  'клятва смотрителей': 'oath_of_the_watchers',
  смотрителей: 'oath_of_the_watchers',
  hunter: 'hunter',
  охотник: 'hunter',
  beast_master: 'beast_master',
  'повелитель зверей': 'beast_master',
  gloom_stalker: 'gloom_stalker',
  'сумрачный охотник': 'gloom_stalker',
  horizon_walker: 'horizon_walker',
  'странник горизонта': 'horizon_walker',
  monster_slayer: 'monster_slayer',
  'истребитель чудовищ': 'monster_slayer',
  fey_wanderer: 'fey_wanderer',
  'странник фей': 'fey_wanderer',
  swarmkeeper: 'swarmkeeper',
  'хранитель роя': 'swarmkeeper',
  drakewarden: 'drakewarden',
  'хранитель дрейка': 'drakewarden',
  draconic_bloodline: 'draconic_bloodline',
  'драконья кровь': 'draconic_bloodline',
  'драконья родословная': 'draconic_bloodline',
  wild_magic: 'wild_magic',
  'дикая магия': 'wild_magic',
  storm_sorcery: 'storm_sorcery',
  'магия бури': 'storm_sorcery',
  divine_soul: 'divine_soul',
  'божественная душа': 'divine_soul',
  shadow_magic: 'shadow_magic',
  'магия тени': 'shadow_magic',
  aberrant_mind: 'aberrant_mind',
  'аберрантный разум': 'aberrant_mind',
  clockwork_soul: 'clockwork_soul',
  'душа часового механизма': 'clockwork_soul',
  lunar_sorcery: 'lunar_sorcery',
  'лунная магия': 'lunar_sorcery',
  the_archfey: 'the_archfey',
  архифея: 'the_archfey',
  the_fiend: 'the_fiend',
  исчадие: 'the_fiend',
  the_great_old_one: 'the_great_old_one',
  'старший': 'the_great_old_one',
  'великий древний': 'the_great_old_one',
  the_undying: 'the_undying',
  бессмертный: 'the_undying',
  the_celestial: 'the_celestial',
  небожитель: 'the_celestial',
  the_hexblade: 'the_hexblade',
  хексблейд: 'the_hexblade',
  the_fathomless: 'the_fathomless',
  бездонный: 'the_fathomless',
  the_genie: 'the_genie',
  джинн: 'the_genie',
  the_undead: 'the_undead',
  нежить: 'the_undead',
  college_of_lore: 'college_of_lore',
  'коллегия знаний': 'college_of_lore',
  college_of_valor: 'college_of_valor',
  'коллегия доблести': 'college_of_valor',
  college_of_glamour: 'college_of_glamour',
  'коллегия очарования': 'college_of_glamour',
  college_of_swords: 'college_of_swords',
  'коллегия мечей': 'college_of_swords',
  college_of_whispers: 'college_of_whispers',
  'коллегия шёпотов': 'college_of_whispers',
  'коллегия шепотов': 'college_of_whispers',
  college_of_eloquence: 'college_of_eloquence',
  'коллегия красноречия': 'college_of_eloquence',
  college_of_creation: 'college_of_creation',
  'коллегия созидания': 'college_of_creation',
  college_of_spirits: 'college_of_spirits',
  'коллегия духов': 'college_of_spirits',
  circle_of_the_land: 'circle_of_the_land',
  'круг земли': 'circle_of_the_land',
  circle_of_the_moon: 'circle_of_the_moon',
  'круг луны': 'circle_of_the_moon',
  circle_of_dreams: 'circle_of_dreams',
  'круг снов': 'circle_of_dreams',
  circle_of_the_shepherd: 'circle_of_the_shepherd',
  'круг пастыря': 'circle_of_the_shepherd',
  circle_of_spores: 'circle_of_spores',
  'круг спор': 'circle_of_spores',
  circle_of_stars: 'circle_of_stars',
  'круг звёзд': 'circle_of_stars',
  'круг звезд': 'circle_of_stars',
  circle_of_wildfire: 'circle_of_wildfire',
  'круг дикого огня': 'circle_of_wildfire',
  school_of_abjuration: 'school_of_abjuration',
  'школа ограждения': 'school_of_abjuration',
  school_of_conjuration: 'school_of_conjuration',
  'школа вызова': 'school_of_conjuration',
  school_of_divination: 'school_of_divination',
  'школа прорицания': 'school_of_divination',
  school_of_enchantment: 'school_of_enchantment',
  'школа очарования': 'school_of_enchantment',
  school_of_evocation: 'school_of_evocation',
  'школа воплощения': 'school_of_evocation',
  school_of_illusion: 'school_of_illusion',
  'школа иллюзии': 'school_of_illusion',
  school_of_necromancy: 'school_of_necromancy',
  'школа некромантии': 'school_of_necromancy',
  school_of_transmutation: 'school_of_transmutation',
  'школа преобразования': 'school_of_transmutation',
  bladesinging: 'bladesinging',
  'песнь клинка': 'bladesinging',
  war_magic: 'war_magic',
  'военная магия': 'war_magic',
  order_of_scribes: 'order_of_scribes',
  'орден писцов': 'order_of_scribes',
  alchemist: 'alchemist',
  алхимик: 'alchemist',
  artillerist: 'artillerist',
  артиллерист: 'artillerist',
  battle_smith: 'battle_smith',
  'боевой кузнец': 'battle_smith',
  armorer: 'armorer',
  бронник: 'armorer',
  // Fighter (remaining)
  champion: 'champion',
  чемпион: 'champion',
  eldritch_knight: 'eldritch_knight',
  'eldritch knight': 'eldritch_knight',
  'мистический рыцарь': 'eldritch_knight',
  'эльдрический рыцарь': 'eldritch_knight',
  'рыцарь-колдун': 'eldritch_knight',
  purple_dragon_knight: 'purple_dragon_knight',
  'рыцарь пурпурного дракона': 'purple_dragon_knight',
  banneret: 'purple_dragon_knight',
  arcane_archer: 'arcane_archer',
  'мистический лучник': 'arcane_archer',
  cavalier: 'cavalier',
  кавалерист: 'cavalier',
  samurai: 'samurai',
  самурай: 'samurai',
  echo_knight: 'echo_knight',
  'рыцарь эха': 'echo_knight',
  psi_warrior: 'psi_warrior',
  'пси-воин': 'psi_warrior',
  rune_knight: 'rune_knight',
  'рунный рыцарь': 'rune_knight',
  // Barbarian paths
  path_of_the_battlerager: 'path_of_the_battlerager',
  'путь яростного бойца': 'path_of_the_battlerager',
  battlerager: 'path_of_the_battlerager',
  path_of_the_ancestral_guardian: 'path_of_the_ancestral_guardian',
  'путь предка-хранителя': 'path_of_the_ancestral_guardian',
  path_of_the_storm_herald: 'path_of_the_storm_herald',
  'путь герольда бури': 'path_of_the_storm_herald',
  'путь герольда шторма': 'path_of_the_storm_herald',
  path_of_the_zealot: 'path_of_the_zealot',
  'путь фанатика': 'path_of_the_zealot',
  path_of_the_beast: 'path_of_the_beast',
  'путь зверя': 'path_of_the_beast',
  path_of_wild_magic: 'path_of_wild_magic',
  'путь дикой магии': 'path_of_wild_magic',
  path_of_the_giant: 'path_of_the_giant',
  'путь великана': 'path_of_the_giant',
  // Monk traditions
  way_of_the_long_death: 'way_of_the_long_death',
  'путь долгой смерти': 'way_of_the_long_death',
  way_of_the_sun_soul: 'way_of_the_sun_soul',
  'путь солнечной души': 'way_of_the_sun_soul',
  way_of_the_drunken_master: 'way_of_the_drunken_master',
  'путь пьяного мастера': 'way_of_the_drunken_master',
  way_of_the_kensei: 'way_of_the_kensei',
  'путь кэнсэя': 'way_of_the_kensei',
  way_of_mercy: 'way_of_mercy',
  'путь милосердия': 'way_of_mercy',
  way_of_the_astral_self: 'way_of_the_astral_self',
  'путь астрального я': 'way_of_the_astral_self',
  way_of_the_ascendant_dragon: 'way_of_the_ascendant_dragon',
  'путь вознёсшегося дракона': 'way_of_the_ascendant_dragon',
  'путь вознесшегося дракона': 'way_of_the_ascendant_dragon',
  // Rogue
  mastermind: 'mastermind',
  кукловод: 'mastermind',
  swashbuckler: 'swashbuckler',
  сорвиголова: 'swashbuckler',
  inquisitive: 'inquisitive',
  сыщик: 'inquisitive',
  scout: 'scout',
  скаут: 'scout',
  // Wizard dunamancy
  chronurgy_magic: 'chronurgy_magic',
  хронургия: 'chronurgy_magic',
  graviturgy_magic: 'graviturgy_magic',
  гравитургия: 'graviturgy_magic',
}

const KNOWN_SUBCLASS_SLUGS = new Set([
  'thief',
  'assassin',
  'arcane_trickster',
  'phantom',
  'soulknife',
  'mastermind',
  'swashbuckler',
  'inquisitive',
  'scout',
  'battle_master',
  'champion',
  'eldritch_knight',
  'purple_dragon_knight',
  'arcane_archer',
  'cavalier',
  'samurai',
  'echo_knight',
  'psi_warrior',
  'rune_knight',
  'path_of_the_berserker',
  'path_of_the_totem_warrior',
  'path_of_the_battlerager',
  'path_of_the_ancestral_guardian',
  'path_of_the_storm_herald',
  'path_of_the_zealot',
  'path_of_the_beast',
  'path_of_wild_magic',
  'path_of_the_giant',
  'way_of_the_open_hand',
  'way_of_shadow',
  'way_of_the_four_elements',
  'way_of_the_long_death',
  'way_of_the_sun_soul',
  'way_of_the_drunken_master',
  'way_of_the_kensei',
  'way_of_mercy',
  'way_of_the_astral_self',
  'way_of_the_ascendant_dragon',
  'knowledge_domain',
  'life_domain',
  'light_domain',
  'nature_domain',
  'tempest_domain',
  'trickery_domain',
  'war_domain',
  'death_domain',
  'arcana_domain',
  'forge_domain',
  'grave_domain',
  'order_domain',
  'peace_domain',
  'twilight_domain',
  'oath_of_devotion',
  'oath_of_the_ancients',
  'oath_of_vengeance',
  'oathbreaker',
  'oath_of_the_crown',
  'oath_of_conquest',
  'oath_of_redemption',
  'oath_of_glory',
  'oath_of_the_watchers',
  'hunter',
  'beast_master',
  'gloom_stalker',
  'horizon_walker',
  'monster_slayer',
  'fey_wanderer',
  'swarmkeeper',
  'drakewarden',
  'draconic_bloodline',
  'wild_magic',
  'storm_sorcery',
  'divine_soul',
  'shadow_magic',
  'aberrant_mind',
  'clockwork_soul',
  'lunar_sorcery',
  'the_archfey',
  'the_fiend',
  'the_great_old_one',
  'the_undying',
  'the_celestial',
  'the_hexblade',
  'the_fathomless',
  'the_genie',
  'the_undead',
  'college_of_lore',
  'college_of_valor',
  'college_of_glamour',
  'college_of_swords',
  'college_of_whispers',
  'college_of_eloquence',
  'college_of_creation',
  'college_of_spirits',
  'circle_of_the_land',
  'circle_of_the_moon',
  'circle_of_dreams',
  'circle_of_the_shepherd',
  'circle_of_spores',
  'circle_of_stars',
  'circle_of_wildfire',
  'school_of_abjuration',
  'school_of_conjuration',
  'school_of_divination',
  'school_of_enchantment',
  'school_of_evocation',
  'school_of_illusion',
  'school_of_necromancy',
  'school_of_transmutation',
  'bladesinging',
  'war_magic',
  'order_of_scribes',
  'chronurgy_magic',
  'graviturgy_magic',
  'alchemist',
  'artillerist',
  'battle_smith',
  'armorer',
])

export function resolveSubclassFeatureSlug(input: string): string | null {
  const key = input.trim().toLowerCase()
  if (!key) return null
  if (SUBCLASS_NAME_TO_SLUG[key]) return SUBCLASS_NAME_TO_SLUG[key]
  if (KNOWN_SUBCLASS_SLUGS.has(key)) return key
  return null
}

/** Auxiliary pool id for recover_one (1× per rest). */
export function recoverPoolId(poolId: string): string {
  return `${poolId}__recover`
}

export function unlockFeaturesForClasses(input: {
  classes: ClassLevelEntry[]
  /** Total character level — for proficiency-scaled resources. */
  characterLevel?: number
  /** Ability scores — for uses_from: ability_modifier. */
  abilities?: Partial<Record<AbilityScoreKey, number>>
  /** classEntryId → subclass slug from grant/catalog */
  subclassSlugByEntryId?: Record<string, string | null | undefined>
  classFeaturesByEntryId?: Record<string, ClassFeatureDef[]>
  subclassFeaturesByEntryId?: Record<string, ClassFeatureDef[]>
}): UnlockedFeature[] {
  const unlocked: UnlockedFeature[] = []
  const totalLevel =
    input.characterLevel ??
    input.classes.reduce((sum, row) => sum + Math.max(0, Math.floor(row.level)), 0)
  const pb = proficiencyBonusForTotalLevel(totalLevel)
  const abilities = input.abilities

  for (const row of input.classes) {
    if (!row.name.trim() || row.level <= 0) continue
    const classLevel = Math.min(20, Math.max(1, Math.floor(row.level)))
    const classSlug = resolveClassFeatureSlug(row.name)
    const pack = localFeaturePack(classSlug)

    const classFeatures =
      input.classFeaturesByEntryId?.[row.id] ?? pack?.features ?? []

    for (const feature of classFeatures) {
      if (feature.level > classLevel) continue
      unlocked.push({
        ...feature,
        classEntryId: row.id,
        className: row.name.trim(),
        classLevel,
        source: 'class',
        subclassSlug: null,
        subclassName: null,
        scaleValue: resolveScaleValue(feature.scale, classLevel),
        resourceUses: resolveResourceUses(feature.resource, classLevel, pb, abilities),
      })
    }

    const hasSubclass = Boolean(row.subclass_name.trim() || row.subclass_catalog_id)
    if (!hasSubclass) continue

    const subclassSlug =
      input.subclassSlugByEntryId?.[row.id] ||
      resolveSubclassFeatureSlug(row.subclass_name) ||
      null

    const subclassFeatures =
      input.subclassFeaturesByEntryId?.[row.id] ??
      (subclassSlug && pack ? pack.subclasses[subclassSlug] ?? [] : [])

    for (const feature of subclassFeatures) {
      if (feature.level > classLevel) continue
      unlocked.push({
        ...feature,
        classEntryId: row.id,
        className: row.name.trim(),
        classLevel,
        source: 'subclass',
        subclassSlug,
        subclassName: row.subclass_name.trim() || null,
        scaleValue: resolveScaleValue(feature.scale, classLevel),
        resourceUses: resolveResourceUses(feature.resource, classLevel, pb, abilities),
      })
    }
  }

  unlocked.sort((a, b) => {
    if (a.classEntryId !== b.classEntryId) {
      return a.className.localeCompare(b.className, 'ru')
    }
    if (a.level !== b.level) return a.level - b.level
    if (a.source !== b.source) return a.source === 'class' ? -1 : 1
    return a.name_ru.localeCompare(b.name_ru, 'ru')
  })

  return unlocked
}

export function kindLabelRu(kind: FeatureKind): string {
  if (kind === 'action') return 'Действие'
  if (kind === 'bonus') return 'Бонусное'
  if (kind === 'reaction') return 'Реакция'
  if (kind === 'resource') return 'Ресурс'
  return 'Пассив'
}
