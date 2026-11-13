import { Button, Field, Input, Stack, Text } from '../../ui'
import type { InventoryItem } from './inventory'
import {
  attunementPickerItems,
  createAttunementSlot,
  filledAttunementCount,
  maxAttunementsForClasses,
  type AttunementSlot,
} from './attunement'
import {
  ROBE_COLOR_OPTIONS,
  attunementChoiceReason,
  requirementBlock,
  slotOverLimit,
  type AttunementCharacter,
  type RobeColor,
} from './attunementRules'

export type AttunementEditorProps = {
  attunements: AttunementSlot[]
  inventoryItems: InventoryItem[]
  character?: AttunementCharacter | null
  onChange: (attunements: AttunementSlot[]) => void
  onPatchItem?: (itemId: string, patch: Partial<InventoryItem>) => void
}

/** Shared body for Explore `AttunementDialog` (ЕЩЁ stage removed). */
export function AttunementEditor({
  attunements,
  inventoryItems,
  character,
  onChange,
  onPatchItem,
}: AttunementEditorProps) {
  const limit = maxAttunementsForClasses(character?.classes ?? [])
  const filled = filledAttunementCount(attunements)
  const needingAttune = inventoryItems.filter(
    (item) => !item.parent_id && item.requires_attunement,
  )
  const linkedNeeding = needingAttune.filter((item) =>
    attunements.some((slot) => slot.item_id === item.id),
  )
  const unlinkedNeeding = needingAttune.length - linkedNeeding.length

  function updateSlot(id: string, patch: Partial<AttunementSlot>) {
    onChange(attunements.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)))
  }

  function addSlot() {
    if (attunements.length >= limit) return
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
    if (!item) return
    const choice = attunementChoiceReason({
      item,
      slots: attunements,
      items: inventoryItems,
      currentSlotId: slotId,
      character,
    })
    if (choice.blocked) return
    updateSlot(slotId, {
      item_id: itemId,
      name: item.name || attunements.find((slot) => slot.id === slotId)?.name || '',
    })
  }

  return (
    <Stack gap={12} className="attune-editor">
      <Text tone="muted">
        До {limit} настроенных магических предметов (занято {filled}/{limit}
        {filled > limit ? ', сверх лимита' : ''}). В списке — вещи с пометкой «нужна настройка», ещё не занявшие слот.
        Привязка слота надевает предмет (доспех, щит, слот ношения).
      </Text>

      <div className="attune-panel__toolbar">
        <span className={`sheet-chip${filled > 0 ? ' is-on' : ''}`}>
          {filled}/{limit}
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={attunements.length >= limit}
          onClick={addSlot}
        >
          + слот
        </Button>
      </div>

      {needingAttune.length > 0 ? (
        <Text tone={unlinkedNeeding > 0 ? 'danger' : 'muted'}>
          Нужна настройка: {linkedNeeding.length}/{needingAttune.length} уже в слотах
          {unlinkedNeeding > 0 ? ` · ещё ${unlinkedNeeding} без настройки` : ''}
          {filled > limit
            ? ` · сверх лимита: лишние предметы не действуют`
            : needingAttune.length > limit
              ? ` · лимит ${limit}, выбери какие активны`
              : ''}
          .
        </Text>
      ) : (
        <Text tone="muted">В инвентаре нет предметов с флагом «нужна настройка».</Text>
      )}

      {attunements.length === 0 ? (
        <Text tone="muted">Пока пусто — добавь слот настройки.</Text>
      ) : (
        attunements.map((slot, index) => {
          const linked = inventoryItems.find((item) => item.id === slot.item_id) ?? null
          const over = slotOverLimit(attunements, slot.id, character?.classes ?? [])
          const linkedBlock = linked
            ? attunementChoiceReason({
                item: linked,
                slots: attunements,
                items: inventoryItems,
                currentSlotId: slot.id,
                character,
              })
            : null
          const raceHint =
            linked && !linkedBlock?.blocked
              ? requirementBlock(linked, character).hint
              : linkedBlock?.hint ?? null
          return (
          <div key={slot.id} className="attune-card">
            <div className="attune-card__head">
              <strong>Слот {index + 1}</strong>
              <button
                type="button"
                className="attune-card__remove"
                onClick={() => removeSlot(slot.id)}
                aria-label={`Снять слот ${index + 1}`}
              >
                Снять
              </button>
            </div>
            <Field label="Из инвентаря (нужна настройка, ещё не настроено)">
              <select
                className="play-select"
                value={slot.item_id ?? ''}
                onChange={(event) => linkItem(slot.id, event.target.value)}
              >
                <option value="">— вручную —</option>
                {attunementPickerItems({
                  items: inventoryItems,
                  attunements,
                  currentSlotId: slot.id,
                }).map((item) => {
                  const choice = attunementChoiceReason({
                    item,
                    slots: attunements,
                    items: inventoryItems,
                    currentSlotId: slot.id,
                    character,
                  })
                  const label = item.name || 'Без названия'
                  return (
                    <option key={item.id} value={item.id} disabled={choice.blocked}>
                      {choice.blocked && choice.reason ? `${label} — ${choice.reason}` : label}
                    </option>
                  )
                })}
              </select>
            </Field>
            {over ? (
              <Text tone="danger">Сверх лимита настройки — предмет не действует.</Text>
            ) : null}
            {linkedBlock?.blocked && linkedBlock.reason ? (
              <Text tone="danger">{linkedBlock.reason}. Предмет не действует.</Text>
            ) : null}
            {raceHint ? <Text tone="muted">{raceHint}</Text> : null}
            {linked?.alignment_color_gate ? (
              <Field label="Цвет мантии">
                <select
                  className="play-select"
                  value={linked.robe_color ?? ''}
                  onChange={(event) => {
                    const color = event.target.value
                    onPatchItem?.(linked.id, {
                      robe_color:
                        color === 'white' || color === 'gray' || color === 'black'
                          ? (color as RobeColor)
                          : null,
                    })
                  }}
                >
                  <option value="">— укажите цвет —</option>
                  {ROBE_COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
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
          )
        })
      )}
    </Stack>
  )
}
