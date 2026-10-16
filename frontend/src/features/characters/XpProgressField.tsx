import { useState } from 'react'
import { Button, NumberPadDialog, Text } from '../../ui'
import {
  formatXp,
  xpCrossedLevelThreshold,
  xpProgress,
  xpReadyToLevel,
  xpToReachLevel,
} from '../../shared/dnd/experience'
import type { XpHistoryEntry } from './playDeskUi'

type XpChangeMeta = { reason: string }

type XpProgressFieldProps = {
  xp: number
  level: number
  onChange: (xp: number, meta?: XpChangeMeta) => void
  /** Optional award log (Identity / desk pad parity). */
  xpHistory?: XpHistoryEntry[]
  /** When XP threshold is met — jump to LevelUpDialog. */
  onRequestLevelUp?: () => void
  levelUpDisabled?: boolean
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

/** XP band + NumberPad. Optional reason/history = full desk pad parity. */
export function XpProgressField({
  xp,
  level,
  onChange,
  xpHistory,
  onRequestLevelUp,
  levelUpDisabled = false,
}: XpProgressFieldProps) {
  const [padOpen, setPadOpen] = useState(false)
  const [xpReason, setXpReason] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const withHistory = xpHistory != null
  const progress = xpProgress(xp, level)
  const meta =
    progress.nextThreshold == null
      ? `${formatXp(progress.xp)} · макс.`
      : `${formatXp(progress.xp)} / ${formatXp(progress.nextThreshold)}`
  const readyForLevel =
    progress.nextThreshold != null && progress.remaining === 0 && progress.level < 20
  const hint =
    progress.nextThreshold == null
      ? 'Уровень 20 — дальше расти некуда'
      : readyForLevel
        ? `Порог ур. ${progress.level + 1} набран — можно +1 уровень`
        : `До ур. ${progress.level + 1}: ещё ${formatXp(progress.remaining ?? 0)}`

  const nextLevel = progress.level >= 20 ? null : progress.level + 1
  const floorLabel = formatXp(progress.floor)
  const nextLabel =
    progress.nextThreshold == null ? '—' : formatXp(progress.nextThreshold)

  function applyDelta(delta: number, sign: 1 | -1) {
    const prevXp = progress.xp
    const next =
      sign > 0 ? progress.xp + delta : Math.max(0, progress.xp - delta)
    const reason = xpReason.trim()
    onChange(next, withHistory ? { reason } : undefined)
    if (
      sign > 0 &&
      xpCrossedLevelThreshold(prevXp, next, level) &&
      onRequestLevelUp
    ) {
      setPadOpen(false)
      onRequestLevelUp()
    }
  }

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
      {readyForLevel && onRequestLevelUp ? (
        <button
          type="button"
          className="xp-progress__levelup"
          disabled={levelUpDisabled}
          onClick={onRequestLevelUp}
        >
          Повысить уровень ▸
        </button>
      ) : (
        <Text as="p" tone="muted" className="xp-progress__hint">
          {hint}
        </Text>
      )}

      <NumberPadDialog
        open={padOpen}
        title="Опыт"
        current={progress.xp}
        min={0}
        formatValue={formatXp}
        addLabel="Начислить"
        subtractLabel="Убавить"
        onClose={() => {
          setPadOpen(false)
          setHistoryOpen(false)
        }}
        onAdd={(delta) => applyDelta(delta, 1)}
        onSubtract={(delta) => applyDelta(delta, -1)}
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
            {withHistory ? (
              <>
                <label className="xp-pad-header__reason">
                  За что
                  <input
                    type="text"
                    value={xpReason}
                    placeholder="бой, квест, награда…"
                    onChange={(event) => setXpReason(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="linkish xp-pad-header__history-btn"
                  onClick={() => setHistoryOpen((open) => !open)}
                >
                  {historyOpen
                    ? 'Скрыть историю'
                    : `История (${xpHistory?.length ?? 0})`}
                </button>
                {historyOpen ? (
                  <ul className="xp-pad-header__history">
                    {(xpHistory?.length ?? 0) === 0 ? (
                      <li className="xp-pad-header__history-empty">Пока пусто</li>
                    ) : (
                      xpHistory!.slice(0, 12).map((row) => (
                        <li key={row.id}>
                          <strong>
                            {row.delta > 0 ? '+' : ''}
                            {formatXp(row.delta)}
                          </strong>
                          <span>{row.reason || 'без описания'}</span>
                          <time dateTime={row.at}>
                            {new Date(row.at).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
        }
      />
    </div>
  )
}
