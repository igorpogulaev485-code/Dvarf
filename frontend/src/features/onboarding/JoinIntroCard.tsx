import { useEffect, useState } from 'react'
import { hasVisibleOnboardingAnchor } from './anchors'
import { Coachmark } from './Coachmark'
import { JOIN_INTRO } from './copy.ru'

type JoinIntroCardProps = {
  /** Segment allows intros (dnd_new / product_new) and not yet dismissed. */
  enabled: boolean
  onDismiss: () => void
}

/** One-shot «что здесь» on /join — not a multi-step tour. */
export function JoinIntroCard({ enabled, onDismiss }: JoinIntroCardProps) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setArmed(false)
      return
    }
    const t = window.setTimeout(() => {
      if (hasVisibleOnboardingAnchor('lobby-join')) setArmed(true)
    }, 120)
    return () => window.clearTimeout(t)
  }, [enabled])

  if (!armed || !enabled) return null

  return (
    <Coachmark
      open
      anchorSelector='[data-onboarding="lobby-join"]'
      title={JOIN_INTRO.title}
      body={JOIN_INTRO.body}
      stepLabel="Что здесь"
      primaryLabel="Понятно"
      placement="below-start"
      onPrimary={() => {
        onDismiss()
        setArmed(false)
      }}
    />
  )
}
