/**
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/enhancedBond.selfcheck.ts
 */
import assert from 'node:assert/strict'
import type { CompanionEntry } from './companions.ts'
import {
  applyEnhancedBondToEffect,
  enhancedBondOriginNoteRu,
  hasActiveWildfireSpirit,
  isEnhancedBondActive,
  spellDealsFireDamage,
  spellQualifiesForEnhancedBond,
  spellRangeIsSelf,
} from './enhancedBond.ts'
import { extractSpellDiceFormula } from './physicalSpellFollowUp.ts'

function spirit(partial: Partial<CompanionEntry> & { active?: boolean; hp?: number }): CompanionEntry {
  return {
    id: 'spirit-1',
    name: 'Дух дикого огня',
    kind: 'ally',
    role: 'ally',
    active: partial.active ?? true,
    notes: '',
    actions: '',
    bestiary_ref: 'wildfire_spirit',
    bestiary_name_ru: 'Дух дикого огня',
    source: { kind: 'feature', feature: 'summon_wildfire_spirit', labelRu: 'Дух' },
    stats: {
      hp: partial.hp ?? 35,
      hp_max: partial.hp ?? 35,
      ac: 13,
      speed: 30,
    },
    ...partial,
  } as CompanionEntry
}

assert.equal(hasActiveWildfireSpirit([spirit({ active: true, hp: 35 })]), true)
assert.equal(hasActiveWildfireSpirit([spirit({ active: false, hp: 35 })]), false)
assert.equal(hasActiveWildfireSpirit([spirit({ active: true, hp: 0 })]), false)

assert.equal(
  isEnhancedBondActive({
    features: [{ id: 'enhanced_bond' }],
    companions: [spirit({ active: true, hp: 50 })],
  }),
  true,
)
assert.equal(
  isEnhancedBondActive({
    features: [{ id: 'summon_wildfire_spirit' }],
    companions: [spirit({ active: true, hp: 50 })],
  }),
  false,
  'L2 summon without L6 bond',
)

assert.equal(spellDealsFireDamage({ effect: '1к10 огонь' }), true)
assert.equal(spellDealsFireDamage({ effect: '1к8 излучением' }), false)
assert.equal(spellQualifiesForEnhancedBond({ name: 'Лечение ран', effect: '1к8+3' }), true)
assert.equal(spellQualifiesForEnhancedBond({ name: 'Огненный снаряд', effect: '1к10 огонь' }), true)
assert.equal(
  spellQualifiesForEnhancedBond({ name: 'Волшебная стрела', effect: '1к4+1 силовым' }),
  false,
)

assert.equal(applyEnhancedBondToEffect('1к10 огонь'), '1к10+1к8 огонь')
assert.equal(applyEnhancedBondToEffect('1к8+3'), '1к8+1к8+3')
assert.equal(
  applyEnhancedBondToEffect(applyEnhancedBondToEffect('1к10 огонь')),
  '1к10+1к8 огонь',
  'idempotent',
)

assert.equal(extractSpellDiceFormula('1к10+1к8 огонь'), '1к10+1к8')
assert.equal(extractSpellDiceFormula('1к8+3'), '1к8+3')

assert.equal(spellRangeIsSelf('На себя'), true)
assert.equal(spellRangeIsSelf('Self'), true)
assert.equal(spellRangeIsSelf('30 футов'), false)
assert.equal(spellRangeIsSelf('Касание'), false)

assert.equal(enhancedBondOriginNoteRu('spirit'), ' · каст от духа')
assert.equal(enhancedBondOriginNoteRu('self'), '')

console.log('enhancedBond.selfcheck: ok')
