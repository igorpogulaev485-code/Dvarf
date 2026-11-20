/**
 * 2024 Paladin feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * Channel options / free smite / free steed / Glorious Defense / Undying Sentinel / L20 capstones.
 * UI kit only (Dialog / Field / Stack / Text / SegmentedControl / NumberInput).
 */

import { useMemo, useState } from 'react'
import { Dialog, Field, NumberInput, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import type { SpellSlotState } from '../../shared/dnd/spells'
import {
  ABJURE_FOES_NAME_RU,
  applyPaladin2024FeatureUse,
  AVENGING_ANGEL_NAME_RU,
  CAPSTONE_REGAIN_SLOT_MIN_2024,
  CHANNEL_DIVINITY_NAME_RU,
  CHANNEL_DIVINITY_POOL_ID,
  DIVINE_SENSE_NAME_RU,
  DIVINE_SMITE_SPELL_NAME_RU,
  ELDER_CHAMPION_NAME_RU,
  FAITHFUL_STEED_NAME_RU,
  FIND_STEED_SPELL_NAME_RU,
  findPaladinPool2024,
  GLORIOUS_DEFENSE_NAME_RU,
  HOLY_NIMBUS_NAME_RU,
  INSPIRING_SMITE_NAME_RU,
  inspiringSmiteTempHpFormulaRu2024,
  LIVING_LEGEND_NAME_RU,
  NATURES_WRATH_NAME_RU,
  PALADINS_SMITE_NAME_RU,
  paladin2024UseFeatureId,
  PEERLESS_ATHLETE_NAME_RU,
  SACRED_WEAPON_NAME_RU,
  UNDYING_SENTINEL_NAME_RU,
  VOW_OF_ENMITY_NAME_RU,
  type Paladin2024UseResult,
} from '../../shared/dnd/paladin2024Features'

export type PaladinFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type Props = {
  open: boolean
  request: PaladinFeatureRequest | null
  resources: SheetResource[]
  slots: Record<string, SpellSlotState>
  paladinLevel: number
  chaMod?: number
  proficiencyBonus?: number
  onConfirm: (result: Paladin2024UseResult) => void
  onClose: () => void
}

const CHANNEL_OPTION_TEXT: Record<string, string> = {
  'divine-sense': `${DIVINE_SENSE_NAME_RU}: бонусное действие, 10 мин., 60 фт.`,
  'abjure-foes': `${ABJURE_FOES_NAME_RU}: выбранные враги в 60 фт., спас Мдр; провал — Испуганы и скорость 0 (1 мин.).`,
  'sacred-weapon': `${SACRED_WEAPON_NAME_RU}: оружие на 10 мин. (бонус Хар к атаке; опционально урон излучением и свет).`,
  'natures-wrath': `${NATURES_WRATH_NAME_RU}: призрачные лозы опутывают врагов (спас Силы).`,
  'vow-of-enmity': `${VOW_OF_ENMITY_NAME_RU}: при действии Атака — преимущество к атакам по одной цели в 30 фт. (1 мин.).`,
  'inspiring-smite': `${INSPIRING_SMITE_NAME_RU}: после «${DIVINE_SMITE_SPELL_NAME_RU}» раздай врем. хиты существам в 30 фт. (бонусное).`,
  'peerless-athlete': `${PEERLESS_ATHLETE_NAME_RU}: преимущество к СИЛ/ЛОВ проверкам и прыжкам (1 час, бонусное).`,
}

const CHANNEL_OPTION_IDS = new Set(Object.keys(CHANNEL_OPTION_TEXT))

const CAPSTONE_IDS = new Set([
  'holy-nimbus',
  'living-legend',
  'elder-champion',
  'avenging-angel',
])

const CAPSTONE_TEXT: Record<string, string> = {
  'holy-nimbus': HOLY_NIMBUS_NAME_RU,
  'living-legend': LIVING_LEGEND_NAME_RU,
  'elder-champion': ELDER_CHAMPION_NAME_RU,
  'avenging-angel': AVENGING_ANGEL_NAME_RU,
}

export function Paladin2024UseDialog({
  open,
  request,
  resources,
  slots,
  paladinLevel,
  chaMod = 0,
  proficiencyBonus = 2,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState('spend')
  const [slotLevel, setSlotLevel] = useState(CAPSTONE_REGAIN_SLOT_MIN_2024)

  const featureId =
    paladin2024UseFeatureId(request?.featureId) ??
    request?.featureId.replace(/_/g, '-') ??
    ''

  const channelRow = useMemo(
    () => findPaladinPool2024(resources, CHANNEL_DIVINITY_POOL_ID, request?.classEntryId),
    [resources, request?.classEntryId],
  )

  if (!request) return null

  const channelLeft = channelRow ? Math.max(0, channelRow.max - channelRow.used) : 0
  const usesChannel = CHANNEL_OPTION_IDS.has(featureId)
  const isCapstone = CAPSTONE_IDS.has(featureId)
  const isFreeSmite = featureId === 'free-smite'
  const isFreeSteed = featureId === 'free-steed'
  const isRefundable =
    usesChannel ||
    isFreeSmite ||
    isFreeSteed ||
    featureId === 'glorious-defense' ||
    featureId === 'undying-sentinel'

  const slotLevels = [5, 6, 7, 8, 9].filter((level) => (slots[String(level)]?.max ?? 0) > 0)
  const activeSlot =
    slotLevels.includes(slotLevel) ? slotLevel : (slotLevels[0] ?? CAPSTONE_REGAIN_SLOT_MIN_2024)

  function confirm() {
    let useMode = mode
    if (isCapstone && mode === 'regain_slot5') useMode = 'regain'
    const result = applyPaladin2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      paladinLevel,
      chaMod,
      proficiencyBonus,
      mode: useMode,
      slotLevel: isCapstone && useMode === 'regain' ? activeSlot : undefined,
      slots,
    })
    onConfirm(result)
  }

  const modeOptions = isCapstone
    ? [
        { id: 'spend', label: 'Применить' },
        { id: 'regain_slot5', label: `Вернуть (ячейка ${CAPSTONE_REGAIN_SLOT_MIN_2024}+)` },
      ]
    : isRefundable
      ? [
          { id: 'spend', label: 'Потратить' },
          { id: 'refund', label: 'Вернуть' },
        ]
      : [{ id: 'spend', label: 'Применить' }]

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
        {usesChannel ? (
          <Text tone="muted">
            {CHANNEL_DIVINITY_NAME_RU}: {channelLeft}/{channelRow?.max ?? 0}
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

        {CHANNEL_OPTION_TEXT[featureId] ? (
          <Text>
            {CHANNEL_OPTION_TEXT[featureId]}
            {featureId === 'inspiring-smite'
              ? ` Пул: ${inspiringSmiteTempHpFormulaRu2024(paladinLevel)}.`
              : ''}
          </Text>
        ) : null}

        {isFreeSmite ? (
          <Text>
            {PALADINS_SMITE_NAME_RU}: «{DIVINE_SMITE_SPELL_NAME_RU}» без ячейки (1/долг. отд.).
          </Text>
        ) : null}

        {isFreeSteed ? (
          <Text>
            {FAITHFUL_STEED_NAME_RU}: «{FIND_STEED_SPELL_NAME_RU}» без ячейки (1/долг. отд.).
          </Text>
        ) : null}

        {featureId === 'glorious-defense' ? (
          <Text>
            {GLORIOUS_DEFENSE_NAME_RU} (реакция): бонус Хар к КД против атаки по тебе или союзнику
            в 10 фт.; при промахе — одна атака по атакующему.
          </Text>
        ) : null}

        {featureId === 'undying-sentinel' ? (
          <Text>
            {UNDYING_SENTINEL_NAME_RU}: при снижении до 0 хитов без мгновенной смерти — остаёшься с
            1 хитом (1/долг. отд.).
          </Text>
        ) : null}

        {isCapstone ? (
          <>
            <Text>
              {CAPSTONE_TEXT[featureId] ?? request.name}: 1/долгий отдых. Можно вернуть, потратив
              ячейку {CAPSTONE_REGAIN_SLOT_MIN_2024}+ круга (без действия).
            </Text>
            {mode === 'regain_slot5' ? (
              slotLevels.length > 0 ? (
                <Field label="Ячейка">
                  <NumberInput
                    min={Math.min(...slotLevels)}
                    max={Math.max(...slotLevels)}
                    value={activeSlot}
                    onValueChange={(value) => {
                      if (value == null) return
                      setSlotLevel(value)
                    }}
                  />
                </Field>
              ) : (
                <Text tone="muted">Нет ячеек {CAPSTONE_REGAIN_SLOT_MIN_2024}+ круга.</Text>
              )
            ) : null}
          </>
        ) : null}
      </Stack>
    </Dialog>
  )
}
