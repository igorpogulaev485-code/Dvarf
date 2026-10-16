import { useEffect, useMemo, useState } from 'react'
import type { SessionSeat, SettingArtifact } from '../../shared/api/lobbies'
import { Button, Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'

type CoinKey = 'cp' | 'sp' | 'ep' | 'gp' | 'pp'

type LootRow =
  | {
      key: string
      kind: 'item'
      name: string
      qty: number
      character_id: string
      artifact_id?: string | null
    }
  | {
      key: string
      kind: 'coins'
      character_id: string
      cp: number
      sp: number
      ep: number
      gp: number
      pp: number
    }

type Props = {
  open: boolean
  busy?: boolean
  seats: SessionSeat[]
  /** Артефакты сеттинга сессии — можно добавить в лут */
  artifacts?: SettingArtifact[]
  onClose: () => void
  onSubmit: (payload: {
    grants: Array<{
      character_id: string
      item?: {
        name?: string
        qty: number
        artifact_id?: string | null
      }
      coins?: Partial<Record<CoinKey, number>>
    }>
    note?: string
  }) => void
}

const COIN_META: { key: CoinKey; label: string }[] = [
  { key: 'gp', label: 'зм' },
  { key: 'sp', label: 'см' },
  { key: 'cp', label: 'мм' },
  { key: 'ep', label: 'эм' },
  { key: 'pp', label: 'пм' },
]

function newKey(): string {
  return `loot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Мастер: находка → кому → сразу в инвентарь / кошелёк.
 * Артефакты сеттинга применяются со способностями.
 */
export function AwardLootDialog({
  open,
  busy = false,
  seats,
  artifacts = [],
  onClose,
  onSubmit,
}: Props) {
  const defaultSeat = seats[0]?.character_id ?? ''
  const [rows, setRows] = useState<LootRow[]>([])
  const [note, setNote] = useState('')
  const [draftName, setDraftName] = useState('')
  const [draftQty, setDraftQty] = useState<number | null>(1)
  const [draftWho, setDraftWho] = useState(defaultSeat)
  const [draftArtifactId, setDraftArtifactId] = useState('')
  const [coinWho, setCoinWho] = useState(defaultSeat)
  const [coinGp, setCoinGp] = useState<number | null>(null)
  const [coinSp, setCoinSp] = useState<number | null>(null)
  const [coinCp, setCoinCp] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    const first = seats[0]?.character_id ?? ''
    setRows([])
    setNote('')
    setDraftName('')
    setDraftQty(1)
    setDraftWho(first)
    setDraftArtifactId('')
    setCoinWho(first)
    setCoinGp(null)
    setCoinSp(null)
    setCoinCp(null)
  }, [open, seats])

  const canSubmit = useMemo(() => {
    if (seats.length === 0 || rows.length === 0) return false
    return rows.every((row) => {
      if (!row.character_id) return false
      if (row.kind === 'item') {
        if (row.artifact_id) return row.qty > 0
        return Boolean(row.name.trim()) && row.qty > 0
      }
      return row.cp + row.sp + row.ep + row.gp + row.pp > 0
    })
  }, [rows, seats.length])

  function addItem() {
    if (!draftWho) return
    const artifact = artifacts.find((a) => a.id === draftArtifactId)
    if (artifact) {
      setRows((prev) => [
        ...prev,
        {
          key: newKey(),
          kind: 'item',
          name: artifact.name,
          qty: Math.max(1, draftQty ?? 1),
          character_id: draftWho,
          artifact_id: artifact.id,
        },
      ])
      setDraftArtifactId('')
      setDraftQty(1)
      return
    }
    const name = draftName.trim()
    if (!name) return
    setRows((prev) => [
      ...prev,
      {
        key: newKey(),
        kind: 'item',
        name,
        qty: Math.max(1, draftQty ?? 1),
        character_id: draftWho,
        artifact_id: null,
      },
    ])
    setDraftName('')
    setDraftQty(1)
  }

  function addCoins() {
    const gp = coinGp ?? 0
    const sp = coinSp ?? 0
    const cp = coinCp ?? 0
    if (!coinWho || gp + sp + cp <= 0) return
    setRows((prev) => [
      ...prev,
      {
        key: newKey(),
        kind: 'coins',
        character_id: coinWho,
        gp,
        sp,
        cp,
        ep: 0,
        pp: 0,
      },
    ])
    setCoinGp(null)
    setCoinSp(null)
    setCoinCp(null)
  }

  function splitCoinsToAll() {
    const gp = coinGp ?? 0
    const sp = coinSp ?? 0
    const cp = coinCp ?? 0
    if (seats.length === 0 || gp + sp + cp <= 0) return
    const n = seats.length
    const perGp = Math.floor(gp / n)
    const perSp = Math.floor(sp / n)
    const perCp = Math.floor(cp / n)
    if (perGp + perSp + perCp <= 0) return
    setRows((prev) => [
      ...prev,
      ...seats.map((seat) => ({
        key: newKey(),
        kind: 'coins' as const,
        character_id: seat.character_id,
        gp: perGp,
        sp: perSp,
        cp: perCp,
        ep: 0,
        pp: 0,
      })),
    ])
    setCoinGp(null)
    setCoinSp(null)
    setCoinCp(null)
  }

  function seatName(id: string): string {
    return seats.find((s) => s.character_id === id)?.character_name ?? '—'
  }

  const canAddItem = Boolean(draftWho) && (Boolean(draftArtifactId) || Boolean(draftName.trim()))

  return (
    <Dialog
      open={open}
      title="Лут"
      primaryLabel="Выдать"
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canSubmit}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!canSubmit) return
        onSubmit({
          grants: rows.map((row) => {
            if (row.kind === 'item') {
              return {
                character_id: row.character_id,
                item: row.artifact_id
                  ? { qty: row.qty, artifact_id: row.artifact_id }
                  : { name: row.name.trim(), qty: row.qty },
              }
            }
            return {
              character_id: row.character_id,
              coins: {
                cp: row.cp,
                sp: row.sp,
                ep: row.ep,
                gp: row.gp,
                pp: row.pp,
              },
            }
          }),
          note: note.trim() || undefined,
        })
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Находка → кому → сразу в инвентарь. Артефакт из сеттинга несёт способности и
          пассивы на лист.
        </Text>

        <Stack gap={8}>
          <Text as="h4" className="session-xp-recipients__title">
            Предмет
          </Text>
          {artifacts.length > 0 ? (
            <Field label="Из библиотеки сеттинга">
              <select
                className="ui-input"
                value={draftArtifactId}
                disabled={busy || seats.length === 0}
                onChange={(e) => {
                  setDraftArtifactId(e.target.value)
                  if (e.target.value) setDraftName('')
                }}
              >
                <option value="">— свободный текст / не артефакт —</option>
                {artifacts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.rarity ? ` (${a.rarity})` : ''}
                    {a.requires_attunement ? ' · настройка' : ''}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Text tone="muted">
              В сеттинге сессии пока нет артефактов — создай их на странице сеттинга.
            </Text>
          )}
          <div className="session-loot-compose">
            <Field label={draftArtifactId ? 'Выбран артефакт' : 'Название'}>
              <Input
                value={draftArtifactId ? artifacts.find((a) => a.id === draftArtifactId)?.name ?? '' : draftName}
                disabled={busy || seats.length === 0 || Boolean(draftArtifactId)}
                placeholder="Зелье лечения"
                onChange={(e) => setDraftName(e.target.value)}
              />
            </Field>
            <Field label="Кол-во">
              <NumberInput
                value={draftQty}
                min={1}
                max={999}
                integer
                emptyValue={1}
                disabled={busy}
                onValueChange={setDraftQty}
              />
            </Field>
            <Field label="Кому">
              <select
                className="ui-input"
                value={draftWho}
                disabled={busy || seats.length === 0}
                onChange={(e) => setDraftWho(e.target.value)}
              >
                {seats.map((s) => (
                  <option key={s.character_id} value={s.character_id}>
                    {s.character_name}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !canAddItem}
              onClick={addItem}
            >
              + В список
            </Button>
          </div>
        </Stack>

        <Stack gap={8}>
          <Text as="h4" className="session-xp-recipients__title">
            Монеты
          </Text>
          <div className="session-loot-compose session-loot-compose--coins">
            <Field label="зм">
              <NumberInput
                value={coinGp}
                min={0}
                max={1_000_000}
                integer
                emptyValue={null}
                disabled={busy}
                onValueChange={setCoinGp}
              />
            </Field>
            <Field label="см">
              <NumberInput
                value={coinSp}
                min={0}
                max={1_000_000}
                integer
                emptyValue={null}
                disabled={busy}
                onValueChange={setCoinSp}
              />
            </Field>
            <Field label="мм">
              <NumberInput
                value={coinCp}
                min={0}
                max={1_000_000}
                integer
                emptyValue={null}
                disabled={busy}
                onValueChange={setCoinCp}
              />
            </Field>
            <Field label="Кому">
              <select
                className="ui-input"
                value={coinWho}
                disabled={busy || seats.length === 0}
                onChange={(e) => setCoinWho(e.target.value)}
              >
                {seats.map((s) => (
                  <option key={s.character_id} value={s.character_id}>
                    {s.character_name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="session-loot-compose__coin-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  busy ||
                  !coinWho ||
                  (coinGp ?? 0) + (coinSp ?? 0) + (coinCp ?? 0) <= 0
                }
                onClick={addCoins}
              >
                + Одному
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={
                  busy ||
                  seats.length === 0 ||
                  (coinGp ?? 0) + (coinSp ?? 0) + (coinCp ?? 0) <= 0
                }
                onClick={splitCoinsToAll}
              >
                Поровну всем
              </Button>
            </div>
          </div>
        </Stack>

        {rows.length > 0 ? (
          <ul className="session-loot-list">
            {rows.map((row) => (
              <li key={row.key}>
                <div className="session-loot-list__main">
                  {row.kind === 'item' ? (
                    <span>
                      {row.artifact_id ? '✦ ' : ''}
                      {row.name}
                      {row.qty > 1 ? ` × ${row.qty}` : ''}
                      {row.artifact_id ? ' (артефакт)' : ''}
                    </span>
                  ) : (
                    <span>
                      {COIN_META.filter((c) => row[c.key] > 0)
                        .map((c) => `${row[c.key]} ${c.label}`)
                        .join(' · ')}
                    </span>
                  )}
                  <Text tone="muted">→ {seatName(row.character_id)}</Text>
                </div>
                <button
                  type="button"
                  className="session-loot-list__remove"
                  disabled={busy}
                  title="Убрать"
                  onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Text tone="muted">Список пуст — добавь предмет или монеты.</Text>
        )}

        <Field label="Заметка (необязательно)">
          <Input
            value={note}
            disabled={busy}
            maxLength={240}
            placeholder="Обыск сундука / карман огра"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </Stack>
    </Dialog>
  )
}
