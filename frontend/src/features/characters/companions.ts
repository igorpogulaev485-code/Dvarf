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
  | 'transformed_self'
  | 'other'

/** Ally = separate creature; self_form = player's body in another stat block. */
export type CompanionRole = 'ally' | 'self_form'

export type FormSourceKind =
  | 'wild_shape'
  | 'elemental_wild_shape'
  | 'spell'
  | 'item'
  | 'feature'
  | 'other'

/** Metadata when role === self_form (Wild Shape, Polymorph self, …). */
export type ActiveFormMeta = {
  form_source: FormSourceKind
  form_source_ref: string
  host_hp_at_enter: number | null
  host_hp_max_at_enter: number | null
  duration_minutes: number | null
  entered_at: string | null
  known_form_id?: string
  /** Ally that was primary before this form — restored on dismiss. */
  previous_primary_id?: string | null
}

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
  /** Default ally for legacy rows without role. */
  role: CompanionRole
  name: string
  /** Catalog entry id from kind=bestiary. */
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
  /** Set when role === self_form. */
  form: ActiveFormMeta | null
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
  if (row.role === 'self_form' || row.kind === 'transformed_self') return true
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
  transformed_self: 'Облик',
  other: 'Напарник',
}

export const COMPANION_ROLE_LABELS: Record<CompanionRole, string> = {
  ally: 'Напарник',
  self_form: 'Облик (это ты)',
}

export function formSourceBadgeRu(form: ActiveFormMeta | null | undefined): string {
  if (!form) return 'Облик'
  switch (form.form_source) {
    case 'wild_shape':
      return 'Это ты · Дикий облик'
    case 'elemental_wild_shape':
      return 'Это ты · Элементальный облик'
    case 'spell':
      return 'Это ты · Заклинание'
    case 'item':
      return 'Это ты · Предмет'
    case 'feature':
      return 'Это ты · Умение'
    default:
      return 'Это ты · Облик'
  }
}

const FORM_SOURCE_SET = new Set<string>([
  'wild_shape',
  'elemental_wild_shape',
  'spell',
  'item',
  'feature',
  'other',
])

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
  'transformed_self',
  'other',
])

const ROLE_SET = new Set<string>(['ally', 'self_form'])

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
  if (kind === 'familiar' || kind === 'transformed_self') return 'summoned'
  return 'living'
}

export function defaultControlForKind(kind: CompanionKind): CompanionControlMode {
  if (kind === 'transformed_self') return 'with_master'
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

export function defaultRoleForKind(kind: CompanionKind): CompanionRole {
  return kind === 'transformed_self' ? 'self_form' : 'ally'
}

function readFormMeta(raw: unknown): ActiveFormMeta | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const form_source =
    typeof row.form_source === 'string' && FORM_SOURCE_SET.has(row.form_source)
      ? (row.form_source as FormSourceKind)
      : 'other'
  return {
    form_source,
    form_source_ref:
      typeof row.form_source_ref === 'string' ? row.form_source_ref : '',
    host_hp_at_enter:
      typeof row.host_hp_at_enter === 'number' ? row.host_hp_at_enter : null,
    host_hp_max_at_enter:
      typeof row.host_hp_max_at_enter === 'number'
        ? row.host_hp_max_at_enter
        : null,
    duration_minutes:
      typeof row.duration_minutes === 'number' ? row.duration_minutes : null,
    entered_at: typeof row.entered_at === 'string' ? row.entered_at : null,
    known_form_id:
      typeof row.known_form_id === 'string' ? row.known_form_id : undefined,
    previous_primary_id:
      typeof row.previous_primary_id === 'string'
        ? row.previous_primary_id
        : row.previous_primary_id === null
          ? null
          : undefined,
  }
}

/** At most one active self_form; extras deactivated (keep newest active). */
export function normalizeSelfForms(companions: CompanionEntry[]): CompanionEntry[] {
  let seenActive = false
  const out: CompanionEntry[] = []
  for (let i = companions.length - 1; i >= 0; i -= 1) {
    const row = companions[i]!
    if (row.role !== 'self_form') {
      out.push(row)
      continue
    }
    if (row.active && seenActive) {
      out.push({ ...row, active: false, is_primary: false })
      continue
    }
    if (row.active) seenActive = true
    out.push(row)
  }
  return out.reverse()
}

export function getActiveSelfForm(
  companions: CompanionEntry[],
): CompanionEntry | null {
  return (
    companions.find((row) => row.role === 'self_form' && row.active) ?? null
  )
}

export function isSelfForm(row: CompanionEntry): boolean {
  return row.role === 'self_form' || row.kind === 'transformed_self'
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
  const role = partial?.role ?? defaultRoleForKind(kind)
  const nature =
    partial?.nature ??
    (role === 'self_form' ? 'summoned' : defaultNatureForKind(kind))
  const control =
    partial?.control ??
    (role === 'self_form' ? 'with_master' : defaultControlForKind(kind))
  const source =
    partial?.source === undefined
      ? ({ kind: 'manual', labelRu: 'Вручную' } satisfies CompanionSource)
      : partial.source
  const form =
    role === 'self_form'
      ? (partial?.form ?? {
          form_source: 'other',
          form_source_ref: '',
          host_hp_at_enter: null,
          host_hp_max_at_enter: null,
          duration_minutes: null,
          entered_at: null,
        })
      : (partial?.form ?? null)
  return {
    id:
      partial?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `companion-${Date.now()}`),
    kind: role === 'self_form' && kind === 'other' ? 'transformed_self' : kind,
    role,
    name: partial?.name ?? '',
    bestiary_ref: partial?.bestiary_ref ?? null,
    bestiary_name_ru: partial?.bestiary_name_ru ?? null,
    avatar_url: partial?.avatar_url ?? null,
    nature,
    active: partial?.active ?? true,
    is_primary: partial?.is_primary ?? false,
    control,
    source,
    form,
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
    const role: CompanionRole =
      typeof row.role === 'string' && ROLE_SET.has(row.role)
        ? (row.role as CompanionRole)
        : defaultRoleForKind(kind)
    const statsRaw =
      row.stats && typeof row.stats === 'object'
        ? (row.stats as Record<string, unknown>)
        : {}
    const nature: CompanionNature =
      typeof row.nature === 'string' && NATURE_SET.has(row.nature)
        ? (row.nature as CompanionNature)
        : role === 'self_form'
          ? 'summoned'
          : defaultNatureForKind(kind)
    const control: CompanionControlMode =
      typeof row.control === 'string' && CONTROL_SET.has(row.control)
        ? (row.control as CompanionControlMode)
        : role === 'self_form'
          ? 'with_master'
          : defaultControlForKind(kind)
    const bestiaryRef =
      typeof row.bestiary_ref === 'string'
        ? row.bestiary_ref
        : typeof row.catalog_ref === 'string'
          ? row.catalog_ref
          : null
    const form =
      role === 'self_form'
        ? (readFormMeta(row.form) ?? {
            form_source: 'other' as FormSourceKind,
            form_source_ref: '',
            host_hp_at_enter: null,
            host_hp_max_at_enter: null,
            duration_minutes: null,
            entered_at: null,
          })
        : readFormMeta(row.form)
    result.push({
      id: row.id,
      kind,
      role,
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
      form,
      stats: {
        hp: typeof statsRaw.hp === 'number' ? statsRaw.hp : null,
        hp_max: typeof statsRaw.hp_max === 'number' ? statsRaw.hp_max : null,
        ac: typeof statsRaw.ac === 'number' ? statsRaw.ac : null,
        speed: typeof statsRaw.speed === 'number' ? statsRaw.speed : null,
      },
      death: role === 'self_form' ? null : readDeath(row.death),
      resources: readCompanionResources(row.resources),
      actions: typeof row.actions === 'string' ? row.actions : '',
      notes: typeof row.notes === 'string' ? row.notes : '',
    })
  }
  return normalizeSelfForms(result)
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
    // self_form / summoned / construct: dismiss, no death saves on the form
    if (row.role === 'self_form' || row.nature !== 'living') {
      next.death = null
    } else {
      next.death = row.death ?? { successes: 0, failures: 0 }
    }
    return next
  }

  // Healed above 0 — player/DM restored the naparnik; clear death track.
  next.death = null
  next.active = true
  return next
}

export type DismissSelfFormResult = {
  companions: CompanionEntry[]
  dismissedName: string | null
  restoredPrimaryId: string | null
}

/**
 * Voluntary / rest / duration end: drop active self_form card(s), no host damage.
 * Restores previous primary ally when recorded.
 */
export function dismissSelfForm(input: {
  companions: CompanionEntry[]
  /** If set, only this id; otherwise all active self_forms. */
  formId?: string
  /** Keep inactive row in list (false = remove card). Default remove. */
  keepRow?: boolean
}): DismissSelfFormResult {
  const keepRow = Boolean(input.keepRow)
  let dismissedName: string | null = null
  let restoredPrimaryId: string | null = null

  const targets = input.companions.filter((row) => {
    if (!isSelfForm(row)) return false
    if (input.formId) return row.id === input.formId
    return row.active
  })
  if (targets.length === 0) {
    return {
      companions: input.companions,
      dismissedName: null,
      restoredPrimaryId: null,
    }
  }

  const primaryCandidate =
    targets.find((t) => t.form?.previous_primary_id)?.form?.previous_primary_id ??
    null
  dismissedName = targets.map((t) => t.name).filter(Boolean).join(', ') || null

  let next = input.companions
    .map((row) => {
      const hit = targets.some((t) => t.id === row.id)
      if (!hit) return row
      if (keepRow) {
        return {
          ...row,
          active: false,
          is_primary: false,
          death: null,
          stats: { ...row.stats, hp: 0 },
        }
      }
      return null
    })
    .filter((row): row is CompanionEntry => row != null)

  if (primaryCandidate && next.some((r) => r.id === primaryCandidate)) {
    next = setPrimaryCompanion(next, primaryCandidate)
    restoredPrimaryId = primaryCandidate
  } else {
    const ally = next.find((r) => r.role === 'ally' && r.active)
    if (ally) {
      next = setPrimaryCompanion(next, ally.id)
      restoredPrimaryId = ally.id
    }
  }

  return { companions: next, dismissedName, restoredPrimaryId }
}

/** Short/long rest: dismiss active forms (no overflow), then reset naparnik resources. */
export function dismissSelfFormsOnRest(
  companions: CompanionEntry[],
  kind: 'short' | 'long',
): { companions: CompanionEntry[]; dismissedNames: string[] } {
  const before = dismissSelfForm({ companions })
  const names = before.dismissedName
    ? before.dismissedName.split(', ').filter(Boolean)
    : []
  return {
    companions: resetCompanionResourcesOnRest(before.companions, kind),
    dismissedNames: names,
  }
}

export type SelfFormDamageResult = {
  companions: CompanionEntry[]
  hostHp: number
  /** Damage that spilled onto the host after form HP reached 0. */
  overflow: number
  formDismissed: boolean
  formName: string | null
}

/**
 * Deal damage to the active self_form HP pool first; remainder hits host.
 * Forms without an HP pool (e.g. Starry Form reminder) pass all damage to host.
 */
export function dealDamageToSelfForm(input: {
  companions: CompanionEntry[]
  damage: number
  hostHp: number
  formId?: string
}): SelfFormDamageResult {
  const damage = Math.max(0, Math.floor(input.damage))
  const hostHp = Math.max(0, Math.floor(input.hostHp))
  if (damage <= 0) {
    return {
      companions: input.companions,
      hostHp,
      overflow: 0,
      formDismissed: false,
      formName: null,
    }
  }

  const form =
    (input.formId
      ? input.companions.find((r) => r.id === input.formId && isSelfForm(r))
      : getActiveSelfForm(input.companions)) ?? null

  if (!form || !form.active) {
    return {
      companions: input.companions,
      hostHp: Math.max(0, hostHp - damage),
      overflow: damage,
      formDismissed: false,
      formName: null,
    }
  }

  // Reminder forms (Starry): no separate HP — all damage to host, form stays.
  if (form.stats.hp == null || form.stats.hp_max == null) {
    return {
      companions: input.companions,
      hostHp: Math.max(0, hostHp - damage),
      overflow: damage,
      formDismissed: false,
      formName: form.name || null,
    }
  }

  const formHp = Math.max(0, form.stats.hp)
  if (damage < formHp) {
    const updated = input.companions.map((row) =>
      row.id === form.id
        ? applyHpChange(row, formHp - damage)
        : row,
    )
    return {
      companions: updated,
      hostHp,
      overflow: 0,
      formDismissed: false,
      formName: form.name || null,
    }
  }

  const overflow = damage - formHp
  const dismissed = dismissSelfForm({
    companions: input.companions,
    formId: form.id,
    keepRow: false,
  })
  return {
    companions: dismissed.companions,
    hostHp: Math.max(0, hostHp - overflow),
    overflow,
    formDismissed: true,
    formName: form.name || null,
  }
}

/** Active self_forms first, then allies — for Напарники panel. */
export function sortCompanionsForDisplay(
  companions: CompanionEntry[],
): CompanionEntry[] {
  return [...companions].sort((a, b) => {
    const aForm = isSelfForm(a) ? 0 : 1
    const bForm = isSelfForm(b) ? 0 : 1
    if (aForm !== bForm) return aForm - bForm
    if (a.active !== b.active) return a.active ? -1 : 1
    return 0
  })
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
      role: prev.role ?? created.role,
      form: prev.form ?? created.form,
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
