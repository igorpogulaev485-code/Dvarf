/**
 * QI-01: displayResourceLabel maps legacy «Ки» → «Ци» without touching other labels.
 * Run: npx tsx src/shared/dnd/displayResourceLabel.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { displayResourceLabel } from './rest.ts'

assert.equal(displayResourceLabel('Ки'), 'Ци')
assert.equal(displayResourceLabel('ки'), 'ци')
assert.equal(displayResourceLabel('КИ'), 'ЦИ')
assert.equal(displayResourceLabel('  Ки  '), 'Ци')
assert.equal(displayResourceLabel('Божественный канал'), 'Божественный канал')
assert.equal(displayResourceLabel('Ци'), 'Ци')
assert.equal(displayResourceLabel('Ки-рин'), 'Ки-рин')
assert.equal(displayResourceLabel('Кинжал'), 'Кинжал')

console.log('displayResourceLabel.selfcheck ok')
