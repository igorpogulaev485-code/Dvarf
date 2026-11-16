/**
 * P24-M03: D&D 2024 character creation wizard (level 1).
 * Entry: `/characters/create-2024?preview=1` or DEV `/dev/p24-m03-preview`.
 * Does not open RULES_EDITION_2024_OPEN / player CTA.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AbilitiesStep } from '../features/createPipeline/AbilitiesStep'
import { CatalogCardList } from '../features/createPipeline/CatalogCardList'
import { CreatePipelineShell } from '../features/createPipeline/CreatePipelineShell'
import {
  buildCreate2024Fixtures,
  FIXTURE_LANGUAGES,
} from '../features/createPipeline2024/createPipeline2024Fixtures'
import {
  backgroundAsiOverlay,
  backgroundAsiTrio,
  backgroundNeedsToolPick,
  canAdvanceCreate2024Step,
  classSkillNeed,
  classStartingPacks,
  dragonbornDamageOptions,
  fightingStyleFeats,
  l1Invocations,
  nextCreate2024Step,
  originFeatSlug,
  prevCreate2024Step,
  setAsiFlat1,
  setAsiPlus2Plus1,
  skillLabelRu,
  speciesLineages,
  speciesNeedsAncestry,
  speciesNeedsLineage,
  speciesSizeOptions,
  toolChoicePool,
  weaponMasteryLimit,
} from '../features/createPipeline2024/createPipeline2024State'
import {
  CREATE_2024_STEP_LABELS,
  classL1Spellcasting,
  createEmptyCreate2024State,
  entryData,
  isCasterAtLevel1,
  toCreate2024Request,
  visibleCreate2024Steps,
  type Create2024CatalogBundle,
  type Create2024State,
  type Create2024StepId,
  type LanguagesBundle,
} from '../features/createPipeline2024/createPipeline2024Types'
import { PickChipGroup } from '../features/createPipeline2024/PickChipGroup'
import { listCatalogEntries, type CatalogEntry } from '../shared/api/catalog'
import {
  createCharacter2024,
  listCreate2024Languages,
  validateCreate2024,
  type CharacterCreate2024ValidateResponse,
} from '../shared/api/characters'
import { getAccessToken } from '../shared/api/client'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import { ABILITY_LABEL_RU, type AbilityKey } from '../shared/dnd/pointBuy'
import { masteryPropertyNameRu } from '../shared/dnd/weaponMastery'
import { Button, Field, Input, Stack, Text } from '../ui'

export type CreateCharacter2024PageProps = {
  /** Offline fixtures for DEV preview / e2e (no API). */
  useFixtures?: boolean
  rootTestId?: string
}

function findBySlug(list: CatalogEntry[], slug: string | null): CatalogEntry | null {
  if (!slug) return null
  return list.find((e) => e.slug === slug) ?? null
}

function spellLevel(entry: CatalogEntry): number {
  const raw = entryData(entry).level
  return typeof raw === 'number' ? raw : Number(raw ?? -1)
}

function spellOnClassList(entry: CatalogEntry, classSlug: string): boolean {
  const classes = entryData(entry).classes
  if (!Array.isArray(classes)) return true
  return classes.map((c) => String(c).toLowerCase()).includes(classSlug)
}

/** Picks live under the catalog in `cards` so phone stage stays usable (390px). */
function Stage({
  testId,
  catalog,
  picks,
}: {
  testId: string
  catalog: ReactNode
  picks?: ReactNode
}) {
  return (
    <div data-testid={testId}>
      <Stack gap={14}>
        {catalog}
        {picks}
      </Stack>
    </div>
  )
}

export function CreateCharacter2024Page({
  useFixtures = false,
  rootTestId,
}: CreateCharacter2024PageProps) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const previewQuery = params.get('preview') === '1'
  const blocked = !useFixtures && !previewQuery && !RULES_EDITION_2024_OPEN

  const [state, setState] = useState<Create2024State>(() => createEmptyCreate2024State())
  const [catalog, setCatalog] = useState<Create2024CatalogBundle | null>(
    useFixtures ? buildCreate2024Fixtures() : null,
  )
  const [languages, setLanguages] = useState<LanguagesBundle | null>(
    useFixtures ? FIXTURE_LANGUAGES : null,
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewSheet, setPreviewSheet] = useState<CharacterCreate2024ValidateResponse | null>(
    null,
  )
  const [createdId, setCreatedId] = useState<string | null>(null)

  useEffect(() => {
    if (useFixtures || blocked) return
    const ac = new AbortController()
    void (async () => {
      try {
        const [classes, backgrounds, species, feats, weapons, spells, langs] =
          await Promise.all([
            listCatalogEntries({ kind: 'class', edition: '2024' }, ac.signal),
            listCatalogEntries({ kind: 'background', edition: '2024' }, ac.signal),
            listCatalogEntries({ kind: 'race', edition: '2024' }, ac.signal),
            listCatalogEntries({ kind: 'feat', edition: '2024' }, ac.signal),
            listCatalogEntries({ kind: 'weapon', edition: '2024' }, ac.signal),
            listCatalogEntries({ kind: 'spell', edition: '2024' }, ac.signal),
            listCreate2024Languages(ac.signal),
          ])
        setCatalog({ classes, backgrounds, species, feats, weapons, spells })
        setLanguages(langs)
        setLoadError(null)
      } catch (err) {
        if (ac.signal.aborted) return
        setCatalog(buildCreate2024Fixtures())
        setLanguages(FIXTURE_LANGUAGES)
        setLoadError(
          err instanceof Error
            ? `Каталог API недоступен — локальные фикстуры. ${err.message}`
            : 'Каталог API недоступен — локальные фикстуры.',
        )
      }
    })()
    return () => ac.abort()
  }, [useFixtures, blocked])

  const classEntry = findBySlug(catalog?.classes ?? [], state.classSlug)
  const backgroundEntry = findBySlug(catalog?.backgrounds ?? [], state.backgroundSlug)
  const speciesEntry = findBySlug(catalog?.species ?? [], state.speciesSlug)
  const steps = useMemo(() => visibleCreate2024Steps(classEntry), [classEntry])
  const step = (steps.includes(state.step) ? state.step : steps[0]) as Create2024StepId

  useEffect(() => {
    if (!steps.includes(state.step) && steps[0]) {
      setState((prev) => ({ ...prev, step: steps[0]! }))
    }
  }, [steps, state.step])

  const canNext = canAdvanceCreate2024Step(step, state, {
    classEntry,
    backgroundEntry,
    speciesEntry,
    languageChoiceCount: languages?.choice_count ?? 2,
  })

  function patch(partial: Partial<Create2024State>) {
    setState((prev) => ({ ...prev, ...partial }))
    setError(null)
    setPreviewSheet(null)
    setCreatedId(null)
  }

  function goToStep(nextStep: string) {
    if ((steps as readonly string[]).includes(nextStep)) {
      patch({ step: nextStep as Create2024StepId })
    }
  }

  async function onFinish() {
    if (!canNext) return
    setBusy(true)
    setError(null)
    const payload = toCreate2024Request(state, { isPreview: true, isDraft: false })
    try {
      if (getAccessToken() && !useFixtures) {
        const validated = await validateCreate2024(payload)
        setPreviewSheet(validated)
        const created = await createCharacter2024(payload)
        setCreatedId(created.id)
      } else {
        setPreviewSheet({
          ok: true,
          name: payload.name,
          level: 1,
          class_name: classEntry?.name_ru || payload.class_slug,
          race_name: speciesEntry?.name_ru || payload.species_slug,
          hp_max: 10,
          sheet: {
            meta: { rules_edition: '2024', preview_local: true },
            create_2024: payload,
          },
          warnings: ['Локальный превью-итог (без записи в БД).'],
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать персонажа')
    } finally {
      setBusy(false)
    }
  }

  if (blocked) {
    return (
      <main className="page page--app page--create-pipeline" data-testid={rootTestId}>
        <Stack gap={12}>
          <Text as="h1">Создание D&D 2024 закрыто</Text>
          <p className="ui-text ui-text--muted" data-testid="p24-m03-flag">
            Флаг RULES_EDITION_2024_OPEN = {String(RULES_EDITION_2024_OPEN)}. Откройте с
            ?preview=1 или через /dev/p24-m03-preview.
          </p>
          <Link className="back-link" to="/characters">
            ← К списку
          </Link>
        </Stack>
      </main>
    )
  }

  if (!catalog || !languages) {
    return (
      <main className="page page--app page--create-pipeline" data-testid={rootTestId}>
        <Text tone="muted">Загрузка каталога 2024…</Text>
      </main>
    )
  }

  const racialBonuses = backgroundAsiOverlay(state)
  const next = nextCreate2024Step(step, steps)
  const prev = prevCreate2024Step(step, steps)

  let cards: ReactNode = null
  let detail: ReactNode = null
  let footer: ReactNode = null
  let detailPrimary = false

  if (step === 'class') {
    const skills = classSkillNeed(classEntry)
    const wmLimit = weaponMasteryLimit(state.classSlug)
    const styleFeats = fightingStyleFeats(catalog.feats)
    cards = (
      <Stage
        testId="p24-m03-step-class"
        catalog={
          <CatalogCardList
            resetToken={step}
            selectedId={classEntry?.id ?? null}
            items={catalog.classes.map((e) => ({
              id: e.id,
              title: e.name_ru,
              subtitle: e.name_en ?? undefined,
              source: e.source,
              meta: Array.isArray(entryData(e).primary_abilities)
                ? (entryData(e).primary_abilities as string[])
                    .map((a) => ABILITY_LABEL_RU[a as AbilityKey] ?? a)
                    .join('/')
                : null,
            }))}
            onSelect={(id) => {
              const entry = catalog.classes.find((e) => e.id === id)
              if (!entry) return
              const packs = classStartingPacks(entry)
              patch({
                classSlug: entry.slug,
                classSkillIds: [],
                weaponMasteryIds: [],
                fightingStyleSlug: null,
                classOptionPicks: {},
                classEquipment: packs[0]?.id || 'a',
                cantripIds: [],
                preparedSpellIds: [],
              })
            }}
          />
        }
        picks={
          classEntry ? (
            <Stack gap={14}>
              <Text tone="muted">
                Подкласс на 1 уровне недоступен. Выберите навыки и опции класса.
              </Text>
              {skills.count > 0 ? (
                <PickChipGroup
                  label="Навыки класса"
                  options={skills.from.map((id) => ({ id, label: skillLabelRu(id) }))}
                  selected={state.classSkillIds}
                  max={skills.count}
                  onChange={(classSkillIds) => patch({ classSkillIds })}
                />
              ) : null}
              {wmLimit > 0 ? (
                <PickChipGroup
                  label="Мастерство оружия"
                  options={catalog.weapons.map((w) => ({
                    id: w.slug,
                    label: w.name_ru,
                    rest: masteryPropertyNameRu(String(entryData(w).mastery || '')),
                  }))}
                  selected={state.weaponMasteryIds}
                  max={wmLimit}
                  onChange={(weaponMasteryIds) => patch({ weaponMasteryIds })}
                />
              ) : null}
              {state.classSlug === 'fighter' ? (
                <PickChipGroup
                  label="Боевой стиль"
                  options={styleFeats.map((f) => ({ id: f.slug, label: f.name_ru }))}
                  selected={state.fightingStyleSlug ? [state.fightingStyleSlug] : []}
                  max={1}
                  multi={false}
                  onChange={(ids) => patch({ fightingStyleSlug: ids[0] ?? null })}
                />
              ) : null}
              {state.classSlug === 'cleric' ? (
                <PickChipGroup
                  label="Божественный указ"
                  options={[
                    { id: 'protector', label: 'Защитник' },
                    { id: 'thaumaturge', label: 'Чудотворец' },
                  ]}
                  selected={
                    state.classOptionPicks.divine_order
                      ? [String(state.classOptionPicks.divine_order)]
                      : []
                  }
                  max={1}
                  multi={false}
                  onChange={(ids) =>
                    patch({
                      classOptionPicks: {
                        ...state.classOptionPicks,
                        divine_order: ids[0],
                      },
                    })
                  }
                />
              ) : null}
              {state.classSlug === 'druid' ? (
                <PickChipGroup
                  label="Изначальный указ"
                  options={[
                    { id: 'magician', label: 'Маг' },
                    { id: 'warden', label: 'Страж' },
                  ]}
                  selected={
                    state.classOptionPicks.primal_order
                      ? [String(state.classOptionPicks.primal_order)]
                      : []
                  }
                  max={1}
                  multi={false}
                  onChange={(ids) =>
                    patch({
                      classOptionPicks: {
                        ...state.classOptionPicks,
                        primal_order: ids[0],
                      },
                    })
                  }
                />
              ) : null}
              {state.classSlug === 'rogue' ? (
                <PickChipGroup
                  label="Компетентность"
                  options={[
                    ...state.classSkillIds.map((id) => ({
                      id,
                      label: skillLabelRu(id),
                    })),
                    { id: 'thieves-tools', label: 'Воровские инструменты' },
                  ]}
                  selected={
                    Array.isArray(state.classOptionPicks.expertise)
                      ? (state.classOptionPicks.expertise as string[])
                      : []
                  }
                  max={2}
                  onChange={(expertise) =>
                    patch({
                      classOptionPicks: { ...state.classOptionPicks, expertise },
                    })
                  }
                />
              ) : null}
              {state.classSlug === 'warlock' ? (
                <PickChipGroup
                  label="Мистические воззвания"
                  options={l1Invocations().map((row) => ({
                    id: row.id,
                    label: row.nameRu,
                    rest: row.summaryRu,
                  }))}
                  selected={
                    Array.isArray(state.classOptionPicks.eldritch_invocations)
                      ? (state.classOptionPicks.eldritch_invocations as string[])
                      : []
                  }
                  max={1}
                  multi={false}
                  onChange={(ids) =>
                    patch({
                      classOptionPicks: {
                        ...state.classOptionPicks,
                        eldritch_invocations: ids,
                      },
                    })
                  }
                />
              ) : null}
            </Stack>
          ) : null
        }
      />
    )
    detail = (
      <Stack gap={8}>
        <Text as="h2">{classEntry?.name_ru || 'Класс'}</Text>
        <Text tone="muted">{String(entryData(classEntry).summary_ru || 'Выберите класс слева.')}</Text>
      </Stack>
    )
  }

  if (step === 'background') {
    const trio = backgroundAsiTrio(backgroundEntry)
    const feat = originFeatSlug(backgroundEntry)
    const toolPool = toolChoicePool(backgroundEntry)
    const featNote = backgroundEntry
      ? String(
          (entryData(backgroundEntry).origin_feat as { name_ru?: string } | undefined)
            ?.name_ru ||
            feat ||
            '',
        )
      : ''
    cards = (
      <Stage
        testId="p24-m03-step-background"
        catalog={
          <CatalogCardList
            resetToken={step}
            selectedId={backgroundEntry?.id ?? null}
            items={catalog.backgrounds.map((e) => ({
              id: e.id,
              title: e.name_ru,
              source: e.source,
              meta: originFeatSlug(e)
                ? `черта происхождения: ${
                    (entryData(e).origin_feat as { name_ru?: string } | undefined)
                      ?.name_ru || originFeatSlug(e)
                  }`
                : null,
            }))}
            onSelect={(id) => {
              const entry = catalog.backgrounds.find((e) => e.id === id)
              if (!entry) return
              const nextTrio = backgroundAsiTrio(entry)
              patch({
                backgroundSlug: entry.slug,
                backgroundAsiMode: '+2/+1',
                backgroundAsi:
                  nextTrio.length >= 2
                    ? setAsiPlus2Plus1(nextTrio, nextTrio[0]!, nextTrio[1]!)
                    : {},
                backgroundToolId: null,
                backgroundEquipment: 'pack',
                originFeatList: null,
                originFeatCantrips: [],
                originFeatSpellId: null,
                originFeatSkilled: [],
              })
            }}
          />
        }
        picks={
          backgroundEntry ? (
            <Stack gap={14}>
              {featNote ? (
                <Text>
                  Черта происхождения: <strong>{featNote}</strong>
                </Text>
              ) : null}
              {trio.length === 3 ? (
                <Stack gap={8}>
                  <Text tone="muted">
                    ASI только из тройки{' '}
                    {trio.map((k) => ABILITY_LABEL_RU[k]).join(' / ')}. Вид не даёт ASI.
                  </Text>
                  <PickChipGroup
                    label="Режим ASI"
                    options={[
                      { id: '+2/+1', label: '+2 / +1' },
                      { id: '+1/+1/+1', label: '+1 / +1 / +1' },
                    ]}
                    selected={[state.backgroundAsiMode]}
                    max={1}
                    multi={false}
                    onChange={(ids) => {
                      const mode = (ids[0] as '+2/+1' | '+1/+1/+1') || '+2/+1'
                      patch({
                        backgroundAsiMode: mode,
                        backgroundAsi:
                          mode === '+1/+1/+1'
                            ? setAsiFlat1(trio)
                            : setAsiPlus2Plus1(trio, trio[0]!, trio[1]!),
                      })
                    }}
                  />
                  {state.backgroundAsiMode === '+2/+1' ? (
                    <>
                      <PickChipGroup
                        label="+2"
                        options={trio.map((k) => ({
                          id: k,
                          label: ABILITY_LABEL_RU[k],
                        }))}
                        selected={trio.filter((k) => state.backgroundAsi[k] === 2)}
                        max={1}
                        multi={false}
                        onChange={(ids) => {
                          const plus2 = (ids[0] as AbilityKey) || trio[0]!
                          const plus1 =
                            (trio.find(
                              (k) => k !== plus2 && state.backgroundAsi[k] === 1,
                            ) as AbilityKey) ||
                            (trio.find((k) => k !== plus2) as AbilityKey)
                          patch({
                            backgroundAsi: setAsiPlus2Plus1(trio, plus2, plus1),
                          })
                        }}
                      />
                      <PickChipGroup
                        label="+1"
                        options={trio
                          .filter((k) => state.backgroundAsi[k] !== 2)
                          .map((k) => ({ id: k, label: ABILITY_LABEL_RU[k] }))}
                        selected={trio.filter((k) => state.backgroundAsi[k] === 1)}
                        max={1}
                        multi={false}
                        onChange={(ids) => {
                          const plus1 = (ids[0] as AbilityKey) || trio[1]!
                          const plus2 =
                            (trio.find((k) => state.backgroundAsi[k] === 2) as AbilityKey) ||
                            trio[0]!
                          if (plus1 === plus2) return
                          patch({
                            backgroundAsi: setAsiPlus2Plus1(trio, plus2, plus1),
                          })
                        }}
                      />
                    </>
                  ) : null}
                </Stack>
              ) : null}
              {backgroundNeedsToolPick(backgroundEntry) && toolPool ? (
                <PickChipGroup
                  label="Инструмент предыстории"
                  options={toolPool.map((id) => ({ id, label: id }))}
                  selected={state.backgroundToolId ? [state.backgroundToolId] : []}
                  max={1}
                  multi={false}
                  onChange={(ids) => patch({ backgroundToolId: ids[0] ?? null })}
                />
              ) : null}
              {feat === 'magic-initiate' ? (
                <Stack gap={8}>
                  <PickChipGroup
                    label="Список Magic Initiate"
                    options={[
                      { id: 'cleric', label: 'Жрец' },
                      { id: 'druid', label: 'Друид' },
                      { id: 'wizard', label: 'Волшебник' },
                    ]}
                    selected={state.originFeatList ? [state.originFeatList] : []}
                    max={1}
                    multi={false}
                    onChange={(ids) =>
                      patch({
                        originFeatList: ids[0] ?? null,
                        originFeatCantrips: [],
                        originFeatSpellId: null,
                      })
                    }
                  />
                  {state.originFeatList ? (
                    <>
                      <PickChipGroup
                        label="Заговоры"
                        options={catalog.spells
                          .filter(
                            (s) =>
                              spellLevel(s) === 0 &&
                              spellOnClassList(s, state.originFeatList || ''),
                          )
                          .map((s) => ({ id: s.slug, label: s.name_ru }))}
                        selected={state.originFeatCantrips}
                        max={2}
                        onChange={(originFeatCantrips) => patch({ originFeatCantrips })}
                      />
                      <PickChipGroup
                        label="Заклинание 1 круга"
                        options={catalog.spells
                          .filter(
                            (s) =>
                              spellLevel(s) === 1 &&
                              spellOnClassList(s, state.originFeatList || ''),
                          )
                          .map((s) => ({ id: s.slug, label: s.name_ru }))}
                        selected={
                          state.originFeatSpellId ? [state.originFeatSpellId] : []
                        }
                        max={1}
                        multi={false}
                        onChange={(ids) =>
                          patch({ originFeatSpellId: ids[0] ?? null })
                        }
                      />
                    </>
                  ) : null}
                </Stack>
              ) : null}
              {feat === 'skilled' ? (
                <PickChipGroup
                  label="Умелый — 3 навыка/инструмента"
                  options={[
                    ...[
                      'athletics',
                      'stealth',
                      'persuasion',
                      'arcana',
                      'insight',
                      'perception',
                    ].map((id) => ({ id, label: skillLabelRu(id) })),
                    { id: 'thieves-tools', label: 'Воровские инструменты' },
                    { id: 'herbalism-kit', label: 'Набор травника' },
                  ]}
                  selected={state.originFeatSkilled}
                  max={3}
                  onChange={(originFeatSkilled) => patch({ originFeatSkilled })}
                />
              ) : null}
            </Stack>
          ) : null
        }
      />
    )
    detail = (
      <Stack gap={8}>
        <Text as="h2">{backgroundEntry?.name_ru || 'Предыстория'}</Text>
        <Text tone="muted">ASI и черта происхождения настраиваются под списком.</Text>
      </Stack>
    )
  }

  if (step === 'species') {
    const sizes = speciesSizeOptions(speciesEntry)
    const lineages = speciesLineages(speciesEntry)
    cards = (
      <Stage
        testId="p24-m03-step-species"
        catalog={
          <CatalogCardList
            resetToken={step}
            selectedId={speciesEntry?.id ?? null}
            searchPlaceholder="Поиск вида…"
            items={catalog.species.map((e) => ({
              id: e.id,
              title: e.name_ru,
              source: e.source,
              meta: speciesNeedsLineage(e)
                ? 'родословная'
                : speciesNeedsAncestry(e)
                  ? 'наследие дракона'
                  : null,
            }))}
            onSelect={(id) => {
              const entry = catalog.species.find((e) => e.id === id)
              if (!entry) return
              const nextSizes = speciesSizeOptions(entry)
              patch({
                speciesSlug: entry.slug,
                speciesSize: nextSizes.length === 1 ? nextSizes[0]! : null,
                speciesLineageId: null,
                speciesAncestryId: null,
              })
            }}
          />
        }
        picks={
          speciesEntry ? (
            <Stack gap={14}>
              <Text tone="muted">
                Вид не даёт ASI и языков — только размер / родословную / наследие при
                необходимости.
              </Text>
              {sizes.length > 1 ? (
                <PickChipGroup
                  label="Размер"
                  options={sizes.map((id) => ({
                    id,
                    label:
                      id === 'small' ? 'Маленький' : id === 'medium' ? 'Средний' : id,
                  }))}
                  selected={state.speciesSize ? [state.speciesSize] : []}
                  max={1}
                  multi={false}
                  onChange={(ids) => patch({ speciesSize: ids[0] ?? null })}
                />
              ) : null}
              {speciesNeedsLineage(speciesEntry) ? (
                <PickChipGroup
                  label="Родословная"
                  options={lineages.map((l) => ({
                    id: l.id,
                    label: l.name_ru,
                    rest: l.summary_ru,
                  }))}
                  selected={state.speciesLineageId ? [state.speciesLineageId] : []}
                  max={1}
                  multi={false}
                  onChange={(ids) => patch({ speciesLineageId: ids[0] ?? null })}
                />
              ) : null}
              {speciesNeedsAncestry(speciesEntry) ? (
                <PickChipGroup
                  label="Драконье наследие (урон)"
                  options={dragonbornDamageOptions().map((id) => ({
                    id,
                    label: id,
                  }))}
                  selected={state.speciesAncestryId ? [state.speciesAncestryId] : []}
                  max={1}
                  multi={false}
                  onChange={(ids) => patch({ speciesAncestryId: ids[0] ?? null })}
                />
              ) : null}
            </Stack>
          ) : null
        }
      />
    )
    detail = (
      <Stack gap={8}>
        <Text as="h2">{speciesEntry?.name_ru || 'Вид'}</Text>
        <Text tone="muted">{String(entryData(speciesEntry).traits_text || '')}</Text>
      </Stack>
    )
  }

  if (step === 'abilities') {
    detailPrimary = true
    cards = (
      <Stack gap={8}>
        <Text as="h3">Сводка ASI</Text>
        <Text tone="muted">
          Бонусы справа — от предыстории (не от вида). Потолок после бонусов: 20.
        </Text>
        <ul>
          {Object.entries(racialBonuses).map(([k, v]) => (
            <li key={k}>
              {ABILITY_LABEL_RU[k as AbilityKey]} +{v}
            </li>
          ))}
        </ul>
      </Stack>
    )
    detail = (
      <div data-testid="p24-m03-step-abilities">
        <AbilitiesStep
          method={state.abilityMethod}
          baseAbilities={state.baseAbilities}
          racialBonuses={racialBonuses}
          classSlug={state.classSlug}
          bonusLabel="предыстория"
          onMethodChange={(abilityMethod) => patch({ abilityMethod })}
          onBaseChange={(baseAbilities) => patch({ baseAbilities })}
        />
      </div>
    )
  }

  if (step === 'languages') {
    cards = (
      <Stage
        testId="p24-m03-step-languages"
        catalog={
          <Stack gap={8}>
            <Text as="h3">Автоматически</Text>
            <Text>Общий ({languages.common_id})</Text>
          </Stack>
        }
        picks={
          <PickChipGroup
            label="Языки на выбор"
            hint={`Общий уже есть. Выберите ровно ${languages.choice_count} (включая язык жестов).`}
            options={languages.languages.map((l) => ({
              id: l.id,
              label: l.name_ru,
              rest: l.kind,
            }))}
            selected={state.languageIds}
            max={languages.choice_count}
            onChange={(languageIds) => patch({ languageIds })}
          />
        }
      />
    )
    detail = (
      <Text tone="muted">Вид и предыстория языков не дают — только этот шаг (+ классовые).</Text>
    )
  }

  if (step === 'equipment') {
    const packs = classStartingPacks(classEntry)
    const bgPack = entryData(backgroundEntry).equipment_or_gold as
      | { pack_summary_ru?: string; gold_alternative_gp?: number }
      | undefined
    cards = (
      <Stage
        testId="p24-m03-step-equipment"
        catalog={
          <Text tone="muted">
            {classEntry?.name_ru || '—'} / {backgroundEntry?.name_ru || '—'}
          </Text>
        }
        picks={
          <Stack gap={14}>
            <PickChipGroup
              label="Стартовый пакет класса"
              options={packs.map((p) => ({
                id: p.id,
                label: p.label_ru || p.id,
                rest: p.summary_ru,
              }))}
              selected={[state.classEquipment]}
              max={1}
              multi={false}
              onChange={(ids) => patch({ classEquipment: ids[0] || 'a' })}
            />
            <PickChipGroup
              label="Снаряжение предыстории"
              options={[
                {
                  id: 'pack',
                  label: 'Пакет',
                  rest: bgPack?.pack_summary_ru || 'Стартовый набор предыстории',
                },
                {
                  id: 'gold',
                  label: 'Золото',
                  rest: `${bgPack?.gold_alternative_gp ?? 50} зм`,
                },
              ]}
              selected={[state.backgroundEquipment]}
              max={1}
              multi={false}
              onChange={(ids) =>
                patch({
                  backgroundEquipment: (ids[0] as 'pack' | 'gold') || 'pack',
                })
              }
            />
          </Stack>
        }
      />
    )
    detail = <Text tone="muted">Класс: a/b/gold · предыстория: pack или 50 зм.</Text>
  }

  if (step === 'spells') {
    const sc = classL1Spellcasting(classEntry)
    const classSlug = state.classSlug || ''
    cards = (
      <Stage
        testId="p24-m03-step-spells"
        catalog={
          <Text tone="muted">
            Заговоры: {sc?.cantrips ?? 0}. Подготовлено: {sc?.prepared_spells ?? 0}.
          </Text>
        }
        picks={
          <Stack gap={14}>
            {sc && sc.cantrips > 0 ? (
              <PickChipGroup
                label="Заговоры"
                options={catalog.spells
                  .filter((s) => spellLevel(s) === 0 && spellOnClassList(s, classSlug))
                  .map((s) => ({ id: s.slug, label: s.name_ru }))}
                selected={state.cantripIds}
                max={sc.cantrips}
                onChange={(cantripIds) => patch({ cantripIds })}
              />
            ) : null}
            {sc && sc.prepared_spells > 0 ? (
              <PickChipGroup
                label="Подготовленные 1 круга"
                options={catalog.spells
                  .filter((s) => spellLevel(s) === 1 && spellOnClassList(s, classSlug))
                  .map((s) => ({ id: s.slug, label: s.name_ru }))}
                selected={state.preparedSpellIds}
                max={sc.prepared_spells}
                onChange={(preparedSpellIds) => patch({ preparedSpellIds })}
              />
            ) : null}
          </Stack>
        }
      />
    )
    detail = <Text tone="muted">Только если класс — кастер на 1 уровне.</Text>
  }

  if (step === 'summary') {
    cards = (
      <Stage
        testId="p24-m03-step-summary"
        catalog={
          <Field label="Имя персонажа">
            <Input
              value={state.characterName}
              onChange={(e) => patch({ characterName: e.target.value })}
              placeholder="Имя"
              data-testid="p24-m03-name"
            />
          </Field>
        }
        picks={
          <Stack gap={8}>
            <Text as="h3" className="create-pipeline__section-title">
              Сводка выбора
            </Text>
            <ul>
              <li>
                Класс: {classEntry?.name_ru || '—'}
                {isCasterAtLevel1(classEntry) ? ' (кастер L1)' : ''}
              </li>
              <li>Предыстория: {backgroundEntry?.name_ru || '—'}</li>
              <li>Вид: {speciesEntry?.name_ru || '—'}</li>
              <li>
                ASI: {state.backgroundAsiMode}{' '}
                {Object.entries(state.backgroundAsi)
                  .map(([k, v]) => `${ABILITY_LABEL_RU[k as AbilityKey]}+${v}`)
                  .join(', ')}
              </li>
              <li>Языки: common + {state.languageIds.join(', ')}</li>
              <li>
                Снаряжение: класс {state.classEquipment} / фон {state.backgroundEquipment}
              </li>
            </ul>
            {previewSheet ? (
              <ul>
                <li>
                  {previewSheet.name} · ур. {previewSheet.level} · хиты {previewSheet.hp_max}
                </li>
                <li>
                  {previewSheet.class_name} / {previewSheet.race_name}
                </li>
                {previewSheet.warnings?.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : (
              <Text tone="muted">«Готово» создаёт с is_preview: true.</Text>
            )}
            {createdId ? <Text>Создан id: {createdId}</Text> : null}
          </Stack>
        }
      />
    )
    detail = <Text tone="muted">Превью листа после «Готово».</Text>
    footer = (
      <Button
        disabled={busy || !canNext}
        onClick={() => void onFinish()}
        data-testid="p24-m03-finish"
      >
        {busy ? '…' : 'Готово'}
      </Button>
    )
  }

  if (!footer) {
    footer = (
      <Button
        disabled={!canNext || !next}
        onClick={() => next && goToStep(next)}
        data-testid="p24-m03-next"
      >
        Далее
      </Button>
    )
  }

  return (
    <main className="page page--app page--create-pipeline" data-testid={rootTestId}>
      <div className="create-pipeline__topbar">
        <Link className="back-link" to="/characters">
          ← К списку
        </Link>
        <Text tone="muted">Создание · D&D 2024 (превью)</Text>
      </div>
      <p className="ui-text ui-text--muted" data-testid="p24-m03-flag">
        Флаг RULES_EDITION_2024_OPEN = {String(RULES_EDITION_2024_OPEN)}
        {useFixtures ? ' · фикстуры' : ''}
      </p>
      {loadError ? <Text tone="muted">{loadError}</Text> : null}
      {error ? <Text tone="danger">{error}</Text> : null}
      <CreatePipelineShell
        step={step}
        steps={steps}
        stepLabels={CREATE_2024_STEP_LABELS}
        title="Создание персонажа 2024"
        subtitle="Класс → предыстория → вид → характеристики → языки → снаряжение → заклинания* → итог"
        cards={cards}
        detail={detail}
        footer={footer}
        detailPrimary={detailPrimary}
        onStepClick={goToStep}
        onBack={
          prev
            ? () => goToStep(prev)
            : () => navigate(useFixtures ? '/dev/p24-m03-preview' : '/characters')
        }
      />
    </main>
  )
}
