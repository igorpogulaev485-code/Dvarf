import { conditionLevelLabel } from '../../shared/dnd/conditions'
import type { ConcentrationState } from './play'
import type { SheetResource } from '../../shared/dnd/rest'

type PlayDeskHotBarProps = {
  conditionNames: string[]
  exhaustion: number
  concentration: ConcentrationState | null
  resources: SheetResource[]
  onOpenConditions?: () => void
  onClearConcentration?: () => void
  onResourceUsedChange: (id: string, used: number) => void
}

/** Combat strip under modes: conditions, concentration, resource pips.
 * Initiative / inspiration / exhaustion live in PlayDeskHeader. */
export function PlayDeskHotBar({
  conditionNames,
  exhaustion,
  concentration,
  resources,
  onOpenConditions,
  onClearConcentration,
  onResourceUsedChange,
}: PlayDeskHotBarProps) {
  const exhaustionStage =
    exhaustion > 0 ? conditionLevelLabel('exhaustion', exhaustion) : null
  const parts = [
    ...conditionNames,
    exhaustion > 0
      ? exhaustionStage
        ? `Истощение ${exhaustion} (${exhaustionStage})`
        : `Истощение ${exhaustion}`
      : null,
  ].filter(Boolean) as string[]
  const conditionsLabel = parts.length > 0 ? parts.join(', ') : 'нет'
  const conditionsOn = parts.length > 0
  const hotResources = resources.filter((row) => row.max > 0 && row.name.trim())

  return (
    <div className="play-desk__hot" aria-label="Боевая полоса">
      <button
        type="button"
        className={`play-desk__hot-item play-desk__hot-item--wide play-desk__hot-item--btn${
          conditionsOn ? ' is-on' : ''
        }`}
        title="Нажми, чтобы изменить состояния"
        aria-pressed={conditionsOn}
        onClick={onOpenConditions}
      >
        Состояния: {conditionsLabel}
      </button>
      <div className="play-desk__hot-item play-desk__hot-item--wide">
        {concentration ? (
          <>
            Концентрация: <strong>{concentration.name}</strong>
            {onClearConcentration ? (
              <button type="button" className="linkish" onClick={onClearConcentration}>
                Снять
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
            <div
              className="play-desk__pips"
              role="group"
              aria-label={`${row.name}: ${remaining}/${row.max}`}
            >
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
