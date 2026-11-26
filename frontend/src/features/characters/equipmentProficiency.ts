/**
 * Armor / weapon proficiency checks for the digital sheet.
 * Equipping armor and attack PB come from sheet grants — not manual chips on the item.
 */

import { parseWeaponCatalogData, type WeaponCategory } from '../../shared/dnd/gearCatalog'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets'
import type { ArmorKind } from '../../shared/dnd/armor'
import type { ArmorProficiency, WeaponProficiency } from './identity'
import { weaponBase } from './gearBaseChoice'
import { resolveWeaponExtraName } from './weaponProficiencyExtras'

/** PHB 2014 simple weapons (RU labels as on the sheet). */
const SIMPLE_WEAPON_RU = new Set(
  [
    'Дубинка',
    'Кинжал',
    'Палица',
    'Ручной топор',
    'Метательное копьё',
    'Лёгкий молот',
    'Булава',
    'Боевой посох',
    'Серп',
    'Копьё',
    'Лёгкий арбалет',
    'Дротик',
    'Короткий лук',
    'Праща',
  ].map((name) => normalizeName(name)),
)

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
}

function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a)
  const right = normalizeName(b)
  if (!left || !right) return false
  if (left === right) return true
  return left.includes(right) || right.includes(left)
}

/** Can this armor/shield be worn given sheet armor proficiencies? */
export function canWearArmor(
  armorKind: ArmorKind | null | undefined,
  armor: ArmorProficiency,
): boolean {
  if (!armorKind || armorKind === 'none') return true
  if (armorKind === 'light') return Boolean(armor.light)
  if (armorKind === 'medium') return Boolean(armor.medium)
  if (armorKind === 'heavy') return Boolean(armor.heavy)
  if (armorKind === 'shield') return Boolean(armor.shields)
  return true
}

export function armorProficiencyHint(armorKind: ArmorKind): string {
  if (armorKind === 'light') return 'Нужно владение лёгкими доспехами'
  if (armorKind === 'medium') return 'Нужно владение средними доспехами'
  if (armorKind === 'heavy') return 'Нужно владение тяжёлыми доспехами'
  if (armorKind === 'shield') return 'Нужно владение щитами'
  return 'Нет владения этим доспехом'
}

/** Strip trailing « +1/+2/+3 » so magic variants resolve to the PHB base. */
export function stripMagicBonusSuffix(name: string): string {
  return name.replace(/\s*\+\s*[123]\s*$/u, '').trim()
}

export function resolveWeaponCategory(input: {
  name: string
  catalogData?: Record<string, unknown> | null
  /** Inventory `base_weapon_slug` after I06 base choice (weapon_1 → crossbow_light). */
  baseWeaponSlug?: string | null
}): WeaponCategory | null {
  if (input.baseWeaponSlug?.trim()) {
    const base = weaponBase(input.baseWeaponSlug.trim())
    const bySlug =
      (base ? findWeaponPreset(base.nameRu) : null) ??
      findWeaponPreset(input.baseWeaponSlug.trim())
    if (bySlug) {
      return SIMPLE_WEAPON_RU.has(normalizeName(bySlug.labelRu)) ? 'simple' : 'martial'
    }
    if (base) {
      return SIMPLE_WEAPON_RU.has(normalizeName(base.nameRu)) ? 'simple' : 'martial'
    }
  }
  if (input.catalogData && Object.keys(input.catalogData).length > 0) {
    const parsed = parseWeaponCatalogData(input.catalogData)
    if (parsed.category === 'simple' || parsed.category === 'martial') {
      // Generic DMG «Оружие +N» is tagged simple in seed — treat as any-weapon.
      if (!isGenericMagicWeaponName(input.name)) return parsed.category
    }
  }
  const baseName = stripMagicBonusSuffix(input.name)
  const preset = findWeaponPreset(baseName) ?? findWeaponPreset(input.name)
  if (preset) {
    return SIMPLE_WEAPON_RU.has(normalizeName(preset.labelRu)) ? 'simple' : 'martial'
  }
  const resolved = resolveWeaponExtraName(baseName) ?? resolveWeaponExtraName(input.name)
  if (resolved && SIMPLE_WEAPON_RU.has(normalizeName(resolved))) return 'simple'
  if (resolved && findWeaponPreset(resolved)) {
    return SIMPLE_WEAPON_RU.has(normalizeName(resolved)) ? 'simple' : 'martial'
  }
  if (isGenericMagicWeaponName(input.name)) return null
  return null
}

function isGenericMagicWeaponName(name: string): boolean {
  const n = normalizeName(name)
  return /^оружие\s*\+/.test(n) || /^weapon\s*,?\s*\+/.test(n)
}

/** Does the sheet grant proficiency with this weapon attack? */
export function isWeaponProficient(input: {
  name: string
  catalogData?: Record<string, unknown> | null
  weapons: WeaponProficiency
  baseWeaponSlug?: string | null
  /**
   * Race natural weapons (claws, bite, …) are not inventory gear — always proficient
   * and ignore simple/martial / held-slot rules.
   */
  sourceKind?: string | null
  attackId?: string | null
}): boolean {
  // Natural weapons from race grants: always trained (PHB), never gated by inventory.
  // Monk unarmed (class Martial Arts) — always proficient.
  // Setting artifacts: backend marks is_proficient; attack name is often unique (Лассо Гонда).
  if (
    input.sourceKind === 'race' ||
    input.sourceKind === 'class' ||
    input.sourceKind === 'artifact' ||
    (typeof input.attackId === 'string' && input.attackId.startsWith('race-nw:')) ||
    (typeof input.attackId === 'string' && input.attackId.startsWith('class-ma:'))
  ) {
    return true
  }

  const baseName = stripMagicBonusSuffix(input.name)
  const extras = input.weapons.extras ?? []
  const slug = input.baseWeaponSlug?.trim() || ''
  const slugLabel = slug ? resolveWeaponExtraName(slug) : null
  for (const extra of extras) {
    if (namesMatch(input.name, extra) || namesMatch(baseName, extra)) return true
    const resolved = resolveWeaponExtraName(extra)
    if (resolved && (namesMatch(input.name, resolved) || namesMatch(baseName, resolved))) {
      return true
    }
    // Magic bows / +1 weapons: extras match via inventory base_weapon_slug.
    if (slug) {
      if (
        slug.replace(/[\s-]+/g, '_').toLowerCase() ===
        extra.trim().replace(/[\s-]+/g, '_').toLowerCase()
      ) {
        return true
      }
      if (slugLabel && resolved && namesMatch(slugLabel, resolved)) return true
      if (slugLabel && namesMatch(slugLabel, extra)) return true
    }
  }

  // Generic +1/+2/+3 — any weapon training counts.
  if (isGenericMagicWeaponName(input.name)) {
    return Boolean(input.weapons.simple || input.weapons.martial)
  }

  const category = resolveWeaponCategory({
    name: input.name,
    catalogData: input.catalogData,
    baseWeaponSlug: input.baseWeaponSlug,
  })
  if (category === 'simple') return Boolean(input.weapons.simple)
  if (category === 'martial') return Boolean(input.weapons.martial)

  // Unknown custom weapon — only via named extras (already checked).
  return false
}
