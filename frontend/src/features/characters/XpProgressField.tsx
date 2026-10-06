import { NumberInput, Text } from '../../ui'
import { formatXp, xpProgress } from '../../shared/dnd/experience'

type XpProgressFieldProps = {
  xp: number
  level: number
  onChange: (xp: number) => void
}

export function XpProgressField({ xp, level, onChange }: XpProgressFieldProps) {
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

  return (
    <div className="xp-progress">
      <div className="xp-progress__row">
        <NumberInput
          id="sheet-xp"
          min={0}
          emptyValue={0}
          value={xp}
          aria-label="Очки опыта"
          onValueChange={(value) => onChange(value ?? 0)}
        />
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
    </div>
  )
}
