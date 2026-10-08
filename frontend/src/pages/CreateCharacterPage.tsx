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
import { GrimoireDialog } from '../features/characters/GrimoireDialog'
import { PrepareSpellsDialog } from '../features/characters/PrepareSpellsDialog'
import { AbilitiesStep } from '../features/createPipeline/AbilitiesStep'
import { CatalogCardList } from '../features/createPipeline/CatalogCardList'
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
  CREATE_PIPELINE_STEPS,
  catalogSnapshot,
  createEmptyPipelineState,
  stepIndex,
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
import { resolveClassGrantDef } from '../shared/dnd/classGrants'
import { createClassLevel, totalCharacterLevel } from '../shared/dnd/classLevels'
import type { AbilityScores } from '../shared/dnd/multiclassRules'
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
import { emptyFeaturePicks, type FeaturePicksState } from '../shared/dnd/featurePicks'
import { readSpells, spellsToSheet, type SpellsState } from '../features/characters/spells'
import { Button, Field, Input, Stack, Text, Toast } from '../ui'

function catalogRef(entry: CatalogEntry) {
  return { id: entry.id, slug: entry.slug, nameRu: entry.name_ru }
}

function shortBlurb(entry: CatalogEntry | null): string {
  if (!entry) return 'Выберите карточку слева.'
  const data = entry.data ?? {}
  const summary =
    (typeof data.summary_ru === 'string' && data.summary_ru) ||
    (typeof data.description_ru === 'string' && data.description_ru) ||
    (typeof data.feature_text_ru === 'string' && data.feature_text_ru) ||
    null
  if (summary) {
    return summary.length > 420 ? `${summary.slice(0, 420)}…` : summary
  }
  return `${entry.name_ru}${entry.name_en ? ` (${entry.name_en})` : ''}. Подробности применятся после подтверждения шага.`
}

export function CreateCharacterPage() {
  const navigate = useNavigate()
  const { characterId: routeCharacterId } = useParams<{ characterId?: string }>()
  const [state, setState] = useState<CreatePipelineState>(() => loadOrCreatePipelineState())
  const [backgrounds, setBackgrounds] = useState<CatalogEntry[]>([])
  const [classes, setClasses] = useState<CatalogEntry[]>([])
  const [races, setRaces] = useState<CatalogEntry[]>([])
  const [selectedBackground, setSelectedBackground] = useState<CatalogEntry | null>(null)
  const [selectedClass, setSelectedClass] = useState<CatalogEntry | null>(null)
  const [selectedRace, setSelectedRace] = useState<CatalogEntry | null>(null)
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
  } | null>(null)
  const [spellsOpen, setSpellsOpen] = useState<'prepare' | 'grimoire' | null>(null)
  const [spells, setSpells] = useState<SpellsState>(() => readSpells({}))
  const [featurePicks, setFeaturePicks] = useState<FeaturePicksState>(emptyFeaturePicks())
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
    ])
      .then(([bg, cls, race]) => {
        if (!active) return
        setBackgrounds(bg.filter((row) => !row.parent_id))
        setClasses(cls.filter((row) => !row.parent_id && row.is_active))
        setRaces(race.filter((row) => isRaceComboboxRoot(row) && row.is_active))
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
        setFeaturePicks(
          (character.sheet.feature_picks as FeaturePicksState) ?? emptyFeaturePicks(),
        )
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

  const patchState = useCallback((patch: Partial<CreatePipelineState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  function goToStep(next: CreatePipelineStepId) {
    const current = state.step
    if (stepIndex(next) > stepIndex(current)) return
    if (stepIndex(next) < stepIndex(current)) {
      // Drop only the step we leave (current), keep later data if any.
      if (current === 'abilities') {
        patchState({
          step: next,
          baseAbilities: createEmptyPipelineState().baseAbilities,
          abilityMethod: 'standard_array',
          stepDirty: { ...state.stepDirty, abilities: false },
        })
        return
      }
      if (current === 'leveling') {
        patchState({
          step: next,
          classes: [
            createClassLevel({
              id: state.classEntryId,
              name: state.classRef?.nameRu ?? '',
              catalog_id: state.classRef?.id ?? null,
              level: 1,
            }),
          ],
          hpChoices: [],
          stepDirty: { ...state.stepDirty, leveling: false },
        })
        return
      }
      if (current === 'race') {
        patchState({
          step: next,
          race: null,
          subrace: null,
          raceSetup: null,
          characterName: state.characterName,
          stepDirty: { ...state.stepDirty, race: false },
        })
        setRacialBonuses({})
        setSelectedRace(null)
        return
      }
      if (current === 'class') {
        patchState({
          step: next,
          classRef: null,
          classGrantPicks: {},
          stepDirty: { ...state.stepDirty, class: false },
        })
        setSelectedClass(null)
        return
      }
    }
    patchState({ step: next })
  }

  function advanceFrom(step: CreatePipelineStepId) {
    const index = stepIndex(step)
    const next = CREATE_PIPELINE_STEPS[index + 1]
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
            feature_picks: featurePicks,
            spells: spellsToSheet(spells),
            class_asi: state.sheetDraft.class_asi,
            class_grant_picks: state.classGrantPicks,
          },
        },
        featurePicks,
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
    if (!state.background) return 'Выберите предысторию'
    if (!state.classRef) return 'Выберите класс'
    if (!state.race) return 'Выберите расу'
    if (!state.characterName.trim()) return 'Укажите имя на шаге расы'
    if (!abilitiesValid()) return 'Закройте характеристики'
    if (!state.classes.some((row) => row.level > 0 && row.name.trim())) {
      return 'Задайте уровни в прокачке'
    }
    return null
  }

  function requestFinish() {
    const hard = canFinishHardBlocks()
    if (hard) {
      setToast(hard)
      return
    }
    // Soft: spells — warn if caster-looking class and known empty.
    const maybeCaster = state.classes.some((row) =>
      /бард|жрец|друид|паладин|следопыт|чародей|колдун|волшебник|изобретатель/i.test(
        row.name,
      ),
    )
    const hasSpells = (spells.known?.length ?? 0) > 0
    if (maybeCaster && !hasSpells) {
      setSpellWarnOpen(true)
      return
    }
    void persist({ asDraft: false })
  }

  const step = state.step

  let cards = null
  let detail = null
  let footer = null

  if (step === 'background') {
    cards = (
      <CatalogCardList
        items={backgrounds.map((entry) => ({
          id: entry.id,
          title: entry.name_ru,
          subtitle: entry.source ?? undefined,
        }))}
        selectedId={selectedBackground?.id ?? state.background?.id ?? null}
        onSelect={(id) => {
          const entry = backgrounds.find((row) => row.id === id) ?? null
          setSelectedBackground(entry)
        }}
      />
    )
    detail = (
      <Stack gap={12}>
        <Text as="h2">{selectedBackground?.name_ru ?? state.background?.nameRu ?? 'Предыстория'}</Text>
        <Text>{shortBlurb(selectedBackground)}</Text>
        {state.background ? (
          <Text tone="muted">Выбрано: {state.background.nameRu}</Text>
        ) : null}
        <Button
          disabled={!selectedBackground}
          onClick={() => {
            if (!selectedBackground) return
            const variants = backgrounds.filter(
              // variants may be separate roots in catalog; dialog loads by parent when needed
              (row) => row.parent_id === selectedBackground.id,
            )
            setBgSetup({ root: selectedBackground, variants })
          }}
        >
          Выбрать и настроить
        </Button>
      </Stack>
    )
    footer = (
      <Button
        disabled={!state.background}
        onClick={() => advanceFrom('background')}
      >
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
        }))}
        selectedId={selectedClass?.id ?? state.classRef?.id ?? null}
        onSelect={(id) => setSelectedClass(classes.find((row) => row.id === id) ?? null)}
      />
    )
    detail = (
      <Stack gap={12}>
        <Text as="h2">{selectedClass?.name_ru ?? state.classRef?.nameRu ?? 'Класс'}</Text>
        <Text>{shortBlurb(selectedClass)}</Text>
        <Text tone="muted">
          Здесь только фиксируем класс. Навыки, снаряжение и умения — в прокачке.
        </Text>
        <Button
          disabled={!selectedClass}
          onClick={() => {
            if (!selectedClass) return
            const entryId = state.classEntryId || createClassLevel().id
            patchState({
              classRef: catalogRef(selectedClass),
              classEntryId: entryId,
              classes: [
                createClassLevel({
                  id: entryId,
                  name: selectedClass.name_ru,
                  catalog_id: selectedClass.id,
                  level: 1,
                }),
              ],
              hpChoices: ensureHpChoices(
                [
                  createClassLevel({
                    id: entryId,
                    name: selectedClass.name_ru,
                    catalog_id: selectedClass.id,
                    level: 1,
                  }),
                ],
                [],
              ),
              stepDirty: { ...state.stepDirty, class: true },
            })
            setToast(`Класс «${selectedClass.name_ru}» зафиксирован`)
          }}
        >
          Зафиксировать класс
        </Button>
      </Stack>
    )
    footer = (
      <Button disabled={!state.classRef} onClick={() => advanceFrom('class')}>
        Далее · Раса
      </Button>
    )
  }

  if (step === 'race') {
    cards = (
      <CatalogCardList
        items={races.map((entry) => ({
          id: entry.id,
          title: entry.name_ru,
          subtitle: entry.name_en ?? undefined,
        }))}
        selectedId={selectedRace?.id ?? state.race?.id ?? null}
        onSelect={(id) => setSelectedRace(races.find((row) => row.id === id) ?? null)}
      />
    )
    detail = (
      <Stack gap={12}>
        <Text as="h2">{selectedRace?.name_ru ?? state.race?.nameRu ?? 'Раса'}</Text>
        <Field label="Имя персонажа">
          <Input
            value={state.characterName}
            onChange={(event) => patchState({ characterName: event.target.value })}
            placeholder="Имя героя"
          />
        </Field>
        <Text>{shortBlurb(selectedRace)}</Text>
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
      </Stack>
    )
    footer = (
      <Button
        disabled={!state.race || !state.characterName.trim()}
        onClick={() => advanceFrom('race')}
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
            classes: ensureHpChoices(
              state.classes.map((row) =>
                row.id === state.classEntryId && state.classRef
                  ? {
                      ...row,
                      name: state.classRef.nameRu,
                      catalog_id: state.classRef.id,
                    }
                  : row,
              ),
              state.hpChoices,
            )
              ? state.classes
              : state.classes,
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
        abilities={finalAbilities}
        hpChoices={state.hpChoices}
        primaryClassEntryId={state.classEntryId}
        onClassesChange={(next) =>
          patchState({
            classes: next,
            hpChoices: ensureHpChoices(next, state.hpChoices),
            stepDirty: { ...state.stepDirty, leveling: true },
          })
        }
        onHpChoicesChange={(hpChoices) => patchState({ hpChoices })}
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
            mode: classEntryId === state.classEntryId ? 'start' : 'multiclass',
            classEntryId,
          })
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

  return (
    <main className="page page--app page--create-pipeline">
      <div className="create-pipeline__topbar">
        <Link to="/characters">← К списку</Link>
        <Text tone="muted">Создание · D&D 2014</Text>
      </div>
      {error ? <Text tone="danger">{error}</Text> : null}
      <CreatePipelineShell
        step={step}
        title="Создание персонажа"
        subtitle="Предыстория → класс → раса → характеристики → прокачка"
        cards={cards}
        detail={detail}
        footer={footer}
        onStepClick={goToStep}
        onBack={
          stepIndex(step) > 0
            ? () => goToStep(CREATE_PIPELINE_STEPS[stepIndex(step) - 1]!)
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
          patchState({
            race: isSub
              ? state.race ??
                (rootEntry ? catalogRef(rootEntry) : catalogRef(result.entry))
              : catalogRef(result.entry),
            subrace: isSub ? catalogRef(result.entry) : null,
            raceSetup: {
              entry: catalogSnapshot(result.entry),
              rootEntry: rootEntry ? catalogSnapshot(rootEntry) : null,
              picks: result.picks,
            },
            sheetDraft: {
              ...state.sheetDraft,
              race_grant: {
                raceCatalogId: result.entry.id,
                raceSlug: result.entry.slug,
                picks: result.picks,
              },
            },
            stepDirty: { ...state.stepDirty, race: true },
          })
          setRaceSetup(null)
          setToast(`Раса «${result.entry.name_ru}»`)
          if (result.def.featNoteRu) {
            setToast(`Раса «${result.entry.name_ru}». Черта: ${result.def.featNoteRu}`)
          }
        }}
      />

      <ClassSetupDialog
        open={Boolean(classSetup)}
        def={classSetup?.def ?? null}
        mode={classSetup?.mode ?? 'start'}
        blockedSkillKeys={[]}
        onClose={() => setClassSetup(null)}
        onConfirm={(picks: ClassGrantPicks) => {
          const entryId = classSetup?.classEntryId ?? state.classEntryId
          const nextPicks = {
            ...state.classGrantPicks,
            [entryId]: picks,
          }
          patchState({
            classGrantPicks: nextPicks,
            sheetDraft: {
              ...state.sheetDraft,
              class_grant_picks: nextPicks,
            },
          })
          setClassSetup(null)
          setToast('Выборы класса сохранены')
        }}
      />

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
