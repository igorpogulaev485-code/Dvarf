import { formatModifier } from './sheetTypes'

export type DieRoll = {
  die: number
  sides: number
}

export type CheckRoll = DieRoll & {
  modifier: number
  total: number
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

export function rollCheck(
  modifier: number,
  rng: () => number = Math.random,
): CheckRoll {
  const die = rollDie(20, rng)
  const mod = Math.trunc(modifier)
  return { die, sides: 20, modifier: mod, total: die + mod }
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

export function formatCheckRoll(label: string, roll: CheckRoll): string {
  return `${label}: ${roll.total} (d20:${roll.die} ${formatModifier(roll.modifier)})`
}

export function formatAttackRoll(input: {
  name: string
  attackBonus: number
  damageExpr: string
  damageType?: string
  rng?: () => number
}): string {
  const rng = input.rng ?? Math.random
  const hit = rollCheck(input.attackBonus, rng)
  const dmg = rollDamage(input.damageExpr, rng)
  const typeBit = input.damageType?.trim() ? ` ${input.damageType.trim()}` : ''
  if (!dmg) {
    return `${formatCheckRoll(input.name, hit)} · урон ${input.damageExpr || '—'}${typeBit}`
  }
  return `${formatCheckRoll(input.name, hit)} · урон ${dmg.total}${typeBit} (${dmg.detail})`
}

export function formatSkillRoll(label: string, modifier: number, rng?: () => number): string {
  return formatCheckRoll(label, rollCheck(modifier, rng))
}
