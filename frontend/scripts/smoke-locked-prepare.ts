/** Slice 5: locked always-prepared from subclass / feat / race. */
import {
  asAlwaysPreparedSpell,
  canPrepareSpell,
  canRemoveSheetSpell,
  countPreparedLeveled,
  createSheetSpell,
  featSpellId,
  isPreparedLocked,
  preparedLockChip,
  setSpellPrepared,
  spellCountsTowardPrepareCap,
  subclassSpellId,
  type SheetSpell,
} from '../src/features/characters/spells.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const domain = asAlwaysPreparedSpell(
  {
    ...createSheetSpell(),
    id: subclassSpellId('c1', 'life_domain', 'cure-wounds'),
    name: 'Cure Wounds',
    level: 1,
  },
  { source_kind: 'subclass', label: 'Домен жизни' },
)
assert(domain.prepared_locked === true, 'subclass locked')
assert(domain.source_kind === 'subclass', 'subclass kind')
assert(!spellCountsTowardPrepareCap(domain), 'domain must not eat prepare cap')
assert(!canRemoveSheetSpell(domain), 'cannot delete domain')
assert(preparedLockChip(domain)?.label === 'Домен жизни', 'chip label')

const feat: SheetSpell = {
  ...createSheetSpell(),
  id: featSpellId('fey_touched', 'misty-step'),
  name: 'Misty Step',
  level: 2,
  prepared: true,
  prepared_locked: true,
  source_kind: 'feat',
  feat_grant: 'innate',
  prepare_source_label: 'Fey Touched',
}
assert(isPreparedLocked(feat), 'feat locked')
assert(!spellCountsTowardPrepareCap(feat), 'feat innate free of cap')
assert(preparedLockChip(feat)?.label === 'Fey Touched', 'feat chip')

const race: SheetSpell = {
  ...createSheetSpell(),
  id: 'race-spell:tiefling:thaumaturgy',
  name: 'Thaumaturgy',
  level: 0,
  prepared: true,
  source_kind: 'race',
  race_grant: 'innate',
  prepared_locked: true,
}
assert(isPreparedLocked(race), 'race innate locked')

const manual: SheetSpell = {
  ...createSheetSpell(),
  id: 'manual-1',
  name: 'Fireball',
  level: 3,
  prepared: true,
}
assert(spellCountsTowardPrepareCap(manual), 'manual counts')
assert(canRemoveSheetSpell(manual), 'manual removable')

const known = [domain, feat, manual]
assert(countPreparedLeveled(known) === 1, `cap count expected 1 got ${countPreparedLeveled(known)}`)

const afterUnprep = setSpellPrepared(known, domain.id, false, 4)
assert(afterUnprep.find((s) => s.id === domain.id)?.prepared === true, 'cannot unprepare domain')

assert(canPrepareSpell(known, manual, 1) === true, 'already prepared ok')
const unprepared = { ...manual, prepared: false, id: 'manual-2' }
assert(
  canPrepareSpell([...known, unprepared], unprepared, 1) === false,
  'at cap blocks new prepare',
)

console.log('smoke-locked-prepare: ok')
