import { useMemo, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  kindLabelRu,
  resolveClassFeatureSlug,
  unlockFeaturesForClasses,
  type AbilityScoreKey,
  type UnlockedFeature,
} from '../../shared/dnd/classFeatures'
import {
  consumeStock,
  findFeatureResource,
  grantOneOnInitiativeIfEmpty,
  recoverOneFromPool,
  spendFeatureUse,
  spendRemaining,
  stockCurrent,
} from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Panel, Stack, Text } from '../../ui'
import { SlotPips } from '../../ui/SlotPips'

type ClassFeaturesPanelProps = {
  classes: ClassLevelEntry[]
  characterLevel: number
  abilities?: Partial<Record<AbilityScoreKey, number>>
  subclassSlugByEntryId?: Record<string, string | null | undefined>
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
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
      <div className="feature-resource__actions">
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

function FeatureRow({
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

  let metaExtra = ''
  if (feature.resource?.track === 'stock' && pool) {
    metaExtra = ` · ${stockCurrent(pool)}/${pool.max}`
  } else if (feature.resourceUses != null) {
    metaExtra = pool
      ? ` · ${spendRemaining(pool)}/${pool.max}`
      : ` · ${feature.resourceUses}×`
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

export function ClassFeaturesPanel({
  classes,
  characterLevel,
  abilities,
  subclassSlugByEntryId,
  resources,
  onResourcesChange,
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
            Пока заполнены: Плут, Воин, Варвар, Монах, Жрец (H4 в docs/feature_resource_contract.md).
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
