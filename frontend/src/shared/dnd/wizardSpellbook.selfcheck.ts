/** Run: npx tsx src/shared/dnd/wizardSpellbook.selfcheck.ts */
import { coinsToGp, spendGpFromPurse, type CoinPurse } from './weight'
import {
  activateBackupAsPrimary,
  beginReplacementSpellbook,
  canCastWizardRitualFromBook,
  copySpellCost,
  createEmptyWizardSpellbookState,
  freeBookCap,
  freeBookSlotsAtLevel,
  isFreeAcquisition,
  markSpellbookLost,
  planRestorePrepared,
  registerBackupBook,
  remainingFreeSpellbookSlots,
  resolveSpellbookAddPayment,
  resolveWizardCopyMods,
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

// --- purse spend ---
const rich: CoinPurse = { cp: 0, sp: 0, ep: 0, gp: 40, pp: 2 } // 60 зм
const paid = spendGpFromPurse(rich, 50)
assert(paid.ok, 'spend 50 from 20pp+40gp')
if (paid.ok) {
  assert(paid.paidGp === 50, 'paid 50')
  assert(paid.haveGpAfter === 10, '10 left')
}
const broke = spendGpFromPurse({ cp: 0, sp: 5, ep: 0, gp: 2, pp: 0 }, 50)
assert(!broke.ok, 'insufficient')
if (!broke.ok) {
  assert(broke.message.includes('Недостаточно золота'), 'RU message')
  assert(broke.needGp === 50, 'need 50')
}

// --- free then paid add payment ---
const emptyKnown: Array<{ level: number }> = []
const freePay = resolveSpellbookAddPayment({
  spellLevel: 1,
  known: emptyKnown,
  wizardLevel: 1,
  coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
})
assert(freePay.ok && freePay.free, 'L1 first add free')
assert(remainingFreeSpellbookSlots([], 1) === 6, '6 free at L1')

const fullFree = Array.from({ length: 6 }, () => ({
  level: 1,
  spellbook_acquisition: 'starting' as const,
}))
const noCoins = resolveSpellbookAddPayment({
  spellLevel: 1,
  known: fullFree,
  wizardLevel: 1,
  coins: null,
})
assert(!noCoins.ok && noCoins.needGp === 50, '7th needs 50gp, no purse')

const withCoins = resolveSpellbookAddPayment({
  spellLevel: 2,
  known: fullFree,
  wizardLevel: 1,
  coins: { cp: 0, sp: 0, ep: 0, gp: 120, pp: 0 },
})
assert(withCoins.ok && !withCoins.free, 'paid copy ok')
if (withCoins.ok && !withCoins.free) {
  assert(withCoins.cost.gp === 100, '2nd level foreign = 100')
  assert(coinsToGp(withCoins.coins) === 20, '120-100=20')
}

// Scroll copy never consumes free research slots
const scrollPay = resolveSpellbookAddPayment({
  spellLevel: 1,
  known: [],
  wizardLevel: 1,
  coins: { cp: 0, sp: 0, ep: 0, gp: 60, pp: 0 },
  forcePaid: true,
})
assert(scrollPay.ok && !scrollPay.free, 'scroll force paid')
if (scrollPay.ok && !scrollPay.free) {
  assert(scrollPay.cost.gp === 50, 'scroll 1st = 50')
  assert(coinsToGp(scrollPay.coins) === 10, '60-50=10')
}

// --- archetype savant / scribes ---
const evo = resolveWizardCopyMods({
  subclassSlug: 'school_of_evocation',
  wizardLevel: 2,
})
assert(evo.savantSchool === 'evocation', 'evocation savant')
assert(evo.savantLabelRu === 'воплощение', 'savant label')
assert(!evo.wizardlyQuill, 'not quill')

const before2 = resolveWizardCopyMods({
  subclassSlug: 'school_of_evocation',
  wizardLevel: 1,
})
assert(!before2.savantSchool, 'no savant before L2')

const scribes = resolveWizardCopyMods({
  subclassSlug: 'order_of_scribes',
  wizardLevel: 2,
})
assert(scribes.wizardlyQuill, 'scribes quill')

const evoFire = copySpellCost({
  spellLevel: 3,
  kind: 'foreign',
  spellSchool: 'evocation',
  mods: evo,
})
assert(evoFire.gp === 75, 'fireball half of 150')
assert(evoFire.halvedBySavant, 'halved flag')

// --- ritual from book ---
const bookOk = createEmptyWizardSpellbookState('book-1')
assert(
  canCastWizardRitualFromBook({
    spell: { level: 1, ritual: true, in_spellbook: true },
    book: bookOk,
  }).ok,
  'ritual ok with book',
)
assert(
  !canCastWizardRitualFromBook({
    spell: { level: 1, ritual: true, in_spellbook: true },
    book: { ...bookOk, bookLost: true, primaryBookItemId: null },
  }).ok,
  'ritual blocked when lost',
)
assert(
  !canCastWizardRitualFromBook({
    spell: { level: 1, ritual: true, in_spellbook: false },
    book: bookOk,
  }).ok,
  'ritual blocked when not in book',
)

// --- backup activate ---
const withBackup = registerBackupBook(bookOk, 'backup-1')
const lostWithBackup = markSpellbookLost(withBackup, [
  { catalog_id: 'detect-magic', name: 'Detect Magic', level: 1 },
]).book
assert(lostWithBackup.bookLost, 'lost flag')
const activated = activateBackupAsPrimary(lostWithBackup, 'backup-1')
assert(!activated.bookLost && activated.primaryBookItemId === 'backup-1', 'backup promoted')
assert(wizardSpellAccess(activated).canRitualFromBook, 'ritual after backup')

console.log('wizardSpellbook.selfcheck: ok')
