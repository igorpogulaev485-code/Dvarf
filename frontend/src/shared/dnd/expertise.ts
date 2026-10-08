/** Expertise picks → sheet skills (and thieves' tools option id). */

import { getFeaturePickList, type FeaturePicksState } from './featurePicks'
import type { FeatureChoiceDef } from './classFeatures'

export const THIEVES_TOOLS_OPTION_ID = 'thieves_tools'
export const THIEVES_TOOLS_LABEL_RU = 'Воровские инструменты'

export type SkillExpertiseState = Record<
  string,
  { is_proficient: boolean; is_expertise: boolean }
>

export function isExpertiseChoice(
  choice: Pick<FeatureChoiceDef, 'options_from'> | null | undefined,
): boolean {
  return choice?.options_from === 'expertise_skills_tools'
}

export function isThievesToolsName(name: string): boolean {
  const lower = name.trim().toLowerCase()
  return (
    lower === 'воровские инструменты' ||
    lower === "thieves' tools" ||
    lower === 'thieves tools' ||
    lower === THIEVES_TOOLS_OPTION_ID
  )
}

/** Options for an Expertise picker: proficient skills + thieves' tools if owned. */
export function listExpertiseOptions(input: {
  skills: SkillExpertiseState
  tools: string[]
  /** Option ids already taken by other Expertise features (exclude from this pick). */
  excludeOptionIds?: string[]
}): Array<{ id: string; labelRu: string; kind: 'skill' | 'tool' }> {
  const excluded = new Set(input.excludeOptionIds ?? [])
  const out: Array<{ id: string; labelRu: string; kind: 'skill' | 'tool' }> = []
  for (const [key, state] of Object.entries(input.skills)) {
    if (!state.is_proficient) continue
    if (excluded.has(key)) continue
    out.push({ id: key, labelRu: key, kind: 'skill' })
  }
  const hasThieves = input.tools.some(isThievesToolsName)
  if (hasThieves && !excluded.has(THIEVES_TOOLS_OPTION_ID)) {
    out.push({
      id: THIEVES_TOOLS_OPTION_ID,
      labelRu: THIEVES_TOOLS_LABEL_RU,
      kind: 'tool',
    })
  }
  return out
}

export function collectExpertiseOptionIdsFromPicks(input: {
  featurePicks: FeaturePicksState
  expertiseKeys: Array<{ classEntryId: string; featureId: string }>
  /** Skip one feature when building "other" exclusions. */
  except?: { classEntryId: string; featureId: string }
}): string[] {
  const ids: string[] = []
  for (const key of input.expertiseKeys) {
    if (
      input.except &&
      input.except.classEntryId === key.classEntryId &&
      input.except.featureId === key.featureId
    ) {
      continue
    }
    ids.push(...getFeaturePickList(input.featurePicks, key.classEntryId, key.featureId))
  }
  return ids
}

/**
 * Recompute `is_expertise` from all Expertise feature picks.
 * Skills not in any pick lose expertise (manual click is overridden by pack picks).
 * Proficiency flags are preserved.
 */
export function syncSkillsExpertiseFromPicks(input: {
  skills: SkillExpertiseState
  featurePicks: FeaturePicksState
  expertiseKeys: Array<{ classEntryId: string; featureId: string }>
}): SkillExpertiseState {
  const expertIds = new Set(
    collectExpertiseOptionIdsFromPicks({
      featurePicks: input.featurePicks,
      expertiseKeys: input.expertiseKeys,
    }).filter((id) => id !== THIEVES_TOOLS_OPTION_ID),
  )
  const next: SkillExpertiseState = { ...input.skills }
  for (const key of Object.keys(next)) {
    const current = next[key] ?? { is_proficient: false, is_expertise: false }
    const want = expertIds.has(key)
    if (want) {
      next[key] = { is_proficient: true, is_expertise: true }
    } else if (current.is_expertise) {
      next[key] = { ...current, is_expertise: false }
    }
  }
  return next
}

export function hasThievesToolsExpertise(input: {
  featurePicks: FeaturePicksState
  expertiseKeys: Array<{ classEntryId: string; featureId: string }>
}): boolean {
  return collectExpertiseOptionIdsFromPicks(input).includes(THIEVES_TOOLS_OPTION_ID)
}
