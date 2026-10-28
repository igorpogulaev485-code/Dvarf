import { useMemo } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import {
  listPsiSpendOptions,
  psionicDieLabel,
  type PsiSpendOption,
} from '../../shared/dnd/soulknifePsiSpend'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Stack, Text } from '../../ui'

type PsionicDiceSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  features: UnlockedFeature[]
  onSpend: (label: string, cost: number) => void
  onToast: (message: string) => void
  onClose: () => void
}

export function parsePsionicDiceResourceId(
  id: string,
): { classSlug: string; classEntryId: string } | null {
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const classSlug = parts[0]!
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (poolId !== 'psionic_energy_dice') return null
  return { classSlug, classEntryId }
}

export function PsionicDiceSpendDialog({
  open,
  resource,
  features,
  onSpend,
  onToast,
  onClose,
}: PsionicDiceSpendDialogProps) {
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const parsed = resource ? parsePsionicDiceResourceId(resource.id) : null
  const die = parsed
    ? psionicDieLabel(features, parsed.classEntryId)
    : null

  const options = useMemo(() => {
    if (!parsed) return [] as PsiSpendOption[]
    return listPsiSpendOptions(features).filter(
      (row) => row.classEntryId === parsed.classEntryId,
    )
  }, [features, parsed])

  function spend(option: PsiSpendOption | null, label: string, cost: number) {
    if (remaining <= 0) {
      onToast('Нет пси-костей')
      return
    }
    if (cost > remaining) {
      onToast(`Не хватает пси-костей (нужно ${cost}, есть ${remaining})`)
      return
    }
    onSpend(label, cost)
    void option
  }

  return (
    <Dialog
      open={open}
      title="Пси-кости"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Сейчас {remaining}/{resource?.max ?? 0}
          {die ? ` · кость ${die}` : ''}. Выбери, на что потратить.
        </Text>

        {options.length === 0 ? (
          <Text tone="muted">
            Нет опций — нужен плут Soulknife 3+ (сноровка / шёпот…).
          </Text>
        ) : (
          <div className="sorcery-spend-list">
            {options.map((option) => (
              <div key={option.key} className="sorcery-spend-row">
                <div className="sorcery-spend-row__text">
                  <b>{option.nameRu}</b>
                  <span>
                    {option.cost}{' '}
                    {option.cost === 1 ? 'кость' : 'кости'} · {option.summaryRu}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={option.cost > remaining}
                  onClick={() => spend(option, option.nameRu, option.cost)}
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
          onClick={() => spend(null, resource?.name || 'Пси-кости', 1)}
        >
          Просто −1 кость
        </Button>
      </Stack>
    </Dialog>
  )
}
