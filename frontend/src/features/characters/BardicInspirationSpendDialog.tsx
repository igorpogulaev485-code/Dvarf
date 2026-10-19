import { useMemo } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import {
  bardicInspirationDieLabel,
  listBardicInspirationSpendOptions,
} from '../../shared/dnd/bardInspirationSpend'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Stack, Text } from '../../ui'

type BardicInspirationSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  features: UnlockedFeature[]
  onSpend: (label: string, cost: number) => void
  onToast: (message: string) => void
  onClose: () => void
}

function parseBiResourceId(
  id: string,
): { classSlug: string; classEntryId: string } | null {
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const classSlug = parts[0]!
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (poolId !== 'bardic_inspiration') return null
  return { classSlug, classEntryId }
}

export function BardicInspirationSpendDialog({
  open,
  resource,
  features,
  onSpend,
  onToast,
  onClose,
}: BardicInspirationSpendDialogProps) {
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const parsed = resource ? parseBiResourceId(resource.id) : null

  const options = useMemo(() => {
    if (!parsed) return []
    return listBardicInspirationSpendOptions(features).filter(
      (row) => row.classEntryId === parsed.classEntryId,
    )
  }, [features, parsed])

  const dieLabel = parsed
    ? bardicInspirationDieLabel(features, parsed.classEntryId)
    : null

  function spend(label: string, cost: number) {
    if (remaining <= 0) {
      onToast('Нет использований Бардовского вдохновения')
      return
    }
    if (cost > remaining) {
      onToast(`Не хватает вдохновения (нужно ${cost}, есть ${remaining})`)
      return
    }
    onSpend(label, cost)
  }

  return (
    <Dialog
      open={open}
      title="Бардовское вдохновение"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Сейчас {remaining}/{resource?.max ?? 0}
          {dieLabel ? ` · кость ${dieLabel}` : ''}. Выбери, на что потратить.
        </Text>

        {options.length === 0 ? (
          <Text tone="muted">
            Нет доступных опций — нужен бард с Бардовским вдохновением.
          </Text>
        ) : (
          <div className="sorcery-spend-list">
            {options.map((option) => (
              <div key={option.key} className="sorcery-spend-row">
                <div className="sorcery-spend-row__text">
                  <b>{option.nameRu}</b>
                  <span>
                    −{option.cost} · {option.summaryRu}
                  </span>
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
          onClick={() => spend(resource?.name || 'Бардовское вдохновение', 1)}
        >
          Просто −1 использование
        </Button>
      </Stack>
    </Dialog>
  )
}
