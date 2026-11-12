/**
 * B-01: sheet.combat.effects — duration, mods registry, stacking, rest expiry.
 * Legacy rows (name only, `· +N КД`, ac_bonus) keep working.
 * B-02 adds collectors (temp_hp, ac_formula, speed, resist…) + B02 buff specs.
 * B-03 adds roll riders (damage dice chips), finer advantage filters, B03 specs.
 */

import {
  B02_BUFF_SPEC_BUILDERS,
  B02_NAME_TO_SLUG,
  buildB02BuffSpec,
  type BuffBuildContext,
} from './b02BuffSpecs'
import {
  B03_BUFF_SPEC_BUILDERS,
  B03_NAME_TO_SLUG,
  buildB03BuffSpec,
  riderDamageTypeRu,
} from './b03BuffSpecs'
import type { AcMinFloor, CompetingAcFormula } from './armor'

export type EffectKind =
  | 'spell'
  | 'feature'
  | 'feat'
  | 'race'
  | 'item'
  | 'infusion'
  | 'piety'

export type DurationUnit =
  | 'rounds'
  | 'minutes'
  | 'hours'
  | 'until_short_rest'
  | 'until_long_rest'
  | 'until_source_next_turn_end'
  | 'permanent'
  | 'manual'

export type EffectDuration = {
  unit: DurationUnit
  value?: number | null
  started_at?: string | null
  started_round?: number | null
  /** Combat countdown; 1 round = 6s. Lobby round sync — packs 12–14. */
  remaining_rounds?: number | null
}

export type EffectModTarget =
  | 'ac'
  | 'attack'
  | 'save'
  | 'check'
  | 'advantage'
  | 'disadvantage'
  | string

export type EffectMod = {
  target: EffectModTarget
  op: 'add' | 'roll_die' | 'set' | 'advantage' | 'disadvantage' | string
  value?: number | null
  dice?: string | null
  condition?: string | null
  once?: boolean | null
}

export type ActiveEffect = {
  id: string
  name: string
  kind?: EffectKind | null
  slug?: string | null
  source_character_id?: string | null
  source_name?: string | null
  origin?: string | null
  linked_concentration?: boolean
  duration?: EffectDuration | null
  charges?: number | null
  mods?: EffectMod[]
  /** Legacy infusion AC; still read. Prefer mods[{target:'ac'}]. */
  ac_bonus?: number | null
  /** UI / stacking: duplicate slug, weaker copy. */
  inactive?: boolean
  inactive_reason?: string | null
}

export type EffectRollKind = 'attack' | 'save' | 'check' | 'damage' | 'initiative'

export type RollDieChip = {
  effectId: string
  name: string
  dice: string
  once: boolean
  rollKind: EffectRollKind
  /** RU damage type for damage riders (огонь, излучение…). */
  damageType?: string | null
  /** Mod condition (marked_target, next_melee_fire, in_aura…). */
  condition?: string | null
  /**
   * Player opt-in chip (Р12 / Р14 sheet half): e.g. «по помеченной цели», «в ауре».
   * Default checked unless defaultChecked === false.
   */
  optional?: boolean
  defaultChecked?: boolean
  /** Decrement effect.charges when this chip is used (flame arrows). */
  spendCharge?: boolean
}

/** Extensible mod registry — B-02…B-09 add kinds here. */
export type ModApplicator = {
  /** Numeric sheet contribution (AC etc.). */
  sheetValue?: (mod: EffectMod, effect: ActiveEffect) => number
  /** Roll dialog chips. */
  rollChip?: (
    mod: EffectMod,
    effect: ActiveEffect,
    rollKind: EffectRollKind,
  ) => RollDieChip | null
}

function chipFromMod(
  mod: EffectMod,
  effect: ActiveEffect,
  rollKind: EffectRollKind,
  extras?: Partial<RollDieChip>,
): RollDieChip | null {
  const dice = typeof mod.dice === 'string' && mod.dice.trim() ? mod.dice.trim() : null
  if (!dice) return null
  return {
    effectId: effect.id,
    name: effect.name,
    dice,
    once: Boolean(mod.once),
    rollKind,
    condition: mod.condition ?? null,
    damageType: riderDamageTypeRu(mod.condition) ?? extras?.damageType ?? null,
    ...extras,
  }
}

function isOptionalRiderCondition(condition: string | null | undefined): boolean {
  const c = String(condition || '')
  return (
    c === 'marked_target' ||
    c.startsWith('marked_target_') ||
    c.startsWith('in_aura') ||
    c === 'shadow_blade_psychic' ||
    c === 'flame_arrows_fire'
  )
}

function optionalLabelFor(condition: string | null | undefined, effectName: string): string {
  const c = String(condition || '')
  if (c === 'marked_target' || c.startsWith('marked_target_')) {
    return `${effectName} · по помеченной цели`
  }
  if (c.startsWith('in_aura')) return `${effectName} · в ауре`
  if (c === 'shadow_blade_psychic') return `${effectName} · клинок`
  if (c === 'flame_arrows_fire') return `${effectName} · боеприпас`
  return effectName
}

const MOD_REGISTRY: Record<string, ModApplicator> = {
  ac: {
    sheetValue: (mod) =>
      mod.op === 'add' && typeof mod.value === 'number' && Number.isFinite(mod.value)
        ? Math.floor(mod.value)
        : 0,
  },
  roll_die: {
    rollChip: (mod, effect, rollKind) => {
      const dice = typeof mod.dice === 'string' && mod.dice.trim() ? mod.dice.trim() : '1d4'
      const target = String(mod.target || '')
      if (target === 'attack' && rollKind !== 'attack') return null
      if (target === 'save' && rollKind !== 'save') return null
      if (target === 'check' && rollKind !== 'check') return null
      if (target === 'attack_save' && rollKind !== 'attack' && rollKind !== 'save') return null
      if (target === 'initiative' && rollKind !== 'initiative') return null
      if (
        target !== 'attack' &&
        target !== 'save' &&
        target !== 'check' &&
        target !== 'attack_save' &&
        target !== 'initiative' &&
        target !== 'roll_die'
      ) {
        return null
      }
      return {
        effectId: effect.id,
        name: effect.name,
        dice,
        once: Boolean(mod.once),
        rollKind,
        condition: mod.condition ?? null,
      }
    },
  },
  weapon_damage: {
    rollChip: (mod, effect, rollKind) => {
      if (rollKind !== 'damage') return null
      if (mod.op !== 'roll_die' && !(typeof mod.dice === 'string' && mod.dice.trim())) {
        return null
      }
      const optional = isOptionalRiderCondition(mod.condition)
      return chipFromMod(mod, effect, 'damage', {
        name: optional ? optionalLabelFor(mod.condition, effect.name) : effect.name,
        optional,
        defaultChecked: optional ? true : undefined,
        spendCharge: String(mod.condition || '').includes('flame_arrows'),
        once: Boolean(mod.once),
      })
    },
  },
  initiative: {
    rollChip: (mod, effect, rollKind) => {
      if (rollKind !== 'initiative') return null
      if (mod.op !== 'roll_die' && !(typeof mod.dice === 'string' && mod.dice.trim())) {
        return null
      }
      return chipFromMod(mod, effect, 'initiative')
    },
  },
}

/** Register or replace a mod applicator (packs B-02+). */
export function registerEffectMod(key: string, applicator: ModApplicator): void {
  MOD_REGISTRY[key] = applicator
}

export function getEffectModApplicator(key: string): ModApplicator | undefined {
  return MOD_REGISTRY[key]
}

const ROUNDS_PER_MINUTE = 10
const ROUNDS_PER_HOUR = 600

export function durationToRounds(duration: EffectDuration | null | undefined): number | null {
  if (!duration) return null
  if (typeof duration.remaining_rounds === 'number' && Number.isFinite(duration.remaining_rounds)) {
    return Math.max(0, Math.floor(duration.remaining_rounds))
  }
  const value = typeof duration.value === 'number' ? Math.max(0, duration.value) : 0
  switch (duration.unit) {
    case 'rounds':
    case 'until_source_next_turn_end':
      return Math.max(0, Math.floor(value || 1))
    case 'minutes':
      return Math.floor(value * ROUNDS_PER_MINUTE)
    case 'hours':
      return Math.floor(value * ROUNDS_PER_HOUR)
    case 'until_short_rest':
    case 'until_long_rest':
    case 'permanent':
    case 'manual':
      return null
    default:
      return null
  }
}

/** Max duration in hours for rest clearing (Р26). */
export function durationMaxHours(duration: EffectDuration | null | undefined): number | null {
  if (!duration) return null
  switch (duration.unit) {
    case 'rounds':
      return (duration.value ?? duration.remaining_rounds ?? 0) / ROUNDS_PER_HOUR
    case 'minutes':
      return (duration.value ?? 0) / 60
    case 'hours':
      return duration.value ?? 0
    case 'until_short_rest':
      return 0
    case 'until_long_rest':
      return 8
    case 'until_source_next_turn_end':
      return 1 / ROUNDS_PER_HOUR
    case 'permanent':
    case 'manual':
      return null
    default:
      return null
  }
}

export function effectClearedByRest(
  effect: ActiveEffect,
  rest: 'short' | 'long',
): boolean {
  const d = effect.duration
  if (!d) return false
  if (rest === 'short') {
    if (d.unit === 'until_short_rest') return true
    const hours = durationMaxHours(d)
    return hours != null && hours <= 1
  }
  if (d.unit === 'until_short_rest' || d.unit === 'until_long_rest') return true
  const hours = durationMaxHours(d)
  return hours != null && hours <= 8
}

export function filterEffectsAfterRest(
  effects: ActiveEffect[],
  rest: 'short' | 'long',
): { kept: ActiveEffect[]; removed: ActiveEffect[] } {
  const kept: ActiveEffect[] = []
  const removed: ActiveEffect[] = []
  for (const row of effects) {
    if (effectClearedByRest(row, rest)) removed.push(row)
    else kept.push(row)
  }
  return { kept, removed }
}

function legacyAcFromName(name: string): number {
  if (/КД\s*без/i.test(name)) return 0
  const match = name.match(/·\s*\+(\d+)\s*КД(?!\p{L})/u)
  return match ? Number(match[1]) : 0
}

function readMods(raw: unknown): EffectMod[] {
  if (!Array.isArray(raw)) return []
  const out: EffectMod[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const target = typeof row.target === 'string' ? row.target.trim() : ''
    const op = typeof row.op === 'string' ? row.op.trim() : 'add'
    if (!target) continue
    const mod: EffectMod = { target, op }
    if (typeof row.value === 'number' && Number.isFinite(row.value)) mod.value = row.value
    if (typeof row.dice === 'string' && row.dice.trim()) mod.dice = row.dice.trim()
    if (typeof row.condition === 'string' && row.condition.trim()) {
      mod.condition = row.condition.trim()
    }
    if (typeof row.once === 'boolean') mod.once = row.once
    out.push(mod)
  }
  return out
}

function readDuration(raw: unknown): EffectDuration | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const unit = typeof row.unit === 'string' ? (row.unit as DurationUnit) : null
  if (!unit) return null
  const duration: EffectDuration = { unit }
  if (typeof row.value === 'number' && Number.isFinite(row.value)) duration.value = row.value
  if (typeof row.started_at === 'string') duration.started_at = row.started_at
  if (typeof row.started_round === 'number') duration.started_round = row.started_round
  if (typeof row.remaining_rounds === 'number' && Number.isFinite(row.remaining_rounds)) {
    duration.remaining_rounds = Math.max(0, Math.floor(row.remaining_rounds))
  } else {
    const rounds = durationToRounds(duration)
    if (rounds != null) duration.remaining_rounds = rounds
  }
  return duration
}

export function parseActiveEffects(raw: unknown): ActiveEffect[] {
  if (!Array.isArray(raw)) return []
  const out: ActiveEffect[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    if (!name) continue
    let id = typeof row.id === 'string' ? row.id.trim() : ''
    if (!id) id = `fx-${name.toLowerCase().replace(/\s+/g, '-')}`
    const effect: ActiveEffect = {
      id,
      name,
      linked_concentration: Boolean(row.linked_concentration),
    }
    if (typeof row.kind === 'string' && row.kind.trim()) {
      effect.kind = row.kind.trim() as EffectKind
    }
    if (typeof row.slug === 'string' && row.slug.trim()) effect.slug = row.slug.trim()
    if (row.source_character_id != null) {
      effect.source_character_id = String(row.source_character_id)
    }
    if (typeof row.source_name === 'string' && row.source_name.trim()) {
      effect.source_name = row.source_name.trim()
    }
    if (typeof row.origin === 'string' && row.origin.trim()) {
      effect.origin = row.origin.trim()
    }
    if (typeof row.ac_bonus === 'number' && Number.isFinite(row.ac_bonus)) {
      effect.ac_bonus = Math.max(0, Math.floor(row.ac_bonus))
    }
    if (typeof row.charges === 'number' && Number.isFinite(row.charges)) {
      effect.charges = Math.max(0, Math.floor(row.charges))
    }
    const mods = readMods(row.mods)
    if (mods.length) effect.mods = mods
    const duration = readDuration(row.duration)
    if (duration) effect.duration = duration
    if (row.inactive === true) {
      effect.inactive = true
      if (typeof row.inactive_reason === 'string') {
        effect.inactive_reason = row.inactive_reason
      }
    }
    out.push(effect)
  }
  return out
}

export function effectStackKey(effect: ActiveEffect): string {
  const slug = (effect.slug || '').trim().toLowerCase().replace(/-/g, '_')
  if (slug) return `slug:${slug}`
  return `name:${effect.name.trim().toLocaleLowerCase('ru')}`
}

/** Strength for same-name stacking: higher AC / dice / hp_max / temp wins (Р9). */
export function effectStrength(effect: ActiveEffect): number {
  let score = 0
  score += acBonusFromSingleEffect(effect) * 100
  for (const mod of effect.mods ?? []) {
    if (mod.op === 'roll_die' || (typeof mod.dice === 'string' && mod.dice)) {
      score += 10
      if (mod.dice?.includes('d4')) score += 4
      if (mod.dice?.includes('d6')) score += 6
      if (mod.dice?.includes('d8')) score += 8
      if (mod.dice?.includes('d10')) score += 10
    }
    if (typeof mod.value === 'number') score += Math.abs(mod.value)
    if (mod.target === 'hp_max' && typeof mod.value === 'number') {
      score += Math.abs(mod.value) * 50
    }
    if (mod.target === 'temp_hp' && typeof mod.value === 'number') {
      score += Math.abs(mod.value) * 20
    }
    if (mod.target === 'ac_formula' && typeof mod.value === 'number') {
      score += Math.abs(mod.value) * 30
    }
    if (mod.target === 'ac_min' && typeof mod.value === 'number') {
      score += Math.abs(mod.value) * 25
    }
  }
  if (effect.charges != null) score += effect.charges
  const rounds = durationToRounds(effect.duration ?? null)
  if (rounds != null) score += Math.min(rounds, 50) * 0.01
  return score
}

/**
 * Same slug/name: strongest active, others marked inactive (Р9).
 * Different names stack (Р1).
 */
export function applyEffectStacking(effects: ActiveEffect[]): ActiveEffect[] {
  const byKey = new Map<string, ActiveEffect[]>()
  for (const row of effects) {
    const key = effectStackKey(row)
    const list = byKey.get(key) ?? []
    list.push(row)
    byKey.set(key, list)
  }
  const out: ActiveEffect[] = []
  for (const group of byKey.values()) {
    if (group.length === 1) {
      out.push({ ...group[0], inactive: false, inactive_reason: null })
      continue
    }
    const sorted = [...group].sort((a, b) => effectStrength(b) - effectStrength(a))
    sorted.forEach((row, index) => {
      if (index === 0) {
        out.push({ ...row, inactive: false, inactive_reason: null })
      } else {
        out.push({
          ...row,
          inactive: true,
          inactive_reason: 'не действует (одноимённый)',
        })
      }
    })
  }
  return out
}

export function acBonusFromSingleEffect(effect: ActiveEffect): number {
  if (effect.inactive) return 0
  let fromMods = 0
  for (const mod of effect.mods ?? []) {
    if (mod.target === 'ac') {
      const app = MOD_REGISTRY.ac
      fromMods += app.sheetValue?.(mod, effect) ?? 0
    }
  }
  if (fromMods) return fromMods
  if (typeof effect.ac_bonus === 'number' && Number.isFinite(effect.ac_bonus)) {
    return Math.max(0, Math.floor(effect.ac_bonus))
  }
  return legacyAcFromName(effect.name)
}

/** Total AC from active (non-inactive) effects — infusions + spell buffs. */
export function acBonusFromActiveEffects(effects: unknown): number {
  const parsed = applyEffectStacking(parseActiveEffects(effects))
  let sum = 0
  for (const row of parsed) sum += acBonusFromSingleEffect(row)
  return sum
}

function activeEffectsList(effects: unknown): ActiveEffect[] {
  return applyEffectStacking(parseActiveEffects(effects)).filter((row) => !row.inactive)
}

/** Competing base AC formulas from buffs (mage armor, etc.). */
export function acFormulasFromActiveEffects(effects: unknown): CompetingAcFormula[] {
  const out: CompetingAcFormula[] = []
  for (const effect of activeEffectsList(effects)) {
    for (const mod of effect.mods ?? []) {
      if (mod.target !== 'ac_formula') continue
      if (mod.op !== 'set' && mod.op !== 'add') continue
      const base = typeof mod.value === 'number' ? Math.floor(mod.value) : 13
      const key =
        (mod.condition && String(mod.condition).trim()) ||
        effect.slug ||
        effect.name
      out.push({
        key: String(key).replace(/-/g, '_'),
        label: effect.name,
        base,
        dexCap: null,
        allowsShield: true,
      })
    }
  }
  return out
}

/** Barkskin-style floor — highest min wins. */
export function acMinFromActiveEffects(effects: unknown): AcMinFloor | null {
  let best: AcMinFloor | null = null
  for (const effect of activeEffectsList(effects)) {
    for (const mod of effect.mods ?? []) {
      if (mod.target !== 'ac_min') continue
      if (typeof mod.value !== 'number' || !Number.isFinite(mod.value)) continue
      const value = Math.floor(mod.value)
      if (!best || value > best.value) {
        best = { value, label: `${effect.name}: не ниже ${value}` }
      }
    }
  }
  return best
}

export type SpeedModsFromEffects = {
  walkBonusFt: number
  /** Multiply walk after bonuses (haste ×2). */
  walkMul: number
  flySpeedFt: number | null
  climbEqualWalk: boolean
  climbSpeedFt: number | null
  notes: string[]
}

export function speedModsFromActiveEffects(effects: unknown): SpeedModsFromEffects {
  const out: SpeedModsFromEffects = {
    walkBonusFt: 0,
    walkMul: 1,
    flySpeedFt: null,
    climbEqualWalk: false,
    climbSpeedFt: null,
    notes: [],
  }
  for (const effect of activeEffectsList(effects)) {
    for (const mod of effect.mods ?? []) {
      if (mod.target === 'speed') {
        if (mod.op === 'add' && typeof mod.value === 'number') {
          out.walkBonusFt += Math.floor(mod.value)
          out.notes.push(`${effect.name} +${Math.floor(mod.value)}`)
        } else if (mod.op === 'mul' && typeof mod.value === 'number' && mod.value > 0) {
          out.walkMul *= mod.value
          out.notes.push(`${effect.name} ×${mod.value}`)
        } else if (mod.op === 'set' && typeof mod.value === 'number') {
          out.walkBonusFt += Math.floor(mod.value)
        }
      }
      if (mod.target === 'fly_speed' && typeof mod.value === 'number') {
        const ft = Math.floor(mod.value)
        out.flySpeedFt = out.flySpeedFt == null ? ft : Math.max(out.flySpeedFt, ft)
        out.notes.push(`${effect.name}: полёт ${ft}`)
      }
      if (mod.target === 'climb_speed') {
        if (mod.condition === 'equal_walk' || mod.op === 'set') {
          out.climbEqualWalk = true
          out.notes.push(`${effect.name}: лазание = ходьба`)
        } else if (typeof mod.value === 'number') {
          out.climbSpeedFt = Math.floor(mod.value)
        }
      }
    }
  }
  return out
}

export function applySpeedModsToWalk(baseWalk: number, mods: SpeedModsFromEffects): number {
  const withBonus = Math.max(0, Math.floor(baseWalk) + mods.walkBonusFt)
  const mul = mods.walkMul > 0 ? mods.walkMul : 1
  return Math.max(0, Math.floor(withBonus * mul))
}

export function hpMaxBonusFromActiveEffects(effects: unknown): number {
  let sum = 0
  for (const effect of activeEffectsList(effects)) {
    for (const mod of effect.mods ?? []) {
      if (mod.target === 'hp_max' && mod.op === 'add' && typeof mod.value === 'number') {
        sum += Math.floor(mod.value)
      }
    }
  }
  return sum
}

export function hpMaxBonusFromSingleEffect(effect: ActiveEffect): number {
  if (effect.inactive) return 0
  let sum = 0
  for (const mod of effect.mods ?? []) {
    if (mod.target === 'hp_max' && mod.op === 'add' && typeof mod.value === 'number') {
      sum += Math.floor(mod.value)
    }
  }
  return sum
}

/** Temp HP grant encoded on an effect (value and/or dice). */
export function tempHpGrantFromEffect(
  effect: ActiveEffect,
  rng: () => number = Math.random,
): number | null {
  if (effect.inactive) return null
  let total: number | null = null
  for (const mod of effect.mods ?? []) {
    if (mod.target !== 'temp_hp') continue
    let amount = 0
    if (typeof mod.dice === 'string' && mod.dice.trim()) {
      amount += rollDiceNotation(mod.dice, rng)
    }
    if (typeof mod.value === 'number' && Number.isFinite(mod.value)) {
      amount += Math.floor(mod.value)
    }
    if (mod.op === 'set' && typeof mod.value === 'number' && !mod.dice) {
      amount = Math.floor(mod.value)
    }
    if (amount > 0) total = (total ?? 0) + amount
  }
  return total
}

export type EffectDefenseLine = {
  type: string
  nonmagical: boolean
  source: string
  kind: 'resistance' | 'immunity'
}

export function defensesFromActiveEffects(effects: unknown): EffectDefenseLine[] {
  const out: EffectDefenseLine[] = []
  for (const effect of activeEffectsList(effects)) {
    for (const mod of effect.mods ?? []) {
      if (mod.target !== 'resistance' && mod.target !== 'immunity') continue
      const type = (mod.condition || '').trim()
      if (!type) continue
      const nonmagical = mod.dice === 'nonmagical'
      if (type === 'all' || type === 'all_damage') {
        // Expand common physical + energy set for warding bond / invulnerability.
        const types =
          type === 'all_damage'
            ? [
                'acid',
                'cold',
                'fire',
                'force',
                'lightning',
                'necrotic',
                'poison',
                'psychic',
                'radiant',
                'thunder',
                'bludgeoning',
                'piercing',
                'slashing',
              ]
            : [
                'acid',
                'cold',
                'fire',
                'force',
                'lightning',
                'necrotic',
                'poison',
                'psychic',
                'radiant',
                'thunder',
                'bludgeoning',
                'piercing',
                'slashing',
              ]
        for (const t of types) {
          out.push({
            type: t,
            nonmagical: false,
            source: effect.name,
            kind: mod.target === 'immunity' || type === 'all_damage' ? 'immunity' : 'resistance',
          })
        }
        continue
      }
      out.push({
        type,
        nonmagical,
        source: effect.name,
        kind: mod.target === 'immunity' ? 'immunity' : 'resistance',
      })
    }
  }
  return out
}

export function weaponBonusesFromActiveEffects(effects: unknown): {
  attack: number
  damage: number
} {
  let attack = 0
  let damage = 0
  for (const effect of activeEffectsList(effects)) {
    for (const mod of effect.mods ?? []) {
      if (mod.target === 'weapon_attack' && typeof mod.value === 'number') {
        attack += Math.floor(mod.value)
      }
      if (mod.target === 'weapon_damage' && typeof mod.value === 'number') {
        damage += Math.floor(mod.value)
      }
    }
  }
  return { attack, damage }
}

export function saveBonusFromActiveEffects(
  effects: unknown,
  condition?: string | null,
): number {
  let sum = 0
  for (const effect of activeEffectsList(effects)) {
    for (const mod of effect.mods ?? []) {
      if (mod.target !== 'save' || mod.op !== 'add') continue
      if (condition && mod.condition && mod.condition !== condition && mod.condition !== 'all') {
        continue
      }
      if (typeof mod.value === 'number') sum += Math.floor(mod.value)
    }
  }
  return sum
}

export function skillBonusFromActiveEffects(
  effects: unknown,
  skillKey: string,
): number {
  let sum = 0
  const key = skillKey.trim().toLowerCase()
  for (const effect of activeEffectsList(effects)) {
    for (const mod of effect.mods ?? []) {
      if (mod.target !== 'skill' || mod.op !== 'add') continue
      const cond = (mod.condition || '').toLowerCase()
      if (cond && cond !== key && cond !== 'stealth') continue
      if (cond === 'stealth' && key !== 'stealth') continue
      if (typeof mod.value === 'number') sum += Math.floor(mod.value)
    }
  }
  return sum
}

export function darkvisionFromActiveEffects(effects: unknown): number | null {
  let best: number | null = null
  for (const effect of activeEffectsList(effects)) {
    for (const mod of effect.mods ?? []) {
      if (mod.target !== 'senses') continue
      if (mod.condition && mod.condition !== 'darkvision') continue
      if (typeof mod.value === 'number') {
        best = best == null ? Math.floor(mod.value) : Math.max(best, Math.floor(mod.value))
      }
    }
  }
  return best
}

/**
 * PHB temp HP: pools do not stack. Ask when both > 0 (Р4).
 * Returns which pool to keep; UI highlights the larger.
 */
export function chooseTempHpPool(
  current: number,
  incoming: number,
  choice: 'keep' | 'replace',
): number {
  const cur = Math.max(0, Math.floor(current))
  const next = Math.max(0, Math.floor(incoming))
  if (cur <= 0) return next
  if (next <= 0) return cur
  return choice === 'replace' ? next : cur
}

/** Clamp current HP after losing hp_max from an ended effect (B11). */
export function clampHpAfterMaxLoss(input: {
  hpCurrent: number
  hpMaxBefore: number
  lostMax: number
}): { hpMax: number; hpCurrent: number } {
  const lost = Math.max(0, Math.floor(input.lostMax))
  const hpMax = Math.max(1, Math.floor(input.hpMaxBefore) - lost)
  let hpCurrent = Math.floor(input.hpCurrent)
  if (hpCurrent > 0) {
    hpCurrent = Math.max(1, Math.min(hpCurrent, hpMax))
  } else {
    hpCurrent = Math.max(0, Math.min(hpCurrent, hpMax))
  }
  return { hpMax, hpCurrent }
}

export type ListRollDieChipsOpts = {
  /** Melee weapon attack — required for next_melee_* riders (absorb elements). */
  melee?: boolean
  /** Include optional chips (marked target / in aura). Default true. */
  includeOptional?: boolean
}

export function listRollDieChips(
  effects: unknown,
  rollKind: EffectRollKind,
  opts?: ListRollDieChipsOpts,
): RollDieChip[] {
  const parsed = applyEffectStacking(parseActiveEffects(effects))
  const chips: RollDieChip[] = []
  const includeOptional = opts?.includeOptional !== false
  for (const effect of parsed) {
    if (effect.inactive) continue
    for (const mod of effect.mods ?? []) {
      const target = String(mod.target || '')
      const hasDice = typeof mod.dice === 'string' && Boolean(mod.dice.trim())

      // Classic B-01 attack/save/check / initiative dice.
      if (
        rollKind === 'attack' ||
        rollKind === 'save' ||
        rollKind === 'check' ||
        rollKind === 'initiative'
      ) {
        const isClassic =
          mod.op === 'roll_die' ||
          (hasDice &&
            (target === 'attack' ||
              target === 'save' ||
              target === 'check' ||
              target === 'attack_save' ||
              target === 'initiative'))
        if (isClassic) {
          const app =
            target === 'initiative'
              ? MOD_REGISTRY.initiative
              : MOD_REGISTRY.roll_die
          const chip = app.rollChip?.(mod, effect, rollKind)
          if (chip) chips.push(chip)
          continue
        }
      }

      // B-03 damage riders: weapon_damage.dice and legacy label+dice.
      if (rollKind === 'damage' && hasDice) {
        if (target === 'weapon_damage' || (target === 'label' && hasDice)) {
          if (String(mod.condition || '').startsWith('next_melee_') && opts?.melee === false) {
            continue
          }
          if (target === 'weapon_damage') {
            const chip = MOD_REGISTRY.weapon_damage.rollChip?.(mod, effect, 'damage')
            if (chip) {
              if (chip.optional && !includeOptional) continue
              chips.push(chip)
            }
            continue
          }
          // label + dice (legacy absorb / shadow blade before B-03 rewrite)
          const optional = isOptionalRiderCondition(mod.condition)
          if (optional && !includeOptional) continue
          const chip = chipFromMod(mod, effect, 'damage', {
            name: optional ? optionalLabelFor(mod.condition, effect.name) : effect.name,
            optional,
            defaultChecked: optional ? true : undefined,
            once: Boolean(mod.once) || String(mod.condition || '').startsWith('next_melee_'),
          })
          if (chip) chips.push(chip)
        }
      }
    }
  }
  return chips
}

export type AdvantageRollKind = 'attack' | 'save' | 'check' | 'initiative'

function advantageModApplies(
  mod: EffectMod,
  opts?: {
    condition?: string | null
    rollKind?: AdvantageRollKind | null
    abilityKey?: string | null
  },
): boolean {
  const isAdv =
    mod.op === 'advantage' ||
    mod.target === 'advantage' ||
    mod.op === 'disadvantage' ||
    mod.target === 'disadvantage'
  if (!isAdv) return false
  const cond = (mod.condition || '').trim()
  if (opts?.condition) {
    if (cond && cond !== opts.condition) return false
    return true
  }
  const rollKind = opts?.rollKind
  if (!rollKind) return true
  if (!cond) return true

  // Enemy-facing marks — not applied to the character's own rolls.
  if (
    cond === 'attacks_vs_you' ||
    cond === 'ranged_vs_you' ||
    cond === 'ranged_weapon_vs_in_sphere' ||
    cond === 'blur'
  ) {
    return false
  }

  if (rollKind === 'attack') {
    if (
      cond === 'attack' ||
      cond === 'weapon_attack' ||
      cond === 'weapon_attack_once' ||
      cond === 'str_attack' ||
      cond === 'dex_wis_attack' ||
      cond === 'all'
    ) {
      return true
    }
    return false
  }
  if (rollKind === 'save') {
    if (mod.target === 'save' || cond === 'save' || cond === 'all' || cond === 'spells') {
      return true
    }
    const ability = (opts?.abilityKey || '').toLowerCase()
    if (ability && (cond === ability || cond.split('_').includes(ability))) return true
    if (cond === 'death' && ability === 'death') return true
    // Bare advantage target with ability condition (enhance-like on checks only) — skip for saves
    // unless target is save.
    if (mod.target === 'advantage' && ['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(cond)) {
      return false
    }
    return mod.target === 'save'
  }
  if (rollKind === 'check') {
    if (cond === 'check' || cond === 'all') return true
    if (cond === 'find_marked_target') {
      // Perception / Survival when seeking the mark — player uses optional desk mode; auto for those skills.
      const skill = (opts?.abilityKey || '').toLowerCase()
      return skill === 'perception' || skill === 'survival' || skill === 'wis'
    }
    const ability = (opts?.abilityKey || '').toLowerCase()
    if (ability && (cond === ability || cond.split('_').includes(ability))) return true
    if (mod.target === 'advantage' && ['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(cond)) {
      return true
    }
    return false
  }
  if (rollKind === 'initiative') {
    return cond === 'initiative' || cond === 'all' || cond === 'check'
  }
  return false
}

/**
 * PHB p.173: advantage and disadvantage cancel to a normal roll.
 * Returns net: 'advantage' | 'disadvantage' | 'normal'.
 */
export function resolveAdvantageFromEffects(
  effects: unknown,
  opts?: {
    condition?: string | null
    rollKind?: AdvantageRollKind | null
    abilityKey?: string | null
  },
): 'advantage' | 'disadvantage' | 'normal' {
  const parsed = applyEffectStacking(parseActiveEffects(effects))
  let adv = 0
  let dis = 0
  for (const effect of parsed) {
    if (effect.inactive) continue
    for (const mod of effect.mods ?? []) {
      if (!advantageModApplies(mod, opts)) continue
      if (mod.op === 'advantage' || mod.target === 'advantage') adv += 1
      if (mod.op === 'disadvantage' || mod.target === 'disadvantage') dis += 1
    }
  }
  if (adv > 0 && dis > 0) return 'normal'
  if (adv > 0) return 'advantage'
  if (dis > 0) return 'disadvantage'
  return 'normal'
}

/** Merge manual desk toggle with effect-sourced advantage (PHB cancel rule). */
export function mergeDeskRollMode(
  desk: 'normal' | 'advantage' | 'disadvantage',
  fromEffects: 'advantage' | 'disadvantage' | 'normal',
): 'normal' | 'advantage' | 'disadvantage' {
  let adv = desk === 'advantage' ? 1 : 0
  let dis = desk === 'disadvantage' ? 1 : 0
  if (fromEffects === 'advantage') adv += 1
  if (fromEffects === 'disadvantage') dis += 1
  if (adv > 0 && dis > 0) return 'normal'
  if (adv > 0) return 'advantage'
  if (dis > 0) return 'disadvantage'
  return 'normal'
}

/** Effects that should prompt «закончить Невидимость?» on attack/cast. */
export function effectsEndingOnAttackCast(effects: unknown): ActiveEffect[] {
  return applyEffectStacking(parseActiveEffects(effects)).filter(
    (row) =>
      !row.inactive &&
      (row.mods ?? []).some(
        (mod) =>
          mod.target === 'label' && mod.condition === 'invisible_ends_on_attack_cast',
      ),
  )
}

/**
 * After a confirmed hit / roll: drop once riders (and optionally whole effect),
 * spend charges (flame arrows / mirror images handled separately).
 */
export function consumeRollDieChips(
  effects: ActiveEffect[],
  chips: RollDieChip[],
): ActiveEffect[] {
  if (!chips.length) return effects
  const onceIds = new Set(chips.filter((c) => c.once).map((c) => c.effectId))
  const chargeIds = new Set(chips.filter((c) => c.spendCharge).map((c) => c.effectId))
  // Also clear once advantage mods when damage once of same effect is consumed (zephyr).
  return effects
    .map((row) => {
      if (onceIds.has(row.id)) {
        // Strip once mods; if nothing mechanical left besides labels/speed-once, drop effect
        // when all once damage/advantage mods are gone and slug is a one-hit smite-like.
        const remaining = (row.mods ?? []).filter((mod) => !mod.once)
        const smiteLike =
          Boolean(row.slug?.includes('smite')) || row.slug === 'true_strike'
        if (smiteLike || remaining.length === 0) return null
        // Absorb Elements / Zephyr: keep resistance / labels; strip once riders only.
        return { ...row, mods: remaining }
      }
      if (chargeIds.has(row.id) && typeof row.charges === 'number') {
        const next = Math.max(0, row.charges - 1)
        if (next <= 0 && row.slug === 'flame_arrows') return null
        return { ...row, charges: next }
      }
      return row
    })
    .filter((row): row is ActiveEffect => row != null)
}

export function decrementEffectCharges(
  effects: ActiveEffect[],
  effectId: string,
  by = 1,
): ActiveEffect[] {
  return effects
    .map((row) => {
      if (row.id !== effectId) return row
      const next = Math.max(0, (row.charges ?? 0) - by)
      if (next <= 0 && (row.slug === 'mirror_image' || row.slug === 'flame_arrows')) {
        return null
      }
      return { ...row, charges: next }
    })
    .filter((row): row is ActiveEffect => row != null)
}

export function tickEffectRound(effect: ActiveEffect): ActiveEffect | null {
  const d = effect.duration
  if (!d) return effect
  const rounds = durationToRounds(d)
  if (rounds == null) return effect
  if (rounds <= 1) return null
  return {
    ...effect,
    duration: {
      ...d,
      remaining_rounds: rounds - 1,
    },
  }
}

export function tickAllEffectsOneRound(effects: ActiveEffect[]): ActiveEffect[] {
  const out: ActiveEffect[] = []
  for (const row of effects) {
    const next = tickEffectRound(row)
    if (next) out.push(next)
  }
  return out
}

export function formatEffectRemaining(effect: ActiveEffect): string {
  const d = effect.duration
  if (!d) return ''
  if (d.unit === 'until_short_rest') return 'до короткого отдыха'
  if (d.unit === 'until_long_rest') return 'до продолжительного отдыха'
  if (d.unit === 'permanent') return 'постоянно'
  if (d.unit === 'manual') return 'вручную'
  const rounds = durationToRounds(d)
  if (rounds == null) return ''
  if (d.unit === 'minutes' && (d.value ?? 0) >= 1) {
    return `осталось ${rounds} раундов (${d.value} мин)`
  }
  if (d.unit === 'hours' && (d.value ?? 0) >= 1) {
    return `осталось ${rounds} раундов (${d.value} ч)`
  }
  return `осталось ${rounds} раундов`
}

export function serializeActiveEffect(effect: ActiveEffect): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: effect.id,
    name: effect.name,
    linked_concentration: Boolean(effect.linked_concentration),
  }
  if (effect.kind) row.kind = effect.kind
  if (effect.slug) row.slug = effect.slug
  if (effect.source_character_id) row.source_character_id = effect.source_character_id
  if (effect.source_name) row.source_name = effect.source_name
  if (effect.origin) row.origin = effect.origin
  if (effect.ac_bonus != null) row.ac_bonus = effect.ac_bonus
  if (effect.charges != null) row.charges = effect.charges
  if (effect.mods && effect.mods.length) row.mods = effect.mods
  if (effect.duration) row.duration = effect.duration
  if (effect.inactive) {
    row.inactive = true
    if (effect.inactive_reason) row.inactive_reason = effect.inactive_reason
  }
  return row
}

function newEffectId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `fx-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export type SpellBuffSpec = {
  name: string
  slug: string
  kind?: EffectKind
  concentration: boolean
  duration: EffectDuration
  mods: EffectMod[]
  charges?: number
}

/** Catalog of B-01 spells / features that write structured effects. */
export const B01_BUFF_SPECS: Record<string, SpellBuffSpec> = {
  guidance: {
    name: 'Указание',
    slug: 'guidance',
    kind: 'spell',
    concentration: true,
    duration: { unit: 'minutes', value: 1, remaining_rounds: 10 },
    mods: [{ target: 'check', op: 'roll_die', dice: '1d4', once: true }],
    charges: 1,
  },
  resistance: {
    name: 'Сопротивление',
    slug: 'resistance',
    kind: 'spell',
    concentration: true,
    duration: { unit: 'minutes', value: 1, remaining_rounds: 10 },
    mods: [{ target: 'save', op: 'roll_die', dice: '1d4', once: true }],
    charges: 1,
  },
  bless: {
    name: 'Благословение',
    slug: 'bless',
    kind: 'spell',
    concentration: true,
    duration: { unit: 'minutes', value: 1, remaining_rounds: 10 },
    mods: [{ target: 'attack_save', op: 'roll_die', dice: '1d4', once: false }],
  },
  shield_of_faith: {
    name: 'Щит веры',
    slug: 'shield_of_faith',
    kind: 'spell',
    concentration: true,
    duration: { unit: 'minutes', value: 10, remaining_rounds: 100 },
    mods: [{ target: 'ac', op: 'add', value: 2 }],
  },
  emboldening_bond: {
    name: 'Ободряющая связь',
    slug: 'emboldening_bond',
    kind: 'feature',
    concentration: false,
    duration: { unit: 'minutes', value: 10, remaining_rounds: 100 },
    mods: [
      {
        target: 'attack_save',
        op: 'roll_die',
        dice: '1d4',
        once: true,
        condition: 'once_per_turn',
      },
      {
        target: 'check',
        op: 'roll_die',
        dice: '1d4',
        once: true,
        condition: 'once_per_turn',
      },
    ],
  },
}

const SPELL_NAME_TO_SLUG: Array<{ re: RegExp; slug: string }> = [
  { re: /^указан|^guidance$|^наставлен/i, slug: 'guidance' },
  { re: /^сопротивлен|^resistance$/i, slug: 'resistance' },
  { re: /^благословен|^bless$/i, slug: 'bless' },
  { re: /^щит\s*вер|^shield of faith$/i, slug: 'shield_of_faith' },
  { re: /^ободряющ|^emboldening/i, slug: 'emboldening_bond' },
  ...B03_NAME_TO_SLUG,
  ...B02_NAME_TO_SLUG,
]

export function guessBuffSlug(name: string, catalogId?: string | null): string | null {
  const id = String(catalogId ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  if (id && B01_BUFF_SPECS[id]) return id
  if (id && B03_BUFF_SPEC_BUILDERS[id]) return id
  if (id && B02_BUFF_SPEC_BUILDERS[id]) return id
  // Common catalog_id aliases
  const aliases: Record<string, string> = {
    shillelagh: 'shillelagh',
    blade_ward: 'blade_ward',
    mage_armour: 'mage_armor',
    armor_of_agathys: 'armor_of_agathys',
    protection_from_evil_and_good: 'protection_from_evil_and_good',
    pass_without_trace: 'pass_without_trace',
    enlarge_reduce: 'enlarge',
    enlarge_reduce_enlarge: 'enlarge',
    heroes_feast: 'heroes_feast',
    tensers_transformation: 'tensers_transformation',
    tasha_s_otherworldly_guise: 'tashas_otherworldly_guise',
    tashas_otherworldly_guise: 'tashas_otherworldly_guise',
    ashardalon_s_stride: 'ashardalons_stride',
    ashardalons_stride: 'ashardalons_stride',
    ceremony: 'ceremony_wedding',
    hunter_s_mark: 'hunters_mark',
    hunters_mark: 'hunters_mark',
    crusader_s_mantle: 'crusaders_mantle',
    otiluke_s_resilient_sphere: 'otilukes_resilient_sphere',
    fortune_s_favor: 'fortunes_favor',
    gift_of_alacrity: 'gift_of_alacrity',
  }
  if (id && aliases[id]) return aliases[id]
  const stripped = id.replace(/'/g, '')
  if (stripped && B03_BUFF_SPEC_BUILDERS[stripped]) return stripped
  if (stripped && B02_BUFF_SPEC_BUILDERS[stripped]) return stripped
  const label = name.trim()
  for (const row of SPELL_NAME_TO_SLUG) {
    if (row.re.test(label)) return row.slug
  }
  return null
}

export function buildBuffEffect(input: {
  name?: string
  slug?: string | null
  catalogId?: string | null
  sourceCharacterId?: string | null
  sourceName?: string | null
  linkedConcentration?: boolean
  slotLevel?: number | null
  spellLevel?: number | null
  casterMod?: number | null
  option?: string | null
}): ActiveEffect | null {
  let slug =
    input.slug ||
    guessBuffSlug(input.name ?? '', input.catalogId) ||
    null
  // Ceremony rites: option picks dedication / coming_of_age / wedding.
  const opt = (input.option || '').trim()
  if (
    opt &&
    (slug === 'ceremony_wedding' ||
      slug === 'ceremony' ||
      /^церемони/i.test(input.name ?? '') ||
      /ceremony/i.test(String(input.catalogId ?? '')))
  ) {
    if (opt === 'dedication' || opt === 'посвящение') slug = 'ceremony_dedication'
    else if (opt === 'coming_of_age' || opt === 'становление') {
      slug = 'ceremony_coming_of_age'
    } else if (opt === 'wedding' || opt === 'венчание') slug = 'ceremony_wedding'
  }
  if (!slug) return null
  const ctx: BuffBuildContext = {
    slotLevel: input.slotLevel,
    spellLevel: input.spellLevel,
    casterMod: input.casterMod,
    option: input.option,
  }
  const spec =
    B01_BUFF_SPECS[slug] ??
    buildB03BuffSpec(slug, ctx) ??
    buildB02BuffSpec(slug, ctx)
  if (!spec) return null
  const startedAt = new Date().toISOString()
  const duration: EffectDuration = {
    ...spec.duration,
    started_at: startedAt,
    remaining_rounds:
      spec.duration.remaining_rounds ?? durationToRounds(spec.duration) ?? undefined,
  }
  return {
    id: newEffectId(),
    name: input.name?.trim() || spec.name,
    kind: spec.kind ?? 'spell',
    slug: spec.slug,
    source_character_id: input.sourceCharacterId ?? null,
    source_name: input.sourceName ?? null,
    linked_concentration:
      input.linkedConcentration != null
        ? input.linkedConcentration
        : spec.concentration,
    duration,
    mods: spec.mods.map((m) => ({ ...m })),
    ...(spec.charges != null ? { charges: spec.charges } : {}),
  }
}

/** True when this spell/catalog has a structured B-01/B-02/B-03 buff spec. */
export function hasBuffSpec(name: string, catalogId?: string | null): boolean {
  return guessBuffSlug(name, catalogId) != null
}

export function buildInfusionDefenseEffect(input: {
  name: string
  acBonus: number
  sourceCharacterId: string
  sourceName?: string | null
}): ActiveEffect {
  const bonus = Math.max(0, Math.floor(input.acBonus))
  return {
    id: newEffectId(),
    name: input.name,
    kind: 'infusion',
    slug: 'enhanced_defense',
    origin: 'infusion',
    source_character_id: input.sourceCharacterId,
    source_name: input.sourceName ?? null,
    linked_concentration: false,
    duration: { unit: 'permanent', started_at: new Date().toISOString() },
    ac_bonus: bonus,
    mods: bonus > 0 ? [{ target: 'ac', op: 'add', value: bonus }] : [],
  }
}

/** Merge remote combat.effects into local without wiping unrelated draft fields. */
export function mergeRemoteEffects(
  local: ActiveEffect[],
  remote: ActiveEffect[],
): ActiveEffect[] {
  return applyEffectStacking(remote.length ? remote : local)
}

export function parseDiceNotation(dice: string): { count: number; sides: number } | null {
  const m = String(dice).trim().match(/^(\d*)d(\d+)$/i)
  if (!m) return null
  return { count: Math.max(1, Number(m[1] || 1)), sides: Math.max(2, Number(m[2])) }
}

export function rollDiceNotation(dice: string, rng: () => number = Math.random): number {
  const parsed = parseDiceNotation(dice)
  if (!parsed) return 0
  let total = 0
  for (let i = 0; i < parsed.count; i += 1) {
    total += 1 + Math.floor(rng() * parsed.sides)
  }
  return total
}
