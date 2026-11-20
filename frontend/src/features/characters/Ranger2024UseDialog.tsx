/**
 * 2024 Ranger feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * Tireless, Nature's Veil, free Hunter's Mark, Dread Ambusher strike.
 */

import { useState } from 'react'
import { Dialog, Field, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  applyRanger2024FeatureUse,
  DREAD_AMBUSHER_STRIKE_NAME_RU,
  FAVORED_ENEMY_NAME_RU,
  findRangerPool2024,
  FAVORED_ENEMY_POOL_ID,
  HUNTERS_MARK_NAME_RU,
  NATURES_VEIL_NAME_RU,
  NATURES_VEIL_POOL_ID,
  ranger2024UseFeatureId,
  tirelessTempHpFormulaRu2024,
  TIRELESS_NAME_RU,
  TIRELESS_POOL_ID,
  type Ranger2024UseResult,
} from '../../shared/dnd/ranger2024Features'

export type RangerFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type Props = {
  open: boolean
  request: RangerFeatureRequest | null
  resources: SheetResource[]
  rangerLevel: number
  wisScore?: number
  onConfirm: (result: Ranger2024UseResult) => void
  onClose: () => void
}

const FEATURE_TEXT: Record<string, string> = {
  tireless: `${TIRELESS_NAME_RU}: врем. хиты по формуле ниже (действие «Магия», 1/долг. отд.).`,
  'natures-veil': `${NATURES_VEIL_NAME_RU}: бонусное действие — Невидимость до конца вашего следующего хода.`,
  natures_veil: `${NATURES_VEIL_NAME_RU}: бонусное действие — Невидимость до конца вашего следующего хода.`,
  'favored-enemy': `${FAVORED_ENEMY_NAME_RU}: «${HUNTERS_MARK_NAME_RU}» без ячейки (1/долг. отд.).`,
  favored_enemy: `${FAVORED_ENEMY_NAME_RU}: «${HUNTERS_MARK_NAME_RU}» без ячейки (1/долг. отд.).`,
  'free-hunters-mark': `${FAVORED_ENEMY_NAME_RU}: «${HUNTERS_MARK_NAME_RU}» без ячейки (1/долг. отд.).`,
  'dread-ambusher-strike': `${DREAD_AMBUSHER_STRIKE_NAME_RU}: +2к6 психического при первом попадании по цели с меткой (1 раз за ход).`,
  dread_ambusher_strike: `${DREAD_AMBUSHER_STRIKE_NAME_RU}: +2к6 психического при первом попадании по цели с меткой (1 раз за ход).`,
}

export function Ranger2024UseDialog({
  open,
  request,
  resources,
  rangerLevel,
  wisScore = 10,
  onConfirm,
  onClose,
}: Props) {
  const wisMod = Math.floor((wisScore - 10) / 2)
  const [mode, setMode] = useState('spend')

  if (!request) return null

  const featureId =
    ranger2024UseFeatureId(request.featureId) ?? request.featureId.replace(/_/g, '-')

  const poolId =
    featureId === 'tireless'
      ? TIRELESS_POOL_ID
      : featureId === 'natures-veil'
        ? NATURES_VEIL_POOL_ID
        : featureId === 'favored-enemy'
          ? FAVORED_ENEMY_POOL_ID
          : null

  const pool =
    poolId != null
      ? findRangerPool2024(resources, poolId, request.classEntryId)
      : request.resourceId
        ? resources.find((row) => row.id === request.resourceId) ?? null
        : null

  const left = pool ? Math.max(0, pool.max - pool.used) : 0
  const refundable = Boolean(poolId)

  function confirm() {
    const result = applyRanger2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      rangerLevel,
      abilities: { wis: wisScore },
      refund: mode === 'refund',
      mode,
    })
    onConfirm({
      ...result,
      patches: {
        ...result.patches,
        ...(featureId === 'tireless' && mode !== 'refund'
          ? { diceExpression: tirelessTempHpFormulaRu2024(wisMod) }
          : {}),
      },
    })
  }

  const body =
    FEATURE_TEXT[featureId] ??
  FEATURE_TEXT[request.featureId] ??
    request.name

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
        {featureId === 'tireless' && mode !== 'refund' ? (
          <Text tone="muted">Врем. хиты: {tirelessTempHpFormulaRu2024(wisMod)}</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}