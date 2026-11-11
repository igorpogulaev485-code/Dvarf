import assert from 'node:assert/strict'
import { defaultDeskSplitForMode } from './playDeskUi'

assert.equal(defaultDeskSplitForMode('combat', true), true)
assert.equal(defaultDeskSplitForMode('combat', false), false)
assert.equal(defaultDeskSplitForMode('explore', true), false)
assert.equal(defaultDeskSplitForMode('social', true), false)
assert.equal(defaultDeskSplitForMode('explore', false), false)
assert.equal(defaultDeskSplitForMode('features', true), false)
assert.equal(defaultDeskSplitForMode('companions', true), false)

console.log('playDeskUi.deskSplit.selfcheck: ok')
