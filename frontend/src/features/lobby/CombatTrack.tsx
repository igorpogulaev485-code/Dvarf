import type { CombatEntry, SessionCombat } from '../../shared/api/lobbies'
import { Button, Text } from '../../ui'

type Props = {
  combat: SessionCombat
  masterControls?: boolean
  busy?: boolean
  onNext?: () => void
  onPrev?: () => void
  onEnd?: () => void
  onSelect?: (index: number) => void
}

function kindLabel(kind: string): string {
  if (kind === 'pc') return 'герой'
  if (kind === 'companion') return 'напарник'
  return 'враг'
}

/**
 * Очередь инициативы + чей ход. На ходе врага карточка раскрывает действия.
 */
export function CombatTrack({
  combat,
  masterControls = false,
  busy,
  onNext,
  onPrev,
  onEnd,
  onSelect,
}: Props) {
  if (!combat.active || combat.entries.length === 0) return null
  const active: CombatEntry | undefined = combat.entries[combat.active_index]

  return (
    <section className="session-combat-track" aria-label="Инициатива">
      <div className="session-combat-track__head">
        <Text as="h3" className="session-combat-track__title">
          Бой · раунд {combat.round}
        </Text>
        {active ? (
          <Text className="session-combat-track__now">
            Ход: <strong>{active.name}</strong>
            <span className="session-combat-track__kind"> · {kindLabel(active.kind)}</span>
          </Text>
        ) : null}
        {masterControls ? (
          <div className="session-combat-track__actions">
            <Button type="button" variant="ghost" disabled={busy} onClick={onPrev}>
              ←
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={onNext}>
              Следующий ход
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={onEnd}>
              Конец боя
            </Button>
          </div>
        ) : null}
      </div>
      <ol className="session-combat-order">
        {combat.entries.map((entry, index) => {
          const isActive = index === combat.active_index
          return (
            <li key={entry.id}>
              <button
                type="button"
                className={`session-combat-order__chip${isActive ? ' is-active' : ''}${
                  entry.kind === 'enemy' ? ' is-enemy' : ''
                }`}
                disabled={busy || !masterControls}
                onClick={() => onSelect?.(index)}
              >
                <span className="session-combat-order__init">{entry.initiative}</span>
                <span className="session-combat-order__name">{entry.name}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
