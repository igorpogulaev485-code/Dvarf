/**
 * College of Lore (2024, level 6) «Доп. магические тайны»: two Wizard / Druid / Cleric spells
 * (cantrip, or a leveled spell with an available slot). Always prepared beyond the column.
 * One of them may be replaced whenever a bard level is gained.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  BARD_DISCOVERIES_SWAP_PICK_ID_2024,
  LORE_DISCOVERIES_FEATURE_ID_2024,
  LORE_DISCOVERY_LISTS_2024,
  LORE_MAGICAL_DISCOVERIES_PICKS_2024,
  bardMaxSpellCircle2024,
  bardSwapAvailable2024,
  evaluateLoreDiscoveryToggle2024,
} from '../../shared/dnd/bard2024Features'
import {
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { Button, Field, Input, Text } from '../../ui'
import {
  bardSpell2024BySlug,
  bardSpells2024Loaded,
  bardSpells2024OnLists,
  ensureBardSpells2024,
} from './bardSpellCatalog2024'

export function LoreDiscoveriesPicker({
  classEntryId,
  bardLevel,
  featurePicks,
  onFeaturePicksChange,
  onToast,
}: {
  classEntryId: string
  bardLevel: number
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onToast?: (message: string) => void
}) {
  const [query, setQuery] = useState('')
  const [ready, setReady] = useState(bardSpells2024Loaded())
  useEffect(() => {
    let alive = true
    void ensureBardSpells2024().then(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const selected = getFeaturePickList(featurePicks, classEntryId, LORE_DISCOVERIES_FEATURE_ID_2024)
  const swapRaw = getFeaturePick(featurePicks, classEntryId, BARD_DISCOVERIES_SWAP_PICK_ID_2024)
  const swapOpen = bardSwapAvailable2024(swapRaw, bardLevel)
  const maxCircle = bardMaxSpellCircle2024(bardLevel)
  const options = useMemo(
    () =>
      ready ? bardSpells2024OnLists(LORE_DISCOVERY_LISTS_2024, { maxLevel: maxCircle }) : [],
    [ready, maxCircle],
  )
  const q = query.trim().toLowerCase()
  const shown = (
    q
      ? options.filter(
          (row) =>
            row.nameRu.toLowerCase().includes(q) ||
            row.nameEn.toLowerCase().includes(q) ||
            row.slug.includes(q),
        )
      : options.filter((row) => selected.includes(row.slug))
  ).slice(0, 40)

  function toggle(slug: string, nameRu: string) {
    const verdict = evaluateLoreDiscoveryToggle2024({ selected, slug, bardLevel, swapRaw })
    if (!verdict.ok) {
      onToast?.(verdict.reasonRu)
      return
    }
    const active = selected.includes(slug)
    const nextList = active ? selected.filter((item) => item !== slug) : [...selected, slug]
    let next = setFeaturePick(
      featurePicks,
      classEntryId,
      LORE_DISCOVERIES_FEATURE_ID_2024,
      nextList.join(',') || null,
    )
    next = setFeaturePick(next, classEntryId, BARD_DISCOVERIES_SWAP_PICK_ID_2024, verdict.swapRaw)
    onFeaturePicksChange(next)
    onToast?.(active ? `${nameRu} снято с тайн` : `${nameRu}: всегда подготовлено`)
  }

  return (
    <div className="feature-resource" data-testid="lore-discoveries-picker">
      <Text tone="muted">
        Два заклинания из списков Волшебника, Друида или Жреца: заговор или круг ≤ {maxCircle}.
        Всегда подготовлены, вне лимита подготовленных. Одно можно заменить при получении уровня
        барда — сейчас замена {swapOpen ? 'доступна' : 'использована'}. Выбрано {selected.length}/
        {LORE_MAGICAL_DISCOVERIES_PICKS_2024}.
      </Text>
      <Field label="Поиск по спискам Волшебника, Друида, Жреца (2024)">
        <Input
          value={query}
          placeholder="Fireball, Guidance, Огненный шар…"
          onChange={(event) => setQuery(event.target.value)}
        />
      </Field>
      {!ready ? <Text tone="muted">Загружаю заклинания 2024…</Text> : null}
      <div className="feature-resource__actions">
        {shown.map((row) => {
          const active = selected.includes(row.slug)
          return (
            <Button
              key={row.slug}
              type="button"
              variant={active ? 'primary' : 'secondary'}
              data-testid={`lore-discovery-${row.slug}`}
              onClick={() => toggle(row.slug, row.nameRu)}
            >
              {active ? '✓ ' : ''}
              {row.nameRu} · {row.level === 0 ? 'заговор' : `${row.level} круг`}
            </Button>
          )
        })}
        {selected
          .filter((slug) => !bardSpell2024BySlug(slug) && ready)
          .map((slug) => (
            <Button key={slug} type="button" variant="secondary" onClick={() => toggle(slug, slug)}>
              ✕ {slug}
            </Button>
          ))}
      </div>
      {!q ? (
        <Text tone="muted">Введите название: ищутся Волшебник, Друид и Жрец.</Text>
      ) : null}
      {q && shown.length === 0 ? <Text tone="muted">Ничего не найдено в этом круге.</Text> : null}
    </div>
  )
}
