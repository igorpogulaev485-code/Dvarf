/**
 * 2024 Ranger feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * Tireless, Nature's Veil, free Hunter's Mark, Dread Ambusher strike,
 * plus P24-M02B-ranger book paths (Winter Walker / Hollow Warden).
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
import {
  ANCIENT_MIGHT_NAME_RU,
  CHILLING_RETRIBUTION_FEATURE_ID,
  CHILLING_RETRIBUTION_NAME_RU,
  CHILLING_RETRIBUTION_POOL_ID,
  FORTIFYING_SOUL_FEATURE_ID,
  FORTIFYING_SOUL_NAME_RU,
  FORTIFYING_SOUL_POOL_ID,
  fortifyingSoulHealFormulaRu2024,
  fortifyingSoulTargetCap2024,
  FRIGID_EXPLORER_FEATURE_ID,
  FRIGID_EXPLORER_NAME_RU,
  FROZEN_HAUNT_FEATURE_ID,
  FROZEN_HAUNT_NAME_RU,
  FROZEN_HAUNT_POOL_ID,
  HUNGERING_MIGHT_FEATURE_ID,
  HUNGERING_MIGHT_NAME_RU,
  hungeringMightHealFormulaRu2024,
  HUNTERS_RIME_FEATURE_ID,
  HUNTERS_RIME_NAME_RU,
  huntersRimeTempHpFormulaRu2024,
  polarStrikesDie2024,
  ROT_AND_VIOLENCE_FEATURE_ID,
  ROT_AND_VIOLENCE_NAME_RU,
  UNDYING_WRATH_NAME_RU,
  UNDYING_WRATH_POOL_ID,
  undyingWrathHp2024,
  WRATH_OF_THE_WILD_FEATURE_ID,
  WRATH_OF_THE_WILD_NAME_RU,
  wrathAcBonus2024,
} from '../../shared/dnd/rangerBook2024Features'

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
  [HUNTERS_RIME_FEATURE_ID]: `${HUNTERS_RIME_NAME_RU}: при сотворении «${HUNTERS_MARK_NAME_RU}» — временные хиты; цель с меткой не может совершать Отход. Отдельного пула нет.`,
  [FRIGID_EXPLORER_FEATURE_ID]: `${FRIGID_EXPLORER_NAME_RU}: Полярные удары (холод), сопротивление Холоду, игнор сопротивления Холоду.`,
  [FORTIFYING_SOUL_FEATURE_ID]: `${FORTIFYING_SOUL_NAME_RU}: действие «Магия» — хил и преимущество vs Испуганный (1/долг. отд.).`,
  [CHILLING_RETRIBUTION_FEATURE_ID]: `${CHILLING_RETRIBUTION_NAME_RU}: реакция при попадании по вам — спас Мудрости, Ошеломлённый + скорость 0.`,
  [FROZEN_HAUNT_FEATURE_ID]: `${FROZEN_HAUNT_NAME_RU}: форма на время «${HUNTERS_MARK_NAME_RU}» (1/долг. отд., возврат ячейкой 4+).`,
  [WRATH_OF_THE_WILD_FEATURE_ID]: `${WRATH_OF_THE_WILD_NAME_RU}: бонусное — потратить одно использование Избранного врага; форма 1 мин.`,
  [HUNGERING_MIGHT_FEATURE_ID]: `${HUNGERING_MIGHT_NAME_RU}: бонус к спасброскам Тел; хил в Ярости при Окровавленности 1/ход.`,
  [ROT_AND_VIOLENCE_FEATURE_ID]: `${ROT_AND_VIOLENCE_NAME_RU}: в Ярости — усиление ауры и второе свойство мастерства.`,
  'ancient-might': `${ANCIENT_MIGHT_NAME_RU}: ${UNDYING_WRATH_NAME_RU} при HP→0 в Ярости (1/долг. отд.); +Муд по Испуганным; иммунитет к Истощению.`,
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
        : featureId === 'favored-enemy' || featureId === WRATH_OF_THE_WILD_FEATURE_ID
          ? FAVORED_ENEMY_POOL_ID
          : featureId === FORTIFYING_SOUL_FEATURE_ID
            ? FORTIFYING_SOUL_POOL_ID
            : featureId === CHILLING_RETRIBUTION_FEATURE_ID
              ? CHILLING_RETRIBUTION_POOL_ID
              : featureId === FROZEN_HAUNT_FEATURE_ID
                ? FROZEN_HAUNT_POOL_ID
                : featureId === 'ancient-might'
                  ? UNDYING_WRATH_POOL_ID
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

  const formulaHint =
    featureId === 'tireless' && mode !== 'refund'
      ? `Врем. хиты: ${tirelessTempHpFormulaRu2024(wisMod)}`
      : featureId === HUNTERS_RIME_FEATURE_ID
        ? `Врем. хиты: ${huntersRimeTempHpFormulaRu2024(rangerLevel)}`
        : featureId === FRIGID_EXPLORER_FEATURE_ID
          ? `Полярные удары: +${polarStrikesDie2024(rangerLevel)} холодом`
          : featureId === FORTIFYING_SOUL_FEATURE_ID && mode !== 'refund'
            ? `Хил: ${fortifyingSoulHealFormulaRu2024(rangerLevel)}; целей ≤ ${fortifyingSoulTargetCap2024(wisMod)}`
            : featureId === WRATH_OF_THE_WILD_FEATURE_ID && mode !== 'refund'
              ? `КД +${wrathAcBonus2024(rangerLevel)} на 1 мин.`
              : featureId === HUNGERING_MIGHT_FEATURE_ID
                ? `Хил: ${hungeringMightHealFormulaRu2024(wisMod)}`
                : featureId === 'ancient-might' && mode !== 'refund'
                  ? `Хиты при срабатывании: ${undyingWrathHp2024(rangerLevel)}`
                  : null

  return (
    <Dialog
      open={open}
      title={request.name}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      onPrimary={confirm}
      onSecondary={onClose}
    >
      <div data-testid={`p24-m02b-ranger-use-${featureId}`}>
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
          {formulaHint ? <Text tone="muted">{formulaHint}</Text> : null}
        </Stack>
      </div>
    </Dialog>
  )
}
