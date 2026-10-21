/**
 * DEV-only harness for consumables tap-guard screenshots.
 * Not Play Desk SoT — mock inventory, no auth/API.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { PlayDeskAttacksCompact } from '../features/characters/PlayDeskAttacksCompact'
import { ConsumableSpendPadDialog } from '../features/characters/ConsumableSpendPadDialog'
import {
  appendConsumableSpendLog,
  formatConsumableSpendToast,
  formatConsumableUndoToast,
  markConsumableSpendUndone,
  newConsumableSpendId,
  type ConsumableSpendLogEntry,
  type ConsumableUndoSession,
} from '../features/characters/consumableSpend'
import type { InventoryItem } from '../features/characters/inventory'
import type { AbilityKey } from '../features/characters/sheetTypes'
import {
  Toast,
  normalizeToast,
  toastMessageOf,
  type ToastInput,
  type ToastPayload,
} from '../ui'

function mockItem(
  partial: Pick<InventoryItem, 'id' | 'name' | 'qty'> & Partial<InventoryItem>,
): InventoryItem {
  return {
    catalog_id: null,
    weight_lb: null,
    notes: '',
    equipped: false,
    armor_kind: 'none',
    base_ac: null,
    parent_id: null,
    ...partial,
  }
}

const INITIAL_ITEMS: InventoryItem[] = [
  mockItem({ id: 'bolts', name: 'Болты арбалета', qty: 18 }),
  mockItem({ id: 'potion', name: 'Зелье лечения', qty: 3 }),
  mockItem({ id: 'oil', name: 'Масло', qty: 1 }),
]

const ZERO_ABS: Record<AbilityKey, number> = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
}

export function ConsumablesTapGuardPreviewPage() {
  const [items, setItems] = useState(INITIAL_ITEMS)
  const [log, setLog] = useState<ConsumableSpendLogEntry[]>([])
  const [padId, setPadId] = useState<string | null>(null)
  const [toast, setToastState] = useState<ToastPayload | null>(null)
  const undoRef = useRef<ConsumableUndoSession | null>(null)

  const setToast = useCallback((input: ToastInput | null) => {
    setToastState(input == null ? null : normalizeToast(input))
  }, [])
  const closeToast = useCallback(() => setToastState(null), [])

  const favoriteIds = useMemo(() => ['bolts', 'potion'], [])

  const undo = useCallback(
    (session: ConsumableUndoSession) => {
      if (undoRef.current?.token === session.token) undoRef.current = null
      setItems((prev) =>
        prev.map((row) =>
          row.id === session.itemId
            ? { ...row, qty: (row.qty ?? 0) + session.amount }
            : row,
        ),
      )
      setLog((prev) => markConsumableSpendUndone(prev, session.logId))
      setToast(formatConsumableUndoToast(session.name, session.amount))
    },
    [setToast],
  )

  const spend = useCallback(
    (itemId: string, amount = 1) => {
      const item = items.find((row) => row.id === itemId)
      if (!item || (item.qty ?? 0) <= 0) return
      const spendAmount = Math.max(1, Math.min(amount, item.qty ?? 0))
      const nextQty = Math.max(0, (item.qty ?? 0) - spendAmount)
      const logId = newConsumableSpendId()
      const token = Date.now()
      const session: ConsumableUndoSession = {
        token,
        itemId,
        name: item.name,
        amount: spendAmount,
        logId,
      }
      undoRef.current = session
      setItems((prev) =>
        prev.map((row) =>
          row.id === itemId
            ? { ...row, qty: Math.max(0, (row.qty ?? 0) - spendAmount) }
            : row,
        ),
      )
      setLog((prev) =>
        appendConsumableSpendLog(prev, {
          id: logId,
          itemId,
          name: item.name,
          amount: spendAmount,
          atMs: token,
        }),
      )
      setToast({
        message: formatConsumableSpendToast(item.name, spendAmount, nextQty),
        durationMs: 8000,
        actionLabel: 'Отменить',
        onAction: () => {
          if (undoRef.current?.token !== token) return
          undo(session)
        },
      })
    },
    [items, setToast, undo],
  )

  const padItem = padId ? items.find((row) => row.id === padId) : null

  return (
    <main className="page page--app" style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <p className="ui-text ui-text--muted" style={{ marginBottom: 12 }}>
        DEV preview · расходники (не прод Play Desk)
      </p>
      <div
        className="play-desk play-desk--mobile"
        style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}
      >
        <PlayDeskAttacksCompact
          weapons={[]}
          abilities={ZERO_ABS}
          proficiencyBonus={2}
          resources={[]}
          inventoryItems={items}
          favoriteConsumableIds={favoriteIds}
          onOpenSettings={() => undefined}
          onSpendConsumable={spend}
          onOpenConsumableSpendPad={setPadId}
          consumableSpendLog={log}
          onUndoConsumableSpend={(logId) => {
            const entry = log.find((row) => row.id === logId)
            if (!entry || entry.undone) return
            undo({
              token: entry.atMs,
              itemId: entry.itemId,
              name: entry.name,
              amount: entry.amount,
              logId: entry.id,
            })
          }}
          onToast={(message) => setToast(message)}
        />
      </div>

      <ConsumableSpendPadDialog
        key={padId ?? 'consumable-spend-pad-closed'}
        open={padItem != null}
        itemName={padItem?.name ?? 'Расходник'}
        maxQty={padItem?.qty ?? 0}
        onClose={() => setPadId(null)}
        onConfirm={(amount) => {
          const id = padId
          setPadId(null)
          if (id) spend(id, amount)
        }}
      />

      <Toast
        message={toastMessageOf(toast)}
        durationMs={toast?.durationMs}
        actionLabel={toast?.actionLabel}
        onAction={
          toast?.onAction
            ? () => {
                const action = toast.onAction
                closeToast()
                action?.()
              }
            : undefined
        }
        onClose={closeToast}
      />
    </main>
  )
}
