/**
 * 2024 Rogue feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * Stroke of Luck, Psychic Veil, Rend Mind, Psionic Energy, Spell Thief, Fast Hands.
 */

import { useState } from 'react'
import { Dialog, Field, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  applyRogue2024FeatureUse,
  CUNNING_ACTION_NAME_RU,
  FAST_HANDS_NAME_RU,
  findRoguePool2024,
  PSIONIC_ENERGY_POOL_ID,
  PSIONIC_POWER_NAME_RU,
  PSYCHIC_VEIL_NAME_RU,
  PSYCHIC_VEIL_POOL_ID,
  REND_MIND_NAME_RU,
  REND_MIND_POOL_ID,
  rogue2024UseFeatureId,
  SPELL_THIEF_NAME_RU,
  SPELL_THIEF_POOL_ID,
  STEADY_AIM_NAME_RU,
  STROKE_OF_LUCK_NAME_RU,
  STROKE_OF_LUCK_POOL_ID,
  type RogueFeatureRequest,
} from '../../shared/dnd/rogue2024Features'

export type RogueFeatureRequestUi = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

export type Rogue2024UseResult = {
  ok: boolean
  resources: SheetResource[]
  message: string
}

type Props = {
  open: boolean
  request: RogueFeatureRequestUi | null
  resources: SheetResource[]
  rogueLevel: number
  onConfirm: (result: Rogue2024UseResult) => void
  onClose: () => void
}

const FEATURE_TEXT: Record<string, string> = {
  'stroke-of-luck': `${STROKE_OF_LUCK_NAME_RU}: при провале проверки к20 (атака, проверка, спас) — результат кости = 20. 1 / короткий или долгий.`,
  'psychic-veil': `${PSYCHIC_VEIL_NAME_RU}: стать Невидимым на 1 ч. Можно восстановить, потратив кость пси-энергии.`,
  'rend-mind': `${REND_MIND_NAME_RU}: при попадании психическим клинком — спас Мудрости или Ошеломлён. Восстановить за 3 кости.`,
  'psionic-power': `${PSIONIC_POWER_NAME_RU}: потратить кости псионической энергии.`,
  'spell-thief': `${SPELL_THIEF_NAME_RU}: реакцией украсть заклинание, нацеленное на вас (1 / долгий).`,
  'steady-aim': `${STEADY_AIM_NAME_RU}: бонусным — преимущество на следующую атаку (если ещё не двигались; скорость 0 — базово; Вор/Убийца может снять ограничение).`,
  'cunning-action': `${CUNNING_ACTION_NAME_RU}: бонусным — Рывок, Отход или Засада.`,
  'fast-hands': `${FAST_HANDS_NAME_RU}: Хитрое действие — Ловкость рук, Использование предмета или действие магического предмета.`,
  'cunning-strike': 'Хитрый удар: трата костей Скрытой атаки на эффекты (панель боя).',
}

export function Rogue2024UseDialog({
  open,
  request,
  resources,
  rogueLevel: _rogueLevel,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState('spend')
  const [psiSpend, setPsiSpend] = useState('1')
  const [cunningAction, setCunningAction] = useState('dash')
  const [fastHandsMode, setFastHandsMode] = useState('sleight')

  if (!request) return null

  const featureId =
    rogue2024UseFeatureId(request.featureId) ?? request.featureId.replace(/_/g, '-')

  const poolId =
    featureId === 'stroke-of-luck'
      ? STROKE_OF_LUCK_POOL_ID
      : featureId === 'psychic-veil'
        ? PSYCHIC_VEIL_POOL_ID
        : featureId === 'rend-mind'
          ? REND_MIND_POOL_ID
          : featureId === 'psionic-power'
            ? PSIONIC_ENERGY_POOL_ID
            : featureId === 'spell-thief'
              ? SPELL_THIEF_POOL_ID
              : null

  const pool =
    poolId != null
      ? findRoguePool2024(resources, poolId, request.classEntryId)
      : request.resourceId
        ? resources.find((row) => row.id === request.resourceId) ?? null
        : null

  const left = pool ? Math.max(0, pool.max - pool.used) : 0
  const refundable =
    Boolean(poolId) &&
    featureId !== 'steady-aim' &&
    featureId !== 'cunning-action' &&
    featureId !== 'fast-hands' &&
    featureId !== 'cunning-strike'
  const canRestoreVeil = featureId === 'psychic-veil'
  const canRestoreRend = featureId === 'rend-mind'
  const body = FEATURE_TEXT[featureId] ?? request.name

  function buildRequest(): RogueFeatureRequest {
    const refund = mode === 'refund'
    if (featureId === 'stroke-of-luck') return { kind: 'stroke_of_luck', refund }
    if (featureId === 'psychic-veil') {
      return { kind: 'psychic_veil', restoreWithDie: mode === 'restore_psi' }
    }
    if (featureId === 'rend-mind') {
      return { kind: 'rend_mind', restoreWithDice: mode === 'restore_psi' }
    }
    if (featureId === 'psionic-power') {
      return { kind: 'psionic_energy', spend: Number(psiSpend) || 1, refund }
    }
    if (featureId === 'spell-thief') return { kind: 'spell_thief' }
    if (featureId === 'steady-aim') return { kind: 'steady_aim' }
    if (featureId === 'cunning-action') {
      return {
        kind: 'cunning_action',
        action: cunningAction as 'dash' | 'disengage' | 'hide',
      }
    }
    if (featureId === 'fast-hands') {
      return {
        kind: 'fast_hands',
        mode: fastHandsMode as 'sleight' | 'use_object' | 'magic_item',
      }
    }
    return { kind: 'cunning_strike', optionIds: [] }
  }

  function confirm() {
    const result = applyRogue2024FeatureUse(resources, buildRequest(), request!.classEntryId)
    if (!result.ok) {
      onConfirm({ ok: false, resources, message: result.reason_ru })
      return
    }
    onConfirm({
      ok: true,
      resources: result.resources,
      message: result.note_ru || `${request!.name}: применено`,
    })
  }

  const modeOptions = [
    {
      id: 'spend',
      label:
        featureId === 'psychic-veil' || featureId === 'rend-mind'
          ? 'Использовать'
          : featureId === 'psionic-power'
            ? 'Потратить'
            : 'Потратить',
    },
    ...(refundable && !canRestoreVeil && !canRestoreRend
      ? [{ id: 'refund', label: 'Вернуть' }]
      : []),
    ...(canRestoreVeil || canRestoreRend
      ? [{ id: 'restore_psi', label: 'Восстановить пси' }]
      : []),
  ]

  const psiLeft = findRoguePool2024(resources, PSIONIC_ENERGY_POOL_ID, request.classEntryId)
  const psiRemaining = psiLeft ? Math.max(0, psiLeft.max - psiLeft.used) : 0
  const diceOptions = Array.from(
    { length: Math.max(1, Math.min(6, psiRemaining || 1)) },
    (_, i) => ({ id: String(i + 1), label: `${i + 1}` }),
  )

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
        {featureId === 'psionic-power' && mode === 'spend' && diceOptions.length > 0 ? (
          <Field label="Кости">
            <SegmentedControl
              aria-label="Кости пси-энергии"
              value={psiSpend}
              onChange={setPsiSpend}
              options={diceOptions}
            />
          </Field>
        ) : null}
        {featureId === 'cunning-action' ? (
          <Field label="Действие">
            <SegmentedControl
              aria-label="Хитрое действие"
              value={cunningAction}
              onChange={setCunningAction}
              options={[
                { id: 'dash', label: 'Рывок' },
                { id: 'disengage', label: 'Отход' },
                { id: 'hide', label: 'Засада' },
              ]}
            />
          </Field>
        ) : null}
        {featureId === 'fast-hands' ? (
          <Field label="Режим">
            <SegmentedControl
              aria-label="Быстрые руки"
              value={fastHandsMode}
              onChange={setFastHandsMode}
              options={[
                { id: 'sleight', label: 'Ловкость рук' },
                { id: 'use_object', label: 'Предмет' },
                { id: 'magic_item', label: 'Маг. предмет' },
              ]}
            />
          </Field>
        ) : null}
        <Text>{body}</Text>
      </Stack>
    </Dialog>
  )
}
