/**
 * 2024 Fighter feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * Second Wind, Tactical Mind, Action Surge, Indomitable, Know Your Enemy, Bulwark of Force.
 */

import { useState } from 'react'
import { Dialog, Field, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  ACTION_SURGE_NAME_RU,
  ACTION_SURGE_POOL_ID,
  applyFighter2024FeatureUse,
  BULWARK_OF_FORCE_NAME_RU,
  BULWARK_OF_FORCE_POOL_ID,
  findFighterPool2024,
  fighter2024UseFeatureId,
  INDOMITABLE_NAME_RU,
  INDOMITABLE_POOL_ID,
  KNOW_YOUR_ENEMY_NAME_RU,
  KNOW_YOUR_ENEMY_POOL_ID,
  RELENTLESS_NAME_RU,
  SECOND_WIND_NAME_RU,
  SECOND_WIND_POOL_ID,
  TACTICAL_MIND_NAME_RU,
  type Fighter2024UseResult,
} from '../../shared/dnd/fighter2024Features'

export type FighterFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type Props = {
  open: boolean
  request: FighterFeatureRequest | null
  resources: SheetResource[]
  fighterLevel: number
  onConfirm: (result: Fighter2024UseResult) => void
  onClose: () => void
}

const FEATURE_TEXT: Record<string, string> = {
  'second-wind': `${SECOND_WIND_NAME_RU}: бонусным — 1к10 + уровень воина хитов.`,
  'tactical-mind': `${TACTICAL_MIND_NAME_RU}: при провале проверки — +1к10 (тратит Второе дыхание; если всё равно провал — не тратит).`,
  'action-surge': `${ACTION_SURGE_NAME_RU}: +1 действие, кроме «Магии».`,
  indomitable: `${INDOMITABLE_NAME_RU}: переброс спасброска с бонусом = уровень воина.`,
  'know-your-enemy': `${KNOW_YOUR_ENEMY_NAME_RU}: бонусным — иммунитеты/сопротивления/уязвимости в 30 фт.`,
  'bulwark-of-force': `${BULWARK_OF_FORCE_NAME_RU}: укрытие наполовину (не временные хиты).`,
  relentless: `${RELENTLESS_NAME_RU}: 1к8 вместо кости превосходства (1 раз за ход).`,
}

export function Fighter2024UseDialog({
  open,
  request,
  resources,
  fighterLevel,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState('spend')
  const [checkStillFailed, setCheckStillFailed] = useState(false)

  if (!request) return null

  const featureId =
    fighter2024UseFeatureId(request.featureId) ?? request.featureId.replace(/_/g, '-')

  const poolId =
    featureId === 'second-wind' || featureId === 'tactical-mind'
      ? SECOND_WIND_POOL_ID
      : featureId === 'action-surge'
        ? ACTION_SURGE_POOL_ID
        : featureId === 'indomitable'
          ? INDOMITABLE_POOL_ID
          : featureId === 'know-your-enemy'
            ? KNOW_YOUR_ENEMY_POOL_ID
            : featureId === 'bulwark-of-force'
              ? BULWARK_OF_FORCE_POOL_ID
              : null

  const pool =
    poolId != null
      ? findFighterPool2024(resources, poolId, request.classEntryId)
      : request.resourceId
        ? resources.find((row) => row.id === request.resourceId) ?? null
        : null

  const left = pool ? Math.max(0, pool.max - pool.used) : 0
  const refundable = Boolean(poolId)
  const body = FEATURE_TEXT[featureId] ?? request.name

  function confirm() {
    const result = applyFighter2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      fighterLevel,
      refund: mode === 'refund',
      mode: mode === 'refund_with_die' ? 'refund_with_die' : mode,
      checkStillFailed: featureId === 'tactical-mind' && checkStillFailed,
    })
    onConfirm(result)
  }

  const modeOptions = [
    { id: 'spend', label: 'Потратить' },
    ...(refundable ? [{ id: 'refund', label: 'Вернуть' }] : []),
    ...(featureId === 'know-your-enemy'
      ? [{ id: 'refund_with_die', label: 'Восстановить костью' }]
      : []),
  ]

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
        {modeOptions.length > 1 ? (
          <Field label="Режим">
            <SegmentedControl
              aria-label="Режим"
              value={mode}
              onChange={setMode}
              options={modeOptions}
            />
          </Field>
        ) : null}
        {featureId === 'tactical-mind' && mode === 'spend' ? (
          <Field label="Исход проверки после +1к10">
            <SegmentedControl
              aria-label="Исход проверки"
              value={checkStillFailed ? 'fail' : 'ok'}
              onChange={(v) => setCheckStillFailed(v === 'fail')}
              options={[
                { id: 'ok', label: 'Успех / могло сменить' },
                { id: 'fail', label: 'Всё равно провал' },
              ]}
            />
          </Field>
        ) : null}
        <Text>{body}</Text>
      </Stack>
    </Dialog>
  )
}
