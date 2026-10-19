import type { CharacterDetail } from '../../shared/api/characters'
import {
  createCustomAttack,
  type WeaponAttack,
} from '../characters/AttacksPanel'
import {
  ABILITY_KEYS,
  abilityModifier,
  asRecord,
  formatModifier,
  type AbilityKey,
} from '../characters/sheetTypes'
import { asProfBonus } from './classicPrintShared'
import { abilityScore, cloneSheet, type ClassicPatch } from './fromApi'

/** Blank rows on the classic attacks table (WotC-style). */
export const CLASSIC_WEAPON_SLOTS = 3

export type ClassicWeaponRow = {
  id: string
  name: string
  /** Printed attack bonus cell (manual override or computed). */
  attackBonus: string
  /** Joined damage + damage type for the blank column. */
  damageLine: string
}

function readWeaponAttacks(sheet: Record<string, unknown>): WeaponAttack[] {
  const raw = sheet.weapons
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const row = asRecord(item)
    const ability = ABILITY_KEYS.includes(row.ability as AbilityKey)
      ? (row.ability as AbilityKey)
      : 'str'
    const sourceKind =
      row.source_kind === 'weapon' ||
      row.source_kind === 'artifact' ||
      row.source_kind === 'custom' ||
      row.source_kind === 'race'
        ? row.source_kind
        : typeof row.id === 'string' && row.id.startsWith('race-nw:')
          ? 'race'
          : row.catalog_id
            ? 'weapon'
            : 'custom'
    return {
      id: typeof row.id === 'string' ? row.id : `weapon-${index}`,
      name: typeof row.name === 'string' ? row.name : '',
      catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
      source_kind: sourceKind,
      ability,
      is_proficient: Boolean(row.is_proficient),
      damage: typeof row.damage === 'string' ? row.damage : '',
      damage_type: typeof row.damage_type === 'string' ? row.damage_type : '',
      qty:
        typeof row.qty === 'number' && Number.isFinite(row.qty) && row.qty > 1
          ? Math.floor(row.qty)
          : null,
      inventory_item_id:
        typeof row.inventory_item_id === 'string' ? row.inventory_item_id : null,
      held: Boolean(row.held),
      // Classic blank column — kept as an extra field interactive UI ignores.
      ...(typeof row.attack_bonus === 'string' ? { attack_bonus: row.attack_bonus } : null),
    } as WeaponAttack & { attack_bonus?: string }
  })
}

function joinDamageLine(damage: string, damageType: string): string {
  return [damage.trim(), damageType.trim()].filter(Boolean).join(' ')
}

/** Split «1к8+3 рубящий» → damage / type (last non-numeric token = type). */
export function splitDamageLine(raw: string): { damage: string; damageType: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { damage: '', damageType: '' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { damage: trimmed, damageType: '' }
  const last = parts[parts.length - 1]
  if (/\d/.test(last)) return { damage: trimmed, damageType: '' }
  return { damage: parts.slice(0, -1).join(' '), damageType: last }
}

function computedAttackBonus(
  character: CharacterDetail,
  attack: WeaponAttack,
): string {
  const mod = abilityModifier(abilityScore(character, attack.ability))
  const pb = attack.is_proficient ? asProfBonus(character) : 0
  return formatModifier(mod + pb)
}

function rowAttackBonus(
  character: CharacterDetail,
  attack: WeaponAttack & { attack_bonus?: string },
): string {
  const manual = attack.attack_bonus?.trim()
  if (manual) return manual
  if (!attack.name.trim() && !attack.damage.trim()) return ''
  return computedAttackBonus(character, attack)
}

export function classicWeaponRows(character: CharacterDetail): ClassicWeaponRow[] {
  const attacks = readWeaponAttacks(asRecord(character.sheet))
  const rows = attacks.map((attack) => {
    const withBonus = attack as WeaponAttack & { attack_bonus?: string }
    return {
      id: attack.id,
      name: attack.name,
      attackBonus: rowAttackBonus(character, withBonus),
      damageLine: joinDamageLine(attack.damage, attack.damage_type),
    }
  })
  while (rows.length < CLASSIC_WEAPON_SLOTS) {
    rows.push({ id: `empty-${rows.length}`, name: '', attackBonus: '', damageLine: '' })
  }
  return rows.slice(0, Math.max(CLASSIC_WEAPON_SLOTS, attacks.length))
}

function isBlankAttack(attack: WeaponAttack & { attack_bonus?: string }): boolean {
  return (
    !attack.name.trim() &&
    !attack.damage.trim() &&
    !attack.damage_type.trim() &&
    !(attack.attack_bonus ?? '').trim() &&
    !attack.catalog_id &&
    !attack.inventory_item_id
  )
}

export function patchClassicWeapon(
  character: CharacterDetail,
  index: number,
  patch: Partial<{ name: string; attackBonus: string; damageLine: string }>,
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const current = readWeaponAttacks(sheet) as Array<WeaponAttack & { attack_bonus?: string }>
  const working = [...current]
  while (working.length <= index) {
    working.push({ ...createCustomAttack(), attack_bonus: '' })
  }
  const entry = working[index]
  const damageParts =
    patch.damageLine !== undefined ? splitDamageLine(patch.damageLine) : null
  const next: WeaponAttack & { attack_bonus?: string } = {
    ...entry,
    name: patch.name !== undefined ? patch.name : entry.name,
    damage: damageParts ? damageParts.damage : entry.damage,
    damage_type: damageParts ? damageParts.damageType : entry.damage_type,
    attack_bonus:
      patch.attackBonus !== undefined ? patch.attackBonus : entry.attack_bonus,
  }
  working[index] = next
  sheet.weapons = working
    .filter((row) => !isBlankAttack(row))
    .map((row) => {
      const out: Record<string, unknown> = {
        id: row.id,
        name: row.name,
        catalog_id: row.catalog_id,
        source_kind: row.source_kind,
        ability: row.ability,
        is_proficient: row.is_proficient,
        damage: row.damage,
        damage_type: row.damage_type,
        qty: row.qty ?? null,
        inventory_item_id: row.inventory_item_id ?? null,
        held: Boolean(row.held),
      }
      if (row.attack_bonus?.trim()) out.attack_bonus = row.attack_bonus.trim()
      return out
    })
  return { sheet }
}
