/** Cast-grant picker: innate race/feat free casts + rest recover. */
import {
  canSpendGrantCast,
  createSheetSpell,
  ensureInnateGrantCasts,
  grantCastRemaining,
  parseGrantCastLimitFromNotes,
  recoverGrantCastsOnRest,
  spendGrantCast,
  withInnateGrantCast,
  type SheetSpell,
} from '../src/features/characters/spells.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(
  parseGrantCastLimitFromNotes('1/длинный отдых без ячейки', 3)?.max === 1,
  '1/long',
)
assert(
  parseGrantCastLimitFromNotes('ПБ раз / длинный отдых', 4)?.max === 4,
  'PB/long',
)
assert(
  parseGrantCastLimitFromNotes('2/короткий отдых', 2)?.reset === 'short',
  '2/short',
)

const hellish: SheetSpell = {
  ...createSheetSpell(),
  id: 'race-spell:tiefling:hellish_rebuke',
  name: 'Адская месть',
  level: 1,
  prepared: true,
  prepared_locked: true,
  source_kind: 'race',
  race_grant: 'innate',
  prepare_source_label: 'Раса',
  notes: 'врождённое',
}

const withGrant = withInnateGrantCast(hellish, { proficiencyBonus: 2, label: 'Раса' })
assert(withGrant.grant_cast?.max === 1, 'default 1/long')
assert(withGrant.grant_cast?.reset === 'long', 'long reset')
assert(canSpendGrantCast(withGrant), 'can spend')

const after = spendGrantCast([withGrant], withGrant.id)
const spent = after[0]!
assert(grantCastRemaining(spent) === 0, 'spent')
assert(!canSpendGrantCast(spent), 'blocked after spend')

const shortRest = recoverGrantCastsOnRest(after, 'short')
assert(grantCastRemaining(shortRest[0]!) === 0, 'short does not refill long')

const longRest = recoverGrantCastsOnRest(after, 'long')
assert(grantCastRemaining(longRest[0]!) === 1, 'long refills')

const fey: SheetSpell = {
  ...createSheetSpell(),
  id: 'feat-spell:fey:misty',
  name: 'Туманный шаг',
  level: 2,
  prepared: true,
  source_kind: 'feat',
  feat_grant: 'innate',
  notes: '1/длинный отдых без ячейки',
  prepare_source_label: 'Отмеченный феями',
}
const ensured = ensureInnateGrantCasts([fey, hellish], 3)
assert(ensured[0]?.grant_cast?.label === 'Отмеченный феями', 'feat label')
assert(ensured[1]?.grant_cast?.max === 1, 'race backfill')

const cantrip: SheetSpell = {
  ...createSheetSpell(),
  id: 'race-spell:tiefling:thaumaturgy',
  level: 0,
  race_grant: 'innate',
  source_kind: 'race',
}
assert(ensureInnateGrantCasts([cantrip], 2)[0]?.grant_cast == null, 'cantrip no charge')

console.log('smoke-cast-grant: ok')
