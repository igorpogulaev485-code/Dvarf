import { useEffect, useMemo, useState } from 'react'
import { displayDiceNotation } from '../../shared/dnd/diceNotation'
import { listCatalogEntries } from '../../shared/api/catalog'
import { getFeaturePick, setFeaturePick, type FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  ELEMENTAL_FURY_PRIMAL_STRIKE,
  isBeastFormAllowed2024,
  isCountedKnownForm2024,
  primalStrikeAttackRiderRu2024,
  readElementalFury2024,
  WILD_SHAPE_EQUIPMENT_2024,
  WILD_SHAPE_TEMP_HP_PICK_ID_2024,
  wildShapeArmorClass2024,
  type WildShapeEquipment2024,
} from '../../shared/dnd/druid2024Features'
import { SYMBIOTIC_ACTIVE_PREFIX } from './featureCombatBonuses'
import { catalogEntryToBeastPick, KnownFormsPicker } from './KnownFormsPicker'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'
import type { CompanionEntry } from './companions'
import type { KnownForm } from './knownForms'
import {
  applyFindFamiliarCompanion,
  mergeFamiliarCatalogWithFallbacks,
} from './familiarForms'
import {
  applyBeastWildShape,
  applyStarryForm,
  applyWildfireSpirit,
  beastPickAllowed,
  ELEMENTAL_FALLBACK_STATS,
  elementalKeyToSlug,
  formatWildShapeLimit,
  parseCr,
  resolveWildShapeOptions,
  spendWildShapeUses,
  symbioticTempHp,
  wildShapeLimits,
  type BestiaryFormPick,
  type WildShapeOptionId,
} from './wildShape'

export type WildShapeDialogResult = {
  resources: SheetResource[]
  companions: CompanionEntry[]
  knownForms: KnownForm[]
  hpTemp?: number | null
  /** B-04: apply symbiotic_entity ActiveEffect (temp HP via Р4 dialog + 1d6 necrotic). */
  symbioticEffect?: boolean
  symbioticDruidLevel?: number
  /** B-04: constellation buff for Starry Form. */
  starryConstellation?: 'archer' | 'chalice' | 'dragon'
  starryDruidLevel?: number
  featurePicks?: FeaturePicksState
  toast: string
}

type WildShapeDialogProps = {
  open: boolean
  onClose: () => void
  features: UnlockedFeature[]
  resources: SheetResource[]
  companions: CompanionEntry[]
  knownForms: KnownForm[]
  classSlug: string
  classEntryId: string
  druidLevel: number
  subclassSlug: string | null | undefined
  hostHp: number
  hostHpMax: number
  edition: '2014' | '2024'
  /** 2024: Wisdom modifier (Circle of the Moon AC = max(beast AC, 13 + Wis)). */
  wisMod?: number
  featurePicks?: FeaturePicksState
  /** 2024: learn known forms from the dialog (existing sheets that never picked them). */
  onKnownFormsChange?: (forms: KnownForm[]) => void
  onConfirm: (result: WildShapeDialogResult) => void
}

function knownToPick(form: KnownForm): BestiaryFormPick | null {
  if (!form.stats_override) return null
  return {
    slug: form.bestiary_slug || form.id,
    name_ru: form.name_ru,
    catalog_id: form.bestiary_ref,
    cr: form.cr,
    type: form.tags.includes('elemental') ? 'elemental' : 'beast',
    ac: form.stats_override.ac,
    hp: form.stats_override.hp,
    speed_walk: form.stats_override.speed,
    speed_swim: form.tags.includes('swim') ? 1 : undefined,
    speed_fly: form.tags.includes('fly') ? 1 : undefined,
    actions_text: form.stats_override.actions,
  }
}

export function WildShapeDialog({
  open,
  onClose,
  features,
  resources,
  companions,
  knownForms,
  classSlug,
  classEntryId,
  druidLevel,
  subclassSlug,
  hostHp,
  hostHpMax,
  edition,
  wisMod = 0,
  featurePicks,
  onKnownFormsChange,
  onConfirm,
}: WildShapeDialogProps) {
  const is2024 = edition === '2024'
  const [step, setStep] = useState<
    'fork' | 'beast' | 'familiar' | 'starry' | 'elemental' | 'learn' | 'equipment'
  >('fork')
  const [pendingBeast, setPendingBeast] = useState<BestiaryFormPick | null>(null)
  const [query, setQuery] = useState('')
  const [catalogPicks, setCatalogPicks] = useState<BestiaryFormPick[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [constellation, setConstellation] = useState<
    'archer' | 'chalice' | 'dragon'
  >('archer')
  const [elementalKey, setElementalKey] = useState<
    'air' | 'earth' | 'fire' | 'water'
  >('air')

  const limits = useMemo(
    () => wildShapeLimits({ druidLevel, subclassSlug, rulesEdition: edition }),
    [druidLevel, subclassSlug, edition],
  )

  const budget2024 = limits.knownForms ?? 0
  const knownBeasts2024 = useMemo(
    () => knownForms.filter(isCountedKnownForm2024),
    [knownForms],
  )

  const formAllowed = useMemo(
    () => (pick: BestiaryFormPick): boolean => {
      if (!is2024) return beastPickAllowed(pick, limits)
      if (pick.type !== 'beast') return false
      return isBeastFormAllowed2024(
        {
          cr: parseCr(pick.cr) ?? Number.POSITIVE_INFINITY,
          fly: (pick.speed_fly ?? 0) > 0,
        },
        druidLevel,
        subclassSlug,
      )
    },
    [is2024, limits, druidLevel, subclassSlug],
  )

  const options = useMemo(
    () =>
      resolveWildShapeOptions({
        features,
        resources,
        classSlug,
        classEntryId,
      }).filter((row) => !(is2024 && row.id === 'wild_companion')),
    [features, resources, classSlug, classEntryId, is2024],
  )

  const elementalPreview = useMemo(() => {
    const meta = elementalKeyToSlug(elementalKey)
    if (!meta) return null
    const fromCatalog = catalogPicks.find((p) => p.slug === meta.slug)
    const fallback = ELEMENTAL_FALLBACK_STATS[elementalKey]
    return fromCatalog ?? (fallback ? { ...fallback, ...meta } : null)
  }, [catalogPicks, elementalKey])

  useEffect(() => {
    if (!open) {
      setStep('fork')
      setQuery('')
      setPendingBeast(null)
      return
    }
    const saved = featurePicks
      ? getFeaturePick(featurePicks, classEntryId, 'starry_form')
      : null
    if (saved === 'archer' || saved === 'chalice' || saved === 'dragon') {
      setConstellation(saved)
    }
  }, [open, featurePicks, classEntryId])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setCatalogError(null)
    void listCatalogEntries({ kind: 'bestiary', edition })
      .then((entries) => {
        if (cancelled) return
        const picks = entries
          .map(catalogEntryToBeastPick)
          .filter((p): p is BestiaryFormPick => Boolean(p))
        setCatalogPicks(picks)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setCatalogError(err instanceof Error ? err.message : 'Каталог недоступен')
        setCatalogPicks([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, edition])

  const knownPicks = useMemo(
    () =>
      knownForms
        .map(knownToPick)
        .filter((p): p is BestiaryFormPick => Boolean(p))
        .filter(formAllowed),
    [knownForms, formAllowed],
  )

  const filteredBeasts = useMemo(() => {
    const q = query.trim().toLowerCase()
    const beasts = catalogPicks.filter(formAllowed)
    if (!q) return beasts
    return beasts.filter(
      (p) =>
        p.name_ru.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    )
  }, [catalogPicks, formAllowed, query])

  function spendAnd(
    label: string,
    amount: number,
    build: () => Omit<WildShapeDialogResult, 'resources' | 'toast'> & {
      toast?: string
      resources?: SheetResource[] | ((spent: SheetResource[]) => SheetResource[])
    },
  ) {
    const spent = spendWildShapeUses({
      resources,
      classSlug,
      classEntryId,
      amount,
      label,
    })
    if (!spent.ok) {
      onConfirm({
        resources,
        companions,
        knownForms,
        toast: spent.message,
      })
      return
    }
    const built = build()
    onConfirm({
      resources:
        typeof built.resources === 'function'
          ? built.resources(spent.resources)
          : (built.resources ?? spent.resources),
      companions: built.companions,
      knownForms: built.knownForms,
      hpTemp: built.hpTemp,
      featurePicks: built.featurePicks,
      toast: built.toast || spent.message,
    })
    onClose()
  }

  function chooseOption(id: WildShapeOptionId) {
    const opt = options.find((o) => o.id === id)
    if (!opt || opt.disabled) return
    if (id === 'beast_form') {
      setStep('beast')
      return
    }
    if (id === 'starry_form') {
      setStep('starry')
      return
    }
    if (id === 'elemental_wild_shape') {
      setStep('elemental')
      return
    }
    if (id === 'wild_companion') {
      setStep('familiar')
      return
    }
    if (id === 'symbiotic_entity') {
      const temp = symbioticTempHp(druidLevel)
      spendAnd('Симбиотическая сущность', 1, () => ({
        companions,
        knownForms,
        symbioticEffect: true,
        symbioticDruidLevel: druidLevel,
        toast: `Симбиотическая сущность: ${temp} вр. хитов · +1к6 некротического на рукопашные, Ореол спор удвоен, 10 мин.`,
        resources: (spentRows) =>
          spentRows.map((row) =>
            row.id.includes(':symbiotic_entity:')
              ? {
                  ...row,
                  activeLabel: `${SYMBIOTIC_ACTIVE_PREFIX} · 10 мин · +1к6 некрот. на рукопашные, Ореол спор удвоен`,
                }
              : row,
          ),
      }))
      return
    }
    if (id === 'wildfire_spirit') {
      spendAnd('Дух дикого огня', 1, () => {
        const fromCatalog = catalogPicks.find((p) => p.slug === 'wildfire_spirit')
        return {
          companions: applyWildfireSpirit({
            companions,
            druidLevel,
            pick: fromCatalog ?? null,
          }),
          knownForms,
          toast: 'Дух дикого огня призван',
        }
      })
    }
  }

  function confirmBeast2024(pick: BestiaryFormPick, equipment: WildShapeEquipment2024) {
    const base = knownForms
    const tempHp = limits.tempHp ?? 0
    const equipNote =
      WILD_SHAPE_EQUIPMENT_2024.find((row) => row.id === equipment)?.noteRu ?? ''
    const picks = featurePicks
      ? setFeaturePick(
          featurePicks,
          classEntryId,
          WILD_SHAPE_TEMP_HP_PICK_ID_2024,
          tempHp > 0 ? String(tempHp) : null,
        )
      : undefined
    spendAnd('Дикий облик', 1, () => {
      const next = applyBeastWildShape({
        companions,
        knownForms: base,
        pick,
        hostHp,
        hostHpMax,
        druidLevel,
        keepOwnHp: true,
        armorClass: wildShapeArmorClass2024(pick.ac, wisMod, subclassSlug),
        equipmentNoteRu: equipNote,
        attackRiderRu:
          featurePicks &&
          readElementalFury2024(featurePicks, classEntryId) === ELEMENTAL_FURY_PRIMAL_STRIKE
            ? primalStrikeAttackRiderRu2024(druidLevel)
            : undefined,
      })
      return {
        ...next,
        hpTemp: tempHp,
        featurePicks: picks,
        toast: `Дикий облик: ${pick.name_ru} · вр. хиты ${tempHp} · свои хиты сохранены`,
      }
    })
  }

  function confirmBeast(pick: BestiaryFormPick) {
    if (is2024) {
      setPendingBeast(pick)
      setStep('equipment')
      return
    }
    spendAnd('Дикий облик', 1, () => {
      const next = applyBeastWildShape({
        companions,
        knownForms,
        pick,
        hostHp,
        hostHpMax,
        druidLevel,
      })
      return { ...next, toast: `Дикий облик: ${pick.name_ru}` }
    })
  }

  function confirmFamiliar(pick: BestiaryFormPick) {
    spendAnd('Дикий спутник', 1, () => {
      const applied = applyFindFamiliarCompanion({
        companions,
        pick,
        mode: 'wild_companion',
        druidLevel,
        characterLevel: druidLevel,
      })
      return {
        companions: applied.companions,
        knownForms,
        toast: `Дикий спутник: ${pick.name_ru} (фея)`,
      }
    })
  }

  const familiarOptions = useMemo(() => {
    const merged = mergeFamiliarCatalogWithFallbacks(catalogPicks, 'wild_companion')
    const q = query.trim().toLowerCase()
    if (!q) return merged
    return merged.filter(
      (p) =>
        p.name_ru.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    )
  }, [catalogPicks, query])

  function confirmStarry() {
    const picks = featurePicks
      ? setFeaturePick(featurePicks, classEntryId, 'starry_form', constellation)
      : undefined
    spendAnd('Звёздная форма', 1, () => ({
      companions: applyStarryForm({
        companions,
        constellation,
        hostHp,
        hostHpMax,
        druidLevel,
      }),
      knownForms,
      featurePicks: picks,
      starryConstellation: constellation,
      starryDruidLevel: druidLevel,
      toast: `Звёздная форма: ${constellation === 'archer' ? 'Лучник' : constellation === 'chalice' ? 'Чаша' : 'Дракон'}`,
    }))
  }

  function confirmElemental() {
    const meta = elementalKeyToSlug(elementalKey)
    if (!meta) return
    const fromCatalog = catalogPicks.find((p) => p.slug === meta.slug)
    const fallback = ELEMENTAL_FALLBACK_STATS[elementalKey]
    const pick: BestiaryFormPick = fromCatalog
      ? { ...fromCatalog, type: 'elemental', name_ru: meta.name_ru, slug: meta.slug }
      : {
          slug: meta.slug,
          name_ru: meta.name_ru,
          ...(fallback ?? {
            cr: '5',
            type: 'elemental',
            ac: 15,
            hp: 90,
            speed_walk: 30,
            actions_text: 'Статы элементаля — из бестиария MM.',
          }),
        }
    spendAnd('Элементальный дикий облик', 2, () => {
      const next = applyBeastWildShape({
        companions,
        knownForms,
        pick,
        hostHp,
        hostHpMax,
        druidLevel,
        formSource: 'elemental_wild_shape',
        formSourceRef: `elemental_wild_shape:${elementalKey}`,
        extraTags: ['elemental'],
      })
      return { ...next, toast: `Элементальный облик: ${meta.name_ru}` }
    })
  }

  const title =
    step === 'fork'
      ? 'Дикий облик — на что потратить?'
      : step === 'beast'
        ? 'Выбери звериный облик'
        : step === 'familiar'
          ? 'Дикий спутник — выбери форму'
          : step === 'starry'
            ? 'Звёздная форма'
            : step === 'learn'
              ? 'Известные облики'
              : step === 'equipment'
                ? 'Снаряжение в облике'
                : 'Элементальный облик'

  return (
    <Dialog
      open={open}
      title={title}
      size="wide"
      secondaryLabel={step === 'fork' ? 'Отмена' : 'Назад'}
      onSecondary={() => {
        if (step === 'fork') onClose()
        else if (step === 'equipment' || step === 'learn') setStep('beast')
        else setStep('fork')
      }}
      primaryLabel={
        step === 'starry'
          ? 'Принять (−1)'
          : step === 'elemental'
            ? 'Принять (−2)'
            : 'Закрыть'
      }
      primaryDisabled={
        step === 'beast' || step === 'familiar' || step === 'equipment'
      }
      onPrimary={() => {
        if (step === 'starry') confirmStarry()
        else if (step === 'elemental') confirmElemental()
        else onClose()
      }}
    >
      <Stack gap={12}>
        {step === 'fork' ? (
          <>
            <Text tone="muted">
              Лимит облика: {formatWildShapeLimit(limits)}
              {limits.combatBonusAction ? ' · бонусным действием' : ''}
            </Text>
            {is2024 ? (
              <Text tone="muted">
                Известных обликов: {knownBeasts2024.length}/{budget2024} · временные хиты{' '}
                {limits.tempHp ?? 0} · свои хиты сохраняются
              </Text>
            ) : null}
            <Stack gap={8}>
              {options.map((opt) => (
                <Button
                  key={opt.id}
                  type="button"
                  variant={opt.id === 'beast_form' ? 'primary' : 'secondary'}
                  disabled={opt.disabled}
                  onClick={() => chooseOption(opt.id)}
                >
                  {opt.labelRu}
                  {opt.id === 'beast_form' && limits.combatBonusAction
                    ? ' (бонусным)'
                    : ''}
                  {opt.cost > 1 ? ` (−${opt.cost})` : ''}
                  {' — '}
                  {displayDiceNotation((opt.disabled ? opt.disabledReason : opt.summaryRu) ?? '')}
                </Button>
              ))}
            </Stack>
            <Text tone="muted">
              {is2024
                ? 'Дикий спутник — отдельная кнопка на карточке умения (облик или ячейка).'
                : 'Альтернативы кругов видны, если архетип разблокировал умение. Дикий спутник (TCE) — на этой же развилке.'}
            </Text>
          </>
        ) : null}

        {step === 'familiar' ? (
          <>
            <Text tone="muted">
              Как «Поиск фамильяра», но тип — фея. −1 Дикий облик · длительность{' '}
              {Math.max(1, Math.floor(druidLevel / 2))} ч. Особые формы Цепи недоступны.
            </Text>
            <Field label="Поиск">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="сова, кошка, ворон…"
              />
            </Field>
            {loading ? <Text tone="muted">Загрузка бестиария…</Text> : null}
            {familiarOptions.map((p) => (
              <Button
                key={`fam-${p.slug}`}
                type="button"
                variant="secondary"
                onClick={() => confirmFamiliar(p)}
              >
                {p.name_ru} · CR {p.cr} · КД {p.ac} · хиты {p.hp}
                {p.speed_fly ? ` · полёт ${p.speed_fly}` : ''}
              </Button>
            ))}
            {!loading && familiarOptions.length === 0 ? (
              <Text tone="muted">Нет форм — закрой и попробуй позже.</Text>
            ) : null}
          </>
        ) : null}

        {step === 'beast' ? (
          is2024 ? (
            <>
              <Text tone="muted">
                Известные облики: {knownBeasts2024.length}/{budget2024}. Войти в Дикий облик можно
                только в известную форму. Хиты зверя не используются.
              </Text>
              {knownPicks.length === 0 ? (
                <Text tone="muted">
                  {knownBeasts2024.length === 0
                    ? 'Известных обликов пока нет — выбери их кнопкой ниже.'
                    : 'Ни одна известная форма не проходит лимит твоего уровня.'}
                </Text>
              ) : (
                <Stack gap={6}>
                  {knownPicks.map((p) => (
                    <Button
                      key={`known-${p.slug}`}
                      type="button"
                      variant="secondary"
                      onClick={() => confirmBeast(p)}
                    >
                      {p.name_ru} · CR {p.cr} · КД {p.ac}
                      {(p.speed_fly ?? 0) > 0 ? ' · полёт' : ''}
                      {(p.speed_swim ?? 0) > 0 ? ' · плав.' : ''}
                    </Button>
                  ))}
                </Stack>
              )}
              {onKnownFormsChange && knownBeasts2024.length < budget2024 ? (
                <Button type="button" variant="secondary" onClick={() => setStep('learn')}>
                  Выбрать известные облики ({knownBeasts2024.length}/{budget2024})
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Field label="Поиск">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="волк, медведь…"
                />
              </Field>
              {loading ? <Text tone="muted">Загрузка бестиария…</Text> : null}
              {catalogError ? <Text tone="danger">{catalogError}</Text> : null}
              {!loading && filteredBeasts.length === 0 && knownPicks.length === 0 ? (
                <Text tone="muted">
                  Бестиарий пуст или нет зверей в лимите. После «Залей» B1 (MM) список появится.
                </Text>
              ) : null}
              {knownPicks.length > 0 ? (
                <Stack gap={6}>
                  <Text>Известные</Text>
                  {knownPicks.map((p) => (
                    <Button
                      key={`known-${p.slug}`}
                      type="button"
                      variant="secondary"
                      onClick={() => confirmBeast(p)}
                    >
                      {p.name_ru} · CR {p.cr} · КД {p.ac} · хиты {p.hp}
                    </Button>
                  ))}
                </Stack>
              ) : null}
              {filteredBeasts.length > 0 ? (
                <Stack gap={6}>
                  <Text>Бестиарий ({filteredBeasts.length})</Text>
                  {filteredBeasts.slice(0, 50).map((p) => (
                    <Button
                      key={p.slug}
                      type="button"
                      variant="secondary"
                      onClick={() => confirmBeast(p)}
                    >
                      {p.name_ru} · CR {p.cr} · КД {p.ac} · хиты {p.hp}
                      {(p.speed_fly ?? 0) > 0 ? ' · полёт' : ''}
                      {(p.speed_swim ?? 0) > 0 ? ' · плав.' : ''}
                    </Button>
                  ))}
                </Stack>
              ) : null}
            </>
          )
        ) : null}

        {step === 'learn' && onKnownFormsChange ? (
          <KnownFormsPicker
            druidLevel={druidLevel}
            subclassSlug={subclassSlug}
            budget={budget2024}
            forms={knownForms}
            lockedIds={knownForms.map((row) => row.id)}
            onChange={onKnownFormsChange}
          />
        ) : null}

        {step === 'equipment' && pendingBeast ? (
          <>
            <Text tone="muted">
              {pendingBeast.name_ru}: что происходит со снаряжением? Временные хиты{' '}
              {limits.tempHp ?? 0}; хиты персонажа не меняются.
            </Text>
            {WILD_SHAPE_EQUIPMENT_2024.map((row) => (
              <Button
                key={row.id}
                type="button"
                variant={row.id === 'wear' ? 'primary' : 'secondary'}
                onClick={() => confirmBeast2024(pendingBeast, row.id)}
              >
                {row.nameRu}
              </Button>
            ))}
          </>
        ) : null}

        {step === 'starry' ? (
          <>
            <Text tone="muted">
              10 минут. Хиты остаются хитами персонажа (отдельного пула нет).
            </Text>
            {(
              [
                ['archer', 'Лучник'],
                ['chalice', 'Чаша'],
                ['dragon', 'Дракон'],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant={constellation === id ? 'primary' : 'secondary'}
                onClick={() => setConstellation(id)}
              >
                {label}
              </Button>
            ))}
          </>
        ) : null}

        {step === 'elemental' ? (
          <>
            <Text tone="muted">
              Стоимость: оба использования Дикого облика (−2). Moon 10+.
            </Text>
            {(
              [
                ['air', 'Воздух'],
                ['earth', 'Земля'],
                ['fire', 'Огонь'],
                ['water', 'Вода'],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant={elementalKey === id ? 'primary' : 'secondary'}
                onClick={() => setElementalKey(id)}
              >
                {label}
              </Button>
            ))}
            {elementalPreview ? (
              <Text tone="muted">
                {elementalPreview.name_ru ?? elementalKeyToSlug(elementalKey)?.name_ru}: КД{' '}
                {elementalPreview.ac} · хиты {elementalPreview.hp} · CR{' '}
                {elementalPreview.cr}
                {(elementalPreview.speed_fly ?? 0) > 0 ? ' · полёт' : ''}
                {(elementalPreview.speed_swim ?? 0) > 0 ? ' · плав.' : ''}
              </Text>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Dialog>
  )
}
