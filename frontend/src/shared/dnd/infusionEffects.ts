/**
 * Aggregate combat / ability bonuses from active Artificer infusions
 * that target **self**. Ally-targeted infusions are shared via lobby
 * `share-effect` and must not double-apply on the artificer's sheet.
 */

import type { ClassLevelEntry } from './classLevels'
import {
  infusionById,
  parseReplicateItemRef,
  replicateItemBySlug,
  resolveActiveInfusionEffects,
  resolveInfusionNumericBonus,
  type AbilityScoreKey,
  type ArtificerInfusionDef,
  type ArtificerInfusionEffects,
} from './artificerInfusions'
import {
  listActiveInfusionBindings,
  type ActiveInfusionBinding,
} from './infusionsActive'
import { infusionAcceptsItem, type InfusionItemShape } from './infusionItems'
import type { FeaturePicksState } from './featurePicks'
import type { EffectMod } from './activeEffects'

export type InfusionBonuses = {
  acBonus: number
  weaponAttackBonus: number
  weaponDamageBonus: number
  spellAttackBonus: number
  saveBonus: number
  darkvisionFt: number
  abilityFloor: Partial<Record<AbilityScoreKey, number>>
  /** Arcane Propulsion Armor etc. */
  speedWalkBonusFt: number
  initiativeAdvantage: boolean
  resistances: string[]
  /** Short RU chips for AC / attack summaries. */
  labels: string[]
  /** Weapon +hit/+dmg keyed by the infused inventory row. Empty item → no bonus. */
  weaponByItem: Record<string, { attack: number; damage: number }>
  activeDefs: ArtificerInfusionDef[]
  /** Bindings aimed at lobby allies (for share-effect sync). */
  allyBindings: ActiveInfusionBinding[]
}

const EMPTY: InfusionBonuses = {
  acBonus: 0,
  weaponAttackBonus: 0,
  weaponDamageBonus: 0,
  spellAttackBonus: 0,
  saveBonus: 0,
  darkvisionFt: 0,
  abilityFloor: {},
  speedWalkBonusFt: 0,
  initiativeAdvantage: false,
  resistances: [],
  labels: [],
  weaponByItem: {},
  activeDefs: [],
  allyBindings: [],
}

function isArtificerEntry(row: ClassLevelEntry): boolean {
  const name = (row.name || '').toLowerCase()
  return (
    name.includes('изобретат') ||
    name.includes('artificer') ||
    (row.catalog_id || '').toLowerCase().includes('artificer')
  )
}

export function listArtificerEntries(classes: ClassLevelEntry[]): ClassLevelEntry[] {
  return classes.filter(isArtificerEntry)
}

function displayName(binding: ActiveInfusionBinding, def: ArtificerInfusionDef): string {
  if (def.replicate && binding.replicateItemSlug) {
    const item = replicateItemBySlug(binding.replicateItemSlug)
    if (item) return `${def.nameRu}: ${item.nameRu}`
  }
  return def.nameRu
}

function accumulateEffects(
  label: string,
  fx: ArtificerInfusionEffects | undefined,
  level: number,
  input: { wearingArmor: boolean; wearingShield: boolean },
  acc: InfusionBonuses,
  def: ArtificerInfusionDef,
  binding?: ActiveInfusionBinding,
): void {
  acc.activeDefs.push(def)
  if (!fx) {
    acc.labels.push(label)
    return
  }

  const ac = resolveInfusionNumericBonus(fx.acBonus, level)
  if (
    fx.acBonusUnarmoredUnshielded &&
    !input.wearingArmor &&
    !input.wearingShield
  ) {
    acc.acBonus += fx.acBonusUnarmoredUnshielded
    acc.labels.push(`${label} +${fx.acBonusUnarmoredUnshielded} КД`)
  }

  // Spell attack is applied by the caller: the focus must be held and attuned.
  const sAtk = resolveInfusionNumericBonus(fx.spellAttackBonus, level)

  if (fx.saveBonus) {
    acc.saveBonus += fx.saveBonus
    acc.labels.push(`${label} спас +${fx.saveBonus}`)
  }

  if (fx.darkvisionFt) {
    acc.darkvisionFt = Math.max(acc.darkvisionFt, fx.darkvisionFt)
  }

  if (fx.abilityFloor) {
    const prev = acc.abilityFloor[fx.abilityFloor.ability] ?? 0
    acc.abilityFloor[fx.abilityFloor.ability] = Math.max(
      prev,
      fx.abilityFloor.score,
    )
    acc.labels.push(
      `${label}: ${fx.abilityFloor.ability.toUpperCase()}≥${fx.abilityFloor.score}`,
    )
  }

  if (fx.speedWalkBonusFt) {
    acc.speedWalkBonusFt += fx.speedWalkBonusFt
    acc.labels.push(`${label} +${fx.speedWalkBonusFt} фт`)
  }

  if (fx.initiativeAdvantage) {
    acc.initiativeAdvantage = true
    acc.labels.push(`${label}: преимущество к инициативе`)
  }

  const resist =
    fx.resistance ||
    (fx.resistanceFromOption ? binding?.option?.trim() || null : null)
  if (resist) {
    acc.resistances.push(resist)
    acc.labels.push(`${label}: сопротивление ${resist}`)
  }

  if (
    !ac &&
    !fx.acBonusUnarmoredUnshielded &&
    !sAtk &&
    !fx.saveBonus &&
    !fx.abilityFloor &&
    !fx.speedWalkBonusFt &&
    !fx.initiativeAdvantage &&
    !resist
  ) {
    acc.labels.push(label)
  }
}

/**
 * Sum mechanical effects of active infusions that target **self**.
 * Ally-targeted rows are listed in `allyBindings` for lobby share-effect.
 */
export function aggregateInfusionBonuses(input: {
  featurePicks: FeaturePicksState
  classes: ClassLevelEntry[]
  wearingArmor: boolean
  wearingShield: boolean
  /** Inventory rows — weapon/AC bonuses apply only to the bound item. */
  items?: InfusionItemShape[]
  /**
   * When `items` is known, Enhanced Arcane Focus adds spell attack only while
   * that rod, staff, or wand is equipped and (if the infusion requires it) attuned.
   */
  attunedItemIds?: ReadonlySet<string>
}): InfusionBonuses {
  const entries = listArtificerEntries(input.classes)
  if (!entries.length) return EMPTY

  const acc: InfusionBonuses = {
    acBonus: 0,
    weaponAttackBonus: 0,
    weaponDamageBonus: 0,
    spellAttackBonus: 0,
    saveBonus: 0,
    darkvisionFt: 0,
    abilityFloor: {},
    speedWalkBonusFt: 0,
    initiativeAdvantage: false,
    resistances: [],
    labels: [],
    weaponByItem: {},
    activeDefs: [],
    allyBindings: [],
  }

  for (const entry of entries) {
    const level = Math.min(20, Math.max(1, Math.floor(entry.level)))
    const bindings = listActiveInfusionBindings(input.featurePicks, entry.id)
    for (const binding of bindings) {
      const def = infusionById(binding.infusionId)
      if (!def) continue
      if (binding.target !== 'self') {
        acc.allyBindings.push(binding)
        continue
      }
      const fx = resolveActiveInfusionEffects(
        binding.infusionId,
        binding.replicateItemSlug,
      )
      const label = displayName(binding, def)
      accumulateEffects(label, fx, level, input, acc, def, binding)
      if (!fx) continue
      const itemId = binding.itemId?.trim() || ''
      const item = itemId ? input.items?.find((row) => row.id === itemId) : undefined
      const itemOk =
        Boolean(itemId) &&
        (item
          ? infusionAcceptsItem(binding.infusionId, item)
          : input.items == null)
      const wAtk = resolveInfusionNumericBonus(fx.weaponAttackBonus, level)
      const wDmg = resolveInfusionNumericBonus(fx.weaponDamageBonus, level)
      if (itemOk && itemId && (wAtk || wDmg)) {
        const prev = acc.weaponByItem[itemId] ?? { attack: 0, damage: 0 }
        acc.weaponByItem[itemId] = {
          attack: prev.attack + (wAtk || 0),
          damage: prev.damage + (wDmg || 0),
        }
        acc.labels.push(`${label} → предмет +${wAtk || 0}/+${wDmg || 0}`)
      }
      if (fx.spellAttackBonus) {
        const sAtk = resolveInfusionNumericBonus(fx.spellAttackBonus, level)
        if (sAtk) {
          const tracked = input.items != null
          const held =
            !tracked || (Boolean(itemId) && Boolean(item?.equipped) && itemOk)
          const attuned =
            !fx.requiresAttunement ||
            !tracked ||
            (Boolean(itemId) && (input.attunedItemIds?.has(itemId) ?? false))
          if (held && attuned) {
            acc.spellAttackBonus += sAtk
            acc.labels.push(`${label} атака закл. +${sAtk}`)
          }
        }
      }
      if (fx.acBonus && itemId) {
        const worn = item ? Boolean(item.equipped) : input.items == null
        const n = resolveInfusionNumericBonus(fx.acBonus, level)
        if (n && worn && itemOk) {
          acc.acBonus += n
          acc.labels.push(`${label} +${n} КД`)
        }
      } else if (fx.acBonus && !itemId) {
        const n = resolveInfusionNumericBonus(fx.acBonus, level)
        if (n) {
          acc.acBonus += n
          acc.labels.push(`${label} +${n} КД`)
        }
      }
    }
  }

  return acc
}

/** Raise ability scores to infusion floors (gauntlets / headband / …). */
export function applyInfusionAbilityFloors<T extends Record<AbilityScoreKey, number>>(
  abilities: T,
  floors: Partial<Record<AbilityScoreKey, number>>,
): T {
  const keys = Object.keys(floors) as AbilityScoreKey[]
  if (!keys.length) return abilities
  const next = { ...abilities }
  for (const key of keys) {
    const floor = floors[key]
    if (floor == null) continue
    if (next[key] < floor) next[key] = floor
  }
  return next
}

/** Flat AC an ally's sheet should gain from this infusion (0 if it is not an AC infusion). */
export function infusionShareAcBonus(
  binding: ActiveInfusionBinding,
  artificerLevel: number,
): number {
  const fx = resolveActiveInfusionEffects(
    binding.infusionId,
    binding.replicateItemSlug,
  )
  if (!fx?.acBonus) return 0
  return resolveInfusionNumericBonus(fx.acBonus, artificerLevel)
}

/** Core infusion id used as effect.slug on the ally sheet. */
export function infusionShareSlug(binding: ActiveInfusionBinding): string {
  const parsed = parseReplicateItemRef(binding.infusionId)
  if (parsed?.slug) return `replicate_${parsed.slug}`
  const id = binding.infusionId.trim().toLowerCase()
  return id || 'enhanced_defense'
}

/** Structured B-01 mods for ally infusion sync (weapon/focus/resist/init/speed). */
export function infusionShareMods(
  binding: ActiveInfusionBinding,
  artificerLevel: number,
): EffectMod[] {
  const fx = resolveActiveInfusionEffects(
    binding.infusionId,
    binding.replicateItemSlug,
  )
  if (!fx) return []
  const mods: EffectMod[] = []
  const ac = resolveInfusionNumericBonus(fx.acBonus, artificerLevel)
  if (ac) mods.push({ target: 'ac', op: 'add', value: ac })
  if (fx.acBonusUnarmoredUnshielded) {
    mods.push({
      target: 'ac',
      op: 'add',
      value: fx.acBonusUnarmoredUnshielded,
      condition: 'no_armor_no_shield',
    })
  }
  const wAtk = resolveInfusionNumericBonus(fx.weaponAttackBonus, artificerLevel)
  const wDmg = resolveInfusionNumericBonus(fx.weaponDamageBonus, artificerLevel)
  if (wAtk) mods.push({ target: 'weapon_attack', op: 'add', value: wAtk })
  if (wDmg) mods.push({ target: 'weapon_damage', op: 'add', value: wDmg })
  const sAtk = resolveInfusionNumericBonus(fx.spellAttackBonus, artificerLevel)
  if (sAtk) mods.push({ target: 'spell_attack', op: 'add', value: sAtk })
  if (fx.saveBonus) {
    mods.push({ target: 'save', op: 'add', value: fx.saveBonus, condition: 'all' })
  }
  if (fx.abilityFloor) {
    mods.push({
      target: 'ability_score',
      op: 'set',
      value: fx.abilityFloor.score,
      condition: fx.abilityFloor.ability,
    })
  }
  if (fx.speedWalkBonusFt) {
    mods.push({ target: 'speed', op: 'add', value: fx.speedWalkBonusFt })
  }
  if (fx.initiativeAdvantage) {
    mods.push({ target: 'advantage', op: 'advantage', condition: 'initiative' })
  }
  const resist =
    fx.resistance ||
    (fx.resistanceFromOption ? binding.option?.trim() || null : null)
  if (resist) {
    mods.push({ target: 'resistance', op: 'set', condition: resist })
  }
  if (fx.charges) {
    mods.push({
      target: 'label',
      op: 'set',
      value: fx.charges,
      condition: `infusion_charges_${infusionShareSlug(binding)}`,
    })
  }
  // Radiant weapon light / repulsion push — sheet label; enemy push → lobby 12–14.
  if (binding.infusionId.includes('radiant_weapon')) {
    mods.push({ target: 'label', op: 'set', condition: 'radiant_weapon_light' })
    mods.push({ target: 'label', op: 'set', condition: 'radiant_weapon_blind' })
  }
  if (binding.infusionId.includes('repulsion_shield')) {
    mods.push({ target: 'label', op: 'set', condition: 'repulsion_shield_push' })
  }
  if (binding.infusionId.includes('mind_sharpener')) {
    mods.push({
      target: 'label',
      op: 'set',
      condition: 'mind_sharpener_concentration',
    })
  }
  if (binding.infusionId.includes('armor_of_magical_strength')) {
    mods.push({
      target: 'label',
      op: 'set',
      condition: 'armor_of_magical_strength',
    })
  }
  if (binding.infusionId.includes('spell_refueling_ring')) {
    mods.push({
      target: 'label',
      op: 'set',
      condition: 'spell_refueling_ring',
    })
  }
  return mods
}

/** RU label for lobby share-effect on an ally. */
export function infusionShareEffectName(
  binding: ActiveInfusionBinding,
  artificerLevel: number,
): string {
  const def = infusionById(binding.infusionId)
  const fx = resolveActiveInfusionEffects(
    binding.infusionId,
    binding.replicateItemSlug,
  )
  const label = def
    ? displayName(binding, def)
    : binding.infusionId
  const bits: string[] = [label]
  if (fx?.acBonus) {
    const n = resolveInfusionNumericBonus(fx.acBonus, artificerLevel)
    if (n) bits.push(`+${n} КД`)
  }
  if (fx?.acBonusUnarmoredUnshielded) {
    bits.push(`+${fx.acBonusUnarmoredUnshielded} КД без доспеха/щита`)
  }
  if (fx?.weaponAttackBonus || fx?.weaponDamageBonus) {
    const a = resolveInfusionNumericBonus(fx.weaponAttackBonus, artificerLevel)
    const d = resolveInfusionNumericBonus(fx.weaponDamageBonus, artificerLevel)
    bits.push(`оружие +${a || 0}/+${d || 0}`)
  }
  if (fx?.spellAttackBonus) {
    const n = resolveInfusionNumericBonus(fx.spellAttackBonus, artificerLevel)
    if (n) bits.push(`атака закл. +${n}`)
  }
  if (fx?.saveBonus) bits.push(`спас +${fx.saveBonus}`)
  if (fx?.abilityFloor) {
    bits.push(`${fx.abilityFloor.ability.toUpperCase()}≥${fx.abilityFloor.score}`)
  }
  if (fx?.speedWalkBonusFt) bits.push(`+${fx.speedWalkBonusFt} фт`)
  if (fx?.initiativeAdvantage) bits.push('преим. инициатива')
  const resist =
    fx?.resistance ||
    (fx?.resistanceFromOption ? binding.option?.trim() || null : null)
  if (resist) bits.push(`сопр. ${resist}`)
  return bits.join(' · ')
}
