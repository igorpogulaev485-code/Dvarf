import {
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import {
  isReadyInCombat,
  type SheetSpell,
  type SpellsState,
} from './spells'
import { spellAttackBonus, spellSaveDc } from '../../shared/dnd/spells'

type PlayDeskSpellsCompactProps = {
  spells: SpellsState
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  pinned?: boolean
  onOpenFull: () => void
  onClearSplit?: () => void
  onSpendSlot?: (level: number) => void
  onToast?: (message: string) => void
}

export function PlayDeskSpellsCompact({
  spells,
  abilities,
  proficiencyBonus,
  pinned = false,
  onOpenFull,
  onClearSplit,
  onSpendSlot,
  onToast,
}: PlayDeskSpellsCompactProps) {
  const ready = spells.known.filter(isReadyInCombat)
  const abilityKey = spells.casting_ability
  const abilityMod = abilityKey ? abilityModifier(abilities[abilityKey]) : 0
  const dc = abilityKey ? spellSaveDc(abilityMod, proficiencyBonus) : null
  const attack = abilityKey ? spellAttackBonus(abilityMod, proficiencyBonus) : null

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
              снять split
            </button>
          ) : null}
          <button type="button" className="play-desk-compact__link" onClick={onOpenFull}>
            полностью
          </button>
        </div>
      </div>

      {(dc != null || attack != null) && (
        <div className="play-desk-compact__meta">
          {dc != null ? <span>Сл {dc}</span> : null}
          {attack != null ? <span>атака {formatModifier(attack)}</span> : null}
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
          ready.slice(0, 14).map((spell) => (
            <SpellRow key={spell.id} spell={spell} onToast={onToast} />
          ))
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
  onToast,
}: {
  spell: SheetSpell
  onToast?: (message: string) => void
}) {
  const levelLabel = spell.level <= 0 ? 'заговор' : `${spell.level} ур.`
  const tags = [
    spell.concentration ? 'концентрация' : null,
    spell.prepared && spell.level > 0 ? 'готово' : null,
  ].filter(Boolean)
  return (
    <button
      type="button"
      className="play-desk-compact__row is-dense is-action"
      onClick={() =>
        onToast?.(
          `${spell.name} · ${levelLabel}${tags.length ? ` · ${tags.join(', ')}` : ''}`,
        )
      }
    >
      <div className="play-desk-compact__row-main">
        <b>{spell.name}</b>
      </div>
      <span className="play-desk-compact__dmg">{levelLabel}</span>
      {spell.concentration ? (
        <span className="play-desk-compact__tag is-conc">конц.</span>
      ) : spell.prepared && spell.level > 0 ? (
        <span className="play-desk-compact__tag is-on">готово</span>
      ) : (
        <span className="play-desk-compact__tag">—</span>
      )}
    </button>
  )
}
