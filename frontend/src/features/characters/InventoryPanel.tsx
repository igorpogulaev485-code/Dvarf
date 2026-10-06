import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  coinWeightLb,
  carryingCapacityLb,
  formatLb,
  itemLineWeightLb,
  itemsWeightLb,
  totalCarriedLb,
  type CoinPurse,
} from '../../shared/dnd/weight'
import { Button, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
import {
  asWeighableItems,
  createInventoryItem,
  readCatalogWeightLb,
  type InventoryItem,
  type InventoryState,
} from './inventory'

const COIN_FIELDS: Array<{ key: keyof CoinPurse; label: string }> = [
  { key: 'cp', label: 'ММ' },
  { key: 'sp', label: 'СМ' },
  { key: 'ep', label: 'ЭМ' },
  { key: 'gp', label: 'ЗМ' },
  { key: 'pp', label: 'ПМ' },
]

type InventoryPanelProps = {
  edition: RulesEdition
  inventory: InventoryState
  strengthScore: number
  onChange: (inventory: InventoryState) => void
}

export function InventoryPanel({
  edition,
  inventory,
  strengthScore,
  onChange,
}: InventoryPanelProps) {
  const weighable = asWeighableItems(inventory.items)
  const itemsLb = itemsWeightLb(weighable)
  const coinsLb = coinWeightLb(inventory.coins)
  const totalLb = totalCarriedLb(inventory.coins, weighable)
  const capacityLb = carryingCapacityLb(strengthScore)
  const overEncumbered = totalLb > capacityLb

  function setCoins(patch: Partial<CoinPurse>) {
    onChange({
      ...inventory,
      coins: { ...inventory.coins, ...patch },
    })
  }

  function updateItem(id: string, patch: Partial<InventoryItem>) {
    onChange({
      ...inventory,
      items: inventory.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  function applyCatalog(id: string, value: string, selected: CatalogEntry | null) {
    if (!selected) {
      updateItem(id, { name: value, catalog_id: null })
      return
    }
    const data = selected.data ?? {}
    updateItem(id, {
      name: selected.name_ru,
      catalog_id: selected.id,
      weight_lb: readCatalogWeightLb(data) ?? inventory.items.find((item) => item.id === id)?.weight_lb ?? null,
    })
  }

  return (
    <Panel title="Инвентарь">
      <Stack gap={14}>
        <Text tone="muted">
          Монеты и вещи с весом. Итоговый вес считается сам (50 монет = 1 фнт) — лимит по СИЛ × 15.
          Настройка магических предметов — блок ниже. Контейнеры — позже.
        </Text>

        <div className="inventory-summary">
          <div>
            <Text tone="muted">Вещи</Text>
            <strong>{formatLb(itemsLb)} фнт</strong>
          </div>
          <div>
            <Text tone="muted">Монеты</Text>
            <strong>{formatLb(coinsLb)} фнт</strong>
          </div>
          <div>
            <Text tone="muted">Итого</Text>
            <strong className={overEncumbered ? 'inventory-summary__over' : undefined}>
              {formatLb(totalLb)} / {formatLb(capacityLb)} фнт
            </strong>
          </div>
        </div>
        {overEncumbered ? (
          <Text tone="danger">Перегруз: итого больше лимита переноски (СИЛ × 15).</Text>
        ) : null}

        <div>
          <Text>Монеты</Text>
          <div className="sheet-grid sheet-grid--coins">
            {COIN_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <NumberInput
                  min={0}
                  emptyValue={0}
                  value={inventory.coins[field.key]}
                  onValueChange={(next) => setCoins({ [field.key]: next ?? 0 })}
                />
              </Field>
            ))}
          </div>
        </div>

        <Stack gap={12}>
          {inventory.items.map((item) => (
            <div key={item.id} className="inventory-card">
              <div className="inventory-card__grid">
                <Field label="Предмет" hint="Справочник или своё название">
                  <CatalogCombobox
                    kinds={['item', 'weapon', 'armor']}
                    edition={edition}
                    value={item.name}
                    placeholder="Название вещи"
                    onChange={(value, selected) => applyCatalog(item.id, value, selected)}
                  />
                </Field>
                <Field label="Кол-во">
                  <NumberInput
                    min={0}
                    emptyValue={1}
                    value={item.qty}
                    onValueChange={(qty) => updateItem(item.id, { qty: qty ?? 0 })}
                  />
                </Field>
                <Field label="Вес, фнт" hint="за 1 шт.">
                  <NumberInput
                    min={0}
                    step={0.1}
                    integer={false}
                    emptyValue={null}
                    value={item.weight_lb}
                    onValueChange={(weight_lb) => updateItem(item.id, { weight_lb })}
                  />
                </Field>
              </div>
              <Field label="Заметка">
                <Input
                  value={item.notes}
                  placeholder="Где лежит, для чего…"
                  onChange={(event) => updateItem(item.id, { notes: event.target.value })}
                />
              </Field>
              <div className="inventory-card__footer">
                <button
                  type="button"
                  className={`sheet-chip${item.equipped ? ' is-on' : ''}`}
                  onClick={() => updateItem(item.id, { equipped: !item.equipped })}
                >
                  {item.equipped ? 'Надето' : 'Не надето'}
                </button>
                <Text tone="muted">
                  Строка: {formatLb(itemLineWeightLb(item))} фнт
                </Text>
                <Button
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      ...inventory,
                      items: inventory.items.filter((row) => row.id !== item.id),
                    })
                  }
                >
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </Stack>

        <div>
          <Button
            variant="secondary"
            onClick={() =>
              onChange({
                ...inventory,
                items: [...inventory.items, createInventoryItem()],
              })
            }
          >
            Добавить предмет
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
