import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  classListPrepareSources,
  describeClassListSources,
  isClassListVirtualSpell,
  mergeAvailableForPrepare,
} from '../../shared/dnd/prepareAvailability'
import {
  spellAccessUiCopy,
  type SpellLearnModeUi,
} from '../../shared/dnd/spellAccessUi'
import { countsTowardPrepareLimit, levelLabel } from '../../shared/dnd/spells'
import { Dialog, Stack, Text } from '../../ui'
import {
  addCatalogSpellToKnown,
  countPreparedLeveled,
  groupSpellsByLevel,
  isGrantedSpellHighlight,
  isPreparedLocked,
  preparedLockChip,
  setSpellPrepared,
  sheetSpellFromCatalog,
  spellSourceBadge,
  type SheetSpell,
  type SpellsState,
} from './spells'

type PrepareSpellsDialogProps = {
  open: boolean
  /** Needed to load class-list spells from the catalog; defaults are fine for known/spellbook. */
  edition?: RulesEdition
  className?: string
  level?: number
  classes?: ClassLevelEntry[]
  spells: SpellsState
  /** PHB learn mode — copy differs for spellbook vs prepared_list. */
  learnMode?: SpellLearnModeUi | null
  onChange: (spells: SpellsState) => void
  onClose: () => void
}

type Tab = 'prepared' | 'available'

export function PrepareSpellsDialog({
  open,
  edition = '2014',
  className = '',
  level = 1,
  classes,
  spells,
  learnMode = 'prepared_list',
  onChange,
  onClose,
}: PrepareSpellsDialogProps) {
  const [tab, setTab] = useState<Tab>('prepared')
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const uiCopy = spellAccessUiCopy(learnMode ?? 'prepared_list')

  const sources = useMemo(() => {
    // Only prepared_list casters auto-fill from the class grimoire list.
    if ((learnMode ?? 'prepared_list') !== 'prepared_list') return []
    return classListPrepareSources({ className, level, classes })
  }, [learnMode, className, level, classes])
  const sourcesKey = sources.map((row) => `${row.slug}:${row.maxSpellLevel}`).join('|')
  const usesClassList = sources.length > 0
  const sourceHint = describeClassListSources(sources)

  useEffect(() => {
    if (!open || !usesClassList) {
      setCatalog([])
      setCatalogError(null)
      setCatalogLoading(false)
      return
    }
    let active = true
    setCatalogLoading(true)
    setCatalogError(null)
    listCatalogEntries({ kind: 'spell', edition })
      .then((items) => {
        if (!active) return
        setCatalog(items)
      })
      .catch(() => {
        if (!active) return
        setCatalogError('Не удалось загрузить список класса из гримуара')
        setCatalog([])
      })
      .finally(() => {
        if (active) setCatalogLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, edition, usesClassList, sourcesKey])

  const preparedCount = countPreparedLeveled(spells.known)
  const limitLabel =
    spells.max_prepared == null ? String(preparedCount) : `${preparedCount}/${spells.max_prepared}`

  const preparedList = useMemo(
    () => spells.known.filter((spell) => spell.level > 0 && spell.prepared),
    [spells.known],
  )

  const availableList = useMemo(() => {
    if (!usesClassList) {
      return spells.known.filter((spell) => spell.level > 0)
    }
    return mergeAvailableForPrepare({
      known: spells.known,
      catalog,
      sources,
      sheetSpellFromCatalog,
    }) as SheetSpell[]
  }, [usesClassList, spells.known, catalog, sources])

  /** Pool not yet prepared — the reason «Все доступные» differs from «Подготовленные». */
  const unpreparedList = useMemo(
    () => availableList.filter((spell) => !spell.prepared),
    [availableList],
  )
  const cantrips = useMemo(
    () => spells.known.filter((spell) => spell.level <= 0),
    [spells.known],
  )

  const preparedGroups = useMemo(() => groupSpellsByLevel(preparedList), [preparedList])
  const unpreparedGroups = useMemo(() => groupSpellsByLevel(unpreparedList), [unpreparedList])
  const availableGroups = useMemo(() => groupSpellsByLevel(availableList), [availableList])

  const bookLost =
    learnMode === 'spellbook' && Boolean(spells.wizard_spellbook?.bookLost)

  function togglePrepared(spell: SheetSpell) {
    if (!countsTowardPrepareLimit(spell.level)) return
    if (isPreparedLocked(spell)) return

    if (isClassListVirtualSpell(spell) && spell.catalog_id) {
      if (bookLost) return
      const entry = catalog.find((item) => item.id === spell.catalog_id)
      if (!entry) return
      onChange({
        ...spells,
        known: addCatalogSpellToKnown(spells.known, entry, {
          prepare: true,
          maxPrepared: spells.max_prepared,
        }),
      })
      return
    }

    const nextPrepared = !spell.prepared
    // PHB: without the book you cannot prepare a new list (can keep existing).
    if (bookLost && nextPrepared) return
    onChange({
      ...spells,
      known: setSpellPrepared(spells.known, spell.id, nextPrepared, spells.max_prepared),
    })
  }

  function renderSpellRow(spell: SheetSpell) {
    const lock = preparedLockChip(spell)
    const source = spellSourceBadge(spell)
    const atCap =
      !spell.prepared &&
      !lock &&
      spells.max_prepared != null &&
      preparedCount >= spells.max_prepared
    const cannotPrepare = bookLost && !spell.prepared
    return (
      <li
        key={spell.id}
        className={`prepare-row${isGrantedSpellHighlight(spell) ? ' is-granted' : ''}`}
      >
        <div>
          <span>{spell.name || 'Без названия'}</span>
          {spell.concentration ? (
            <span className="prepare-row__badge" title="Концентрация">
              конц.
            </span>
          ) : null}
          {spell.ritual ? (
            <span className="prepare-row__badge" title="Ритуал">
              ритуал
            </span>
          ) : null}
          {isClassListVirtualSpell(spell) ? (
            <span className="prepare-row__badge is-source" title="Из списка класса">
              список класса
            </span>
          ) : null}
          {source && !lock ? (
            <span className="prepare-row__badge is-source" title={source.title}>
              {source.label}
            </span>
          ) : null}
          {tab === 'available' && spell.prepared && !lock ? (
            <span className="prepare-row__badge" title="Уже в сегодняшнем наборе">
              сегодня
            </span>
          ) : null}
        </div>
        {lock ? (
          <span className="sheet-chip is-on" title={lock.title}>
            {lock.label}
          </span>
        ) : (
          <button
            type="button"
            className={`sheet-chip${spell.prepared ? ' is-on' : ''}`}
            disabled={atCap || cannotPrepare}
            onClick={() => togglePrepared(spell)}
          >
            {spell.prepared
              ? 'Убрать'
              : bookLost
                ? 'Нет книги'
                : atCap
                  ? 'Лимит'
                  : 'Подготовить'}
          </button>
        )}
      </li>
    )
  }

  function renderGroups(
    groups: ReturnType<typeof groupSpellsByLevel>,
    emptyText: string,
  ) {
    if (groups.length === 0) {
      return emptyText ? <Text tone="muted">{emptyText}</Text> : null
    }
    return groups.map((group) => (
      <div key={group.level} className="prepare-section">
        <strong>{levelLabel(group.level)}</strong>
        <ul className="prepare-list">{group.spells.map(renderSpellRow)}</ul>
      </div>
    ))
  }

  const emptyAvailableText = usesClassList
    ? catalogLoading
      ? 'Загружаем список класса…'
      : catalogError ??
        (sourceHint
          ? `Нет заклинаний в каталоге для: ${sourceHint}. Проверь гримуар.`
          : 'Сначала добавь заклинания 1+ уровня через Гримуар («На лист»).')
    : 'Сначала добавь заклинания 1+ уровня через Гримуар («На лист»).'

  return (
    <Dialog
      open={open}
      title="Подготовить заклинания"
      size="wide"
      primaryLabel="Готово"
      onPrimary={onClose}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          {uiCopy.prepareHint} Лимит сегодня: {limitLabel}.
          {usesClassList
            ? ` Сейчас в пуле: ${sourceHint}.`
            : ` Пополнить пул — через Гримуар (${
                learnMode === 'spellbook'
                  ? '«В книгу» / «В книгу + подготовить»'
                  : '«На лист» / «Подготовить»'
              }).`}
        </Text>
        {bookLost ? (
          <Text tone="muted">
            Книга утеряна — нельзя готовить новые заклинания. Уже подготовленные остаются до
            замены книги.
          </Text>
        ) : null}

        {cantrips.length > 0 ? (
          <div className="prepare-section">
            <Text tone="muted">Заговоры ({cantrips.length}) — всегда с собой, не в лимите</Text>
            <ul className="prepare-list">
              {cantrips.map((spell) => (
                <li key={spell.id} className="prepare-row">
                  <span>{spell.name || 'Без названия'}</span>
                  <span className="prepare-row__meta">заговор</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="chip-row">
          <button
            type="button"
            className={`sheet-chip${tab === 'prepared' ? ' is-on' : ''}`}
            onClick={() => setTab('prepared')}
          >
            Подготовленные ({limitLabel})
          </button>
          <button
            type="button"
            className={`sheet-chip${tab === 'available' ? ' is-on' : ''}`}
            onClick={() => setTab('available')}
          >
            Все доступные ({availableList.length}
            {usesClassList && catalogLoading ? '…' : ''})
            {unpreparedList.length > 0 ? ` · ещё ${unpreparedList.length}` : ''}
          </button>
        </div>

        {tab === 'prepared' ? (
          renderGroups(
            preparedGroups,
            unpreparedList.length > 0
              ? 'Ничего не подготовлено — открой «Все доступные» и нажми «Подготовить».'
              : usesClassList
                ? 'Пул класса загружается во вкладке «Все доступные».'
                : 'Пул пуст. Сначала добавь заклинания через Гримуар («На лист»).',
          )
        ) : (
          <Stack gap={12}>
            {unpreparedList.length > 0 ? (
              <>
                <Text tone="muted">Можно подготовить ({unpreparedList.length})</Text>
                {renderGroups(unpreparedGroups, '')}
              </>
            ) : (
              <Text tone="muted">
                {availableList.length > 0
                  ? 'Все доступные уже подготовлены. Сними лишние во вкладке «Подготовленные» или добавь новые через Гримуар.'
                  : emptyAvailableText}
              </Text>
            )}
            {preparedList.length > 0 && unpreparedList.length > 0 ? (
              <>
                <Text tone="muted">Уже на сегодня ({preparedList.length})</Text>
                {renderGroups(preparedGroups, '')}
              </>
            ) : null}
            {preparedList.length > 0 && unpreparedList.length === 0
              ? renderGroups(availableGroups, '')
              : null}
          </Stack>
        )}
      </Stack>
    </Dialog>
  )
}
