import { useMemo, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  kindLabelRu,
  resolveChoiceMaxPicks,
  resolveClassFeatureSlug,
  resolveFeatureChoiceOptions,
  slotSpendDiceCount,
  slotSpendHasDice,
  unlockFeaturesForClasses,
  type AbilityScoreKey,
  type UnlockedFeature,
} from '../../shared/dnd/classFeatures'
import {
  ARMORER_ARMOR_MODELS,
  infusionById,
  infusionLabel,
} from '../../shared/dnd/artificerInfusions'
import {
  elementalDisciplineById,
  elementalDisciplineLabel,
} from '../../shared/dnd/monkElementalDisciplines'
import { druidLandLabel } from '../../shared/dnd/druidLandChoices'
import { rangerChoiceLabel } from '../../shared/dnd/rangerChoices'
import {
  FLEXIBLE_CASTING_SLOT_COST,
  metamagicById,
  metamagicLabel,
  metamagicSpendCost,
} from '../../shared/dnd/sorcererMetamagic'
import {
  invocationById,
  invocationLabel,
  WARLOCK_PACT_BOONS,
} from '../../shared/dnd/warlockInvocations'
import { canSpendSlot, spendSpellSlot, slotsRemaining } from '../../shared/dnd/spells'
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
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  toggleFeaturePickInList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { fightingStyleById } from '../../shared/dnd/fightingStyles'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Panel, Stack, Text } from '../../ui'
import { SlotPips } from '../../ui/SlotPips'
import type { SpellsState } from './spells'
import { abilityModifier } from './sheetTypes'

type ClassFeaturesPanelProps = {
  classes: ClassLevelEntry[]
  characterLevel: number
  abilities?: Partial<Record<AbilityScoreKey, number>>
  subclassSlugByEntryId?: Record<string, string | null | undefined>
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  spells: SpellsState
  onSpellsChange: (spells: SpellsState) => void
  onToast?: (message: string) => void
}

function FeatureResourceControls({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  onToast,
  initiativeGrantByPool,
}: {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  onToast?: (message: string) => void
  initiativeGrantByPool: Map<string, number>
}) {
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

  if (resource.track === 'stock') {
    const current = stockCurrent(pool)
    return (
      <div className="feature-resource">
        <Text>
          {pool.name}: <strong>{current}</strong> / {pool.max}
        </Text>
        <div className="feature-resource__actions">
          <Button
            type="button"
            disabled={current >= pool.max}
            onClick={() => {
              const result = spendFeatureUse({ resources, feature, classSlug })
              onResourcesChange(result.resources)
              if (result.message) onToast?.(result.message)
            }}
          >
            {resource.stock_gain_label_ru || `+ ${pool.name}`}
          </Button>
          <Button
            type="button"
            disabled={current <= 0}
            onClick={() => {
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
            {resource.stock_spend_label_ru || `− ${pool.name}`}
          </Button>
        </div>
      </div>
    )
  }

  const remaining = spendRemaining(pool)
  const linked = resource.linked_spend
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
  const canViaLinked = remaining <= 0 && linkedLeft > 0
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

  return (
    <div className="feature-resource">
      <SlotPips
        max={pool.max}
        used={pool.used}
        label={`${pool.name}: потрачено ${pool.used}/${pool.max}`}
        onChange={(used) =>
          onResourcesChange(
            resources.map((row) => (row.id === pool.id ? { ...row, used } : row)),
          )
        }
      />
      {feature.scaleValue ? (
        <Text tone="muted">
          Сейчас: <strong>{feature.scaleValue}</strong>
        </Text>
      ) : null}
      {linked ? (
        <Text tone="muted">
          Сверх лимита: {linked.label_ru}
          {linkedPool ? ` (${linkedLeft} доступно)` : ''}
        </Text>
      ) : null}
      {lockedBySuccess ? (
        <Text tone="muted">Заблокировано после успеха — снимите блок через 7 дней.</Text>
      ) : null}
      <div className="feature-resource__actions">
        {successLock ? (
          <>
            <Button
              type="button"
              disabled={remaining <= 0 || lockedBySuccess}
              onClick={() => {
                const result = spendFeatureUseWithOutcome({
                  resources,
                  feature,
                  classSlug,
                  outcome: 'failure',
                })
                onResourcesChange(result.resources)
                onToast?.(result.message)
              }}
            >
              {resource.failure_spend_label_ru || 'Провал'}
            </Button>
            <Button
              type="button"
              disabled={remaining <= 0 || lockedBySuccess}
              onClick={() => {
                const result = spendFeatureUseWithOutcome({
                  resources,
                  feature,
                  classSlug,
                  outcome: 'success',
                })
                onResourcesChange(result.resources)
                onToast?.(result.message)
              }}
            >
              {successLock.label_ru}
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
        ) : (
          <Button
            type="button"
            disabled={remaining <= 0 && !canViaLinked}
            onClick={() => {
              const result = spendFeatureUse({ resources, feature, classSlug })
              onResourcesChange(result.resources)
              if (result.ok) {
                const via =
                  result.via === 'linked_stock' ? ` (${linked?.label_ru})` : ''
                onToast?.(
                  `${feature.name_ru}${via}${feature.scaleValue ? ` · ${feature.scaleValue}` : ''}`,
                )
              } else {
                onToast?.(result.message)
              }
            }}
          >
            {canViaLinked ? linked?.label_ru || 'Сверх лимита' : 'Использовать'}
          </Button>
        )}
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

const FEATURE_OPTION_LABELS_RU: Record<string, string> = {
  bear: 'Медведь',
  eagle: 'Орёл',
  wolf: 'Волк',
  desert: 'Пустыня',
  sea: 'Море',
  tundra: 'Тундра',
  bite: 'Укус',
  claws: 'Когти',
  tail: 'Хвост',
  acid: 'Кислота',
  cold: 'Холод',
  fire: 'Огонь',
  lightning: 'Молния',
  thunder: 'Гром',
  colossus_slayer: 'Убийца колосса',
  giant_killer: 'Убийца великанов',
  horde_breaker: 'Крушитель орды',
  escape_the_horde: 'Побег от орды',
  multiattack_defense: 'Защита от мультиатаки',
  steel_will: 'Стальная воля',
  volley: 'Залп',
  whirlwind: 'Вихрь',
  evasion: 'Уклонение',
  stand_against_the_tide: 'Стойкость против волны',
  uncanny_dodge: 'Невероятное уклонение',
}

function choiceOptionLabel(optionId: string): string {
  const pact = WARLOCK_PACT_BOONS.find((row) => row.id === optionId)
  const armorModel = ARMORER_ARMOR_MODELS.find((row) => row.id === optionId)
  return (
    fightingStyleById(optionId)?.nameRu ||
    rangerChoiceLabel(optionId) ||
    druidLandLabel(optionId) ||
    metamagicLabel(optionId) ||
    invocationLabel(optionId) ||
    infusionLabel(optionId) ||
    elementalDisciplineLabel(optionId) ||
    pact?.nameRu ||
    armorModel?.nameRu ||
    FEATURE_OPTION_LABELS_RU[optionId] ||
    optionId
  )
}

function FeatureChoiceControls({
  feature,
  featurePicks,
  onFeaturePicksChange,
  onToast,
}: {
  feature: UnlockedFeature
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onToast?: (message: string) => void
}) {
  const choice = feature.choice
  if (!choice) return null
  const options = resolveFeatureChoiceOptions(choice)
  const maxPicks = resolveChoiceMaxPicks(choice, feature.classLevel)
  const multi = maxPicks > 1 || Boolean(choice.max_picks_by_level)
  const selectedList = multi
    ? getFeaturePickList(featurePicks, feature.classEntryId, feature.id)
    : []
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
  const useSelect = !multi && options.length > 6

  return (
    <div className="feature-resource">
      <Text>
        {choice.label_ru}
        {multi ? ` (${selectedList.length}/${maxPicks})` : ''}
        {selectedLabel ? (
          <>
            : <strong>{selectedLabel}</strong>
          </>
        ) : (
          ' — не выбран'
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
                {inf.minLevel ? ` (с ${inf.minLevel} ур.)` : ''}: {inf.summaryRu}
              </Text>
            )
          })
        : null}
      {choice?.options_from === 'monk_elemental_disciplines'
        ? selectedList.map((id) => {
            const disc = elementalDisciplineById(id)
            if (!disc) return null
            const cost =
              disc.kiCost == null ? 'бесплатно' : `${disc.kiCost} ки`
            const prereq = disc.minLevel ? `с ${disc.minLevel} ур.; ` : ''
            return (
              <Text key={id} tone="muted">
                {disc.nameRu} ({prereq}
                {cost}): {disc.summaryRu}
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
            {options.map((optionId) => (
              <option key={optionId} value={optionId}>
                {choiceOptionLabel(optionId)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="feature-resource__actions">
          {options.map((optionId) => {
            const label = choiceOptionLabel(optionId)
            const active = multi
              ? selectedList.includes(optionId)
              : selected === optionId
            return (
              <Button
                key={optionId}
                type="button"
                disabled={!multi && active}
                onClick={() => {
                  if (multi) {
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
                {active && multi ? `✓ ${label}` : label}
              </Button>
            )
          })}
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
      <Text tone="muted">Очки → ячейка (стоимость PHB)</Text>
      <div className="feature-resource__actions">
        {[1, 2, 3, 4, 5].map((level) => {
          const cost = FLEXIBLE_CASTING_SLOT_COST[level] ?? 99
          const slot = spells.slots[String(level)]
          const canRegain = Boolean(slot && slot.used > 0)
          return (
            <Button
              key={`to-slot-${level}`}
              type="button"
              disabled={left < cost || !canRegain}
              title={
                canRegain
                  ? undefined
                  : 'Нет потраченной ячейки этого уровня — сначала потрать ячейку или увеличь max вручную'
              }
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
                const key = String(level)
                const current = spells.slots[key] ?? { max: 0, used: 0 }
                if (current.used <= 0) {
                  onToast?.('Нет потраченной ячейки для восстановления')
                  return
                }
                onResourcesChange(spResult.resources)
                onSpellsChange({
                  ...spells,
                  slots: {
                    ...spells.slots,
                    [key]: {
                      max: current.max,
                      used: Math.max(0, current.used - 1),
                    },
                  },
                })
                onToast?.(
                  `Очки→ячейка ${level}: −${cost} очк., ячейка восстановлена (${slotsRemaining({ max: current.max, used: current.used - 1 })} св.)`,
                )
              }}
            >
              −{cost}→{level} ур.
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
}: {
  feature: UnlockedFeature
  spells: SpellsState
  onSpellsChange: (spells: SpellsState) => void
  onToast?: (message: string) => void
}) {
  const spend = feature.slot_spend
  if (!spend) return null

  const levels: number[] = []
  for (let level = spend.min_slot; level <= spend.max_slot; level += 1) {
    levels.push(level)
  }

  return (
    <div className="feature-resource">
      <Text tone="muted">
        {spend.label_ru}
        {spend.extra_vs_note_ru ? ` · ${spend.extra_vs_note_ru}` : ''}
      </Text>
      <div className="feature-resource__actions">
        {levels.map((level) => {
          const withDice = slotSpendHasDice(spend)
          const dice = withDice ? slotSpendDiceCount(spend, level) : 0
          const available = canSpendSlot(spells.slots, level)
          return (
            <Button
              key={level}
              type="button"
              disabled={!available}
              onClick={() => {
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
      </div>
    </div>
  )
}

function FeatureRow({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  featurePicks,
  onFeaturePicksChange,
  spells,
  onSpellsChange,
  onToast,
  initiativeGrantByPool,
}: {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  spells: SpellsState
  onSpellsChange: (spells: SpellsState) => void
  onToast?: (message: string) => void
  initiativeGrantByPool: Map<string, number>
}) {
  const [open, setOpen] = useState(false)
  const sourceLabel =
    feature.source === 'subclass'
      ? `${feature.className} · ${feature.subclassName || feature.subclassSlug || 'архетип'}`
      : feature.className

  const pool = feature.resource?.pool_id
    ? findFeatureResource(
        resources,
        classSlug,
        feature.resource.pool_id,
        feature.classEntryId,
      )
    : null

  const choiceMulti =
    feature.choice &&
    (Boolean(feature.choice.max_picks_by_level) ||
      resolveChoiceMaxPicks(feature.choice, feature.classLevel) > 1)
  const choicePick = feature.choice
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

  let metaExtra = ''
  if (choiceLabel) {
    metaExtra = ` · ${choiceLabel}`
  } else if (feature.resource?.track === 'stock' && pool) {
    metaExtra = ` · ${stockCurrent(pool)}/${pool.max}`
  } else if (feature.resourceUses != null) {
    metaExtra = pool
      ? ` · ${spendRemaining(pool)}/${pool.max}`
      : ` · ${feature.resourceUses}×`
  } else if (feature.save_bonus_self) {
    metaExtra = ` · ${feature.save_bonus_self.label_ru}`
  }

  return (
    <div className="feature-row">
      <button
        type="button"
        className="feature-row__head"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="feature-row__level">{feature.level}</span>
        <span className="feature-row__title">
          {feature.name_ru}
          {feature.scaleValue ? (
            <strong className="feature-row__scale"> · {feature.scaleValue}</strong>
          ) : null}
        </span>
        <span className="feature-row__meta">
          {kindLabelRu(feature.kind)}
          {metaExtra}
        </span>
      </button>
      {open ? (
        <div className="feature-row__body">
          <Text tone="muted">{sourceLabel}</Text>
          <Text>{feature.summary_ru}</Text>
          {feature.body_ru ? <Text tone="muted">{feature.body_ru}</Text> : null}
          {feature.scale ? (
            <Text tone="muted">
              {feature.scale.labelRu}: сейчас <strong>{feature.scaleValue}</strong>
            </Text>
          ) : null}
          <FeatureChoiceControls
            feature={feature}
            featurePicks={featurePicks}
            onFeaturePicksChange={onFeaturePicksChange}
            onToast={onToast}
          />
          <MetamagicSpendControls
            feature={feature}
            featurePicks={featurePicks}
            classSlug={classSlug}
            resources={resources}
            onResourcesChange={onResourcesChange}
            onToast={onToast}
          />
          <FlexibleCastingControls
            feature={feature}
            classSlug={classSlug}
            resources={resources}
            onResourcesChange={onResourcesChange}
            spells={spells}
            onSpellsChange={onSpellsChange}
            onToast={onToast}
          />
          <FeatureSlotSpendControls
            feature={feature}
            spells={spells}
            onSpellsChange={onSpellsChange}
            onToast={onToast}
          />
          <FeatureResourceControls
            feature={feature}
            classSlug={classSlug}
            resources={resources}
            onResourcesChange={onResourcesChange}
            onToast={onToast}
            initiativeGrantByPool={initiativeGrantByPool}
          />
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
  resources,
  onResourcesChange,
  featurePicks,
  onFeaturePicksChange,
  spells,
  onSpellsChange,
  onToast,
}: ClassFeaturesPanelProps) {
  const features = useMemo(
    () =>
      unlockFeaturesForClasses({
        classes,
        characterLevel,
        abilities,
        subclassSlugByEntryId,
      }),
    [classes, characterLevel, abilities, subclassSlugByEntryId],
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

  return (
    <Panel title="Умения классов">
      <Stack gap={14}>
        <Text tone="muted">
          Unlock по уровню и архетипу. Ресурсы (PB, 2×PB, кости, частицы) синхронизируются в лист;
          отдых — в блоке боя. Контракт: docs/feature_resource_contract.md
        </Text>

        {byClass.length === 0 ? (
          <Text tone="muted">
            Пока заполнены: … Волшебник, Изобретатель (H4 в docs/feature_resource_contract.md).
          </Text>
        ) : null}

        {byClass.map((group) => (
          <div key={group.classEntryId} className="feature-group">
            <div className="feature-group__title">
              {group.className} {group.classLevel}
              <span className="feature-group__count"> · {group.features.length}</span>
            </div>
            <div className="feature-list">
              {group.features.map((feature) => (
                <FeatureRow
                  key={`${feature.classEntryId}:${feature.source}:${feature.id}`}
                  feature={feature}
                  classSlug={group.classSlug}
                  resources={resources}
                  onResourcesChange={onResourcesChange}
                  featurePicks={featurePicks}
                  onFeaturePicksChange={onFeaturePicksChange}
                  spells={spells}
                  onSpellsChange={onSpellsChange}
                  onToast={onToast}
                  initiativeGrantByPool={initiativeGrantByPool}
                />
              ))}
            </div>
          </div>
        ))}
      </Stack>
    </Panel>
  )
}
