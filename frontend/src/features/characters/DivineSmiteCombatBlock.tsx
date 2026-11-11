import { canSpendSlot } from '../../shared/dnd/spells'
import type { FeatureSlotSpendDef } from '../../shared/dnd/classFeatures'
import type { SpellSlotState } from '../../shared/dnd/spells'
import { divineSmiteDice, type DivineSmiteIntent } from './divineSmite'

type OpenStrikeView = {
  name: string
  melee: boolean
  crit: boolean
  smiteApplied: boolean
} | null

type DivineSmiteCombatBlockProps = {
  spend: FeatureSlotSpendDef
  slots: Record<string, SpellSlotState>
  intent: DivineSmiteIntent
  openStrike: OpenStrikeView
  onIntent: (next: DivineSmiteIntent) => void
  onSlotClick: (slotLevel: number) => void
  onMiss: () => void
}

function slotLevels(spend: FeatureSlotSpendDef): number[] {
  const levels: number[] = []
  for (let level = spend.min_slot; level <= spend.max_slot; level += 1) {
    levels.push(level)
  }
  return levels
}

export function DivineSmiteCombatBlock({
  spend,
  slots,
  intent,
  openStrike,
  onIntent,
  onSlotClick,
  onMiss,
}: DivineSmiteCombatBlockProps) {
  const levels = slotLevels(spend)
  const note = openStrike?.melee && openStrike.smiteApplied
    ? `Кара уже добавлена к «${openStrike.name}».`
    : openStrike?.melee
      ? `«${openStrike.name}»${openStrike.crit ? ' · критическое попадание' : ''}. Попало — выбери круг, ячейка спишется. Промах — кнопка ниже.`
      : openStrike && !openStrike.melee
        ? `«${openStrike.name}» — дальняя атака, кара не добавляется.`
        : intent.slotLevel != null
          ? `Круг ${intent.slotLevel} выбран. Ячейка спишется, только если рукопашная атака попадёт.`
          : 'После рукопашного попадания выбери круг. Ячейка спишется тогда. Промах её не тратит.'

  return (
    <section className="play-desk-smite" aria-label="Божественная кара">
      <div className="play-desk-smite__head">
        <h4 className="play-desk-smite__title">Кара</h4>
      </div>
      <div className="play-desk-smite__chips">
        {levels.map((level) => {
          const dice = divineSmiteDice({
            spend,
            slotLevel: level,
            vsUndeadOrFiend: intent.vsUndeadOrFiend,
          })
          const available = canSpendSlot(slots, level)
          const armed = intent.slotLevel === level
          const title = intent.vsUndeadOrFiend
            ? `Ячейка ${level}: ${dice.slotDice}к${dice.diceSize} от круга и +1к8 против нежити или исчадия`
            : `Ячейка ${level}: ${dice.formulaRu} излучением`
          return (
            <button
              key={level}
              type="button"
              className={`sheet-chip${armed ? ' is-on' : ''}`}
              disabled={!available}
              aria-pressed={armed}
              title={available ? title : `Нет ячейки ${level} круга`}
              onClick={() => onSlotClick(level)}
            >
              {level} · {dice.formulaRu}
            </button>
          )
        })}
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
      </div>
      <p className="play-desk-smite__note">{note}</p>
      {openStrike ? (
        <button type="button" className="play-desk-smite__miss" onClick={onMiss}>
          Промах — не тратить ячейку
        </button>
      ) : null}
    </section>
  )
}
