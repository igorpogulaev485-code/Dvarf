/** Above this max, render ± counter instead of one pip per charge. */
export const RESOURCE_PIP_INLINE_MAX = 10

/** Large pools (Lay on Hands 5×level, Ki 20, …) — pips become unreadable. */
export function shouldUseCompactResourceTrack(max: number): boolean {
  return Number.isFinite(max) && max > RESOURCE_PIP_INLINE_MAX
}
