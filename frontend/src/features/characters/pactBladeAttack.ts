/**
 * Pact of the Blade: create a pact weapon in an empty hand, or bind a magic weapon.
 * The attack card is the combat row; the feature pick is the source of truth.
 */

import { getFeaturePick, type FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  pactBladeFormById,
  type PactBladeForm,
} from '../../shared/dnd/pack04SorcererWarlock'
import type { WeaponAttack } from './AttacksPanel'
import { isWarlockClassName, getPactBoonId } from './pactTomeEffects'

export function pactBladeAttackId(classEntryId: string): string {
  return `pact-blade:${classEntryId}`
}

export function isPactBladeAttack(attack: Pick<WeaponAttack, 'id'>): boolean {
  return attack.id.startsWith('pact-blade:')
}

function attackFromForm(input: {
  classEntryId: string
  form: PactBladeForm
  boundName: string
  hexblade: boolean
  existing?: WeaponAttack
}): WeaponAttack {
  const bound = input.boundName.trim()
  const name = bound
    ? `${bound} · договор`
    : `${input.form.nameRu} · договор`
  return {
    ...(input.existing ?? {
      id: pactBladeAttackId(input.classEntryId),
      catalog_id: null,
      source_kind: 'class',
      ability: 'str',
      is_proficient: true,
      damage: input.form.damage,
      damage_type: input.form.damageType,
    }),
    id: pactBladeAttackId(input.classEntryId),
    name,
    catalog_id: null,
    source_kind: 'class',
    ability: input.hexblade ? 'cha' : input.form.finesse ? 'dex' : 'str',
    is_proficient: true,
    damage: input.form.damage,
    damage_type: input.form.damageType,
    held: true,
    inventory_item_id: null,
  }
}

export function syncPactBladeAttack(input: {
  weapons: WeaponAttack[]
  featurePicks: FeaturePicksState
  classes: Array<{ id: string; name: string; level: number; subclass_name?: string }>
  subclassSlugByEntryId?: Record<string, string | null | undefined>
}): { weapons: WeaponAttack[]; changed: boolean } {
  const managed = new Set<string>()
  let weapons = [...input.weapons]
  let changed = false

  for (const row of input.classes) {
    if (!isWarlockClassName(row.name) || row.level < 3) continue
    const id = pactBladeAttackId(row.id)
    managed.add(id)
    const active = getPactBoonId(input.featurePicks, row.id) === 'blade'
    const formId = getFeaturePick(input.featurePicks, row.id, 'pact_blade_form')
    const bound = getFeaturePick(input.featurePicks, row.id, 'pact_blade_bound') ?? ''
    const form = pactBladeFormById(formId)
    const existing = weapons.find((attack) => attack.id === id)
    if (!active || !form) {
      if (existing) {
        weapons = weapons.filter((attack) => attack.id !== id)
        changed = true
      }
      continue
    }
    const subclass = (input.subclassSlugByEntryId?.[row.id] || row.subclass_name || '')
      .toLowerCase()
    const hexblade = subclass.includes('hex') || subclass.includes('хекс')
    const next = attackFromForm({
      classEntryId: row.id,
      form,
      boundName: bound,
      hexblade,
      existing,
    })
    if (
      !existing ||
      existing.name !== next.name ||
      existing.damage !== next.damage ||
      existing.damage_type !== next.damage_type ||
      existing.ability !== next.ability ||
      existing.held !== true
    ) {
      changed = true
      weapons = [...weapons.filter((attack) => attack.id !== id), next]
    }
  }

  const orphans = weapons.filter(
    (attack) => isPactBladeAttack(attack) && !managed.has(attack.id),
  )
  if (orphans.length) {
    const drop = new Set(orphans.map((attack) => attack.id))
    weapons = weapons.filter((attack) => !drop.has(attack.id))
    changed = true
  }

  if (!changed) return { weapons: input.weapons, changed: false }
  return { weapons, changed: true }
}
