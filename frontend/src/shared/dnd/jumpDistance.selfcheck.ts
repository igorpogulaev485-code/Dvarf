import assert from 'node:assert/strict'
import {
  formatJumpFaceLabel,
  formatJumpTitle,
  jumpDistances,
} from './jumpDistance'

const j = jumpDistances({ strengthScore: 16, strengthMod: 3 })
assert.equal(j.longFt, 16)
assert.equal(j.highFt, 6)

const title = formatJumpTitle(j)
assert.ok(title.includes('в длину 16 фт'))
assert.ok(title.includes('в высоту 6 фт'))
assert.equal(formatJumpFaceLabel(), 'дл./выс. фт')

console.log('jumpDistance.selfcheck: ok')
