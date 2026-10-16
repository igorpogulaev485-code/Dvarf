import { useEffect, useState, type ReactNode } from 'react'
import { Button } from './Button'

type NumberPadDialogProps = {
  open: boolean
  title: string
  /** Shown above the keypad (e.g. XP progress). */
  header?: ReactNode
  /** Current stored value — used only for context text if needed. */
  current: number
  min?: number
  /** Optional ceiling for add (e.g. current HP ≤ max HP). */
  max?: number
  onClose: () => void
  onAdd: (delta: number) => void
  onSubtract: (delta: number) => void
  addLabel?: string
  subtractLabel?: string
  formatValue?: (n: number) => string
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'] as const

export function NumberPadDialog({
  open,
  title,
  header,
  current,
  min = 0,
  max,
  onClose,
  onAdd,
  onSubtract,
  addLabel = 'Прибавить',
  subtractLabel = 'Отнять',
  formatValue = (n) => String(n),
}: NumberPadDialogProps) {
  const [digits, setDigits] = useState('')

  useEffect(() => {
    if (!open) return
    setDigits('')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

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
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  const delta = digits === '' ? 0 : Number(digits)
  const canApply = delta > 0
  const uncappedAdd = current + delta
  const previewAdd = max == null ? uncappedAdd : Math.min(max, uncappedAdd)
  const previewSub = Math.max(min, current - delta)
  const addDisabled = !canApply || (max != null && current >= max)

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

  return (
    <div
      className="ui-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="ui-dialog ui-dialog--pad"
        role="dialog"
        aria-modal="true"
        aria-labelledby="number-pad-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="number-pad__head">
          <h2 id="number-pad-title" className="ui-text ui-dialog__title">
            {title}
          </h2>
          <button type="button" className="number-pad__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {header ? <div className="number-pad__header">{header}</div> : null}

        <div className="number-pad__display" aria-live="polite">
          <span className="number-pad__display-value">
            {digits === '' ? '0' : formatValue(delta)}
          </span>
          <span className="number-pad__display-hint">
            сейчас {formatValue(current)}
            {canApply
              ? ` · + → ${formatValue(previewAdd)} · − → ${formatValue(previewSub)}`
              : ''}
          </span>
        </div>

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

        <div className="number-pad__actions">
          <Button
            type="button"
            disabled={addDisabled}
            onClick={() => {
              onAdd(delta)
              onClose()
            }}
          >
            {addLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!canApply || current <= min}
            onClick={() => {
              onSubtract(delta)
              onClose()
            }}
          >
            {subtractLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
