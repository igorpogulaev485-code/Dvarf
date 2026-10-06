import { useEffect, useMemo, useState } from 'react'
import {
  getCatalogEntry,
  listCatalogEntries,
  type CatalogEntry,
  type CatalogEntryListItem,
} from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { levelLabel } from '../../shared/dnd/spells'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import {
  addCatalogSpellToKnown,
  groupSpellsByLevel,
  knownHasCatalogId,
  type SpellsState,
} from './spells'

const CLASS_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Все классы' },
  { id: 'bard', label: 'Бард' },
  { id: 'cleric', label: 'Жрец' },
  { id: 'druid', label: 'Друид' },
  { id: 'paladin', label: 'Паладин' },
  { id: 'ranger', label: 'Следопыт' },
  { id: 'sorcerer', label: 'Чародей' },
  { id: 'warlock', label: 'Колдун' },
  { id: 'wizard', label: 'Волшебник' },
]

type GrimoireDialogProps = {
  open: boolean
  edition: RulesEdition
  spells: SpellsState
  onChange: (spells: SpellsState) => void
  onClose: () => void
  onToast?: (message: string) => void
}

function entryClasses(entry: CatalogEntryListItem): string[] {
  const raw = entry.preview?.classes
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : []
}

function entryLevel(entry: CatalogEntryListItem): number {
  const level = entry.preview?.level
  return typeof level === 'number' && Number.isFinite(level) ? Math.max(0, Math.min(9, level)) : 0
}

export function GrimoireDialog({
  open,
  edition,
  spells,
  onChange,
  onClose,
  onToast,
}: GrimoireDialogProps) {
  const [entries, setEntries] = useState<CatalogEntryListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState<'all' | number>('all')

  useEffect(() => {
    if (!open) return
    let active = true
    const trimmed = query.trim()
    const spellClass = classFilter === 'all' ? undefined : classFilter
    const spellLevel = levelFilter === 'all' ? undefined : levelFilter

    if (trimmed.length < 2 && spellClass == null && spellLevel == null) {
      setEntries([])
      setLoading(false)
      setError(null)
      return () => {
        active = false
      }
    }

    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      listCatalogEntries({
        kind: 'spell',
        edition,
        q: trimmed.length >= 2 ? trimmed : undefined,
        spellClass,
        spellLevel,
        limit: 40,
      })
        .then((items) => {
          if (!active) return
          setEntries(items)
        })
        .catch(() => {
          if (!active) return
          setEntries([])
          setError('Не удалось найти заклинания')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 220)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [open, edition, query, classFilter, levelFilter])

  const groups = useMemo(() => {
    const asSpells = entries.map((entry) => ({
      id: entry.id,
      name: entry.name_ru,
      catalog_id: entry.id,
      level: entryLevel(entry),
      prepared: false,
      notes: '',
      casting_time:
        typeof entry.preview.casting_time === 'string' ? entry.preview.casting_time : '',
      range: typeof entry.preview.range === 'string' ? entry.preview.range : '',
      attack_or_save:
        typeof entry.preview.attack_or_save === 'string' ? entry.preview.attack_or_save : '',
      damage: typeof entry.preview.damage === 'string' ? entry.preview.damage : '',
      concentration: Boolean(entry.preview.concentration),
    }))
    return groupSpellsByLevel(asSpells)
  }, [entries])

  async function addSpell(entry: CatalogEntryListItem, prepare: boolean) {
    if (knownHasCatalogId(spells.known, entry.id)) {
      onToast?.('Уже есть в списке известных')
      return
    }
    let full: CatalogEntry
    try {
      full = await getCatalogEntry(entry.id)
    } catch {
      onToast?.('Не удалось загрузить заклинание')
      return
    }
    const nextKnown = addCatalogSpellToKnown(spells.known, full, {
      prepare,
      maxPrepared: spells.max_prepared,
    })
    onChange({ ...spells, known: nextKnown })
    const level = entryLevel(entry)
    onToast?.(
      prepare && level > 0
        ? `Добавлено и подготовлено: ${entry.name_ru}`
        : `Добавлено в известные: ${entry.name_ru}`,
    )
  }

  return (
    <Dialog
      open={open}
      title="Гримуар"
      size="wide"
      primaryLabel="Готово"
      onPrimary={onClose}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Поиск по SRD на сервере: введите от 2 букв и/или выберите класс/уровень. На лист уходит
          только выбранное заклинание.
        </Text>

        <Field label="Поиск">
          <Input
            value={query}
            placeholder="От 2 символов…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>

        <div className="chip-row">
          {CLASS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sheet-chip${classFilter === item.id ? ' is-on' : ''}`}
              onClick={() => setClassFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="chip-row">
          <button
            type="button"
            className={`sheet-chip${levelFilter === 'all' ? ' is-on' : ''}`}
            onClick={() => setLevelFilter('all')}
          >
            Все ур.
          </button>
          {Array.from({ length: 10 }, (_, level) => (
            <button
              key={level}
              type="button"
              className={`sheet-chip${levelFilter === level ? ' is-on' : ''}`}
              onClick={() => setLevelFilter(level)}
            >
              {level === 0 ? '0' : String(level)}
            </button>
          ))}
        </div>

        <Text tone="muted">
          {loading
            ? 'Ищем…'
            : entries.length === 0
              ? 'Задайте поиск или фильтр'
              : `Показано: ${entries.length} (макс. 40)`}
        </Text>
        {error ? <Text tone="danger">{error}</Text> : null}

        {groups.length === 0 && !loading ? (
          <Text tone="muted">Ничего не найдено.</Text>
        ) : (
          groups.map((group) => (
            <div key={group.level} className="prepare-section">
              <strong>
                {levelLabel(group.level)} ({group.spells.length})
              </strong>
              <ul className="prepare-list">
                {group.spells.map((spell) => {
                  const entry = entries.find((item) => item.id === spell.catalog_id)
                  if (!entry) return null
                  const onSheet = knownHasCatalogId(spells.known, entry.id)
                  return (
                    <li key={entry.id} className="prepare-row">
                      <div>
                        <div>
                          {entry.name_ru}
                          {entry.name_en ? (
                            <span className="prepare-row__meta"> [{entry.name_en}]</span>
                          ) : null}
                          {spell.concentration ? (
                            <span className="prepare-row__badge">К</span>
                          ) : null}
                          {entryClasses(entry).length > 0 ? (
                            <span className="prepare-row__meta">
                              {' '}
                              · {entryClasses(entry).join(', ')}
                            </span>
                          ) : null}
                        </div>
                        <Text tone="muted">
                          {[spell.casting_time, spell.range, spell.attack_or_save, spell.damage]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </Text>
                      </div>
                      <div className="grimoire-row__actions">
                        {onSheet ? (
                          <span className="sheet-chip is-on">На листе</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="sheet-chip"
                              onClick={() => void addSpell(entry, false)}
                            >
                              В известные
                            </button>
                            {spell.level > 0 ? (
                              <button
                                type="button"
                                className="sheet-chip"
                                onClick={() => void addSpell(entry, true)}
                              >
                                Подготовить
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </Stack>
    </Dialog>
  )
}
