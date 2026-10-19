import { sampleClassic2014Character } from './sampleClassicCharacter'
import {
  classicAutoArmorClass,
  classicCombatDisplay,
  classicDisplayAc,
  classicDisplayInitiative,
} from './classicDerivedCombat'
import type { CharacterDetail } from '../../shared/api/characters'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const sample = sampleClassic2014Character
assert(classicDisplayAc(sample) === '15', 'sample override ac=15')
assert(classicCombatDisplay(sample, 'ac') === '15', 'combatDisplay ac')

const noOverride: CharacterDetail = {
  ...sample,
  sheet: {
    ...sample.sheet,
    combat: {
      ...(sample.sheet as { combat: Record<string, unknown> }).combat,
      ac: null,
      initiative: null,
    },
    inventory: {
      coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      items: [
        {
          id: 'armor-1',
          name: 'Клёпаный кожаный',
          qty: 1,
          equipped: true,
          armor_kind: 'light',
          base_ac: 12,
          weight_lb: 13,
        },
      ],
    },
  },
}

const autoAc = classicAutoArmorClass(noOverride)
// studded leather 12 + DEX from sample (likely +2 for 14 or similar)
assert(autoAc >= 12, `auto AC from armor, got ${autoAc}`)
assert(classicDisplayAc(noOverride) === String(autoAc), 'display uses auto when null')
assert(
  classicDisplayInitiative(noOverride) !== '',
  'initiative falls back to DEX when override null',
)

console.log('classicDerivedCombat.selfcheck: ok', { autoAc })
