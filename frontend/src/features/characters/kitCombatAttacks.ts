/**
 * CMB-01: computed combat rows for every character — unarmed strike + improvised weapon.
 * Not persisted to draft.weapons (monk Martial Arts card stays via martialArts.ts).
 */
import type { WeaponAttack } from './AttacksPanel'
import { isRaceNaturalWeaponAttack } from './AttacksPanel'
import {
  isMonkUnarmedAttack,
  MONK_UNARMED_ATTACK_ID,
} from '../../shared/dnd/martialArts'
import { tavernBrawlerUnarmedDamage } from '../../shared/dnd/o05CombatFeats'
import { damageDieFaces } from '../../shared/dnd/martialArts'
import { unarmedFightingDie } from '../../shared/dnd/fightingStyles'

export const KIT_UNARMED_ATTACK_ID = 'kit:unarmed-strike'
export const KIT_IMPROVISED_ATTACK_ID = 'kit:improvised-weapon'

export const KIT_UNARMED_NAME = 'Безоружный удар'
export const KIT_IMPROVISED_NAME = 'Импровизированное оружие'

export function isKitUnarmedAttack(attack: { id: string }): boolean {
  return attack.id === KIT_UNARMED_ATTACK_ID
}

export function isKitImprovisedAttack(attack: { id: string }): boolean {
  return attack.id === KIT_IMPROVISED_ATTACK_ID
}

export function isKitComputedAttack(attack: { id: string }): boolean {
  return isKitUnarmedAttack(attack) || isKitImprovisedAttack(attack)
}

/** Draft rows that the kit replaces (never race natural / monk MA). */
export function isDraftUnarmedOrImprovisedDuplicate(attack: WeaponAttack): boolean {
  if (isMonkUnarmedAttack(attack) || isRaceNaturalWeaponAttack(attack)) return false
  if (isKitComputedAttack(attack)) return true
  const n = attack.name.trim().toLowerCase()
  if (n === 'безоружный удар' || n === 'unarmed strike') return true
  if (n.startsWith('импровизирован') || n.includes('improvised weapon')) return true
  return false
}

function toRuDie(expr: string): string {
  return expr.replace(/d/gi, 'к')
}

/**
 * Base unarmed die before +STR in the roll UI.
 * PHB: 1; Tavern Brawler → floor 1к4; Unarmed Fighting → 1к6 / 1к8 (best wins).
 */
export function resolveKitUnarmedDamage(input: {
  hasTavernBrawler: boolean
  styleIds: Array<string | null | undefined>
  holdingWeaponOrShield: boolean
  featUnarmedDamage?: string | null
}): string {
  let dmg = '1'
  if (input.hasTavernBrawler) {
    dmg = tavernBrawlerUnarmedDamage(input.featUnarmedDamage || dmg)
  }
  const uf = unarmedFightingDie({
    styleIds: input.styleIds,
    holdingWeaponOrShield: input.holdingWeaponOrShield,
  })
  if (uf) {
    const ru = toRuDie(uf)
    const curFaces = dmg === '1' ? 1 : damageDieFaces(dmg)
    if (damageDieFaces(ru) >= curFaces) dmg = ru
  }
  return dmg
}

export function buildKitUnarmedAttack(input: {
  damage: string
}): WeaponAttack {
  return {
    id: KIT_UNARMED_ATTACK_ID,
    name: KIT_UNARMED_NAME,
    catalog_id: null,
    source_kind: 'custom',
    ability: 'str',
    is_proficient: true,
    damage: input.damage,
    damage_type: 'дробящий',
    inventory_item_id: null,
    held: true,
    qty: null,
    range_kind: 'melee',
  }
}

export function buildKitImprovisedAttack(input: {
  hasTavernBrawler: boolean
}): WeaponAttack {
  return {
    id: KIT_IMPROVISED_ATTACK_ID,
    name: KIT_IMPROVISED_NAME,
    catalog_id: null,
    source_kind: 'custom',
    ability: 'str',
    is_proficient: input.hasTavernBrawler,
    damage: '1к4',
    damage_type: 'дробящий',
    inventory_item_id: null,
    held: true,
    qty: null,
    range_kind: 'melee',
  }
}

export function holdingWeaponOrShieldForUnarmedStyle(input: {
  inventoryItems: Array<{
    equipped?: boolean
    armor_kind?: string | null
    weapon_grip?: string | null
    name?: string
    wear_slot?: string | null
  }>
  weapons: WeaponAttack[]
}): boolean {
  for (const item of input.inventoryItems) {
    if (!item.equipped) continue
    if (item.armor_kind === 'shield') return true
    const grip = item.weapon_grip
    if (grip === 'one_hand' || grip === 'two_hand' || grip === 'versatile') return true
    const slot = item.wear_slot
    if (
      (slot === 'held_main' || slot === 'held_off') &&
      /меч|топор|кинжал|булав|молот|копь|рапир|секир|дубин|посох|лук|арбалет|щит/i.test(
        item.name || '',
      )
    ) {
      return true
    }
  }
  for (const w of input.weapons) {
    if (!w.held) continue
    if (isMonkUnarmedAttack(w) || isKitComputedAttack(w) || isRaceNaturalWeaponAttack(w)) {
      continue
    }
    if (w.inventory_item_id) return true
  }
  return false
}

/**
 * Desk attack list: persisted weapons (minus draft unarmed/improvised dupes)
 * + computed kit rows last. Monk MA card (class-ma:unarmed) stays; kit unarmed skipped.
 */
export function listDeskCombatAttacks(input: {
  weapons: WeaponAttack[]
  martialArtsDie: string | null | undefined
  hasTavernBrawler: boolean
  styleIds: Array<string | null | undefined>
  inventoryItems: Array<{
    equipped?: boolean
    armor_kind?: string | null
    weapon_grip?: string | null
    name?: string
    wear_slot?: string | null
  }>
  featUnarmedDamage?: string | null
}): WeaponAttack[] {
  const base = input.weapons.filter(
    (row) => row.name.trim() && !isDraftUnarmedOrImprovisedDuplicate(row),
  )
  const hasMonkUnarmed =
    Boolean(input.martialArtsDie) ||
    base.some(isMonkUnarmedAttack) ||
    input.weapons.some(isMonkUnarmedAttack)

  const holding = holdingWeaponOrShieldForUnarmedStyle({
    inventoryItems: input.inventoryItems,
    weapons: input.weapons,
  })

  const out = [...base]
  if (!hasMonkUnarmed) {
    out.push(
      buildKitUnarmedAttack({
        damage: resolveKitUnarmedDamage({
          hasTavernBrawler: input.hasTavernBrawler,
          styleIds: input.styleIds,
          holdingWeaponOrShield: holding,
          featUnarmedDamage: input.featUnarmedDamage,
        }),
      }),
    )
  }
  out.push(
    buildKitImprovisedAttack({
      hasTavernBrawler: input.hasTavernBrawler,
    }),
  )
  return out
}

export { MONK_UNARMED_ATTACK_ID }
