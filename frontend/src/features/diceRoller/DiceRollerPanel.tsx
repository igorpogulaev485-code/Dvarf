import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  Button,
  EmptyState,
  Field,
  Input,
  NumberInput,
  Stack,
  Text,
  ToggleChip,
} from '../../ui'
import { clearDiceLog, newLogId, prependLogEntry, readDiceLog } from './diceLog'
import { formulaFromPool, parseFormula, poolHasDice } from './parseFormula'
import { rollExpression } from './rollFormula'
import {
  STANDARD_DICE,
  emptyPool,
  type AdvantageMode,
  type DiceLogEntry,
  type DicePool,
  type StandardDie,
} from './types'

type Props = {
  characterId: string
  /** Seed log for screenshots / tests. */
  initialLog?: DiceLogEntry[]
  onLogChange?: (entries: DiceLogEntry[]) => void
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

export function DiceRollerPanel({ characterId, initialLog, onLogChange }: Props) {
  const [pool, setPool] = useState<DicePool>(emptyPool)
  const [formula, setFormula] = useState('')
  const [formulaTouched, setFormulaTouched] = useState(false)
  const [advantage, setAdvantage] = useState<AdvantageMode>('none')
  const [log, setLog] = useState<DiceLogEntry[]>(() =>
    initialLog ?? readDiceLog(characterId),
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const holdTimer = useRef<number | null>(null)
  const holdFired = useRef(false)

  useEffect(() => {
    if (initialLog) return
    setLog(readDiceLog(characterId))
  }, [characterId, initialLog])

  useEffect(() => {
    onLogChange?.(log)
  }, [log, onLogChange])

  useEffect(() => {
    return () => {
      if (holdTimer.current != null) window.clearTimeout(holdTimer.current)
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
  const advHint = advDisabled && (poolHasDice(pool) || formula.trim())
    ? 'Нужна одна кость d20'
    : null

  useEffect(() => {
    if (advDisabled && advantage !== 'none') setAdvantage('none')
  }, [advDisabled, advantage])

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
  }

  function doRoll(expr?: string, mode?: AdvantageMode) {
    const expression = (expr ?? (formula.trim() || formulaFromPool(pool))).trim()
    const adv = mode ?? advantage
    const rolled = rollExpression(expression, adv)
    if (!rolled.ok) return
    const entry: DiceLogEntry = {
      id: newLogId(),
      at: Date.now(),
      expression: rolled.result.expression,
      advantageMode: rolled.result.advantageMode,
      total: rolled.result.total,
      dice: rolled.result.dice,
      modifierTotal: rolled.result.modifierTotal,
    }
    setLog((prev) => prependLogEntry(characterId, entry, prev))
    setExpandedId(entry.id)
  }

  function onClearLog() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    clearDiceLog(characterId)
    setLog([])
    setExpandedId(null)
    setConfirmClear(false)
  }

  void formulaTouched

  return (
    <Stack gap={12} className="dice-roller-panel">
      <div className="dice-roller-panel__dice" role="group" aria-label="Кости">
        {STANDARD_DICE.map((sides) => {
          const count = pool.counts[sides] ?? 0
          return (
            <button
              key={sides}
              type="button"
              className={`dice-roller-panel__die${count > 0 ? ' is-on' : ''}`}
              aria-label={`Добавить d${sides}`}
              title="Клик — добавить, удержание или «−» — убрать"
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
          )
        })}
      </div>

      <div className="dice-roller-panel__minus-row">
        {STANDARD_DICE.map((sides) => {
          const count = pool.counts[sides] ?? 0
          return (
            <button
              key={`m-${sides}`}
              type="button"
              className="dice-roller-panel__minus"
              disabled={count <= 0}
              aria-label={`Убрать d${sides}`}
              onClick={() => removeDie(sides)}
            >
              −
            </button>
          )
        })}
      </div>

      <Field label="Модификатор">
        <NumberInput
          value={pool.modifier}
          onValueChange={(v) => {
            syncFormulaFromPool({ ...pool, modifier: v ?? 0 })
          }}
          narrow
          size="sm"
          aria-label="Модификатор"
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
        className="dice-roller-panel__adv"
        role="group"
        aria-label="Преимущество и помеха"
      >
        <ToggleChip
          main="Преимущество"
          checked={advantage === 'advantage'}
          disabled={advDisabled}
          onChange={(on) => setAdvantage(on ? 'advantage' : 'none')}
          data-testid="dice-advantage"
        />
        <ToggleChip
          main="Помеха"
          checked={advantage === 'disadvantage'}
          disabled={advDisabled}
          onChange={(on) => setAdvantage(on ? 'disadvantage' : 'none')}
          data-testid="dice-disadvantage"
        />
      </div>
      {advHint ? (
        <Text tone="muted" className="dice-roller-panel__adv-hint">
          {advHint}
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

      <div className="dice-roller-panel__log-head">
        <Text as="h3">Мои броски</Text>
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
              expandedId === entry.id || (expandedId == null && index === 0)
            return (
              <li key={entry.id} className="dice-roller-panel__log-item">
                <button
                  type="button"
                  className="dice-roller-panel__log-summary"
                  aria-expanded={open}
                  onClick={() =>
                    setExpandedId(open && expandedId === entry.id ? '' : entry.id)
                  }
                >
                  <span className="dice-roller-panel__log-time">
                    {formatTime(entry.at)}
                  </span>
                  <span className="dice-roller-panel__log-expr">{entry.expression}</span>
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
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => doRoll(entry.expression, entry.advantageMode)}
                    >
                      Повторить
                    </Button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </Stack>
  )
}
