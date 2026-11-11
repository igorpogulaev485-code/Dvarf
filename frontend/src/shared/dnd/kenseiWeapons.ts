/**
 * XGE Way of the Kensei weapons.
 * Any simple or martial weapon without the heavy or special property.
 * Longbow is an explicit exception (it is heavy).
 */

export type KenseiWeaponDef = {
  id: string
  nameRu: string
  kind: 'melee' | 'ranged'
}

export const KENSEI_WEAPONS: KenseiWeaponDef[] = [
  { id: 'club', nameRu: 'Дубинка', kind: 'melee' },
  { id: 'dagger', nameRu: 'Кинжал', kind: 'melee' },
  { id: 'greatclub', nameRu: 'Палица', kind: 'melee' },
  { id: 'handaxe', nameRu: 'Ручной топор', kind: 'melee' },
  { id: 'javelin', nameRu: 'Метательное копьё', kind: 'melee' },
  { id: 'light_hammer', nameRu: 'Лёгкий молот', kind: 'melee' },
  { id: 'mace', nameRu: 'Булава', kind: 'melee' },
  { id: 'quarterstaff', nameRu: 'Боевой посох', kind: 'melee' },
  { id: 'sickle', nameRu: 'Серп', kind: 'melee' },
  { id: 'spear', nameRu: 'Копьё', kind: 'melee' },
  { id: 'battleaxe', nameRu: 'Боевой топор', kind: 'melee' },
  { id: 'flail', nameRu: 'Цеп', kind: 'melee' },
  { id: 'longsword', nameRu: 'Длинный меч', kind: 'melee' },
  { id: 'morningstar', nameRu: 'Моргенштерн', kind: 'melee' },
  { id: 'rapier', nameRu: 'Рапира', kind: 'melee' },
  { id: 'scimitar', nameRu: 'Ятаган', kind: 'melee' },
  { id: 'shortsword', nameRu: 'Короткий меч', kind: 'melee' },
  { id: 'trident', nameRu: 'Трезубец', kind: 'melee' },
  { id: 'war_pick', nameRu: 'Боевая кирка', kind: 'melee' },
  { id: 'warhammer', nameRu: 'Боевой молот', kind: 'melee' },
  { id: 'whip', nameRu: 'Кнут', kind: 'melee' },
  { id: 'light_crossbow', nameRu: 'Лёгкий арбалет', kind: 'ranged' },
  { id: 'dart', nameRu: 'Дротик', kind: 'ranged' },
  { id: 'shortbow', nameRu: 'Короткий лук', kind: 'ranged' },
  { id: 'sling', nameRu: 'Праща', kind: 'ranged' },
  { id: 'blowgun', nameRu: 'Духовая трубка', kind: 'ranged' },
  { id: 'hand_crossbow', nameRu: 'Ручной арбалет', kind: 'ranged' },
  { id: 'longbow', nameRu: 'Длинный лук', kind: 'ranged' },
]

const BY_ID = new Map(KENSEI_WEAPONS.map((row) => [row.id, row]))

export function kenseiWeaponById(id: string | null | undefined): KenseiWeaponDef | null {
  if (!id) return null
  return BY_ID.get(id) ?? null
}

/** Level 3 is one melee and one ranged. Later picks (6/11/17) may be either. */
export function kenseiPairError(selected: string[]): string | null {
  if (selected.length !== 2) return null
  const kinds = selected.map((id) => kenseiWeaponById(id)?.kind)
  if (kinds.some((kind) => !kind)) return 'Выбери оружие из списка кэнсэя'
  const melee = kinds.filter((kind) => kind === 'melee').length
  const ranged = kinds.filter((kind) => kind === 'ranged').length
  if (melee !== 1 || ranged !== 1) {
    return 'На 3 ур. одно оружие ближнего боя и одно дальнобойное'
  }
  return null
}
