/**
 * S-07: мастер выдаёт один предмет или монеты «из воздуха» на карточку героя.
 * Не путать с сундуком добычи S-06 / диалогом лута наград.
 */
import { useEffect, useMemo, useState } from 'react'
import type { SessionSeat } from '../../shared/api/lobbies'
import { Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'

type CoinKey = 'cp' | 'sp' | 'ep' | 'gp' | 'pp'

type Props = {
  open: boolean
  busy?: boolean
  seats: SessionSeat[]
  /** Если задан — сразу выбран этот герой. */
  initialCharacterId?: string | null
  onClose: () => void
  onSubmit: (payload: {
    character_id: string
    item_name?: string
    item_qty?: number
    coin_currency?: CoinKey
    coin_amount?: number
  }) => void
}

const COIN_OPTS: { key: CoinKey; label: string }[] = [
  { key: 'gp', label: 'зм' },
  { key: 'sp', label: 'см' },
  { key: 'cp', label: 'мм' },
  { key: 'ep', label: 'эм' },
  { key: 'pp', label: 'пм' },
]

export function MasterGrantDialog({
  open,
  busy = false,
  seats,
  initialCharacterId = null,
  onClose,
  onSubmit,
}: Props) {
  const [mode, setMode] = useState<'item' | 'coins'>('item')
  const [characterId, setCharacterId] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemQty, setItemQty] = useState<number | null>(1)
  const [currency, setCurrency] = useState<CoinKey>('gp')
  const [amount, setAmount] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    const first =
      seats.find((s) => s.character_id === initialCharacterId)?.character_id ??
      seats[0]?.character_id ??
      ''
    setCharacterId(first)
    setMode('item')
    setItemName('')
    setItemQty(1)
    setCurrency('gp')
    setAmount(null)
  }, [open, seats, initialCharacterId])

  const canSubmit = useMemo(() => {
    if (!characterId) return false
    if (mode === 'item') {
      return itemName.trim().length > 0 && itemQty != null && itemQty > 0
    }
    return amount != null && amount > 0
  }, [characterId, mode, itemName, itemQty, amount])

  return (
    <Dialog
      open={open}
      title="Выдать со стола"
      primaryLabel="Выдать"
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canSubmit}
      onSecondary={onClose}
      onPrimary={() => {
        if (!canSubmit) return
        if (mode === 'item') {
          onSubmit({
            character_id: characterId,
            item_name: itemName.trim(),
            item_qty: itemQty ?? 1,
          })
          return
        }
        onSubmit({
          character_id: characterId,
          coin_currency: currency,
          coin_amount: amount ?? 0,
        })
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Предмет или монеты появляются на листе сразу. Сундук добычи этим не подменяется.
        </Text>
        <Field label="Кому">
          <select
            className="ui-input"
            value={characterId}
            disabled={busy || seats.length === 0}
            onChange={(e) => setCharacterId(e.target.value)}
          >
            {seats.map((s) => (
              <option key={s.character_id} value={s.character_id}>
                {s.character_name}
              </option>
            ))}
          </select>
        </Field>
        <div className="session-combatant-mode">
          <button
            type="button"
            className={`session-combatant-mode__btn${mode === 'item' ? ' is-on' : ''}`}
            disabled={busy}
            onClick={() => setMode('item')}
          >
            Предмет
          </button>
          <button
            type="button"
            className={`session-combatant-mode__btn${mode === 'coins' ? ' is-on' : ''}`}
            disabled={busy}
            onClick={() => setMode('coins')}
          >
            Монеты
          </button>
        </div>
        {mode === 'item' ? (
          <Stack gap={10}>
            <Field label="Название">
              <Input
                value={itemName}
                disabled={busy}
                placeholder="Зелье лечения"
                onChange={(e) => setItemName(e.target.value)}
              />
            </Field>
            <Field label="Количество">
              <NumberInput
                value={itemQty}
                min={1}
                max={9999}
                integer
                emptyValue={null}
                disabled={busy}
                onValueChange={setItemQty}
              />
            </Field>
          </Stack>
        ) : (
          <Stack gap={10}>
            <Field label="Валюта">
              <div className="session-combatant-mode">
                {COIN_OPTS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`session-combatant-mode__btn${currency === c.key ? ' is-on' : ''}`}
                    disabled={busy}
                    onClick={() => setCurrency(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Сумма">
              <NumberInput
                value={amount}
                min={1}
                max={1_000_000}
                integer
                emptyValue={null}
                disabled={busy}
                onValueChange={setAmount}
              />
            </Field>
            <div className="session-combatant-mode">
              {[10, 50, 100].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="session-combatant-mode__btn"
                  disabled={busy}
                  onClick={() => setAmount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </Stack>
        )}
      </Stack>
    </Dialog>
  )
}
