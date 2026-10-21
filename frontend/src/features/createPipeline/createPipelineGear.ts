/**
 * Slice C: materialize background/class gear into create `sheetDraft` early
 * (same helpers as final apply / sheet editor), then bind wizard spellbook.
 */

import type { CatalogEntry } from '../../shared/api/catalog'
import type { PipelineCatalogSnapshot } from './createPipelineTypes'
import {
  applyBackgroundGrantToDraft,
  type BackgroundGrantDraftSlice,
} from '../characters/backgroundEffects'
import {
  applyClassGrantToDraft,
  type ClassGrantDraftSlice,
} from '../characters/classEffects'
import type { ClassGrantPicks } from '../../shared/dnd/classGrants'
import { emptyPicks as emptyClassGrantPicks } from '../characters/classEffects'
import {
  emptyBackgroundPicks,
  type BackgroundGrantPicks,
} from '../../shared/dnd/backgroundGrants'
import { totalCharacterLevel, type ClassLevelEntry } from '../../shared/dnd/classLevels'
import { isWizardClassName } from '../../shared/dnd/pendingFeatureChoices'
import { EMPTY_ARMOR, EMPTY_WEAPONS } from '../characters/identity'
import { ABILITY_KEYS, SKILL_DEFS, type AbilityKey } from '../characters/sheetTypes'
import {
  inventoryToSheet,
  type InventoryState,
} from '../characters/inventory'
import { EMPTY_COINS } from '../../shared/dnd/weight'
import type { WeaponAttack } from '../characters/AttacksPanel'
import type { SpellsState } from '../characters/spells'
import { readSpells } from '../characters/spells'
import {
  ensureBlankSpellbookInInventory,
  isSpellbookInventoryItem,
  syncWizardSpellbookWithInventory,
  wizardHasUsableSpellbook,
} from '../characters/wizardSpellbookInventory'
import type { CreatePipelineState } from './createPipelineTypes'

function emptySkills() {
  return Object.fromEntries(
    SKILL_DEFS.map((skill) => [
      skill.key,
      { is_proficient: false, is_expertise: false },
    ]),
  )
}

function emptySaves() {
  return Object.fromEntries(ABILITY_KEYS.map((key) => [key, false])) as Record<
    AbilityKey,
    boolean
  >
}

function emptyIdentity(): BackgroundGrantDraftSlice['identity'] {
  return {
    experience: 0,
    subclassName: '',
    background: '',
    backgroundSlug: null,
    alignment: '',
    gender: null,
    size: 'medium',
    darkvision: 0,
    armor: { ...EMPTY_ARMOR },
    weapons: { ...EMPTY_WEAPONS, extras: [] },
    languages: [],
    tools: [],
    raceAppliedLanguages: [],
  }
}

function emptyInventory(): InventoryState {
  return { coins: { ...EMPTY_COINS }, items: [], notes: '' }
}

function baseBackgroundSlice(
  inventory: InventoryState,
  weapons: WeaponAttack[],
): BackgroundGrantDraftSlice {
  return {
    identity: emptyIdentity(),
    skills: emptySkills(),
    inventory,
    textBlocks: [],
    weapons,
    backgroundGrant: null,
    protectedSkills: new Set(),
    protectedTools: new Set(),
    protectedLanguages: new Set(),
    protectedWeaponExtras: new Set(),
  }
}

function baseClassSlice(
  inventory: InventoryState,
  weapons: WeaponAttack[],
  classGrants: ClassGrantDraftSlice['classGrants'],
  classes: ClassLevelEntry[],
  constitutionScore: number,
): ClassGrantDraftSlice {
  return {
    identity: emptyIdentity(),
    saves: emptySaves(),
    skills: emptySkills(),
    classGrants,
    playHitDie: null,
    hpMax: null,
    hpCurrent: null,
    constitutionScore,
    characterLevel: totalCharacterLevel(classes),
    inventory,
    weapons,
  }
}

function snapshotToCatalogEntry(
  snap: PipelineCatalogSnapshot,
  kind: CatalogEntry['kind'],
): CatalogEntry {
  return {
    id: snap.id,
    kind,
    slug: snap.slug,
    name_ru: snap.name_ru,
    name_en: snap.name_en,
    rules_edition: '2014',
    parent_id: snap.parent_id,
    source: snap.source ?? null,
    external_ref: null,
    data: snap.data ?? {},
    sort_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  }
}

export type MaterializeCreateGearInput = {
  state: CreatePipelineState
  /** Live catalog row for the chosen background (if any). */
  backgroundEntry: CatalogEntry | null
  /** classEntryId → catalog class row. */
  classCatalogByEntryId: Record<string, CatalogEntry | null | undefined>
  spells: SpellsState
  /**
   * When the build has wizard levels but no physical book (skip gear / MC),
   * insert a blank spellbook so grimoire gates work.
   */
  ensureWizardBook?: boolean
}

/** Prefer live catalog; fall back to frozen create snapshot. */
export function resolveBackgroundEntryForGear(
  state: CreatePipelineState,
  backgrounds: CatalogEntry[],
): CatalogEntry | null {
  const setup = state.backgroundSetup
  if (!setup) return null
  const live =
    backgrounds.find((row) => row.id === setup.entry.id) ||
    backgrounds.find(
      (row) =>
        row.slug.trim().toLowerCase() === setup.entry.slug.trim().toLowerCase(),
    )
  return live ?? snapshotToCatalogEntry(setup.entry, 'background')
}

export type MaterializeCreateGearResult = {
  sheetDraftPatch: Record<string, unknown>
  inventory: InventoryState
  spells: SpellsState
  weapons: WeaponAttack[]
  ensuredSpellbook: boolean
}

/**
 * Rebuild create-draft inventory from background + class picks (idempotent).
 * Call after BackgroundSetup / ClassSetup confirm.
 */
export function materializeCreatePipelineGear(
  input: MaterializeCreateGearInput,
): MaterializeCreateGearResult {
  const { state } = input
  let inventory = emptyInventory()
  let weapons: WeaponAttack[] = []
  let classGrants: ClassGrantDraftSlice['classGrants'] = []
  let backgroundGrant: BackgroundGrantDraftSlice['backgroundGrant'] = null

  const bgSetup = state.backgroundSetup
  if (input.backgroundEntry && bgSetup) {
    const picks: BackgroundGrantPicks = bgSetup.picks ?? emptyBackgroundPicks()
    const applied = applyBackgroundGrantToDraft({
      draft: baseBackgroundSlice(inventory, weapons),
      selected: input.backgroundEntry,
      picks,
    })
    if (applied) {
      inventory = applied.draft.inventory
      weapons = applied.draft.weapons
      backgroundGrant = applied.draft.backgroundGrant
    }
  }

  const classes = state.classes
  const con = state.baseAbilities.con ?? 10
  for (let index = 0; index < classes.length; index += 1) {
    const row = classes[index]!
    if (!row.name.trim() || row.level <= 0) continue
    const mode: 'start' | 'multiclass' =
      row.id === state.classEntryId || index === 0 ? 'start' : 'multiclass'
    const catalog = input.classCatalogByEntryId[row.id] ?? null
    const picks: ClassGrantPicks =
      state.classGrantPicks[row.id] ?? emptyClassGrantPicks()
    const applied = applyClassGrantToDraft({
      draft: baseClassSlice(inventory, weapons, classGrants, classes, con),
      classEntryId: row.id,
      className: row.name,
      mode,
      picks,
      catalogSlug: catalog?.slug ?? null,
      catalogData: catalog?.data ?? null,
    })
    if (applied) {
      inventory = applied.draft.inventory
      weapons = applied.draft.weapons
      classGrants = applied.draft.classGrants
    }
  }

  let ensuredSpellbook = false
  const hasWizard = classes.some((row) => {
    const cat = input.classCatalogByEntryId[row.id]
    if ((cat?.slug ?? '').toLowerCase() === 'wizard') return true
    return isWizardClassName(row.name)
  })

  if (input.ensureWizardBook !== false && hasWizard) {
    const hasItem = inventory.items.some(isSpellbookInventoryItem)
    if (!hasItem) {
      const ensured = ensureBlankSpellbookInInventory(inventory)
      inventory = ensured.inventory
      ensuredSpellbook = ensured.created
    }
  }

  let spells = input.spells.known ? input.spells : readSpells({})
  const synced = syncWizardSpellbookWithInventory({
    isWizard: hasWizard,
    spells,
    items: inventory.items,
  })
  spells = synced.spells

  return {
    inventory,
    spells,
    weapons,
    ensuredSpellbook,
    sheetDraftPatch: {
      ...inventoryToSheet(inventory),
      weapons,
      class_grants: classGrants,
      background_grant: backgroundGrant,
      spells,
    },
  }
}

export function createDraftHasUsableSpellbook(input: {
  spells: SpellsState
  inventory: InventoryState
}): boolean {
  if (wizardHasUsableSpellbook(input.spells)) return true
  return input.inventory.items.some(isSpellbookInventoryItem)
}
