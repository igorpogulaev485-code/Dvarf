import { useEffect, useRef, useState } from 'react'

type ToastProps = {
  message: string | null
  onClose: () => void
  durationMs?: number
}

/** Dice / attack lines need longer; short status pings stay snappy. */
export function toastDurationFor(message: string | null | undefined): number {
  if (!message) return 4000
  if (/\bd20\b|урон\s|\(\d+d\d+/i.test(message)) return 10000
  if (message.length > 72) return 7000
  return 4500
}

export function Toast({ message, onClose, durationMs }: ToastProps) {
  const [paused, setPaused] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const resolvedMs = durationMs ?? toastDurationFor(message)

  useEffect(() => {
    setPaused(false)
  }, [message])

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
      className="ui-toast"
      role="status"
      aria-live="polite"
      title="Наведи — пауза · клик — закрыть"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onClick={() => onClose()}
    >
      {message}
    </div>
  )
}
