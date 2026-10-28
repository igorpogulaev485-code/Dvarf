/** PHB running long / high jump (feet). */

export type JumpDistances = {
  longFt: number
  highFt: number
}

export function longJumpFt(strengthScore: number): number {
  return Math.max(0, Math.floor(strengthScore))
}

/** High jump with a 10-ft run: 3 + Strength modifier (min 0). */
export function highJumpFt(strengthMod: number): number {
  return Math.max(0, 3 + Math.floor(strengthMod))
}

export function jumpDistances(input: {
  strengthScore: number
  strengthMod: number
}): JumpDistances {
  return {
    longFt: longJumpFt(input.strengthScore),
    highFt: highJumpFt(input.strengthMod),
  }
}

/** Tooltip / aria — not shown in the vital face. */
export function formatJumpTitle(jump: JumpDistances): string {
  return (
    `Прыжок с разбега: длинный ${jump.longFt} фт, высокий ${jump.highFt} фт. ` +
    'Без разбега — половина.'
  )
}
