import { Button, Field, Input, Panel, Stack, Text } from '../../ui'
import type { InventoryItem } from './inventory'
import {
  MAX_ATTUNEMENTS,
  createAttunementSlot,
  filledAttunementCount,
  type AttunementSlot,
} from './attunement'
import { attunementEligibleItems } from './wearEquip'

type AttunementPanelProps = {
  attunements: AttunementSlot[]
  inventoryItems: InventoryItem[]
  onChange: (attunements: AttunementSlot[]) => void
}

export function AttunementPanel({
  attunements,
  inventoryItems,
  onChange,
}: AttunementPanelProps) {
  const filled = filledAttunementCount(attunements)
  const eligible = attunementEligibleItems(inventoryItems)
  const needingAttune = inventoryItems.filter(
    (item) => !item.parent_id && item.requires_attunement,
  )
  const linkedNeeding = needingAttune.filter((item) =>
    attunements.some((slot) => slot.item_id === item.id),
  )

  function updateSlot(id: string, patch: Partial<AttunementSlot>) {
    onChange(attunements.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)))
  }

  function addSlot() {
    if (attunements.length >= MAX_ATTUNEMENTS) return
    onChange([...attunements, createAttunementSlot()])
  }

  function removeSlot(id: string) {
    onChange(attunements.filter((slot) => slot.id !== id))
  }

  function linkItem(slotId: string, itemId: string) {
    if (!itemId) {
      updateSlot(slotId, { item_id: null })
      return
    }
    const item = inventoryItems.find((row) => row.id === itemId)
    updateSlot(slotId, {
      item_id: itemId,
      name: item?.name || attunements.find((slot) => slot.id === slotId)?.name || '',
    })
  }

  return (
    <Panel title="Настройка (attunement)">
      <Stack gap={12}>
        <Text tone="muted">
          До {MAX_ATTUNEMENTS} предметов · занято {filled}/{MAX_ATTUNEMENTS}. Привяжи строку
          инвентаря с «нужна настройка» или чудо-предмет со слотом ношения.
        </Text>

        {needingAttune.length > 0 ? (
          <Text tone={linkedNeeding.length < needingAttune.length ? 'danger' : 'muted'}>
            В инвентаре с настройкой: {linkedNeeding.length}/{needingAttune.length} привязано к
            слотам
            {needingAttune.length > MAX_ATTUNEMENTS
              ? ` · лимит PHB ${MAX_ATTUNEMENTS}, выбери какие активны`
              : ''}
            .
          </Text>
        ) : null}

        {attunements.length === 0 ? (
          <Text tone="muted">Пока пусто — добавь слот настройки.</Text>
        ) : (
          attunements.map((slot, index) => (
            <div key={slot.id} className="attune-card">
              <div className="attune-card__head">
                <strong>Слот {index + 1}</strong>
                <button type="button" className="linkish" onClick={() => removeSlot(slot.id)}>
                  Удалить
                </button>
              </div>
              <Field label="Из инвентаря">
                <select
                  className="play-select"
                  value={slot.item_id ?? ''}
                  onChange={(event) => linkItem(slot.id, event.target.value)}
                >
                  <option value="">— вручную —</option>
                  {(eligible.length > 0 ? eligible : inventoryItems).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || 'Без названия'}
                      {item.requires_attunement ? ' · настройка' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Название">
                <Input
                  value={slot.name}
                  onChange={(event) =>
                    updateSlot(slot.id, { name: event.target.value, item_id: slot.item_id })
                  }
                />
              </Field>
              <Field label="Заметки">
                <Input
                  value={slot.notes}
                  placeholder="заряды, условие…"
                  onChange={(event) => updateSlot(slot.id, { notes: event.target.value })}
                />
              </Field>
            </div>
          ))
        )}

        <Button
          type="button"
          variant="secondary"
          disabled={attunements.length >= MAX_ATTUNEMENTS}
          onClick={addSlot}
        >
          + слот настройки
        </Button>
      </Stack>
    </Panel>
  )
}
