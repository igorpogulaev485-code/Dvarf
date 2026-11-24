/**
 * Hot-bar / resource spend: Blessing of the Forge needs an item pick.
 * Charge is spent only after a successful assign (same as Pack03 ForgeControls).
 */

import { useEffect, useState } from 'react'
import { Dialog, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  applyForgeBlessing,
  listForgeBlessingCandidates,
  type ForgeBlessingCandidate,
} from './forgeBlessing'
import type { InventoryItem } from './inventory'

export type ForgeBlessingSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  inventoryItems: InventoryItem[]
  pinnedItemId: string | null
  onPinItemId: (itemId: string | null) => void
  onConfirm: (input: {
    items: InventoryItem[]
    message: string
    resourceId: string
  }) => void
  onToast: (message: string) => void
  onClose: () => void
}

export function ForgeBlessingSpendDialog({
  open,
  resource,
  inventoryItems,
  pinnedItemId,
  onPinItemId,
  onConfirm,
  onToast,
  onClose,
}: ForgeBlessingSpendDialogProps) {
  const candidates = listForgeBlessingCandidates(inventoryItems)
  const defaultId =
    (pinnedItemId && candidates.some((row) => row.id === pinnedItemId)
      ? pinnedItemId
      : candidates[0]?.id) ?? ''
  const [itemId, setItemId] = useState(defaultId)
  const [remember, setRemember] = useState(Boolean(pinnedItemId))

  useEffect(() => {
    if (!open) return
    setItemId(defaultId)
    setRemember(Boolean(pinnedItemId && pinnedItemId === defaultId))
  }, [open, defaultId, pinnedItemId])

  const picked = candidates.some((row) => row.id === itemId)
    ? itemId
    : (candidates[0]?.id ?? '')
  const left = resource ? Math.max(0, resource.max - resource.used) : 0

  function apply() {
    if (!resource || left <= 0) {
      onToast('Заряд Благословения кузницы пуст')
      return
    }
    if (!picked) {
      onToast('Нужен немагический доспех или оружие')
      return
    }
    const applied = applyForgeBlessing(inventoryItems, picked)
    if (!applied.ok) {
      onToast(applied.reason)
      return
    }
    if (remember) onPinItemId(picked)
    else if (pinnedItemId === picked) onPinItemId(null)
    onConfirm({
      items: applied.items,
      message: applied.message,
      resourceId: resource.id,
    })
  }

  return (
    <Dialog
      open={open}
      title="Благословение кузницы"
      primaryLabel="Благословить"
      secondaryLabel="Отмена"
      onPrimary={apply}
      onSecondary={onClose}
      onDismiss={onClose}
      primaryDisabled={!picked || left <= 0 || candidates.length === 0}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Немагическое оружие или доспех. Заряд тратится только после выбора. Бонус
          спадает на продолжительном отдыхе.
        </Text>
        {candidates.length === 0 ? (
          <Text tone="muted">
            В инвентаре нет подходящего немагического оружия или доспеха.
          </Text>
        ) : (
          <>
            <label className="feature-resource__select">
              <span className="sr-only">Предмет благословения</span>
              <select
                className="play-select"
                value={picked}
                onChange={(event) => setItemId(event.target.value)}
              >
                {candidates.map((row: ForgeBlessingCandidate) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · {row.kind === 'armor' ? '+1 КД' : '+1 атака и урон'}
                    {pinnedItemId === row.id ? ' · закреплён' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="feature-resource__select">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />{' '}
              Запомнить предмет (следующий раз с hot-бара — сразу на него)
            </label>
          </>
        )}
      </Stack>
    </Dialog>
  )
}
