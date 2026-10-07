/** Apply / revoke background grants on a sheet draft slice. */

import type { AppliedBackgroundGrant } from '../../shared/dnd/backgroundGrants'
import type { ArmorProficiency } from './identity'
import type { TextBlock } from './textBlocks'

export type BackgroundGrantDraftSlice = {
  skills: Record<string, { is_proficient: boolean; is_expertise: boolean }>
  identity: {
    languages: string[]
    tools: string[]
    armor: ArmorProficiency
  }
  textBlocks: TextBlock[]
  backgroundGrant: AppliedBackgroundGrant | null
  /** Skills still covered by class / race / feats — do not strip on revoke. */
  protectedSkills: Set<string>
  protectedTools: Set<string>
  protectedLanguages: Set<string>
}

const BG_TRAITS_MARK_START = '<!-- dvarf:background-feature -->'
const BG_TRAITS_MARK_END = '<!-- /dvarf:background-feature -->'

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function upsertBackgroundFeatureBlock(value: string, snippet: string): string {
  const start = value.indexOf(BG_TRAITS_MARK_START)
  const end = value.indexOf(BG_TRAITS_MARK_END)
  const block = snippet
    ? `${BG_TRAITS_MARK_START}\n${snippet}\n${BG_TRAITS_MARK_END}`
    : ''
  if (start >= 0 && end > start) {
    const before = value.slice(0, start).trimEnd()
    const after = value.slice(end + BG_TRAITS_MARK_END.length).trimStart()
    return [before, block, after].filter(Boolean).join('\n\n')
  }
  if (!block) return value
  return value.trim() ? `${value.trim()}\n\n${block}` : block
}

function featureSnippet(grant: AppliedBackgroundGrant | null): string {
  if (!grant) return ''
  const body = grant.featureRu || grant.summaryRu
  return body
    ? `Предыстория «${grant.nameRu}»: ${body}`
    : `Предыстория «${grant.nameRu}»`
}

function syncFeatureText(draft: BackgroundGrantDraftSlice): BackgroundGrantDraftSlice {
  const snippet = featureSnippet(draft.backgroundGrant)
  const textBlocks = draft.textBlocks.map((block) => {
    if (block.key !== 'traits' && block.key !== 'background') return block
    if (block.key === 'traits' && draft.textBlocks.some((row) => row.key === 'background')) {
      return block
    }
    return { ...block, value: upsertBackgroundFeatureBlock(block.value, snippet) }
  })
  return { ...draft, textBlocks }
}

export function revokeBackgroundGrantFromDraft(
  draft: BackgroundGrantDraftSlice,
): BackgroundGrantDraftSlice {
  const previous = draft.backgroundGrant
  if (!previous) return draft

  const skills = { ...draft.skills }
  for (const key of previous.skills) {
    if (draft.protectedSkills.has(key)) continue
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = { ...current, is_proficient: false }
  }

  const tools = draft.identity.tools.filter((name) => {
    const key = name.trim().toLowerCase()
    const wasFromBg = previous.tools.some((item) => item.toLowerCase() === key)
    if (!wasFromBg) return true
    return draft.protectedTools.has(key)
  })

  const languages = draft.identity.languages.filter((name) => {
    const key = name.trim().toLowerCase()
    const wasFromBg = previous.languages.some((item) => item.toLowerCase() === key)
    if (!wasFromBg) return true
    return draft.protectedLanguages.has(key)
  })

  return syncFeatureText({
    ...draft,
    skills,
    backgroundGrant: null,
    identity: {
      ...draft.identity,
      tools,
      languages,
    },
  })
}

export function applyBackgroundGrantToDraft(input: {
  draft: BackgroundGrantDraftSlice
  grant: AppliedBackgroundGrant
}): BackgroundGrantDraftSlice {
  const cleared = revokeBackgroundGrantFromDraft(input.draft)
  const skills = { ...cleared.skills }
  for (const key of input.grant.skills) {
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = { ...current, is_proficient: true }
  }
  const tools = uniqueStrings([...cleared.identity.tools, ...input.grant.tools])
  const languages = uniqueStrings([
    ...cleared.identity.languages,
    ...input.grant.languages,
  ])
  return syncFeatureText({
    ...cleared,
    skills,
    backgroundGrant: input.grant,
    identity: {
      ...cleared.identity,
      tools,
      languages,
    },
  })
}
