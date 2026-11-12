/**
 * B-06 acceptance numbers (artificer infusions + duration potions).
 * Run: npx tsx src/shared/dnd/b06ArtificerPotions.selfcheck.ts
 */
import {
  abilityFloorsFromActiveEffects,
  applySpeedModsToWalk,
  buildBuffEffect,
  defensesFromActiveEffects,
  listRollDieChips,
  speedModsFromActiveEffects,
  weaponBonusesFromActiveEffects,
} from './activeEffects.ts'
import {
  defensiveFieldTempHp,
  giantStrengthFloor,
  protectorCannonTempHp,
} from './b06BuffSpecs.ts'
import { buildPotionBuffEffect } from './b06PotionBuffs.ts'
import { infusionShareMods } from './infusionEffects.ts'
import type { ActiveInfusionBinding } from './infusionsActive.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

// Giant strength floors.
assert(giantStrengthFloor('potion_of_giant_strength') === 21, 'hill 21')
assert(giantStrengthFloor('frost') === 23, 'frost 23')
assert(giantStrengthFloor('potion_of_giant_strength_storm') === 29, 'storm 29')

{
  const fx = buildPotionBuffEffect({
    catalogId: 'potion_of_giant_strength',
    name: 'Зелье силы холмового великана',
  })!
  assert(fx.kind === 'item', 'potion kind item')
  const floors = abilityFloorsFromActiveEffects([fx])
  assert(floors.str === 21, `str floor 21 got ${floors.str}`)
}

{
  const warriorStr = 14
  const fx = buildPotionBuffEffect({
    catalogId: 'potion_of_giant_strength_hill',
  })!
  const floors = abilityFloorsFromActiveEffects([fx])
  const effective = Math.max(warriorStr, floors.str ?? 0)
  assert(effective === 21, 'warrior 14 → 21')
  const mod = Math.floor((effective - 10) / 2)
  assert(mod === 5, 'str mod +5')
  // Longsword attack: proficiency 3 + str 5 = +8; damage 1d8+5
  assert(3 + mod === 8, 'attack +8')
}

{
  const hero = buildPotionBuffEffect({ catalogId: 'potion_of_heroism' })!
  const temp = hero.mods?.find((m) => m.target === 'temp_hp')
  assert(temp?.value === 10, 'heroism 10 temp')
  assert(hero.linked_concentration === false, 'heroism no conc')
  const chips = listRollDieChips([hero], 'attack')
  assert(chips.some((c) => c.dice === '1d4'), 'heroism 1d4 chip')
}

{
  const speed = buildPotionBuffEffect({ catalogId: 'potion_of_speed' })!
  assert(speed.linked_concentration === false, 'speed potion no conc')
  const mods = speedModsFromActiveEffects([speed])
  assert(mods.walkMul === 2, 'speed ×2')
  const ac = speed.mods?.find((m) => m.target === 'ac')
  assert(ac?.value === 2, 'speed +2 AC')
}

{
  const fly = buildPotionBuffEffect({ catalogId: 'potion_of_flying' })!
  const mods = speedModsFromActiveEffects([fly])
  assert(mods.flyEqualWalk === true, 'fly = walk')
  const walk = applySpeedModsToWalk(30, mods)
  assert(walk === 30, 'walk unchanged by fly potion')
}

{
  const climb = buildPotionBuffEffect({ catalogId: 'potion_of_climbing' })!
  const mods = speedModsFromActiveEffects([climb])
  assert(mods.climbEqualWalk === true, 'climb = walk')
}

{
  const resist = buildPotionBuffEffect({
    catalogId: 'potion_of_resistance_fire',
  })!
  const defs = defensesFromActiveEffects([resist])
  assert(
    defs.some((d) => d.type === 'fire' && d.kind !== 'immunity'),
    'fire resist',
  )
}

{
  const resilience = buildBuffEffect({
    slug: 'experimental_elixir_resilience',
    name: 'Экспериментальный эликсир (устойчивость)',
  })!
  assert(resilience.mods?.some((m) => m.target === 'ac' && m.value === 1), '+1 AC')
  // Р9: same slug stacks to strongest — applyEffectStacking keeps one.
}

{
  const field = buildBuffEffect({
    slug: 'defensive_field',
    classLevel: 7,
  })!
  assert(defensiveFieldTempHp(7) === 7, 'defensive field 7')
  const temp = field.mods?.find((m) => m.target === 'temp_hp')
  assert(temp?.value === 7, 'field temp = level')
}

assert(protectorCannonTempHp(4, () => 0) === 1 + 4, 'protector min path')

// Enhanced weapon share mods: artificer 10 → +2; artificer 6 → +1.
{
  const binding: ActiveInfusionBinding = {
    infusionId: 'enhanced_weapon',
    target: 'ally-1',
    itemId: 'sword',
  }
  const at10 = infusionShareMods(binding, 10)
  assert(
    at10.some((m) => m.target === 'weapon_attack' && m.value === 2),
    'enhanced weapon +2 at 10',
  )
  const at6 = infusionShareMods(binding, 6)
  assert(
    at6.some((m) => m.target === 'weapon_attack' && m.value === 1),
    'enhanced weapon +1 at 6',
  )
  // Ally sheet: Str 16 (+3) + PB 3 + infusion 2 = +8 attack; damage 1d8+5
  const w = weaponBonusesFromActiveEffects([
    {
      id: '1',
      name: 'Усиленное оружие',
      kind: 'infusion',
      slug: 'enhanced_weapon',
      mods: at10,
    },
  ])
  assert(w.attack === 2 && w.damage === 2, 'ally weapon +2/+2')
  assert(3 + 3 + w.attack === 8, 'warrior attack +8')
  assert(3 + w.damage === 5, 'damage mod +5')
}

{
  const binding: ActiveInfusionBinding = {
    infusionId: 'arcane_propulsion_armor',
    target: 'self',
  }
  const mods = infusionShareMods(binding, 14)
  assert(
    mods.some((m) => m.target === 'speed' && m.value === 5),
    'propulsion +5 ft',
  )
  assert(applySpeedModsToWalk(25, { walkBonusFt: 5, walkMul: 1, flySpeedFt: null, flyEqualWalk: false, climbEqualWalk: false, climbSpeedFt: null, notes: [] }) === 30, 'dwarf 25→30')
  assert(applySpeedModsToWalk(30, { walkBonusFt: 5, walkMul: 1, flySpeedFt: null, flyEqualWalk: false, climbEqualWalk: false, climbSpeedFt: null, notes: [] }) === 35, 'human 30→35')
}

{
  const binding: ActiveInfusionBinding = {
    infusionId: 'resistant_armor',
    target: 'ally',
    option: 'fire',
  }
  const mods = infusionShareMods(binding, 6)
  assert(
    mods.some((m) => m.target === 'resistance' && m.condition === 'fire'),
    'resistant armor fire',
  )
}

{
  const binding: ActiveInfusionBinding = {
    infusionId: 'helm_of_awareness',
    target: 'self',
  }
  const mods = infusionShareMods(binding, 10)
  assert(
    mods.some(
      (m) =>
        (m.target === 'advantage' || m.op === 'advantage') &&
        m.condition === 'initiative',
    ),
    'helm initiative adv',
  )
}

{
  const fog = buildBuffEffect({
    slug: 'flash_of_genius',
    casterMod: 4,
  })!
  assert(
    fog.mods?.some((m) => m.target === 'check' && m.value === 4 && m.once),
    'flash +Int once',
  )
}

{
  const mind = buildPotionBuffEffect({ catalogId: 'potion_of_mind_reading' })!
  assert(mind.duration?.unit === 'minutes' && mind.duration.value === 1, 'mind read 1 min')
}

console.log('b06ArtificerPotions.selfcheck: ok')
