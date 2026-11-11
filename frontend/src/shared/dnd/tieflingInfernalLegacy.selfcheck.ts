/**
 * Run: npx --yes tsx src/shared/dnd/tieflingInfernalLegacy.selfcheck.ts
 *
 * Reads the PHB race catalog spec from the monorepo (backend/data).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const specCandidates = [
  resolve(process.cwd(), 'backend/data/races/phb2014_race_catalog_spec.json'),
  resolve(process.cwd(), '../backend/data/races/phb2014_race_catalog_spec.json'),
  resolve(
    process.cwd(),
    '../../backend/data/races/phb2014_race_catalog_spec.json',
  ),
]
const specPath = specCandidates.find((path) => existsSync(path))
assert(specPath, 'phb2014_race_catalog_spec.json not found')
const payload = JSON.parse(readFileSync(specPath, 'utf8')) as {
  races?: Array<{
    slug?: string
    racial_spells?: Array<{
      id?: string
      spell_slug?: string
      level?: number
      unlock_level?: number
      grant?: string
    }>
  }>
}

const tiefling = (payload.races ?? []).find((row) => row.slug === 'tiefling')
assert(tiefling, 'tiefling race in catalog')
const hellish = (tiefling.racial_spells ?? []).find(
  (row) => row.id === 'hellish_rebuke' || row.spell_slug === 'hellish_rebuke',
)
assert(hellish, 'hellish_rebuke on tiefling')
assert(hellish.grant === 'innate', 'innate grant')
assert(hellish.unlock_level === 3, 'unlock at character level 3')
assert(hellish.level === 2, 'PHB Infernal Legacy casts as 2nd-level spell')

for (const race of payload.races ?? []) {
  if (!race.slug?.startsWith('tiefling')) continue
  for (const spell of race.racial_spells ?? []) {
    if (spell.grant !== 'innate') continue
    if ((spell.unlock_level ?? 1) < 3) continue
    if ((spell.level ?? 0) !== 1) continue
    throw new Error(
      `${race.slug}:${spell.id} still level 1 at unlock ${spell.unlock_level} — expect cast-as 2`,
    )
  }
}

console.log('tieflingInfernalLegacy.selfcheck: ok')
