/**
 * npx tsx src/features/characters/gearAbility.selfcheck.ts
 * Run from frontend/.
 */
import { constitutionHpDelta } from '../../shared/dnd/constitutionHp.ts'
import { passiveScore, skillModifierFromState } from '../../shared/dnd/passives.ts'
import { abilityModifier } from './sheetTypes.ts'
import { createInventoryItem, type InventoryItem } from './inventory.ts'
import { createAttunementSlot } from './attunement.ts'
import {
  aggregateGearEffects,
  applyGearAbilityScores,
  type AggregatedGearEffects,
} from './gearEffects.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

function gearItem(
  partial: Partial<InventoryItem> & Pick<InventoryItem, 'name' | 'effects'>,
): InventoryItem {
  return {
    ...createInventoryItem(),
    equipped: true,
    requires_attunement: true,
    ...partial,
  }
}

function scoresOf(items: InventoryItem[], base = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }) {
  const attunements = items.map((item) =>
    createAttunementSlot({ item_id: item.id, name: item.name }),
  )
  const gear = aggregateGearEffects({ items, attunements })
  return applyGearAbilityScores(base, gear)
}

const gauntlets = gearItem({
  name: 'Рукавицы силы огра',
  effects: [{ type: 'ability_score', ability: 'str', value: 19 }],
})
const hill = gearItem({
  name: 'Пояс силы холмового великана',
  effects: [{ type: 'ability_score', ability: 'str', value: 21 }],
})
const headband = gearItem({
  name: 'Обруч интеллекта',
  effects: [{ type: 'ability_score', ability: 'int', value: 19 }],
})
const amulet = gearItem({
  name: 'Амулет здоровья',
  effects: [{ type: 'ability_score', ability: 'con', value: 19 }],
})
const ioun = gearItem({
  name: 'Камень Иоун (силы)',
  effects: [{ type: 'ability_mod', ability: 'str', value: 2, max: 20 }],
})

assert(scoresOf([gauntlets], { str: 15, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }).str === 19, 'str 15 + gauntlets = 19')
assert(scoresOf([gauntlets], { str: 20, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }).str === 20, 'str 20 + gauntlets stays 20')
assert(scoresOf([gauntlets, hill], { str: 15, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }).str === 21, 'gauntlets then belt = 21')
assert(scoresOf([hill, gauntlets], { str: 15, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }).str === 21, 'belt then gauntlets = 21')

const intScore = scoresOf([headband], { str: 10, dex: 10, con: 10, int: 8, wis: 10, cha: 10 }).int
assert(intScore === 19, 'int 8 + headband = 19')
const investigation = passiveScore(
  skillModifierFromState({
    abilityMod: abilityModifier(intScore),
    proficiencyBonus: 2,
    isProficient: true,
    isExpertise: false,
  }),
)
assert(investigation === 16, 'passive investigation from int 19 (+4) and prof +2')

const conScore = scoresOf([amulet], { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }).con
assert(conScore === 19, 'con 10 + amulet = 19')
assert(
  constitutionHpDelta({
    previousMod: abilityModifier(10),
    nextMod: abilityModifier(conScore),
    levelCount: 5,
  }) === 20,
  'hp +4 per level',
)

assert(scoresOf([ioun], { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }).str === 20, 'ioun +2 caps at 20')
assert(scoresOf([ioun], { str: 21, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }).str === 21, 'ioun cap does not lower 21')
assert(scoresOf([ioun, hill], { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }).str === 21, 'ioun then belt floor 21')

const shared = applyGearAbilityScores(
  { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  { abilityScores: { str: 19 }, abilityMods: {}, abilityModCaps: [] } as Pick<
    AggregatedGearEffects,
    'abilityScores' | 'abilityMods' | 'abilityModCaps'
  >,
  { str: 21 },
)
assert(shared.str === 21, 'item floor and infusion floor take the max')

console.log('gearAbility.selfcheck: ok')
