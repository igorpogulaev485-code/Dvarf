import { useMemo, useRef, useState } from 'react'
import { resourceShownCurrent, type SheetResource } from '../../shared/dnd/rest'
import {
  listCombatConsumables,
  MAX_COMBAT_CONSUMABLE_FAVORITES,
} from './combatConsumables'
import type { ConsumableSpendLogEntry } from './consumableSpend'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import { fightingStyleAttackBonusFromIds } from '../../shared/dnd/fightingStyles'
import { canSpendSlot, spendSpellSlot } from '../../shared/dnd/spells'
import type { SpellsState } from './spells'
import {
  divineStrikeRider,
  improvedDivineSmiteRider,
  symbioticNecroticRider,
} from './featureCombatBonuses'
import { DivineSmiteCombatBlock } from './DivineSmiteCombatBlock'
import {
  decideSmiteSlotClick,
  divineSmiteDice,
  divineSmiteSpendOf,
  formatDivineSmiteExtra,
  isMeleeWeaponAttackName,
  type DivineSmiteIntent,
} from './divineSmite'
import {
  effectiveMartialArtsDamage,
  isMonkUnarmedAttack,
  isMonkWeaponName,
  monkAttackAbility,
} from '../../shared/dnd/martialArts'
import { resolveAttackRoll, type DeskRollMode } from './deskRolls'
import { attackSuppressedByEmptyStack } from './attacksInventorySync'
import {
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import type { WeaponAttack } from './AttacksPanel'
import { shillelaghDamage } from './shillelagh'
import type { InventoryItem } from './inventory'
import { isCastableSpellScroll } from './spellScroll'
import {
  IconConsumable,
  IconMelee,
  IconRanged,
  IconResource,
  attackRowIconKind,
} from './attackIcons'

type PlayDeskAttacksCompactProps = {
  weapons: WeaponAttack[]
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  gearBonusesByItem?: Record<string, { attackBonus: number; damageBonus: number }>
  /** Active fighting style id (archery → +2 on ranged attacks). */
  fightingStyleId?: string | null
  /** Every fighting style on the sheet, including a second champion style. */
  fightingStyleIds?: string[]
  /** Monk Martial Arts die (e.g. "1к10"). */
  martialArtsDie?: string | null
  /** Active Artificer infusion weapon bonuses. */
  infusionAttackBonus?: number
  infusionDamageBonus?: number
  /** Bonuses keyed by inventory item — only the infused weapon. */
  infusionByItem?: Record<string, { attack: number; damage: number }>
  /** Shillelagh on one held club or quarterstaff. */
  shillelagh?: { attackId: string; ability: AbilityKey } | null
  resources: SheetResource[]
  inventoryItems: InventoryItem[]
  favoriteConsumableIds?: string[]
  /** Combat-desk class features (e.g. Reckless Attack). */
  combatFeatures?: UnlockedFeature[]
  /** Shared spell slots. Divine Smite spends one only after a melee hit. */
  spells?: SpellsState | null
  onSpellsChange?: (spells: SpellsState) => void
  /** Circle prepared from this panel or from «Способности». */
  divineSmiteIntent?: DivineSmiteIntent
  onDivineSmiteIntent?: (next: DivineSmiteIntent) => void
  /** Temporary HP. Symbiotic Entity's necrotic die is on only while this is above 0. */
  hpTemp?: number
  /** Fired when a combat feature chip is toggled (e.g. Reckless → advantage). */
  onCombatFeatureToggle?: (featureId: string, active: boolean) => void
  onToggleHeld?: (attack: WeaponAttack) => void
  onSpendResource?: (id: string) => void
  /** Spend N from inventory qty (ammo, potions, …). Default 1. */
  onSpendConsumable?: (itemId: string, amount?: number) => void
  /** Open qty pad (item name → amount → confirm). */
  onOpenConsumableSpendPad?: (itemId: string) => void
  /** Bound spell scroll: open cast flow (consumes on confirm). */
  onCastScroll?: (itemId: string) => void
  onToggleConsumableFavorite?: (itemId: string) => void
  /** Session spend journal (recent, soft-undo). */
  consumableSpendLog?: ConsumableSpendLogEntry[]
  onUndoConsumableSpend?: (logId: string) => void
  onToast?: (message: string) => void
  onOpenSettings: () => void
  /** Empty-state CTA: open attacks settings (add / sync weapons). */
  onAddAttack?: () => void
  /** Empty-state CTA: jump to inventory (equip → attacks). */
  onOpenInventory?: () => void
  /** When true and no weapons — compact empty (pure caster). */
  preferMagicEmpty?: boolean
  rollMode?: DeskRollMode
}

function formatSpendTime(atMs: number): string {
  try {
    return new Date(atMs).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function PlayDeskAttacksCompact({
  weapons,
  abilities,
  proficiencyBonus,
  gearBonusesByItem = {},
  fightingStyleId = null,
  fightingStyleIds,
  martialArtsDie = null,
  infusionAttackBonus = 0,
  infusionDamageBonus = 0,
  infusionByItem,
  shillelagh = null,
  resources,
  inventoryItems,
  favoriteConsumableIds = [],
  combatFeatures = [],
  spells = null,
  onSpellsChange,
  divineSmiteIntent,
  onDivineSmiteIntent,
  hpTemp = 0,
  onCombatFeatureToggle,
  onToggleHeld,
  onSpendResource,
  onSpendConsumable,
  onOpenConsumableSpendPad,
  onCastScroll,
  onToggleConsumableFavorite,
  consumableSpendLog = [],
  onUndoConsumableSpend,
  onToast,
  onOpenSettings,
  onAddAttack,
  onOpenInventory,
  preferMagicEmpty = false,
  rollMode = 'normal',
}: PlayDeskAttacksCompactProps) {
  const divineStrike = useMemo(() => divineStrikeRider(combatFeatures), [combatFeatures])
  const improvedSmite = useMemo(
    () => improvedDivineSmiteRider(combatFeatures),
    [combatFeatures],
  )
  const symbioticRider = useMemo(
    () => symbioticNecroticRider({ features: combatFeatures, resources, hpTemp }),
    [combatFeatures, resources, hpTemp],
  )
  const smiteSpend = useMemo(() => divineSmiteSpendOf(combatFeatures), [combatFeatures])
  const [localSmiteIntent, setLocalSmiteIntent] = useState<DivineSmiteIntent>({
    slotLevel: null,
    vsUndeadOrFiend: false,
  })
  const smiteIntent = divineSmiteIntent ?? localSmiteIntent
  const setSmiteIntent = (next: DivineSmiteIntent) => {
    onDivineSmiteIntent?.(next)
    if (!divineSmiteIntent) setLocalSmiteIntent(next)
  }
  const [openStrike, setOpenStrike] = useState<{
    name: string
    melee: boolean
    crit: boolean
    text: string
    smiteApplied: boolean
  } | null>(null)
  const smiteApplyLock = useRef(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [activeCombatFeatureIds, setActiveCombatFeatureIds] = useState<Set<string>>(
    () => new Set(),
  )
  const named = weapons.filter((row) => row.name.trim())
  const combatResources = resources.filter((row) => {
    if (row.max <= 0 || !row.name.trim()) return false
    if (row.track === 'stock') return true
    return row.used < row.max
  })
  const deskCombatFeatures = combatFeatures.filter(
    (row) => row.desk === 'combat' && row.name_ru.trim(),
  )
  const consumables = useMemo(
    () => listCombatConsumables(inventoryItems, favoriteConsumableIds),
    [inventoryItems, favoriteConsumableIds],
  )
  const favoriteCount = favoriteConsumableIds.length
  const pickerOptions = useMemo(() => {
    const favored = new Set(favoriteConsumableIds)
    return inventoryItems.filter(
      (item) =>
        item.name.trim() &&
        !item.parent_id &&
        (item.qty ?? 0) > 0 &&
        !favored.has(item.id),
    )
  }, [inventoryItems, favoriteConsumableIds])
  const restoreableLogCount = consumableSpendLog.filter((row) => !row.undone).length

  const applySmiteSlot = (slotLevel: number) => {
    if (!smiteSpend) return
    const decision = decideSmiteSlotClick({
      slotLevel,
      armedSlot: smiteIntent.slotLevel,
      open: openStrike,
      slotAvailable: spells ? canSpendSlot(spells.slots, slotLevel) : false,
    })
    if (decision.action === 'refuse') {
      const reason =
        decision.reason === 'no_slot'
          ? `Нет ячейки ${slotLevel} ур. Ячейка не списана.`
          : decision.reason === 'ranged'
            ? 'Дальняя атака не получает кару. Ячейка не списана.'
            : 'На это попадание кара уже добавлена. Ячейка не списана.'
      if (decision.reason === 'ranged') setOpenStrike(null)
      onToast?.(reason)
      return
    }
    if (decision.action === 'disarm') {
      setSmiteIntent({ slotLevel: null, vsUndeadOrFiend: smiteIntent.vsUndeadOrFiend })
      onToast?.('Круг снят. Ячейка не списана.')
      return
    }
    if (decision.action === 'arm') {
      setSmiteIntent({
        slotLevel: decision.slotLevel,
        vsUndeadOrFiend: smiteIntent.vsUndeadOrFiend,
      })
      const dice = divineSmiteDice({
        spend: smiteSpend,
        slotLevel: decision.slotLevel,
        vsUndeadOrFiend: smiteIntent.vsUndeadOrFiend,
      })
      onToast?.(
        `Круг ${decision.slotLevel} выбран (${dice.formulaRu}). Ячейка не списана — спишется, если подтвердишь попадание.`,
      )
      return
    }
    if (!openStrike || !spells || !onSpellsChange) {
      onToast?.('Нет попадания. Ячейка не списана.')
      return
    }
    if (smiteApplyLock.current || openStrike.smiteApplied) {
      onToast?.('На это попадание кара уже добавлена. Ячейка не списана.')
      return
    }
    smiteApplyLock.current = true
    const spent = spendSpellSlot(spells.slots, decision.slotLevel)
    if (!spent.ok) {
      smiteApplyLock.current = false
      onToast?.(`Нет ячейки ${decision.slotLevel} ур. Ячейка не списана.`)
      return
    }
    const line = formatDivineSmiteExtra({
      spend: smiteSpend,
      slotLevel: decision.slotLevel,
      vsUndeadOrFiend: smiteIntent.vsUndeadOrFiend,
      crit: openStrike.crit,
    })
    onSpellsChange({ ...spells, slots: spent.slots })
    const text = `${openStrike.text}${line}`
    onToast?.(text)
    setOpenStrike({ ...openStrike, smiteApplied: true, text })
    setSmiteIntent({ slotLevel: null, vsUndeadOrFiend: smiteIntent.vsUndeadOrFiend })
  }

  const markSmiteMiss = () => {
    const name = openStrike ? ` «${openStrike.name}»` : ''
    smiteApplyLock.current = false
    onToast?.(`Промах${name}: ячейка не списана.`)
    setOpenStrike(null)
  }

  return (
    <div className="play-desk-compact">
      <div className="play-desk-compact__head">
        <h3>Атаки</h3>
        <div className="play-desk-compact__head-actions">
          <button
            type="button"
            className="play-desk-compact__link play-desk-compact__link--settings"
            onClick={onOpenSettings}
            title="Оружие и атаки"
          >
            Оружие и атаки
          </button>
        </div>
      </div>

      {deskCombatFeatures.length > 0 ? (
        <div className="chip-row" style={{ marginBottom: 8 }}>
          {deskCombatFeatures.map((feature) => {
            const on = activeCombatFeatureIds.has(feature.id)
            return (
              <button
                key={`${feature.classEntryId}:${feature.id}`}
                type="button"
                className={`sheet-chip${on ? ' is-on' : ''}`}
                title={feature.summary_ru}
                onClick={() => {
                  const nextOn = !on
                  setActiveCombatFeatureIds((prev) => {
                    const next = new Set(prev)
                    if (nextOn) next.add(feature.id)
                    else next.delete(feature.id)
                    return next
                  })
                  onCombatFeatureToggle?.(feature.id, nextOn)
                  onToast?.(
                    nextOn
                      ? `${feature.name_ru}: вкл. · ${feature.summary_ru}`
                      : `${feature.name_ru}: выкл.`,
                  )
                }}
              >
                {feature.name_ru}
              </button>
            )
          })}
        </div>
      ) : null}

      {smiteSpend ? (
        <DivineSmiteCombatBlock
          spend={smiteSpend}
          slots={spells?.slots ?? {}}
          intent={smiteIntent}
          openStrike={openStrike}
          onIntent={setSmiteIntent}
          onSlotClick={applySmiteSlot}
          onMiss={markSmiteMiss}
        />
      ) : null}

      <div className="play-desk-compact__list play-desk-compact__list--dense">
        {named.length === 0 ? (
          <div
            className={`play-desk-compact__empty-block${
              preferMagicEmpty ? ' is-magic-primary' : ''
            }`}
          >
            <p className="play-desk-compact__empty">
              {preferMagicEmpty
                ? 'Нет оружия в атаках — можно кастовать из панели магии'
                : 'Нет атак'}
            </p>
            <div className="play-desk-compact__empty-actions">
              {onAddAttack ? (
                <button
                  type="button"
                  className="play-desk-compact__link play-desk-compact__link--prepare"
                  onClick={onAddAttack}
                >
                  Добавить атаку
                </button>
              ) : (
                <button
                  type="button"
                  className="play-desk-compact__link play-desk-compact__link--prepare"
                  onClick={onOpenSettings}
                >
                  Настройки атак
                </button>
              )}
              {onOpenInventory ? (
                <button
                  type="button"
                  className="play-desk-compact__link"
                  onClick={onOpenInventory}
                >
                  Открыть инвентарь
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          named.map((attack) => {
            const unarmed = isMonkUnarmedAttack(attack)
            const monkWeapon =
              Boolean(martialArtsDie) &&
              (unarmed || isMonkWeaponName(attack.name))
            const shillelaghOn =
              shillelagh != null &&
              shillelagh.attackId === attack.id &&
              attack.held !== false
            if (attackSuppressedByEmptyStack(attack, inventoryItems)) return null
            const attackAbility = shillelaghOn
              ? shillelagh.ability
              : monkWeapon
                ? monkAttackAbility({
                    str: abilities.str,
                    dex: abilities.dex,
                    weaponAbility: attack.ability,
                  })
                : attack.ability
            const baseDamage = shillelaghOn
              ? shillelaghDamage(attack.damage)
              : monkWeapon
                ? effectiveMartialArtsDamage({
                    weaponDamage: attack.damage,
                    martialArtsDie,
                    forceMartialArts: unarmed,
                  })
                : attack.damage
            const mod = abilityModifier(abilities[attackAbility])
            const gear = attack.inventory_item_id
              ? gearBonusesByItem[attack.inventory_item_id]
              : undefined
            const styleAtk = fightingStyleAttackBonusFromIds({
              styleIds: fightingStyleIds ?? (fightingStyleId ? [fightingStyleId] : []),
              weaponName: attack.name,
            })
            const boundInfusion = attack.inventory_item_id
              ? infusionByItem?.[attack.inventory_item_id]
              : undefined
            const infusionAtk = unarmed
              ? 0
              : Math.max(
                  0,
                  Math.floor(
                    infusionByItem
                      ? (boundInfusion?.attack ?? 0)
                      : infusionAttackBonus,
                  ),
                )
            const infusionDmg = unarmed
              ? 0
              : Math.max(
                  0,
                  Math.floor(
                    infusionByItem
                      ? (boundInfusion?.damage ?? 0)
                      : infusionDamageBonus,
                  ),
                )
            const attackBonus =
              mod +
              (attack.is_proficient || unarmed ? proficiencyBonus : 0) +
              (gear?.attackBonus ?? 0) +
              styleAtk +
              infusionAtk
            const dmgBonus = mod + (gear?.damageBonus ?? 0) + infusionDmg
            const dmg =
              baseDamage +
              (dmgBonus ? `${dmgBonus >= 0 ? '+' : ''}${dmgBonus}` : '')
            const meleeAttack = isMeleeWeaponAttackName(attack.name)
            const dmgLine = `${dmg || '—'}${attack.damage_type ? ` ${attack.damage_type}` : ''}${
              divineStrike ? ` + ${divineStrike.label}` : ''
            }${meleeAttack && improvedSmite ? ` + ${improvedSmite.label}` : ''}${
              meleeAttack && symbioticRider ? ` + ${symbioticRider.label}` : ''
            }`
            const iconKind = attackRowIconKind({
              name: attack.name,
              ability: attackAbility,
            })
            return (
              <div key={attack.id} className="play-desk-compact__row is-dense is-attack">
                <button
                  key={`${attack.id}:${dmgLine}:${formatModifier(attackBonus)}`}
                  type="button"
                  className="play-desk-compact__hit"
                  aria-label={`${attack.name}, атака ${formatModifier(attackBonus)}, урон ${dmgLine}`}
                  title="Бросок атаки и урона"
                  onClick={() => {
                    const strike = resolveAttackRoll({
                      name: attack.name,
                      attackBonus,
                      damageExpr: dmg || baseDamage,
                      damageType: attack.damage_type,
                      extraDamages: [
                        ...(divineStrike
                          ? [
                              {
                                expression: divineStrike.dice,
                                type: divineStrike.type ?? attack.damage_type,
                                label: divineStrike.rollLabel ?? divineStrike.label,
                              },
                            ]
                          : []),
                        ...(meleeAttack && improvedSmite
                          ? [
                              {
                                expression: improvedSmite.dice,
                                type: improvedSmite.type,
                                label: improvedSmite.rollLabel ?? improvedSmite.label,
                              },
                            ]
                          : []),
                        ...(meleeAttack && symbioticRider
                          ? [
                              {
                                expression: symbioticRider.dice,
                                type: symbioticRider.type,
                                label: symbioticRider.rollLabel ?? symbioticRider.label,
                              },
                            ]
                          : []),
                      ],
                      mode: rollMode,
                    })
                    onToast?.(strike.text)
                    smiteApplyLock.current = false
                    setOpenStrike({
                      name: attack.name,
                      melee: meleeAttack,
                      crit: strike.crit,
                      text: strike.text,
                      smiteApplied: false,
                    })
                  }}
                >
                  <div className="play-desk-compact__row-main">
                    {iconKind === 'ranged' ? (
                      <IconRanged className="play-desk-compact__row-icon" />
                    ) : (
                      <IconMelee className="play-desk-compact__row-icon" />
                    )}
                    <b>{attack.name}</b>
                    {attack.inventory_item_id ? (
                      <span className="play-desk-compact__tag">из инвентаря</span>
                    ) : attack.source_kind === 'custom' ? (
                      <span className="play-desk-compact__tag">вручную</span>
                    ) : attack.source_kind === 'race' ? (
                      <span className="play-desk-compact__tag">раса</span>
                    ) : attack.source_kind === 'class' ? (
                      <span className="play-desk-compact__tag">класс</span>
                    ) : null}
                    {attack.qty != null && attack.qty > 1 ? (
                      <span className="play-desk-compact__tag">×{attack.qty}</span>
                    ) : null}
                    {attack.held ? (
                      <span className="play-desk-compact__tag is-on">в руках</span>
                    ) : null}
                  </div>
                  <span className="play-desk-compact__mod">{formatModifier(attackBonus)}</span>
                  <span className="play-desk-compact__dmg">{dmgLine}</span>
                </button>
                {onToggleHeld && attack.inventory_item_id ? (
                  <button
                    type="button"
                    className={`play-desk-compact__hold${attack.held ? ' is-on' : ''}`}
                    onClick={() => onToggleHeld(attack)}
                    title={attack.held ? 'Убрать из рук' : 'Взять в руки'}
                  >
                    {attack.held ? 'удерж.' : 'взять'}
                  </button>
                ) : null}
              </div>
            )
          })
        )}

        {combatResources.map((row) => {
          const remaining = resourceShownCurrent(row)
          const dice = row.track === 'stock' && row.dice?.length ? ` · ${row.dice.join(', ')}` : ''
          return (
            <div key={row.id} className="play-desk-compact__row is-dense is-resource">
              <button
                type="button"
                className="play-desk-compact__hit"
                disabled={!onSpendResource || (row.track !== 'stock' && remaining <= 0) || (row.track === 'stock' && remaining <= 0 && !row.activeLabel)}
                onClick={() => onSpendResource?.(row.id)}
              >
                <div className="play-desk-compact__row-main">
                  <IconResource className="play-desk-compact__row-icon" />
                  <b>{row.name}</b>
                  <span className="play-desk-compact__tag">ресурс</span>
                </div>
                <span className="play-desk-compact__mod">
                  {remaining}/{row.max}{dice}
                </span>
                <span className="play-desk-compact__dmg">потратить</span>
              </button>
            </div>
          )
        })}
      </div>

      <div className="play-desk-compact__consumables">
        <div className="play-desk-compact__subhead">
          <span className="play-desk-compact__subhead-label">
            <IconConsumable className="play-desk-compact__tag-icon" />
            Расходники
          </span>
          {favoriteCount > 0 ? (
            <span className="play-desk-compact__subhead-meta">
              избр. {favoriteCount}/{MAX_COMBAT_CONSUMABLE_FAVORITES}
            </span>
          ) : null}
        </div>

        {consumables.length === 0 ? (
          <p className="play-desk-compact__empty">
            Нет расходников — добавь в избранное (до {MAX_COMBAT_CONSUMABLE_FAVORITES})
          </p>
        ) : (
          consumables.map(({ item, favorite }) => {
            const qty = item.qty ?? 0
            const scrollCast = isCastableSpellScroll(item) && Boolean(onCastScroll)
            const canSpend =
              qty > 0 && (scrollCast || Boolean(onSpendConsumable))
            const showQtyPad =
              !scrollCast && qty > 1 && Boolean(onOpenConsumableSpendPad) && Boolean(onSpendConsumable)
            return (
              <div
                key={item.id}
                className={`play-desk-compact__cons-row${favorite ? ' is-fav' : ''}${
                  scrollCast ? ' is-scroll' : ''
                }`}
              >
                <div className="play-desk-compact__cons-main">
                  <span className="play-desk-compact__cons-name">
                    {favorite ? (
                      <span className="play-desk-compact__tag is-fav">избр.</span>
                    ) : null}
                    {scrollCast ? (
                      <span className="play-desk-compact__tag">свиток</span>
                    ) : null}
                    {item.name}
                  </span>
                  <b>{qty}</b>
                  <div className="play-desk-compact__cons-actions">
                    {showQtyPad ? (
                      <button
                        type="button"
                        className="play-desk-compact__cons-qty"
                        disabled={!canSpend}
                        title={`Потратить несколько «${item.name}»`}
                        onClick={() => onOpenConsumableSpendPad?.(item.id)}
                      >
                        ×N
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="play-desk-compact__cons-spend"
                      disabled={!canSpend}
                      title={
                        scrollCast
                          ? `Каст со свитка: ${item.scroll_spell?.name ?? item.name}`
                          : canSpend
                            ? `Потратить 1 «${item.name}»`
                            : item.name
                      }
                      onClick={() => {
                        if (!canSpend) {
                          onToast?.(`${item.name}: ×${qty}`)
                          return
                        }
                        if (scrollCast) {
                          onCastScroll?.(item.id)
                          return
                        }
                        onSpendConsumable?.(item.id, 1)
                      }}
                    >
                      {scrollCast ? 'каст' : 'потратить'}
                    </button>
                  </div>
                </div>
                {onToggleConsumableFavorite ? (
                  <button
                    type="button"
                    className={`play-desk-compact__cons-fav${favorite ? ' is-on' : ''}`}
                    title={
                      favorite
                        ? 'Убрать из избранного'
                        : favoriteCount >= MAX_COMBAT_CONSUMABLE_FAVORITES
                          ? `Уже ${MAX_COMBAT_CONSUMABLE_FAVORITES} избранных`
                          : 'В избранное боя'
                    }
                    disabled={!favorite && favoriteCount >= MAX_COMBAT_CONSUMABLE_FAVORITES}
                    onClick={() => onToggleConsumableFavorite(item.id)}
                  >
                    {favorite ? '★' : '☆'}
                  </button>
                ) : null}
              </div>
            )
          })
        )}

        {consumableSpendLog.length > 0 ? (
          <div className="play-desk-compact__cons-log">
            <button
              type="button"
              className="play-desk-compact__cons-log-toggle"
              onClick={() => setLogOpen((prev) => !prev)}
            >
              {logOpen ? '▾' : '▸'} Журнал трат
              {restoreableLogCount > 0 ? ` · ${restoreableLogCount}` : ''}
            </button>
            {logOpen ? (
              <ul className="play-desk-compact__cons-log-list">
                {consumableSpendLog.map((entry) => (
                  <li
                    key={entry.id}
                    className={`play-desk-compact__cons-log-row${
                      entry.undone ? ' is-undone' : ''
                    }`}
                  >
                    <span>
                      {formatSpendTime(entry.atMs)} −{entry.amount} «{entry.name}»
                      {entry.undone ? ' · отменено' : ''}
                    </span>
                    {!entry.undone && onUndoConsumableSpend ? (
                      <button
                        type="button"
                        className="play-desk-compact__cons-log-undo"
                        onClick={() => onUndoConsumableSpend(entry.id)}
                      >
                        вернуть
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {onToggleConsumableFavorite && favoriteCount < MAX_COMBAT_CONSUMABLE_FAVORITES ? (
          <div className="play-desk-compact__cons-add">
            {pickerOpen ? (
              <label className="play-desk-compact__cons-picker">
                <span>В избранное</span>
                <select
                  className="play-select"
                  defaultValue=""
                  onChange={(event) => {
                    const id = event.target.value
                    if (!id) return
                    onToggleConsumableFavorite(id)
                    setPickerOpen(false)
                  }}
                >
                  <option value="">выбери предмет…</option>
                  {pickerOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {(item.qty ?? 0) > 1 ? ` ×${item.qty}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="play-desk-compact__link"
                  onClick={() => setPickerOpen(false)}
                >
                  отмена
                </button>
              </label>
            ) : (
              <button
                type="button"
                className="play-desk-compact__link"
                onClick={() => setPickerOpen(true)}
                disabled={pickerOptions.length === 0}
              >
                + в избранное ({favoriteCount}/{MAX_COMBAT_CONSUMABLE_FAVORITES})
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
