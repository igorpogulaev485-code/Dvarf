import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  ARMOR_KINDS,
  ARMOR_PRESETS,
  armorKindLabel,
  type ArmorKind,
} from '../../shared/dnd/armor'
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
  armorFieldsFromCatalog,
  asWeighableItems,
  createInventoryItem,
  equipInventoryItem,
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
    const armor = armorFieldsFromCatalog(selected)
    updateItem(id, {
      name: selected.name_ru,
      catalog_id: selected.id,
      weight_lb:
        armor.weight_lb ??
        readCatalogWeightLb(data) ??
        inventory.items.find((item) => item.id === id)?.weight_lb ??
        null,
      armor_kind: armor.armor_kind ?? 'none',
      base_ac: armor.base_ac ?? null,
    })
  }

  function applyPreset(id: string, presetKey: string) {
    if (!presetKey) return
    const preset = ARMOR_PRESETS.find((item) => item.key === presetKey)
    if (!preset) return
    updateItem(id, {
      name: preset.labelRu,
      armor_kind: preset.kind,
      base_ac: preset.baseAc,
      weight_lb: preset.weight_lb,
    })
  }

  function setArmorKind(id: string, armor_kind: ArmorKind) {
    const item = inventory.items.find((row) => row.id === id)
    if (!item) return
    if (armor_kind === 'none') {
      updateItem(id, { armor_kind, base_ac: null })
      return
    }
    const preset = ARMOR_PRESETS.find((row) => row.kind === armor_kind)
    updateItem(id, {
      armor_kind,
      base_ac: item.base_ac ?? preset?.baseAc ?? (armor_kind === 'shield' ? 2 : 10),
    })
  }

  return (
    <Panel title="Инвентарь">
      <Stack gap={14}>
        <Text tone="muted">
          Монеты, вещи, броня. Надетый доспех/щит считают КД в шапке (10+ЛОВ без брони). Контейнеры —
          позже.
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

              <div className="sheet-grid sheet-grid--2">
                <Field label="Шаблон брони">
                  <select
                    className="play-select"
                    value=""
                    onChange={(event) => applyPreset(item.id, event.target.value)}
                  >
                    <option value="">— выбрать —</option>
                    {ARMOR_PRESETS.map((preset) => (
                      <option key={preset.key} value={preset.key}>
                        {preset.labelRu} (
                        {preset.kind === 'shield' ? `+${preset.baseAc}` : preset.baseAc})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Тип для КД">
                  <select
                    className="play-select"
                    value={item.armor_kind}
                    onChange={(event) => setArmorKind(item.id, event.target.value as ArmorKind)}
                  >
                    {ARMOR_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {armorKindLabel(kind)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {item.armor_kind !== 'none' ? (
                <Field
                  label={item.armor_kind === 'shield' ? 'Бонус КД щита' : 'Базовый КД доспеха'}
                >
                  <NumberInput
                    min={0}
                    max={30}
                    emptyValue={item.armor_kind === 'shield' ? 2 : 10}
                    value={item.base_ac}
                    onValueChange={(base_ac) => updateItem(item.id, { base_ac })}
                  />
                </Field>
              ) : null}

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
                  onClick={() =>
                    onChange({
                      ...inventory,
                      items: equipInventoryItem(inventory.items, item.id, !item.equipped),
                    })
                  }
                >
                  {item.equipped ? 'Надето' : 'Не надето'}
                </button>
                <Text tone="muted">
                  Строка: {formatLb(itemLineWeightLb(item))} фнт
                  {item.armor_kind !== 'none'
                    ? ` · ${armorKindLabel(item.armor_kind)}${
                        item.base_ac != null
                          ? item.armor_kind === 'shield'
                            ? ` +${item.base_ac}`
                            : ` ${item.base_ac}`
                          : ''
                      }`
                    : ''}
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
