import { useEffect } from 'react'

type ToastProps = {
  message: string | null
  onClose: () => void
  durationMs?: number
}

export function Toast({ message, onClose, durationMs = 2800 }: ToastProps) {
  useEffect(() => {
    if (!message) {
      return
    }
    const timer = window.setTimeout(onClose, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, durationMs, onClose])

  if (!message) {
    return null
  }

  return (
    <div className="ui-toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
