import { useMemo, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  kindLabelRu,
  resolveClassFeatureSlug,
  unlockFeaturesForClasses,
  type UnlockedFeature,
} from '../../shared/dnd/classFeatures'
import {
  consumeStock,
  findFeatureResource,
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
}: {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  onToast?: (message: string) => void
}) {
  const resource = feature.resource
  if (!resource?.pool_id) return null

  const pool = findFeatureResource(
    resources,
    classSlug,
    resource.pool_id,
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
            + частица (смерть рядом)
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
                  ? 'Частица сожжена (вопрос духу / вручную)'
                  : result.message,
              )
            }}
          >
            Сжечь частицу
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
  const linkedLeft = stockCurrent(linkedPool)
  const canViaLinked = remaining <= 0 && linkedLeft > 0

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
      {linked ? (
        <Text tone="muted">
          Сверх лимита: {linked.label_ru}
          {linkedPool ? ` (${linkedLeft}/${linkedPool.max})` : ' (с 9 ур.)'}
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
              onToast?.(
                result.via === 'linked_stock'
                  ? `Вопль через частицу души${feature.scaleValue ? ` · ${feature.scaleValue}` : ''}`
                  : `Могильный вопль${feature.scaleValue ? ` · ${feature.scaleValue}` : ''}`,
              )
            } else {
              onToast?.(result.message)
            }
          }}
        >
          {canViaLinked ? 'Вопль (сжечь частицу)' : 'Использовать'}
        </Button>
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
}: {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  onToast?: (message: string) => void
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
          />
        </div>
      ) : null}
    </div>
  )
}

export function ClassFeaturesPanel({
  classes,
  characterLevel,
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
        subclassSlugByEntryId,
      }),
    [classes, characterLevel, subclassSlugByEntryId],
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

  return (
    <Panel title="Умения классов">
      <Stack gap={14}>
        <Text tone="muted">
          Открываются по уровню и архетипу. Скрытая атака и вопли показывают актуальный урон;
          ресурсы (в т.ч. частицы души Фантома) трекаются здесь и сбрасываются на отдыхе в блоке
          боя.
        </Text>

        {byClass.length === 0 ? (
          <Text tone="muted">
            Пока нет известных пакетов умений (сейчас заполнен Плут: PHB + Фантом). Выбери класс из
            справочника и поднимай уровень.
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
                />
              ))}
            </div>
          </div>
        ))}
      </Stack>
    </Panel>
  )
}
