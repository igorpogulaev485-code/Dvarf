import type { CatalogEntry } from '../../shared/api/catalog'
import {
  formatRaceApplySummary,
  mergeRaceLanguages,
  resolveRaceEffects,
  upsertRaceTraitsBlock,
  type RaceEffectData,
} from '../../shared/dnd/race'
import type { IdentityExtras } from './identity'
import type { TextBlock } from './textBlocks'

export type RaceApplyResult = {
  speed: number
  identity: IdentityExtras
  textBlocks: TextBlock[]
  size: string
  summary: string
  effects: RaceEffectData
}

export function applyRaceCatalogToDraft(input: {
  selected: CatalogEntry
  identity: IdentityExtras
  textBlocks: TextBlock[]
  previousRaceLanguages: string[]
}): RaceApplyResult | null {
  const effects = resolveRaceEffects({
    slug: input.selected.slug,
    data: input.selected.data,
  })
  if (!effects) return null

  const languages = mergeRaceLanguages({
    current: input.identity.languages,
    previousApplied: input.previousRaceLanguages,
    next: effects.languages,
  })

  const textBlocks = input.textBlocks.map((block) => {
    if (block.key !== 'traits') return block
    return {
      ...block,
      value: upsertRaceTraitsBlock(block.value, effects.traits_text),
    }
  })

  return {
    speed: effects.speed,
    size: effects.size,
    identity: {
      ...input.identity,
      darkvision: effects.darkvision,
      languages,
      size: effects.size,
      raceAppliedLanguages: [...effects.languages],
    },
    textBlocks,
    summary: formatRaceApplySummary(effects),
    effects,
  }
}
