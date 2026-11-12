/**
 * B-07: feat combat helpers (AC, damage reduction, resistances, roll modes).
 * Ledger flags/numbers come from featGrants — formulas live here, not duplicated.
 */
import type { AppliedFeatGrant } from './featGrants'
import type { ArmorPiece } from './armor'
import { isPhysicalDamage, type DamageType } from './damageTypes'
import { findWeaponPreset } from './weaponPresets'

export type InventoryItemLike = {
  equipped?: boolean
  armor_kind?: string | null
  weapon_grip?: string | null
  name?: string
  qty?: number | null
  wear_slot?: string | null
}

function isWeaponItem(item: InventoryItemLike): boolean {
  if (item.armor_kind === 'shield') return false
  if (item.armor_kind && item.armor_kind !== 'none') return false
  if (item.weapon_grip === 'one_hand' || item.weapon_grip === 'two_hand') return true
  const slot = item.wear_slot
  if (slot === 'held_main' || slot === 'held_off') {
    return Boolean(String(item.name || '').trim())
  }
  return findWeaponPreset(String(item.name || '')) != null
}

/** Collect unique flags across the feat ledger. */
export function collectFeatFlags(ledger: AppliedFeatGrant[] | null | undefined): Set<string> {
  const out = new Set<string>()
  for (const row of ledger ?? []) {
    for (const flag of row.applied?.flags ?? []) {
      const key = String(flag || '')
        .trim()
        .toLowerCase()
        .replace(/-/g, '_')
      if (key) out.add(key)
    }
  }
  return out
}

export function hasFeatFlag(
  ledger: AppliedFeatGrant[] | null | undefined,
  flag: string,
): boolean {
  const key = String(flag || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  if (!key) return false
  return collectFeatFlags(ledger).has(key)
}

export function sumFeatAcBonusDualWield(
  ledger: AppliedFeatGrant[] | null | undefined,
): number {
  let sum = 0
  for (const row of ledger ?? []) {
    const n = Math.floor(Number(row.applied?.acBonusDualWield ?? 0))
    if (n > 0) sum += n
  }
  return sum
}

const RANGED_NAME_RE =
  /лук|арбалет|дротик|пращ|пистол|ружь|мушкет|bow|crossbow|dart|sling|firearm|gun/i

/** Equipped melee weapons currently in hand (not shields, not ranged). */
export function countEquippedMeleeWeapons(
  items: InventoryItemLike[] | null | undefined,
): number {
  let n = 0
  for (const item of items ?? []) {
    if (!item.equipped) continue
    if (item.armor_kind === 'shield') continue
    if (!isWeaponItem(item)) continue
    const name = String(item.name || '')
    if (RANGED_NAME_RE.test(name)) continue
    // Stack of two light weapons in one inventory row costs two hands / two weapons.
    const qty = Math.max(1, Math.floor(Number(item.qty ?? 1)))
    if (qty >= 2) {
      n += 2
      continue
    }
    n += 1
  }
  return n
}

/**
 * Dual Wielder: +1 AC while holding a melee weapon in each hand.
 * One sword → no bonus.
 */
export function dualWielderAcBonus(
  ledger: AppliedFeatGrant[] | null | undefined,
  items: InventoryItemLike[] | null | undefined,
): number {
  const bonus = sumFeatAcBonusDualWield(ledger)
  if (bonus <= 0 && !hasFeatFlag(ledger, 'dual_wielder')) return 0
  const amount = bonus > 0 ? bonus : hasFeatFlag(ledger, 'dual_wielder') ? 1 : 0
  if (amount <= 0) return 0
  if (countEquippedMeleeWeapons(items) < 2) return 0
  return amount
}

/** Medium Armor Master: raise medium maxDex to 3. */
export function applyMediumArmorMasterCap(
  armor: ArmorPiece | null | undefined,
  ledger: AppliedFeatGrant[] | null | undefined,
): ArmorPiece | null {
  if (!armor) return null
  if (armor.kind !== 'medium') return armor
  if (!hasFeatFlag(ledger, 'medium_armor_master')) return armor
  const current = armor.maxDexBonus
  if (current === null) return armor
  const cap = typeof current === 'number' ? current : 2
  if (cap >= 3) return armor
  return { ...armor, maxDexBonus: 3 }
}

/** Medium Armor Master clears medium-armor stealth disadvantage. */
export function mediumArmorMasterClearsStealth(
  armorKind: string | null | undefined,
  ledger: AppliedFeatGrant[] | null | undefined,
): boolean {
  return (
    String(armorKind || '').toLowerCase() === 'medium' &&
    hasFeatFlag(ledger, 'medium_armor_master')
  )
}

/**
 * Heavy Armor Master: −3 to nonmagical B/P/S while wearing heavy armor (Р6: before resist).
 */
export function heavyArmorMasterFlatReduction(input: {
  ledger?: AppliedFeatGrant[] | null
  armorKind?: string | null
  damageType?: DamageType | null
  nonmagical?: boolean
  amount: number
}): { amount: number; note: string } {
  const amount = Math.max(0, Math.floor(input.amount))
  if (amount <= 0) return { amount, note: '' }
  if (!input.nonmagical) return { amount, note: '' }
  if (!input.damageType || !isPhysicalDamage(input.damageType)) {
    return { amount, note: '' }
  }
  if (String(input.armorKind || '').toLowerCase() !== 'heavy') {
    return { amount, note: '' }
  }
  if (!hasFeatFlag(input.ledger, 'heavy_armor_master')) {
    return { amount, note: '' }
  }
  const next = Math.max(0, amount - 3)
  return {
    amount: next,
    note: `Мастер тяжёлых доспехов: ${amount} → ${next}`,
  }
}

const FEAT_RESIST_FLAG_MAP: Record<string, string[]> = {
  infernal_constitution: ['cold', 'poison'],
  resist_fire: ['fire'],
  resist_cold: ['cold'],
  resist_lightning: ['lightning'],
  resist_thunder: ['thunder'],
  resist_acid: ['acid'],
  resist_poison: ['poison'],
  resist_necrotic: ['necrotic'],
  resist_radiant: ['radiant'],
  resist_psychic: ['psychic'],
  resist_force: ['force'],
  fury_of_the_frost_giant: ['cold'],
  ember_of_the_fire_giant: ['fire'],
}

/** Resistances granted by feat flags (into the single sheetDamageProfile list). */
export function featResistanceTypes(
  ledger: AppliedFeatGrant[] | null | undefined,
): Array<{ type: string; source: string }> {
  const out: Array<{ type: string; source: string }> = []
  const seen = new Set<string>()
  for (const row of ledger ?? []) {
    const source = row.nameRu?.trim() || row.slug || 'черта'
    for (const raw of row.applied?.flags ?? []) {
      const flag = String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/-/g, '_')
      const types = FEAT_RESIST_FLAG_MAP[flag]
      if (!types) continue
      for (const type of types) {
        const key = `${type}|${source}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ type, source })
      }
    }
  }
  return out
}

export function inspiringLeaderTempHp(level: number, chaMod: number): number {
  return Math.max(1, Math.floor(level) + Math.floor(chaMod))
}

/** Chef snacks (TCE): temp HP = proficiency bonus. */
export function chefSnackTempHp(proficiencyBonus: number): number {
  return Math.max(1, Math.floor(proficiencyBonus))
}

/** Chef short-rest food: creatures = 4 + PB (TCE; table «на БМ» — ошибка отчёта). */
export function chefFoodCreatureCount(proficiencyBonus: number): number {
  return 4 + Math.max(1, Math.floor(proficiencyBonus))
}

/** Elven Accuracy abilities (XGE). */
export const ELVEN_ACCURACY_ABILITIES = new Set(['dex', 'int', 'wis', 'cha'])

export function elvenAccuracyApplies(input: {
  ledger?: AppliedFeatGrant[] | null
  mode: 'normal' | 'advantage' | 'disadvantage'
  abilityKey?: string | null
}): boolean {
  if (input.mode !== 'advantage') return false
  if (!hasFeatFlag(input.ledger, 'elven_accuracy')) return false
  const key = String(input.abilityKey || '')
    .trim()
    .toLowerCase()
  return ELVEN_ACCURACY_ABILITIES.has(key)
}

export function warCasterConcentrationAdvantage(
  ledger: AppliedFeatGrant[] | null | undefined,
  abilityKey: string | null | undefined,
  concentrating: boolean,
): boolean {
  if (!concentrating) return false
  if (String(abilityKey || '').toLowerCase() !== 'con') return false
  return hasFeatFlag(ledger, 'war_caster')
}

export function infernalPoisonSaveAdvantage(
  ledger: AppliedFeatGrant[] | null | undefined,
  condition?: string | null,
): boolean {
  if (!hasFeatFlag(ledger, 'infernal_constitution')) return false
  const c = String(condition || '')
    .trim()
    .toLowerCase()
  return !c || c === 'poisoned' || c === 'poison'
}

/** Shield Master: +shield AC bonus to Dex saves vs effects targeting only you. */
export function shieldMasterDexSaveBonus(input: {
  ledger?: AppliedFeatGrant[] | null
  shieldBonus?: number | null
  abilityKey?: string | null
  /** Player marks «эффект только на вас». */
  aloneTarget?: boolean
}): number {
  if (!input.aloneTarget) return 0
  if (String(input.abilityKey || '').toLowerCase() !== 'dex') return 0
  if (!hasFeatFlag(input.ledger, 'shield_master')) return 0
  const bonus = Math.max(0, Math.floor(Number(input.shieldBonus ?? 0)))
  return bonus > 0 ? bonus : 2
}
