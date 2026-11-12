import type { UnlockedFeature } from './classFeatures'
import { isHarnessDivinePowerFeature } from './harnessDivinePower'

/** Class/subclass feature ids that only define the shared CD pool (not options). */
const CHANNEL_DIVINITY_TRACKERS = new Set([
  'channel_divinity',
  'channel_divinity_paladin',
])

/**
 * Domain / oath Channel Divinity options + Harness Divine Power.
 * Pass `classEntryId` for a class pool; omit / null for gear free-charges
 * (Amulet of the Devout) — then all unlocked CD options across classes.
 *
 * HDP keeps its own daily pool (`harness_divine_power`) but still appears here
 * so it can be used from the Channel Divinity dialog and item CD views.
 */
export function listChannelDivinityOptions(
  features: UnlockedFeature[],
  classEntryId?: string | null,
): UnlockedFeature[] {
  const entryId = classEntryId?.trim() || null
  return features.filter((feature) => {
    if (entryId && feature.classEntryId !== entryId) return false
    if (CHANNEL_DIVINITY_TRACKERS.has(feature.id)) return false
    if (isHarnessDivinePowerFeature(feature)) return true
    if (feature.resource?.pool_id !== 'channel_divinity') return false
    return true
  })
}
