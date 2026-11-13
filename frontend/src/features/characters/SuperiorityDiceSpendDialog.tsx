import { useMemo } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import type { AppliedFeatGrant } from '../../shared/dnd/featGrants'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  listSuperioritySpendOptions,
  martialAdeptManeuverIds,
  SUPERIORITY_DICE_ST_POOL,
  SUPERIORITY_DIE_ADEPT_POOL,
  superiorityDieLabel,
} from '../../shared/dnd/superiorityDiceSpend'
import { Button, Dialog, Stack, Text } from '../../ui'

type SuperiorityDiceSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  features: UnlockedFeature[]
  featurePicks: FeaturePicksState
  /** O-05: Martial Adept maneuvers from feat ledger. */
  featGrants?: AppliedFeatGrant[] | null
  onSpend: (label: string, cost: number) => void
  onToast: (message: string) => void
  onClose: () => void
}

function parseSuperiorityResourceId(
  id: string,
): { classSlug: string; classEntryId: string; poolId: string } | null {
  if (id.includes(SUPERIORITY_DIE_ADEPT_POOL)) {
    return {
      classSlug: 'feat',
      classEntryId: 'martial_adept',
      poolId: SUPERIORITY_DIE_ADEPT_POOL,
    }
  }
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const classSlug = parts[0]!
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (
    poolId !== 'superiority_dice' &&
    poolId !== SUPERIORITY_DICE_ST_POOL &&
    poolId !== SUPERIORITY_DIE_ADEPT_POOL
  ) {
    return null
  }
  return { classSlug, classEntryId, poolId }
}

export function SuperiorityDiceSpendDialog({
  open,
  resource,
  features,
  featurePicks,
  featGrants = null,
  onSpend,
  onToast,
  onClose,
}: SuperiorityDiceSpendDialogProps) {
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const parsed = resource ? parseSuperiorityResourceId(resource.id) : null
  const adeptIds = useMemo(() => martialAdeptManeuverIds(featGrants), [featGrants])

  const options = useMemo(() => {
    if (!parsed) return []
    return listSuperioritySpendOptions({
      features,
      featurePicks,
      classEntryId: parsed.classEntryId,
      poolId: parsed.poolId,
      martialAdeptManeuverIds: adeptIds,
    })
  }, [features, featurePicks, parsed, adeptIds])

  const dieLabel = parsed
    ? parsed.poolId === SUPERIORITY_DICE_ST_POOL ||
      parsed.poolId === SUPERIORITY_DIE_ADEPT_POOL
      ? 'к6'
      : superiorityDieLabel(features, parsed.classEntryId)
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
      title={resource?.name?.trim() || 'Кости превосходства'}
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
            Нет известных манёвров — выбери их в умениях (Боевое превосходство) или в черте
            «Боевой адепт».
          </Text>
        ) : (
          <div className="sorcery-spend-list">
            {options.map((option) => (
              <div key={option.key} className="sorcery-spend-row">
                <div>
                  <div className="sorcery-spend-row__title">{option.nameRu}</div>
                  <div className="sorcery-spend-row__hint">{option.summaryRu}</div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={remaining < option.cost}
                  onClick={() => spend(option.nameRu, option.cost)}
                >
                  Потратить
                </Button>
              </div>
            ))}
          </div>
        )}
      </Stack>
    </Dialog>
  )
}
