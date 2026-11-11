/** Library of forms the character has seen / learned (Wild Shape picker). */

export type KnownForm = {
  id: string
  bestiary_ref: string | null
  /** Catalog slug when known (e.g. wolf) — used when bestiary_ref is slug-based. */
  bestiary_slug: string | null
  name_ru: string
  cr: string
  tags: Array<'swim' | 'fly' | 'elemental' | 'custom'>
  stats_override?: {
    hp: number
    ac: number
    speed: number
    actions: string
  }
  notes?: string
}

const TAG_SET = new Set(['swim', 'fly', 'elemental', 'custom'])

export function createKnownForm(partial?: Partial<KnownForm>): KnownForm {
  return {
    id:
      partial?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `known-form-${Date.now()}`),
    bestiary_ref: partial?.bestiary_ref ?? null,
    bestiary_slug: partial?.bestiary_slug ?? null,
    name_ru: partial?.name_ru ?? '',
    cr: partial?.cr ?? '0',
    tags: partial?.tags ?? [],
    stats_override: partial?.stats_override,
    notes: partial?.notes,
  }
}

export function readKnownForms(raw: unknown): KnownForm[] {
  if (!Array.isArray(raw)) return []
  const out: KnownForm[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string') continue
    const tags: KnownForm['tags'] = []
    if (Array.isArray(row.tags)) {
      for (const tag of row.tags) {
        if (typeof tag === 'string' && TAG_SET.has(tag)) {
          tags.push(tag as KnownForm['tags'][number])
        }
      }
    }
    let stats_override: KnownForm['stats_override']
    if (row.stats_override && typeof row.stats_override === 'object') {
      const s = row.stats_override as Record<string, unknown>
      if (
        typeof s.hp === 'number' &&
        typeof s.ac === 'number' &&
        typeof s.speed === 'number' &&
        typeof s.actions === 'string'
      ) {
        stats_override = {
          hp: s.hp,
          ac: s.ac,
          speed: s.speed,
          actions: s.actions,
        }
      }
    }
    out.push({
      id: row.id,
      bestiary_ref: typeof row.bestiary_ref === 'string' ? row.bestiary_ref : null,
      bestiary_slug:
        typeof row.bestiary_slug === 'string' ? row.bestiary_slug : null,
      name_ru: typeof row.name_ru === 'string' ? row.name_ru : '',
      cr: typeof row.cr === 'string' ? row.cr : '0',
      tags,
      stats_override,
      notes: typeof row.notes === 'string' ? row.notes : undefined,
    })
  }
  return out
}

/** Upsert by bestiary_slug or bestiary_ref or name_ru. */
export function upsertKnownForm(
  forms: KnownForm[],
  next: KnownForm,
): KnownForm[] {
  const idx = forms.findIndex(
    (row) =>
      row.id === next.id ||
      (next.bestiary_slug && row.bestiary_slug === next.bestiary_slug) ||
      (next.bestiary_ref && row.bestiary_ref === next.bestiary_ref),
  )
  if (idx < 0) return [...forms, next]
  const copy = forms.slice()
  copy[idx] = { ...copy[idx]!, ...next, id: copy[idx]!.id }
  return copy
}
