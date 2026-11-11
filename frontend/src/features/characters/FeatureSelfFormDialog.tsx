/**
 * Feature-driven self_form picker (e.g. Wizard Shapechanger).
 */

import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'
import type { CompanionEntry } from './companions'
import {
  applyFeatureSelfForm,
  featureFormPickAllowed,
  type FeatureFormLimits,
} from './featureForms'
import type { KnownForm } from './knownForms'
import type { BestiaryFormPick } from './wildShape'

export type FeatureSelfFormDialogResult = {
  companions: CompanionEntry[]
  knownForms: KnownForm[]
  toast: string
}

type FeatureSelfFormDialogProps = {
  open: boolean
  onClose: () => void
  limits: FeatureFormLimits
  companions: CompanionEntry[]
  knownForms: KnownForm[]
  hostHp: number
  hostHpMax: number
  edition: '2014' | '2024'
  onConfirm: (result: FeatureSelfFormDialogResult) => void
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

export function FeatureSelfFormDialog({
  open,
  onClose,
  limits,
  companions,
  knownForms,
  hostHp,
  hostHpMax,
  edition,
  onConfirm,
}: FeatureSelfFormDialogProps) {
  const [query, setQuery] = useState('')
  const [catalogPicks, setCatalogPicks] = useState<BestiaryFormPick[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setCatalogError(null)
    void listCatalogEntries({ kind: 'bestiary', edition })
      .then((entries) => {
        if (cancelled) return
        setCatalogPicks(
          entries
            .map(catalogToPick)
            .filter((p): p is BestiaryFormPick => Boolean(p)),
        )
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
        .filter((p) => featureFormPickAllowed(p, limits)),
    [knownForms, limits],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const allowed = catalogPicks.filter((p) => featureFormPickAllowed(p, limits))
    if (!q) return allowed
    return allowed.filter(
      (p) =>
        p.name_ru.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    )
  }, [catalogPicks, limits, query])

  function confirmPick(pick: BestiaryFormPick) {
    const next = applyFeatureSelfForm({
      companions,
      knownForms,
      pick,
      hostHp,
      hostHpMax,
      limits,
    })
    onConfirm({
      ...next,
      toast: `${limits.labelRu}: ${pick.name_ru}`,
    })
    onClose()
  }

  return (
    <Dialog
      open={open}
      title={`${limits.labelRu} — зверь CR ≤ ${limits.maxCr}`}
      size="wide"
      secondaryLabel="Отмена"
      onSecondary={onClose}
      primaryLabel="Закрыть"
      onPrimary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Без ячейки · 1× короткий/долгий отдых · только зверь CR ≤ {limits.maxCr}.
        </Text>
        <Field label="Поиск">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="волк, ястреб…"
          />
        </Field>
        {loading ? <Text tone="muted">Загрузка бестиария…</Text> : null}
        {catalogError ? <Text tone="danger">{catalogError}</Text> : null}
        {!loading && filtered.length === 0 && knownPicks.length === 0 ? (
          <Text tone="muted">Нет зверей CR ≤ {limits.maxCr} в каталоге.</Text>
        ) : null}
        {knownPicks.length > 0 ? (
          <Stack gap={6}>
            <Text>Известные</Text>
            {knownPicks.map((p) => (
              <Button
                key={`known-${p.slug}`}
                type="button"
                variant="secondary"
                onClick={() => confirmPick(p)}
              >
                {p.name_ru} · CR {p.cr} · КД {p.ac} · HP {p.hp}
              </Button>
            ))}
          </Stack>
        ) : null}
        {filtered.length > 0 ? (
          <Stack gap={6}>
            <Text>Бестиарий ({filtered.length})</Text>
            {filtered.slice(0, 60).map((p) => (
              <Button
                key={p.slug}
                type="button"
                variant="secondary"
                onClick={() => confirmPick(p)}
              >
                {p.name_ru} · CR {p.cr} · КД {p.ac} · HP {p.hp}
              </Button>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Dialog>
  )
}
