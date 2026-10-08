import { useEffect, useRef, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  ARMOR_KINDS,
  ARMOR_PRESETS,
  armorKindLabel,
  type ArmorKind,
} from '../../shared/dnd/armor'
import { parseItemCatalogData } from '../../shared/dnd/gearCatalog'
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
import {
  collapsePack,
  expandPack,
  findCatalogPackEntry,
  hasPackContents,
  hydrateCollapsedPackMeta,
  isExpandedPack,
  orderInventoryItems,
  readPackContents,
  removeInventoryItem,
  resolvePackContents,
  sumContentsWeightLb,
} from './inventoryPacks'

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
  const [catalogItems, setCatalogItems] = useState<CatalogEntry[]>([])
  const [packBusyId, setPackBusyId] = useState<string | null>(null)
  const inventoryRef = useRef(inventory)
  const onChangeRef = useRef(onChange)
  inventoryRef.current = inventory
  onChangeRef.current = onChange

  useEffect(() => {
    let cancelled = false
    listCatalogEntries({ kind: 'item', edition })
      .then((rows) => {
        if (!cancelled) setCatalogItems(rows)
      })
      .catch(() => {
        if (!cancelled) setCatalogItems([])
      })
    return () => {
      cancelled = true
    }
  }, [edition])

  // Starting grants often ship packs as bare names with null weight — fill from catalog
  // so encumbrance works before the player expands the pack.
  useEffect(() => {
    if (catalogItems.length === 0) return
    const current = inventoryRef.current
    let changed = false
    const nextItems = current.items.map((item) => {
      if (isExpandedPack(current.items, item.id)) return item
      const patch = hydrateCollapsedPackMeta(item, catalogItems)
      if (!patch) return item
      changed = true
      return { ...item, ...patch }
    })
    if (changed) {
      onChangeRef.current({ ...current, items: nextItems })
    }
  }, [catalogItems])

  const weighable = asWeighableItems(inventory.items)
  const itemsLb = itemsWeightLb(weighable)
  const coinsLb = coinWeightLb(inventory.coins)
  const totalLb = totalCarriedLb(inventory.coins, weighable)
  const capacityLb = carryingCapacityLb(strengthScore)
  const overEncumbered = totalLb > capacityLb
  const ordered = orderInventoryItems(inventory.items)

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
    const parsedItem = parseItemCatalogData(data)
    const isPack =
      selected.kind === 'item' &&
      (parsedItem.item_category === 'pack' || parsedItem.contents.length > 0)
    let weight =
      armor.weight_lb ??
      readCatalogWeightLb(data) ??
      inventory.items.find((item) => item.id === id)?.weight_lb ??
      null
    if (isPack && (weight == null || weight === 0) && parsedItem.contents.length > 0) {
      const resolved = resolvePackContents(parsedItem.contents, catalogItems)
      const sum = sumContentsWeightLb(resolved)
      if (sum > 0) weight = sum
    }
    updateItem(id, {
      name: selected.name_ru,
      catalog_id: selected.id,
      weight_lb: weight,
      armor_kind: armor.armor_kind ?? 'none',
      base_ac: armor.base_ac ?? null,
      max_dex_bonus: armor.max_dex_bonus ?? null,
      strength_requirement: armor.strength_requirement ?? null,
      container_kind: isPack
        ? 'pack'
        : parsedItem.item_category === 'tool'
          ? 'kit'
          : parsedItem.item_category === 'container'
            ? 'container'
            : 'none',
      container_expanded: false,
    })
  }

  function applyPreset(id: string, presetKey: string) {
    if (!presetKey) return
    const preset = ARMOR_PRESETS.find((item) => item.key === presetKey)
    if (!preset) return
    const maxDex =
      preset.kind === 'medium' ? 2 : preset.kind === 'heavy' ? 0 : null
    const strReq =
      preset.key === 'chain_mail' ? 13 : preset.key === 'splint' || preset.key === 'plate' ? 15 : null
    updateItem(id, {
      name: preset.labelRu,
      armor_kind: preset.kind,
      base_ac: preset.baseAc,
      weight_lb: preset.weight_lb,
      max_dex_bonus: maxDex,
      strength_requirement: strReq,
    })
  }

  function setArmorKind(id: string, armor_kind: ArmorKind) {
    const item = inventory.items.find((row) => row.id === id)
    if (!item) return
    if (armor_kind === 'none') {
      updateItem(id, {
        armor_kind,
        base_ac: null,
        max_dex_bonus: null,
        strength_requirement: null,
      })
      return
    }
    const preset = ARMOR_PRESETS.find((row) => row.kind === armor_kind)
    updateItem(id, {
      armor_kind,
      base_ac: item.base_ac ?? preset?.baseAc ?? (armor_kind === 'shield' ? 2 : 10),
      max_dex_bonus:
        armor_kind === 'medium' ? 2 : armor_kind === 'heavy' ? 0 : null,
      strength_requirement:
        armor_kind === 'heavy'
          ? (item.strength_requirement ??
            (preset?.key === 'chain_mail'
              ? 13
              : preset?.key === 'splint' || preset?.key === 'plate'
                ? 15
                : null))
          : null,
    })
  }

  function canExpand(item: InventoryItem): boolean {
    if (item.parent_id) return false
    if (isExpandedPack(inventory.items, item.id)) return false
    if (item.container_kind === 'pack' || item.container_kind === 'kit') return true
    const hit = findCatalogPackEntry(item, catalogItems)
    if (hit && hasPackContents(hit.data ?? undefined)) return true
    // Grant names before catalog loads — still show the button.
    return /набор/i.test(item.name)
  }

  async function onExpandPack(item: InventoryItem) {
    setPackBusyId(item.id)
    try {
      let rows = catalogItems
      if (rows.length === 0) {
        rows = await listCatalogEntries({ kind: 'item', edition })
        setCatalogItems(rows)
      }
      const hit = findCatalogPackEntry(item, rows)
      const contents = readPackContents(hit?.data ?? undefined)
      if (contents.length === 0) return
      const resolved = resolvePackContents(contents, rows)
      let items = inventory.items.map((row) =>
        row.id === item.id && hit
          ? {
              ...row,
              catalog_id: row.catalog_id ?? hit.id,
              name: row.name || hit.name_ru,
              container_kind: 'pack' as const,
            }
          : row,
      )
      const current = items.find((row) => row.id === item.id)
      if (current && (current.weight_lb == null || current.weight_lb === 0)) {
        const sum = sumContentsWeightLb(resolved)
        if (sum > 0) {
          items = items.map((row) =>
            row.id === item.id ? { ...row, weight_lb: sum, pack_weight_lb: sum } : row,
          )
        }
      }
      onChange({
        ...inventory,
        items: expandPack({ items, packId: item.id, contents: resolved }),
      })
    } finally {
      setPackBusyId(null)
    }
  }

  function onCollapsePack(item: InventoryItem) {
    onChange({
      ...inventory,
      items: collapsePack({ items: inventory.items, packId: item.id }),
    })
  }

  return (
    <Panel title="Инвентарь">
      <Stack gap={14}>
        <Text tone="muted">
          Монеты, вещи, броня. Наборы можно раскрыть — содержимое идёт отдельными строками и считает
          вес/перегруз. 20 бурдюков = одна строка с кол-вом, не набор.
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
          {ordered.map((item) => {
            const nested = Boolean(item.parent_id)
            const expanded = isExpandedPack(inventory.items, item.id)
            return (
              <div
                key={item.id}
                className={`inventory-card${nested ? ' inventory-card--nested' : ''}${
                  expanded ? ' inventory-card--pack-open' : ''
                }`}
              >
                {nested ? (
                  <Text tone="muted" className="inventory-card__nest-label">
                    в наборе
                  </Text>
                ) : null}
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

                {!nested ? (
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
                        onChange={(event) =>
                          setArmorKind(item.id, event.target.value as ArmorKind)
                        }
                      >
                        {ARMOR_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {armorKindLabel(kind)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                ) : null}

                {!nested && item.armor_kind !== 'none' ? (
                  <Field
                    label={
                      item.armor_kind === 'shield' ? 'Бонус КД щита' : 'Базовый КД доспеха'
                    }
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
                  {!nested ? (
                    <button
                      type="button"
                      className={`sheet-chip${item.equipped ? ' is-on' : ''}`}
                      onClick={() =>
                        onChange({
                          ...inventory,
                          items: equipInventoryItem(
                            inventory.items,
                            item.id,
                            !item.equipped,
                          ),
                        })
                      }
                    >
                      {item.equipped ? 'Надето' : 'Не надето'}
                    </button>
                  ) : null}
                  {canExpand(item) ? (
                    <Button
                      variant="secondary"
                      disabled={packBusyId === item.id}
                      onClick={() => void onExpandPack(item)}
                    >
                      {packBusyId === item.id ? 'Раскрываю…' : 'Раскрыть набор'}
                    </Button>
                  ) : null}
                  {expanded ? (
                    <Button variant="secondary" onClick={() => onCollapsePack(item)}>
                      Свернуть набор
                    </Button>
                  ) : null}
                  <Text tone="muted">
                    Строка: {formatLb(itemLineWeightLb(item))} фнт
                    {expanded ? ' · вес в содержимом' : ''}
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
                        items: removeInventoryItem(inventory.items, item.id),
                      })
                    }
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            )
          })}
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
