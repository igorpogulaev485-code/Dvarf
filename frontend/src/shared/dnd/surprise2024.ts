/**
 * SRD 5.2.1 surprise: not a condition and not the 2014 L-21 surprise round.
 * A surprised creature rolls Initiative with Disadvantage.
 * Incapacitated when rolling Initiative also gives Disadvantage (see conditions2024).
 */

export type InitiativeRollMode = 'normal' | 'advantage' | 'disadvantage'

export const SURPRISE_2024_HINT =
  'Застигнут врасплох (2024): помеха к инициативе. Отдельного раунда неожиданности нет.'

/** Merge surprise into initiative mode (disadvantage wins over normal; cancels advantage). */
export function initiativeModeWithSurprise2024(
  base: InitiativeRollMode,
  surprised: boolean,
): InitiativeRollMode {
  if (!surprised) return base
  if (base === 'advantage') return 'normal'
  return 'disadvantage'
}

/** L-21 surprise round (action lockdown) applies only to 2014. */
export function surpriseRoundAllowed(edition: string | null | undefined): boolean {
  return String(edition ?? '2014').trim() !== '2024'
}

export function usesSurpriseInitiativeDisadvantage(
  edition: string | null | undefined,
): boolean {
  return String(edition ?? '2014').trim() === '2024'
}
