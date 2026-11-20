/**
 * Druid 2024 «Дикий облик»: pick the beasts that go into the known-forms list
 * (`known_forms`, budget `knownFormsBudget2024`). Edition branch only.
 */

import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import {
  isBeastFormAllowed2024,
  isCountedKnownForm2024,
} from '../../shared/dnd/druid2024Features'
import { Button, Field, Input, Stack, Text } from '../../ui'
import { bestiaryDataToPick } from './bestiaryCompanionStats'
import { createKnownForm, type KnownForm } from './knownForms'
import { parseCr, type BestiaryFormPick } from './wildShape'

export function catalogEntryToBeastPick(entry: CatalogEntry): BestiaryFormPick | null {
  const data = parseBestiaryData(entry.data)
  if (!data) return null
  return bestiaryDataToPick({
    slug: entry.slug,
    name_ru: entry.name_ru,
    catalog_id: entry.id,
    data,
  })
}

export function knownFormFromBeastPick(pick: BestiaryFormPick): KnownForm {
  const tags: KnownForm['tags'] = []
  if ((pick.speed_swim ?? 0) > 0) tags.push('swim')
  if ((pick.speed_fly ?? 0) > 0) tags.push('fly')
  return createKnownForm({
    bestiary_ref: pick.catalog_id ?? null,
    bestiary_slug: pick.slug,
    name_ru: pick.name_ru,
    cr: pick.cr,
    tags,
    stats_override: {
      hp: pick.hp,
      ac: pick.ac,
      speed: pick.speed_walk,
      actions: pick.actions_text,
    },
  })
}

export function beastPickAllowed2024(
  pick: BestiaryFormPick,
  druidLevel: number,
  subclassSlug: string | null | undefined,
): boolean {
  if (pick.type !== 'beast') return false
  return isBeastFormAllowed2024(
    {
      cr: parseCr(pick.cr) ?? Number.POSITIVE_INFINITY,
      fly: (pick.speed_fly ?? 0) > 0,
    },
    druidLevel,
    subclassSlug,
  )
}

function sameForm(form: KnownForm, pick: BestiaryFormPick): boolean {
  return (
    (Boolean(form.bestiary_slug) && form.bestiary_slug === pick.slug) ||
    (Boolean(pick.catalog_id) && form.bestiary_ref === pick.catalog_id)
  )
}

type Props = {
  druidLevel: number
  subclassSlug?: string | null
  /** Max beast forms (`knownFormsBudget2024`). */
  budget: number
  /** Current known forms (all rows; elemental ones are passed through untouched). */
  forms: KnownForm[]
  onChange: (forms: KnownForm[]) => void
  /** Forms that cannot be removed in this picker (learn-only mode). */
  lockedIds?: ReadonlyArray<string>
  /** Replace-one mode: at most one form may be swapped; the rest is read-only. */
  replaceOne?: boolean
  onToast?: (message: string) => void
}

export function KnownFormsPicker({
  druidLevel,
  subclassSlug,
  budget,
  forms,
  onChange,
  lockedIds = [],
  replaceOne = false,
  onToast,
}: Props) {
  const [catalog, setCatalog] = useState<BestiaryFormPick[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void listCatalogEntries({ kind: 'bestiary', edition: '2024' })
      .then((entries) => {
        if (cancelled) return
        setCatalog(
          entries
            .map(catalogEntryToBeastPick)
            .filter((row): row is BestiaryFormPick => Boolean(row)),
        )
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Каталог недоступен')
        setCatalog([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const counted = useMemo(() => forms.filter(isCountedKnownForm2024), [forms])
  const full = counted.length >= budget

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog
      .filter((pick) => beastPickAllowed2024(pick, druidLevel, subclassSlug))
      .filter((pick) => !counted.some((form) => sameForm(form, pick)))
      .filter(
        (pick) =>
          !q || pick.name_ru.toLowerCase().includes(q) || pick.slug.toLowerCase().includes(q),
      )
  }, [catalog, counted, druidLevel, subclassSlug, query])

  function add(pick: BestiaryFormPick) {
    if (full) {
      onToast?.(`Лимит известных обликов: ${budget}. Сначала убери один.`)
      return
    }
    onChange([...forms, knownFormFromBeastPick(pick)])
  }

  function remove(form: KnownForm) {
    onChange(forms.filter((row) => row.id !== form.id))
  }

  return (
    <Stack gap={10}>
      <Text tone="muted">
        Известных обликов: <strong>{counted.length}/{budget}</strong>. Список — звери из бестиария
        в пределах лимита опасности и полёта для твоего уровня. В Дикий облик можно войти только
        в известную форму.
        {replaceOne ? ' В долгий отдых можно заменить ровно одну известную форму.' : ''}
      </Text>
      {counted.length > 0 ? (
        <Stack gap={6}>
          {counted.map((form) => (
            <Button
              key={form.id}
              type="button"
              size="sm"
              variant="secondary"
              disabled={lockedIds.includes(form.id)}
              onClick={() => remove(form)}
            >
              {replaceOne ? 'Забыть' : 'Убрать'}: {form.name_ru} · CR {form.cr}
            </Button>
          ))}
        </Stack>
      ) : null}
      {full ? (
        <Text tone="muted">Список заполнен.</Text>
      ) : (
        <>
          <Field label="Поиск зверя">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="волк, медведь…"
            />
          </Field>
          {loading ? <Text tone="muted">Загрузка бестиария…</Text> : null}
          {error ? <Text tone="danger">{error}</Text> : null}
          {!loading && !error && available.length === 0 ? (
            <Text tone="muted">Нет подходящих зверей в пределах лимита.</Text>
          ) : null}
          <Stack gap={6}>
            {available.slice(0, 40).map((pick) => (
              <Button
                key={pick.slug}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => add(pick)}
              >
                + {pick.name_ru} · CR {pick.cr} · КД {pick.ac}
                {(pick.speed_fly ?? 0) > 0 ? ' · полёт' : ''}
                {(pick.speed_swim ?? 0) > 0 ? ' · плав.' : ''}
              </Button>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  )
}
