import { useMemo, useState } from 'react'
import { countsTowardPrepareLimit, levelLabel } from '../../shared/dnd/spells'
import { Dialog, Stack, Text } from '../../ui'
import {
  countPreparedLeveled,
  groupSpellsByLevel,
  isPreparedLocked,
  preparedLockChip,
  setSpellPrepared,
  type SheetSpell,
  type SpellsState,
} from './spells'

type PrepareSpellsDialogProps = {
  open: boolean
  spells: SpellsState
  onChange: (spells: SpellsState) => void
  onClose: () => void
}

type Tab = 'prepared' | 'available'

export function PrepareSpellsDialog({
  open,
  spells,
  onChange,
  onClose,
}: PrepareSpellsDialogProps) {
  const [tab, setTab] = useState<Tab>('prepared')

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
  const cantrips = useMemo(
    () => spells.known.filter((spell) => spell.level <= 0),
    [spells.known],
  )

  const groups = useMemo(
    () => groupSpellsByLevel(tab === 'prepared' ? preparedList : availableList),
    [tab, preparedList, availableList],
  )

  function togglePrepared(spell: SheetSpell) {
    if (!countsTowardPrepareLimit(spell.level)) return
    if (isPreparedLocked(spell)) return
    const nextPrepared = !spell.prepared
    onChange({
      ...spells,
      known: setSpellPrepared(spells.known, spell.id, nextPrepared, spells.max_prepared),
    })
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
          Заговоры всегда доступны. Лимит подготовки — из таблицы класса (кнопка «От класса») или
          вручную в настройках. Новые заклинания — из гримуара.
        </Text>

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
          </button>
        </div>

        {cantrips.length > 0 ? (
          <div className="prepare-section">
            <Text tone="muted">Заговоры ({cantrips.length}) — всегда с собой</Text>
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

        {groups.length === 0 ? (
          <Text tone="muted">
            {tab === 'prepared'
              ? 'Ничего не подготовлено — открой «Все доступные».'
              : 'Сначала добавь заклинания 1+ уровня на лист.'}
          </Text>
        ) : (
          groups.map((group) => (
            <div key={group.level} className="prepare-section">
              <strong>{levelLabel(group.level)}</strong>
              <ul className="prepare-list">
                {group.spells.map((spell) => {
                  const lock = preparedLockChip(spell)
                  const atCap =
                    !spell.prepared &&
                    !lock &&
                    spells.max_prepared != null &&
                    preparedCount >= spells.max_prepared
                  return (
                    <li key={spell.id} className="prepare-row">
                      <div>
                        <span>{spell.name || 'Без названия'}</span>
                        {spell.concentration ? (
                          <span className="prepare-row__badge">К</span>
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
                })}
              </ul>
            </div>
          ))
        )}
      </Stack>
    </Dialog>
  )
}
