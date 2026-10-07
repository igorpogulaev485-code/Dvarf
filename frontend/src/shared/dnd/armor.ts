/** 2014 armor class from equipped armor + shield + race natural armor. */

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
} | null {
  const kindRaw = data.armor_kind ?? data.armor_type ?? data.category
  let kind: ArmorKind = 'none'
  if (isArmorKind(kindRaw)) {
    kind = kindRaw
  } else if (typeof kindRaw === 'string') {
    const lower = kindRaw.toLowerCase()
    if (lower.includes('shield') || lower.includes('щит')) kind = 'shield'
    else if (lower.includes('light') || lower.includes('лёгк') || lower.includes('легк'))
      kind = 'light'
    else if (lower.includes('medium') || lower.includes('средн')) kind = 'medium'
    else if (lower.includes('heavy') || lower.includes('тяж')) kind = 'heavy'
  }

  const base =
    typeof data.base_ac === 'number'
      ? data.base_ac
      : typeof data.ac === 'number'
        ? data.ac
        : typeof data.ac_bonus === 'number'
          ? data.ac_bonus
          : null

  if (kind === 'none' && base == null) return null
  if (kind === 'none' && base != null) kind = 'light'
  return {
    armor_kind: kind,
    base_ac: base,
    weight_lb:
      typeof data.weight_lb === 'number'
        ? data.weight_lb
        : typeof data.weight === 'number'
          ? data.weight
          : null,
  }
}

export function bodyArmorAc(kind: BodyArmorKind, baseAc: number, dexMod: number): number {
  const base = Math.max(0, Math.floor(baseAc))
  if (kind === 'light') return base + dexMod
  if (kind === 'medium') return base + Math.min(2, dexMod)
  return base
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

export function computeArmorClass(input: {
  dexMod: number
  /** Full ability mods when natural armor uses CON/etc. */
  abilityMods?: Partial<Record<AbilityModKey, number>>
  armor: ArmorPiece | null
  shield: ShieldPiece | null
  naturalArmor?: NaturalArmor | null
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

  if (input.armor) {
    ac = bodyArmorAc(input.armor.kind, input.armor.baseAc, dex)
    const name = input.armor.name || armorKindLabel(input.armor.kind)
    if (input.armor.kind === 'heavy') {
      parts.push(`${name} ${input.armor.baseAc}`)
    } else if (input.armor.kind === 'medium') {
      parts.push(`${name} ${input.armor.baseAc}+ЛОВ≤2`)
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
