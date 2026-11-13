import { useMemo, useState } from 'react'
import {
  formatNamedPrepareBudgets,
} from '../../shared/dnd/castProfiles'
import type { SpellLearnBudget } from '../../shared/dnd/casterProgression'
import {
  spellAccessUiCopy,
  type SpellLearnModeUi,
} from '../../shared/dnd/spellAccessUi'
import { countsTowardPrepareLimit, levelLabel } from '../../shared/dnd/spells'
import { Dialog, Stack, Text } from '../../ui'
import {
  countAlwaysPreparedLeveled,
  countPreparedLeveled,
  countPreparedLeveledBySlug,
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
  /**
   * Thin morning-prep is for spellbook (wizard) only.
   * prepared_list casters prepare in Grimoire; known have no daily prepare.
   */
  learnMode?: SpellLearnModeUi | null
  /** M2: per-class prepare budgets (same source as desk meta chips). */
  learnBudgets?: SpellLearnBudget[] | null
  onChange: (spells: SpellsState) => void
  onClose: () => void
}

type Tab = 'prepared' | 'available'

function prepareCapForSpell(
  spell: SheetSpell,
  learnBudgets: SpellLearnBudget[] | null | undefined,
  fallbackMax: number | null,
): { maxPrepared: number | null; scopeSlug: string | null } {
  const slug = (spell.class_slug ?? '').trim().toLowerCase()
  const prepareRows =
    learnBudgets?.filter(
      (row) => row.maxPrepared != null && (row.maxPrepared ?? 0) > 0,
    ) ?? []
  if (slug && prepareRows.length > 0) {
    const row = prepareRows.find((item) => item.slug === slug)
    if (row?.maxPrepared != null) {
      return {
        maxPrepared: row.maxPrepared,
        scopeSlug: prepareRows.length > 1 ? slug : null,
      }
    }
  }
  return { maxPrepared: fallbackMax, scopeSlug: null }
}

/**
 * Wizard morning prep: pick today's set from the spellbook.
 * Class-list prepare UI lives in GrimoireDialog (status chips).
 */
export function PrepareSpellsDialog({
  open,
  spells,
  learnMode = 'spellbook',
  learnBudgets = null,
  onChange,
  onClose,
}: PrepareSpellsDialogProps) {
  const [tab, setTab] = useState<Tab>('prepared')
  const uiCopy = spellAccessUiCopy(learnMode ?? 'spellbook')

  const preparedCount = countPreparedLeveled(spells.known)
  const alwaysPreparedCount = countAlwaysPreparedLeveled(spells.known)
  const preparedBySlug = useMemo(
    () => countPreparedLeveledBySlug(spells.known),
    [spells.known],
  )
  const prepareRows = useMemo(
    () =>
      (learnBudgets ?? []).filter(
        (row) => row.maxPrepared != null && (row.maxPrepared ?? 0) > 0,
      ),
    [learnBudgets],
  )
  /** Multiclass: named per-class chips. Mono: keep «N/M» (Селестия 9/9). */
  const limitLabel = (() => {
    if (prepareRows.length > 1) {
      const named = formatNamedPrepareBudgets(learnBudgets ?? [], preparedBySlug, {
        alwaysPrepared: alwaysPreparedCount,
      })
      if (named) return named.replace(/^подг\.\s*/, '')
    }
    return spells.max_prepared == null
      ? String(preparedCount)
      : `${preparedCount}/${spells.max_prepared}`
  })()

  const bookSpells = useMemo(
    () =>
      spells.known.filter(
        (spell) => spell.level > 0 && spell.in_spellbook !== false,
      ),
    [spells.known],
  )

  const preparedList = useMemo(
    () => bookSpells.filter((spell) => spell.prepared),
    [bookSpells],
  )
  const availableList = bookSpells
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
    const nextPrepared = !spell.prepared
    if (bookLost && nextPrepared) return
    const { maxPrepared, scopeSlug } = prepareCapForSpell(
      spell,
      learnBudgets,
      spells.max_prepared,
    )
    onChange({
      ...spells,
      known: setSpellPrepared(
        spells.known,
        spell.id,
        nextPrepared,
        maxPrepared,
        scopeSlug ? { scopeSlug } : undefined,
      ),
    })
  }

  function renderSpellRow(spell: SheetSpell) {
    const lock = preparedLockChip(spell)
    const source = spellSourceBadge(spell)
    const { maxPrepared, scopeSlug } = prepareCapForSpell(
      spell,
      learnBudgets,
      spells.max_prepared,
    )
    const usedForCap = scopeSlug
      ? (preparedBySlug[scopeSlug] ?? 0)
      : preparedCount
    const atCap =
      !spell.prepared &&
      !lock &&
      maxPrepared != null &&
      usedForCap >= maxPrepared
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

  return (
    <Dialog
      open={open}
      title="Подготовить из книги"
      size="wide"
      primaryLabel="Готово"
      onPrimary={onClose}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          {uiCopy.prepareHint} Лимит сегодня: {limitLabel}. Новые записи — через Гримуар («В
          книгу»).
        </Text>
        {bookLost ? (
          <Text tone="muted">
            Книга утеряна — нельзя готовить новые. Уже подготовленные остаются. Открой
            настройки заклинаний → «Книга: утеряна», чтобы вернуть книгу из инвентаря или
            переписать из памяти.
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
            В книге ({availableList.length})
            {unpreparedList.length > 0 ? ` · ещё ${unpreparedList.length}` : ''}
          </button>
        </div>

        {tab === 'prepared' ? (
          renderGroups(
            preparedGroups,
            unpreparedList.length > 0
              ? 'Ничего не подготовлено — открой «В книге» и нажми «Подготовить».'
              : 'Книга пуста. Сначала добавь заклинания через Гримуар («В книгу»).',
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
                  ? 'Всё из книги уже подготовлено. Сними лишние во вкладке «Подготовленные» или допиши книгу в Гримуаре.'
                  : 'Сначала добавь заклинания в книгу через Гримуар.'}
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
