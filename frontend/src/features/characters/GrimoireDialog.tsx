import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
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

function entryClasses(entry: CatalogEntry): string[] {
  const raw = entry.data?.classes
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : []
}

function entryLevel(entry: CatalogEntry): number {
  const level = entry.data?.level
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
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState<'all' | number>('all')

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      const level = entryLevel(entry)
      if (levelFilter !== 'all' && level !== levelFilter) return false
      if (classFilter !== 'all' && !entryClasses(entry).includes(classFilter)) return false
      if (!q) return true
      const hay = `${entry.name_ru} ${entry.name_en ?? ''} ${entry.slug}`.toLowerCase()
      return hay.includes(q)
    })
  }, [entries, query, classFilter, levelFilter])

  const groups = useMemo(() => {
    const asSpells = filtered.map((entry) => ({
      id: entry.id,
      name: entry.name_ru,
      catalog_id: entry.id,
      level: entryLevel(entry),
      prepared: false,
      notes: '',
      casting_time: typeof entry.data.casting_time === 'string' ? entry.data.casting_time : '',
      range: typeof entry.data.range === 'string' ? entry.data.range : '',
      attack_or_save:
        typeof entry.data.attack_or_save === 'string' ? entry.data.attack_or_save : '',
      damage: typeof entry.data.damage === 'string' ? entry.data.damage : '',
      concentration: Boolean(entry.data.concentration),
    }))
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
          Библиотека из каталога (sample SRD). Полный SRD / dnd.su — позже. Добавляй на лист, затем
          готовь через «Подготовить».
        </Text>

        <Field label="Поиск">
          <Input
            value={query}
            placeholder="Название…"
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
