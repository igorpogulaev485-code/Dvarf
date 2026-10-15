import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'
import type { CompanionEntry } from './companions'
import type { KnownForm } from './knownForms'
import {
  applyBeastWildShape,
  applyStarryForm,
  applyWildCompanion,
  applyWildfireSpirit,
  beastPickAllowed,
  ELEMENTAL_FALLBACK_STATS,
  elementalKeyToSlug,
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
  onConfirm: (result: WildShapeDialogResult) => void
}

function catalogToPick(entry: CatalogEntry): BestiaryFormPick | null {
  const data = parseBestiaryData(entry.data)
  if (!data) return null
  const speed = data.speed || {}
  const actions = (data.actions || [])
    .map((a) => `${a.name_ru}: ${a.text_ru}`)
    .join('\n')
  return {
    slug: entry.slug,
    name_ru: entry.name_ru,
    catalog_id: entry.id,
    cr: data.cr,
    type: data.type,
    ac: data.ac,
    hp: data.hp_average,
    speed_walk: speed.walk ?? 0,
    speed_swim: speed.swim,
    speed_fly: speed.fly,
    actions_text: actions,
  }
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
  onConfirm,
}: WildShapeDialogProps) {
  const [step, setStep] = useState<'fork' | 'beast' | 'starry' | 'elemental'>(
    'fork',
  )
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
    () => wildShapeLimits({ druidLevel, subclassSlug }),
    [druidLevel, subclassSlug],
  )

  const options = useMemo(
    () =>
      resolveWildShapeOptions({
        features,
        resources,
        classSlug,
        classEntryId,
      }),
    [features, resources, classSlug, classEntryId],
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
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setCatalogError(null)
    void listCatalogEntries({ kind: 'bestiary', edition })
      .then((entries) => {
        if (cancelled) return
        const picks = entries
          .map(catalogToPick)
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
        .filter((p) => beastPickAllowed(p, limits)),
    [knownForms, limits],
  )

  const filteredBeasts = useMemo(() => {
    const q = query.trim().toLowerCase()
    const beasts = catalogPicks.filter((p) => beastPickAllowed(p, limits))
    if (!q) return beasts
    return beasts.filter(
      (p) =>
        p.name_ru.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    )
  }, [catalogPicks, limits, query])

  function spendAnd(
    label: string,
    amount: number,
    build: () => Omit<WildShapeDialogResult, 'resources' | 'toast'> & {
      toast?: string
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
      resources: spent.resources,
      companions: built.companions,
      knownForms: built.knownForms,
      hpTemp: built.hpTemp,
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
      spendAnd('Дикий спутник', 1, () => ({
        companions: applyWildCompanion({ companions, druidLevel }),
        knownForms,
        toast: 'Дикий спутник: фамильяр-фея',
      }))
      return
    }
    if (id === 'symbiotic_entity') {
      const temp = symbioticTempHp(druidLevel)
      spendAnd('Симбиотическая сущность', 1, () => ({
        companions,
        knownForms,
        hpTemp: temp,
        toast: `Симбиотическая сущность: ${temp} вр. хитов`,
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

  function confirmBeast(pick: BestiaryFormPick) {
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

  function confirmStarry() {
    spendAnd('Звёздная форма', 1, () => ({
      companions: applyStarryForm({
        companions,
        constellation,
        hostHp,
        hostHpMax,
      }),
      knownForms,
      toast: 'Звёздная форма принята',
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
        : step === 'starry'
          ? 'Звёздная форма'
          : 'Элементальный облик'

  return (
    <Dialog
      open={open}
      title={title}
      size="wide"
      secondaryLabel={step === 'fork' ? 'Отмена' : 'Назад'}
      onSecondary={() => {
        if (step === 'fork') onClose()
        else setStep('fork')
      }}
      primaryLabel={
        step === 'starry'
          ? 'Принять (−1)'
          : step === 'elemental'
            ? 'Принять (−2)'
            : 'Закрыть'
      }
      primaryDisabled={step === 'beast'}
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
              Лимит облика: CR ≤ {limits.maxCr}
              {limits.allowSwim ? ' · плавание' : ''}
              {limits.allowFly ? ' · полёт' : ''}
              {limits.combatBonusAction ? ' · Moon: бонусным действием' : ''}
            </Text>
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
                  {opt.disabled ? opt.disabledReason : opt.summaryRu}
                </Button>
              ))}
            </Stack>
            <Text tone="muted">
              Альтернативы кругов видны, если архетип разблокировал умение. Дикий спутник
              (Tasha) — на этой же развилке.
            </Text>
          </>
        ) : null}

        {step === 'beast' ? (
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
                    {p.name_ru} · CR {p.cr} · КД {p.ac} · HP {p.hp}
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
                    {p.name_ru} · CR {p.cr} · КД {p.ac} · HP {p.hp}
                    {(p.speed_fly ?? 0) > 0 ? ' · полёт' : ''}
                    {(p.speed_swim ?? 0) > 0 ? ' · плав.' : ''}
                  </Button>
                ))}
              </Stack>
            ) : null}
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
                {elementalPreview.ac} · HP {elementalPreview.hp} · CR{' '}
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
