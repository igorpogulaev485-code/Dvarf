import {
  DICE_MAX_COUNT,
  FORMULA_MAX_LEN,
  SIDES_MAX,
  SIDES_MIN,
  STANDARD_DICE,
  emptyPool,
  type DicePool,
  type ParseResult,
  type ParsedDieGroup,
  type ParsedTerm,
  type StandardDie,
} from './types'

const STANDARD_SET = new Set<number>(STANDARD_DICE)

/** Normalize die letter and d% → sides number. */
function parseSidesToken(raw: string): number | null {
  const t = raw.trim().toLowerCase().replace('к', 'd').replace('%', '100')
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  if (!Number.isInteger(n) || n < SIDES_MIN || n > SIDES_MAX) return null
  return n
}

function formatGroup(g: ParsedDieGroup): string {
  const core = `${g.count}d${g.sides}`
  if (g.keepHighest != null) return `${core}kh${g.keepHighest}`
  if (g.keepLowest != null) return `${core}kl${g.keepLowest}`
  return core
}

function formatCanonical(terms: ParsedTerm[]): string {
  let out = ''
  for (let i = 0; i < terms.length; i += 1) {
    const t = terms[i]!
    if (t.kind === 'mod') {
      if (t.value === 0 && terms.length > 1) continue
      if (i === 0) {
        out += String(t.value)
      } else {
        out += t.value >= 0 ? `+${t.value}` : String(t.value)
      }
      continue
    }
    const body = formatGroup(t)
    if (i === 0) {
      out += t.sign < 0 ? `-${body}` : body
    } else {
      out += t.sign < 0 ? `-${body}` : `+${body}`
    }
  }
  return out || '0'
}

function toPool(terms: ParsedTerm[]): { simple: boolean; pool: DicePool } {
  const pool = emptyPool()
  let simple = true
  for (const t of terms) {
    if (t.kind === 'mod') {
      pool.modifier += t.value
      continue
    }
    if (t.sign < 0 || t.keepHighest != null || t.keepLowest != null || t.count < 1) {
      simple = false
      continue
    }
    if (!STANDARD_SET.has(t.sides)) {
      simple = false
      continue
    }
    const sides = t.sides as StandardDie
    pool.counts[sides] = (pool.counts[sides] ?? 0) + t.count
  }
  // Multiple modifiers or non-standard already flagged; also reject if any dice term was skipped.
  if (terms.some((t) => t.kind === 'dice' && (t.sign < 0 || t.keepHighest != null || t.keepLowest != null))) {
    simple = false
  }
  if (terms.some((t) => t.kind === 'dice' && !STANDARD_SET.has(t.sides))) {
    simple = false
  }
  return { simple, pool }
}

function countDice(terms: ParsedTerm[]): number {
  let n = 0
  for (const t of terms) {
    if (t.kind === 'dice') n += t.count
  }
  return n
}

/** Exactly one positive plain d20 die in the whole expression (other dice ok). */
function singleD20Eligible(terms: ParsedTerm[]): boolean {
  let d20Faces = 0
  for (const t of terms) {
    if (t.kind !== 'dice') continue
    if (t.sides !== 20) continue
    if (t.sign < 0 || t.keepHighest != null || t.keepLowest != null) return false
    d20Faces += t.count
  }
  return d20Faces === 1
}

/**
 * Parse a free-form dice formula for DICE-01.
 * Supports: NdS / dS, d/D/к/К, d%, +/− groups and numbers, kh/kl, spaces.
 */
export function parseFormula(input: string): ParseResult {
  const raw = input ?? ''
  if (raw.length > FORMULA_MAX_LEN) {
    return { ok: false, message: 'Слишком длинная запись' }
  }
  const src = raw.replace(/\s+/g, '')
  if (!src) {
    return { ok: false, message: 'Пустая запись' }
  }

  // Tokenize: optional leading sign, then repeating (dice|number)(+|- next)
  const terms: ParsedTerm[] = []
  let i = 0
  let expectTerm = true
  let sign: 1 | -1 = 1

  while (i < src.length) {
    const ch = src[i]!

    if (expectTerm && (ch === '+' || ch === '-')) {
      sign = ch === '-' ? -1 : 1
      i += 1
      continue
    }

    if (!expectTerm) {
      if (ch === '+' || ch === '-') {
        sign = ch === '-' ? -1 : 1
        expectTerm = true
        i += 1
        continue
      }
      return { ok: false, message: 'Не понял запись' }
    }

    // Dice: [N]dS[khN|klN]  (d/D/к/К, % → 100)
    const diceRe = /^(\d*)[dDкК](\d+|%)(?:(kh|kl)(\d+))?/i
    const m = src.slice(i).match(diceRe)
    if (m) {
      const countRaw = m[1] === '' || m[1] == null ? 1 : Number(m[1])
      if (!Number.isInteger(countRaw) || countRaw < 1) {
        return { ok: false, message: 'Неверное число костей' }
      }
      const sides = parseSidesToken(m[2]!)
      if (sides == null) {
        return { ok: false, message: 'Неверное число граней' }
      }
      let keepHighest: number | undefined
      let keepLowest: number | undefined
      if (m[3] && m[4]) {
        const keep = Number(m[4])
        if (!Number.isInteger(keep) || keep < 1) {
          return { ok: false, message: 'Не понял запись' }
        }
        if (keep > countRaw) {
          return { ok: false, message: 'Нельзя оставить больше костей, чем бросаешь' }
        }
        const kind = m[3].toLowerCase()
        if (kind === 'kh') keepHighest = keep
        else keepLowest = keep
      }
      terms.push({
        kind: 'dice',
        count: countRaw,
        sides,
        keepHighest,
        keepLowest,
        sign,
      })
      i += m[0].length
      expectTerm = false
      sign = 1
      continue
    }

    // Plain integer modifier
    const numMatch = src.slice(i).match(/^(\d+)/)
    if (numMatch) {
      const value = sign * Number(numMatch[1])
      terms.push({ kind: 'mod', value })
      i += numMatch[1]!.length
      expectTerm = false
      sign = 1
      continue
    }

    return { ok: false, message: 'Не понял запись' }
  }

  if (expectTerm || terms.length === 0) {
    return { ok: false, message: 'Не понял запись' }
  }

  const totalDice = countDice(terms)
  if (totalDice > DICE_MAX_COUNT) {
    return { ok: false, message: 'Слишком много костей' }
  }
  if (totalDice === 0 && !terms.some((t) => t.kind === 'mod')) {
    return { ok: false, message: 'Пустая запись' }
  }
  // Modifier-only is allowed as a formula but "Бросить" needs dice — UI disables.
  // Still a valid parse for error messaging consistency.

  for (const t of terms) {
    if (t.kind === 'dice' && (t.sides < SIDES_MIN || t.sides > SIDES_MAX)) {
      return { ok: false, message: 'Неверное число граней' }
    }
  }

  const { simple, pool } = toPool(terms)
  return {
    ok: true,
    terms,
    canonical: formatCanonical(terms),
    simplePool: simple && totalDice > 0,
    pool,
    totalDice,
    singleD20Eligible: singleD20Eligible(terms),
  }
}

/** Build formula string from clicker pool. */
export function formulaFromPool(pool: DicePool): string {
  const parts: string[] = []
  for (const sides of STANDARD_DICE) {
    const n = pool.counts[sides] ?? 0
    if (n > 0) parts.push(`${n}d${sides}`)
  }
  let out = parts.join('+')
  if (pool.modifier !== 0) {
    const m = pool.modifier
    if (!out) return String(m)
    out += m >= 0 ? `+${m}` : String(m)
  }
  return out
}

/** True when pool has at least one die. */
export function poolHasDice(pool: DicePool): boolean {
  return STANDARD_DICE.some((s) => (pool.counts[s] ?? 0) > 0)
}
