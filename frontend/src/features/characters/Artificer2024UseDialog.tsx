/**
 * 2024 Artificer feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * Magic of Making, Flash of Genius (spend / refund).
 */

import { useState } from 'react'
import { Dialog, Field, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  applyArtificer2024FeatureUse,
  artificer2024UseFeatureId,
  FLASH_OF_GENIUS_NAME_RU,
  FLASH_OF_GENIUS_POOL_ID,
  findArtificerPool2024,
  MAGIC_OF_MAKING_NAME_RU,
  MAGIC_OF_MAKING_POOL_ID,
  type Artificer2024UseResult,
} from '../../shared/dnd/artificer2024Features'

export type ArtificerFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type Props = {
  open: boolean
  request: ArtificerFeatureRequest | null
  resources: SheetResource[]
  onConfirm: (result: Artificer2024UseResult) => void
  onClose: () => void
}

const FEATURE_TEXT: Record<string, string> = {
  'magic-of-making': `${MAGIC_OF_MAKING_NAME_RU}: действием Магия создать предмет из списка (инструменты ремонтника).`,
  magic_of_making: `${MAGIC_OF_MAKING_NAME_RU}: действием Магия создать предмет из списка (инструменты ремонтника).`,
  'flash-of-genius': `${FLASH_OF_GENIUS_NAME_RU}: реакция при провале проверки или спасброска — добавить мод. ИНТ.`,
  flash_of_genius: `${FLASH_OF_GENIUS_NAME_RU}: реакция при провале проверки или спасброска — добавить мод. ИНТ.`,
}

export function Artificer2024UseDialog({
  open,
  request,
  resources,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState('spend')

  if (!request) return null

  const featureId =
    artificer2024UseFeatureId(request.featureId) ?? request.featureId.replace(/_/g, '-')

  const poolId =
    featureId === 'magic-of-making' || featureId === 'magic_of_making'
      ? MAGIC_OF_MAKING_POOL_ID
      : featureId === 'flash-of-genius' || featureId === 'flash_of_genius'
        ? FLASH_OF_GENIUS_POOL_ID
        : null

  const pool =
    poolId != null
      ? findArtificerPool2024(resources, poolId, request.classEntryId)
      : request.resourceId
        ? resources.find((row) => row.id === request.resourceId) ?? null
        : null

  const left = pool ? Math.max(0, pool.max - pool.used) : 0
  const refundable = Boolean(poolId)

  function confirm() {
    const result = applyArtificer2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      refund: mode === 'refund',
    })
    if (result.ok) onConfirm(result)
  }

  const body =
    FEATURE_TEXT[featureId] ?? FEATURE_TEXT[request.featureId] ?? request.name

  return (
    <Dialog
      open={open}
      title={request.name}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      onPrimary={confirm}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        {pool ? (
          <Text tone="muted">
            Осталось: {left}/{pool.max}
          </Text>
        ) : null}
        {refundable ? (
          <Field label="Режим">
            <SegmentedControl
              aria-label="Режим"
              value={mode}
              onChange={setMode}
              options={[
                { id: 'spend', label: 'Потратить' },
                { id: 'refund', label: 'Вернуть' },
              ]}
            />
          </Field>
        ) : null}
        <Text>{body}</Text>
      </Stack>
    </Dialog>
  )
}
