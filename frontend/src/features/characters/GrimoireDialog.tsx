import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { parseSpellCatalogData } from '../../shared/dnd/spellCatalog'
import { levelLabel } from '../../shared/dnd/spells'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import { SpellCatalogDetails } from './SpellCatalogDetails'
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
  { id: 'artificer', label: 'Изобретатель' },
]

type GrimoireDialogProps = {
  open: boolean
  edition: RulesEdition
  spells: SpellsState
  /** Known casters: one «Добавить» that also marks ready; no prepare step. */
  knownCaster?: boolean
  onChange: (spells: SpellsState) => void
  onClose: () => void
  onToast?: (message: string) => void
}

function entryLevel(entry: CatalogEntry): number {
  return parseSpellCatalogData(entry.data).level
}

export function GrimoireDialog({
  open,
  edition,
  spells,
  knownCaster = false,
  onChange,
  onClose,
  onToast,
}: GrimoireDialogProps) {
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState<'all' | number>('all')
  const [bookFilter, setBookFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError(null)
    listCatalogEntries({ kind: 'spell', edition })
      .then((items) => {
        if (!active) return
        setEntries(items)
      })
      .catch(() => {
        if (!active) return
        setError('Не удалось загрузить гримуар')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, edition])

  const bookOptions = useMemo(() => {
    const books = new Set<string>()
    for (const entry of entries) {
      const book = parseSpellCatalogData(entry.data).source_book?.trim()
      if (book) books.add(book)
    }
    const preferred = ['PHB', 'XGE', 'TCE', 'EEPC', 'EGW', 'FTD', 'SCC', 'AI']
    const rest = [...books].filter((b) => !preferred.includes(b)).sort()
    return ['all', ...preferred.filter((b) => books.has(b)), ...rest]
  }, [entries])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      const parsed = parseSpellCatalogData(entry.data)
      if (levelFilter !== 'all' && parsed.level !== levelFilter) return false
      if (classFilter !== 'all' && !parsed.classes.includes(classFilter)) return false
      if (bookFilter !== 'all' && parsed.source_book !== bookFilter) return false
      if (!q) return true
      const hay = `${entry.name_ru} ${entry.name_en ?? ''} ${entry.slug} ${parsed.source_book}`.toLowerCase()
      return hay.includes(q)
    })
  }, [entries, query, classFilter, levelFilter, bookFilter])

  const groups = useMemo(() => {
    const asSpells = filtered.map((entry) => {
      const parsed = parseSpellCatalogData(entry.data)
      return {
        id: entry.id,
        name: entry.name_ru,
        catalog_id: entry.id,
        level: parsed.level,
        prepared: false,
        notes: '',
        casting_time: parsed.casting_time_label,
        range: parsed.range,
        attack_or_save: parsed.attack_or_save,
        damage: parsed.damage,
        concentration: parsed.concentration,
        ritual: parsed.ritual,
        duration: parsed.duration,
        school: parsed.school,
        source_book: parsed.source_book,
      }
    })
    return groupSpellsByLevel(asSpells)
  }, [filtered])

  const levelOptions = useMemo(() => {
    const levels = new Set(entries.map(entryLevel))
    return [...levels].sort((a, b) => a - b)
  }, [entries])

  function addSpell(entry: CatalogEntry, prepare: boolean) {
    if (knownHasCatalogId(spells.known, entry.id)) {
      onToast?.('Уже есть в списке известных')
      return
    }
    const nextKnown = addCatalogSpellToKnown(spells.known, entry, {
      prepare,
      maxPrepared: spells.max_prepared,
    })
    onChange({ ...spells, known: nextKnown })
    onToast?.(
      prepare && entryLevel(entry) > 0
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
          {knownCaster
            ? 'Официальные заклинания 2014. «Добавить» сразу делает заклинание доступным для каста.'
            : 'Официальные заклинания 2014. Добавь на лист, затем подготовь (если класс готовит список).'}
        </Text>

        <Field label="Поиск">
          <Input
            value={query}
            placeholder="Название или книга…"
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
          {bookOptions.map((book) => (
            <button
              key={book}
              type="button"
              className={`sheet-chip${bookFilter === book ? ' is-on' : ''}`}
              onClick={() => setBookFilter(book)}
            >
              {book === 'all' ? 'Все книги' : book}
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
          {levelOptions.map((level) => (
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
          {loading ? 'Загружаем…' : `Найдено: ${filtered.length} / ${entries.length}`}
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
                  const parsed = parseSpellCatalogData(entry.data)
                  const expanded = expandedId === entry.id
                  return (
                    <li key={entry.id} className="prepare-row prepare-row--spell">
                      <div className="prepare-row__main">
                        <div>
                          {entry.name_ru}
                          {entry.name_en ? (
                            <span className="prepare-row__meta"> [{entry.name_en}]</span>
                          ) : null}
                          {parsed.concentration ? (
                            <span className="prepare-row__badge">К</span>
                          ) : null}
                          {parsed.ritual ? (
                            <span className="prepare-row__badge">Ритуал</span>
                          ) : null}
                          {parsed.source_book ? (
                            <span className="prepare-row__meta"> · {parsed.source_book}</span>
                          ) : null}
                        </div>
                        <Text tone="muted">
                          {[
                            parsed.casting_time_label,
                            parsed.range,
                            parsed.duration,
                            parsed.components_label,
                            parsed.attack_or_save,
                            parsed.damage,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </Text>
                        <button
                          type="button"
                          className="spell-catalog-details__toggle"
                          onClick={() =>
                            setExpandedId((current) => (current === entry.id ? null : entry.id))
                          }
                        >
                          {expanded ? 'Свернуть' : 'Подробнее'}
                        </button>
                        {expanded ? <SpellCatalogDetails data={entry.data} /> : null}
                      </div>
                      <div className="grimoire-row__actions">
                        {onSheet ? (
                          <span className="sheet-chip is-on">На листе</span>
                        ) : knownCaster ? (
                          <button
                            type="button"
                            className="sheet-chip"
                            onClick={() => addSpell(entry, true)}
                          >
                            Добавить
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="sheet-chip"
                              onClick={() => addSpell(entry, false)}
                            >
                              В известные
                            </button>
                            {spell.level > 0 ? (
                              <button
                                type="button"
                                className="sheet-chip"
                                onClick={() => addSpell(entry, true)}
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
