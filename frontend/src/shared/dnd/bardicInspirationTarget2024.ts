/**
 * 2024 Bardic Inspiration — target-side helpers.
 * Grant applies ActiveEffect slug `bardic_inspiration` on the ally (1 hour).
 * Spend is after a failed d20 Test (check / attack / save), or Valor AC / damage.
 * 2014 path stays on auto roll_die chips + 10 minutes — do not call these there.
 */
import type { ActiveEffect, EffectMod } from './activeEffects'

export const BI_AFTER_FAILED_D20_CONDITION = 'after_failed_d20'
export const BI_COMBAT_AC_CONDITION = 'combat_inspiration_ac'
export const BI_COMBAT_DAMAGE_CONDITION = 'combat_inspiration_damage'

export type BardicInspirationSpendMode2024 =
  | 'after_fail'
  | 'combat_ac'
  | 'combat_damage'

/** Normalize `1к8` / `1d8` / `d8` → `1d8`. */
export function normalizeBardicDieNotation(raw: string | null | undefined): string {
  const t = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/к/g, 'd')
  const m = t.match(/^(\d*)d(4|6|8|10|12)$/i)
  if (m) return `${m[1] || '1'}d${m[2]}`
  if (/12/.test(t)) return '1d12'
  if (/10/.test(t)) return '1d10'
  if (/8/.test(t)) return '1d8'
  return '1d6'
}

/** Display label `1к8` from `1d8`. */
export function bardicDieLabelRu(raw: string | null | undefined): string {
  return normalizeBardicDieNotation(raw).replace(/d/i, 'к')
}

export function dieSidesFromNotation(raw: string | null | undefined): number {
  const n = normalizeBardicDieNotation(raw)
  const m = n.match(/d(\d+)/i)
  return m ? Math.max(2, Number(m[1]) || 6) : 6
}

function modHasCondition(mod: EffectMod, condition: string): boolean {
  return String(mod.condition || '') === condition
}

/** Active (non-inactive) BI / combat-inspiration effect holding a spendable die. */
export function findSpendableBardicInspirationEffect(
  effects: ActiveEffect[] | null | undefined,
): ActiveEffect | null {
  for (const row of effects ?? []) {
    if (row.inactive) continue
    if (row.slug !== 'bardic_inspiration' && row.slug !== 'combat_inspiration') continue
    const hasDie = (row.mods ?? []).some(
      (mod) =>
        (mod.op === 'roll_die' || Boolean(mod.dice)) &&
        typeof mod.dice === 'string' &&
        Boolean(mod.dice.trim()),
    )
    if (hasDie) return row
  }
  return null
}

/** Die notation (`1d8`) from a BI effect’s mods. */
export function bardicInspirationDieFromEffect(
  effect: ActiveEffect | null | undefined,
): string {
  if (!effect) return '1d6'
  for (const mod of effect.mods ?? []) {
    if (typeof mod.dice === 'string' && mod.dice.trim()) {
      return normalizeBardicDieNotation(mod.dice)
    }
  }
  return '1d6'
}

export function bardicInspirationAllowsAfterFail(
  effect: ActiveEffect | null | undefined,
): boolean {
  if (!effect || effect.inactive) return false
  return (effect.mods ?? []).some(
    (mod) =>
      modHasCondition(mod, BI_AFTER_FAILED_D20_CONDITION) ||
      (!mod.condition &&
        (mod.target === 'check' ||
          mod.target === 'attack_save' ||
          mod.target === 'attack' ||
          mod.target === 'save') &&
        (mod.op === 'roll_die' || Boolean(mod.dice))),
  )
}

export function bardicInspirationAllowsCombatAc(
  effect: ActiveEffect | null | undefined,
): boolean {
  if (!effect || effect.inactive) return false
  return (effect.mods ?? []).some((mod) => modHasCondition(mod, BI_COMBAT_AC_CONDITION))
}

export function bardicInspirationAllowsCombatDamage(
  effect: ActiveEffect | null | undefined,
): boolean {
  if (!effect || effect.inactive) return false
  return (effect.mods ?? []).some((mod) =>
    modHasCondition(mod, BI_COMBAT_DAMAGE_CONDITION),
  )
}

/** True when a classic auto roll_die chip should be skipped (2024 after-fail BI). */
export function isAfterFailedD20DieMod(mod: EffectMod | null | undefined): boolean {
  return Boolean(mod && modHasCondition(mod, BI_AFTER_FAILED_D20_CONDITION))
}

export function rollBardicDie(
  die: string,
  rng: () => number = Math.random,
): { sides: number; face: number; labelRu: string } {
  const sides = dieSidesFromNotation(die)
  const face = 1 + Math.floor(rng() * sides)
  return { sides, face, labelRu: bardicDieLabelRu(die) }
}

/** Remove the spent BI effect (once buff — whole chip goes away). */
export function consumeBardicInspirationEffect(
  effects: ActiveEffect[],
  effectId: string,
): ActiveEffect[] {
  return (effects ?? []).filter((row) => row.id !== effectId)
}

export function spendBardicInspirationOnTarget(input: {
  effects: ActiveEffect[]
  mode: BardicInspirationSpendMode2024
  effectId?: string | null
  rng?: () => number
}): {
  ok: boolean
  message?: string
  effects: ActiveEffect[]
  face?: number
  dieLabelRu?: string
  feedLineRu?: string
} {
  const effect = input.effectId
    ? (input.effects ?? []).find((row) => row.id === input.effectId && !row.inactive) ??
      null
    : findSpendableBardicInspirationEffect(input.effects)
  if (!effect) {
    return { ok: false, message: 'Нет кости Бардовского вдохновения', effects: input.effects }
  }
  if (input.mode === 'after_fail' && !bardicInspirationAllowsAfterFail(effect)) {
    return {
      ok: false,
      message: 'Эту кость нельзя прибавить к проваленному Тесту к20',
      effects: input.effects,
    }
  }
  if (input.mode === 'combat_ac' && !bardicInspirationAllowsCombatAc(effect)) {
    return {
      ok: false,
      message: 'Боевое вдохновение (КД) недоступно для этой кости',
      effects: input.effects,
    }
  }
  if (input.mode === 'combat_damage' && !bardicInspirationAllowsCombatDamage(effect)) {
    return {
      ok: false,
      message: 'Боевое вдохновение (урон) недоступно для этой кости',
      effects: input.effects,
    }
  }
  const die = bardicInspirationDieFromEffect(effect)
  const rolled = rollBardicDie(die, input.rng)
  const next = consumeBardicInspirationEffect(input.effects, effect.id)
  const modeRu =
    input.mode === 'combat_ac'
      ? 'КД (реакция)'
      : input.mode === 'combat_damage'
        ? 'урон атаки'
        : 'к проваленному Тесту к20'
  return {
    ok: true,
    effects: next,
    face: rolled.face,
    dieLabelRu: rolled.labelRu,
    feedLineRu: `Бардовское вдохновение: ${rolled.labelRu} → ${rolled.face} (${modeRu}) · кость потрачена`,
  }
}
