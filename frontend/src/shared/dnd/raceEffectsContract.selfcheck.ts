/**
 * Slice A: permanent vs activated movement; race initiative grant.
 * Run: npx tsx src/shared/dnd/raceEffectsContract.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  initiativeBonusFromRaceGrant,
  resolveRaceGrantDef,
  resolveRaceMovement,
} from './raceGrants.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const specPath = join(
  here,
  '../../../../backend/data/races/mpmm_race_catalog_spec.json',
)
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as {
  races: Array<Record<string, unknown> & { slug: string; name_ru: string }>
}

function defFor(slug: string) {
  const row = spec.races.find((race) => race.slug === slug)
  assert(row, `missing ${slug}`)
  const def = resolveRaceGrantDef({
    raceName: row.name_ru,
    catalogSlug: row.slug,
    catalogData: row,
    nameRu: row.name_ru,
  })
  assert(def, `resolve failed for ${slug}`)
  return def
}

const protector = defFor('aasimar_protector')
assert(
  protector.movement.fly == null,
  'protector must not have permanent fly in movement',
)
assert(
  protector.activatedMovement.some((row) => row.id === 'radiant_soul'),
  'protector has activated Radiant Soul',
)
const permanent = resolveRaceMovement({
  walk: protector.speed,
  movement: protector.movement,
})
assert(permanent.fly == null, 'resolved permanent fly is null')
assert(
  protector.traitCards.some((row) => row.id === 'radiant_soul'),
  'protector trait card for Radiant Soul',
)
assert(
  protector.traitCards.some((row) => row.id === 'celestial_resistance'),
  'protector trait card for resistance',
)
assert(
  protector.damageResistances.length >= 2,
  'protector damage resistances listed',
)

const harengon = defFor('harengon')
assert(
  harengon.combatBonuses.initiative === 'proficiency_bonus',
  'harengon Hare-Trigger in combat_bonuses',
)
assert(
  initiativeBonusFromRaceGrant({
    grant: {
      combatBonuses: harengon.combatBonuses,
    },
    proficiencyBonus: 6,
  }) === 6,
  'Hare-Trigger PB at L20',
)
assert(
  harengon.traitCards.some((row) => row.id === 'hare_trigger'),
  'harengon trait card',
)

// Permanent fly race still works (aarakocra if present).
const aarakocraRow = spec.races.find((race) => race.slug === 'aarakocra')
if (aarakocraRow) {
  const aarakocra = resolveRaceGrantDef({
    raceName: aarakocraRow.name_ru,
    catalogSlug: aarakocraRow.slug,
    catalogData: aarakocraRow,
    nameRu: aarakocraRow.name_ru,
  })
  assert(aarakocra, 'aarakocra def')
  const fly = resolveRaceMovement({
    walk: aarakocra.speed,
    movement: aarakocra.movement,
  }).fly
  assert(fly != null && fly > 0, 'aarakocra keeps permanent fly')
}

console.log('raceEffectsContract.selfcheck: ok')
