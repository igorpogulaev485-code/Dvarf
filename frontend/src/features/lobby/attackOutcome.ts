/**
 * Explicit hit / miss labels for attack UI + feed (UIKIT-02).
 * Nat 20 → Крит, nat 1 → Провал; otherwise Попадание / Промах.
 */

export type AttackOutcomeKind = 'hit' | 'miss' | 'crit' | 'fumble'

export function resolveAttackOutcome(input: {
  hit: boolean
  natural?: number | null
}): AttackOutcomeKind {
  if (input.natural === 20 && input.hit) return 'crit'
  if (input.natural === 1 && !input.hit) return 'fumble'
  return input.hit ? 'hit' : 'miss'
}

export function attackOutcomeLabel(kind: AttackOutcomeKind): string {
  if (kind === 'crit') return 'Крит'
  if (kind === 'fumble') return 'Провал'
  if (kind === 'hit') return 'Попадание'
  return 'Промах'
}

/** Compare attack total to AC when known. */
export function hitAgainstAc(
  attackTotal: number | null | undefined,
  ac: number | null | undefined,
): boolean | null {
  if (attackTotal == null || !Number.isFinite(attackTotal)) return null
  if (ac == null || !Number.isFinite(ac)) return null
  return attackTotal >= ac
}

/**
 * Feed / toast line for a PC or enemy attack.
 * If AC is hidden from the viewer, omit «vs КД N».
 */
export function formatAttackResultLine(input: {
  attackName: string
  targetName?: string | null
  attackTotal?: number | null
  natural?: number | null
  ac?: number | null
  /** When false/null, never print vs КД (player vs hidden enemy AC). */
  showAc?: boolean
  hit?: boolean | null
  damage?: number | null
  physical?: boolean
}): string {
  const knownHit =
    input.hit != null
      ? input.hit
      : hitAgainstAc(input.attackTotal, input.ac)
  const kind =
    knownHit == null
      ? null
      : resolveAttackOutcome({ hit: knownHit, natural: input.natural })
  const label = kind ? attackOutcomeLabel(kind) : null

  const left = input.targetName?.trim()
    ? `Атака: ${input.attackName} → ${input.targetName.trim()}`
    : `Атака: ${input.attackName}`

  const bits: string[] = []
  if (
    input.attackTotal != null &&
    Number.isFinite(input.attackTotal) &&
    input.showAc &&
    input.ac != null &&
    Number.isFinite(input.ac)
  ) {
    bits.push(`${input.attackTotal} vs КД ${input.ac}`)
  } else if (input.attackTotal != null && Number.isFinite(input.attackTotal) && label) {
    bits.push(String(input.attackTotal))
  }
  if (label) bits.push(label)
  if (
    knownHit &&
    input.damage != null &&
    Number.isFinite(input.damage) &&
    input.damage > 0
  ) {
    bits.push(`${input.damage} урона`)
  }
  if (input.physical) bits.push('🎲')

  return bits.length ? `${left}: ${bits.join(' · ')}` : left
}
