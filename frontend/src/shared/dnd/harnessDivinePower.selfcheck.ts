/**
 * Harness Divine Power (Праведное восстановление) rules + CD dialog / amulet path.
 * Run: npx tsx src/shared/dnd/harnessDivinePower.selfcheck.ts
 */
import { unlockFeaturesForClasses } from './classFeatures.ts'
import { listChannelDivinityOptions } from './channelDivinitySpend.ts'
import {
  desiredResourcesFromFeatures,
  featureResourceId,
  syncFeatureResources,
} from './featureResources.ts'
import {
  applyHarnessDivinePower,
  harnessDivinePowerDailyUses,
  harnessDivinePowerSlotCap,
  HARNESS_DIVINE_POWER_FEATURE_ID,
  HARNESS_DIVINE_POWER_POOL_ID,
  spentSlotLevels,
} from './harnessDivinePower.ts'
import type { SheetResource } from './rest.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// --- daily table ---
assert(harnessDivinePowerDailyUses('cleric', 2) === 1, 'cleric 2 → 1')
assert(harnessDivinePowerDailyUses('cleric', 5) === 1, 'cleric 5 → 1')
assert(harnessDivinePowerDailyUses('cleric', 6) === 2, 'cleric 6 → 2')
assert(harnessDivinePowerDailyUses('cleric', 18) === 3, 'cleric 18 → 3')
assert(harnessDivinePowerDailyUses('paladin', 3) === 1, 'paladin 3 → 1')
assert(harnessDivinePowerDailyUses('paladin', 7) === 2, 'paladin 7 → 2')
assert(harnessDivinePowerDailyUses('paladin', 15) === 3, 'paladin 15 → 3')
assert(harnessDivinePowerDailyUses('cleric', 1) === 0, 'cleric 1 → 0')
assert(harnessDivinePowerDailyUses('wizard', 10) === 0, 'wizard → 0')

// --- slot cap = ceil(PB/2) ---
assert(harnessDivinePowerSlotCap(2) === 1, 'pb 2 cap 1')
assert(harnessDivinePowerSlotCap(3) === 2, 'pb 3 cap 2')
assert(harnessDivinePowerSlotCap(5) === 3, 'pb 5 cap 3')
assert(harnessDivinePowerSlotCap(6) === 3, 'pb 6 cap 3')

function unlockCleric(level: number, entryId = 'c1') {
  return unlockFeaturesForClasses({
    classes: [
      {
        id: entryId,
        name: 'Жрец',
        catalog_id: null,
        level,
        subclass_name: 'Домен жизни',
        subclass_catalog_id: null,
      },
    ],
    characterLevel: level,
    subclassSlugByEntryId: { [entryId]: 'life_domain' },
  })
}

function unlockPaladin(level: number, entryId = 'p1') {
  return unlockFeaturesForClasses({
    classes: [
      {
        id: entryId,
        name: 'Паладин',
        catalog_id: null,
        level,
        subclass_name: 'Клятва преданности',
        subclass_catalog_id: null,
      },
    ],
    characterLevel: level,
    abilities: { cha: 16 },
    subclassSlugByEntryId: { [entryId]: 'oath_of_devotion' },
  })
}

function assertDailyMax(classSlug: string, level: number, expected: number) {
  const unlocked =
    classSlug === 'cleric' ? unlockCleric(level) : unlockPaladin(level)
  const entryId = classSlug === 'cleric' ? 'c1' : 'p1'
  const desired = desiredResourcesFromFeatures({
    features: unlocked,
    characterLevel: level,
    abilities: { cha: 16 },
    classSlugByEntryId: { [entryId]: classSlug },
  })
  const daily = desired.find((r) =>
    r.id.includes(`:${HARNESS_DIVINE_POWER_POOL_ID}:`),
  )
  assert(daily, `${classSlug} L${level} daily pool`)
  assert(
    daily.max === expected,
    `${classSlug} L${level} daily max ${expected}, got ${daily.max}`,
  )
  assert(daily.reset === 'long', `${classSlug} daily is long rest`)
}

assertDailyMax('cleric', 2, 1)
assertDailyMax('cleric', 5, 1)
assertDailyMax('cleric', 6, 2)
assertDailyMax('cleric', 18, 3)
assertDailyMax('paladin', 3, 1)
assertDailyMax('paladin', 7, 2)
assertDailyMax('paladin', 15, 3)

// HDP appears in class CD options and amulet (null entry) options
{
  const unlocked = unlockCleric(2)
  const classOpts = listChannelDivinityOptions(unlocked, 'c1')
  assert(
    classOpts.some((f) => f.id === HARNESS_DIVINE_POWER_FEATURE_ID),
    'HDP in class CD dialog',
  )
  const amuletOpts = listChannelDivinityOptions(unlocked, null)
  assert(
    amuletOpts.some((f) => f.id === HARNESS_DIVINE_POWER_FEATURE_ID),
    'HDP in amulet CD view',
  )
}

// sync clamps spent when max shrinks (e.g. old PB-tied sheets → table max)
{
  const unlocked = unlockCleric(5)
  const desired = desiredResourcesFromFeatures({
    features: unlocked,
    characterLevel: 5,
    classSlugByEntryId: { c1: 'cleric' },
  })
  const dailyId = featureResourceId('cleric', HARNESS_DIVINE_POWER_POOL_ID, 'c1')
  const existing: SheetResource[] = [
    {
      id: dailyId,
      name: 'Праведное восстановление',
      max: 3, // old PB max
      used: 3,
      reset: 'long',
    },
  ]
  const synced = syncFeatureResources(existing, desired)
  const daily = synced.find((r) => r.id === dailyId)
  assert(daily?.max === 1, 'sync recomputes max to 1 at cleric 5')
  assert(daily?.used === 1, 'sync clamps used to new max')
}

function baseResources(input: {
  classSlug: string
  entryId: string
  channelMax: number
  dailyMax: number
  channelUsed?: number
  dailyUsed?: number
  gearChannelId?: string
}): SheetResource[] {
  const rows: SheetResource[] = [
    {
      id: featureResourceId(input.classSlug, 'channel_divinity', input.entryId),
      name: 'Божественный канал',
      max: input.channelMax,
      used: input.channelUsed ?? 0,
      reset: 'short',
    },
    {
      id: featureResourceId(input.classSlug, HARNESS_DIVINE_POWER_POOL_ID, input.entryId),
      name: 'Праведное восстановление',
      max: input.dailyMax,
      used: input.dailyUsed ?? 0,
      reset: 'long',
    },
  ]
  if (input.gearChannelId) {
    rows.push({
      id: input.gearChannelId,
      name: 'Амулет благочестия · Божественный канал',
      max: 1,
      used: 0,
      reset: 'long',
    })
  }
  return rows
}

function hdpFeature(unlocked: ReturnType<typeof unlockCleric>) {
  const feature = unlocked.find((f) => f.id === HARNESS_DIVINE_POWER_FEATURE_ID)
  assert(feature, 'HDP feature unlocked')
  return feature
}

// happy path: class CD + daily + slot
{
  const unlocked = unlockCleric(6)
  const feature = hdpFeature(unlocked)
  const resources = baseResources({
    classSlug: 'cleric',
    entryId: 'c1',
    channelMax: 2,
    dailyMax: 2,
  })
  const slots = { '1': { max: 4, used: 1 }, '2': { max: 3, used: 0 } }
  const channelId = featureResourceId('cleric', 'channel_divinity', 'c1')
  const result = applyHarnessDivinePower({
    resources,
    slots,
    channelResourceId: channelId,
    feature,
    classSlug: 'cleric',
    slotLevel: 1,
    proficiencyBonus: 3,
  })
  assert(result.ok, 'apply ok')
  if (result.ok) {
    assert(result.slots['1']?.used === 0, 'slot restored')
    const channel = result.resources.find((r) => r.id === channelId)
    const daily = result.resources.find((r) =>
      r.id.includes(`:${HARNESS_DIVINE_POWER_POOL_ID}:`),
    )
    assert(channel?.used === 1, 'class CD spent')
    assert(daily?.used === 1, 'daily spent')
  }
}

// blocked: 0 channel left
{
  const unlocked = unlockCleric(2)
  const feature = hdpFeature(unlocked)
  const resources = baseResources({
    classSlug: 'cleric',
    entryId: 'c1',
    channelMax: 1,
    dailyMax: 1,
    channelUsed: 1,
  })
  const result = applyHarnessDivinePower({
    resources,
    slots: { '1': { max: 4, used: 1 } },
    channelResourceId: featureResourceId('cleric', 'channel_divinity', 'c1'),
    feature,
    classSlug: 'cleric',
    slotLevel: 1,
    proficiencyBonus: 2,
  })
  assert(!result.ok, '0 channel blocked')
}

// blocked: no expended slot
{
  const unlocked = unlockCleric(2)
  const feature = hdpFeature(unlocked)
  const resources = baseResources({
    classSlug: 'cleric',
    entryId: 'c1',
    channelMax: 1,
    dailyMax: 1,
  })
  const result = applyHarnessDivinePower({
    resources,
    slots: { '1': { max: 4, used: 0 } },
    channelResourceId: featureResourceId('cleric', 'channel_divinity', 'c1'),
    feature,
    classSlug: 'cleric',
    slotLevel: 1,
    proficiencyBonus: 2,
  })
  assert(!result.ok, 'no expended slot blocked')
}

// blocked: slot above cap
{
  const unlocked = unlockCleric(2)
  const feature = hdpFeature(unlocked)
  const resources = baseResources({
    classSlug: 'cleric',
    entryId: 'c1',
    channelMax: 1,
    dailyMax: 1,
  })
  const slots = { '1': { max: 4, used: 0 }, '2': { max: 3, used: 1 } }
  assert(spentSlotLevels(slots, 1).length === 0, 'cap 1 hides circle 2')
  const result = applyHarnessDivinePower({
    resources,
    slots,
    channelResourceId: featureResourceId('cleric', 'channel_divinity', 'c1'),
    feature,
    classSlug: 'cleric',
    slotLevel: 2,
    proficiencyBonus: 2, // cap 1
  })
  assert(!result.ok, 'over cap blocked')
}

// multiclass: spends the correct class CD pool
{
  const cleric = unlockCleric(6, 'c1')
  const paladin = unlockPaladin(3, 'p1')
  const feature = hdpFeature(cleric)
  const resources = [
    ...baseResources({
      classSlug: 'cleric',
      entryId: 'c1',
      channelMax: 2,
      dailyMax: 2,
    }),
    ...baseResources({
      classSlug: 'paladin',
      entryId: 'p1',
      channelMax: 1,
      dailyMax: 1,
    }),
  ]
  const clericCd = featureResourceId('cleric', 'channel_divinity', 'c1')
  const paladinCd = featureResourceId('paladin', 'channel_divinity', 'p1')
  const result = applyHarnessDivinePower({
    resources,
    slots: { '1': { max: 4, used: 1 } },
    channelResourceId: clericCd,
    feature,
    classSlug: 'cleric',
    slotLevel: 1,
    proficiencyBonus: 4,
  })
  assert(result.ok, 'multiclass cleric HDP ok')
  if (result.ok) {
    assert(
      result.resources.find((r) => r.id === clericCd)?.used === 1,
      'cleric CD spent',
    )
    assert(
      result.resources.find((r) => r.id === paladinCd)?.used === 0,
      'paladin CD untouched',
    )
  }
  // amulet options include both classes' HDP
  const both = [...cleric, ...paladin]
  const amuletOpts = listChannelDivinityOptions(both, null)
  assert(
    amuletOpts.filter((f) => f.id === HARNESS_DIVINE_POWER_FEATURE_ID).length === 2,
    'amulet lists HDP for cleric and paladin',
  )
}

// amulet / gear free Channel Divinity charge: HDP available and spends gear pool
{
  const unlocked = unlockCleric(2)
  const feature = hdpFeature(unlocked)
  const gearId = 'gear-res:amulet1:channel_divinity'
  const resources = baseResources({
    classSlug: 'cleric',
    entryId: 'c1',
    channelMax: 1,
    dailyMax: 1,
    gearChannelId: gearId,
  })
  const amuletOpts = listChannelDivinityOptions(unlocked, null)
  assert(
    amuletOpts.some((f) => f.id === HARNESS_DIVINE_POWER_FEATURE_ID),
    'HDP listed for amulet CD view',
  )
  const classCd = featureResourceId('cleric', 'channel_divinity', 'c1')
  const result = applyHarnessDivinePower({
    resources,
    slots: { '1': { max: 4, used: 2 } },
    channelResourceId: gearId,
    feature,
    classSlug: 'cleric',
    slotLevel: 1,
    proficiencyBonus: 2,
  })
  assert(result.ok, 'amulet HDP apply ok')
  if (result.ok) {
    assert(result.resources.find((r) => r.id === gearId)?.used === 1, 'amulet CD spent')
    assert(
      result.resources.find((r) => r.id === classCd)?.used === 0,
      'class CD not spent when using amulet',
    )
    assert(
      result.resources.find((r) => r.id.includes(`:${HARNESS_DIVINE_POWER_POOL_ID}:`))
        ?.used === 1,
      'daily still spent with amulet',
    )
    assert(result.slots['1']?.used === 1, 'slot restored via amulet path')
  }
}

console.log('harnessDivinePower.selfcheck: ok')
