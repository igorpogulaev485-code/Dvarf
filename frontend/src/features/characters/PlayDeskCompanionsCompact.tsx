import type { CompanionEntry, CompanionKind } from './companions'

const KIND_LABEL: Record<CompanionKind, string> = {
  beast_companion: 'Зверь',
  steel_defender: 'Защитник',
  eldritch_cannon: 'Пушка',
  drake: 'Дрейк',
  primal_companion: 'Спутник',
  familiar: 'Фамилиар',
  ally: 'Призыв',
  other: 'Спутник',
}

type PlayDeskCompanionsCompactProps = {
  companions: CompanionEntry[]
  onOpenFull: () => void
  onToast?: (message: string) => void
}

export function PlayDeskCompanionsCompact({
  companions,
  onOpenFull,
  onToast,
}: PlayDeskCompanionsCompactProps) {
  const named = companions.filter((row) => row.name.trim())

  return (
    <div className="play-desk-compact">
      <div className="play-desk-compact__head">
        <h3>Напарники</h3>
        <button type="button" className="play-desk-compact__link" onClick={onOpenFull}>
          полностью
        </button>
      </div>

      <div className="play-desk-compact__cards">
        {named.length === 0 ? (
          <p className="play-desk-compact__empty">Нет напарников — добавьте в полной панели</p>
        ) : (
          named.map((row, index) => {
            const kind = KIND_LABEL[row.kind] ?? 'Спутник'
            const isPrimary = index === 0
            const bits = [
              row.stats.ac != null ? `КД ${row.stats.ac}` : null,
              row.stats.hp != null ? `${row.stats.hp} HP` : null,
              row.stats.speed != null ? `${row.stats.speed} фт.` : null,
              isPrimary ? 'основной' : kind,
            ].filter(Boolean)
            return (
              <button
                key={row.id}
                type="button"
                className={`play-desk-compact__card is-action${isPrimary ? ' is-primary' : ''}`}
                onClick={() =>
                  onToast?.(
                    `${row.name}: ${bits.join(' · ') || kind}${
                      row.notes.trim() ? ` — ${row.notes.trim()}` : ''
                    }`,
                  )
                }
              >
                <div className="play-desk-compact__card-meta">
                  <span>{row.name}</span>
                  <span className={`play-desk-compact__tag${isPrimary ? ' is-on' : ''}`}>
                    {isPrimary ? 'основной' : kind}
                  </span>
                </div>
                <p>{bits.filter((b) => b !== 'основной' && b !== kind).join(' · ') || 'без статов'}</p>
              </button>
            )
          })
        )}
      </div>
      <p className="play-desk-compact__more">
        Редактирование здесь по клику «полностью»; быстрый статус — в доке над сценой.
      </p>
    </div>
  )
}
