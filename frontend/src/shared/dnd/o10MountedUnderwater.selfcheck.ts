/**
 * O-10 selfcheck: mounted combat + underwater.
 * Run: npx --yes tsx src/shared/dnd/o10MountedUnderwater.selfcheck.ts
 */
import {
  canRedirectHitToMount,
  combineModeReasons,
  findActiveMount,
  hostIsMounted,
  isSmallerSize,
  mountSizeFromSlugOrName,
  mountedCombatantDexSaveDamage,
  mountedCombatantMeleeAdvantage,
  mountedCombatantRangedDisadvantage,
  resolveMountFallDexSave,
  underwaterAttackMode,
  underwaterFireResistanceActive,
  weaponOkUnderwaterMelee,
  weaponOkUnderwaterRanged,
  withUnderwaterFireResistance,
} from './o10MountedUnderwater.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// —— Mount detection ——
{
  const mounts = [
    {
      id: 'gear-companion:mount:1',
      name: 'Ездовая лошадь',
      active: true,
      mounted: true,
      source: { feature: 'mount:horse_riding' },
    },
    {
      id: 'other',
      name: 'Волк',
      active: true,
      mounted: false,
      source: { feature: 'beast' },
    },
  ]
  assert(findActiveMount(mounts)?.id === 'gear-companion:mount:1', 'active mount')
  assert(hostIsMounted(mounts), 'host mounted')
  assert(!hostIsMounted([{ id: 'x', mounted: false, active: true }]), 'not mounted')
  assert(mountSizeFromSlugOrName('warhorse') === 'large', 'horse large')
  assert(mountSizeFromSlugOrName('mastiff') === 'medium', 'mastiff medium')
  assert(isSmallerSize('medium', 'large'), 'medium < large')
}

// —— Mount fall Dex DC 10 ——
{
  const ok = resolveMountFallDexSave({ rollTotal: 10 })
  assert(ok.success && !ok.prone && ok.dismounted, 'dex 10 lands on feet')
  const fail = resolveMountFallDexSave({ rollTotal: 9 })
  assert(!fail.success && fail.prone && fail.dismounted, 'dex 9 prone + dismount')
}

// —— Mounted Combatant ——
{
  const adv = mountedCombatantMeleeAdvantage({
    hasFeat: true,
    mounted: true,
    meleeWeaponAttack: true,
    targetSmallerThanMount: true,
  })
  assert(adv.mode === 'advantage', 'MC melee adv vs smaller')

  const noFeat = mountedCombatantMeleeAdvantage({
    hasFeat: false,
    mounted: true,
    meleeWeaponAttack: true,
    targetSmallerThanMount: true,
  })
  assert(noFeat.mode === 'normal', 'no feat → no adv')

  const vsMounted = mountedCombatantMeleeAdvantage({
    hasFeat: true,
    mounted: true,
    meleeWeaponAttack: true,
    targetSmallerThanMount: true,
    targetMounted: true,
  })
  assert(vsMounted.mode === 'normal', 'no adv vs mounted target')

  const rangedDis = mountedCombatantRangedDisadvantage({
    hasFeat: true,
    targetMounted: true,
    rangedWeaponAttack: true,
  })
  assert(rangedDis.mode === 'disadvantage', 'Q5-A propose dis vs rider')

  const dismissed = mountedCombatantRangedDisadvantage({
    hasFeat: true,
    targetMounted: true,
    rangedWeaponAttack: true,
    dismissed: true,
  })
  assert(dismissed.mode === 'normal', 'Q5-A dismissable')

  assert(
    canRedirectHitToMount({ hasFeat: true, mounted: true, accepted: true }),
    'redirect ok',
  )
  assert(
    !canRedirectHitToMount({ hasFeat: false, mounted: true, accepted: true }),
    'redirect needs feat',
  )

  const dexOk = mountedCombatantDexSaveDamage({
    hasFeat: true,
    mounted: true,
    saveHalfOnSuccess: true,
    success: true,
    amount: 20,
  })
  assert(dexOk.amount === 0, 'MC dex success → 0')
  const dexFail = mountedCombatantDexSaveDamage({
    hasFeat: true,
    mounted: true,
    saveHalfOnSuccess: true,
    success: false,
    amount: 20,
  })
  assert(dexFail.amount === 10, 'MC dex fail → half')
}

// —— Underwater melee ——
{
  const sword = underwaterAttackMode({
    underwater: true,
    attackReach: 'melee',
    weaponName: 'Длинный меч',
    damageType: 'рубящий',
    hasSwimSpeed: false,
  })
  assert(sword.mode === 'disadvantage', 'longsword underwater dis')

  const spear = underwaterAttackMode({
    underwater: true,
    attackReach: 'melee',
    weaponName: 'Копьё',
    damageType: 'колющий',
    hasSwimSpeed: false,
  })
  assert(spear.mode === 'normal', 'spear underwater ok')

  const swim = underwaterAttackMode({
    underwater: true,
    attackReach: 'melee',
    weaponName: 'Длинный меч',
    damageType: 'рубящий',
    hasSwimSpeed: true,
  })
  assert(swim.mode === 'normal', 'swim speed clears melee dis')

  assert(weaponOkUnderwaterMelee({ weaponName: 'Кинжал' }), 'dagger ok')
  assert(!weaponOkUnderwaterMelee({ weaponName: 'Секира', damageType: 'рубящий' }), 'axe no')
}

// —— Underwater ranged ——
{
  const bow = underwaterAttackMode({
    underwater: true,
    attackReach: 'ranged',
    weaponName: 'Короткий лук',
    longRange: false,
  })
  assert(bow.mode === 'disadvantage', 'bow underwater dis')

  const bowLong = underwaterAttackMode({
    underwater: true,
    attackReach: 'ranged',
    weaponName: 'Короткий лук',
    longRange: true,
  })
  assert(bowLong.autoMiss === true, 'bow long range auto-miss')

  const xbow = underwaterAttackMode({
    underwater: true,
    attackReach: 'ranged',
    weaponName: 'Лёгкий арбалет',
    longRange: false,
  })
  assert(xbow.mode === 'normal', 'crossbow ok underwater')
  assert(weaponOkUnderwaterRanged({ weaponName: 'Сеть' }), 'net ok')
  assert(weaponOkUnderwaterRanged({ weaponName: 'Дротик' }), 'dart ok')
}

// —— Fire resistance ——
{
  assert(underwaterFireResistanceActive(true), 'fire resist when submerged')
  const rows = withUnderwaterFireResistance(
    [{ type: 'cold', nonmagical: false, sources: [] }],
    true,
  )
  assert(rows.some((r) => r.type === 'fire'), 'inject fire resist')
  const dry = withUnderwaterFireResistance(
    [{ type: 'cold', nonmagical: false, sources: [] }],
    false,
  )
  assert(!dry.some((r) => r.type === 'fire'), 'no fire when dry')
}

// —— Off mark ——
{
  const dry = underwaterAttackMode({
    underwater: false,
    attackReach: 'melee',
    weaponName: 'Длинный меч',
    damageType: 'рубящий',
  })
  assert(dry.mode === 'normal', 'mark off → normal')
}

{
  const merged = combineModeReasons(
    { mode: 'advantage', reasons: ['a'] },
    { mode: 'disadvantage', reasons: ['b'] },
  )
  assert(merged.mode === 'normal', 'adv+dis cancel')
}

console.log('o10MountedUnderwater.selfcheck: ok')
