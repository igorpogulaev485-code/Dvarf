import { useMemo, useState } from 'react'
import {
  spellAccessUiCopy,
  type SpellLearnModeUi,
} from '../../shared/dnd/spellAccessUi'
import { countsTowardPrepareLimit, levelLabel } from '../../shared/dnd/spells'
import { Dialog, Stack, Text } from '../../ui'
import {
  countPreparedLeveled,
  groupSpellsByLevel,
  isGrantedSpellHighlight,
  isPreparedLocked,
  preparedLockChip,
  setSpellPrepared,
  spellSourceBadge,
  type SheetSpell,
  type SpellsState,
} from './spells'

type PrepareSpellsDialogProps = {
  open: boolean
  spells: SpellsState
  /** PHB learn mode — copy differs for spellbook vs prepared_list. */
  learnMode?: SpellLearnModeUi | null
  onChange: (spells: SpellsState) => void
  onClose: () => void
}

type Tab = 'prepared' | 'available'

export function PrepareSpellsDialog({
  open,
  spells,
  learnMode = 'prepared_list',
  onChange,
  onClose,
}: PrepareSpellsDialogProps) {
  const [tab, setTab] = useState<Tab>('prepared')
  const uiCopy = spellAccessUiCopy(learnMode ?? 'prepared_list')

  const preparedCount = countPreparedLeveled(spells.known)
  const limitLabel =
    spells.max_prepared == null ? String(preparedCount) : `${preparedCount}/${spells.max_prepared}`

  const preparedList = useMemo(
    () => spells.known.filter((spell) => spell.level > 0 && spell.prepared),
    [spells.known],
  )
  const availableList = useMemo(
    () => spells.known.filter((spell) => spell.level > 0),
    [spells.known],
  )
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

  function togglePrepared(spell: SheetSpell) {
    if (!countsTowardPrepareLimit(spell.level)) return
    if (isPreparedLocked(spell)) return
    const nextPrepared = !spell.prepared
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
            disabled={atCap}
            onClick={() => togglePrepared(spell)}
          >
            {spell.prepared ? 'Убрать' : atCap ? 'Лимит' : 'Подготовить'}
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
      return <Text tone="muted">{emptyText}</Text>
    }
    return groups.map((group) => (
      <div key={group.level} className="prepare-section">
        <strong>{levelLabel(group.level)}</strong>
        <ul className="prepare-list">{group.spells.map(renderSpellRow)}</ul>
      </div>
    ))
  }

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
          {uiCopy.prepareHint} Лимит сегодня: {limitLabel}. Пополнить пул — через Гримуар (
          {learnMode === 'spellbook'
            ? '«В книгу» / «В книгу + подготовить»'
            : '«На лист» / «Подготовить»'}
          ).
        </Text>

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
            Все доступные ({availableList.length})
            {unpreparedList.length > 0 ? ` · ещё ${unpreparedList.length}` : ''}
          </button>
        </div>

        {tab === 'prepared' ? (
          renderGroups(
            preparedGroups,
            unpreparedList.length > 0
              ? 'Ничего не подготовлено — открой «Все доступные» и нажми «Подготовить».'
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
                  : 'Сначала добавь заклинания 1+ уровня через Гримуар («На лист»).'}
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
