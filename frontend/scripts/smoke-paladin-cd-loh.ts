/**
 * Smoke: Paladin Channel Divinity options + Lay on Hands pool size.
 * Run: npx tsx scripts/smoke-paladin-cd-loh.ts
 */
import { unlockFeaturesForClasses } from '../src/shared/dnd/classFeatures'
import { listChannelDivinityOptions } from '../src/shared/dnd/channelDivinitySpend'
import { desiredResourcesFromFeatures } from '../src/shared/dnd/featureResources'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const entryId = 'p1'
const unlocked = unlockFeaturesForClasses({
  classes: [
    {
      id: entryId,
      name: 'Паладин',
      catalog_id: null,
      level: 5,
      subclass_name: 'Клятва преданности',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 5,
  abilities: { cha: 16 },
  subclassSlugByEntryId: { [entryId]: 'oath_of_devotion' },
})

const cdOpts = listChannelDivinityOptions(unlocked, entryId)
assert(
  cdOpts.some((f) => f.id === 'cd_sacred_weapon'),
  'sacred weapon',
)
assert(
  cdOpts.some((f) => f.id === 'cd_turn_the_unholy'),
  'turn the unholy',
)
assert(
  !cdOpts.some((f) => f.id === 'channel_divinity_paladin'),
  'tracker must not be listed as an option',
)
assert(
  !cdOpts.some((f) => f.id === 'channel_divinity'),
  'cleric tracker id must not appear',
)

const desired = desiredResourcesFromFeatures({
  features: unlocked,
  characterLevel: 5,
  abilities: { cha: 16 },
  classSlugByEntryId: { [entryId]: 'paladin' },
})
const cd = desired.find((r) => r.id.includes(':channel_divinity:'))
assert(cd, 'CD pool')
assert(cd.max === 1, `paladin CD max 1, got ${cd.max}`)
assert(cd.reset === 'short', `CD short rest, got ${cd.reset}`)

const loh = desired.find((r) => r.id.includes(':lay_on_hands:'))
assert(loh, 'Lay on Hands pool')
assert(loh.max === 25, `L5 LoH = 25, got ${loh.max}`)
assert(loh.reset === 'long', `LoH long rest, got ${loh.reset}`)

// Cleric still lists Turn Undead, not tracker
const cleric = unlockFeaturesForClasses({
  classes: [
    {
      id: 'c1',
      name: 'Жрец',
      catalog_id: null,
      level: 2,
      subclass_name: 'Домен жизни',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 2,
  subclassSlugByEntryId: { c1: 'life_domain' },
})
const clericOpts = listChannelDivinityOptions(cleric, 'c1')
assert(
  clericOpts.some((f) => f.id === 'turn_undead' || f.name_ru.includes('нежит')),
  'cleric turn undead still listed',
)
assert(
  !clericOpts.some((f) => f.id === 'channel_divinity'),
  'cleric tracker excluded',
)

console.log('smoke-paladin-cd-loh: ok', {
  paladinCd: cdOpts.map((f) => f.name_ru),
  lohMax: loh.max,
  clericCd: clericOpts.map((f) => f.name_ru),
})
