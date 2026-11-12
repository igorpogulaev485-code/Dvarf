/**
 * Dawn/midnight charge hints and instant potion drinks.
 * Long-rest rolling itself lives in shared/dnd/rest.ts.
 */
import type { GearEffect } from '../../shared/dnd/gearCatalog'
import { rollDamage } from './deskRolls'

export function depleteHintFromCode(code: unknown): string | undefined {
  if (code === 'regain_1d12_on_20') {
    return 'Последний заряд. Бросьте к20: при 20 посох восстанавливает 1к12+1 зарядов. Лист сам не бросает и предмет не уничтожает.'
  }
  if (code === 'strip_on_1') {
    return 'Последний заряд. Бросьте к20: при 1 посох теряет свойства, кроме +2 к атаке и урону. Лист сам свойства не снимает.'
  }
  if (code === 'destroy_on_1') {
    return 'Последний заряд. Бросьте к20: при 1 предмет уничтожается. Лист сам его не ломает.'
  }
  return undefined
}

export function instantDice(
  effects: GearEffect[] | undefined,
  type: 'heal' | 'harm',
): { dice: string; note: string } | null {
  if (!effects) return null
  for (const effect of effects) {
    if (effect.type !== type) continue
    const dice = String((effect as { dice?: unknown }).dice ?? '').trim()
    if (!dice) continue
    const note = String((effect as { note?: unknown }).note ?? '').trim()
    return { dice, note }
  }
  return null
}

export function applyInstantDice(input: {
  hp: number | null
  max: number | null
  dice: string
  kind: 'heal' | 'harm'
  rng?: () => number
}): { hp: number; line: string } | null {
  const rolled = rollDamage(input.dice, input.rng)
  if (!rolled) return null
  const current = input.hp ?? 0
  const cap = input.max
  if (input.kind === 'heal') {
    if (cap == null) return null
    const next = Math.min(cap, Math.max(0, current) + Math.max(0, rolled.total))
    const gained = next - Math.max(0, current)
    return {
      hp: next,
      line: `${input.dice.replace(/d/gi, 'к')} = ${rolled.total}, хиты ${current} → ${next} (+${gained})`,
    }
  }
  const floor = 0
  const next = Math.max(floor, current - Math.max(0, rolled.total))
  return {
    hp: next,
    line: `${input.dice.replace(/d/gi, 'к')} = ${rolled.total}, хиты ${current} → ${next}`,
  }
}
