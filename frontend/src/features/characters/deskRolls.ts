import { formatModifier } from './sheetTypes'
import { applyGreatWeaponFightingReroll } from '../../shared/dnd/o06StylesBreathInvocations'
import { rollFairDie } from '../diceRoller/fairRandom'

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

/**
 * Fair die face 1…sides.
 * Without `rng` — crypto rejection sampling (`rollFairDie`).
 * With `rng` — legacy unit-interval hook for deterministic tests: 1+floor(rng()*n).
 */
export function rollDie(sides: number, rng?: () => number): number {
  const n = Math.max(2, Math.floor(sides))
  if (rng) return 1 + Math.floor(rng() * n)
  return rollFairDie(n)
}

/** Unit-interval stand-in for call sites that must pass `() => number` into helpers. */
export function fairDeskUnitRng(sidesHint = 20): () => number {
  const sides = Math.max(2, Math.floor(sidesHint))
  return () => (rollFairDie(sides) - 1) / sides
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
  rng?: () => number,
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
  rng?: () => number,
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
  rng?: () => number,
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

/**
 * Halfling Lucky (PHB): when the d20 shows a natural 1 on an attack, check, or save,
 * you may reroll — the new result is mandatory.
 */
export function applyHalflingLuckyReroll(
  roll: CheckRoll,
  rng?: () => number,
): CheckRoll {
  if (roll.die !== 1) return roll
  const next = rollDie(20, rng)
  const prevDice = roll.allDice?.length ? roll.allDice : [1]
  return {
    ...roll,
    die: next,
    otherDie: 1,
    total: next + roll.modifier,
    allDice: [...prevDice, next],
    featLabel: roll.featLabel
      ? `${roll.featLabel} · удача полур.`
      : 'удача полур.',
    needsPick: false,
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
  rng?: () => number,
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
  /** Total weapon (+ extras) damage rolled with this strike. */
  damageTotal?: number | null
  damageType?: string | null
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
  rng: (() => number) | undefined,
  crit: boolean,
): { text: string; total: number } {
  const extraRoll = rollDamage(extra.expression, rng, { crit })
  if (!extraRoll) return { text: ` + ${extra.label}`, total: 0 }
  const typeBit = extra.type?.trim() ? ` ${extra.type.trim()}` : ''
  return {
    text: ` + ${extraRoll.total}${typeBit} (${extra.label}, ${extraRoll.detail})`,
    total: extraRoll.total,
  }
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
  /**
   * O-06: Great Weapon Fighting — reroll 1–2 on weapon damage dice only
   * (not smite / hunters mark extras).
   */
  greatWeaponFighting?: boolean
  /** Champion etc.: crit when kept d20 ≥ threshold (still always crit on 20). */
  critThreshold?: number
}): AttackStrike {
  const rng = input.rng
  const mode = input.mode ?? 'normal'
  const critThreshold = Math.min(20, Math.max(1, Math.floor(input.critThreshold ?? 20)))
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
  const crit = hit.die === 20 || hit.die >= critThreshold
  let dmg = rollDamage(input.damageExpr, rng, { crit })
  const damageNotes: string[] = []
  if (dmg && input.greatWeaponFighting && dmg.parts.length > 0) {
    const parsed = parseDamageExpression(input.damageExpr)
    const sides = parsed?.sides ?? 6
    const gwf = applyGreatWeaponFightingReroll({
      parts: dmg.parts,
      sides,
      rng: rng ?? fairDeskUnitRng(sides),
    })
    if (gwf.changed) {
      const sum = gwf.parts.reduce((a, b) => a + b, 0) + dmg.modifier
      dmg = {
        ...dmg,
        parts: gwf.parts,
        total: sum,
        detail: `${gwf.parts.join('+')}${
          dmg.modifier === 0
            ? ''
            : dmg.modifier > 0
              ? `+${dmg.modifier}`
              : String(dmg.modifier)
        } · GWF`,
      }
      damageNotes.push(...gwf.notes)
    }
  }
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
  const extraRows = extras.map((extra) => formatExtraDamage(extra, rng, crit))
  const extraBit = extraRows.map((row) => row.text).join('')
  const extraTotal = extraRows.reduce((sum, row) => sum + row.total, 0)
  const damageTotal = (dmg?.total ?? 0) + extraTotal
  const attackHit =
    bonus.total > 0 ? { ...hit, total: hit.total + bonus.total } : hit
  const text = !dmg
    ? `${formatCheckRoll(input.name, attackHit)}${bonus.text}${critBit} · урон ${input.damageExpr || '—'}${typeBit}${extraBit}`
    : `${formatCheckRoll(input.name, attackHit)}${bonus.text}${critBit} · урон ${dmg.total}${typeBit} (${dmg.detail})${extraBit}`
  return {
    text,
    crit,
    die: hit.die,
    damageTotal: dmg || extraTotal ? damageTotal : null,
    damageType: input.damageType ?? null,
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

/** Roll optional buff dice (Bless / Guidance / mark d4) — text like ` + 3 (+1к4 (Интуиция лукавого))`. */
export function rollBonusDiceParts(
  parts: BonusDiePart[] | null | undefined,
  rng?: () => number,
): { total: number; text: string; rolls: Array<{ label: string; value: number; dice: string }> } {
  if (!parts?.length) return { total: 0, text: '', rolls: [] }
  const rolls: Array<{ label: string; value: number; dice: string }> = []
  let total = 0
  for (const part of parts) {
    const match = String(part.dice).trim().match(/^(\d*)[dк](\d+)$/i)
    if (!match) continue
    const count = Math.max(1, Number(match[1] || 1))
    const sides = Math.max(2, Number(match[2]))
    let value = 0
    for (let i = 0; i < count; i += 1) value += rollDie(sides, rng)
    total += value
    rolls.push({ label: part.label, value, dice: `${count}d${sides}` })
  }
  const text = rolls
    .map((row) => {
      const m = String(row.dice).trim().match(/^(\d*)d(\d+)$/i)
      const expr = m ? `+${m[1] || 1}к${m[2]}` : row.dice
      return ` + ${row.value} (${expr} (${row.label}))`
    })
    .join('')
  return { total, text, rolls }
}

export type SkillRollPayload = {
  text: string
  roll: CheckRoll
  total: number
  modifier: number
  mode: DeskRollMode
  /** Canonical expression for journal / «Повторить», e.g. `1d20+5` or `2d20kh1+3`. */
  expression: string
  /** Face chips for the journal (kept + dropped). */
  diceFaces: Array<{
    sides: number
    value: number
    dropped: boolean
    nat?: '20' | '1'
    label?: string
  }>
  modifierTotal: number
  advantageMode: 'none' | 'advantage' | 'disadvantage'
}

function natOfD20(value: number): '20' | '1' | undefined {
  if (value === 20) return '20'
  if (value === 1) return '1'
  return undefined
}

/** Map a CheckRoll to journal face chips (dropped = unused adv/dis / lucky extras). */
export function checkRollToDiceFaces(roll: CheckRoll): SkillRollPayload['diceFaces'] {
  const all = roll.allDice?.filter((n) => Number.isFinite(n)) ?? [roll.die]
  if (all.length <= 1) {
    return [{ sides: 20, value: roll.die, dropped: false, nat: natOfD20(roll.die) }]
  }
  let keptUsed = false
  return all.map((value) => {
    const isKept = !keptUsed && value === roll.die
    if (isKept) keptUsed = true
    return {
      sides: 20,
      value,
      dropped: !isKept,
      nat: natOfD20(value),
    }
  })
}

export function checkExpression(modifier: number, mode: DeskRollMode): string {
  const mod = Math.trunc(modifier)
  const modBit = mod === 0 ? '' : mod > 0 ? `+${mod}` : String(mod)
  if (mode === 'advantage') return `2d20kh1${modBit}`
  if (mode === 'disadvantage') return `2d20kl1${modBit}`
  return `1d20${modBit}`
}

/** Structured skill / save / ability check — same math as `formatSkillRoll`. */
export function rollSkillCheck(
  label: string,
  modifier: number,
  mode: DeskRollMode = 'normal',
  rng?: () => number,
  floor?: { value: number; label: string } | null,
  dieFloor?: { value: number; label: string } | null,
  bonusDice?: BonusDiePart[] | null,
  opts?: { lucky?: boolean; elvenAccuracy?: boolean },
): SkillRollPayload {
  const roller = rng
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
  const total = roll.total + bonus.total
  const text = bonus.total
    ? `${formatCheckRoll(label, { ...roll, total })}${bonus.text}`
    : formatCheckRoll(label, roll)
  const modBit = Math.trunc(modifier)
  const expressionBase = checkExpression(modBit, mode)
  const bonusExpr = bonus.rolls
    .map((row) => {
      const m = String(row.dice).trim().match(/^(\d*)[dк](\d+)$/i)
      if (!m) return ''
      // Server/parser accept к; journal shows Russian die notation.
      return `+${m[1] || 1}к${m[2]}`
    })
    .join('')
  const bonusFaces = bonus.rolls.flatMap((row) => {
    const m = String(row.dice).trim().match(/^(\d*)[dк](\d+)$/i)
    if (!m) return []
    const count = Math.max(1, Number(m[1] || 1))
    const sides = Math.max(2, Number(m[2]))
    // One face chip per bonus part (sum already in row.value for NdX).
    if (count === 1) {
      return [{ sides, value: row.value, dropped: false as const, label: row.label }]
    }
    return [{ sides, value: row.value, dropped: false as const, label: row.label }]
  })
  return {
    text,
    roll,
    total,
    modifier: Math.trunc(modifier),
    mode,
    expression: `${expressionBase}${bonusExpr}`,
    // d20 faces + separate rider dice (Bless / mark d4) with source labels.
    // Flat modifier stays in modifierTotal — do not fold rider totals into it.
    diceFaces: [...checkRollToDiceFaces(roll), ...bonusFaces],
    modifierTotal: Math.trunc(modifier),
    advantageMode:
      mode === 'advantage' ? 'advantage' : mode === 'disadvantage' ? 'disadvantage' : 'none',
  }
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
  return rollSkillCheck(label, modifier, mode, rng, floor, dieFloor, bonusDice, opts).text
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
