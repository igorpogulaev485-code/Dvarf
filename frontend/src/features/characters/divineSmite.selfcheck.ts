/**
 * Run: npx --yes tsx --tsconfig tsconfig.app.json src/features/characters/divineSmite.selfcheck.ts
 */
import { unlockFeaturesForClasses } from '../../shared/dnd/classFeatures.ts'
import { rollDamage } from './deskRolls.ts'
import {
  decideSmiteSlotClick,
  divineSmiteDice,
  divineSmiteSpendOf,
  formatDivineSmiteExtra,
  isMeleeWeaponAttackName,
} from './divineSmite.ts'
import { improvedDivineSmiteRider } from './featureCombatBonuses.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const spend = {
  label_ru: 'Божественная кара',
  min_slot: 1,
  max_slot: 5,
  dice_base: 2,
  dice_per_slot_above: 1,
  dice_cap: 5,
  dice_size: 8,
}

const slot1 = divineSmiteDice({ spend, slotLevel: 1, vsUndeadOrFiend: false })
assert(slot1.slotDice === 2 && slot1.totalDice === 2 && slot1.formulaRu === '2к8', 'slot 1 is 2d8')
const slot4 = divineSmiteDice({ spend, slotLevel: 4, vsUndeadOrFiend: false })
const slot5 = divineSmiteDice({ spend, slotLevel: 5, vsUndeadOrFiend: false })
assert(slot4.slotDice === 5 && slot5.slotDice === 5, 'slots 4 and 5 are both 5d8')
const slot5Fiend = divineSmiteDice({ spend, slotLevel: 5, vsUndeadOrFiend: true })
assert(
  slot5Fiend.slotDice === 5 && slot5Fiend.undeadDice === 1 && slot5Fiend.totalDice === 6,
  'slot 5 vs undead is 6d8, cap stays 5',
)
const slot1Undead = divineSmiteDice({ spend, slotLevel: 1, vsUndeadOrFiend: true })
assert(slot1Undead.totalDice === 3, 'slot 1 vs undead is 3d8')

assert(isMeleeWeaponAttackName('Длинный меч'), 'longsword is melee')
assert(isMeleeWeaponAttackName('Булава'), 'mace is melee')
assert(isMeleeWeaponAttackName('Копьё'), 'spear in melee is a melee attack')
assert(isMeleeWeaponAttackName('Безоружный удар'), 'unarmed is a melee weapon attack')
assert(!isMeleeWeaponAttackName('Длинный лук'), 'longbow is ranged')
assert(!isMeleeWeaponAttackName('Лёгкий арбалет'), 'crossbow is ranged')
assert(!isMeleeWeaponAttackName('Дротик'), 'dart is ranged')
assert(!isMeleeWeaponAttackName('Метательное копьё'), 'javelin thrown is ranged')
assert(!isMeleeWeaponAttackName(''), 'blank name is not a melee attack')

assert(
  decideSmiteSlotClick({
    slotLevel: 1,
    armedSlot: null,
    open: { melee: true, smiteApplied: false },
    slotAvailable: true,
  }).action === 'apply',
  'melee hit spends',
)
assert(
  decideSmiteSlotClick({
    slotLevel: 1,
    armedSlot: 1,
    open: null,
    slotAvailable: true,
  }).action === 'disarm',
  'no hit only toggles the circle',
)
assert(
  decideSmiteSlotClick({
    slotLevel: 1,
    armedSlot: null,
    open: null,
    slotAvailable: true,
  }).action === 'arm',
  'preparing a circle does not spend',
)
const ranged = decideSmiteSlotClick({
  slotLevel: 1,
  armedSlot: null,
  open: { melee: false, smiteApplied: false },
  slotAvailable: true,
})
assert(ranged.action === 'refuse' && ranged.reason === 'ranged', 'ranged refuses')
const empty = decideSmiteSlotClick({
  slotLevel: 5,
  armedSlot: null,
  open: { melee: true, smiteApplied: false },
  slotAvailable: false,
})
assert(empty.action === 'refuse' && empty.reason === 'no_slot', 'empty slot refuses')
const twice = decideSmiteSlotClick({
  slotLevel: 2,
  armedSlot: null,
  open: { melee: true, smiteApplied: true },
  slotAvailable: true,
})
assert(twice.action === 'refuse' && twice.reason === 'already', 'one smite per hit')

const line = formatDivineSmiteExtra({
  spend,
  slotLevel: 1,
  vsUndeadOrFiend: false,
  crit: false,
  rng: (() => {
    const values = [0, 0.5]
    let i = 0
    return () => values[i++] ?? 0
  })(),
})
assert(
  line.includes('+ 6 излучением') && line.includes('Божественная кара, 2к8') && line.includes('2d8: 1+5'),
  `smite line got: ${line}`,
)
const critLine = formatDivineSmiteExtra({
  spend,
  slotLevel: 1,
  vsUndeadOrFiend: false,
  crit: true,
  rng: (() => {
    const values = [0, 0.25, 0.5, 0.75]
    let i = 0
    return () => values[i++] ?? 0
  })(),
})
assert(critLine.includes('4d8:') && critLine.includes('крит'), `crit smite got: ${critLine}`)
const fiendLine = formatDivineSmiteExtra({
  spend,
  slotLevel: 5,
  vsUndeadOrFiend: true,
  crit: false,
  rng: () => 0,
})
assert(
  fiendLine.includes('6к8') && fiendLine.includes('нежить/исчадие') && fiendLine.includes('6d8:'),
  `fiend smite got: ${fiendLine}`,
)

const critDice = rollDamage('1d8', () => 0, { crit: true })
assert(critDice != null && critDice.parts.length === 2, 'improved smite die doubles on a crit')

assert(
  improvedDivineSmiteRider([{ id: 'divine_strike_life', classLevel: 8 } as { id: string }]) ==
    null,
  'cleric divine strike is not improved smite',
)
const improved = improvedDivineSmiteRider([{ id: 'improved_divine_smite' }])
assert(improved?.dice === '1d8' && improved.type === 'излучением', 'improved rider is 1d8 radiant')
assert(
  divineSmiteSpendOf([{ id: 'divine_smite', slot_spend: spend }])?.dice_cap === 5,
  'feature exposes the smite spend',
)
assert(divineSmiteSpendOf([{ id: 'lay_on_hands' }]) == null, 'paladin 1 has no smite control')

function paladinFeatures(level: number) {
  return unlockFeaturesForClasses({
    classes: [
      {
        id: 'pal',
        name: 'Паладин',
        catalog_id: null,
        level,
        subclass_name: '',
        subclass_catalog_id: null,
      },
    ],
    characterLevel: level,
  })
}
assert(!paladinFeatures(1).some((row) => row.id === 'divine_smite'), 'paladin 1 has no smite')
assert(paladinFeatures(2).some((row) => row.id === 'divine_smite'), 'paladin 2 unlocks smite')
assert(
  !paladinFeatures(10).some((row) => row.id === 'improved_divine_smite'),
  'improved smite starts at 11',
)
assert(
  paladinFeatures(11).some((row) => row.id === 'improved_divine_smite'),
  'paladin 11 has improved smite',
)
assert(
  paladinFeatures(20).find((row) => row.id === 'divine_smite')?.slot_spend?.max_slot === 5,
  'level 20 still offers a 5th-level slot',
)

console.log('divineSmite.selfcheck: ok')
