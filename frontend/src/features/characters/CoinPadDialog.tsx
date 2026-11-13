import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../ui'
import { acquireBodyScrollLock } from '../../ui/bodyScrollLock'
import { coinsToGp, formatGpTotal, type CoinPurse } from '../../shared/dnd/weight'
import {
  COIN_META,
  formatCoinApplyPreview,
  previewCoinApply,
  type CoinKey,
} from './coinPadPreview'

type CoinPadDialogProps = {
  open: boolean
  coins: CoinPurse
  onClose: () => void
  onChange: (coins: CoinPurse) => void
  onToast: (message: string) => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'] as const

export function CoinPadDialog({
  open,
  coins,
  onClose,
  onChange,
  onToast,
}: CoinPadDialogProps) {
  const [coin, setCoin] = useState<CoinKey>('gp')
  const [digits, setDigits] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetConfirmKey, setResetConfirmKey] = useState<CoinKey | null>(null)

  useEffect(() => {
    if (!open) return
    setDigits('')
    setCoin('gp')
    setResetOpen(false)
    setResetConfirmKey(null)
    const releaseScroll = acquireBodyScrollLock()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (resetConfirmKey) {
          setResetConfirmKey(null)
          return
        }
        if (resetOpen) {
          setResetOpen(false)
          return
        }
        onClose()
        return
      }
      if (resetOpen || resetConfirmKey) return
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
  }, [open, onClose, resetOpen, resetConfirmKey])

  const delta = digits === '' ? 0 : Number(digits)
  const canApply = delta > 0
  const totalGp = useMemo(() => coinsToGp(coins), [coins])
  const takePreview = useMemo(
    () => formatCoinApplyPreview(coins, coin, delta, 1),
    [coins, coin, delta],
  )
  const givePreview = useMemo(
    () => formatCoinApplyPreview(coins, coin, delta, -1),
    [coins, coin, delta],
  )
  const activeMeta = COIN_META.find((row) => row.key === coin)

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
    const { after, next } = previewCoinApply(coins, coin, delta, sign)
    onChange(next)
    const meta = COIN_META.find((row) => row.key === coin)
    onToast(
      sign > 0
        ? `+${delta} ${meta?.label ?? coin} · теперь ${after}`
        : `−${delta} ${meta?.label ?? coin} · теперь ${after}`,
    )
    setDigits('')
  }

  function confirmReset(key: CoinKey) {
    if (coins[key] <= 0) return
    onChange({ ...coins, [key]: 0 })
    const meta = COIN_META.find((row) => row.key === key)
    onToast(`${meta?.label ?? key} сброшено`)
    setResetConfirmKey(null)
    setResetOpen(false)
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
            Кошелёк
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
                <b>{row.label}</b>
                <em aria-hidden="true">({row.short})</em> {coins[row.key]}
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
                  {row.label} ({row.short}) · {coins[row.key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="number-pad__display" aria-live="polite">
          <span className="number-pad__display-value">{digits === '' ? '0' : String(delta)}</span>
          <span className="number-pad__display-hint">
            {activeMeta ? `${activeMeta.label} · взять / отдать` : 'введи число · взять / отдать'}
          </span>
        </div>

        {canApply ? (
          <div className="coin-pad__preview" aria-live="polite">
            <p>{takePreview}</p>
            {coins[coin] > 0 ? <p>{givePreview}</p> : null}
          </div>
        ) : null}

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

          <div className="coin-pad__danger">
            {!resetOpen ? (
              <button
                type="button"
                className="coin-pad__danger-toggle"
                onClick={() => {
                  setResetOpen(true)
                  setResetConfirmKey(null)
                }}
              >
                Сброс монеты…
              </button>
            ) : resetConfirmKey == null ? (
              <div className="coin-pad__reset-menu" role="group" aria-label="Сброс монеты">
                <p className="coin-pad__reset-hint">Обнулить одну монету (с подтверждением):</p>
                <div className="coin-pad__reset-list">
                  {COIN_META.map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      className="coin-pad__reset-item"
                      disabled={coins[row.key] <= 0}
                      onClick={() => setResetConfirmKey(row.key)}
                    >
                      {row.label} = 0
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="coin-pad__danger-toggle"
                  onClick={() => setResetOpen(false)}
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div className="coin-pad__reset-confirm" role="group" aria-label="Подтверждение сброса">
                <p>
                  Обнулить {COIN_META.find((row) => row.key === resetConfirmKey)?.label}? Сейчас{' '}
                  {coins[resetConfirmKey]}.
                </p>
                <div className="coin-pad__reset-confirm-actions">
                  <Button type="button" variant="secondary" onClick={() => setResetConfirmKey(null)}>
                    Отмена
                  </Button>
                  <Button type="button" variant="danger" onClick={() => confirmReset(resetConfirmKey)}>
                    Обнулить
                  </Button>
                </div>
              </div>
            )}
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
