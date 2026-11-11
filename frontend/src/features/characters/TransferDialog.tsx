import { useEffect, useMemo, useState } from 'react'
import { Dialog, Field, NumberInput, Stack, Text } from '../../ui'

export type TransferPeer = {
  lobby_id: string
  lobby_name: string
  character_id: string
  character_name: string
}

type CoinKey = 'cp' | 'sp' | 'ep' | 'gp' | 'pp'

type ItemMode = {
  kind: 'item'
  itemId: string
  itemName: string
  maxQty: number
}

type CoinMode = {
  kind: 'coins'
  balances: Record<CoinKey, number>
}

type Props = {
  open: boolean
  busy?: boolean
  peers: TransferPeer[]
  mode: ItemMode | CoinMode | null
  onClose: () => void
  onSubmit: (payload: {
    lobby_id: string
    to_character_id: string
    item_id?: string
    qty?: number
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

const QUICK = [10, 50, 100]

/**
 * Передать предмет или монеты другому персонажу в лобби.
 */
export function TransferDialog({
  open,
  busy = false,
  peers,
  mode,
  onClose,
  onSubmit,
}: Props) {
  const [peerKey, setPeerKey] = useState('')
  const [qty, setQty] = useState<number | null>(1)
  const [currency, setCurrency] = useState<CoinKey>('gp')
  const [amount, setAmount] = useState<number | null>(null)

  useEffect(() => {
    if (!open || !mode) return
    const first = peers[0]
    setPeerKey(first ? `${first.lobby_id}:${first.character_id}` : '')
    if (mode.kind === 'item') {
      setQty(1)
    } else {
      setCurrency('gp')
      setAmount(null)
    }
  }, [open, mode, peers])

  const selected = useMemo(() => {
    const [lobby_id, character_id] = peerKey.split(':')
    return peers.find((p) => p.lobby_id === lobby_id && p.character_id === character_id) ?? null
  }, [peerKey, peers])

  const balance = mode?.kind === 'coins' ? mode.balances[currency] ?? 0 : 0
  const remain =
    mode?.kind === 'coins' && amount != null && amount > 0 ? Math.max(0, balance - amount) : null

  const canSubmit = Boolean(
    selected &&
      mode &&
      (mode.kind === 'item'
        ? qty != null && qty > 0 && qty <= mode.maxQty
        : amount != null && amount > 0 && amount <= balance),
  )

  return (
    <Dialog
      open={open && mode != null}
      title="Передать"
      primaryLabel="Передать"
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canSubmit}
      onSecondary={onClose}
      onPrimary={() => {
        if (!canSubmit || !selected || !mode) return
        if (mode.kind === 'item') {
          onSubmit({
            lobby_id: selected.lobby_id,
            to_character_id: selected.character_id,
            item_id: mode.itemId,
            qty: qty ?? 1,
          })
          return
        }
        onSubmit({
          lobby_id: selected.lobby_id,
          to_character_id: selected.character_id,
          coin_currency: currency,
          coin_amount: amount ?? 0,
        })
      }}
    >
      <Stack gap={14}>
        {mode?.kind === 'item' ? (
          <Text>
            {mode.itemName}
            {mode.maxQty > 1 ? ` · у тебя ${mode.maxQty}` : ''}
          </Text>
        ) : (
          <Text tone="muted">Сумма с нуля — не весь кошелёк по умолчанию.</Text>
        )}

        {peers.length === 0 ? (
          <Text tone="muted">
            Некому передать: персонаж должен быть в лобби с другими участниками.
          </Text>
        ) : (
          <Field label="Кому">
            <select
              className="ui-input"
              value={peerKey}
              disabled={busy}
              onChange={(e) => setPeerKey(e.target.value)}
            >
              {peers.map((p) => (
                <option
                  key={`${p.lobby_id}-${p.character_id}`}
                  value={`${p.lobby_id}:${p.character_id}`}
                >
                  {p.character_name} · {p.lobby_name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {mode?.kind === 'item' && mode.maxQty > 1 ? (
          <Field label="Количество">
            <NumberInput
              value={qty}
              min={1}
              max={mode.maxQty}
              integer
              emptyValue={null}
              disabled={busy}
              onValueChange={setQty}
            />
          </Field>
        ) : null}

        {mode?.kind === 'coins' ? (
          <Stack gap={10}>
            <Field label="Валюта">
              <div className="session-combatant-mode">
                {COIN_OPTS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`session-combatant-mode__btn${currency === c.key ? ' is-on' : ''}`}
                    disabled={busy}
                    onClick={() => {
                      setCurrency(c.key)
                      setAmount(null)
                    }}
                  >
                    {c.label} ({mode.balances[c.key]})
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Сумма">
              <NumberInput
                value={amount}
                min={1}
                max={balance}
                integer
                emptyValue={null}
                disabled={busy || balance <= 0}
                onValueChange={setAmount}
              />
            </Field>
            <div className="session-combatant-mode">
              {QUICK.filter((n) => n <= balance).map((n) => (
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
              {balance > 0 ? (
                <button
                  type="button"
                  className="session-combatant-mode__btn"
                  disabled={busy}
                  onClick={() => setAmount(balance)}
                >
                  Всё ({balance})
                </button>
              ) : null}
            </div>
            {remain != null ? (
              <Text tone="muted">У тебя останется {remain} {COIN_OPTS.find((c) => c.key === currency)?.label}.</Text>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Dialog>
  )
}
