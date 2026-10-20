/** PHB 2014 starting-weapon presets (RU names from class equipment packages). */

import type { AbilityScoreKey } from './classFeatures'

export type WeaponProfGroup = 'simple' | 'martial'

export type WeaponPreset = {
  /** Canonical RU name as used on the sheet. */
  labelRu: string
  damage: string
  damageType: string
  ability: AbilityScoreKey
  /** PHB weapon table group — for «any simple/martial» pickers. */
  group: WeaponProfGroup
  /** Alternate RU labels that resolve to this preset. */
  aliases?: string[]
  /** PHB light — dual-wield / held hands (qty≥2 costs 2 hands when drawn). */
  light?: boolean
  /** Thrown/ammo flavour flag; attack rows always stack qty the same way. */
  ammoStack?: boolean
}

const PRESETS: WeaponPreset[] = [
  { labelRu: 'Секира', damage: '1к12', damageType: 'рубящий', ability: 'str',
  group: 'martial', aliases: ['большое топорище', 'greataxe'] },
  { labelRu: 'Боевой топор', damage: '1к8', damageType: 'рубящий', ability: 'str',
  group: 'martial', aliases: ['battleaxe'] },
  { labelRu: 'Молот', damage: '2к6', damageType: 'дробящий', ability: 'str',
  group: 'martial', aliases: ['maul', 'двуручный молот'] },
  { labelRu: 'Ручной топор', damage: '1к6', damageType: 'рубящий', ability: 'str',
  group: 'simple', aliases: ['handaxe'], light: true },
  {
    labelRu: 'Метательное копьё',
    damage: '1к6',
    damageType: 'колющий',
    ability: 'str',
  group: 'simple',
    aliases: ['метательное копье', 'javelin'],
    ammoStack: true,
  },
  { labelRu: 'Длинный меч', damage: '1к8', damageType: 'рубящий', ability: 'str',
  group: 'martial', aliases: ['длинный меч', 'longsword'] },
  { labelRu: 'Короткий меч', damage: '1к6', damageType: 'колющий', ability: 'dex',
  group: 'martial', aliases: ['shortsword'], light: true },
  { labelRu: 'Рапира', damage: '1к8', damageType: 'колющий', ability: 'dex',
  group: 'martial', aliases: ['rapier'] },
  {
    labelRu: 'Ятаган',
    damage: '1к6',
    damageType: 'рубящий',
    ability: 'dex',
  group: 'martial',
    aliases: ['scimitar', 'скимитар'],
    light: true,
  },
  { labelRu: 'Кинжал', damage: '1к4', damageType: 'колющий', ability: 'dex',
  group: 'simple', aliases: ['dagger'], light: true },
  { labelRu: 'Булава', damage: '1к6', damageType: 'дробящий', ability: 'str',
  group: 'simple', aliases: ['mace'] },
  { labelRu: 'Боевой молот', damage: '1к8', damageType: 'дробящий', ability: 'str',
  group: 'martial', aliases: ['warhammer'] },
  { labelRu: 'Боевой посох', damage: '1к6', damageType: 'дробящий', ability: 'str',
  group: 'simple', aliases: ['посох', 'quarterstaff'] },
  { labelRu: 'Дубинка', damage: '1к4', damageType: 'дробящий', ability: 'str',
  group: 'simple', aliases: ['club'], light: true },
  { labelRu: 'Дротик', damage: '1к4', damageType: 'колющий', ability: 'dex',
  group: 'simple', aliases: ['dart'], ammoStack: true },
  { labelRu: 'Копьё', damage: '1к6', damageType: 'колющий', ability: 'str',
  group: 'simple', aliases: ['копье', 'spear'], ammoStack: true },
  { labelRu: 'Лёгкий арбалет', damage: '1к8', damageType: 'колющий', ability: 'dex',
  group: 'simple', aliases: ['легкий арбалет', 'light crossbow'] },
  {
    labelRu: 'Ручной арбалет',
    damage: '1к6',
    damageType: 'колющий',
    ability: 'dex',
  group: 'martial',
    aliases: ['hand crossbow', 'handcrossbow'],
    light: true,
  },
  { labelRu: 'Короткий лук', damage: '1к6', damageType: 'колющий', ability: 'dex',
  group: 'simple', aliases: ['shortbow'] },
  { labelRu: 'Длинный лук', damage: '1к8', damageType: 'колющий', ability: 'dex',
  group: 'martial', aliases: ['longbow'] },
  {
    labelRu: 'Сверкающий Лунный Лук',
    damage: '1к8+1к6',
    damageType: 'колющий + излучение',
    ability: 'dex',
    group: 'martial',
    aliases: [
      'glimmering moonbow',
      'glimmering_moonbow',
      'moonbow',
      'лунный лук',
      'сверкающий лунный лук',
    ],
  },
  { labelRu: 'Трезубец', damage: '1к6', damageType: 'колющий', ability: 'str',
  group: 'martial', aliases: ['trident'] },
  { labelRu: 'Сеть', damage: '—', damageType: 'особый', ability: 'dex',
  group: 'martial', aliases: ['net'] },
  {
    labelRu: 'Лёгкий молот',
    damage: '1к4',
    damageType: 'дробящий',
    ability: 'str',
  group: 'simple',
    aliases: ['легкий молот', 'light hammer', 'lighthammer'],
    light: true,
  },
  { labelRu: 'Палица', damage: '1к8', damageType: 'дробящий', ability: 'str',
  group: 'simple', aliases: ['двуручная дубина', 'greatclub'] },
  { labelRu: 'Серп', damage: '1к4', damageType: 'рубящий', ability: 'str',
  group: 'simple', aliases: ['sickle'], light: true },
  { labelRu: 'Праща', damage: '1к4', damageType: 'дробящий', ability: 'dex',
  group: 'simple', aliases: ['sling'] },
  { labelRu: 'Алебарда', damage: '1к10', damageType: 'рубящий', ability: 'str',
  group: 'martial', aliases: ['halberd'] },
  { labelRu: 'Глефа', damage: '1к10', damageType: 'рубящий', ability: 'str',
  group: 'martial', aliases: ['glaive'] },
  { labelRu: 'Двуручный меч', damage: '2к6', damageType: 'рубящий', ability: 'str',
  group: 'martial', aliases: ['greatsword'] },
  { labelRu: 'Пика', damage: '1к10', damageType: 'колющий', ability: 'str',
  group: 'martial', aliases: ['pike'] },
  { labelRu: 'Цеп', damage: '1к8', damageType: 'дробящий', ability: 'str',
  group: 'martial', aliases: ['flail'] },
  { labelRu: 'Моргенштерн', damage: '1к8', damageType: 'колющий', ability: 'str',
  group: 'martial', aliases: ['morningstar'] },
  { labelRu: 'Кнут', damage: '1к4', damageType: 'рубящий', ability: 'dex',
  group: 'martial', aliases: ['whip'] },
  { labelRu: 'Боевая кирка', damage: '1к8', damageType: 'колющий', ability: 'str',
  group: 'martial', aliases: ['клевец', 'war pick', 'war_pick'] },
  { labelRu: 'Длинное копьё', damage: '1к12', damageType: 'колющий', ability: 'str',
  group: 'martial', aliases: ['длинное копье', 'lance'] },
  { labelRu: 'Тяжёлый арбалет', damage: '1к10', damageType: 'колющий', ability: 'dex',
  group: 'martial', aliases: ['тяжелый арбалет', 'heavy crossbow'] },
  { labelRu: 'Духовая трубка', damage: '1', damageType: 'колющий', ability: 'dex',
  group: 'martial', aliases: ['blowgun'] },
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
  }
  for (const preset of PRESETS) {
    if (preset.aliases?.some((alias) => normalize(alias) === key)) return preset
  }
  // Soft match: longest label wins so «Боевой молот» ≠ «Молот» (maul).
  let best: WeaponPreset | null = null
  let bestLen = 0
  for (const preset of PRESETS) {
    const label = normalize(preset.labelRu)
    if (!label || !key.includes(label)) continue
    if (label.length > bestLen) {
      best = preset
      bestLen = label.length
    }
  }
  return best
}

/** PHB simple / martial lists for class equipment «any … weapon» picks. */
export function listWeaponPresetsByGroup(group: WeaponProfGroup): WeaponPreset[] {
  return PRESETS.filter((row) => row.group === group)
}
