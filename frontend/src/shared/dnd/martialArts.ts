/**
 * Monk Martial Arts (PHB 2014): Dex for unarmed/monk weapons, MA die replaces
 * weapon damage when better, bonus unarmed after Attack action.
 */

import type { AbilityScoreKey, UnlockedFeature } from './classFeatures'
import { findWeaponPreset } from './weaponPresets'

/** Simple melee without heavy/two-handed + shortsword (PHB monk weapons). */
const MONK_WEAPON_NAMES = new Set(
  [
    'короткий меч',
    'shortsword',
    'дубинка',
    'club',
    'кинжал',
    'dagger',
    'ручной топор',
    'handaxe',
    'метательное копьё',
    'метательное копье',
    'javelin',
    'лёгкий молот',
    'легкий молот',
    'light hammer',
    'lighthammer',
    'булава',
    'mace',
    'боевой посох',
    'посох',
    'quarterstaff',
    'серп',
    'sickle',
    'копьё',
    'копье',
    'spear',
  ].map((s) => s.toLowerCase()),
)

export const MONK_UNARMED_ATTACK_ID = 'class-ma:unarmed'

export function isMonkUnarmedAttack(attack: { id: string }): boolean {
  return attack.id === MONK_UNARMED_ATTACK_ID || attack.id.startsWith('class-ma:unarmed:')
}

/** Martial Arts damage die for current unlocked features, e.g. "1к10". */
export function martialArtsDieFromFeatures(features: UnlockedFeature[]): string | null {
  for (const feature of features) {
    if (feature.id !== 'martial_arts') continue
    const value = feature.scaleValue?.trim()
    if (value) return value
  }
  return null
}

export function isMonkWeaponName(name: string): boolean {
  const key = name.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!key) return false
  if (MONK_WEAPON_NAMES.has(key)) return true
  for (const label of MONK_WEAPON_NAMES) {
    if (key.includes(label)) return true
  }
  const preset = findWeaponPreset(name)
  if (!preset) return false
  return MONK_WEAPON_NAMES.has(preset.labelRu.toLowerCase())
}

/** Highest single-die faces in expressions like "1к6", "1d10", "2к6". */
export function damageDieFaces(expr: string): number {
  const matches = [...expr.matchAll(/(\d+)\s*[кkd]\s*(\d+)/gi)]
  if (!matches.length) return 0
  let best = 0
  for (const match of matches) {
    const count = Number(match[1])
    const faces = Number(match[2])
    if (!Number.isFinite(count) || !Number.isFinite(faces)) continue
    // Prefer higher face size for MA substitution; multi-die weapons aren't monk weapons.
    best = Math.max(best, faces * (count > 1 ? count : 1))
  }
  return best
}

/**
 * Effective damage die for a monk weapon / unarmed: MA die when it is at least
 * as good as the weapon's listed die.
 */
export function effectiveMartialArtsDamage(input: {
  weaponDamage: string
  martialArtsDie: string | null
  /** Force MA die (unarmed strike). */
  forceMartialArts?: boolean
}): string {
  const weapon = input.weaponDamage.trim()
  const ma = input.martialArtsDie?.trim() || null
  if (!ma) return weapon
  if (input.forceMartialArts || !weapon || weapon === '—' || weapon === '-') {
    return ma
  }
  return damageDieFaces(ma) >= damageDieFaces(weapon) ? ma : weapon
}

export function monkAttackAbility(input: {
  str: number
  dex: number
  /** Weapon default ability before Martial Arts. */
  weaponAbility: AbilityScoreKey
}): AbilityScoreKey {
  const strMod = Math.floor((input.str - 10) / 2)
  const dexMod = Math.floor((input.dex - 10) / 2)
  if (input.weaponAbility === 'dex') return 'dex'
  return dexMod >= strMod ? 'dex' : 'str'
}

export type MonkUnarmedAttackCard = {
  id: string
  name: string
  catalog_id: null
  source_kind: 'class'
  ability: AbilityScoreKey
  is_proficient: true
  damage: string
  damage_type: string
  inventory_item_id: null
  held: true
  qty: null
}

export function buildMonkUnarmedAttack(input: {
  martialArtsDie: string
  str: number
  dex: number
}): MonkUnarmedAttackCard {
  return {
    id: MONK_UNARMED_ATTACK_ID,
    name: 'Безоружный удар',
    catalog_id: null,
    source_kind: 'class',
    ability: monkAttackAbility({
      str: input.str,
      dex: input.dex,
      weaponAbility: 'str',
    }),
    is_proficient: true,
    damage: input.martialArtsDie,
    damage_type: 'дробящий',
    inventory_item_id: null,
    held: true,
    qty: null,
  }
}

/** Keep a single unarmed card while Martial Arts is unlocked; strip otherwise. */
export function syncMonkUnarmedAttack<T extends { id: string }>(input: {
  weapons: T[]
  martialArtsDie: string | null
  str: number
  dex: number
}): T[] {
  const without = input.weapons.filter((row) => !isMonkUnarmedAttack(row))
  if (!input.martialArtsDie) return without
  const card = buildMonkUnarmedAttack({
    martialArtsDie: input.martialArtsDie,
    str: input.str,
    dex: input.dex,
  }) as unknown as T
  return [...without, card]
}
