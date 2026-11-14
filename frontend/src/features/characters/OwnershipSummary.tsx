import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { DetailsMenu } from '../../ui'
import {
  ARMOR_PROF_OPTIONS,
  WEAPON_PROF_OPTIONS,
  type ArmorProficiency,
  type WeaponProficiency,
} from './identity'

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
  const chipsRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(chips.length)

  useLayoutEffect(() => {
    const root = chipsRef.current
    if (!root || chips.length === 0) {
      setVisibleCount(chips.length)
      return
    }

    const measure = () => {
      const chipEls = [
        ...root.querySelectorAll<HTMLElement>('[data-own-chip]'),
      ]
      const moreEl = root.querySelector<HTMLElement>('[data-own-more]')
      if (chipEls.length === 0) {
        setVisibleCount(0)
        return
      }

      // Reveal everything for a clean geometry pass.
      chipEls.forEach((el) => {
        el.style.display = ''
      })
      if (moreEl) moreEl.style.display = 'none'

      const firstTop = chipEls[0].offsetTop
      const rowH = Math.max(chipEls[0].offsetHeight, 1)
      const maxBottom = firstTop + rowH * 2 + 6

      let fit = chipEls.length
      for (let i = 0; i < chipEls.length; i += 1) {
        if (chipEls[i].offsetTop + chipEls[i].offsetHeight > maxBottom + 1) {
          fit = i
          break
        }
      }

      if (fit >= chips.length) {
        setVisibleCount(chips.length)
        return
      }

      // Need +N — shrink until the badge stays inside two rows.
      if (!moreEl) {
        setVisibleCount(fit)
        return
      }
      moreEl.style.display = ''
      let next = Math.max(0, fit)
      while (next > 0) {
        for (let i = 0; i < chipEls.length; i += 1) {
          chipEls[i].style.display = i < next ? '' : 'none'
        }
        // Update +N label text for width; React will sync on setState.
        const badge = moreEl.querySelector('.ownership-summary__more-btn')
        if (badge) badge.textContent = `+${chips.length - next}`
        if (moreEl.offsetTop + moreEl.offsetHeight <= maxBottom + 1) break
        next -= 1
      }
      setVisibleCount(next)
    }

    measure()
    const ro = new ResizeObserver(() => measure())
    ro.observe(root)
    return () => ro.disconnect()
  }, [chips])

  if (chips.length === 0) {
    return (
      <div className="ownership-summary__row">
        <span className="ownership-summary__label">{label}</span>
        <span className="ownership-summary__empty">—</span>
      </div>
    )
  }

  const overflow = chips.slice(visibleCount)

  return (
    <div className="ownership-summary__row">
      <span className="ownership-summary__label">{label}</span>
      <div className="ownership-summary__chips" ref={chipsRef}>
        {chips.map((chip, index) => (
          <span
            key={chip}
            data-own-chip=""
            className="ownership-summary__chip"
            title={chip}
            style={index >= visibleCount ? { display: 'none' } : undefined}
          >
            {chip}
          </span>
        ))}
        <span
          data-own-more=""
          className="ownership-summary__more-wrap"
          style={overflow.length === 0 ? { display: 'none' } : undefined}
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
