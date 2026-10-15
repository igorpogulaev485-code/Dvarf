import { useEffect, useMemo, useState } from 'react'
import type { SessionCombatant, SessionSeat } from '../../shared/api/lobbies'
import { unclaimedDefeatXp } from '../../shared/api/lobbies'
import { Dialog, Field, NumberInput, Stack, Text } from '../../ui'

type Mode = 'combat' | 'manual'

type Props = {
  open: boolean
  busy?: boolean
  seats: SessionSeat[]
  combatants: SessionCombatant[]
  onClose: () => void
  onSubmit: (payload: {
    character_ids: string[]
    total_xp?: number
    per_character_xp?: number
    source: string
    note?: string
    claim_combatant_ids?: string[]
  }) => void
}

/**
 * Раздача XP: после боя (из бестиария по CR) или вручную одному/части/всем.
 */
export function AwardXpDialog({
  open,
  busy = false,
  seats,
  combatants,
  onClose,
  onSubmit,
}: Props) {
  const [mode, setMode] = useState<Mode>('combat')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [manualAmount, setManualAmount] = useState<number | null>(100)
  const [note, setNote] = useState('')

  const defeatRows = useMemo(() => {
    return combatants
      .map((c) => {
        const info = unclaimedDefeatXp(c)
        return { combatant: c, ...info }
      })
      .filter((r) => r.claimable)
  }, [combatants])

  const combatPool = useMemo(
    () => defeatRows.reduce((sum, r) => sum + r.total, 0),
    [defeatRows],
  )
  const claimIds = useMemo(
    () => defeatRows.map((r) => r.combatant.id),
    [defeatRows],
  )

  useEffect(() => {
    if (!open) return
    setMode(defeatRows.length > 0 ? 'combat' : 'manual')
    setSelectedIds(new Set(seats.map((s) => s.character_id)))
    setManualAmount(100)
    setNote('')
  }, [open, seats, defeatRows.length])

  const n = selectedIds.size
  const eachCombat = n > 0 ? Math.floor(combatPool / n) : 0
  const canSubmit =
    n > 0 &&
    (mode === 'combat'
      ? combatPool > 0 && eachCombat >= 0
      : manualAmount != null && manualAmount > 0)

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(seats.map((s) => s.character_id)))
  }

  return (
    <Dialog
      open={open}
      title="Опыт (XP)"
      primaryLabel={mode === 'combat' ? 'Раздать за бой' : 'Выдать'}
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canSubmit}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!canSubmit) return
        const character_ids = [...selectedIds]
        if (mode === 'combat') {
          onSubmit({
            character_ids,
            total_xp: combatPool,
            source: 'combat',
            note: note.trim() || undefined,
            claim_combatant_ids: claimIds,
          })
          return
        }
        onSubmit({
          character_ids,
          per_character_xp: manualAmount ?? 0,
          source: 'manual',
          note: note.trim() || undefined,
        })
      }}
    >
      <Stack gap={14}>
        <div className="session-combatant-mode">
          <button
            type="button"
            className={`session-combatant-mode__btn${mode === 'combat' ? ' is-on' : ''}`}
            onClick={() => setMode('combat')}
          >
            После боя
          </button>
          <button
            type="button"
            className={`session-combatant-mode__btn${mode === 'manual' ? ' is-on' : ''}`}
            onClick={() => setMode('manual')}
          >
            Вручную
          </button>
        </div>

        {mode === 'combat' ? (
          <Stack gap={8}>
            <Text tone="muted">
              XP по CR поверженных (ещё не раздавали). Делится поровну между отмеченными.
            </Text>
            {defeatRows.length === 0 ? (
              <Text tone="muted">Нет неучтённых поверженных с XP — или выдай вручную.</Text>
            ) : (
              <ul className="session-xp-defeat-list">
                {defeatRows.map((row) => (
                  <li key={row.combatant.id}>
                    <span>
                      {row.combatant.name}
                      {row.unclaimed > 1
                        ? ` · повержено ${row.unclaimed}${
                            row.dead !== row.unclaimed
                              ? ` (ещё ${row.claimed} уже учли)`
                              : row.combatant.member_count &&
                                  row.combatant.member_count > row.dead
                                ? ` из ${row.combatant.member_count}`
                                : ''
                          }`
                        : row.combatant.member_count &&
                            row.combatant.member_count > 1
                          ? ` · 1 из ${row.combatant.member_count}`
                          : ''}
                    </span>
                    <span className="session-xp-defeat-list__xp">
                      {row.xpEach}
                      {row.unclaimed > 1
                        ? ` × ${row.unclaimed} = ${row.total}`
                        : ''}{' '}
                      XP
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Text>
              Пул: <strong>{combatPool}</strong> XP
              {n > 0 ? (
                <>
                  {' '}
                  → по <strong>{eachCombat}</strong> каждому ({n})
                </>
              ) : null}
            </Text>
          </Stack>
        ) : (
          <Field label="XP каждому">
            <NumberInput
              value={manualAmount}
              min={1}
              max={1_000_000}
              integer
              emptyValue={null}
              disabled={busy}
              onValueChange={setManualAmount}
            />
          </Field>
        )}

        <Stack gap={8}>
          <div className="session-xp-recipients__head">
            <Text as="h4" className="session-xp-recipients__title">
              Кому
            </Text>
            <button type="button" className="session-xp-link" onClick={selectAll}>
              Все за столом
            </button>
          </div>
          <ul className="session-xp-recipients">
            {seats.map((seat) => {
              const on = selectedIds.has(seat.character_id)
              return (
                <li key={seat.character_id}>
                  <label className={`session-xp-recipient${on ? ' is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={busy}
                      onChange={() => toggle(seat.character_id)}
                    />
                    <span>
                      {seat.character_name}
                      {seat.character_class_name
                        ? ` · ${seat.character_class_name} ${seat.character_level}`
                        : ''}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          {seats.length === 0 ? (
            <Text tone="muted">За столом никого — посади игроков.</Text>
          ) : null}
        </Stack>

        <Field label="Заметка (необязательно)">
          <input
            className="ui-input"
            value={note}
            disabled={busy}
            maxLength={240}
            placeholder="Например: глава про мост"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </Stack>
    </Dialog>
  )
}
