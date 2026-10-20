/**
 * Lightweight self-check: npx --yes tsx src/shared/dnd/classMovement.selfcheck.ts
 * Run from frontend/.
 */
import { classWalkSpeedBonusFt, resolveWalkSpeedFt } from './classMovement'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

assert(
  classWalkSpeedBonusFt({
    classes: [{ name: 'Варвар', level: 4 }],
    wearingHeavyArmor: false,
  }) === 0,
  'barbarian L4 no Fast Movement',
)
assert(
  classWalkSpeedBonusFt({
    classes: [{ name: 'Варвар', level: 5 }],
    wearingHeavyArmor: false,
  }) === 10,
  'barbarian L5 Fast Movement +10',
)
assert(
  classWalkSpeedBonusFt({
    classes: [{ name: 'Варвар', level: 10 }],
    wearingHeavyArmor: true,
  }) === 0,
  'barbarian heavy armor blocks Fast Movement',
)
assert(
  classWalkSpeedBonusFt({
    classes: [{ name: 'Монах', level: 6 }],
    wearingArmorOrShield: false,
  }) === 15,
  'monk L6 unarmored +15',
)
assert(
  classWalkSpeedBonusFt({
    classes: [{ name: 'Монах', level: 20 }],
    wearingArmorOrShield: false,
  }) === 30,
  'monk L20 unarmored +30',
)
assert(
  classWalkSpeedBonusFt({
    classes: [{ name: 'Монах', level: 10 }],
    wearingArmorOrShield: true,
  }) === 0,
  'monk armor/shield blocks Unarmored Movement',
)

assert(
  resolveWalkSpeedFt({
    storedSpeed: 30,
    raceSpeed: 30,
    classBonusFt: 10,
    classBonusFtMax: 10,
  }) === 40,
  'unfixed create: race stored + class bonus',
)
assert(
  resolveWalkSpeedFt({
    storedSpeed: 40,
    raceSpeed: 30,
    classBonusFt: 10,
    classBonusFtMax: 10,
  }) === 40,
  'baked create / manual FM: no double count',
)
assert(
  resolveWalkSpeedFt({
    storedSpeed: 40,
    raceSpeed: 30,
    classBonusFt: 0,
    classBonusFtMax: 10,
  }) === 30,
  'heavy armor: strip baked Fast Movement',
)
assert(
  resolveWalkSpeedFt({
    storedSpeed: 35,
    raceSpeed: 30,
    classBonusFt: 10,
    classBonusFtMax: 10,
  }) === 35,
  'manual override kept',
)
assert(
  resolveWalkSpeedFt({
    storedSpeed: null,
    raceSpeed: 30,
    classBonusFt: 10,
    classBonusFtMax: 10,
    gearBonusFt: 5,
  }) === 45,
  'null stored derives race + class + gear',
)

// Mobile (+10) baked into stored=40 must still add monk Unarmored Movement.
assert(
  resolveWalkSpeedFt({
    storedSpeed: 40,
    raceSpeed: 30,
    classBonusFt: 30,
    classBonusFtMax: 30,
    featBonusFt: 10,
  }) === 70,
  'human + Mobile + monk L20 = 70',
)
assert(
  resolveWalkSpeedFt({
    storedSpeed: 70,
    raceSpeed: 30,
    classBonusFt: 30,
    classBonusFtMax: 30,
    featBonusFt: 10,
  }) === 70,
  'fully baked race+feat+class strips cleanly',
)
assert(
  resolveWalkSpeedFt({
    storedSpeed: 40,
    raceSpeed: 30,
    classBonusFt: 0,
    classBonusFtMax: 30,
    featBonusFt: 10,
  }) === 40,
  'armor blocks monk bonus; keep race+Mobile',
)

console.log('classMovement.selfcheck: ok')
