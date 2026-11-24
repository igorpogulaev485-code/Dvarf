import assert from 'node:assert/strict'
import {
  parseTempHpRetaliationScale,
  resolveCastEffect,
  resolveCastEffectSummary,
} from './spellCatalog'

const fireBolt = {
  level: 0,
  damage: '1d10 огонь',
  damage_at_character_level: {
    '1': '1d10',
    '5': '2d10',
    '11': '3d10',
    '17': '4d10',
  },
}

const at1 = resolveCastEffect(fireBolt, { characterLevel: 1, slotLevel: 0 })
assert.equal(at1.effect, '1d10 огонь')
assert.equal(at1.scaled, true)

const at20 = resolveCastEffect(fireBolt, { characterLevel: 20, slotLevel: 0 })
assert.equal(at20.effect, '4d10 огонь')
assert.equal(at20.scaled, true)

// Toll the Dead: both dice scale (wounded uses d12).
const tollLegacyTable = {
  level: 0,
  damage: '1d8/1d12 некротическая',
  damage_at_character_level: {
    '1': '1d8',
    '5': '2d8',
    '11': '3d8',
    '17': '4d8',
  },
}
assert.equal(
  resolveCastEffect(tollLegacyTable, { characterLevel: 5, slotLevel: 0 }).effect,
  '2d8/2d12 некротическая',
)
assert.equal(
  resolveCastEffect(tollLegacyTable, { characterLevel: 17, slotLevel: 0 }).effect,
  '4d8/4d12 некротическая',
)
const tollDualTable = {
  level: 0,
  damage: '1d8/1d12 некротическая',
  damage_at_character_level: {
    '1': '1d8/1d12',
    '5': '2d8/2d12',
    '11': '3d8/3d12',
    '17': '4d8/4d12',
  },
}
assert.equal(
  resolveCastEffect(tollDualTable, { characterLevel: 11, slotLevel: 0 }).effect,
  '3d8/3d12 некротическая',
)

const agathys = {
  level: 1,
  description:
    'Вы получаете 5 временных хитов на период действия заклинания. Если существо попадает по вам рукопашной атакой, пока у вас есть эти хиты, оно получает 5 урона холодом.',
  higher_levels:
    'На больших уровнях. Если вы накладываете это заклинание, используя ячейку 2-го уровня или выше, и временные хиты и урон холодом увеличиваются на 5 за каждый уровень ячейки выше первого.',
  duration: '1 час',
}

const base = parseTempHpRetaliationScale(agathys, 1)
assert.deepEqual(base, { tempHp: 5, retaliation: 5, step: 5 })

const upcast = parseTempHpRetaliationScale(agathys, 3)
assert.deepEqual(upcast, { tempHp: 15, retaliation: 15, step: 5 })

const summary = resolveCastEffectSummary(agathys, {
  characterLevel: 5,
  slotLevel: 2,
})
assert.equal(summary.scaled, true)
assert.ok(summary.lines.some((line) => line.includes('10 временных')))
assert.ok(summary.lines.some((line) => line.includes('10 урона холодом')))
assert.ok(summary.lines.some((line) => line.includes('1 час')))

console.log('spellCatalog.castEffect.selfcheck: ok')
