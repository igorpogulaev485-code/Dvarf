/**
 * B-08 acceptance selfcheck (race resists, flight gate, buff specs).
 * Run: npx tsx src/shared/dnd/b08Races.selfcheck.ts
 */
import { adjustIncomingDamage } from './damageTypes.ts'
import { buildBuffEffect } from './activeEffects.ts'
import {
  applyHalflingLuckyReroll,
  rollCheck,
} from '../../features/characters/deskRolls.ts'
import { sheetDamageProfile } from '../../features/characters/gearEffects.ts'
import {
  racialFlyBlockedByArmor,
  resolveDisplayFlySpeed,
  raceSaveAdvantageSources,
  isHalflingLuckyRace,
  hasRelentlessEndurance,
  hungryJawsTempHp,
  shifterTempHp,
  healingHandsDiceCount,
} from './b08RaceCombat.ts'
import { resolveB08FeatureSpend } from '../../features/characters/b08FeatureSpend.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// —— B29: flight blocked in medium/heavy ——
assert(racialFlyBlockedByArmor('medium'), 'medium blocks')
assert(racialFlyBlockedByArmor('heavy'), 'heavy blocks')
assert(!racialFlyBlockedByArmor('light'), 'light ok')
{
  const blocked = resolveDisplayFlySpeed({
    baseFly: 30,
    walkSpeed: 30,
    armorKind: 'heavy',
    applyArmorGate: true,
  })
  assert(blocked.fly === 0, `chain mail fly 0 got ${blocked.fly}`)
  assert(
    Boolean(blocked.note && /полёт недоступен/i.test(blocked.note)),
    'note present',
  )
  const free = resolveDisplayFlySpeed({
    baseFly: 30,
    walkSpeed: 30,
    armorKind: null,
    applyArmorGate: true,
  })
  assert(free.fly === 30, `no armor fly 30 got ${free.fly}`)
  const eepc = resolveDisplayFlySpeed({
    baseFly: 50,
    walkSpeed: 25,
    armorKind: 'medium',
    applyArmorGate: true,
  })
  assert(eepc.fly === 0, 'eepc 50 gated to 0')
}

// —— B30: dwarf/tiefling/dragonborn resists ——
{
  const dwarf = sheetDamageProfile({
    raceSlug: 'hill_dwarf',
    raceResistances: ['яд'],
  })
  const dmg = adjustIncomingDamage({
    amount: 10,
    type: 'poison',
    profile: dwarf,
  })
  assert(dmg.amount === 5, `dwarf 10 poison → 5 got ${dmg.amount}`)

  const tiefling = sheetDamageProfile({ raceSlug: 'tiefling' })
  const fire = adjustIncomingDamage({
    amount: 10,
    type: 'fire',
    profile: tiefling,
  })
  assert(fire.amount === 5, `tiefling 10 fire → 5 got ${fire.amount}`)

  const blue = sheetDamageProfile({
    raceSlug: 'dragonborn',
    ancestryDamage: 'электричество',
  })
  const bolt = adjustIncomingDamage({
    amount: 10,
    type: 'lightning',
    profile: blue,
  })
  assert(bolt.amount === 5, `blue dragonborn 10 lightning → 5 got ${bolt.amount}`)
}

{
  const adv = raceSaveAdvantageSources({ slug: 'stout_halfling', parentSlug: 'halfling' })
  assert(adv.some((row) => /испуг|отравления/i.test(row.noteRu)), 'stout brave+poison notes')
  const gnome = raceSaveAdvantageSources({ slug: 'rock_gnome', parentSlug: 'gnome' })
  assert(
    gnome.some((row) => /хитрость/i.test(row.labelRu) || /Инт\/Муд\/Хар/i.test(row.noteRu)),
    'gnome cunning',
  )
}

// —— B31: Lucky / Relentless / spends ——
assert(isHalflingLuckyRace('lightfoot_halfling'), 'halfling lucky')
assert(hasRelentlessEndurance('half_orc'), 'half-orc relentless')
assert(hasRelentlessEndurance('orc'), 'orc relentless')
{
  const nat1 = rollCheck(2, 'normal', () => 0) // always 1
  assert(nat1.die === 1, 'forced nat 1')
  const reroll = applyHalflingLuckyReroll(nat1, () => 0.99) // → 20
  assert(reroll.die === 20, `halfling reroll got ${reroll.die}`)
  assert(/удача/i.test(reroll.featLabel || ''), 'label')
}

assert(hungryJawsTempHp(3) === 3, 'hungry jaws')
assert(shifterTempHp(3) === 6, 'shifting 2×PB')
assert(healingHandsDiceCount(4) === 4, 'healing hands dice')

{
  const fx = buildBuffEffect({
    slug: 'celestial_revelation',
    option: 'heavenly_wings',
    casterMod: 3,
    classLevel: 5,
  })
  assert(fx?.kind === 'race', 'revelation kind race')
  assert(
    fx?.mods.some((m) => m.target === 'fly_speed' && m.condition === 'equal_walk'),
    'revelation fly',
  )
  const merge = buildBuffEffect({ slug: 'merge_with_stone' })
  assert(merge?.mods.some((m) => m.target === 'check' && m.value === 10), 'merge +10 stealth')
  const spent = buildBuffEffect({ slug: 'relentless_endurance_spent' })
  assert(spent?.slug === 'relentless_endurance_spent', 'relentless spent marker')
}

{
  const heal = resolveB08FeatureSpend({
    featureId: 'race:healing_hands',
    featureNameRu: 'Исцеляющие руки',
    proficiencyBonus: 3,
    rng: () => 0, // all 1s → 3
  })
  assert(heal.kind === 'heal' && heal.amount === 3, `healing hands heal got ${JSON.stringify(heal)}`)
  const stone = resolveB08FeatureSpend({
    featureId: 'stones_endurance',
    featureNameRu: 'Каменная стойкость',
  })
  assert(stone.kind === 'buff' && stone.slug === 'stones_endurance', 'stones spend')
}

console.log('b08Races.selfcheck: ok')
