import { useEffect, useId, useRef, useState } from 'react'
import { Text } from '../../ui'
import { PANEL_HELP } from './copy.ru'
import type { OnboardingPanelId } from './types'

type PanelHelpButtonProps = {
  panelId: OnboardingPanelId
  className?: string
  /** Preview / tests: start with popover open. */
  forceOpen?: boolean
}

export function PanelHelpButton({
  panelId,
  className = '',
  forceOpen = false,
}: PanelHelpButtonProps) {
  const help = PANEL_HELP[panelId]
  const [open, setOpen] = useState(forceOpen)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const popoverId = useId()

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`onboarding-help ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="onboarding-help__btn"
        aria-label={`Справка: ${help.title}`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open ? (
        <div id={popoverId} className="onboarding-help__pop" role="dialog" aria-label={help.title}>
          <Text as="h3" className="onboarding-help__title">
            {help.title}
          </Text>
          <p className="onboarding-help__line">
            <strong>Что это.</strong> {help.what}
          </p>
          <p className="onboarding-help__line">
            <strong>Зачем.</strong> {help.why}
          </p>
          <p className="onboarding-help__line onboarding-help__line--muted">
            <strong>Если не знаешь.</strong> {help.ifUnsure}
          </p>
        </div>
      ) : null}
    </div>
  )
}
