import { formatModifier } from './sheetTypes'
import type { ConcentrationState } from './play'
import type { SheetResource } from '../../shared/dnd/rest'

type PlayDeskHotBarProps = {
  initiative: number
  inspiration: boolean
  exhaustion: number
  conditionNames: string[]
  concentration: ConcentrationState | null
  resources: SheetResource[]
  onToggleInspiration: () => void
  onClearConcentration?: () => void
  onResourceUsedChange: (id: string, used: number) => void
}

export function PlayDeskHotBar({
  initiative,
  inspiration,
  exhaustion,
  conditionNames,
  concentration,
  resources,
  onToggleInspiration,
  onClearConcentration,
  onResourceUsedChange,
}: PlayDeskHotBarProps) {
  const conditionsLabel =
    conditionNames.length > 0 ? conditionNames.join(', ') : 'нет'
  const hotResources = resources.filter((row) => row.max > 0 && row.name.trim())

  return (
    <div className="play-desk__hot" aria-label="Боевая полоса">
      <div className="play-desk__hot-item">
        <span>Иниц.</span>
        <b>{formatModifier(initiative)}</b>
      </div>
      <button
        type="button"
        className={`play-desk__hot-item play-desk__hot-item--btn${inspiration ? ' is-on' : ''}`}
        onClick={onToggleInspiration}
        aria-pressed={inspiration}
        title="Вдохновение"
      >
        <span>Вдохн.</span>
        <b>{inspiration ? 'да' : '—'}</b>
      </button>
      <div className={`play-desk__hot-item${exhaustion > 0 ? ' is-warn' : ''}`}>
        <span>Истощ.</span>
        <b>{exhaustion}</b>
      </div>
      <div className="play-desk__hot-item play-desk__hot-item--wide" title={conditionsLabel}>
        Состояния: {conditionsLabel}
      </div>
      <div className="play-desk__hot-item play-desk__hot-item--wide">
        {concentration ? (
          <>
            Концентрация: <strong>{concentration.name}</strong>
            {onClearConcentration ? (
              <button type="button" className="linkish" onClick={onClearConcentration}>
                снять
              </button>
            ) : null}
          </>
        ) : (
          <>Концентрация: —</>
        )}
      </div>
      {hotResources.map((row) => {
        const remaining = Math.max(0, row.max - row.used)
        return (
          <div key={row.id} className="play-desk__hot-item play-desk__hot-item--res">
            <span className="play-desk__hot-res-name" title={row.name}>
              {row.name}
            </span>
            <div className="play-desk__pips" role="group" aria-label={`${row.name}: ${remaining}/${row.max}`}>
              {Array.from({ length: row.max }, (_, index) => {
                const isOn = index < remaining
                return (
                  <button
                    key={`${row.id}-${index}`}
                    type="button"
                    className={`play-desk__pip${isOn ? ' is-on' : ''}`}
                    aria-label={
                      isOn
                        ? `${row.name}: потратить заряд ${index + 1}`
                        : `${row.name}: вернуть заряд ${index + 1}`
                    }
                    onClick={() => {
                      if (isOn) {
                        onResourceUsedChange(row.id, Math.min(row.max, row.used + 1))
                      } else {
                        onResourceUsedChange(row.id, Math.max(0, row.used - 1))
                      }
                    }}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
