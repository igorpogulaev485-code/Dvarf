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
  /** Tip Wave A / feature summon (Wildfire Spirit, …) — ally role, not self_form. */
  | 'ally'
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
  | 'feature'
  | 'race'
  | 'spell'
  | 'item'
  | 'other'

export type CompanionControlMode =
  | 'own_initiative'
  | 'bonus_action_command'
  | 'reaction'
  | 'with_master'
  | 'other'

/** C-02 Н5: whose initiative (replaces mixed `control`). */
export type CompanionInitiativeMode = 'with_master' | 'own_initiative'

/** C-02 Н5: host command cost. */
export type CompanionCommandCost = 'none' | 'action' | 'bonus' | 'reaction'

/** Per-companion turn marks (Н11) — not the host turnEconomy. */
export type CompanionTurnMarks = {
  action: boolean
  bonus: boolean
  reaction: boolean
  commanded: boolean
  dodge: boolean
}

/** C-03: identical creatures as one card «Волк ×8» (like enemy packs S-02). */
export type CompanionPackState = {
  member_count: number
  alive_count: number
  /** Per-member current HP (length tracks living; drops when a member dies). */
  member_hp: number[]
  /** Base name without ×N, e.g. «Волк». */
  unit_name_ru: string
  /** Max HP of one member (for dots / revive). */
  unit_hp_max: number
}

/** C-03: spirit type for Find Steed / Greater Steed. */
export type SteedSpiritType = 'celestial' | 'fey' | 'fiend'

/** C-03: undead control mark (soft 24h — no hard realtime timer). */
export type UndeadControlState = {
  /** Human label, e.g. «контроль 24 часа». */
  labelRu: string
  /** False when host/master revoked control. */
  controlled: boolean
}

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
  /**
   * Legacy single field (pre-C-02). Prefer initiativeMode + commandCost.
   * Kept for old cards / notes; migrated on read.
   */
  control: CompanionControlMode
  /** C-02: acts on host turn vs own initiative row. */
  initiativeMode: CompanionInitiativeMode
  /** C-02: what the host spends to command. */
  commandCost: CompanionCommandCost
  /**
   * C-02 Н12: master-added story companion (bestiary/wiki) — death saves at 0.
   */
  story: boolean
  /** C-02 Н11: own action / bonus / reaction + dodge / commanded. */
  turnMarks: CompanionTurnMarks
  source: CompanionSource | null
  /** Set when role === self_form. */
  form: ActiveFormMeta | null
  stats: {
    hp: number | null
    hp_max: number | null
    ac: number | null
    speed: number | null
    /** Extra movement kept beside the editable walk speed (elemental fly 90, …). */
    speed_fly?: number | null
    speed_swim?: number | null
    speed_climb?: number | null
    /** Beast / elemental physical scores. Mental scores stay on the host. */
    str?: number | null
    dex?: number | null
    con?: number | null
    /** C-03: steed INT floor / Tasha homunculus mental scores. */
    int?: number | null
    wis?: number | null
    cha?: number | null
    resistances?: string | null
    immunities?: string | null
  }
  death: CompanionDeathState | null
  resources: CompanionResource[]
  actions: string
  notes: string
  /** C-03 pack of identical creatures. */
  pack: CompanionPackState | null
  /** C-03: host is mounted on this steed. */
  mounted: boolean
  /** C-03 Find Steed spirit type. */
  steed_spirit_type: SteedSpiritType | null
  /** C-03 Animate Dead / Create Undead control. */
  undead_control: UndeadControlState | null
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
  ally: 'Напарник',
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
  'ally',
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
  'feature',
  'race',
  'spell',
  'item',
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
  if (
    kind === 'familiar' ||
    kind === 'transformed_self' ||
    kind === 'ally'
  ) {
    return 'summoned'
  }
  return 'living'
}

export function defaultControlForKind(kind: CompanionKind): CompanionControlMode {
  const modes = defaultCombatModesForKind(kind)
  if (kind === 'transformed_self') return 'with_master'
  if (modes.initiativeMode === 'own_initiative') return 'own_initiative'
  if (modes.commandCost === 'bonus') return 'bonus_action_command'
  if (modes.commandCost === 'reaction') return 'reaction'
  return 'with_master'
}

const TASHA_SUMMON_FEATURES = new Set([
  'spell:summon_aberration',
  'spell:summon_beast',
  'spell:summon_celestial',
  'spell:summon_construct',
  'spell:summon_draconic_spirit',
  'spell:summon_elemental',
  'spell:summon_fey',
  'spell:summon_fiend',
  'spell:summon_shadowspawn',
  'spell:summon_undead',
  'summon_aberration',
  'summon_beast',
  'summon_celestial',
  'summon_construct',
  'summon_draconic_spirit',
  'summon_elemental',
  'summon_fey',
  'summon_fiend',
  'summon_shadowspawn',
  'summon_undead',
])

const CONJURE_OWN_FEATURES = new Set([
  'spell:conjure_animals',
  'spell:conjure_celestial',
  'spell:conjure_elemental',
  'spell:conjure_fey',
  'spell:conjure_minor_elementals',
  'spell:conjure_woodland_beings',
  'spell:find_familiar',
  'conjure_animals',
  'conjure_celestial',
  'conjure_elemental',
  'conjure_fey',
  'conjure_minor_elementals',
  'conjure_woodland_beings',
  'find_familiar',
])

const ANIMATE_DEAD_FEATURES = new Set([
  'spell:animate_dead',
  'spell:create_undead',
  'animate_dead',
  'create_undead',
])

const STEED_FEATURES = new Set([
  'spell:find_steed',
  'spell:find_greater_steed',
  'find_steed',
  'find_greater_steed',
])

const HOMUNCULUS_FEATURES = new Set([
  'homunculus_servant',
  'infusion:homunculus_servant',
])

/** C-03: Find Steed / Greater Steed share one permanent slot. */
export function isSteedCompanion(row: {
  source?: CompanionSource | null
  steed_spirit_type?: SteedSpiritType | null
}): boolean {
  const feature = (row.source?.feature ?? '').trim().toLowerCase()
  if (STEED_FEATURES.has(feature)) return true
  return row.steed_spirit_type != null
}

/** C-03: Homunculus Servant infusion card. */
export function isHomunculusCompanion(row: {
  source?: CompanionSource | null
}): boolean {
  const feature = (row.source?.feature ?? '').trim().toLowerCase()
  return HOMUNCULUS_FEATURES.has(feature)
}

export function isAnimateDeadFeature(feature: string | null | undefined): boolean {
  return ANIMATE_DEAD_FEATURES.has((feature ?? '').trim().toLowerCase())
}

/** C-02 Н5 table defaults by kind (without spell feature). */
export function defaultCombatModesForKind(kind: CompanionKind): {
  initiativeMode: CompanionInitiativeMode
  commandCost: CompanionCommandCost
} {
  switch (kind) {
    case 'beast_companion':
      return { initiativeMode: 'with_master', commandCost: 'action' }
    case 'primal_companion':
    case 'steel_defender':
    case 'eldritch_cannon':
    case 'drake':
    case 'ally':
      return { initiativeMode: 'with_master', commandCost: 'bonus' }
    case 'familiar':
      return { initiativeMode: 'own_initiative', commandCost: 'none' }
    case 'transformed_self':
      return { initiativeMode: 'with_master', commandCost: 'none' }
    default:
      return { initiativeMode: 'own_initiative', commandCost: 'none' }
  }
}

/** C-02 Н5: kind + spell source + story flag. */
export function defaultCombatModesForCompanion(input: {
  kind: CompanionKind
  source?: CompanionSource | null
  story?: boolean
}): { initiativeMode: CompanionInitiativeMode; commandCost: CompanionCommandCost } {
  const feature = (input.source?.feature ?? '').trim().toLowerCase()
  if (input.story) {
    return { initiativeMode: 'own_initiative', commandCost: 'none' }
  }
  if (ANIMATE_DEAD_FEATURES.has(feature)) {
    return { initiativeMode: 'own_initiative', commandCost: 'bonus' }
  }
  if (STEED_FEATURES.has(feature) || HOMUNCULUS_FEATURES.has(feature)) {
    // C-03: steed always host turn; homunculus like steel defender.
    return { initiativeMode: 'with_master', commandCost: 'bonus' }
  }
  if (TASHA_SUMMON_FEATURES.has(feature) || feature.startsWith('spell:summon_')) {
    return { initiativeMode: 'with_master', commandCost: 'none' }
  }
  if (CONJURE_OWN_FEATURES.has(feature) || feature.startsWith('spell:conjure_')) {
    return { initiativeMode: 'own_initiative', commandCost: 'none' }
  }
  return defaultCombatModesForKind(input.kind)
}

export function mapLegacyControlToCombatModes(
  control: CompanionControlMode,
): { initiativeMode: CompanionInitiativeMode; commandCost: CompanionCommandCost } {
  switch (control) {
    case 'bonus_action_command':
      return { initiativeMode: 'with_master', commandCost: 'bonus' }
    case 'reaction':
      return { initiativeMode: 'with_master', commandCost: 'reaction' }
    case 'with_master':
      return { initiativeMode: 'with_master', commandCost: 'none' }
    case 'own_initiative':
      return { initiativeMode: 'own_initiative', commandCost: 'none' }
    case 'other':
    default:
      return { initiativeMode: 'own_initiative', commandCost: 'none' }
  }
}

/**
 * In-memory migration on read (C-02):
 * - explicit `control: other` → do not apply kind defaults;
 * - known kinds / sources → table defaults (fixes beast / familiar / spirit);
 * - else map old control.
 */
export function resolveCombatModesOnRead(input: {
  kind: CompanionKind
  control: CompanionControlMode
  source: CompanionSource | null
  story?: boolean
  initiativeMode?: CompanionInitiativeMode | null
  commandCost?: CompanionCommandCost | null
}): { initiativeMode: CompanionInitiativeMode; commandCost: CompanionCommandCost } {
  if (input.initiativeMode && input.commandCost) {
    return {
      initiativeMode: input.initiativeMode,
      commandCost: input.commandCost,
    }
  }
  if (input.control === 'other') {
    return mapLegacyControlToCombatModes('other')
  }
  const known =
    input.kind === 'beast_companion' ||
    input.kind === 'primal_companion' ||
    input.kind === 'steel_defender' ||
    input.kind === 'eldritch_cannon' ||
    input.kind === 'drake' ||
    input.kind === 'familiar' ||
    input.kind === 'ally' ||
    Boolean(input.source?.feature) ||
    Boolean(input.story)
  if (known) {
    return defaultCombatModesForCompanion({
      kind: input.kind,
      source: input.source,
      story: input.story,
    })
  }
  return mapLegacyControlToCombatModes(input.control)
}

export function deriveLegacyControl(input: {
  initiativeMode: CompanionInitiativeMode
  commandCost: CompanionCommandCost
  previousControl?: CompanionControlMode
}): CompanionControlMode {
  if (input.previousControl === 'other') return 'other'
  if (input.initiativeMode === 'own_initiative') return 'own_initiative'
  if (input.commandCost === 'bonus') return 'bonus_action_command'
  if (input.commandCost === 'reaction') return 'reaction'
  if (input.commandCost === 'action') return 'bonus_action_command'
  return 'with_master'
}

export function emptyCompanionTurnMarks(): CompanionTurnMarks {
  return {
    action: false,
    bonus: false,
    reaction: false,
    commanded: false,
    dodge: false,
  }
}

export function readCompanionTurnMarks(raw: unknown): CompanionTurnMarks {
  if (!raw || typeof raw !== 'object') return emptyCompanionTurnMarks()
  const row = raw as Record<string, unknown>
  return {
    action: Boolean(row.action),
    bonus: Boolean(row.bonus),
    reaction: Boolean(row.reaction),
    commanded: Boolean(row.commanded),
    dodge: Boolean(row.dodge),
  }
}

const INITIATIVE_SET = new Set<string>(['with_master', 'own_initiative'])
const COMMAND_COST_SET = new Set<string>(['none', 'action', 'bonus', 'reaction'])

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

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function optionalCompanionStats(
  stats: Partial<CompanionEntry['stats']> | null | undefined,
): Partial<CompanionEntry['stats']> {
  if (!stats) return {}
  const out: Partial<CompanionEntry['stats']> = {}
  const fly = optionalNumber(stats.speed_fly)
  const swim = optionalNumber(stats.speed_swim)
  const climb = optionalNumber(stats.speed_climb)
  const str = optionalNumber(stats.str)
  const dex = optionalNumber(stats.dex)
  const con = optionalNumber(stats.con)
  const intScore = optionalNumber(stats.int)
  const wis = optionalNumber(stats.wis)
  const cha = optionalNumber(stats.cha)
  if (fly != null) out.speed_fly = fly
  if (swim != null) out.speed_swim = swim
  if (climb != null) out.speed_climb = climb
  if (str != null) out.str = str
  if (dex != null) out.dex = dex
  if (con != null) out.con = con
  if (intScore != null) out.int = intScore
  if (wis != null) out.wis = wis
  if (cha != null) out.cha = cha
  if (typeof stats.resistances === 'string' && stats.resistances.trim()) {
    out.resistances = stats.resistances.trim()
  }
  if (typeof stats.immunities === 'string' && stats.immunities.trim()) {
    out.immunities = stats.immunities.trim()
  }
  return out
}

export function emptyCompanionPack(): CompanionPackState | null {
  return null
}

export function readCompanionPack(raw: unknown): CompanionPackState | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const member_count = Math.max(
    0,
    Math.floor(typeof row.member_count === 'number' ? row.member_count : 0),
  )
  const alive_count = Math.max(
    0,
    Math.min(
      member_count,
      Math.floor(typeof row.alive_count === 'number' ? row.alive_count : 0),
    ),
  )
  const unit_hp_max = Math.max(
    1,
    Math.floor(typeof row.unit_hp_max === 'number' ? row.unit_hp_max : 1),
  )
  const unit_name_ru =
    typeof row.unit_name_ru === 'string' && row.unit_name_ru.trim()
      ? row.unit_name_ru.trim()
      : 'Существо'
  const member_hp = Array.isArray(row.member_hp)
    ? row.member_hp
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
        .map((v) => Math.max(0, Math.floor(v)))
        .slice(0, alive_count)
    : Array.from({ length: alive_count }, () => unit_hp_max)
  if (member_count <= 0) return null
  return { member_count, alive_count, member_hp, unit_name_ru, unit_hp_max }
}

export function packDisplayName(unitNameRu: string, aliveCount: number): string {
  const base = unitNameRu.trim() || 'Существо'
  return `${base} ×${Math.max(0, Math.floor(aliveCount))}`
}

export function readSteedSpiritType(raw: unknown): SteedSpiritType | null {
  if (raw === 'celestial' || raw === 'fey' || raw === 'fiend') return raw
  return null
}

export function readUndeadControl(raw: unknown): UndeadControlState | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const labelRu =
    typeof row.labelRu === 'string' && row.labelRu.trim()
      ? row.labelRu.trim()
      : 'контроль 24 часа'
  return {
    labelRu,
    controlled: row.controlled !== false,
  }
}

/** Walk plus fly / swim / climb, for the companion card. */
export function companionMovementLine(
  stats: Pick<
    CompanionEntry['stats'],
    'speed' | 'speed_fly' | 'speed_swim' | 'speed_climb'
  >,
): string {
  const parts: string[] = []
  if (typeof stats.speed === 'number') parts.push(`пешком ${stats.speed}`)
  if (typeof stats.speed_fly === 'number' && stats.speed_fly > 0) {
    parts.push(`полёт ${stats.speed_fly}`)
  }
  if (typeof stats.speed_swim === 'number' && stats.speed_swim > 0) {
    parts.push(`плавание ${stats.speed_swim}`)
  }
  if (typeof stats.speed_climb === 'number' && stats.speed_climb > 0) {
    parts.push(`лазание ${stats.speed_climb}`)
  }
  return parts.join(', ')
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
    case 'feature':
      return 'Умение'
    case 'race':
      return 'Раса'
    case 'item':
      return 'Предмет'
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
  const story = Boolean(partial?.story)
  const source =
    partial?.source === undefined
      ? ({ kind: 'manual', labelRu: 'Вручную' } satisfies CompanionSource)
      : partial.source
  const modes =
    partial?.initiativeMode && partial?.commandCost
      ? {
          initiativeMode: partial.initiativeMode,
          commandCost: partial.commandCost,
        }
      : role === 'self_form'
        ? {
            initiativeMode: 'with_master' as const,
            commandCost: 'none' as const,
          }
        : defaultCombatModesForCompanion({ kind, source, story })
  const control =
    partial?.control ??
    deriveLegacyControl({
      initiativeMode: modes.initiativeMode,
      commandCost: modes.commandCost,
    })
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
    initiativeMode: modes.initiativeMode,
    commandCost: modes.commandCost,
    story,
    turnMarks: partial?.turnMarks
      ? readCompanionTurnMarks(partial.turnMarks)
      : emptyCompanionTurnMarks(),
    source,
    form,
    stats: {
      hp: partial?.stats?.hp ?? null,
      hp_max: partial?.stats?.hp_max ?? null,
      ac: partial?.stats?.ac ?? null,
      speed: partial?.stats?.speed ?? null,
      ...optionalCompanionStats(partial?.stats),
    },
    death: partial?.death ?? null,
    resources: (partial?.resources ?? []).map(clampCompanionResource),
    actions: partial?.actions ?? '',
    notes: partial?.notes ?? '',
    pack: partial?.pack === undefined ? null : partial.pack,
    mounted: Boolean(partial?.mounted),
    steed_spirit_type: partial?.steed_spirit_type ?? null,
    undead_control: partial?.undead_control ?? null,
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

function legacyAttackLine(row: Record<string, unknown>): string {
  if (typeof row.attack_damage !== 'string' || !row.attack_damage.trim()) return ''
  const bonus = typeof row.attack_bonus === 'number' ? row.attack_bonus : 0
  const type = typeof row.attack_damage_type === 'string' ? row.attack_damage_type : ''
  return `${bonus >= 0 ? '+' : ''}${bonus} ${row.attack_damage} ${type}`.trim()
}

export function readCompanions(raw: unknown): CompanionEntry[] {
  if (!Array.isArray(raw)) return []
  const result: CompanionEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string') continue
    const legacyHp =
      typeof row.hp_max === 'number'
        ? row.hp_max
        : typeof row.hp_current === 'number'
          ? row.hp_current
          : null
    const legacySummon = legacyHp != null || typeof row.ac === 'number' || typeof row.attack_damage === 'string'
    const kind: CompanionKind =
      typeof row.kind === 'string' && KIND_SET.has(row.kind)
        ? (row.kind as CompanionKind)
        : legacySummon
          ? 'ally'
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
    const source =
      readSource(row.source) ??
      (typeof row.source_item_id === 'string'
        ? {
            kind: 'item' as const,
            labelRu:
              typeof row.source_name === 'string' && row.source_name.trim()
                ? row.source_name
                : 'Из предмета',
          }
        : null)
    const story = Boolean(row.story)
    const rawInit =
      typeof row.initiativeMode === 'string' && INITIATIVE_SET.has(row.initiativeMode)
        ? (row.initiativeMode as CompanionInitiativeMode)
        : null
    const rawCost =
      typeof row.commandCost === 'string' && COMMAND_COST_SET.has(row.commandCost)
        ? (row.commandCost as CompanionCommandCost)
        : null
    const modes =
      role === 'self_form'
        ? {
            initiativeMode: 'with_master' as const,
            commandCost: 'none' as const,
          }
        : resolveCombatModesOnRead({
            kind,
            control,
            source,
            story,
            initiativeMode: rawInit,
            commandCost: rawCost,
          })
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
      initiativeMode: modes.initiativeMode,
      commandCost: modes.commandCost,
      story,
      turnMarks: readCompanionTurnMarks(row.turnMarks),
      source,
      form,
      stats: {
        hp:
          typeof statsRaw.hp === 'number'
            ? statsRaw.hp
            : typeof row.hp_current === 'number'
              ? row.hp_current
              : legacyHp,
        hp_max: typeof statsRaw.hp_max === 'number' ? statsRaw.hp_max : legacyHp,
        ac:
          typeof statsRaw.ac === 'number'
            ? statsRaw.ac
            : typeof row.ac === 'number'
              ? row.ac
              : null,
        speed: typeof statsRaw.speed === 'number' ? statsRaw.speed : null,
        ...optionalCompanionStats(statsRaw as CompanionEntry['stats']),
      },
      death: role === 'self_form' ? null : readDeath(row.death),
      resources: readCompanionResources(row.resources),
      actions:
        typeof row.actions === 'string' && row.actions.trim()
          ? row.actions
          : legacyAttackLine(row),
      notes:
        typeof row.notes === 'string' && row.notes.trim()
          ? row.notes
          : typeof row.duration === 'string'
            ? row.duration
            : '',
      pack: readCompanionPack(row.pack),
      mounted: Boolean(row.mounted),
      steed_spirit_type: readSteedSpiritType(row.steed_spirit_type),
      undead_control: readUndeadControl(row.undead_control),
    })
  }
  return normalizeSelfForms(result)
}

/**
 * Subclass choices that are a real naparnik (PHB / XGE / TCE / ERftLW).
 * Totem spirit and drake essence are not in this set.
 */
const REAL_SUBCLASS_COMPANION_FEATURES = new Set([
  'eldritch_cannon',
  'steel_defender_name',
  'wildfire_spirit',
  // Wild Shape summon path writes this feature id — keep the card.
  'summon_wildfire_spirit',
  'rangers_companion',
  'drake_companion',
])

function heuristicCompanionFeature(feature: string): boolean {
  const id = feature.toLowerCase()
  return (
    id.includes('companion') ||
    id.includes('defender') ||
    id.includes('drake') ||
    id.includes('cannon') ||
    id.includes('spirit')
  )
}

/**
 * Drop naparniki created by the old id-substring heuristic (totem, drake essence).
 * Manual cards, spell summons, and real companion choices stay.
 */
export function revokeFalseSubclassCompanions(
  companions: CompanionEntry[],
): CompanionEntry[] {
  const next = companions.filter((row) => {
    const source = row.source
    if (!source || source.kind !== 'subclass') return true
    const feature = source.feature?.trim() ?? ''
    if (!feature) return true
    if (REAL_SUBCLASS_COMPANION_FEATURES.has(feature)) return true
    if (!heuristicCompanionFeature(feature)) return true
    return false
  })
  return next.length === companions.length ? companions : next
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

/**
 * Restore a dismissed summon/construct / fallen permanent slot
 * (stand-in for re-summon / repair until cast wiring).
 * Living story companions use heal + death clear instead when appropriate.
 */
export function restoreCompanion(row: CompanionEntry): CompanionEntry {
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
      initiativeMode: prev.initiativeMode ?? created.initiativeMode,
      commandCost: prev.commandCost ?? created.commandCost,
      story: prev.story ?? created.story,
      turnMarks: prev.turnMarks ?? created.turnMarks,
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

/** Stable id for a feature-summoned ally/companion (replace on re-summon). Tip kit. */
export function featureSummonId(classEntryId: string, featureId: string): string {
  return `feature-summon:${classEntryId}:${featureId}`
}

export function isFeatureSummonId(id: string): boolean {
  return id.startsWith('feature-summon:')
}

export type FeatureSummonApply = {
  kind: CompanionKind
  nameRu: string
  replaceExisting?: boolean
  notesRu?: string | null
  actionsRu?: string | null
  ac?: number | null
  speed?: number | null
  hpBase?: number | null
  hpPerLevel?: number | null
}

/**
 * Upsert a feature-summoned ally onto the sheet list.
 * Tip ClassFeaturesPanel calls this on spend when `feature.summon` is set
 * (Wildfire Spirit, Drake, …). Kept compatible with rich naparniki model.
 * Stats/actions come from the feature summon block (prefilled from Tasha/bestiary data).
 */
export function applyFeatureSummon(input: {
  companions: CompanionEntry[]
  classEntryId: string
  subclassSlug: string
  featureId: string
  classLevel: number
  summon: FeatureSummonApply
}): CompanionEntry[] {
  const id = featureSummonId(input.classEntryId, input.featureId)
  const hp =
    input.summon.hpBase != null
      ? Math.max(
          1,
          Math.floor(input.summon.hpBase) +
            Math.floor(input.summon.hpPerLevel ?? 0) *
              Math.max(1, Math.floor(input.classLevel)),
        )
      : null
  const kind = input.summon.kind
  const next = createCompanion({
    id,
    kind,
    role: 'ally',
    nature: defaultNatureForKind(kind),
    name: input.summon.nameRu,
    notes: input.summon.notesRu ?? '',
    actions: input.summon.actionsRu?.trim() || '',
    bestiary_ref:
      input.featureId === 'summon_wildfire_spirit' ? 'wildfire_spirit' : null,
    bestiary_name_ru:
      input.featureId === 'summon_wildfire_spirit' ? input.summon.nameRu : null,
    source: {
      kind: 'feature',
      labelRu: input.summon.nameRu,
      classEntryId: input.classEntryId,
      subclassSlug: input.subclassSlug,
      feature: input.featureId,
    },
    stats: {
      hp,
      hp_max: hp,
      ac: input.summon.ac ?? null,
      speed: input.summon.speed ?? null,
    },
  })
  const without = input.companions.filter((row) => row.id !== id)
  return [...without, next]
}
