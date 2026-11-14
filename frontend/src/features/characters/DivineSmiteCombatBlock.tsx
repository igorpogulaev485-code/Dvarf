import { canSpendSlot, clampSlot } from '../../shared/dnd/spells'
import type { FeatureSlotSpendDef } from '../../shared/dnd/classFeatures'
import type { SpellSlotState } from '../../shared/dnd/spells'
import {
  divineSmiteDice,
  divineSmitePresentLevels,
  type DivineSmiteIntent,
} from './divineSmite'

type OpenStrikeView = {
  name: string
  melee: boolean
  crit: boolean
  smiteApplied: boolean
  /** Radiant chip label after a successful spend. */
  radiantChip?: string | null
} | null

type DivineSmiteCombatBlockProps = {
  spend: FeatureSlotSpendDef
  slots: Record<string, SpellSlotState>
  intent: DivineSmiteIntent
  openStrike: OpenStrikeView
  /** Confirm mode = after a melee hit; arm mode = pick circle early. */
  mode: 'arm' | 'confirm'
  onIntent: (next: DivineSmiteIntent) => void
  onSlotClick: (slotLevel: number) => void
  onMiss: () => void
  onClose?: () => void
}

/**
 * CMB-02: compact circle strip under a melee weapon row.
 * No permanent banner — only while the smite control is open.
 */
export function DivineSmiteCombatBlock({
  spend,
  slots,
  intent,
  openStrike,
  mode,
  onIntent,
  onSlotClick,
  onMiss,
  onClose,
}: DivineSmiteCombatBlockProps) {
  const levels = divineSmitePresentLevels(spend, slots)
  const confirm = mode === 'confirm' && Boolean(openStrike?.melee)
  const applied = Boolean(openStrike?.melee && openStrike.smiteApplied)

  return (
    <section
      className={`play-desk-smite play-desk-smite--inline${confirm ? ' is-confirm' : ' is-arm'}`}
      aria-label="Божественная кара"
    >
      <div className="play-desk-smite__row">
        {confirm && !applied ? (
          <span className="play-desk-smite__prompt">Попал? Выбери круг</span>
        ) : null}
        {!confirm ? (
          <span className="play-desk-smite__prompt">Круг заранее</span>
        ) : null}
        {applied && openStrike?.radiantChip ? (
          <span
            className="sheet-chip is-on play-desk-smite__radiant"
            title="Урон излучением (Божественная кара)"
          >
            {openStrike.radiantChip}
          </span>
        ) : null}
        {!applied
          ? levels.map((level) => {
              const slot = clampSlot(slots[String(level)] ?? { max: 0, used: 0 })
              const remaining = Math.max(0, slot.max - slot.used)
              const dice = divineSmiteDice({
                spend,
                slotLevel: level,
                vsUndeadOrFiend: intent.vsUndeadOrFiend,
              })
              const available = canSpendSlot(slots, level)
              const armed = intent.slotLevel === level
              const title = available
                ? intent.vsUndeadOrFiend
                  ? `Ячейка ${level}: ${dice.slotDice}к${dice.diceSize} от круга и +1к8 против нежити или исчадия · осталось ${remaining}`
                  : `Ячейка ${level}: ${dice.formulaRu} излучением · осталось ${remaining}`
                : `Нет ячейки ${level} круга`
              return (
                <button
                  key={level}
                  type="button"
                  className={`sheet-chip play-desk-smite__slot${armed ? ' is-on' : ''}`}
                  disabled={!available || (confirm && Boolean(openStrike?.smiteApplied))}
                  aria-pressed={armed}
                  title={title}
                  onClick={() => onSlotClick(level)}
                >
                  <span className="play-desk-smite__slot-label">
                    {level} · {dice.formulaRu}
                  </span>
                  <span
                    className="play-desk-smite__pips"
                    aria-hidden="true"
                    title={`${remaining}/${slot.max}`}
                  >
                    {Array.from({ length: slot.max }, (_, index) => (
                      <span
                        key={index}
                        className={`ui-resource-pip play-desk__pip play-desk-smite__pip${
                          index < remaining ? ' is-on' : ''
                        }`}
                      />
                    ))}
                  </span>
                </button>
              )
            })
          : null}
        {!applied ? (
          <button
            type="button"
            className={`sheet-chip${intent.vsUndeadOrFiend ? ' is-on' : ''}`}
            aria-pressed={intent.vsUndeadOrFiend}
            title="Ещё 1к8 излучением сверх потолка ячейки"
            onClick={() =>
              onIntent({
                slotLevel: intent.slotLevel,
                vsUndeadOrFiend: !intent.vsUndeadOrFiend,
              })
            }
          >
            нежить / исчадие
          </button>
        ) : null}
        {confirm && !applied ? (
          <button
            type="button"
            className="sheet-chip play-desk-smite__miss"
            title="Промах — ячейка не списывается"
            onClick={onMiss}
          >
            Промах
          </button>
        ) : null}
        {onClose && !confirm ? (
          <button
            type="button"
            className="sheet-chip play-desk-smite__collapse"
            title="Свернуть"
            onClick={onClose}
          >
            Свернуть
          </button>
        ) : null}
      </div>
      {levels.length === 0 ? (
        <p className="play-desk-smite__note">Нет ячеек для кары</p>
      ) : null}
    </section>
  )
}
