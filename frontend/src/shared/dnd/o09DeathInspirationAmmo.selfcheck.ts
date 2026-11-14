/**
 * O-09 selfcheck: death saves, inspiration spend, ammo consume.
 * Run: npx --yes tsx src/shared/dnd/o09DeathInspirationAmmo.selfcheck.ts
 */
import {
  ammoKindForWeapon,
  ammoKindOfStack,
  applyDamageAtZeroHp,
  canSpendInspirationForAdvantage,
  isSpareTheDyingSpell,
  itemHasRepeatingShot,
  listMatchingAmmoStacks,
  medicineStabilizes,
  mergeInspirationAdvantage,
  resolveAmmoConsume,
  resolveDeathSaveRoll,
  stabilizePlayPatch,
  weaponIsThrownStack,
  weaponNeedsAmmunition,
} from './o09DeathInspirationAmmo.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// —— Death save table: 1, 9, 10, 20 ——
{
  const nat1 = resolveDeathSaveRoll(1, 0, 0)
  assert(nat1.fails === 2 && !nat1.revived && !nat1.stabilized, 'nat 1 → two fails')
  const nat1Dead = resolveDeathSaveRoll(1, 0, 1)
  assert(nat1Dead.dead && nat1Dead.fails === 3, 'nat 1 with 1 fail → dead')

  const nine = resolveDeathSaveRoll(9, 0, 0)
  assert(nine.fails === 1 && nine.successes === 0, '9 → one fail')

  const ten = resolveDeathSaveRoll(10, 0, 0)
  assert(ten.successes === 1 && ten.fails === 0, '10 → one success')
  const threeOk = resolveDeathSaveRoll(15, 2, 1)
  assert(threeOk.stabilized && threeOk.successes === 0 && threeOk.fails === 0, '3rd success stabilizes')

  const twenty = resolveDeathSaveRoll(20, 2, 2)
  assert(twenty.revived && twenty.successes === 0 && twenty.fails === 0, '20 → revive')
}

// —— Damage at 0 → +1 fail; crit → +2; ≥ max → instant ——
{
  const hit = applyDamageAtZeroHp({ damageToHp: 4, hpMax: 20, deathFails: 0 })
  assert(hit.failDelta === 1 && hit.deathFails === 1 && !hit.instantDeath, 'dmg at 0 → +1')
  const crit = applyDamageAtZeroHp({
    damageToHp: 4,
    hpMax: 20,
    isCritical: true,
    deathFails: 0,
  })
  assert(crit.failDelta === 2 && crit.deathFails === 2, 'crit at 0 → +2')
  const massive = applyDamageAtZeroHp({ damageToHp: 20, hpMax: 20, deathFails: 0 })
  assert(massive.instantDeath && massive.deathFails === 3, '≥ max HP → instant death')
}

assert(medicineStabilizes(10), 'medicine 10 ok')
assert(!medicineStabilizes(9), 'medicine 9 fail')
assert(stabilizePlayPatch().isDying === false, 'stabilize clears dying')

// —— Inspiration ——
{
  assert(canSpendInspirationForAdvantage(true, 'normal').ok, 'insp spend on normal')
  assert(!canSpendInspirationForAdvantage(true, 'advantage').ok, 'no waste on adv')
  assert(!canSpendInspirationForAdvantage(false, 'normal').ok, 'no insp')
  assert(mergeInspirationAdvantage('normal') === 'advantage', 'merge normal→adv')
  assert(mergeInspirationAdvantage('disadvantage') === 'normal', 'merge dis→normal')
}

// —— Ammo ——
{
  assert(weaponNeedsAmmunition({ name: 'Короткий лук', catalogSlug: 'shortbow' }), 'bow needs ammo')
  assert(ammoKindForWeapon({ catalogSlug: 'shortbow' }) === 'arrow', 'shortbow → arrow')
  assert(ammoKindForWeapon({ catalogSlug: 'crossbow_light' }) === 'crossbow_bolt', 'xbow → bolt')
  assert(!weaponNeedsAmmunition({ name: 'Длинный меч', catalogSlug: 'longsword' }), 'sword no ammo')
  assert(
    weaponIsThrownStack({ name: 'Ручной топор', catalogSlug: 'handaxe', qty: 2 }),
    'handaxe stack thrown',
  )
  assert(!weaponIsThrownStack({ name: 'Длинный меч', catalogSlug: 'longsword' }), 'sword not thrown stack')

  const items = [
    { id: 'a1', name: 'Стрелы', qty: 20, base_ammo_slug: 'arrow' as string | null },
    { id: 'a2', name: 'Стрелы +1', qty: 5, base_ammo_slug: 'arrow' as string | null },
    { id: 'b1', name: 'Арбалетные болты', qty: 0, base_ammo_slug: 'crossbow_bolt' as string | null },
  ]
  assert(ammoKindOfStack(items[0]) === 'arrow', 'stack kind arrow')
  assert(listMatchingAmmoStacks(items, 'arrow').length === 2, 'two arrow stacks')
  assert(
    ammoKindOfStack({ id: 'bow', name: 'Короткий лук', qty: 1, catalog_slug: 'shortbow' }) == null,
    'launcher shortbow is not an ammo stack',
  )
  assert(
    listMatchingAmmoStacks(
      [
        ...items,
        { id: 'bow', name: 'Короткий лук', qty: 1, catalog_slug: 'shortbow' as string | null },
      ],
      'arrow',
    ).length === 2,
    'bow excluded from arrow stacks',
  )

  const shot = resolveAmmoConsume({
    needsAmmo: true,
    boundItemId: 'a1',
    items,
    ammoKind: 'arrow',
  })
  assert(shot.ok && shot.spend && shot.nextQty === 19, 'bound arrows 20→19')

  const empty = resolveAmmoConsume({
    needsAmmo: true,
    boundItemId: 'b1',
    items,
    ammoKind: 'crossbow_bolt',
  })
  assert(!empty.ok && empty.needPick, 'empty bolts block')

  const unbound = resolveAmmoConsume({
    needsAmmo: true,
    boundItemId: null,
    items: [{ id: 'a1', name: 'Стрелы', qty: 20, base_ammo_slug: 'arrow' }],
    ammoKind: 'arrow',
  })
  assert(unbound.ok && unbound.spend && unbound.itemId === 'a1', 'single stack auto-bind')

  const magic = resolveAmmoConsume({
    needsAmmo: true,
    repeatingShot: true,
    boundItemId: 'b1',
    items,
    ammoKind: 'crossbow_bolt',
  })
  assert(magic.ok && !magic.spend && /магический/.test(magic.note), 'repeating_shot no spend')

  assert(
    itemHasRepeatingShot(
      [{ infusionId: 'repeating_shot', itemId: 'xbow' }],
      'xbow',
    ),
    'repeating shot binding',
  )
  assert(
    isSpareTheDyingSpell({ name: 'Уход за умирающим' }),
    'spare the dying name',
  )
}

console.log('o09DeathInspirationAmmo.selfcheck: ok')
