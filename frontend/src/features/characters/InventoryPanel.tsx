import { useEffect, useMemo, useRef, useState } from 'react'
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
import {
  armorProficiencyHint,
  canWearArmor,
} from './equipmentProficiency'
import type { ArmorProficiency } from './identity'
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
  inferFocusKind,
  SPELL_TOOLING_LABEL_RU,
  type SpellTooling,
} from './spellFocus'
import { isWornMagicSlot, WEAR_SLOT_LABEL_RU } from './wearEquip'
import { WEAR_SLOTS, type WearSlot } from '../../shared/dnd/gearCatalog'
import { FocusCatalogSelect } from './FocusCatalogSelect'
import {
  applyFocusSelectionToItemFields,
  focusOptionsFromCatalog,
  selectionFromCustomName,
  type FocusSelection,
} from './focusCatalog'
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
  childrenOf,
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

const COIN_FIELDS: Array<{
  key: keyof CoinPurse
  label: string
  tone: 'copper' | 'silver' | 'electrum' | 'gold' | 'platinum'
}> = [
  { key: 'cp', label: 'ММ', tone: 'copper' },
  { key: 'sp', label: 'СМ', tone: 'silver' },
  { key: 'ep', label: 'ЭМ', tone: 'electrum' },
  { key: 'gp', label: 'ЗМ', tone: 'gold' },
  { key: 'pp', label: 'ПМ', tone: 'platinum' },
]

type InventoryFilter = 'all' | 'equipped' | 'weapon' | 'armor' | 'pack' | 'other'

const FILTERS: Array<{ id: InventoryFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'equipped', label: 'Надето' },
  { id: 'weapon', label: 'Оружие' },
  { id: 'armor', label: 'Доспех' },
  { id: 'pack', label: 'Наборы' },
  { id: 'other', label: 'Прочее' },
]

function focusSelectionFromItem(
  item: InventoryItem,
  catalogItems: CatalogEntry[],
): FocusSelection | null {
  if (item.spell_tooling !== 'focus') return null
  const family = item.focus_kind ?? 'any'
  if (item.catalog_id) {
    const options = focusOptionsFromCatalog(catalogItems, family)
    const hit = options.find((row) => row.catalog_id === item.catalog_id)
    if (hit) {
      return {
        name: item.name || hit.name_ru,
        catalog_id: hit.catalog_id,
        cost_gp: item.cost_gp ?? hit.cost_gp,
        weight_lb: item.weight_lb ?? hit.weight_lb,
        focus_kind: hit.focus_kind,
        custom: false,
      }
    }
  }
  if (item.name.trim()) {
    return selectionFromCustomName(item.name, family)
  }
  return null
}

function isWeaponRow(item: InventoryItem): boolean {
  return Boolean(item.weapon_grip)
}

function isArmorRow(item: InventoryItem): boolean {
  return item.armor_kind !== 'none'
}

function isPackRow(item: InventoryItem, catalogItems: CatalogEntry[]): boolean {
  if (item.container_kind === 'pack' || item.container_expanded) return true
  const hit = findCatalogPackEntry(item, catalogItems)
  return Boolean(hit && hasPackContents(hit.data ?? undefined))
}

function itemBucket(
  item: InventoryItem,
  catalogItems: CatalogEntry[],
): Exclude<InventoryFilter, 'all' | 'equipped'> {
  if (isWeaponRow(item)) return 'weapon'
  if (isArmorRow(item)) return 'armor'
  if (isPackRow(item, catalogItems)) return 'pack'
  return 'other'
}

function roleLabel(
  item: InventoryItem,
  catalogItems: CatalogEntry[],
): string {
  const bucket = itemBucket(item, catalogItems)
  if (bucket === 'weapon') return 'Оружие'
  if (bucket === 'armor') {
    return item.armor_kind === 'shield' ? 'Щит' : 'Доспех'
  }
  if (bucket === 'pack') return 'Набор'
  if (item.requires_attunement) return 'Настройка'
  if (item.spell_tooling && item.spell_tooling !== 'none') {
    return SPELL_TOOLING_LABEL_RU[item.spell_tooling] ?? 'Предмет'
  }
  if (item.wear_slot && item.wear_slot !== 'none') return 'Ношение'
  return 'Предмет'
}

function formatEffectsLine(item: InventoryItem): string | null {
  if (!item.effects || item.effects.length === 0) return null
  return item.effects
    .map((effect) => {
      const t = String(effect.type)
      if (t === 'ac_bonus') return `КД+${(effect as { value?: number }).value ?? '?'}`
      if (t === 'attack_bonus')
        return `атака+${(effect as { value?: number }).value ?? '?'}`
      if (t === 'damage_bonus')
        return `урон+${(effect as { value?: number }).value ?? '?'}`
      if (t === 'sense') {
        const sense = (effect as { sense?: string; range_ft?: number }).sense
        const range = (effect as { range_ft?: number }).range_ft
        return `${sense ?? 'чувство'}${range ? ` ${range}фт` : ''}`
      }
      if (t === 'ability_score' || t === 'ability_mod') {
        const ability = (effect as { ability?: string; value?: number }).ability
        const value = (effect as { value?: number }).value
        return `${ability ?? '?'}${t === 'ability_mod' ? (value != null && value >= 0 ? '+' : '') : '→'}${value ?? '?'}`
      }
      if (t === 'skill_bonus') {
        return `${(effect as { skill?: string }).skill ?? 'навык'}+${(effect as { value?: number }).value ?? '?'}`
      }
      if (t === 'save_bonus') {
        const ability = (effect as { ability?: string }).ability
        return `спас ${ability ?? 'все'}+${(effect as { value?: number }).value ?? '?'}`
      }
      if (t === 'speed') {
        return `скор.+${(effect as { value_ft?: number }).value_ft ?? '?'}фт`
      }
      if (t === 'resource') {
        return `заряды ${(effect as { id?: string }).id ?? ''}×${(effect as { max?: number }).max ?? '?'}`
      }
      if (t === 'companion') {
        return `спутник ${(effect as { name_ru?: string }).name_ru || (effect as { kind?: string }).kind || ''}`
      }
      if (t === 'grant_spell') {
        return `заклин. ${(effect as { slug?: string }).slug ?? '?'}`
      }
      if (t === 'spell_slots') {
        return `ячейки ${(effect as { level?: number }).level}+${(effect as { delta?: number }).delta ?? '?'}`
      }
      return t
    })
    .join(' · ')
}

type InventoryPanelProps = {
  edition: RulesEdition
  inventory: InventoryState
  strengthScore: number
  /** Sheet armor proficiencies — blocks wearing untrained armor/shields. */
  armorProficiency: ArmorProficiency
  weapons?: WeaponAttack[]
  onChange: (inventory: InventoryState) => void
  /** When set, catalog weapon picks also append attack cards. */
  onWeaponsChange?: (weapons: WeaponAttack[]) => void
  onToast?: (message: string) => void
}

export function InventoryPanel({
  edition,
  inventory,
  strengthScore,
  armorProficiency,
  weapons = [],
  onChange,
  onWeaponsChange,
  onToast,
}: InventoryPanelProps) {
  const [catalogItems, setCatalogItems] = useState<CatalogEntry[]>([])
  const [packBusyId, setPackBusyId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [filter, setFilter] = useState<InventoryFilter>('all')
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
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

  const visibleRoots = useMemo(() => {
    return ordered.filter((item) => {
      if (item.parent_id) return false
      if (filter === 'all') return true
      if (filter === 'equipped') return item.equipped
      return itemBucket(item, catalogItems) === filter
    })
  }, [ordered, filter, catalogItems])

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

  function toggleDetails(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
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
    const weaponParsed =
      selected.kind === 'weapon' ? parseWeaponCatalogData(data) : null
    const armorParsed =
      selected.kind === 'armor' ? parseArmorCatalogData(data) : null
    const wear =
      weaponParsed?.wear_slot ?? armorParsed?.wear_slot ?? parsedItem.wear_slot
    const attune =
      weaponParsed?.requires_attunement ??
      armorParsed?.requires_attunement ??
      parsedItem.requires_attunement
    const effects =
      weaponParsed?.effects ?? armorParsed?.effects ?? parsedItem.effects
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
      wear_slot: wear,
      requires_attunement: attune,
      effects,
    })
  }

  function toggleEquip(item: InventoryItem) {
    const nextEquipped = !item.equipped
    if (
      nextEquipped &&
      item.armor_kind !== 'none' &&
      !canWearArmor(item.armor_kind, armorProficiency)
    ) {
      onToast?.(armorProficiencyHint(item.armor_kind))
      return
    }
    const items = equipInventoryItem(inventory.items, item.id, nextEquipped)
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
    const hit = findCatalogPackEntry(item, catalogItems)
    if (!hit) return false
    return hasPackContents(hit.data ?? undefined)
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
      setOpenIds((prev) => new Set(prev).add(item.id))
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

  function renderEquipChip(item: InventoryItem) {
    if (!canShowEquipChip(item)) return null
    const blocked =
      !item.equipped &&
      item.armor_kind !== 'none' &&
      !canWearArmor(item.armor_kind, armorProficiency)
    return (
      <button
        type="button"
        className={`sheet-chip${item.equipped ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}`}
        title={blocked ? armorProficiencyHint(item.armor_kind) : undefined}
        onClick={() => toggleEquip(item)}
      >
        {item.equipped
          ? equipLabel(item).on
          : blocked
            ? 'Нет владения'
            : equipLabel(item).off}
      </button>
    )
  }

  function renderItemCard(item: InventoryItem, nested: boolean) {
    const expandedPack = isExpandedPack(inventory.items, item.id)
    const detailsOpen = openIds.has(item.id) || nested
    const role = roleLabel(item, catalogItems)
    const bucket = itemBucket(item, catalogItems)
    const lineLb = formatLb(
      expandedPack
        ? childrenOf(inventory.items, item.id).reduce(
            (sum, row) => sum + itemLineWeightLb(row),
            0,
          )
        : itemLineWeightLb(item),
    )
    const effectsLine = formatEffectsLine(item)
    const statusTag = item.equipped
      ? equipLabel(item).on.toLowerCase()
      : canShowEquipChip(item)
        ? equipLabel(item).off.toLowerCase()
        : null

    if (!detailsOpen) {
      const weightLabel =
        item.weight_lb == null && !expandedPack ? '—' : `${lineLb} фнт`
      return (
        <div
          key={item.id}
          className={`inventory-card inventory-card--compact${
            !item.equipped && (isWeaponRow(item) || isArmorRow(item))
              ? ' inventory-card--stowed'
              : ''
          }`}
        >
          <button
            type="button"
            className="inventory-card__glance"
            onClick={() => toggleDetails(item.id)}
          >
            <b className="inventory-card__glance-name">{item.name || 'Без названия'}</b>
            <span className={`inventory-role inventory-role--${bucket}`}>{role}</span>
            {statusTag ? (
              <span className={`attack-held-tag${item.equipped ? ' is-on' : ''}`}>
                {statusTag}
              </span>
            ) : null}
            {item.requires_attunement && bucket === 'other' ? (
              <span className="attack-held-tag">настройка</span>
            ) : null}
            {item.wear_slot && item.wear_slot !== 'none' && bucket === 'other' ? (
              <span className="attack-held-tag">{WEAR_SLOT_LABEL_RU[item.wear_slot]}</span>
            ) : null}
            <span className="inventory-card__glance-spacer" aria-hidden />
            <span className="inventory-card__glance-meta">
              {item.qty > 1 ? `×${item.qty}` : '×1'}
            </span>
            <span className="inventory-card__glance-meta">{weightLabel}</span>
          </button>
          <div className="inventory-card__glance-actions">
            {canExpand(item) ? (
              <button
                type="button"
                className="play-desk-compact__link"
                disabled={packBusyId === item.id}
                onClick={() => void onExpandPack(item)}
              >
                {packBusyId === item.id ? 'Раскрываю…' : 'Раскрыть'}
              </button>
            ) : null}
            {renderEquipChip(item)}
            <button
              type="button"
              className="inventory-card__chevron-btn"
              aria-label="Подробнее"
              onClick={() => toggleDetails(item.id)}
            >
              ›
            </button>
          </div>
        </div>
      )
    }

    return (
      <div
        key={item.id}
        className={`inventory-card${nested ? ' inventory-card--nested' : ''}${
          expandedPack ? ' inventory-card--pack-open' : ''
        }`}
      >
        {nested ? (
          <Text tone="muted" className="inventory-card__nest-label">
            в наборе
          </Text>
        ) : null}

        <div className="inventory-card__meta">
          <span className={`inventory-role inventory-role--${bucket}`}>{role}</span>
          {statusTag ? (
            <span className={`attack-held-tag${item.equipped ? ' is-on' : ''}`}>
              {statusTag}
            </span>
          ) : null}
        </div>

        <div className="inventory-card__name">
          <Field label="Предмет">
            <CatalogCombobox
              kinds={['item', 'weapon', 'armor']}
              edition={edition}
              value={item.name}
              placeholder="Название вещи"
              onChange={(value, selected) => applyCatalog(item.id, value, selected)}
            />
          </Field>
        </div>

        {!nested && isArmorRow(item) ? (
          <div className="inventory-card__armor-row">
            <div className="inventory-card__stats" aria-label="КД">
              <div className="inventory-card__stat">
                <span className="inventory-card__stat-label">
                  {item.armor_kind === 'shield' ? 'щит' : 'кд'}
                </span>
                <span className="inventory-card__stat-value">
                  {item.armor_kind === 'shield'
                    ? `+${item.base_ac ?? 2}`
                    : item.base_ac ?? '—'}
                </span>
              </div>
            </div>
            <div className="inventory-card__grid inventory-card__grid--armor">
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
              <Field
                label={
                  item.armor_kind === 'shield' ? 'Бонус КД' : 'Базовый КД'
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
              <Field label="Вес">
                <NumberInput
                  min={0}
                  step={0.1}
                  integer={false}
                  emptyValue={null}
                  value={item.weight_lb}
                  onValueChange={(weight_lb) => updateItem(item.id, { weight_lb })}
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
            </div>
          </div>
        ) : (
          <div className="inventory-card__grid">
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
        )}

        {!nested && isArmorRow(item) ? (
          <Field label="Шаблон брони" hint="быстро подставить PHB">
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
        ) : null}

        {!nested && !isArmorRow(item) ? (
          <Field
            label="Для заклинаний"
            hint="Тип строки — каст смотрит на него, не на имя"
          >
            <select
              className="play-select"
              value={item.spell_tooling ?? 'none'}
              onChange={(event) => {
                const spell_tooling = event.target.value as SpellTooling
                if (spell_tooling === 'focus') {
                  updateItem(item.id, {
                    spell_tooling: 'focus',
                    focus_kind: item.focus_kind ?? 'any',
                  })
                  return
                }
                updateItem(item.id, {
                  spell_tooling,
                  focus_kind: null,
                })
              }}
            >
              {(Object.keys(SPELL_TOOLING_LABEL_RU) as SpellTooling[]).map((key) => (
                <option key={key} value={key}>
                  {SPELL_TOOLING_LABEL_RU[key]}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {!nested && item.spell_tooling === 'focus' ? (
          <FocusCatalogSelect
            edition={edition}
            family={item.focus_kind ?? 'any'}
            allowFamilyPick
            label="Фокус из справочника"
            value={focusSelectionFromItem(item, catalogItems)}
            onChange={(selection) => {
              const fields = applyFocusSelectionToItemFields(selection)
              updateItem(item.id, fields)
            }}
          />
        ) : null}

        {!nested && !isArmorRow(item) && !isWeaponRow(item) ? (
          <div className="sheet-grid sheet-grid--2">
            <Field label="Слот ношения" hint="Плащ, кольцо×2…">
              <select
                className="play-select"
                value={item.wear_slot ?? 'none'}
                onChange={(event) =>
                  updateItem(item.id, {
                    wear_slot: event.target.value as WearSlot,
                  })
                }
              >
                {WEAR_SLOTS.filter(
                  (slot) =>
                    slot === 'none' ||
                    isWornMagicSlot(slot) ||
                    slot === item.wear_slot,
                ).map((slot) => (
                  <option key={slot} value={slot}>
                    {WEAR_SLOT_LABEL_RU[slot]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Настройка">
              <button
                type="button"
                className={`sheet-chip${item.requires_attunement ? ' is-on' : ''}`}
                onClick={() =>
                  updateItem(item.id, {
                    requires_attunement: !item.requires_attunement,
                  })
                }
              >
                {item.requires_attunement ? 'Нужна настройка' : 'Без настройки'}
              </button>
            </Field>
          </div>
        ) : null}

        {effectsLine ? (
          <Text tone="muted">
            Эффекты: {effectsLine}
            {item.requires_attunement ? ' · нужна настройка' : ''}
          </Text>
        ) : null}

        <Field label="Примечания">
          <Input
            value={item.notes}
            placeholder="Нет заметок…"
            onChange={(event) => updateItem(item.id, { notes: event.target.value })}
          />
        </Field>

        <div className="inventory-card__footer">
          {renderEquipChip(item)}
          {canExpand(item) ? (
            <Button
              variant="secondary"
              disabled={packBusyId === item.id}
              onClick={() => void onExpandPack(item)}
            >
              {packBusyId === item.id ? 'Раскрываю…' : 'Раскрыть набор'}
            </Button>
          ) : null}
          {expandedPack ? (
            <Button variant="secondary" onClick={() => onCollapsePack(item)}>
              Свернуть набор
            </Button>
          ) : null}
          {!nested ? (
            <Button variant="secondary" onClick={() => toggleDetails(item.id)}>
              Свернуть
            </Button>
          ) : null}
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
  }

  return (
    <Panel title="Инвентарь" className="inventory-panel">
      <Stack gap={12}>
        <Text tone="muted">Управляйте вещами, весом и монетами персонажа.</Text>

        <div className="inventory-panel__toolbar">
          <Button variant="primary" onClick={() => setPickerOpen(true)}>
            Из справочника
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const row = createInventoryItem()
              onChange({
                ...inventory,
                items: [...inventory.items, row],
              })
              setOpenIds((prev) => new Set(prev).add(row.id))
              setFilter('all')
            }}
          >
            Своя строка
          </Button>
        </div>

        <p className={`inventory-summary-line${overEncumbered ? ' is-over' : ''}`}>
          Вещи {formatLb(itemsLb)} фнт · Монеты {formatLb(coinsLb)} фнт · Итого{' '}
          <strong>
            {formatLb(totalLb)} / {formatLb(capacityLb)} фнт
          </strong>
        </p>
        {overEncumbered ? (
          <Text tone="danger">Перегруз: итого больше лимита переноски (СИЛ × 15).</Text>
        ) : null}

        <div className="inventory-coins" aria-label="Монеты">
          {COIN_FIELDS.map((field) => (
            <label key={field.key} className="inventory-coin">
              <span className={`inventory-coin__dot inventory-coin__dot--${field.tone}`} />
              <span className="inventory-coin__label">{field.label}</span>
              <NumberInput
                min={0}
                emptyValue={0}
                value={inventory.coins[field.key]}
                onValueChange={(next) => setCoins({ [field.key]: next ?? 0 })}
              />
            </label>
          ))}
        </div>

        <div className="inventory-filters" role="tablist" aria-label="Фильтр инвентаря">
          {FILTERS.map((row) => (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-selected={filter === row.id}
              className={`inventory-filter${filter === row.id ? ' is-on' : ''}`}
              onClick={() => setFilter(row.id)}
            >
              {row.label}
            </button>
          ))}
        </div>

        <Stack gap={10}>
          {visibleRoots.length === 0 ? (
            <Text tone="muted">
              {filter === 'all' ? 'Инвентарь пуст — добавь из справочника.' : 'Нет вещей в этом фильтре.'}
            </Text>
          ) : null}

          {visibleRoots.map((item) => {
            const kids = isExpandedPack(inventory.items, item.id)
              ? childrenOf(inventory.items, item.id)
              : []
            return (
              <div key={item.id} className="inventory-card-group">
                {renderItemCard(item, false)}
                {kids.map((child) => renderItemCard(child, true))}
              </div>
            )
          })}
        </Stack>
      </Stack>

      <GearPickerDialog
        open={pickerOpen}
        edition={edition}
        onClose={() => setPickerOpen(false)}
        onConfirm={(result: GearAddResult) => {
          let toAdd = result
          if (
            result.equip &&
            result.item.armor_kind !== 'none' &&
            !canWearArmor(result.item.armor_kind, armorProficiency)
          ) {
            toAdd = {
              ...result,
              equip: false,
              item: { ...result.item, equipped: false },
            }
            onToast?.(
              `${armorProficiencyHint(result.item.armor_kind)} — добавлено снятым`,
            )
          }
          const next = applyGearAdd({
            items: inventory.items,
            weapons,
            result: toAdd,
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
