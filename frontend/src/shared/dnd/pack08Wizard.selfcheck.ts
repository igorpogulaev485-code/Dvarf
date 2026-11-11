/**
 * Pack 08 wizard rules.
 * Run: npx tsx src/shared/dnd/pack08Wizard.selfcheck.ts
 */
import { featureResourceId } from './featureResources.ts'
import { resourceShownCurrent, type SheetResource } from './rest.ts'
import { resolveSubclassFeatureSlug } from './classFeatures.ts'
import { emptyFeaturePicks } from './featurePicks.ts'
import { countFreeSpellbookSlotsUsed } from './wizardSpellbook.ts'
import {
  applyAbjurationToWard,
  applyWizardFeatureUse,
  arcaneWardMax,
  createArcaneWard,
  egwSubclassesForSlug,
  finishWizardResourcesOnRest,
  gainPowerSurge,
  rollPortentDice,
  syncWizardCapstoneSpells,
  syncWizardSchoolSpellbook,
  wizardLeveledCastGate,
} from './wizardTradition.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(arcaneWardMax(20, 16) === 43, 'ward 20 + INT 16 = 43')
assert(arcaneWardMax(2, 10) === 4, 'ward 2 + INT 10 = 4')

const ward: SheetResource = {
  id: featureResourceId('wizard', 'arcane_ward', 'w1'),
  name: 'Магический щит (хиты)',
  max: 43,
  used: 0,
  reset: 'long',
  track: 'stock',
}
assert(resourceShownCurrent(ward) === 0, 'empty stock shows 0, not max')
const created = createArcaneWard([ward])
assert(created.ok && resourceShownCurrent(created.resources[0]!) === 43, 'create fills the ward')
const damaged = [{ ...created.resources[0]!, used: 39 }]
const repaired = applyAbjurationToWard(damaged, 1)
assert(repaired.resources[0]!.used === 41, 'shield cast repairs 2')
assert(resourceShownCurrent(repaired.resources[0]!) === 41, 'bar matches holdings')

const spendPool: SheetResource = {
  id: 'feat:wizard:manifest_mind:w1',
  name: 'Проявить разум',
  max: 5,
  used: 0,
  reset: 'long',
  track: 'spend',
}
assert(resourceShownCurrent(spendPool) === 5, 'spend pool shows remaining')

const portent: SheetResource = {
  id: featureResourceId('wizard', 'portent', 'w1'),
  name: 'Кости знамения',
  max: 2,
  used: 0,
  reset: 'long',
  track: 'stock',
}
const rested = finishWizardResourcesOnRest([portent], 'long', () => 0)
assert(rested[0]!.dice?.join(',') === '1,1', 'long rest records two d20s')
assert(rested[0]!.used === 2, 'portent stock matches recorded dice')
const spentDie = applyWizardFeatureUse({
  featureId: 'portent',
  resourceId: portent.id,
  resources: rested,
  classEntryId: 'w1',
  classSlug: 'wizard',
  wizardLevel: 2,
  intelligenceScore: 16,
  dieIndex: 0,
  target: 'атака гоблина',
})
assert(spentDie.ok, spentDie.message)
assert(spentDie.resources[0]!.dice?.length === 1, 'one die remains')
assert(spentDie.message.includes('1'), 'toast names the d20')

const surge: SheetResource = {
  id: featureResourceId('wizard', 'power_surge', 'w1'),
  name: 'Всплеск силы',
  max: 5,
  used: 0,
  reset: 'long',
  track: 'stock',
}
const afterShort = finishWizardResourcesOnRest([surge], 'short')
assert(afterShort[0]!.used === 1, 'short rest with 0 surges grants 1')
const gained = gainPowerSurge(afterShort)
assert(gained.resources[0]!.used === 2, 'foiled spell grants a surge')

assert(
  wizardLeveledCastGate({ level: 1, ritual: true, prepared: false }).ritualOnly,
  'unprepared ritual is ritual only',
)
assert(
  !wizardLeveledCastGate({ level: 1, ritual: true, prepared: false }).slot,
  'unprepared ritual is not a slot cast',
)
assert(
  wizardLeveledCastGate({ level: 1, prepared: true }).slot,
  'prepared spell can use a slot',
)

assert(resolveSubclassFeatureSlug('Магия хронургии') === 'chronurgy_magic', 'chronurgy name')
assert(resolveSubclassFeatureSlug('Магия гравитургии') === 'graviturgy_magic', 'graviturgy name')
assert(
  egwSubclassesForSlug('gift_of_alacrity').every((row) => row.subclass === 'chronurgy_magic'),
  'gift of alacrity is chronurgy only',
)
assert(
  egwSubclassesForSlug('magnify_gravity').every((row) => row.subclass === 'graviturgy_magic'),
  'magnify gravity is graviturgy only',
)

const school = syncWizardSchoolSpellbook({
  known: [],
  classes: [{ id: 'w1', name: 'Волшебник', level: 20, catalog_id: null, subclass_name: 'Некромант', subclass_catalog_id: null }],
  grants: [{ classEntryId: 'w1', slug: 'school_of_necromancy', parentSlug: 'wizard' }],
  makeSpell: (draft) => ({
    id: draft.id,
    name: draft.name,
    level: draft.level,
    school: draft.school,
    spellbook_acquisition: 'feature' as const,
  }),
})
assert(school.changed && school.known.length === 1, 'animate dead granted')
assert(
  countFreeSpellbookSlotsUsed(school.known) === 0,
  'school grant is outside the +2 book budget',
)
const dropped = syncWizardSchoolSpellbook({
  known: school.known,
  classes: [{ id: 'w1', name: 'Волшебник', level: 20, catalog_id: null, subclass_name: 'Воплощение', subclass_catalog_id: null }],
  grants: [{ classEntryId: 'w1', slug: 'school_of_evocation', parentSlug: 'wizard' }],
  makeSpell: (draft) => draft,
})
assert(dropped.known.length === 0, 'leaving necromancy removes only the grant')

const kept = syncWizardSchoolSpellbook({
  known: [
    {
      id: 'own-animate',
      name: 'Восставший труп',
      level: 3,
      spellbook_acquisition: 'copied',
    },
  ],
  classes: [{ id: 'w1', name: 'Волшебник', level: 6, catalog_id: null, subclass_name: 'Некромант', subclass_catalog_id: null }],
  grants: [{ classEntryId: 'w1', slug: 'school_of_necromancy', parentSlug: 'wizard' }],
  makeSpell: (draft) => draft,
})
assert(kept.known.length === 1 && kept.known[0]!.id === 'own-animate', 'own copy is kept')

let picks = emptyFeaturePicks()
picks = {
  values: { 'w1:signature_spells': 'fireball,counterspell' },
}
const capped = syncWizardCapstoneSpells({
  known: [
    { id: 'fireball', name: 'Огненный шар', level: 3, prepared: false },
    { id: 'counterspell', name: 'Контрзаклинание', level: 3, prepared: false },
  ],
  featurePicks: picks,
  classEntryId: 'w1',
})
assert(capped.known.every((spell) => spell.prepared_locked), 'signature spells stay prepared')
assert(
  capped.known.every((spell) => spell.grant_cast?.max === 1 && spell.grant_cast.reset === 'short'),
  'each signature spell has its own charge',
)

const song = applyWizardFeatureUse({
  featureId: 'bladesong',
  resourceId: featureResourceId('wizard', 'bladesong', 'w1'),
  resources: [
    {
      id: featureResourceId('wizard', 'bladesong', 'w1'),
      name: 'Песнь клинка',
      max: 5,
      used: 0,
      reset: 'long',
      track: 'spend',
    },
  ],
  classEntryId: 'w1',
  classSlug: 'wizard',
  wizardLevel: 20,
  intelligenceScore: 16,
})
assert(song.ok && song.resources[0]!.activeLabel === 'Песнь клинка', 'bladesong marks active')
assert(song.resources[0]!.used === 1, 'bladesong spends one use')

const dice = rollPortentDice(3, () => 0.99)
assert(dice.join(',') === '20,20,20', 'rng hook')

console.log('pack08Wizard.selfcheck: ok')
