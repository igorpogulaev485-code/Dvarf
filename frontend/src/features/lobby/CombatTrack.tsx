import type { CombatEntry, SessionCombat } from '../../shared/api/lobbies'
import { Button, Text } from '../../ui'

type Props = {
  combat: SessionCombat
  masterControls?: boolean
  busy?: boolean
  /** Свои персонажи — кнопка броска инициативы */
  ownCharacterIds?: Set<string>
  onNext?: () => void
  onPrev?: () => void
  onEnd?: () => void
  onSelect?: (index: number) => void
  onRollInitiative?: (entry: CombatEntry) => void
  onReleaseWave?: (waveId: string) => void
  onRestoreFallen?: (fallenId: string) => void
}

function kindLabel(kind: string): string {
  if (kind === 'pc') return 'герой'
  if (kind === 'companion') return 'напарник'
  return 'враг'
}

function MemberDots({ tones }: { tones?: string[] }) {
  if (!tones || tones.length <= 1) return null
  return (
    <span className="session-combat-order__dots" aria-hidden>
      {tones.map((tone, i) => (
        <span key={i} className={`session-combat-order__dot is-${tone}`} />
      ))}
    </span>
  )
}

/**
 * Очередь инициативы + чей ход. S-02: pending, волны, павшие, «ждём реакцию».
 */
export function CombatTrack({
  combat,
  masterControls = false,
  busy,
  ownCharacterIds,
  onNext,
  onPrev,
  onEnd,
  onSelect,
  onRollInitiative,
  onReleaseWave,
  onRestoreFallen,
}: Props) {
  if (!combat.active) return null
  const active: CombatEntry | undefined = combat.entries[combat.active_index]
  const pendingWaves = (combat.waves ?? []).filter((w) => !w.released)
  const reminders = combat.wave_reminders ?? []

  return (
    <section className="session-combat-track" aria-label="Инициатива">
      <div className="session-combat-track__head">
        <Text as="h3" className="session-combat-track__title">
          Бой · раунд {combat.round}
        </Text>
        {active ? (
          <Text className="session-combat-track__now">
            Ход:{' '}
            <strong>
              {active.initiative_pending ? `ждём бросок · ${active.name}` : active.name}
            </strong>
            <span className="session-combat-track__kind"> · {kindLabel(active.kind)}</span>
            {active.defer_to_next_round ? (
              <span className="session-combat-track__kind"> · со следующего раунда</span>
            ) : null}
          </Text>
        ) : (
          <Text className="session-combat-track__now">
            Очередь пуста — дождись бросков или выпусти волну.
          </Text>
        )}
        {combat.waiting_reaction && masterControls ? (
          <Text className="session-combat-track__reaction">ждём реакцию</Text>
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
              Завершить бой
            </Button>
          </div>
        ) : null}
      </div>

      {reminders.some((r) => r.due) && masterControls ? (
        <ul className="session-combat-reminders">
          {reminders
            .filter((r) => r.due)
            .map((r) => (
              <li key={r.wave_id}>
                <Text>
                  Напоминание: волна {r.wave_index} — {r.condition_text}
                </Text>
              </li>
            ))}
        </ul>
      ) : null}

      {masterControls && pendingWaves.length > 0 ? (
        <div className="session-combat-waves">
          {pendingWaves.map((wave) => (
            <div key={wave.id} className="session-combat-waves__row">
              <Text>
                Волна {wave.index} скрыта
                {wave.condition_text ? ` · ${wave.condition_text}` : ''}
              </Text>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => onReleaseWave?.(wave.id)}
              >
                Выпустить волну {wave.index}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {combat.entries.length > 0 ? (
        <ol className="session-combat-order">
          {combat.entries.map((entry, index) => {
            const isActive = index === combat.active_index
            const canRollOwn =
              entry.kind === 'pc' &&
              entry.initiative_pending &&
              ownCharacterIds?.has(entry.ref_id)
            const canRollMaster =
              masterControls && entry.initiative_pending && Boolean(onRollInitiative)
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`session-combat-order__chip${isActive ? ' is-active' : ''}${
                    entry.kind === 'enemy' ? ' is-enemy' : ''
                  }${entry.initiative_pending ? ' is-pending' : ''}${
                    entry.defer_to_next_round ? ' is-deferred' : ''
                  }`}
                  disabled={busy || !masterControls}
                  onClick={() => onSelect?.(index)}
                >
                  <span className="session-combat-order__init">
                    {entry.initiative_pending ? '?' : entry.initiative ?? '—'}
                  </span>
                  <span className="session-combat-order__name">{entry.name}</span>
                  <MemberDots tones={entry.member_tones} />
                </button>
                {(canRollOwn || canRollMaster) && onRollInitiative ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="session-combat-order__roll"
                    disabled={busy}
                    onClick={() => onRollInitiative(entry)}
                  >
                    Бросить инициативу
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : null}

      {masterControls && (combat.fallen?.length ?? 0) > 0 ? (
        <div className="session-combat-fallen">
          <Text as="h4" className="session-combat-fallen__title">
            Павшие
          </Text>
          <ul className="session-combat-fallen__list">
            {combat.fallen!.map((f) => (
              <li key={f.id} className="session-combat-fallen__row">
                <span>{f.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onRestoreFallen?.(f.id)}
                >
                  Вернуть
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
