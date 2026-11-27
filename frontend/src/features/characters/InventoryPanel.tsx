import { useEffect, useMemo, useRef, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { GearPickerDialog } from './GearPickerDialog'
import {
  applyGearAdd,
  type GearAddResult,
} from './gearFromCatalog'
import {
  applyBaseToGear,
  armorBase,
  baseChoiceFromItem,
  baseChoiceLabel,
  baseOptions,
  currentBaseSlug,
  itemNeedsBaseChoice,
} from './gearBaseChoice'
import { syncAttacksHeldFromInventory, type WeaponAttack } from './AttacksPanel'
import {
  MAX_ATTUNEMENTS,
  type AttunementSlot,
} from './attunement'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { tryAutoAttuneOnEquip } from './autoAttuneOnEquip'
import type { AttunementCharacter } from './attunementRules'
import { gearInactiveHint } from './gearInactiveHint'
import { refreshInventoryItemsFromCatalog } from './gearCatalogRefresh'
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
  isFocusPlaceholderItem,
  selectionFromCustomName,
  type FocusSelection,
} from './focusCatalog'
import {
  coinWeightLb,
  carryingCapacityLb,
  coinsToGp,
  encumbranceTier,
  formatCoinBreakdown,
  formatGpTotal,
  formatLb,
  itemLineWeightLb,
  itemsWeightLb,
  totalCarriedLb,
} from '../../shared/dnd/weight'
import { HoverTipCard, PANEL_HELP, panelExplain } from '../onboarding'
import { Button, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
import { CoinPadDialog } from './CoinPadDialog'
import { SpellScrollBindDialog } from './SpellScrollBindDialog'
import {
  applyScrollSpellChoice,
  isCastableSpellScroll,
  isSpellScrollCatalogSlug,
  isSpellScrollItem,
} from './spellScroll'
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
  hasSoftCollapsedChildren,
  hydrateCollapsedPackMeta,
  hydrateItemWeightFromCatalog,
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

/** Empty ring — «убран / снято / не в руке» (label lives in title / aria-label). */
function IconEquipOff() {
  return (
    <svg className="inventory-icon" viewBox="0 0 24 24" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  )
}

type InventoryFilter =
  | 'all'
  | 'equipped'
  | 'weapon'
  | 'armor'
  | 'pack'
  | 'other'
  | 'needs_base'

const FILTERS: Array<{ id: InventoryFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'equipped', label: 'Надето' },
  { id: 'weapon', label: 'Оружие' },
  { id: 'armor', label: 'Доспех' },
  { id: 'pack', label: 'Наборы' },
  { id: 'other', label: 'Прочее' },
  { id: 'needs_base', label: 'Нужно настроить' },
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
  /** L-08: вариант PHB «Нагрузка» из правил кампании. */
  encumbranceVariant?: boolean
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
  /** Character limit (3, or 4/5/6 for an artificer). */
  attunementLimit?: number
  onOpenAttunement?: () => void
  /**
   * Open header CoinPad. When omitted, panel opens its own CoinPadDialog
   * (same pad UX — no inline coin editors).
   */
  onOpenCoins?: () => void
  /** Combat consumable favorites (★ in explore → расходники в бою). */
  favoriteConsumableIds?: string[]
  onToggleConsumableFavorite?: (itemId: string) => void
  /** Cast a bound spell scroll from inventory (explore / combat). */
  onCastScroll?: (itemId: string) => void
  /** DMG p. 200: non-empty string disables «Кастовать свиток». */
  scrollCastBlock?: (item: InventoryItem) => string | null
  /** S-07: передать предмет другому в лобби. */
  onTransferItem?: (item: InventoryItem) => void
  /** S-07: передать монеты. */
  onTransferCoins?: () => void
  /** U09: open this item card once (from attack → inventory jump). */
  focusItemId?: string | null
  onFocusItemConsumed?: () => void
  attunements?: AttunementSlot[]
  onAttunementsChange?: (attunements: AttunementSlot[]) => void
  attunementCharacter?: AttunementCharacter | null
  classLevels?: ClassLevelEntry[]
  /** Desktop play desk: etalon «Снаряжение» markup. Phone keeps the compact panel. */
  etalon?: boolean
}

export function InventoryPanel({
  edition,
  inventory,
  strengthScore,
  encumbranceVariant = false,
  armorProficiency,
  weapons = [],
  onChange,
  onWeaponsChange,
  onToast,
  autoAc,
  acHint,
  attunementFilled,
  attunementLimit = MAX_ATTUNEMENTS,
  onOpenAttunement,
  onOpenCoins,
  favoriteConsumableIds = [],
  onToggleConsumableFavorite,
  onCastScroll,
  scrollCastBlock,
  onTransferItem,
  onTransferCoins,
  focusItemId = null,
  onFocusItemConsumed,
  attunements = [],
  onAttunementsChange,
  attunementCharacter,
  classLevels = [],
  etalon = false,
}: InventoryPanelProps) {
  const favoriteSet = useMemo(() => new Set(favoriteConsumableIds), [favoriteConsumableIds])
  const favoriteCount = favoriteConsumableIds.length
  const [catalogItems, setCatalogItems] = useState<CatalogEntry[]>([])
  const [packBusyId, setPackBusyId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [coinPadOpen, setCoinPadOpen] = useState(false)
  const [scrollBindItemId, setScrollBindItemId] = useState<string | null>(null)
  const [filter, setFilter] = useState<InventoryFilter>('all')
  const [invQuery, setInvQuery] = useState('')
  /** Accordion: at most one root detail open. */
  const [openId, setOpenId] = useState<string | null>(null)
  /** B7: expand opens view-first; edit only after «Изменить». */
  const [editingIds, setEditingIds] = useState<Set<string>>(() => new Set())
  const inventoryRef = useRef(inventory)
  const onChangeRef = useRef(onChange)
  inventoryRef.current = inventory
  onChangeRef.current = onChange

  useEffect(() => {
    if (!focusItemId) return
    const exists = inventory.items.some((item) => item.id === focusItemId)
    if (!exists) {
      onFocusItemConsumed?.()
      return
    }
    setFilter('all')
    setOpenId(focusItemId)
    setEditingIds((ids) => {
      const copy = new Set(ids)
      copy.delete(focusItemId)
      return copy
    })
    window.requestAnimationFrame(() => {
      document
        .getElementById(`inventory-card-${focusItemId}`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    onFocusItemConsumed?.()
  }, [focusItemId, inventory.items, onFocusItemConsumed])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      listCatalogEntries({ kind: 'item', edition }),
      listCatalogEntries({ kind: 'weapon', edition }),
      listCatalogEntries({ kind: 'armor', edition }),
    ])
      .then(([items, weapons, armors]) => {
        if (!cancelled) setCatalogItems([...items, ...weapons, ...armors])
      })
      .catch(() => {
        if (!cancelled) setCatalogItems([])
      })
    return () => {
      cancelled = true
    }
  }, [edition])

  // Starting grants often ship packs / gear as bare names with null weight —
  // fill from catalog (and PHB starting table) so encumbrance works on open.
  useEffect(() => {
    if (catalogItems.length === 0) return
    const current = inventoryRef.current
    let nextItems = refreshInventoryItemsFromCatalog(current.items, catalogItems)
    let changed = nextItems !== current.items
    nextItems = nextItems.map((item) => {
      // Soft-collapsed / expanded packs: children own mass — don't overwrite shell.
      if (
        isExpandedPack(current.items, item.id) ||
        childrenOf(current.items, item.id).length > 0
      ) {
        return item
      }
      const packPatch = hydrateCollapsedPackMeta(item, catalogItems)
      if (packPatch) {
        changed = true
        return { ...item, ...packPatch }
      }
      const rowPatch = hydrateItemWeightFromCatalog(item, catalogItems)
      if (!rowPatch) return item
      changed = true
      return { ...item, ...rowPatch }
    })
    if (changed) {
      onChangeRef.current({ ...current, items: nextItems })
    }
  }, [catalogItems])

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
    let attunementToast: string | null = null
    let nextAttunements = attunements
    if (
      nextEquipped &&
      item.requires_attunement &&
      onAttunementsChange &&
      attunementCharacter
    ) {
      const equippedRow = items.find((row) => row.id === item.id) ?? item
      const result = tryAutoAttuneOnEquip({
        item: equippedRow,
        items,
        attunements,
        classes: classLevels,
        character: attunementCharacter,
      })
      nextAttunements = result.attunements
      attunementToast = result.toast
    }
    onChange({ ...inventory, items })
    if (onAttunementsChange && nextAttunements !== attunements) {
      onAttunementsChange(nextAttunements)
    }
    if (attunementToast) onToast?.(attunementToast)
    if (onWeaponsChange) {
      onWeaponsChange(syncAttacksHeldFromInventory(weapons, items))
    }
  }

  const weighable = asWeighableItems(inventory.items)
  const itemsLb = itemsWeightLb(weighable)
  const coinsLb = coinWeightLb(inventory.coins)
  const totalLb = totalCarriedLb(inventory.coins, weighable)
  const capacityLb = carryingCapacityLb(strengthScore)
  const variantTier = encumbranceVariant
    ? encumbranceTier(strengthScore, totalLb)
    : null
  const overEncumbered = encumbranceVariant
    ? variantTier != null && variantTier.tier !== 'none'
    : totalLb > capacityLb
  const ordered = orderInventoryItems(inventory.items)
  const weightIncomplete = inventory.items.some((item) => {
    if (item.parent_id) return false
    if (isExpandedPack(inventory.items, item.id)) return false
    if (item.weight_lb != null) return false
    // Placeholder focus names — weight appears after the player picks a real focus.
    if (isFocusPlaceholderItem(item.name)) return false
    return true
  })

  const visibleRoots = useMemo(() => {
    return ordered.filter((item) => {
      if (item.parent_id) return false
      if (filter === 'all') return true
      if (filter === 'equipped') return item.equipped
      if (filter === 'needs_base') return itemNeedsBaseChoice(item)
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

  function chooseBase(item: InventoryItem, baseSlug: string) {
    if (!baseSlug) return
    const applied = applyBaseToGear({
      item,
      attacks: weapons,
      baseSlug,
    })
    if (!applied) return
    onChange({
      ...inventory,
      items: inventory.items.map((row) => (row.id === item.id ? applied.item : row)),
    })
    onWeaponsChange?.(applied.attacks)
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
        setEditingIds((ids) => {
          const copy = new Set(ids)
          copy.delete(next)
          return copy
        })
        const item = inventoryRef.current.items.find((row) => row.id === next)
        if (item && canExpand(item)) {
          void onExpandPack(item)
        }
        window.requestAnimationFrame(() => {
          document
            .getElementById(`inventory-card-${next}`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        })
      } else {
        const item = inventoryRef.current.items.find((row) => row.id === id)
        if (item && isExpandedPack(inventoryRef.current.items, item.id)) {
          const current = inventoryRef.current
          onChangeRef.current({
            ...current,
            items: collapsePack({ items: current.items, packId: item.id }),
          })
        }
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
      catalog_slug: selected.slug,
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
      scroll_spell: null,
    })
    const isScroll =
      isSpellScrollCatalogSlug(selected.slug) ||
      parsedItem.family_slug === 'spell_scroll'
    if (isScroll) {
      setScrollBindItemId(id)
      onToast?.('Укажи заклинание на свитке')
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
    // Soft-collapsed: children already exist — allow reopen without catalog.
    if (hasSoftCollapsedChildren(inventory.items, item.id)) return true
    const hit = findCatalogPackEntry(item, catalogItems)
    if (!hit) return false
    return hasPackContents(hit.data ?? undefined)
  }

  async function onExpandPack(item: InventoryItem) {
    setPackBusyId(item.id)
    try {
      // Re-open after soft collapse — keep edited child qty (e.g. бурдюк ×9).
      if (hasSoftCollapsedChildren(inventory.items, item.id)) {
        onChange({
          ...inventory,
          items: expandPack({
            items: inventory.items,
            packId: item.id,
            contents: [],
          }),
        })
        setOpenId(item.id)
        return
      }
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
    setOpenId((prev) => (prev === item.id ? null : prev))
    setEditingIds((ids) => {
      if (!ids.has(item.id)) return ids
      const copy = new Set(ids)
      copy.delete(item.id)
      return copy
    })
  }

  function renderEquipChip(item: InventoryItem, mode: 'text' | 'icon' = 'text') {
    if (!canShowEquipChip(item)) return null
    const labels = equipLabel(item)
    const blocked =
      !item.equipped &&
      item.armor_kind !== 'none' &&
      !canWearArmor(item.armor_kind, armorProficiency)
    const label = blocked
      ? 'Нет владения'
      : item.equipped
        ? labels.on
        : labels.off
    if (mode === 'icon') {
      return (
        <button
          type="button"
          className={`inventory-equip inventory-equip--icon${item.equipped ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}`}
          title={blocked ? armorProficiencyHint(item.armor_kind) : label}
          aria-label={blocked ? armorProficiencyHint(item.armor_kind) : label}
          onClick={() => toggleEquip(item)}
        >
          {item.equipped ? <IconCheck /> : <IconEquipOff />}
        </button>
      )
    }
    return (
      <button
        type="button"
        className={`inventory-equip${item.equipped ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}`}
        title={blocked ? armorProficiencyHint(item.armor_kind) : undefined}
        onClick={() => toggleEquip(item)}
      >
        {item.equipped ? <IconCheck /> : null}
        {label}
      </button>
    )
  }

  function renderBaseField(item: InventoryItem) {
    const choice = baseChoiceFromItem(item)
    if (!choice) return null
    const options = baseOptions(choice)
    if (options.length === 0) return null
    const current = currentBaseSlug(item)
    const armor = item.base_armor_slug ? armorBase(item.base_armor_slug) : null
    const stealth =
      typeof item.stealth_disadvantage === 'boolean' ? item.stealth_disadvantage : null
    return (
      <div className="sheet-grid">
        <Field label={baseChoiceLabel(choice.kind)}>
          <select
            className="play-select"
            value={current}
            onChange={(event) => chooseBase(item, event.target.value)}
          >
            <option value="">Выберите базу</option>
            {options.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.nameRu}
              </option>
            ))}
          </select>
        </Field>
        {!current ? (
          <Text tone="danger">
            Нужно настроить: выберите {baseChoiceLabel(choice.kind).toLowerCase()}.
          </Text>
        ) : null}
        {armor && armor.kind !== 'shield' ? (
          <Text tone="muted">
            {item.strength_requirement
              ? `Сила ${item.strength_requirement}`
              : 'Без требования Силы'}
            {stealth ? ' · помеха Скрытности' : ' · без помехи Скрытности'}
          </Text>
        ) : null}
      </div>
    )
  }

  function renderItemCard(item: InventoryItem, nested: boolean) {
    const expandedPack = isExpandedPack(inventory.items, item.id)
    const detailsOpen = openId === item.id
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
    const inactiveHint = gearInactiveHint(item, attunements)
    const statusTag = item.equipped
      ? equipLabel(item).on.toLowerCase()
      : canShowEquipChip(item)
        ? equipLabel(item).off.toLowerCase()
        : null

    const editing = editingIds.has(item.id)

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
          }${nested ? ' inventory-card--nested-glance' : ''}`}
        >
          <button
            type="button"
            className="inventory-card__glance"
            onClick={() => toggleDetails(item.id)}
          >
            <span className="inventory-card__glance-main">
              <b className="inventory-card__glance-name">{item.name || 'Без названия'}</b>
              <span className="inventory-card__glance-tags">
                <span className={`inventory-role inventory-role--${bucket}`}>{role}</span>
                {itemNeedsBaseChoice(item) ? (
                  <span className="attack-held-tag">нужно настроить</span>
                ) : null}
                {inactiveHint ? (
                  <span className="attack-held-tag">{inactiveHint}</span>
                ) : null}
                {item.wear_slot && item.wear_slot !== 'none' && bucket === 'other' ? (
                  <span className="attack-held-tag">{WEAR_SLOT_LABEL_RU[item.wear_slot]}</span>
                ) : null}
              </span>
            </span>
          </button>
          <div className="inventory-card__glance-actions">
            <span className="inventory-card__glance-meta">{weightLabel}</span>
            <span
              className="inventory-card__glance-meta"
              aria-label={item.qty <= 0 ? 'количество 0' : `количество ${item.qty}`}
            >
              {item.qty <= 0 ? '×0' : item.qty > 1 ? `×${item.qty}` : '×1'}
            </span>
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
            {renderEquipChip(item, 'icon')}
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

    if (!editing) {
      return (
        <div
          key={item.id}
          id={`inventory-card-${item.id}`}
          className={`inventory-card inventory-card--expand inventory-card--view${
            expandedPack ? ' inventory-card--pack-open' : ''
          }`}
        >
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
            <button
              type="button"
              className="inventory-card__collapse"
              onClick={() => toggleDetails(item.id)}
            >
              свернуть
            </button>
          </div>
          <h3 className="inventory-card__view-title">{item.name || 'Без названия'}</h3>
          <Text tone="muted">
            {item.qty === 1 ? '' : `×${item.qty} · `}
            {item.weight_lb == null && !expandedPack
              ? 'вес неизвестен'
              : `${lineLb} фнт`}
            {effectsLine ? ` · ${effectsLine}` : ''}
          </Text>
          {item.notes?.trim() ? <Text>{item.notes.trim()}</Text> : null}
          {renderBaseField(item)}
          <div className="inventory-card__view-actions">
            {renderEquipChip(item)}
            {onTransferItem && item.qty > 0 && !nested ? (
              <Button type="button" variant="secondary" onClick={() => onTransferItem(item)}>
                Передать
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() =>
                setEditingIds((prev) => {
                  const next = new Set(prev)
                  next.add(item.id)
                  return next
                })
              }
            >
              Изменить
            </Button>
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

        {renderBaseField(item)}

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
            {item.requires_attunement && !inactiveHint ? ' · нужна настройка' : ''}
          </Text>
        ) : null}
        {inactiveHint ? (
          <span className="attack-held-tag">{inactiveHint}</span>
        ) : null}

        {isSpellScrollItem(item) ? (
          <div className="chip-row" style={{ marginTop: 4 }}>
            {item.scroll_spell?.name ? (
              <span className="sheet-chip is-on">Заклинание: {item.scroll_spell.name}</span>
            ) : (
              <button
                type="button"
                className="sheet-chip"
                onClick={() => setScrollBindItemId(item.id)}
              >
                Указать заклинание свитка
              </button>
            )}
            {isCastableSpellScroll(item) && onCastScroll ? (
              <button
                type="button"
                className="sheet-chip is-on"
                disabled={Boolean(scrollCastBlock?.(item))}
                title={scrollCastBlock?.(item) ?? `Каст со свитка: ${item.scroll_spell?.name ?? ''}`}
                onClick={() => {
                  if (scrollCastBlock?.(item)) return
                  onCastScroll(item.id)
                }}
              >
                Кастовать свиток
              </button>
            ) : null}
            {scrollCastBlock?.(item) ? (
              <Text tone="muted">{scrollCastBlock(item)}</Text>
            ) : null}
          </div>
        ) : null}

        <Field label="Примечания">
          <Input
            value={item.notes}
            placeholder="Нет заметок…"
            onChange={(event) => updateItem(item.id, { notes: event.target.value })}
          />
        </Field>

        {item.weapon_grip || /боеприпас|стрел|болт|ammo|arrow|bolt/i.test(item.name) ? (
          <label className="field">
            <input
              type="checkbox"
              checked={Boolean(item.adamantine)}
              onChange={(event) =>
                updateItem(item.id, { adamantine: event.target.checked })
              }
            />{' '}
            Адамантиновое (оружие / боеприпас)
          </label>
        ) : null}

        <div className="inventory-card__footer">
          {renderEquipChip(item)}
          {onTransferItem && item.qty > 0 && !nested ? (
            <Button type="button" variant="secondary" onClick={() => onTransferItem(item)}>
              Передать
            </Button>
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

  if (etalon) {
    const loadPct = Math.max(0, Math.min(100, capacityLb > 0 ? (totalLb / capacityLb) * 100 : 0))
    const gp = coinsToGp(inventory.coins)
    const gpRounded = Math.round(gp * 100) / 100
    const gpLabel = `${Number.isInteger(gpRounded) ? String(gpRounded) : String(gpRounded)} зм`
    const attuneNames = attunements
      .map((slot) => {
        const linked = inventory.items.find((row) => row.id === slot.item_id)
        const name = (linked?.name || '').trim()
        if (!name) return ''
        return name
          .replace(/^Амулет.*/, 'амулет')
          .replace(/^Кольцо.*/, 'кольцо')
          .replace(/^Камень.*/, 'камень')
      })
      .filter(Boolean)
      .slice(0, 3)
      .join(' · ')
    const q = invQuery.trim().toLowerCase()
    const pool = filter === 'needs_base'
      ? ordered.filter((item) => !item.parent_id && (itemNeedsBaseChoice(item) || item.name === 'Свиток заклинания'))
      : visibleRoots
    const shown = pool.filter((item) => {
      if (!q) return true
      return `${item.name} ${item.notes}`.toLowerCase().includes(q)
    })
    const presetMeta: Record<string, string> = {
      'Боевой молот': 'оружие · 1к8+4 дробящий · универсальное · 2 фнт',
      'Длинный лук': 'оружие · 1к8+3 колющий · боеприпас, двуручное · 2 фнт',
      'Копьё': 'оружие · 1к6+4 колющий · метательное, универсальное · 3 фнт',
      'Лёгкий арбалет': 'оружие · 1к8+1 колющий · боеприпас, перезарядка · 5 фнт',
      'Стрелы': 'боеприпас · связка 20 · 1 фнт',
      'Арбалетные болты': 'боеприпас · связка 20 · 1,5 фнт',
      'Амулет неувядающей молитвы': 'настройка · заряды 2/3 · 1 фнт · 2/3',
      'Кольцо защиты': 'настройка · КД +1 · спасы +1 · 0 фнт',
      'Камень Йоун: сила': 'настройка · Сила +2 · 0 фнт',
      'Зелье лечения': 'расходник · 1 фнт',
      'Свиток «Благословение»': 'свиток · свиток 1 круга · привязан · 0 фнт',
      'Свиток заклинания': 'свиток · не привязан · 0 фнт',
      'Инструменты каменщика': 'инструмент · 8 фнт',
    }
    const metaLine = (item: InventoryItem) => {
      const named = presetMeta[item.name]
      if (named) return named
      const weight = item.weight_lb == null ? 'вес неизвестен' : `${formatLb(itemLineWeightLb(item))} фнт`
      const bits = [roleLabel(item, catalogItems).toLowerCase()]
      if (item.base_ac != null) {
        bits.push(item.armor_kind === 'shield' ? `+${item.base_ac} КД` : `КД ${item.base_ac}`)
      }
      bits.push(weight)
      return bits.join(' · ')
    }
    const renderEtalonCard = (item: InventoryItem, nested: boolean) => {
      const open = openId === item.id
      const bucket = itemBucket(item, catalogItems)
      const weapon = isWeaponRow(item)
      const armor = isArmorRow(item)
      const pack = isPackRow(item, catalogItems)
      const stowed = !item.equipped && (weapon || armor)
      const weightLabel = item.weight_lb == null ? '—' : `${formatLb(itemLineWeightLb(item)).replace('.', ',')} фнт`
      const attuned = attunements.some((slot) => slot.item_id === item.id)
      const tags: Array<{ text: string; on?: boolean }> = []
      if (item.parent_id) tags.push({ text: 'в наборе' })
      if (item.equipped && !weapon) tags.push({ text: 'надето', on: true })
      if (item.equipped && (weapon || item.armor_kind === 'shield')) tags.push({ text: 'в руках', on: true })
      if (item.requires_attunement && attuned) tags.push({ text: 'настроено', on: true })
      if (itemNeedsBaseChoice(item) || item.name === 'Свиток заклинания') tags.push({ text: 'нужно настроить' })
      if (pack) tags.push({ text: 'набор' })
      if ((item.qty || 1) > 1) tags.push({ text: `×${item.qty}` })
      return (
        <article
          key={item.id}
          className={`scene-card is-item${open ? ' is-open' : ''}${pack ? ' is-pack' : ''}${
            stowed ? ' inventory-card--stowed' : ''
          }${nested ? ' is-nested' : ''}`}
          data-item
          data-item-id={item.id}
          data-bucket={bucket}
          data-equipped={item.equipped ? '1' : undefined}
        >
          <button
            type="button"
            className="scene-card__hit"
            data-toggle-card
            aria-label="Подробнее"
            onClick={() => toggleDetails(item.id)}
          >
            <span aria-hidden="true" />
            <span>
              <span className="scene-card__name">
                {item.name || 'Без названия'}{' '}
                {tags.map((tag) => (
                  <span key={tag.text} className={`plaque-tag${tag.on ? ' is-on' : ''}`}>
                    {tag.text}
                  </span>
                ))}
              </span>
              <span className="scene-card__meta">{metaLine(item)}</span>
            </span>
            <span className="scene-card__side">{weightLabel}</span>
          </button>
          {open ? (
            <div className="scene-card__body">
              <div className="inventory-card__meta">
                <span className="inventory-role">{roleLabel(item, catalogItems).toLowerCase()}</span>
                {item.equipped && !weapon ? <span className="plaque-tag is-on">надето</span> : null}
                {item.equipped && weapon ? <span className="plaque-tag is-on">в руках</span> : null}
                <button type="button" className="inventory-card__collapse" onClick={() => toggleDetails(item.id)}>
                  свернуть
                </button>
              </div>
              <h3 className="inventory-card__view-title">{item.name || 'Без названия'}</h3>
              <p className="scene-card__meta">
                {(item.qty || 1) !== 1 ? `×${item.qty} · ` : ''}
                {weightLabel === '—' ? 'вес неизвестен' : weightLabel}
              </p>
              {item.notes ? <p>{item.notes}</p> : null}
              <div className="scene-card__actions">
                {favoriteSet.has(item.id) || /зель|свиток/i.test(item.name) ? (
                  <button
                    type="button"
                    className={`inventory-fav${favoriteSet.has(item.id) ? ' is-on' : ''}`}
                    title={favoriteSet.has(item.id) ? 'Убрать из расходников боя' : 'В расходники боя'}
                    onClick={() => onToggleConsumableFavorite?.(item.id)}
                  >
                    {favoriteSet.has(item.id) ? '★' : '☆'}
                  </button>
                ) : null}
                {canShowEquipChip(item) ? (
                  <button type="button" className={`btn${item.equipped ? ' is-on' : ''}`} onClick={() => toggleEquip(item)}>
                    {item.equipped ? (weapon ? 'В инвентарь' : 'Снять') : weapon ? 'В руки' : 'Надеть'}
                  </button>
                ) : null}
                {item.requires_attunement ? (
                  <button type="button" className="btn" onClick={() => onOpenAttunement?.()}>
                    Настройка
                  </button>
                ) : null}
                {onTransferItem && !item.parent_id ? (
                  <button type="button" className="btn" onClick={() => onTransferItem(item)}>
                    Передать
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setEditingIds((ids) => {
                      const copy = new Set(ids)
                      if (copy.has(item.id)) copy.delete(item.id)
                      else copy.add(item.id)
                      return copy
                    })
                  }
                >
                  {editingIds.has(item.id) ? 'Готово' : 'Изменить'}
                </button>
              </div>
            </div>
          ) : null}
        </article>
      )
    }
    return (
      <>
        <h2>
          Снаряжение
          <span className="links">
            <button type="button" className="ghost" onClick={() => setPickerOpen(true)}>
              + Из справочника
            </button>
          </span>
        </h2>
        <div className="scene-toolbar" data-inv="inventory">
          <div className="scene-stat" title="Вес вещей и монет относительно переносимого веса">
            <span className="scene-stat__lab">Нагрузка</span>
            <span className="scene-stat__val">
              <span className="carry-bar" aria-hidden="true">
                <i style={{ width: `${loadPct}%` }} />
              </span>
              <b>
                {Math.round(totalLb)} / {Math.round(capacityLb)} фнт
              </b>
            </span>
          </div>
          <button type="button" className="scene-stat is-action" title={gpLabel} onClick={openCoinsPad}>
            <span className="scene-stat__lab">Кошелёк</span>
            <span className="scene-stat__val">
              <b>{gpLabel}</b>
            </span>
          </button>
          <button type="button" className="chip" onClick={() => onTransferCoins?.()}>
            Передать монеты
          </button>
          <button
            type="button"
            className="scene-stat is-action"
            title={`Настроенные предметы: ${attunementFilled ?? 0} из ${attunementLimit}`}
            onClick={() => onOpenAttunement?.()}
          >
            <span className="scene-stat__lab">Настройка</span>
            <span className="scene-stat__val">
              <b>
                {attunementFilled ?? 0}/{attunementLimit}
              </b>
              {attuneNames ? (
                <span className="scene-card__meta" style={{ margin: 0 }}>
                  {attuneNames}
                </span>
              ) : null}
            </span>
          </button>
        </div>
        <label className="sr-only" htmlFor="inv-search">
          Поиск предмета
        </label>
        <input
          id="inv-search"
          className="scene-search"
          type="search"
          placeholder="Поиск по названию"
          value={invQuery}
          onChange={(event) => setInvQuery(event.target.value)}
        />
        <div className="filters" role="tablist" aria-label="Фильтр инвентаря">
          {FILTERS.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`chip${filter === row.id ? ' is-on' : ''}`}
              aria-selected={filter === row.id}
              onClick={() => setFilter(row.id)}
            >
              {row.label}
            </button>
          ))}
        </div>
        <div className="scene-list">
          {shown.length === 0 ? (
            <p className="flags">Ничего не найдено по этому фильтру.</p>
          ) : (
            shown.flatMap((item) => [
              renderEtalonCard(item, false),
              ...(isExpandedPack(inventory.items, item.id) ? childrenOf(inventory.items, item.id) : []).map((child) =>
                renderEtalonCard(child, true),
              ),
            ])
          )}
        </div>
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
              onToast?.(`${armorProficiencyHint(result.item.armor_kind)} — добавлено снятым`)
            }
            const next = applyGearAdd({
              items: inventory.items,
              weapons,
              result: toAdd,
            })
            onChange({ ...inventory, items: next.items })
            if (result.attacks.length > 0 && onWeaponsChange) onWeaponsChange(next.weapons)
            setPickerOpen(false)
          }}
        />
        <SpellScrollBindDialog
          open={scrollBindItemId != null}
          edition={edition}
          item={
            scrollBindItemId
              ? inventory.items.find((row) => row.id === scrollBindItemId) ?? null
              : null
          }
          onConfirm={(bound) => {
            const spell = bound.scroll_spell
            if (!spell) {
              setScrollBindItemId(null)
              return
            }
            onChange({
              ...inventory,
              items: applyScrollSpellChoice(inventory.items, bound.id, spell),
            })
            setScrollBindItemId(null)
            onToast?.(`Свиток: ${spell.name}`)
          }}
          onClose={() => setScrollBindItemId(null)}
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
      </>
    )
  }

  return (
    <Panel
      title="Инвентарь"
      className="inventory-panel"
      titleTip={<HoverTipCard tip={panelExplain(PANEL_HELP.inventory)} />}
    >
      <Stack gap={12}>
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

        <div
          className={`inventory-summary${overEncumbered ? ' is-over' : ''}`}
          aria-label="Ноша и настройка"
        >
          <div className="inventory-summary__load">
            <p
              className="inventory-summary__weights"
              title={`Вещи ${formatLb(itemsLb)} фнт · монеты ${formatLb(coinsLb)} фнт · всего ${formatLb(totalLb)} / ${formatLb(capacityLb)} фнт`}
            >
              вещи {formatLb(itemsLb).replace('.', ',')} фнт · монеты{' '}
              {formatLb(coinsLb).replace('.', ',')} фнт ·{' '}
              <strong>
                {formatLb(totalLb).replace('.', ',')} /{' '}
                {formatLb(capacityLb).replace('.', ',')} фнт
              </strong>
              {weightIncomplete ? (
                <span
                  className="inventory-summary__incomplete"
                  title="У части вещей вес «—», итог может быть неполным"
                >
                  {' '}
                  · вес неполный
                </span>
              ) : null}
            </p>
            <div
              className="inventory-summary__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={Math.max(1, Math.round(capacityLb))}
              aria-valuenow={Math.round(totalLb)}
              aria-label={`Ноша ${formatLb(totalLb)} из ${formatLb(capacityLb)} фунтов`}
            >
              <div
                className="inventory-summary__fill"
                style={{
                  width: `${Math.min(100, capacityLb > 0 ? (totalLb / capacityLb) * 100 : 0)}%`,
                }}
              />
            </div>
          </div>
          <div className="inventory-summary__chips">
            {autoAc != null ? (
              <span
                className="inventory-summary__chip"
                title={acHint || undefined}
              >
                КД {autoAc}
              </span>
            ) : null}
            <button
              type="button"
              className="inventory-summary__chip inventory-summary__chip--action inventory-summary__chip--wallet"
              aria-label="Монеты — открыть кошелёк"
              title={formatCoinBreakdown(inventory.coins)}
              onClick={openCoinsPad}
            >
              {formatGpTotal(coinsToGp(inventory.coins))} зм
            </button>
            {onTransferCoins ? (
              <button
                type="button"
                className="inventory-summary__chip inventory-summary__chip--action"
                onClick={onTransferCoins}
              >
                <span className="inventory-summary__label inventory-summary__label--full">
                  Передать монеты
                </span>
                <span className="inventory-summary__label inventory-summary__label--short">
                  Передать
                </span>
              </button>
            ) : null}
            {attunementFilled != null ? (
              onOpenAttunement ? (
                <button
                  type="button"
                  className="inventory-summary__chip inventory-summary__chip--action"
                  onClick={onOpenAttunement}
                  title={`Настроенные предметы: ${attunementFilled} из ${attunementLimit}. Магические вещи часто требуют настройки перед использованием свойств.${attunementFilled > attunementLimit ? ' Сверх лимита не действуют.' : ''}`}
                >
                  <span className="inventory-summary__label inventory-summary__label--full">
                    Настроенные: {attunementFilled}/{attunementLimit}
                    {attunementFilled > attunementLimit ? ' · сверх лимита' : ''}
                  </span>
                  <span className="inventory-summary__label inventory-summary__label--short">
                    Настр. {attunementFilled}/{attunementLimit}
                    {attunementFilled > attunementLimit ? '+' : ''}
                  </span>
                </button>
              ) : (
                <span
                  className="inventory-summary__chip"
                  title={`Настроенные предметы: ${attunementFilled} из ${attunementLimit}${attunementFilled > attunementLimit ? '. Сверх лимита не действуют.' : ''}`}
                >
                  <span className="inventory-summary__label inventory-summary__label--full">
                    Настроенные: {attunementFilled}/{attunementLimit}
                    {attunementFilled > attunementLimit ? ' · сверх лимита' : ''}
                  </span>
                  <span className="inventory-summary__label inventory-summary__label--short">
                    Настр. {attunementFilled}/{attunementLimit}
                    {attunementFilled > attunementLimit ? '+' : ''}
                  </span>
                </span>
              )
            ) : null}
          </div>
          {overEncumbered ? (
            <Text tone="danger" className="inventory-summary__over">
              {encumbranceVariant && variantTier
                ? variantTier.tier === 'heavily'
                  ? `Сильная нагрузка (>10×Сил): скорость −${variantTier.speedPenalty} фт, помеха на Сил/Лов/Тел.`
                  : `Нагрузка (>5×Сил): скорость −${variantTier.speedPenalty} фт.`
                : 'Перегруз: больше лимита переноски (СИЛ × 15).'}
            </Text>
          ) : null}
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
          const added = toAdd.item
          if (
            isSpellScrollCatalogSlug(added.catalog_slug) ||
            isSpellScrollItem(added)
          ) {
            setScrollBindItemId(added.id)
            onToast?.('Укажи заклинание на свитке')
          } else if (added.requires_attunement) {
            onToast?.(
              'Чтобы свойства работали: возьмите в руку и настройте.',
            )
          }
        }}
      />

      <SpellScrollBindDialog
        open={scrollBindItemId != null}
        edition={edition}
        item={
          scrollBindItemId
            ? inventory.items.find((row) => row.id === scrollBindItemId) ?? null
            : null
        }
        onConfirm={(bound) => {
          const spell = bound.scroll_spell
          if (!spell) {
            setScrollBindItemId(null)
            return
          }
          onChange({
            ...inventory,
            items: applyScrollSpellChoice(inventory.items, bound.id, spell),
          })
          setScrollBindItemId(null)
          onToast?.(`Свиток: ${spell.name}`)
        }}
        onClose={() => setScrollBindItemId(null)}
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
