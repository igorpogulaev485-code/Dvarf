/** Apply / revoke background grants on the digital sheet draft. */

import type { CatalogEntry } from '../../shared/api/catalog'
import {
  buildBackgroundFeatureText,
  emptyBackgroundPicks,
  formatBackgroundGrantSummary,
  formatChoiceTableSummary,
  mergeBackgroundLanguages,
  readAppliedBackgroundGrant,
  resolveBackgroundGrantDef,
  upsertBackgroundFeatureBlock,
  upsertMarkedTextBlock,
  validateBackgroundGrantPicks,
  type AppliedBackgroundGrant,
  type BackgroundGrantDef,
  type BackgroundGrantPicks,
} from '../../shared/dnd/backgroundGrants'
import type { IdentityExtras } from './identity'
import { createInventoryItem, type InventoryState } from './inventory'
import type { TextBlock } from './textBlocks'

export type SkillState = Record<string, { is_proficient: boolean; is_expertise: boolean }>

export type BackgroundGrantDraftSlice = {
  identity: IdentityExtras
  skills: SkillState
  inventory: InventoryState
  textBlocks: TextBlock[]
  backgroundGrant: AppliedBackgroundGrant | null
  /** Skills still covered by class/subclass/race — do not strip on revoke. */
  protectedSkills: Set<string>
  protectedTools: Set<string>
  protectedLanguages: Set<string>
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const normalized = item.trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
  }
  return out
}

export function revokeBackgroundGrant(
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

  const languages = mergeBackgroundLanguages({
    current: draft.identity.languages,
    previousApplied: previous.languages.filter(
      (lang) => !draft.protectedLanguages.has(lang.toLowerCase()),
    ),
    next: [],
  })

  const removeIds = new Set(previous.equipmentItemIds)
  const inventory: InventoryState = {
    coins: { ...draft.inventory.coins },
    items: draft.inventory.items.filter((item) => !removeIds.has(item.id)),
  }
  if (previous.equipmentCoinsGp > 0) {
    inventory.coins.gp = Math.max(0, inventory.coins.gp - previous.equipmentCoinsGp)
  }

  const textBlocks = draft.textBlocks.map((block) => {
    if (block.key === 'traits') {
      return { ...block, value: upsertBackgroundFeatureBlock(block.value, '') }
    }
    if (block.key === 'personality') {
      return { ...block, value: upsertMarkedTextBlock(block.value, 'personality', '') }
    }
    if (block.key === 'ideals') {
      return { ...block, value: upsertMarkedTextBlock(block.value, 'ideals', '') }
    }
    if (block.key === 'bonds') {
      return { ...block, value: upsertMarkedTextBlock(block.value, 'bonds', '') }
    }
    if (block.key === 'flaws') {
      return { ...block, value: upsertMarkedTextBlock(block.value, 'flaws', '') }
    }
    if (block.key === 'background') {
      return {
        ...block,
        value: upsertMarkedTextBlock(block.value, 'backgroundStory', ''),
      }
    }
    return block
  })

  return {
    ...draft,
    backgroundGrant: null,
    skills,
    inventory,
    textBlocks,
    identity: {
      ...draft.identity,
      tools,
      languages,
    },
  }
}

export function applyBackgroundGrantToDraft(input: {
  draft: BackgroundGrantDraftSlice
  selected: CatalogEntry
  picks?: BackgroundGrantPicks
  def?: BackgroundGrantDef | null
}): { draft: BackgroundGrantDraftSlice; summary: string } | null {
  const def =
    input.def ??
    resolveBackgroundGrantDef({
      backgroundName: input.selected.name_ru,
      catalogSlug: input.selected.slug,
      catalogData: input.selected.data,
      nameRu: input.selected.name_ru,
    })
  if (!def) return null

  const picks = input.picks ?? emptyBackgroundPicks()
  const pickError = validateBackgroundGrantPicks({ def, picks })
  if (pickError) return null

  const cleared = revokeBackgroundGrant(input.draft)
  const skillsApplied = uniqueStrings([...def.skillProficiencies, ...picks.skills])
  const toolsApplied = uniqueStrings([...def.toolProficiencies, ...picks.tools])
  const languagesApplied = uniqueStrings([...def.languages, ...picks.languages])
  const featureText = buildBackgroundFeatureText(def)

  const skills = { ...cleared.skills }
  for (const key of skillsApplied) {
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = { ...current, is_proficient: true }
  }

  const languages = mergeBackgroundLanguages({
    current: cleared.identity.languages,
    previousApplied: [],
    next: languagesApplied,
  })

  const equipmentItemIds: string[] = []
  let equipmentCoinsGp = 0
  let inventory: InventoryState = {
    coins: { ...cleared.inventory.coins },
    items: [...cleared.inventory.items],
  }
  const equipmentPackageId = picks.equipmentPackageId
  if (equipmentPackageId && equipmentPackageId !== 'skip') {
    const pack = def.equipment.find((row) => row.id === equipmentPackageId)
    if (pack) {
      for (const spec of pack.items) {
        const created = createInventoryItem()
        created.name = spec.name
        created.qty = Math.max(1, Math.floor(spec.qty ?? 1))
        created.armor_kind = (spec.armor_kind ?? 'none') as typeof created.armor_kind
        created.base_ac = spec.base_ac ?? null
        created.weight_lb = spec.weight_lb ?? null
        created.notes = spec.notes ?? 'Снаряжение предыстории'
        inventory.items.push(created)
        equipmentItemIds.push(created.id)
      }
      for (const choice of def.equipmentOrChoices) {
        const picked = picks.equipmentOrPicks[choice.id]
        if (!picked) continue
        const created = createInventoryItem()
        created.name = picked
        created.qty = 1
        created.notes = 'Снаряжение предыстории'
        inventory.items.push(created)
        equipmentItemIds.push(created.id)
      }
      if (pack.coinsGp && pack.coinsGp > 0) {
        equipmentCoinsGp = pack.coinsGp
        inventory.coins.gp += pack.coinsGp
      }
    }
  }

  const personalityText = picks.personalityTraits.join('\n')
  const storyBits = [
    def.notesRu,
    formatChoiceTableSummary(def, picks),
    def.equipmentNoteRu,
  ].filter(Boolean)
  const storyText = storyBits.join('\n')
  const textBlocks = cleared.textBlocks.map((block) => {
    if (block.key === 'traits') {
      return { ...block, value: upsertBackgroundFeatureBlock(block.value, featureText) }
    }
    if (block.key === 'personality') {
      return {
        ...block,
        value: upsertMarkedTextBlock(block.value, 'personality', personalityText),
      }
    }
    if (block.key === 'ideals') {
      return {
        ...block,
        value: upsertMarkedTextBlock(block.value, 'ideals', picks.ideal ?? ''),
      }
    }
    if (block.key === 'bonds') {
      return {
        ...block,
        value: upsertMarkedTextBlock(block.value, 'bonds', picks.bond ?? ''),
      }
    }
    if (block.key === 'flaws') {
      return {
        ...block,
        value: upsertMarkedTextBlock(block.value, 'flaws', picks.flaw ?? ''),
      }
    }
    if (block.key === 'background') {
      return {
        ...block,
        value: upsertMarkedTextBlock(block.value, 'backgroundStory', storyText),
      }
    }
    return block
  })

  const nextGrant: AppliedBackgroundGrant = {
    backgroundCatalogId: input.selected.id,
    slug: def.slug,
    skills: skillsApplied,
    tools: toolsApplied,
    languages: languagesApplied,
    featureNameRu: def.featureNameRu,
    featureTextRu: def.featureTextRu,
    featNoteRu: def.featNoteRu,
    equipmentPackageId,
    equipmentOrPicks: { ...picks.equipmentOrPicks },
    equipmentItemIds,
    equipmentCoinsGp,
    choiceTablePicks: { ...picks.choiceTablePicks },
    personalityTraits: [...picks.personalityTraits],
    ideal: picks.ideal,
    bond: picks.bond,
    flaw: picks.flaw,
  }

  const draft: BackgroundGrantDraftSlice = {
    ...cleared,
    backgroundGrant: nextGrant,
    skills,
    inventory,
    textBlocks,
    identity: {
      ...cleared.identity,
      background: def.labelRu,
      languages,
      tools: uniqueStrings([...cleared.identity.tools, ...toolsApplied]),
    },
  }

  return {
    draft,
    summary: formatBackgroundGrantSummary({ def, picks }),
  }
}

/** Re-apply background skill/tool overlays after class/race mutations. */
export function reapplyBackgroundOverlays(
  draft: BackgroundGrantDraftSlice,
): BackgroundGrantDraftSlice {
  const grant = draft.backgroundGrant
  if (!grant) return draft

  const skills = { ...draft.skills }
  for (const key of grant.skills) {
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = { ...current, is_proficient: true }
  }

  return {
    ...draft,
    skills,
    identity: {
      ...draft.identity,
      tools: uniqueStrings([...draft.identity.tools, ...grant.tools]),
      languages: mergeBackgroundLanguages({
        current: draft.identity.languages,
        previousApplied: [],
        next: grant.languages,
      }),
    },
  }
}

export { readAppliedBackgroundGrant }
