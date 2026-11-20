/**
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/physicalSpellFollowUp.selfcheck.ts
 */
import assert from 'node:assert/strict'
import {
  extractSpellDiceFormula,
  offerPhysicalSpellFollowUp,
  spellEffectIsHeal,
  spellNeedsAttackRoll,
} from './physicalSpellFollowUp.ts'

assert.equal(spellNeedsAttackRoll('дальняя атака'), true)
assert.equal(spellNeedsAttackRoll('ближняя атака'), true)
assert.equal(spellNeedsAttackRoll('спас Ловкости'), false)
assert.equal(spellNeedsAttackRoll('автопопадание'), false)
assert.equal(spellNeedsAttackRoll(''), false)

assert.equal(
  spellEffectIsHeal({ name: 'Лечение ран', effect: '1к8+3' }),
  true,
)
assert.equal(
  spellEffectIsHeal({ name: 'Огненный снаряд', effect: '1к10 огонь' }),
  false,
)

assert.equal(extractSpellDiceFormula('1к10 огонь'), '1к10')
assert.equal(extractSpellDiceFormula('2d6+4'), '2d6+4')
assert.equal(extractSpellDiceFormula('нет костей'), null)

const calls: Array<Record<string, unknown>> = []
offerPhysicalSpellFollowUp({
  te: {
    diceOnTable: true,
    openEnterOwnNumber: (o) => {
      calls.push(o as unknown as Record<string, unknown>)
    },
  },
  spellName: 'Огненный снаряд',
  attackOrSave: 'дальняя атака',
  effect: '1к10 огонь',
  spellAttackBonus: 7,
  advantageMode: 'advantage',
})
assert.equal(calls.length, 1)
assert.equal(calls[0]?.mode, 'd20')
assert.equal(calls[0]?.modifier, 7)
assert.equal(calls[0]?.advantageMode, 'advantage')
assert.equal(typeof calls[0]?.onDone, 'function')
;(calls[0]?.onDone as (n: number) => void)(12)
assert.equal(calls.length, 2)
assert.equal(calls[1]?.mode, 'formula')
assert.equal(calls[1]?.formula, '1к10')
assert.match(String(calls[1]?.title), /Урон/)

calls.length = 0
offerPhysicalSpellFollowUp({
  te: {
    diceOnTable: true,
    openEnterOwnNumber: (o) => {
      calls.push(o as unknown as Record<string, unknown>)
    },
  },
  spellName: 'Лечение ран',
  effect: '1к8+3',
})
assert.equal(calls.length, 1)
assert.equal(calls[0]?.mode, 'formula')
assert.match(String(calls[0]?.title), /Лечение/)

calls.length = 0
offerPhysicalSpellFollowUp({
  te: { diceOnTable: false, openEnterOwnNumber: () => calls.push({}) },
  spellName: 'Огненный снаряд',
  attackOrSave: 'дальняя атака',
  effect: '1к10',
})
assert.equal(calls.length, 0, 'выключенная галка — без окон')

console.log('physicalSpellFollowUp.selfcheck: ok')
