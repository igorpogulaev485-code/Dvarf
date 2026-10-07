import { useEffect, useMemo, useRef, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import {
  getCharacter,
  updateCharacter,
  type CharacterDetail,
  type RulesEdition,
} from '../../shared/api/characters'
import { ApiRequestError } from '../../shared/api/client'
import {
  createSheetSyncChannel,
  publishSheetSync,
  type SheetSyncMessage,
} from '../../shared/sync/characterSheetChannel'
import {
  addMulticlassLevel,
  bumpClassLevel,
  formatClassSummary,
  reduceClassLevel,
  totalCharacterLevel,
} from '../../shared/dnd/classLevels'
import type {
  AppliedClassGrant,
  ClassGrantDef,
  ClassGrantPicks,
} from '../../shared/dnd/classGrants'
import {
  grantNeedsSetupDialog,
  resolveClassGrantDef,
} from '../../shared/dnd/classGrants'
import {
  applyClassGrantToDraft,
  readAppliedClassGrants,
  revokeClassGrant,
  type ClassGrantDraftSlice,
} from './classEffects'
import { ClassSetupDialog, HomebrewClassDialog } from './ClassSetupDialog'
import { RaceSetupDialog, HomebrewRaceDialog } from './RaceSetupDialog'
import {
  collectGrantTextSnippets,
  type AppliedSubclassGrant,
  type SubclassGrantDef,
  type SubclassGrantPicks,
} from '../../shared/dnd/subclassGrants'
import {
  applySubclassGrantToDraft,
  emptySubclassPicks,
  readAppliedSubclassGrants,
  resolveSubclassDefFromCatalog,
  revokeSubclassGrant,
  subclassNeedsSetupDialog,
  type SubclassGrantDraftSlice,
} from './subclassEffects'
import { SubclassSetupDialog } from './SubclassSetupDialog'
import { SubclassChangeConfirmDialog } from './SubclassChangeConfirmDialog'
import { readCompanions, type CompanionEntry } from './companions'
import { computeArmorClass } from '../../shared/dnd/armor'
import { Button, Dialog, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  isRaceSelectable,
  raceGrantNeedsSetupDialog,
  resolveRaceGrantDef,
  type AppliedRaceGrant,
  type RaceGrantDef,
  type RaceGrantPicks,
} from '../../shared/dnd/raceGrants'
import { AttacksPanel, type WeaponAttack } from './AttacksPanel'
import { AttunementPanel } from './AttunementPanel'
import {
  attunementsToSheet,
  readAttunements,
  type AttunementSlot,
} from './attunement'
import {
  classLevelsToSheet,
  readClassLevels,
  type ClassLevelEntry,
} from './classLevels'
import { CombatStickyHeader } from './CombatStickyHeader'
import { InventoryPanel } from './InventoryPanel'
import { LanguagesToolsPanel } from './LanguagesToolsPanel'
import { LevelUpDialog, type LevelUpChoice } from './LevelUpDialog'
import { PlayPanel } from './PlayPanel'
import { SpellsPanel } from './SpellsPanel'
import {
  desiredResourcesFromFeatures,
  syncFeatureResources,
} from '../../shared/dnd/featureResources'
import { unlockFeaturesForClasses } from '../../shared/dnd/classFeatures'
import { ClassFeaturesPanel } from './ClassFeaturesPanel'
import { CompanionsPanel } from './CompanionsPanel'
import { TextBlocksPanel } from './TextBlocksPanel'
import {
  ARMOR_PROF_OPTIONS,
  WEAPON_PROF_OPTIONS,
  identityExtrasToSheet,
  readIdentityExtras,
  type IdentityExtras,
} from './identity'
import {
  applyRaceGrantToDraft,
  readAppliedRaceGrant,
  reapplyRaceOverlays,
  revokeRaceGrant,
  type RaceGrantDraftSlice,
} from './raceEffects'
import {
  equippedArmorPieces,
  inventoryToSheet,
  readInventory,
  type InventoryState,
} from './inventory'
import {
  playToSheet,
  readPlay,
  type PlayState,
} from './play'
import {
  readSpells,
  spellsToSheet,
  type SpellsState,
} from './spells'
import {
  readTextBlocks,
  textBlocksToSheet,
  type TextBlock,
} from './textBlocks'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  SKILL_DEFS,
  abilityModifier,
  asRecord,
  formatModifier,
  readNullableNumber,
  readNumber,
  type AbilityKey,
} from './sheetTypes'
import { passiveScore, skillModifierFromState } from '../../shared/dnd/passives'

type MinimalSheetEditorProps = {
  character: CharacterDetail
  onSaved: (character: CharacterDetail) => void
  onToast: (message: string) => void
  onRemoteSave?: (message: Extract<SheetSyncMessage, { type: 'sheet-saved' }>) => void
}

type Draft = {
  name: string
  raceName: string
  raceCatalogId: string | null
  classes: ClassLevelEntry[]
  identity: IdentityExtras
  abilities: Record<AbilityKey, number>
  saves: Record<AbilityKey, boolean>
  skills: Record<string, { is_proficient: boolean; is_expertise: boolean }>
  hpCurrent: number | null
  hpMax: number | null
  ac: number | null
  speed: number | null
  initiativeOverride: number | null
  inspiration: boolean
  weapons: WeaponAttack[]
  inventory: InventoryState
  attunements: AttunementSlot[]
  spells: SpellsState
  play: PlayState
  textBlocks: TextBlock[]
  classGrants: AppliedClassGrant[]
  subclassGrants: AppliedSubclassGrant[]
  raceGrant: AppliedRaceGrant | null
  companions: CompanionEntry[]
}

function readWeapons(sheet: Record<string, unknown>): WeaponAttack[] {
  const raw = sheet.weapons
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.map((item, index) => {
    const row = asRecord(item)
    const ability = ABILITY_KEYS.includes(row.ability as AbilityKey)
      ? (row.ability as AbilityKey)
      : 'str'
    const sourceKind =
      row.source_kind === 'weapon' || row.source_kind === 'artifact' || row.source_kind === 'custom'
        ? row.source_kind
        : row.catalog_id
          ? 'weapon'
          : 'custom'
    return {
      id: typeof row.id === 'string' ? row.id : `weapon-${index}`,
      name: typeof row.name === 'string' ? row.name : '',
      catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
      source_kind: sourceKind,
      ability,
      is_proficient: Boolean(row.is_proficient),
      damage: typeof row.damage === 'string' ? row.damage : '',
      damage_type: typeof row.damage_type === 'string' ? row.damage_type : '',
    }
  })
}

function buildDraft(character: CharacterDetail): Draft {
  const sheet = asRecord(character.sheet)
  const identity = asRecord(sheet.identity)
  const abilitiesRaw = asRecord(sheet.abilities)
  const savesRaw = asRecord(sheet.saves)
  const skillsRaw = asRecord(sheet.skills)
  const combat = asRecord(sheet.combat)

  const abilities = Object.fromEntries(
    ABILITY_KEYS.map((key) => {
      const block = asRecord(abilitiesRaw[key])
      return [key, readNumber(block.score, 10)]
    }),
  ) as Record<AbilityKey, number>

  const saves = Object.fromEntries(
    ABILITY_KEYS.map((key) => {
      const block = asRecord(savesRaw[key])
      return [key, Boolean(block.is_proficient)]
    }),
  ) as Record<AbilityKey, boolean>

  const skills = Object.fromEntries(
    SKILL_DEFS.map((skill) => {
      const block = asRecord(skillsRaw[skill.key])
      return [
        skill.key,
        {
          is_proficient: Boolean(block.is_proficient),
          is_expertise: Boolean(block.is_expertise),
        },
      ]
    }),
  ) as Draft['skills']

  const identityExtras = readIdentityExtras(sheet)
  const classes = readClassLevels(sheet, {
    className: character.class_name ?? '',
    level: character.level,
    subclassName: identityExtras.subclassName,
    classCatalogId:
      typeof identity.class_catalog_id === 'string' ? identity.class_catalog_id : null,
  })
  const level = totalCharacterLevel(classes)

  return {
    name: character.name,
    raceName: character.race_name ?? '',
    raceCatalogId:
      typeof identity.race_catalog_id === 'string' ? identity.race_catalog_id : null,
    classes,
    identity: identityExtras,
    abilities,
    saves,
    skills,
    hpCurrent: character.hp_current ?? readNullableNumber(combat.hp_current),
    hpMax: character.hp_max ?? readNullableNumber(combat.hp_max),
    ac: readNullableNumber(combat.ac),
    speed: readNullableNumber(combat.speed),
    initiativeOverride: readNullableNumber(combat.initiative),
    inspiration: Boolean(combat.inspiration),
    weapons: readWeapons(sheet),
    inventory: readInventory(sheet),
    attunements: readAttunements(sheet),
    spells: readSpells(sheet),
    play: readPlay(sheet, level),
    textBlocks: readTextBlocks(sheet),
    classGrants: readAppliedClassGrants(sheet.class_grants),
    subclassGrants: readAppliedSubclassGrants(sheet.subclass_grants),
    raceGrant: readAppliedRaceGrant(sheet.race_grant),
    companions: readCompanions(sheet.companions),
  }
}

function cycleSkill(state: { is_proficient: boolean; is_expertise: boolean }) {
  if (!state.is_proficient && !state.is_expertise) {
    return { is_proficient: true, is_expertise: false }
  }
  if (state.is_proficient && !state.is_expertise) {
    return { is_proficient: true, is_expertise: true }
  }
  return { is_proficient: false, is_expertise: false }
}

function skillMark(state: { is_proficient: boolean; is_expertise: boolean }) {
  if (state.is_expertise) return 'Эксп.'
  if (state.is_proficient) return 'Влад.'
  return '—'
}

export function MinimalSheetEditor({
  character,
  onSaved,
  onToast,
  onRemoteSave,
}: MinimalSheetEditorProps) {
  const [baseCharacter, setBaseCharacter] = useState(character)
  const [draft, setDraft] = useState(() => buildDraft(character))
  const [sheetVersion, setSheetVersion] = useState(character.sheet_version)
  const [saving, setSaving] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [grantPicker, setGrantPicker] = useState<{
    classEntryId: string
    className: string
    mode: 'start' | 'multiclass'
    def: ClassGrantDef
    catalogSlug: string | null
    catalogData: Record<string, unknown> | null
  } | null>(null)
  const [homebrewPicker, setHomebrewPicker] = useState<{
    classEntryId: string
    initialName: string
  } | null>(null)
  const [raceGrantPicker, setRaceGrantPicker] = useState<{
    selected: CatalogEntry
    def: RaceGrantDef
  } | null>(null)
  const [raceHomebrewOpen, setRaceHomebrewOpen] = useState(false)
  const [subclassSetup, setSubclassSetup] = useState<{
    classEntryId: string
    selected: CatalogEntry
    def: SubclassGrantDef
    copyOldTextToNotes: boolean
    previousDef: SubclassGrantDef | null
  } | null>(null)
  const [subclassChange, setSubclassChange] = useState<{
    classEntryId: string
    selected: CatalogEntry
    def: SubclassGrantDef
    fromName: string
    textSnippets: string[]
    previousDef: SubclassGrantDef | null
  } | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)

  const characterLevel = useMemo(
    () => totalCharacterLevel(draft.classes),
    [draft.classes],
  )
  const classSummary = useMemo(
    () => formatClassSummary(draft.classes),
    [draft.classes],
  )
  const subclassSlugByEntryId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const grant of draft.subclassGrants) {
      if (grant.classEntryId && grant.slug) {
        map[grant.classEntryId] = grant.slug
      }
    }
    return map
  }, [draft.subclassGrants])
  const unlockedFeatures = useMemo(
    () =>
      unlockFeaturesForClasses({
        classes: draft.classes,
        characterLevel,
        subclassSlugByEntryId,
      }),
    [draft.classes, characterLevel, subclassSlugByEntryId],
  )
  const featureDesiredResources = useMemo(
    () =>
      desiredResourcesFromFeatures({
        features: unlockedFeatures,
        characterLevel,
      }),
    [unlockedFeatures, characterLevel],
  )
  const primaryClass = draft.classes[0]

  useEffect(() => {
    setBaseCharacter(character)
    setDraft(buildDraft(character))
    setSheetVersion(character.sheet_version)
    setConflictOpen(false)
    setError(null)
  }, [character])

  // Keep feat:* pools in play.resources aligned with unlocked features (PB, archetype).
  useEffect(() => {
    setDraft((prev) => {
      const nextResources = syncFeatureResources(
        prev.play.resources,
        featureDesiredResources,
      )
      if (
        nextResources.length === prev.play.resources.length &&
        nextResources.every((row, index) => {
          const cur = prev.play.resources[index]
          return (
            cur &&
            cur.id === row.id &&
            cur.name === row.name &&
            cur.max === row.max &&
            cur.used === row.used &&
            cur.reset === row.reset
          )
        })
      ) {
        return prev
      }
      return {
        ...prev,
        play: { ...prev.play, resources: nextResources },
      }
    })
  }, [featureDesiredResources])

  const onRemoteSaveRef = useRef(onRemoteSave)
  useEffect(() => {
    onRemoteSaveRef.current = onRemoteSave
  }, [onRemoteSave])

  useEffect(() => {
    const channel = createSheetSyncChannel((message) => {
      if (message.type !== 'sheet-saved') {
        return
      }
      if (message.characterId !== character.id) {
        return
      }
      onRemoteSaveRef.current?.(message)
    })
    channelRef.current = channel
    publishSheetSync(channel, {
      type: 'sheet-opened',
      characterId: character.id,
      sheetVersion: character.sheet_version,
    })
    return () => {
      channel?.close()
      channelRef.current = null
    }
    // Channel is per open character; avoid reconnect on every local save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id])

  const proficiencyBonus = useMemo(
    () => 2 + Math.floor((Math.max(characterLevel, 1) - 1) / 4),
    [characterLevel],
  )

  function patchClass(classId: string, patch: Partial<ClassLevelEntry>) {
    setDraft((prev) => ({
      ...prev,
      classes: prev.classes.map((row) =>
        row.id === classId ? { ...row, ...patch } : row,
      ),
      identity:
        prev.classes[0]?.id === classId && patch.subclass_name !== undefined
          ? { ...prev.identity, subclassName: patch.subclass_name }
          : prev.identity,
    }))
  }

  function draftSliceFrom(prev: Draft): ClassGrantDraftSlice {
    return {
      identity: prev.identity,
      saves: prev.saves,
      skills: prev.skills,
      classGrants: prev.classGrants,
      playHitDie: prev.play.hitDie,
      hpMax: prev.hpMax,
      hpCurrent: prev.hpCurrent,
      constitutionScore: prev.abilities.con,
      characterLevel: totalCharacterLevel(prev.classes),
      inventory: prev.inventory,
    }
  }

  function raceSliceFrom(prev: Draft): RaceGrantDraftSlice {
    const classSkills = new Set([
      ...prev.classGrants.flatMap((row) => row.skills),
      ...prev.subclassGrants.flatMap((row) => row.skills),
    ])
    const classTools = new Set([
      ...prev.classGrants.flatMap((row) =>
        row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
      ),
      ...prev.subclassGrants.flatMap((row) =>
        [...row.tools, ...row.weaponExtras]
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    ])
    const classArmor = new Set([
      ...prev.classGrants.flatMap((row) => row.armorKeys),
      ...prev.subclassGrants.flatMap((row) => row.armorKeys),
    ]) as Set<keyof IdentityExtras['armor']>
    return {
      identity: prev.identity,
      skills: prev.skills,
      abilities: prev.abilities,
      speed: prev.speed,
      textBlocks: prev.textBlocks,
      raceGrant: prev.raceGrant,
      classGrantedSkills: classSkills,
      classGrantedTools: classTools,
      classGrantedArmor: classArmor,
    }
  }

  function subclassSliceFrom(prev: Draft): SubclassGrantDraftSlice {
    return {
      identity: prev.identity,
      skills: prev.skills,
      classGrants: prev.classGrants,
      subclassGrants: prev.subclassGrants,
      raceGrant: prev.raceGrant,
      companions: prev.companions,
      textBlocks: prev.textBlocks,
      spells: prev.spells,
    }
  }

  function mergeSubclassSlice(prev: Draft, slice: SubclassGrantDraftSlice): Draft {
    const merged: Draft = {
      ...prev,
      identity: slice.identity,
      skills: slice.skills,
      subclassGrants: slice.subclassGrants,
      companions: slice.companions,
      textBlocks: slice.textBlocks,
      spells: slice.spells,
    }
    const restored = reapplyRaceOverlays(raceSliceFrom(merged))
    return mergeRaceSlice(merged, restored)
  }

  function commitSubclassGrant(input: {
    classEntryId: string
    selected: CatalogEntry
    def: SubclassGrantDef
    picks: SubclassGrantPicks
    copyOldTextToNotes?: boolean
    previousDef?: SubclassGrantDef | null
  }) {
    let summary: string | null = null
    setDraft((prev) => {
      const applied = applySubclassGrantToDraft({
        draft: subclassSliceFrom(prev),
        classEntryId: input.classEntryId,
        catalogId: input.selected.id,
        def: input.def,
        picks: input.picks,
        copyOldTextToNotes: input.copyOldTextToNotes,
        previousDef: input.previousDef ?? null,
      })
      if (!applied) return prev
      summary = applied.summary
      const withGrant = mergeSubclassSlice(prev, applied.draft)
      return {
        ...withGrant,
        classes: withGrant.classes.map((row) =>
          row.id === input.classEntryId
            ? {
                ...row,
                subclass_name: input.selected.name_ru,
                subclass_catalog_id: input.selected.id,
              }
            : row,
        ),
        identity:
          withGrant.classes[0]?.id === input.classEntryId
            ? { ...withGrant.identity, subclassName: input.selected.name_ru }
            : withGrant.identity,
      }
    })
    if (summary) {
      onToast(`Архетип «${input.selected.name_ru}»: ${summary}`)
    }
  }

  function beginSubclassSelection(input: {
    classEntryId: string
    selected: CatalogEntry
    copyOldTextToNotes?: boolean
    previousDef?: SubclassGrantDef | null
  }) {
    const def = resolveSubclassDefFromCatalog({
      nameRu: input.selected.name_ru,
      slug: input.selected.slug,
      catalogData: input.selected.data,
    })
    if (!def) {
      patchClass(input.classEntryId, {
        subclass_name: input.selected.name_ru,
        subclass_catalog_id: input.selected.id,
      })
      onToast(`Архетип «${input.selected.name_ru}» без пакета грантов — только имя`)
      return
    }
    if (subclassNeedsSetupDialog(def)) {
      setSubclassSetup({
        classEntryId: input.classEntryId,
        selected: input.selected,
        def,
        copyOldTextToNotes: Boolean(input.copyOldTextToNotes),
        previousDef: input.previousDef ?? null,
      })
      return
    }
    commitSubclassGrant({
      classEntryId: input.classEntryId,
      selected: input.selected,
      def,
      picks: emptySubclassPicks(),
      copyOldTextToNotes: input.copyOldTextToNotes,
      previousDef: input.previousDef ?? null,
    })
  }

  function requestSubclassChange(classEntryId: string, selected: CatalogEntry) {
    const existing = draft.subclassGrants.find((row) => row.classEntryId === classEntryId)
    const row = draft.classes.find((item) => item.id === classEntryId)
    if (
      existing &&
      existing.catalogId &&
      existing.catalogId !== selected.id
    ) {
      const previousDef = resolveSubclassDefFromCatalog({
        nameRu: row?.subclass_name || existing.slug,
        slug: existing.slug,
        catalogData: null,
        parentSlug: existing.parentSlug,
      })
      setSubclassChange({
        classEntryId,
        selected,
        def:
          resolveSubclassDefFromCatalog({
            nameRu: selected.name_ru,
            slug: selected.slug,
            catalogData: selected.data,
          }) ??
          ({
            slug: selected.slug,
            labelRu: selected.name_ru,
            nameEn: selected.name_en ?? '',
            parentSlug: '',
            grantsLevel: 3,
            source: 'phb',
            sheetGrants: {
              armor: [],
              weapons: { simple: false, martial: false, extras: [] },
              toolsFixed: [],
              languagesFixed: [],
              skillChoices: null,
              languageChoices: null,
              caster: null,
            },
            choices: [],
            alwaysPreparedSpells: [],
            featuresByLevel: {},
          } satisfies SubclassGrantDef),
        fromName: row?.subclass_name || existing.slug,
        textSnippets: collectGrantTextSnippets({ def: previousDef, grant: existing }),
        previousDef,
      })
      return
    }
    beginSubclassSelection({ classEntryId, selected })
  }

  function applyHomebrewSubclass(classEntryId: string, name: string) {
    setDraft((prev) => {
      const cleared = revokeSubclassGrant(subclassSliceFrom(prev), classEntryId, {
        copyTextToNotes: true,
      })
      const merged = mergeSubclassSlice(prev, cleared)
      return {
        ...merged,
        classes: merged.classes.map((row) =>
          row.id === classEntryId
            ? { ...row, subclass_name: name, subclass_catalog_id: null }
            : row,
        ),
        identity:
          merged.classes[0]?.id === classEntryId
            ? { ...merged.identity, subclassName: name }
            : merged.identity,
      }
    })
    onToast(`Хомбрю-архетип «${name}»: только имя на листе`)
  }

  function mergeGrantSlice(prev: Draft, slice: ClassGrantDraftSlice): Draft {
    const merged: Draft = {
      ...prev,
      identity: slice.identity,
      saves: slice.saves,
      skills: slice.skills,
      classGrants: slice.classGrants,
      hpMax: slice.hpMax,
      hpCurrent: slice.hpCurrent,
      inventory: slice.inventory,
      play: {
        ...prev.play,
        hitDie: slice.playHitDie,
      },
    }
    const restored = reapplyRaceOverlays(raceSliceFrom(merged))
    return mergeRaceSlice(merged, restored)
  }

  function mergeRaceSlice(prev: Draft, slice: RaceGrantDraftSlice): Draft {
    return {
      ...prev,
      identity: slice.identity,
      skills: slice.skills,
      abilities: slice.abilities,
      speed: slice.speed,
      textBlocks: slice.textBlocks,
      raceGrant: slice.raceGrant,
    }
  }

  function grantModeForClassRow(prev: Draft, classEntryId: string): 'start' | 'multiclass' {
    const existing = prev.classGrants.find((row) => row.classEntryId === classEntryId)
    if (existing) return existing.mode
    if (prev.classes.length <= 1) return 'start'
    const index = prev.classes.findIndex((row) => row.id === classEntryId)
    return index <= 0 ? 'start' : 'multiclass'
  }

  function commitClassGrant(input: {
    classEntryId: string
    className: string
    mode: 'start' | 'multiclass'
    picks: ClassGrantPicks
    def?: ClassGrantDef | null
    catalogSlug?: string | null
    catalogData?: Record<string, unknown> | null
  }) {
    let summary: string | null = null
    setDraft((prev) => {
      const applied = applyClassGrantToDraft({
        draft: draftSliceFrom(prev),
        classEntryId: input.classEntryId,
        className: input.className,
        mode: input.mode,
        picks: input.picks,
        def: input.def,
        catalogSlug: input.catalogSlug,
        catalogData: input.catalogData,
      })
      if (!applied) return prev
      summary = applied.summary
      return mergeGrantSlice(prev, applied.draft)
    })
    if (summary) {
      onToast(
        `${input.mode === 'start' ? 'Старт' : 'Мультикласс'} «${input.className}»: ${summary}`,
      )
    }
  }

  function requestOrApplyClassGrant(input: {
    classEntryId: string
    className: string
    mode: 'start' | 'multiclass'
    catalogSlug?: string | null
    catalogData?: Record<string, unknown> | null
  }) {
    const def = resolveClassGrantDef({
      className: input.className,
      catalogSlug: input.catalogSlug,
      catalogData: input.catalogData,
    })
    if (!def) {
      onToast(`Класс «${input.className}» пока без пакета владений — выставь вручную`)
      return
    }
    if (grantNeedsSetupDialog(def, input.mode)) {
      setGrantPicker({
        classEntryId: input.classEntryId,
        className: input.className,
        mode: input.mode,
        def,
        catalogSlug: input.catalogSlug ?? null,
        catalogData: input.catalogData ?? null,
      })
      return
    }
    commitClassGrant({
      classEntryId: input.classEntryId,
      className: input.className,
      mode: input.mode,
      picks: { skills: [], tools: [], equipmentPackageId: null },
      def,
      catalogSlug: input.catalogSlug,
      catalogData: input.catalogData,
    })
  }

  function applyHomebrewClass(classEntryId: string, name: string) {
    setDraft((prev) => {
      const cleared = revokeClassGrant(draftSliceFrom(prev), classEntryId)
      const merged = mergeGrantSlice(prev, cleared)
      return {
        ...merged,
        classes: merged.classes.map((row) =>
          row.id === classEntryId
            ? { ...row, name, catalog_id: null }
            : row,
        ),
        identity:
          merged.classes[0]?.id === classEntryId
            ? merged.identity
            : merged.identity,
      }
    })
    onToast(`Хомбрю-класс «${name}»: название на листе. Остальное заполни сам.`)
  }

  function commitRaceGrant(input: {
    selected: CatalogEntry
    picks: RaceGrantPicks
    def?: RaceGrantDef | null
  }) {
    let summary: string | null = null
    setDraft((prev) => {
      const applied = applyRaceGrantToDraft({
        draft: raceSliceFrom(prev),
        selected: input.selected,
        picks: input.picks,
        def: input.def,
      })
      if (!applied) return prev
      summary = applied.summary
      return {
        ...mergeRaceSlice(prev, applied.draft),
        raceName: input.selected.name_ru,
        raceCatalogId: input.selected.id,
      }
    })
    if (summary) onToast(`Раса «${input.selected.name_ru}»: ${summary}`)
  }

  function requestOrApplyRaceGrant(selected: CatalogEntry) {
    if (!isRaceSelectable(selected.data)) {
      onToast(`«${selected.name_ru}» — выбери подрасу из списка`)
      return
    }
    const def = resolveRaceGrantDef({
      raceName: selected.name_ru,
      catalogSlug: selected.slug,
      catalogData: selected.data,
      nameRu: selected.name_ru,
    })
    if (!def) {
      onToast(`Раса «${selected.name_ru}» пока без пакета эффектов — выставь вручную`)
      setDraft((prev) => ({
        ...prev,
        raceName: selected.name_ru,
        raceCatalogId: selected.id,
      }))
      return
    }
    if (raceGrantNeedsSetupDialog(def)) {
      setRaceGrantPicker({ selected, def })
      return
    }
    commitRaceGrant({
      selected,
      picks: { abilityBonusKeys: [], languages: [], skills: [], tools: [], ancestryId: null },
      def,
    })
  }

  function applyHomebrewRace(name: string) {
    setDraft((prev) => {
      const cleared = revokeRaceGrant(raceSliceFrom(prev))
      return {
        ...mergeRaceSlice(prev, cleared),
        raceName: name,
        raceCatalogId: null,
      }
    })
    onToast(`Хомбрю-раса «${name}»: название на листе. Остальное заполни сам.`)
  }

  function applyLevelUp(choice: LevelUpChoice) {
    if (totalCharacterLevel(draft.classes) >= 20) return

    const existedBefore =
      choice.type === 'multiclass'
        ? draft.classes.some(
            (row) => row.name.trim().toLowerCase() === choice.name.trim().toLowerCase(),
          )
        : true

    const nextClasses =
      choice.type === 'same'
        ? bumpClassLevel(draft.classes, choice.classId)
        : addMulticlassLevel(draft.classes, {
            name: choice.name,
            catalog_id: choice.catalog_id,
          })
    const newMulticlassRow =
      choice.type === 'multiclass' && !existedBefore
        ? nextClasses.find(
            (row) => row.name.trim().toLowerCase() === choice.name.trim().toLowerCase(),
          ) ?? null
        : null

    const nextLevel = totalCharacterLevel(nextClasses)
    const gain = Math.max(0, Math.floor(choice.hpGain))

    setDraft((prev) => {
      const prevMax = prev.hpMax
      const nextMax = prevMax == null ? gain : prevMax + gain
      const prevCurrent = prev.hpCurrent
      const nextCurrent =
        prevCurrent == null ? nextMax : Math.min(nextMax, prevCurrent + gain)
      return {
        ...prev,
        classes: nextClasses,
        hpMax: nextMax,
        hpCurrent: nextCurrent,
        play: {
          ...prev.play,
          hitDiceCurrent: Math.min(prev.play.hitDiceCurrent + 1, nextLevel),
          hitDie: choice.hitDie ?? prev.play.hitDie,
        },
      }
    })
    setLevelUpOpen(false)
    const hpNote = ` · HP +${Math.max(0, Math.floor(choice.hpGain))}`
    onToast(
      choice.type === 'same'
        ? `Уровень класса +1${hpNote}`
        : `Мультикласс: ${choice.name.trim()} 1${hpNote}`,
    )

    if (newMulticlassRow) {
      requestOrApplyClassGrant({
        classEntryId: newMulticlassRow.id,
        className: newMulticlassRow.name,
        mode: 'multiclass',
        catalogSlug: choice.type === 'multiclass' ? choice.catalog_slug : null,
        catalogData: choice.type === 'multiclass' ? choice.catalog_data : null,
      })
    } else if (choice.type === 'same') {
      const leveled = nextClasses.find((row) => row.id === choice.classId)
      if (
        leveled &&
        !leveled.subclass_catalog_id &&
        !leveled.subclass_name.trim() &&
        leveled.level >= 3
      ) {
        onToast(
          `У «${leveled.name}» с ${leveled.level} ур. можно выбрать архетип в поле ниже`,
        )
      }
    }
  }

  const passives = useMemo(() => {
    const modFor = (skillKey: string) => {
      const def = SKILL_DEFS.find((skill) => skill.key === skillKey)
      if (!def) return 0
      const state = draft.skills[skillKey]
      return skillModifierFromState({
        abilityMod: abilityModifier(draft.abilities[def.base]),
        proficiencyBonus,
        isProficient: state.is_proficient,
        isExpertise: state.is_expertise,
      })
    }
    return {
      perception: passiveScore(modFor('perception')),
      investigation: passiveScore(modFor('investigation')),
      insight: passiveScore(modFor('insight')),
    }
  }, [draft.abilities, draft.skills, proficiencyBonus])

  const armorClass = useMemo(() => {
    const pieces = equippedArmorPieces(draft.inventory.items)
    return computeArmorClass({
      dexMod: abilityModifier(draft.abilities.dex),
      armor: pieces.armor,
      shield: pieces.shield,
    })
  }, [draft.abilities.dex, draft.inventory.items])

  function patchIdentity(patch: Partial<IdentityExtras>) {
    setDraft((prev) => ({ ...prev, identity: { ...prev.identity, ...patch } }))
  }

  async function reloadFromServer() {
    setReloading(true)
    setError(null)
    try {
      const fresh = await getCharacter(baseCharacter.id)
      setBaseCharacter(fresh)
      setDraft(buildDraft(fresh))
      setSheetVersion(fresh.sheet_version)
      setConflictOpen(false)
      onSaved(fresh)
      onToast('Лист обновлён с сервера')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось обновить лист')
    } finally {
      setReloading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const sheet = structuredClone(asRecord(baseCharacter.sheet))
      const identity = asRecord(sheet.identity)
      const abilities = asRecord(sheet.abilities)
      const saves = asRecord(sheet.saves)
      const skills = asRecord(sheet.skills)
      const combat = asRecord(sheet.combat)

      const primary = draft.classes[0]
      const totalLevel = totalCharacterLevel(draft.classes)
      const summary = formatClassSummary(draft.classes)
      const identityForSave = {
        ...draft.identity,
        subclassName: primary?.subclass_name ?? draft.identity.subclassName,
      }
      const identityExtras = identityExtrasToSheet(identityForSave)
      identity.race_catalog_id = draft.raceCatalogId
      identity.class_catalog_id = primary?.catalog_id ?? null
      Object.assign(identity, identityExtras.identityPatch)
      sheet.identity = identity
      Object.assign(sheet, classLevelsToSheet(draft.classes))
      sheet.class_grants = draft.classGrants
      sheet.subclass_grants = draft.subclassGrants
      sheet.race_grant = draft.raceGrant
      sheet.companions = draft.companions

      for (const key of ABILITY_KEYS) {
        abilities[key] = { ...asRecord(abilities[key]), score: draft.abilities[key] }
        saves[key] = {
          ...asRecord(saves[key]),
          is_proficient: draft.saves[key],
        }
      }
      sheet.abilities = abilities
      sheet.saves = saves

      for (const skill of SKILL_DEFS) {
        const current = asRecord(skills[skill.key])
        skills[skill.key] = {
          ...current,
          base_stat: skill.base,
          is_proficient: draft.skills[skill.key].is_proficient,
          is_expertise: draft.skills[skill.key].is_expertise,
        }
      }
      sheet.skills = skills

      combat.hp_current = draft.hpCurrent
      combat.hp_max = draft.hpMax
      combat.ac = draft.ac
      combat.speed = draft.speed
      combat.initiative = draft.initiativeOverride
      combat.inspiration = draft.inspiration
      combat.darkvision = identityExtras.combatPatch.darkvision
      const playSheet = playToSheet(draft.play)
      combat.conditions = playSheet.combatPatch.conditions
      combat.exhaustion = playSheet.combatPatch.exhaustion
      combat.hp_temp = playSheet.combatPatch.hp_temp
      combat.hit_die = playSheet.combatPatch.hit_die
      combat.hp_dice_current = playSheet.combatPatch.hp_dice_current
      combat.is_dying = playSheet.combatPatch.is_dying
      combat.death_successes = playSheet.combatPatch.death_successes
      combat.death_fails = playSheet.combatPatch.death_fails
      combat.concentration = playSheet.combatPatch.concentration
      sheet.combat = combat
      const proficiency = asRecord(sheet.proficiency)
      proficiency.armor = identityExtras.proficiencyPatch.armor
      proficiency.weapons = identityExtras.proficiencyPatch.weapons
      proficiency.languages = identityExtras.proficiencyPatch.languages
      proficiency.tools = identityExtras.proficiencyPatch.tools
      sheet.proficiency = proficiency
      sheet.weapons = draft.weapons
      sheet.resources = playSheet.resources
      Object.assign(sheet, inventoryToSheet(draft.inventory))
      Object.assign(sheet, attunementsToSheet(draft.attunements))
      Object.assign(sheet, spellsToSheet(draft.spells))
      Object.assign(sheet, textBlocksToSheet(draft.textBlocks))

      const updated = await updateCharacter(baseCharacter.id, {
        sheet_version: sheetVersion,
        name: draft.name.trim() || 'Новый персонаж',
        level: totalLevel,
        race_name: draft.raceName.trim() || null,
        class_name: summary || primary?.name.trim() || null,
        hp_current: draft.hpCurrent,
        hp_max: draft.hpMax,
        sheet,
      })
      setBaseCharacter(updated)
      setSheetVersion(updated.sheet_version)
      setDraft(buildDraft(updated))
      onSaved(updated)
      publishSheetSync(channelRef.current, {
        type: 'sheet-saved',
        characterId: updated.id,
        sheetVersion: updated.sheet_version,
      })
      onToast('Лист сохранён')
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'sheet_version_conflict') {
        setConflictOpen(true)
        setError(null)
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить лист')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap={16}>
      <CombatStickyHeader
        name={draft.name}
        raceName={draft.raceName}
        className={classSummary || primaryClass?.name || ''}
        level={characterLevel}
        abilities={draft.abilities}
        hpCurrent={draft.hpCurrent}
        hpMax={draft.hpMax}
        hpTemp={draft.play.hpTemp}
        acOverride={draft.ac}
        autoAc={armorClass.ac}
        acHint={armorClass.summary}
        speed={draft.speed}
        initiativeOverride={draft.initiativeOverride}
        inspiration={draft.inspiration}
        exhaustion={draft.play.exhaustion}
        isDying={draft.play.isDying}
        deathSuccesses={draft.play.deathSuccesses}
        deathFails={draft.play.deathFails}
        conditionNames={draft.play.conditions.map((item) => item.name)}
        concentration={draft.play.concentration}
        onClearConcentration={() =>
          setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, concentration: null },
          }))
        }
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
      />

      <Panel title="Основное">
        <Stack gap={12}>
          <Field label="Имя" htmlFor="sheet-name">
            <Input
              id="sheet-name"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </Field>
          <div className="sheet-grid sheet-grid--2">
            <Field
              label="Уровень персонажа"
              hint="Сумма уровней классов. +1 — этот класс или мультикласс."
            >
              <div className="languages-tools-add">
                <Input value={String(characterLevel)} readOnly />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={characterLevel >= 20}
                  onClick={() => setLevelUpOpen(true)}
                >
                  +1 уровень
                </Button>
              </div>
            </Field>
            <Field label="Опыт (XP)" htmlFor="sheet-xp">
              <NumberInput
                id="sheet-xp"
                min={0}
                emptyValue={0}
                value={draft.identity.experience}
                onValueChange={(experience) =>
                  patchIdentity({ experience: experience ?? 0 })
                }
              />
            </Field>
          </div>
          <Field label="Бонус мастерства">
            <Input value={formatModifier(proficiencyBonus)} readOnly />
          </Field>
          <div className="sheet-grid sheet-grid--2">
            <Field
              label="Раса"
              htmlFor="sheet-race"
              hint="Выбор из каталога открывает попап развилок (как у класса): ASI, языки, навыки…"
            >
              <CatalogCombobox
                id="sheet-race"
                kind="race"
                edition={baseCharacter.rules_edition as RulesEdition}
                value={draft.raceName}
                placeholder="Начните вводить расу"
                filterEntry={(entry) => isRaceSelectable(entry.data)}
                onChange={(value, selected) => {
                  if (!selected) {
                    setDraft((prev) => ({
                      ...prev,
                      raceName: value,
                      raceCatalogId: null,
                    }))
                    return
                  }
                  requestOrApplyRaceGrant(selected)
                }}
              />
              <div className="languages-tools-add" style={{ marginTop: 8 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRaceHomebrewOpen(true)}
                >
                  Хомбрю
                </Button>
              </div>
            </Field>
            <Field label="Размер" htmlFor="sheet-size">
              <select
                id="sheet-size"
                className="play-select"
                value={draft.identity.size || 'medium'}
                onChange={(event) => patchIdentity({ size: event.target.value })}
              >
                <option value="tiny">Крошечный</option>
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Большой</option>
                <option value="huge">Огромный</option>
                <option value="gargantuan">Громадный</option>
              </select>
            </Field>
          </div>
          <div>
            <Text tone="muted">Классы</Text>
            <Stack gap={10}>
              {draft.classes.map((row, index) => (
                <div key={row.id} className="inventory-card">
                  <div className="sheet-grid sheet-grid--2">
                    <Field
                      label={draft.classes.length > 1 ? `Класс ${index + 1}` : 'Класс'}
                      hint={index === 0 ? 'Основной для карточки персонажа' : undefined}
                    >
                      <CatalogCombobox
                        kind="class"
                        edition={baseCharacter.rules_edition as RulesEdition}
                        value={row.name}
                        placeholder="Начните вводить класс"
                        onChange={(value, selected) => {
                          patchClass(row.id, {
                            name: value,
                            catalog_id: selected?.id ?? null,
                          })
                          if (!selected) return
                          const mode = grantModeForClassRow(draft, row.id)
                          requestOrApplyClassGrant({
                            classEntryId: row.id,
                            className: selected.name_ru,
                            mode,
                            catalogSlug: selected.slug,
                            catalogData: selected.data,
                          })
                        }}
                      />
                      <div className="languages-tools-add" style={{ marginTop: 8 }}>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            setHomebrewPicker({
                              classEntryId: row.id,
                              initialName: row.name,
                            })
                          }
                        >
                          Хомбрю
                        </Button>
                      </div>
                    </Field>
                    <Field label="Уровней в классе">
                      <div className="languages-tools-add">
                        <Input value={String(row.level)} readOnly />
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={draft.classes.length === 1 && row.level <= 1}
                          onClick={() =>
                            setDraft((prev) => {
                              const nextClasses = reduceClassLevel(prev.classes, row.id)
                              const removed = !nextClasses.some((item) => item.id === row.id)
                              if (!removed) {
                                return { ...prev, classes: nextClasses }
                              }
                              const withoutClass = revokeClassGrant(
                                draftSliceFrom({ ...prev, classes: nextClasses }),
                                row.id,
                              )
                              const withoutSubclass = revokeSubclassGrant(
                                {
                                  ...subclassSliceFrom(prev),
                                  identity: withoutClass.identity,
                                  skills: withoutClass.skills,
                                  classGrants: withoutClass.classGrants,
                                },
                                row.id,
                                { copyTextToNotes: true },
                              )
                              return {
                                ...mergeSubclassSlice(
                                  {
                                    ...prev,
                                    classes: nextClasses,
                                    classGrants: withoutClass.classGrants,
                                    saves: withoutClass.saves,
                                    hpMax: withoutClass.hpMax,
                                    hpCurrent: withoutClass.hpCurrent,
                                    inventory: withoutClass.inventory,
                                    play: {
                                      ...prev.play,
                                      hitDie: withoutClass.playHitDie,
                                    },
                                  },
                                  withoutSubclass,
                                ),
                              }
                            })
                          }
                        >
                          −1
                        </Button>
                      </div>
                    </Field>
                  </div>
                  <Field
                    label="Архетип"
                    hint={
                      row.catalog_id
                        ? 'Из справочника — с грантами; хомбрю — только имя'
                        : 'Сначала выбери класс из справочника, чтобы фильтровать архетипы'
                    }
                  >
                    <div className="languages-tools-add">
                      <CatalogCombobox
                        kind="subclass"
                        edition={baseCharacter.rules_edition as RulesEdition}
                        parentId={row.catalog_id}
                        disabled={!row.catalog_id}
                        value={row.subclass_name}
                        placeholder="Например: Клятва мести"
                        onChange={(value, selected) => {
                          if (selected) {
                            requestSubclassChange(row.id, selected)
                            return
                          }
                          patchClass(row.id, {
                            subclass_name: value,
                            subclass_catalog_id: null,
                          })
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const name = window.prompt(
                            'Хомбрю-архетип (только имя на листе):',
                            row.subclass_name,
                          )
                          if (name == null) return
                          const trimmed = name.trim()
                          if (!trimmed) return
                          applyHomebrewSubclass(row.id, trimmed)
                        }}
                      >
                        Хомбрю
                      </Button>
                    </div>
                  </Field>
                </div>
              ))}
            </Stack>
            <Text tone="muted">
              Итого: {classSummary || 'класс не выбран'} · из справочника откроется попап со всеми
              развилками (навыки, инструменты, стартовое снаряжение). «Хомбрю» — только название на
              листе.
            </Text>
          </div>
          <div className="sheet-grid sheet-grid--2">
            <Field label="Предыстория" htmlFor="sheet-background">
              <Input
                id="sheet-background"
                value={draft.identity.background}
                placeholder="Солдат, мудрец…"
                onChange={(event) => patchIdentity({ background: event.target.value })}
              />
            </Field>
            <Field label="Мировоззрение" htmlFor="sheet-alignment">
              <Input
                id="sheet-alignment"
                value={draft.identity.alignment}
                placeholder="Нейтральный добрый…"
                onChange={(event) => patchIdentity({ alignment: event.target.value })}
              />
            </Field>
          </div>
        </Stack>
      </Panel>

      <Panel title="Пассивные чувства">
        <Stack gap={12}>
          <div className="passive-grid">
            <div className="passive-card">
              <span className="passive-card__label">Внимательность</span>
              <strong>{passives.perception}</strong>
            </div>
            <div className="passive-card">
              <span className="passive-card__label">Анализ</span>
              <strong>{passives.investigation}</strong>
            </div>
            <div className="passive-card">
              <span className="passive-card__label">Проницательность</span>
              <strong>{passives.insight}</strong>
            </div>
          </div>
          <Field label="Тёмное зрение, фт" htmlFor="sheet-darkvision" hint="0 = нет">
            <NumberInput
              id="sheet-darkvision"
              min={0}
              emptyValue={0}
              value={draft.identity.darkvision}
              onValueChange={(darkvision) =>
                patchIdentity({ darkvision: darkvision ?? 0 })
              }
            />
          </Field>
          <Text tone="muted">Пассивы = 10 + модификатор навыка (с учётом владения/экспертизы).</Text>
        </Stack>
      </Panel>

      <Panel title="Владения снаряжением">
        <Stack gap={12}>
          <div>
            <Text tone="muted">Доспехи</Text>
            <div className="chip-row">
              {ARMOR_PROF_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`sheet-chip${draft.identity.armor[option.key] ? ' is-on' : ''}`}
                  onClick={() =>
                    patchIdentity({
                      armor: {
                        ...draft.identity.armor,
                        [option.key]: !draft.identity.armor[option.key],
                      },
                    })
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Text tone="muted">Оружие</Text>
            <div className="chip-row">
              {WEAPON_PROF_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`sheet-chip${draft.identity.weapons[option.key] ? ' is-on' : ''}`}
                  onClick={() =>
                    patchIdentity({
                      weapons: {
                        ...draft.identity.weapons,
                        [option.key]: !draft.identity.weapons[option.key],
                      },
                    })
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Stack>
      </Panel>

      <LanguagesToolsPanel
        languages={draft.identity.languages}
        tools={draft.identity.tools}
        onChange={(patch) => patchIdentity(patch)}
      />

      <Panel title="Характеристики">
        <div className="ability-grid">
          {ABILITY_KEYS.map((key) => {
            const score = draft.abilities[key]
            return (
              <label key={key} className="ability-card">
                <span className="ability-card__label">{ABILITY_LABELS[key]}</span>
                <NumberInput
                  min={1}
                  max={30}
                  emptyValue={10}
                  value={score}
                  onValueChange={(next) =>
                    setDraft((prev) => ({
                      ...prev,
                      abilities: {
                        ...prev.abilities,
                        [key]: next ?? 10,
                      },
                    }))
                  }
                />
                <span className="ability-card__mod">{formatModifier(abilityModifier(score))}</span>
              </label>
            )
          })}
        </div>
      </Panel>

      <PlayPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        level={characterLevel}
        hpCurrent={draft.hpCurrent}
        hpMax={draft.hpMax}
        constitutionMod={abilityModifier(draft.abilities.con)}
        play={draft.play}
        spells={draft.spells}
        featureDesiredResources={featureDesiredResources}
        onPlayChange={(play) => setDraft((prev) => ({ ...prev, play }))}
        onSpellsChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
        onCombatChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        onToast={onToast}
      />

      <AttacksPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        weapons={draft.weapons}
        abilities={draft.abilities}
        proficiencyBonus={proficiencyBonus}
        onChange={(weapons) => setDraft((prev) => ({ ...prev, weapons }))}
      />

      <InventoryPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        inventory={draft.inventory}
        strengthScore={draft.abilities.str}
        onChange={(inventory) => setDraft((prev) => ({ ...prev, inventory }))}
      />

      <AttunementPanel
        attunements={draft.attunements}
        inventoryItems={draft.inventory.items}
        onChange={(attunements) => setDraft((prev) => ({ ...prev, attunements }))}
      />

      <ClassFeaturesPanel
        classes={draft.classes}
        characterLevel={characterLevel}
        subclassSlugByEntryId={subclassSlugByEntryId}
        resources={draft.play.resources}
        onResourcesChange={(resources) =>
          setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, resources },
          }))
        }
        onToast={onToast}
      />

      <SpellsPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        className={classSummary || primaryClass?.name || ''}
        level={characterLevel}
        classes={draft.classes}
        subclassCasters={draft.subclassGrants
          .filter((row) => row.caster?.progression === 'third')
          .map((row) => ({
            classEntryId: row.classEntryId,
            progression: 'third' as const,
            ability: row.caster?.ability ?? null,
          }))}
        spells={draft.spells}
        abilities={draft.abilities}
        proficiencyBonus={proficiencyBonus}
        onChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
        onConcentrationChange={(concentration) =>
          setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, concentration },
          }))
        }
        onToast={onToast}
      />

      <CompanionsPanel
        companions={draft.companions}
        onChange={(companions) => setDraft((prev) => ({ ...prev, companions }))}
      />

      <Panel title="Спасброски">
        <div className="chip-row">
          {ABILITY_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`sheet-chip${draft.saves[key] ? ' is-on' : ''}`}
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  saves: { ...prev.saves, [key]: !prev.saves[key] },
                }))
              }
            >
              {ABILITY_LABELS[key]}{' '}
              {formatModifier(
                abilityModifier(draft.abilities[key]) + (draft.saves[key] ? proficiencyBonus : 0),
              )}
            </button>
          ))}
        </div>
        <Text tone="muted">Нажми, чтобы включить/выключить владение</Text>
      </Panel>

      <Panel title="Навыки">
        <div className="skill-list">
          {SKILL_DEFS.map((skill) => {
            const state = draft.skills[skill.key]
            const mod =
              abilityModifier(draft.abilities[skill.base]) +
              (state.is_expertise
                ? proficiencyBonus * 2
                : state.is_proficient
                  ? proficiencyBonus
                  : 0)
            return (
              <button
                key={skill.key}
                type="button"
                className={`skill-row${state.is_proficient ? ' is-on' : ''}${state.is_expertise ? ' is-expert' : ''}`}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    skills: {
                      ...prev.skills,
                      [skill.key]: cycleSkill(prev.skills[skill.key]),
                    },
                  }))
                }
              >
                <span>{skill.label}</span>
                <span className="skill-row__meta">
                  {ABILITY_LABELS[skill.base]} · {skillMark(state)} · {formatModifier(mod)}
                </span>
              </button>
            )
          })}
        </div>
        <Text tone="muted">Клик: нет → владение → экспертиза → нет</Text>
      </Panel>

      <TextBlocksPanel
        blocks={draft.textBlocks}
        onChange={(textBlocks) => setDraft((prev) => ({ ...prev, textBlocks }))}
      />

      {error ? <Text tone="danger">{error}</Text> : null}

      <div className="sheet-actions">
        <Button onClick={() => void handleSave()} disabled={saving || reloading}>
          {saving ? 'Сохраняем…' : 'Сохранить лист'}
        </Button>
        <Text tone="muted">
          Редакция {baseCharacter.rules_edition} · v{sheetVersion}
        </Text>
      </div>

      <Dialog
        open={conflictOpen}
        title="Конфликт версий листа"
        primaryLabel={reloading ? 'Обновляем…' : 'Обновить лист'}
        secondaryLabel="Оставить мои правки"
        busy={reloading}
        onPrimary={() => void reloadFromServer()}
        onSecondary={() => setConflictOpen(false)}
      >
        <Text>
          Этот персонаж уже сохранён в другой вкладке или на другом устройстве. Если обновить лист,
          локальные несохранённые правки пропадут. Можно оставить свои правки на экране и
          перенести их вручную.
        </Text>
      </Dialog>

      <LevelUpDialog
        open={levelUpOpen}
        edition={baseCharacter.rules_edition as RulesEdition}
        classes={draft.classes}
        abilities={draft.abilities}
        constitutionMod={abilityModifier(draft.abilities.con)}
        onConfirm={applyLevelUp}
        onClose={() => setLevelUpOpen(false)}
      />

      <ClassSetupDialog
        open={grantPicker != null}
        def={grantPicker?.def ?? null}
        mode={grantPicker?.mode ?? 'start'}
        onClose={() => setGrantPicker(null)}
        onConfirm={(picks) => {
          if (!grantPicker) return
          commitClassGrant({
            classEntryId: grantPicker.classEntryId,
            className: grantPicker.className,
            mode: grantPicker.mode,
            picks,
            def: grantPicker.def,
            catalogSlug: grantPicker.catalogSlug,
            catalogData: grantPicker.catalogData,
          })
          setGrantPicker(null)
        }}
      />

      <HomebrewClassDialog
        open={homebrewPicker != null}
        initialName={homebrewPicker?.initialName ?? ''}
        onClose={() => setHomebrewPicker(null)}
        onConfirm={(name) => {
          if (!homebrewPicker) return
          applyHomebrewClass(homebrewPicker.classEntryId, name)
          setHomebrewPicker(null)
        }}
      />

      <RaceSetupDialog
        open={raceGrantPicker != null}
        def={raceGrantPicker?.def ?? null}
        onClose={() => setRaceGrantPicker(null)}
        onConfirm={(picks) => {
          if (!raceGrantPicker) return
          commitRaceGrant({
            selected: raceGrantPicker.selected,
            picks,
            def: raceGrantPicker.def,
          })
          setRaceGrantPicker(null)
        }}
      />

      <HomebrewRaceDialog
        open={raceHomebrewOpen}
        initialName={draft.raceName}
        onClose={() => setRaceHomebrewOpen(false)}
        onConfirm={(name) => {
          applyHomebrewRace(name)
          setRaceHomebrewOpen(false)
        }}
      />

      <SubclassChangeConfirmDialog
        open={subclassChange != null}
        fromName={subclassChange?.fromName ?? ''}
        toName={subclassChange?.selected.name_ru ?? ''}
        textSnippets={subclassChange?.textSnippets ?? []}
        onClose={() => setSubclassChange(null)}
        onConfirm={(copyTextToNotes) => {
          if (!subclassChange) return
          const pending = subclassChange
          setSubclassChange(null)
          beginSubclassSelection({
            classEntryId: pending.classEntryId,
            selected: pending.selected,
            copyOldTextToNotes: copyTextToNotes,
            previousDef: pending.previousDef,
          })
        }}
      />

      <SubclassSetupDialog
        open={subclassSetup != null}
        def={subclassSetup?.def ?? null}
        onClose={() => setSubclassSetup(null)}
        onConfirm={(picks) => {
          if (!subclassSetup) return
          commitSubclassGrant({
            classEntryId: subclassSetup.classEntryId,
            selected: subclassSetup.selected,
            def: subclassSetup.def,
            picks,
            copyOldTextToNotes: subclassSetup.copyOldTextToNotes,
            previousDef: subclassSetup.previousDef,
          })
          setSubclassSetup(null)
        }}
      />
    </Stack>
  )
}
