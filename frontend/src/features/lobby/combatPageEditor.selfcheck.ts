/**
 * W-03 selfcheck: нормализация полей страницы «Бой».
 * Run: npx tsx frontend/src/features/lobby/combatPageEditor.selfcheck.ts
 */

import {
  WAVE_CONDITION_PRESETS,
  emptyCombatPageFields,
  normalizeCombatPageFields,
} from './combatPageFields'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(WAVE_CONDITION_PRESETS[0] === 'сразу', 'first condition = сразу')
assert(
  WAVE_CONDITION_PRESETS.includes('когда пала предыдущая'),
  'prev wave condition',
)

const empty = emptyCombatPageFields()
assert(empty.waves.length === 1, 'default one wave')
assert(empty.waves[0].condition_text === 'сразу', 'default сразу')
assert(empty.loot.items.length === 0, 'empty loot items')

const normalized = normalizeCombatPageFields({
  waves: [
    {
      index: 2,
      condition_text: 'через 1 раунд',
      combatants: [
        { slug: 'goblin', name: 'Гоблин', count: 3 },
        { custom: true, name: 'Бандит', count: 1, hp_max: 11, ac: 12 },
        { custom: true, name: '', count: 1 },
      ],
    },
    { index: 1, combatants: [{ slug: 'orc', name: 'Орк', count: 1 }] },
  ],
  loot: {
    coins: { gp: 50, sp: 'x' },
    items: [{ name: 'Зелье', qty: 2 }, { name: '', qty: 1 }],
  },
  party_levels: [3, '4', 99, 0],
  gm_notes: 'засада',
})

assert(normalized.waves.length === 2, 'two waves kept')
assert(normalized.waves[0].index === 1, 'renumber starts at 1')
assert(normalized.waves[1].index === 2, 'second wave index 2')
assert(normalized.waves[0].combatants[0].slug === 'orc', 'sorted by index')
assert(normalized.waves[1].combatants.length === 2, 'empty custom dropped')
assert(normalized.loot.coins.gp === 50, 'gp coins')
assert(normalized.loot.coins.sp === 0, 'bad coin → 0')
assert(normalized.loot.items.length === 1, 'empty item dropped')
assert(normalized.party_levels.join(',') === '3,4,20,1', 'levels clamped')
assert(normalized.gm_notes === 'засада', 'gm notes')

console.log('combatPageEditor.selfcheck: ok')
