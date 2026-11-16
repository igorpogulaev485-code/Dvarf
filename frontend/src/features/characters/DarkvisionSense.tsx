import { DetailsMenu, Field, NumberInput } from '../../ui'

type DarkvisionSenseProps = {
  /** Base value stored on the sheet (identity / combat.darkvision). */
  baseFt: number
  /** Effective after features/gear (display). */
  effectiveFt: number
  onBaseChange: (next: number) => void
}

/**
 * LP-01: ТЗ tile in the passives row — same face as Внимат./Анализ/Прониц.
 * Edit base via kit DetailsMenu (storage unchanged). Hidden when no darkvision.
 */
export function DarkvisionSense({
  baseFt,
  effectiveFt,
  onBaseChange,
}: DarkvisionSenseProps) {
  const shown = Math.max(0, effectiveFt, baseFt)
  if (shown <= 0 && baseFt <= 0) return null

  const face = shown > 0 ? `${shown} фт` : '—'
  const tip =
    effectiveFt !== baseFt && baseFt > 0
      ? `Тёмное зрение: ${effectiveFt} фт (база ${baseFt})`
      : shown > 0
        ? `Тёмное зрение: ${shown} фт`
        : 'Тёмное зрение не задано'

  return (
    <DetailsMenu
      className="passive-card passive-card--sense passive-card--editable"
      summaryClassName="passive-card__sense-face"
      panelClassName="darkvision-sense__panel"
      summary={
        <>
          <span className="passive-card__label">ТЗ</span>
          <strong>{face}</strong>
        </>
      }
      title={tip}
      aria-label={tip}
    >
      <Field
        label="База, фт"
        htmlFor="darkvision-sense-input"
        hint={
          effectiveFt !== baseFt
            ? `Итого с умениями/предметами: ${effectiveFt} фт`
            : '0 = нет'
        }
      >
        <NumberInput
          id="darkvision-sense-input"
          min={0}
          emptyValue={0}
          value={baseFt}
          onValueChange={(next) => onBaseChange(next ?? 0)}
        />
      </Field>
    </DetailsMenu>
  )
}
