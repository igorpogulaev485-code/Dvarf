import { useEffect, useMemo, useState } from 'react'
import {
  infusionSlotsMax,
  listActiveInfusionIds,
  listKnownInfusions,
  setActiveInfusions,
} from '../../shared/dnd/infusionsActive'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Stack, Text } from '../../ui'

type InfusionsActiveDialogProps = {
  open: boolean
  resource: SheetResource | null
  classEntryId: string
  artificerLevel: number
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onSlotsUsedChange: (used: number) => void
  onToast: (message: string) => void
  onClose: () => void
}

export function parseInfusionSlotsResourceId(
  id: string,
): { classEntryId: string } | null {
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (poolId !== 'infusion_slots') return null
  return { classEntryId }
}

export function InfusionsActiveDialog({
  open,
  resource,
  classEntryId,
  artificerLevel,
  featurePicks,
  onFeaturePicksChange,
  onSlotsUsedChange,
  onToast,
  onClose,
}: InfusionsActiveDialogProps) {
  const maxSlots = infusionSlotsMax(artificerLevel)
  const known = useMemo(
    () => listKnownInfusions(featurePicks, classEntryId),
    [featurePicks, classEntryId],
  )
  const initialActive = useMemo(
    () => listActiveInfusionIds(featurePicks, classEntryId),
    [featurePicks, classEntryId],
  )
  const [active, setActive] = useState<string[]>(initialActive)

  useEffect(() => {
    if (open) setActive(initialActive)
  }, [open, initialActive])

  function toggle(id: string) {
    setActive((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= maxSlots) {
        onToast(`Лимит активных инфузий: ${maxSlots}`)
        return prev
      }
      return [...prev, id]
    })
  }

  function save() {
    onFeaturePicksChange(setActiveInfusions(featurePicks, classEntryId, active))
    onSlotsUsedChange(active.length)
    onToast(
      active.length
        ? `Активные инфузии: ${active.length}/${maxSlots}`
        : 'Нет активных инфузий',
    )
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="Активные инфузии"
      size="wide"
      primaryLabel="Сохранить"
      onPrimary={save}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Известные инфузии отметь на предметах после прод. отдыха. Слотов:{' '}
          <strong>
            {active.length}/{maxSlots}
          </strong>
          {resource ? ` · пул ${resource.name}` : ''}
        </Text>

        {known.length === 0 ? (
          <Text tone="muted">
            Нет известных инфузий — выбери их в умении «Инфузия предмета».
          </Text>
        ) : (
          <div className="sorcery-spend-list">
            {known.map((def) => {
              const on = active.includes(def.id)
              return (
                <div key={def.id} className="sorcery-spend-row">
                  <div className="sorcery-spend-row__text">
                    <b>{def.nameRu}</b>
                    <span>{def.summaryRu}</span>
                  </div>
                  <Button
                    type="button"
                    variant={on ? 'primary' : 'secondary'}
                    onClick={() => toggle(def.id)}
                  >
                    {on ? 'Активна' : 'Выкл'}
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
