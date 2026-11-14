/**
 * HOT-01: one card per class pool — absorb seed/manual duplicates + collapse
 * same classSlug+poolId across class/domain feature rows.
 * Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/featureResources.syncDedup.selfcheck.ts
 */
import assert from 'node:assert/strict'
import {
  collapseSameClassPools,
  syncFeatureResources,
  type DesiredFeatureResource,
} from './featureResources.ts'
import type { SheetResource } from './rest.ts'

function desired(
  partial: Pick<DesiredFeatureResource, 'id' | 'name'> &
    Partial<DesiredFeatureResource>,
): DesiredFeatureResource {
  return {
    max: 1,
    reset: 'short',
    track: 'spend',
    classSlug: 'cleric',
    classLabelRu: 'Жрец',
    ...partial,
  }
}

const collapsed = collapseSameClassPools([
  desired({
    id: 'feat:cleric:channel_divinity:entry-class',
    name: 'Божественный канал',
    max: 1,
  }),
  desired({
    id: 'feat:cleric:channel_divinity:entry-domain',
    name: 'Божественный канал',
    max: 2,
  }),
  desired({
    id: 'feat:cleric:wrath_of_the_storm:entry-domain',
    name: 'Гнев бури',
    max: 3,
  }),
])

assert.equal(collapsed.length, 2)
const channel = collapsed.find((r) => r.name === 'Божественный канал')
assert.ok(channel)
assert.equal(channel?.id, 'feat:cleric:channel_divinity:entry-class')
assert.equal(channel?.max, 2)

const existing: SheetResource[] = [
  {
    id: 'wrath',
    name: 'Гнев бури',
    max: 3,
    used: 1,
    reset: 'short',
  },
  {
    id: 'channel',
    name: 'Божественный канал',
    max: 1,
    used: 0,
    reset: 'short',
  },
  {
    id: 'manual-other',
    name: 'Зелье',
    max: 2,
    used: 0,
    reset: 'manual',
  },
]

const synced = syncFeatureResources(existing, [
  desired({
    id: 'feat:cleric:wrath_of_the_storm:c1',
    name: 'Гнев бури',
    max: 3,
  }),
  desired({
    id: 'feat:cleric:channel_divinity:c1',
    name: 'Божественный канал',
    max: 1,
  }),
  desired({
    id: 'feat:cleric:channel_divinity:domain',
    name: 'Божественный канал',
    max: 2,
  }),
])

const names = synced.map((r) => r.name).sort()
assert.deepEqual(names, ['Божественный канал', 'Гнев бури', 'Зелье'])
const wrath = synced.find((r) => r.name === 'Гнев бури')
assert.ok(wrath?.id.startsWith('feat:'))
assert.equal(wrath?.used, 1)
assert.equal(synced.filter((r) => r.name === 'Божественный канал').length, 1)

const fighterSeed: SheetResource[] = [
  { id: 'sd', name: 'Превосходство', max: 4, used: 1, reset: 'short' },
]
const fighterSynced = syncFeatureResources(fighterSeed, [
  desired({
    id: 'feat:fighter:superiority_dice:f1',
    name: 'Кости превосходства',
    max: 4,
    classSlug: 'fighter',
    classLabelRu: 'Воин',
  }),
])
assert.equal(fighterSynced.length, 1)
assert.equal(fighterSynced[0]?.name, 'Кости превосходства')
assert.equal(fighterSynced[0]?.used, 1)

console.log('featureResources.syncDedup.selfcheck: ok')
