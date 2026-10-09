/** 2014 armor class from equipped armor + shield + race natural armor. */

import {
  isUsableArmorCatalog,
  parseArmorCatalogData,
} from './gearCatalog'

export const ARMOR_KINDS = ['none', 'light', 'medium', 'heavy', 'shield'] as const
export type ArmorKind = (typeof ARMOR_KINDS)[number]

export type BodyArmorKind = 'light' | 'medium' | 'heavy'

export type AbilityModKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

/** Race natural armor (tortle shell, loxodon hide, etc.). */
export type NaturalArmor = {
  base: number
  /** Ability mod added to base; null = flat (tortle 17). */
  mod: AbilityModKey | null
  /** Optional cap on the ability mod (medium-armor style). */
  modCap?: number | null
  allowsShield: boolean
  /** Extra AC while wearing body armor (warforged integrated protection). */
  armoredBonus?: number
  labelRu: string
}

export type ArmorPiece = {
  kind: BodyArmorKind
  baseAc: number
  name?: string
  /** From catalog `max_dex_bonus`; null = uncapped (light). Omitted → kind default. */
  maxDexBonus?: number | null
}

export type ShieldPiece = {
  kind: 'shield'
  baseAc: number
  name?: string
}

export type ArmorPreset = {
  key: string
  labelRu: string
  kind: Exclude<ArmorKind, 'none'>
  baseAc: number
  weight_lb: number
}

/** Common PHB 2014 armor / shield defaults for the sheet UI. */
export const ARMOR_PRESETS: ArmorPreset[] = [
  { key: 'padded', labelRu: 'Стёганый', kind: 'light', baseAc: 11, weight_lb: 8 },
  { key: 'leather', labelRu: 'Кожаный', kind: 'light', baseAc: 11, weight_lb: 10 },
  { key: 'studded_leather', labelRu: 'Клёпаный кожаный', kind: 'light', baseAc: 12, weight_lb: 13 },
  { key: 'hide', labelRu: 'Шкурный', kind: 'medium', baseAc: 12, weight_lb: 12 },
  { key: 'chain_shirt', labelRu: 'Кольчужная рубаха', kind: 'medium', baseAc: 13, weight_lb: 20 },
  { key: 'scale_mail', labelRu: 'Чешуйчатый', kind: 'medium', baseAc: 14, weight_lb: 45 },
  { key: 'breastplate', labelRu: 'Кираса', kind: 'medium', baseAc: 14, weight_lb: 20 },
  { key: 'half_plate', labelRu: 'Полулаты', kind: 'medium', baseAc: 15, weight_lb: 40 },
  { key: 'ring_mail', labelRu: 'Колечный', kind: 'heavy', baseAc: 14, weight_lb: 40 },
  { key: 'chain_mail', labelRu: 'Кольчуга', kind: 'heavy', baseAc: 16, weight_lb: 55 },
  { key: 'splint', labelRu: 'Наборный', kind: 'heavy', baseAc: 17, weight_lb: 60 },
  { key: 'plate', labelRu: 'Латы', kind: 'heavy', baseAc: 18, weight_lb: 65 },
  { key: 'shield', labelRu: 'Щит', kind: 'shield', baseAc: 2, weight_lb: 6 },
]

export function isArmorKind(value: unknown): value is ArmorKind {
  return (
    value === 'none' ||
    value === 'light' ||
    value === 'medium' ||
    value === 'heavy' ||
    value === 'shield'
  )
}

export function isBodyArmor(kind: ArmorKind): boolean {
  return kind === 'light' || kind === 'medium' || kind === 'heavy'
}

export function armorKindLabel(kind: ArmorKind): string {
  switch (kind) {
    case 'light':
      return 'Лёгкий'
    case 'medium':
      return 'Средний'
    case 'heavy':
      return 'Тяжёлый'
    case 'shield':
      return 'Щит'
    default:
      return 'Не броня'
  }
}

export function findArmorPreset(query: string): ArmorPreset | null {
  const key = query.trim().toLowerCase()
  if (!key) return null
  return (
    ARMOR_PRESETS.find(
      (item) =>
        item.key === key ||
        item.labelRu.toLowerCase() === key ||
        item.labelRu.toLowerCase().includes(key) ||
        key.includes(item.labelRu.toLowerCase()),
    ) ?? null
  )
}

export function readArmorFromCatalogData(data: Record<string, unknown>): {
  armor_kind: ArmorKind
  base_ac: number | null
  weight_lb: number | null
  max_dex_bonus: number | null
  strength_requirement: number | null
  stealth_disadvantage: boolean
} | null {
  const parsed = parseArmorCatalogData(data)
  if (!isUsableArmorCatalog(parsed) && parsed.armor_kind === 'none') return null
  return {
    armor_kind: parsed.armor_kind,
    base_ac: parsed.base_ac,
    weight_lb: parsed.weight_lb,
    max_dex_bonus: parsed.max_dex_bonus,
    strength_requirement: parsed.strength_requirement,
    stealth_disadvantage: parsed.stealth_disadvantage,
  }
}

/**
 * Body armor AC. `maxDexBonus`: null = uncapped, 0 = no DEX, N = cap.
 * When omitted, medium caps at 2 (PHB default).
 */
export function bodyArmorAc(
  kind: BodyArmorKind,
  baseAc: number,
  dexMod: number,
  maxDexBonus?: number | null,
): number {
  const base = Math.max(0, Math.floor(baseAc))
  if (kind === 'heavy') return base
  if (kind === 'light') {
    if (maxDexBonus === undefined || maxDexBonus === null) return base + dexMod
    return base + Math.min(maxDexBonus, dexMod)
  }
  // medium
  const cap = maxDexBonus === undefined ? 2 : maxDexBonus
  if (cap === null) return base + dexMod
  return base + Math.min(cap, dexMod)
}

const MOD_LABEL: Record<AbilityModKey, string> = {
  str: 'СИЛ',
  dex: 'ЛОВ',
  con: 'ТЕЛ',
  int: 'ИНТ',
  wis: 'МУД',
  cha: 'ХАР',
}

export function naturalArmorValue(
  natural: NaturalArmor,
  mods: Partial<Record<AbilityModKey, number>>,
): number {
  let ac = Math.max(0, Math.floor(natural.base))
  if (natural.mod) {
    let bonus = Math.floor(mods[natural.mod] ?? 0)
    if (typeof natural.modCap === 'number' && Number.isFinite(natural.modCap)) {
      bonus = Math.min(Math.floor(natural.modCap), bonus)
    }
    ac += bonus
  }
  return ac
}

/** Class Unarmored Defense (barbarian 10+DEX+CON, monk 10+DEX+WIS). */
export type UnarmoredDefense = {
  labelRu: string
  /** Second ability added on top of DEX. */
  secondMod: AbilityModKey
}

export function computeArmorClass(input: {
  dexMod: number
  /** Full ability mods when natural armor uses CON/etc. */
  abilityMods?: Partial<Record<AbilityModKey, number>>
  armor: ArmorPiece | null
  shield: ShieldPiece | null
  naturalArmor?: NaturalArmor | null
  /** Used only when no body armor and no race natural armor. */
  unarmoredDefense?: UnarmoredDefense | null
}): { ac: number; summary: string } {
  const dex = Math.floor(input.dexMod)
  const mods: Partial<Record<AbilityModKey, number>> = {
    dex,
    ...(input.abilityMods ?? {}),
  }
  mods.dex = dex

  let ac: number
  const parts: string[] = []
  const natural = input.naturalArmor ?? null
  const ud = input.unarmoredDefense ?? null

  if (input.armor) {
    const maxDex = input.armor.maxDexBonus
    ac = bodyArmorAc(input.armor.kind, input.armor.baseAc, dex, maxDex)
    const name = input.armor.name || armorKindLabel(input.armor.kind)
    if (input.armor.kind === 'heavy') {
      parts.push(`${name} ${input.armor.baseAc}`)
    } else if (input.armor.kind === 'medium') {
      const cap = maxDex === undefined ? 2 : maxDex
      parts.push(
        cap === null
          ? `${name} ${input.armor.baseAc}+ЛОВ`
          : `${name} ${input.armor.baseAc}+ЛОВ≤${cap}`,
      )
    } else {
      parts.push(`${name} ${input.armor.baseAc}+ЛОВ`)
    }
    const armoredBonus = natural?.armoredBonus
    if (typeof armoredBonus === 'number' && armoredBonus !== 0) {
      ac += Math.floor(armoredBonus)
      parts.push(`${natural?.labelRu ?? 'раса'} +${Math.floor(armoredBonus)}`)
    }
  } else if (natural) {
    ac = naturalArmorValue(natural, mods)
    if (!natural.mod) {
      parts.push(`${natural.labelRu} ${natural.base}`)
    } else {
      const modVal = Math.floor(mods[natural.mod] ?? 0)
      const capped =
        typeof natural.modCap === 'number' ? Math.min(natural.modCap, modVal) : modVal
      const capNote =
        typeof natural.modCap === 'number' ? `≤${natural.modCap}` : ''
      parts.push(
        `${natural.labelRu} ${natural.base}+${MOD_LABEL[natural.mod]}${capNote} ${
          capped >= 0 ? '+' : ''
        }${capped}`,
      )
    }
  } else if (ud) {
    const second = Math.floor(mods[ud.secondMod] ?? 0)
    ac = 10 + dex + second
    parts.push(
      `${ud.labelRu} 10+ЛОВ${dex >= 0 ? '+' : ''}${dex}+${MOD_LABEL[ud.secondMod]}${
        second >= 0 ? '+' : ''
      }${second}`,
    )
  } else {
    ac = 10 + dex
    parts.push(`10+ЛОВ ${dex >= 0 ? '+' : ''}${dex}`)
  }

  if (input.shield) {
    const shieldOk = !natural || Boolean(input.armor) || natural.allowsShield
    if (shieldOk) {
      const bonus = Math.max(0, Math.floor(input.shield.baseAc || 2))
      ac += bonus
      parts.push(`щит +${bonus}`)
    }
  }

  return { ac, summary: parts.join(' · ') }
}
