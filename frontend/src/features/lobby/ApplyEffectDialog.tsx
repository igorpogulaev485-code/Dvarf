import { useEffect, useMemo, useState } from 'react'
import type { SeatEffect, SessionCombatant, SessionSeat } from '../../shared/api/lobbies'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import type { ConditionTarget } from './ApplyConditionDialog'

type Props = {
  open: boolean
  seats: SessionSeat[]
  combatants?: SessionCombatant[]
  /** Предпочтительный кастер (свой персонаж), если есть */
  preferredSourceId?: string | null
  /** L-20: только свои персонажи могут быть источником «от героя». */
  ownCharacterIds?: Set<string> | ReadonlySet<string> | null
  busy?: boolean
  onClose: () => void
  onApply: (effect: SeatEffect, targets: ConditionTarget[]) => void
}

const SUGGESTIONS = [
  'Благословение',
  'Ускорение',
  'Щит веры',
  'Указание',
  'Сопротивление',
  'Сглаз',
  'Метка охотника',
]

/**
 * Жест: выдать баф/эффект герою или врагу.
 * Эффекты с длительностью в раундах снимаются сами по очереди S-02.
 * L-20: «От кого» — только свои места; мастер без героя не выбирает чужого кастера.
 */
export function ApplyEffectDialog({
  open,
  seats,
  combatants = [],
  preferredSourceId = null,
  ownCharacterIds = null,
  busy = false,
  onClose,
  onApply,
}: Props) {
  const ownSeats = useMemo(() => {
    if (!ownCharacterIds || ownCharacterIds.size === 0) {
      // Без списка своих — пустой источник (не подставляем чужих).
      return [] as SessionSeat[]
    }
    return seats.filter((s) => ownCharacterIds.has(s.character_id))
  }, [seats, ownCharacterIds])

  const casters = useMemo(
    () => ownSeats.filter((s) => Boolean(s.concentration)),
    [ownSeats],
  )

  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [linkConcentration, setLinkConcentration] = useState(false)
  const [durationRounds, setDurationRounds] = useState('10')
  const [acBonus, setAcBonus] = useState('')

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    const preferred =
      (preferredSourceId &&
        ownSeats.find((s) => s.character_id === preferredSourceId)) ||
      casters[0] ||
      ownSeats.find((s) => (s.effect_suggestions?.length ?? 0) > 0) ||
      ownSeats[0] ||
      null
    setSourceId(preferred?.character_id ?? null)
    setLinkConcentration(Boolean(preferred?.concentration))
    const fromSheet = preferred?.effect_suggestions?.[0] || preferred?.concentration?.name
    setName(fromSheet ?? '')
    setDurationRounds('10')
    setAcBonus(fromSheet === 'Щит веры' ? '2' : '')
  }, [open, preferredSourceId, casters, ownSeats])

  const sourceSeat = ownSeats.find((s) => s.character_id === sourceId) ?? null
  const sheetSuggestions = sourceSeat?.effect_suggestions ?? []
  const suggestions = useMemo(() => {
    const merged: string[] = []
    const seen = new Set<string>()
    for (const hint of [...sheetSuggestions, ...SUGGESTIONS]) {
      const key = hint.trim().toLocaleLowerCase('ru')
      if (!key || seen.has(key)) continue
      seen.add(key)
      merged.push(hint.trim())
    }
    return merged
  }, [sheetSuggestions])

  const allIds = useMemo(
    () => [
      ...seats.map((s) => `seat:${s.character_id}`),
      ...combatants.map((c) => `enemy:${c.id}`),
    ],
    [seats, combatants],
  )
  const allSelected = allIds.length > 0 && selected.size === allIds.length
  const canLink = Boolean(sourceSeat?.concentration)
  const hasOwnCaster = ownSeats.length > 0

  const effect = useMemo((): SeatEffect | null => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const rounds = Number.parseInt(durationRounds, 10)
    const ac = Number.parseInt(acBonus, 10)
    return {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `fx-${Date.now()}`,
      name: trimmed,
      source_character_id: sourceSeat?.character_id ?? null,
      source_name: sourceSeat?.character_name ?? null,
      linked_concentration: canLink && linkConcentration,
      ac_bonus: Number.isFinite(ac) && ac > 0 ? ac : null,
      duration:
        Number.isFinite(rounds) && rounds > 0
          ? { unit: 'round', value: rounds, remaining_rounds: rounds }
          : null,
    }
  }, [name, sourceSeat, canLink, linkConcentration, durationRounds, acBonus])

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
      title="Выдать эффект"
      primaryLabel={busy ? 'Выдаём…' : 'Выдать'}
      secondaryLabel="Отмена"
      busy={busy}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!effect || selected.size === 0) return
        // Без своего кастера нельзя повесить эффект «от героя» на союзников через share-effect.
        const seatTargets = [...selected].filter((k) => k.startsWith('seat:'))
        if (seatTargets.length > 0 && !effect.source_character_id) return
        const targets: ConditionTarget[] = []
        for (const key of selected) {
          if (key.startsWith('seat:')) targets.push({ kind: 'seat', id: key.slice(5) })
          else if (key.startsWith('enemy:')) targets.push({ kind: 'enemy', id: key.slice(6) })
        }
        onApply(effect, targets)
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Баф на героя или врага. Если задана длительность в раундах — эффект снимется сам по
          очереди боя. Связь с концентрацией на врагов не распространяется автоматически.
        </Text>

        {!hasOwnCaster ? (
          <Text tone="muted">
            Нет своего персонажа за столом — эффект «от героя» этим диалогом выдать нельзя.
          </Text>
        ) : null}

        <Field label="Название">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Благословение / Ускорение / Метка охотника…"
            autoFocus
          />
        </Field>

        <div className="apply-effect__suggestions">
          {suggestions.map((hint) => (
            <button
              key={hint}
              type="button"
              className="session-effect-tag"
              disabled={busy}
              onClick={() => {
                setName(hint)
                if (hint === 'Щит веры') setAcBonus('2')
              }}
            >
              {hint}
            </button>
          ))}
        </div>

        <div className="apply-condition__duration">
          <Field label="Длительность (раунды)">
            <Input
              value={durationRounds}
              disabled={busy}
              inputMode="numeric"
              placeholder="пусто = без авто-снятия"
              onChange={(e) => setDurationRounds(e.target.value)}
            />
          </Field>
          <Field label="Бонус КД (опц.)">
            <Input
              value={acBonus}
              disabled={busy}
              inputMode="numeric"
              placeholder="2 для Щита веры"
              onChange={(e) => setAcBonus(e.target.value)}
            />
          </Field>
        </div>

        {hasOwnCaster ? (
          <Field label="От кого (кастер)">
            <select
              className="ui-input"
              value={sourceId ?? ''}
              disabled={busy}
              onChange={(e) => {
                const next = e.target.value || null
                setSourceId(next)
                const seat = ownSeats.find((s) => s.character_id === next)
                setLinkConcentration(Boolean(seat?.concentration))
              }}
            >
              {ownSeats.map((seat) => (
                <option key={seat.character_id} value={seat.character_id}>
                  {seat.character_name}
                  {seat.concentration ? ` · конц.: ${seat.concentration.name}` : ''}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {canLink ? (
          <label className="session-feed-filter">
            <input
              type="checkbox"
              checked={linkConcentration}
              disabled={busy}
              onChange={(e) => setLinkConcentration(e.target.checked)}
            />
            Связать с концентрацией «{sourceSeat?.concentration?.name}»
          </label>
        ) : null}

        <div>
          <div className="apply-condition__targets-head">
            <Text as="h3" className="apply-condition__heading">
              Кому
            </Text>
            <button
              type="button"
              className="ui-button ui-button--ghost"
              onClick={toggleAll}
              disabled={busy}
            >
              {allSelected ? 'Снять всех' : 'Все на столе'}
            </button>
          </div>
          <ul className="apply-condition__targets">
            {seats.map((seat) => {
              const key = `seat:${seat.character_id}`
              const checked = selected.has(key)
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
                    </span>
                  </label>
                </li>
              )
            })}
            {combatants.map((enemy) => {
              const key = `enemy:${enemy.id}`
              const checked = selected.has(key)
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
