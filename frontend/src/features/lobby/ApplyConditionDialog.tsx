import { useEffect, useMemo, useState } from 'react'
import type { SeatCondition, SessionCombatant, SessionSeat } from '../../shared/api/lobbies'
import { FALLBACK_CONDITIONS } from '../../shared/dnd/conditions'
import { Dialog, Field, Input, Stack, Text } from '../../ui'

export type ConditionTarget =
  | { kind: 'seat'; id: string }
  | { kind: 'enemy'; id: string }

type Props = {
  open: boolean
  seats: SessionSeat[]
  combatants?: SessionCombatant[]
  busy?: boolean
  onClose: () => void
  onApply: (condition: SeatCondition, targets: ConditionTarget[]) => void
}

/**
 * Жест мастера: выбрать состояние → отметить кого (герой / враг) → выдать.
 */
export function ApplyConditionDialog({
  open,
  seats,
  combatants = [],
  busy = false,
  onClose,
  onApply,
}: Props) {
  const [conditionSlug, setConditionSlug] = useState(FALLBACK_CONDITIONS[0]?.slug ?? 'poisoned')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [durationRounds, setDurationRounds] = useState<string>('')
  const [durationNote, setDurationNote] = useState('')

  useEffect(() => {
    if (!open) return
    setConditionSlug(FALLBACK_CONDITIONS[0]?.slug ?? 'poisoned')
    setSelected(new Set())
    setDurationRounds('')
    setDurationNote('')
  }, [open])

  const condition = useMemo((): SeatCondition => {
    const found = FALLBACK_CONDITIONS.find((c) => c.slug === conditionSlug)
    const rounds = Number.parseInt(durationRounds, 10)
    return {
      slug: conditionSlug,
      name: found?.name_ru ?? conditionSlug,
      catalog_id: null,
      duration_rounds: Number.isFinite(rounds) && rounds > 0 ? rounds : null,
      duration_note: durationNote.trim() || null,
    }
  }, [conditionSlug, durationRounds, durationNote])

  const allIds = useMemo(
    () => [
      ...seats.map((s) => `seat:${s.character_id}`),
      ...combatants.map((c) => `enemy:${c.id}`),
    ],
    [seats, combatants],
  )
  const allSelected = allIds.length > 0 && selected.size === allIds.length

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(allIds))
  }

  if (!open) return null

  return (
    <Dialog
      open={open}
      title="Выдать состояние"
      primaryLabel={busy ? 'Выдаём…' : 'Выдать'}
      secondaryLabel="Отмена"
      busy={busy}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (selected.size === 0) return
        const targets: ConditionTarget[] = []
        for (const key of selected) {
          if (key.startsWith('seat:')) targets.push({ kind: 'seat', id: key.slice(5) })
          else if (key.startsWith('enemy:')) targets.push({ kind: 'enemy', id: key.slice(6) })
        }
        onApply(condition, targets)
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Состояние можно повесить на героя, напарника (через хозяина) или врага. Длительность
          необязательна — если задана, ведущему будет напоминание (без авто-снятия).
        </Text>

        <div>
          <Text as="h3" className="apply-condition__heading">
            Состояние
          </Text>
          <div className="apply-condition__grid">
            {FALLBACK_CONDITIONS.map((opt) => (
              <button
                key={opt.slug}
                type="button"
                className={`session-condition-tag${conditionSlug === opt.slug ? ' is-picked' : ''}`}
                disabled={busy}
                aria-pressed={conditionSlug === opt.slug}
                onClick={() => setConditionSlug(opt.slug)}
              >
                {opt.name_ru}
              </button>
            ))}
          </div>
        </div>

        <div className="apply-condition__duration">
          <Field label="Длительность (раунды, необяз.)">
            <Input
              value={durationRounds}
              disabled={busy}
              inputMode="numeric"
              placeholder="например 10"
              onChange={(e) => setDurationRounds(e.target.value)}
            />
          </Field>
          <Field label="Напоминание">
            <Input
              value={durationNote}
              disabled={busy}
              placeholder="до спасброска / конец хода…"
              onChange={(e) => setDurationNote(e.target.value)}
            />
          </Field>
        </div>

        <div>
          <div className="apply-condition__targets-head">
            <Text as="h3" className="apply-condition__heading">
              Кому
            </Text>
            <button type="button" className="ui-button ui-button--ghost" onClick={toggleAll} disabled={busy}>
              {allSelected ? 'Снять всех' : 'Все на столе'}
            </button>
          </div>
          <ul className="apply-condition__targets">
            {seats.map((seat) => {
              const key = `seat:${seat.character_id}`
              const checked = selected.has(key)
              const already = (seat.conditions ?? []).some((c) => c.slug === condition.slug)
              return (
                <li key={key}>
                  <label className={`apply-condition__target${checked ? ' is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={() => toggle(key)}
                    />
                    <span>
                      <strong>{seat.character_name}</strong>
                      {already ? (
                        <Text tone="muted" className="apply-condition__already">
                          уже есть
                        </Text>
                      ) : null}
                    </span>
                  </label>
                </li>
              )
            })}
            {combatants.map((enemy) => {
              const key = `enemy:${enemy.id}`
              const checked = selected.has(key)
              const already = (enemy.conditions ?? []).some((c) => c.slug === condition.slug)
              return (
                <li key={key}>
                  <label className={`apply-condition__target${checked ? ' is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={() => toggle(key)}
                    />
                    <span>
                      <strong>{enemy.name}</strong>
                      <Text tone="muted"> · враг</Text>
                      {already ? (
                        <Text tone="muted" className="apply-condition__already">
                          уже есть
                        </Text>
                      ) : null}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </Stack>
    </Dialog>
  )
}
