/**
 * Pack 03: domains, oaths, conclaves.
 * Run: npx tsx src/shared/dnd/pack03DomainOath.selfcheck.ts
 */

import { slotSpendDiceCount } from './classFeatures.ts'
import { domainChannelEffect } from './domainChannelEffect.ts'
import { RANGER_FIGHTING_STYLES, fightingStyleById } from './fightingStyles.ts'
import {
  harnessDivinePowerDailyUses,
  harnessDivinePowerSlotCap,
  restoreOneSpentSlot,
  spentSlotLevels,
} from './harnessDivinePower.ts'
import { ironMindSaveKey, wisdomSaveAlreadyGranted } from './featureSaveProficiency.ts'
import { canCastPreparedSpellAsRitual } from './ritualCasting.ts'
import { resolveCastTiming } from './upcastDuration.ts'
import { divineStrikeRider } from '../../features/characters/featureCombatBonuses.ts'
import {
  applyForgeBlessing,
  listForgeBlessingCandidates,
  stripForgeBlessing,
} from '../../features/characters/forgeBlessing.ts'
import { createInventoryItem } from '../../features/characters/inventory.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(harnessDivinePowerSlotCap(2) === 1, 'pb 2 cap 1')
assert(harnessDivinePowerSlotCap(3) === 2, 'pb 3 cap 2')
assert(harnessDivinePowerSlotCap(5) === 3, 'pb 5 cap 3')
assert(harnessDivinePowerSlotCap(6) === 3, 'pb 6 cap 3')
assert(harnessDivinePowerDailyUses('cleric', 6) === 2, 'cleric 6 daily 2')
assert(harnessDivinePowerDailyUses('paladin', 15) === 3, 'paladin 15 daily 3')
{
  const slots = { '1': { max: 4, used: 2 }, '2': { max: 3, used: 0 }, '3': { max: 2, used: 1 } }
  assert(spentSlotLevels(slots, 2).join() === '1', 'cap 2 hides circle 3')
  const restored = restoreOneSpentSlot(slots, 1, 2)
  assert(restored.ok && restored.slots['1']?.used === 1, 'slot 1 restored')
  assert(!restoreOneSpentSlot(slots, 3, 2).ok, 'over cap refused')
}

assert(
  slotSpendDiceCount(
    {
      label_ru: 'Божественная кара',
      min_slot: 1,
      max_slot: 5,
      dice_base: 2,
      dice_per_slot_above: 1,
      dice_cap: 5,
      dice_size: 8,
    },
    5,
  ) === 5,
  'smite 5th slot is still 5d8',
)
assert(
  slotSpendDiceCount(
    {
      label_ru: 'Божественная кара',
      min_slot: 1,
      max_slot: 5,
      dice_base: 2,
      dice_per_slot_above: 1,
      dice_cap: 5,
      dice_size: 8,
    },
    4,
  ) === 5,
  'smite 4th slot is 5d8',
)

assert(
  !canCastPreparedSpellAsRitual({
    ritual: true,
    level: 1,
    classSlug: 'paladin',
    casterSlugs: ['paladin'],
  }),
  'paladin detect magic is not a ritual cast',
)
assert(
  canCastPreparedSpellAsRitual({
    ritual: true,
    level: 1,
    classSlug: 'cleric',
    casterSlugs: ['cleric'],
  }),
  'cleric ritual stays available',
)

{
  const ninth = resolveCastTiming({
    name: 'Проклятие',
    catalogId: 'bestow_curse',
    duration: 'Концентрация, вплоть до 1 минуты',
    concentration: true,
    slotLevel: 9,
  })
  assert(ninth.duration === 'Пока не развеют' && !ninth.concentration, 'bestow curse 9')
  const base = resolveCastTiming({
    name: 'Проклятие',
    duration: 'Концентрация, вплоть до 1 минуты',
    concentration: true,
    slotLevel: 3,
  })
  assert(base.concentration && base.duration.includes('1 минуты'), 'bestow curse base keeps concentration')
}

{
  const twilight = divineStrikeRider([{ id: 'divine_strike_twilight', classLevel: 14 }])
  assert(twilight?.dice === '2d8' && twilight.type === 'излучением', 'twilight 14 is 2d8 radiant')
  assert(twilight.label.includes('2к8'), 'twilight label shows 2d8')
  const war = divineStrikeRider([{ id: 'divine_strike_war', classLevel: 8 }])
  assert(war?.dice === '1d8' && war.type == null, 'war strike matches the weapon')
}

assert(domainChannelEffect('cd_invoke_duplicity')?.concentration, 'duplicity concentrates')
assert(
  domainChannelEffect('cd_cloak_of_shadows')?.detail(6).includes('Невидимость'),
  'cloak describes invisibility',
)
assert(
  domainChannelEffect('steps_of_night')?.detail(6).includes('Полёт'),
  'steps of night describes flight',
)
assert(
  domainChannelEffect('cd_twilight_sanctuary')?.detail(17).includes('полуукрытии'),
  'sanctuary at 17 mentions half cover',
)
assert(
  domainChannelEffect('cd_peerless_athlete')?.detail(3).includes('10 мин'),
  'peerless athlete is 10 minutes',
)

assert(RANGER_FIGHTING_STYLES.includes('druidic_warrior'), 'ranger styles include druidic warrior')
assert(fightingStyleById('druidic_warrior')?.nameRu === 'Воин-друид', 'druidic warrior label')

assert(
  !wisdomSaveAlreadyGranted({ classes: [{ name: 'Следопыт' }] }),
  'ranger does not start with wisdom saves',
)
assert(
  ironMindSaveKey({ alreadyHasWisdom: false, pick: 'intelligence' }) === 'wis',
  'missing wisdom is granted even if a pick exists',
)
assert(
  wisdomSaveAlreadyGranted({ classes: [{ name: 'Жрец' }] }),
  'cleric already has wisdom',
)
assert(
  ironMindSaveKey({ alreadyHasWisdom: true, pick: 'charisma' }) === 'cha',
  'existing wisdom offers charisma',
)

{
  const mace = {
    ...createInventoryItem(),
    id: 'mace',
    name: 'Булава',
    weapon_grip: 'one_hand' as const,
  }
  const plate = {
    ...createInventoryItem(),
    id: 'plate',
    name: 'Латы',
    armor_kind: 'heavy' as const,
  }
  const magic = {
    ...createInventoryItem(),
    id: 'plus',
    name: 'Меч +1',
    weapon_grip: 'one_hand' as const,
  }
  const candidates = listForgeBlessingCandidates([mace, plate, magic])
  assert(candidates.some((row) => row.id === 'mace' && row.kind === 'weapon'), 'mace is a weapon')
  assert(candidates.some((row) => row.id === 'plate' && row.kind === 'armor'), 'plate is armor')
  assert(!candidates.some((row) => row.id === 'plus'), 'magic weapon is excluded')
  const applied = applyForgeBlessing([mace, plate], 'mace')
  assert(applied.ok, 'blessing applies')
  if (applied.ok) {
    const attack = applied.items[0]?.effects?.find((row) => row.type === 'attack_bonus')
    assert(attack && 'value' in attack && attack.value === 1, 'weapon +1 attack')
    const stripped = stripForgeBlessing(applied.items)
    assert(stripped.changed, 'long rest strips the blessing')
    assert(!stripped.items[0]?.effects?.some((row) => row.type === 'attack_bonus'), 'bonus gone')
  }
}

console.log('pack03DomainOath.selfcheck: ok')
