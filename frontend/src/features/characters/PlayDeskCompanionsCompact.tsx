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
  transformed_self: 'Облик',
}

type PlayDeskCompanionsCompactProps = {
  companions: CompanionEntry[]
  onOpenFull: () => void
  onToast?: (message: string) => void
}

function companionGlanceBits(row: CompanionEntry): {
  bits: string[]
  incomplete: boolean
} {
  const hasAc = row.stats.ac != null
  const hasHp = row.stats.hp != null || row.stats.hp_max != null
  const hasSpeed = row.stats.speed != null
  const incomplete = !hasAc || !hasHp
  const bits = [
    hasAc ? `КД ${row.stats.ac}` : 'КД не заполнено',
    hasHp
      ? `${row.stats.hp ?? '—'}/${row.stats.hp_max ?? '—'} ХП`
      : 'ХП не заполнено',
    hasSpeed ? `${row.stats.speed} фт.` : null,
  ].filter(Boolean) as string[]
  return { bits, incomplete }
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
            const { bits, incomplete } = companionGlanceBits(row)
            const actionPreview = row.actions?.trim()
              ? row.actions.trim().split('\n')[0]
              : null
            return (
              <button
                key={row.id}
                type="button"
                className={`play-desk-compact__card is-action${isPrimary ? ' is-primary' : ''}${
                  incomplete ? ' is-incomplete' : ''
                }`}
                onClick={() => {
                  if (incomplete) {
                    onOpenFull()
                    onToast?.(
                      `${row.name}: не заполнено — открой «Настроить» в полной панели`,
                    )
                    return
                  }
                  onToast?.(
                    `${row.name}: ${bits.join(' · ')}${
                      actionPreview ? ` — ${actionPreview}` : ''
                    }${row.notes.trim() ? ` · ${row.notes.trim()}` : ''}`,
                  )
                }}
              >
                <div className="play-desk-compact__card-meta">
                  <span>{row.name}</span>
                  <span className={`play-desk-compact__tag${isPrimary ? ' is-on' : ''}`}>
                    {isPrimary ? 'основной' : kind}
                  </span>
                </div>
                <p>{bits.join(' · ')}</p>
                {incomplete ? (
                  <p className="play-desk-compact__card-hint">Не заполнено · Настроить</p>
                ) : actionPreview ? (
                  <p className="play-desk-compact__card-hint">{actionPreview}</p>
                ) : null}
              </button>
            )
          })
        )}
      </div>
      <p className="play-desk-compact__more">
        Призыв из способности (дух дикого огня и т.п.) заполняет ХП/КД/атаку сам.
        Правка — «полностью».
      </p>
    </div>
  )
}
