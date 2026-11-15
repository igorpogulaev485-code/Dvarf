import { useEffect, useState } from 'react'
import { Coachmark } from './Coachmark'
import { SCENE_INTRO } from './copy.ru'
import type { SceneIntroId } from './types'

const SCENE_ANCHOR: Record<SceneIntroId, string> = {
  explore: '.inventory-panel',
  social: '.text-panel',
  features: '.features-panel',
  companions: '.companions-panel',
}

type SceneIntroCardProps = {
  /** Current Play Desk scene. */
  mode: string
  /** Whether segment allows intros (dnd_new / product_new). */
  enabled: boolean
  /** Hide while the 5-step sheet tour (or ready bridge) is active. */
  blocked?: boolean
  seen: SceneIntroId[]
  /** Companions empty-state copy when the panel has no companions. */
  companionsEmpty?: boolean
  onDismiss: (id: SceneIntroId) => void
}

function asIntroId(mode: string): SceneIntroId | null {
  if (mode === 'explore' || mode === 'social' || mode === 'features' || mode === 'companions') {
    return mode
  }
  return null
}

export function SceneIntroCard({
  mode,
  enabled,
  blocked = false,
  seen,
  companionsEmpty = false,
  onDismiss,
}: SceneIntroCardProps) {
  const [armed, setArmed] = useState<SceneIntroId | null>(null)

  useEffect(() => {
    if (!enabled || blocked) {
      setArmed(null)
      return
    }
    const id = asIntroId(mode)
    if (!id || seen.includes(id)) {
      setArmed(null)
      return
    }
    // Settle scene layout before spotlight (tabs / bottom nav).
    const t = window.setTimeout(() => setArmed(id), 120)
    return () => window.clearTimeout(t)
  }, [mode, enabled, blocked, seen])

  if (!armed) return null

  const copy = SCENE_INTRO[armed]
  const body =
    armed === 'companions' && companionsEmpty && copy.bodyEmpty ? copy.bodyEmpty : copy.body

  return (
    <Coachmark
      open
      anchorSelector={SCENE_ANCHOR[armed]}
      title={copy.title}
      body={body}
      stepLabel="Что здесь"
      primaryLabel="Понятно"
      onPrimary={() => {
        onDismiss(armed)
        setArmed(null)
      }}
    />
  )
}
