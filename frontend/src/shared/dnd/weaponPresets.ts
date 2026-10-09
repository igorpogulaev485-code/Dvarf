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
  /** PHB light — qty>1 → separate attack cards. */
  light?: boolean
  /** Thrown/ammo stack — qty>1 → one card + qty field. */
  ammoStack?: boolean
}

const PRESETS: WeaponPreset[] = [
  { labelRu: 'Секира', damage: '1к12', damageType: 'рубящий', ability: 'str', aliases: ['большое топорище', 'greataxe'] },
  { labelRu: 'Боевой топор', damage: '1к8', damageType: 'рубящий', ability: 'str', aliases: ['battleaxe'] },
  { labelRu: 'Молот', damage: '2к6', damageType: 'дробящий', ability: 'str', aliases: ['maul', 'двуручный молот'] },
  { labelRu: 'Ручной топор', damage: '1к6', damageType: 'рубящий', ability: 'str', aliases: ['handaxe'], light: true },
  {
    labelRu: 'Метательное копьё',
    damage: '1к6',
    damageType: 'колющий',
    ability: 'str',
    aliases: ['метательное копье', 'javelin'],
    ammoStack: true,
  },
  { labelRu: 'Длинный меч', damage: '1к8', damageType: 'рубящий', ability: 'str', aliases: ['длинный меч', 'longsword'] },
  { labelRu: 'Короткий меч', damage: '1к6', damageType: 'колющий', ability: 'dex', aliases: ['shortsword'], light: true },
  { labelRu: 'Рапира', damage: '1к8', damageType: 'колющий', ability: 'dex', aliases: ['rapier'] },
  {
    labelRu: 'Ятаган',
    damage: '1к6',
    damageType: 'рубящий',
    ability: 'dex',
    aliases: ['scimitar', 'скимитар'],
    light: true,
  },
  { labelRu: 'Кинжал', damage: '1к4', damageType: 'колющий', ability: 'dex', aliases: ['dagger'], light: true },
  { labelRu: 'Булава', damage: '1к6', damageType: 'дробящий', ability: 'str', aliases: ['mace'] },
  { labelRu: 'Боевой молот', damage: '1к8', damageType: 'дробящий', ability: 'str', aliases: ['warhammer'] },
  { labelRu: 'Боевой посох', damage: '1к6', damageType: 'дробящий', ability: 'str', aliases: ['посох', 'quarterstaff'] },
  { labelRu: 'Дубинка', damage: '1к4', damageType: 'дробящий', ability: 'str', aliases: ['club'], light: true },
  { labelRu: 'Дротик', damage: '1к4', damageType: 'колющий', ability: 'dex', aliases: ['dart'], ammoStack: true },
  { labelRu: 'Копьё', damage: '1к6', damageType: 'колющий', ability: 'str', aliases: ['копье', 'spear'], ammoStack: true },
  { labelRu: 'Лёгкий арбалет', damage: '1к8', damageType: 'колющий', ability: 'dex', aliases: ['легкий арбалет', 'light crossbow'] },
  {
    labelRu: 'Ручной арбалет',
    damage: '1к6',
    damageType: 'колющий',
    ability: 'dex',
    aliases: ['hand crossbow', 'handcrossbow'],
    light: true,
  },
  { labelRu: 'Короткий лук', damage: '1к6', damageType: 'колющий', ability: 'dex', aliases: ['shortbow'] },
  { labelRu: 'Длинный лук', damage: '1к8', damageType: 'колющий', ability: 'dex', aliases: ['longbow'] },
  { labelRu: 'Трезубец', damage: '1к6', damageType: 'колющий', ability: 'str', aliases: ['trident'] },
  { labelRu: 'Сеть', damage: '—', damageType: 'особый', ability: 'dex', aliases: ['net'] },
  {
    labelRu: 'Лёгкий молот',
    damage: '1к4',
    damageType: 'дробящий',
    ability: 'str',
    aliases: ['легкий молот', 'light hammer', 'lighthammer'],
    light: true,
  },
  { labelRu: 'Палица', damage: '1к8', damageType: 'дробящий', ability: 'str', aliases: ['двуручная дубина', 'greatclub'] },
  { labelRu: 'Серп', damage: '1к4', damageType: 'рубящий', ability: 'str', aliases: ['sickle'], light: true },
  { labelRu: 'Праща', damage: '1к4', damageType: 'дробящий', ability: 'dex', aliases: ['sling'] },
  { labelRu: 'Алебарда', damage: '1к10', damageType: 'рубящий', ability: 'str', aliases: ['halberd'] },
  { labelRu: 'Глефа', damage: '1к10', damageType: 'рубящий', ability: 'str', aliases: ['glaive'] },
  { labelRu: 'Двуручный меч', damage: '2к6', damageType: 'рубящий', ability: 'str', aliases: ['greatsword'] },
  { labelRu: 'Пика', damage: '1к10', damageType: 'колющий', ability: 'str', aliases: ['pike'] },
  { labelRu: 'Цеп', damage: '1к8', damageType: 'дробящий', ability: 'str', aliases: ['flail'] },
  { labelRu: 'Моргенштерн', damage: '1к8', damageType: 'колющий', ability: 'str', aliases: ['morningstar'] },
  { labelRu: 'Кнут', damage: '1к4', damageType: 'рубящий', ability: 'dex', aliases: ['whip'] },
  { labelRu: 'Боевая кирка', damage: '1к8', damageType: 'колющий', ability: 'str', aliases: ['клевец', 'war pick', 'war_pick'] },
  { labelRu: 'Длинное копьё', damage: '1к12', damageType: 'колющий', ability: 'str', aliases: ['длинное копье', 'lance'] },
  { labelRu: 'Тяжёлый арбалет', damage: '1к10', damageType: 'колющий', ability: 'dex', aliases: ['тяжелый арбалет', 'heavy crossbow'] },
  { labelRu: 'Духовая трубка', damage: '1', damageType: 'колющий', ability: 'dex', aliases: ['blowgun'] },
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
