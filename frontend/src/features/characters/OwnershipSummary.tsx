import type { KeyboardEvent, MouseEvent } from 'react'
import { DetailsMenu } from '../../ui'
import {
  ARMOR_PROF_OPTIONS,
  WEAPON_PROF_OPTIONS,
  type ArmorProficiency,
  type WeaponProficiency,
} from './identity'

const VISIBLE_MAX = 3

type OwnershipSummaryProps = {
  armor: ArmorProficiency
  weapons: WeaponProficiency
  tools: string[]
  languages: string[]
  onOpen: () => void
}

function ChipRow({
  label,
  chips,
}: {
  label: string
  chips: string[]
}) {
  if (chips.length === 0) {
    return (
      <div className="ownership-summary__row">
        <span className="ownership-summary__label">{label}</span>
        <span className="ownership-summary__empty">—</span>
      </div>
    )
  }

  const shown = chips.slice(0, VISIBLE_MAX)
  const overflow = chips.slice(VISIBLE_MAX)

  return (
    <div className="ownership-summary__row">
      <span className="ownership-summary__label">{label}</span>
      <div className="ownership-summary__chips">
        {shown.map((chip) => (
          <span key={chip} className="ownership-summary__chip">
            {chip}
          </span>
        ))}
        {overflow.length > 0 ? (
          <span
            className="ownership-summary__more-wrap"
            onClick={(event: MouseEvent) => event.stopPropagation()}
            onKeyDown={(event: KeyboardEvent) => event.stopPropagation()}
          >
            <DetailsMenu
              className="ownership-summary__more"
              summaryClassName="ownership-summary__more-btn"
              panelClassName="ownership-summary__more-panel"
              summary={`+${overflow.length}`}
            >
              <ul className="ownership-summary__more-list">
                {overflow.map((chip) => (
                  <li key={chip}>{chip}</li>
                ))}
              </ul>
            </DetailsMenu>
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** Compact owned-proficiencies glance under passives (LP-01). Click opens editor. */
export function OwnershipSummary({
  armor,
  weapons,
  tools,
  languages,
  onOpen,
}: OwnershipSummaryProps) {
  const armorChips = ARMOR_PROF_OPTIONS.filter((o) => armor[o.key]).map((o) => o.label)
  const weaponChips = [
    ...WEAPON_PROF_OPTIONS.filter((o) => weapons[o.key]).map((o) => o.label),
    ...(weapons.extras ?? []).map((name) => name.trim()).filter(Boolean),
  ]
  const rows = [
    { id: 'armor', label: 'Доспехи', chips: armorChips },
    { id: 'weapons', label: 'Оружие', chips: weaponChips },
    { id: 'tools', label: 'Инструменты', chips: tools.map((t) => t.trim()).filter(Boolean) },
    {
      id: 'languages',
      label: 'Языки',
      chips: languages.map((t) => t.trim()).filter(Boolean),
    },
  ]

  function onBodyKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <section className="ownership-summary" aria-label="Владения">
      <div className="ownership-summary__head">
        <button
          type="button"
          className="ownership-summary__open"
          onClick={onOpen}
          title="Открыть владения и чувства"
        >
          <span className="ownership-summary__title">Владения</span>
          <span className="ownership-summary__cta" aria-hidden="true">
            ▸
          </span>
        </button>
      </div>
      <div
        className="ownership-summary__body"
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={onBodyKey}
        aria-label="Открыть редактор владений"
      >
        {rows.map((row) => (
          <ChipRow key={row.id} label={row.label} chips={row.chips} />
        ))}
      </div>
    </section>
  )
}
