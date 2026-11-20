/** Run: npx tsx src/shared/dnd/wizardSpellbook2024.selfcheck.ts */
import { copySpellCost, resolveWizardCopyMods } from './wizardSpellbook'
import {
  copySpellCost2024,
  freeBookCap,
  freeBookSlotsAtLevel,
  newSlotTiersGainedAtWizardLevel,
  resolveWizardCopyMods2024,
  savantFreeBookSlotOnNewTier,
  savantFreeBookSlotsOnSubclass,
  savantFreePicksAtWizardLevel,
  scrollCopyDc,
  wizardCreateBookNeed2024,
  wizardSavantSchool,
  wizardSavantSchoolLabelRu,
} from './wizardSpellbook2024'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// school map
assert(wizardSavantSchool('wizard__abjurer') === 'abjuration', 'abjurer')
assert(wizardSavantSchool('wizard__diviner') === 'divination', 'diviner')
assert(wizardSavantSchool('wizard__evoker') === 'evocation', 'evoker')
assert(wizardSavantSchool('wizard__illusionist') === 'illusion', 'illusionist')
assert(wizardSavantSchool('wizard__conjurer') === 'conjuration', 'conjurer')
assert(wizardSavantSchool('wizard__enchanter') === 'enchantment', 'enchanter')
assert(wizardSavantSchool('wizard__necromancer') === 'necromancy', 'necromancer')
assert(wizardSavantSchool('wizard__transmuter') === 'transmutation', 'transmuter')
assert(wizardSavantSchool('wizard__bladesinger') === null, 'bladesinger no school')
assert(wizardSavantSchool('fighter__champion') === null, 'non-wizard subclass')
assert(wizardSavantSchool(null) === null, 'null slug')
assert(wizardSavantSchoolLabelRu('wizard__evoker') === 'воплощение', 'evoker label')
assert(wizardSavantSchoolLabelRu('wizard__conjurer') === 'вызов', 'conjurer UI school')
assert(wizardSavantSchoolLabelRu('wizard__enchanter') === 'очарование', 'enchanter UI school')
assert(wizardSavantSchoolLabelRu('wizard__necromancer') === 'некромантия', 'necromancer UI school')
assert(wizardSavantSchoolLabelRu('wizard__transmuter') === 'преобразование', 'transmuter UI school')

// no half price: savant school does not change tariffs
const mods = resolveWizardCopyMods2024({ subclassSlug: 'wizard__evoker', wizardLevel: 5 })
assert(mods.savantSchool === null, 'no savantSchool in mods')
assert(mods.savantSchoolKey === 'evocation', 'school key kept for UI')
assert(mods.savantLabelRu === 'воплощение', 'label kept for UI')
assert(!mods.wizardlyQuill, 'no quill in 2024')
assert(
  resolveWizardCopyMods2024({ subclassSlug: 'wizard__evoker', wizardLevel: 2 }).savantSchoolKey ===
    null,
  'no savant before subclass level',
)

const foreign3 = copySpellCost2024({ spellLevel: 3, kind: 'foreign', spellSchool: 'evocation' })
assert(foreign3.gp === 150 && foreign3.hours === 6, 'foreign 3: 150 gp / 6 h')
assert(!foreign3.halvedBySavant, 'foreign never halved')
const own2 = copySpellCost2024({ spellLevel: 2, kind: 'own', spellSchool: 'evocation' })
assert(own2.gp === 20 && own2.hours === 2, 'own 2: 20 gp / 2 h')
const viaMods = copySpellCost({
  spellLevel: 3,
  kind: 'foreign',
  spellSchool: 'evocation',
  mods,
})
assert(viaMods.gp === 150 && !viaMods.halvedBySavant, 'shared tariff with 2024 mods is not halved')

// 2014 path keeps half price
const mods2014 = resolveWizardCopyMods({ subclassSlug: 'school_of_evocation', wizardLevel: 5 })
const half = copySpellCost({
  spellLevel: 3,
  kind: 'foreign',
  spellSchool: 'evocation',
  mods: mods2014,
})
assert(half.gp === 75 && half.halvedBySavant, '2014 savant half price intact')

// new slot tiers
assert(newSlotTiersGainedAtWizardLevel(1) === 1, 'L1 → 1st')
assert(newSlotTiersGainedAtWizardLevel(2) === null, 'L2 none')
assert(newSlotTiersGainedAtWizardLevel(3) === 2, 'L3 → 2nd')
assert(newSlotTiersGainedAtWizardLevel(5) === 3, 'L5 → 3rd')
assert(newSlotTiersGainedAtWizardLevel(7) === 4, 'L7 → 4th')
assert(newSlotTiersGainedAtWizardLevel(9) === 5, 'L9 → 5th')
assert(newSlotTiersGainedAtWizardLevel(11) === 6, 'L11 → 6th')
assert(newSlotTiersGainedAtWizardLevel(13) === 7, 'L13 → 7th')
assert(newSlotTiersGainedAtWizardLevel(15) === 8, 'L15 → 8th')
assert(newSlotTiersGainedAtWizardLevel(17) === 9, 'L17 → 9th')
assert(newSlotTiersGainedAtWizardLevel(20) === null, 'L20 none')

// savant free picks
assert(savantFreeBookSlotsOnSubclass() === 2, 'subclass picks')
assert(savantFreeBookSlotOnNewTier() === 1, 'new tier pick')
const at3 = savantFreePicksAtWizardLevel({ wizardLevel: 3, subclassSlug: 'wizard__diviner' })
assert(at3.picks === 2 && at3.maxSpellLevel === 2, 'L3 two ≤2nd')
const at5 = savantFreePicksAtWizardLevel({ wizardLevel: 5, subclassSlug: 'wizard__diviner' })
assert(at5.picks === 1 && at5.maxSpellLevel === 3, 'L5 one ≤3rd')
assert(
  savantFreePicksAtWizardLevel({ wizardLevel: 4, subclassSlug: 'wizard__diviner' }).picks === 0,
  'L4 none',
)
assert(
  savantFreePicksAtWizardLevel({ wizardLevel: 5, subclassSlug: null }).picks === 0,
  'no subclass no picks',
)

// scroll copy DC
assert(scrollCopyDc(1) === 11, 'DC 1')
assert(scrollCopyDc(5) === 15, 'DC 5')
assert(scrollCopyDc(9) === 19, 'DC 9')

// free book numbers match 2014 helpers
assert(freeBookSlotsAtLevel(1) === 6 && freeBookSlotsAtLevel(2) === 2, 'free slots')
assert(freeBookCap(5) === 14, 'free cap')

// AU Savant create-at book need (free research + school free spells)
assert(
  wizardCreateBookNeed2024({ wizardLevel: 3, subclassSlug: 'wizard__conjurer' }) === 12,
  'AU savant L3 book = 12',
)
assert(
  wizardCreateBookNeed2024({ wizardLevel: 5, subclassSlug: 'wizard__enchanter' }) === 17,
  'AU savant L5 book = 17',
)
assert(
  wizardCreateBookNeed2024({ wizardLevel: 11, subclassSlug: 'wizard__necromancer' }) === 32,
  'AU savant L11 book = 32',
)
assert(
  wizardCreateBookNeed2024({ wizardLevel: 3, subclassSlug: 'wizard__bladesinger' }) === 10,
  'bladesinger is not a school Savant',
)
assert(
  wizardCreateBookNeed2024({ wizardLevel: 5, subclassSlug: null }) === 14,
  'no subclass = free research only',
)

console.log('wizardSpellbook2024.selfcheck ok')
