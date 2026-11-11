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

/** Tooltip / aria — clarifies «N/M» on the vital chip. */
export function formatJumpTitle(jump: JumpDistances): string {
  return (
    `Прыжок с разбега: в длину ${jump.longFt} фт / в высоту ${jump.highFt} фт. ` +
    'Без разбега — половина.'
  )
}

/** Short face label under the N/M chip (UX audit). */
export function formatJumpFaceLabel(): string {
  return 'дл./выс. фт'
}
