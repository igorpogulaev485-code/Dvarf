import { useEffect, useRef, useState } from 'react'

/** Rich toast: string callers stay valid; action enables Undo etc. */
export type ToastPayload = {
  message: string
  durationMs?: number
  actionLabel?: string
  onAction?: () => void
}

export type ToastInput = string | ToastPayload

type ToastProps = {
  message: string | null
  onClose: () => void
  durationMs?: number
  actionLabel?: string
  onAction?: () => void
}

export function toastMessageOf(input: ToastInput | null | undefined): string | null {
  if (input == null) return null
  return typeof input === 'string' ? input : input.message
}

export function normalizeToast(input: ToastInput): ToastPayload {
  return typeof input === 'string' ? { message: input } : input
}

/** Dice / attack lines need longer; action toasts (Undo) stay visible longer. */
export function toastDurationFor(
  message: string | null | undefined,
  options?: { hasAction?: boolean },
): number {
  if (!message) return 4000
  if (options?.hasAction) return 8000
  if (/\bd20\b|урон\s|\(\d+d\d+/i.test(message)) return 10000
  if (message.length > 72) return 7000
  return 4500
}

export function Toast({
  message,
  onClose,
  durationMs,
  actionLabel,
  onAction,
}: ToastProps) {
  const [paused, setPaused] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const hasAction = Boolean(actionLabel && onAction)
  const resolvedMs =
    durationMs ?? toastDurationFor(message, { hasAction })

  useEffect(() => {
    setPaused(false)
  }, [message, actionLabel])

  useEffect(() => {
    if (!message || paused) {
      return
    }
    const timer = window.setTimeout(() => onCloseRef.current(), resolvedMs)
    return () => window.clearTimeout(timer)
  }, [message, resolvedMs, paused])

  if (!message) {
    return null
  }

  return (
    <div
      className={`ui-toast${hasAction ? ' ui-toast--with-action' : ''}`}
      role="status"
      aria-live="polite"
      title={
        hasAction
          ? 'Наведи — пауза · клик по тексту — закрыть'
          : 'Наведи — пауза · клик — закрыть'
      }
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onClick={() => onClose()}
    >
      <span className="ui-toast__text">{message}</span>
      {hasAction ? (
        <button
          type="button"
          className="ui-toast__action"
          onClick={(event) => {
            event.stopPropagation()
            onAction?.()
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
