/** Multi-pick UI for Pact of the Tome (+3 cantrips, any class list). */

import { useEffect, useMemo, useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import {
  spellOptionsForPactTomeCantrips,
  type FeatSpellCatalogRow,
  type FeatSpellListOption,
} from '../../shared/dnd/featSpellListOptions'
import {
  getFeaturePickList,
  toggleFeaturePickInList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import {
  PACT_TOME_CANTRIPS_FEATURE_ID,
  PACT_TOME_CANTRIPS_LIMIT,
  type PactTomeResolvedCantrip,
} from './pactTomeEffects'
import { Button, Field, Input, Stack, Text } from '../../ui'

const SPELL_CATALOG_TIMEOUT_MS = 8000

let bundledSpells2014: Promise<CatalogEntry[]> | null = null

function loadBundledSpells2014(): Promise<CatalogEntry[]> {
  if (!bundledSpells2014) {
    bundledSpells2014 = fetch('/spells-2014.json')
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || ''
        if (!response.ok || contentType.includes('text/html')) {
          throw new Error('bundled spells missing')
        }
        const data = (await response.json()) as unknown
        if (!Array.isArray(data)) throw new Error('bundled spells shape')
        return data as CatalogEntry[]
      })
      .catch((err: unknown) => {
        bundledSpells2014 = null
        throw err
      })
  }
  return bundledSpells2014
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

const catalogCache = new Map<string, Promise<FeatSpellCatalogRow[]>>()

/** Load spell rows for tome picks (API, then bundled fallback). Cached per edition. */
export function ensurePactTomeSpellCatalog(
  edition: RulesEdition,
): Promise<FeatSpellCatalogRow[]> {
  const key = edition || '2014'
  const hit = catalogCache.get(key)
  if (hit) return hit
  const pending = (async () => {
    try {
      const rows = await withTimeout(
        listCatalogEntries({ kind: 'spell', edition }),
        SPELL_CATALOG_TIMEOUT_MS,
      )
      if (rows.length) {
        return rows.map((row) => ({
          slug: row.slug,
          name_ru: row.name_ru,
          data: row.data,
        }))
      }
    } catch {
      /* fall through */
    }
    const bundled = await loadBundledSpells2014()
    return bundled.map((row) => ({
      slug: row.slug,
      name_ru: row.name_ru,
      data: row.data,
    }))
  })().catch((err: unknown) => {
    catalogCache.delete(key)
    throw err
  })
  catalogCache.set(key, pending)
  return pending
}

export function resolvePactTomeCantripFromOptions(
  slug: string,
  options: FeatSpellListOption[],
): PactTomeResolvedCantrip | null {
  const hit = options.find((row) => row.id === slug)
  if (!hit) return null
  return { slug, nameRu: hit.label_ru, catalogId: slug }
}

export function PactTomeCantripsPicker({
  classEntryId,
  edition,
  featurePicks,
  onFeaturePicksChange,
  onToast,
  compact = false,
}: {
  classEntryId: string
  edition: RulesEdition
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onToast?: (message: string) => void
  compact?: boolean
}) {
  const [spellCatalog, setSpellCatalog] = useState<FeatSpellCatalogRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const rows = await ensurePactTomeSpellCatalog(edition)
        if (cancelled) return
        setSpellCatalog(rows)
      } catch {
        if (!cancelled) setSpellCatalog([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [edition])

  const options = useMemo(
    () => spellOptionsForPactTomeCantrips({ spells: spellCatalog }),
    [spellCatalog],
  )

  const selected = getFeaturePickList(
    featurePicks,
    classEntryId,
    PACT_TOME_CANTRIPS_FEATURE_ID,
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (row) =>
        row.label_ru.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q),
    )
  }, [options, query])

  const selectedLabels = selected
    .map((id) => options.find((row) => row.id === id)?.label_ru || id)
    .join(', ')

  return (
    <Stack gap={compact ? 8 : 12}>
      <Text>
        Заговоры договора ({selected.length}/{PACT_TOME_CANTRIPS_LIMIT})
        {selectedLabels ? (
          <>
            : <strong>{selectedLabels}</strong>
          </>
        ) : (
          <>
            {' '}
            <span className="feature-choice-badge">не выбрано</span>
          </>
        )}
      </Text>
      <Text tone="muted">
        Три заговора из списков любого класса. Не входят в лимит заговоров колдуна.
      </Text>
      {loading ? <Text tone="muted">Загрузка справочника…</Text> : null}
      {!loading && options.length === 0 ? (
        <Text tone="muted">Не удалось загрузить заговоры.</Text>
      ) : null}
      {!loading && options.length > 0 ? (
        <>
          <Field label="Поиск">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Пламя, наставление…"
            />
          </Field>
          <div className={compact ? 'feature-resource__actions' : 'chip-row'} role="group">
            {filtered.slice(0, 80).map((option) => {
              const active = selected.includes(option.id)
              return (
                <Button
                  key={option.id}
                  type="button"
                  variant={active ? 'primary' : 'ghost'}
                  onClick={() => {
                    const next = toggleFeaturePickInList(
                      featurePicks,
                      classEntryId,
                      PACT_TOME_CANTRIPS_FEATURE_ID,
                      option.id,
                      PACT_TOME_CANTRIPS_LIMIT,
                    )
                    onFeaturePicksChange(next)
                    const list = getFeaturePickList(
                      next,
                      classEntryId,
                      PACT_TOME_CANTRIPS_FEATURE_ID,
                    )
                    onToast?.(
                      list.length
                        ? `Заговоры договора: ${list
                            .map(
                              (id) =>
                                options.find((row) => row.id === id)?.label_ru || id,
                            )
                            .join(', ')}`
                        : 'Заговоры договора: очищено',
                    )
                  }}
                >
                  {active ? `✓ ${option.label_ru}` : option.label_ru}
                </Button>
              )
            })}
          </div>
          {filtered.length > 80 ? (
            <Text tone="muted">Показаны первые 80 — уточни поиск.</Text>
          ) : null}
        </>
      ) : null}
    </Stack>
  )
}
