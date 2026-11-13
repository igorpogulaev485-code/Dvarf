import { useEffect, useMemo, useState } from 'react'
import { useTurnEconomy } from './TurnEconomyContext'
import { inferFeatureTiming } from '../../shared/dnd/turnEconomy'
import {
  isSunSoulVariableKi,
  Pack09FeatureExtras,
  SunSoulKiControls,
} from './Pack09FeatureExtras'
import { isPack03CustomSpend, Pack03FeatureExtras } from './Pack03FeatureExtras'
import { isHarnessDivinePowerFeature } from '../../shared/dnd/harnessDivinePower'
import { Pack04FeatureExtras } from './Pack04FeatureExtras'
import { Pack05FeatureExtras, pack05CustomSpendFeature } from './Pack05FeatureExtras'
import { Pack07FeatureExtras, pack07CustomSpendFeature } from './Pack07FeatureExtras'
import type { RulesEdition } from '../../shared/api/characters'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  kindLabelRu,
  optionalFeatureBadgeRu,
  resolveChoiceMaxPicks,
  resolveClassFeatureSlug,
  choiceOptionsAtLevel,
  slotSpendDiceCount,
  slotSpendHasDice,
  unlockFeaturesForClasses,
  type AbilityScoreKey,
  type UnlockedFeature,
} from '../../shared/dnd/classFeatures'
import {
  DIVINE_SMITE_FEATURE_ID,
  type DivineSmiteIntent,
} from './divineSmite'
import {
  findReplaceTargets,
  findReplacerForFeature,
  isReplacementTaken,
  replacementStatusForFeature,
  replacementStatusLabelRu,
  setReplacementTaken,
  type FeatureReplacementStatus,
} from '../../shared/dnd/featureReplacement'
import {
  infusionById,
  infusionOptionIdsAtLevel,
  normalizeKnownInfusionId,
  REPLICATE_MAGIC_ITEM_ID,
  replicateItemBySlug,
  replicateItemsAtLevel,
} from '../../shared/dnd/artificerInfusions'
import {
  isReplicateLearnOption,
  learnReplicateMagicItem,
  unlearnInfusionPick,
} from '../../shared/dnd/infusionsActive'
import { maneuverById } from '../../shared/dnd/battleMasterManeuvers'
import { elementalDisciplineById } from '../../shared/dnd/monkElementalDisciplines'
import { kenseiPairError } from '../../shared/dnd/kenseiWeapons'
import { featureChoiceOptionLabel } from '../../shared/dnd/featureChoiceOptionLabel'
import { createArcaneWard, wizardResolvedFeatureId } from '../../shared/dnd/wizardTradition'
import { WizardCapstonePicks } from './WizardCapstonePicks'
import type { WizardFeatureRequest } from './WizardFeatureUseDialog'
import {
  FLEXIBLE_CASTING_SLOT_COST,
  metamagicById,
  metamagicSpendCost,
} from '../../shared/dnd/sorcererMetamagic'
import {
  invocationById,
  WARLOCK_PACT_BOONS,
} from '../../shared/dnd/warlockInvocations'
import {
  invocationIsSelectable,
  invocationPrerequisiteError,
  pack04CustomSpendFeature,
} from '../../shared/dnd/pack04SorcererWarlock'
import {
  addFlexibleSpellSlot,
  canSpendSlot,
  spendSpellSlot,
  slotsRemaining,
} from '../../shared/dnd/spells'
import {
  clearSuccessLock,
  consumeStock,
  findFeatureResource,
  grantOneOnInitiativeIfEmpty,
  recoverOneFromPool,
  regainPoolUses,
  spendFeatureUse,
  spendFeatureUseWithOutcome,
  spendPoolUses,
  spendRemaining,
  stockCurrent,
} from '../../shared/dnd/featureResources'
import {
  applyFeatureSummon,
  type CompanionEntry,
} from './companions'
import {
  collectExpertiseOptionIdsFromPicks,
  isExpertiseChoice,
  listExpertiseOptions,
  type SkillExpertiseState,
} from '../../shared/dnd/expertise'
import {
  fightingStylesTakenElsewhere,
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  toggleFeaturePickInList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import {
  findAppliedClassAsi,
  formatAppliedClassAsiLabel,
  isAsiFeature,
  type AppliedClassAsi,
} from '../../shared/dnd/classAsi'
import {
  isFeatureChoiceComplete,
  listUnlockedExpertiseKeys,
} from '../../shared/dnd/pendingFeatureChoices'
import { fightingStyleById } from '../../shared/dnd/fightingStyles'
import type { AppliedFeatGrant } from '../../shared/dnd/featGrants'
import type { BackgroundFeatureCard } from '../../shared/dnd/backgroundGrants'
import type { RaceTraitCard } from '../../shared/dnd/raceTraitCards'
import { raceTraitCardsFromText } from '../../shared/dnd/raceTraitCards'
import type { ConcentrationState } from '../../shared/dnd/concentration'
import type { SheetResource } from '../../shared/dnd/rest'
import type { InventoryItem } from './inventory'
import { Button, Field, Input, Panel, Stack, Text } from '../../ui'
import { SlotPips } from '../../ui/SlotPips'
import {
  newCustomFeatureId,
  type CustomFeature,
} from './customFeatures'
import { isFeatureSelfFormId } from './featureForms'
import type { SpellsState } from './spells'
import { abilityModifier, SKILL_DEFS } from './sheetTypes'
import { isWildShapeForkFeature, moonHealDiceCount, moonShapeScale } from './wildShape'
import { PactTomeCantripsPicker } from './PactTomeCantripsPicker'
import {
  isPactTomeActive,
  isPactTomeCantripsComplete,
  PACT_BOON_FEATURE_ID,
} from './pactTomeEffects'
import { isPactChainActive } from './pactChainEffects'
import { WARLOCK_PACT_BOON_GRANTS } from '../../shared/dnd/warlockInvocations'

export type WildShapeForkRequest = {
  feature: UnlockedFeature
  classSlug: string
  classEntryId: string
}

export type FeatureSelfFormRequest = {
  feature: UnlockedFeature
  classSlug: string
  classEntryId: string
}

type ClassFeaturesPanelProps = {
  classes: ClassLevelEntry[]
  characterLevel: number
  abilities?: Partial<Record<AbilityScoreKey, number>>
  subclassSlugByEntryId?: Record<string, string | null | undefined>
  subclassTransitionByEntryId?: Record<
    string,
    | {
        mode: 'future_only'
        changedAtClassLevel: number
        previousSlug: string
        previousNameRu?: string
      }
    | null
    | undefined
  >
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  spells: SpellsState
  onSpellsChange: (spells: SpellsState) => void
  /** For Expertise pickers — proficient skills + tools on the sheet. */
  skills?: SkillExpertiseState
  tools?: string[]
  /** Class ASI ledger — drives labels for Ability Score Improvement rows. */
  classAsi?: AppliedClassAsi[]
  /** Equipped heavy body armor — blocks Rage benefits (PHB). */
  wearingHeavyArmor?: boolean
  companions?: CompanionEntry[]
  onCompanionsChange?: (companions: CompanionEntry[]) => void
  /**
   * Дикий облик + linked_spend альтернативы (Дикий спутник, Звёздная форма, …):
   * открыть развилку вместо голого spend.
   */
  onWildShapeFork?: (request: WildShapeForkRequest) => void
  /** Natural Recovery: open the slot picker instead of spending the charge. */
  onOpenRecovery?: (resourceId: string) => void
  hpCurrent?: number | null
  hpMax?: number | null
  onHpChange?: (hp: number) => void
  /** Wizard Shapechanger etc. — open self_form picker, then spend pool. */
  onFeatureSelfForm?: (request: FeatureSelfFormRequest) => void
  /** Tradition features that ask for a target, mode, or active state. */
  onWizardFeatureUse?: (request: WizardFeatureRequest) => void
  /**
   * Moon Combat Wild Shape: spend slot + heal active self_form (caller updates spells).
   * Return toast message on success, null if no form.
   */
  onMoonFormSlotHeal?: (input: {
    slotLevel: number
    diceCount: number
    diceSize: number
  }) => string | null
  /** Shared with the combat scene: prepare a smite circle without spending it. */
  divineSmiteIntent?: DivineSmiteIntent
  onDivineSmiteIntent?: (next: DivineSmiteIntent) => void
  onToast?: (message: string) => void
  /** Summary surface: feats + race on the same glance list. */
  featGrants?: AppliedFeatGrant[]
  darkvision?: number
  /** Race + active items: «Сопротивления: огонь». */
  defenseSummary?: string
  raceName?: string
  /** Structured race traits (catalog trait_cards) or fallback from traitsText. */
  raceTraitCards?: RaceTraitCard[]
  raceTraitsText?: string
  /** Background name + PHB feature card (e.g. Криминальные связи). */
  backgroundName?: string
  backgroundFeature?: BackgroundFeatureCard | null
  customFeatures?: CustomFeature[]
  onCustomFeaturesChange?: (features: CustomFeature[]) => void
  /** Desk helpers for known-pick unique abilities. */
  onOpenInfusions?: (classEntryId: string) => void
  onOpenInvocations?: (classEntryId: string) => void
  onOpenRangerFavored?: (classEntryId: string) => void
  onOpenSoulTrinkets?: (classEntryId: string) => void
  /** Pact of the Chain: open cast for Find Familiar (card appears after cast). */
  onCastPactChainFamiliar?: (classEntryId: string) => void
  /** Inventory rows for Blessing of the Forge. */
  inventoryItems?: InventoryItem[]
  onInventoryChange?: (items: InventoryItem[]) => void
  concentration?: ConcentrationState | null
  onConcentrationChange?: (next: ConcentrationState | null) => void
  /** Spell catalog edition for Pact of the Tome cantrip picks. */
  edition?: RulesEdition
  /**
   * B-04: after a successful resource spend, apply structured ActiveEffect
   * (rage, fighting spirit, second wind heal hook, …).
   */
  onFeatureBuffApply?: (input: {
    featureId: string
    featureNameRu: string
    classEntryId: string
    classLevel: number
  }) => void
  /** B20: external request to switch filter (e.g. «Нужно настроить»). */
  requestedFilter?: string | null
  onRequestedFilterConsumed?: () => void
}

type FeatureFilter =
  | 'all'
  | 'class'
  | 'subclass'
  | 'feats'
  | 'custom'
  | 'resource'
  | 'choice'
  | 'active'
  | 'passive'
  | 'needs_setup'

const FEATURE_FILTERS: Array<{ id: FeatureFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Активные' },
  { id: 'passive', label: 'Пассивные' },
  { id: 'needs_setup', label: 'Нужно настроить' },
  { id: 'class', label: 'Класс' },
  { id: 'subclass', label: 'Подкласс' },
  { id: 'feats', label: 'Черты' },
  { id: 'custom', label: 'Свои' },
  { id: 'resource', label: 'С ресурсом' },
  { id: 'choice', label: 'Выбор' },
]

function previewSummary(value: string, max = 110): string {
  const flat = value.replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 1)}…`
}

/** Split catalog summaries that use blank lines as paragraph breaks. */
function summaryParagraphs(value: string): string[] {
  const parts = value
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : value.trim() ? [value.trim()] : []
}

function featureRowKey(feature: UnlockedFeature): string {
  return `${feature.classEntryId}:${feature.source}:${feature.id}`
}

/** Expand when there is full text or interactive controls. */
function featureCanExpand(feature: UnlockedFeature): boolean {
  if (feature.summary_ru.trim() || feature.body_ru?.trim()) return true
  if (feature.resource?.pool_id) return true
  if (feature.choice) return true
  if (feature.slot_spend) return true
  if (feature.id === 'metamagic' || feature.id === 'flexible_casting') return true
  if (feature.summon) return true
  if (feature.replaces) return true
  return false
}

function featSourceLabel(source: AppliedFeatGrant['source']): string {
  if (source.kind === 'asi') return 'Увеличение характеристик'
  if (source.kind === 'race') return 'раса'
  if (source.kind === 'background') return 'предыстория'
  return 'вручную'
}

function FeatureResourceControls({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  companions,
  onCompanionsChange,
  onToast,
  initiativeGrantByPool,
  wearingHeavyArmor,
  onOpenInfusions,
  onOpenSoulTrinkets,
  onWildShapeFork,
  onOpenRecovery,
  onFeatureSelfForm,
  onWizardFeatureUse,
  onFeatureBuffApply,
  moonCombatWildShape = false,
  scaleText = null,
}: {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  companions?: CompanionEntry[]
  onCompanionsChange?: (companions: CompanionEntry[]) => void
  onToast?: (message: string) => void
  initiativeGrantByPool: Map<string, number>
  wearingHeavyArmor: boolean
  onOpenInfusions?: (classEntryId: string) => void
  onOpenSoulTrinkets?: (classEntryId: string) => void
  onWildShapeFork?: (request: WildShapeForkRequest) => void
  onOpenRecovery?: (resourceId: string) => void
  onFeatureSelfForm?: (request: FeatureSelfFormRequest) => void
  onWizardFeatureUse?: (request: WizardFeatureRequest) => void
  onFeatureBuffApply?: ClassFeaturesPanelProps['onFeatureBuffApply']
  /** Circle of the Moon: Wild Shape is a bonus action. */
  moonCombatWildShape?: boolean
  scaleText?: string | null
}) {
  const perUseCap =
    feature.resource?.per_use_cap === 'half_class_level'
      ? Math.max(1, Math.floor(feature.classLevel / 2))
      : null
  const [diceToSpend, setDiceToSpend] = useState(1)
  const turnEco = useTurnEconomy()
  const isActionSurge = feature.id === 'action_surge'
  const featureTiming = inferFeatureTiming(
    feature.summary_ru,
    moonCombatWildShape && feature.id === 'wild_shape' ? 'bonus' : null,
  )
  const gateFeatureSpend = (): boolean => {
    // Э7: Всплеск сам отметку хода не тратит — только даёт доп. действие.
    if (isActionSurge) return true
    if (!turnEco) return true
    const gate = turnEco.canFeature(featureTiming)
    if (!gate.ok) {
      onToast?.(gate.reason)
      return false
    }
    return true
  }
  const markFeatureSpend = () => {
    if (isActionSurge) {
      turnEco?.grantActionSurge()
      return
    }
    turnEco?.spendFeature(featureTiming)
  }
  const resource = feature.resource
  if (!resource?.pool_id) return null
  const poolId = resource.pool_id

  const pool = findFeatureResource(
    resources,
    classSlug,
    poolId,
    feature.classEntryId,
  )
  if (!pool) {
    return (
      <Text tone="muted">Ресурс синхронизируется при сохранении уровня/архетипа…</Text>
    )
  }

  if (pool.unlimited && !isWildShapeForkFeature(feature.id)) {
    return (
      <div className="feature-resource">
        <Text>
          {pool.name}: <strong>без лимита</strong>
        </Text>
        <div className="feature-resource__actions">
          <Button
            type="button"
            disabled={
              (Boolean(resource.blocked_while_heavy_armor) && wearingHeavyArmor) ||
              Boolean(turnEco && !turnEco.canFeature(featureTiming).ok)
            }
            title={(() => {
              const gate = turnEco?.canFeature(featureTiming)
              return gate && !gate.ok ? gate.reason : undefined
            })()}
            onClick={() => {
              if (!gateFeatureSpend()) return
              const result = spendFeatureUse({ resources, feature, classSlug })
              onResourcesChange(result.resources)
              if (result.ok) markFeatureSpend()
              onToast?.(result.ok ? `${feature.name_ru}: без лимита` : result.message)
            }}
          >
            Использовать
          </Button>
        </div>
      </div>
    )
  }

  if (resource.track === 'stock') {
    const current = stockCurrent(pool)
    if (resource.pool_id === 'infusion_slots' && onOpenInfusions) {
      return (
        <div className="feature-resource">
          <Text>
            {pool.name}: <strong>{current}</strong> / {pool.max} на предметах
          </Text>
          <div className="feature-resource__actions">
            <Button
              type="button"
              onClick={() => onOpenInfusions(feature.classEntryId)}
            >
              Управление инфузиями
            </Button>
          </div>
        </div>
      )
    }
    const openResolved = () =>
      onWizardFeatureUse?.({
        featureId: feature.id,
        resourceId: pool.id,
        classSlug,
        classEntryId: feature.classEntryId,
        name: feature.name_ru,
      })
    return (
      <div className="feature-resource">
        <Text>
          {pool.name}: <strong>{current}</strong> / {pool.max}
          {pool.wardCreated ? '' : resource.pool_id === 'arcane_ward' ? ' · не создан' : ''}
        </Text>
        {pool.dice?.length ? (
          <Text>
            Записано: <strong>{pool.dice.join(', ')}</strong>
          </Text>
        ) : null}
        {pool.activeLabel ? <Text>Сейчас: {pool.activeLabel}</Text> : null}
        <div className="feature-resource__actions">
          {resource.pool_id === 'arcane_ward' ? (
            <Button
              type="button"
              disabled={pool.wardCreated}
              onClick={() => {
                const created = createArcaneWard(resources)
                onResourcesChange(created.resources)
                onToast?.(created.message)
              }}
            >
              Создать щит
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={current >= pool.max}
            onClick={() => {
              if (resource.pool_id === 'portent') {
                const rolled = 1 + Math.floor(Math.random() * 20)
                const dice = [...(pool.dice ?? []), rolled]
                onResourcesChange(
                  resources.map((row) =>
                    row.id === pool.id
                      ? { ...row, used: dice.length, dice, track: 'stock' }
                      : row,
                  ),
                )
                onToast?.(`Знамение: записано ${rolled}`)
                return
              }
              const result = spendFeatureUse({ resources, feature, classSlug })
              onResourcesChange(result.resources)
              if (result.message) onToast?.(result.message)
            }}
          >
            {resource.pool_id === 'portent'
              ? 'Записать кость'
              : resource.stock_gain_label_ru || `+ ${pool.name}`}
          </Button>
          <Button
            type="button"
            disabled={current <= 0}
            onClick={() => {
              if (
                resource.pool_id === 'soul_trinkets' &&
                onOpenSoulTrinkets
              ) {
                onOpenSoulTrinkets(feature.classEntryId)
                return
              }
              if (
                onWizardFeatureUse &&
                (resource.pool_id === 'portent' ||
                  resource.pool_id === 'power_surge')
              ) {
                openResolved()
                return
              }
              const result = consumeStock({
                resources,
                classSlug,
                poolId: resource.pool_id!,
                classEntryId: feature.classEntryId,
              })
              onResourcesChange(result.resources)
              onToast?.(
                result.ok
                  ? resource.stock_spend_label_ru || `${pool.name}: −1`
                  : result.message,
              )
            }}
          >
            {resource.pool_id === 'soul_trinkets' && onOpenSoulTrinkets
              ? 'Сжечь…'
              : resource.pool_id === 'portent'
                ? 'Заменить бросок…'
                : resource.stock_spend_label_ru || `− ${pool.name}`}
          </Button>
        </div>
      </div>
    )
  }

  const spendCost = Math.max(1, Math.floor(resource.spend_cost ?? 1))
  const remaining = spendRemaining(pool)
  const linked = resource.linked_spend
  const linkedCost = Math.max(1, Math.floor(linked?.amount ?? 1))
  const linkedPool = linked?.pool_id
    ? findFeatureResource(
        resources,
        classSlug,
        linked.pool_id,
        feature.classEntryId,
      )
    : null
  const linkedLeft =
    linked?.mode === 'spend'
      ? spendRemaining(linkedPool)
      : stockCurrent(linkedPool)
  const canViaLinked = remaining < spendCost && linkedLeft >= linkedCost
  const canRecover =
    Boolean(resource.recover_one) && pool.used > 0
  const initiativeAmount =
    resource.grant_amount_on_initiative_if_empty ??
    initiativeGrantByPool.get(poolId) ??
    1
  const hasInitiativeGrant =
    Boolean(resource.grant_one_on_initiative_if_empty) ||
    initiativeGrantByPool.has(poolId)
  const canInitiativeGrant =
    hasInitiativeGrant && remaining <= 0 && pool.used > 0
  const successLock = resource.success_lock
  const lockedBySuccess = Boolean(successLock) && pool.reset === 'manual' && pool.used > 0
  const blockedByHeavyArmor =
    Boolean(resource.blocked_while_heavy_armor) && wearingHeavyArmor
  const opensWildShapeFork =
    Boolean(onWildShapeFork) && isWildShapeForkFeature(feature.id)
  // Fork spends wild_shape (own pool or linked); enable when that currency remains.
  const wildShapePoolForFork =
    poolId === 'wild_shape'
      ? pool
      : linked?.pool_id === 'wild_shape'
        ? linkedPool
        : null
  const wildShapeLeftForFork = spendRemaining(wildShapePoolForFork)
  const wildShapeUnlimited = Boolean(wildShapePoolForFork?.unlimited)
  const canOpenWildShapeFork =
    opensWildShapeFork && (wildShapeUnlimited || wildShapeLeftForFork > 0)
  const opensFeatureSelfForm =
    Boolean(onFeatureSelfForm) && isFeatureSelfFormId(feature.id)
  const canOpenFeatureSelfForm =
    opensFeatureSelfForm && remaining > 0

  const mirrorLinked = pool.max === 0 && linkedPool != null
  const shownPool = mirrorLinked && linkedPool ? linkedPool : pool
  const shownLeft = mirrorLinked ? linkedLeft : spendRemaining(pool)
  return (
    <div className="feature-resource">
      {shownPool.unlimited ? (
        <Text>
          {shownPool.name}: <strong>без лимита</strong>
        </Text>
      ) : (
        <SlotPips
          max={shownPool.max}
          used={shownPool.used}
          label={
            mirrorLinked && linkedPool
              ? `${linkedPool.name}: ${shownLeft}/${linkedPool.max}`
              : `${pool.name}: ${spendRemaining(pool)}/${pool.max}`
          }
          onChange={(used) =>
            onResourcesChange(
              resources.map((row) =>
                row.id === shownPool.id ? { ...row, used } : row,
              ),
            )
          }
        />
      )}
      {(scaleText ?? feature.scaleValue) ? (
        <Text tone="muted">
          Сейчас: <strong>{scaleText ?? feature.scaleValue}</strong>
        </Text>
      ) : null}
      {pool.activeLabel ? (
        <Text>
          Эффект: <strong>{pool.activeLabel}</strong>
        </Text>
      ) : null}
      {blockedByHeavyArmor ? (
        <Text tone="muted">
          Надет тяжёлый доспех — бонусы ярости не действуют (PHB). Сними доспех или выбери
          лёгкий/средний.
        </Text>
      ) : null}
      {mirrorLinked && linked ? (
        <Text tone="muted">
          Общий ресурс «{linkedPool?.name ?? linked.label_ru}»
          {linkedPool ? ` (${linkedLeft}/${linkedPool.max})` : ''}. Отдельного счётчика нет.
        </Text>
      ) : linked && !opensWildShapeFork ? (
        <Text tone="muted">
          Сверх лимита: {linked.label_ru}
          {linkedPool ? ` (${linkedLeft} доступно)` : ''}
        </Text>
      ) : null}
      {opensWildShapeFork ? (
        <Text tone="muted">
          Тратит Дикий облик
          {wildShapeUnlimited
            ? ' (без лимита)'
            : wildShapePoolForFork
              ? ` (${wildShapeLeftForFork}/${wildShapePoolForFork.max})`
              : ''}
          {' · '}
          развилка: облик / спутник / умения круга
        </Text>
      ) : null}
      {lockedBySuccess ? (
        <Text tone="muted">Заблокировано после успеха — снимите блок через 7 дней.</Text>
      ) : null}
      {perUseCap != null ? (
        <label className="feature-resource__select">
          <span className="sr-only">Сколько костей потратить</span>
          <select
            value={String(
              Math.min(perUseCap, Math.max(1, diceToSpend), Math.max(1, remaining)),
            )}
            onChange={(event) => setDiceToSpend(Number(event.target.value) || 1)}
          >
            {Array.from(
              { length: Math.min(perUseCap, Math.max(1, remaining)) },
              (_, index) => index + 1,
            ).map((count) => (
              <option key={count} value={count}>
                {count}к6 · разово не больше {perUseCap}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="feature-resource__actions">
        {successLock ? (
          <>
            <Button
              type="button"
              disabled={remaining <= 0 || lockedBySuccess}
              onClick={() => {
                const auto = feature.classLevel >= 20
                const roll = auto ? null : 1 + Math.floor(Math.random() * 100)
                const success = auto || (roll != null && roll <= feature.classLevel)
                const result = spendFeatureUseWithOutcome({
                  resources,
                  feature,
                  classSlug,
                  outcome: success ? 'success' : 'failure',
                })
                onResourcesChange(result.resources)
                onToast?.(
                  auto
                    ? 'Божественное вмешательство: 20 уровень, успех без броска. Блок 7 дней.'
                    : success
                      ? `d100: ${roll} ≤ ${feature.classLevel} — успех. Блок 7 дней.`
                      : `d100: ${roll} > ${feature.classLevel} — провал. Снова после продолжительного отдыха.`,
                )
              }}
            >
              {feature.classLevel >= 20 ? 'Вмешательство (авто)' : 'Бросок d100'}
            </Button>
            {lockedBySuccess ? (
              <Button
                type="button"
                onClick={() => {
                  const result = clearSuccessLock({ resources, feature, classSlug })
                  onResourcesChange(result.resources)
                  onToast?.(result.message)
                }}
              >
                Снять блок (7 дней)
              </Button>
            ) : null}
          </>
        ) : opensWildShapeFork ? (
          <Button
            type="button"
            disabled={!canOpenWildShapeFork}
            onClick={() => {
              if (!canOpenWildShapeFork) {
                onToast?.('Нет использований Дикого облика')
                return
              }
              onWildShapeFork?.({
                feature,
                classSlug,
                classEntryId: feature.classEntryId,
              })
            }}
          >
            {feature.id === 'wild_shape'
              ? moonCombatWildShape
                ? 'Потратить (бонусным)…'
                : 'Потратить…'
              : 'Через Дикий облик…'}
          </Button>
        ) : isPack03CustomSpend(feature.id) ||
          pack04CustomSpendFeature(feature.id) ||
          pack05CustomSpendFeature(feature.id) ||
          pack07CustomSpendFeature(feature.id) ? null : onWizardFeatureUse && wizardResolvedFeatureId(feature.id) ? (
          <Button
            type="button"
            disabled={
              feature.id === 'bladesong'
                ? !pool.activeLabel && remaining <= 0
                : remaining <= 0
            }
            onClick={() =>
              onWizardFeatureUse({
                featureId: feature.id,
                resourceId: pool.id,
                classSlug,
                classEntryId: feature.classEntryId,
                name: feature.name_ru,
              })
            }
          >
            {feature.id === 'bladesong' && pool.activeLabel
              ? 'Завершить песнь'
              : 'Использовать…'}
          </Button>
        ) : opensFeatureSelfForm ? (
          <Button
            type="button"
            disabled={!canOpenFeatureSelfForm}
            onClick={() => {
              if (!canOpenFeatureSelfForm) {
                onToast?.('Нет использований')
                return
              }
              onFeatureSelfForm?.({
                feature,
                classSlug,
                classEntryId: feature.classEntryId,
              })
            }}
          >
            Принять облик…
          </Button>
        ) : (
          <Button
            type="button"
            disabled={
              blockedByHeavyArmor ||
              (remaining < spendCost && !canViaLinked)
            }
            onClick={() => {
              if (blockedByHeavyArmor) {
                onToast?.(
                  'Ярость: сними тяжёлый доспех — иначе бонусы ярости не действуют',
                )
                return
              }
              const spendAmount =
                perUseCap != null
                  ? Math.min(perUseCap, Math.max(1, diceToSpend), Math.max(1, remaining))
                  : undefined
              if (feature.id === 'natural_recovery') {
                if (onOpenRecovery) onOpenRecovery(pool.id)
                else onToast?.('Выбор ячеек недоступен')
                return
              }
              if (!gateFeatureSpend()) return
              const result = spendFeatureUse({
                resources,
                feature,
                classSlug,
                ...(spendAmount != null ? { amount: spendAmount } : {}),
              })
              onResourcesChange(result.resources)
              if (result.ok) {
                markFeatureSpend()
                const summon = feature.summon
                if (summon && onCompanionsChange) {
                  const next = applyFeatureSummon({
                    companions: companions ?? [],
                    classEntryId: feature.classEntryId,
                    subclassSlug: feature.subclassSlug ?? 'feature',
                    featureId: feature.id,
                    classLevel: feature.classLevel,
                    summon: {
                      kind: summon.kind,
                      nameRu: summon.name_ru,
                      replaceExisting: summon.replace_existing !== false,
                      notesRu: summon.notes_ru,
                      actionsRu: summon.actions_ru,
                      ac: summon.ac,
                      speed: summon.speed,
                      hpBase: summon.hp_base,
                      hpPerLevel: summon.hp_per_level,
                    },
                  })
                  onCompanionsChange(next)
                }
                const via =
                  result.via === 'linked_stock' ? ` (${linked?.label_ru})` : ''
                const summoned =
                  summon && onCompanionsChange
                    ? ` · ${summon.kind === 'ally' ? 'напарник' : 'спутник'}: ${summon.name_ru}`
                    : ''
                onToast?.(
                  isActionSurge
                    ? `${feature.name_ru}: +1 дополнительное действие`
                    : perUseCap != null && spendAmount != null
                      ? `Потрачено ${spendAmount}к6: лечение на сумму костей и ${spendAmount} временных хитов, существо в 120 фт.`
                      : `${feature.name_ru}${via}${
                          (scaleText ?? feature.scaleValue)
                            ? ` · ${scaleText ?? feature.scaleValue}`
                            : ''
                        }${summoned}`,
                )
                onFeatureBuffApply?.({
                  featureId: feature.id,
                  featureNameRu: feature.name_ru,
                  classEntryId: feature.classEntryId,
                  classLevel: feature.classLevel,
                })
              } else {
                onToast?.(result.message)
              }
            }}
          >
            {feature.id === 'natural_recovery'
              ? 'Выбрать ячейки'
              : canViaLinked
              ? linked?.label_ru || 'Сверх лимита'
              : feature.summon
                ? feature.summon.kind === 'ally'
                  ? 'Призвать напарника'
                  : 'Призвать спутника'
                : spendCost > 1
                  ? `Использовать (−${spendCost})`
                  : resource.alt_pools?.length
                    ? resource.pool_name_ru || pool.name
                    : 'Использовать'}
          </Button>
        )}
        {resource.alt_pools?.map((alt) => {
          const altPool = findFeatureResource(
            resources,
            classSlug,
            alt.pool_id,
            feature.classEntryId,
          )
          if (!altPool) return null
          const altLeft = spendRemaining(altPool)
          return (
            <div key={alt.pool_id} className="feature-resource">
              <SlotPips
                max={altPool.max}
                used={altPool.used}
                label={`${altPool.name}: потрачено ${altPool.used}/${altPool.max}`}
                onChange={(used) =>
                  onResourcesChange(
                    resources.map((row) =>
                      row.id === altPool.id ? { ...row, used } : row,
                    ),
                  )
                }
              />
              <Button
                type="button"
                disabled={altLeft <= 0}
                onClick={() => {
                  const result = spendFeatureUse({
                    resources,
                    classSlug,
                    feature: {
                      ...feature,
                      resource: {
                        ...resource,
                        pool_id: alt.pool_id,
                        pool_name_ru: alt.pool_name_ru,
                        alt_pools: undefined,
                      },
                    },
                  })
                  onResourcesChange(result.resources)
                  onToast?.(
                    result.ok ? `${alt.pool_name_ru}: −1` : result.message,
                  )
                }}
              >
                {alt.pool_name_ru}
              </Button>
            </div>
          )
        })}
        {resource.recover_one ? (
          <Button
            type="button"
            disabled={!canRecover}
            onClick={() => {
              const result = recoverOneFromPool({ resources, feature, classSlug })
              onResourcesChange(result.resources)
              onToast?.(result.message)
            }}
          >
            {resource.recover_one.label_ru}
          </Button>
        ) : null}
        {hasInitiativeGrant ? (
          <Button
            type="button"
            disabled={!canInitiativeGrant}
            onClick={() => {
              const result = grantOneOnInitiativeIfEmpty({
                resources,
                feature: {
                  ...feature,
                  resource: {
                    ...resource,
                    grant_one_on_initiative_if_empty: true,
                    grant_amount_on_initiative_if_empty: initiativeAmount,
                  },
                },
                classSlug,
              })
              onResourcesChange(result.resources)
              onToast?.(result.message)
            }}
          >
            Инициатива: +{initiativeAmount}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function choiceOptionLabel(optionId: string): string {
  return featureChoiceOptionLabel(optionId, null, (id) =>
    SKILL_DEFS.find((row) => row.key === id)?.label,
  )
}

function FeatureChoiceControls({
  feature,
  featurePicks,
  onFeaturePicksChange,
  skills,
  tools,
  expertiseKeys,
  onToast,
}: {
  feature: UnlockedFeature
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  skills: SkillExpertiseState
  tools: string[]
  expertiseKeys: Array<{ classEntryId: string; featureId: string }>
  onToast?: (message: string) => void
}) {
  const choice = feature.choice
  const [pendingReplicate, setPendingReplicate] = useState(false)
  const [pendingReplicateSlug, setPendingReplicateSlug] = useState('')
  if (!choice) return null
  const choiceLabel = choice.label_ru
  const takenStyles = fightingStylesTakenElsewhere(featurePicks, {
    classEntryId: feature.classEntryId,
    featureId: feature.id,
  })
  const options = (
    isExpertiseChoice(choice)
      ? listExpertiseOptions({
          skills,
          tools,
          excludeOptionIds: collectExpertiseOptionIdsFromPicks({
            featurePicks,
            expertiseKeys,
            except: { classEntryId: feature.classEntryId, featureId: feature.id },
          }),
        }).map((row) => row.id)
      : choice.options_from === 'artificer_infusions'
        ? infusionOptionIdsAtLevel(feature.classLevel)
        : choiceOptionsAtLevel(choice, feature.classLevel)
  ).filter((id) => !takenStyles.has(id))
  const pactBoonId = getFeaturePick(featurePicks, feature.classEntryId, 'pact_boon')
  const visibleOptions =
    choice.options_from === 'monk_elemental_disciplines'
      ? options.filter((id) => {
          const disc = elementalDisciplineById(id)
          if (!disc || disc.id === 'elemental_attunement') return false
          return disc.minLevel == null || disc.minLevel <= feature.classLevel
        })
      : choice.options_from === 'warlock_invocations'
        ? options
        : options
  const maxPicks = resolveChoiceMaxPicks(choice, feature.classLevel)
  const multi = maxPicks > 1 || Boolean(choice.max_picks_by_level) || Boolean(choice.max_picks && choice.max_picks > 1)
  const selectedListRaw = multi
    ? getFeaturePickList(featurePicks, feature.classEntryId, feature.id)
    : []
  const selectedList =
    choice.options_from === 'artificer_infusions'
      ? selectedListRaw
          .map((id) => normalizeKnownInfusionId(id) ?? id)
          .filter(Boolean)
      : selectedListRaw
  const selected = multi
    ? null
    : getFeaturePick(featurePicks, feature.classEntryId, feature.id)
  const selectedDef = fightingStyleById(selected)
  const selectedMeta = selectedList.map((id) => metamagicById(id)).filter(Boolean)
  const selectedLabel = multi
    ? selectedList.map(choiceOptionLabel).join(', ')
    : selected
      ? choiceOptionLabel(selected)
      : null
  const useSelect = !multi && visibleOptions.length > 6
  const replicateChoices = replicateItemsAtLevel(feature.classLevel)

  function confirmReplicateLearn() {
    const slug = pendingReplicateSlug.trim()
    if (!slug || !replicateItemBySlug(slug)) {
      onToast?.('Выбери предмет для копии')
      return
    }
    const next = learnReplicateMagicItem(
      featurePicks,
      feature.classEntryId,
      feature.id,
      slug,
      maxPicks,
    )
    onFeaturePicksChange(next)
    onToast?.(
      `${choiceLabel}: ${getFeaturePickList(next, feature.classEntryId, feature.id).map(choiceOptionLabel).join(', ') || 'очищено'}`,
    )
    setPendingReplicate(false)
    setPendingReplicateSlug('')
  }

  return (
    <div className="feature-resource">
      <Text>
        {choiceLabel}
        {multi ? ` (${selectedList.length}/${maxPicks})` : ''}
        {selectedLabel ? (
          <>
            : <strong>{selectedLabel}</strong>
          </>
        ) : (
          <>
            {' '}
            <span className="feature-choice-badge">не выбрано</span>
          </>
        )}
      </Text>
      {selectedDef ? <Text tone="muted">{selectedDef.summaryRu}</Text> : null}
      {selectedMeta.map((row) =>
        row ? (
          <Text key={row.id} tone="muted">
            {row.nameRu} ({row.costRu} очк.): {row.summaryRu}
          </Text>
        ) : null,
      )}
      {choice?.options_from === 'warlock_invocations'
        ? selectedList.map((id) => {
            const inv = invocationById(id)
            if (!inv) return null
            const prereq = [
              inv.minLevel ? `с ${inv.minLevel} ур.` : null,
              inv.requiresPact
                ? `договор: ${WARLOCK_PACT_BOONS.find((p) => p.id === inv.requiresPact)?.nameRu || inv.requiresPact}`
                : null,
            ]
              .filter(Boolean)
              .join(', ')
            return (
              <Text key={id} tone="muted">
                {inv.nameRu}
                {prereq ? ` (${prereq})` : ''}: {inv.summaryRu}
              </Text>
            )
          })
        : null}
      {choice?.options_from === 'artificer_infusions'
        ? selectedList.map((id) => {
            const inf = infusionById(id)
            if (!inf) return null
            return (
              <Text key={id} tone="muted">
                {inf.nameRu}
                {inf.minLevel ? ` (с ${inf.minLevel} ур.)` : ''}
                {inf.replicate ? ' · предмет зафиксирован при изучении' : ''}:{' '}
                {inf.abilityRu || inf.summaryRu}
              </Text>
            )
          })
        : null}
      {pendingReplicate ? (
        <div className="feature-resource">
          <Text>
            Копия магического предмета — выбери предмет (доступно с{' '}
            {feature.classLevel} ур.):
          </Text>
          <label className="feature-resource__select">
            <span className="sr-only">Предмет для копии</span>
            <select
              value={pendingReplicateSlug}
              onChange={(e) => setPendingReplicateSlug(e.target.value)}
            >
              <option value="">— выбрать —</option>
              {replicateChoices.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.nameRu}
                  {item.minLevel > 2 ? ` · с ${item.minLevel} ур.` : ''}
                  {item.attune ? ' · настройка' : ''}
                </option>
              ))}
            </select>
          </label>
          {pendingReplicateSlug ? (
            <Text tone="muted">
              {replicateItemBySlug(pendingReplicateSlug)?.abilityRu}
            </Text>
          ) : null}
          <div className="feature-resource__actions">
            <Button type="button" onClick={confirmReplicateLearn}>
              Выучить копию
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPendingReplicate(false)
                setPendingReplicateSlug('')
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      ) : null}
      {choice?.options_from === 'monk_elemental_disciplines'
        ? selectedList.map((id) => {
            const disc = elementalDisciplineById(id)
            if (!disc) return null
            const cost =
              disc.kiCost == null ? 'бесплатно' : `${disc.kiCost} ки`
            const locked = disc.minLevel != null && disc.minLevel > feature.classLevel
            const prereq = disc.minLevel ? `с ${disc.minLevel} ур.; ` : ''
            return (
              <div key={id}>
                <Text tone="muted">
                  {disc.nameRu} ({prereq}
                  {cost}){locked ? ' — выше текущего уровня' : ''}: {disc.summaryRu}
                </Text>
                {locked ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      onFeaturePicksChange(
                        toggleFeaturePickInList(
                          featurePicks,
                          feature.classEntryId,
                          feature.id,
                          id,
                          maxPicks,
                        ),
                      )
                    }}
                  >
                    Снять {disc.nameRu}
                  </Button>
                ) : null}
              </div>
            )
          })
        : null}
      {choice?.options_from === 'battle_master_maneuvers'
        ? selectedList.map((id) => {
            const man = maneuverById(id)
            if (!man) return null
            return (
              <Text key={id} tone="muted">
                {man.nameRu}: {man.summaryRu}
              </Text>
            )
          })
        : null}
      {useSelect ? (
        <label className="feature-resource__select">
          <span className="sr-only">{choice.label_ru}</span>
          <select
            value={selected ?? ''}
            onChange={(event) => {
              const optionId = event.target.value || null
              onFeaturePicksChange(
                setFeaturePick(featurePicks, feature.classEntryId, feature.id, optionId),
              )
              if (optionId) onToast?.(`${choice.label_ru}: ${choiceOptionLabel(optionId)}`)
            }}
          >
            <option value="">— выбрать —</option>
            {visibleOptions.map((optionId) => (
              <option key={optionId} value={optionId}>
                {choiceOptionLabel(optionId)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="feature-resource__actions">
          {visibleOptions.map((optionId) => {
            const label = choiceOptionLabel(optionId)
            const replicateLearn = isReplicateLearnOption(optionId)
            const replicateKnown = selectedList.filter((id) =>
              id.startsWith(`${REPLICATE_MAGIC_ITEM_ID}:`),
            )
            const active = multi
              ? replicateLearn
                ? replicateKnown.length > 0
                : selectedList.includes(optionId)
              : selected === optionId
            return (
              <Button
                key={optionId}
                type="button"
                disabled={
                  (!multi && active) ||
                  pendingReplicate ||
                  (choice.options_from === 'warlock_invocations' &&
                    !active &&
                    !invocationIsSelectable(optionId, feature.classLevel, pactBoonId))
                }
                title={
                  choice.options_from === 'warlock_invocations'
                    ? invocationPrerequisiteError(optionId, feature.classLevel, pactBoonId) ??
                      undefined
                    : undefined
                }
                onClick={() => {
                  if (replicateLearn && multi) {
                    if (selectedList.length >= maxPicks) {
                      onToast?.(`Лимит известных инфузий: ${maxPicks}`)
                      return
                    }
                    setPendingReplicate(true)
                    setPendingReplicateSlug('')
                    return
                  }
                  if (multi) {
                    if (
                      choice.options_from === 'warlock_invocations' &&
                      !selectedList.includes(optionId)
                    ) {
                      const gate = invocationPrerequisiteError(
                        optionId,
                        feature.classLevel,
                        pactBoonId,
                      )
                      if (gate) {
                        onToast?.(gate)
                        return
                      }
                    }
                    if (
                      choice.options_from === 'kensei_weapons' &&
                      maxPicks === 2 &&
                      !selectedList.includes(optionId)
                    ) {
                      const preview = [...selectedList, optionId]
                      const pair = kenseiPairError(preview)
                      if (preview.length === 2 && pair) {
                        onToast?.(pair)
                        return
                      }
                    }
                    const next = toggleFeaturePickInList(
                      featurePicks,
                      feature.classEntryId,
                      feature.id,
                      optionId,
                      maxPicks,
                    )
                    onFeaturePicksChange(next)
                    onToast?.(
                      `${choice.label_ru}: ${getFeaturePickList(next, feature.classEntryId, feature.id).map(choiceOptionLabel).join(', ') || 'очищено'}`,
                    )
                    return
                  }
                  onFeaturePicksChange(
                    setFeaturePick(featurePicks, feature.classEntryId, feature.id, optionId),
                  )
                  onToast?.(`${choice.label_ru}: ${label}`)
                }}
              >
                {active && multi
                  ? replicateLearn
                    ? `✓ ${label} ×${replicateKnown.length}`
                    : `✓ ${label}`
                  : replicateLearn
                    ? `${label}…`
                    : label}
              </Button>
            )
          })}
          {choice.options_from === 'artificer_infusions'
            ? selectedList
                .filter((id) => id.startsWith(`${REPLICATE_MAGIC_ITEM_ID}:`))
                .map((id) => (
                  <Button
                    key={id}
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const next = unlearnInfusionPick(
                        featurePicks,
                        feature.classEntryId,
                        feature.id,
                        id,
                      )
                      onFeaturePicksChange(next)
                      onToast?.(
                        `${choice.label_ru}: ${getFeaturePickList(next, feature.classEntryId, feature.id).map(choiceOptionLabel).join(', ') || 'очищено'}`,
                      )
                    }}
                  >
                    ✕ {choiceOptionLabel(id)}
                  </Button>
                ))
            : null}
        </div>
      )}
    </div>
  )
}

function MetamagicSpendControls({
  feature,
  featurePicks,
  classSlug,
  resources,
  onResourcesChange,
  onToast,
}: {
  feature: UnlockedFeature
  featurePicks: FeaturePicksState
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  onToast?: (message: string) => void
}) {
  if (feature.id !== 'metamagic') return null
  const selected = getFeaturePickList(featurePicks, feature.classEntryId, feature.id)
  if (!selected.length) return null

  const pool = findFeatureResource(
    resources,
    classSlug,
    'sorcery_points',
    feature.classEntryId,
  )
  const left = spendRemaining(pool)
  const [twinnedSlot, setTwinnedSlot] = useState(1)

  return (
    <div className="feature-resource">
      <Text tone="muted">
        Потратить очки на метамагию
        {pool ? ` · очков: ${left}/${pool.max}` : ''}
      </Text>
      <Text tone="muted">Обычно одна метамагия на заклинание; Усиленное можно добавить второй.</Text>
      <div className="feature-resource__actions">
        {selected.map((id) => {
          const def = metamagicById(id)
          if (!def) return null
          const cost =
            def.costPoints == null
              ? metamagicSpendCost(def, twinnedSlot)
              : def.costPoints
          return (
            <Button
              key={id}
              type="button"
              disabled={left < cost}
              onClick={() => {
                const result = spendPoolUses({
                  resources,
                  classSlug,
                  poolId: 'sorcery_points',
                  classEntryId: feature.classEntryId,
                  amount: cost,
                  label: def.nameRu,
                })
                onResourcesChange(result.resources)
                onToast?.(result.message)
              }}
            >
              {def.nameRu} (−{cost})
            </Button>
          )
        })}
      </div>
      {selected.includes('twinned') ? (
        <label className="feature-resource__select">
          <Text tone="muted">Разделённое: ур. ячейки (заговор = 1)</Text>
          <select
            value={twinnedSlot}
            onChange={(event) => setTwinnedSlot(Number(event.target.value) || 1)}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
              <option key={level} value={level}>
                {level === 1 ? '1 (заговор/1 ур.)' : `${level} ур.`}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  )
}

function FlexibleCastingControls({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  spells,
  onSpellsChange,
  onToast,
}: {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  spells: SpellsState
  onSpellsChange: (spells: SpellsState) => void
  onToast?: (message: string) => void
}) {
  if (feature.id !== 'flexible_casting') return null
  const pool = findFeatureResource(
    resources,
    classSlug,
    'sorcery_points',
    feature.classEntryId,
  )
  const left = spendRemaining(pool)

  return (
    <div className="feature-resource">
      <Text tone="muted">Ячейка → очки (= ур. ячейки)</Text>
      <div className="feature-resource__actions">
        {[1, 2, 3, 4, 5].map((level) => {
          const available = canSpendSlot(spells.slots, level)
          return (
            <Button
              key={`to-sp-${level}`}
              type="button"
              disabled={!available || !pool}
              onClick={() => {
                const slotResult = spendSpellSlot(spells.slots, level)
                if (!slotResult.ok) {
                  onToast?.(`Нет ячейки ${level} ур.`)
                  return
                }
                const spResult = regainPoolUses({
                  resources,
                  classSlug,
                  poolId: 'sorcery_points',
                  classEntryId: feature.classEntryId,
                  amount: level,
                  label: `Ячейка ${level}→очки`,
                })
                if (!spResult.ok) {
                  onToast?.(spResult.message)
                  return
                }
                onSpellsChange({ ...spells, slots: slotResult.slots })
                onResourcesChange(spResult.resources)
                onToast?.(spResult.message)
              }}
            >
              {level}→+{level} очк.
            </Button>
          )
        })}
      </div>
      <Text tone="muted">
        Очки → новая ячейка до 5 круга (PHB). Созданная ячейка исчезает после продолжительного отдыха.
      </Text>
      <div className="feature-resource__actions">
        {[1, 2, 3, 4, 5].map((level) => {
          const cost = FLEXIBLE_CASTING_SLOT_COST[level] ?? 99
          return (
            <Button
              key={`to-slot-${level}`}
              type="button"
              disabled={left < cost}
              title="Создать дополнительную ячейку, даже если круг полон"
              onClick={() => {
                const spResult = spendPoolUses({
                  resources,
                  classSlug,
                  poolId: 'sorcery_points',
                  classEntryId: feature.classEntryId,
                  amount: cost,
                  label: `Очки→ячейка ${level}`,
                })
                if (!spResult.ok) {
                  onToast?.(spResult.message)
                  return
                }
                const nextSlots = addFlexibleSpellSlot(spells.slots, level)
                if (!nextSlots) return
                onResourcesChange(spResult.resources)
                onSpellsChange({ ...spells, slots: nextSlots })
                const created = nextSlots[String(level)]
                onToast?.(
                  `Новая ячейка ${level} ур.: −${cost} очк. (${slotsRemaining(created)} св., доп. ${created?.flexible ?? 1})`,
                )
              }}
            >
              Новая {level} (−{cost})
            </Button>
          )
        })}
      </div>
      <div className="feature-resource__actions">
        {[1, 2, 3, 4, 5].map((level) => {
          const cost = FLEXIBLE_CASTING_SLOT_COST[level] ?? 99
          const slot = spells.slots[String(level)]
          const canRegain = Boolean(slot && slot.used > 0)
          if (!canRegain) return null
          return (
            <Button
              key={`regain-${level}`}
              type="button"
              variant="secondary"
              disabled={left < cost}
              onClick={() => {
                const spResult = spendPoolUses({
                  resources,
                  classSlug,
                  poolId: 'sorcery_points',
                  classEntryId: feature.classEntryId,
                  amount: cost,
                  label: `Вернуть ячейку ${level}`,
                })
                if (!spResult.ok) {
                  onToast?.(spResult.message)
                  return
                }
                const key = String(level)
                const current = spells.slots[key] ?? { max: 0, used: 0 }
                onResourcesChange(spResult.resources)
                onSpellsChange({
                  ...spells,
                  slots: {
                    ...spells.slots,
                    [key]: {
                      max: current.max,
                      used: Math.max(0, current.used - 1),
                      ...(current.flexible ? { flexible: current.flexible } : {}),
                    },
                  },
                })
                onToast?.(`Вернули потраченную ячейку ${level} ур. (−${cost} очк.)`)
              }}
            >
              Вернуть {level}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function FeatureSlotSpendControls({
  feature,
  spells,
  onSpellsChange,
  onToast,
  onMoonFormSlotHeal,
  divineSmiteIntent,
  onDivineSmiteIntent,
}: {
  feature: UnlockedFeature
  spells: SpellsState
  onSpellsChange: (spells: SpellsState) => void
  onToast?: (message: string) => void
  onMoonFormSlotHeal?: (input: {
    slotLevel: number
    diceCount: number
    diceSize: number
  }) => string | null
  divineSmiteIntent?: DivineSmiteIntent
  onDivineSmiteIntent?: (next: DivineSmiteIntent) => void
}) {
  const spend = feature.slot_spend
  if (!spend) return null

  const levels: number[] = []
  for (let level = spend.min_slot; level <= spend.max_slot; level += 1) {
    levels.push(level)
  }
  const isMoonHeal = feature.id === 'combat_wild_shape'

  return (
    <div className="feature-resource">
      <Text tone="muted">
        {spend.label_ru}
        {spend.extra_vs_note_ru ? ` · ${spend.extra_vs_note_ru}` : ''}
        {isMoonHeal ? ' · нужен активный облик' : ''}
        {feature.id === DIVINE_SMITE_FEATURE_ID
          ? ' · в «Бою» ячейка списывается после рукопашного попадания'
          : ''}
        {feature.id === DIVINE_SMITE_FEATURE_ID && divineSmiteIntent?.vsUndeadOrFiend
          ? ' · сейчас +1к8 против нежити или исчадия'
          : ''}
      </Text>
      <div className="feature-resource__actions">
        {levels.map((level) => {
          const withDice = slotSpendHasDice(spend)
          const dice = withDice ? slotSpendDiceCount(spend, level) : 0
          const available = canSpendSlot(spells.slots, level)
          const smiteArmed =
            feature.id === DIVINE_SMITE_FEATURE_ID && divineSmiteIntent?.slotLevel === level
          return (
            <Button
              key={level}
              type="button"
              variant={
                feature.id === DIVINE_SMITE_FEATURE_ID
                  ? smiteArmed
                    ? 'primary'
                    : 'secondary'
                  : 'primary'
              }
              disabled={!available}
              onClick={() => {
                if (feature.id === DIVINE_SMITE_FEATURE_ID) {
                  const nextLevel = divineSmiteIntent?.slotLevel === level ? null : level
                  onDivineSmiteIntent?.({
                    slotLevel: nextLevel,
                    vsUndeadOrFiend: divineSmiteIntent?.vsUndeadOrFiend ?? false,
                  })
                  onToast?.(
                    nextLevel == null
                      ? 'Божественная кара снята. Ячейка не списана.'
                      : `Божественная кара: ячейка ${level} → +${dice}к${spend.dice_size ?? 8}. Ячейка не списана — в сцене «Бой» подтверди попадание.`,
                  )
                  return
                }
                if (isMoonHeal && onMoonFormSlotHeal) {
                  const diceSize = spend.dice_size ?? 8
                  const diceCount = withDice ? dice : moonHealDiceCount(level)
                  const result = spendSpellSlot(spells.slots, level)
                  if (!result.ok) {
                    onToast?.(`Нет ячейки ${level} ур.`)
                    return
                  }
                  const msg = onMoonFormSlotHeal({
                    slotLevel: level,
                    diceCount,
                    diceSize,
                  })
                  if (msg == null) {
                    onToast?.('Нет активного облика')
                    return
                  }
                  onSpellsChange({ ...spells, slots: result.slots })
                  onToast?.(msg)
                  return
                }
                const result = spendSpellSlot(spells.slots, level)
                if (!result.ok) {
                  onToast?.(`Нет ячейки ${level} ур.`)
                  return
                }
                onSpellsChange({ ...spells, slots: result.slots })
                onToast?.(
                  withDice
                    ? `${spend.label_ru}: ячейка ${level} → +${dice}к${spend.dice_size}`
                    : `${spend.label_ru}: ячейка ${level} ур.`,
                )
              }}
            >
              {withDice
                ? `${level} ур. (+${dice}к${spend.dice_size})`
                : `${level} ур.`}
            </Button>
          )
        })}
        {feature.id === DIVINE_SMITE_FEATURE_ID ? (
          <Button
            type="button"
            variant={divineSmiteIntent?.vsUndeadOrFiend ? 'primary' : 'secondary'}
            onClick={() => {
              const next = !(divineSmiteIntent?.vsUndeadOrFiend ?? false)
              onDivineSmiteIntent?.({
                slotLevel: divineSmiteIntent?.slotLevel ?? null,
                vsUndeadOrFiend: next,
              })
              onToast?.(
                next
                  ? 'Нежить / исчадие: +1к8 к каре сверх потолка ячейки. Ячейка не списана.'
                  : 'Обычная цель: без дополнительного к8. Ячейка не списана.',
              )
            }}
          >
            нежить / исчадие
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function FeatureReplacementControls({
  feature,
  unlocked,
  featurePicks,
  onFeaturePicksChange,
  onToast,
}: {
  feature: UnlockedFeature
  unlocked: UnlockedFeature[]
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onToast?: (message: string) => void
}) {
  if (feature.replaces) {
    const targets = findReplaceTargets(feature, unlocked)
    const targetNames = targets.map((row) => row.name_ru || row.id).filter(Boolean)
    const taken = isReplacementTaken(featurePicks, feature.classEntryId, feature.id)
    const targetLabel =
      targetNames.length === 1
        ? `«${targetNames[0]}»`
        : targetNames.length > 1
          ? targetNames.map((name) => `«${name}»`).join(' / ')
          : 'PHB-вариант'
    return (
      <div className="feature-resource">
        <Text tone="muted">
          {taken
            ? `Заменяет ${targetLabel}.`
            : `Альтернатива ${targetLabel} (TCE). На столе будет только выбранный набор.`}
        </Text>
        <div className="feature-resource__actions">
          {taken ? (
            <Button
              type="button"
              onClick={() => {
                onFeaturePicksChange(
                  setReplacementTaken(featurePicks, feature.classEntryId, feature.id, false),
                )
                onToast?.(`Вернули ${targetLabel}`)
              }}
            >
              Вернуть {targetLabel}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                onFeaturePicksChange(
                  setReplacementTaken(featurePicks, feature.classEntryId, feature.id, true),
                )
                onToast?.(`Взяли «${feature.name_ru}» вместо ${targetLabel}`)
              }}
            >
              Взять вместо {targetLabel}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const replacer = findReplacerForFeature(feature, unlocked)
  if (!replacer) return null
  const taken = isReplacementTaken(featurePicks, feature.classEntryId, replacer.id)
  if (!taken) return null
  return (
    <div className="feature-resource">
      <Text tone="muted">
        Заменено на «{replacer.name_ru || replacer.id}». На игровом столе не показывается.
      </Text>
      <div className="feature-resource__actions">
        <Button
          type="button"
          onClick={() => {
            onFeaturePicksChange(
              setReplacementTaken(featurePicks, feature.classEntryId, replacer.id, false),
            )
            onToast?.(`Вернули «${feature.name_ru}»`)
          }}
        >
          Вернуть «{feature.name_ru}»
        </Button>
      </div>
    </div>
  )
}

function replacementBadgeClass(status: FeatureReplacementStatus): string {
  if (status === 'available') return 'feature-replacement-badge is-available'
  if (status === 'replaced') return 'feature-replacement-badge is-replaced'
  return 'feature-replacement-badge is-active'
}

function FeatureRow({
  feature,
  unlockedFeatures,
  classSlug,
  open,
  onToggle,
  resources,
  onResourcesChange,
  featurePicks,
  onFeaturePicksChange,
  spells,
  onSpellsChange,
  skills,
  tools,
  expertiseKeys,
  classAsi,
  companions,
  onCompanionsChange,
  onToast,
  initiativeGrantByPool,
  wearingHeavyArmor,
  onOpenInfusions,
  onOpenInvocations,
  onOpenSoulTrinkets,
  onOpenRangerFavored,
  onCastPactChainFamiliar,
  onWildShapeFork,
  onOpenRecovery,
  hpCurrent = null,
  hpMax = null,
  onHpChange,
  onFeatureSelfForm,
  onWizardFeatureUse,
  moonCombatWildShape = false,
  onMoonFormSlotHeal,
  divineSmiteIntent,
  onDivineSmiteIntent,
  inventoryItems = [],
  onInventoryChange,
  concentration = null,
  onConcentrationChange,
  classes,
  featGrants = [],
  characterLevel,
  charismaScore,
  wisdomScore,
  edition = '2014',
  onFeatureBuffApply,
}: {
  feature: UnlockedFeature
  unlockedFeatures: UnlockedFeature[]
  classSlug: string
  open: boolean
  onToggle: () => void
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  spells: SpellsState
  onSpellsChange: (spells: SpellsState) => void
  skills: SkillExpertiseState
  tools: string[]
  expertiseKeys: Array<{ classEntryId: string; featureId: string }>
  classAsi: AppliedClassAsi[]
  companions?: CompanionEntry[]
  onCompanionsChange?: (companions: CompanionEntry[]) => void
  onToast?: (message: string) => void
  initiativeGrantByPool: Map<string, number>
  wearingHeavyArmor: boolean
  onOpenInfusions?: (classEntryId: string) => void
  onOpenInvocations?: (classEntryId: string) => void
  onOpenSoulTrinkets?: (classEntryId: string) => void
  onOpenRangerFavored?: (classEntryId: string) => void
  onCastPactChainFamiliar?: (classEntryId: string) => void
  onWildShapeFork?: (request: WildShapeForkRequest) => void
  onOpenRecovery?: (resourceId: string) => void
  hpCurrent?: number | null
  hpMax?: number | null
  onHpChange?: (hp: number) => void
  onFeatureSelfForm?: (request: FeatureSelfFormRequest) => void
  onWizardFeatureUse?: (request: WizardFeatureRequest) => void
  moonCombatWildShape?: boolean
  onMoonFormSlotHeal?: (input: {
    slotLevel: number
    diceCount: number
    diceSize: number
  }) => string | null
  divineSmiteIntent?: DivineSmiteIntent
  onDivineSmiteIntent?: (next: DivineSmiteIntent) => void
  inventoryItems?: InventoryItem[]
  onInventoryChange?: (items: InventoryItem[]) => void
  concentration?: ConcentrationState | null
  onConcentrationChange?: (next: ConcentrationState | null) => void
  classes: ClassLevelEntry[]
  featGrants?: AppliedFeatGrant[]
  characterLevel: number
  charismaScore?: number
  wisdomScore?: number
  edition?: RulesEdition
  onFeatureBuffApply?: ClassFeaturesPanelProps['onFeatureBuffApply']
}) {
  const sourceLabel =
    feature.source === 'subclass'
      ? `${feature.className} · ${feature.subclassName || feature.subclassSlug || 'архетип'}`
      : feature.className
  const role = feature.source === 'subclass' ? 'подкласс' : 'класс'
  const roleClass = feature.source === 'subclass' ? 'weapon' : 'armor'

  const pool = feature.resource?.pool_id
    ? findFeatureResource(
        resources,
        classSlug,
        feature.resource.pool_id,
        feature.classEntryId,
      )
    : null

  const asiEntry = isAsiFeature(feature)
    ? findAppliedClassAsi(classAsi, feature.classEntryId, feature.id)
    : null
  const asiLabel = asiEntry ? formatAppliedClassAsiLabel(asiEntry) : null
  const isAsi = isAsiFeature(feature)

  const choiceMulti =
    !isAsi &&
    feature.choice &&
    (Boolean(feature.choice.max_picks_by_level) ||
      Boolean(feature.choice.max_picks && feature.choice.max_picks > 1) ||
      resolveChoiceMaxPicks(feature.choice, feature.classLevel) > 1)
  const choicePick =
    !isAsi && feature.choice
      ? choiceMulti
        ? getFeaturePickList(featurePicks, feature.classEntryId, feature.id)
            .map(choiceOptionLabel)
            .join(', ')
        : getFeaturePick(featurePicks, feature.classEntryId, feature.id)
      : null
  const choiceLabel =
    typeof choicePick === 'string' && choicePick
      ? choiceMulti
        ? choicePick
        : choiceOptionLabel(choicePick)
      : null
  const tomeCantripsPending =
    feature.id === PACT_BOON_FEATURE_ID &&
    isPactTomeActive(featurePicks, feature.classEntryId) &&
    !isPactTomeCantripsComplete(featurePicks, feature.classEntryId)
  const chainFamiliarReady =
    feature.id === PACT_BOON_FEATURE_ID &&
    isPactChainActive(featurePicks, feature.classEntryId)
  const choicePending = isAsi
    ? !asiEntry
    : (Boolean(feature.choice) && !isFeatureChoiceComplete(feature, featurePicks)) ||
      tomeCantripsPending

  const scaleShown = moonShapeScale(feature, unlockedFeatures) ?? feature.scaleValue

  let metaExtra = ''
  if (asiLabel) {
    metaExtra = asiLabel
  } else if (choiceLabel) {
    metaExtra = chainFamiliarReady ? `${choiceLabel} · призвать` : choiceLabel
  } else if (choicePending) {
    metaExtra = 'не выбрано'
  } else if (feature.resource?.track === 'stock' && pool) {
    metaExtra = `${stockCurrent(pool)}/${pool.max}`
  } else if (feature.resourceUses != null) {
    metaExtra = pool
      ? `${spendRemaining(pool)}/${pool.max}`
      : `${feature.resourceUses}×`
  } else if (feature.save_bonus_self) {
    metaExtra = feature.save_bonus_self.label_ru
  } else if (scaleShown) {
    metaExtra = scaleShown
  }

  const preview = previewSummary(feature.summary_ru)
  const canExpand = featureCanExpand(feature)
  const optionalBadge = optionalFeatureBadgeRu(feature)
  const replacementStatus = replacementStatusForFeature(
    feature,
    unlockedFeatures,
    featurePicks,
  )
  const showReplacementBadge =
    Boolean(feature.replaces) || Boolean(findReplacerForFeature(feature, unlockedFeatures))
  const replacementBadge = showReplacementBadge ? (
    <span className={replacementBadgeClass(replacementStatus)}>
      {replacementStatusLabelRu(replacementStatus)}
    </span>
  ) : null
  const cardToneClass =
    replacementStatus === 'replaced'
      ? ' is-replaced'
      : replacementStatus === 'available'
        ? ' is-available-alt'
        : ''

  if (!canExpand) {
    return (
      <div
        className={`feature-card feature-card--compact feature-card--static${cardToneClass}`}
      >
        <div className="feature-card__glance">
          <span className="feature-card__level" aria-hidden>
            {feature.level}
          </span>
          <b className="feature-card__name">{feature.name_ru}</b>
          <span className={`inventory-role inventory-role--${roleClass}`}>{role}</span>
          {replacementBadge}
          {optionalBadge && !showReplacementBadge ? (
            <span className="feature-optional-badge">{optionalBadge}</span>
          ) : null}
          <span className="inventory-card__glance-spacer" aria-hidden />
          <span className="feature-card__preview">
            {metaExtra ? `${metaExtra} · ` : ''}
            {preview || kindLabelRu(feature.kind)}
          </span>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <div className={`feature-card feature-card--compact${cardToneClass}`}>
        <button type="button" className="feature-card__glance" onClick={onToggle}>
          <span className="feature-card__level" aria-hidden>
            {feature.level}
          </span>
          <b className="feature-card__name">{feature.name_ru}</b>
          <span className={`inventory-role inventory-role--${roleClass}`}>{role}</span>
          {replacementBadge}
          {optionalBadge && !showReplacementBadge ? (
            <span className="feature-optional-badge">{optionalBadge}</span>
          ) : null}
          {feature.resource && replacementStatus === 'active' ? (
            <span className="attack-held-tag is-on">ресурс</span>
          ) : null}
          {choicePending && replacementStatus === 'active' ? (
            <span className="attack-held-tag">выбор</span>
          ) : null}
          <span className="inventory-card__glance-spacer" aria-hidden />
          <span className="feature-card__preview">
            {metaExtra ? `${metaExtra} · ` : ''}
            {preview || kindLabelRu(feature.kind)}
          </span>
        </button>
        <div className="inventory-card__glance-actions">
          <button
            type="button"
            className="inventory-card__chevron-btn"
            aria-label="Подробнее"
            onClick={onToggle}
          >
            ›
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`feature-card feature-card--expand${cardToneClass}`}>
      <div className="feature-card__meta">
        <span className="feature-card__level" aria-hidden>
          {feature.level}
        </span>
        <span className={`inventory-role inventory-role--${roleClass}`}>{role}</span>
        <span className="attack-held-tag">{kindLabelRu(feature.kind)}</span>
        {replacementBadge}
        {optionalBadge && !showReplacementBadge ? (
          <span className="feature-optional-badge">{optionalBadge}</span>
        ) : null}
        {feature.resource && replacementStatus === 'active' ? (
          <span className="attack-held-tag is-on">ресурс</span>
        ) : null}
        {choicePending && replacementStatus === 'active' ? (
          <span className="attack-held-tag">выбор</span>
        ) : null}
        <button type="button" className="inventory-card__collapse" onClick={onToggle}>
          свернуть
        </button>
      </div>
      <h3 className="feature-card__title">
        {feature.name_ru}
        {scaleShown ? (
          <strong className="feature-row__scale"> · {scaleShown}</strong>
        ) : null}
      </h3>
      <Text tone="muted">{sourceLabel}</Text>
      <Text>{feature.summary_ru}</Text>
      {feature.body_ru ? <Text tone="muted">{feature.body_ru}</Text> : null}
      <FeatureReplacementControls
        feature={feature}
        unlocked={unlockedFeatures}
        featurePicks={featurePicks}
        onFeaturePicksChange={onFeaturePicksChange}
        onToast={onToast}
      />
      {feature.scale ? (
        <Text tone="muted">
          {feature.scale.labelRu}: сейчас <strong>{scaleShown}</strong>
        </Text>
      ) : null}
      {isAsi ? (
        <div className="feature-resource">
          <Text>
            Увеличение характеристик
            {asiLabel ? (
              <>
                : <strong>{asiLabel}</strong>
              </>
            ) : (
              <>
                {' '}
                <span className="feature-choice-badge">не выбрано</span>
              </>
            )}
          </Text>
        </div>
      ) : replacementStatus === 'active' ? (
        <FeatureChoiceControls
          feature={feature}
          featurePicks={featurePicks}
          onFeaturePicksChange={onFeaturePicksChange}
          skills={skills}
          tools={tools}
          expertiseKeys={expertiseKeys}
          onToast={onToast}
        />
      ) : null}
      {replacementStatus === 'active' &&
      (feature.id === 'spell_mastery' || feature.id === 'signature_spells') ? (
        <WizardCapstonePicks
          featureId={feature.id}
          classEntryId={feature.classEntryId}
          spells={spells.known}
          featurePicks={featurePicks}
          onFeaturePicksChange={onFeaturePicksChange}
          onToast={onToast}
        />
      ) : null}
      {replacementStatus === 'active' &&
      onWizardFeatureUse &&
      (feature.id === 'minor_conjuration' || feature.id === 'command_undead') ? (
        <div className="feature-resource__actions">
          <Button
            type="button"
            onClick={() =>
              onWizardFeatureUse({
                featureId: feature.id,
                resourceId: null,
                classSlug,
                classEntryId: feature.classEntryId,
                name: feature.name_ru,
              })
            }
          >
            Использовать…
          </Button>
        </div>
      ) : null}
      {feature.id === PACT_BOON_FEATURE_ID &&
      isPactTomeActive(featurePicks, feature.classEntryId) ? (
        <div className="feature-resource">
          <PactTomeCantripsPicker
            classEntryId={feature.classEntryId}
            edition={edition}
            featurePicks={featurePicks}
            onFeaturePicksChange={onFeaturePicksChange}
            onToast={onToast}
            compact
          />
        </div>
      ) : null}
      {feature.id === PACT_BOON_FEATURE_ID &&
      isPactChainActive(featurePicks, feature.classEntryId) ? (
        <div className="feature-resource">
          <Text tone="muted">
            {WARLOCK_PACT_BOON_GRANTS.chain.notesRu ||
              'Кастуй «Поиск фамильяра» — карточка напарника появится после каста.'}
          </Text>
          <div className="feature-resource__actions">
            <Button
              type="button"
              onClick={() => onCastPactChainFamiliar?.(feature.classEntryId)}
            >
              Призвать фамильяра…
            </Button>
          </div>
        </div>
      ) : null}
      {replacementStatus === 'active' ? (
        <MetamagicSpendControls
          feature={feature}
          featurePicks={featurePicks}
          classSlug={classSlug}
          resources={resources}
          onResourcesChange={onResourcesChange}
          onToast={onToast}
        />
      ) : null}
      {replacementStatus === 'active' ? (
        <FlexibleCastingControls
          feature={feature}
          classSlug={classSlug}
          resources={resources}
          onResourcesChange={onResourcesChange}
          spells={spells}
          onSpellsChange={onSpellsChange}
          onToast={onToast}
        />
      ) : null}
      {replacementStatus === 'active' ? (
        <FeatureSlotSpendControls
          feature={feature}
          spells={spells}
          onSpellsChange={onSpellsChange}
          onToast={onToast}
          onMoonFormSlotHeal={onMoonFormSlotHeal}
          divineSmiteIntent={divineSmiteIntent}
          onDivineSmiteIntent={onDivineSmiteIntent}
        />
      ) : null}
      {replacementStatus === 'active' && isSunSoulVariableKi(feature.id) ? (
        <SunSoulKiControls
          feature={feature}
          classSlug={classSlug}
          resources={resources}
          onResourcesChange={onResourcesChange}
          onToast={onToast}
          unlocked={unlockedFeatures}
        />
      ) : null}
      {replacementStatus === 'active' ? (
        <Pack09FeatureExtras
          feature={feature}
          classSlug={classSlug}
          resources={resources}
          onResourcesChange={onResourcesChange}
          onToast={onToast}
          unlocked={unlockedFeatures}
        />
      ) : null}
      {replacementStatus === 'active' &&
      !isSunSoulVariableKi(feature.id) &&
      !isHarnessDivinePowerFeature(feature.id) &&
      feature.id !== 'bolstering_magic' &&
      feature.id !== 'consult_the_spirits' ? (
        <FeatureResourceControls
          feature={feature}
          classSlug={classSlug}
          resources={resources}
          onResourcesChange={onResourcesChange}
          companions={companions}
          onCompanionsChange={onCompanionsChange}
          onToast={onToast}
          initiativeGrantByPool={initiativeGrantByPool}
          wearingHeavyArmor={wearingHeavyArmor}
          onOpenInfusions={onOpenInfusions}
          onOpenSoulTrinkets={onOpenSoulTrinkets}
          onWildShapeFork={onWildShapeFork}
          onOpenRecovery={onOpenRecovery}
          onFeatureSelfForm={onFeatureSelfForm}
          onWizardFeatureUse={onWizardFeatureUse}
          onFeatureBuffApply={onFeatureBuffApply}
          moonCombatWildShape={moonCombatWildShape}
          scaleText={scaleShown}
        />
      ) : null}
      {replacementStatus === 'active' &&
      onFeatureBuffApply &&
      (feature.id === 'aura_of_protection' ||
        feature.id === 'aura_of_courage' ||
        feature.id === 'aura_of_devotion' ||
        feature.id === 'aura_of_warding' ||
        feature.id === 'aura_of_alacrity' ||
        feature.id === 'aura_of_the_sentinel' ||
        feature.id === 'dark_ones_blessing' ||
        feature.id === 'dread_ambusher' ||
        feature.id === 'eldritch_mind' ||
        feature.id === 'improved_pact_weapon' ||
        feature.id === 'spell_resistance' ||
        feature.id === 'durable_magic' ||
        feature.id === 'tactical_wit' ||
        feature.id === 'colossus_slayer' ||
        feature.id === 'steel_will' ||
        feature.id === 'psychic_defenses' ||
        feature.id === 'wind_soul' ||
        feature.id === 'supernatural_resistance' ||
        feature.id === 'unyielding_spirit' ||
        feature.id === 'flash_of_genius' ||
        feature.id === 'soul_of_artifice' ||
        feature.id === 'fortified_position' ||
        feature.id === 'armor_model' ||
        feature.id === 'defensive_field' ||
        feature.id === 'eldritch_cannon') ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onFeatureBuffApply({
              featureId: feature.id,
              featureNameRu: feature.name_ru,
              classEntryId: feature.classEntryId,
              classLevel: feature.classLevel,
            })
          }
        >
          {feature.id.startsWith('aura_of_')
            ? 'На союзника'
            : 'Применить эффект'}
        </Button>
      ) : null}
      {replacementStatus === 'active' ? (
        <Pack04FeatureExtras
          feature={feature}
          classSlug={classSlug}
          resources={resources}
          onResourcesChange={onResourcesChange}
          featurePicks={featurePicks}
          onFeaturePicksChange={onFeaturePicksChange}
          spells={spells}
          onSpellsChange={onSpellsChange}
          onToast={onToast}
          subclassSlug={feature.subclassSlug}
          onSetConcentration={(name) =>
            onConcentrationChange?.({
              spell_id: `pack04:${feature.id}`,
              name,
            })
          }
        />
      ) : null}
      {replacementStatus === 'active' ? (
        <Pack07FeatureExtras
          feature={feature}
          classSlug={classSlug}
          resources={resources}
          onResourcesChange={onResourcesChange}
          companions={companions ?? []}
          onCompanionsChange={onCompanionsChange}
          onToast={onToast}
          wisdomScore={wisdomScore}
          hpCurrent={hpCurrent}
          hpMax={hpMax}
          onHpChange={onHpChange}
          edition={edition}
        />
      ) : null}
      {replacementStatus === 'active' ? (
        <Pack05FeatureExtras
          feature={feature}
          classSlug={classSlug}
          resources={resources}
          onResourcesChange={onResourcesChange}
          featurePicks={featurePicks}
          onFeaturePicksChange={onFeaturePicksChange}
          spells={spells}
          onSpellsChange={onSpellsChange}
          inventoryItems={inventoryItems}
          onInventoryChange={onInventoryChange}
          companions={companions ?? []}
          onCompanionsChange={onCompanionsChange}
          concentration={concentration}
          onConcentrationChange={onConcentrationChange}
          onToast={onToast}
          characterLevel={characterLevel}
          charismaScore={charismaScore}
          unlocked={unlockedFeatures}
        />
      ) : null}
      {replacementStatus === 'active' ? (
        <Pack03FeatureExtras
          feature={feature}
          classSlug={classSlug}
          resources={resources}
          onResourcesChange={onResourcesChange}
          spells={spells}
          onSpellsChange={onSpellsChange}
          characterLevel={characterLevel}
          inventoryItems={inventoryItems}
          onInventoryChange={onInventoryChange}
          concentration={concentration}
          onConcentrationChange={onConcentrationChange}
          onToast={onToast}
          featurePicks={featurePicks}
          onFeaturePicksChange={onFeaturePicksChange}
          classes={classes}
          featGrants={featGrants}
          unlocked={unlockedFeatures}
        />
      ) : null}
      {replacementStatus === 'active' &&
      feature.id === 'eldritch_invocations' &&
      onOpenInvocations ? (
        <div className="feature-resource__actions">
          <Button
            type="button"
            onClick={() => onOpenInvocations(feature.classEntryId)}
          >
            Воззвания на столе
          </Button>
        </div>
      ) : null}
      {replacementStatus === 'active' &&
      feature.id === 'infuse_item' &&
      onOpenInfusions ? (
        <div className="feature-resource__actions">
          <Button
            type="button"
            onClick={() => onOpenInfusions(feature.classEntryId)}
          >
            Активные инфузии
          </Button>
        </div>
      ) : null}
      {replacementStatus === 'active' &&
      (feature.id === 'favored_enemy' || feature.id === 'natural_explorer') &&
      onOpenRangerFavored ? (
        <div className="feature-resource__actions">
          <Button
            type="button"
            onClick={() => onOpenRangerFavored(feature.classEntryId)}
          >
            Избранное на столе
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Cha (or other) bonus from unlocked aura_of_protection-style features. */
export function saveBonusFromFeatures(input: {
  features: UnlockedFeature[]
  abilities: Partial<Record<AbilityScoreKey, number>>
}): number {
  let bonus = 0
  for (const feature of input.features) {
    const spec = feature.save_bonus_self
    if (!spec) continue
    const score = input.abilities[spec.ability]
    const mod =
      typeof score === 'number' ? abilityModifier(score) : spec.min_bonus
    bonus = Math.max(bonus, Math.max(spec.min_bonus, mod))
  }
  return bonus
}

export function ClassFeaturesPanel({
  classes,
  characterLevel,
  abilities,
  subclassSlugByEntryId,
  subclassTransitionByEntryId,
  resources,
  onResourcesChange,
  featurePicks,
  onFeaturePicksChange,
  spells,
  onSpellsChange,
  skills = {},
  tools = [],
  classAsi = [],
  wearingHeavyArmor = false,
  companions = [],
  onCompanionsChange,
  onWildShapeFork,
  onOpenRecovery,
  hpCurrent = null,
  hpMax = null,
  onHpChange,
  onFeatureSelfForm,
  onWizardFeatureUse,
  onMoonFormSlotHeal,
  divineSmiteIntent,
  onDivineSmiteIntent,
  onToast,
  featGrants = [],
  darkvision = 0,
  defenseSummary = '',
  raceName = '',
  raceTraitCards = [],
  raceTraitsText = '',
  backgroundName = '',
  backgroundFeature = null,
  customFeatures = [],
  onCustomFeaturesChange,
  onOpenInfusions,
  onOpenInvocations,
  onOpenRangerFavored,
  onOpenSoulTrinkets,
  onCastPactChainFamiliar,
  inventoryItems = [],
  onInventoryChange,
  concentration = null,
  onConcentrationChange,
  edition = '2014',
  onFeatureBuffApply,
  requestedFilter = null,
  onRequestedFilterConsumed,
}: ClassFeaturesPanelProps) {
  const [filter, setFilter] = useState<FeatureFilter>('all')
  const [search, setSearch] = useState('')
  const [asiOpenByClass, setAsiOpenByClass] = useState<Set<string>>(() => new Set())
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set())
  const [customDraftName, setCustomDraftName] = useState('')
  const [customDraftSummary, setCustomDraftSummary] = useState('')

  useEffect(() => {
    if (!requestedFilter) return
    const allowed = FEATURE_FILTERS.some((row) => row.id === requestedFilter)
    if (!allowed) {
      onRequestedFilterConsumed?.()
      return
    }
    setFilter(requestedFilter as FeatureFilter)
    onRequestedFilterConsumed?.()
  }, [requestedFilter, onRequestedFilterConsumed])

  const features = useMemo(
    () =>
      unlockFeaturesForClasses({
        classes,
        characterLevel,
        abilities,
        subclassSlugByEntryId,
        subclassTransitionByEntryId,
      }),
    [
      classes,
      characterLevel,
      abilities,
      subclassSlugByEntryId,
      subclassTransitionByEntryId,
    ],
  )
  const expertiseKeys = useMemo(() => listUnlockedExpertiseKeys(features), [features])
  const namedFeats = useMemo(
    () => featGrants.filter((row) => row.nameRu.trim()),
    [featGrants],
  )

  const initiativeGrantByPool = useMemo(() => {
    const map = new Map<string, number>()
    for (const feature of features) {
      if (feature.resource?.grant_one_on_initiative_if_empty && feature.resource.pool_id) {
        const amount = feature.resource.grant_amount_on_initiative_if_empty ?? 1
        const prev = map.get(feature.resource.pool_id) ?? 0
        map.set(feature.resource.pool_id, Math.max(prev, amount))
      }
    }
    return map
  }, [features])

  const moonCombatWildShape = useMemo(
    () => features.some((f) => f.id === 'combat_wild_shape'),
    [features],
  )

  const byClass = useMemo(() => {
    const map = new Map<string, UnlockedFeature[]>()
    for (const feature of features) {
      const list = map.get(feature.classEntryId) ?? []
      list.push(feature)
      map.set(feature.classEntryId, list)
    }
    return [...map.entries()].map(([classEntryId, list]) => ({
      classEntryId,
      className: list[0]?.className ?? '',
      classLevel: list[0]?.classLevel ?? 0,
      classSlug: resolveClassFeatureSlug(list[0]?.className ?? '') || 'class',
      features: list,
    }))
  }, [features])

  const slugByEntry = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of byClass) map.set(group.classEntryId, group.classSlug)
    return map
  }, [byClass])

  const visibleFeatures = useMemo(() => {
    const q = search.trim().toLowerCase()
    return features.filter((feature) => {
      if (q) {
        const hay = `${feature.name_ru} ${feature.summary_ru} ${feature.name_en ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filter === 'all') return true
      if (filter === 'class') return feature.source !== 'subclass'
      if (filter === 'subclass') return feature.source === 'subclass'
      if (filter === 'feats' || filter === 'custom') return false
      if (filter === 'resource') return Boolean(feature.resource?.pool_id)
      if (filter === 'active') return feature.kind !== 'passive'
      if (filter === 'passive') return feature.kind === 'passive'
      if (filter === 'choice' || filter === 'needs_setup') {
        if (isAsiFeature(feature)) {
          return !findAppliedClassAsi(classAsi, feature.classEntryId, feature.id)
        }
        return (
          Boolean(feature.choice) && !isFeatureChoiceComplete(feature, featurePicks)
        )
      }
      return true
    })
  }, [features, filter, featurePicks, search, classAsi])

  const visibleByClass = useMemo(() => {
    const map = new Map<string, UnlockedFeature[]>()
    for (const feature of visibleFeatures) {
      const list = map.get(feature.classEntryId) ?? []
      list.push(feature)
      map.set(feature.classEntryId, list)
    }
    return byClass
      .map((group) => ({
        ...group,
        features: map.get(group.classEntryId) ?? [],
      }))
      .filter((group) => group.features.length > 0)
  }, [byClass, visibleFeatures])

  const resolvedRaceTraits = useMemo(() => {
    if (raceTraitCards.length > 0) return raceTraitCards
    return raceTraitCardsFromText(raceTraitsText)
  }, [raceTraitCards, raceTraitsText])

  const showRace =
    (darkvision > 0 || resolvedRaceTraits.length > 0 || Boolean(defenseSummary)) &&
    (filter === 'all' || filter === 'class')
  const showBackground =
    Boolean(backgroundFeature) && (filter === 'all' || filter === 'class')
  const showFeats = filter === 'all' || filter === 'feats'
  const showCustom = filter === 'all' || filter === 'feats' || filter === 'custom'

  const extraAttackNote = useMemo(() => {
    const attacks = features.filter(
      (feature) =>
        feature.id.includes('extra_attack') ||
        feature.name_en?.toLowerCase() === 'extra attack',
    )
    if (attacks.length === 0) return null
    let best = 1
    for (const feature of attacks) {
      const raw = feature.scaleValue ?? feature.scale?.by_level?.[String(feature.level)]
      const n = raw ? Number(String(raw).replace(/[^\d]/g, '')) : 2
      if (Number.isFinite(n) && n > best) best = n
    }
    if (attacks.length === 1 && best <= 2) return null
    return `Атак за действие: ${best} (берётся максимум среди Extra Attack; уровни разных классов не складываются).`
  }, [features])

  const allToggleKeys = useMemo(() => {
    const keys: string[] = []
    for (const feature of visibleFeatures) {
      if (featureCanExpand(feature)) keys.push(featureRowKey(feature))
    }
    for (const trait of resolvedRaceTraits) keys.push(`race-trait:${trait.id}`)
    if (backgroundFeature) keys.push(`background-feature:${backgroundFeature.id}`)
    for (const row of customFeatures) keys.push(`custom:${row.id}`)
    return keys
  }, [visibleFeatures, resolvedRaceTraits, backgroundFeature, customFeatures])

  function toggleKey(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const empty =
    !showRace &&
    !showBackground &&
    visibleFeatures.length === 0 &&
    !(showFeats && namedFeats.length > 0) &&
    !(showCustom && customFeatures.length > 0)

  return (
    <Panel title="Способности" className="features-panel">
      <p className="features-panel__lede">
        Сводка умений класса, подкласса, предыстории, черт и расы. Нажми строку —
        полный текст; у ресурсов и выборов внутри ещё и кнопки.
      </p>

      <Stack gap={12}>
        {allToggleKeys.length > 0 ? (
          <div className="abil-column__toolbar features-panel__collapse-bar">
            <button type="button" onClick={() => setOpenKeys(new Set())}>
              ▲ Свернуть все
            </button>
            <button
              type="button"
              onClick={() => setOpenKeys(new Set(allToggleKeys))}
            >
              ▼ Развернуть все
            </button>
          </div>
        ) : null}

        {extraAttackNote ? <Text tone="muted">{extraAttackNote}</Text> : null}

        <Field label="Поиск">
          <Input
            value={search}
            placeholder="Избранный, стиль боя…"
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>

        <div className="inventory-filters" role="tablist" aria-label="Фильтр способностей">
          {FEATURE_FILTERS.map((row) => (
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

        {empty ? (
          <Text tone="muted">
            Пока нет открытых умений. Выбери класс/уровень — или смотри заметки в Общении.
          </Text>
        ) : null}

        {showRace ? (
          <div className="feature-group">
            <div className="feature-group__title">
              {raceName || 'Раса'}
              <span className="feature-group__count">
                {' '}
                · {(darkvision > 0 ? 1 : 0) + (defenseSummary ? 1 : 0) + resolvedRaceTraits.length}
              </span>
            </div>
            <div className="feature-list">
              {defenseSummary ? (
                <div className="feature-card feature-card--compact feature-card--static">
                  <div className="feature-card__glance">
                    <b className="feature-card__name">{defenseSummary}</b>
                    <span className="inventory-role inventory-role--other">защита</span>
                  </div>
                </div>
              ) : null}
              {darkvision > 0 ? (
                <div className="feature-card feature-card--compact feature-card--static">
                  <div className="feature-card__glance">
                    <b className="feature-card__name">Тёмное зрение {darkvision} фт.</b>
                    <span className="inventory-role inventory-role--other">раса</span>
                    <span className="inventory-card__glance-spacer" aria-hidden />
                    <span className="feature-card__preview">
                      в темноте на {darkvision} фт.
                    </span>
                  </div>
                </div>
              ) : null}
              {resolvedRaceTraits.map((trait) => {
                const key = `race-trait:${trait.id}`
                const open = openKeys.has(key)
                const preview = previewSummary(trait.summaryRu)
                const activatableRace = [
                  'healing_hands',
                  'celestial_revelation',
                  'radiant_soul',
                  'fey_step',
                  'blessing_of_the_raven_queen',
                  'stones_endurance',
                  'shifting',
                  'hungry_jaws',
                  'feline_agility',
                  'hidden_step',
                  'fey_gift',
                  'built_for_success',
                  'starlight_step',
                  'lucky_footwork',
                  'mingle_with_the_wind',
                  'merge_with_stone',
                  'forceful_presence',
                  'vengeful_assault',
                  'chromatic_warding',
                  'gem_flight',
                  'githzerai_shield',
                  'simic_carapace',
                ].includes(trait.id)
                if (!open) {
                  return (
                    <div key={key} className="feature-card feature-card--compact">
                      <button
                        type="button"
                        className="feature-card__glance"
                        onClick={() => toggleKey(key)}
                      >
                        <b className="feature-card__name">{trait.nameRu}</b>
                        <span className="inventory-role inventory-role--other">раса</span>
                        <span className="inventory-card__glance-spacer" aria-hidden />
                        <span className="feature-card__preview">{preview}</span>
                      </button>
                      <div className="inventory-card__glance-actions">
                        <button
                          type="button"
                          className="inventory-card__chevron-btn"
                          aria-label="Подробнее"
                          onClick={() => toggleKey(key)}
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={key} className="feature-card feature-card--expand">
                    <div className="feature-card__meta">
                      <span className="inventory-role inventory-role--other">раса</span>
                      <button
                        type="button"
                        className="inventory-card__collapse"
                        onClick={() => toggleKey(key)}
                      >
                        свернуть
                      </button>
                    </div>
                    <h3 className="feature-card__title">{trait.nameRu}</h3>
                    {summaryParagraphs(trait.summaryRu).map((paragraph, index) => (
                      <Text key={`${key}:p:${index}`}>{paragraph}</Text>
                    ))}
                    {onFeatureBuffApply && activatableRace ? (
                      <div className="chip-row" style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          className="sheet-chip"
                          onClick={() => {
                            onFeatureBuffApply({
                              featureId: `race:${trait.id}`,
                              featureNameRu: trait.nameRu,
                              classEntryId: 'race',
                              classLevel: characterLevel,
                            })
                          }}
                        >
                          Применить
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {showBackground && backgroundFeature ? (
          <div className="feature-group">
            <div className="feature-group__title">
              {backgroundName || 'Предыстория'}
              <span className="feature-group__count"> · 1</span>
            </div>
            <div className="feature-list">
              {(() => {
                const key = `background-feature:${backgroundFeature.id}`
                const open = openKeys.has(key)
                const preview = previewSummary(backgroundFeature.summaryRu)
                if (!open) {
                  return (
                    <div key={key} className="feature-card feature-card--compact">
                      <button
                        type="button"
                        className="feature-card__glance"
                        onClick={() => toggleKey(key)}
                      >
                        <b className="feature-card__name">{backgroundFeature.nameRu}</b>
                        <span className="inventory-role inventory-role--other">
                          предыстория
                        </span>
                        <span className="inventory-card__glance-spacer" aria-hidden />
                        <span className="feature-card__preview">{preview}</span>
                      </button>
                      <div className="inventory-card__glance-actions">
                        <button
                          type="button"
                          className="inventory-card__chevron-btn"
                          aria-label="Подробнее"
                          onClick={() => toggleKey(key)}
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={key} className="feature-card feature-card--expand">
                    <div className="feature-card__meta">
                      <span className="inventory-role inventory-role--other">
                        предыстория
                      </span>
                      <button
                        type="button"
                        className="inventory-card__collapse"
                        onClick={() => toggleKey(key)}
                      >
                        свернуть
                      </button>
                    </div>
                    <h3 className="feature-card__title">{backgroundFeature.nameRu}</h3>
                    <Text>{backgroundFeature.summaryRu}</Text>
                  </div>
                )
              })()}
            </div>
          </div>
        ) : null}

        {visibleByClass.map((group) => (
          <div key={group.classEntryId} className="feature-group">
            <div className="feature-group__title">
              {group.className} {group.classLevel}
              <span className="feature-group__count"> · {group.features.length}</span>
            </div>
            <div className="feature-list">
              {(() => {
                const collapseAsi =
                  !search.trim() &&
                  filter !== 'needs_setup' &&
                  filter !== 'choice' &&
                  filter !== 'active'
                const asiRows = collapseAsi
                  ? group.features.filter((feature) => isAsiFeature(feature))
                  : []
                const mainRows = collapseAsi
                  ? group.features.filter((feature) => !isAsiFeature(feature))
                  : group.features
                const asiPending = asiRows.filter(
                  (feature) =>
                    !findAppliedClassAsi(classAsi, feature.classEntryId, feature.id),
                ).length
                return (
                  <>
                    {asiRows.length > 0 ? (
                      <div className="feature-card feature-card--compact feature-card--static">
                        <button
                          type="button"
                          className="feature-card__glance"
                          onClick={() =>
                            setAsiOpenByClass((prev) => {
                              const next = new Set(prev)
                              if (next.has(group.classEntryId)) next.delete(group.classEntryId)
                              else next.add(group.classEntryId)
                              return next
                            })
                          }
                        >
                          <b className="feature-card__name">История повышений характеристик</b>
                          <span className="inventory-role inventory-role--armor">Увел. характеристик</span>
                          <span className="inventory-card__glance-spacer" aria-hidden />
                          <span className="feature-card__preview">
                            {asiRows.length} запис.
                            {asiPending > 0 ? ` · нужно настроить: ${asiPending}` : ''}
                            {asiOpenByClass.has(group.classEntryId)
                              ? ' · свернуть'
                              : ' · показать'}
                          </span>
                        </button>
                      </div>
                    ) : null}
                    {(asiOpenByClass.has(group.classEntryId) ? asiRows : [])
                      .concat(mainRows)
                      .map((feature) => {
                        const key = featureRowKey(feature)
                        return (
                          <FeatureRow
                            key={key}
                            feature={feature}
                            unlockedFeatures={features}
                            classSlug={
                              slugByEntry.get(feature.classEntryId) || group.classSlug
                            }
                            open={openKeys.has(key)}
                            onToggle={() => toggleKey(key)}
                            resources={resources}
                            onResourcesChange={onResourcesChange}
                            featurePicks={featurePicks}
                            onFeaturePicksChange={onFeaturePicksChange}
                            spells={spells}
                            onSpellsChange={onSpellsChange}
                            skills={skills}
                            tools={tools}
                            expertiseKeys={expertiseKeys}
                            classAsi={classAsi}
                            companions={companions}
                            onCompanionsChange={onCompanionsChange}
                            onToast={onToast}
                            initiativeGrantByPool={initiativeGrantByPool}
                            wearingHeavyArmor={wearingHeavyArmor}
                            onOpenInfusions={onOpenInfusions}
                            onOpenInvocations={onOpenInvocations}
                            onOpenSoulTrinkets={onOpenSoulTrinkets}
                            onOpenRangerFavored={onOpenRangerFavored}
                            onCastPactChainFamiliar={onCastPactChainFamiliar}
                            onWildShapeFork={onWildShapeFork}
                            onOpenRecovery={onOpenRecovery}
                            hpCurrent={hpCurrent}
                            hpMax={hpMax}
                            onHpChange={onHpChange}
                            onFeatureSelfForm={onFeatureSelfForm}
                            onWizardFeatureUse={onWizardFeatureUse}
                            moonCombatWildShape={moonCombatWildShape}
                            onMoonFormSlotHeal={onMoonFormSlotHeal}
                            divineSmiteIntent={divineSmiteIntent}
                            onDivineSmiteIntent={onDivineSmiteIntent}
                            inventoryItems={inventoryItems}
                            onInventoryChange={onInventoryChange}
                            concentration={concentration}
                            onConcentrationChange={onConcentrationChange}
                            classes={classes}
                            featGrants={featGrants}
                            characterLevel={characterLevel}
                            onFeatureBuffApply={onFeatureBuffApply}
                            charismaScore={abilities?.cha}
                            wisdomScore={abilities?.wis}
                            edition={edition}
                          />
                        )
                      })}
                  </>
                )
              })()}
            </div>
          </div>
        ))}

        {showFeats && namedFeats.length > 0 ? (
          <div className="feature-group">
            <div className="feature-group__title">
              Черты
              <span className="feature-group__count"> · {namedFeats.length}</span>
            </div>
            <div className="feature-list">
              {namedFeats.map((feat) => {
                const key = `feat:${feat.id}`
                const open = openKeys.has(key)
                const body =
                  feat.applied.benefitsRu || feat.applied.summaryRu || featSourceLabel(feat.source)
                const preview =
                  previewSummary(feat.applied.summaryRu || feat.applied.benefitsRu) ||
                  featSourceLabel(feat.source)
                if (!open) {
                  return (
                    <div key={feat.id} className="feature-card feature-card--compact">
                      <button
                        type="button"
                        className="feature-card__glance"
                        onClick={() => toggleKey(key)}
                      >
                        <b className="feature-card__name">{feat.nameRu}</b>
                        <span className="inventory-role inventory-role--weapon">черта</span>
                        <span className="inventory-card__glance-spacer" aria-hidden />
                        <span className="feature-card__preview">{preview}</span>
                      </button>
                      <div className="inventory-card__glance-actions">
                        <button
                          type="button"
                          className="inventory-card__chevron-btn"
                          aria-label="Подробнее"
                          onClick={() => toggleKey(key)}
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={feat.id} className="feature-card feature-card--expand">
                    <div className="feature-card__meta">
                      <span className="inventory-role inventory-role--weapon">черта</span>
                      <span className="attack-held-tag">
                        {featSourceLabel(feat.source)}
                      </span>
                      <button
                        type="button"
                        className="inventory-card__collapse"
                        onClick={() => toggleKey(key)}
                      >
                        свернуть
                      </button>
                    </div>
                    <h3 className="feature-card__title">{feat.nameRu}</h3>
                    <Text>{body}</Text>
                    {onFeatureBuffApply &&
                    [
                      'inspiring_leader',
                      'chef',
                      'defensive_duelist',
                      'gift_of_the_metallic_dragon',
                      'gift_of_the_chromatic_dragon',
                      'bountiful_luck',
                      'second_chance',
                      'strike_of_the_giants',
                      'squire_of_solamnia',
                      'knight_of_the_crown',
                      'knight_of_the_rose',
                      'knight_of_the_sword',
                      'adept_of_the_white_robes',
                      'adept_of_the_red_robes',
                      'flames_of_phlegethos',
                    ].includes(String(feat.slug || '').toLowerCase()) ? (
                      <div className="chip-row" style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          className="sheet-chip"
                          onClick={() => {
                            const slug = String(feat.slug || '').toLowerCase()
                            const featureId =
                              slug === 'gift_of_the_metallic_dragon'
                                ? 'protective_wings'
                                : slug === 'gift_of_the_chromatic_dragon'
                                  ? 'chromatic_resistance'
                                  : slug === 'squire_of_solamnia'
                                    ? 'precise_strike'
                                    : slug === 'knight_of_the_crown'
                                      ? 'commanding_rally'
                                      : slug === 'knight_of_the_rose'
                                        ? 'bolstering_rally'
                                        : slug === 'knight_of_the_sword'
                                          ? 'demoralizing_strike'
                                          : slug === 'adept_of_the_white_robes'
                                            ? 'protective_ward'
                                            : slug === 'adept_of_the_red_robes'
                                              ? 'magical_balance'
                                              : slug
                            onFeatureBuffApply({
                              featureId: `feat:${featureId}`,
                              featureNameRu: feat.nameRu,
                              classEntryId: 'feat',
                              classLevel: characterLevel,
                            })
                          }}
                        >
                          Применить
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {showCustom && onCustomFeaturesChange ? (
          <div className="feature-group">
            <div className="feature-group__title">
              Свои способности
              <span className="feature-group__count"> · {customFeatures.length}</span>
            </div>
            <div className="feature-list">
              {customFeatures.map((row) => {
                const key = `custom:${row.id}`
                const open = openKeys.has(key)
                if (!open) {
                  return (
                    <div key={row.id} className="feature-card feature-card--compact">
                      <button
                        type="button"
                        className="feature-card__glance"
                        onClick={() => toggleKey(key)}
                      >
                        <b className="feature-card__name">{row.nameRu}</b>
                        <span className="inventory-role inventory-role--other">своё</span>
                        <span className="inventory-card__glance-spacer" aria-hidden />
                        <span className="feature-card__preview">
                          {previewSummary(row.summaryRu) || 'без описания'}
                        </span>
                      </button>
                      <div className="inventory-card__glance-actions">
                        <button
                          type="button"
                          className="inventory-card__chevron-btn"
                          aria-label="Подробнее"
                          onClick={() => toggleKey(key)}
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={row.id} className="feature-card feature-card--expand">
                    <div className="feature-card__meta">
                      <span className="inventory-role inventory-role--other">своё</span>
                      <button
                        type="button"
                        className="inventory-card__collapse"
                        onClick={() => toggleKey(key)}
                      >
                        свернуть
                      </button>
                    </div>
                    <h3 className="feature-card__title">{row.nameRu}</h3>
                    <Text>{row.summaryRu || '—'}</Text>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        onCustomFeaturesChange(
                          customFeatures.filter((item) => item.id !== row.id),
                        )
                      }
                    >
                      Убрать
                    </Button>
                  </div>
                )
              })}
              <Stack gap={8}>
                <Field label="Название">
                  <Input
                    value={customDraftName}
                    placeholder="Например: Благословение храма"
                    onChange={(event) => setCustomDraftName(event.target.value)}
                  />
                </Field>
                <Field label="Описание">
                  <Input
                    value={customDraftSummary}
                    placeholder="Что делает способность"
                    onChange={(event) => setCustomDraftSummary(event.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!customDraftName.trim()}
                  onClick={() => {
                    const nameRu = customDraftName.trim()
                    if (!nameRu) return
                    onCustomFeaturesChange([
                      ...customFeatures,
                      {
                        id: newCustomFeatureId(),
                        nameRu,
                        summaryRu: customDraftSummary.trim(),
                      },
                    ])
                    setCustomDraftName('')
                    setCustomDraftSummary('')
                    onToast?.(`Своя способность «${nameRu}»`)
                  }}
                >
                  Добавить способность
                </Button>
              </Stack>
            </div>
          </div>
        ) : null}
      </Stack>
    </Panel>
  )
}
