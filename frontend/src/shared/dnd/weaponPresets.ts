/** PHB 2014 starting-weapon presets (RU names from class equipment packages). */

import type { AbilityScoreKey } from './classFeatures'

export type WeaponPreset = {
  /** Canonical RU name as used on the sheet. */
  labelRu: string
  damage: string
  damageType: string
  ability: AbilityScoreKey
  /** Alternate RU labels that resolve to this preset. */
  aliases?: string[]
}

const PRESETS: WeaponPreset[] = [
  { labelRu: 'Секира', damage: '1к12', damageType: 'рубящий', ability: 'str', aliases: ['большое топорище', 'greataxe'] },
  { labelRu: 'Боевой топор', damage: '1к8', damageType: 'рубящий', ability: 'str', aliases: ['battleaxe'] },
  { labelRu: 'Молот', damage: '2к6', damageType: 'дробящий', ability: 'str', aliases: ['maul', 'двуручный молот'] },
  { labelRu: 'Ручной топор', damage: '1к6', damageType: 'рубящий', ability: 'str', aliases: ['handaxe'] },
  { labelRu: 'Метательное копьё', damage: '1к6', damageType: 'колющий', ability: 'str', aliases: ['метательное копье', 'javelin'] },
  { labelRu: 'Длинный меч', damage: '1к8', damageType: 'рубящий', ability: 'str', aliases: ['длинный меч', 'longsword'] },
  { labelRu: 'Короткий меч', damage: '1к6', damageType: 'колющий', ability: 'dex', aliases: ['shortsword'] },
  { labelRu: 'Рапира', damage: '1к8', damageType: 'колющий', ability: 'dex', aliases: ['rapier'] },
  { labelRu: 'Ятаган', damage: '1к6', damageType: 'рубящий', ability: 'dex', aliases: ['scimitar'] },
  { labelRu: 'Кинжал', damage: '1к4', damageType: 'колющий', ability: 'dex', aliases: ['dagger'] },
  { labelRu: 'Булава', damage: '1к6', damageType: 'дробящий', ability: 'str', aliases: ['mace'] },
  { labelRu: 'Боевой молот', damage: '1к8', damageType: 'дробящий', ability: 'str', aliases: ['warhammer'] },
  { labelRu: 'Боевой посох', damage: '1к6', damageType: 'дробящий', ability: 'str', aliases: ['посох', 'quarterstaff'] },
  { labelRu: 'Дубинка', damage: '1к4', damageType: 'дробящий', ability: 'str', aliases: ['club'] },
  { labelRu: 'Дротик', damage: '1к4', damageType: 'колющий', ability: 'dex', aliases: ['dart'] },
  { labelRu: 'Копьё', damage: '1к6', damageType: 'колющий', ability: 'str', aliases: ['копье', 'spear'] },
  { labelRu: 'Лёгкий арбалет', damage: '1к8', damageType: 'колющий', ability: 'dex', aliases: ['легкий арбалет', 'light crossbow'] },
  { labelRu: 'Короткий лук', damage: '1к6', damageType: 'колющий', ability: 'dex', aliases: ['shortbow'] },
  { labelRu: 'Длинный лук', damage: '1к8', damageType: 'колющий', ability: 'dex', aliases: ['longbow'] },
]

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Resolve a starting-gear name to a weapon preset, or null for non-weapons. */
export function findWeaponPreset(name: string): WeaponPreset | null {
  const key = normalize(name)
  if (!key) return null
  for (const preset of PRESETS) {
    if (normalize(preset.labelRu) === key) return preset
    if (preset.aliases?.some((alias) => normalize(alias) === key)) return preset
    // Soft match: "Длинный меч (боевой)" etc.
    if (key.includes(normalize(preset.labelRu))) return preset
  }
  return null
}
