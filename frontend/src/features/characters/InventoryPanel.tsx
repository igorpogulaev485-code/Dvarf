import { useEffect, useRef, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { GearPickerDialog } from './GearPickerDialog'
import {
  applyGearAdd,
  type GearAddResult,
} from './gearFromCatalog'
import { syncAttacksHeldFromInventory, type WeaponAttack } from './AttacksPanel'
import {
  canShowEquipChip,
  equipLabel,
  resolveWeaponGrip,
} from './heldEquip'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets'
import {
  ARMOR_KINDS,
  ARMOR_PRESETS,
  armorKindLabel,
  type ArmorKind,
} from '../../shared/dnd/armor'
import {
  gearCostToGp,
  parseArmorCatalogData,
  parseItemCatalogData,
  parseWeaponCatalogData,
} from '../../shared/dnd/gearCatalog'
import {
  classifySpellTooling,
  FOCUS_KIND_LABEL_RU,
  focusSuggestionsFor,
  inferFocusKind,
  SPELL_TOOLING_LABEL_RU,
  type FocusKind,
  type SpellTooling,
} from './spellFocus'
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
  weapons?: WeaponAttack[]
  onChange: (inventory: InventoryState) => void
  /** When set, catalog weapon picks also append attack cards. */
  onWeaponsChange?: (weapons: WeaponAttack[]) => void
}

export function InventoryPanel({
  edition,
  inventory,
  strengthScore,
  weapons = [],
  onChange,
  onWeaponsChange,
}: InventoryPanelProps) {
  const [catalogItems, setCatalogItems] = useState<CatalogEntry[]>([])
  const [packBusyId, setPackBusyId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
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
      const grip = findWeaponPreset(value) ? resolveWeaponGrip({ name: value }) : null
      updateItem(id, { name: value, catalog_id: null, weapon_grip: grip })
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
    const weaponGrip =
      selected.kind === 'weapon'
        ? resolveWeaponGrip({ name: selected.name_ru, data })
        : null
    const cost =
      selected.kind === 'weapon'
        ? gearCostToGp(parseWeaponCatalogData(data).cost)
        : selected.kind === 'armor'
          ? gearCostToGp(parseArmorCatalogData(data).cost)
          : gearCostToGp(parsedItem.cost)
    const spellTooling =
      selected.kind === 'item'
        ? classifySpellTooling({
            name: selected.name_ru,
            catalog_slug: selected.slug,
            item_category: parsedItem.item_category,
          })
        : ('none' as const)
    const focusKind =
      spellTooling === 'focus'
        ? inferFocusKind({
            name: selected.name_ru,
            catalog_slug: selected.slug,
            item_category: parsedItem.item_category,
          }) ?? 'any'
        : null
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
      weapon_grip: weaponGrip,
      cost_gp: cost,
      spell_tooling: spellTooling,
      focus_kind: focusKind,
    })
  }

  function toggleEquip(item: InventoryItem) {
    const items = equipInventoryItem(inventory.items, item.id, !item.equipped)
    onChange({ ...inventory, items })
    if (onWeaponsChange) {
      onWeaponsChange(syncAttacksHeldFromInventory(weapons, items))
    }
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
          Монеты, вещи, броня. Оружие: «В руках» / «Убран» (двуручное = обе руки; иначе до двух
          одноручных или одноручное+щит). Наборы можно раскрыть — вес/перегруз. «Из справочника» —
          поиск и семьи вариантов.
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

                {!nested && item.armor_kind === 'none' ? (
                  <div className="sheet-grid sheet-grid--2">
                    <Field
                      label="Для заклинаний"
                      hint="Тип, не название — свой вид фокуса ок"
                    >
                      <select
                        className="play-select"
                        value={item.spell_tooling ?? 'none'}
                        onChange={(event) => {
                          const spell_tooling = event.target.value as SpellTooling
                          updateItem(item.id, {
                            spell_tooling,
                            focus_kind:
                              spell_tooling === 'focus'
                                ? item.focus_kind ?? 'any'
                                : null,
                          })
                        }}
                      >
                        {(Object.keys(SPELL_TOOLING_LABEL_RU) as SpellTooling[]).map(
                          (key) => (
                            <option key={key} value={key}>
                              {SPELL_TOOLING_LABEL_RU[key]}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                    {item.spell_tooling === 'focus' ? (
                      <Field label="Семья фокуса" hint="Только подсказки вариантов">
                        <select
                          className="play-select"
                          value={item.focus_kind ?? 'any'}
                          onChange={(event) =>
                            updateItem(item.id, {
                              focus_kind: event.target.value as FocusKind,
                            })
                          }
                        >
                          {(Object.keys(FOCUS_KIND_LABEL_RU) as FocusKind[]).map((key) => (
                            <option key={key} value={key}>
                              {FOCUS_KIND_LABEL_RU[key]}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : (
                      <div />
                    )}
                  </div>
                ) : null}

                {!nested && item.spell_tooling === 'focus' ? (
                  <div>
                    <Text tone="muted">Варианты (по желанию — имя можно своё)</Text>
                    <div className="chip-row" style={{ marginTop: 8 }}>
                      {focusSuggestionsFor(item.focus_kind).map((variant) => (
                        <button
                          key={variant.slug ?? variant.labelRu}
                          type="button"
                          className="sheet-chip"
                          onClick={() =>
                            updateItem(item.id, {
                              name: variant.labelRu,
                              spell_tooling: 'focus',
                              focus_kind: item.focus_kind ?? 'any',
                            })
                          }
                        >
                          {variant.labelRu}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Field label="Заметка">
                  <Input
                    value={item.notes}
                    placeholder="Где лежит, для чего…"
                    onChange={(event) => updateItem(item.id, { notes: event.target.value })}
                  />
                </Field>
                <div className="inventory-card__footer">
                  {!nested && canShowEquipChip(item) ? (
                    <button
                      type="button"
                      className={`sheet-chip${item.equipped ? ' is-on' : ''}`}
                      onClick={() => toggleEquip(item)}
                    >
                      {item.equipped ? equipLabel(item).on : equipLabel(item).off}
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

        <div className="inventory-add-row">
          <Button variant="secondary" onClick={() => setPickerOpen(true)}>
            Из справочника
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              onChange({
                ...inventory,
                items: [...inventory.items, createInventoryItem()],
              })
            }
          >
            Своя строка
          </Button>
        </div>
      </Stack>

      <GearPickerDialog
        open={pickerOpen}
        edition={edition}
        onClose={() => setPickerOpen(false)}
        onConfirm={(result: GearAddResult) => {
          const next = applyGearAdd({
            items: inventory.items,
            weapons,
            result,
          })
          onChange({ ...inventory, items: next.items })
          if (result.attacks.length > 0 && onWeaponsChange) {
            onWeaponsChange(next.weapons)
          }
          setPickerOpen(false)
        }}
      />
    </Panel>
  )
}
