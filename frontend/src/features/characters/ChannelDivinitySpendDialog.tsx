import { useMemo, useState } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import {
  proficiencyBonusForTotalLevel,
  resolveClassFeatureSlug,
} from '../../shared/dnd/classFeatures'
import { listChannelDivinityOptions } from '../../shared/dnd/channelDivinitySpend'
import { FEATURE_RESOURCE_PREFIX, findFeatureResource, spendRemaining } from '../../shared/dnd/featureResources'
import {
  applyHarnessDivinePower,
  harnessDivinePowerSlotCap,
  HARNESS_DIVINE_POWER_POOL_ID,
  isHarnessDivinePowerFeature,
  spentSlotLevels,
} from '../../shared/dnd/harnessDivinePower'
import type { SheetResource } from '../../shared/dnd/rest'
import type { SpellSlotState } from '../../shared/dnd/spells'
import { Button, Dialog, Stack, Text } from '../../ui'

type ChannelDivinitySpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  features: UnlockedFeature[]
  /** Full sheet resources — needed to check/spend HDP daily pool. */
  resources: SheetResource[]
  slots: Record<string, SpellSlotState>
  characterLevel: number
  onSpend: (label: string) => void
  /** Apply HDP: shared path for class CD and item free-charges. */
  onHarnessDivinePower: (next: {
    resources: SheetResource[]
    slots: Record<string, SpellSlotState>
    message: string
  }) => void
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

function classSlugForFeature(feature: UnlockedFeature): string {
  return resolveClassFeatureSlug(feature.className) || 'class'
}

export function ChannelDivinitySpendDialog({
  open,
  resource,
  features,
  resources,
  slots,
  characterLevel,
  onSpend,
  onHarnessDivinePower,
  onToast,
  onClose,
}: ChannelDivinitySpendDialogProps) {
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const parsed = resource ? parseChannelResourceId(resource.id) : null
  const pb = proficiencyBonusForTotalLevel(characterLevel)
  const slotCap = harnessDivinePowerSlotCap(pb)
  const [pickedByFeature, setPickedByFeature] = useState<Record<string, number>>({})

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

  function featureKey(feature: UnlockedFeature): string {
    return `${feature.classEntryId}:${feature.id}`
  }

  function applyHdp(feature: UnlockedFeature) {
    if (!resource) {
      onToast('Пул Божественного канала не найден')
      return
    }
    const classSlug = classSlugForFeature(feature)
    const optionsForCap = spentSlotLevels(slots, slotCap)
    const key = featureKey(feature)
    const preferred = pickedByFeature[key]
    const slotLevel = optionsForCap.includes(preferred ?? 0)
      ? (preferred as number)
      : (optionsForCap[0] ?? 0)

    const result = applyHarnessDivinePower({
      resources,
      slots,
      channelResourceId: resource.id,
      feature,
      classSlug,
      slotLevel,
      proficiencyBonus: pb,
    })
    if (!result.ok) {
      onToast(result.reason)
      return
    }
    onHarnessDivinePower({
      resources: result.resources,
      slots: result.slots,
      message: result.message,
    })
  }

  const dialogTitle = resource?.name?.trim() || 'Божественный канал'

  return (
    <Dialog
      open={open}
      title={dialogTitle}
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
            {options.map((feature) => {
              if (isHarnessDivinePowerFeature(feature)) {
                const classSlug = classSlugForFeature(feature)
                const daily = findFeatureResource(
                  resources,
                  classSlug,
                  HARNESS_DIVINE_POWER_POOL_ID,
                  feature.classEntryId,
                )
                const dailyLeft = spendRemaining(daily)
                const slotOptions = spentSlotLevels(slots, slotCap)
                const key = featureKey(feature)
                const preferred = pickedByFeature[key]
                const picked = slotOptions.includes(preferred ?? 0)
                  ? (preferred as number)
                  : (slotOptions[0] ?? 0)
                const canApply =
                  remaining > 0 && dailyLeft > 0 && picked > 0 && Boolean(resource)

                return (
                  <div key={key} className="sorcery-spend-row">
                    <div className="sorcery-spend-row__text">
                      <b>{feature.name_ru}</b>
                      <span>
                        Бонусное · дневных {dailyLeft}/{daily?.max ?? 0} · потолок круга{' '}
                        {slotCap}. {feature.summary_ru || feature.kind}
                      </span>
                      {slotOptions.length === 0 ? (
                        <span>Нет потраченных ячеек круга 1–{slotCap}.</span>
                      ) : (
                        <label className="feature-resource__select">
                          <span className="sr-only">Потраченная ячейка</span>
                          <select
                            className="play-select"
                            value={picked}
                            onChange={(event) =>
                              setPickedByFeature((prev) => ({
                                ...prev,
                                [key]: Number(event.target.value),
                              }))
                            }
                          >
                            {slotOptions.map((row) => (
                              <option key={row} value={row}>
                                {row} круг · потрачено {slots[String(row)]?.used ?? 0}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canApply}
                      onClick={() => applyHdp(feature)}
                    >
                      Вернуть ячейку
                    </Button>
                  </div>
                )
              }

              return (
                <div key={featureKey(feature)} className="sorcery-spend-row">
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
              )
            })}
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
