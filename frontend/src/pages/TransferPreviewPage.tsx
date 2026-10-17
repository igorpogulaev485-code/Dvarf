/**
 * Превью инвентаря · /dev/transfer-preview
 * (P2P transfer UI живёт на боевом листе / сессии; этот route — smoke инвентаря.)
 */
import { useState } from 'react'
import { InventoryPanel } from '../features/characters/InventoryPanel'
import type { InventoryState } from '../features/characters/inventory'
import { Stack, Text } from '../ui'

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
  return (
    <main className="page page--app">
      <Stack gap={16}>
        <Text as="h1">Инвентарь · превью</Text>
        <Text tone="muted">/dev/transfer-preview</Text>
        <InventoryPanel
          edition="2014"
          inventory={inventory}
          strengthScore={14}
          armorProficiency={{ light: true, medium: true, heavy: false, shields: true }}
          onChange={setInventory}
        />
      </Stack>
    </main>
  )
}
