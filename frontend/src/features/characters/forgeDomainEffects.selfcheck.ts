/**
 * Forge Domain L6/L17 combat math.
 * Run: npx tsx src/features/characters/forgeDomainEffects.selfcheck.ts
 */
import { forgeDomainAcBonus, forgeDomainDefenseLines } from './forgeDomainEffects.ts'
import { sheetDamageProfile } from './gearEffects.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

assert(
  forgeDomainAcBonus({
    features: [{ id: 'soul_of_the_forge' }],
    wearingHeavyArmor: true,
  }) === 1,
  'soul +1 AC in heavy',
)
assert(
  forgeDomainAcBonus({
    features: [{ id: 'soul_of_the_forge' }],
    wearingHeavyArmor: false,
  }) === 0,
  'soul no AC without heavy',
)

const soul = forgeDomainDefenseLines({
  features: [{ id: 'soul_of_the_forge' }],
  wearingHeavyArmor: true,
})
assert(soul.some((r) => r.type === 'огонь' && r.kind !== 'immunity'), 'soul fire resist')

const saint = forgeDomainDefenseLines({
  features: [{ id: 'soul_of_the_forge' }, { id: 'saint_of_forge_and_fire' }],
  wearingHeavyArmor: true,
})
assert(saint.some((r) => r.type === 'огонь' && r.kind === 'immunity'), 'saint fire immunity')
assert(
  saint.filter((r) => r.nonmagical).length === 3,
  'saint nonmagical B/P/S',
)

const profile = sheetDamageProfile({
  featureResistances: saint,
})
assert(profile.immunities.some((r) => r.type === 'fire'), 'profile fire immunity')
assert(
  profile.resistances.filter((r) => r.nonmagical).length >= 3,
  'profile BPS nonmagical',
)

console.log('forgeDomainEffects.selfcheck: ok')
