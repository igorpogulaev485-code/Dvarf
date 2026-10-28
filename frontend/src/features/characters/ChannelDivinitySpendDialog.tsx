import { useMemo } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import { listChannelDivinityOptions } from '../../shared/dnd/channelDivinitySpend'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Stack, Text } from '../../ui'

type ChannelDivinitySpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  features: UnlockedFeature[]
  onSpend: (label: string) => void
  onToast: (message: string) => void
  onClose: () => void
}

function parseChannelResourceId(
  id: string,
): { classSlug: string; classEntryId: string } | null {
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const classSlug = parts[0]!
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (poolId !== 'channel_divinity') return null
  return { classSlug, classEntryId }
}

export function ChannelDivinitySpendDialog({
  open,
  resource,
  features,
  onSpend,
  onToast,
  onClose,
}: ChannelDivinitySpendDialogProps) {
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const parsed = resource ? parseChannelResourceId(resource.id) : null

  const options = useMemo(() => {
    // Class pool → that entry. Gear free-charge (amulet) → all CD options.
    return listChannelDivinityOptions(features, parsed?.classEntryId ?? null)
  }, [features, parsed])

  function spend(label: string) {
    if (remaining <= 0) {
      onToast('Нет использований Божественного канала')
      return
    }
    onSpend(label)
  }

  return (
    <Dialog
      open={open}
      title="Божественный канал"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Сейчас {remaining}/{resource?.max ?? 0}. Выбери опцию канала.
        </Text>

        {options.length === 0 ? (
          <Text tone="muted">
            Нет доступных опций — нужен домен жреца (Изгнание нежити) или клятва
            паладина (с 3 ур.).
          </Text>
        ) : (
          <div className="sorcery-spend-list">
            {options.map((feature) => (
              <div key={`${feature.classEntryId}:${feature.id}`} className="sorcery-spend-row">
                <div className="sorcery-spend-row__text">
                  <b>{feature.name_ru}</b>
                  <span>{feature.summary_ru || feature.kind}</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={remaining <= 0}
                  onClick={() => spend(feature.name_ru)}
                >
                  −1
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          disabled={remaining <= 0}
          onClick={() => spend(resource?.name || 'Божественный канал')}
        >
          Просто −1 использование
        </Button>
      </Stack>
    </Dialog>
  )
}
