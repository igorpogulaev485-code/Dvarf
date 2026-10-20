import { useMemo } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import {
  listSoulTrinketBurnOptions,
  type SoulTrinketBurnOption,
} from '../../shared/dnd/soulTrinketsSpend'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Stack, Text } from '../../ui'

type SoulTrinketsSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  features: UnlockedFeature[]
  onBurn: (label: string) => void
  onToast: (message: string) => void
  onClose: () => void
}

export function parseSoulTrinketsResourceId(
  id: string,
): { classSlug: string; classEntryId: string } | null {
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const classSlug = parts[0]!
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (poolId !== 'soul_trinkets') return null
  return { classSlug, classEntryId }
}

export function SoulTrinketsSpendDialog({
  open,
  resource,
  features,
  onBurn,
  onToast,
  onClose,
}: SoulTrinketsSpendDialogProps) {
  const stock = resource ? Math.max(0, Math.min(resource.max, resource.used)) : 0
  const parsed = resource ? parseSoulTrinketsResourceId(resource.id) : null

  const options = useMemo(() => {
    if (!parsed) return [] as SoulTrinketBurnOption[]
    return listSoulTrinketBurnOptions(features, parsed.classEntryId)
  }, [features, parsed])

  function burn(option: SoulTrinketBurnOption | null, label: string) {
    if (stock <= 0) {
      onToast('Нет частиц души')
      return
    }
    onBurn(label)
    void option
  }

  return (
    <Dialog
      open={open}
      title="Частицы души"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Запас {stock}/{resource?.max ?? 0}. Сжечь частицу — выбери эффект (или
          просто −1). Набор частиц — кнопкой «+» в умении.
        </Text>

        {options.length === 0 ? (
          <Text tone="muted">Нет опций — нужен плут Phantom 9+.</Text>
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
                  disabled={stock <= 0}
                  onClick={() => burn(option, option.nameRu)}
                >
                  Сжечь
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          disabled={stock <= 0}
          onClick={() => burn(null, resource?.name || 'Частица души')}
        >
          Просто −1 частица
        </Button>
      </Stack>
    </Dialog>
  )
}
