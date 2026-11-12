/**
 * Which inventory row an artificer infusion may sit on (TCE item prerequisites).
 * Weapon bonuses apply only to that row — never to every attack.
 */

import { findWeaponPreset } from './weaponPresets'

export type InfusionItemShape = {
  id: string
  name: string
  equipped?: boolean
  armor_kind?: string | null
}

const AMMO_RE = /арбалет|лук|пращ|духов|crossbow|longbow|shortbow|\bbow\b|sling|blowgun/i
const THROWN_RE =
  /кинжал|ручной топор|метательн|копь|дротик|трезубец|сеть|dagger|handaxe|javelin|spear|dart|trident|\bnet\b/i

function isArmor(item: InfusionItemShape): boolean {
  return (
    item.armor_kind === 'light' ||
    item.armor_kind === 'medium' ||
    item.armor_kind === 'heavy' ||
    /доспех|armor/i.test(item.name)
  )
}

function isShield(item: InfusionItemShape): boolean {
  return item.armor_kind === 'shield' || /щит|shield/i.test(item.name)
}

function isWeapon(item: InfusionItemShape): boolean {
  return Boolean(findWeaponPreset(item.name)) || /оруж|weapon/i.test(item.name)
}

/** Core infusion id, ignoring a replicate suffix. */
export function infusionCoreId(infusionId: string): string {
  const raw = infusionId.trim()
  if (raw.startsWith('replicate_magic_item')) return 'replicate_magic_item'
  return raw.split(':')[0] || raw
}

export function infusionNeedsItem(infusionId: string): boolean {
  const id = infusionCoreId(infusionId)
  return (
    id === 'enhanced_weapon' ||
    id === 'repeating_shot' ||
    id === 'returning_weapon' ||
    id === 'radiant_weapon' ||
    id === 'enhanced_defense' ||
    id === 'repulsion_shield' ||
    id === 'resistant_armor' ||
    id === 'armor_of_magical_strength' ||
    id === 'enhanced_arcane_focus'
  )
}

export function infusionAcceptsItem(infusionId: string, item: InfusionItemShape): boolean {
  const id = infusionCoreId(infusionId)
  if (id === 'repeating_shot') return isWeapon(item) && AMMO_RE.test(item.name)
  if (id === 'returning_weapon') return isWeapon(item) && THROWN_RE.test(item.name)
  if (id === 'enhanced_weapon' || id === 'radiant_weapon') return isWeapon(item)
  if (id === 'repulsion_shield') return isShield(item)
  if (
    id === 'enhanced_defense' ||
    id === 'resistant_armor' ||
    id === 'armor_of_magical_strength'
  ) {
    return isArmor(item) || isShield(item)
  }
  if (id === 'enhanced_arcane_focus') {
    return /жезл|посох|палоч|сфер|wand|rod|staff|orb/i.test(item.name)
  }
  return true
}

/**
 * AC printed on a shared infusion effect.
 * Structured `ac_bonus` wins. Legacy names from infusionShareEffectName
 * (`Усиленная защита · +1 КД`) still count. Conditional «КД без доспеха» does not.
 */
export function infusionAcFromSharedEffects(effects: unknown): number {
  if (!Array.isArray(effects)) return 0
  let sum = 0
  for (const raw of effects) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    if (typeof row.ac_bonus === 'number' && Number.isFinite(row.ac_bonus)) {
      sum += Math.max(0, Math.floor(row.ac_bonus))
      continue
    }
    const name = typeof row.name === 'string' ? row.name : ''
    if (/КД\s*без/i.test(name)) continue
    const match = name.match(/·\s*\+(\d+)\s*КД(?!\p{L})/u)
    if (match) sum += Number(match[1])
  }
  return sum
}
