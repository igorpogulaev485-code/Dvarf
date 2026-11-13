import { useMemo, useRef, useState } from 'react'
import { useTurnEconomy } from './TurnEconomyContext'
import { TurnEconomyChips } from './TurnEconomyChips'
import { TurnEconomyCombatActions } from './TurnEconomyCombatActions'
import { CombatTargetPicker } from './CombatTargetPicker'
import { EnterOwnNumberDialog } from './EnterOwnNumberDialog'
import type { CombatTarget } from '../lobby/combatTargets'
import { resourceShownCurrent, type SheetResource } from '../../shared/dnd/rest'
import { isHarnessDivinePowerResourceId } from '../../shared/dnd/harnessDivinePower'
import {
  listCombatConsumables,
  MAX_COMBAT_CONSUMABLE_FAVORITES,
} from './combatConsumables'
import type { ConsumableSpendLogEntry } from './consumableSpend'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import {
  countEquippedWeapons,
  fightingStyleAttackBonusFromIds,
  fightingStyleDamageBonusFromIds,
} from '../../shared/dnd/fightingStyles'
import {
  attackBonusFromActiveEffects,
  weaponBonusesFromActiveEffects,
  type ActiveEffect,
} from '../../shared/dnd/activeEffects'
import { resolveWeaponGrip } from './heldEquip'
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
import { resolveAttackRoll, type BonusDiePart, type DeskRollMode } from './deskRolls'
import { postSheetRollToSession } from './postSheetRollToSession'
import { attackSuppressedByEmptyStack } from './attacksInventorySync'
import {
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import { artifactAttackDamage, artifactRequirementMet, type WeaponAttack } from './AttacksPanel'
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
import type { CompanionEntry } from './companions'
import { listCompanionAttacksForHost } from './companionAttacks'

type PlayDeskAttacksCompactProps = {
  weapons: WeaponAttack[]
  /** C-01: active companion attacks (not self_form). */
  companions?: CompanionEntry[]
  /** Spellcasting mod for companion attacks that use host spell attack. */
  spellMod?: number | null
  characterLevel?: number
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  gearBonusesByItem?: Record<string, { attackBonus: number; damageBonus: number }>
  /** B-02: magic weapon / elemental weapon flat bonuses from active effects. */
  effectWeaponBonus?: { attack: number; damage: number }
  /** B-04: live effects for conditional weapon bonuses (rage melee_str…). */
  activeEffects?: ActiveEffect[] | null
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
  /** T-02: «Хитрое действие» — Засада бонусным. */
  hasCunningAction?: boolean
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
  onToggleActivation?: (attack: WeaponAttack) => void
  onSpendResource?: (id: string) => void
  /** Spend N from inventory qty (ammo, potions, …). Default 1. */
  onSpendConsumable?: (itemId: string, amount?: number) => void
  /** Open qty pad (item name → amount → confirm). */
  onOpenConsumableSpendPad?: (itemId: string) => void
  /** Bound spell scroll: open cast flow (consumes on confirm). */
  onCastScroll?: (itemId: string) => void
  /** DMG p. 200 reason. Non-empty disables the cast button. */
  scrollCastBlock?: (item: InventoryItem) => string | null
  onToggleConsumableFavorite?: (itemId: string) => void
  /** Session spend journal (recent, soft-undo). */
  consumableSpendLog?: ConsumableSpendLogEntry[]
  onUndoConsumableSpend?: (logId: string) => void
  onToast?: (message: string) => void
  /** S-04: открытая сессия для ленты бросков с листа */
  openSessionId?: string | null
  characterId?: string | null
  onOpenSettings: () => void
  /** Empty-state CTA: open attacks settings (add / sync weapons). */
  onAddAttack?: () => void
  /** Empty-state CTA: jump to inventory (equip → attacks). */
  onOpenInventory?: () => void
  /** When true and no weapons — compact empty (pure caster). */
  preferMagicEmpty?: boolean
  rollMode?: DeskRollMode
  /** B-01: Bless / Emboldening Bond etc. on attack rolls. */
  bonusDice?: BonusDiePart[] | null
  onConsumeOnceBuffDice?: () => void
  /**
   * B-03: damage riders (Divine Favor, smites, Absorb Elements…).
   * Optional chips get a checkbox (marked target / in aura).
   */
  damageRiders?: Array<{
    effectId: string
    name: string
    dice: string
    once: boolean
    damageType?: string | null
    optional?: boolean
    defaultChecked?: boolean
    meleeOnly?: boolean
    spendCharge?: boolean
  }> | null
  /** After hit: pass used rider effect ids (once / charge spend). */
  onConsumeDamageRiders?: (used: Array<{ effectId: string; once: boolean; spendCharge?: boolean }>) => void
  /** B-07: Elven Accuracy when attack ability is Dex/Int/Wis/Cha + advantage. */
  elvenAccuracy?: boolean
  /** B-07: Lucky armed — extra d20, pick any (spend handled by parent). */
  luckyArmed?: boolean
  onLuckySpent?: () => void
  /** B-07: Savage Attacker once/turn weapon damage reroll. */
  savageAttacker?: boolean
  /** B-07: Flames of Phlegethos — reroll 1s on fire damage. */
  flamesOfPhlegethos?: boolean
  /** B-07: after Lucky roll, parent may open pick UI. */
  onLuckyPickNeeded?: (input: {
    allDice: number[]
    text: string
    hitRoll: import('./deskRolls').CheckRoll
  }) => void
  /** B-08: Halfling Lucky — natural 1 on attack. */
  raceSlug?: string | null
  onHalflingLuckyNeeded?: (input: {
    text: string
    hitRoll: import('./deskRolls').CheckRoll
  }) => void
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
  companions = [],
  spellMod = null,
  characterLevel = 1,
  abilities,
  proficiencyBonus,
  gearBonusesByItem = {},
  effectWeaponBonus = { attack: 0, damage: 0 },
  activeEffects = null,
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
  hasCunningAction = false,
  spells = null,
  onSpellsChange,
  divineSmiteIntent,
  onDivineSmiteIntent,
  hpTemp = 0,
  onCombatFeatureToggle,
  onToggleHeld,
  onToggleActivation,
  onSpendResource,
  onSpendConsumable,
  onOpenConsumableSpendPad,
  onCastScroll,
  scrollCastBlock,
  onToggleConsumableFavorite,
  consumableSpendLog = [],
  onUndoConsumableSpend,
  onToast,
  openSessionId = null,
  characterId = null,
  onOpenSettings,
  onAddAttack,
  onOpenInventory,
  preferMagicEmpty = false,
  rollMode = 'normal',
  bonusDice = null,
  onConsumeOnceBuffDice,
  damageRiders = null,
  onConsumeDamageRiders,
  elvenAccuracy = false,
  luckyArmed = false,
  onLuckySpent,
  savageAttacker = false,
  flamesOfPhlegethos = false,
  onLuckyPickNeeded,
  raceSlug = null,
  onHalflingLuckyNeeded,
}: PlayDeskAttacksCompactProps) {
  const turnEco = useTurnEconomy()
  const companionAttacks = useMemo(
    () =>
      listCompanionAttacksForHost(companions, {
        characterLevel,
        spellMod,
        proficiencyBonus,
      }),
    [companions, characterLevel, spellMod, proficiencyBonus],
  )
  const [pendingAttack, setPendingAttack] = useState<{
    name: string
    attackBonus: number
    strikeText?: string
    hitTotal?: number
    formula?: string
    breakdown?: string
    tableMode?: boolean
    crit?: boolean
  } | null>(null)
  const finishAttackRef = useRef<
    | ((opts?: {
        target?: CombatTarget | null
        physicalDice?: boolean
        tableHit?: boolean
        tableMiss?: boolean
        damageTotal?: number | null
        manualTotal?: number
        strikeText?: string
        hitTotal?: number
        formula?: string
        breakdown?: string
        crit?: boolean
      }) => void)
    | null
  >(null)
  const [enterNumberOpen, setEnterNumberOpen] = useState(false)
  const [enterNumberCtx, setEnterNumberCtx] = useState<{
    title: string
    attackBonus: number
    attackName: string
  } | null>(null)
  const isMobile =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 959px)').matches
  const divineStrike = useMemo(() => divineStrikeRider(combatFeatures), [combatFeatures])
  const improvedSmite = useMemo(
    () => improvedDivineSmiteRider(combatFeatures),
    [combatFeatures],
  )
  const symbioticRider = useMemo(
    () =>
      symbioticNecroticRider({
        features: combatFeatures,
        resources,
        hpTemp,
        effects: activeEffects,
      }),
    [combatFeatures, resources, hpTemp, activeEffects],
  )
  const smiteSpend = useMemo(() => divineSmiteSpendOf(combatFeatures), [combatFeatures])
  const [riderOn, setRiderOn] = useState<Record<string, boolean>>({})
  const riderEnabled = (row: { effectId: string; optional?: boolean; defaultChecked?: boolean }) => {
    if (!row.optional) return true
    if (Object.prototype.hasOwnProperty.call(riderOn, row.effectId)) {
      return Boolean(riderOn[row.effectId])
    }
    return row.defaultChecked !== false
  }
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
    if (isHarnessDivinePowerResourceId(row.id)) return false
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
    <>
    <div className="play-desk-compact">
      <div className="play-desk-compact__head">
        <h3>Атаки</h3>
        <div className="play-desk-compact__head-actions">
          {turnEco ? (
            <label
              className="play-desk-compact__dice-toggle"
              title={
                turnEco.diceLockedByMaster
                  ? 'Включено мастером на столе'
                  : 'Бросок живыми кубиками: Попал/Промах или своё число'
              }
            >
              <input
                type="checkbox"
                checked={turnEco.diceOnTable}
                disabled={turnEco.diceLockedByMaster}
                onChange={(e) => turnEco.setPersonalDiceOnTable(e.target.checked)}
              />
              Кубики на столе
            </label>
          ) : null}
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

      {turnEco ? (
        <>
          <TurnEconomyChips
            state={turnEco.turnEconomy}
            onToggle={turnEco.toggleMark}
            className="chip-row"
          />
          <TurnEconomyCombatActions
            hasCunningAction={
              hasCunningAction ||
              combatFeatures.some((f) => f.id === 'cunning_action')
            }
            onOfferSkill={(key) => {
              const labels: Record<string, string> = {
                investigation: 'Анализ',
                perception: 'Внимательность',
                stealth: 'Скрытность',
              }
              onToast?.(
                key === 'stealth'
                  ? `Засада · бросьте «${labels[key]}» из полосы навыков или введите число`
                  : `Поиск · бросьте «Анализ»/«Внимательность» из полосы навыков или введите число`,
              )
            }}
          />
        </>
      ) : null}

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

      {damageRiders && damageRiders.some((row) => row.optional) ? (
        <div className="chip-row" style={{ marginBottom: 8 }} role="group" aria-label="Наездники урона">
          {damageRiders
            .filter((row) => row.optional)
            .map((row) => {
              const on = riderEnabled(row)
              return (
                <button
                  key={row.effectId}
                  type="button"
                  className={`sheet-chip${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    setRiderOn((prev) => ({ ...prev, [row.effectId]: !on }))
                  }
                >
                  {row.name}
                  {row.dice ? ` +${row.dice}` : ''}
                  {row.damageType ? ` ${row.damageType}` : ''}
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
            const face = artifactAttackDamage(attack)
            const requirementOk = artifactRequirementMet(attack, abilities)
            const baseDamage = shillelaghOn
              ? shillelaghDamage(attack.damage)
              : monkWeapon
                ? effectiveMartialArtsDamage({
                    weaponDamage: face.damage,
                    martialArtsDie,
                    forceMartialArts: unarmed,
                  })
                : face.damage
            const shownType = face.damageType || attack.damage_type
            const mod = abilityModifier(abilities[attackAbility])
            const gear =
              attack.inventory_item_id && attack.held && requirementOk
                ? gearBonusesByItem[attack.inventory_item_id]
                : undefined
            const styleIds =
              fightingStyleIds ?? (fightingStyleId ? [fightingStyleId] : [])
            const styleAtk = fightingStyleAttackBonusFromIds({
              styleIds,
              weaponName: attack.name,
            })
            const meleeAttack = isMeleeWeaponAttackName(attack.name)
            const grip = resolveWeaponGrip({ name: attack.name })
            const oneHandedMelee =
              meleeAttack && !unarmed && grip !== 'two_hand'
            const equippedWeaponCount = countEquippedWeapons(inventoryItems)
            const styleDmg = fightingStyleDamageBonusFromIds({
              styleIds,
              oneHandedMelee,
              holdingAnotherWeapon: equippedWeaponCount > 1,
            })
            const fxWeapon = weaponBonusesFromActiveEffects(activeEffects ?? [], {
              melee: meleeAttack || unarmed,
              ability: attackAbility,
            })
            const flatFxAttack = unarmed
              ? 0
              : fxWeapon.attack || effectWeaponBonus.attack
            const flatFxDamage =
              (unarmed ? 0 : fxWeapon.damage || effectWeaponBonus.damage) +
              (unarmed ? 0 : styleDmg)
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
            const fxAttackFlat = attackBonusFromActiveEffects(activeEffects ?? [])
            const attackBonus =
              mod +
              (attack.is_proficient || unarmed ? proficiencyBonus : 0) +
              (gear?.attackBonus ?? 0) +
              styleAtk +
              infusionAtk +
              flatFxAttack +
              fxAttackFlat
            const dmgBonus =
              mod +
              (gear?.damageBonus ?? 0) +
              infusionDmg +
              flatFxDamage
            const dmg =
              baseDamage +
              (dmgBonus ? `${dmgBonus >= 0 ? '+' : ''}${dmgBonus}` : '')
            const attackMode =
              attack.mode_active && attack.activation?.advantage
                ? rollMode === 'disadvantage'
                  ? 'normal'
                  : 'advantage'
                : rollMode
            const dmgLine = `${dmg || '—'}${shownType ? ` ${shownType}` : ''}${
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
                  disabled={Boolean(turnEco && !turnEco.canAttack().ok)}
                  title={(() => {
                    const gate = turnEco?.canAttack()
                    if (gate && !gate.ok) return gate.reason
                    return 'Бросок атаки и урона'
                  })()}
                  onClick={() => {
                    if (turnEco) {
                      const gate = turnEco.canAttack()
                      if (!gate.ok) {
                        onToast?.(gate.reason)
                        return
                      }
                    }
                    const activeRiders = (damageRiders ?? []).filter((row) => {
                      if (row.meleeOnly && !meleeAttack) return false
                      return riderEnabled(row)
                    })
                    const finishAttack = (opts?: {
                      target?: CombatTarget | null
                      physicalDice?: boolean
                      tableHit?: boolean
                      tableMiss?: boolean
                      damageTotal?: number | null
                      manualTotal?: number
                      strikeText?: string
                      hitTotal?: number
                      formula?: string
                      breakdown?: string
                      crit?: boolean
                    }) => {
                      turnEco?.spendAttack()
                      if (luckyArmed) onLuckySpent?.()
                      onConsumeOnceBuffDice?.()
                      if (activeRiders.length) {
                        onConsumeDamageRiders?.(
                          activeRiders.map((row) => ({
                            effectId: row.effectId,
                            once: row.once,
                            spendCharge: row.spendCharge,
                          })),
                        )
                      }
                      const physical =
                        Boolean(opts?.physicalDice) || Boolean(turnEco?.diceOnTable)
                      let text = opts?.strikeText ?? ''
                      if (opts?.tableHit) {
                        const dmg =
                          opts.damageTotal != null && Number.isFinite(opts.damageTotal)
                            ? ` · урон ${opts.damageTotal}`
                            : ''
                        text = `${attack.name}: попал${dmg} 🎲`
                      } else if (opts?.tableMiss) text = `${attack.name}: промах 🎲`
                      if (text) onToast?.(text)
                      const total =
                        opts?.manualTotal ??
                        opts?.hitTotal ??
                        (opts?.tableHit
                          ? opts.damageTotal != null && Number.isFinite(opts.damageTotal)
                            ? opts.damageTotal
                            : 1
                          : opts?.tableMiss
                            ? 0
                            : 0)
                      if (characterId && (opts?.hitTotal != null || opts?.manualTotal != null || opts?.tableHit || opts?.tableMiss)) {
                        void postSheetRollToSession({
                          openSessionId: openSessionId ?? turnEco?.openSessionId,
                          characterId,
                          title: opts?.tableHit
                            ? `Атака: ${attack.name} · урон`
                            : `Атака: ${attack.name}`,
                          total,
                          formula: opts?.formula ?? null,
                          breakdown: opts?.breakdown ?? null,
                          physicalDice: physical,
                          targetName: opts?.target?.name ?? null,
                        })
                      }
                      smiteApplyLock.current = false
                      setOpenStrike({
                        name: attack.name,
                        melee: meleeAttack,
                        crit: Boolean(opts?.crit),
                        text: text || attack.name,
                        smiteApplied: false,
                      })
                    }

                    // Кубики на столе: выбор цели + Попал/Промах
                    if (turnEco?.diceOnTable && turnEco.combatActive) {
                      finishAttackRef.current = finishAttack
                      setPendingAttack({
                        name: attack.name,
                        attackBonus,
                        tableMode: true,
                      })
                      return
                    }

                    const useElven =
                      elvenAccuracy &&
                      attackMode === 'advantage' &&
                      (attackAbility === 'dex' ||
                        attackAbility === 'int' ||
                        attackAbility === 'wis' ||
                        attackAbility === 'cha')
                    const strike = resolveAttackRoll({
                      name: attack.name,
                      attackBonus,
                      damageExpr: dmg || baseDamage,
                      damageType: attack.damage_type,
                      bonusDice,
                      elvenAccuracy: useElven,
                      lucky: luckyArmed,
                      savageAttacker: savageAttacker && (meleeAttack || unarmed),
                      flamesOfPhlegethos:
                        flamesOfPhlegethos &&
                        /огн|fire/i.test(String(attack.damage_type || shownType || '')),
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
                        ...activeRiders.map((row) => ({
                          expression: row.dice,
                          type: row.damageType ?? null,
                          label: row.damageType
                            ? `+${row.dice} ${row.damageType} (${row.name})`
                            : `${row.name}, ${row.dice}`,
                        })),
                      ],
                      mode: attackMode,
                    })
                    if (
                      strike.needsPick &&
                      strike.allDice &&
                      strike.hitRoll &&
                      onLuckyPickNeeded
                    ) {
                      turnEco?.spendAttack()
                      onLuckyPickNeeded({
                        allDice: strike.allDice,
                        text: strike.text,
                        hitRoll: strike.hitRoll,
                      })
                      return
                    }
                    if (
                      strike.die === 1 &&
                      strike.hitRoll &&
                      onHalflingLuckyNeeded &&
                      (raceSlug === 'halfling' ||
                        Boolean(raceSlug && raceSlug.includes('halfling')))
                    ) {
                      onToast?.(strike.text)
                      turnEco?.spendAttack()
                      onHalflingLuckyNeeded({
                        text: strike.text,
                        hitRoll: strike.hitRoll,
                      })
                      return
                    }

                    const formula = `1d20${attackBonus >= 0 ? '+' : ''}${attackBonus}`
                    const breakdown = strike.hitRoll
                      ? `${strike.hitRoll.die}${attackBonus >= 0 ? '+' : ''}${attackBonus}`
                      : undefined

                    finishAttackRef.current = finishAttack
                    if (turnEco?.combatActive) {
                      setPendingAttack({
                        name: attack.name,
                        attackBonus,
                        strikeText: strike.text,
                        hitTotal: strike.hitRoll?.total,
                        formula,
                        breakdown,
                        tableMode: false,
                        crit: strike.crit,
                      })
                      return
                    }

                    finishAttack({
                      strikeText: strike.text,
                      hitTotal: strike.hitRoll?.total,
                      formula,
                      breakdown,
                      crit: strike.crit,
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
                    {attack.mode_active ? (
                      <span className="play-desk-compact__tag is-on">режим</span>
                    ) : null}
                    {attack.req_score != null && !requirementOk ? (
                      <span className="play-desk-compact__tag">
                        {attack.req_ability?.toUpperCase()} {attack.req_score}+
                      </span>
                    ) : null}
                  </div>
                  <span className="play-desk-compact__mod">{formatModifier(attackBonus)}</span>
                  <span className="play-desk-compact__dmg">{dmgLine}</span>
                </button>
                {onToggleActivation && attack.activation && requirementOk ? (
                  <button
                    type="button"
                    className={`play-desk-compact__hold${attack.mode_active ? ' is-on' : ''}`}
                    onClick={() => onToggleActivation(attack)}
                    title={
                      attack.mode_active
                        ? 'Выключить режим'
                        : `${attack.activation.name}: ${attack.activation.active_damage}`
                    }
                  >
                    {attack.mode_active ? 'режим' : 'вкл'}
                  </button>
                ) : null}
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

        {companionAttacks.map((atk) => (
          <div key={atk.id} className="play-desk-compact__row is-dense">
            <button
              type="button"
              className="play-desk-compact__hit"
              disabled={Boolean(turnEco && !turnEco.canAttack().ok)}
              title={
                turnEco && !turnEco.canAttack().ok
                  ? 'Действие уже потрачено'
                  : undefined
              }
              onClick={() => {
                const gate = turnEco?.canAttack()
                if (gate && !gate.ok) {
                  onToast?.(
                    'reason' in gate && typeof gate.reason === 'string'
                      ? gate.reason
                      : 'Действие уже потрачено',
                  )
                  return
                }
                const strike = resolveAttackRoll({
                  name: `${atk.companionName}: ${atk.name}`,
                  attackBonus: atk.attackBonus,
                  damageExpr: atk.damageExpr,
                  damageType: atk.damageType,
                  mode: rollMode,
                })
                turnEco?.spendAttack()
                onToast?.(strike.text)
                if (openSessionId && characterId) {
                  void postSheetRollToSession({
                    openSessionId,
                    characterId,
                    title: `${atk.companionName}: ${atk.name}`,
                    total: strike.hitRoll?.total ?? 0,
                    formula: `1d20${atk.attackBonus >= 0 ? '+' : ''}${atk.attackBonus}`,
                    breakdown: strike.hitRoll
                      ? `${strike.hitRoll.die}${atk.attackBonus >= 0 ? '+' : ''}${atk.attackBonus}`
                      : undefined,
                  })
                }
              }}
            >
              <div className="play-desk-compact__row-main">
                <IconMelee className="play-desk-compact__row-icon" />
                <b>{atk.name}</b>
                <span className="play-desk-compact__tag">{atk.sourceLabel}</span>
              </div>
              <span className="play-desk-compact__mod">
                {atk.attackBonus >= 0 ? `+${atk.attackBonus}` : String(atk.attackBonus)}
              </span>
              <span className="play-desk-compact__dmg">
                {atk.damageExpr}
                {atk.damageType ? ` ${atk.damageType}` : ''}
              </span>
            </button>
          </div>
        ))}

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
            const scrollRow = isCastableSpellScroll(item) && Boolean(onCastScroll)
            const scrollBlock = scrollRow ? scrollCastBlock?.(item) ?? null : null
            const scrollCast = scrollRow && !scrollBlock
            const canSpend =
              qty > 0 && !scrollBlock && (scrollCast || Boolean(onSpendConsumable))
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
                        scrollBlock
                          ? scrollBlock
                          : scrollCast
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
                      {scrollBlock ? 'нельзя' : scrollCast ? 'каст' : 'потратить'}
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
      {openStrike ? (
        <div className="play-desk-compact__enter-number">
          <button
            type="button"
            className="play-desk-compact__link"
            onClick={() => {
              setEnterNumberCtx({
                title: `Атака: ${openStrike.name}`,
                attackBonus: 0,
                attackName: openStrike.name,
              })
              setEnterNumberOpen(true)
            }}
          >
            Ввести своё число
          </button>
        </div>
      ) : null}
    </div>
    <CombatTargetPicker
      open={Boolean(pendingAttack)}
      title={
        pendingAttack
          ? `Цель атаки: ${pendingAttack.name}`
          : 'Цель атаки'
      }
      targets={turnEco?.targets ?? []}
      filter="foes"
      mobile={isMobile}
      diceOnTable={Boolean(pendingAttack?.tableMode)}
      onClose={() => setPendingAttack(null)}
      onPick={(target) => {
        if (!pendingAttack || pendingAttack.tableMode) {
          setPendingAttack(null)
          return
        }
        finishAttackRef.current?.({
          target,
          strikeText: pendingAttack.strikeText,
          hitTotal: pendingAttack.hitTotal,
          formula: pendingAttack.formula,
          breakdown: pendingAttack.breakdown,
          crit: pendingAttack.crit,
        })
        setPendingAttack(null)
      }}
      onTableHit={(target, damageTotal) => {
        finishAttackRef.current?.({
          target,
          tableHit: true,
          physicalDice: true,
          damageTotal,
        })
        setPendingAttack(null)
      }}
      onTableMiss={(target) => {
        finishAttackRef.current?.({
          target,
          tableMiss: true,
          physicalDice: true,
        })
        setPendingAttack(null)
      }}
    />
    <EnterOwnNumberDialog
      open={enterNumberOpen}
      title={enterNumberCtx?.title ?? 'Ввести своё число'}
      mode="total"
      onClose={() => setEnterNumberOpen(false)}
      onConfirm={({ total }) => {
        if (characterId && enterNumberCtx) {
          void postSheetRollToSession({
            openSessionId: openSessionId ?? turnEco?.openSessionId,
            characterId,
            title: enterNumberCtx.title,
            total,
            physicalDice: true,
          })
          onToast?.(`${enterNumberCtx.attackName}: ${total} 🎲 (кубик на столе)`)
          turnEco?.spendAttack()
        }
        setEnterNumberOpen(false)
      }}
    />
    </>
  )
}
