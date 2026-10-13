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
import { MAX_ATTUNEMENTS } from './attunement'
import { MAX_COMBAT_CONSUMABLE_FAVORITES } from './combatConsumables'
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
  coinsToGp,
  formatCoinBreakdown,
  formatGpTotal,
  formatLb,
  itemLineWeightLb,
  itemsWeightLb,
  totalCarriedLb,
} from '../../shared/dnd/weight'
import { Button, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
import { CoinPadDialog } from './CoinPadDialog'
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

function IconBook() {
  return (
    <svg className="inventory-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4 19.5h12" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg className="inventory-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="m4 20 4.2-1.1L19 8.1a1.7 1.7 0 0 0 0-2.4l-.7-.7a1.7 1.7 0 0 0-2.4 0L5.1 15.8 4 20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m13.5 6.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="inventory-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="m5 12.5 4.2 4.2L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconChevronUp() {
  return (
    <svg className="inventory-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="m6 14 6-6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg className="inventory-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-7 0 1 12h6l1-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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
  /** Desk explore meta — КД from worn gear. */
  autoAc?: number
  acHint?: string
  attunementFilled?: number
  onOpenAttunement?: () => void
  /**
   * Open header CoinPad. When omitted, panel opens its own CoinPadDialog
   * (same pad UX — no inline coin editors).
   */
  onOpenCoins?: () => void
  /** Combat consumable favorites (★ in explore → расходники в бою). */
  favoriteConsumableIds?: string[]
  onToggleConsumableFavorite?: (itemId: string) => void
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
  autoAc,
  acHint,
  attunementFilled,
  onOpenAttunement,
  onOpenCoins,
  favoriteConsumableIds = [],
  onToggleConsumableFavorite,
}: InventoryPanelProps) {
  const favoriteSet = useMemo(() => new Set(favoriteConsumableIds), [favoriteConsumableIds])
  const favoriteCount = favoriteConsumableIds.length
  const [catalogItems, setCatalogItems] = useState<CatalogEntry[]>([])
  const [packBusyId, setPackBusyId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [coinPadOpen, setCoinPadOpen] = useState(false)
  const [filter, setFilter] = useState<InventoryFilter>('all')
  /** Accordion: at most one root detail open. */
  const [openId, setOpenId] = useState<string | null>(null)
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

  function openCoinsPad() {
    if (onOpenCoins) {
      onOpenCoins()
      return
    }
    setCoinPadOpen(true)
  }

  function updateItem(id: string, patch: Partial<InventoryItem>) {
    onChange({
      ...inventory,
      items: inventory.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  function toggleDetails(id: string) {
    setOpenId((prev) => {
      const next = prev === id ? null : id
      if (next) {
        window.requestAnimationFrame(() => {
          document
            .getElementById(`inventory-card-${next}`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        })
      }
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
      setOpenId(item.id)
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
        className={`inventory-equip${item.equipped ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}`}
        title={blocked ? armorProficiencyHint(item.armor_kind) : undefined}
        onClick={() => toggleEquip(item)}
      >
        {item.equipped ? <IconCheck /> : null}
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
    const detailsOpen = openId === item.id || nested
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
            {onToggleConsumableFavorite && item.name.trim() && !item.parent_id ? (
              <button
                type="button"
                className={`inventory-fav${favoriteSet.has(item.id) ? ' is-on' : ''}`}
                title={
                  favoriteSet.has(item.id)
                    ? 'Убрать из расходников боя'
                    : favoriteCount >= MAX_COMBAT_CONSUMABLE_FAVORITES
                      ? `Уже ${MAX_COMBAT_CONSUMABLE_FAVORITES} избранных`
                      : 'В расходники боя'
                }
                disabled={
                  !favoriteSet.has(item.id) &&
                  favoriteCount >= MAX_COMBAT_CONSUMABLE_FAVORITES
                }
                onClick={() => onToggleConsumableFavorite(item.id)}
              >
                {favoriteSet.has(item.id) ? '★' : '☆'}
              </button>
            ) : null}
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
        id={`inventory-card-${item.id}`}
        className={`inventory-card inventory-card--expand${
          nested ? ' inventory-card--nested' : ''
        }${expandedPack ? ' inventory-card--pack-open' : ''}`}
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
          {!nested && isArmorRow(item) ? (
            <span className="inventory-card__ac-pill" aria-label="КД">
              {item.armor_kind === 'shield'
                ? `щит +${item.base_ac ?? 2}`
                : `кд ${item.base_ac ?? '—'}`}
            </span>
          ) : null}
          {!nested ? (
            <button
              type="button"
              className="inventory-card__collapse"
              onClick={() => toggleDetails(item.id)}
            >
              свернуть
            </button>
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
          <div className="inventory-card__grid inventory-card__grid--armor">
            <Field label="Тип">
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
            <Field label={item.armor_kind === 'shield' ? 'Бонус' : 'База КД'}>
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
            <Field label="×">
              <NumberInput
                min={0}
                emptyValue={1}
                value={item.qty}
                onValueChange={(qty) => updateItem(item.id, { qty: qty ?? 0 })}
              />
            </Field>
          </div>
        ) : (
          <div className="inventory-card__grid inventory-card__grid--dense">
            <Field label="×">
              <NumberInput
                min={0}
                emptyValue={1}
                value={item.qty}
                onValueChange={(qty) => updateItem(item.id, { qty: qty ?? 0 })}
              />
            </Field>
            <Field label="фнт">
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

        {!nested && !isArmorRow(item) ? (
          <div className="inventory-card__role-row">
            <Field label="Для заклинаний">
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
            {!isWeaponRow(item) ? (
              <Field label="Слот">
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
            ) : null}
            {!isWeaponRow(item) ? (
              <button
                type="button"
                className={`sheet-chip${item.requires_attunement ? ' is-on' : ''}`}
                onClick={() =>
                  updateItem(item.id, {
                    requires_attunement: !item.requires_attunement,
                  })
                }
              >
                {item.requires_attunement ? 'Настройка' : 'Без настр.'}
              </button>
            ) : null}
          </div>
        ) : null}

        {!nested && item.spell_tooling === 'focus' ? (
          <FocusCatalogSelect
            edition={edition}
            family={item.focus_kind ?? 'any'}
            allowFamilyPick
            label="Фокус"
            value={focusSelectionFromItem(item, catalogItems)}
            onChange={(selection) => {
              const fields = applyFocusSelectionToItemFields(selection)
              updateItem(item.id, fields)
            }}
          />
        ) : null}

        {effectsLine ? (
          <Text tone="muted" className="inventory-card__effects">
            {effectsLine}
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
            <button
              type="button"
              className="inventory-action"
              onClick={() => onCollapsePack(item)}
            >
              <IconChevronUp />
              Свернуть набор
            </button>
          ) : null}
          <button
            type="button"
            className="inventory-action inventory-action--danger"
            onClick={() =>
              onChange({
                ...inventory,
                items: removeInventoryItem(inventory.items, item.id),
              })
            }
          >
            <IconTrash />
            Удалить
          </button>
        </div>
      </div>
    )
  }

  return (
    <Panel title="Инвентарь" className="inventory-panel">
      <Stack gap={12}>
        <Text tone="muted">
          Ноша и вещи. Строка — взгляд; клик — детали (одна открыта). ★ — в расходники боя. Монеты —
          через pad.
        </Text>

        <div className="inventory-panel__toolbar">
          <Button
            variant="secondary"
            className="inventory-toolbar-btn"
            onClick={() => setPickerOpen(true)}
          >
            <IconBook />
            Из справочника
          </Button>
          <Button
            variant="ghost"
            className="inventory-toolbar-btn inventory-toolbar-btn--ghost"
            onClick={() => {
              const row = createInventoryItem()
              onChange({
                ...inventory,
                items: [...inventory.items, row],
              })
              setOpenId(row.id)
              setFilter('all')
            }}
          >
            <IconPencil />
            Своя строка
          </Button>
        </div>

        <p className={`inventory-summary-line${overEncumbered ? ' is-over' : ''}`}>
          Вещи {formatLb(itemsLb)} фнт · Монеты {formatLb(coinsLb)} фнт · Итого{' '}
          <strong>
            {formatLb(totalLb)} / {formatLb(capacityLb)} фнт
          </strong>
          {autoAc != null ? (
            <>
              {' · '}
              <span className="inventory-summary-line__ac" title={acHint || undefined}>
                КД {autoAc}
              </span>
            </>
          ) : null}
          {attunementFilled != null ? (
            <>
              {' · '}
              {onOpenAttunement ? (
                <button
                  type="button"
                  className="inventory-summary-line__link"
                  onClick={onOpenAttunement}
                >
                  Настройка {attunementFilled}/{MAX_ATTUNEMENTS}
                </button>
              ) : (
                <span>
                  Настройка {attunementFilled}/{MAX_ATTUNEMENTS}
                </span>
              )}
            </>
          ) : null}
        </p>
        {overEncumbered ? (
          <Text tone="danger">Перегруз: итого больше лимита переноски (СИЛ × 15).</Text>
        ) : null}

        <button
          type="button"
          className="inventory-coins inventory-coins--pad"
          aria-label="Монеты — открыть pad"
          onClick={openCoinsPad}
        >
          <span className="inventory-coins__total">
            <strong>{formatGpTotal(coinsToGp(inventory.coins))} зм</strong>
            <span>кошелёк · pad</span>
          </span>
          <span className="inventory-coins__breakdown">
            {formatCoinBreakdown(inventory.coins)}
          </span>
        </button>

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

      {!onOpenCoins ? (
        <CoinPadDialog
          open={coinPadOpen}
          coins={inventory.coins}
          onClose={() => setCoinPadOpen(false)}
          onChange={(coins) => onChange({ ...inventory, coins })}
          onToast={onToast ?? (() => undefined)}
        />
      ) : null}
    </Panel>
  )
}
