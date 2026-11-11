import { formatModifier } from './sheetTypes'

export type DeskRollMode = 'normal' | 'advantage' | 'disadvantage'

export type DieRoll = {
  die: number
  sides: number
}

export type CheckRoll = DieRoll & {
  modifier: number
  total: number
  mode: DeskRollMode
  /** The other d20 when advantage/disadvantage was used. */
  otherDie?: number
}

export type DamageRoll = {
  total: number
  detail: string
  parts: number[]
  modifier: number
}

/** Cryptographically strong when available; falls back to Math.random. */
export function rollDie(sides: number, rng: () => number = Math.random): number {
  const n = Math.max(2, Math.floor(sides))
  return 1 + Math.floor(rng() * n)
}

/**
 * 5e: advantage + forced disadvantage cancel to normal;
 * forced disadvantage alone → disadvantage.
 */
export function resolveRollMode(
  requested: DeskRollMode,
  forcedDisadvantage = false,
): DeskRollMode {
  if (!forcedDisadvantage) return requested
  if (requested === 'advantage') return 'normal'
  return 'disadvantage'
}

export function rollCheck(
  modifier: number,
  mode: DeskRollMode = 'normal',
  rng: () => number = Math.random,
): CheckRoll {
  const mod = Math.trunc(modifier)
  const first = rollDie(20, rng)
  if (mode === 'normal') {
    return { die: first, sides: 20, modifier: mod, total: first + mod, mode }
  }
  const second = rollDie(20, rng)
  const keep =
    mode === 'advantage' ? Math.max(first, second) : Math.min(first, second)
  const drop =
    mode === 'advantage' ? Math.min(first, second) : Math.max(first, second)
  return {
    die: keep,
    otherDie: drop,
    sides: 20,
    modifier: mod,
    total: keep + mod,
    mode,
  }
}

/**
 * Parse expressions like `1d8+2`, `2к6`, `1d8 + 2 - 1`.
 * Ignores trailing words (damage type). Returns null if no dice found.
 */
export function parseDamageExpression(raw: string): {
  count: number
  sides: number
  modifier: number
} | null {
  const text = raw.trim().toLowerCase().replace(/,/g, '.')
  if (!text) return null
  const match = text.match(/(\d+)\s*[dк]\s*(\d+)/i)
  if (!match) return null
  const count = Math.max(1, Math.floor(Number(match[1])))
  const sides = Math.max(2, Math.floor(Number(match[2])))
  const after = text.slice((match.index ?? 0) + match[0].length)
  let modifier = 0
  const modRe = /([+-])\s*(\d+)/g
  let m: RegExpExecArray | null
  while ((m = modRe.exec(after))) {
    const sign = m[1] === '-' ? -1 : 1
    modifier += sign * Math.floor(Number(m[2]))
  }
  return { count, sides, modifier }
}

export function rollDamage(
  expression: string,
  rng: () => number = Math.random,
): DamageRoll | null {
  const parsed = parseDamageExpression(expression)
  if (!parsed) return null
  const parts: number[] = []
  for (let i = 0; i < parsed.count; i += 1) {
    parts.push(rollDie(parsed.sides, rng))
  }
  const sum = parts.reduce((a, b) => a + b, 0)
  const total = sum + parsed.modifier
  const diceBit = parts.join('+')
  const modBit =
    parsed.modifier === 0
      ? ''
      : parsed.modifier > 0
        ? `+${parsed.modifier}`
        : String(parsed.modifier)
  return {
    total,
    detail: `${parsed.count}d${parsed.sides}: ${diceBit}${modBit}`,
    parts,
    modifier: parsed.modifier,
  }
}

function modeLabel(mode: DeskRollMode): string {
  if (mode === 'advantage') return 'преим.'
  if (mode === 'disadvantage') return 'помеха'
  return ''
}

export function formatCheckRoll(label: string, roll: CheckRoll): string {
  const dice =
    roll.mode !== 'normal' && roll.otherDie != null
      ? `d20:${roll.die}/${roll.otherDie} ${modeLabel(roll.mode)}`
      : `d20:${roll.die}`
  return `${label}: ${roll.total} (${dice} ${formatModifier(roll.modifier)})`
}

export function formatAttackRoll(input: {
  name: string
  attackBonus: number
  damageExpr: string
  damageType?: string
  mode?: DeskRollMode
  rng?: () => number
}): string {
  const rng = input.rng ?? Math.random
  const mode = input.mode ?? 'normal'
  const hit = rollCheck(input.attackBonus, mode, rng)
  const dmg = rollDamage(input.damageExpr, rng)
  const typeBit = input.damageType?.trim() ? ` ${input.damageType.trim()}` : ''
  if (!dmg) {
    return `${formatCheckRoll(input.name, hit)} · урон ${input.damageExpr || '—'}${typeBit}`
  }
  return `${formatCheckRoll(input.name, hit)} · урон ${dmg.total}${typeBit} (${dmg.detail})`
}

export function formatSkillRoll(
  label: string,
  modifier: number,
  mode: DeskRollMode = 'normal',
  rng?: () => number,
): string {
  return formatCheckRoll(label, rollCheck(modifier, mode, rng))
}

/** PHB: padded, scale mail, half plate, all heavy — stealth disadvantage. */
const STEALTH_DISADV_KEYS = new Set([
  'padded',
  'scale_mail',
  'half_plate',
  'ring_mail',
  'chain_mail',
  'splint',
  'plate',
])

export function armorGivesStealthDisadvantage(input: {
  armorKind?: string | null
  armorName?: string | null
}): boolean {
  if (input.armorKind === 'heavy') return true
  const name = (input.armorName ?? '').trim().toLowerCase()
  if (!name) return false
  if (name.includes('стёган') || name.includes('стеган')) return true
  if (name.includes('чешуй')) return true
  if (name.includes('полулат')) return true
  if (name.includes('кольчуг') && !name.includes('рубах')) return true
  if (name.includes('наборн') || name.includes('лат')) return true
  if (name.includes('колеч')) return true
  for (const key of STEALTH_DISADV_KEYS) {
    if (name.includes(key.replace('_', ' '))) return true
  }
  return false
}
