/**
 * P24-M01: weapon mastery selfcheck.
 * Run: npx --yes tsx src/shared/dnd/weaponMastery.selfcheck.ts
 */
import {
  WEAPON_MASTERY_DICTIONARY,
  WEAPON_MASTERY_IDS,
  applyMasteryProperty,
  characterHasWeaponMastery,
  countChangedWeapons,
  hasTacticalMaster,
  markLongRestWeaponMasterySwap,
  masteryLimitForClass,
  masteryPropertyNameRu,
  resolveActiveMasteryBudget,
  resolveEffectiveMasteryProperty,
  toppleSaveDc,
  WEAPON_MASTERY_CLASS_RULES,
} from './weaponMastery.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(WEAPON_MASTERY_IDS.length === 8, '8 mastery ids')
assert(WEAPON_MASTERY_DICTIONARY.length === 8, '8 dictionary rows')
assert(masteryPropertyNameRu('nick') === 'Засечка', 'nick ru')
assert(masteryPropertyNameRu('topple') === 'Опрокидывание', 'topple ru')

{
  const f = WEAPON_MASTERY_CLASS_RULES.fighter
  assert(masteryLimitForClass(f, 1) === 3, 'fighter L1 = 3')
  assert(masteryLimitForClass(f, 16) === 6, 'fighter L16 = 6')
  assert(WEAPON_MASTERY_CLASS_RULES.barbarian.meleeOnly, 'barb melee only')
  assert(WEAPON_MASTERY_CLASS_RULES.rogue.changeAfterLongRest === 'all', 'rogue swap all')
}

{
  const { rule, limit } = resolveActiveMasteryBudget(
    [
      { name: 'Боец', level: 1 },
      { name: 'Плут', level: 1 },
    ],
  )
  assert(rule?.slug === 'fighter' && limit === 3, 'multiclass picks highest')
  const rogue = resolveActiveMasteryBudget(
    [
      { name: 'fighter', level: 1 },
      { name: 'rogue', level: 1 },
    ],
    'rogue',
  )
  assert(rogue.rule?.slug === 'rogue' && rogue.limit === 2, 'source_class override')
}

assert(characterHasWeaponMastery('2014', [{ name: 'fighter', level: 5 }]) === false, '2014 off')
assert(characterHasWeaponMastery('2024', [{ name: 'wizard', level: 5 }]) === false, 'wizard 0')
assert(characterHasWeaponMastery('2024', [{ name: 'fighter', level: 1 }]) === true, 'fighter on')

assert(hasTacticalMaster([{ name: 'fighter', level: 9 }]), 'TM 9')
assert(!hasTacticalMaster([{ name: 'fighter', level: 8 }]), 'TM not 8')

assert(
  resolveEffectiveMasteryProperty({
    weaponSlug: 'greataxe',
    known: ['greataxe'],
    weaponMastery: 'cleave',
    tacticalMaster: true,
    substitute: 'sap',
  }) === 'sap',
  'tactical substitute',
)

assert(countChangedWeapons(['a', 'b', 'c'], ['a', 'b', 'd']) === 1, 'swap one')
assert(countChangedWeapons(['a', 'b'], ['c', 'd']) === 2, 'swap two')

{
  const rest = markLongRestWeaponMasterySwap({
    known: ['longsword'],
    sourceClass: 'fighter',
    baseline: ['longsword'],
    swapAvailable: false,
  })
  assert(rest.swapAvailable, 'rest opens swap')
}

{
  const nick = applyMasteryProperty('nick', { hit: true })
  assert(nick.applied && nick.effects.consumes_bonus_action === false, 'nick no bonus')
  const nick2 = applyMasteryProperty('nick', { hit: true, nickAlreadyUsed: true })
  assert(!nick2.applied, 'nick once')
  const graze = applyMasteryProperty('graze', { hit: false, attackAbilityMod: 4 })
  assert(graze.applied && graze.effects.graze_damage === 4, 'graze dmg')
  const topple = applyMasteryProperty('topple', {
    hit: true,
    attackAbilityMod: 3,
    proficiencyBonus: 2,
  })
  assert(topple.applied && toppleSaveDc(3, 2) === 13, 'topple dc')
  assert((topple.effects.save as { dc: number }).dc === 13, 'topple effect dc')
  for (const id of WEAPON_MASTERY_IDS) {
    const hit = id === 'graze' ? false : true
    const damageDealt = id === 'slow' || id === 'vex' ? true : hit
    const r = applyMasteryProperty(id, {
      hit,
      damageDealt,
      attackAbilityMod: 2,
      proficiencyBonus: 2,
    })
    assert(r.applied, `${id} applies`)
    assert(r.nameRu, `${id} has ru name`)
  }
}

console.log('weaponMastery.selfcheck: ok')
