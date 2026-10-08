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
import { findWeaponPreset } from '../../shared/dnd/weaponPresets'
import type { IdentityExtras } from './identity'
import {
  createInventoryItem,
  equipInventoryItem,
  type InventoryState,
} from './inventory'
import type { TextBlock } from './textBlocks'
import { type WeaponAttack } from './AttacksPanel'
import { resolveWeaponGrip } from './heldEquip'
import {
  backgroundEquipmentAttackIdAt,
  buildStartingWeaponAttacks,
} from './startingGearAttacks'
import { resolveWeaponExtraName } from './weaponProficiencyExtras'

export type SkillState = Record<string, { is_proficient: boolean; is_expertise: boolean }>

export type BackgroundGrantDraftSlice = {
  identity: IdentityExtras
  skills: SkillState
  inventory: InventoryState
  textBlocks: TextBlock[]
  weapons: WeaponAttack[]
  backgroundGrant: AppliedBackgroundGrant | null
  /** Skills still covered by class/subclass/race — do not strip on revoke. */
  protectedSkills: Set<string>
  protectedTools: Set<string>
  protectedLanguages: Set<string>
  protectedWeaponExtras: Set<string>
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

function addGearItem(input: {
  inventory: InventoryState
  weapons: WeaponAttack[]
  name: string
  qty?: number
  armor_kind?: 'none' | 'light' | 'medium' | 'heavy' | 'shield'
  base_ac?: number | null
  weight_lb?: number | null
  notes?: string
  backgroundSlug: string
}): {
  inventory: InventoryState
  weapons: WeaponAttack[]
  itemId: string
  attackId: string | null
  attackIds: string[]
} {
  const created = createInventoryItem()
  created.name = input.name
  created.qty = Math.max(1, Math.floor(input.qty ?? 1))
  created.armor_kind = (input.armor_kind ?? 'none') as typeof created.armor_kind
  created.base_ac = input.base_ac ?? null
  created.weight_lb = input.weight_lb ?? null
  created.notes = input.notes ?? 'Снаряжение предыстории'
  if (created.armor_kind === 'none' && findWeaponPreset(created.name)) {
    created.weapon_grip = resolveWeaponGrip({ name: created.name })
  }

  let inventory: InventoryState = {
    ...input.inventory,
    items: [...input.inventory.items, created],
  }

  if (
    created.armor_kind === 'light' ||
    created.armor_kind === 'medium' ||
    created.armor_kind === 'heavy' ||
    created.armor_kind === 'shield'
  ) {
    inventory = {
      ...inventory,
      items: equipInventoryItem(inventory.items, created.id, true),
    }
  }

  let weapons = [...input.weapons]
  const built = buildStartingWeaponAttacks({
    name: input.name,
    qty: created.qty,
    makeId: (index, cardCount) =>
      backgroundEquipmentAttackIdAt(input.backgroundSlug, created.id, index, cardCount),
    inventoryItemId: created.id,
    held: false,
  })
  weapons.push(...built.attacks)
  const attackId = built.attackIds[0] ?? null

  return {
    inventory,
    weapons,
    itemId: created.id,
    attackId,
    attackIds: built.attackIds,
  }
}

/** Weapon OR picks that grant a named proficiency (gladiator exotic weapons). */
function weaponExtrasFromPicks(
  def: BackgroundGrantDef,
  picks: BackgroundGrantPicks,
): string[] {
  const out: string[] = []
  for (const choice of def.equipmentOrChoices) {
    const picked = picks.equipmentOrPicks[choice.id]
    if (!picked) continue
    if (findWeaponPreset(picked)) {
      const name = resolveWeaponExtraName(picked)
      if (name) out.push(name)
    }
  }
  return uniqueStrings(out)
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

  const weaponExtras = (draft.identity.weapons.extras ?? []).filter((name) => {
    const key = name.trim().toLowerCase()
    const wasFromBg = (previous.weaponExtras ?? []).some(
      (item) => item.toLowerCase() === key,
    )
    if (!wasFromBg) return true
    return draft.protectedWeaponExtras.has(key)
  })

  const removeIds = new Set(previous.equipmentItemIds)
  const removeAttackIds = new Set(previous.equipmentAttackIds ?? [])
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
    weapons: draft.weapons.filter((row) => !removeAttackIds.has(row.id)),
    identity: {
      ...draft.identity,
      tools,
      languages,
      weapons: {
        ...draft.identity.weapons,
        extras: weaponExtras,
      },
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
  let toolsApplied = uniqueStrings([...def.toolProficiencies, ...picks.tools])
  const languagesApplied = uniqueStrings([...def.languages, ...picks.languages])
  const weaponExtras = weaponExtrasFromPicks(def, picks)
  const featureText = buildBackgroundFeatureText(def)

  // OR pick of musical instrument → tool proficiency for entertainer/gladiator.
  for (const choice of def.equipmentOrChoices) {
    const picked = picks.equipmentOrPicks[choice.id]
    if (!picked) continue
    if (/инструмент/i.test(picked) && !findWeaponPreset(picked)) {
      toolsApplied = uniqueStrings([...toolsApplied, picked])
    }
  }

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
  const equipmentAttackIds: string[] = []
  let equipmentCoinsGp = 0
  let inventory: InventoryState = {
    coins: { ...cleared.inventory.coins },
    items: [...cleared.inventory.items],
  }
  let nextWeapons: WeaponAttack[] = [...cleared.weapons]
  const equipmentPackageId = picks.equipmentPackageId
  if (equipmentPackageId && equipmentPackageId !== 'skip') {
    const pack = def.equipment.find((row) => row.id === equipmentPackageId)
    if (pack) {
      for (const spec of pack.items) {
        const added = addGearItem({
          inventory,
          weapons: nextWeapons,
          name: spec.name,
          qty: spec.qty,
          armor_kind: spec.armor_kind,
          base_ac: spec.base_ac,
          weight_lb: spec.weight_lb,
          notes: spec.notes ?? 'Снаряжение предыстории',
          backgroundSlug: def.slug,
        })
        inventory = added.inventory
        nextWeapons = added.weapons
        equipmentItemIds.push(added.itemId)
        equipmentAttackIds.push(...added.attackIds)
      }
      for (const choice of def.equipmentOrChoices) {
        const picked = picks.equipmentOrPicks[choice.id]
        if (!picked) continue
        const added = addGearItem({
          inventory,
          weapons: nextWeapons,
          name: picked,
          notes: 'Снаряжение предыстории',
          backgroundSlug: def.slug,
        })
        inventory = added.inventory
        nextWeapons = added.weapons
        equipmentItemIds.push(added.itemId)
        equipmentAttackIds.push(...added.attackIds)
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
    weaponExtras,
    featureNameRu: def.featureNameRu,
    featureTextRu: def.featureTextRu,
    featNoteRu: def.featNoteRu,
    equipmentPackageId,
    equipmentOrPicks: { ...picks.equipmentOrPicks },
    equipmentItemIds,
    equipmentAttackIds,
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
    weapons: nextWeapons,
    identity: {
      ...cleared.identity,
      background: def.labelRu,
      languages,
      tools: uniqueStrings([...cleared.identity.tools, ...toolsApplied]),
      weapons: {
        ...cleared.identity.weapons,
        extras: uniqueStrings([
          ...(cleared.identity.weapons.extras ?? []),
          ...weaponExtras,
        ]),
      },
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
      weapons: {
        ...draft.identity.weapons,
        extras: uniqueStrings([
          ...(draft.identity.weapons.extras ?? []),
          ...(grant.weaponExtras ?? []),
        ]),
      },
    },
  }
}

export { readAppliedBackgroundGrant }
