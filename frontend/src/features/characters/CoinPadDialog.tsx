import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../ui'
import { acquireBodyScrollLock } from '../../ui/bodyScrollLock'
import { coinsToGp, formatGpTotal, type CoinPurse } from '../../shared/dnd/weight'

type CoinKey = keyof CoinPurse

type CoinPadDialogProps = {
  open: boolean
  coins: CoinPurse
  onClose: () => void
  onChange: (coins: CoinPurse) => void
  onToast: (message: string) => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'] as const

const COIN_META: Array<{ key: CoinKey; label: string; short: string }> = [
  { key: 'gp', label: 'Золото', short: 'З' },
  { key: 'sp', label: 'Серебро', short: 'С' },
  { key: 'cp', label: 'Медь', short: 'М' },
  { key: 'pp', label: 'Платина', short: 'П' },
  { key: 'ep', label: 'Электрум', short: 'Э' },
]

export function CoinPadDialog({
  open,
  coins,
  onClose,
  onChange,
  onToast,
}: CoinPadDialogProps) {
  const [coin, setCoin] = useState<CoinKey>('gp')
  const [digits, setDigits] = useState('')

  useEffect(() => {
    if (!open) return
    setDigits('')
    setCoin('gp')
    const releaseScroll = acquireBodyScrollLock()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault()
        setDigits((prev) => (prev + event.key).replace(/^0+(?=\d)/, '').slice(0, 8))
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        setDigits((prev) => prev.slice(0, -1))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      releaseScroll()
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const delta = digits === '' ? 0 : Number(digits)
  const canApply = delta > 0
  const totalGp = useMemo(() => coinsToGp(coins), [coins])

  function press(key: (typeof KEYS)[number]) {
    if (key === 'C') {
      setDigits('')
      return
    }
    if (key === '⌫') {
      setDigits((prev) => prev.slice(0, -1))
      return
    }
    setDigits((prev) => (prev + key).replace(/^0+(?=\d)/, '').slice(0, 8))
  }

  function apply(sign: 1 | -1) {
    if (!canApply) return
    const next = Math.max(0, coins[coin] + sign * delta)
    onChange({ ...coins, [coin]: next })
    const meta = COIN_META.find((row) => row.key === coin)
    onToast(
      sign > 0
        ? `+${delta} ${meta?.label ?? coin} · теперь ${next}`
        : `−${delta} ${meta?.label ?? coin} · теперь ${next}`,
    )
    setDigits('')
  }

  if (!open) return null

  return createPortal(
    <div
      className="ui-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="ui-dialog ui-dialog--pad coin-pad"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coin-pad-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="number-pad__head">
          <h2 id="coin-pad-title" className="ui-text ui-dialog__title">
            Монеты
          </h2>
          <button type="button" className="number-pad__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="coin-pad__summary">
          <strong>Всего в золоте: {formatGpTotal(totalGp)}</strong>
          <div className="coin-pad__balances">
            {COIN_META.map((row) => (
              <span key={row.key} className={coin === row.key ? 'is-on' : ''}>
                <b>{row.short}</b> {coins[row.key]}
              </span>
            ))}
          </div>
        </div>

        <div className="coin-pad__select">
          <label>
            Монета
            <select
              className="play-select"
              value={coin}
              onChange={(event) => setCoin(event.target.value as CoinKey)}
            >
              {COIN_META.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.short} · {row.label} ({coins[row.key]})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="number-pad__display" aria-live="polite">
          <span className="number-pad__display-value">{digits === '' ? '0' : String(delta)}</span>
          <span className="number-pad__display-hint">введи число · взять / отдать</span>
        </div>

        <div className="coin-pad__body">
          <div className="number-pad__keys" role="group" aria-label="Цифровая клавиатура">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`number-pad__key${key === 'C' || key === '⌫' ? ' number-pad__key--meta' : ''}`}
                onClick={() => press(key)}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="coin-pad__zeros">
            {COIN_META.map((row) => (
              <button
                key={row.key}
                type="button"
                className="coin-pad__zero"
                disabled={coins[row.key] <= 0}
                title={`${row.label} = 0`}
                onClick={() => {
                  if (coins[row.key] <= 0) return
                  onChange({ ...coins, [row.key]: 0 })
                  onToast(`${row.label} сброшено`)
                }}
              >
                {row.short}=0
              </button>
            ))}
          </div>
        </div>

        <div className="number-pad__actions">
          <Button type="button" variant="danger" disabled={!canApply || coins[coin] <= 0} onClick={() => apply(-1)}>
            Отдать
          </Button>
          <Button type="button" disabled={!canApply} onClick={() => apply(1)}>
            Взять
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
