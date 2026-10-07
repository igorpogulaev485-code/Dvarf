import { useMemo, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  kindLabelRu,
  resolveClassFeatureSlug,
  resolveFeatureChoiceOptions,
  slotSpendDiceCount,
  slotSpendHasDice,
  unlockFeaturesForClasses,
  type AbilityScoreKey,
  type UnlockedFeature,
} from '../../shared/dnd/classFeatures'
import { rangerChoiceLabel } from '../../shared/dnd/rangerChoices'
import {
  clearSuccessLock,
  consumeStock,
  findFeatureResource,
  grantOneOnInitiativeIfEmpty,
  recoverOneFromPool,
  spendFeatureUse,
  spendFeatureUseWithOutcome,
  spendRemaining,
  stockCurrent,
} from '../../shared/dnd/featureResources'
import {
  getFeaturePick,
  setFeaturePick,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { fightingStyleById } from '../../shared/dnd/fightingStyles'
import type { SheetResource } from '../../shared/dnd/rest'
import { canSpendSlot, spendSpellSlot } from '../../shared/dnd/spells'
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

function choiceOptionLabel(optionId: string): string {
  return (
    fightingStyleById(optionId)?.nameRu ||
    rangerChoiceLabel(optionId) ||
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
  const selected = getFeaturePick(featurePicks, feature.classEntryId, feature.id)
  const selectedDef = fightingStyleById(selected)
  const selectedLabel = selected ? choiceOptionLabel(selected) : null
  const useSelect = options.length > 6

  return (
    <div className="feature-resource">
      <Text>
        {choice.label_ru}
        {selectedLabel ? (
          <>
            : <strong>{selectedLabel}</strong>
          </>
        ) : (
          ' — не выбран'
        )}
      </Text>
      {selectedDef ? <Text tone="muted">{selectedDef.summaryRu}</Text> : null}
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
            const active = selected === optionId
            return (
              <Button
                key={optionId}
                type="button"
                disabled={active}
                onClick={() => {
                  onFeaturePicksChange(
                    setFeaturePick(featurePicks, feature.classEntryId, feature.id, optionId),
                  )
                  onToast?.(`${choice.label_ru}: ${label}`)
                }}
              >
                {label}
              </Button>
            )
          })}
        </div>
      )}
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

  const choicePick = feature.choice
    ? getFeaturePick(featurePicks, feature.classEntryId, feature.id)
    : null
  const choiceLabel = choicePick ? choiceOptionLabel(choicePick) : null

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
            Пока заполнены: Плут, Воин, Варвар, Монах, Жрец, Паладин, Следопыт
            (H4 в docs/feature_resource_contract.md).
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
