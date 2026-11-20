/**
 * SRD 5.2.1 Bloodied — HP ≤ half of maximum (round down).
 * Computed; no manual toggle.
 */

export function isBloodied(
  hpCurrent: number | null | undefined,
  hpMax: number | null | undefined,
): boolean {
  if (hpCurrent == null || hpMax == null) return false
  if (!Number.isFinite(hpCurrent) || !Number.isFinite(hpMax)) return false
  if (hpMax <= 0) return false
  return Math.floor(hpCurrent) <= Math.floor(hpMax / 2)
}

export function bloodiedLabelRu(): string {
  return 'окровавлен'
}
