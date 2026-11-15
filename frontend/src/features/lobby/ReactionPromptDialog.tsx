import { useEffect, useRef, useState } from 'react'
import { Dialog, Stack, Text } from '../../ui'

const AUTO_SKIP_SECONDS = 10

type Props = {
  open: boolean
  busy?: boolean
  characterName: string
  hint?: string | null
  onDeclare: () => void
  onSkip: () => void
}

/**
 * S-04 / LOBBY-FIX A: окно после урона — объявить реакцию или «Нет реакции».
 * Автопропуск через ~10 с с видимым отсчётом, чтобы стол не зависал.
 */
export function ReactionPromptDialog({
  open,
  busy = false,
  characterName,
  hint,
  onDeclare,
  onSkip,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_SKIP_SECONDS)
  const onSkipRef = useRef(onSkip)
  onSkipRef.current = onSkip
  const skippedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setSecondsLeft(AUTO_SKIP_SECONDS)
      skippedRef.current = false
      return
    }
    setSecondsLeft(AUTO_SKIP_SECONDS)
    skippedRef.current = false
    const started = Date.now()
    const tick = window.setInterval(() => {
      const left = Math.max(
        0,
        AUTO_SKIP_SECONDS - Math.floor((Date.now() - started) / 1000),
      )
      setSecondsLeft(left)
      if (left <= 0 && !skippedRef.current) {
        skippedRef.current = true
        window.clearInterval(tick)
        onSkipRef.current()
      }
    }, 250)
    return () => window.clearInterval(tick)
  }, [open])

  return (
    <Dialog
      open={open}
      title="Есть ли реакция?"
      primaryLabel="Объявить реакцию"
      secondaryLabel="Нет реакции"
      busy={busy}
      onPrimary={onDeclare}
      onSecondary={onSkip}
    >
      <Stack gap={10}>
        <Text>
          {characterName}: {hint || 'Есть ли реакция на этот урон?'}
        </Text>
        <Text tone="muted">
          Нет реакции — автоматически через {secondsLeft} с. Щит и подобные — через эффекты на
          листе.
        </Text>
      </Stack>
    </Dialog>
  )
}
