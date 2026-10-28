import type { UnlockedFeature } from './classFeatures'

/** Class/subclass feature ids that only define the shared CD pool (not options). */
const CHANNEL_DIVINITY_TRACKERS = new Set([
  'channel_divinity',
  'channel_divinity_paladin',
])

/**
 * Domain / oath Channel Divinity options.
 * Pass `classEntryId` for a class pool; omit / null for gear free-charges
 * (Amulet of the Devout) — then all unlocked CD options across classes.
 */
export function listChannelDivinityOptions(
  features: UnlockedFeature[],
  classEntryId?: string | null,
): UnlockedFeature[] {
  const entryId = classEntryId?.trim() || null
  return features.filter((feature) => {
    if (entryId && feature.classEntryId !== entryId) return false
    if (feature.resource?.pool_id !== 'channel_divinity') return false
    if (CHANNEL_DIVINITY_TRACKERS.has(feature.id)) return false
    return true
  })
}
