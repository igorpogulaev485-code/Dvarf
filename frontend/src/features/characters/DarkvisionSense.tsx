import { DetailsMenu, Field, NumberInput } from '../../ui'

type DarkvisionSenseProps = {
  /** Base value stored on the sheet (identity / combat.darkvision). */
  baseFt: number
  /** Effective after features/gear (display). */
  effectiveFt: number
  onBaseChange: (next: number) => void
}

/**
 * LP-01: glance sense next to passives — edit base via kit DetailsMenu popover.
 * Storage unchanged: same field as former «Скорости и зрение» drawer.
 */
export function DarkvisionSense({
  baseFt,
  effectiveFt,
  onBaseChange,
}: DarkvisionSenseProps) {
  const shown = effectiveFt > 0 ? effectiveFt : 0
  const face = shown > 0 ? `${shown} фт` : '—'
  const tip =
    effectiveFt !== baseFt && baseFt > 0
      ? `база ${baseFt} · итого ${effectiveFt} фт`
      : shown > 0
        ? `Тёмное зрение ${shown} фт`
        : 'Тёмное зрение не задано'

  return (
    <div className="darkvision-sense">
      <DetailsMenu
        className="darkvision-sense__menu"
        summaryClassName="darkvision-sense__summary"
        panelClassName="darkvision-sense__panel"
        summary={
          <>
            <span className="darkvision-sense__label">Тёмное зрение</span>
            <strong className="darkvision-sense__value">{face}</strong>
          </>
        }
        title={tip}
        aria-label={`${tip}. Нажми — изменить`}
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
    </div>
  )
}
