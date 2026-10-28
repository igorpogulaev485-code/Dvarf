/**
 * Wizard spellbook rules (PHB 2014) — pure helpers.
 *
 * Covers: free level-up fills, paid foreign copy, own-book backup,
 * lose/destroy + replacement from prepared memory, purse spend.
 * See docs/wizard-spellbook.md.
 */

import {
  formatGpTotal,
  spendGpFromPurse,
  type CoinPurse,
  type SpendGpResult,
} from './weight'

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

/** PHB school traditions → English school key used in catalog `school`. */
const SAVANT_SCHOOL_BY_SUBCLASS: Record<string, string> = {
  school_of_abjuration: 'abjuration',
  school_of_conjuration: 'conjuration',
  school_of_divination: 'divination',
  school_of_enchantment: 'enchantment',
  school_of_evocation: 'evocation',
  school_of_illusion: 'illusion',
  school_of_necromancy: 'necromancy',
  school_of_transmutation: 'transmutation',
}

const SAVANT_LABEL_RU: Record<string, string> = {
  abjuration: 'ограждение',
  conjuration: 'вызов',
  divination: 'прорицание',
  enchantment: 'очарование',
  evocation: 'воплощение',
  illusion: 'иллюзия',
  necromancy: 'некромантия',
  transmutation: 'преобразование',
}

/**
 * Copy-cost mods from wizard tradition (Savant at 2+, Wizardly Quill for Scribes).
 * `subclassSlug` should already be canonical (e.g. school_of_evocation).
 */
export function resolveWizardCopyMods(input: {
  subclassSlug: string | null | undefined
  wizardLevel: number
}): SpellbookModifiers & { savantLabelRu: string | null } {
  const slug = (input.subclassSlug ?? '').trim().toLowerCase()
  const level = Math.max(0, Math.floor(input.wizardLevel) || 0)
  const mods: SpellbookModifiers & { savantLabelRu: string | null } = {
    savantSchool: null,
    wizardlyQuill: false,
    savantLabelRu: null,
  }
  if (!slug || level < 2) return mods

  const school = SAVANT_SCHOOL_BY_SUBCLASS[slug]
  if (school) {
    mods.savantSchool = school
    mods.savantLabelRu = SAVANT_LABEL_RU[school] ?? school
  }
  if (slug === 'order_of_scribes') {
    mods.wizardlyQuill = true
  }
  return mods
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

/** Legacy rows without acquisition count as free research fills. */
export function countsAsFreeSpellbookSlot(spell: {
  level: number
  spellbook_acquisition?: SpellbookAcquisition | null
}): boolean {
  if (spell.level < 1) return false
  if (spell.spellbook_acquisition == null) return true
  return isFreeAcquisition(spell.spellbook_acquisition)
}

export function countFreeSpellbookSlotsUsed(
  known: Array<{ level: number; spellbook_acquisition?: SpellbookAcquisition | null }>,
): number {
  return known.filter(countsAsFreeSpellbookSlot).length
}

export function remainingFreeSpellbookSlots(
  known: Array<{ level: number; spellbook_acquisition?: SpellbookAcquisition | null }>,
  wizardLevel: number,
): number {
  return Math.max(0, freeBookCap(wizardLevel) - countFreeSpellbookSlotsUsed(known))
}

export type SpellbookAddPayment =
  | {
      ok: true
      free: true
      acquisition: 'starting' | 'level_up'
      coins: CoinPurse | null
      cost: null
      message: string
    }
  | {
      ok: true
      free: false
      acquisition: 'copied'
      coins: CoinPurse
      cost: SpellbookCopyCost
      message: string
      spend: Extract<SpendGpResult, { ok: true }>
    }
  | {
      ok: false
      free: false
      acquisition: 'copied'
      coins: CoinPurse | null
      cost: SpellbookCopyCost
      message: string
      needGp: number
      haveGp: number
    }

/**
 * Resolve free vs paid add into the spellbook and (when paid) debit the purse.
 * Free while used free slots < freeBookCap; else foreign copy tariff.
 */
export function resolveSpellbookAddPayment(input: {
  spellLevel: number
  spellSchool?: string | null
  known: Array<{ level: number; spellbook_acquisition?: SpellbookAcquisition | null }>
  wizardLevel: number
  coins: CoinPurse | null | undefined
  mods?: SpellbookModifiers
  /**
   * Scroll / foreign manuscript: never consume free research slots
   * (PHB: research freebies are separate from copying a found scroll).
   */
  forcePaid?: boolean
}): SpellbookAddPayment {
  const freeLeft = remainingFreeSpellbookSlots(input.known, input.wizardLevel)
  if (!input.forcePaid && freeLeft > 0) {
    const used = countFreeSpellbookSlotsUsed(input.known)
    const acquisition: 'starting' | 'level_up' = used < 6 ? 'starting' : 'level_up'
    return {
      ok: true,
      free: true,
      acquisition,
      coins: input.coins ? { ...input.coins } : null,
      cost: null,
      message: acquisition === 'starting' ? 'Бесплатно (стартовая книга)' : 'Бесплатно (исследование уровня)',
    }
  }

  const cost = copySpellCost({
    spellLevel: input.spellLevel,
    kind: 'foreign',
    spellSchool: input.spellSchool,
    mods: input.mods,
  })

  if (cost.gp <= 0) {
    // Quill / zero-cost edge: still "copied", no purse change required.
    return {
      ok: true,
      free: false,
      acquisition: 'copied',
      coins: input.coins ? { ...input.coins } : { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      cost,
      message: cost.freeInkByQuill
        ? `Копия пером писца · ${cost.minutes} мин`
        : 'Копия без стоимости золота',
      spend: {
        ok: true,
        coins: input.coins ? { ...input.coins } : { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        paidGp: 0,
        haveGpBefore: 0,
        haveGpAfter: 0,
        message: '',
      },
    }
  }

  if (!input.coins) {
    return {
      ok: false,
      free: false,
      acquisition: 'copied',
      coins: null,
      cost,
      needGp: cost.gp,
      haveGp: 0,
      message: `Нужно ${formatGpTotal(cost.gp)} зм в кошельке персонажа (сверх бесплатного объёма книги)`,
    }
  }

  const spend = spendGpFromPurse(input.coins, cost.gp)
  if (!spend.ok) {
    return {
      ok: false,
      free: false,
      acquisition: 'copied',
      coins: input.coins,
      cost,
      needGp: spend.needGp,
      haveGp: spend.haveGp,
      message: `${spend.message} · копия «${cost.spellLevel} ур.» (${formatGpTotal(cost.gp)} зм, ${cost.hours} ч)`,
    }
  }

  const savantNote = cost.halvedBySavant ? ' · знаток школы ×½' : ''
  const quillNote = cost.freeInkByQuill ? ` · перо писца ${cost.minutes} мин` : ''
  const timeNote = cost.freeInkByQuill
    ? ''
    : ` · ${cost.hours} ч`
  return {
    ok: true,
    free: false,
    acquisition: 'copied',
    coins: spend.coins,
    cost,
    message: `В книгу за ${formatGpTotal(cost.gp)} зм${timeNote}${savantNote}${quillNote} · ${spend.message}`,
    spend,
  }
}

/** Preview foreign-copy gp for UI chips (0 when still inside free budget). */
export function previewSpellbookAddGp(input: {
  spellLevel: number
  spellSchool?: string | null
  known: Array<{ level: number; spellbook_acquisition?: SpellbookAcquisition | null }>
  wizardLevel: number
  mods?: SpellbookModifiers
}): number {
  if (remainingFreeSpellbookSlots(input.known, input.wizardLevel) > 0) return 0
  return copySpellCost({
    spellLevel: input.spellLevel,
    kind: 'foreign',
    spellSchool: input.spellSchool,
    mods: input.mods,
  }).gp
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

/**
 * Wizard ritual cast (PHB): ritual tag + spell in book + physical book present.
 * Prepared-with-slot is a separate path — this is ritual-only.
 */
export function canCastWizardRitualFromBook(input: {
  spell: { level: number; ritual?: boolean; in_spellbook?: boolean }
  book: WizardSpellbookState | null | undefined
}): { ok: boolean; message: string } {
  if (input.spell.level <= 0 || !input.spell.ritual) {
    return { ok: false, message: 'Не ритуал' }
  }
  if (!wizardSpellAccess(input.book).canRitualFromBook) {
    return {
      ok: false,
      message: 'Нужна книга заклинаний для ритуала из книги',
    }
  }
  if (input.spell.in_spellbook === false) {
    return { ok: false, message: 'Заклинания нет в активной книге' }
  }
  return { ok: true, message: '' }
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
 * Rebind a physical book found in inventory after loss and clear the lost flag.
 * Caller restores `in_spellbook` from lostBookContents (full snapshot — not memory).
 */
export function rebindFoundSpellbook(
  book: WizardSpellbookState,
  foundBookItemId: string,
): WizardSpellbookState {
  const id = foundBookItemId.trim()
  if (!id) {
    throw new Error('foundBookItemId required')
  }
  return {
    ...book,
    primaryBookItemId: id,
    bookLost: false,
    lostBookContents: undefined,
  }
}

/** Match known leveled rows to a lost-book snapshot (catalog id or name). */
export function spellMatchesLostBookContents(
  spell: { catalog_id?: string | null; name: string; level: number },
  lost: Array<{ catalog_id?: string | null; name: string; level: number }> | undefined,
): boolean {
  if (!lost?.length || spell.level <= 0) return false
  const byCatalog = new Set(
    lost.map((row) => row.catalog_id).filter((id): id is string => Boolean(id)),
  )
  const byName = new Set(lost.map((row) => row.name.trim().toLowerCase()))
  if (spell.catalog_id != null && byCatalog.has(spell.catalog_id)) return true
  return byName.has(spell.name.trim().toLowerCase())
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
