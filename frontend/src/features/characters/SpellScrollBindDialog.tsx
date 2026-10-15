/**
 * Pick which spell a generic Spell Scroll blank holds.
 */
import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { parseSpellCatalogData } from '../../shared/dnd/spellCatalog'
import { levelLabel } from '../../shared/dnd/spells'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import type { InventoryItem } from './inventory'
import {
  bindScrollSpell,
  spellScrollLevelCap,
  type ScrollSpellBinding,
} from './spellScroll'

type SpellScrollBindDialogProps = {
  open: boolean
  edition: RulesEdition
  item: InventoryItem | null
  onConfirm: (item: InventoryItem) => void
  onClose: () => void
}

export function SpellScrollBindDialog({
  open,
  edition,
  item,
  onConfirm,
  onClose,
}: SpellScrollBindDialogProps) {
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const levelCap = item ? spellScrollLevelCap(item) : null

  useEffect(() => {
    if (!open) return
    setQuery('')
    setError(null)
    let cancelled = false
    setLoading(true)
    listCatalogEntries({ kind: 'spell', edition, limit: 800 })
      .then((rows) => {
        if (!cancelled) setEntries(rows)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить заклинания')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, edition])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries
      .filter((entry) => {
        const parsed = parseSpellCatalogData(entry.data ?? {})
        if (levelCap != null && parsed.level !== levelCap) return false
        if (!q) return true
        return (
          entry.name_ru.toLowerCase().includes(q) ||
          (entry.name_en ?? '').toLowerCase().includes(q) ||
          entry.slug.toLowerCase().includes(q)
        )
      })
      .slice(0, 40)
  }, [entries, query, levelCap])

  function pick(entry: CatalogEntry) {
    if (!item) return
    const parsed = parseSpellCatalogData(entry.data ?? {})
    if (levelCap != null && parsed.level !== levelCap) {
      setError(`Этот свиток только для ${levelLabel(levelCap)}`)
      return
    }
    const binding: ScrollSpellBinding = {
      catalog_id: entry.id,
      slug: entry.slug,
      name: entry.name_ru,
      level: parsed.level,
      school: parsed.school ?? null,
      ritual: Boolean(parsed.ritual),
      concentration: Boolean(parsed.concentration),
    }
    onConfirm(bindScrollSpell(item, binding))
  }

  if (!item) return null

  return (
    <Dialog
      open={open}
      title="Какое заклинание на свитке?"
      size="default"
      primaryLabel="Позже"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text>
          Предмет: <strong>{item.name || 'Свиток'}</strong>
          {levelCap != null ? ` · ${levelLabel(levelCap)}` : ''}
        </Text>
        <Text tone="muted">
          В справочнике свитки идут по уровню без имени заклинания. Укажи его сейчас — иначе
          нельзя скопировать в книгу волшебника и непонятно, что кастовать.
        </Text>
        <Field label="Поиск">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Название заклинания"
            autoFocus
          />
        </Field>
        {loading ? <Text tone="muted">Загрузка…</Text> : null}
        {error ? <Text tone="danger">{error}</Text> : null}
        {!loading && filtered.length === 0 ? (
          <Text tone="muted">Нет заклинаний{levelCap != null ? ` ${levelLabel(levelCap)}` : ''}.</Text>
        ) : (
          <ul className="prepare-list">
            {filtered.map((entry) => {
              const parsed = parseSpellCatalogData(entry.data ?? {})
              return (
                <li key={entry.id} className="prepare-row">
                  <span>
                    {entry.name_ru}
                    <span className="prepare-meta">
                      {' '}
                      · {levelLabel(parsed.level)}
                      {parsed.ritual ? ' · ритуал' : ''}
                      {parsed.school ? ` · ${parsed.school}` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="sheet-chip is-on"
                    onClick={() => pick(entry)}
                  >
                    Выбрать
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Stack>
    </Dialog>
  )
}
