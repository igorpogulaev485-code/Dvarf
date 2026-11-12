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

/**
 * One AC formula that competes when no body armor is worn
 * (mage armor 13+DEX, robe 15+DEX, barrier tattoo).
 * The highest result wins. A shield is added on top when the winner allows it.
 */
export type CompetingAcFormula = {
  label: string
  base: number
  /** null/omitted = full Dex. 0 = ignore Dex. N = cap. */
  dexCap?: number | null
  allowsShield?: boolean
}

function dexContribution(dex: number, cap: number | null | undefined): number {
  if (cap === 0) return 0
  if (typeof cap === 'number' && Number.isFinite(cap)) return Math.min(Math.floor(cap), dex)
  return dex
}

/** Mage armor is 13+DEX while the spell is up and no armor is worn. */
export function mageArmorCompetingFormula(
  concentrationName: string | null | undefined,
): CompetingAcFormula | null {
  const name = concentrationName?.trim() ?? ''
  if (!name) return null
  if (!/доспех мага|mage armor/i.test(name)) return null
  return { label: 'Доспех мага', base: 13, dexCap: null, allowsShield: true }
}

type AcCandidate = {
  ac: number
  summary: string
  allowsShield: boolean
}

function withShield(
  candidate: AcCandidate,
  shield: ShieldPiece | null,
): { ac: number; summary: string } {
  if (!shield || !candidate.allowsShield) {
    return { ac: candidate.ac, summary: candidate.summary }
  }
  const bonus = Math.max(0, Math.floor(shield.baseAc || 2))
  return {
    ac: candidate.ac + bonus,
    summary: `${candidate.summary} · щит +${bonus}`,
  }
}

function bestCandidate(
  candidates: AcCandidate[],
  shield: ShieldPiece | null,
): { ac: number; summary: string } {
  let winner = candidates[0]
  let winnerAc = withShield(winner, shield).ac
  for (const candidate of candidates.slice(1)) {
    const next = withShield(candidate, shield).ac
    if (next > winnerAc) {
      winner = candidate
      winnerAc = next
    }
  }
  return withShield(winner, shield)
}

export function computeArmorClass(input: {
  dexMod: number
  /** Full ability mods when natural armor uses CON/etc. */
  abilityMods?: Partial<Record<AbilityModKey, number>>
  armor: ArmorPiece | null
  shield: ShieldPiece | null
  naturalArmor?: NaturalArmor | null
  /** Used only when no body armor is worn. Competes with other unarmored formulas. */
  unarmoredDefense?: UnarmoredDefense | null
  /**
   * Extra formulas (robe, mage armor, barrier tattoo). Ignored while body armor
   * is worn. The best of armor / natural / unarmored defense / these wins;
   * a shield is added afterwards when that formula allows it.
   */
  extraFormulas?: CompetingAcFormula[] | null
}): { ac: number; summary: string } {
  const dex = Math.floor(input.dexMod)
  const mods: Partial<Record<AbilityModKey, number>> = {
    dex,
    ...(input.abilityMods ?? {}),
  }
  mods.dex = dex

  const natural = input.naturalArmor ?? null
  const ud = input.unarmoredDefense ?? null

  if (input.armor) {
    let ac: number
    const parts: string[] = []
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
    if (input.shield) {
      const bonus = Math.max(0, Math.floor(input.shield.baseAc || 2))
      ac += bonus
      parts.push(`щит +${bonus}`)
    }
    return { ac, summary: parts.join(' · ') }
  }

  const candidates: AcCandidate[] = []
  if (natural) {
    const ac = naturalArmorValue(natural, mods)
    let summary: string
    if (!natural.mod) {
      summary = `${natural.labelRu} ${natural.base}`
    } else {
      const modVal = Math.floor(mods[natural.mod] ?? 0)
      const capped =
        typeof natural.modCap === 'number' ? Math.min(natural.modCap, modVal) : modVal
      const capNote = typeof natural.modCap === 'number' ? `≤${natural.modCap}` : ''
      summary = `${natural.labelRu} ${natural.base}+${MOD_LABEL[natural.mod]}${capNote} ${
        capped >= 0 ? '+' : ''
      }${capped}`
    }
    candidates.push({ ac, summary, allowsShield: natural.allowsShield })
  }
  if (ud) {
    const second = Math.floor(mods[ud.secondMod] ?? 0)
    candidates.push({
      ac: 10 + dex + second,
      summary: `${ud.labelRu} 10+ЛОВ${dex >= 0 ? '+' : ''}${dex}+${MOD_LABEL[ud.secondMod]}${
        second >= 0 ? '+' : ''
      }${second}`,
      allowsShield: true,
    })
  }
  candidates.push({
    ac: 10 + dex,
    summary: `10+ЛОВ ${dex >= 0 ? '+' : ''}${dex}`,
    allowsShield: true,
  })
  for (const formula of input.extraFormulas ?? []) {
    const dexPart = dexContribution(dex, formula.dexCap)
    const base = Math.max(0, Math.floor(formula.base))
    let summary = `${formula.label} ${base}`
    if (formula.dexCap !== 0) {
      summary +=
        formula.dexCap == null
          ? '+ЛОВ'
          : `+ЛОВ≤${Math.floor(formula.dexCap)}`
    }
    candidates.push({
      ac: base + dexPart,
      summary,
      allowsShield: formula.allowsShield !== false,
    })
  }

  return bestCandidate(candidates, input.shield)
}
