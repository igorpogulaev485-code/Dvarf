/**
 * Превью P2P «Передать» · /dev/transfer-preview
 */
import { useState } from 'react'
import { InventoryPanel } from '../features/characters/InventoryPanel'
import type { InventoryState } from '../features/characters/inventory'
import { Stack, Text, Toast } from '../ui'

const SEED: InventoryState = {
  coins: { cp: 40, sp: 12, ep: 0, gp: 85, pp: 0 },
  items: [
    {
      id: 'sword-1',
      name: 'Длинный меч',
      catalog_id: null,
      qty: 1,
      weight_lb: 3,
      equipped: true,
      armor_kind: 'none',
      base_ac: null,
      notes: '',
    },
    {
      id: 'potion-1',
      name: 'Зелье лечения',
      catalog_id: null,
      qty: 3,
      weight_lb: 0.5,
      equipped: false,
      armor_kind: 'none',
      base_ac: null,
      notes: '',
    },
  ],
}

export function TransferPreviewPage() {
  const [inventory, setInventory] = useState(SEED)
  const [toast, setToast] = useState<string | null>(null)

  return (
    <main className="page page--app">
      <Stack gap={16}>
        <Text as="h1">Передать · превью</Text>
        <Text tone="muted">/dev/transfer-preview</Text>
        <InventoryPanel
          edition="2014"
          inventory={inventory}
          strengthScore={14}
          onChange={setInventory}
          transferPeers={[
            {
              lobby_id: 'l1',
              lobby_name: 'Эхо Рассвета',
              character_id: 'c2',
              character_name: 'Вирра',
            },
            {
              lobby_id: 'l1',
              lobby_name: 'Эхо Рассвета',
              character_id: 'c3',
              character_name: 'Грок',
            },
          ]}
          onTransfer={(payload) => {
            if (payload.item_id) {
              setInventory((prev) => ({
                ...prev,
                items: prev.items
                  .map((item) => {
                    if (item.id !== payload.item_id) return item
                    const nextQty = item.qty - (payload.qty ?? 1)
                    return { ...item, qty: nextQty }
                  })
                  .filter((item) => item.qty > 0),
              }))
              setToast(
                `→ ${payload.to_character_id === 'c2' ? 'Вирра' : 'Грок'}: предмет`,
              )
              return
            }
            if (payload.coin_currency && payload.coin_amount) {
              const key = payload.coin_currency
              setInventory((prev) => ({
                ...prev,
                coins: {
                  ...prev.coins,
                  [key]: Math.max(0, prev.coins[key] - payload.coin_amount!),
                },
              }))
              setToast(
                `→ ${payload.to_character_id === 'c2' ? 'Вирра' : 'Грок'}: ${payload.coin_amount} ${key}`,
              )
            }
          }}
        />
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
