/**
 * B-04 acceptance numbers.
 * Run: npx tsx src/shared/dnd/b04ClassFeatures.selfcheck.ts
 */
import {
  attackBonusFromActiveEffects,
  buildBuffEffect,
  chooseTempHpPool,
  defensesFromActiveEffects,
  listRollDieChips,
  resolveAdvantageFromEffects,
  weaponBonusesFromActiveEffects,
} from './activeEffects.ts'
import { rageDamageBonus } from './b04BuffSpecs.ts'
import {
  countEquippedWeapons,
  fightingStyleDamageBonusFromIds,
} from './fightingStyles.ts'
import { symbioticTempHp } from '../../features/characters/wildShape.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

assert(rageDamageBonus(5) === 2, 'rage dmg L5 = 2')
assert(rageDamageBonus(9) === 3, 'rage dmg L9 = 3')
assert(rageDamageBonus(16) === 4, 'rage dmg L16 = 4')

// Barbarian 5 STR greataxe: rage → +2 melee STR damage, B/P/S resist, STR save adv.
{
  const rage = buildBuffEffect({
    name: 'Ярость',
    slug: 'rage',
    classLevel: 5,
  })!
  assert(rage.slug === 'rage', 'rage slug')
  const dmg = weaponBonusesFromActiveEffects([rage], { melee: true, ability: 'str' })
  assert(dmg.damage === 2, `rage +2 dmg got ${dmg.damage}`)
  const ranged = weaponBonusesFromActiveEffects([rage], { melee: false, ability: 'str' })
  assert(ranged.damage === 0, 'rage no ranged dmg')
  const dexMelee = weaponBonusesFromActiveEffects([rage], { melee: true, ability: 'dex' })
  assert(dexMelee.damage === 0, 'rage no dex melee dmg')
  const resists = defensesFromActiveEffects([rage])
  assert(
    resists.some((r) => r.type === 'slashing' && r.kind === 'resistance'),
    'rage slash resist',
  )
  assert(
    !resists.some((r) => r.type === 'fire'),
    'rage no fire resist',
  )
  assert(
    resolveAdvantageFromEffects([rage], { rollKind: 'save', abilityKey: 'str' }) ===
      'advantage',
    'rage STR save adv',
  )
  assert(
    resolveAdvantageFromEffects([rage], { rollKind: 'check', abilityKey: 'athletics' }) ===
      'advantage',
    'rage athletics adv',
  )
  assert(
    resolveAdvantageFromEffects([rage], { rollKind: 'check', abilityKey: 'stealth' }) ===
      'normal',
    'rage no stealth adv',
  )
}

// Bear totem rage: resist fire, not psychic.
{
  const bear = buildBuffEffect({
    name: 'Ярость',
    slug: 'rage',
    classLevel: 3,
    option: 'bear',
  })!
  const resists = defensesFromActiveEffects([bear])
  assert(
    resists.some((r) => r.type === 'fire' && r.kind === 'resistance'),
    'bear fire resist',
  )
  assert(
    !resists.some((r) => r.type === 'psychic'),
    'bear no psychic resist',
  )
}

// Bardic Inspiration → ally chip 1d8 once.
{
  const bi = buildBuffEffect({
    name: 'Бардовское вдохновение',
    slug: 'bardic_inspiration',
    option: '1d8',
  })!
  const chips = listRollDieChips([bi], 'attack')
  assert(chips.length >= 1 && chips[0]!.dice === '1d8', 'BI attack d8')
  assert(chips[0]!.once === true, 'BI once')
  const saveChips = listRollDieChips([bi], 'save')
  assert(saveChips.some((c) => c.dice === '1d8'), 'BI save d8')
}

// Dueling +2 one-handed melee, not with second weapon.
{
  assert(
    fightingStyleDamageBonusFromIds({
      styleIds: ['dueling'],
      oneHandedMelee: true,
      holdingAnotherWeapon: false,
    }) === 2,
    'dueling +2',
  )
  assert(
    fightingStyleDamageBonusFromIds({
      styleIds: ['dueling'],
      oneHandedMelee: true,
      holdingAnotherWeapon: true,
    }) === 0,
    'dueling blocked by second weapon',
  )
  assert(
    countEquippedWeapons([
      { equipped: true, weapon_grip: 'one_hand', name: 'Длинный меч' },
      { equipped: true, armor_kind: 'shield', name: 'Щит' },
    ]) === 1,
    'shield not a weapon',
  )
}

// Symbiotic temp HP 4×level + replace dialog + necrotic rider.
{
  assert(symbioticTempHp(2) === 8, 'spores 2 → 8 temp')
  assert(chooseTempHpPool(5, 8, 'replace') === 8, 'replace highlights 8')
  assert(chooseTempHpPool(5, 8, 'keep') === 5, 'keep 5')
  const sym = buildBuffEffect({
    name: 'Симбиотическая сущность',
    slug: 'symbiotic_entity',
    classLevel: 2,
  })!
  const riders = listRollDieChips([sym], 'damage')
  assert(
    riders.some((c) => c.dice === '1d6'),
    'symbiotic 1d6 necrotic rider',
  )
}

// Guided Strike +10 attack.
{
  const gs = buildBuffEffect({ name: 'Направленный удар', slug: 'guided_strike' })!
  assert(attackBonusFromActiveEffects([gs]) === 10, 'guided strike +10')
}

// Empty Body resists (not force).
{
  const empty = buildBuffEffect({ name: 'Пустое тело', slug: 'empty_body' })!
  const resists = defensesFromActiveEffects([empty])
  assert(resists.some((r) => r.type === 'fire'), 'empty body fire')
  assert(!resists.some((r) => r.type === 'force'), 'empty body no force')
}

// Fighting Spirit temp + weapon attack adv.
{
  const fs = buildBuffEffect({
    name: 'Боевой дух',
    slug: 'fighting_spirit',
    classLevel: 5,
  })!
  assert(
    resolveAdvantageFromEffects([fs], { rollKind: 'attack' }) === 'advantage',
    'fighting spirit attack adv',
  )
}

console.log('b04ClassFeatures.selfcheck: ok')
