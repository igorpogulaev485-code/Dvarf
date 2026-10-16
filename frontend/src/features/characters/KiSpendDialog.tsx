import { useMemo, useState } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import {
  listKiSpendOptions,
  type KiSpendOption,
} from '../../shared/dnd/monkKiSpend'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Field, Stack, Text } from '../../ui'

type KiSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  features: UnlockedFeature[]
  onSpend: (label: string, cost: number) => void
  onToast: (message: string) => void
  onClose: () => void
}

function parseKiResourceId(
  id: string,
): { classSlug: string; classEntryId: string } | null {
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const classSlug = parts[0]!
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (poolId !== 'ki') return null
  return { classSlug, classEntryId }
}

export function KiSpendDialog({
  open,
  resource,
  features,
  onSpend,
  onToast,
  onClose,
}: KiSpendDialogProps) {
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const parsed = resource ? parseKiResourceId(resource.id) : null
  const [variableCosts, setVariableCosts] = useState<Record<string, number>>({})

  const options = useMemo(() => {
    if (!parsed) return [] as KiSpendOption[]
    return listKiSpendOptions(features).filter(
      (row) => row.classEntryId === parsed.classEntryId,
    )
  }, [features, parsed])

  function costFor(option: KiSpendOption): number {
    if (option.costMax != null) {
      const picked = variableCosts[option.key] ?? option.cost
      return Math.min(option.costMax, Math.max(option.cost, picked))
    }
    return option.cost
  }

  function spend(option: KiSpendOption | null, label: string, cost: number) {
    if (remaining <= 0) {
      onToast('Нет очков ки')
      return
    }
    if (cost > remaining) {
      onToast(`Не хватает ки (нужно ${cost}, есть ${remaining})`)
      return
    }
    onSpend(label, cost)
    void option
  }

  return (
    <Dialog
      open={open}
      title="Ки"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Сейчас {remaining}/{resource?.max ?? 0}. Выбери, на что потратить ки.
        </Text>

        {options.length === 0 ? (
          <Text tone="muted">
            Нет доступных опций — нужен монах 2+ ур. (Шквал / Оборона / Шаг ветра…).
          </Text>
        ) : (
          <div className="sorcery-spend-list">
            {options.map((option) => {
              const cost = costFor(option)
              return (
                <div key={option.key} className="sorcery-spend-row">
                  <div className="sorcery-spend-row__text">
                    <b>{option.nameRu}</b>
                    <span>
                      {option.costMax != null
                        ? `${option.cost}–${option.costMax} ки`
                        : `${option.cost} ки`}
                      {' · '}
                      {option.summaryRu}
                    </span>
                    {option.costMax != null ? (
                      <Field label="Сколько ки">
                        <select
                          className="play-select"
                          value={cost}
                          onChange={(event) =>
                            setVariableCosts((prev) => ({
                              ...prev,
                              [option.key]: Number(event.target.value),
                            }))
                          }
                        >
                          {Array.from(
                            { length: option.costMax - option.cost + 1 },
                            (_, i) => option.cost + i,
                          ).map((n) => (
                            <option key={n} value={n}>
                              {n} ки
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={cost > remaining}
                    onClick={() => spend(option, option.nameRu, cost)}
                  >
                    −{cost}
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
          onClick={() => spend(null, resource?.name || 'Ки', 1)}
        >
          Просто −1 ки
        </Button>
      </Stack>
    </Dialog>
  )
}
