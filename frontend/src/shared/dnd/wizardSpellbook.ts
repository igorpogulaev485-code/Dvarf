/**
 * Wizard spellbook rules (PHB 2014) — pure helpers.
 *
 * Covers: free level-up fills, paid foreign copy, own-book backup,
 * lose/destroy + replacement from prepared memory.
 * See docs/wizard-spellbook.md.
 */

/** How a leveled spell entered the wizard's book continuum. */
export type SpellbookAcquisition =
  | 'starting'
  | 'level_up'
  | 'copied'
  | 'restored'
  | 'backup_copy'

/** Tariff for putting a spell into a book. */
export type SpellbookCopyKind =
  /** New spell from scroll / foreign book: 50 gp + 2 h per level. */
  | 'foreign'
  /** Backup from your own notation: 10 gp + 1 h per level. */
  | 'own'
  /** Into a replacement book from currently prepared spells (same as own). */
  | 'memory'

export type SpellbookModifiers = {
  /** School Savant: half gp/time when spell school matches (lowercase en or ru alias). */
  savantSchool?: string | null
  /**
   * Order of Scribes · Wizardly Quill:
   * gold ink free; time = 2 minutes per spell level (not hours).
   */
  wizardlyQuill?: boolean
}

export type SpellbookCopyCost = {
  kind: SpellbookCopyKind
  spellLevel: number
  gp: number
  /** Whole hours (0 when Quill uses minutes only). */
  hours: number
  /** Extra minutes (Quill: 2 × level). */
  minutes: number
  halvedBySavant: boolean
  freeInkByQuill: boolean
}

export type WizardSpellbookState = {
  /** Inventory item id of the active spellbook; null if none / lost. */
  primaryBookItemId: string | null
  /** True after lose/destroy until a replacement book is bound. */
  bookLost: boolean
  /** Catalog/name snapshot of what was in the lost book (DM / recovery UI). */
  lostBookContents?: Array<{
    catalog_id: string | null
    name: string
    level: number
  }>
  /** Inventory ids of backup copies the wizard maintains. */
  backupBookItemIds?: string[]
}

export type WizardSpellAccess = {
  /** Has a usable primary book (not lost, id present). */
  hasBook: boolean
  /** Can change prepared list on a long rest. */
  canPrepare: boolean
  /** Can cast already-prepared leveled spells (and cantrips). */
  canCastPrepared: boolean
  /** Can cast ritual from book without preparing. */
  canRitualFromBook: boolean
  /** Can add free level-up / paid copies into the book. */
  canAddToBook: boolean
}

const FOREIGN_GP_PER_LEVEL = 50
const FOREIGN_HOURS_PER_LEVEL = 2
const OWN_GP_PER_LEVEL = 10
const OWN_HOURS_PER_LEVEL = 1
const QUILL_MINUTES_PER_LEVEL = 2

function clampSpellLevel(level: number): number {
  return Math.min(9, Math.max(1, Math.floor(level) || 1))
}

function clampWizardLevel(level: number): number {
  return Math.min(20, Math.max(1, Math.floor(level) || 1))
}

function normalizeSchool(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** True when Savant school matches the spell's school (en slug or common RU). */
export function schoolMatchesSavant(
  spellSchool: string | null | undefined,
  savantSchool: string | null | undefined,
): boolean {
  const a = normalizeSchool(spellSchool)
  const b = normalizeSchool(savantSchool)
  if (!a || !b) return false
  if (a === b) return true
  // Light RU ↔ EN bridges used in catalog / features.
  const aliases: Record<string, string[]> = {
    abjuration: ['ограждение', 'abjuration'],
    conjuration: ['вызов', 'conjuration'],
    divination: ['прорицание', 'divination'],
    enchantment: ['очарование', 'enchantment'],
    evocation: ['воплощение', 'evocation'],
    illusion: ['иллюзия', 'illusion'],
    necromancy: ['некромантия', 'necromancy'],
    transmutation: ['преобразование', 'трансмутация', 'transmutation'],
  }
  for (const group of Object.values(aliases)) {
    if (group.includes(a) && group.includes(b)) return true
  }
  return false
}

/**
 * Cost to copy one leveled spell into a book.
 * Cantrips are not copied into the spellbook (PHB).
 */
export function copySpellCost(input: {
  spellLevel: number
  kind: SpellbookCopyKind
  spellSchool?: string | null
  mods?: SpellbookModifiers
}): SpellbookCopyCost {
  const spellLevel = clampSpellLevel(input.spellLevel)
  const kind = input.kind === 'memory' ? 'own' : input.kind
  const effectiveKind: SpellbookCopyKind =
    input.kind === 'memory' ? 'memory' : kind

  let gpPer = kind === 'foreign' ? FOREIGN_GP_PER_LEVEL : OWN_GP_PER_LEVEL
  let hoursPer = kind === 'foreign' ? FOREIGN_HOURS_PER_LEVEL : OWN_HOURS_PER_LEVEL

  const savant =
    Boolean(input.mods?.savantSchool) &&
    schoolMatchesSavant(input.spellSchool, input.mods?.savantSchool)
  if (savant) {
    gpPer /= 2
    hoursPer /= 2
  }

  const quill = Boolean(input.mods?.wizardlyQuill)
  let gp = gpPer * spellLevel
  let hours = hoursPer * spellLevel
  let minutes = 0

  if (quill) {
    gp = 0
    hours = 0
    minutes = QUILL_MINUTES_PER_LEVEL * spellLevel
    // Savant + Quill: PHB stacks poorly; Quill already sets free ink + fixed minutes.
    // Keep minutes as Quill table (2 min/level) — Scribes feature replaces time.
  }

  return {
    kind: effectiveKind,
    spellLevel,
    gp,
    hours,
    minutes,
    halvedBySavant: savant && !quill,
    freeInkByQuill: quill,
  }
}

export function totalCopyCost(
  spells: Array<{ level: number; school?: string | null }>,
  kind: SpellbookCopyKind,
  mods?: SpellbookModifiers,
): { gp: number; hours: number; minutes: number; lines: SpellbookCopyCost[] } {
  const lines = spells
    .filter((s) => s.level >= 1)
    .map((s) =>
      copySpellCost({
        spellLevel: s.level,
        kind,
        spellSchool: s.school,
        mods,
      }),
    )
  return {
    gp: lines.reduce((sum, line) => sum + line.gp, 0),
    hours: lines.reduce((sum, line) => sum + line.hours, 0),
    minutes: lines.reduce((sum, line) => sum + line.minutes, 0),
    lines,
  }
}

/** Free spells granted when reaching this wizard level (6 at 1st, else +2). */
export function freeBookSlotsAtLevel(wizardLevel: number): number {
  const lv = clampWizardLevel(wizardLevel)
  return lv === 1 ? 6 : 2
}

/** Cumulative free research size: 6 + 2×(level − 1). Not a hard book ceiling. */
export function freeBookCap(wizardLevel: number): number {
  const lv = clampWizardLevel(wizardLevel)
  return 6 + 2 * (lv - 1)
}

export function isFreeAcquisition(acq: SpellbookAcquisition | null | undefined): boolean {
  return acq === 'starting' || acq === 'level_up'
}

export function createEmptyWizardSpellbookState(
  primaryBookItemId: string | null = null,
): WizardSpellbookState {
  return {
    primaryBookItemId,
    bookLost: false,
    backupBookItemIds: [],
  }
}

export function wizardSpellAccess(book: WizardSpellbookState | null | undefined): WizardSpellAccess {
  const hasBook = Boolean(book && !book.bookLost && book.primaryBookItemId)
  return {
    hasBook,
    canPrepare: hasBook,
    canCastPrepared: true,
    canRitualFromBook: hasBook,
    canAddToBook: hasBook,
  }
}

export type SpellbookContentRow = {
  catalog_id: string | null
  name: string
  level: number
  school?: string | null
  prepared?: boolean
  in_spellbook?: boolean
}

/**
 * Lose / destroy the primary book.
 * Prepared flags on the sheet stay; in-book membership clears.
 */
export function markSpellbookLost(
  book: WizardSpellbookState,
  contents: SpellbookContentRow[],
): {
  book: WizardSpellbookState
  /** Ids/names that left the physical book. */
  clearedFromBook: SpellbookContentRow[]
} {
  const leveled = contents.filter((row) => row.level >= 1)
  return {
    book: {
      ...book,
      primaryBookItemId: null,
      bookLost: true,
      lostBookContents: leveled.map((row) => ({
        catalog_id: row.catalog_id,
        name: row.name,
        level: row.level,
      })),
    },
    clearedFromBook: leveled,
  }
}

/** Bind a blank spellbook item as the new primary after loss (or first bind). */
export function beginReplacementSpellbook(
  book: WizardSpellbookState,
  blankBookItemId: string,
): WizardSpellbookState {
  const id = blankBookItemId.trim()
  if (!id) {
    throw new Error('blankBookItemId required')
  }
  return {
    ...book,
    primaryBookItemId: id,
    bookLost: false,
    // Keep lostBookContents until player finishes restore / clears manually.
  }
}

/**
 * Cost plan to restore currently prepared leveled spells into a replacement book.
 * PHB: only prepared spells can be transcribed from memory.
 */
export function planRestorePrepared(
  preparedLeveled: Array<{ level: number; school?: string | null }>,
  mods?: SpellbookModifiers,
): ReturnType<typeof totalCopyCost> {
  return totalCopyCost(preparedLeveled, 'memory', mods)
}

/** Register a finished backup book in state (after paying own-copy tariff). */
export function registerBackupBook(
  book: WizardSpellbookState,
  backupItemId: string,
): WizardSpellbookState {
  const id = backupItemId.trim()
  if (!id) throw new Error('backupItemId required')
  const existing = book.backupBookItemIds ?? []
  if (existing.includes(id)) return book
  return {
    ...book,
    backupBookItemIds: [...existing, id],
  }
}

/**
 * Promote a backup to primary (e.g. after loss, if a backup still exists).
 * Does not clear lostBookContents — caller may compare.
 */
export function activateBackupAsPrimary(
  book: WizardSpellbookState,
  backupItemId: string,
): WizardSpellbookState {
  const id = backupItemId.trim()
  const backups = book.backupBookItemIds ?? []
  if (!backups.includes(id)) {
    throw new Error('backupItemId is not registered')
  }
  return {
    ...book,
    primaryBookItemId: id,
    bookLost: false,
    backupBookItemIds: backups.filter((x) => x !== id),
  }
}
