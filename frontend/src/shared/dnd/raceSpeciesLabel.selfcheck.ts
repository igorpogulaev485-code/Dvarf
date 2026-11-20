import assert from 'node:assert/strict'
import {
  raceSpeciesLabel,
  raceSpeciesLabelTitle,
  raceSpeciesSectionTitle,
} from './raceSpeciesLabel.ts'

assert.equal(raceSpeciesLabel('2014'), 'раса')
assert.equal(raceSpeciesLabel('2024'), 'вид')
assert.equal(raceSpeciesLabel(null), 'раса')
assert.equal(raceSpeciesLabelTitle('2014'), 'Раса')
assert.equal(raceSpeciesLabelTitle('2024'), 'Вид')
assert.equal(raceSpeciesSectionTitle('2014'), 'Раса и прошлое')
assert.equal(raceSpeciesSectionTitle('2024'), 'Вид и прошлое')

console.log('raceSpeciesLabel selfcheck ok')
