/**
 * 2024 Bard feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * UI kit only (Dialog / Field / Stack / Text / SegmentedControl / NumberInput / Input).
 * Bardic Inspiration here follows the 2024 rules (1 hour, after a failed d20 Test, never on yourself);
 * the 2014 «BardicInspirationSpendDialog» stays untouched.
 */

import { useState } from 'react'
import { Dialog, Field, Input, NumberInput, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import type { SpellSlotState } from '../../shared/dnd/spells'
import {
  applyBard2024FeatureUse,
  BARDIC_INSPIRATION_NAME_RU,
  BEGUILING_MAGIC_POOL_ID,
  BI_SPEND_RULE_RU_2024,
  bard2024UseFeatureId,
  bardicInspirationDieLabelRu2024,
  bardicInspirationDieSides2024,
  COUNTERCHARM_BUTTON_2024,
  findBiPool2024,
  glamourMantleTargets2024,
  glamourMantleTempHp2024,
  MANTLE_OF_MAJESTY_POOL_ID,
  VALOR_COMBAT_INSPIRATION_MODES_2024,
  type Bard2024UseResult,
} from '../../shared/dnd/bard2024Features'
import { findFeatureResource } from '../../shared/dnd/featureResources'

export type BardFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type Props = {
  open: boolean
  request: BardFeatureRequest | null
  resources: SheetResource[]
  slots: Record<string, SpellSlotState>
  bardLevel: number
  chaScore?: number
  onConfirm: (result: Bard2024UseResult) => void
  onClose: () => void
}

const SIMPLE_TEXT: Record<string, string> = {
  'cutting-words':
    'Реакция, 60 фт.: существо наносит урон, преуспевает в проверке характеристик или попадает атакой — брось кость вдохновения и вычти результат.',
  'tandem-footwork':
    'При броске Инициативы: брось кость — ты и союзники в 30 фт., которые тебя слышат или видят, прибавляют результат к Инициативе.',
  'inspiring-movement':
    'Реакция: враг в 5 фт. закончил ход — перемести себя на половину Скорости, затем союзника в 30 фт.; без провоцированных атак.',
  'unbreakable-majesty':
    'Бонусное действие: величественный облик на 1 мин. Попавший по тебе проходит спас Харизмы против Сл заклинаний, иначе попадание — промах.',
  'superior-inspiration':
    'При броске Инициативы: если у тебя меньше двух использований Бардовского вдохновения, доберись до двух.',
  'battle-magic': 'После заклинания со временем сотворения «действие» — одна атака оружием бонусным действием.',
}

export function Bard2024UseDialog({
  open,
  request,
  resources,
  slots,
  bardLevel,
  chaScore,
  onConfirm,
  onClose,
}: Props) {
  const [targetName, setTargetName] = useState('')
  const [targetKind, setTargetKind] = useState<'other' | 'has_die' | 'self'>('other')
  const [slotLevel, setSlotLevel] = useState('')
  const [dieRoll, setDieRoll] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<'success' | 'fail'>('success')
  const [mode, setMode] = useState<'use' | 'regain'>('use')
  const [choice, setChoice] = useState<string>(VALOR_COMBAT_INSPIRATION_MODES_2024[0].id)

  if (!request) return null

  const featureId = bard2024UseFeatureId(request.featureId) ?? request.featureId.replace(/_/g, '-')
  const biRow = findBiPool2024(resources, request.classEntryId)
  const biLeft = biRow ? Math.max(0, biRow.max - biRow.used) : 0
  const sides = bardicInspirationDieSides2024(bardLevel)
  const dieLabel = bardicInspirationDieLabelRu2024(bardLevel)

  const usesBi =
    featureId === 'bardic-inspiration' ||
    featureId === 'cutting-words' ||
    featureId === 'peerless-skill' ||
    featureId === 'mantle-of-inspiration' ||
    featureId === 'inspiring-movement' ||
    featureId === 'tandem-footwork' ||
    (featureId === 'beguiling-magic' && mode === 'regain')

  const freeSlotCircles = Object.entries(slots)
    .filter(([, row]) => row.max > 0 && row.used < row.max)
    .map(([circle]) => Number(circle))
    .sort((a, b) => a - b)
  const selectedCircle = slotLevel || String(freeSlotCircles[0] ?? '')
  const slotOptions = (minCircle: number) =>
    freeSlotCircles
      .filter((circle) => circle >= minCircle)
      .map((circle) => ({ id: String(circle), label: `${circle} круг` }))

  const regainPool =
    featureId === 'beguiling-magic'
      ? findFeatureResource(resources, request.classSlug, BEGUILING_MAGIC_POOL_ID, request.classEntryId)
      : featureId === 'mantle-of-majesty'
        ? findFeatureResource(resources, request.classSlug, MANTLE_OF_MAJESTY_POOL_ID, request.classEntryId)
        : null
  const canRegain = Boolean(regainPool && regainPool.used > 0)
  const effectiveRoll = Math.max(1, Math.min(sides, dieRoll ?? 1))

  function confirm() {
    const result = applyBard2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      bardLevel,
      chaScore,
      slots,
      slotLevel: Number(selectedCircle) || undefined,
      targetIsSelf: targetKind === 'self',
      targetHasBardicDie: targetKind === 'has_die',
      targetName,
      dieRoll: featureId === 'mantle-of-inspiration' ? effectiveRoll : undefined,
      mode: featureId === 'beguiling-magic' || featureId === 'mantle-of-majesty' ? mode : null,
      succeeded: featureId === 'peerless-skill' ? outcome === 'success' : undefined,
      choice: featureId === 'combat-inspiration' ? choice : null,
    })
    onConfirm(result)
  }

  const needsSlot =
    featureId === 'font-of-inspiration' || (featureId === 'mantle-of-majesty' && mode === 'regain')
  const primaryDisabled = needsSlot && !selectedCircle

  return (
    <Dialog
      open={open}
      title={request.name}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      primaryDisabled={primaryDisabled}
      onPrimary={confirm}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        {usesBi || featureId === 'font-of-inspiration' ? (
          <Text tone="muted">
            {BARDIC_INSPIRATION_NAME_RU}: {biLeft}/{biRow?.max ?? 0} · {dieLabel}
          </Text>
        ) : null}

        {featureId === 'bardic-inspiration' ? (
          <>
            <Text>
              Бонусное действие, другое существо в 60 фт., которое видит или слышит тебя. {BI_SPEND_RULE_RU_2024}
            </Text>
            <Field label="Кому">
              <Input
                value={targetName}
                placeholder="Имя союзника"
                onChange={(event) => setTargetName(event.target.value)}
              />
            </Field>
            <SegmentedControl
              aria-label="Цель вдохновения"
              value={targetKind}
              onChange={setTargetKind}
              options={[
                { id: 'other', label: 'Другое существо' },
                { id: 'has_die', label: 'Уже есть кость' },
                { id: 'self', label: 'Я сам' },
              ]}
            />
            {targetKind === 'self' ? <Text tone="muted">Себе вдохновение даровать нельзя.</Text> : null}
            {targetKind === 'has_die' ? (
              <Text tone="muted">У существа может быть только одна кость вдохновения.</Text>
            ) : null}
          </>
        ) : null}

        {featureId === 'font-of-inspiration' ? (
          <>
            <Text>
              Без действия: потрать ячейку любого круга — вернётся 1 использование Бардовского вдохновения.
              Короткий или долгий отдых возвращает все использования.
            </Text>
            <Field label="Ячейка">
              {freeSlotCircles.length ? (
                <SegmentedControl
                  aria-label="Круг ячейки"
                  value={selectedCircle}
                  onChange={setSlotLevel}
                  options={slotOptions(1)}
                />
              ) : (
                <Text tone="muted">Свободных ячеек нет.</Text>
              )}
            </Field>
          </>
        ) : null}

        {featureId === 'countercharm' ? (
          <>
            <Text>
              Реакция (без траты вдохновения): {COUNTERCHARM_BUTTON_2024.triggerRu}. Перебрось проваленный спасбросок
              с Преимуществом.
            </Text>
          </>
        ) : null}

        {featureId === 'mantle-of-inspiration' ? (
          <>
            <Text>
              Бонусное действие: до {glamourMantleTargets2024(chaScore)} существ в 60 фт. получают Временные хиты
              (удвоенный результат кости) и реакцией перемещаются без провоцированных атак.
            </Text>
            <Field label={`Результат ${dieLabel}`}>
              <NumberInput
                min={1}
                max={sides}
                value={dieRoll ?? 1}
                onValueChange={(value) => setDieRoll(value ?? 1)}
              />
            </Field>
            <Text tone="muted">Временные хиты: {glamourMantleTempHp2024(effectiveRoll)}</Text>
          </>
        ) : null}

        {featureId === 'peerless-skill' ? (
          <>
            <Text>
              Провалена проверка характеристики или атака: брось {dieLabel} и прибавь. Использование тратится только
              при успехе.
            </Text>
            <SegmentedControl
              aria-label="Итог с костью"
              value={outcome}
              onChange={setOutcome}
              options={[
                { id: 'success', label: 'Теперь успех' },
                { id: 'fail', label: 'Всё равно провал' },
              ]}
            />
          </>
        ) : null}

        {featureId === 'beguiling-magic' ? (
          <>
            <Text>
              После заклинания Очарования или Иллюзии ячейкой: спас Мудрости видимого в 60 фт. существа — Очарованный
              или Испуганный на 1 мин. 1/долгий отдых; вернуть, потратив использование вдохновения (без действия).
            </Text>
            {canRegain ? (
              <SegmentedControl
                aria-label="Режим"
                value={mode}
                onChange={setMode}
                options={[
                  { id: 'use', label: 'Применить' },
                  { id: 'regain', label: 'Вернуть за вдохновение' },
                ]}
              />
            ) : null}
          </>
        ) : null}

        {featureId === 'mantle-of-majesty' ? (
          <>
            <Text>
              Бонусное действие, концентрация, 1 мин.: «Приказ» бонусным действием без ячейки. 1/долгий отдых; вернуть
              ячейкой 3 круга или выше (без действия).
            </Text>
            {canRegain ? (
              <SegmentedControl
                aria-label="Режим"
                value={mode}
                onChange={setMode}
                options={[
                  { id: 'use', label: 'Применить' },
                  { id: 'regain', label: 'Вернуть ячейкой' },
                ]}
              />
            ) : null}
            {mode === 'regain' ? (
              <Field label="Ячейка">
                {slotOptions(3).length ? (
                  <SegmentedControl
                    aria-label="Круг ячейки"
                    value={selectedCircle}
                    onChange={setSlotLevel}
                    options={slotOptions(3)}
                  />
                ) : (
                  <Text tone="muted">Нужна свободная ячейка 3 круга или выше.</Text>
                )}
              </Field>
            ) : null}
          </>
        ) : null}

        {featureId === 'combat-inspiration' ? (
          <>
            <Text>
              Существо с твоей костью вдохновения прибавляет её к КД против попавшей атаки (реакция) или к урону своей
              попавшей атаки.
            </Text>
            <SegmentedControl
              aria-label="Режим боевого вдохновения"
              value={choice}
              onChange={setChoice}
              options={VALOR_COMBAT_INSPIRATION_MODES_2024.map((row) => ({ id: row.id, label: row.labelRu }))}
            />
          </>
        ) : null}

        {SIMPLE_TEXT[featureId] ? <Text>{SIMPLE_TEXT[featureId]}</Text> : null}
      </Stack>
    </Dialog>
  )
}
