import { useState } from 'react'
import { Button, NumberPadDialog, Text } from '../../ui'
import { formatXp, xpProgress, xpToReachLevel } from '../../shared/dnd/experience'

type XpProgressFieldProps = {
  xp: number
  level: number
  onChange: (xp: number) => void
  /** Open level-up / прокачка when XP threshold is met (or user asks). */
  onRequestLevelUp?: () => void
  levelUpDisabled?: boolean
}

export function XpProgressField({
  xp,
  level,
  onChange,
  onRequestLevelUp,
  levelUpDisabled = false,
}: XpProgressFieldProps) {
  const [padOpen, setPadOpen] = useState(false)
  const progress = xpProgress(xp, level)
  const readyToLevel =
    progress.nextThreshold != null && progress.remaining === 0 && !levelUpDisabled
  const meta =
    progress.nextThreshold == null
      ? `${formatXp(progress.xp)} · макс.`
      : `${formatXp(progress.xp)} / ${formatXp(progress.nextThreshold)}`
  const hint = (() => {
    if (progress.nextThreshold == null) return 'Уровень 20 — дальше расти некуда'
    if (readyToLevel) {
      return `Порог ур. ${progress.level + 1} набран — жми «Повысить уровень»`
    }
    return `До порога ур. ${progress.level + 1}: ещё ${formatXp(progress.remaining ?? 0)}. XP — учёт; прокачка — отдельной кнопкой.`
  })()

  const nextLevel = progress.level >= 20 ? null : progress.level + 1
  const floorLabel = formatXp(progress.floor)
  const nextLabel =
    progress.nextThreshold == null ? '—' : formatXp(progress.nextThreshold)

  function applyAdd(delta: number) {
    const nextXp = progress.xp + delta
    onChange(nextXp)
    setPadOpen(false)
    if (
      onRequestLevelUp &&
      !levelUpDisabled &&
      progress.nextThreshold != null &&
      progress.xp < progress.nextThreshold &&
      nextXp >= progress.nextThreshold
    ) {
      onRequestLevelUp()
    }
  }

  return (
    <div className={`xp-progress${readyToLevel ? ' xp-progress--ready' : ''}`}>
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
      {readyToLevel && onRequestLevelUp ? (
        <Button type="button" className="xp-progress__level-up" onClick={onRequestLevelUp}>
          Повысить уровень →
        </Button>
      ) : null}

      <NumberPadDialog
        open={padOpen}
        title="Опыт"
        current={progress.xp}
        min={0}
        formatValue={formatXp}
        onClose={() => setPadOpen(false)}
        onAdd={applyAdd}
        onSubtract={(delta) => {
          onChange(Math.max(0, progress.xp - delta))
          setPadOpen(false)
        }}
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
            <p className="xp-pad-header__note">
              Сюда только XP от мастера. Сама прокачка — кнопкой «Прокачать» / «Повысить уровень».
            </p>
            {readyToLevel && onRequestLevelUp ? (
              <Button
                type="button"
                className="xp-progress__level-up"
                onClick={() => {
                  setPadOpen(false)
                  onRequestLevelUp()
                }}
              >
                Повысить уровень →
              </Button>
            ) : null}
          </div>
        }
      />
    </div>
  )
}
