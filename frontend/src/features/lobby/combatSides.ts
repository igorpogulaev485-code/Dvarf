/** S-05: стороны боя — подписи и помощник «свои». */

export const SIDE_PARTY = 'party'
export const SIDE_ENEMIES = 'enemies'

export const DEFAULT_SIDE_LABELS: Record<string, string> = {
  [SIDE_PARTY]: 'Партия',
  [SIDE_ENEMIES]: 'Враги',
}

export function sideLabel(
  sideId: string | null | undefined,
  sides?: Array<{ id: string; label: string }> | null,
): string {
  const id = (sideId || SIDE_PARTY).trim() || SIDE_PARTY
  const hit = sides?.find((s) => s.id === id)
  if (hit?.label) return hit.label
  return DEFAULT_SIDE_LABELS[id] ?? id
}

export function defaultSideForKind(kind: string | null | undefined): string {
  return kind === 'enemy' ? SIDE_ENEMIES : SIDE_PARTY
}

/** Свои = та же сторона (истинная / уже видимая в payload). */
export function isAllySide(
  actorSide: string | null | undefined,
  targetSide: string | null | undefined,
): boolean {
  const a = (actorSide || SIDE_PARTY).trim() || SIDE_PARTY
  const b = (targetSide || SIDE_PARTY).trim() || SIDE_PARTY
  return a === b
}

export function alliesOf<T extends { side?: string | null; is_ally?: boolean }>(
  rows: T[],
  actorSide: string | null | undefined = SIDE_PARTY,
): T[] {
  return rows.filter((r) => {
    if (typeof r.is_ally === 'boolean' && actorSide == null) return r.is_ally
    return isAllySide(actorSide ?? SIDE_PARTY, r.side)
  })
}

export function foesOf<T extends { side?: string | null; is_ally?: boolean }>(
  rows: T[],
  actorSide: string | null | undefined = SIDE_PARTY,
): T[] {
  return rows.filter((r) => !isAllySide(actorSide ?? SIDE_PARTY, r.side))
}

export function findEntrySide(
  combat:
    | {
        entries?: Array<{
          kind: string
          ref_id: string
          companion_id?: string | null
          side?: string | null
        }>
      }
    | null
    | undefined,
  kind: string,
  refId: string,
  companionId?: string | null,
): string {
  const entry = combat?.entries?.find((e) => {
    if (e.kind !== kind || e.ref_id !== refId) return false
    if (kind === 'companion') {
      return (e.companion_id || null) === (companionId || null)
    }
    return true
  })
  return entry?.side || defaultSideForKind(kind)
}
