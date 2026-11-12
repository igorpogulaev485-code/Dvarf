/** Состояние и эффекты листа, часть 1. Порядок хуков совпадает с прежним компонентом. */
import type { SheetModel } from './sheetModel'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type CharacterDetail, type RulesEdition } from '../../../shared/api/characters'
import { formatClassSummary, totalCharacterLevel } from '../../../shared/dnd/classLevels'
import type { ClassGrantDef } from '../../../shared/dnd/classGrants'
import { ensureBackgroundFeatureOnDraft } from '../backgroundEffects'
import { backgroundFeatureCardFromGrant, buildBackgroundFeatureText, resolveBackgroundGrantDef, upsertBackgroundFeatureBlock } from '../../../shared/dnd/backgroundGrants'
import { type SubclassChangeMode, type SubclassGrantDef } from '../../../shared/dnd/subclassGrants'
import { listCatalogEntries, type CatalogEntry } from '../../../shared/api/catalog'
import { type GuidedWizardSession } from '../GuidedWizardDialog'
import { backgroundWizardStep, listUnlockedExpertiseKeys } from '../../../shared/dnd/pendingFeatureChoices'
import { ownedFeatEnumsFromLedger, sumFeatSpeedBonus } from '../../../shared/dnd/featGrants'
import { clampCharacterLevel } from '../../../shared/dnd/experience'
import { desiredResourcesFromFeatures } from '../../../shared/dnd/featureResources'
import { filterActiveFeaturesForPlay } from '../../../shared/dnd/featureReplacement'
import { resolveClassFeatureSlug, unlockFeaturesForClasses } from '../../../shared/dnd/classFeatures'
import { martialArtsDieFromFeatures } from '../../../shared/dnd/martialArts'
import { type FeatureSelfFormRequest, type WildShapeForkRequest } from '../ClassFeaturesPanel'
import { characterHasMagicSources } from '../magicSources'
import { blockPlainText, withBlockPlainText } from '../textBlocks'
import { buildDraft, type MinimalSheetEditorProps } from './draft'
import { useSheetEffectsRealtime } from '../useSheetEffectsRealtime'
import { applyEffectStacking } from '../../../shared/dnd/activeEffects'

export function useSheetEditorPart1(model: SheetModel, props: MinimalSheetEditorProps) {
  model.character = props.character
  model.createGuide = props.createGuide ?? null
  model.startingLevelProp = props.startingLevel ?? 1
  model.showOnboardingChecklist = props.showOnboardingChecklist ?? false
  model.showValueTips = props.showValueTips ?? false
  model.onCreateGuideConsumed = props.onCreateGuideConsumed
  model.onSaved = props.onSaved
  model.onToast = props.onToast
  model.onRemoteSave = props.onRemoteSave
  const [baseCharacter, setBaseCharacter] = useState(model.character)
  model.baseCharacter = baseCharacter
  model.setBaseCharacter = setBaseCharacter
  const [draft, setDraft] = useState(() => buildDraft(model.character))
  model.draft = draft
  model.setDraft = setDraft
  const [sheetVersion, setSheetVersion] = useState(model.character.sheet_version)
  model.sheetVersion = sheetVersion
  model.setSheetVersion = setSheetVersion
  /** Autosave status — no manual save button (LSS-style). */
  const [saveStatus, setSaveStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>(
    'saved',
  )
  model.saveStatus = saveStatus
  model.setSaveStatus = setSaveStatus
  const [reloading, setReloading] = useState(false)
  model.reloading = reloading
  model.setReloading = setReloading
  const [error, setError] = useState<string | null>(null)
  model.error = error
  model.setError = setError
  const [conflictOpen, setConflictOpen] = useState(false)
  model.conflictOpen = conflictOpen
  model.setConflictOpen = setConflictOpen
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  model.levelUpOpen = levelUpOpen
  model.setLevelUpOpen = setLevelUpOpen
  /** Gift feat from the table master — outside ASI / race / background. */
  const [giftFeatOpen, setGiftFeatOpen] = useState(false)
  model.giftFeatOpen = giftFeatOpen
  model.setGiftFeatOpen = setGiftFeatOpen
  const [pendingAsi, setPendingAsi] = useState<{
    classEntryId: string
    className: string
    classLevel: number
    featureId: string
  } | null>(null)
  model.pendingAsi = pendingAsi
  model.setPendingAsi = setPendingAsi
  const [guidedWizard, setGuidedWizard] = useState<GuidedWizardSession | null>(null)
  model.guidedWizard = guidedWizard
  model.setGuidedWizard = setGuidedWizard
  /** Wizard paused while BackgroundSetupDialog is open from a wizard step. */
  const [pausedWizardForBackground, setPausedWizardForBackground] =
    useState<GuidedWizardSession | null>(null)
  model.pausedWizardForBackground = pausedWizardForBackground
  model.setPausedWizardForBackground = setPausedWizardForBackground
  /** Wizard paused while SubclassSetupDialog collects archetype forks. */
  const [pausedWizardForSubclass, setPausedWizardForSubclass] =
    useState<GuidedWizardSession | null>(null)
  model.pausedWizardForSubclass = pausedWizardForSubclass
  model.setPausedWizardForSubclass = setPausedWizardForSubclass
  /** Consumed once after first start-mode class grant (create at N). */
  const [pendingStartingLevel, setPendingStartingLevel] = useState(() =>
    clampCharacterLevel(model.startingLevelProp || 1),
  )
  model.pendingStartingLevel = pendingStartingLevel
  model.setPendingStartingLevel = setPendingStartingLevel
  const [grantPicker, setGrantPicker] = useState<{
    classEntryId: string
    className: string
    mode: 'start' | 'multiclass'
    def: ClassGrantDef
    catalogSlug: string | null
    catalogData: Record<string, unknown> | null
  } | null>(null)
  model.grantPicker = grantPicker
  model.setGrantPicker = setGrantPicker
  const [homebrewPicker, setHomebrewPicker] = useState<{
    classEntryId: string
    initialName: string
  } | null>(null)
  model.homebrewPicker = homebrewPicker
  model.setHomebrewPicker = setHomebrewPicker
  const [raceGrantPicker, setRaceGrantPicker] = useState<{
    root: CatalogEntry
    subraces: CatalogEntry[]
    subraceRequired: boolean
  } | null>(null)
  model.raceGrantPicker = raceGrantPicker
  model.setRaceGrantPicker = setRaceGrantPicker
  const [raceHomebrewOpen, setRaceHomebrewOpen] = useState(false)
  model.raceHomebrewOpen = raceHomebrewOpen
  model.setRaceHomebrewOpen = setRaceHomebrewOpen
  const [backgroundFeatSlug, setBackgroundFeatSlug] = useState<string | null>(null)
  model.backgroundFeatSlug = backgroundFeatSlug
  model.setBackgroundFeatSlug = setBackgroundFeatSlug
  const [backgroundGrantPicker, setBackgroundGrantPicker] = useState<{
    root: CatalogEntry
    variants: CatalogEntry[]
  } | null>(null)
  model.backgroundGrantPicker = backgroundGrantPicker
  model.setBackgroundGrantPicker = setBackgroundGrantPicker
  const [backgroundHomebrewOpen, setBackgroundHomebrewOpen] = useState(false)
  model.backgroundHomebrewOpen = backgroundHomebrewOpen
  model.setBackgroundHomebrewOpen = setBackgroundHomebrewOpen
  const [subclassSetup, setSubclassSetup] = useState<{
    classEntryId: string
    selected: CatalogEntry
    def: SubclassGrantDef
    copyOldTextToNotes: boolean
    previousDef: SubclassGrantDef | null
    changeMode?: SubclassChangeMode | 'initial'
    changedAtClassLevel?: number
    previousNameRu?: string
    previousCatalogId?: string | null
    previousSlug?: string
    advanceWizardAfter?: boolean
  } | null>(null)
  model.subclassSetup = subclassSetup
  model.setSubclassSetup = setSubclassSetup
  const [subclassChange, setSubclassChange] = useState<{
    classEntryId: string
    selected: CatalogEntry
    def: SubclassGrantDef
    fromName: string
    textSnippets: string[]
    previousDef: SubclassGrantDef | null
    previousSlug: string
    previousCatalogId: string | null
    classLevel: number
  } | null>(null)
  model.subclassChange = subclassChange
  model.setSubclassChange = setSubclassChange
  const channelRef = useRef<BroadcastChannel | null>(null)
  model.channelRef = channelRef
  const raceCatalogCacheRef = useRef<CatalogEntry[] | null>(null)
  model.raceCatalogCacheRef = raceCatalogCacheRef
  const backgroundCatalogCacheRef = useRef<CatalogEntry[] | null>(null)
  model.backgroundCatalogCacheRef = backgroundCatalogCacheRef
  const asiFeatHydrateAttemptedRef = useRef(false)
  model.asiFeatHydrateAttemptedRef = asiFeatHydrateAttemptedRef
  const featSpellsHydrateAttemptedRef = useRef(false)
  model.featSpellsHydrateAttemptedRef = featSpellsHydrateAttemptedRef
  const bmManeuverHydrateAttemptedRef = useRef(false)
  model.bmManeuverHydrateAttemptedRef = bmManeuverHydrateAttemptedRef
  const alwaysPreparedHydrateAttemptedRef = useRef(false)
  model.alwaysPreparedHydrateAttemptedRef = alwaysPreparedHydrateAttemptedRef
  const [backgroundCatalogRows, setBackgroundCatalogRows] = useState<CatalogEntry[]>(
    [],
  )
  model.backgroundCatalogRows = backgroundCatalogRows
  model.setBackgroundCatalogRows = setBackgroundCatalogRows
  const skipAutosaveRef = useRef(true)
  model.skipAutosaveRef = skipAutosaveRef
  const autosaveTimerRef = useRef<number | null>(null)
  model.autosaveTimerRef = autosaveTimerRef
  const saveInFlightRef = useRef(false)
  model.saveInFlightRef = saveInFlightRef
  const pendingResaveRef = useRef(false)
  model.pendingResaveRef = pendingResaveRef
  const sheetVersionRef = useRef(sheetVersion)
  model.sheetVersionRef = sheetVersionRef
  sheetVersionRef.current = sheetVersion
  const draftRef = useRef(draft)
  model.draftRef = draftRef
  draftRef.current = draft
  const baseCharacterRef = useRef(baseCharacter)
  model.baseCharacterRef = baseCharacterRef
  baseCharacterRef.current = baseCharacter
  const conflictOpenRef = useRef(conflictOpen)
  model.conflictOpenRef = conflictOpenRef
  conflictOpenRef.current = conflictOpen
  const saveStatusRef = useRef(saveStatus)
  model.saveStatusRef = saveStatusRef
  saveStatusRef.current = saveStatus
  const onSavedRef = useRef(model.onSaved)
  model.onSavedRef = onSavedRef
  onSavedRef.current = model.onSaved
  const onToastRef = useRef(model.onToast)
  model.onToastRef = onToastRef
  onToastRef.current = model.onToast
  const [raceCatalogRows, setRaceCatalogRows] = useState<CatalogEntry[]>([])
  model.raceCatalogRows = raceCatalogRows
  model.setRaceCatalogRows = setRaceCatalogRows
  const [wildShapeFork, setWildShapeFork] = useState<WildShapeForkRequest | null>(
    null,
  )
  model.wildShapeFork = wildShapeFork
  model.setWildShapeFork = setWildShapeFork
  const [featureSelfForm, setFeatureSelfForm] =
    useState<FeatureSelfFormRequest | null>(null)
  model.featureSelfForm = featureSelfForm
  model.setFeatureSelfForm = setFeatureSelfForm

  const characterLevel = useMemo(
    () => totalCharacterLevel(draft.classes),
    [draft.classes],
  )
  model.characterLevel = characterLevel
  const ownedFeatEnums = useMemo(
    () => ownedFeatEnumsFromLedger(draft.featGrants),
    [draft.featGrants],
  )
  model.ownedFeatEnums = ownedFeatEnums
  const proficientSkills = useMemo(
    () =>
      Object.entries(draft.skills)
        .filter(([, state]) => state.is_proficient)
        .map(([key]) => key),
    [draft.skills],
  )
  model.proficientSkills = proficientSkills
  const classSummary = useMemo(
    () => formatClassSummary(draft.classes),
    [draft.classes],
  )
  model.classSummary = classSummary
  const subclassSlugByEntryId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const grant of draft.subclassGrants) {
      if (grant.classEntryId && grant.slug) {
        map[grant.classEntryId] = grant.slug
      }
    }
    for (const transition of draft.subclassTransitions) {
      if (transition.mode === 'future_only' && transition.activeSlug) {
        map[transition.classEntryId] = transition.activeSlug
      }
    }
    return map
  }, [draft.subclassGrants, draft.subclassTransitions])
  model.subclassSlugByEntryId = subclassSlugByEntryId
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
    for (const transition of draft.subclassTransitions) {
      if (transition.mode !== 'future_only') continue
      map[transition.classEntryId] = {
        mode: 'future_only',
        changedAtClassLevel: transition.changedAtClassLevel,
        previousSlug: transition.previousSlug,
        previousNameRu: transition.previousNameRu,
      }
    }
    return map
  }, [draft.subclassTransitions])
  model.subclassTransitionByEntryId = subclassTransitionByEntryId
  const unlockedFeatures = useMemo(
    () =>
      unlockFeaturesForClasses({
        classes: draft.classes,
        characterLevel,
        abilities: draft.abilities,
        subclassSlugByEntryId,
        subclassTransitionByEntryId,
      }),
    [
      draft.classes,
      characterLevel,
      draft.abilities,
      subclassSlugByEntryId,
      subclassTransitionByEntryId,
    ],
  )
  model.unlockedFeatures = unlockedFeatures
  const expertiseKeys = useMemo(
    () => listUnlockedExpertiseKeys(unlockedFeatures),
    [unlockedFeatures],
  )
  model.expertiseKeys = expertiseKeys
  const hasSubclassByEntryId = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const row of draft.classes) {
      map[row.id] = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
    }
    return map
  }, [draft.classes])
  model.hasSubclassByEntryId = hasSubclassByEntryId
  const playActiveFeatures = useMemo(
    () => filterActiveFeaturesForPlay(unlockedFeatures, draft.featurePicks),
    [unlockedFeatures, draft.featurePicks],
  )
  model.playActiveFeatures = playActiveFeatures
  const featureDesiredResources = useMemo(
    () =>
      desiredResourcesFromFeatures({
        features: playActiveFeatures,
        characterLevel,
        abilities: draft.abilities,
        featurePicks: draft.featurePicks,
      }),
    [playActiveFeatures, characterLevel, draft.abilities, draft.featurePicks],
  )
  model.featureDesiredResources = featureDesiredResources
  /** Show spells split when the sheet has any magic source (class/archetype/race/feat/gear). */
  const hasMagicSources = useMemo(
    () =>
      characterHasMagicSources({
        classes: draft.classes,
        known: draft.spells.known,
        slots: draft.spells.slots,
        pactSlots: draft.spells.pact_slots,
      }),
    [
      draft.classes,
      draft.spells.known,
      draft.spells.slots,
      draft.spells.pact_slots,
    ],
  )
  model.hasMagicSources = hasMagicSources
  /** Grant first; else catalog by slug/name (older sheets without background_grant). */
  const resolvedBackgroundFeature = useMemo(() => {
    const fromGrant = backgroundFeatureCardFromGrant(draft.backgroundGrant ?? {})
    if (fromGrant) return fromGrant
    const slug = draft.identity.backgroundSlug?.trim() || ''
    const name = draft.identity.background?.trim() || ''
    if (!slug && !name) return null
    const entry =
      (slug
        ? backgroundCatalogRows.find((row) => row.slug === slug)
        : undefined) ??
      (name
        ? backgroundCatalogRows.find(
            (row) => row.name_ru.trim().toLowerCase() === name.toLowerCase(),
          )
        : undefined)
    if (!entry) return null
    const def = resolveBackgroundGrantDef({
      backgroundName: entry.name_ru,
      catalogSlug: entry.slug,
      catalogData: entry.data,
      nameRu: entry.name_ru,
    })
    if (!def) return null
    return backgroundFeatureCardFromGrant({
      slug: entry.slug,
      featureNameRu: def.featureNameRu,
      featureTextRu: def.featureTextRu,
      featNoteRu: def.featNoteRu,
    })
  }, [
    draft.backgroundGrant,
    draft.identity.background,
    draft.identity.backgroundSlug,
    backgroundCatalogRows,
  ])
  model.resolvedBackgroundFeature = resolvedBackgroundFeature
  const martialArtsDie = useMemo(
    () => martialArtsDieFromFeatures(unlockedFeatures),
    [unlockedFeatures],
  )
  model.martialArtsDie = martialArtsDie
  const featSpeedBonusFt = useMemo(
    () => sumFeatSpeedBonus(draft.featGrants),
    [draft.featGrants],
  )
  model.featSpeedBonusFt = featSpeedBonusFt
  const primaryClass = draft.classes[0]
  model.primaryClass = primaryClass
  const rulesEdition = baseCharacter.rules_edition as RulesEdition
  model.rulesEdition = rulesEdition
  const druidClassRow = useMemo(() => {
    if (wildShapeFork) {
      return (
        draft.classes.find((row) => row.id === wildShapeFork.classEntryId) ?? null
      )
    }
    return (
      draft.classes.find(
        (row) => resolveClassFeatureSlug(row.name) === 'druid',
      ) ?? null
    )
  }, [draft.classes, wildShapeFork])
  model.druidClassRow = druidClassRow
  const druidLevel = druidClassRow?.level ?? characterLevel
  model.druidLevel = druidLevel
  const druidSubclassSlug =
    (druidClassRow && subclassSlugByEntryId[druidClassRow.id]) || null
  model.druidSubclassSlug = druidSubclassSlug

  useEffect(() => {
    // New character open — full reset.
    if (model.character.id !== baseCharacter.id) {
      setBaseCharacter(model.character)
      setDraft(buildDraft(model.character))
      setSheetVersion(model.character.sheet_version)
      setConflictOpen(false)
      setError(null)
      setSaveStatus('saved')
      skipAutosaveRef.current = true
      return
    }
    // Same character: only pull when server is ahead (other tab / refresh).
    // Do not rebuild draft when our own autosave echoes back via onSaved.
    // If prop is behind local sheetVersion (save just landed, parent not yet), ignore.
    if (model.character.sheet_version > sheetVersion) {
      setBaseCharacter(model.character)
      setDraft(buildDraft(model.character))
      setSheetVersion(model.character.sheet_version)
      setConflictOpen(false)
      setSaveStatus('saved')
      skipAutosaveRef.current = true
    } else if (model.character.sheet_version === sheetVersion) {
      setBaseCharacter(model.character)
    }
  }, [model.character, baseCharacter.id, sheetVersion])

  useSheetEffectsRealtime({
    characterId: baseCharacter.id,
    enabled: Boolean(baseCharacter.id),
    onEffects: (patch) => {
      if (patch.sheetVersion <= sheetVersion) return
      setSheetVersion(patch.sheetVersion)
      setDraft((prev) => ({
        ...prev,
        ...(patch.hpMax != null ? { hpMax: patch.hpMax } : {}),
        ...(patch.hpCurrent != null ? { hpCurrent: patch.hpCurrent } : {}),
        play: {
          ...prev.play,
          effects: applyEffectStacking(patch.effects),
          ...(patch.hpTemp != null ? { hpTemp: patch.hpTemp } : {}),
        },
      }))
      setBaseCharacter((prev: CharacterDetail) => {
        const sheet = { ...(prev.sheet || {}) } as Record<string, unknown>
        const combat = {
          ...((sheet.combat as Record<string, unknown> | undefined) || {}),
          effects: patch.effects,
          ...(patch.hpMax != null ? { hp_max: patch.hpMax } : {}),
          ...(patch.hpCurrent != null ? { hp_current: patch.hpCurrent } : {}),
          ...(patch.hpTemp != null ? { hp_temp: patch.hpTemp } : {}),
        }
        return {
          ...prev,
          sheet_version: patch.sheetVersion,
          ...(patch.hpMax != null ? { hp_max: patch.hpMax } : {}),
          ...(patch.hpCurrent != null ? { hp_current: patch.hpCurrent } : {}),
          sheet: { ...sheet, combat },
        }
      })
    },
  })

  useEffect(() => {
    if (model.createGuide !== 'background-first' && model.createGuide !== 'class-first') return
    const targetId =
      model.createGuide === 'background-first' ? 'sheet-background' : 'sheet-class-primary'
    const node = document.getElementById(targetId)
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.setTimeout(() => node.focus(), 120)
    }
    if (model.createGuide === 'background-first' && !draft.backgroundGrant) {
      model.openGuidedWizard({ steps: [backgroundWizardStep()], index: 0 })
    }
    model.onCreateGuideConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot create guide
  }, [model.createGuide, model.onCreateGuideConsumed])

  // Prefetch backgrounds so variant fork popup does not wait on a second fetch.
  // Also backfill feature name/text + traits marker for older sheets.
  useEffect(() => {
    let active = true
    backgroundCatalogCacheRef.current = null
    setBackgroundCatalogRows([])
    listCatalogEntries({ kind: 'background', edition: rulesEdition })
      .then((rows) => {
        if (!active) return
        backgroundCatalogCacheRef.current = rows
        setBackgroundCatalogRows(rows)
        setDraft((prev) => {
          if (prev.backgroundGrant) {
            const entry =
              rows.find(
                (row) => row.id === prev.backgroundGrant!.backgroundCatalogId,
              ) ?? rows.find((row) => row.slug === prev.backgroundGrant!.slug)
            const catalogDef = entry
              ? resolveBackgroundGrantDef({
                  backgroundName: entry.name_ru,
                  catalogSlug: entry.slug,
                  catalogData: entry.data,
                  nameRu: entry.name_ru,
                })
              : null
            const next = ensureBackgroundFeatureOnDraft(
              {
                identity: prev.identity,
                skills: prev.skills,
                inventory: prev.inventory,
                textBlocks: prev.textBlocks,
                weapons: prev.weapons,
                backgroundGrant: prev.backgroundGrant,
                protectedSkills: new Set(),
                protectedTools: new Set(),
                protectedLanguages: new Set(),
                protectedWeaponExtras: new Set(),
              },
              catalogDef,
            )
            if (
              next.backgroundGrant === prev.backgroundGrant &&
              next.textBlocks === prev.textBlocks
            ) {
              return prev
            }
            return {
              ...prev,
              backgroundGrant: next.backgroundGrant,
              textBlocks: next.textBlocks,
            }
          }
          // Name/slug-only sheets: stamp traits from catalog; panel soft-reads catalog.
          // Do not invent a background_grant (skills/tools ownership stays untouched).
          const slug = prev.identity.backgroundSlug?.trim() || ''
          const name = prev.identity.background?.trim() || ''
          if (!slug && !name) return prev
          const entry =
            (slug ? rows.find((row) => row.slug === slug) : undefined) ??
            (name
              ? rows.find(
                  (row) =>
                    row.name_ru.trim().toLowerCase() === name.toLowerCase(),
                )
              : undefined)
          if (!entry) return prev
          const catalogDef = resolveBackgroundGrantDef({
            backgroundName: entry.name_ru,
            catalogSlug: entry.slug,
            catalogData: entry.data,
            nameRu: entry.name_ru,
          })
          if (!catalogDef?.featureNameRu) return prev
          const featureText = buildBackgroundFeatureText(catalogDef)
          if (!featureText.trim()) return prev
          let changed = false
          const textBlocks = prev.textBlocks.map((block) => {
            if (block.key !== 'traits') return block
            const current = blockPlainText(block)
            if (
              current.includes('<!-- dvarf-background-feature -->') &&
              current.includes(featureText)
            ) {
              return block
            }
            const nextPlain = upsertBackgroundFeatureBlock(current, featureText)
            if (nextPlain === current) return block
            changed = true
            return withBlockPlainText(block, nextPlain)
          })
          if (!changed) return prev
          return { ...prev, textBlocks }
        })
      })
      .catch(() => {
        /* picker will retry on demand */
      })
    return () => {
      active = false
    }
  }, [rulesEdition])
}
