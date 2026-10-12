import {
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import { formatCheckRoll, rollCheck, type DeskRollMode } from './deskRolls'
import type { ConcentrationState } from './play'
import {
  countLearnedCantrips,
  countLearnedLeveled,
  countPreparedLeveled,
  isReadyInCombat,
  type SheetSpell,
  type SpellsState,
} from './spells'
import { spellAttackBonus, spellSaveDc } from '../../shared/dnd/spells'

type PlayDeskSpellsCompactProps = {
  spells: SpellsState
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  /** PHB learn budget caps for compact quota chips. */
  learnBudget?: {
    mode: 'known' | 'prepared_list' | 'spellbook'
    cantrips: number | null
    leveledKnown: number | null
    maxPrepared: number | null
  } | null
  pinned?: boolean
  concentration?: ConcentrationState | null
  onOpenFull: () => void
  onClearSplit?: () => void
  onSpendSlot?: (level: number) => void
  onToast?: (message: string) => void
  /** Open full cast flow for this spell (spend slot / set concentration). */
  onCastSpell?: (spell: SheetSpell) => void
  rollMode?: DeskRollMode
}

export function PlayDeskSpellsCompact({
  spells,
  abilities,
  proficiencyBonus,
  learnBudget = null,
  pinned = false,
  concentration = null,
  onOpenFull,
  onClearSplit,
  onSpendSlot,
  onToast,
  onCastSpell,
  rollMode = 'normal',
}: PlayDeskSpellsCompactProps) {
  const ready = spells.known.filter(isReadyInCombat)
  const abilityKey = spells.casting_ability
  const abilityMod = abilityKey ? abilityModifier(abilities[abilityKey]) : 0
  const dc = abilityKey ? spellSaveDc(abilityMod, proficiencyBonus) : null
  const attack = abilityKey ? spellAttackBonus(abilityMod, proficiencyBonus) : null
  const learnedCantrips = countLearnedCantrips(spells.known)
  const learnedLeveled = countLearnedLeveled(spells.known)
  const preparedCount = countPreparedLeveled(spells.known)
  const quotaLabel = (() => {
    if (!learnBudget) {
      if (spells.max_prepared != null) {
        return `подг. ${preparedCount}/${spells.max_prepared}`
      }
      return null
    }
    if (learnBudget.mode === 'known') {
      const cap = learnBudget.leveledKnown
      return cap != null ? `изв. ${learnedLeveled}/${cap}` : `изв. ${learnedLeveled}`
    }
    const prepCap = learnBudget.maxPrepared ?? spells.max_prepared
    return prepCap != null
      ? `подг. ${preparedCount}/${prepCap}`
      : `подг. ${preparedCount}`
  })()
  const cantripLabel =
    learnBudget?.cantrips != null
      ? `заг. ${learnedCantrips}/${learnBudget.cantrips}`
      : null

  const slotLevels = Array.from({ length: 9 }, (_, i) => i + 1).filter((level) => {
    const slot = spells.slots[String(level)]
    return (slot?.max ?? 0) > 0
  })

  return (
    <div className="play-desk-compact">
      <div className="play-desk-compact__head">
        <h3>{pinned ? 'Заклинания (закреплено)' : 'Заклинания'}</h3>
        <div className="play-desk-compact__head-actions">
          {onClearSplit ? (
            <button type="button" className="play-desk-compact__link" onClick={onClearSplit}>
              без заклинаний
            </button>
          ) : null}
          <button type="button" className="play-desk-compact__link" onClick={onOpenFull}>
            полностью
          </button>
        </div>
      </div>

      {(dc != null || attack != null || quotaLabel || cantripLabel) && (
        <div className="play-desk-compact__meta">
          {dc != null ? <span>Сл {dc}</span> : null}
          {attack != null ? <span>атака {formatModifier(attack)}</span> : null}
          {quotaLabel ? <span>{quotaLabel}</span> : null}
          {cantripLabel ? <span>{cantripLabel}</span> : null}
          {concentration ? (
            <span className="play-desk-compact__meta-conc">конц. {concentration.name}</span>
          ) : null}
        </div>
      )}

      {slotLevels.length > 0 ? (
        <div className="play-desk-compact__slots">
          {slotLevels.map((level) => {
            const slot = spells.slots[String(level)] ?? { max: 0, used: 0 }
            const remaining = Math.max(0, slot.max - slot.used)
            return (
              <button
                key={level}
                type="button"
                className="play-desk-compact__slot"
                title={`Ячейки ${level}: ${remaining}/${slot.max}`}
                disabled={!onSpendSlot || remaining <= 0}
                onClick={() => onSpendSlot?.(level)}
              >
                <span>{level}</span>
                <span className="play-desk-compact__slot-pips">
                  {Array.from({ length: slot.max }, (_, i) => (
                    <i key={i} className={i < remaining ? 'is-on' : ''} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="play-desk-compact__list play-desk-compact__list--dense">
        {ready.length === 0 ? (
          <p className="play-desk-compact__empty">Нет готовых заклинаний</p>
        ) : (
          ready.slice(0, 14).map((spell) => {
            const isActiveConc =
              concentration != null &&
              (concentration.spell_id === spell.id ||
                concentration.name.trim() === (spell.name || '').trim())
            return (
              <SpellRow
                key={spell.id}
                spell={spell}
                spellAttack={attack}
                spellDc={dc}
                rollMode={rollMode}
                activeConcentration={isActiveConc}
                onToast={onToast}
                onCast={onCastSpell ? () => onCastSpell(spell) : undefined}
              />
            )
          })
        )}
        {ready.length > 14 ? (
          <p className="play-desk-compact__more">+ ещё {ready.length - 14}</p>
        ) : null}
      </div>
    </div>
  )
}

function SpellRow({
  spell,
  spellAttack,
  spellDc,
  rollMode,
  activeConcentration,
  onToast,
  onCast,
}: {
  spell: SheetSpell
  spellAttack: number | null
  spellDc: number | null
  rollMode: DeskRollMode
  activeConcentration: boolean
  onToast?: (message: string) => void
  onCast?: () => void
}) {
  const levelLabel = spell.level <= 0 ? 'заговор' : `${spell.level} ур.`
  const tags = [
    spell.concentration ? 'концентрация' : null,
    spell.prepared && spell.level > 0 ? 'готово' : null,
  ].filter(Boolean)
  return (
    <button
      type="button"
      className={`play-desk-compact__row is-dense is-action${
        activeConcentration ? ' is-conc-active' : ''
      }`}
      title={onCast ? 'Каст заклинания' : 'Инфо о заклинании'}
      onClick={() => {
        if (onCast) {
          onCast()
          return
        }
        const head = `${spell.name} · ${levelLabel}${
          tags.length ? ` · ${tags.join(', ')}` : ''
        }`
        if (spellAttack != null) {
          const roll = rollCheck(spellAttack, rollMode)
          onToast?.(
            `${formatCheckRoll(spell.name, roll)}${
              spellDc != null ? ` · Сл ${spellDc}` : ''
            } · ${levelLabel}`,
          )
          return
        }
        onToast?.(`${head}${spellDc != null ? ` · Сл ${spellDc}` : ''}`)
      }}
    >
      <div className="play-desk-compact__row-main">
        <b>{spell.name}</b>
      </div>
      <span className="play-desk-compact__dmg">{levelLabel}</span>
      {activeConcentration ? (
        <span className="play-desk-compact__tag is-conc">держит</span>
      ) : spell.concentration ? (
        <span className="play-desk-compact__tag is-conc">конц.</span>
      ) : spell.prepared && spell.level > 0 ? (
        <span className="play-desk-compact__tag is-on">готово</span>
      ) : (
        <span className="play-desk-compact__tag">—</span>
      )}
    </button>
  )
}
