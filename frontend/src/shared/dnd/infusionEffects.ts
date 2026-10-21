/**
 * Aggregate combat / ability bonuses from active Artificer infusions
 * that target **self**. Ally-targeted infusions are shared via lobby
 * `share-effect` and must not double-apply on the artificer's sheet.
 */

import type { ClassLevelEntry } from './classLevels'
import {
  infusionById,
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
import type { FeaturePicksState } from './featurePicks'

export type InfusionBonuses = {
  acBonus: number
  weaponAttackBonus: number
  weaponDamageBonus: number
  spellAttackBonus: number
  saveBonus: number
  darkvisionFt: number
  abilityFloor: Partial<Record<AbilityScoreKey, number>>
  /** Short RU chips for AC / attack summaries. */
  labels: string[]
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
  labels: [],
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
): void {
  acc.activeDefs.push(def)
  if (!fx) {
    acc.labels.push(label)
    return
  }

  const ac = resolveInfusionNumericBonus(fx.acBonus, level)
  if (ac) {
    acc.acBonus += ac
    acc.labels.push(`${label} +${ac} КД`)
  }
  if (
    fx.acBonusUnarmoredUnshielded &&
    !input.wearingArmor &&
    !input.wearingShield
  ) {
    acc.acBonus += fx.acBonusUnarmoredUnshielded
    acc.labels.push(`${label} +${fx.acBonusUnarmoredUnshielded} КД`)
  }

  const wAtk = resolveInfusionNumericBonus(fx.weaponAttackBonus, level)
  const wDmg = resolveInfusionNumericBonus(fx.weaponDamageBonus, level)
  if (wAtk) acc.weaponAttackBonus += wAtk
  if (wDmg) acc.weaponDamageBonus += wDmg
  if (wAtk || wDmg) {
    acc.labels.push(`${label} оружие +${wAtk || 0}/+${wDmg || 0}`)
  }

  const sAtk = resolveInfusionNumericBonus(fx.spellAttackBonus, level)
  if (sAtk) {
    acc.spellAttackBonus += sAtk
    acc.labels.push(`${label} атака закл. +${sAtk}`)
  }

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

  if (
    !ac &&
    !fx.acBonusUnarmoredUnshielded &&
    !wAtk &&
    !wDmg &&
    !sAtk &&
    !fx.saveBonus &&
    !fx.abilityFloor
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
    labels: [],
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
      accumulateEffects(
        displayName(binding, def),
        fx,
        level,
        input,
        acc,
        def,
      )
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
  return bits.join(' · ')
}
