/**
 * 2024 Druid feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * Wild Resurgence, Wild Companion, Land's Aid, Wrath of the Sea, Starry Form, Archdruid
 * (Evergreen Wild Shape, Nature Magician and Longevity are all shown at once).
 * UI kit only.
 */

import { useMemo, useState } from 'react'
import { Button, Dialog, Field, NumberInput, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import type { SpellSlotState } from '../../shared/dnd/spells'
import {
  applyDruid2024FeatureUse,
  druid2024UseFeatureId,
  EVERGREEN_WILD_SHAPE_NAME_RU,
  FIND_FAMILIAR_NAME_RU_2024,
  findWildShapeResource2024,
  LANDS_AID_NAME_RU,
  landsAidFormulaRu2024,
  LONGEVITY_NAME_RU,
  natureMagicianSlotLevel2024,
  natureMagicianSpent2024,
  NATURE_MAGICIAN_NAME_RU,
  STARRY_FORM_NAME_RU,
  STARRY_FORMS_2024,
  starryFormFormulaRu2024,
  WILD_COMPANION_NAME_RU,
  WILD_RESURGENCE_NAME_RU,
  wildResurgenceSlotUsed2024,
  WILD_SHAPE_NAME_RU,
  wrathOfTheSeaFormulaRu2024,
  WRATH_OF_THE_SEA_NAME_RU,
  type Druid2024UseResult,
} from '../../shared/dnd/druid2024Features'

export type DruidFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

export type Druid2024ConfirmResult = Druid2024UseResult & {
  /** Resolved feature id (`archdruid` resolves to the sub-feature that was used). */
  featureId: string
  /** starry-form: chosen constellation. */
  starryForm?: string
}

type Props = {
  open: boolean
  request: DruidFeatureRequest | null
  resources: SheetResource[]
  slots: Record<string, SpellSlotState>
  featurePicks: FeaturePicksState
  druidLevel: number
  wisMod: number
  subclassSlug?: string | null
  onConfirm: (result: Druid2024ConfirmResult) => void
  onClose: () => void
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function SlotLevelPicker({
  levels,
  value,
  onPick,
}: {
  levels: number[]
  value: number
  onPick: (level: number) => void
}) {
  if (levels.length === 0) return <Text tone="muted">Нет подходящих ячеек.</Text>
  return (
    <Stack gap={6}>
      {levels.map((level) => (
        <Button
          key={level}
          size="sm"
          variant={value === level ? 'primary' : 'secondary'}
          onClick={() => onPick(level)}
        >
          {level} круг
        </Button>
      ))}
    </Stack>
  )
}

export function Druid2024UseDialog({
  open,
  request,
  resources,
  slots,
  featurePicks,
  druidLevel,
  wisMod,
  subclassSlug,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState('')
  const [slotLevel, setSlotLevel] = useState(0)
  const [uses, setUses] = useState(1)
  const [companionPay, setCompanionPay] = useState<'wild-shape' | 'slot'>('wild-shape')

  const baseId =
    druid2024UseFeatureId(request?.featureId) ?? request?.featureId.replace(/_/g, '-') ?? ''
  const featureId = baseId === 'archdruid' ? 'nature-magician' : baseId

  const wild = useMemo(
    () => findWildShapeResource2024(resources, request?.classEntryId),
    [resources, request?.classEntryId],
  )

  if (!request) return null

  const wildLeft = wild ? Math.max(0, wild.max - wild.used) : 0
  const freeSlotLevels = LEVELS.filter((level) => {
    const row = slots[String(level)]
    return (row?.max ?? 0) - (row?.used ?? 0) > 0
  })
  const spentSlotLevels = LEVELS.filter((level) => (slots[String(level)]?.used ?? 0) > 0)

  const resurgenceMode = mode === 'shape-to-slot' ? 'shape-to-slot' : 'slot-to-shape'
  const resurgenceUsed = wildResurgenceSlotUsed2024(featurePicks, request.classEntryId)
  const magicianBudget = natureMagicianSlotLevel2024(uses)
  const magicianSpent = natureMagicianSpent2024(featurePicks, request.classEntryId)
  const lockedNote =
    featureId === 'wild-resurgence' && resurgenceMode === 'shape-to-slot' && resurgenceUsed
      ? 'Обмен облика на ячейку уже использован до долгого отдыха.'
      : featureId === 'nature-magician' && magicianSpent
        ? `${NATURE_MAGICIAN_NAME_RU} уже использовано до долгого отдыха.`
        : null

  const wildAtZero = wild != null && wild.used >= wild.max
  const companionSlot = featureId === 'wild-companion' && companionPay === 'slot'
  /** Nature Magician creates a slot of level = 2×uses — no spent-slot picker. */
  const needsSlotPick =
    (featureId === 'wild-resurgence' && resurgenceMode === 'slot-to-shape') ||
    (featureId === 'wild-resurgence' && resurgenceMode === 'shape-to-slot') ||
    companionSlot
  const pickLevels =
    (featureId === 'wild-resurgence' && resurgenceMode === 'slot-to-shape') || companionSlot
      ? freeSlotLevels
      : featureId === 'wild-resurgence'
        ? spentSlotLevels.filter((level) => level === 1)
        : []
  const effectiveSlot = pickLevels.includes(slotLevel) ? slotLevel : (pickLevels[0] ?? 0)

  const primaryDisabled =
    Boolean(lockedNote) ||
    (needsSlotPick && effectiveSlot <= 0) ||
    (featureId === 'nature-magician' && (uses < 1 || uses > wildLeft || magicianBudget < 1)) ||
    (featureId === 'wild-resurgence' && resurgenceMode === 'slot-to-shape' && !wildAtZero) ||
    (featureId === 'wild-companion' && companionPay === 'wild-shape' && wildLeft <= 0) ||
    (featureId === 'starry-form' && !STARRY_FORMS_2024.some((row) => row.id === mode))

  function applyEvergreen() {
    const result = applyDruid2024FeatureUse({
      featureId: 'evergreen-wild-shape',
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      druidLevel,
      subclassSlug,
      wisMod,
      onInitiative: true,
      featurePicks,
    })
    onConfirm({ ...result, featureId: 'evergreen-wild-shape' })
  }

  function confirm() {
    const useMode =
      featureId === 'wild-resurgence'
        ? resurgenceMode
        : featureId === 'wild-companion'
          ? companionPay
          : featureId === 'lands-aid'
          ? mode === 'heal'
            ? 'heal'
            : 'damage'
          : mode || undefined
    const result = applyDruid2024FeatureUse({
      featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      druidLevel,
      subclassSlug,
      wisMod,
      mode: useMode,
      slotLevel: effectiveSlot || undefined,
      usesToConvert: featureId === 'nature-magician' ? uses : undefined,
      featurePicks,
    })
    onConfirm({
      ...result,
      featureId,
      ...(featureId === 'starry-form' ? { starryForm: mode } : {}),
    })
  }

  return (
    <Dialog
      open={open}
      title={request.name}
      primaryLabel={featureId === 'wild-companion' ? 'Выбрать фамильяра' : baseId === 'archdruid' ? `${NATURE_MAGICIAN_NAME_RU}: применить` : 'Применить'}
      secondaryLabel="Отмена"
      primaryDisabled={primaryDisabled}
      onPrimary={confirm}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          {WILD_SHAPE_NAME_RU}: {wildLeft}/{wild?.max ?? 0}
        </Text>

        {baseId === 'archdruid' ? (
          <Stack gap={8}>
            <Text>
              <strong>{EVERGREEN_WILD_SHAPE_NAME_RU}</strong> — при броске инициативы, если
              использований «{WILD_SHAPE_NAME_RU}» не осталось, верни одно использование.
            </Text>
            <Button
              type="button"
              variant="secondary"
              disabled={!wildAtZero}
              onClick={applyEvergreen}
            >
              Бросок инициативы: вернуть использование
            </Button>
            {!wildAtZero ? (
              <Text tone="muted">Сработает, только когда использований облика не осталось.</Text>
            ) : null}
            <Text>
              <strong>{LONGEVITY_NAME_RU}</strong> — ты стареешь в 10 раз медленнее: один год
              возраста за каждые 10 лет.
            </Text>
            <Text>
              <strong>{NATURE_MAGICIAN_NAME_RU}</strong> — настрой ниже, затем «
              {NATURE_MAGICIAN_NAME_RU}: применить».
            </Text>
          </Stack>
        ) : null}

        {featureId === 'wild-companion' ? (
          <>
            <Text>
              Потрать использование «{WILD_SHAPE_NAME_RU}» или ячейку заклинаний: ты накладываешь «
              {FIND_FAMILIAR_NAME_RU_2024}» без материальных компонентов. Фамильяр — фея и исчезает,
              когда ты завершаешь долгий отдых.
            </Text>
            <SegmentedControl
              aria-label={WILD_COMPANION_NAME_RU}
              value={companionPay}
              onChange={(value) => {
                setCompanionPay(value === 'slot' ? 'slot' : 'wild-shape')
                setSlotLevel(0)
              }}
              options={[
                { id: 'wild-shape', label: `Облик (−1, осталось ${wildLeft})` },
                { id: 'slot', label: 'Ячейка заклинаний' },
              ]}
            />
            {companionSlot ? (
              <Field label="Потратить ячейку">
                <SlotLevelPicker levels={pickLevels} value={effectiveSlot} onPick={setSlotLevel} />
              </Field>
            ) : null}
          </>
        ) : null}

        {featureId === 'wild-resurgence' ? (
          <>
            <SegmentedControl
              aria-label={WILD_RESURGENCE_NAME_RU}
              value={resurgenceMode}
              onChange={(value) => {
                setMode(value)
                setSlotLevel(0)
              }}
              options={[
                { id: 'slot-to-shape', label: 'Ячейка → облик' },
                { id: 'shape-to-slot', label: 'Облик → ячейка 1 круга' },
              ]}
            />
            {resurgenceMode === 'slot-to-shape' ? (
              <>
                <Text>
                  Раз за ход, без действия: потрать ячейку любого круга и верни одно использование
                  «{WILD_SHAPE_NAME_RU}». Доступно, только когда использований не осталось.
                </Text>
                {!wildAtZero ? (
                  <Text tone="muted">Сейчас есть использования облика — обмен недоступен.</Text>
                ) : null}
              </>
            ) : (
              <Text>
                Потрать одно использование «{WILD_SHAPE_NAME_RU}» (без действия) и восстанови одну
                потраченную ячейку 1 круга. Раз в долгий отдых.
              </Text>
            )}
            {needsSlotPick ? (
              <Field label={resurgenceMode === 'slot-to-shape' ? 'Потратить ячейку' : 'Восстановить ячейку'}>
                <SlotLevelPicker levels={pickLevels} value={effectiveSlot} onPick={setSlotLevel} />
              </Field>
            ) : null}
          </>
        ) : null}

        {featureId === 'lands-aid' ? (
          <>
            <Text>
              Действие, тратит «{WILD_SHAPE_NAME_RU}»: {LANDS_AID_NAME_RU} —{' '}
              {landsAidFormulaRu2024(druidLevel)} в 60 фт. Урон некротический (спас Тел — половина)
              или лечение.
            </Text>
            <SegmentedControl
              aria-label={LANDS_AID_NAME_RU}
              value={mode === 'heal' ? 'heal' : 'damage'}
              onChange={setMode}
              options={[
                { id: 'damage', label: 'Урон' },
                { id: 'heal', label: 'Лечение' },
              ]}
            />
          </>
        ) : null}

        {featureId === 'wrath-of-the-sea' ? (
          <Text>
            Бонусное действие, тратит «{WILD_SHAPE_NAME_RU}»: аура 5 фт., {WRATH_OF_THE_SEA_NAME_RU}{' '}
            — {wrathOfTheSeaFormulaRu2024(wisMod)} урона холодом по существам в ауре (спас Тел —
            отталкивание при провале).
          </Text>
        ) : null}

        {featureId === 'starry-form' ? (
          <>
            <Text>
              Бонусное действие, тратит «{WILD_SHAPE_NAME_RU}», 10 мин. Лучник / Чаша:{' '}
              {starryFormFormulaRu2024(druidLevel, wisMod)}. Дракон: преимущество на проверки
              концентрации.
            </Text>
            <SegmentedControl
              aria-label={STARRY_FORM_NAME_RU}
              value={mode}
              onChange={setMode}
              options={STARRY_FORMS_2024.map((row) => ({ id: row.id, label: row.nameRu }))}
            />
          </>
        ) : null}

        {featureId === 'evergreen-wild-shape' && baseId !== 'archdruid' ? (
          <Text>
            При броске инициативы, если использований «{WILD_SHAPE_NAME_RU}» не осталось, верни одно
            использование.
          </Text>
        ) : null}

        {featureId === 'nature-magician' ? (
          <>
            <Text>
              Действий не требуется: преобразуй непотраченные использования «{WILD_SHAPE_NAME_RU}» в
              одну ячейку заклинаний — каждое использование даёт 2 уровня ячейки (например, 2 →
              ячейка 4 круга). Раз в долгий отдых.
            </Text>
            <Field label="Потратить использований облика">
              <NumberInput
                min={1}
                max={Math.max(1, wildLeft)}
                value={uses}
                onValueChange={(value) => {
                  setUses(Math.max(1, Math.min(Math.max(1, wildLeft), value ?? 1)))
                }}
              />
            </Field>
            <Text>
              Создать ячейку: <strong>{magicianBudget || '—'} круг</strong>
              {wildLeft < 1 ? ' (нет использований облика)' : ''}
            </Text>
          </>
        ) : null}

        {lockedNote ? <Text tone="muted">{lockedNote}</Text> : null}
      </Stack>
    </Dialog>
  )
}
