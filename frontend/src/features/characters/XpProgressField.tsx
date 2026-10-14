import { useState } from 'react'
import { Button, NumberPadDialog, Text } from '../../ui'
import {
  formatXp,
  xpCrossedLevelThreshold,
  xpProgress,
  xpReadyToLevel,
  xpToReachLevel,
} from '../../shared/dnd/experience'

type XpProgressFieldProps = {
  xp: number
  level: number
  onChange: (xp: number) => void
  /** Opens the level-up dialog when the XP band is full. */
  onRequestLevelUp?: () => void
}

export function XpLevelOffer({
  nextLevel,
  onLevelUp,
}: {
  nextLevel: number
  onLevelUp: () => void
}) {
  return (
    <div className="xp-level-offer">
      <p className="xp-level-offer__text">Опыта хватает на уровень {nextLevel}.</p>
      <Button type="button" onClick={onLevelUp}>
        Повысить уровень
      </Button>
    </div>
  )
}

export function XpProgressField({
  xp,
  level,
  onChange,
  onRequestLevelUp,
}: XpProgressFieldProps) {
  const [padOpen, setPadOpen] = useState(false)
  const progress = xpProgress(xp, level)
  const meta =
    progress.nextThreshold == null
      ? `${formatXp(progress.xp)} · макс.`
      : `${formatXp(progress.xp)} / ${formatXp(progress.nextThreshold)}`
  const hint =
    progress.nextThreshold == null
      ? 'Уровень 20 — дальше расти некуда'
      : progress.remaining === 0
        ? `Порог ур. ${progress.level + 1} набран — можно +1 уровень`
        : `До ур. ${progress.level + 1}: ещё ${formatXp(progress.remaining ?? 0)}`

  const nextLevel = progress.level >= 20 ? null : progress.level + 1
  const floorLabel = formatXp(progress.floor)
  const nextLabel =
    progress.nextThreshold == null ? '—' : formatXp(progress.nextThreshold)

  return (
    <div className="xp-progress">
      <div className="xp-progress__row">
        <button
          type="button"
          className="xp-progress__open"
          aria-label={`Опыт ${formatXp(progress.xp)}. Открыть клавиатуру прибавить или отнять`}
          onClick={() => setPadOpen(true)}
        >
          <span className="xp-progress__open-value">{formatXp(progress.xp)}</span>
          <span className="xp-progress__open-action">± выданные</span>
        </button>
        <span className="xp-progress__meta">{meta}</span>
      </div>
      <div
        className="xp-progress__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.ratio * 100)}
        aria-label="Прогресс опыта до следующего уровня"
      >
        <div className="xp-progress__fill" style={{ width: `${progress.ratio * 100}%` }} />
      </div>
      <Text as="p" tone="muted" className="xp-progress__hint">
        {hint}
      </Text>

      <NumberPadDialog
        open={padOpen}
        title="Опыт"
        current={progress.xp}
        min={0}
        formatValue={formatXp}
        onClose={() => setPadOpen(false)}
        header={
          <div className="xp-pad-header">
            <div className="xp-pad-header__ends">
              <div className="xp-pad-header__end">
                <strong>{progress.level}</strong>
                <span>{floorLabel}</span>
              </div>
              <div className="xp-pad-header__end xp-pad-header__end--right">
                <strong>{nextLevel ?? '20'}</strong>
                <span>{nextLabel}</span>
              </div>
            </div>
            <div
              className="xp-progress__bar xp-pad-header__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress.ratio * 100)}
              aria-label="Прогресс опыта"
            >
              <div className="xp-progress__fill" style={{ width: `${progress.ratio * 100}%` }} />
            </div>
            <p className="xp-pad-header__current">
              сейчас {formatXp(progress.xp)}
              {progress.nextThreshold != null
                ? ` · порог ${formatXp(xpToReachLevel(progress.level + 1))}`
                : ''}
            </p>
            {xpReadyToLevel(progress.xp, progress.level) && nextLevel != null ? (
              <XpLevelOffer
                nextLevel={nextLevel}
                onLevelUp={() => {
                  setPadOpen(false)
                  onRequestLevelUp?.()
                }}
              />
            ) : null}
          </div>
        }
        onAdd={(delta) => {
          const next = progress.xp + delta
          onChange(next)
          if (xpCrossedLevelThreshold(progress.xp, next, level)) {
            onRequestLevelUp?.()
          }
        }}
        onSubtract={(delta) => onChange(Math.max(0, progress.xp - delta))}
      />
    </div>
  )
}
