import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button, Stack, Text } from '../../ui'
import { acquireBodyScrollLock } from '../../ui/bodyScrollLock'
import { HELP_DRAWER, PANEL_HELP, TERMS } from './copy.ru'
import type { OnboardingPanelId } from './types'

const PANEL_ORDER: OnboardingPanelId[] = [
  'combat_header',
  'desk_modes',
  'abilities',
  'skills',
  'attacks',
  'spells',
  'inventory',
  'identity',
  'conditions',
  'rest',
  'text_blocks',
  'companions',
  'features',
  'classic',
]

type HelpDrawerProps = {
  open: boolean
  onClose: () => void
  onRestartTips?: () => void
}

export function HelpDrawer({ open, onClose, onRestartTips }: HelpDrawerProps) {
  useEffect(() => {
    if (!open) return
    const release = acquireBodyScrollLock()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      release()
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="onboarding-drawer-root" role="presentation">
      <button
        type="button"
        className="onboarding-drawer__backdrop"
        aria-label="Закрыть справку"
        onClick={onClose}
      />
      <aside
        className="onboarding-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-help-drawer-title"
      >
        <header className="onboarding-drawer__header">
          <h2 id="onboarding-help-drawer-title" className="ui-text">
            {HELP_DRAWER.title}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            {HELP_DRAWER.close}
          </Button>
        </header>
        <div className="onboarding-drawer__body">
          <Stack gap={16}>
            {onRestartTips ? (
              <section className="onboarding-drawer__restart">
                <Button
                  type="button"
                  onClick={() => {
                    onRestartTips()
                    onClose()
                  }}
                >
                  {HELP_DRAWER.restartTips}
                </Button>
                <Text tone="muted" className="onboarding-drawer__muted">
                  {HELP_DRAWER.restartTipsHint}
                </Text>
              </section>
            ) : null}

            <section>
              <Text as="h3" className="onboarding-drawer__section">
                {HELP_DRAWER.mapTitle}
              </Text>
              <ul className="onboarding-drawer__list">
                {HELP_DRAWER.map.map((row) => (
                  <li key={row.label}>
                    <strong>{row.label}.</strong> {row.text}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <Text as="h3" className="onboarding-drawer__section">
                {HELP_DRAWER.knowledgeTitle}
              </Text>
              <ul className="onboarding-drawer__list onboarding-drawer__knowledge">
                {HELP_DRAWER.knowledge.map((row) => (
                  <li key={row.id}>
                    {row.status === 'anchor' && 'href' in row && row.href ? (
                      <a href={row.href} className="onboarding-drawer__knowledge-link">
                        {row.label}
                      </a>
                    ) : (
                      <>
                        <span>{row.label}</span>{' '}
                        <span className="onboarding-drawer__soon">скоро</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section id="onboarding-help-panels">
              <Text as="h3" className="onboarding-drawer__section">
                Блоки листа
              </Text>
              <ul className="onboarding-drawer__list">
                {PANEL_ORDER.map((id) => {
                  const card = PANEL_HELP[id]
                  return (
                    <li key={id}>
                      <strong>{card.title}.</strong> {card.what}{' '}
                      <span className="onboarding-drawer__muted">{card.why}</span>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section id="onboarding-help-terms">
              <Text as="h3" className="onboarding-drawer__section">
                {HELP_DRAWER.termsTitle}
              </Text>
              <ul className="onboarding-drawer__list">
                {TERMS.map((row) => (
                  <li key={row.term}>
                    <strong>{row.term}.</strong> {row.meaning}
                  </li>
                ))}
              </ul>
            </section>
          </Stack>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
