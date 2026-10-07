import { useMemo, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  kindLabelRu,
  unlockFeaturesForClasses,
  type UnlockedFeature,
} from '../../shared/dnd/classFeatures'
import { Panel, Stack, Text } from '../../ui'

type ClassFeaturesPanelProps = {
  classes: ClassLevelEntry[]
  subclassSlugByEntryId?: Record<string, string | null | undefined>
}

function FeatureRow({ feature }: { feature: UnlockedFeature }) {
  const [open, setOpen] = useState(false)
  const sourceLabel =
    feature.source === 'subclass'
      ? `${feature.className} · ${feature.subclassName || feature.subclassSlug || 'архетип'}`
      : feature.className

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
          {feature.resourceUses != null ? ` · ${feature.resourceUses}×` : ''}
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
        </div>
      ) : null}
    </div>
  )
}

export function ClassFeaturesPanel({
  classes,
  subclassSlugByEntryId,
}: ClassFeaturesPanelProps) {
  const features = useMemo(
    () => unlockFeaturesForClasses({ classes, subclassSlugByEntryId }),
    [classes, subclassSlugByEntryId],
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
      features: list,
    }))
  }, [features])

  return (
    <Panel title="Умения классов">
      <Stack gap={14}>
        <Text tone="muted">
          Открываются автоматически по уровню класса и выбранному архетипу. Скрытая атака и
          подобные показывают актуальное значение.
        </Text>

        {byClass.length === 0 ? (
          <Text tone="muted">
            Пока нет известных пакетов умений (сейчас заполнен Плут). Выбери класс из справочника
            и поднимай уровень.
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
                />
              ))}
            </div>
          </div>
        ))}
      </Stack>
    </Panel>
  )
}
