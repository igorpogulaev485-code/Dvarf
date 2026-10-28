import { useMemo } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  listSuperioritySpendOptions,
  superiorityDieLabel,
} from '../../shared/dnd/superiorityDiceSpend'
import { Button, Dialog, Stack, Text } from '../../ui'

type SuperiorityDiceSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  features: UnlockedFeature[]
  featurePicks: FeaturePicksState
  onSpend: (label: string, cost: number) => void
  onToast: (message: string) => void
  onClose: () => void
}

function parseSuperiorityResourceId(
  id: string,
): { classSlug: string; classEntryId: string } | null {
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const classSlug = parts[0]!
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (poolId !== 'superiority_dice') return null
  return { classSlug, classEntryId }
}

export function SuperiorityDiceSpendDialog({
  open,
  resource,
  features,
  featurePicks,
  onSpend,
  onToast,
  onClose,
}: SuperiorityDiceSpendDialogProps) {
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const parsed = resource ? parseSuperiorityResourceId(resource.id) : null

  const options = useMemo(() => {
    if (!parsed) return []
    return listSuperioritySpendOptions({
      features,
      featurePicks,
      classEntryId: parsed.classEntryId,
    })
  }, [features, featurePicks, parsed])

  const dieLabel = parsed
    ? superiorityDieLabel(features, parsed.classEntryId)
    : null

  function spend(label: string, cost: number) {
    if (remaining <= 0) {
      onToast('Нет костей превосходства')
      return
    }
    if (cost > remaining) {
      onToast(`Не хватает костей (нужно ${cost}, есть ${remaining})`)
      return
    }
    onSpend(label, cost)
  }

  return (
    <Dialog
      open={open}
      title="Кости превосходства"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Сейчас {remaining}/{resource?.max ?? 0}
          {dieLabel ? ` · кость ${dieLabel}` : ''}. Выбери манёвр.
        </Text>

        {options.length === 0 ? (
          <Text tone="muted">
            Нет известных манёвров — выбери их в умениях (Боевое превосходство, с 3
            ур. Мастера боя).
          </Text>
        ) : (
          <div className="sorcery-spend-list">
            {options.map((option) => (
              <div key={option.key} className="sorcery-spend-row">
                <div className="sorcery-spend-row__text">
                  <b>{option.nameRu}</b>
                  <span>{option.summaryRu}</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={option.cost > remaining}
                  onClick={() => spend(option.nameRu, option.cost)}
                >
                  −{option.cost}
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          disabled={remaining <= 0}
          onClick={() => spend(resource?.name || 'Кость превосходства', 1)}
        >
          Просто −1 кость
        </Button>
      </Stack>
    </Dialog>
  )
}
