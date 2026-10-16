import type { UnlockedFeature } from './classFeatures'

/** Class/subclass feature ids that only define the shared CD pool (not options). */
const CHANNEL_DIVINITY_TRACKERS = new Set([
  'channel_divinity',
  'channel_divinity_paladin',
])

/**
 * Domain / oath Channel Divinity options for one class entry.
 * Shared by Cleric and Paladin (same pool_id).
 */
export function listChannelDivinityOptions(
  features: UnlockedFeature[],
  classEntryId: string,
): UnlockedFeature[] {
  return features.filter((feature) => {
    if (feature.classEntryId !== classEntryId) return false
    if (feature.resource?.pool_id !== 'channel_divinity') return false
    if (CHANNEL_DIVINITY_TRACKERS.has(feature.id)) return false
    return true
  })
}
