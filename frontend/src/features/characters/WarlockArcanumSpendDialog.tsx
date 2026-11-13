import { useMemo } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import {
  FEATURE_RESOURCE_PREFIX,
  findFeatureResource,
  spendRemaining,
} from '../../shared/dnd/featureResources'
import { getFeaturePick, type FeaturePicksState } from '../../shared/dnd/featurePicks'
import { mysticArcanumLevel } from '../../shared/dnd/pack04SorcererWarlock'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Stack, Text } from '../../ui'
import { bundledSpellsAtLevel } from './alwaysPreparedSpellEnrichment'

type WarlockArcanumSpendDialogProps = {
  open: boolean
  /** The arcanum resource that was clicked (any of 6–9). */
  resource: SheetResource | null
  features: UnlockedFeature[]
  resources: SheetResource[]
  featurePicks?: FeaturePicksState | null
  onSpend: (poolResourceId: string, label: string) => void
  onToast: (message: string) => void
  onClose: () => void
}

function parseArcanumResourceId(
  id: string,
): { classSlug: string; classEntryId: string; poolId: string } | null {
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const classSlug = parts[0]!
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (!poolId.startsWith('mystic_arcanum_')) return null
  return { classSlug, classEntryId, poolId }
}

export function listWarlockArcanumOptions(
  features: UnlockedFeature[],
  classEntryId: string,
): UnlockedFeature[] {
  return features.filter(
    (f) =>
      f.classEntryId === classEntryId &&
      f.resource?.pool_id?.startsWith('mystic_arcanum_'),
  )
}

export function WarlockArcanumSpendDialog({
  open,
  resource,
  features,
  resources,
  featurePicks = null,
  onSpend,
  onToast,
  onClose,
}: WarlockArcanumSpendDialogProps) {
  const parsed = resource ? parseArcanumResourceId(resource.id) : null

  const options = useMemo(() => {
    if (!parsed) return [] as UnlockedFeature[]
    return listWarlockArcanumOptions(features, parsed.classEntryId)
  }, [features, parsed])

  function spend(feature: UnlockedFeature) {
    if (!parsed || !feature.resource?.pool_id) return
    const pool = findFeatureResource(
      resources,
      parsed.classSlug,
      feature.resource.pool_id,
      feature.classEntryId,
    )
    if (!pool || spendRemaining(pool) <= 0) {
      onToast(`Нет заряда: ${feature.name_ru}`)
      return
    }
    onSpend(pool.id, feature.name_ru)
  }

  return (
    <Dialog
      open={open}
      title={resource?.name?.trim() || 'Мистический арканум'}
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Выбери арканум (1× / прод. отдых, без ячейки). Кастуй как действие.
        </Text>

        {options.length === 0 ? (
          <Text tone="muted">Нет арканумов — нужны уровни колдуна 11+.</Text>
        ) : (
          <div className="sorcery-spend-list">
            {options.map((feature) => {
              const pool =
                parsed && feature.resource?.pool_id
                  ? findFeatureResource(
                      resources,
                      parsed.classSlug,
                      feature.resource.pool_id,
                      feature.classEntryId,
                    )
                  : null
              const left = spendRemaining(pool)
              const circle = mysticArcanumLevel(feature.id)
              const slug = featurePicks
                ? getFeaturePick(featurePicks, feature.classEntryId, feature.id)
                : null
              const chosen =
                circle != null && slug
                  ? bundledSpellsAtLevel(circle).find((spell) => spell.slug === slug) ?? null
                  : null
              return (
                <div
                  key={`${feature.classEntryId}:${feature.id}`}
                  className="sorcery-spend-row"
                >
                  <div className="sorcery-spend-row__text">
                    <b>{feature.name_ru}</b>
                    <span>
                      {left}/{pool?.max ?? 1} ·{' '}
                      {chosen
                        ? `${chosen.nameRu}${chosen.damage ? ` · ${chosen.damage}` : ''}${
                            chosen.attackOrSave ? ` · ${chosen.attackOrSave}` : ''
                          }`
                        : 'заклинание не выбрано — открой умение'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={left <= 0 || !chosen}
                    onClick={() => {
                      if (!chosen) {
                        onToast('Сначала выбери заклинание арканума в умении')
                        return
                      }
                      spend(feature)
                      onToast(
                        `${chosen.nameRu}: без ячейки${chosen.concentration ? ' · концентрация' : ''}`,
                      )
                    }}
                  >
                    Каст
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Stack>
    </Dialog>
  )
}
