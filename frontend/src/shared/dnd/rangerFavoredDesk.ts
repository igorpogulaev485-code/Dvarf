import {
  getFeaturePickList,
  type FeaturePicksState,
} from './featurePicks'
import {
  RANGER_FAVORED_ENEMIES,
  RANGER_FAVORED_TERRAINS,
} from './rangerChoices'

export type RangerFavoredRow = {
  id: string
  nameRu: string
  kind: 'enemy' | 'terrain'
}

/** Known favored enemies from feature_picks (feature id favored_enemy). */
export function listKnownFavoredEnemies(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): RangerFavoredRow[] {
  const ids = getFeaturePickList(featurePicks, classEntryId, 'favored_enemy')
  const rows: RangerFavoredRow[] = []
  for (const id of ids) {
    const def = RANGER_FAVORED_ENEMIES.find((row) => row.id === id)
    rows.push({
      id,
      nameRu: def?.nameRu ?? id,
      kind: 'enemy',
    })
  }
  return rows
}

/** Known favored terrains (stored under feature id natural_explorer). */
export function listKnownFavoredTerrains(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): RangerFavoredRow[] {
  const ids = getFeaturePickList(featurePicks, classEntryId, 'natural_explorer')
  const rows: RangerFavoredRow[] = []
  for (const id of ids) {
    const def = RANGER_FAVORED_TERRAINS.find((row) => row.id === id)
    rows.push({
      id,
      nameRu: def?.nameRu ?? id,
      kind: 'terrain',
    })
  }
  return rows
}
