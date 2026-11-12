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
  /** All natural dice shown (Lucky pick / Elven Accuracy). */
  allDice?: number[]
  /** Player must pick which natural die to keep (Lucky R11). */
  needsPick?: boolean
  /** Label bit for format (эльф.точн. / удача). */
  featLabel?: string
  /** Total before a feature floor (Indomitable Might) replaced it. */
  rawTotal?: number
  floorLabel?: string
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
    return {
      die: first,
      sides: 20,
      modifier: mod,
      total: first + mod,
      mode,
      allDice: [first],
    }
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
    allDice: [first, second],
  }
}

/**
 * Elven Accuracy (XGE): with advantage on Dex/Int/Wis/Cha attack — roll 3d20, keep highest.
 */
export function rollCheckElvenAccuracy(
  modifier: number,
  rng: () => number = Math.random,
): CheckRoll {
  const mod = Math.trunc(modifier)
  const dice = [rollDie(20, rng), rollDie(20, rng), rollDie(20, rng)]
  const keep = Math.max(...dice)
  const sorted = [...dice].sort((a, b) => b - a)
  return {
    die: keep,
    otherDie: sorted[1],
    sides: 20,
    modifier: mod,
    total: keep + mod,
    mode: 'advantage',
    allDice: dice,
    featLabel: 'эльф.точн.',
  }
}

/**
 * Lucky feat (PHB / R11): spend a luck point to add an extra d20, then pick any.
 * - normal → 2 dice, pick any
 * - advantage/disadvantage → 3 dice, pick any
 */
export function rollCheckWithLucky(
  modifier: number,
  mode: DeskRollMode = 'normal',
  rng: () => number = Math.random,
): CheckRoll {
  const mod = Math.trunc(modifier)
  if (mode === 'normal') {
    const a = rollDie(20, rng)
    const b = rollDie(20, rng)
    return {
      die: a,
      otherDie: b,
      sides: 20,
      modifier: mod,
      total: a + mod,
      mode,
      allDice: [a, b],
      needsPick: true,
      featLabel: 'удача',
    }
  }
  const a = rollDie(20, rng)
  const b = rollDie(20, rng)
  const c = rollDie(20, rng)
  const provisional =
    mode === 'advantage' ? Math.max(a, b) : Math.min(a, b)
  return {
    die: provisional,
    otherDie: mode === 'advantage' ? Math.min(a, b) : Math.max(a, b),
    sides: 20,
    modifier: mod,
    total: provisional + mod,
    mode,
    allDice: [a, b, c],
    needsPick: true,
    featLabel: 'удача',
  }
}

/** Apply the player's chosen natural die after a Lucky pick. */
export function applyLuckyPick(roll: CheckRoll, chosenDie: number): CheckRoll {
  const die = Math.max(1, Math.min(20, Math.floor(chosenDie)))
  return {
    ...roll,
    die,
    total: die + roll.modifier,
    needsPick: false,
    otherDie:
      (roll.allDice ?? []).find((d) => d !== die) ?? roll.otherDie,
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
  options?: { crit?: boolean },
): DamageRoll | null {
  const parsed = parseDamageExpression(expression)
  if (!parsed) return null
  // PHB p. 196: a critical hit rolls the attack's damage dice twice. Modifiers stay once.
  const count = parsed.count * (options?.crit ? 2 : 1)
  const parts: number[] = []
  for (let i = 0; i < count; i += 1) {
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
    detail: `${count}d${parsed.sides}: ${diceBit}${modBit}`,
    parts,
    modifier: parsed.modifier,
  }
}

/**
 * Silver Tongue and similar: a natural d20 at or below the floor is treated as that floor
 * before the modifier is added.
 */
export function raiseNaturalDie(roll: CheckRoll, floor: number, label: string): CheckRoll {
  if (!Number.isFinite(floor) || roll.die >= floor) return roll
  const rawDie = roll.die
  const nextDie = Math.floor(floor)
  return {
    ...roll,
    die: nextDie,
    rawTotal: roll.total,
    total: nextDie + roll.modifier,
    floorLabel: `${label}, кость ${rawDie}→${nextDie}`,
  }
}

/** PHB Indomitable Might: a Strength check total can be replaced by the Strength score. */
export function raiseCheckToFloor(roll: CheckRoll, floor: number, label: string): CheckRoll {
  if (!Number.isFinite(floor) || roll.total >= floor) return roll
  return {
    ...roll,
    rawTotal: roll.total,
    total: Math.floor(floor),
    floorLabel: label,
  }
}

function modeLabel(mode: DeskRollMode): string {
  if (mode === 'advantage') return 'преим.'
  if (mode === 'disadvantage') return 'помеха'
  return ''
}

export function formatCheckRoll(label: string, roll: CheckRoll): string {
  const all = roll.allDice?.filter((n) => Number.isFinite(n)) ?? []
  let dice: string
  if (all.length >= 3) {
    const shown = all.join('/')
    const tag = roll.featLabel
      ? ` ${roll.featLabel}`
      : roll.mode !== 'normal'
        ? ` ${modeLabel(roll.mode)}`
        : ''
    dice = `d20:${shown}${tag}`
  } else if (roll.mode !== 'normal' && roll.otherDie != null) {
    const tag = roll.featLabel ? ` ${roll.featLabel}` : ` ${modeLabel(roll.mode)}`
    dice = `d20:${roll.die}/${roll.otherDie}${tag}`
  } else if (all.length === 2 && roll.featLabel) {
    dice = `d20:${all.join('/')} ${roll.featLabel}`
  } else {
    dice = `d20:${roll.die}`
  }
  const floor =
    roll.rawTotal != null && roll.floorLabel && roll.rawTotal !== roll.total
      ? ` · ${roll.floorLabel}, было ${roll.rawTotal}`
      : ''
  return `${label}: ${roll.total} (${dice} ${formatModifier(roll.modifier)}${floor})`
}

export type AttackExtraDamage = {
  expression: string
  type?: string | null
  label: string
}

export type AttackStrike = {
  text: string
  /** Kept d20 is a natural 20. */
  crit: boolean
  die: number
  /** Lucky: natural dice awaiting player pick. */
  allDice?: number[]
  needsPick?: boolean
  /** Partial CheckRoll for applying Lucky pick after UI. */
  hitRoll?: CheckRoll
  /** Toast suffix when savage / phlegethos adjusted damage. */
  damageNote?: string
}

function formatExtraDamage(
  extra: AttackExtraDamage,
  rng: () => number,
  crit: boolean,
): string {
  const extraRoll = rollDamage(extra.expression, rng, { crit })
  if (!extraRoll) return ` + ${extra.label}`
  const typeBit = extra.type?.trim() ? ` ${extra.type.trim()}` : ''
  return ` + ${extraRoll.total}${typeBit} (${extra.label}, ${extraRoll.detail})`
}

/** Attack and damage roll. Crit doubles every extra's dice (PHB p. 196). */
export function resolveAttackRoll(input: {
  name: string
  attackBonus: number
  damageExpr: string
  damageType?: string
  /** Extra dice on the same hit (Divine Strike). Crit doubles them too. */
  extraDamage?: AttackExtraDamage | null
  /** Further riders (Improved Divine Smite). Same crit rule, rolled in order. */
  extraDamages?: AttackExtraDamage[] | null
  /** B-01 buff dice on the attack roll (Bless etc.). */
  bonusDice?: BonusDiePart[] | null
  mode?: DeskRollMode
  rng?: () => number
  /** B-07: Elven Accuracy — 3d20 keep highest when advantage. */
  elvenAccuracy?: boolean
  /** B-07: Lucky — extra d20, player picks (needsPick on CheckRoll). */
  lucky?: boolean
  /** B-07: Savage Attacker — once/turn reroll weapon damage parts, keep any. */
  savageAttacker?: boolean
  /** B-07: Flames of Phlegethos — reroll 1s on fire damage. */
  flamesOfPhlegethos?: boolean
}): AttackStrike {
  const rng = input.rng ?? Math.random
  const mode = input.mode ?? 'normal'
  let hit: CheckRoll
  if (input.lucky) {
    hit = rollCheckWithLucky(input.attackBonus, mode, rng)
  } else if (input.elvenAccuracy && mode === 'advantage') {
    hit = rollCheckElvenAccuracy(input.attackBonus, rng)
  } else {
    hit = rollCheck(input.attackBonus, mode, rng)
  }
  const bonus = rollBonusDiceParts(input.bonusDice, rng)
  // The kept d20 is the attack roll. Advantage can crit; disadvantage uses the lower die.
  const crit = hit.die === 20
  let dmg = rollDamage(input.damageExpr, rng, { crit })
  const damageNotes: string[] = []
  if (dmg && input.savageAttacker && dmg.parts.length > 0) {
    const reroll = dmg.parts.map((sidesHint, i) => {
      // Re-roll each weapon damage die; keep the higher face (player may pick either — we keep max for auto).
      void sidesHint
      const sides = (() => {
        const parsed = parseDamageExpression(input.damageExpr)
        return parsed?.sides ?? 8
      })()
      const again = rollDie(sides, rng)
      return Math.max(dmg!.parts[i]!, again)
    })
    const sum = reroll.reduce((a, b) => a + b, 0) + dmg.modifier
    dmg = {
      ...dmg,
      parts: reroll,
      total: sum,
      detail: `${reroll.join('+')}${
        dmg.modifier === 0
          ? ''
          : dmg.modifier > 0
            ? `+${dmg.modifier}`
            : String(dmg.modifier)
      } · дикий`,
    }
    damageNotes.push('дикий атакующий')
  }
  if (
    dmg &&
    input.flamesOfPhlegethos &&
    /огн|fire/i.test(String(input.damageType || ''))
  ) {
    const reroll = dmg.parts.map((face) => {
      if (face !== 1) return face
      const parsed = parseDamageExpression(input.damageExpr)
      return rollDie(parsed?.sides ?? 6, rng)
    })
    if (reroll.some((v, i) => v !== dmg!.parts[i])) {
      const sum = reroll.reduce((a, b) => a + b, 0) + dmg.modifier
      dmg = {
        ...dmg,
        parts: reroll,
        total: sum,
        detail: `${reroll.join('+')}${
          dmg.modifier === 0
            ? ''
            : dmg.modifier > 0
              ? `+${dmg.modifier}`
              : String(dmg.modifier)
        } · флегетос`,
      }
      damageNotes.push('пламя Флегетоса')
    }
  }
  const typeBit = input.damageType?.trim() ? ` ${input.damageType.trim()}` : ''
  const critBit = crit ? ' · критическое попадание' : ''
  const extras = [
    ...(input.extraDamage ? [input.extraDamage] : []),
    ...(input.extraDamages ?? []),
  ]
  const extraBit = extras.map((extra) => formatExtraDamage(extra, rng, crit)).join('')
  const attackHit =
    bonus.total > 0 ? { ...hit, total: hit.total + bonus.total } : hit
  const text = !dmg
    ? `${formatCheckRoll(input.name, attackHit)}${bonus.text}${critBit} · урон ${input.damageExpr || '—'}${typeBit}${extraBit}`
    : `${formatCheckRoll(input.name, attackHit)}${bonus.text}${critBit} · урон ${dmg.total}${typeBit} (${dmg.detail})${extraBit}`
  return {
    text,
    crit,
    die: hit.die,
    allDice: hit.allDice,
    needsPick: hit.needsPick,
    hitRoll: hit,
    damageNote: damageNotes.length ? damageNotes.join(' · ') : undefined,
  }
}

export function formatAttackRoll(input: {
  name: string
  attackBonus: number
  damageExpr: string
  damageType?: string
  /** Extra dice on the same hit (Divine Strike). Crit doubles them too. */
  extraDamage?: AttackExtraDamage | null
  /** Further riders (Improved Divine Smite). Same crit rule, rolled in order. */
  extraDamages?: AttackExtraDamage[] | null
  mode?: DeskRollMode
  rng?: () => number
}): string {
  return resolveAttackRoll(input).text
}

export type BonusDiePart = {
  dice: string
  label: string
}

/** Roll optional buff dice (Bless / Guidance / …) and format as `+N (1d4 Label)`. */
export function rollBonusDiceParts(
  parts: BonusDiePart[] | null | undefined,
  rng: () => number = Math.random,
): { total: number; text: string; rolls: Array<{ label: string; value: number; dice: string }> } {
  if (!parts?.length) return { total: 0, text: '', rolls: [] }
  const rolls: Array<{ label: string; value: number; dice: string }> = []
  let total = 0
  for (const part of parts) {
    const match = String(part.dice).trim().match(/^(\d*)d(\d+)$/i)
    if (!match) continue
    const count = Math.max(1, Number(match[1] || 1))
    const sides = Math.max(2, Number(match[2]))
    let value = 0
    for (let i = 0; i < count; i += 1) value += rollDie(sides, rng)
    total += value
    rolls.push({ label: part.label, value, dice: part.dice })
  }
  const text = rolls.map((row) => ` + ${row.value} (${row.dice} ${row.label})`).join('')
  return { total, text, rolls }
}

export function formatSkillRoll(
  label: string,
  modifier: number,
  mode: DeskRollMode = 'normal',
  rng?: () => number,
  floor?: { value: number; label: string } | null,
  dieFloor?: { value: number; label: string } | null,
  bonusDice?: BonusDiePart[] | null,
  opts?: { lucky?: boolean; elvenAccuracy?: boolean },
): string {
  const roller = rng ?? Math.random
  let rolled: CheckRoll
  if (opts?.lucky) {
    rolled = rollCheckWithLucky(modifier, mode, roller)
  } else if (opts?.elvenAccuracy && mode === 'advantage') {
    rolled = rollCheckElvenAccuracy(modifier, roller)
  } else {
    rolled = rollCheck(modifier, mode, roller)
  }
  const withDie = dieFloor ? raiseNaturalDie(rolled, dieFloor.value, dieFloor.label) : rolled
  const roll = floor ? raiseCheckToFloor(withDie, floor.value, floor.label) : withDie
  const bonus = rollBonusDiceParts(bonusDice, roller)
  if (!bonus.total) return formatCheckRoll(label, roll)
  const base = formatCheckRoll(label, { ...roll, total: roll.total + bonus.total })
  return `${base}${bonus.text}`
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
  /** Set when the worn piece already resolved mithral / the chosen base. */
  stealthDisadvantage?: boolean | null
}): boolean {
  if (input.stealthDisadvantage === false) return false
  if (input.stealthDisadvantage === true) return true
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
