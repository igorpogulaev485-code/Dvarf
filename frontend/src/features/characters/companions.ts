/** Companion / naparnik entities on the digital sheet (Wave A: model + UI; grants deepen later). */

/** Swappable panel title — product name, not the internal store key. */
export const COMPANIONS_PANEL_TITLE = 'Напарники'

export type CompanionKind =
  | 'beast_companion'
  | 'steel_defender'
  | 'eldritch_cannon'
  | 'drake'
  | 'primal_companion'
  | 'familiar'
  | 'other'

/** Living needs death saves; summoned/construct dismiss at 0 HP and can return via re-summon. */
export type CompanionNature = 'living' | 'summoned' | 'construct'

export type CompanionSourceKind =
  | 'manual'
  | 'subclass'
  | 'class'
  | 'feat'
  | 'race'
  | 'spell'
  | 'other'

export type CompanionControlMode =
  | 'own_initiative'
  | 'bonus_action_command'
  | 'reaction'
  | 'with_master'
  | 'other'

export type CompanionDeathState = {
  successes: number
  failures: number
}

export type CompanionResourceReset = 'short' | 'long' | 'manual'

/** Per-naparnik resource pool (Repair, cannon charges, …). */
export type CompanionResource = {
  id: string
  name: string
  max: number
  used: number
  reset: CompanionResourceReset
}

export type CompanionSource = {
  kind: CompanionSourceKind
  labelRu: string
  classEntryId?: string
  subclassSlug?: string
  feature?: string
  /** Sheet spell id — used to dismiss naparnik when concentration ends. */
  spellId?: string
}

export type CompanionEntry = {
  id: string
  kind: CompanionKind
  name: string
  /** Catalog entry id from kind=bestiary (empty until Bestiary agent seeds). */
  bestiary_ref: string | null
  /** Cached RU name for the bestiary pick (display when catalog is empty/offline). */
  bestiary_name_ru: string | null
  /**
   * Optional portrait for long-lived naparniki (data URL or https).
   * Not shown for temporary spell summons — see companionAllowsAvatar.
   */
  avatar_url: string | null
  nature: CompanionNature
  /** Combat/scene: alive and present. */
  active: boolean
  /**
   * Multiclass / multi-companion: which naparnik is the player's focus («Основной»).
   * At most one should be true; enforced in UI helpers.
   */
  is_primary: boolean
  control: CompanionControlMode
  source: CompanionSource | null
  stats: {
    hp: number | null
    hp_max: number | null
    ac: number | null
    speed: number | null
  }
  death: CompanionDeathState | null
  resources: CompanionResource[]
  actions: string
  notes: string
}

/**
 * Portrait UI for durable naparniki only:
 * living / construct / familiar / manual — yes;
 * temporary spell summons (summoned + source spell) — no.
 */
export function companionAllowsAvatar(row: CompanionEntry): boolean {
  if (row.kind === 'familiar') return true
  if (row.source?.kind === 'manual') return true
  if (row.nature === 'summoned' && row.source?.kind === 'spell') return false
  if (row.nature === 'living' || row.nature === 'construct') return true
  return false
}

export const COMPANION_KIND_LABELS: Record<CompanionKind, string> = {
  beast_companion: 'Зверь-спутник',
  steel_defender: 'Стальной защитник',
  eldritch_cannon: 'Мистическая пушка',
  drake: 'Дрейк',
  primal_companion: 'Первобытный спутник',
  familiar: 'Фамильяр',
  other: 'Напарник',
}

export const COMPANION_NATURE_LABELS: Record<CompanionNature, string> = {
  living: 'Живое существо',
  summoned: 'Призыв',
  construct: 'Конструкция / предмет',
}

export const COMPANION_CONTROL_LABELS: Record<CompanionControlMode, string> = {
  own_initiative: 'Своя инициатива',
  bonus_action_command: 'Команда бонусным действием хозяина',
  reaction: 'Реакция / особое',
  with_master: 'Ходит вместе с хозяином',
  other: 'Иное (см. заметки)',
}

const KIND_SET = new Set<string>([
  'beast_companion',
  'steel_defender',
  'eldritch_cannon',
  'drake',
  'primal_companion',
  'familiar',
  'other',
])

const NATURE_SET = new Set<string>(['living', 'summoned', 'construct'])
const SOURCE_KIND_SET = new Set<string>([
  'manual',
  'subclass',
  'class',
  'feat',
  'race',
  'spell',
  'other',
])
const CONTROL_SET = new Set<string>([
  'own_initiative',
  'bonus_action_command',
  'reaction',
  'with_master',
  'other',
])

export function defaultNatureForKind(kind: CompanionKind): CompanionNature {
  if (kind === 'eldritch_cannon' || kind === 'steel_defender') return 'construct'
  if (kind === 'familiar') return 'summoned'
  return 'living'
}

export function defaultControlForKind(kind: CompanionKind): CompanionControlMode {
  if (
    kind === 'beast_companion' ||
    kind === 'primal_companion' ||
    kind === 'drake' ||
    kind === 'steel_defender' ||
    kind === 'eldritch_cannon'
  ) {
    return 'bonus_action_command'
  }
  if (kind === 'familiar') return 'with_master'
  return 'own_initiative'
}

export function clampDeathMarks(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(3, Math.floor(value)))
}

export function isCompanionDead(row: CompanionEntry): boolean {
  return row.nature === 'living' && (row.death?.failures ?? 0) >= 3
}

export function isCompanionStable(row: CompanionEntry): boolean {
  return (
    row.nature === 'living' &&
    (row.stats.hp ?? 0) <= 0 &&
    (row.death?.successes ?? 0) >= 3 &&
    (row.death?.failures ?? 0) < 3
  )
}

export function companionSourceLabel(source: CompanionSource | null): string {
  if (!source) return 'Вручную'
  if (source.labelRu.trim()) return source.labelRu.trim()
  switch (source.kind) {
    case 'manual':
      return 'Вручную'
    case 'subclass':
      return source.subclassSlug
        ? `Архетип: ${source.subclassSlug}`
        : 'Архетип'
    case 'class':
      return 'Класс'
    case 'feat':
      return 'Черта'
    case 'race':
      return 'Раса'
    case 'spell':
      return 'Заклинание'
    default:
      return 'Источник'
  }
}

export function clampCompanionResource(resource: CompanionResource): CompanionResource {
  const max = Math.max(0, Math.floor(resource.max))
  const used = Math.min(max, Math.max(0, Math.floor(resource.used)))
  const reset: CompanionResourceReset =
    resource.reset === 'short' || resource.reset === 'long' || resource.reset === 'manual'
      ? resource.reset
      : 'long'
  return {
    id: resource.id,
    name: resource.name,
    max,
    used,
    reset,
  }
}

export function readCompanionResources(raw: unknown): CompanionResource[] {
  if (!Array.isArray(raw)) return []
  const out: CompanionResource[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || typeof row.name !== 'string') continue
    out.push(
      clampCompanionResource({
        id: row.id,
        name: row.name,
        max: typeof row.max === 'number' ? row.max : 0,
        used: typeof row.used === 'number' ? row.used : 0,
        reset:
          row.reset === 'short' || row.reset === 'long' || row.reset === 'manual'
            ? row.reset
            : 'long',
      }),
    )
  }
  return out
}

/** Merge template resource defs: keep used for same id, refresh max/name/reset. */
export function mergeCompanionResources(
  previous: CompanionResource[],
  next: CompanionResource[],
): CompanionResource[] {
  if (next.length === 0) return previous
  return next.map((tmpl) => {
    const prev = previous.find((row) => row.id === tmpl.id)
    return clampCompanionResource({
      ...tmpl,
      used: prev ? prev.used : tmpl.used,
    })
  })
}

export function resetCompanionResourcesOnRest(
  companions: CompanionEntry[],
  kind: 'short' | 'long',
): CompanionEntry[] {
  return companions.map((row) => ({
    ...row,
    resources: row.resources.map((raw) => {
      const resource = clampCompanionResource(raw)
      if (resource.reset === 'manual') return resource
      if (kind === 'short' && resource.reset !== 'short') return resource
      return { ...resource, used: 0 }
    }),
  }))
}

/** Mark one companion as primary; clears others. */
export function setPrimaryCompanion(
  companions: CompanionEntry[],
  id: string | null,
): CompanionEntry[] {
  return companions.map((row) => ({
    ...row,
    is_primary: id != null && row.id === id,
  }))
}

export function createCompanion(partial?: Partial<CompanionEntry>): CompanionEntry {
  const kind = partial?.kind ?? 'other'
  const nature = partial?.nature ?? defaultNatureForKind(kind)
  const control = partial?.control ?? defaultControlForKind(kind)
  const source =
    partial?.source === undefined
      ? ({ kind: 'manual', labelRu: 'Вручную' } satisfies CompanionSource)
      : partial.source
  return {
    id:
      partial?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `companion-${Date.now()}`),
    kind,
    name: partial?.name ?? '',
    bestiary_ref: partial?.bestiary_ref ?? null,
    bestiary_name_ru: partial?.bestiary_name_ru ?? null,
    avatar_url: partial?.avatar_url ?? null,
    nature,
    active: partial?.active ?? true,
    is_primary: partial?.is_primary ?? false,
    control,
    source,
    stats: {
      hp: partial?.stats?.hp ?? null,
      hp_max: partial?.stats?.hp_max ?? null,
      ac: partial?.stats?.ac ?? null,
      speed: partial?.stats?.speed ?? null,
    },
    death: partial?.death ?? null,
    resources: (partial?.resources ?? []).map(clampCompanionResource),
    actions: partial?.actions ?? '',
    notes: partial?.notes ?? '',
  }
}

function readSource(raw: unknown): CompanionSource | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const legacySubclass =
    typeof row.classEntryId === 'string' && typeof row.subclassSlug === 'string'
  const kindRaw = row.kind
  const kind: CompanionSourceKind =
    typeof kindRaw === 'string' && SOURCE_KIND_SET.has(kindRaw)
      ? (kindRaw as CompanionSourceKind)
      : legacySubclass
        ? 'subclass'
        : 'other'
  const labelRu =
    typeof row.labelRu === 'string'
      ? row.labelRu
      : kind === 'subclass' && typeof row.subclassSlug === 'string'
        ? `Архетип: ${row.subclassSlug}`
        : kind === 'manual'
          ? 'Вручную'
          : ''
  const source: CompanionSource = { kind, labelRu }
  if (typeof row.classEntryId === 'string') source.classEntryId = row.classEntryId
  if (typeof row.subclassSlug === 'string') source.subclassSlug = row.subclassSlug
  if (typeof row.feature === 'string') source.feature = row.feature
  if (typeof row.spellId === 'string') source.spellId = row.spellId
  return source
}

function readDeath(raw: unknown): CompanionDeathState | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  return {
    successes: clampDeathMarks(
      typeof row.successes === 'number' ? row.successes : 0,
    ),
    failures: clampDeathMarks(typeof row.failures === 'number' ? row.failures : 0),
  }
}

export function readCompanions(raw: unknown): CompanionEntry[] {
  if (!Array.isArray(raw)) return []
  const result: CompanionEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string') continue
    const kind: CompanionKind =
      typeof row.kind === 'string' && KIND_SET.has(row.kind)
        ? (row.kind as CompanionKind)
        : 'other'
    const statsRaw =
      row.stats && typeof row.stats === 'object'
        ? (row.stats as Record<string, unknown>)
        : {}
    const nature: CompanionNature =
      typeof row.nature === 'string' && NATURE_SET.has(row.nature)
        ? (row.nature as CompanionNature)
        : defaultNatureForKind(kind)
    const control: CompanionControlMode =
      typeof row.control === 'string' && CONTROL_SET.has(row.control)
        ? (row.control as CompanionControlMode)
        : defaultControlForKind(kind)
    const bestiaryRef =
      typeof row.bestiary_ref === 'string'
        ? row.bestiary_ref
        : typeof row.catalog_ref === 'string'
          ? row.catalog_ref
          : null
    result.push({
      id: row.id,
      kind,
      name: typeof row.name === 'string' ? row.name : '',
      bestiary_ref: bestiaryRef,
      bestiary_name_ru:
        typeof row.bestiary_name_ru === 'string' ? row.bestiary_name_ru : null,
      avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
      nature,
      active: typeof row.active === 'boolean' ? row.active : true,
      is_primary: typeof row.is_primary === 'boolean' ? row.is_primary : false,
      control,
      source: readSource(row.source),
      stats: {
        hp: typeof statsRaw.hp === 'number' ? statsRaw.hp : null,
        hp_max: typeof statsRaw.hp_max === 'number' ? statsRaw.hp_max : null,
        ac: typeof statsRaw.ac === 'number' ? statsRaw.ac : null,
        speed: typeof statsRaw.speed === 'number' ? statsRaw.speed : null,
      },
      death: readDeath(row.death),
      resources: readCompanionResources(row.resources),
      actions: typeof row.actions === 'string' ? row.actions : '',
      notes: typeof row.notes === 'string' ? row.notes : '',
    })
  }
  return result
}

/** Drop companions tied to a class entry / subclass. Manual and other sources stay. */
export function revokeCompanionsForSubclass(
  companions: CompanionEntry[],
  classEntryId: string,
  subclassSlug?: string,
): CompanionEntry[] {
  return companions.filter((row) => {
    if (!row.source) return true
    if (row.source.kind === 'manual') return true
    if (row.source.classEntryId !== classEntryId) return true
    if (subclassSlug && row.source.subclassSlug !== subclassSlug) return true
    return false
  })
}

/**
 * When HP hits 0: deactivate; living starts death saves; summoned/construct dismiss.
 * When HP rises above 0: clear death track; re-activate unless already dead.
 */
export function applyHpChange(
  row: CompanionEntry,
  hp: number | null,
): CompanionEntry {
  const next: CompanionEntry = {
    ...row,
    stats: { ...row.stats, hp },
  }
  if (hp == null) return next

  if (hp <= 0) {
    next.active = false
    if (row.nature === 'living') {
      next.death = row.death ?? { successes: 0, failures: 0 }
    } else {
      next.death = null
    }
    return next
  }

  // Healed above 0 — player/DM restored the naparnik; clear death track.
  next.death = null
  next.active = true
  return next
}

export function setCompanionActive(
  row: CompanionEntry,
  active: boolean,
): CompanionEntry {
  if (active && isCompanionDead(row)) return row
  if (active && (row.stats.hp ?? 1) <= 0 && row.nature !== 'living') {
    // Can't activate dismissed summon/construct without HP
    return row
  }
  return { ...row, active }
}

/** Restore a dismissed summon/construct (stand-in for re-summon until cast wiring). */
export function restoreCompanion(row: CompanionEntry): CompanionEntry {
  if (row.nature === 'living') return row
  const hpMax = row.stats.hp_max
  return {
    ...row,
    active: true,
    death: null,
    stats: {
      ...row.stats,
      hp: hpMax != null ? hpMax : row.stats.hp != null && row.stats.hp > 0 ? row.stats.hp : 1,
    },
  }
}

/** Re-apply subclass companions while keeping player name, HP, death, active, notes. */
export function mergeSubclassCompanions(input: {
  previous: CompanionEntry[]
  next: CompanionEntry[]
}): CompanionEntry[] {
  return input.next.map((created) => {
    const feature = created.source?.feature
    const prev = input.previous.find(
      (row) =>
        row.source?.classEntryId === created.source?.classEntryId &&
        row.source?.feature === feature &&
        Boolean(feature),
    )
    if (!prev) return created
    const customName = prev.name.trim()
    return {
      ...created,
      id: prev.id,
      name: customName || created.name,
      bestiary_ref: prev.bestiary_ref ?? created.bestiary_ref,
      bestiary_name_ru: prev.bestiary_name_ru ?? created.bestiary_name_ru,
      avatar_url: prev.avatar_url ?? created.avatar_url,
      nature: prev.nature,
      active: prev.active,
      is_primary: prev.is_primary,
      control: prev.control,
      // Template refresh: hp_max/ac/speed/actions from grant; keep current HP + death.
      stats: {
        hp: prev.stats.hp,
        hp_max: created.stats.hp_max ?? prev.stats.hp_max,
        ac: created.stats.ac ?? prev.stats.ac,
        speed: created.stats.speed ?? prev.stats.speed,
      },
      death: prev.death,
      resources: mergeCompanionResources(prev.resources, created.resources),
      actions: created.actions || prev.actions,
      notes: prev.notes || created.notes,
    }
  })
}
