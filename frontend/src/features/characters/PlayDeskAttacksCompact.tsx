import { useMemo, useRef, useState } from 'react'
import { useTurnEconomy } from './TurnEconomyContext'
import { TurnEconomyChips } from './TurnEconomyChips'
import { TurnEconomyCombatActions } from './TurnEconomyCombatActions'
import { GrappleShoveDialog, type GrappleShoveMode } from './GrappleShoveDialog'
import { TelekineticShoveDialog } from './TelekineticShoveDialog'
import {
  POWER_ATTACK_HINT_GWM,
  POWER_ATTACK_HINT_SS,
  findHealerKitItem,
  healerFeatHealAmount,
  isHandCrossbowName,
  isImprovisedWeaponName,
  isSpellAttackName,
  isUnarmedAttackName,
  markCrusherUsed,
  markGwmBonusReady,
  markMeleeWeaponCritOrKill,
  markPiercerUsed,
  markShieldMasterShoveUsed,
  markSlasherUsed,
  markUnarmedOrImprovisedHit,
  markWeaponHitThisTurn,
  powerAttackModifiers,
  rangedLongRangeDisadvantage,
  rangedPointBlankDisadvantage,
  resolvePowerAttackKind,
  tavernBrawlerUnarmedDamage,
  damageTypeIsBludgeoning,
  damageTypeIsPiercing,
  damageTypeIsSlashing,
} from '../../shared/dnd/o05CombatFeats'
import { hasFeatFlag } from '../../shared/dnd/b07FeatCombat'
import type { AppliedFeatGrant } from '../../shared/dnd/featGrants'
import { equippedArmorPieces } from './inventory'
import {
  breathWeaponDamageExpr,
  breathWeaponResourceId,
  breathWeaponSaveDc,
  canTwoWeaponBonusAttack,
  chromaticWardingResourceId,
  dragonbornBreathKind,
  ftdTableVisible,
  gemFlightResourceId,
  hasDevilsSight,
  hasFightingStyle,
  listHeldMeleeWeapons,
  markTwoWeaponBonusReady,
  markTwoWeaponBonusUsed,
  metallicBreathResourceId,
  resolveDragonbornAncestryBreath,
  rollBreathWeaponDamage,
  twoWeaponBonusDamageAbilityMod,
  weaponIsLightMelee,
  weaponIsOneHandedMelee,
  weaponQualifiesForGreatWeaponFighting,
} from '../../shared/dnd/o06StylesBreathInvocations'
import {
  ClimbBiggerDialog,
  DisarmDialog,
  FallingDialog,
  IdentifySpellDialog,
  MarkDialog,
  NoLongRestDialog,
  OverrunTumbleDialog,
} from './O03MasterRulesDialogs'
import {
  CleaveDialog,
  HeroPointSpendDialog,
  LingeringInjuryDialog,
  MassiveDamageDialog,
  MoraleCheckDialog,
  ProficiencyDieDialog,
} from './O04MasterRulesDialogs'
import { adamantineObjectHitIsCrit } from '../../shared/dnd/o03DmgActions'
import {
  cleaveOverflow,
  proficiencyRollContribution,
  triggersMassiveDamage,
  type LingeringInjuryRow,
  type SystemShockRow,
} from '../../shared/dnd/o04DmgAdvanced'
import {
  heroPointsRemaining,
  spendHeroPoint,
} from '../../shared/dnd/heroPoints'
import type { HomebrewKey } from '../lobby/campaignRules'
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
  fightingStyleThrownDamageBonusFromIds,
} from '../../shared/dnd/fightingStyles'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
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
import {
  blessedStrikesRider,
  canUseBlessedStrikes,
  canUseFavoredFoeDamage,
  favoredFoeDamageDie,
  favoredFoeDamageLabel,
  focusedAimBonus,
  focusedAimKiClamp,
  hasO02Feature,
} from '../../shared/dnd/o02TashaFeatures'
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
import {
  buildAttackBonusParts,
  type AttackBonusPart,
} from './attackBonusBreakdown'
import { AttackBonusBreakdownDialog } from './AttackBonusBreakdownDialog'
import { shillelaghDamage } from './shillelagh'
import type { InventoryItem } from './inventory'
import type { FormulaVars } from '../../shared/dnd/formulas'
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
  /** O-01: TCE book on in lobby (table buttons). */
  tceAllowed?: boolean
  /** O-03: включённые ключи правил мастера (homebrew). */
  masterRules?: Partial<Record<HomebrewKey, boolean>>
  /** O-03: счётчик суток без длинного отдыха. */
  noLongRestDays?: number
  onNoLongRestResolved?: (next: { days: number; exhaustionDelta: number }) => void
  onFallingSelf?: (damage: number, prone: boolean) => void
  /** O-04: обновить ресурсы (очки героя). */
  onResourcesChange?: (resources: SheetResource[]) => void
  /** O-04: записать незаживающую рану на лист. */
  onApplyLingeringInjury?: (row: LingeringInjuryRow) => void
  /** O-04: применить эффект системного шока к себе. */
  onApplySystemShockSelf?: (row: SystemShockRow) => void
  /** O-01: known warlock invocation ids. */
  knownInvocationIds?: string[]
  /** O-01: feature picks for grappling_strike / superiority. */
  featurePicks?: FeaturePicksState
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
  /** U09: open linked inventory item card. */
  onOpenItem?: (itemId: string) => void
  /** Sheet formula vars for the attack-bonus breakdown VariablePicker shell. */
  formulaVars?: FormulaVars
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
  /** O-06: dragonborn ancestry id for breath. */
  ancestryId?: string | null
  /** O-06: Fizban book allowed in lobby (null = вне лобби). */
  ftdAllowed?: boolean | null
  onHalflingLuckyNeeded?: (input: {
    text: string
    hitRoll: import('./deskRolls').CheckRoll
  }) => void
  /** O-05: ledger черт для боевых кнопок. */
  featGrants?: AppliedFeatGrant[] | null
  /** O-05: мод заклинательной хар-ки (Телекинез). */
  spellAbilityMod?: number
  /** O-05: число костей хитов для Целителя. */
  hitDiceTotal?: number
  /** O-05: применить лечение Целителя к цели (лист/союзник). */
  onHealerHeal?: (amount: number, label: string, targetId: string) => boolean
  /** O-05: стабилизация Целителя. */
  onHealerStabilize?: (targetId: string) => boolean
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
  tceAllowed = false,
  masterRules = {},
  noLongRestDays = 0,
  onNoLongRestResolved,
  onFallingSelf,
  onResourcesChange,
  onApplyLingeringInjury,
  onApplySystemShockSelf,
  knownInvocationIds = [],
  featurePicks,
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
  onOpenItem,
  formulaVars = {},
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
  ancestryId = null,
  ftdAllowed = null,
  onHalflingLuckyNeeded,
  featGrants = null,
  spellAbilityMod = 0,
  hitDiceTotal = 1,
  onHealerHeal,
  onHealerStabilize,
}: PlayDeskAttacksCompactProps) {
  const turnEco = useTurnEconomy()
  const [grappleOpen, setGrappleOpen] = useState(false)
  const [grappleSpend, setGrappleSpend] = useState<
    'attack' | 'bonus' | 'action' | 'none'
  >('attack')
  const [grappleModes, setGrappleModes] = useState<GrappleShoveMode[] | undefined>(
    undefined,
  )
  const [grappleTitle, setGrappleTitle] = useState<string | undefined>(undefined)
  const [telekineticOpen, setTelekineticOpen] = useState(false)
  const [powerAttackOn, setPowerAttackOn] = useState(false)
  const [longRangeMarked, setLongRangeMarked] = useState(false)
  const [within5ft, setWithin5ft] = useState(false)
  const [grappledTarget, setGrappledTarget] = useState(false)
  const [chargerPlus5Next, setChargerPlus5Next] = useState(false)
  /** O-06: next attack is the TWF off-hand bonus (ability mod rules). */
  const [twfBonusArmed, setTwfBonusArmed] = useState(false)
  const [healerTargetId, setHealerTargetId] = useState<string | null>(null)
  const [healerMode, setHealerMode] = useState<'stabilize' | 'heal' | null>(null)
  const [o03Dialog, setO03Dialog] = useState<
    | null
    | 'disarm'
    | 'mark'
    | 'overrun'
    | 'tumble'
    | 'climb'
    | 'identify'
    | 'falling'
    | 'noLongRest'
  >(null)
  const [o04Dialog, setO04Dialog] = useState<
    | null
    | 'cleave'
    | 'massive'
    | 'injury'
    | 'morale'
    | 'hero'
    | 'profDie'
  >(null)
  const [cleaveCtx, setCleaveCtx] = useState<{
    overflow: number
    attackTotal: number | null
    excludeTargetId: string | null
  } | null>(null)
  const [massiveCtx, setMassiveCtx] = useState<{
    label: string
    damage: number
    hpMax: number | null
    self: boolean
  } | null>(null)
  const [injuryReason, setInjuryReason] = useState('вручную')
  const [profDiePending, setProfDiePending] = useState<{
    resolve: (roll: number) => void
  } | null>(null)
  const [markedTarget, setMarkedTarget] = useState<{ id: string; name: string } | null>(null)
  const [markOppUsed, setMarkOppUsed] = useState(false)
  const [targetIsObject, setTargetIsObject] = useState(false)
  const [focusedAimOffer, setFocusedAimOffer] = useState<{
    attackName: string
    baseTotal: number | null
  } | null>(null)
  const [focusedAimKi, setFocusedAimKi] = useState(1)
  const styleIds = fightingStyleIds?.length
    ? fightingStyleIds
    : fightingStyleId
      ? [fightingStyleId]
      : []
  const hasInterception = tceAllowed && styleIds.includes('interception')
  const hasBlindFighting = tceAllowed && styleIds.includes('blind_fighting')
  const hasProtectionStyle = hasFightingStyle(styleIds, 'protection')
  const hasTwoWeaponStyle = hasFightingStyle(styleIds, 'two_weapon_fighting')
  const hasGwfStyle = hasFightingStyle(styleIds, 'great_weapon_fighting')
  const hasDevilsSightChip = hasDevilsSight(knownInvocationIds)
  const hasDualWielder = hasFeatFlag(featGrants, 'dual_wielder')
  const heldMelee = listHeldMeleeWeapons(inventoryItems)
  const breathKind = dragonbornBreathKind(raceSlug)
  const breathAncestry = resolveDragonbornAncestryBreath({
    raceSlug,
    ancestryId,
  })
  const breathPool = resources?.find((r) => r.id === breathWeaponResourceId())
  const breathLeft = breathPool
    ? Math.max(0, breathPool.max - breathPool.used)
    : 0
  const ftdOk = ftdTableVisible(ftdAllowed)
  const hasChainMaster =
    tceAllowed && knownInvocationIds.includes('investment_of_the_chain_master')
  const hasTalismanRebuke =
    tceAllowed && knownInvocationIds.includes('rebuke_of_the_talisman')
  const knowsGrapplingStrike = Boolean(
    featurePicks &&
      Object.values(featurePicks.values).some((raw) =>
        raw
          .split(',')
          .map((s) => s.trim())
          .includes('grappling_strike'),
      ),
  )
  const hasGwm = hasFeatFlag(featGrants, 'great_weapon_master')
  const hasSharpshooter = hasFeatFlag(featGrants, 'sharpshooter')
  const hasCharger = hasFeatFlag(featGrants, 'charger')
  const hasCrossbowExpert = hasFeatFlag(featGrants, 'crossbow_expert')
  const hasTavernBrawler = hasFeatFlag(featGrants, 'tavern_brawler')
  const hasHealer = hasFeatFlag(featGrants, 'healer')
  const hasGrappler = hasFeatFlag(featGrants, 'grappler')
  const hasShieldMaster = hasFeatFlag(featGrants, 'shield_master')
  const hasTelekinetic = hasFeatFlag(featGrants, 'telekinetic')
  const hasOrcishFury = hasFeatFlag(featGrants, 'orcish_fury')
  const hasCrusher = hasFeatFlag(featGrants, 'crusher')
  const hasPiercer = hasFeatFlag(featGrants, 'piercer')
  const hasSlasher = hasFeatFlag(featGrants, 'slasher')
  const hasGunner = hasFeatFlag(featGrants, 'gunner')
  const shieldInHand = Boolean(equippedArmorPieces(inventoryItems).shield)
  const healerKit = findHealerKitItem(inventoryItems)
  const holdingHandCrossbow = weapons.some(
    (w) => w.held && isHandCrossbowName(w.name),
  )
  const showPowerAttackChip = hasGwm || hasSharpshooter

  function openBonusGrapple(
    modes: GrappleShoveMode[],
    title: string,
    afterOpen?: () => void,
  ) {
    setGrappleSpend('bonus')
    setGrappleModes(modes)
    setGrappleTitle(title)
    setGrappleOpen(true)
    afterOpen?.()
  }

  function openActionGrapple(modes: GrappleShoveMode[], title: string) {
    setGrappleSpend('action')
    setGrappleModes(modes)
    setGrappleTitle(title)
    setGrappleOpen(true)
  }
  const companionAttacks = useMemo(
    () =>
      listCompanionAttacksForHost(companions, {
        characterLevel,
        spellMod,
        proficiencyBonus,
      }),
    [companions, characterLevel, spellMod, proficiencyBonus],
  )
  const [attackBreakdown, setAttackBreakdown] = useState<{
    name: string
    parts: AttackBonusPart[]
  } | null>(null)
  const [pendingAttack, setPendingAttack] = useState<{
    name: string
    attackBonus: number
    strikeText?: string
    hitTotal?: number
    formula?: string
    breakdown?: string
    tableMode?: boolean
    crit?: boolean
    /** O-03: оружие/боеприпас помечен адамантином. */
    adamantine?: boolean
    /** O-04: рукопашная атака оружием — для разрубания. */
    meleeWeapon?: boolean
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
  const blessedStrikes = useMemo(
    () =>
      blessedStrikesRider({
        features: combatFeatures,
        tceAllowed,
      }),
    [combatFeatures, tceAllowed],
  )
  const improvedSmite = useMemo(
    () => improvedDivineSmiteRider(combatFeatures),
    [combatFeatures],
  )
  const hasFocusedAim =
    tceAllowed && hasO02Feature(combatFeatures, 'focused_aim')
  const hasFavoredFoe =
    tceAllowed && hasO02Feature(combatFeatures, 'favored_foe')
  const rangerLevel =
    combatFeatures.find((f) => f.id === 'favored_foe')?.classLevel ??
    characterLevel
  const kiResource = resources.find((row) => /:ki:/.test(row.id)) ?? null
  const kiLeft = kiResource
    ? Math.max(0, kiResource.max - kiResource.used)
    : 0
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
            onToggleMoved={turnEco.toggleMoved}
            className="chip-row"
          />
          {masterRules.dmg_adamantine_weapon ? (
            <label className="field" style={{ marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={targetIsObject}
                onChange={(e) => setTargetIsObject(e.target.checked)}
              />{' '}
              Цель — предмет (адамантин → автокрит)
            </label>
          ) : null}
          {showPowerAttackChip ? (
            <div className="chip-row" style={{ marginBottom: 8 }} role="group" aria-label="Силовой удар">
              <button
                type="button"
                className={`sheet-chip${powerAttackOn ? ' is-on' : ''}`}
                title={
                  hasGwm && hasSharpshooter
                    ? `${POWER_ATTACK_HINT_GWM} · ${POWER_ATTACK_HINT_SS}`
                    : hasGwm
                      ? POWER_ATTACK_HINT_GWM
                      : POWER_ATTACK_HINT_SS
                }
                onClick={() => setPowerAttackOn((v) => !v)}
              >
                {hasGwm && hasSharpshooter
                  ? 'Силовой удар −5/+10'
                  : hasGwm
                    ? 'Мастер большого оружия −5/+10'
                    : 'Меткий стрелок −5/+10'}
              </button>
              {hasSharpshooter ? (
                <label className="field" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={longRangeMarked}
                    onChange={(e) => setLongRangeMarked(e.target.checked)}
                  />{' '}
                  Дальняя дистанция
                </label>
              ) : null}
              {hasCrossbowExpert || hasGunner || hasSharpshooter ? (
                <label className="field" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={within5ft}
                    onChange={(e) => setWithin5ft(e.target.checked)}
                  />{' '}
                  В 5 фт
                </label>
              ) : null}
            </div>
          ) : hasCrossbowExpert || hasGunner ? (
            <div className="chip-row" style={{ marginBottom: 8 }}>
              <label className="field" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={within5ft}
                  onChange={(e) => setWithin5ft(e.target.checked)}
                />{' '}
                В 5 фт (дальнобойная)
              </label>
            </div>
          ) : null}

          {hasGrappler || hasGwm ? (
            <div className="chip-row" style={{ marginBottom: 8 }}>
              {hasGrappler ? (
                <label className="field" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={grappledTarget}
                    onChange={(e) => setGrappledTarget(e.target.checked)}
                  />{' '}
                  Цель схвачена мной (преимущество)
                </label>
              ) : null}
              {hasGwm ? (
                <button
                  type="button"
                  className="sheet-chip"
                  title="Отметить добивание рукопашным оружием в этот ход (хиты цели → 0)"
                  onClick={() => {
                    turnEco?.patchTurnEconomy(markMeleeWeaponCritOrKill)
                    onToast?.('Мастер большого оружия: добивание отмечено · бонусная атака доступна')
                  }}
                >
                  Добивание (0 хитов)
                </button>
              ) : null}
            </div>
          ) : null}

          <TurnEconomyCombatActions
            hasCunningAction={
              hasCunningAction ||
              combatFeatures.some((f) => f.id === 'cunning_action')
            }
            hasSteadyAim={
              tceAllowed && combatFeatures.some((f) => f.id === 'steady_aim')
            }
            hasKiFueledAttack={
              tceAllowed && combatFeatures.some((f) => f.id === 'ki_fueled_attack')
            }
            hasInterception={hasInterception}
            hasBlindFighting={hasBlindFighting}
            hasChainMaster={hasChainMaster}
            hasTalismanRebuke={hasTalismanRebuke}
            hasProtectionStyle={hasProtectionStyle}
            shieldInHandForProtection={shieldInHand}
            hasDevilsSight={hasDevilsSightChip}
            showTwoWeaponBonus={heldMelee.length >= 2}
            twoWeaponBonusGate={
              turnEco
                ? canTwoWeaponBonusAttack(turnEco.turnEconomy, {
                    hasDualWielder,
                    heldMelee,
                  })
                : { ok: false, reason: 'Нет экономики хода' }
            }
            onTwoWeaponBonus={() => {
              if (!turnEco) return
              const gate = canTwoWeaponBonusAttack(turnEco.turnEconomy, {
                hasDualWielder,
                heldMelee,
              })
              if (!gate.ok) return
              turnEco.patchTurnEconomy(markTwoWeaponBonusUsed)
              setTwfBonusArmed(true)
              const modNote = hasTwoWeaponStyle
                ? 'к урону добавляется модификатор характеристики (стиль)'
                : 'к урону модификатор характеристики не добавляется (кроме отрицательного)'
              onToast?.(
                `Атака вторым оружием: бонусное · ${modNote}. Выбери оружие во второй руке.`,
              )
            }}
            o06Breath={
              breathKind && breathAncestry
                ? {
                    label: 'Оружие дыхания',
                    hint: `${breathAncestry.shapeRu} · ${breathWeaponDamageExpr({
                      kind: breathKind,
                      characterLevel,
                      damageType: breathAncestry.damage,
                    })} · Сл ${breathWeaponSaveDc({
                      conMod: abilityModifier(abilities.con),
                      proficiencyBonus,
                    })}`,
                    disabled:
                      !turnEco?.canFeature('action').ok || breathLeft <= 0,
                    disabledReason: (() => {
                      if (breathLeft <= 0) return 'Оружие дыхания уже потрачено'
                      const gate = turnEco?.canFeature('action')
                      return gate && !gate.ok ? gate.reason : undefined
                    })(),
                    onClick: () => {
                      if (!turnEco || !breathKind || !breathAncestry) return
                      if (!turnEco.canFeature('action').ok) return
                      if (breathLeft <= 0) return
                      turnEco.spendFeature('action')
                      const rolled = rollBreathWeaponDamage({
                        kind: breathKind,
                        characterLevel,
                        damageType: breathAncestry.damage,
                      })
                      const dc = breathWeaponSaveDc({
                        conMod: abilityModifier(abilities.con),
                        proficiencyBonus,
                      })
                      const saveRu =
                        breathAncestry.save === 'con' ? 'Тел' : 'Лов'
                      onToast?.(
                        `Оружие дыхания: ${breathAncestry.shapeRu} · Сл ${dc} (${saveRu}) · урон ${rolled.total} ${breathAncestry.damage} (${rolled.detail}). Цели в линии/конусе — подтверди вручную.`,
                      )
                      if (breathPool && onSpendResource) {
                        onSpendResource(breathPool.id)
                      } else if (breathPool && onResourcesChange && resources) {
                        onResourcesChange(
                          resources.map((row) =>
                            row.id === breathPool.id
                              ? { ...row, used: Math.min(row.max, row.used + 1) }
                              : row,
                          ),
                        )
                      }
                    },
                  }
                : null
            }
            o06FtdExtra={(() => {
              if (!breathKind || breathKind !== 'ftd' || !ftdOk) return []
              if (characterLevel < 5) return []
              const extras: Array<{
                label: string
                hint: string
                disabled?: boolean
                disabledReason?: string
                onClick: () => void
              }> = []
              if (raceSlug === 'dragonborn_chromatic') {
                const pool = resources?.find(
                  (r) => r.id === chromaticWardingResourceId(),
                )
                const left = pool ? Math.max(0, pool.max - pool.used) : 0
                extras.push({
                  label: 'Защита цветного дракона',
                  hint: 'Иммунитет к своему типу урона на 1 мин (1/длинный)',
                  disabled: left <= 0,
                  disabledReason: 'Уже использовано',
                  onClick: () => {
                    onToast?.(
                      `Защита цветного дракона: иммунитет к ${breathAncestry?.damage || 'типу происхождения'} на 1 мин`,
                    )
                    if (pool && onSpendResource) onSpendResource(pool.id)
                  },
                })
              }
              if (raceSlug === 'dragonborn_gem') {
                const pool = resources?.find(
                  (r) => r.id === gemFlightResourceId(),
                )
                const left = pool ? Math.max(0, pool.max - pool.used) : 0
                extras.push({
                  label: 'Спектральные крылья',
                  hint: 'Полёт = скорость ходьбы на 1 мин (БМ раз / длинный)',
                  disabled: left <= 0,
                  disabledReason: 'Нет использований',
                  onClick: () => {
                    onToast?.(
                      'Спектральные крылья: полёт со скоростью ходьбы на 1 минуту',
                    )
                    if (pool && onSpendResource) onSpendResource(pool.id)
                  },
                })
              }
              if (raceSlug === 'dragonborn_metallic') {
                const pool = resources?.find(
                  (r) => r.id === metallicBreathResourceId(),
                )
                const left = pool ? Math.max(0, pool.max - pool.used) : 0
                extras.push({
                  label: 'Металлическое дыхание',
                  hint: 'Изнуряющее или отталкивающее (1/длинный) — выбери эффект по 5e14',
                  disabled: left <= 0,
                  disabledReason: 'Уже использовано',
                  onClick: () => {
                    onToast?.(
                      'Металлическое оружие дыхания: изнуряющее (помеха на атаки/проверки) или отталкивающее (толчок 20 фт + prone) — 15 фт конус, Сл как у дыхания',
                    )
                    if (pool && onSpendResource) onSpendResource(pool.id)
                  },
                })
              }
              return extras
            })()}
            onGrappleShove={() => {
              setGrappleSpend('attack')
              setGrappleModes(undefined)
              setGrappleTitle(undefined)
              setGrappleOpen(true)
            }}
            o05={{
              greatWeaponMaster: hasGwm,
              charger: hasCharger,
              crossbowExpert: hasCrossbowExpert,
              holdingHandCrossbow,
              tavernBrawler: hasTavernBrawler,
              healer: hasHealer,
              hasHealerKit: Boolean(healerKit),
              grappler: hasGrappler,
              shieldMaster: hasShieldMaster,
              shieldInHand,
              telekinetic: hasTelekinetic,
              orcishFury: hasOrcishFury,
              tceAllowed,
            }}
            onO05GwmBonus={() => {
              onToast?.('Сделай одну рукопашную атаку оружием (бонусное уже отмечено)')
            }}
            onO05ChargerAttack={() => {
              setChargerPlus5Next(true)
              onToast?.('Следующая рукопашная атака оружием: +5 к урону (Налётчик)')
            }}
            onO05ChargerShove={() => {
              openBonusGrapple(
                ['shove_prone', 'shove_push'],
                'Налётчик: толчок',
                () => {
                  turnEco?.patchTurnEconomy((s) => ({
                    ...s,
                    chargerBonusUsed: true,
                  }))
                },
              )
            }}
            onO05CrossbowBonus={() => {
              onToast?.('Сделай одну атаку ручным арбалетом (бонусное уже отмечено)')
            }}
            onO05TavernGrapple={() => {
              openBonusGrapple(['grapple'], 'Драчун: захват')
            }}
            onO05HealerStabilize={() => {
              setHealerMode('stabilize')
              setHealerTargetId(null)
            }}
            onO05HealerHeal={() => {
              setHealerMode('heal')
              setHealerTargetId(null)
            }}
            onO05GrapplerPin={() => {
              openActionGrapple(['shove_prone'], 'Борец: опрокинуть схваченного')
            }}
            onO05ShieldShove={() => {
              openBonusGrapple(
                ['shove_prone', 'shove_push'],
                'Мастер щита: толчок',
                () => {
                  turnEco?.patchTurnEconomy(markShieldMasterShoveUsed)
                },
              )
            }}
            onO05Telekinetic={() => setTelekineticOpen(true)}
            onO05OrcishFury={() => {
              onToast?.('Сделай одну атаку тем же оружием (бонусное уже отмечено)')
            }}
            o03={{
              disarm: Boolean(masterRules.dmg_disarm),
              mark: Boolean(masterRules.dmg_mark),
              overrun: Boolean(masterRules.dmg_overrun),
              tumble: Boolean(masterRules.dmg_tumble),
              climbBigger: Boolean(masterRules.dmg_climb_bigger),
              identifySpell: Boolean(masterRules.xge_identify_spell),
              falling: Boolean(masterRules.dmg_falling),
              noLongRest: Boolean(masterRules.xge_no_long_rest),
              hasMarkedTarget: Boolean(markedTarget),
              markOppAvailable: Boolean(markedTarget) && !markOppUsed,
            }}
            onO03Disarm={() => setO03Dialog('disarm')}
            onO03Mark={() => setO03Dialog('mark')}
            onO03MarkOpportunity={() => {
              if (!markedTarget || markOppUsed) return
              setMarkOppUsed(true)
              onToast?.(
                `Провоцированная по метке · ${markedTarget.name} · преимущество · реакция не потрачена`,
              )
            }}
            onO03Overrun={() => setO03Dialog('overrun')}
            onO03Tumble={() => setO03Dialog('tumble')}
            onO03ClimbBigger={() => setO03Dialog('climb')}
            onO03IdentifySpell={() => setO03Dialog('identify')}
            onO03Falling={() => setO03Dialog('falling')}
            onO03NoLongRest={() => setO03Dialog('noLongRest')}
            o04={{
              cleave: Boolean(masterRules.dmg_cleave),
              massiveDamage: Boolean(masterRules.dmg_massive_damage),
              lingeringInjuries: Boolean(masterRules.dmg_lingering_injuries),
              morale: Boolean(masterRules.dmg_morale),
              heroPoints: Boolean(masterRules.dmg_hero_points),
              proficiencyDice: Boolean(masterRules.dmg_proficiency_dice),
            }}
            onO04LingeringInjury={() => {
              setInjuryReason('вручную')
              setO04Dialog('injury')
            }}
            onO04Morale={() => setO04Dialog('morale')}
            onO04HeroPoints={() => setO04Dialog('hero')}
            onToast={onToast}
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
          <GrappleShoveDialog
            open={grappleOpen}
            characterId={characterId ?? ''}
            athleticsMod={abilityModifier(abilities.str ?? 10) + proficiencyBonus}
            offerGrapplingStrike={
              grappleSpend === 'attack' &&
              knowsGrapplingStrike &&
              Boolean(turnEco?.canFeature('bonus').ok)
            }
            allowShoveAside={Boolean(masterRules.dmg_shove_aside)}
            spendTiming={grappleSpend}
            allowedModes={grappleModes}
            titleOverride={grappleTitle}
            onSpendGrapplingStrike={() => {
              if (!turnEco?.canFeature('bonus').ok) return false
              // Prefer Battle Master pool, then Superior Technique d6.
              const pool =
                resources.find((row) => /:superiority_dice:/.test(row.id) && row.used < row.max) ??
                resources.find((row) => /:superiority_dice_st:/.test(row.id) && row.used < row.max)
              if (!pool) {
                onToast?.('Нет кости превосходства для «Атаки с захватом»')
                return false
              }
              turnEco.spendFeature('bonus')
              onSpendResource?.(pool.id)
              return true
            }}
            onToast={onToast}
            onClose={() => {
              setGrappleOpen(false)
              setGrappleSpend('attack')
              setGrappleModes(undefined)
              setGrappleTitle(undefined)
            }}
          />
          <TelekineticShoveDialog
            open={telekineticOpen}
            characterId={characterId ?? ''}
            spellAbilityMod={spellAbilityMod}
            onToast={onToast}
            onClose={() => setTelekineticOpen(false)}
          />
          {healerMode ? (
            <div className="chip-row" style={{ marginBottom: 8 }} role="group" aria-label="Целитель · цель">
              <span className="sheet-chip is-stub">
                Целитель: {healerMode === 'stabilize' ? 'стабилизировать' : 'лечить'}
              </span>
              {(turnEco?.targets ?? [])
                .filter((t) => t.is_ally || t.kind === 'pc')
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`sheet-chip${healerTargetId === t.id ? ' is-on' : ''}`}
                    onClick={() => setHealerTargetId(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              <button
                type="button"
                className="sheet-chip"
                disabled={!healerTargetId || !healerKit || !turnEco?.canFeature('action').ok}
                onClick={() => {
                  if (!healerTargetId || !healerKit) return
                  if (!turnEco?.canFeature('action').ok) return
                  const usedKey = `o05_healer_used:${healerTargetId}`
                  const already = (activeEffects ?? []).some(
                    (e) => e.slug === usedKey && !e.inactive,
                  )
                  if (healerMode === 'heal' && already) {
                    onToast?.('Эту цель уже лечили чертой «Целитель» с последнего отдыха')
                    return
                  }
                  turnEco.spendFeature('action')
                  onSpendConsumable?.(healerKit.id, 1)
                  if (healerMode === 'stabilize') {
                    const ok = onHealerStabilize?.(healerTargetId) ?? true
                    onToast?.(
                      ok
                        ? `Целитель: ${healerTargetId} стабилизирован (набор −1)`
                        : 'Не удалось стабилизировать',
                    )
                  } else {
                    const heal = healerFeatHealAmount(hitDiceTotal)
                    const ok = onHealerHeal?.(heal.amount, heal.label, healerTargetId) ?? true
                    onToast?.(ok ? `${heal.label} · набор −1` : heal.label)
                  }
                  setHealerMode(null)
                  setHealerTargetId(null)
                }}
              >
                Подтвердить
              </button>
              <button
                type="button"
                className="sheet-chip"
                onClick={() => {
                  setHealerMode(null)
                  setHealerTargetId(null)
                }}
              >
                Отмена
              </button>
            </div>
          ) : null}
          <DisarmDialog
            open={o03Dialog === 'disarm'}
            characterId={characterId ?? ''}
            attackBonus={
              abilityModifier(abilities.str ?? 10) + proficiencyBonus
            }
            onToast={onToast}
            onClose={() => setO03Dialog(null)}
          />
          <MarkDialog
            open={o03Dialog === 'mark'}
            onMark={(t) => {
              setMarkedTarget({ id: t.id, name: t.name })
              setMarkOppUsed(false)
              onToast?.(`Метка · ${t.name} · до конца следующего хода`)
            }}
            onClose={() => setO03Dialog(null)}
          />
          <OverrunTumbleDialog
            open={o03Dialog === 'overrun' || o03Dialog === 'tumble'}
            mode={o03Dialog === 'tumble' ? 'tumble' : 'overrun'}
            characterId={characterId ?? ''}
            athleticsMod={abilityModifier(abilities.str ?? 10) + proficiencyBonus}
            acrobaticsMod={abilityModifier(abilities.dex ?? 10) + proficiencyBonus}
            onToast={onToast}
            onClose={() => setO03Dialog(null)}
          />
          <ClimbBiggerDialog
            open={o03Dialog === 'climb'}
            characterId={characterId ?? ''}
            athleticsMod={abilityModifier(abilities.str ?? 10) + proficiencyBonus}
            acrobaticsMod={abilityModifier(abilities.dex ?? 10) + proficiencyBonus}
            onToast={onToast}
            onClose={() => setO03Dialog(null)}
          />
          <IdentifySpellDialog
            open={o03Dialog === 'identify'}
            characterId={characterId ?? ''}
            arcanaMod={abilityModifier(abilities.int ?? 10) + proficiencyBonus}
            onToast={onToast}
            onClose={() => setO03Dialog(null)}
          />
          <FallingDialog
            open={o03Dialog === 'falling'}
            characterId={characterId ?? ''}
            onApplySelfDamage={onFallingSelf}
            onToast={onToast}
            onClose={() => setO03Dialog(null)}
          />
          <NoLongRestDialog
            open={o03Dialog === 'noLongRest'}
            characterId={characterId ?? ''}
            conMod={abilityModifier(abilities.con ?? 10)}
            daysAlready={noLongRestDays}
            onResolved={(next) => onNoLongRestResolved?.(next)}
            onToast={onToast}
            onClose={() => setO03Dialog(null)}
          />
          <CleaveDialog
            open={o04Dialog === 'cleave' && Boolean(cleaveCtx)}
            characterId={characterId ?? ''}
            overflow={cleaveCtx?.overflow ?? 0}
            attackTotal={cleaveCtx?.attackTotal ?? null}
            excludeTargetId={cleaveCtx?.excludeTargetId}
            onToast={onToast}
            onClose={() => {
              setO04Dialog(null)
              setCleaveCtx(null)
            }}
          />
          <MassiveDamageDialog
            open={o04Dialog === 'massive' && Boolean(massiveCtx)}
            characterId={characterId}
            targetLabel={massiveCtx?.label ?? ''}
            damage={massiveCtx?.damage ?? 0}
            hpMax={massiveCtx?.hpMax ?? null}
            conMod={abilityModifier(abilities.con ?? 10)}
            diceOnTable={Boolean(turnEco?.diceOnTable)}
            onApplyShock={(row) => {
              if (massiveCtx?.self) onApplySystemShockSelf?.(row)
              else onToast?.(`Системный шок на цели: ${row.nameRu} — примените на карточке`)
            }}
            onFailedSave={() => {
              if (masterRules.dmg_lingering_injuries) {
                setInjuryReason('провал спаса массивного урона')
              }
            }}
            onToast={onToast}
            onClose={() => {
              const needInjury =
                masterRules.dmg_lingering_injuries &&
                injuryReason === 'провал спаса массивного урона'
              setMassiveCtx(null)
              if (needInjury) setO04Dialog('injury')
              else setO04Dialog(null)
            }}
          />
          <LingeringInjuryDialog
            open={o04Dialog === 'injury'}
            characterId={characterId}
            reason={injuryReason}
            diceOnTable={Boolean(turnEco?.diceOnTable)}
            onApplyInjury={(row) => onApplyLingeringInjury?.(row)}
            onToast={onToast}
            onClose={() => setO04Dialog(null)}
          />
          <MoraleCheckDialog
            open={o04Dialog === 'morale'}
            onToast={onToast}
            onClose={() => setO04Dialog(null)}
          />
          <HeroPointSpendDialog
            open={o04Dialog === 'hero'}
            remaining={heroPointsRemaining(resources)}
            level={characterLevel}
            isDying={false}
            diceOnTable={Boolean(turnEco?.diceOnTable)}
            onSpendD6={() => {
              const next = spendHeroPoint(resources)
              if (next.ok) onResourcesChange?.(next.resources)
            }}
            onStabilizeOrDeathSuccess={() => {
              const next = spendHeroPoint(resources)
              if (next.ok) onResourcesChange?.(next.resources)
            }}
            onToast={onToast}
            onClose={() => setO04Dialog(null)}
          />
          <ProficiencyDieDialog
            open={o04Dialog === 'profDie'}
            proficiencyBonus={proficiencyBonus}
            onConfirm={(roll) => {
              profDiePending?.resolve(roll)
            }}
            onClose={() => {
              setO04Dialog(null)
              setProfDiePending(null)
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

      {focusedAimOffer && hasFocusedAim ? (
        <div
          className="chip-row"
          style={{ marginBottom: 8 }}
          role="group"
          aria-label="Сосредоточенный прицел"
        >
          <span className="sheet-chip is-stub" title="TCE · на промахе">
            Сосредоточенный прицел
          </span>
          {[1, 2, 3].map((n) => {
            const cost = focusedAimKiClamp(n)
            const bonus = focusedAimBonus(cost)
            return (
              <button
                key={cost}
                type="button"
                className={`sheet-chip${focusedAimKi === cost ? ' is-on' : ''}`}
                disabled={!kiResource || kiLeft < cost || !onSpendResource}
                title={
                  !kiResource
                    ? 'Пул ки не найден'
                    : kiLeft < cost
                      ? `Не хватает ки (нужно ${cost}, есть ${kiLeft})`
                      : `Потратить ${cost} ци · +${bonus} к броску атаки`
                }
                onClick={() => {
                  if (!kiResource || !onSpendResource || kiLeft < cost) return
                  setFocusedAimKi(cost)
                  for (let i = 0; i < cost; i += 1) onSpendResource(kiResource.id)
                  onToast?.(
                    `Сосредоточенный прицел: −${cost} ци · +${bonus} к броску атаки`,
                  )
                  if (turnEco?.diceOnTable) {
                    setEnterNumberCtx({
                      title: `Атака: ${focusedAimOffer.attackName} (+${bonus})`,
                      attackBonus: bonus,
                      attackName: focusedAimOffer.attackName,
                    })
                    setEnterNumberOpen(true)
                  }
                  setFocusedAimOffer(null)
                }}
              >
                {cost} ци (+{bonus})
              </button>
            )
          })}
          <button
            type="button"
            className="sheet-chip"
            onClick={() => setFocusedAimOffer(null)}
          >
            Отмена
          </button>
        </div>
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
            const rawBaseDamage = shillelaghOn
              ? shillelaghDamage(attack.damage)
              : monkWeapon
                ? effectiveMartialArtsDamage({
                    weaponDamage: face.damage,
                    martialArtsDie,
                    forceMartialArts: unarmed,
                  })
                : face.damage
            const featUnarmed = hasTavernBrawler
              ? (featGrants ?? [])
                  .map((g) => g.applied.unarmedDamage)
                  .find((d) => Boolean(d))
              : null
            const baseDamage =
              unarmed && hasTavernBrawler
                ? tavernBrawlerUnarmedDamage(featUnarmed || rawBaseDamage)
                : isImprovisedWeaponName(attack.name) && hasTavernBrawler
                  ? tavernBrawlerUnarmedDamage(rawBaseDamage || '1к4')
                  : rawBaseDamage
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
            const styleDmg =
              fightingStyleDamageBonusFromIds({
                styleIds,
                oneHandedMelee,
                holdingAnotherWeapon: equippedWeaponCount > 1,
              }) +
              fightingStyleThrownDamageBonusFromIds({
                styleIds,
                weaponName: attack.name,
                thrownRanged: !meleeAttack,
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
            const proficient = Boolean(attack.is_proficient || unarmed)
            const magicAtk = gear?.attackBonus ?? 0
            const effectAtk = flatFxAttack + fxAttackFlat
            const attackParts = buildAttackBonusParts({
              abilityKey: attackAbility,
              abilityMod: mod,
              proficient,
              proficiencyBonus,
              magicBonus: magicAtk,
              styleBonus: styleAtk,
              infusionBonus: infusionAtk,
              effectBonus: effectAtk,
            })
            const pbContrib = proficiencyRollContribution({
              proficient,
              proficiencyBonus,
              // Для подписи кнопки — числовой БМ; фактический бросок кости — в onClick.
              diceEnabled: false,
            })
            const powerKind = resolvePowerAttackKind({
              attackName: attack.name,
              isWeaponAttack: !isSpellAttackName(attack.name),
              hasGreatWeaponMaster: hasGwm,
              hasSharpshooter: hasSharpshooter,
              powerAttackOn,
              proficient,
            })
            const powerMods = powerAttackModifiers(powerKind)
            const chargerFlat =
              chargerPlus5Next && meleeAttack && !unarmed ? 5 : 0
            const attackBonus =
              mod +
              pbContrib.value +
              magicAtk +
              styleAtk +
              infusionAtk +
              effectAtk +
              powerMods.attackDelta
            const profDiceOn = Boolean(masterRules.dmg_proficiency_dice) && proficient
            const abilityDmgMod =
              twfBonusArmed && meleeAttack && !unarmed
                ? twoWeaponBonusDamageAbilityMod({
                    abilityMod: mod,
                    hasTwoWeaponFightingStyle: hasTwoWeaponStyle,
                  })
                : mod
            const dmgBonus =
              abilityDmgMod +
              (gear?.damageBonus ?? 0) +
              infusionDmg +
              flatFxDamage +
              powerMods.damageDelta +
              chargerFlat
            const dmg =
              baseDamage +
              (dmgBonus ? `${dmgBonus >= 0 ? '+' : ''}${dmgBonus}` : '')
            const gwfApplies =
              hasGwfStyle &&
              meleeAttack &&
              !unarmed &&
              weaponQualifiesForGreatWeaponFighting({
                weaponName: attack.name,
                damageExpr: baseDamage,
                twoHanded: grip === 'two_hand',
              })
            const pointBlankDis = rangedPointBlankDisadvantage({
              attackName: attack.name,
              within5ft,
              hasCrossbowExpert,
              hasGunner,
            })
            const longRangeDis = rangedLongRangeDisadvantage({
              hasSharpshooter,
              longRangeMarked,
            })
            let attackMode: DeskRollMode =
              attack.mode_active && attack.activation?.advantage
                ? rollMode === 'disadvantage'
                  ? 'normal'
                  : 'advantage'
                : rollMode
            if (hasGrappler && grappledTarget && meleeAttack) {
              if (attackMode === 'disadvantage') attackMode = 'normal'
              else if (attackMode === 'normal') attackMode = 'advantage'
            }
            if (pointBlankDis || longRangeDis) {
              if (attackMode === 'advantage') attackMode = 'normal'
              else if (attackMode === 'normal') attackMode = 'disadvantage'
            }
            const dmgLine = `${dmg || '—'}${shownType ? ` ${shownType}` : ''}${
              divineStrike ? ` + ${divineStrike.label}` : ''
            }${meleeAttack && improvedSmite ? ` + ${improvedSmite.label}` : ''}${
              meleeAttack && symbioticRider ? ` + ${symbioticRider.label}` : ''
            }${powerKind ? ' · −5/+10' : ''}${chargerFlat ? ' · +5 Налётчик' : ''}${
              twfBonusArmed && meleeAttack ? ' · 2-е оружие' : ''
            }${gwfApplies ? ' · GWF' : ''}`
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

                    const runAttackWithPb = (pbValue: number, pbNote: string) => {
                    const effectiveAttackBonus =
                      mod +
                      pbValue +
                      magicAtk +
                      styleAtk +
                      infusionAtk +
                      effectAtk +
                      powerMods.attackDelta
                    if (pbNote) onToast?.(pbNote)

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
                      if (chargerPlus5Next && meleeAttack && !unarmed) {
                        setChargerPlus5Next(false)
                      }
                      const hitOk =
                        Boolean(opts?.tableHit) ||
                        (opts?.hitTotal != null && !opts?.tableMiss)
                      if (hitOk) {
                        turnEco?.patchTurnEconomy((s) => {
                          let next = markWeaponHitThisTurn(s)
                          if (
                            unarmed ||
                            isUnarmedAttackName(attack.name) ||
                            isImprovisedWeaponName(attack.name)
                          ) {
                            next = markUnarmedOrImprovisedHit(next)
                          }
                          if (
                            meleeAttack &&
                            !unarmed &&
                            (opts?.crit ||
                              (opts?.target?.hp_current != null &&
                                opts.damageTotal != null &&
                                opts.damageTotal >= opts.target.hp_current) ||
                              (opts?.target?.hp_current != null &&
                                opts.target.hp_current <= 0))
                          ) {
                            next = markMeleeWeaponCritOrKill(next)
                          } else if (meleeAttack && !unarmed && opts?.crit) {
                            next = markGwmBonusReady(next)
                          }
                          return next
                        })
                        if (tceAllowed && hasCrusher && damageTypeIsBludgeoning(shownType)) {
                          if (!turnEco?.turnEconomy.crusherUsedThisTurn) {
                            turnEco?.patchTurnEconomy(markCrusherUsed)
                            onToast?.(
                              opts?.crit
                                ? 'Дробитель: сдвиг 5 фт · атаки по цели с преимуществом до вашего следующего хода'
                                : 'Дробитель: можно сдвинуть цель на 5 фт (пометка в ленте)',
                            )
                          }
                        }
                        if (tceAllowed && hasPiercer && damageTypeIsPiercing(shownType)) {
                          if (!turnEco?.turnEconomy.piercerUsedThisTurn) {
                            turnEco?.patchTurnEconomy(markPiercerUsed)
                            onToast?.(
                              opts?.crit
                                ? 'Пронзатель: переброс одной кости урона · крит — ещё одна кость оружия'
                                : 'Пронзатель: можно перебросить одну кость урона (новый результат обязателен)',
                            )
                          }
                        }
                        if (tceAllowed && hasSlasher && damageTypeIsSlashing(shownType)) {
                          if (!turnEco?.turnEconomy.slasherUsedThisTurn) {
                            turnEco?.patchTurnEconomy(markSlasherUsed)
                            onToast?.(
                              opts?.crit
                                ? 'Рубака: −10 фт скорости · помеха на атаки цели до вашего следующего хода'
                                : 'Рубака: цель −10 фт скорости до вашего следующего хода',
                            )
                          }
                        }
                        if (
                          tceAllowed &&
                          hasOrcishFury &&
                          !isSpellAttackName(attack.name)
                        ) {
                          onToast?.(
                            'Орочья ярость: можно добавить кость урона оружия (1/отдых) или бонусную атаку',
                          )
                        }
                      }
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
                      if (
                        (opts?.tableHit ||
                          (opts?.hitTotal != null && !opts?.tableMiss)) &&
                        blessedStrikes &&
                        turnEco &&
                        canUseBlessedStrikes(turnEco.turnEconomy)
                      ) {
                        turnEco.markBlessedStrikesUsed()
                      }
                      if (
                        (opts?.tableHit ||
                          (opts?.hitTotal != null && !opts?.tableMiss)) &&
                        hasFavoredFoe &&
                        turnEco &&
                        canUseFavoredFoeDamage(turnEco.turnEconomy) &&
                        (activeEffects ?? []).some(
                          (e) => e.slug === 'favored_foe' && !e.inactive,
                        )
                      ) {
                        turnEco.markFavoredFoeDamageUsed()
                      }
                      if (
                        hasFavoredFoe &&
                        (opts?.tableHit ||
                          (opts?.hitTotal != null && !opts?.tableMiss))
                      ) {
                        onToast?.(
                          'Избранный противник: можно пометить цель (концентрация, пул БМ)',
                        )
                      }
                      if (opts?.tableMiss && hasFocusedAim) {
                        setFocusedAimOffer({
                          attackName: attack.name,
                          baseTotal: opts.hitTotal ?? null,
                        })
                      }
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
                      const boundForTable = attack.inventory_item_id
                        ? inventoryItems.find((row) => row.id === attack.inventory_item_id)
                        : undefined
                      finishAttackRef.current = finishAttack
                      setPendingAttack({
                        name: attack.name,
                        attackBonus: effectiveAttackBonus,
                        tableMode: true,
                        adamantine: Boolean(boundForTable?.adamantine),
                        meleeWeapon: Boolean(meleeAttack && !unarmed),
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
                    if (
                      meleeAttack &&
                      !unarmed &&
                      (hasDualWielder
                        ? weaponIsOneHandedMelee(attack.name)
                        : weaponIsLightMelee(attack.name))
                    ) {
                      turnEco?.patchTurnEconomy(markTwoWeaponBonusReady)
                    }
                    if (twfBonusArmed) {
                      setTwfBonusArmed(false)
                      setChargerPlus5Next(false)
                    }
                    const strike = resolveAttackRoll({
                      name: attack.name,
                      attackBonus: effectiveAttackBonus,
                      damageExpr: dmg || baseDamage,
                      damageType: attack.damage_type,
                      bonusDice,
                      elvenAccuracy: useElven,
                      lucky: luckyArmed,
                      savageAttacker: savageAttacker && (meleeAttack || unarmed),
                      flamesOfPhlegethos:
                        flamesOfPhlegethos &&
                        /огн|fire/i.test(String(attack.damage_type || shownType || '')),
                      greatWeaponFighting: gwfApplies,
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
                        ...(blessedStrikes &&
                        (!turnEco || canUseBlessedStrikes(turnEco.turnEconomy))
                          ? [
                              {
                                expression: blessedStrikes.dice,
                                type: blessedStrikes.type,
                                label: blessedStrikes.label,
                              },
                            ]
                          : []),
                        ...(hasFavoredFoe &&
                        (!turnEco || canUseFavoredFoeDamage(turnEco.turnEconomy)) &&
                        (activeEffects ?? []).some(
                          (e) => e.slug === 'favored_foe' && !e.inactive,
                        )
                          ? [
                              {
                                expression: favoredFoeDamageDie(rangerLevel),
                                type: null,
                                label: favoredFoeDamageLabel(rangerLevel),
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
                    const boundItem = attack.inventory_item_id
                      ? inventoryItems.find((row) => row.id === attack.inventory_item_id)
                      : undefined
                    const adamCrit =
                      Boolean(masterRules.dmg_adamantine_weapon) &&
                      adamantineObjectHitIsCrit({
                        adamantine: Boolean(boundItem?.adamantine),
                        targetIsObject,
                      })
                    const strikeCrit = Boolean(strike.crit || adamCrit)
                    if (adamCrit) {
                      onToast?.('Адамантин · цель — предмет → автоматический критический удар')
                    }
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

                    const formula = `1d20${effectiveAttackBonus >= 0 ? '+' : ''}${effectiveAttackBonus}`
                    const breakdown = strike.hitRoll
                      ? `${strike.hitRoll.die}${effectiveAttackBonus >= 0 ? '+' : ''}${effectiveAttackBonus}`
                      : undefined

                    finishAttackRef.current = finishAttack
                    if (turnEco?.combatActive) {
                      setPendingAttack({
                        name: attack.name,
                        attackBonus: effectiveAttackBonus,
                        strikeText: strike.text,
                        hitTotal: strike.hitRoll?.total,
                        formula,
                        breakdown,
                        tableMode: false,
                        crit: strikeCrit,
                        meleeWeapon: Boolean(meleeAttack && !unarmed),
                      })
                      return
                    }

                    finishAttack({
                      strikeText: strike.text,
                      hitTotal: strike.hitRoll?.total,
                      formula,
                      breakdown,
                      crit: strikeCrit,
                    })
                    } // end runAttackWithPb

                    if (profDiceOn) {
                      if (turnEco?.diceOnTable) {
                        setProfDiePending({
                          resolve: (roll) => {
                            setO04Dialog(null)
                            setProfDiePending(null)
                            runAttackWithPb(
                              roll,
                              `Кость мастерства к${proficiencyRollContribution({
                                proficient: true,
                                proficiencyBonus,
                                diceEnabled: true,
                                forcedRoll: roll,
                              }).sides}=${roll} вместо БМ +${proficiencyBonus}`,
                            )
                          },
                        })
                        setO04Dialog('profDie')
                        return
                      }
                      const rolled = proficiencyRollContribution({
                        proficient: true,
                        proficiencyBonus,
                        diceEnabled: true,
                      })
                      runAttackWithPb(
                        rolled.value,
                        `Кость мастерства: ${rolled.label} вместо БМ +${proficiencyBonus}`,
                      )
                      return
                    }
                    runAttackWithPb(proficient ? proficiencyBonus : 0, '')
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
                  <span
                    role="button"
                    tabIndex={0}
                    className="play-desk-compact__mod play-desk-compact__mod--breakdown"
                    title="Разбор бонуса атаки"
                    aria-label={`Бонус атаки ${formatModifier(attackBonus)}, разбор`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setAttackBreakdown({ name: attack.name, parts: attackParts })
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      event.stopPropagation()
                      setAttackBreakdown({ name: attack.name, parts: attackParts })
                    }}
                  >
                    {formatModifier(attackBonus)}
                  </span>
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
                {onOpenItem && attack.inventory_item_id ? (
                  <button
                    type="button"
                    className="play-desk-compact__hold"
                    onClick={() => onOpenItem(attack.inventory_item_id!)}
                    title="Открыть предмет в инвентаре"
                  >
                    предмет
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
        const adamCrit =
          Boolean(masterRules.dmg_adamantine_weapon) &&
          adamantineObjectHitIsCrit({
            adamantine: Boolean(pendingAttack?.adamantine),
            targetIsObject,
          })
        if (adamCrit) {
          onToast?.('Адамантин · цель — предмет → автоматический критический удар')
        }
        const isCrit = Boolean(adamCrit || pendingAttack?.crit)
        finishAttackRef.current?.({
          target,
          tableHit: true,
          physicalDice: true,
          damageTotal,
          crit: isCrit,
        })
        const dmg = Math.max(0, Math.floor(damageTotal ?? 0))
        const hpBefore = target.hp_current
        let opened: 'cleave' | 'massive' | 'injury' | null = null
        if (
          masterRules.dmg_cleave &&
          pendingAttack?.meleeWeapon &&
          hpBefore != null &&
          Number.isFinite(hpBefore)
        ) {
          const cleave = cleaveOverflow({
            enabled: true,
            meleeWeapon: true,
            hpBefore,
            damage: dmg,
          })
          if (cleave.qualifies) {
            setCleaveCtx({
              overflow: cleave.overflow,
              attackTotal: pendingAttack.hitTotal ?? pendingAttack.attackBonus,
              excludeTargetId: target.id,
            })
            setO04Dialog('cleave')
            opened = 'cleave'
          }
        }
        const massive = triggersMassiveDamage({
          enabled: Boolean(masterRules.dmg_massive_damage),
          damage: dmg,
          hpMax: target.hp_max ?? null,
        })
        if (massive) {
          setMassiveCtx({
            label: target.name,
            damage: dmg,
            hpMax: target.hp_max ?? null,
            self: false,
          })
          if (!opened) {
            setO04Dialog('massive')
            opened = 'massive'
          } else {
            onToast?.(
              `Массивный урон · ${target.name}: после разрубания откройте спас Тел Сл 15 (кнопка/повтор)`,
            )
          }
        }
        if (masterRules.dmg_lingering_injuries && isCrit) {
          setInjuryReason('критический удар')
          if (!opened) {
            setO04Dialog('injury')
            opened = 'injury'
          } else {
            onToast?.('Незаживающая рана (крит): после текущего диалога — «Бросок раны»')
          }
        } else if (
          masterRules.dmg_lingering_injuries &&
          hpBefore != null &&
          dmg >= hpBefore
        ) {
          setInjuryReason('падение до 0 хитов')
          if (!opened) setO04Dialog('injury')
          else onToast?.('Незаживающая рана (0 хитов): после текущего диалога — «Бросок раны»')
        }
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
    <AttackBonusBreakdownDialog
      open={Boolean(attackBreakdown)}
      attackName={attackBreakdown?.name ?? ''}
      parts={attackBreakdown?.parts ?? []}
      formulaVars={formulaVars}
      onClose={() => setAttackBreakdown(null)}
    />
    </>
  )
}
