/**
 * UIKIT-03: compact / exact gold formatters.
 * Run: npx tsx src/shared/dnd/weight.gpFormat.selfcheck.ts
 */
import assert from 'node:assert/strict'
import {
  formatGpCompact,
  formatGpExact,
  formatGpTotal,
  formatSigDigitsFloor,
} from './weight'

assert.equal(formatGpExact(0), '0')
assert.equal(formatGpExact(1234), '1 234')
assert.equal(formatGpExact(9999), '9 999')
assert.equal(formatGpExact(1_234_567), '1 234 567')
assert.equal(formatGpExact(12.5), '12,5')
assert.equal(formatGpTotal(1_234_567), '1 234 567')

assert.equal(formatSigDigitsFloor(1.234567, 3), '1,23')
assert.equal(formatSigDigitsFloor(12.99, 3), '12,9') // floor, not round-up to 13
assert.equal(formatSigDigitsFloor(999, 3), '999')
assert.equal(formatSigDigitsFloor(10, 3), '10')

assert.equal(formatGpCompact(0), '0')
assert.equal(formatGpCompact(1234), '1 234')
assert.equal(formatGpCompact(9999), '9 999')
assert.equal(formatGpCompact(10_000), '10 тыс')
assert.equal(formatGpCompact(12_300), '12,3 тыс')
assert.equal(formatGpCompact(12_399), '12,3 тыс') // floor
assert.equal(formatGpCompact(1_234_567), '1,23 млн') // Igor check value
assert.equal(formatGpCompact(1_299_999), '1,29 млн')
assert.equal(formatGpCompact(1_999_999_999), '1,99 млрд')
assert.equal(formatGpCompact(2_000_000_000), '2 млрд')

console.log('weight.gpFormat.selfcheck: ok')
