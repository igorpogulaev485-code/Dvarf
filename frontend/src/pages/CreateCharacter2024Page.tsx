/**
 * P24-M03: D&D 2024 character creation wizard (level 1).
 * Live route: `/characters/create-2024?preview=1` (auth required, catalog from API).
 * DEV/e2e: `/dev/p24-m03-preview` injects a full catalog through `harness`.
 * Does not open RULES_EDITION_2024_OPEN / player CTA.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AbilitiesStep } from '../features/createPipeline/AbilitiesStep'
import { CatalogCardList, type CatalogCardItem } from '../features/createPipeline/CatalogCardList'
import { CreatePipelineShell } from '../features/createPipeline/CreatePipelineShell'
import { Create2024DetailPanel } from '../features/createPipeline2024/Create2024DetailPanel'
import {
  BackgroundPicks,
  ClassPicks,
  SpeciesPicks,
} from '../features/createPipeline2024/Create2024Picks'
import { Create2024SheetPreview } from '../features/createPipeline2024/Create2024SheetPreview'
import {
  buildItemNameIndex,
  COMMON_LANGUAGE_NAME_RU,
  hitDieLabel,
  itemNameRu,
  languageKindLabelRu,
  ruDice,
  spellSchoolLabelRu,
  castingTimeLabelRu,
  sizeLabelRu,
} from '../features/createPipeline2024/create2024Labels'
import {
  originFeatNameOf,
  originFeatSlugOf,
  spellsByLevelForClass,
} from '../features/createPipeline2024/create2024FeatPicks'
import {
  buildCreate2024SheetPreview,
  overlayServerCombat,
} from '../features/createPipeline2024/create2024SheetPreview'
import {
  backgroundAsiOverlay,
  backgroundAsiTrio,
  classStartingPacks,
  create2024StepIssues,
  creatableSpecies,
  findFeat,
  humanOriginFeatOptions,
  nextCreate2024Step,
  prevCreate2024Step,
  setAsiPlus2Plus1,
  speciesLineages,
  speciesNeedsAncestry,
  speciesNeedsLineage,
  speciesSizeOptions,
  toggleUniquePick,
} from '../features/createPipeline2024/createPipeline2024State'
import {
  CREATE_2024_STEP_LABELS,
  classL1Spellcasting,
  createEmptyCreate2024State,
  entryData,
  toCreate2024Request,
  visibleCreate2024Steps,
  type Create2024CatalogBundle,
  type Create2024State,
  type Create2024StepId,
  type LanguagesBundle,
} from '../features/createPipeline2024/createPipeline2024Types'
import { useIsPhone } from '../features/createPipeline2024/useIsPhone'
import { listCatalogEntries, type CatalogEntry, type CatalogKind } from '../shared/api/catalog'
import {
  createCharacter2024,
  listCreate2024Languages,
  validateCreate2024,
  type CharacterCreate2024ValidateResponse,
} from '../shared/api/characters'
import { getAccessToken } from '../shared/api/client'
import { catalogSourceLabelRu } from '../shared/dnd/catalogSourceLabelRu'
import { CHARACTER_GENDER_LABELS, CHARACTER_GENDERS } from '../shared/dnd/characterGender'
import { ABILITY_LABEL_RU, type AbilityKey } from '../shared/dnd/pointBuy'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import { Button, Dialog, Field, Input, Stack, Text, ToggleChip } from '../ui'

export type Create2024Harness = {
  catalog: Create2024CatalogBundle
  languages: LanguagesBundle
}

export type CreateCharacter2024PageProps = {
  /** DEV / e2e only: full catalog injected by the preview page (no API reads). */
  harness?: Create2024Harness | null
  rootTestId?: string
}

function findBySlug(list: readonly CatalogEntry[], slug: string | null): CatalogEntry | null {
  if (!slug) return null
  return list.find((e) => e.slug === slug) ?? null
}

function byNameRu(list: readonly CatalogEntry[]): CatalogEntry[] {
  return [...list].sort((a, b) => a.name_ru.localeCompare(b.name_ru, 'ru'))
}

function mergeItems(catalog: Create2024CatalogBundle): CatalogEntry[] {
  const seen = new Set<string>()
  const out: CatalogEntry[] = []
  for (const row of [...catalog.items, ...catalog.weapons]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out
}

async function loadLiveCatalog(
  signal: AbortSignal,
): Promise<{ catalog: Create2024CatalogBundle; languages: LanguagesBundle }> {
  const q = (kind: CatalogKind) => listCatalogEntries({ kind, edition: '2024' }, signal)
  const [classes, backgrounds, species, feats, weapons, armor, gear, spells, languages] =
    await Promise.all([
      q('class'),
      q('background'),
      q('race'),
      q('feat'),
      q('weapon'),
      q('armor'),
      q('item'),
      q('spell'),
      listCreate2024Languages(signal),
    ])
  return {
    catalog: {
      classes,
      backgrounds,
      species,
      feats,
      weapons,
      spells,
      items: [...armor, ...gear],
    },
    languages,
  }
}

function CreateShellMessage({
  rootTestId,
  title,
  children,
}: {
  rootTestId?: string
  title: string
  children?: ReactNode
}) {
  return (
    <main
      className="page page--app page--create-pipeline page--create-2024"
      data-testid={rootTestId}
    >
      <Stack gap={12}>
        <Text as="h1">{title}</Text>
        {children}
        <Link className="back-link" to="/characters">
          ← К списку персонажей
        </Link>
      </Stack>
    </main>
  )
}

export function CreateCharacter2024Page({ harness = null, rootTestId }: CreateCharacter2024PageProps) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const phone = useIsPhone()
  const previewQuery = params.get('preview') === '1'
  const blocked = !harness && !previewQuery && !RULES_EDITION_2024_OPEN

  const [state, setState] = useState<Create2024State>(() => createEmptyCreate2024State())
  const [catalog, setCatalog] = useState<Create2024CatalogBundle | null>(harness?.catalog ?? null)
  const [languages, setLanguages] = useState<LanguagesBundle | null>(harness?.languages ?? null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validated, setValidated] = useState<CharacterCreate2024ValidateResponse | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [spellTab, setSpellTab] = useState<'cantrips' | 'level1'>('cantrips')
  const [focusSpellSlug, setFocusSpellSlug] = useState<string | null>(null)
  const [harnessDone, setHarnessDone] = useState(false)

  useEffect(() => {
    if (harness || blocked) return
    const ac = new AbortController()
    setLoadError(null)
    void loadLiveCatalog(ac.signal)
      .then((loaded) => {
        setCatalog(loaded.catalog)
        setLanguages(loaded.languages)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : 'Не удалось загрузить каталог правил 2024.',
        )
      })
    return () => ac.abort()
  }, [harness, blocked, reloadKey])

  const items = useMemo(() => buildItemNameIndex(catalog ? mergeItems(catalog) : []), [catalog])
  const classNames = useMemo(
    () => new Map((catalog?.classes ?? []).map((c) => [c.slug, c.name_ru])),
    [catalog],
  )
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

  const issues = catalog
    ? create2024StepIssues(step, state, {
        classEntry,
        backgroundEntry,
        speciesEntry,
        languageChoiceCount: languages?.choice_count ?? 2,
        catalog,
        items,
      })
    : []
  const canNext = issues.length === 0

  const patch = useCallback((partial: Partial<Create2024State>) => {
    setState((prev) => ({ ...prev, ...partial }))
    setError(null)
    setValidated(null)
  }, [])

  function goToStep(nextStep: string) {
    if ((steps as readonly string[]).includes(nextStep)) {
      setSetupOpen(false)
      patch({ step: nextStep as Create2024StepId })
    }
  }

  const requestKey = useMemo(() => JSON.stringify(toCreate2024Request(state)), [state])
  const liveValidate = Boolean(getAccessToken()) && !harness

  useEffect(() => {
    if (step !== 'summary' || !liveValidate || !catalog) return
    const ac = new AbortController()
    const payload = JSON.parse(requestKey) as ReturnType<typeof toCreate2024Request>
    if (!state.characterName.trim()) return
    void validateCreate2024(payload, ac.signal)
      .then(setValidated)
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Не удалось проверить персонажа.')
      })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, requestKey, liveValidate, catalog])

  async function onFinish() {
    if (!canNext || !catalog) return
    setBusy(true)
    setError(null)
    try {
      if (!getAccessToken()) {
        if (harness) {
          setHarnessDone(true)
          return
        }
        setError('Войдите в аккаунт, чтобы создать персонажа.')
        return
      }
      const payload = toCreate2024Request(state, { isPreview: true, isDraft: false })
      const created = await createCharacter2024(payload)
      navigate(`/characters/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать персонажа')
    } finally {
      setBusy(false)
    }
  }

  if (blocked) {
    return (
      <CreateShellMessage rootTestId={rootTestId} title="Создание персонажа 2024 пока закрыто">
        <Text tone="muted">Новая редакция правил ещё не открыта для игроков.</Text>
      </CreateShellMessage>
    )
  }

  if (loadError) {
    return (
      <CreateShellMessage rootTestId={rootTestId} title="Каталог правил 2024 недоступен">
        <Text tone="danger" data-testid="p24-m03-load-error">
          {loadError}
        </Text>
        <div>
          <Button onClick={() => setReloadKey((k) => k + 1)}>Повторить</Button>
        </div>
      </CreateShellMessage>
    )
  }

  if (!catalog || !languages) {
    return (
      <main
        className="page page--app page--create-pipeline page--create-2024"
        data-testid={rootTestId}
      >
        <Text tone="muted">Загрузка каталога правил 2024…</Text>
      </main>
    )
  }

  const catalogData = catalog
  const bonuses = backgroundAsiOverlay(state)
  const next = nextCreate2024Step(step, steps)
  const prev = prevCreate2024Step(step, steps)

  const issueNode =
    issues.length > 0 ? (
      <div className="create-2024__issues" data-testid="p24-m03-issues" role="status">
        <Text tone="muted">Осталось выбрать:</Text>
        <ul className="create-2024__list">
          {issues.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    ) : null

  function phoneSetupBar(title: string, name: string) {
    return (
      <div className="create-2024__setup-bar" data-testid="p24-m03-setup-bar">
        <Text>
          <strong>{name}</strong>
        </Text>
        <Text tone="muted">
          {issues.length ? `Осталось выбрать: ${issues.length}` : 'Все выборы сделаны'}
        </Text>
        <Button
          variant="secondary"
          onClick={() => setSetupOpen(true)}
          data-testid="p24-m03-setup-open"
        >
          {title}
        </Button>
      </div>
    )
  }

  function catalogStep(options: {
    testId: string
    list: ReactNode
    entry: CatalogEntry | null
    kind: 'class' | 'background' | 'species'
    emptyTitle: string
    setupTitle: string
    picks: ReactNode
  }) {
    const { testId, list, entry, kind, emptyTitle, setupTitle, picks } = options
    const panel = (withPicks: boolean) => (
      <Create2024DetailPanel
        kind={kind}
        entry={entry}
        emptyTitle={emptyTitle}
        feats={catalogData.feats}
        items={items}
      >
        {withPicks && entry ? (
          <div className="create-2024__setup" data-testid={`${testId}-setup`}>
            <Text as="h3" className="create-pipeline__section-title">
              Ваш выбор
            </Text>
            {picks}
            {issueNode}
          </div>
        ) : null}
      </Create2024DetailPanel>
    )
    return {
      cards: (
        <div data-testid={testId}>
          <Stack gap={12}>
            {list}
            {phone && entry ? phoneSetupBar(setupTitle, entry.name_ru) : null}
          </Stack>
        </div>
      ),
      detail: panel(!phone),
      setupDialog: (
        <Dialog
          open={phone && setupOpen && Boolean(entry)}
          title={setupTitle}
          size="wide"
          primaryLabel="Готово"
          onPrimary={() => setSetupOpen(false)}
          onSecondary={() => setSetupOpen(false)}
          closeOnBackdrop
        >
          <div data-testid={`${testId}-setup`}>{panel(true)}</div>
        </Dialog>
      ),
    }
  }

  let cards: ReactNode = null
  let detail: ReactNode = null
  let footer: ReactNode = null
  let setupDialog: ReactNode = null
  let detailPrimary = false

  if (step === 'class') {
    const built = catalogStep({
      testId: 'p24-m03-step-class',
      kind: 'class',
      entry: classEntry,
      emptyTitle: 'Класс',
      setupTitle: 'Настроить класс',
      picks: classEntry ? (
        <ClassPicks
          state={state}
          patch={patch}
          catalog={catalogData}
          items={items}
          classEntry={classEntry}
        />
      ) : null,
      list: (
        <CatalogCardList
          resetToken={step}
          selectedId={classEntry?.id ?? null}
          cardTestIdPrefix="p24-m03-card"
          searchPlaceholder="Поиск класса…"
          items={byNameRu(catalogData.classes).map<CatalogCardItem>((e) => {
            const data = entryData(e)
            const primary = Array.isArray(data.primary_abilities)
              ? (data.primary_abilities as string[])
                  .map((a) => ABILITY_LABEL_RU[a as AbilityKey] ?? '')
                  .filter(Boolean)
                  .join(' / ')
              : ''
            return {
              id: e.id,
              title: e.name_ru,
              source: catalogSourceLabelRu(e.source),
              meta: [hitDieLabel(data.hit_die), primary].filter(Boolean).join(' · '),
            }
          })}
          onSelect={(id) => {
            const entry = catalogData.classes.find((e) => e.id === id)
            if (!entry) return
            const packs = classStartingPacks(entry)
            patch({
              classSlug: entry.slug,
              classSkillIds: [],
              weaponMasteryIds: [],
              fightingStyleSlug: null,
              classOptionPicks: {},
              classToolIds: [],
              classEquipment: packs[0]?.id || 'a',
              cantripIds: [],
              preparedSpellIds: [],
            })
            setSpellTab('cantrips')
            setSetupOpen(true)
          }}
        />
      ),
    })
    cards = built.cards
    detail = built.detail
    setupDialog = built.setupDialog
  }

  if (step === 'background') {
    const built = catalogStep({
      testId: 'p24-m03-step-background',
      kind: 'background',
      entry: backgroundEntry,
      emptyTitle: 'Предыстория',
      setupTitle: 'Настроить предысторию',
      picks: backgroundEntry ? (
        <BackgroundPicks
          state={state}
          patch={patch}
          catalog={catalogData}
          items={items}
          backgroundEntry={backgroundEntry}
        />
      ) : null,
      list: (
        <CatalogCardList
          resetToken={step}
          selectedId={backgroundEntry?.id ?? null}
          cardTestIdPrefix="p24-m03-card"
          searchPlaceholder="Поиск предыстории…"
          items={byNameRu(catalogData.backgrounds).map<CatalogCardItem>((e) => {
            const featName = originFeatNameOf(e)
            const trio = backgroundAsiTrio(e)
            return {
              id: e.id,
              title: e.name_ru,
              source: catalogSourceLabelRu(e.source),
              meta: [
                trio.length ? trio.map((k) => ABILITY_LABEL_RU[k]).join('/') : '',
                featName ? `черта: ${featName}` : '',
              ]
                .filter(Boolean)
                .join(' · '),
            }
          })}
          onSelect={(id) => {
            const entry = catalogData.backgrounds.find((e) => e.id === id)
            if (!entry) return
            const trio = backgroundAsiTrio(entry)
            const humanOptions = humanOriginFeatOptions(
              catalogData.feats,
              originFeatSlugOf(entry),
            )
            const keepHumanFeat = humanOptions.some((f) => f.slug === state.speciesFeatSlug)
            patch({
              backgroundSlug: entry.slug,
              backgroundAsiMode: '+2/+1',
              backgroundAsi:
                trio.length >= 2 ? setAsiPlus2Plus1(trio, trio[0]!, trio[1]!) : {},
              backgroundToolId: null,
              backgroundEquipment: 'pack',
              originFeatPicks: {},
              ...(keepHumanFeat ? {} : { speciesFeatSlug: null, speciesFeatPicks: {} }),
            })
            setSetupOpen(true)
          }}
        />
      ),
    })
    cards = built.cards
    detail = built.detail
    setupDialog = built.setupDialog
  }

  if (step === 'species') {
    const built = catalogStep({
      testId: 'p24-m03-step-species',
      kind: 'species',
      entry: speciesEntry,
      emptyTitle: 'Вид',
      setupTitle: 'Настроить вид',
      picks: speciesEntry ? (
        <SpeciesPicks
          state={state}
          patch={patch}
          catalog={catalogData}
          items={items}
          speciesEntry={speciesEntry}
        />
      ) : null,
      list: (
        <CatalogCardList
          resetToken={step}
          selectedId={speciesEntry?.id ?? null}
          cardTestIdPrefix="p24-m03-card"
          searchPlaceholder="Поиск вида…"
          items={byNameRu(creatableSpecies(catalogData.species)).map<CatalogCardItem>((e) => {
            const sizes = speciesSizeOptions(e).map(sizeLabelRu).join(' / ')
            const extra = speciesNeedsLineage(e)
              ? 'родословная'
              : speciesNeedsAncestry(e)
                ? 'наследие дракона'
                : ''
            return {
              id: e.id,
              title: e.name_ru,
              source: catalogSourceLabelRu(e.source),
              meta: [sizes, extra].filter(Boolean).join(' · '),
            }
          })}
          onSelect={(id) => {
            const entry = catalogData.species.find((e) => e.id === id)
            if (!entry) return
            const sizes = speciesSizeOptions(entry)
            patch({
              speciesSlug: entry.slug,
              speciesSize: sizes.length === 1 ? sizes[0]! : null,
              speciesLineageId: null,
              speciesAncestryId: null,
              speciesPicks: {},
              speciesFeatSlug: null,
              speciesFeatPicks: {},
            })
            setSetupOpen(true)
          }}
        />
      ),
    })
    cards = built.cards
    detail = built.detail
    setupDialog = built.setupDialog
  }

  if (step === 'abilities') {
    detailPrimary = true
    const trio = backgroundAsiTrio(backgroundEntry)
    cards = (
      <Stack gap={8}>
        <Text as="h3" className="create-pipeline__section-title">
          Бонусы предыстории
        </Text>
        <Text tone="muted">
          Бонусы даёт предыстория «{backgroundEntry?.name_ru ?? '—'}», вид характеристики не
          меняет. Потолок после бонусов — 20.
        </Text>
        <ul className="create-2024__list">
          {trio.map((k) => (
            <li key={k}>
              {ABILITY_LABEL_RU[k]}: {bonuses[k] ? `+${bonuses[k]}` : 'без бонуса'}
            </li>
          ))}
        </ul>
      </Stack>
    )
    detail = (
      <div data-testid="p24-m03-step-abilities">
        <Stack gap={12}>
          <AbilitiesStep
            method={state.abilityMethod}
            baseAbilities={state.baseAbilities}
            racialBonuses={bonuses}
            classSlug={state.classSlug}
            bonusLabel="предыстория"
            onMethodChange={(abilityMethod) => patch({ abilityMethod })}
            onBaseChange={(baseAbilities) => patch({ baseAbilities })}
          />
          {issueNode}
        </Stack>
      </div>
    )
  }

  if (step === 'languages') {
    const need = languages.choice_count
    const langItems: CatalogCardItem[] = languages.languages.map((l) => ({
      id: l.id,
      title: l.name_ru,
      subtitle: languageKindLabelRu(l.kind),
    }))
    const chosen = languages.languages.filter((l) => state.languageIds.includes(l.id))
    cards = (
      <div data-testid="p24-m03-step-languages">
        <CatalogCardList
          resetToken={step}
          selectedId={null}
          selectedIds={state.languageIds}
          cardTestIdPrefix="p24-m03-card"
          searchPlaceholder="Поиск языка…"
          items={langItems}
          headerSlot={
            <Stack gap={4}>
              <Text>
                <strong>{COMMON_LANGUAGE_NAME_RU}</strong> — уже известен
              </Text>
              <Text tone="muted">
                Выбрано {state.languageIds.length} из {need}
              </Text>
            </Stack>
          }
          onSelect={(id) => patch({ languageIds: toggleUniquePick(state.languageIds, id, need) })}
        />
      </div>
    )
    detail = (
      <Stack gap={12}>
        <Text as="h2">Языки персонажа</Text>
        <Text tone="muted">
          Вид и предыстория языков не дают. Вы знаете Общий и ещё {need} на выбор.
        </Text>
        <ul className="create-2024__list">
          <li>{COMMON_LANGUAGE_NAME_RU}</li>
          {chosen.map((l) => (
            <li key={l.id}>
              {l.name_ru} · {languageKindLabelRu(l.kind)}
            </li>
          ))}
        </ul>
        {issueNode}
      </Stack>
    )
  }

  if (step === 'equipment') {
    const packs = classStartingPacks(classEntry)
    const bgGear = entryData(backgroundEntry).equipment_or_gold as
      | { pack_summary_ru?: string; gold_alternative_gp?: number }
      | undefined
    const bgGold = bgGear?.gold_alternative_gp ?? 50
    const selectedPack = packs.find((p) => p.id === state.classEquipment) ?? null
    cards = (
      <div data-testid="p24-m03-step-equipment">
        <Stack gap={14}>
          <CatalogCardList
            resetToken={step}
            enableFilters={false}
            selectedId={state.classEquipment}
            cardTestIdPrefix="p24-m03-card-pack"
            headerSlot={
              <Text as="h3" className="create-pipeline__section-title">
                Снаряжение класса
              </Text>
            }
            items={packs.map<CatalogCardItem>((p) => ({
              id: p.id,
              title: p.labelRu,
              subtitle: p.isGold ? undefined : p.summaryRu,
            }))}
            onSelect={(id) => patch({ classEquipment: id })}
          />
          <CatalogCardList
            resetToken={step}
            enableFilters={false}
            selectedId={state.backgroundEquipment}
            cardTestIdPrefix="p24-m03-card-bg"
            headerSlot={
              <Text as="h3" className="create-pipeline__section-title">
                Снаряжение предыстории
              </Text>
            }
            items={[
              {
                id: 'pack',
                title: 'Набор предыстории',
                subtitle: bgGear?.pack_summary_ru ? ruDice(bgGear.pack_summary_ru) : undefined,
              },
              { id: 'gold', title: `Золото (${bgGold} зм)` },
            ]}
            onSelect={(id) =>
              patch({ backgroundEquipment: id === 'gold' ? 'gold' : 'pack' })
            }
          />
        </Stack>
      </div>
    )
    detail = (
      <Stack gap={14}>
        <Text as="h2">Стартовое снаряжение</Text>
        {selectedPack ? (
          <div className="create-pipeline__detail-section">
            <Text className="create-pipeline__detail-section-title">
              {classEntry?.name_ru}: {selectedPack.labelRu}
            </Text>
            {selectedPack.isGold ? (
              <Text>Вместо предметов вы получаете {selectedPack.coinsGp} зм.</Text>
            ) : (
              <ul className="create-pipeline__detail-list" data-testid="p24-m03-equipment-items">
                {selectedPack.items.map((it, index) => (
                  <li key={`${it.id ?? it.nameRu ?? 'item'}-${index}`}>
                    {it.id
                      ? itemNameRu(it.id, items)
                      : (it.nameRu ?? 'Предмет на выбор')}
                    {it.qty > 1 ? ` ×${it.qty}` : ''}
                  </li>
                ))}
                {selectedPack.coinsGp > 0 ? <li>Монеты: {selectedPack.coinsGp} зм</li> : null}
              </ul>
            )}
          </div>
        ) : null}
        <div className="create-pipeline__detail-section">
          <Text className="create-pipeline__detail-section-title">
            {backgroundEntry?.name_ru}:{' '}
            {state.backgroundEquipment === 'gold' ? `золото (${bgGold} зм)` : 'набор предыстории'}
          </Text>
          {state.backgroundEquipment === 'gold' ? (
            <Text>Вместо набора вы получаете {bgGold} зм.</Text>
          ) : (
            <Text>{bgGear?.pack_summary_ru ? ruDice(bgGear.pack_summary_ru) : 'Стартовый набор'}</Text>
          )}
        </div>
        {issueNode}
      </Stack>
    )
  }

  if (step === 'spells') {
    const sc = classL1Spellcasting(classEntry)
    const classSlug = state.classSlug || ''
    const cantrips = spellsByLevelForClass(catalogData.spells, 0, [classSlug])
    const level1 = spellsByLevelForClass(catalogData.spells, 1, [classSlug])
    const tab: 'cantrips' | 'level1' =
      spellTab === 'cantrips' && (sc?.cantrips ?? 0) === 0 ? 'level1' : spellTab
    const list = tab === 'cantrips' ? cantrips : level1
    const selected = tab === 'cantrips' ? state.cantripIds : state.preparedSpellIds
    const max = tab === 'cantrips' ? (sc?.cantrips ?? 0) : (sc?.prepared_spells ?? 0)
    const focus =
      catalogData.spells.find((s) => s.slug === focusSpellSlug) ??
      list.find((s) => s.slug === selected[selected.length - 1]) ??
      null
    cards = (
      <div data-testid="p24-m03-step-spells">
        <CatalogCardList
          resetToken={`${step}-${tab}`}
          selectedId={null}
          selectedIds={selected}
          cardTestIdPrefix="p24-m03-card"
          searchPlaceholder="Поиск заклинания…"
          items={list.map<CatalogCardItem>((s) => ({
            id: s.slug,
            title: s.name_ru,
            source: catalogSourceLabelRu(s.source),
            meta: `${spellSchoolLabelRu(s)} · ${castingTimeLabelRu(s)}`,
          }))}
          headerSlot={
            <Stack gap={8}>
              <div className="create-2024__tabs" role="tablist" aria-label="Тип заклинаний">
                {(sc?.cantrips ?? 0) > 0 ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'cantrips'}
                    className={`create-pipeline__chip${tab === 'cantrips' ? ' create-pipeline__chip--active' : ''}`}
                    onClick={() => setSpellTab('cantrips')}
                    data-testid="p24-m03-spell-tab-cantrips"
                  >
                    Заговоры {state.cantripIds.length}/{sc?.cantrips ?? 0}
                  </button>
                ) : null}
                {(sc?.prepared_spells ?? 0) > 0 ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'level1'}
                    className={`create-pipeline__chip${tab === 'level1' ? ' create-pipeline__chip--active' : ''}`}
                    onClick={() => setSpellTab('level1')}
                    data-testid="p24-m03-spell-tab-level1"
                  >
                    1 круг {state.preparedSpellIds.length}/{sc?.prepared_spells ?? 0}
                  </button>
                ) : null}
              </div>
              <Text tone="muted">
                Выбрано {selected.length} из {max}
              </Text>
            </Stack>
          }
          onSelect={(slug) => {
            setFocusSpellSlug(slug)
            const nextList = toggleUniquePick(selected, slug, max)
            if (tab === 'cantrips') patch({ cantripIds: nextList })
            else patch({ preparedSpellIds: nextList })
          }}
        />
      </div>
    )
    detail = (
      <Create2024DetailPanel
        kind="spell"
        entry={focus}
        emptyTitle="Заклинания"
        emptyHint="Нажмите на заклинание в списке, чтобы выбрать его и прочитать описание."
        classNames={classNames}
      >
        {issueNode}
      </Create2024DetailPanel>
    )
  }

  if (step === 'summary') {
    detailPrimary = true
    const model =
      classEntry && backgroundEntry && speciesEntry
        ? overlayServerCombat(
            buildCreate2024SheetPreview({
              state: {
                ...state,
                characterName: state.characterName.trim() || 'Без имени',
              },
              catalog: catalogData,
              languages,
              classEntry,
              backgroundEntry,
              speciesEntry,
              items,
            }),
            validated?.sheet,
          )
        : null
    const humanFeat = findFeat(catalogData.feats, state.speciesFeatSlug)
    const choices: Array<[string, string]> = [
      ['Класс', classEntry?.name_ru ?? '—'],
      ['Предыстория', backgroundEntry?.name_ru ?? '—'],
      ['Вид', speciesEntry?.name_ru ?? '—'],
      [
        'Увеличение характеристик',
        Object.entries(state.backgroundAsi)
          .map(([k, v]) => `${ABILITY_LABEL_RU[k as AbilityKey]} +${v}`)
          .join(', ') || '—',
      ],
    ]
    if (humanFeat) choices.push(['Гибкий', humanFeat.name_ru])
    const lineage = speciesLineages(speciesEntry).find((l) => l.id === state.speciesLineageId)
    if (lineage) choices.push(['Родословная', lineage.name_ru])

    cards = (
      <Stack gap={8}>
        <Text as="h3" className="create-pipeline__section-title">
          Ваш выбор
        </Text>
        <ul className="create-2024__list">
          {choices.map(([label, value]) => (
            <li key={label}>
              <strong>{label}:</strong> {value}
            </li>
          ))}
        </ul>
      </Stack>
    )
    detail = (
      <div data-testid="p24-m03-step-summary">
        <Stack gap={16}>
          <Stack gap={10} className="create-2024__identity">
            <Field label="Имя персонажа">
              <Input
                value={state.characterName}
                onChange={(e) => patch({ characterName: e.target.value })}
                placeholder="Как зовут героя?"
                data-testid="p24-m03-name"
              />
            </Field>
            <div className="create-2024__gender" role="group" aria-label="Пол персонажа">
              {CHARACTER_GENDERS.map((g) => (
                <ToggleChip
                  key={g}
                  main={CHARACTER_GENDER_LABELS[g]}
                  checked={state.gender === g}
                  onChange={() => patch({ gender: state.gender === g ? null : g })}
                  data-testid={`p24-m03-gender-${g}`}
                />
              ))}
            </div>
          </Stack>
          {model ? <Create2024SheetPreview model={model} /> : null}
          {validated?.warnings?.length ? (
            <ul className="create-2024__list">
              {validated.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {issueNode}
          {harnessDone ? (
            <Text tone="muted" data-testid="p24-m03-harness-done">
              Тестовый стенд: запись персонажа отключена.
            </Text>
          ) : null}
        </Stack>
      </div>
    )
    footer = (
      <Button disabled={busy || !canNext} onClick={() => void onFinish()} data-testid="p24-m03-finish">
        {busy ? 'Создаём…' : 'Готово'}
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
    <main
      className="page page--app page--create-pipeline page--create-2024"
      data-testid={rootTestId}
    >
      <div className="create-pipeline__topbar">
        <Link className="back-link" to="/characters">
          ← К списку
        </Link>
      </div>
      {error ? (
        <Text tone="danger" data-testid="p24-m03-error">
          {error}
        </Text>
      ) : null}
      <CreatePipelineShell
        step={step}
        steps={steps}
        stepLabels={CREATE_2024_STEP_LABELS}
        title="Новый персонаж · правила 2024"
        subtitle="Класс, предыстория, вид, характеристики, языки, снаряжение, заклинания, итог"
        cards={cards}
        detail={detail}
        footer={footer}
        detailPrimary={detailPrimary}
        onStepClick={goToStep}
        onBack={prev ? () => goToStep(prev) : () => navigate('/characters')}
      />
      {setupDialog}
    </main>
  )
}
