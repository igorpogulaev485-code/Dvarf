import { useEffect, useId, useRef, useState } from 'react'
import { conditionLevelLabel } from '../../shared/dnd/conditions'
import type { ConcentrationState } from './play'
import { resourceShowsOnHot, type SheetResource } from '../../shared/dnd/rest'
import { shouldUseCompactResourceTrack } from '../../ui/resourceTrackDisplay'
import {
  IconConcentration,
  IconConditions,
  IconPouch,
} from './deskIcons'

/** How many resource chips stay visible before «Ещё» (conditions + concentration always pin). */
const HOT_PINNED_RESOURCE_COUNT = 3

type PlayDeskHotBarProps = {
  conditionNames: string[]
  exhaustion: number
  concentration: ConcentrationState | null
  resources: SheetResource[]
  onOpenConditions?: () => void
  onClearConcentration?: () => void
  onResourceUsedChange: (id: string, used: number) => void
}

function ResourceChip({
  row,
  onResourceUsedChange,
}: {
  row: SheetResource
  onResourceUsedChange: (id: string, used: number) => void
}) {
  const remaining = Math.max(0, row.max - row.used)
  const compact = shouldUseCompactResourceTrack(row.max)
  return (
    <div
      className={`play-desk__hot-item play-desk__hot-item--res${
        compact ? ' play-desk__hot-item--res-compact' : ''
      }`}
    >
      <span className="play-desk__hot-res-head">
        <IconPouch className="play-desk__hot-icon" />
        <span className="play-desk__hot-res-name" title={row.name}>
          {row.name}
        </span>
      </span>
      {compact ? (
        <div
          className="play-desk__stepper"
          role="group"
          aria-label={`${row.name}: ${remaining}/${row.max}`}
        >
          <button
            type="button"
            className="play-desk__step"
            disabled={remaining <= 0}
            aria-label={`${row.name}: потратить 1`}
            onClick={() =>
              onResourceUsedChange(row.id, Math.min(row.max, row.used + 1))
            }
          >
            −
          </button>
          <span className="play-desk__stepper-value">
            {remaining}
            <span className="play-desk__stepper-max">/{row.max}</span>
          </span>
          <button
            type="button"
            className="play-desk__step"
            disabled={row.used <= 0}
            aria-label={`${row.name}: вернуть 1`}
            onClick={() =>
              onResourceUsedChange(row.id, Math.max(0, row.used - 1))
            }
          >
            +
          </button>
        </div>
      ) : (
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
      )}
    </div>
  )
}

/** Combat strip under modes: conditions, concentration, resource pips.
 * Initiative / inspiration / exhaustion / rest live in PlayDeskHeader. */
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
  const hotResources = resources.filter(resourceShowsOnHot)
  const pinnedResources = hotResources.slice(0, HOT_PINNED_RESOURCE_COUNT)
  const overflowResources = hotResources.slice(HOT_PINNED_RESOURCE_COUNT)
  const concOn = Boolean(concentration)
  const moreId = useId()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!moreOpen) return
    function onDocPointer(event: MouseEvent) {
      const root = moreWrapRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setMoreOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

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
        <IconConditions className="play-desk__hot-icon" />
        <span className="play-desk__hot-label">
          Состояния: {conditionsLabel}
        </span>
      </button>
      <div
        className={`play-desk__hot-item play-desk__hot-item--wide${
          concOn ? ' is-on' : ''
        }`}
      >
        <IconConcentration className="play-desk__hot-icon" />
        {concentration ? (
          <>
            <span className="play-desk__hot-label">
              Концентрация: <strong>{concentration.name}</strong>
            </span>
            {onClearConcentration ? (
              <button type="button" className="linkish" onClick={onClearConcentration}>
                Снять
              </button>
            ) : null}
          </>
        ) : (
          <span className="play-desk__hot-label">Концентрация: —</span>
        )}
      </div>
      {pinnedResources.map((row) => (
        <ResourceChip
          key={row.id}
          row={row}
          onResourceUsedChange={onResourceUsedChange}
        />
      ))}
      {overflowResources.length > 0 ? (
        <div className="play-desk__hot-more" ref={moreWrapRef}>
          <button
            type="button"
            className={`play-desk__hot-item play-desk__hot-item--btn play-desk__hot-more-btn${
              moreOpen ? ' is-on' : ''
            }`}
            aria-expanded={moreOpen}
            aria-controls={moreId}
            title="Остальные ресурсы"
            onClick={() => setMoreOpen((open) => !open)}
          >
            Ещё {overflowResources.length}
          </button>
          {moreOpen ? (
            <div
              id={moreId}
              className="play-desk__hot-more-panel"
              role="region"
              aria-label="Остальные ресурсы"
            >
              {overflowResources.map((row) => (
                <ResourceChip
                  key={row.id}
                  row={row}
                  onResourceUsedChange={onResourceUsedChange}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
