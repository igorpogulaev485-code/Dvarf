import { useState, type FormEvent } from 'react'
import type { SessionSeat } from '../../shared/api/lobbies'
import { Button, Field, Input, NumberInput, Stack, Text } from '../../ui'

export type ManualRollPayload = {
  character_id?: string | null
  title: string
  formula?: string | null
  breakdown?: string | null
  total: number
  is_master_roll?: boolean
  physical_dice?: boolean
  is_hidden?: boolean
}
type Props = {
  seats: SessionSeat[]
  /** id персонажей текущего пользователя (для выбора «за кого») */
  ownCharacterIds: Set<string>
  isOwner: boolean
  busy?: boolean
  /** В — раскрыть форму, если мастер включил «Кубики на столе» */
  diceOnTable?: boolean
  onSubmit: (payload: ManualRollPayload) => Promise<void> | void
}

const MASTER_VALUE = '__master__'

export function ManualRollForm({
  seats,
  ownCharacterIds,
  isOwner,
  busy = false,
  diceOnTable = false,
  onSubmit,
}: Props) {
  const ownSeats = seats.filter((s) => ownCharacterIds.has(s.character_id))
  const defaultActor =
    ownSeats[0]?.character_id ?? (isOwner ? MASTER_VALUE : '')

  /** Б — по клику; В — сам, если «Кубики на столе» */
  const [userOpen, setUserOpen] = useState(false)
  const open = Boolean(diceOnTable) || userOpen
  const [actor, setActor] = useState(defaultActor)
  const [title, setTitle] = useState('Бросок')
  const [formula, setFormula] = useState('')
  const [breakdown, setBreakdown] = useState('')
  const [total, setTotal] = useState<number | null>(null)
  const [masterHidden, setMasterHidden] = useState(false)
  const [playerHidden, setPlayerHidden] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const canChooseMaster = isOwner
  const options =
    isOwner && ownSeats.length === 0
      ? seats
      : isOwner
        ? seats
        : ownSeats

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (total == null || !Number.isFinite(total)) {
      setLocalError('Укажите итог броска')
      return
    }
    if (!actor) {
      setLocalError('Выберите, за кого бросок')
      return
    }
    const isMaster = actor === MASTER_VALUE
    await onSubmit({
      character_id: isMaster ? null : actor,
      title: title.trim() || 'Бросок',
      formula: formula.trim() || null,
      breakdown: breakdown.trim() || null,
      total,
      is_master_roll: isMaster || (isOwner && masterHidden),
      physical_dice: true,
      is_hidden: !isMaster && !isOwner && playerHidden,
    })
    setBreakdown('')
    setTotal(null)
    setPlayerHidden(false)
  }

  if (!isOwner && ownSeats.length === 0) {
    return (
      <Text tone="muted">
        Ваш персонаж не за столом — отметьте посещаемость у мастера, чтобы бросать.
      </Text>
    )
  }

  if (!open) {
    return (
      <div className="manual-roll-form manual-roll-form--collapsed">
        <Button type="button" variant="secondary" onClick={() => setUserOpen(true)}>
          Записать живой куб
        </Button>
      </div>
    )
  }

  return (
    <form className="manual-roll-form" onSubmit={(e) => void handleSubmit(e)}>
      <Stack gap={10}>
        <div className="manual-roll-form__head-row">
          <Text as="h3" className="manual-roll-form__heading">
            Живой куб
          </Text>
          {!diceOnTable ? (
            <Button type="button" variant="ghost" onClick={() => setUserOpen(false)}>
              Свернуть
            </Button>
          ) : null}
        </div>
        <Text tone="muted" className="manual-roll-form__hint">
          Свободный бросок без цели. Атаки врагов — с карточки.
        </Text>

        <Field label="Кто">
          <select
            className="ui-input"
            value={actor}
            disabled={busy}
            onChange={(e) => setActor(e.target.value)}
          >
            {canChooseMaster ? <option value={MASTER_VALUE}>Мастер (скрытый стол)</option> : null}
            {options.map((s) => (
              <option key={s.character_id} value={s.character_id}>
                {s.character_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Что бросали">
          <Input
            value={title}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Атака длинным мечом"
          />
        </Field>

        <div className="manual-roll-form__row">
          <Field label="Формула" hint="необязательно">
            <Input
              value={formula}
              disabled={busy}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="1d20+5"
            />
          </Field>
          <Field label="Разбор" hint="необязательно">
            <Input
              value={breakdown}
              disabled={busy}
              onChange={(e) => setBreakdown(e.target.value)}
              placeholder="17+5"
            />
          </Field>
          <Field label="Итог">
            <NumberInput
              value={total}
              min={-999}
              max={9999}
              disabled={busy}
              emptyValue={null}
              onValueChange={setTotal}
              required
            />
          </Field>
        </div>

        {isOwner && actor !== MASTER_VALUE ? (
          <label className="manual-roll-form__check">
            <input
              type="checkbox"
              checked={masterHidden}
              disabled={busy}
              onChange={(e) => setMasterHidden(e.target.checked)}
            />
            Скрытый бросок мастера
          </label>
        ) : null}

        {!isOwner && actor && actor !== MASTER_VALUE ? (
          <label className="manual-roll-form__check">
            <input
              type="checkbox"
              checked={playerHidden}
              disabled={busy}
              onChange={(e) => setPlayerHidden(e.target.checked)}
            />
            Скрытый бросок (видите вы и мастер)
          </label>
        ) : null}

        {localError ? <Text tone="danger">{localError}</Text> : null}

        <div className="manual-roll-form__actions">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Отправляем…' : 'Записать бросок'}
          </Button>
        </div>
      </Stack>
    </form>
  )
}
