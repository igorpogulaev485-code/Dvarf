/** PHB running long / high jump (feet). */

export function longJumpFt(strengthScore: number): number {
  return Math.max(0, Math.floor(strengthScore))
}

/** High jump with a 10-ft run: 3 + Strength modifier (min 0). */
export function highJumpFt(strengthMod: number): number {
  return Math.max(0, 3 + Math.floor(strengthMod))
}

export function formatJumpHint(input: {
  strengthScore: number
  strengthMod: number
}): string {
  const long = longJumpFt(input.strengthScore)
  const high = highJumpFt(input.strengthMod)
  return `прыжок ${long} / ${high} фт (дл. / выс., с разбега)`
}
