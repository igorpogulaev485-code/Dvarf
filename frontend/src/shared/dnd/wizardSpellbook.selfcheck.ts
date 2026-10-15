/** Run: npx tsx src/shared/dnd/wizardSpellbook.selfcheck.ts */
import {
  activateBackupAsPrimary,
  beginReplacementSpellbook,
  copySpellCost,
  createEmptyWizardSpellbookState,
  freeBookCap,
  freeBookSlotsAtLevel,
  isFreeAcquisition,
  markSpellbookLost,
  planRestorePrepared,
  registerBackupBook,
  schoolMatchesSavant,
  totalCopyCost,
  wizardSpellAccess,
} from './wizardSpellbook'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// --- free budget ---
assert(freeBookSlotsAtLevel(1) === 6, 'L1 free slots')
assert(freeBookSlotsAtLevel(2) === 2, 'L2 free slots')
assert(freeBookCap(1) === 6, 'cap L1')
assert(freeBookCap(5) === 14, 'cap L5')
assert(isFreeAcquisition('starting'), 'starting free')
assert(isFreeAcquisition('level_up'), 'level_up free')
assert(!isFreeAcquisition('copied'), 'copied paid')

// --- foreign copy ---
const foreign3 = copySpellCost({ spellLevel: 3, kind: 'foreign' })
assert(foreign3.gp === 150, 'foreign 3 gp')
assert(foreign3.hours === 6, 'foreign 3 hours')
assert(foreign3.minutes === 0, 'foreign no minutes')

// --- own / memory backup ---
const own2 = copySpellCost({ spellLevel: 2, kind: 'own' })
assert(own2.gp === 20, 'own 2 gp')
assert(own2.hours === 2, 'own 2 hours')

const mem = copySpellCost({ spellLevel: 2, kind: 'memory' })
assert(mem.gp === 20 && mem.hours === 2, 'memory = own tariff')
assert(mem.kind === 'memory', 'memory kind preserved')

// --- Savant halves ---
const savant = copySpellCost({
  spellLevel: 2,
  kind: 'foreign',
  spellSchool: 'evocation',
  mods: { savantSchool: 'воплощение' },
})
assert(schoolMatchesSavant('evocation', 'воплощение'), 'school alias')
assert(savant.gp === 50, 'savant gp half of 100')
assert(savant.hours === 2, 'savant hours half of 4')
assert(savant.halvedBySavant, 'savant flag')

// --- Wizardly Quill ---
const quill = copySpellCost({
  spellLevel: 3,
  kind: 'foreign',
  mods: { wizardlyQuill: true },
})
assert(quill.gp === 0, 'quill free ink')
assert(quill.hours === 0, 'quill no hours')
assert(quill.minutes === 6, 'quill 2 min × 3')
assert(quill.freeInkByQuill, 'quill flag')

// --- total backup of a small book ---
const total = totalCopyCost(
  [
    { level: 1, school: 'evocation' },
    { level: 2 },
    { level: 0 }, // cantrip ignored
  ],
  'own',
)
assert(total.gp === 10 + 20, 'total own gp')
assert(total.hours === 1 + 2, 'total own hours')
assert(total.lines.length === 2, 'cantrip skipped')

// --- access / lose / replace ---
let book = createEmptyWizardSpellbookState('item-book-1')
let access = wizardSpellAccess(book)
assert(access.hasBook && access.canPrepare && access.canRitualFromBook, 'with book')
assert(access.canCastPrepared, 'cast always')

const lost = markSpellbookLost(book, [
  { catalog_id: 'magic-missile', name: 'Magic Missile', level: 1, prepared: true },
  { catalog_id: 'fireball', name: 'Fireball', level: 3, prepared: false },
  { catalog_id: 'prestidigitation', name: 'Prestidigitation', level: 0 },
])
book = lost.book
assert(book.bookLost && book.primaryBookItemId === null, 'lost clears primary')
assert(book.lostBookContents?.length === 2, 'cantrip not in lost snapshot')
access = wizardSpellAccess(book)
assert(!access.canPrepare && !access.canRitualFromBook && !access.canAddToBook, 'no book gates')
assert(access.canCastPrepared, 'still cast prepared')

const restorePlan = planRestorePrepared([{ level: 1 }])
assert(restorePlan.gp === 10 && restorePlan.hours === 1, 'restore prepared cost')

book = beginReplacementSpellbook(book, 'item-blank-2')
assert(!book.bookLost && book.primaryBookItemId === 'item-blank-2', 'replacement bound')
assert(wizardSpellAccess(book).canPrepare, 'prepare after replace')

book = registerBackupBook(book, 'item-backup-3')
book = activateBackupAsPrimary(
  { ...book, bookLost: true, primaryBookItemId: null },
  'item-backup-3',
)
assert(book.primaryBookItemId === 'item-backup-3', 'backup promoted')
assert(!(book.backupBookItemIds ?? []).includes('item-backup-3'), 'removed from backups')
assert(!book.bookLost, 'no longer lost')

console.log('wizardSpellbook.selfcheck: ok')
