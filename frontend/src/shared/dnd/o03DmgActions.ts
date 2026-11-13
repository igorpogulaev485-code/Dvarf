/**
 * O-03: правила мастера DMG/XGE — чистые хелперы (падение, сутки без отдыха, адамантин).
 */

/** 1к6 за каждые 10 фт, потолок 20к6. */
export function fallingDiceCount(feet: number): number {
  const f = Math.max(0, Math.floor(Number(feet) || 0))
  return Math.min(20, Math.floor(f / 10))
}

export function fallingDamageFormula(feet: number): string {
  const n = fallingDiceCount(feet)
  if (n <= 0) return '0'
  return `${n}к6 дробящего`
}

export function rollFallingDamage(
  feet: number,
  rng: () => number = Math.random,
): { dice: number; total: number; rolls: number[] } {
  const dice = fallingDiceCount(feet)
  const rolls: number[] = []
  let total = 0
  for (let i = 0; i < dice; i += 1) {
    const r = 1 + Math.floor(rng() * 6)
    rolls.push(r)
    total += r
  }
  return { dice, total, rolls }
}

/** При уроне > 0 — опрокинут. */
export function fallingProne(totalDamage: number): boolean {
  return totalDamage > 0
}

/**
 * Сл спасброска Телосложения за сутки без длинного отдыха.
 * `daysAlready` — сколько суток уже учтено (0 → Сл 10, 1 → 15, …).
 */
export function noLongRestDc(daysAlready: number): number {
  const days = Math.max(0, Math.floor(Number(daysAlready) || 0))
  return 10 + days * 5
}

export function resolveNoLongRestSave(input: {
  daysAlready: number
  saveTotal: number
}): {
  dc: number
  success: boolean
  nextDays: number
  exhaustionDelta: number
} {
  const dc = noLongRestDc(input.daysAlready)
  const success = input.saveTotal >= dc
  return {
    dc,
    success,
    nextDays: input.daysAlready + 1,
    exhaustionDelta: success ? 0 : 1,
  }
}

/** Попадание адамантиновым оружием/боеприпасом по предмету = автокрит. */
export function adamantineObjectHitIsCrit(opts: {
  adamantine: boolean
  targetIsObject: boolean
}): boolean {
  return Boolean(opts.adamantine && opts.targetIsObject)
}

/** Обезоруживание не меняет HP. */
export function disarmDealsDamage(): false {
  return false
}

export type ActionOrBonusPick = 'action' | 'bonus'

/** Пробегание/кувырок: свободная отметка; если свободно только одно — его. */
export function pickActionOrBonus(marks: {
  actionFree: boolean
  bonusFree: boolean
  prefer?: ActionOrBonusPick
}): ActionOrBonusPick | null {
  const { actionFree, bonusFree, prefer } = marks
  if (prefer === 'action' && actionFree) return 'action'
  if (prefer === 'bonus' && bonusFree) return 'bonus'
  if (actionFree && !bonusFree) return 'action'
  if (bonusFree && !actionFree) return 'bonus'
  if (actionFree && bonusFree) return prefer ?? 'action'
  return null
}
