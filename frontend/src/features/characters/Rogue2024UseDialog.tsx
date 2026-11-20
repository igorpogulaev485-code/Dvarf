/**
 * 2024 Rogue feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * PHB pools + P24-M02B book paths (Scion / Phantom).
 */

import { useState } from 'react'
import { Dialog, Field, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  applyRogueBook2024FeatureUse,
  AURA_OF_MALEVOLENCE_NAME_RU,
  BLOODTHIRST_NAME_RU,
  BLOODTHIRST_POOL_ID,
  DEATHS_FRIEND_NAME_RU,
  DREAD_ALLEGIANCE_NAME_RU,
  DREAD_INCARNATE_NAME_RU,
  findRogueBookPool2024,
  GHOST_WALK_NAME_RU,
  GHOST_WALK_POOL_ID,
  rogueBook2024UseFeatureId,
  STRIKE_FEAR_NAME_RU,
  TOKENS_DEATH_KNELL_NAME_RU,
  TOKENS_GAIN_NAME_RU,
  TOKENS_LIFE_ESSENCE_NAME_RU,
  TOKENS_OF_THE_DEPARTED_NAME_RU,
  TOKENS_OF_THE_DEPARTED_POOL_ID,
  TOKENS_QUESTION_NAME_RU,
  VOICE_OF_DEATH_NAME_RU,
  VOICE_OF_DEATH_POOL_ID,
  WAILS_FROM_THE_GRAVE_NAME_RU,
  WAILS_FROM_THE_GRAVE_POOL_ID,
  WHISPERS_OF_THE_DEAD_NAME_RU,
  type RogueBook2024UseMode,
} from '../../shared/dnd/rogueBook2024Features'
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
  bloodthirst: `${BLOODTHIRST_NAME_RU}: реакцией при Окровавленном враге в 30 фт. — телепорт в 5 фт. + одна рукопашная. Пул = мод. ИНТ (мин. 1) / долгий.`,
  'dread-allegiance': `${DREAD_ALLEGIANCE_NAME_RU}: сопротивление и заговор по выбранному божеству (ИНТ); смена на долгом.`,
  'strike-fear': `${STRIKE_FEAR_NAME_RU}: вариант Хитрого удара (1к6) — спас Мудр. или Испуганный; преимущество к атакам.`,
  'aura-of-malevolence': `${AURA_OF_MALEVOLENCE_NAME_RU}: при телепорте Кровожадности — урон мод. ИНТ типа преданности в 10 фт., игнор сопротивления.`,
  'dread-incarnate': `${DREAD_INCARNATE_NAME_RU}: Головорез (+1 Кровожадность на коротком) и Убийственный замысел (минимум 3 на костях Скрытой).`,
  'whispers-of-the-dead': `${WHISPERS_OF_THE_DEAD_NAME_RU}: на коротком/долгом — временное владение навыком или инструментом.`,
  'wails-from-the-grave': `${WAILS_FROM_THE_GRAVE_NAME_RU}: после Скрытой — половина костей некротикой по второй цели в 30 фт. Пул = мод. Лов (мин. 1) / долгий.`,
  'tokens-of-the-departed': `${TOKENS_OF_THE_DEPARTED_NAME_RU}: ${TOKENS_DEATH_KNELL_NAME_RU} / ${TOKENS_LIFE_ESSENCE_NAME_RU} / ${TOKENS_QUESTION_NAME_RU} / ${TOKENS_GAIN_NAME_RU}. Сток 2/3/4.`,
  'voice-of-death': `${VOICE_OF_DEATH_NAME_RU}: Разговор с мёртвыми 1 / короткий или долгий (Ловк.; цель — труп или сувенир).`,
  'ghost-walk': `${GHOST_WALK_NAME_RU}: бонусным — форма 10 мин. (полёт 10 фт., помеха к атакам, бестелесный ход). 1/долгий или восстановить сувениром.`,
  'death-s-friend': `${DEATHS_FRIEND_NAME_RU}: Скорбный вой (стенания обеим целям) и Притяжение смерти (+1 сувенир на инициативе при нуле).`,
}

export function Rogue2024UseDialog({
  open,
  request,
  resources,
  rogueLevel,
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
  const isBook = rogueBook2024UseFeatureId(featureId) != null

  const poolId = isBook
    ? featureId === 'bloodthirst'
      ? BLOODTHIRST_POOL_ID
      : featureId === 'wails-from-the-grave'
        ? WAILS_FROM_THE_GRAVE_POOL_ID
        : featureId === 'tokens-of-the-departed'
          ? TOKENS_OF_THE_DEPARTED_POOL_ID
          : featureId === 'voice-of-death'
            ? VOICE_OF_DEATH_POOL_ID
            : featureId === 'ghost-walk'
              ? GHOST_WALK_POOL_ID
              : null
    : featureId === 'stroke-of-luck'
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
      ? isBook
        ? findRogueBookPool2024(resources, poolId, request.classEntryId)
        : findRoguePool2024(resources, poolId, request.classEntryId)
      : request.resourceId
        ? resources.find((row) => row.id === request.resourceId) ?? null
        : null

  const left =
    pool && pool.track === 'stock'
      ? Math.max(0, Math.min(pool.max, pool.used))
      : pool
        ? Math.max(0, pool.max - pool.used)
        : 0
  const refundable =
    Boolean(poolId) &&
    featureId !== 'steady-aim' &&
    featureId !== 'cunning-action' &&
    featureId !== 'fast-hands' &&
    featureId !== 'cunning-strike' &&
    featureId !== 'tokens-of-the-departed'
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
    if (isBook) {
      const result = applyRogueBook2024FeatureUse({
        featureId,
        resources,
        classEntryId: request!.classEntryId,
        rogueLevel,
        mode: mode as RogueBook2024UseMode,
      })
      onConfirm(result)
      return
    }
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
          : featureId === 'bloodthirst'
            ? 'Реакция'
            : featureId === 'tokens-of-the-departed'
              ? 'Уничтожить'
              : 'Потратить',
    },
    ...(refundable && !canRestoreVeil && !canRestoreRend
      ? [{ id: 'refund', label: 'Вернуть' }]
      : []),
    ...(canRestoreVeil || canRestoreRend
      ? [{ id: 'restore_psi', label: 'Восстановить пси' }]
      : []),
    ...(featureId === 'bloodthirst' && rogueLevel >= 13
      ? [
          { id: 'aura_from', label: 'Аура: откуда' },
          { id: 'aura_to', label: 'Аура: куда' },
        ]
      : []),
    ...(featureId === 'wails-from-the-grave' && rogueLevel >= 17
      ? [{ id: 'wails_both', label: 'Обеим целям' }]
      : []),
    ...(featureId === 'wails-from-the-grave' && rogueLevel >= 9
      ? [{ id: 'death_knell', label: 'Перезвон' }]
      : []),
    ...(featureId === 'tokens-of-the-departed'
      ? [
          { id: 'death_knell', label: 'Перезвон' },
          { id: 'question_spirits', label: 'Вопрос' },
          { id: 'gain_reaction', label: 'Получить' },
        ]
      : []),
    ...(featureId === 'ghost-walk'
      ? [{ id: 'restore_ghost_walk', label: 'Восстановить сувениром' }]
      : []),
    ...(featureId === 'dread-incarnate'
      ? [{ id: 'sneak_min3', label: 'Мин. 3 на костях' }]
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
            {pool.track === 'stock' ? 'Сувениры' : 'Осталось'}: {left}/{pool.max}
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
