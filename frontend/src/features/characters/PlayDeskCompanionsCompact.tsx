import type { CompanionEntry, CompanionKind } from './companions'
import { isSelfForm } from './companions'
import {
  companionStatusChip,
  isCompanionStatEmpty,
  shouldShowOnCompanionStrip,
} from './companionBackfill'
import { companionCombatSummary } from './companionCombat'
import {
  listCompanionAttacksForHost,
  type CompanionAttackHostContext,
} from './companionAttacks'
import { resolveAttackRoll } from './deskRolls'

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
  /** Open edit for one incomplete card («Настроить»). */
  onConfigure?: (companionId: string) => void
  attackHost?: CompanionAttackHostContext
  /** Spend host action when rolling a companion attack (T-01 hook). */
  onSpendHostAttack?: () => void
  canHostAttack?: () => { ok: boolean; reason?: string }
}

function companionGlanceBits(row: CompanionEntry): {
  bits: string[]
  incomplete: boolean
} {
  const hasAc = !isCompanionStatEmpty(row.stats.ac)
  const hasHp =
    !isCompanionStatEmpty(row.stats.hp) || !isCompanionStatEmpty(row.stats.hp_max)
  const hasSpeed = !isCompanionStatEmpty(row.stats.speed)
  const incomplete = !hasAc || !hasHp
  const bits = [
    hasAc ? `КД ${row.stats.ac}` : 'КД не заполнено',
    hasHp
      ? `${row.stats.hp ?? '—'}/${row.stats.hp_max ?? '—'} ХП`
      : 'ХП не заполнено',
    hasSpeed ? `${row.stats.speed} фт.` : null,
    row.stats.speed_fly != null ? `полёт ${row.stats.speed_fly}` : null,
  ].filter(Boolean) as string[]
  return { bits, incomplete }
}

export function PlayDeskCompanionsCompact({
  companions,
  onOpenFull,
  onToast,
  onConfigure,
  attackHost,
  onSpendHostAttack,
  canHostAttack,
}: PlayDeskCompanionsCompactProps) {
  const named = companions.filter(shouldShowOnCompanionStrip)

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
            const status = companionStatusChip(row)
            const actionPreview = row.actions?.trim()
              ? row.actions.trim().split('\n')[0]
              : null
            const attacks =
              attackHost && row.active && !isSelfForm(row)
                ? listCompanionAttacksForHost([row], attackHost)
                : []
            return (
              <div
                key={row.id}
                className={`play-desk-compact__card${isPrimary ? ' is-primary' : ''}${
                  incomplete ? ' is-incomplete' : ''
                }${!row.active ? ' is-inactive' : ''}`}
              >
                <button
                  type="button"
                  className="play-desk-compact__card-main is-action"
                  onClick={() => {
                    if (incomplete) {
                      onConfigure?.(row.id)
                      onOpenFull()
                      onToast?.(
                        `${row.name}: не заполнено — открой «Настроить»`,
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
                    {status ? (
                      <span className="attack-held-tag">{status}</span>
                    ) : null}
                  </div>
                  <p>{bits.join(' · ')}</p>
                  {!incomplete && !isSelfForm(row) ? (
                    <p className="play-desk-compact__card-hint">
                      {companionCombatSummary(row)}
                    </p>
                  ) : null}
                  {incomplete ? (
                    <p className="play-desk-compact__card-hint">Не заполнено</p>
                  ) : actionPreview ? (
                    <p className="play-desk-compact__card-hint">{actionPreview}</p>
                  ) : null}
                </button>
                {incomplete ? (
                  <button
                    type="button"
                    className="sheet-chip"
                    onClick={() => {
                      onConfigure?.(row.id)
                      onOpenFull()
                    }}
                  >
                    Настроить
                  </button>
                ) : null}
                {attacks.map((atk) => (
                  <button
                    key={atk.id}
                    type="button"
                    className="sheet-chip"
                    disabled={Boolean(canHostAttack && !canHostAttack().ok)}
                    onClick={() => {
                      const gate = canHostAttack?.()
                      if (gate && !gate.ok) {
                        onToast?.(
                          ('reason' in gate && typeof gate.reason === 'string'
                            ? gate.reason
                            : null) || 'Действие уже потрачено',
                        )
                        return
                      }
                      const strike = resolveAttackRoll({
                        name: `${atk.companionName}: ${atk.name}`,
                        attackBonus: atk.attackBonus,
                        damageExpr: atk.damageExpr,
                        damageType: atk.damageType,
                      })
                      onSpendHostAttack?.()
                      onToast?.(strike.text)
                    }}
                  >
                    {atk.name}
                  </button>
                ))}
              </div>
            )
          })
        )}
      </div>
      <p className="play-desk-compact__more">
        Постоянный слот остаётся в полосе («не призван»). Временный призыв без
        концентрации скрывается. Правка — «полностью».
      </p>
    </div>
  )
}
