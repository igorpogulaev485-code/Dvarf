/**
 * 2024 Barbarian feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * Rage, Relentless / Persistent Rage, Zealot pools, Retaliation.
 */

import { useState } from 'react'
import { Dialog, Field, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  applyBarbarian2024FeatureUse,
  barbarian2024UseFeatureId,
  FANATICAL_FOCUS_NAME_RU,
  findBarbarianPool2024,
  INTIMIDATING_PRESENCE_NAME_RU,
  PERSISTENT_RAGE_NAME_RU,
  RAGE_NAME_RU,
  RAGE_OF_THE_GODS_NAME_RU,
  RAGES_POOL_ID,
  RELENTLESS_RAGE_NAME_RU,
  RETALIATION_NAME_RU,
  WARRIOR_OF_THE_GODS_NAME_RU,
  WARRIOR_OF_THE_GODS_POOL_ID,
  warriorOfTheGodsDice2024,
  ZEALOUS_PRESENCE_NAME_RU,
  type Barbarian2024UseResult,
} from '../../shared/dnd/barbarian2024Features'

export type BarbarianFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type Props = {
  open: boolean
  request: BarbarianFeatureRequest | null
  resources: SheetResource[]
  barbarianLevel: number
  wearingHeavyArmor?: boolean
  onConfirm: (result: Barbarian2024UseResult) => void
  onClose: () => void
}

const FEATURE_TEXT: Record<string, string> = {
  rage: `${RAGE_NAME_RU}: бонусным — сопротивление дроб./кол./руб., бонус урона ярости, преим. к Силе. Не в тяжёлом доспехе.`,
  'relentless-rage': `${RELENTLESS_RAGE_NAME_RU}: при 0 хитах в ярости — спас Тел; успех → хиты = уровень × 2.`,
  'persistent-rage': `${PERSISTENT_RAGE_NAME_RU}: при инициативе можно восстановить все ярости; 10 мин без продления каждый раунд.`,
  'warrior-of-the-gods': `${WARRIOR_OF_THE_GODS_NAME_RU}: бонусным потратить к12 из запаса и восстановить хиты.`,
  'fanatical-focus': `${FANATICAL_FOCUS_NAME_RU}: раз за ярость — переброс спасброска с бонусом урона ярости.`,
  'zealous-presence': `${ZEALOUS_PRESENCE_NAME_RU}: бонусным — до 10 существ с преимуществом (1 / долгий или за ярость).`,
  'intimidating-presence': `${INTIMIDATING_PRESENCE_NAME_RU}: бонусным — испугать в 30 фт. (1 / долгий или за ярость).`,
  'rage-of-the-gods': `${RAGE_OF_THE_GODS_NAME_RU}: облик богов на 1 минуту (1 / долгий).`,
  retaliation: `${RETALIATION_NAME_RU}: реакцией — рукопашная атака по обидчику в 5 фт.`,
}

export function Barbarian2024UseDialog({
  open,
  request,
  resources,
  barbarianLevel,
  wearingHeavyArmor = false,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState('spend')
  const [diceCount, setDiceCount] = useState('1')

  if (!request) return null

  const featureId =
    barbarian2024UseFeatureId(request.featureId) ?? request.featureId.replace(/_/g, '-')

  const poolId =
    featureId === 'rage'
      ? RAGES_POOL_ID
      : featureId === 'warrior-of-the-gods'
        ? WARRIOR_OF_THE_GODS_POOL_ID
        : featureId === 'fanatical-focus'
          ? 'fanatical_focus'
          : featureId === 'zealous-presence'
            ? 'zealous_presence'
            : featureId === 'intimidating-presence'
              ? 'intimidating_presence'
              : featureId === 'rage-of-the-gods'
                ? 'rage_of_the_gods'
                : null

  const pool =
    poolId != null
      ? findBarbarianPool2024(resources, poolId, request.classEntryId)
      : request.resourceId
        ? resources.find((row) => row.id === request.resourceId) ?? null
        : null

  const left = pool ? Math.max(0, pool.max - pool.used) : 0
  const refundable = Boolean(poolId) && featureId !== 'persistent-rage' && featureId !== 'relentless-rage'
  const canRefundWithRage =
    featureId === 'zealous-presence' || featureId === 'intimidating-presence'
  const body = FEATURE_TEXT[featureId] ?? request.name
  const wog = warriorOfTheGodsDice2024(barbarianLevel)

  function confirm() {
    const result = applyBarbarian2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      barbarianLevel,
      refund: mode === 'refund',
      mode: mode === 'refund_with_rage' ? 'refund_with_rage' : mode,
      diceCount: featureId === 'warrior-of-the-gods' ? Number(diceCount) || 1 : undefined,
      wearingHeavyArmor,
    })
    onConfirm(result)
  }

  const modeOptions = [
    { id: 'spend', label: featureId === 'persistent-rage' ? 'Восстановить все' : 'Потратить' },
    ...(refundable ? [{ id: 'refund', label: 'Вернуть' }] : []),
    ...(canRefundWithRage ? [{ id: 'refund_with_rage', label: 'Восстановить яростью' }] : []),
  ]

  const diceOptions = Array.from({ length: Math.max(1, Math.min(wog.count, left || wog.count)) }, (_, i) => ({
    id: String(i + 1),
    label: `${i + 1}к12`,
  }))

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
        {featureId === 'warrior-of-the-gods' && mode === 'spend' && diceOptions.length > 0 ? (
          <Field label="Кости">
            <SegmentedControl
              aria-label="Кости Воина богов"
              value={diceCount}
              onChange={setDiceCount}
              options={diceOptions}
            />
          </Field>
        ) : null}
        <Text>{body}</Text>
      </Stack>
    </Dialog>
  )
}
