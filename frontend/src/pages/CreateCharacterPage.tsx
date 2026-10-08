import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BackgroundSetupDialog,
  type BackgroundSetupConfirm,
} from '../features/characters/BackgroundSetupDialog'
import {
  RaceSetupDialog,
  type RaceSetupConfirm,
} from '../features/characters/RaceSetupDialog'
import { ClassSetupDialog } from '../features/characters/ClassSetupDialog'
import {
  GuidedWizardDialog,
  type GuidedWizardSession,
} from '../features/characters/GuidedWizardDialog'
import { SubclassSetupDialog } from '../features/characters/SubclassSetupDialog'
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
import { CatalogDetailPanel } from '../features/createPipeline/CatalogDetailPanel'
import { CreatePipelineShell } from '../features/createPipeline/CreatePipelineShell'
import { hydratePipelineFromSheet } from '../features/createPipeline/createPipelineSheet'
import { applyPipelineToSheet } from '../features/createPipeline/pipelineApply'
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
import { resolveClassGrantDef } from '../shared/dnd/classGrants'
import { createClassLevel, totalCharacterLevel } from '../shared/dnd/classLevels'
import {
  syncSkillsExpertiseFromPicks,
  type SkillExpertiseState,
} from '../shared/dnd/expertise'
import type { AbilityScores } from '../shared/dnd/multiclassRules'
import {
  buildPendingWizardSteps,
  isSubclassGateFeature,
  listUnlockedExpertiseKeys,
} from '../shared/dnd/pendingFeatureChoices'
import {
  isPointBuyValid,
  isStandardArrayComplete,
  isManualScoresValid,
  mergeRacialBonuses,
} from '../shared/dnd/pointBuy'
import type { ClassGrantPicks } from '../shared/dnd/classGrants'
import {
  isRaceComboboxRoot,
  mergeAbilityBonuses,
  raceSubraceRequired,
  resolveRaceGrantDef,
} from '../shared/dnd/raceGrants'
import type { SubclassGrantDef, SubclassGrantPicks } from '../shared/dnd/subclassGrants'
import {
  emptyFeaturePicks,
  type FeaturePicksState,
} from '../shared/dnd/featurePicks'
import { readSpells, spellsToSheet, type SpellsState } from '../features/characters/spells'
import { Button, Field, Input, Stack, Text, Toast } from '../ui'

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

  if (state.backgroundSetup?.picks) {
    skills = markProficient(skills, state.backgroundSetup.picks.skills)
    pushTools(state.backgroundSetup.picks.tools)
  }
  if (state.raceSetup?.picks) {
    skills = markProficient(skills, state.raceSetup.picks.skills)
    pushTools(state.raceSetup.picks.tools)
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
  for (const [entryId, setup] of Object.entries(state.subclassSetups ?? {})) {
    if (setup.entry.slug) subclassSlugByEntryId[entryId] = setup.entry.slug
  }
  const unlocked = unlockFeaturesForClasses({
    classes: state.classes,
    characterLevel: totalCharacterLevel(state.classes),
    abilities: state.baseAbilities,
    subclassSlugByEntryId,
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
  const [state, setState] = useState<CreatePipelineState>(() => loadOrCreatePipelineState())
  const [backgrounds, setBackgrounds] = useState<CatalogEntry[]>([])
  const [classes, setClasses] = useState<CatalogEntry[]>([])
  const [races, setRaces] = useState<CatalogEntry[]>([])
  const [feats, setFeats] = useState<CatalogEntry[]>([])
  const [selectedBackground, setSelectedBackground] = useState<CatalogEntry | null>(null)
  const [selectedClass, setSelectedClass] = useState<CatalogEntry | null>(null)
  const [selectedRace, setSelectedRace] = useState<CatalogEntry | null>(null)
  const [selectedFeat, setSelectedFeat] = useState<CatalogEntry | null>(null)
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
  } | null>(null)
  const [guidedWizard, setGuidedWizard] = useState<GuidedWizardSession | null>(null)
  const [spellsOpen, setSpellsOpen] = useState<'prepare' | 'grimoire' | null>(null)
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
    Promise.all([
      listCatalogEntries({ kind: 'background', edition: '2014' }),
      listCatalogEntries({ kind: 'class', edition: '2014' }),
      listCatalogEntries({ kind: 'race', edition: '2014' }),
      listCatalogEntries({ kind: 'feat', edition: '2014' }),
    ])
      .then(([bg, cls, race, featRows]) => {
        if (!active) return
        setBackgrounds(bg.filter((row) => !row.parent_id))
        setClasses(cls.filter((row) => !row.parent_id && row.is_active))
        setRaces(race.filter((row) => isRaceComboboxRoot(row) && row.is_active))
        setFeats(featRows.filter((row) => row.is_active))
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить каталоги')
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

  const unlockedFeatures = useMemo(
    () =>
      unlockFeaturesForClasses({
        classes: state.classes,
        characterLevel: totalCharacterLevel(state.classes),
        abilities: wizardAbilities,
        subclassSlugByEntryId,
      }),
    [state.classes, subclassSlugByEntryId, wizardAbilities],
  )

  const expertiseKeys = useMemo(
    () => listUnlockedExpertiseKeys(unlockedFeatures),
    [unlockedFeatures],
  )

  const hasSubclassByEntryId = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const row of state.classes) {
      map[row.id] = hasSubclassSelected(row)
    }
    return map
  }, [state.classes])

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

  const blockedSkillKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const key of state.backgroundSetup?.picks.skills ?? []) keys.add(key)
    for (const key of state.raceSetup?.picks.skills ?? []) keys.add(key)
    return [...keys]
  }, [state.backgroundSetup?.picks.skills, state.raceSetup?.picks.skills])

  const blockedToolNames = useMemo(() => {
    const tools = new Set<string>()
    for (const name of state.backgroundSetup?.picks.tools ?? []) {
      if (name.trim()) tools.add(name.trim())
    }
    for (const name of state.raceSetup?.picks.tools ?? []) {
      if (name.trim()) tools.add(name.trim())
    }
    return [...tools]
  }, [state.backgroundSetup?.picks.tools, state.raceSetup?.picks.tools])

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

  function openFeatureWizardForClass(classEntryId: string) {
    const row = state.classes.find((item) => item.id === classEntryId)
    if (!row) {
      setToast('Сначала зафиксируйте класс')
      return
    }
    if (!state.classGrantPicks?.[classEntryId]) {
      setToast('Сначала выберите навыки и снаряжение класса')
      return
    }
    const steps = buildPendingWizardSteps({
      unlocked: unlockedFeatures,
      featurePicks: state.featurePicks ?? emptyFeaturePicks(),
      classAsi: state.classAsi ?? [],
      filter: {
        mode: 'up_to_class_level',
        classEntryId,
        maxClassLevel: row.level,
      },
      hasSubclassByEntryId,
    }).filter((step) => step.kind !== 'class_grant' && step.kind !== 'background')
    if (steps.length === 0) {
      setToast('Все развилки и ASI для этого класса закрыты')
      return
    }
    openGuidedWizard({ steps, index: 0 })
  }

  function beginSubclassSelection(classEntryId: string, selected: CatalogEntry) {
    const def = resolveSubclassDefFromCatalog({
      nameRu: selected.name_ru,
      slug: selected.slug,
      catalogData: selected.data,
    })
    if (def && subclassNeedsSetupDialog(def)) {
      setSubclassSetup({ classEntryId, selected, def })
      return
    }
    commitSubclassSetup(classEntryId, selected, emptySubclassPicks(), def)
  }

  function commitSubclassSetup(
    classEntryId: string,
    selected: CatalogEntry,
    picks: SubclassGrantPicks,
    def: SubclassGrantDef | null,
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
      },
    }
    patchState({
      classes: nextClasses,
      subclassSetups: nextSetups,
      sheetDraft: {
        ...state.sheetDraft,
        subclass_setups: nextSetups,
      },
      stepDirty: { ...state.stepDirty, leveling: true },
    })
    setSubclassSetup(null)
    setSubclassPicker(null)
    setToast(
      def
        ? `Архетип «${selected.name_ru}» сохранён`
        : `Архетип «${selected.name_ru}» (без пакета грантов)`,
    )
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
        featAcknowledged: false,
        stepDirty: { ...state.stepDirty, feat: false },
      })
      setSelectedFeat(null)
      return
    }
    if (step === 'race') {
      patchState({
        step: nextStep,
        race: null,
        subrace: null,
        raceSetup: null,
        feat: null,
        featAcknowledged: false,
        characterName: state.characterName,
        stepDirty: { ...state.stepDirty, race: false, feat: false },
      })
      setRacialBonuses({})
      setSelectedRace(null)
      setSelectedFeat(null)
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
      navigate(`/characters/${saved.id}`, {
        state: { toast: 'Персонаж готов' },
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
    return isManualScoresValid(state.baseAbilities)
  }

  function canFinishHardBlocks(): string | null {
    if (!state.race) return 'Выберите расу'
    if (raceNeedsFeatStep(state.raceSetup) && !state.feat && !state.featAcknowledged) {
      return 'Закройте шаг черты'
    }
    if (!state.background) return 'Выберите предысторию'
    if (!state.classRef) return 'Выберите класс'
    if (!state.classGrantPicks?.[state.classEntryId]) {
      return 'Выберите навыки и снаряжение класса'
    }
    if (!state.characterName.trim()) return 'Укажите имя на шаге расы'
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
    void persist({ asDraft: false })
  }

  const step = state.step
  const featNote = raceFeatNoteRu(state.raceSetup)

  let cards = null
  let detail = null
  let footer = null

  if (step === 'race') {
    cards = (
      <CatalogCardList
        items={races.map((entry) => ({
          id: entry.id,
          title: entry.name_ru,
          subtitle: entry.name_en ?? undefined,
          source: entry.source,
        }))}
        selectedId={selectedRace?.id ?? state.race?.id ?? null}
        onSelect={(id) => setSelectedRace(races.find((row) => row.id === id) ?? null)}
      />
    )
    detail = (
      <CatalogDetailPanel
        kind="race"
        entry={selectedRace}
        emptyTitle={state.race?.nameRu ?? 'Раса'}
      >
        <Field label="Имя персонажа">
          <Input
            value={state.characterName}
            onChange={(event) => patchState({ characterName: event.target.value })}
            placeholder="Имя героя"
          />
        </Field>
        <Button
          disabled={!selectedRace}
          onClick={async () => {
            if (!selectedRace) return
            let all = races
            try {
              all = await listCatalogEntries({ kind: 'race', edition: '2014' })
            } catch {
              // keep cached roots
            }
            const subraces = all.filter((row) => row.parent_id === selectedRace.id)
            setRaceSetup({
              root: selectedRace,
              subraces,
              required: raceSubraceRequired(selectedRace.data),
            })
          }}
        >
          Выбрать и настроить
        </Button>
        {state.race ? <Text tone="muted">Выбрано: {state.race.nameRu}</Text> : null}
      </CatalogDetailPanel>
    )
    footer = (
      <Button
        disabled={!state.race || !state.characterName.trim()}
        onClick={() => advanceFrom('race')}
      >
        {raceNeedsFeatStep(state.raceSetup) ? 'Далее · Черта' : 'Далее · Предыстория'}
      </Button>
    )
  }

  if (step === 'feat') {
    cards = (
      <CatalogCardList
        items={feats.map((entry) => ({
          id: entry.id,
          title: entry.name_ru,
          subtitle: entry.name_en ?? undefined,
          source: entry.source,
        }))}
        selectedId={selectedFeat?.id ?? state.feat?.id ?? null}
        onSelect={(id) => setSelectedFeat(feats.find((row) => row.id === id) ?? null)}
        emptyText="В каталоге пока мало черт — можно отметить заметку расы и продолжить"
      />
    )
    detail = (
      <CatalogDetailPanel
        kind="feat"
        entry={selectedFeat}
        emptyTitle="Черта"
        emptyHint={featNote || 'Раса даёт черту с 1 уровня.'}
      >
        {featNote ? (
          <Text>
            Заметка расы: {featNote}
          </Text>
        ) : null}
        <div className="create-pipeline__method-row">
          <Button
            disabled={!selectedFeat}
            onClick={() => {
              if (!selectedFeat) return
              patchState({
                feat: catalogRef(selectedFeat),
                featAcknowledged: true,
                stepDirty: { ...state.stepDirty, feat: true },
              })
              setToast(`Черта «${selectedFeat.name_ru}»`)
            }}
          >
            Выбрать черту
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              patchState({
                feat: null,
                featAcknowledged: true,
                stepDirty: { ...state.stepDirty, feat: true },
              })
              setToast('Черта: отметьте на листе / в заметках')
            }}
          >
            Отметить без каталога
          </Button>
        </div>
        {state.feat ? (
          <Text tone="muted">Выбрано: {state.feat.nameRu}</Text>
        ) : state.featAcknowledged ? (
          <Text tone="muted">Черта отмечена без карточки каталога</Text>
        ) : null}
      </CatalogDetailPanel>
    )
    footer = (
      <Button
        disabled={!state.feat && !state.featAcknowledged}
        onClick={() => advanceFrom('feat')}
      >
        Далее · Предыстория
      </Button>
    )
  }

  if (step === 'background') {
    cards = (
      <CatalogCardList
        items={backgrounds.map((entry) => ({
          id: entry.id,
          title: entry.name_ru,
          subtitle: entry.name_en ?? undefined,
          source: entry.source,
        }))}
        selectedId={selectedBackground?.id ?? state.background?.id ?? null}
        onSelect={(id) => {
          const entry = backgrounds.find((row) => row.id === id) ?? null
          setSelectedBackground(entry)
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
            const variants = backgrounds.filter(
              (row) => row.parent_id === selectedBackground.id,
            )
            setBgSetup({ root: selectedBackground, variants })
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
      <Button disabled={!state.background} onClick={() => advanceFrom('background')}>
        Далее · Класс
      </Button>
    )
  }

  if (step === 'class') {
    cards = (
      <CatalogCardList
        items={classes.map((entry) => ({
          id: entry.id,
          title: entry.name_ru,
          subtitle: entry.name_en ?? undefined,
          source: entry.source,
        }))}
        selectedId={selectedClass?.id ?? state.classRef?.id ?? null}
        onSelect={(id) => setSelectedClass(classes.find((row) => row.id === id) ?? null)}
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
            const def = resolveClassGrantDef({
              className: selectedClass.name_ru,
              catalogSlug: selectedClass.slug,
              catalogData: selectedClass.data,
            })
            if (!def) {
              setToast('Нет пакета владений для класса')
              return
            }
            const entryId = state.classEntryId || createClassLevel().id
            const nextClasses = [
              createClassLevel({
                id: entryId,
                name: selectedClass.name_ru,
                catalog_id: selectedClass.id,
                level: 1,
              }),
            ]
            patchState({
              classRef: catalogRef(selectedClass),
              classEntryId: entryId,
              classes: nextClasses,
              hpChoices: ensureHpChoices(nextClasses, []),
              // Re-picking class clears prior primary grant picks.
              classGrantPicks: {},
              stepDirty: { ...state.stepDirty, class: true },
            })
            setClassSetup({
              def,
              mode: 'start',
              classEntryId: entryId,
              openWizardAfter: false,
            })
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
    footer = (
      <Button
        disabled={!state.classRef || !state.classGrantPicks?.[state.classEntryId]}
        onClick={() => advanceFrom('class')}
      >
        Далее · Характеристики
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
        onOpenArchetype={(classEntryId) => {
          void openArchetypePicker(classEntryId)
        }}
        onOpenChoices={(classEntryId) => {
          const row = state.classes.find((item) => item.id === classEntryId)
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
          const isPrimary = classEntryId === state.classEntryId
          if (!state.classGrantPicks?.[classEntryId]) {
            // Primary should already have picks from the class step; MC still opens setup.
            if (isPrimary) {
              setToast('Вернитесь на шаг «Класс» и настройте владения')
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
            setClassSetup({
              def,
              mode: 'multiclass',
              classEntryId,
              openWizardAfter: true,
            })
            return
          }
          openFeatureWizardForClass(classEntryId)
        }}
        onOpenSpells={() => setSpellsOpen('grimoire')}
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
        cards={cards}
        detail={detail}
        footer={footer}
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
        onClose={() => setBgSetup(null)}
        onConfirm={(result: BackgroundSetupConfirm) => {
          patchState({
            background: catalogRef(result.entry),
            backgroundSetup: {
              entry: catalogSnapshot(result.entry),
              picks: result.picks,
            },
            sheetDraft: {
              ...state.sheetDraft,
              background_grant: {
                backgroundCatalogId: result.entry.id,
                backgroundSlug: result.entry.slug,
                picks: result.picks,
              },
            },
            stepDirty: { ...state.stepDirty, background: true },
          })
          setBgSetup(null)
          setToast(`Предыстория «${result.entry.name_ru}»`)
        }}
      />

      <RaceSetupDialog
        open={Boolean(raceSetup)}
        root={raceSetup?.root ?? null}
        subraces={raceSetup?.subraces ?? []}
        subraceRequired={raceSetup?.required ?? false}
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
          const needsFeat = Boolean(result.def.featNoteRu?.trim())
          patchState({
            race: isSub
              ? state.race ??
                (rootEntry ? catalogRef(rootEntry) : catalogRef(result.entry))
              : catalogRef(result.entry),
            subrace: isSub ? catalogRef(result.entry) : null,
            raceSetup: nextRaceSetup,
            feat: needsFeat ? state.feat : null,
            featAcknowledged: needsFeat ? state.featAcknowledged : false,
            sheetDraft: {
              ...state.sheetDraft,
              race_grant: {
                raceCatalogId: result.entry.id,
                raceSlug: result.entry.slug,
                picks: result.picks,
              },
            },
            stepDirty: { ...state.stepDirty, race: true },
            // Auto-advance past feat when race does not grant one.
            step: needsFeat ? 'feat' : 'background',
          })
          setRaceSetup(null)
          if (needsFeat) {
            setToast(`Раса «${result.entry.name_ru}». Далее — черта.`)
          } else {
            setToast(`Раса «${result.entry.name_ru}»`)
          }
        }}
      />

      <ClassSetupDialog
        open={Boolean(classSetup)}
        def={classSetup?.def ?? null}
        mode={classSetup?.mode ?? 'start'}
        blockedSkillKeys={blockedSkillKeys}
        blockedToolNames={blockedToolNames}
        onClose={() => setClassSetup(null)}
        onConfirm={(picks: ClassGrantPicks) => {
          const entryId = classSetup?.classEntryId ?? state.classEntryId
          const openWizardAfter = classSetup?.openWizardAfter ?? false
          const nextPicks = {
            ...state.classGrantPicks,
            [entryId]: picks,
          }
          const nextState: CreatePipelineState = {
            ...state,
            classGrantPicks: nextPicks,
            sheetDraft: {
              ...state.sheetDraft,
              class_grant_picks: nextPicks,
            },
            stepDirty: { ...state.stepDirty, class: true },
          }
          setState(nextState)
          setClassSetup(null)
          setToast('Выборы класса сохранены')
          if (!openWizardAfter) return
          const row = nextState.classes.find((item) => item.id === entryId)
          if (!row) return
          const unlocked = unlockFeaturesForClasses({
            classes: nextState.classes,
            characterLevel: totalCharacterLevel(nextState.classes),
            abilities: wizardAbilities,
            subclassSlugByEntryId,
          })
          const hasSubclass: Record<string, boolean> = {}
          for (const item of nextState.classes) {
            hasSubclass[item.id] = hasSubclassSelected(item)
          }
          const steps = buildPendingWizardSteps({
            unlocked,
            featurePicks: nextState.featurePicks ?? emptyFeaturePicks(),
            classAsi: nextState.classAsi ?? [],
            filter: {
              mode: 'up_to_class_level',
              classEntryId: entryId,
              maxClassLevel: row.level,
            },
            hasSubclassByEntryId: hasSubclass,
          }).filter((stepRow) => stepRow.kind !== 'class_grant' && stepRow.kind !== 'background')
          if (steps.length > 0) openGuidedWizard({ steps, index: 0 })
        }}
      />

      <SubclassSetupDialog
        open={Boolean(subclassSetup)}
        def={subclassSetup?.def ?? null}
        onClose={() => setSubclassSetup(null)}
        onConfirm={(picks: SubclassGrantPicks) => {
          if (!subclassSetup) return
          commitSubclassSetup(
            subclassSetup.classEntryId,
            subclassSetup.selected,
            picks,
            subclassSetup.def,
          )
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
          patchState({
            featurePicks,
            sheetDraft: {
              ...state.sheetDraft,
              feature_picks: featurePicks,
            },
          })
        }}
        onConfirmClassGrant={() => {
          // Class grants are handled by ClassSetupDialog in the pipeline.
        }}
        onConfirmAsi={(entry: AppliedClassAsi) => {
          const nextAsi = [...(state.classAsi ?? []), entry]
          patchState({
            classAsi: nextAsi,
            sheetDraft: {
              ...state.sheetDraft,
              class_asi: nextAsi,
            },
          })
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
        onFocusSubclass={(classEntryId) => {
          setGuidedWizard(null)
          void openArchetypePicker(classEntryId)
        }}
      />

      {subclassPicker ? (
        <div className="create-pipeline__modal">
          <Stack gap={12}>
            <Text as="h3">Архетип · {subclassPicker.className}</Text>
            <Text tone="muted">Выберите подкласс из справочника.</Text>
            <ul className="create-pipeline__card-list">
              {subclassPicker.options.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="create-pipeline__card"
                    onClick={() => {
                      beginSubclassSelection(subclassPicker.classEntryId, entry)
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

      <GrimoireDialog
        open={spellsOpen === 'grimoire'}
        edition="2014"
        spells={spells}
        onChange={setSpells}
        onClose={() => setSpellsOpen(null)}
      />
      <PrepareSpellsDialog
        open={spellsOpen === 'prepare'}
        spells={spells}
        onChange={setSpells}
        onClose={() => setSpellsOpen(null)}
      />

      {spellWarnOpen ? (
        <div className="create-pipeline__modal">
          <Stack gap={12}>
            <Text as="h3">Заклинания не выбраны</Text>
            <Text>
              Заполнить на листе или продолжить в форме создания? Для кастеров с заменой только на
              повышении уровня лучше закрыть здесь.
            </Text>
            <div className="create-pipeline__method-row">
              <Button
                variant="secondary"
                onClick={() => {
                  setSpellWarnOpen(false)
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
