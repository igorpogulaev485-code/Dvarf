import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  characterSpellListSlugs,
  highestSpellSlotLevel,
  suggestSpellcastingFromClasses,
  thirdCasterSchoolGate,
  type SubclassCasterOverlay,
} from '../../shared/dnd/casterProgression'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
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

const CLASS_LABELS: Record<string, string> = {
  bard: 'Бард',
  cleric: 'Жрец',
  druid: 'Друид',
  paladin: 'Паладин',
  ranger: 'Следопыт',
  sorcerer: 'Чародей',
  warlock: 'Колдун',
  wizard: 'Волшебник',
  artificer: 'Изобретатель',
}

type GrimoireDialogProps = {
  open: boolean
  edition: RulesEdition
  spells: SpellsState
  /** Known casters: one «Добавить» that also marks ready; no prepare step. */
  knownCaster?: boolean
  /** Character classes — restrict list to their spell lists + slot level. */
  classes?: ClassLevelEntry[]
  subclassCasters?: SubclassCasterOverlay[]
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
  classes = [],
  subclassCasters = [],
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

  const access = useMemo(() => {
    const activeClasses = classes.filter((row) => row.name.trim() && row.level > 0)
    const classSlugs = characterSpellListSlugs(activeClasses, subclassCasters)
    const suggestion =
      activeClasses.length > 0
        ? suggestSpellcastingFromClasses({
            classes: activeClasses,
            subclassCasters,
            abilityModFor: () => 0,
          })
        : null
    const fromSuggestion = suggestion
      ? highestSpellSlotLevel(suggestion.slots, suggestion.pact_slots)
      : 0
    const fromSheet = highestSpellSlotLevel(spells.slots, spells.pact_slots)
    const maxSpellLevel = Math.max(fromSuggestion, fromSheet)
    const schoolGate = thirdCasterSchoolGate(activeClasses, subclassCasters)
    return { classSlugs, maxSpellLevel, schoolGate, hasCaster: classSlugs.length > 0 }
  }, [classes, subclassCasters, spells.slots, spells.pact_slots])

  const classFilters = useMemo(() => {
    if (!access.hasCaster) return []
    const chips = access.classSlugs.map((id) => ({
      id,
      label: CLASS_LABELS[id] ?? id,
    }))
    if (chips.length > 1) {
      return [{ id: 'all', label: 'Мои классы' }, ...chips]
    }
    return chips
  }, [access.classSlugs, access.hasCaster])

  useEffect(() => {
    if (!open) return
    // Default filter to the character's lists (not the full catalog).
    if (access.classSlugs.length === 1) {
      setClassFilter(access.classSlugs[0]!)
    } else {
      setClassFilter('all')
    }
  }, [open, access.classSlugs.join('|')])

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

  const available = useMemo(() => {
    if (!access.hasCaster) return []
    const slugSet = new Set(access.classSlugs)
    const schoolSet = access.schoolGate
      ? new Set(access.schoolGate.map((s) => s.toLowerCase()))
      : null
    return entries.filter((entry) => {
      const parsed = parseSpellCatalogData(entry.data)
      const onList = parsed.classes.some((slug) => slugSet.has(slug))
      if (!onList) return false
      // Cantrips (0) always if on a known list; leveled need a slot of that level.
      if (parsed.level > 0 && parsed.level > access.maxSpellLevel) return false
      if (schoolSet && parsed.level > 0) {
        const school = (parsed.school || '').toLowerCase()
        if (!schoolSet.has(school)) return false
      }
      return true
    })
  }, [entries, access])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return available.filter((entry) => {
      const parsed = parseSpellCatalogData(entry.data)
      if (levelFilter !== 'all' && parsed.level !== levelFilter) return false
      if (classFilter !== 'all' && !parsed.classes.includes(classFilter)) return false
      if (bookFilter !== 'all' && parsed.source_book !== bookFilter) return false
      if (!q) return true
      const hay = `${entry.name_ru} ${entry.name_en ?? ''} ${entry.slug} ${parsed.source_book}`.toLowerCase()
      return hay.includes(q)
    })
  }, [available, query, classFilter, levelFilter, bookFilter])

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
    const levels = new Set(available.map(entryLevel))
    return [...levels].sort((a, b) => a - b)
  }, [available])

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

  const accessHint = !access.hasCaster
    ? 'Нет класса с заклинаниями — гримуар пуст.'
    : access.maxSpellLevel > 0
      ? `Список классов персонажа · до ${access.maxSpellLevel} круга (ячейки / договор).`
      : 'Пока только заговоры из списка класса (ячеек ещё нет).'

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
            ? `Только доступные по классу / архетипу / мультиклассу. «Добавить» сразу для каста. ${accessHint}`
            : `Только доступные по классу / архетипу / мультиклассу. Добавь на лист, затем подготовь. ${accessHint}`}
        </Text>

        <Field label="Поиск">
          <Input
            value={query}
            placeholder="Название или книга…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>

        {classFilters.length > 0 ? (
          <div className="chip-row">
            {classFilters.map((item) => (
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
        ) : null}

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
          {loading
            ? 'Загружаем…'
            : `Найдено: ${filtered.length} / ${available.length} доступных`}
        </Text>
        {error ? <Text tone="danger">{error}</Text> : null}

        {!access.hasCaster && !loading ? (
          <Text tone="muted">Возьми класс с заклинаниями (или архетип вроде Мистического рыцаря).</Text>
        ) : null}

        {groups.length === 0 && !loading && access.hasCaster ? (
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
