import { NumberInput } from '../../ui'

type AltPatch = {
  climbSpeed?: number | null
  swimSpeed?: number | null
  flySpeed?: number | null
}

type SpeedModesMenuBodyProps = {
  /** Walk face value (already exhaustion-adjusted for display). */
  walkFt: number | null
  climbSpeed?: number | null
  swimSpeed?: number | null
  flySpeed?: number | null
  withoutExhaustionLine?: string | null
  speedExhaustNote?: string | null
  onAltSpeedChange?: (patch: AltPatch) => void
  onOpenBreakdown?: () => void
  /** Class on host `<details>` to close before opening breakdown. */
  hostDetailsClass: string
}

/** Shared +N / speed-tile popover body (phone VitalTileMenu + desktop speed face). */
export function SpeedModesMenuBody({
  walkFt,
  climbSpeed = null,
  swimSpeed = null,
  flySpeed = null,
  withoutExhaustionLine = null,
  speedExhaustNote = null,
  onAltSpeedChange,
  onOpenBreakdown,
  hostDetailsClass,
}: SpeedModesMenuBodyProps) {
  const rows = [
    {
      key: 'climb' as const,
      label: 'лазание',
      value: climbSpeed,
      patch: (n: number | null) => onAltSpeedChange?.({ climbSpeed: n }),
    },
    {
      key: 'swim' as const,
      label: 'плавание',
      value: swimSpeed,
      patch: (n: number | null) => onAltSpeedChange?.({ swimSpeed: n }),
    },
    {
      key: 'fly' as const,
      label: 'полёт',
      value: flySpeed,
      patch: (n: number | null) => onAltSpeedChange?.({ flySpeed: n }),
    },
  ]

  return (
    <>
      <ul className="ui-vital-menu__list" role="list">
        <li className="ui-vital-menu__row">
          <span className="ui-vital-menu__row-label">ходьба</span>
          <span className="ui-vital-menu__row-value">
            {walkFt == null ? '—' : `${walkFt} фт`}
          </span>
        </li>
        {rows.map((row) => (
          <li key={row.key} className="ui-vital-menu__row ui-vital-menu__row--edit">
            <span className="ui-vital-menu__row-label">{row.label}</span>
            {onAltSpeedChange ? (
              <NumberInput
                className="ui-vital-menu__input"
                size="sm"
                narrow
                min={0}
                emptyValue={null}
                value={row.value}
                onValueChange={(next) => row.patch(next)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`${row.label}, фт`}
                title="пусто = нет"
              />
            ) : (
              <span className="ui-vital-menu__row-value">
                {row.value == null ? '—' : `${row.value} фт`}
              </span>
            )}
          </li>
        ))}
      </ul>
      {withoutExhaustionLine ? (
        <p className="ui-vital-menu__note">{withoutExhaustionLine}</p>
      ) : null}
      {speedExhaustNote ? (
        <p className="ui-vital-menu__note">{speedExhaustNote}</p>
      ) : null}
      {onOpenBreakdown ? (
        <button
          type="button"
          className="ui-vital-menu__action"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            document
              .querySelectorAll(`details.${hostDetailsClass}[open]`)
              .forEach((el) => {
                if (el instanceof HTMLDetailsElement) el.open = false
              })
            onOpenBreakdown()
          }}
        >
          Разборка и бонусы
        </button>
      ) : null}
    </>
  )
}
