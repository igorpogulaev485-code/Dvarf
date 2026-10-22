import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BackgroundSetupDialog,
  type BackgroundSetupConfirm,
} from '../features/characters/BackgroundSetupDialog'
import {
  RaceSetupDialog,
  type RaceSetupConfirm,
} from '../features/characters/RaceSetupDialog'
import {
  FeatSetupDialog,
  type FeatSetupResult,
} from '../features/characters/FeatSetupDialog'
import { CHARACTER_GENDER_LABELS } from '../shared/dnd/characterGender'
import { ClassSetupDialog } from '../features/characters/ClassSetupDialog'
import {
  GuidedWizardDialog,
  type GuidedWizardSession,
} from '../features/characters/GuidedWizardDialog'
import { SubclassSetupDialog } from '../features/characters/SubclassSetupDialog'
import { SubclassChangeConfirmDialog } from '../features/characters/SubclassChangeConfirmDialog'
import { GrimoireDialog } from '../features/characters/GrimoireDialog'
import { PrepareSpellsDialog } from '../features/characters/PrepareSpellsDialog'
import { ABILITY_LABELS, SKILL_DEFS } from '../features/characters/sheetTypes'
import {
  emptySubclassPicks,
  resolveSubclassDefFromCatalog,
  subclassNeedsSetupDialog,
} from '../features/characters/subclassEffects'
import { AbilitiesStep } from '../features/createPipeline/AbilitiesStep'
import { CatalogCardList } from '../features/createPipeline/CatalogCardList'
import {
  backgroundCardMeta,
  raceCardMeta,
} from '../features/createPipeline/catalogCardMeta'
import { CatalogDetailPanel } from '../features/createPipeline/CatalogDetailPanel'
import { CreatePipelineShell } from '../features/createPipeline/CreatePipelineShell'
import { StepHint, useOnboardingState } from '../features/onboarding'
import { getMe } from '../shared/api/auth'
import { hydratePipelineFromSheet } from '../features/createPipeline/createPipelineSheet'
import { applyPipelineToSheet } from '../features/createPipeline/pipelineApply'
import {
  createDraftHasUsableSpellbook,
  materializeCreatePipelineGear,
  resolveBackgroundEntryForGear,
} from '../features/createPipeline/createPipelineGear'
import {
  clearPipelineState,
  loadOrCreatePipelineState,
  savePipelineState,
} from '../features/createPipeline/createPipelineStorage'
import { LevelingStep, ensureHpChoices } from '../features/createPipeline/LevelingStep'
import {
  catalogSnapshot,
  createEmptyPipelineState,
  raceFeatNoteRu,
  raceNeedsFeatStep,
  raceRequiresCatalogFeat,
  stepIndex,
  visiblePipelineSteps,
  type CreatePipelineState,
  type CreatePipelineStepId,
} from '../features/createPipeline/createPipelineTypes'
import { listCatalogEntries, type CatalogEntry } from '../shared/api/catalog'
import {
  createCharacter,
  getCharacter,
  updateCharacter,
  type CharacterDetail,
} from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import {
  applyClassAsiBonuses,
  type AbilityKey,
  type AppliedClassAsi,
} from '../shared/dnd/classAsi'
import { unlockFeaturesForClasses } from '../shared/dnd/classFeatures'
import { resolveBackgroundGrantDef } from '../shared/dnd/backgroundGrants'
import {
  grantNeedsSetupDialog,
  resolveClassGrantDef,
  type ClassGrantPicks,
} from '../shared/dnd/classGrants'
import { createClassLevel, totalCharacterLevel } from '../shared/dnd/classLevels'
import { emptyPicks as emptyClassGrantPicks } from '../features/characters/classEffects'
import {
  syncSkillsExpertiseFromPicks,
  type SkillExpertiseState,
} from '../shared/dnd/expertise'
import type { AbilityScores } from '../shared/dnd/multiclassRules'
import {
  buildPendingWizardSteps,
  isSubclassGateFeature,
  isWizardClassName,
  listUnlockedExpertiseKeys,
  withWizardSpellbookPicksStep,
  type GuidedWizardStep,
} from '../shared/dnd/pendingFeatureChoices'
import {
  sanitizeFeaturePicksForPactBoons,
  syncPactTomeCantrips,
  withPactTomeCantripsStep,
} from '../features/characters/pactTomeEffects'
import {
  ensurePactTomeSpellCatalog,
  resolvePactTomeCantripFromOptions,
} from '../features/characters/PactTomeCantripsPicker'
import { spellOptionsForPactTomeCantrips } from '../shared/dnd/featSpellListOptions'
import {
  isPointBuyValid,
  isStandardArrayComplete,
  isManualScoresValid,
  isRollScoresValid,
  mergeRacialBonuses,
} from '../shared/dnd/pointBuy'
import {
  isRaceComboboxRoot,
  mergeAbilityBonuses,
  raceSubraceRequired,
  resolveRaceGrantDef,
} from '../shared/dnd/raceGrants'
import {
  raceRequiresFeatPick,
  readFeatGrantLedger,
  type AppliedFeatGrant,
} from '../shared/dnd/featGrants'
import type {
  SubclassChangeMode,
  SubclassGrantDef,
  SubclassGrantPicks,
} from '../shared/dnd/subclassGrants'
import {
  emptyFeaturePicks,
  featurePicksToSheet,
  type FeaturePicksState,
} from '../shared/dnd/featurePicks'
import {
  bridgeManeuversIntoFeaturePicks,
  extractManeuverIdsFromSubclassPicks,
} from '../shared/dnd/battleMasterManeuverBridge'
import { EMPTY_ARMOR } from '../features/characters/identity'
import { abilityModifier } from '../features/characters/sheetTypes'
import {
  addCatalogSpellToKnown,
  countLearnedCantrips,
  countLearnedCantripsForSlug,
  countLearnedLeveled,
  countLearnedLeveledForSlug,
  countPreparedLeveled,
  ensureKnownSpellsReady,
  isKnownSpellcastingMode,
  readSpells,
  spellsToSheet,
  type SpellsState,
} from '../features/characters/spells'
import {
  formatNamedCantripBudgets,
  resolveSpellLearnBudgets,
  totalCantripsBudget,
} from '../shared/dnd/castProfiles'
import {
  applySpellcastingSuggestion,
  highestSpellSlotLevelForClasses,
  resolveSpellLearnBudget,
  suggestSpellcastingFromClasses,
} from '../shared/dnd/casterProgression'
import type { SpellcastingAbility } from '../shared/dnd/spells'
import { remainingFreeSpellbookSlots } from '../shared/dnd/wizardSpellbook'
import { inventoryToSheet, readInventory } from '../features/characters/inventory'
import { Button, Stack, Text, Toast } from '../ui'

const CASTER_NAME_RE =
  /бард|жрец|друид|паладин|следопыт|чародей|колдун|волшебник|изобретатель/i

function catalogRef(entry: CatalogEntry) {
  return { id: entry.id, slug: entry.slug, nameRu: entry.name_ru }
}

function emptyWizardSkills(): SkillExpertiseState {
  return Object.fromEntries(
    SKILL_DEFS.map((skill) => [
      skill.key,
      { is_proficient: false, is_expertise: false },
    ]),
  )
}

function markProficient(skills: SkillExpertiseState, keys: string[]): SkillExpertiseState {
  const next = { ...skills }
  for (const key of keys) {
    const current = next[key] ?? { is_proficient: false, is_expertise: false }
    next[key] = { ...current, is_proficient: true }
  }
  return next
}

/** Provisional skills/tools for GuidedWizard expertise (before full sheet apply). */
function buildWizardProficiencies(state: CreatePipelineState): {
  skills: SkillExpertiseState
  tools: string[]
} {
  let skills = emptyWizardSkills()
  const tools: string[] = []
  const pushTools = (items: string[]) => {
    for (const item of items) {
      const trimmed = item.trim()
      if (!trimmed) continue
      if (!tools.some((row) => row.toLowerCase() === trimmed.toLowerCase())) {
        tools.push(trimmed)
      }
    }
  }

  if (state.backgroundSetup) {
    const bgDef = resolveBackgroundGrantDef({
      backgroundName: state.backgroundSetup.entry.name_ru,
      catalogSlug: state.backgroundSetup.entry.slug,
      catalogData: state.backgroundSetup.entry.data,
      nameRu: state.backgroundSetup.entry.name_ru,
    })
    skills = markProficient(skills, [
      ...(bgDef?.skillProficiencies ?? []),
      ...(state.backgroundSetup.picks.skills ?? []),
    ])
    pushTools([
      ...(bgDef?.toolProficiencies ?? []),
      ...(state.backgroundSetup.picks.tools ?? []),
    ])
  }
  if (state.raceSetup) {
    const raceDef = resolveRaceGrantDef({
      raceName: state.raceSetup.entry.name_ru,
      catalogSlug: state.raceSetup.entry.slug,
      catalogData: state.raceSetup.entry.data,
      nameRu: state.raceSetup.entry.name_ru,
    })
    skills = markProficient(skills, [
      ...(raceDef?.skillProficiencies ?? []),
      ...(state.raceSetup.picks.skills ?? []),
    ])
    pushTools([
      ...(raceDef?.toolProficiencies ?? []),
      ...(state.raceSetup.picks.tools ?? []),
    ])
  }
  for (const picks of Object.values(state.classGrantPicks ?? {})) {
    skills = markProficient(skills, picks.skills)
    pushTools(picks.tools)
  }
  for (const setup of Object.values(state.subclassSetups ?? {})) {
    const def = resolveSubclassDefFromCatalog({
      nameRu: setup.entry.name_ru,
      slug: setup.entry.slug,
      catalogData: setup.entry.data,
    })
    if (!def) continue
    skills = markProficient(skills, def.sheetGrants.skillsFixed)
    pushTools(def.sheetGrants.toolsFixed)
    for (const [choiceId, value] of Object.entries(setup.picks.values)) {
      const choice = def.choices.find((row) => row.id === choiceId)
      if (!choice || choice.appliesTo !== 'grant') continue
      const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
      const idLower = choice.id.toLowerCase()
      if (idLower.includes('tool')) {
        pushTools(values)
        continue
      }
      if (idLower.includes('lang')) continue
      skills = markProficient(
        skills,
        values.filter((key) => SKILL_DEFS.some((skill) => skill.key === key)),
      )
    }
  }

  const subclassSlugByEntryId: Record<string, string> = {}
  const subclassTransitionByEntryId: Record<
    string,
    {
      mode: 'future_only'
      changedAtClassLevel: number
      previousSlug: string
      previousNameRu?: string
    }
  > = {}
  for (const [entryId, setup] of Object.entries(state.subclassSetups ?? {})) {
    if (setup.entry.slug) subclassSlugByEntryId[entryId] = setup.entry.slug
    if (setup.changeMode === 'future_only' && setup.previousEntry) {
      subclassTransitionByEntryId[entryId] = {
        mode: 'future_only',
        changedAtClassLevel: setup.changedAtClassLevel ?? 1,
        previousSlug: setup.previousEntry.slug,
        previousNameRu: setup.previousEntry.name_ru,
      }
    }
  }
  const unlocked = unlockFeaturesForClasses({
    classes: state.classes,
    characterLevel: totalCharacterLevel(state.classes),
    abilities: state.baseAbilities,
    subclassSlugByEntryId,
    subclassTransitionByEntryId,
  })
  skills = syncSkillsExpertiseFromPicks({
    skills,
    featurePicks: state.featurePicks ?? emptyFeaturePicks(),
    expertiseKeys: listUnlockedExpertiseKeys(unlocked),
  })
  return { skills, tools }
}

function hasSubclassSelected(row: {
  subclass_name: string
  subclass_catalog_id: string | null
}): boolean {
  return Boolean(row.subclass_catalog_id || row.subclass_name.trim())
}

function nextVisibleStep(
  current: CreatePipelineStepId,
  raceSetup: CreatePipelineState['raceSetup'],
): CreatePipelineStepId | null {
  const steps = visiblePipelineSteps(raceSetup)
  const index = steps.indexOf(current)
  if (index < 0) return steps[0] ?? null
  return steps[index + 1] ?? null
}

function prevVisibleStep(
  current: CreatePipelineStepId,
  raceSetup: CreatePipelineState['raceSetup'],
): CreatePipelineStepId | null {
  const steps = visiblePipelineSteps(raceSetup)
  const index = steps.indexOf(current)
  if (index <= 0) return null
  return steps[index - 1] ?? null
}

export function CreateCharacterPage() {
  const navigate = useNavigate()
  const { characterId: routeCharacterId } = useParams<{ characterId?: string }>()
  const [userId, setUserId] = useState<string | null>(null)
  const onboarding = useOnboardingState(userId)
  const [state, setState] = useState<CreatePipelineState>(() => loadOrCreatePipelineState())

  useEffect(() => {
    let active = true
    getMe()
      .then((me) => {
        if (active) setUserId(me.id)
      })
      .catch(() => {
        if (active) setUserId(null)
      })
    return () => {
      active = false
    }
  }, [])
  const [backgrounds, setBackgrounds] = useState<CatalogEntry[]>([])
  const [classes, setClasses] = useState<CatalogEntry[]>([])
  const [races, setRaces] = useState<CatalogEntry[]>([])
  const [feats, setFeats] = useState<CatalogEntry[]>([])
  const [selectedBackground, setSelectedBackground] = useState<CatalogEntry | null>(null)
  const [selectedClass, setSelectedClass] = useState<CatalogEntry | null>(null)
  const [selectedRace, setSelectedRace] = useState<CatalogEntry | null>(null)
  const [selectedFeat, setSelectedFeat] = useState<CatalogEntry | null>(null)
  const [featSetupOpen, setFeatSetupOpen] = useState(false)
  const [bgSetup, setBgSetup] = useState<{
    root: CatalogEntry
    variants: CatalogEntry[]
  } | null>(null)
  const [raceSetup, setRaceSetup] = useState<{
    root: CatalogEntry
    subraces: CatalogEntry[]
    required: boolean
  } | null>(null)
  const [classSetup, setClassSetup] = useState<{
    def: NonNullable<ReturnType<typeof resolveClassGrantDef>>
    mode: 'start' | 'multiclass'
    classEntryId: string
    /** When true, open GuidedWizard after confirm (leveling / MC). */
    openWizardAfter: boolean
  } | null>(null)
  const [subclassPicker, setSubclassPicker] = useState<{
    classEntryId: string
    parentCatalogId: string
    className: string
    options: CatalogEntry[]
  } | null>(null)
  const [subclassSetup, setSubclassSetup] = useState<{
    classEntryId: string
    selected: CatalogEntry
    def: SubclassGrantDef
    changeMode?: SubclassChangeMode
    changedAtClassLevel?: number
    previousEntry?: ReturnType<typeof catalogSnapshot> | null
    previousPicks?: SubclassGrantPicks
    advanceWizardAfter?: boolean
  } | null>(null)
  const [subclassChange, setSubclassChange] = useState<{
    classEntryId: string
    selected: CatalogEntry
    fromName: string
    textSnippets: string[]
    previousEntry: ReturnType<typeof catalogSnapshot>
    previousPicks: SubclassGrantPicks
    classLevel: number
  } | null>(null)
  const [guidedWizard, setGuidedWizard] = useState<GuidedWizardSession | null>(null)
  /** Wizard paused while SubclassSetupDialog is open from a wizard archetype step. */
  const [pausedWizardForSubclass, setPausedWizardForSubclass] =
    useState<GuidedWizardSession | null>(null)
  const [advanceWizardAfterSubclass, setAdvanceWizardAfterSubclass] = useState(false)
  const [spellsOpen, setSpellsOpen] = useState<'prepare' | 'grimoire' | null>(null)
  const [grimoireClassFilter, setGrimoireClassFilter] = useState<string | null>(null)
  const [spells, setSpells] = useState<SpellsState>(() => readSpells({}))
  const [racialBonuses, setRacialBonuses] = useState<Partial<AbilityScores>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [spellWarnOpen, setSpellWarnOpen] = useState(false)

  useEffect(() => {
    savePipelineState(state)
  }, [state])

  // Restore racial ASI from stored race setup (F5 / draft reload).
  useEffect(() => {
    const setup = state.raceSetup
    if (!setup) return
    const def = resolveRaceGrantDef({
      raceName: setup.entry.name_ru,
      catalogSlug: setup.entry.slug,
      catalogData: setup.entry.data,
      nameRu: setup.entry.name_ru,
    })
    if (!def) return
    setRacialBonuses(
      mergeAbilityBonuses(
        def.abilityBonuses,
        def.abilityBonusChoices,
        setup.picks.abilityBonusKeys,
        setup.picks.abilityBonusModeId,
      ),
    )
  }, [state.raceSetup])

  useEffect(() => {
    let active = true
    // Race is step 1 — load it first so the create screen is usable ASAP.
    listCatalogEntries({ kind: 'race', edition: '2014' })
      .then((race) => {
        if (!active) return
        setRaces(race.filter((row) => isRaceComboboxRoot(row) && row.is_active))
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить каталоги')
      })
    // Warm the rest in parallel; shared catalog cache dedupes with the sheet.
    void Promise.all([
      listCatalogEntries({ kind: 'background', edition: '2014' }),
      listCatalogEntries({ kind: 'class', edition: '2014' }),
      listCatalogEntries({ kind: 'feat', edition: '2014' }),
    ])
      .then(([bg, cls, featRows]) => {
        if (!active) return
        setBackgrounds(bg.filter((row) => !row.parent_id))
        setClasses(cls.filter((row) => !row.parent_id && row.is_active))
        setFeats(featRows.filter((row) => row.is_active))
      })
      .catch(() => {
        // Non-blocking warm; step handlers will surface errors if still empty.
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!routeCharacterId) return
    let active = true
    getCharacter(routeCharacterId)
      .then((character) => {
        if (!active) return
        if (!character.is_draft) {
          navigate(`/characters/${character.id}`, { replace: true })
          return
        }
        const hydrated = hydratePipelineFromSheet(
          character.sheet,
          createEmptyPipelineState(),
        )
        setState({
          ...hydrated,
          characterId: character.id,
          sheetVersion: character.sheet_version,
          characterName: character.name !== 'Новый персонаж' ? character.name : hydrated.characterName,
        })
        setSpells(readSpells(character.sheet))
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof ApiRequestError ? err.message : 'Черновик не найден')
      })
    return () => {
      active = false
    }
  }, [navigate, routeCharacterId])

  const finalAbilities = useMemo(
    () => mergeRacialBonuses(state.baseAbilities, racialBonuses),
    [racialBonuses, state.baseAbilities],
  )

  const wizardAbilities = useMemo(() => {
    let scores = { ...finalAbilities } as Record<AbilityKey, number>
    for (const entry of state.classAsi ?? []) {
      scores = applyClassAsiBonuses(scores, entry.bonuses)
    }
    return scores
  }, [finalAbilities, state.classAsi])

  const abilityModFor = useCallback(
    (ability: SpellcastingAbility) => abilityModifier(wizardAbilities[ability] ?? 10),
    [wizardAbilities],
  )

  /** Same tables as SpellsPanel — slots / max_prepared follow class levels (incl. MC). */
  const spellcastingSuggestion = useMemo(
    () =>
      suggestSpellcastingFromClasses({
        classes: state.classes,
        abilityModFor,
      }),
    [state.classes, abilityModFor],
  )

  const spellLearnBudget = useMemo(
    () =>
      resolveSpellLearnBudget({
        classes: state.classes,
        abilityModFor,
      }),
    [state.classes, abilityModFor],
  )

  const spellLearnBudgets = useMemo(
    () =>
      resolveSpellLearnBudgets({
        classes: state.classes,
        abilityModFor,
        proficiencyBonus: 2,
      }),
    [state.classes, abilityModFor],
  )

  const spellcastingClassKey = useMemo(() => {
    const classKey = state.classes
      .map((row) => `${row.name.trim().toLowerCase()}:${row.level}`)
      .join('|')
    const abilityKey = (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[])
      .map((key) => wizardAbilities[key] ?? 10)
      .join(',')
    const subclassKey = Object.entries(state.subclassSetups ?? {})
      .map(([entryId, setup]) => `${entryId}:${setup.entry.slug}`)
      .sort()
      .join('|')
    return `${classKey}::${abilityKey}::${subclassKey}`
  }, [state.classes, state.subclassSetups, wizardAbilities])

  const appliedSpellcastingKey = useRef<string | null>(null)
  useEffect(() => {
    if (appliedSpellcastingKey.current === spellcastingClassKey) return
    appliedSpellcastingKey.current = spellcastingClassKey
    if (!spellcastingSuggestion || spellcastingSuggestion.progression === 'none') {
      return
    }
    setSpells((prev) => {
      const applied = {
        ...prev,
        ...applySpellcastingSuggestion(prev, spellcastingSuggestion),
      }
      const knownMode = isKnownSpellcastingMode({
        maxPrepared: applied.max_prepared,
        hasCasterSuggestion: true,
      })
      return knownMode
        ? { ...applied, known: ensureKnownSpellsReady(applied.known) }
        : applied
    })
  }, [spellcastingClassKey, spellcastingSuggestion])

  /** Slice 1: when wizard level rises, remind about +2 free book fills. */
  const prevWizardLevelRef = useRef<number | null>(null)
  useEffect(() => {
    const wizardRow = state.classes.find((row) =>
      /волшебник|wizard|маг/i.test(row.name),
    )
    const level = wizardRow ? Math.max(1, Math.floor(wizardRow.level) || 1) : 0
    const prev = prevWizardLevelRef.current
    prevWizardLevelRef.current = level > 0 ? level : null
    if (prev == null || level <= 0 || level <= prev) return
    const freeLeft = remainingFreeSpellbookSlots(spells.known, level)
    setToast(
      `Волшебник ${level} ур.: +2 бесплатно в книгу · осталось free-слотов: ${freeLeft}. Открой гримуар.`,
    )
  }, [state.classes, spells.known])

  const wizardProficiencies = useMemo(
    () => buildWizardProficiencies(state),
    [state],
  )

  const subclassSlugByEntryId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [entryId, setup] of Object.entries(state.subclassSetups ?? {})) {
      if (setup.entry.slug) map[entryId] = setup.entry.slug
    }
    return map
  }, [state.subclassSetups])

  const subclassTransitionByEntryId = useMemo(() => {
    const map: Record<
      string,
      {
        mode: 'future_only'
        changedAtClassLevel: number
        previousSlug: string
        previousNameRu?: string
      }
    > = {}
    for (const [entryId, setup] of Object.entries(state.subclassSetups ?? {})) {
      if (setup.changeMode !== 'future_only' || !setup.previousEntry) continue
      map[entryId] = {
        mode: 'future_only',
        changedAtClassLevel: setup.changedAtClassLevel ?? 1,
        previousSlug: setup.previousEntry.slug,
        previousNameRu: setup.previousEntry.name_ru,
      }
    }
    return map
  }, [state.subclassSetups])

  const unlockedFeatures = useMemo(
    () =>
      unlockFeaturesForClasses({
        classes: state.classes,
        characterLevel: totalCharacterLevel(state.classes),
        abilities: wizardAbilities,
        subclassSlugByEntryId,
        subclassTransitionByEntryId,
      }),
    [state.classes, subclassSlugByEntryId, subclassTransitionByEntryId, wizardAbilities],
  )

  const expertiseKeys = useMemo(
    () => listUnlockedExpertiseKeys(unlockedFeatures),
    [unlockedFeatures],
  )

  const hasClassGrantPicks = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const row of state.classes) {
      map[row.id] = Boolean(state.classGrantPicks?.[row.id])
    }
    return map
  }, [state.classGrantPicks, state.classes])

  const visibleSteps = useMemo(
    () => visiblePipelineSteps(state.raceSetup),
    [state.raceSetup],
  )

  const raceGrantDef = useMemo(() => {
    const setup = state.raceSetup
    if (!setup) return null
    return resolveRaceGrantDef({
      raceName: setup.entry.name_ru,
      catalogSlug: setup.entry.slug,
      catalogData: setup.entry.data,
      nameRu: setup.entry.name_ru,
    })
  }, [state.raceSetup])

  const hasCasterClass = useMemo(
    () => state.classes.some((row) => CASTER_NAME_RE.test(row.name)),
    [state.classes],
  )

  const backgroundGrantDef = useMemo(() => {
    const setup = state.backgroundSetup
    if (!setup) return null
    return resolveBackgroundGrantDef({
      backgroundName: setup.entry.name_ru,
      catalogSlug: setup.entry.slug,
      catalogData: setup.entry.data,
      nameRu: setup.entry.name_ru,
    })
  }, [state.backgroundSetup])

  const blockedSkillKeys = useMemo(() => {
    const keys = new Set<string>()
    // Fixed grants + choice picks (picks alone miss PHB fixed skills like Insight/Religion).
    for (const key of backgroundGrantDef?.skillProficiencies ?? []) keys.add(key)
    for (const key of state.backgroundSetup?.picks.skills ?? []) keys.add(key)
    for (const key of raceGrantDef?.skillProficiencies ?? []) keys.add(key)
    for (const key of state.raceSetup?.picks.skills ?? []) keys.add(key)
    return [...keys]
  }, [
    backgroundGrantDef?.skillProficiencies,
    state.backgroundSetup?.picks.skills,
    raceGrantDef?.skillProficiencies,
    state.raceSetup?.picks.skills,
  ])

  const blockedToolNames = useMemo(() => {
    const tools = new Set<string>()
    for (const name of backgroundGrantDef?.toolProficiencies ?? []) {
      if (name.trim()) tools.add(name.trim())
    }
    for (const name of state.backgroundSetup?.picks.tools ?? []) {
      if (name.trim()) tools.add(name.trim())
    }
    for (const name of raceGrantDef?.toolProficiencies ?? []) {
      if (name.trim()) tools.add(name.trim())
    }
    for (const name of state.raceSetup?.picks.tools ?? []) {
      if (name.trim()) tools.add(name.trim())
    }
    return [...tools]
  }, [
    backgroundGrantDef?.toolProficiencies,
    state.backgroundSetup?.picks.tools,
    raceGrantDef?.toolProficiencies,
    state.raceSetup?.picks.tools,
  ])

  /** Race fixed languages + race language picks — block in background language chips. */
  const blockedLanguageNames = useMemo(() => {
    const names = new Set<string>()
    for (const name of raceGrantDef?.languages ?? []) {
      if (name.trim()) names.add(name.trim())
    }
    for (const name of state.raceSetup?.picks.languages ?? []) {
      if (name.trim()) names.add(name.trim())
    }
    return [...names]
  }, [raceGrantDef?.languages, state.raceSetup?.picks.languages])

  const patchState = useCallback((patch: Partial<CreatePipelineState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  function openGuidedWizard(session: GuidedWizardSession) {
    if (session.steps.length === 0) {
      setGuidedWizard(null)
      return
    }
    setGuidedWizard({
      ...session,
      index: Math.min(session.index, session.steps.length - 1),
    })
  }

  function openFeatureWizardForClass(
    classEntryId: string,
    options?: { classes?: typeof state.classes; featurePicks?: FeaturePicksState; silentIfEmpty?: boolean },
  ) {
    const classRows = options?.classes ?? state.classes
    const row = classRows.find((item) => item.id === classEntryId)
    if (!row) {
      setToast('Сначала зафиксируйте класс')
      return
    }
    const picksState = options?.featurePicks ?? state.featurePicks ?? emptyFeaturePicks()
    const unlocked = unlockFeaturesForClasses({
      classes: classRows,
      characterLevel: totalCharacterLevel(classRows),
      abilities: wizardAbilities,
      subclassSlugByEntryId,
      subclassTransitionByEntryId,
    })
    const hasSubclass: Record<string, boolean> = {}
    for (const item of classRows) {
      hasSubclass[item.id] = hasSubclassSelected(item)
    }
    let steps: GuidedWizardStep[] = buildPendingWizardSteps({
      unlocked,
      featurePicks: picksState,
      classAsi: state.classAsi ?? [],
      filter: {
        mode: 'up_to_class_level',
        classEntryId,
        maxClassLevel: row.level,
      },
      hasSubclassByEntryId: hasSubclass,
    }).filter((step) => step.kind !== 'class_grant' && step.kind !== 'background')
    if (isWizardClassName(row.name)) {
      const freeLeft = remainingFreeSpellbookSlots(spells.known, row.level)
      if (freeLeft > 0) {
        steps = withWizardSpellbookPicksStep(steps, {
          classEntryId,
          className: row.name,
          classLevel: row.level,
          // Opening full class forks (up_to) — catch up outstanding free research.
          picksNeeded: freeLeft,
        })
      }
    }
    steps = withPactTomeCantripsStep(steps, {
      classEntryId,
      className: row.name,
      classLevel: row.level,
      featurePicks: picksState,
    })
    if (steps.length === 0) {
      if (!options?.silentIfEmpty) {
        setToast('Все развилки и ASI для этого класса закрыты')
      }
      return
    }
    openGuidedWizard({ steps, index: 0 })
  }

  /** Save MC/class grant picks; optionally open feature wizard. */
  function commitClassGrantPicks(
    entryId: string,
    picks: ClassGrantPicks,
    options?: {
      openWizardAfter?: boolean
      classes?: typeof state.classes
      toast?: string
      /** Pipeline step to jump to after saving start-class grants. */
      advanceToStep?: CreatePipelineStepId
    },
  ) {
    const classesForWizard = options?.classes ?? state.classes
    const nextPicks = {
      ...state.classGrantPicks,
      [entryId]: picks,
    }
    const nextState: CreatePipelineState = {
      ...state,
      classes: classesForWizard,
      classGrantPicks: nextPicks,
    }
    const classCatalogByEntryId = Object.fromEntries(
      classesForWizard.map((row) => {
        const catalog =
          classes.find((item) => item.id === row.catalog_id) ||
          classes.find(
            (item) =>
              item.name_ru.trim().toLowerCase() === row.name.trim().toLowerCase(),
          ) ||
          null
        return [row.id, catalog]
      }),
    )
    const gear = materializeCreatePipelineGear({
      state: nextState,
      backgroundEntry: resolveBackgroundEntryForGear(nextState, backgrounds),
      classCatalogByEntryId,
      spells,
      ensureWizardBook: true,
    })
    setSpells(gear.spells)
    setState({
      ...nextState,
      sheetDraft: {
        ...nextState.sheetDraft,
        class_grant_picks: nextPicks,
        ...gear.sheetDraftPatch,
      },
      stepDirty: { ...nextState.stepDirty, class: true, leveling: true },
      ...(options?.advanceToStep ? { step: options.advanceToStep } : {}),
    })
    setClassSetup(null)
    if (options?.toast) {
      setToast(
        gear.ensuredSpellbook
          ? `${options.toast} · добавлена книга заклинаний`
          : options.toast,
      )
    } else if (gear.ensuredSpellbook) {
      setToast('Добавлена книга заклинаний волшебника')
    }
    if (!options?.openWizardAfter) return
    openFeatureWizardForClass(entryId, {
      classes: classesForWizard,
      featurePicks: state.featurePicks ?? emptyFeaturePicks(),
      silentIfEmpty: true,
    })
  }

  /**
   * Multiclass without skill/tool forks (друид, колдун…): apply empty picks and close —
   * do not leave an empty ClassSetup dialog that only has «Отмена».
   */
  function beginMulticlassGrant(classEntryId: string, classRows?: typeof state.classes) {
    const rows = classRows ?? state.classes
    const row = rows.find((item) => item.id === classEntryId)
    const catalog =
      classes.find((item) => item.id === row?.catalog_id) ||
      classes.find(
        (item) =>
          item.name_ru.trim().toLowerCase() === (row?.name ?? '').trim().toLowerCase(),
      )
    if (!catalog || !row) {
      setToast('Сначала зафиксируйте класс')
      return
    }
    const def = resolveClassGrantDef({
      className: catalog.name_ru,
      catalogSlug: catalog.slug,
      catalogData: catalog.data,
    })
    if (!def) {
      setToast('Нет пакета владений для класса')
      return
    }
    if (!grantNeedsSetupDialog(def, 'multiclass')) {
      commitClassGrantPicks(classEntryId, emptyClassGrantPicks(), {
        openWizardAfter: true,
        classes: rows,
        toast: `Мультикласс «${catalog.name_ru}»: владения применены`,
      })
      return
    }
    setClassSetup({
      def,
      mode: 'multiclass',
      classEntryId,
      openWizardAfter: true,
    })
  }

  function beginSubclassSelection(
    classEntryId: string,
    selected: CatalogEntry,
    options?: {
      changeMode?: SubclassChangeMode
      changedAtClassLevel?: number
      previousEntry?: ReturnType<typeof catalogSnapshot> | null
      previousPicks?: SubclassGrantPicks
      advanceWizardAfter?: boolean
    },
  ) {
    const def = resolveSubclassDefFromCatalog({
      nameRu: selected.name_ru,
      slug: selected.slug,
      catalogData: selected.data,
    })
    if (def && subclassNeedsSetupDialog(def)) {
      // Close the change-archetype list so Cancel on setup is not followed by
      // another modal that also needs «Отмена».
      setSubclassPicker(null)
      // Pause the wizard (same as background setup) so archetype forks open in
      // SubclassSetup alone — not under the wizard dialog at the same z-index.
      if (options?.advanceWizardAfter && guidedWizard) {
        setPausedWizardForSubclass(guidedWizard)
        setGuidedWizard(null)
      }
      setSubclassSetup({
        classEntryId,
        selected,
        def,
        changeMode: options?.changeMode,
        changedAtClassLevel: options?.changedAtClassLevel,
        previousEntry: options?.previousEntry ?? null,
        previousPicks: options?.previousPicks,
        advanceWizardAfter: options?.advanceWizardAfter,
      })
      return
    }
    commitSubclassSetup(classEntryId, selected, emptySubclassPicks(), def, options)
  }

  function commitSubclassSetup(
    classEntryId: string,
    selected: CatalogEntry,
    picks: SubclassGrantPicks,
    def: SubclassGrantDef | null,
    options?: {
      changeMode?: SubclassChangeMode
      changedAtClassLevel?: number
      previousEntry?: ReturnType<typeof catalogSnapshot> | null
      previousPicks?: SubclassGrantPicks
      advanceWizardAfter?: boolean
    },
  ) {
    const nextClasses = state.classes.map((row) =>
      row.id === classEntryId
        ? {
            ...row,
            subclass_name: selected.name_ru,
            subclass_catalog_id: selected.id,
          }
        : row,
    )
    const nextSetups = {
      ...state.subclassSetups,
      [classEntryId]: {
        entry: catalogSnapshot(selected),
        picks,
        ...(options?.changeMode
          ? {
              changeMode: options.changeMode,
              changedAtClassLevel: options.changedAtClassLevel,
              previousEntry: options.previousEntry ?? null,
              previousPicks: options.previousPicks,
            }
          : {}),
      },
    }
    // Battle Master: maneuvers_3 (flavor) → feature_picks.combat_superiority
    const nextFeaturePicks = bridgeManeuversIntoFeaturePicks({
      featurePicks: state.featurePicks ?? emptyFeaturePicks(),
      classEntryId,
      maneuverIds: extractManeuverIdsFromSubclassPicks(picks),
      mode: 'merge_missing',
    })
    patchState({
      classes: nextClasses,
      subclassSetups: nextSetups,
      featurePicks: nextFeaturePicks,
      sheetDraft: {
        ...state.sheetDraft,
        subclass_setups: nextSetups,
        feature_picks: featurePicksToSheet(nextFeaturePicks),
      },
      stepDirty: { ...state.stepDirty, leveling: true },
    })
    setSubclassSetup(null)
    setSubclassPicker(null)
    setSubclassChange(null)
    setToast(
      def
        ? options?.changeMode === 'future_only'
          ? `Архетип «${selected.name_ru}»: только будущие уровни`
          : `Архетип «${selected.name_ru}» сохранён`
        : `Архетип «${selected.name_ru}» (без пакета грантов)`,
    )
    if (options?.advanceWizardAfter || advanceWizardAfterSubclass) {
      setAdvanceWizardAfterSubclass(false)
      setPausedWizardForSubclass((paused) => {
        if (paused) {
          // Resume after confirming forks collected while wizard was paused.
          const nextIndex = paused.index + 1
          if (nextIndex >= paused.steps.length) {
            setToast('Развилки сохранены')
            setGuidedWizard(null)
          } else {
            setGuidedWizard({ ...paused, index: nextIndex })
          }
          return null
        }
        // No pause (empty pack auto-apply while wizard stayed open).
        setGuidedWizard((prev) => {
          if (!prev) return null
          const nextIndex = prev.index + 1
          if (nextIndex >= prev.steps.length) {
            setToast('Развилки сохранены')
            return null
          }
          return { ...prev, index: nextIndex }
        })
        return null
      })
    }
  }

  function requestSubclassChangeFromPicker(classEntryId: string, selected: CatalogEntry) {
    const existing = state.subclassSetups?.[classEntryId]
    const row = state.classes.find((item) => item.id === classEntryId)
    if (existing && existing.entry.id && existing.entry.id !== selected.id) {
      setSubclassChange({
        classEntryId,
        selected,
        fromName: row?.subclass_name || existing.entry.name_ru,
        textSnippets: [],
        previousEntry: existing.entry,
        previousPicks: existing.picks,
        classLevel: row?.level ?? 1,
      })
      return
    }
    beginSubclassSelection(classEntryId, selected, { advanceWizardAfter: advanceWizardAfterSubclass })
  }

  async function openArchetypePicker(classEntryId: string) {
    const row = state.classes.find((item) => item.id === classEntryId)
    if (!row?.catalog_id) {
      setToast('Сначала зафиксируйте класс из справочника')
      return
    }
    try {
      const options = await listCatalogEntries({
        kind: 'subclass',
        edition: '2014',
        parentId: row.catalog_id,
      })
      if (!options.length) {
        setToast('В справочнике нет архетипов для этого класса')
        return
      }
      setSubclassPicker({
        classEntryId,
        parentCatalogId: row.catalog_id,
        className: row.name,
        options: options.filter((entry) => entry.is_active).sort((a, b) =>
          a.name_ru.localeCompare(b.name_ru, 'ru'),
        ),
      })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить архетипы')
    }
  }

  function clearStepFields(step: CreatePipelineStepId, nextStep: CreatePipelineStepId) {
    if (step === 'abilities') {
      patchState({
        step: nextStep,
        baseAbilities: createEmptyPipelineState().baseAbilities,
        abilityMethod: 'standard_array',
        stepDirty: { ...state.stepDirty, abilities: false },
      })
      return
    }
    if (step === 'leveling') {
      patchState({
        step: nextStep,
        classes: [
          createClassLevel({
            id: state.classEntryId,
            name: state.classRef?.nameRu ?? '',
            catalog_id: state.classRef?.id ?? null,
            level: 1,
          }),
        ],
        hpChoices: [],
        subclassSetups: {},
        featurePicks: emptyFeaturePicks(),
        classAsi: [],
        stepDirty: { ...state.stepDirty, leveling: false },
      })
      setGuidedWizard(null)
      setSubclassPicker(null)
      setSubclassSetup(null)
      return
    }
    if (step === 'class') {
      patchState({
        step: nextStep,
        classRef: null,
        classGrantPicks: {},
        subclassSetups: {},
        featurePicks: emptyFeaturePicks(),
        classAsi: [],
        classes: [createClassLevel({ id: state.classEntryId, level: 1 })],
        hpChoices: [],
        stepDirty: { ...state.stepDirty, class: false },
      })
      setSelectedClass(null)
      setClassSetup(null)
      return
    }
    if (step === 'background') {
      patchState({
        step: nextStep,
        background: null,
        backgroundSetup: null,
        stepDirty: { ...state.stepDirty, background: false },
      })
      setSelectedBackground(null)
      return
    }
    if (step === 'feat') {
      patchState({
        step: nextStep,
        feat: null,
        featSetup: null,
        featAcknowledged: false,
        stepDirty: { ...state.stepDirty, feat: false },
      })
      setSelectedFeat(null)
      setFeatSetupOpen(false)
      return
    }
    if (step === 'race') {
      patchState({
        step: nextStep,
        race: null,
        subrace: null,
        raceSetup: null,
        feat: null,
        featSetup: null,
        featAcknowledged: false,
        characterName: state.characterName,
        stepDirty: { ...state.stepDirty, race: false, feat: false },
      })
      setRacialBonuses({})
      setSelectedRace(null)
      setSelectedFeat(null)
      setFeatSetupOpen(false)
      return
    }
    patchState({ step: nextStep })
  }

  function goToStep(next: CreatePipelineStepId) {
    const current = state.step
    const steps = visiblePipelineSteps(state.raceSetup)
    const nextIdx = stepIndex(next, steps)
    const curIdx = stepIndex(current, steps)
    if (nextIdx < 0 || nextIdx > curIdx) return
    if (nextIdx < curIdx) {
      clearStepFields(current, next)
      return
    }
    patchState({ step: next })
  }

  function advanceFrom(step: CreatePipelineStepId) {
    const next = nextVisibleStep(step, state.raceSetup)
    if (next) patchState({ step: next })
  }

  async function persist(options: { asDraft: boolean; allowEmptySpells?: boolean }) {
    setBusy(true)
    setError(null)
    try {
      const applied = await applyPipelineToSheet({
        state: {
          ...state,
          sheetDraft: {
            ...state.sheetDraft,
            feature_picks: state.featurePicks,
            spells: spellsToSheet(spells),
            class_asi: state.classAsi,
            class_grant_picks: state.classGrantPicks,
            subclass_setups: state.subclassSetups,
          },
        },
        featurePicks: state.featurePicks,
        classAsi: state.classAsi,
        spells,
        catalog: { backgrounds, races, classes },
      })
      const { sheet, name, level, class_name, race_name, hp } = applied

      let saved: CharacterDetail
      if (state.characterId && state.sheetVersion != null) {
        saved = await updateCharacter(state.characterId, {
          sheet_version: state.sheetVersion,
          name,
          level,
          class_name,
          race_name,
          hp_current: hp,
          hp_max: hp,
          is_draft: options.asDraft,
          sheet,
        })
      } else {
        saved = await createCharacter('2014', name, { isDraft: options.asDraft })
        saved = await updateCharacter(saved.id, {
          sheet_version: saved.sheet_version,
          name,
          level,
          class_name,
          race_name,
          hp_current: hp,
          hp_max: hp,
          is_draft: options.asDraft,
          sheet,
        })
      }

      clearPipelineState()
      if (options.asDraft) {
        navigate('/characters')
        return
      }
      onboarding.markCreateHintsSeen()
      onboarding.queueAfterCreate()
      navigate(`/characters/${saved.id}`, {
        state: {
          toast: 'Персонаж готов',
          onboardingReady: true,
        },
      })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  function abilitiesValid(): boolean {
    if (state.abilityMethod === 'point_buy') return isPointBuyValid(state.baseAbilities)
    if (state.abilityMethod === 'standard_array') {
      return isStandardArrayComplete(state.baseAbilities)
    }
    if (state.abilityMethod === 'roll') return isRollScoresValid(state.baseAbilities)
    return isManualScoresValid(state.baseAbilities)
  }

  function canFinishHardBlocks(): string | null {
    if (!state.race) return 'Выберите расу'
    if (raceRequiresCatalogFeat(state.raceSetup) && !state.featSetup) {
      return 'Выберите черту расы'
    }
    if (raceNeedsFeatStep(state.raceSetup) && !state.feat && !state.featAcknowledged) {
      return 'Закройте шаг черты'
    }
    if (!state.background) return 'Выберите предысторию'
    if (!state.classRef) return 'Выберите класс'
    if (!state.classGrantPicks?.[state.classEntryId]) {
      return 'Выберите навыки и снаряжение класса'
    }
    if (!state.characterName.trim()) return 'Укажите имя на шаге расы'
    if (state.gender == null) return 'Укажите пол на шаге расы'
    if (!abilitiesValid()) return 'Закройте характеристики'
    if (!state.classes.some((row) => row.level > 0 && row.name.trim())) {
      return 'Задайте уровни в прокачке'
    }
    for (const feature of unlockedFeatures) {
      if (!isSubclassGateFeature(feature)) continue
      const row = state.classes.find((item) => item.id === feature.classEntryId)
      if (!row || hasSubclassSelected(row)) continue
      return `Выберите архетип для «${row.name || feature.className}» (${feature.name_ru})`
    }
    return null
  }

  function requestFinish() {
    const hard = canFinishHardBlocks()
    if (hard) {
      setToast(hard)
      return
    }
    const maybeCaster = state.classes.some((row) => CASTER_NAME_RE.test(row.name))
    const hasSpells = (spells.known?.length ?? 0) > 0
    if (maybeCaster && !hasSpells) {
      setSpellWarnOpen(true)
      return
    }
    // Known casters (warlock/sorcerer/bard/…): soft warn if under budget — MC
    // sheets with other classes' spells used to skip the empty-spells gate.
    const knownGaps = spellLearnBudgets.filter((row) => {
      if (row.mode !== 'known') return false
      const cantrips = countLearnedCantripsForSlug(spells.known, row.slug)
      const leveled = countLearnedLeveledForSlug(spells.known, row.slug)
      const cantripShort = row.cantrips > 0 && cantrips < row.cantrips
      const leveledShort =
        row.leveledKnown != null &&
        row.leveledKnown > 0 &&
        leveled < row.leveledKnown
      return cantripShort || leveledShort
    })
    if (knownGaps.length > 0) {
      setSpellWarnOpen(true)
      return
    }
    void persist({ asDraft: false })
  }

  const step = state.step
  const featNote = raceFeatNoteRu(state.raceSetup)
  const needsCatalogFeat = raceRequiresCatalogFeat(state.raceSetup)
  const featStepReady = needsCatalogFeat
    ? Boolean(state.featSetup)
    : Boolean(state.feat || state.featAcknowledged)
  /** Phone create hides detail (Сводка only) — open setup from card/footer. */
  const createPhoneLayout =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches

  async function openRaceSetupFor(entry: CatalogEntry) {
    setSelectedRace(entry)
    let all = races
    try {
      all = await listCatalogEntries({ kind: 'race', edition: '2014' })
    } catch {
      // keep cached roots
    }
    const subraces = all.filter((row) => row.parent_id === entry.id)
    setRaceSetup({
      root: entry,
      subraces,
      required: raceSubraceRequired(entry.data),
    })
  }

  function openBackgroundSetupFor(entry: CatalogEntry) {
    setSelectedBackground(entry)
    const variants = backgrounds.filter((row) => row.parent_id === entry.id)
    setBgSetup({ root: entry, variants })
  }

  function openClassSetupFor(entry: CatalogEntry) {
    setSelectedClass(entry)
    const def = resolveClassGrantDef({
      className: entry.name_ru,
      catalogSlug: entry.slug,
      catalogData: entry.data,
    })
    if (!def) {
      setToast('Нет пакета владений для класса')
      return
    }
    const entryId = state.classEntryId || createClassLevel().id
    const nextClasses = [
      createClassLevel({
        id: entryId,
        name: entry.name_ru,
        catalog_id: entry.id,
        level: 1,
      }),
    ]
    patchState({
      classRef: catalogRef(entry),
      classEntryId: entryId,
      classes: nextClasses,
      hpChoices: ensureHpChoices(nextClasses, []),
      classGrantPicks: {},
      stepDirty: { ...state.stepDirty, class: true },
    })
    setClassSetup({
      def,
      mode: 'start',
      classEntryId: entryId,
      openWizardAfter: false,
    })
  }

  let cards = null
  let detail = null
  let footer = null

  if (step === 'race') {
    const raceReady = Boolean(
      state.race && state.characterName.trim() && state.gender != null,
    )
    cards = (
      <CatalogCardList
        resetToken={step}
        items={races.map((entry) => ({
          id: entry.id,
          title: entry.name_ru,
          subtitle: entry.name_en ?? undefined,
          source: entry.source,
          meta: raceCardMeta(entry),
        }))}
        selectedId={selectedRace?.id ?? state.race?.id ?? null}
        onSelect={(id) => {
          const entry = races.find((row) => row.id === id) ?? null
          setSelectedRace(entry)
          if (entry && createPhoneLayout) void openRaceSetupFor(entry)
        }}
      />
    )
    detail = (
      <CatalogDetailPanel
        kind="race"
        entry={selectedRace}
        emptyTitle={state.race?.nameRu ?? 'Раса'}
      >
        {state.characterName.trim() ? (
          <Text tone="muted">Имя: {state.characterName.trim()}</Text>
        ) : (
          <Text tone="muted">Имя и пол укажешь в окне настройки расы.</Text>
        )}
        {state.gender ? (
          <Text tone="muted">Пол: {CHARACTER_GENDER_LABELS[state.gender]}</Text>
        ) : null}
        <Button
          disabled={!selectedRace}
          onClick={() => {
            if (!selectedRace) return
            void openRaceSetupFor(selectedRace)
          }}
        >
          Выбрать и настроить
        </Button>
        {state.race ? <Text tone="muted">Выбрано: {state.race.nameRu}</Text> : null}
      </CatalogDetailPanel>
    )
    footer = (
      <Button
        disabled={!raceReady && !selectedRace}
        onClick={() => {
          if (raceReady) {
            advanceFrom('race')
            return
          }
          if (selectedRace) void openRaceSetupFor(selectedRace)
        }}
      >
        {raceReady
          ? raceNeedsFeatStep(state.raceSetup)
            ? 'Далее · Черта'
            : 'Далее · Предыстория'
          : 'Настроить расу'}
      </Button>
    )
  }

  if (step === 'feat') {
    cards = (
      <CatalogCardList
        resetToken={step}
        items={feats.map((entry) => ({
          id: entry.id,
          title: entry.name_ru,
          subtitle: entry.name_en ?? undefined,
          source: entry.source,
        }))}
        selectedId={selectedFeat?.id ?? state.feat?.id ?? null}
        onSelect={(id) => {
          const entry = feats.find((row) => row.id === id) ?? null
          setSelectedFeat(entry)
          // Phone hides detail (Сводка only) — open setup like race/background/class.
          if (entry && createPhoneLayout) setFeatSetupOpen(true)
        }}
        emptyText={
          needsCatalogFeat
            ? 'Выбери черту из каталога (раса даёт черту с 1 уровня)'
            : 'В каталоге пока мало черт — можно отметить заметку расы и продолжить'
        }
      />
    )
    detail = (
      <CatalogDetailPanel
        kind="feat"
        entry={selectedFeat}
        emptyTitle="Черта"
        emptyHint={
          needsCatalogFeat
            ? 'Раса даёт черту с 1 уровня — настрой её здесь (не в попапе расы).'
            : featNote || 'Раса даёт черту с 1 уровня.'
        }
      >
        {featNote && !needsCatalogFeat ? (
          <Text>
            Заметка расы: {featNote}
          </Text>
        ) : null}
        <div className="create-pipeline__method-row">
          <Button
            disabled={!selectedFeat && !state.featSetup}
            onClick={() => setFeatSetupOpen(true)}
          >
            {state.featSetup ? 'Сменить черту' : 'Выбрать и настроить'}
          </Button>
          {!needsCatalogFeat ? (
            <Button
              variant="secondary"
              onClick={() => {
                patchState({
                  feat: null,
                  featSetup: null,
                  featAcknowledged: true,
                  stepDirty: { ...state.stepDirty, feat: true },
                  // Same as catalog feat confirm: finish block → next step.
                  step: 'background',
                })
                setToast('Черта отмечена. Далее — предыстория.')
              }}
            >
              Отметить без каталога
            </Button>
          ) : null}
        </div>
        {state.featSetup ? (
          <Text tone="muted">Выбрано: {state.featSetup.entry.name_ru}</Text>
        ) : state.feat ? (
          <Text tone="muted">Выбрано: {state.feat.nameRu}</Text>
        ) : state.featAcknowledged ? (
          <Text tone="muted">Черта отмечена без карточки каталога</Text>
        ) : null}
      </CatalogDetailPanel>
    )
    footer = (
      <Button
        disabled={!featStepReady && !selectedFeat && needsCatalogFeat}
        onClick={() => {
          if (featStepReady) {
            advanceFrom('feat')
            return
          }
          setFeatSetupOpen(true)
        }}
      >
        {featStepReady ? 'Далее · Предыстория' : 'Настроить черту'}
      </Button>
    )
  }

  if (step === 'background') {
    cards = (
      <CatalogCardList
        resetToken={step}
        items={backgrounds.map((entry) => ({
          id: entry.id,
          title: entry.name_ru,
          subtitle: entry.name_en ?? undefined,
          source: entry.source,
          meta: backgroundCardMeta(entry),
        }))}
        selectedId={selectedBackground?.id ?? state.background?.id ?? null}
        onSelect={(id) => {
          const entry = backgrounds.find((row) => row.id === id) ?? null
          setSelectedBackground(entry)
          if (entry && createPhoneLayout) openBackgroundSetupFor(entry)
        }}
      />
    )
    detail = (
      <CatalogDetailPanel
        kind="background"
        entry={selectedBackground}
        emptyTitle={state.background?.nameRu ?? 'Предыстория'}
      >
        <Button
          disabled={!selectedBackground}
          onClick={() => {
            if (!selectedBackground) return
            openBackgroundSetupFor(selectedBackground)
          }}
        >
          Выбрать и настроить
        </Button>
        {state.background ? (
          <Text tone="muted">Выбрано: {state.background.nameRu}</Text>
        ) : null}
      </CatalogDetailPanel>
    )
    footer = (
      <Button
        disabled={!state.background && !selectedBackground}
        onClick={() => {
          if (state.background) {
            advanceFrom('background')
            return
          }
          if (selectedBackground) openBackgroundSetupFor(selectedBackground)
        }}
      >
        {state.background ? 'Далее · Класс' : 'Настроить предысторию'}
      </Button>
    )
  }

  if (step === 'class') {
    cards = (
      <CatalogCardList
        resetToken={step}
        items={classes.map((entry) => ({
          id: entry.id,
          title: entry.name_ru,
          subtitle: entry.name_en ?? undefined,
          source: entry.source,
        }))}
        selectedId={selectedClass?.id ?? state.classRef?.id ?? null}
        onSelect={(id) => {
          const entry = classes.find((row) => row.id === id) ?? null
          setSelectedClass(entry)
          if (entry && createPhoneLayout) openClassSetupFor(entry)
        }}
      />
    )
    detail = (
      <CatalogDetailPanel
        kind="class"
        entry={selectedClass}
        emptyTitle={state.classRef?.nameRu ?? 'Класс'}
      >
        <Button
          disabled={!selectedClass}
          onClick={() => {
            if (!selectedClass) return
            openClassSetupFor(selectedClass)
          }}
        >
          Выбрать и настроить
        </Button>
        {state.classRef && state.classGrantPicks?.[state.classEntryId] ? (
          <Text tone="muted">
            Класс «{state.classRef.nameRu}»: навыки и снаряжение сохранены
          </Text>
        ) : state.classRef ? (
          <Text tone="muted">Класс зафиксирован — завершите диалог владений</Text>
        ) : null}
      </CatalogDetailPanel>
    )
    const classReady = Boolean(
      state.classRef && state.classGrantPicks?.[state.classEntryId],
    )
    footer = (
      <Button
        disabled={!classReady && !selectedClass}
        onClick={() => {
          if (classReady) {
            advanceFrom('class')
            return
          }
          if (selectedClass) openClassSetupFor(selectedClass)
        }}
      >
        {classReady ? 'Далее · Характеристики' : 'Настроить класс'}
      </Button>
    )
  }

  if (step === 'abilities') {
    cards = (
      <Stack gap={8}>
        <Text tone="muted">Итог с расовыми бонусами</Text>
        {Object.entries(finalAbilities).map(([key, score]) => (
          <Text key={key}>
            {key.toUpperCase()}: {score}
          </Text>
        ))}
      </Stack>
    )
    detail = (
      <AbilitiesStep
        method={state.abilityMethod}
        baseAbilities={state.baseAbilities}
        racialBonuses={racialBonuses}
        classSlug={state.classRef?.slug ?? null}
        onMethodChange={(method) => patchState({ abilityMethod: method })}
        onBaseChange={(baseAbilities) =>
          patchState({ baseAbilities, stepDirty: { ...state.stepDirty, abilities: true } })
        }
      />
    )
    footer = (
      <Button
        disabled={!abilitiesValid()}
        onClick={() => {
          patchState({
            hpChoices: ensureHpChoices(state.classes, state.hpChoices),
          })
          advanceFrom('abilities')
        }}
      >
        Далее · Прокачка
      </Button>
    )
  }

  if (step === 'leveling') {
    cards = (
      <Stack gap={8}>
        <Text>Уровень персонажа: {totalCharacterLevel(state.classes)}</Text>
        {state.classes.map((row) => (
          <Text key={row.id} tone="muted">
            {row.name || '—'} {row.level}
          </Text>
        ))}
        {spellcastingSuggestion && spellcastingSuggestion.progression !== 'none' ? (
          <Text tone="muted">
            {spellcastingSuggestion.max_prepared == null
              ? `Известно: ${spells.known.filter((row) => row.level > 0).length}`
              : `Подготовка: до ${spellcastingSuggestion.max_prepared}`}
          </Text>
        ) : null}
      </Stack>
    )
    detail = (
      <LevelingStep
        classes={state.classes}
        classCatalog={classes}
        abilities={wizardAbilities}
        hpChoices={state.hpChoices}
        primaryClassEntryId={state.classEntryId}
        hasClassGrantPicks={hasClassGrantPicks}
        racialSpells={raceGrantDef?.racialSpells ?? []}
        hasCasterClass={hasCasterClass}
        featNoteRu={featNote}
        onClassesChange={(next) =>
          patchState({
            classes: next,
            hpChoices: ensureHpChoices(next, state.hpChoices),
            stepDirty: { ...state.stepDirty, leveling: true },
          })
        }
        onHpChoicesChange={(hpChoices) => patchState({ hpChoices })}
        onChangeArchetype={(classEntryId) => {
          void openArchetypePicker(classEntryId)
        }}
        onMulticlassAdded={(classEntryId, nextClasses) => {
          beginMulticlassGrant(classEntryId, nextClasses)
        }}
        onOpenChoices={(classEntryId) => {
          const row = state.classes.find((item) => item.id === classEntryId)
          if (!row) {
            setToast('Сначала зафиксируйте класс')
            return
          }
          const isPrimary = classEntryId === state.classEntryId
          if (!state.classGrantPicks?.[classEntryId]) {
            // Primary should already have picks from the class step; MC still opens setup.
            if (isPrimary) {
              setToast('Вернитесь на шаг «Класс» и настройте владения')
              return
            }
            beginMulticlassGrant(classEntryId)
            return
          }
          openFeatureWizardForClass(classEntryId)
        }}
        onOpenSpells={() => {
          setGrimoireClassFilter(null)
          setSpellsOpen('grimoire')
        }}
        onOpenSpellsForClass={(slug) => {
          setGrimoireClassFilter(slug)
          setSpellsOpen('grimoire')
        }}
        onOpenPrepare={
          spellLearnBudgets.some((row) => row.mode === 'spellbook') ||
          spellLearnBudget?.mode === 'spellbook'
            ? () => setSpellsOpen('prepare')
            : undefined
        }
        spellBudgetMeta={
          spellLearnBudgets.length > 1
            ? formatNamedCantripBudgets(
                spellLearnBudgets,
                Object.fromEntries(
                  spellLearnBudgets.map((row) => [
                    row.slug,
                    countLearnedCantripsForSlug(spells.known, row.slug),
                  ]),
                ),
              )
            : null
        }
        spellClassBudgets={
          spellLearnBudgets.length > 0
            ? spellLearnBudgets.map((row) => ({
                slug: row.slug,
                labelRu: row.labelRu,
                mode: row.mode,
                cantripsKnown: countLearnedCantripsForSlug(spells.known, row.slug),
                cantripsMax: row.cantrips,
                leveledKnown: countLearnedLeveledForSlug(spells.known, row.slug),
                leveledKnownMax: row.leveledKnown,
              }))
            : null
        }
        spellcasting={
          spellcastingSuggestion && spellcastingSuggestion.progression !== 'none'
            ? {
                labelRu: spellLearnBudget?.labelRu ?? spellcastingSuggestion.labelRu,
                mode: spellLearnBudget?.mode,
                maxPrepared: spellcastingSuggestion.max_prepared,
                knownLeveled: countLearnedLeveled(spells.known),
                preparedLeveled: countPreparedLeveled(spells.known),
                cantripsKnown: countLearnedCantrips(spells.known),
                cantripsMax:
                  spellLearnBudgets.length > 1
                    ? totalCantripsBudget(spellLearnBudgets)
                    : (spellLearnBudget?.cantrips ?? null),
                leveledKnownMax: spellLearnBudget?.leveledKnown ?? null,
                freeBookLeft:
                  spellLearnBudget?.mode === 'spellbook'
                    ? remainingFreeSpellbookSlots(
                        spells.known,
                        state.classes.find((row) =>
                          /волшебник|wizard|маг/i.test(row.name),
                        )?.level ?? 1,
                      )
                    : null,
                unpreparedLeveled: spells.known.filter(
                  (spell) => spell.level > 0 && !spell.prepared,
                ).length,
                slots: spellcastingSuggestion.slots,
                pactSlots: spellcastingSuggestion.pact_slots,
              }
            : null
        }
      />
    )
    footer = (
      <div className="create-pipeline__footer-actions">
        <Button variant="secondary" disabled={busy} onClick={() => void persist({ asDraft: true })}>
          Сохранить черновик
        </Button>
        <Button disabled={busy} onClick={requestFinish}>
          Готово
        </Button>
      </div>
    )
  }

  const backTarget = prevVisibleStep(step, state.raceSetup)

  return (
    <main className="page page--app page--create-pipeline">
      <div className="create-pipeline__topbar">
        <Link to="/characters">← К списку</Link>
        <Text tone="muted">Создание · D&D 2014</Text>
      </div>
      {error ? <Text tone="danger">{error}</Text> : null}
      <CreatePipelineShell
        step={step}
        steps={visibleSteps}
        title="Создание персонажа"
        subtitle="Раса → черта* → предыстория → класс → характеристики → прокачка"
        stepHint={
          <StepHint step={step} visible={onboarding.state.segment !== 'skip'} />
        }
        cards={cards}
        detail={detail}
        footer={footer}
        detailPrimary={step === 'abilities' || step === 'leveling'}
        onStepClick={goToStep}
        onBack={
          backTarget
            ? () => goToStep(backTarget)
            : () => navigate('/characters')
        }
      />

      <BackgroundSetupDialog
        open={Boolean(bgSetup)}
        root={bgSetup?.root ?? null}
        variants={bgSetup?.variants ?? []}
        blockedLanguageNames={blockedLanguageNames}
        onClose={() => setBgSetup(null)}
        onConfirm={(result: BackgroundSetupConfirm) => {
          const nextState: CreatePipelineState = {
            ...state,
            background: catalogRef(result.entry),
            backgroundSetup: {
              entry: catalogSnapshot(result.entry),
              picks: result.picks,
            },
          }
          const classCatalogByEntryId = Object.fromEntries(
            nextState.classes.map((row) => {
              const catalog =
                classes.find((item) => item.id === row.catalog_id) ||
                classes.find(
                  (item) =>
                    item.name_ru.trim().toLowerCase() ===
                    row.name.trim().toLowerCase(),
                ) ||
                null
              return [row.id, catalog]
            }),
          )
          const gear = materializeCreatePipelineGear({
            state: nextState,
            backgroundEntry: result.entry,
            classCatalogByEntryId,
            spells,
            ensureWizardBook: true,
          })
          setSpells(gear.spells)
          setState({
            ...nextState,
            sheetDraft: {
              ...nextState.sheetDraft,
              ...gear.sheetDraftPatch,
              background_grant: {
                backgroundCatalogId: result.entry.id,
                backgroundSlug: result.entry.slug,
                picks: result.picks,
              },
            },
            stepDirty: { ...nextState.stepDirty, background: true },
            step: 'class',
          })
          setBgSetup(null)
          setToast(`Предыстория «${result.entry.name_ru}». Далее — класс.`)
        }}
      />

      <RaceSetupDialog
        open={Boolean(raceSetup)}
        edition="2014"
        root={raceSetup?.root ?? null}
        subraces={raceSetup?.subraces ?? []}
        subraceRequired={raceSetup?.required ?? false}
        abilities={state.baseAbilities as Record<AbilityKey, number>}
        armor={EMPTY_ARMOR}
        hasSpellcasting={hasCasterClass}
        backgroundSlug={state.backgroundSetup?.entry.slug ?? null}
        characterName={state.characterName}
        deferFeatPick
        gender={state.gender}
        enableNameGeneration
        onClose={() => setRaceSetup(null)}
        onConfirm={(result: RaceSetupConfirm) => {
          setRacialBonuses(
            mergeAbilityBonuses(
              result.def.abilityBonuses,
              result.def.abilityBonusChoices,
              result.picks.abilityBonusKeys,
              result.picks.abilityBonusModeId,
            ),
          )
          const isSub = Boolean(result.entry.parent_id)
          const rootEntry = raceSetup?.root ?? null
          const nextRaceSetup = {
            entry: catalogSnapshot(result.entry),
            rootEntry: rootEntry ? catalogSnapshot(rootEntry) : null,
            picks: result.picks,
          }
          const needsFeat =
            raceRequiresFeatPick(result.def) ||
            Boolean(result.def.featNoteRu?.trim())
          patchState({
            characterName: result.characterName,
            gender: result.gender,
            race: isSub
              ? state.race ??
                (rootEntry ? catalogRef(rootEntry) : catalogRef(result.entry))
              : catalogRef(result.entry),
            subrace: isSub ? catalogRef(result.entry) : null,
            raceSetup: nextRaceSetup,
            // Race popup no longer picks the feat — clear stale picks on race change.
            feat: null,
            featSetup: null,
            featAcknowledged: false,
            sheetDraft: {
              ...state.sheetDraft,
              race_grant: {
                raceCatalogId: result.entry.id,
                raceSlug: result.entry.slug,
                picks: result.picks,
              },
            },
            stepDirty: { ...state.stepDirty, race: true, feat: false },
            // Auto-advance past feat when race does not grant one.
            step: needsFeat ? 'feat' : 'background',
          })
          setRaceSetup(null)
          setSelectedFeat(null)
          setFeatSetupOpen(false)
          if (needsFeat) {
            setToast(`Раса «${result.entry.name_ru}». Далее — черта.`)
          } else {
            setToast(`Раса «${result.entry.name_ru}». Далее — предыстория.`)
          }
        }}
      />

      <FeatSetupDialog
        open={featSetupOpen}
        edition="2014"
        title="Черта расы"
        abilities={state.baseAbilities as Record<AbilityKey, number>}
        armor={EMPTY_ARMOR}
        hasSpellcasting={hasCasterClass}
        raceSlug={state.subrace?.slug ?? state.race?.slug ?? null}
        raceParentSlug={
          state.subrace && state.race ? state.race.slug : null
        }
        characterLevel={1}
        takenSlugs={[]}
        classSlugs={state.classRef ? [state.classRef.slug] : []}
        backgroundSlug={state.backgroundSetup?.entry.slug ?? null}
        proficientSkills={blockedSkillKeys}
        forcedSlug={selectedFeat?.slug ?? state.feat?.slug ?? null}
        initialEntry={selectedFeat}
        onClose={() => setFeatSetupOpen(false)}
        onConfirm={(result: FeatSetupResult) => {
          const racePicks = state.raceSetup?.picks
          const nextRaceSetup = state.raceSetup
            ? {
                ...state.raceSetup,
                picks: {
                  ...(racePicks ?? state.raceSetup.picks),
                  featCatalogId: result.entry.id,
                },
              }
            : null
          patchState({
            feat: catalogRef(result.entry),
            featSetup: {
              entry: catalogSnapshot(result.entry),
              picks: result.picks,
              applied: result.applied,
            },
            featAcknowledged: true,
            raceSetup: nextRaceSetup,
            sheetDraft: {
              ...state.sheetDraft,
              race_grant: nextRaceSetup
                ? {
                    raceCatalogId: nextRaceSetup.entry.id,
                    raceSlug: nextRaceSetup.entry.slug,
                    picks: nextRaceSetup.picks,
                  }
                : state.sheetDraft.race_grant,
            },
            stepDirty: { ...state.stepDirty, feat: true },
            // Same as race/background: finish setup → jump to next block.
            step: 'background',
          })
          setSelectedFeat(result.entry)
          setFeatSetupOpen(false)
          setToast(`Черта «${result.entry.name_ru}». Далее — предыстория.`)
        }}
      />

      <ClassSetupDialog
        open={Boolean(classSetup)}
        def={classSetup?.def ?? null}
        mode={classSetup?.mode ?? 'start'}
        blockedSkillKeys={blockedSkillKeys}
        blockedToolNames={blockedToolNames}
        edition="2014"
        onClose={() => setClassSetup(null)}
        onConfirm={(picks: ClassGrantPicks) => {
          const entryId = classSetup?.classEntryId ?? state.classEntryId
          const openWizardAfter = classSetup?.openWizardAfter ?? false
          const mode = classSetup?.mode ?? 'start'
          commitClassGrantPicks(entryId, picks, {
            openWizardAfter,
            advanceToStep: mode === 'start' && !openWizardAfter ? 'abilities' : undefined,
            toast:
              mode === 'start'
                ? 'Класс настроен. Далее — характеристики.'
                : 'Выборы класса сохранены',
          })
        }}
      />

      <GuidedWizardDialog
        open={guidedWizard != null}
        session={guidedWizard}
        edition="2014"
        abilities={wizardAbilities}
        skills={wizardProficiencies.skills}
        tools={wizardProficiencies.tools}
        featurePicks={state.featurePicks ?? emptyFeaturePicks()}
        expertiseKeys={expertiseKeys}
        backgroundName={state.background?.nameRu ?? ''}
        blockedSkillKeys={blockedSkillKeys}
        blockedToolNames={blockedToolNames}
        onFeaturePicksChange={(featurePicks: FeaturePicksState) => {
          const sanitized = sanitizeFeaturePicksForPactBoons({
            featurePicks,
            classes: state.classes,
          })
          patchState({
            featurePicks: sanitized,
            sheetDraft: {
              ...state.sheetDraft,
              feature_picks: sanitized,
            },
          })
          setGuidedWizard((prev) => {
            if (!prev) return null
            const step = prev.steps[prev.index]
            if (
              !step ||
              (step.kind !== 'feature_choice' && step.kind !== 'pact_tome_cantrips')
            ) {
              return prev
            }
            const classEntryId = step.classEntryId
            const classRow = state.classes.find((row) => row.id === classEntryId)
            if (!classRow) return prev
            const nextSteps = withPactTomeCantripsStep(prev.steps, {
              classEntryId,
              className: classRow.name,
              classLevel: classRow.level,
              featurePicks: sanitized,
            })
            if (nextSteps === prev.steps) return prev
            return { ...prev, steps: nextSteps }
          })
          void (async () => {
            let rows: Awaited<ReturnType<typeof ensurePactTomeSpellCatalog>> = []
            try {
              rows = await ensurePactTomeSpellCatalog('2014')
            } catch {
              rows = []
            }
            const options = spellOptionsForPactTomeCantrips({ spells: rows })
            setSpells((prev) => {
              const synced = syncPactTomeCantrips({
                spells: prev,
                featurePicks: sanitized,
                classes: state.classes,
                resolveSpell: (slug) =>
                  resolvePactTomeCantripFromOptions(slug, options),
              })
              return synced.changed ? synced.spells : prev
            })
          })()
        }}
        onConfirmClassGrant={() => {
          // Class grants are handled by ClassSetupDialog in the pipeline.
        }}
        onConfirmAsi={(entry: AppliedClassAsi, featGrant?: AppliedFeatGrant) => {
          const nextAsi = [...(state.classAsi ?? []), entry]
          const prevFeats = readFeatGrantLedger(state.sheetDraft.feat_grants)
          const nextFeats = featGrant
            ? [...prevFeats.filter((row) => row.id !== featGrant.id), featGrant]
            : prevFeats
          patchState({
            classAsi: nextAsi,
            sheetDraft: {
              ...state.sheetDraft,
              class_asi: nextAsi,
              feat_grants: nextFeats,
            },
          })
          if (featGrant) {
            setToast(`ASI → черта «${featGrant.nameRu}»`)
            return
          }
          const bits = Object.entries(entry.bonuses)
            .filter(([, amount]) => amount)
            .map(([key, amount]) => `${ABILITY_LABELS[key as AbilityKey]}+${amount}`)
          setToast(bits.length ? `ASI: ${bits.join(', ')}` : 'ASI записан')
        }}
        onSelectBackground={() => {
          setToast('Предыстория уже выбрана на предыдущем шаге')
        }}
        onAdvance={(nextIndex) => {
          setGuidedWizard((prev) => {
            if (!prev) return null
            if (nextIndex >= prev.steps.length) {
              setToast('Развилки сохранены')
              return null
            }
            return { ...prev, index: nextIndex }
          })
        }}
        onSkipStep={() => {
          setGuidedWizard((prev) => {
            if (!prev) return null
            const nextIndex = prev.index + 1
            if (nextIndex >= prev.steps.length) return null
            return { ...prev, index: nextIndex }
          })
        }}
        onClose={() => setGuidedWizard(null)}
        onToast={setToast}
        subclassParentCatalogIdByEntryId={Object.fromEntries(
          state.classes.map((row) => [row.id, row.catalog_id]),
        )}
        selectedSubclassNameByEntryId={Object.fromEntries(
          state.classes.map((row) => [row.id, row.subclass_name]),
        )}
        onPickSubclass={(classEntryId, entry) => {
          setAdvanceWizardAfterSubclass(true)
          beginSubclassSelection(classEntryId, entry, { advanceWizardAfter: true })
        }}
        spellbookPicksContext={(() => {
          const step = guidedWizard?.steps[guidedWizard.index]
          if (!step || step.kind !== 'spellbook_picks') return null
          const inv = readInventory(state.sheetDraft)
          const hasBook = createDraftHasUsableSpellbook({
            spells,
            inventory: inv,
          })
          const slotCap = highestSpellSlotLevelForClasses(state.classes)
          return {
            maxSpellLevel: Math.max(1, slotCap || 1),
            blockedCatalogIds: spells.known
              .map((spell) => spell.catalog_id)
              .filter((id): id is string => Boolean(id)),
            // Real draft inventory + bind; L1 OR only as last-resort safety net.
            hasBook: hasBook || step.classLevel <= 1,
            classListSlugs: ['wizard'],
          }
        })()}
        onConfirmSpellbookPicks={(entries) => {
          const step = guidedWizard?.steps[guidedWizard.index]
          const acquisition =
            step?.kind === 'spellbook_picks' && step.classLevel <= 1
              ? 'starting'
              : 'level_up'
          setSpells((prev) => {
            let known = prev.known
            for (const entry of entries) {
              known = addCatalogSpellToKnown(known, entry, {
                prepare: false,
                spellbook_acquisition: acquisition,
                in_spellbook: true,
              })
            }
            return { ...prev, known }
          })
        }}
      />

      <SubclassSetupDialog
        open={Boolean(subclassSetup)}
        def={subclassSetup?.def ?? null}
        onClose={() => {
          setSubclassSetup(null)
          setAdvanceWizardAfterSubclass(false)
          // Cancel: put the wizard back on the archetype step.
          if (pausedWizardForSubclass) {
            setGuidedWizard(pausedWizardForSubclass)
            setPausedWizardForSubclass(null)
          }
        }}
        onConfirm={(picks: SubclassGrantPicks) => {
          if (!subclassSetup) return
          commitSubclassSetup(
            subclassSetup.classEntryId,
            subclassSetup.selected,
            picks,
            subclassSetup.def,
            {
              changeMode: subclassSetup.changeMode,
              changedAtClassLevel: subclassSetup.changedAtClassLevel,
              previousEntry: subclassSetup.previousEntry,
              previousPicks: subclassSetup.previousPicks,
              advanceWizardAfter: subclassSetup.advanceWizardAfter,
            },
          )
        }}
      />

      {subclassPicker ? (
        <div className="create-pipeline__modal">
          <Stack gap={12}>
            <Text as="h3">Сменить архетип · {subclassPicker.className}</Text>
            <Text tone="muted">Выберите новый подкласс из справочника.</Text>
            <ul className="create-pipeline__card-list">
              {subclassPicker.options.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="create-pipeline__card"
                    onClick={() => {
                      requestSubclassChangeFromPicker(subclassPicker.classEntryId, entry)
                    }}
                  >
                    <span className="create-pipeline__card-title">{entry.name_ru}</span>
                    <span className="create-pipeline__card-sub">
                      {entry.name_en ?? entry.source ?? entry.slug}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="secondary" onClick={() => setSubclassPicker(null)}>
              Отмена
            </Button>
          </Stack>
        </div>
      ) : null}

      <SubclassChangeConfirmDialog
        open={subclassChange != null}
        fromName={subclassChange?.fromName ?? ''}
        toName={subclassChange?.selected.name_ru ?? ''}
        classLevel={subclassChange?.classLevel ?? 1}
        textSnippets={subclassChange?.textSnippets ?? []}
        onClose={() => setSubclassChange(null)}
        onConfirm={({ mode, copyTextToNotes: _copy }) => {
          if (!subclassChange) return
          const pending = subclassChange
          setSubclassChange(null)
          setSubclassPicker(null)
          beginSubclassSelection(pending.classEntryId, pending.selected, {
            changeMode: mode,
            changedAtClassLevel: pending.classLevel,
            previousEntry: pending.previousEntry,
            previousPicks: pending.previousPicks,
          })
        }}
      />

      <GrimoireDialog
        open={spellsOpen === 'grimoire'}
        edition="2014"
        spells={spells}
        classes={state.classes}
        knownCaster={
          spellLearnBudgets.some((row) => row.mode === 'known') ||
          spellLearnBudget?.mode === 'known'
        }
        learnBudget={spellLearnBudget}
        abilityModFor={abilityModFor}
        initialClassFilter={grimoireClassFilter}
        accessContext="create"
        coins={readInventory(state.sheetDraft).coins}
        onCoinsChange={(coins) => {
          const inv = readInventory(state.sheetDraft)
          setState((prev) => ({
            ...prev,
            sheetDraft: {
              ...prev.sheetDraft,
              ...inventoryToSheet({ ...inv, coins }),
            },
          }))
        }}
        inventoryItems={readInventory(state.sheetDraft).items}
        onChange={setSpells}
        onClose={() => {
          setSpellsOpen(null)
          setGrimoireClassFilter(null)
        }}
        onToast={setToast}
      />
      <PrepareSpellsDialog
        open={
          spellsOpen === 'prepare' &&
          (spellLearnBudget?.mode === 'spellbook' ||
            spellLearnBudgets.some((row) => row.mode === 'spellbook'))
        }
        spells={spells}
        learnMode="spellbook"
        onChange={setSpells}
        onClose={() => setSpellsOpen(null)}
      />

      {spellWarnOpen ? (
        <div className="create-pipeline__modal">
          <Stack gap={12}>
            <Text as="h3">Заклинания не добраны</Text>
            <Text>
              {(() => {
                const gaps = spellLearnBudgets
                  .filter((row) => row.mode === 'known')
                  .map((row) => {
                    const cantrips = countLearnedCantripsForSlug(spells.known, row.slug)
                    const leveled = countLearnedLeveledForSlug(spells.known, row.slug)
                    const parts: string[] = []
                    if (row.cantrips > 0 && cantrips < row.cantrips) {
                      parts.push(`заговоры ${cantrips}/${row.cantrips}`)
                    }
                    if (
                      row.leveledKnown != null &&
                      row.leveledKnown > 0 &&
                      leveled < row.leveledKnown
                    ) {
                      parts.push(`известные ${leveled}/${row.leveledKnown}`)
                    }
                    return parts.length ? `${row.labelRu}: ${parts.join(', ')}` : null
                  })
                  .filter(Boolean)
                if (gaps.length > 0) {
                  return `${gaps.join(' · ')}. Для known-кастеров замена только при повышении уровня — лучше закрыть бюджет здесь.`
                }
                return 'Заполнить на листе или продолжить в форме создания? Для кастеров с заменой только на повышении уровня лучше закрыть здесь.'
              })()}
            </Text>
            <div className="create-pipeline__method-row">
              <Button
                variant="secondary"
                onClick={() => {
                  setSpellWarnOpen(false)
                  const gapSlug = spellLearnBudgets.find((row) => {
                    if (row.mode !== 'known') return false
                    const cantrips = countLearnedCantripsForSlug(spells.known, row.slug)
                    const leveled = countLearnedLeveledForSlug(spells.known, row.slug)
                    return (
                      (row.cantrips > 0 && cantrips < row.cantrips) ||
                      (row.leveledKnown != null &&
                        row.leveledKnown > 0 &&
                        leveled < row.leveledKnown)
                    )
                  })?.slug
                  setGrimoireClassFilter(gapSlug ?? null)
                  setSpellsOpen('grimoire')
                }}
              >
                Вернуться к заклинаниям
              </Button>
              <Button
                onClick={() => {
                  setSpellWarnOpen(false)
                  void persist({ asDraft: false, allowEmptySpells: true })
                }}
              >
                Заполню на листе
              </Button>
            </div>
          </Stack>
        </div>
      ) : null}

      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
