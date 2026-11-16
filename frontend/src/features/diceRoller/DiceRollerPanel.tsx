import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  Button,
  EmptyState,
  Field,
  Input,
  Stack,
  Stepper,
  Text,
  ToggleChip,
} from '../../ui'
import { clearDiceLog, newLogId, prependLogEntry, readDiceLog } from './diceLog'
import { notifyDiceLogCleared, subscribeDiceLogChanged } from './journalBridge'
import { readOnlyMePref, writeOnlyMePref } from './onlyMePref'
import { formulaFromPool, parseFormula, poolHasDice } from './parseFormula'
import { recordDigitalRoll } from './recordDigitalRoll'
import { rollExpression } from './rollFormula'
import { ensureUnifiedJournal } from './unifiedJournal'
import {
  STANDARD_DICE,
  emptyPool,
  type AdvantageMode,
  type DiceLogEntry,
  type DicePool,
  type StandardDie,
} from './types'
import type { RollHistoryEntry } from '../characters/playDeskUi'

type Props = {
  characterId: string
  /** Seed log for screenshots / tests. */
  initialLog?: DiceLogEntry[]
  onLogChange?: (entries: DiceLogEntry[]) => void
  /** When set — show «Только себе» and post free rolls to the session feed. */
  openSessionId?: string | null
  /** Sheet rollHistory for one-time merge into the journal. */
  sheetRollHistory?: RollHistoryEntry[] | null
  /** Start with journal section focused (from «броски»). */
  focusJournal?: boolean
  /** Which journal tab is active — «Стол» reserved for 02b. */
  journalTab?: 'mine'
  onJournalTabChange?: (tab: 'mine') => void
}

function formatTime(at: number): string {
  try {
    return new Date(at).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

export function DiceRollerPanel({
  characterId,
  initialLog,
  onLogChange,
  openSessionId,
  sheetRollHistory,
  focusJournal = false,
  journalTab = 'mine',
  onJournalTabChange,
}: Props) {
  const [pool, setPool] = useState<DicePool>(emptyPool)
  const [formula, setFormula] = useState('')
  const [formulaTouched, setFormulaTouched] = useState(false)
  const [advantage, setAdvantage] = useState<AdvantageMode>('none')
  const [onlyMe, setOnlyMe] = useState(() => readOnlyMePref(characterId))
  const [log, setLog] = useState<DiceLogEntry[]>(() => {
    if (initialLog) return initialLog
    return ensureUnifiedJournal(characterId, sheetRollHistory)
  })
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const first = initialLog?.[0]?.id
    return first ? new Set([first]) : new Set()
  })
  const [confirmClear, setConfirmClear] = useState(false)
  const [advFlash, setAdvFlash] = useState(false)
  const holdTimer = useRef<number | null>(null)
  const holdFired = useRef(false)
  const flashTimer = useRef<number | null>(null)
  const journalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setOnlyMe(readOnlyMePref(characterId))
    if (initialLog) {
      setExpandedIds(new Set(initialLog.slice(0, 3).map((e) => e.id)))
      return
    }
    setLog(ensureUnifiedJournal(characterId, sheetRollHistory))
  }, [characterId, initialLog, sheetRollHistory])

  useEffect(() => {
    onLogChange?.(log)
  }, [log, onLogChange])

  useEffect(() => {
    return subscribeDiceLogChanged((id) => {
      if (id !== characterId || initialLog) return
      setLog(readDiceLog(characterId))
    })
  }, [characterId, initialLog])

  useEffect(() => {
    if (!focusJournal) return
    const node = journalRef.current
    if (!node) return
    window.requestAnimationFrame(() => {
      node.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [focusJournal, log.length])

  useEffect(() => {
    return () => {
      if (holdTimer.current != null) window.clearTimeout(holdTimer.current)
      if (flashTimer.current != null) window.clearTimeout(flashTimer.current)
    }
  }, [])

  const parsed = useMemo(() => {
    const text = formula.trim()
      ? formula
      : poolHasDice(pool) || pool.modifier !== 0
        ? formulaFromPool(pool) || String(pool.modifier)
        : ''
    if (!text) return { ok: false as const, message: '' }
    return parseFormula(text)
  }, [formula, pool])

  const canRoll =
    parsed.ok &&
    parsed.totalDice > 0 &&
    !(advantage !== 'none' && !parsed.singleD20Eligible)

  const advDisabled = !(parsed.ok && parsed.singleD20Eligible)
  const atTable = Boolean(openSessionId?.trim())

  useEffect(() => {
    if (advDisabled && advantage !== 'none') setAdvantage('none')
  }, [advDisabled, advantage])

  function flashAdvHint() {
    setAdvFlash(true)
    if (flashTimer.current != null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => {
      setAdvFlash(false)
      flashTimer.current = null
    }, 2200)
  }

  function syncFormulaFromPool(next: DicePool) {
    setPool(next)
    setFormula(formulaFromPool(next))
    setFormulaTouched(false)
  }

  function addDie(sides: StandardDie) {
    const next: DicePool = {
      ...pool,
      counts: { ...pool.counts, [sides]: (pool.counts[sides] ?? 0) + 1 },
    }
    syncFormulaFromPool(next)
  }

  function removeDie(sides: StandardDie) {
    const cur = pool.counts[sides] ?? 0
    if (cur <= 0) return
    const nextCounts = { ...pool.counts }
    if (cur === 1) delete nextCounts[sides]
    else nextCounts[sides] = cur - 1
    syncFormulaFromPool({ ...pool, counts: nextCounts })
  }

  function onDieClick(sides: StandardDie) {
    if (holdFired.current) {
      holdFired.current = false
      return
    }
    addDie(sides)
  }

  function onDieContextMenu(sides: StandardDie, event: MouseEvent) {
    event.preventDefault()
    removeDie(sides)
  }

  function startHold(sides: StandardDie) {
    holdFired.current = false
    if (holdTimer.current != null) window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      holdFired.current = true
      removeDie(sides)
      holdTimer.current = null
    }, 450)
  }

  function endHold() {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  function onFormulaChange(value: string) {
    setFormula(value)
    setFormulaTouched(true)
    const p = parseFormula(value)
    if (p.ok && p.simplePool) {
      setPool(p.pool)
    }
    if (!value.trim()) {
      setFormulaTouched(false)
      setPool(emptyPool())
    }
  }

  function resetPool() {
    setPool(emptyPool())
    setFormula('')
    setFormulaTouched(false)
    setAdvantage('none')
    setConfirmClear(false)
    setAdvFlash(false)
  }

  function doRoll(expr?: string, mode?: AdvantageMode) {
    const expression = (expr ?? (formula.trim() || formulaFromPool(pool))).trim()
    const adv = mode ?? advantage
    const rolled = rollExpression(expression, adv)
    if (!rolled.ok) return
    const entry = recordDigitalRoll({
      characterId,
      openSessionId,
      onlyMe,
      title: 'Свободный бросок',
      expression: rolled.result.expression,
      total: rolled.result.total,
      dice: rolled.result.dice,
      modifierTotal: rolled.result.modifierTotal,
      advantageMode: rolled.result.advantageMode,
      toastText: `${rolled.result.expression} = ${rolled.result.total}`,
      category: 'roll',
      source: 'panel',
    })
    setLog(readDiceLog(characterId))
    setExpandedIds(new Set([entry.id]))
  }

  function onClearLog() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    clearDiceLog(characterId)
    setLog([])
    setExpandedIds(new Set())
    setConfirmClear(false)
    notifyDiceLogCleared(characterId)
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function onOnlyMeChange(next: boolean) {
    setOnlyMe(next)
    writeOnlyMePref(characterId, next)
  }

  void formulaTouched
  void prependLogEntry
  void newLogId

  return (
    <Stack gap={12} className="dice-roller-panel">
      <div className="dice-roller-panel__dice" role="group" aria-label="Кости">
        {STANDARD_DICE.map((sides) => {
          const count = pool.counts[sides] ?? 0
          return (
            <div key={sides} className="dice-roller-panel__die-cell">
              <button
                type="button"
                className={`dice-roller-panel__die${count > 0 ? ' is-on' : ''}`}
                aria-label={`Добавить d${sides}`}
                title="Клик — добавить; удержание или правый клик — убрать"
                onClick={() => onDieClick(sides)}
                onContextMenu={(e) => onDieContextMenu(sides, e)}
                onPointerDown={() => startHold(sides)}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onPointerCancel={endHold}
              >
                <span className="dice-roller-panel__die-label">d{sides}</span>
                {count > 0 ? (
                  <span className="dice-roller-panel__die-count">{count}</span>
                ) : null}
              </button>
              {count > 0 ? (
                <button
                  type="button"
                  className="dice-roller-panel__die-dec"
                  aria-label={`Убрать d${sides}`}
                  title="Убрать одну"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeDie(sides)
                  }}
                >
                  −
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      <Field label="Модификатор" className="dice-roller-panel__mod-field">
        <Stepper
          value={pool.modifier}
          onValueChange={(v) => syncFormulaFromPool({ ...pool, modifier: v })}
          aria-label="Модификатор"
          size="sm"
        />
      </Field>

      <div className="dice-roller-panel__formula-wrap">
        {parsed.ok === false && parsed.message ? (
          <Text tone="danger" className="dice-roller-panel__error">
            {parsed.message}
          </Text>
        ) : null}
        <Field label="Формула">
          <Input
            value={formula}
            onChange={(e) => onFormulaChange(e.target.value)}
            placeholder="например 2d6+3"
            aria-invalid={Boolean(formula.trim() && !parsed.ok)}
            aria-label="Формула броска"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canRoll) {
                e.preventDefault()
                doRoll()
              }
            }}
          />
        </Field>
      </div>

      <div
        className={`dice-roller-panel__adv${atTable ? ' dice-roller-panel__adv--with-only-me' : ''}`}
        role="group"
        aria-label="Преимущество и помеха"
      >
        <div
          className="dice-roller-panel__adv-hit"
          title={advDisabled ? 'Нужна одна кость d20' : undefined}
          onClick={() => {
            if (advDisabled) flashAdvHint()
          }}
        >
          <ToggleChip
            main="Преимущество"
            checked={advantage === 'advantage'}
            disabled={advDisabled}
            onChange={(on) => setAdvantage(on ? 'advantage' : 'none')}
            data-testid="dice-advantage"
          />
        </div>
        <div
          className="dice-roller-panel__adv-hit"
          title={advDisabled ? 'Нужна одна кость d20' : undefined}
          onClick={() => {
            if (advDisabled) flashAdvHint()
          }}
        >
          <ToggleChip
            main="Помеха"
            checked={advantage === 'disadvantage'}
            disabled={advDisabled}
            onChange={(on) => setAdvantage(on ? 'disadvantage' : 'none')}
            data-testid="dice-disadvantage"
          />
        </div>
        {atTable ? (
          <div className="dice-roller-panel__adv-hit dice-roller-panel__only-me">
            <ToggleChip
              main="Только себе"
              rest={onlyMe ? 'в ленту не уйдёт' : 'уходит в ленту'}
              checked={onlyMe}
              onChange={onOnlyMeChange}
              data-testid="dice-only-me"
              title="Если включено — броски остаются только у вас"
            />
          </div>
        ) : null}
      </div>
      {advFlash ? (
        <Text tone="muted" className="dice-roller-panel__adv-hint" role="status">
          Нужна одна кость d20
        </Text>
      ) : null}

      <div className="dice-roller-panel__actions">
        <Button
          variant="primary"
          disabled={!canRoll}
          onClick={() => doRoll()}
          data-testid="dice-roll-submit"
        >
          Бросить
        </Button>
        <Button variant="ghost" onClick={resetPool} data-testid="dice-pool-reset">
          Сбросить набор
        </Button>
      </div>

      <div className="dice-roller-panel__journal" ref={journalRef} data-testid="dice-journal">
        <div className="dice-roller-panel__tabs" role="tablist" aria-label="Журнал бросков">
          <button
            type="button"
            role="tab"
            aria-selected={journalTab === 'mine'}
            className={`dice-roller-panel__tab${journalTab === 'mine' ? ' is-on' : ''}`}
            data-testid="dice-journal-tab-mine"
            onClick={() => onJournalTabChange?.('mine')}
          >
            Мои
          </button>
          {/* 02b: вкладка «Стол» рядом */}
        </div>

        <div className="dice-roller-panel__log-head">
          <Text as="h3">Журнал бросков</Text>
          <Button
            variant={confirmClear ? 'danger' : 'ghost'}
            size="sm"
            disabled={log.length === 0}
            onClick={onClearLog}
            data-testid="dice-log-clear"
          >
            {confirmClear ? 'Точно очистить?' : 'Очистить'}
          </Button>
        </div>

        {log.length === 0 ? (
          <EmptyState title="Пока нет бросков" />
        ) : (
          <ul className="dice-roller-panel__log" data-testid="dice-log">
            {log.map((entry, index) => {
              const open =
                expandedIds.has(entry.id) || (expandedIds.size === 0 && index === 0)
              const canRepeat = entry.repeatable !== false && entry.dice.length > 0
              const label = entry.title?.trim() || entry.expression
              return (
                <li key={entry.id} className="dice-roller-panel__log-item">
                  <button
                    type="button"
                    className="dice-roller-panel__log-summary"
                    aria-expanded={open}
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    <span className="dice-roller-panel__log-time">
                      {formatTime(entry.at)}
                    </span>
                    <span className="dice-roller-panel__log-expr">{label}</span>
                    {entry.advantageMode === 'advantage' ? (
                      <span className="dice-roller-panel__log-tag">преим.</span>
                    ) : null}
                    {entry.advantageMode === 'disadvantage' ? (
                      <span className="dice-roller-panel__log-tag">помеха</span>
                    ) : null}
                    <span className="dice-roller-panel__log-total">{entry.total}</span>
                  </button>
                  {open ? (
                    <div className="dice-roller-panel__log-detail">
                      {entry.title ? (
                        <Text tone="muted" className="dice-roller-panel__log-formula">
                          {entry.expression}
                        </Text>
                      ) : null}
                      {entry.dice.length > 0 ? (
                        <div className="dice-roller-panel__faces" aria-label="Кости броска">
                          {entry.dice.map((die, i) => (
                            <span
                              key={`${entry.id}-${i}`}
                              className={`dice-roller-panel__face${
                                die.dropped ? ' is-dropped' : ''
                              }${die.nat === '20' ? ' is-nat20' : ''}${
                                die.nat === '1' ? ' is-nat1' : ''
                              }`}
                              title={`d${die.sides}`}
                            >
                              {die.value}
                            </span>
                          ))}
                          {entry.modifierTotal !== 0 ? (
                            <span className="dice-roller-panel__face is-mod">
                              {entry.modifierTotal > 0 ? '+' : ''}
                              {entry.modifierTotal}
                            </span>
                          ) : null}
                        </div>
                      ) : entry.toastText ? (
                        <Text tone="muted">{entry.toastText}</Text>
                      ) : null}
                      {canRepeat ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => doRoll(entry.expression, entry.advantageMode)}
                        >
                          Повторить
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Stack>
  )
}
