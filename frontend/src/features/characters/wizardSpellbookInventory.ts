/**
 * Bind wizard spellbook state to a physical inventory item («Книга заклинаний»).
 * Slice 2 — docs/wizard-spellbook-plan.md
 */

import {
  createEmptyWizardSpellbookState,
  markSpellbookLost,
  type WizardSpellbookState,
} from '../../shared/dnd/wizardSpellbook'
import {
  createInventoryItem,
  type InventoryItem,
  type InventoryState,
} from './inventory'
import type { SpellsState } from './spells'

export type SpellbookItemRef = {
  id: string
  name: string
  catalog_slug?: string | null
}

export function isSpellbookInventoryItem(item: SpellbookItemRef): boolean {
  const slug = (item.catalog_slug ?? '').trim().toLowerCase()
  if (slug === 'spellbook' || slug.endsWith('_spellbook') || slug.includes('spellbook')) {
    return true
  }
  const name = item.name.trim().toLowerCase().replace(/ё/g, 'е')
  if (/книга\s+заклинаний/.test(name)) return true
  if (/spell\s*book/.test(name)) return true
  return false
}

export function listSpellbookItems(items: SpellbookItemRef[]): SpellbookItemRef[] {
  return items.filter(isSpellbookInventoryItem)
}

export type WizardSpellbookSyncResult = {
  spells: SpellsState
  changed: boolean
  /** Short RU toast when something notable happened. */
  message: string | null
  book: WizardSpellbookState | undefined
}

function markLeveledInBook(known: SpellsState['known'], inBook: boolean): SpellsState['known'] {
  let changed = false
  const next = known.map((spell) => {
    if (spell.level <= 0) return spell
    if (spell.in_spellbook === inBook) return spell
    changed = true
    return { ...spell, in_spellbook: inBook }
  })
  return changed ? next : known
}

/**
 * Keep `spells.wizard_spellbook` aligned with inventory.
 * - First spellbook item → bind as primary (if not bookLost).
 * - Primary removed → mark lost, clear in_spellbook on leveled.
 * - While bookLost, do not auto-bind (replacement is an explicit UI action).
 */
export function syncWizardSpellbookWithInventory(input: {
  isWizard: boolean
  spells: SpellsState
  items: SpellbookItemRef[]
}): WizardSpellbookSyncResult {
  if (!input.isWizard) {
    return {
      spells: input.spells,
      changed: false,
      message: null,
      book: input.spells.wizard_spellbook,
    }
  }

  const books = listSpellbookItems(input.items)
  const bookIds = new Set(books.map((row) => row.id))
  let state: WizardSpellbookState =
    input.spells.wizard_spellbook ?? createEmptyWizardSpellbookState(null)
  let known = input.spells.known
  let message: string | null = null
  let changed = false

  // Primary gone while not already lost → lose the book.
  if (
    state.primaryBookItemId &&
    !bookIds.has(state.primaryBookItemId) &&
    !state.bookLost
  ) {
    const lost = markSpellbookLost(
      state,
      known.map((spell) => ({
        catalog_id: spell.catalog_id,
        name: spell.name,
        level: spell.level,
        prepared: spell.prepared,
        in_spellbook: spell.in_spellbook,
      })),
    )
    state = lost.book
    known = markLeveledInBook(known, false)
    message = 'Книга заклинаний исчезла из инвентаря — отмечена как утерянная'
    changed = true
  }

  // Auto-bind first physical book when none bound and not in lost state.
  if (!state.bookLost && !state.primaryBookItemId && books[0]) {
    state = {
      ...state,
      primaryBookItemId: books[0].id,
      bookLost: false,
    }
    known = markLeveledInBook(known, true)
    message = message ?? `Книга заклинаний привязана: «${books[0].name}»`
    changed = true
  }

  // Primary still present — ensure leveled rows marked in book.
  if (!state.bookLost && state.primaryBookItemId && bookIds.has(state.primaryBookItemId)) {
    const nextKnown = markLeveledInBook(known, true)
    if (nextKnown !== known) {
      known = nextKnown
      changed = true
    }
  }

  const nextSpells: SpellsState = {
    ...input.spells,
    known,
    wizard_spellbook: state,
  }

  const sameBook =
    input.spells.wizard_spellbook?.primaryBookItemId === state.primaryBookItemId &&
    input.spells.wizard_spellbook?.bookLost === state.bookLost &&
    input.spells.known === known

  return {
    spells: sameBook && !changed ? input.spells : nextSpells,
    changed: changed || !sameBook,
    message,
    book: state,
  }
}

export function wizardHasUsableSpellbook(spells: SpellsState): boolean {
  const book = spells.wizard_spellbook
  return Boolean(book && !book.bookLost && book.primaryBookItemId)
}

export function wizardSpellbookStatusLabel(spells: SpellsState): {
  label: string
  ok: boolean
} {
  const book = spells.wizard_spellbook
  if (!book) return { label: 'Книга: не привязана', ok: false }
  if (book.bookLost) return { label: 'Книга: утеряна', ok: false }
  if (!book.primaryBookItemId) return { label: 'Книга: нет в инвентаре', ok: false }
  return { label: 'Книга: есть', ok: true }
}

/** Tag starting-gear rows that are clearly a spellbook. */
export function tagSpellbookInventoryItem<T extends InventoryItem>(item: T): T {
  if (!isSpellbookInventoryItem(item)) return item
  if (item.catalog_slug === 'spellbook') return item
  return { ...item, catalog_slug: 'spellbook' }
}

/**
 * Slice C2: ensure a physical spellbook exists (skip gear / multiclass wizard).
 * Does not replace an existing book.
 */
export function ensureBlankSpellbookInInventory(inventory: InventoryState): {
  inventory: InventoryState
  item: InventoryItem
  created: boolean
} {
  const existing = inventory.items.find(isSpellbookInventoryItem)
  if (existing) {
    return { inventory, item: existing, created: false }
  }
  const item = tagSpellbookInventoryItem({
    ...createInventoryItem(),
    name: 'Книга заклинаний',
    catalog_slug: 'spellbook',
    notes: 'Книга заклинаний волшебника (создана при сборке персонажа)',
    qty: 1,
  })
  return {
    inventory: {
      ...inventory,
      items: [...inventory.items, item],
    },
    item,
    created: true,
  }
}
