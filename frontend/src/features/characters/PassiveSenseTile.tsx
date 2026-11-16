type PassiveSenseTileProps = {
  /** Short label on the tile (СЗ / ИЗ / ЧВ). */
  short: string
  /** Full Russian name for tooltip. */
  full: string
  /** Range in feet. */
  ft: number
}

/**
 * Non-editable sense glance in the passives row (same face as Внимат./ТЗ).
 * Hover / focus / tap: native title + aria-label.
 */
export function PassiveSenseTile({ short, full, ft }: PassiveSenseTileProps) {
  const tip = `${full}: ${ft} фт`
  return (
    <button
      type="button"
      className="passive-card passive-card--sense"
      title={tip}
      aria-label={tip}
    >
      <span className="passive-card__label">{short}</span>
      <strong>{ft} фт</strong>
    </button>
  )
}
