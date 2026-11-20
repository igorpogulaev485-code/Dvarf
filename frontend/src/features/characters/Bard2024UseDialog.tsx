/**
 * 2024 Bard feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * UI kit only (Dialog / Field / Stack / Text / SegmentedControl / NumberInput / Input).
 * Includes P24-M02B-bard Moon / Spirits desk modes.
 */

import { useMemo, useState } from 'react'
import { Dialog, Field, Input, NumberInput, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import type { SpellSlotState } from '../../shared/dnd/spells'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
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
  listSpiritsBankLabel2024,
  MANTLE_OF_MAJESTY_POOL_ID,
  spiritsPickerOptions2024,
  VALOR_COMBAT_INSPIRATION_MODES_2024,
  type Bard2024UseResult,
} from '../../shared/dnd/bard2024Features'
import {
  BLESSING_OF_MOONLIGHT_NAME_RU,
  EMPOWERED_CHANNELING_NAME_RU,
  FORCES_FROM_BEYOND_NAME_RU,
  FULL_MOON_RESONANCE_NAME_RU,
  GUIDED_SUMMON_NAME_RU,
  INSPIRED_ECLIPSE_NAME_RU,
  LUNAR_VITALITY_NAME_RU,
  MOONS_INSPIRATION_NAME_RU,
  RELEASE_SPIRIT_NAME_RU,
  SPIRIT_MANIFESTATION_NAME_RU,
  SPIRITS_FROM_BEYOND_NAME_RU,
  readSpiritsBank2024,
} from '../../shared/dnd/bardBook2024Features'
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
  featurePicks?: FeaturePicksState | null
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
  channeler:
    'Указание на 60 фт.; фокусировка — набор игральных карт (или кристалл/сфера, свеча, писчее перо).',
  'eventides-splendor':
    'Усиливает Вдохновенное затмение (Тень новолуния) и Лунную живучесть (Резонанс полнолуния: 1к6 без списания пула).',
  'mystical-connection':
    'При броске по таблице «Замогильные духи» — два броска на выбор; при дубле — любой дух из таблицы.',
}

export function Bard2024UseDialog({
  open,
  request,
  resources,
  slots,
  bardLevel,
  chaScore,
  featurePicks,
  onConfirm,
  onClose,
}: Props) {
  const [targetName, setTargetName] = useState('')
  const [targetKind, setTargetKind] = useState<'other' | 'has_die' | 'self'>('other')
  const [slotLevel, setSlotLevel] = useState('')
  const [dieRoll, setDieRoll] = useState<number | null>(null)
  const [dieRoll2, setDieRoll2] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<'success' | 'fail'>('success')
  const [mode, setMode] = useState<'use' | 'regain' | 'full-moon' | 'pick-b'>('use')
  const [choice, setChoice] = useState<string>(VALOR_COMBAT_INSPIRATION_MODES_2024[0].id)
  const [spiritRoll, setSpiritRoll] = useState('')

  const sides = bardicInspirationDieSides2024(bardLevel)
  const dieLabel = bardicInspirationDieLabelRu2024(bardLevel)
  const spiritOptions = useMemo(() => spiritsPickerOptions2024(sides), [sides])
  const entryId = request?.classEntryId ?? ''
  const bank = readSpiritsBank2024(featurePicks, entryId)
  const bankOptions = bank.map((row, index) => ({
    id: String(row.roll),
    label: `${row.roll}. ${row.nameRu}${index > 0 ? ` #${index + 1}` : ''}`,
  }))

  if (!request) return null

  const featureId = bard2024UseFeatureId(request.featureId) ?? request.featureId.replace(/_/g, '-')
  const biRow = findBiPool2024(resources, request.classEntryId)
  const biLeft = biRow ? Math.max(0, biRow.max - biRow.used) : 0

  const usesBi =
    featureId === 'bardic-inspiration' ||
    featureId === 'cutting-words' ||
    featureId === 'peerless-skill' ||
    featureId === 'mantle-of-inspiration' ||
    featureId === 'inspiring-movement' ||
    featureId === 'tandem-footwork' ||
    (featureId === 'beguiling-magic' && mode === 'regain') ||
    featureId === 'moons-inspiration' ||
    (featureId === 'spirits-from-beyond' && (choice === 'random' || choice === 'guided'))

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
    const bookChoice =
      featureId === 'combat-inspiration' ||
      featureId === 'moons-inspiration' ||
      featureId === 'spirits-from-beyond' ||
      featureId === 'empowered-channeling'
        ? choice
        : null
    const bookMode =
      featureId === 'beguiling-magic' || featureId === 'mantle-of-majesty'
        ? mode
        : featureId === 'moons-inspiration' && choice === 'vitality' && mode === 'full-moon'
          ? 'full-moon'
          : featureId === 'spirits-from-beyond' && mode === 'pick-b'
            ? 'pick-b'
            : null
    const result = applyBard2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      bardLevel,
      chaScore,
      slots,
      featurePicks,
      slotLevel: Number(selectedCircle) || undefined,
      targetIsSelf: targetKind === 'self',
      targetHasBardicDie: targetKind === 'has_die',
      targetName,
      dieRoll:
        featureId === 'mantle-of-inspiration' ||
        featureId === 'moons-inspiration' ||
        featureId === 'spirits-from-beyond' ||
        featureId === 'empowered-channeling'
          ? effectiveRoll
          : undefined,
      dieRoll2: featureId === 'spirits-from-beyond' ? Math.max(1, Math.min(sides, dieRoll2 ?? 1)) : undefined,
      mode: bookMode,
      succeeded: featureId === 'peerless-skill' ? outcome === 'success' : undefined,
      choice: bookChoice,
      spiritRoll: spiritRoll ? Number(spiritRoll) : undefined,
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
                value={mode === 'regain' ? 'regain' : 'use'}
                onChange={(id) => setMode(id as 'use' | 'regain')}
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
                value={mode === 'regain' ? 'regain' : 'use'}
                onChange={(id) => setMode(id as 'use' | 'regain')}
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

        {featureId === 'moons-inspiration' ? (
          <>
            <Text data-testid="p24-m02b-moon-inspiration">
              {MOONS_INSPIRATION_NAME_RU}: {INSPIRED_ECLIPSE_NAME_RU} (вместе с дарованием кости) или{' '}
              {LUNAR_VITALITY_NAME_RU} (при лечении заклинанием, 1/ход).
            </Text>
            <SegmentedControl
              aria-label="Ветвь Вдохновения луны"
              value={choice === 'vitality' ? 'vitality' : 'eclipse'}
              onChange={setChoice}
              options={[
                { id: 'eclipse', label: INSPIRED_ECLIPSE_NAME_RU },
                { id: 'vitality', label: LUNAR_VITALITY_NAME_RU },
              ]}
            />
            {choice === 'eclipse' || choice !== 'vitality' ? (
              <Field label="Кому">
                <Input
                  value={targetName}
                  placeholder="Имя союзника"
                  onChange={(event) => setTargetName(event.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field label={`Результат кости (${dieLabel} или 1к6)`}>
                  <NumberInput
                    min={1}
                    max={sides}
                    value={dieRoll ?? 1}
                    onValueChange={(value) => setDieRoll(value ?? 1)}
                  />
                </Field>
                {bardLevel >= 14 ? (
                  <SegmentedControl
                    aria-label="Резонанс полнолуния"
                    value={mode === 'full-moon' ? 'full-moon' : 'use'}
                    onChange={(id) => setMode(id as 'use' | 'full-moon')}
                    options={[
                      { id: 'use', label: 'Потратить кость BI' },
                      { id: 'full-moon', label: FULL_MOON_RESONANCE_NAME_RU },
                    ]}
                  />
                ) : null}
              </>
            )}
          </>
        ) : null}

        {featureId === 'blessing-of-moonlight' ? (
          <Text data-testid="p24-m02b-moonbeam-mod">
            {BLESSING_OF_MOONLIGHT_NAME_RU}: изменить Лунный луч — Тусклый свет 5 фт.; при провале спаса — 2к4 Хитов
            другому существу в 60 фт. (1/долгий).
          </Text>
        ) : null}

        {featureId === 'spirits-from-beyond' ? (
          <>
            <Text data-testid="p24-m02b-spirits-bank">{listSpiritsBankLabel2024(featurePicks, request.classEntryId)}</Text>
            <SegmentedControl
              aria-label="Замогильные духи"
              value={choice === 'guided' || choice === 'release' ? choice : 'random'}
              onChange={setChoice}
              options={[
                { id: 'random', label: 'Случайный + BI' },
                { id: 'guided', label: GUIDED_SUMMON_NAME_RU },
                { id: 'release', label: RELEASE_SPIRIT_NAME_RU },
              ]}
            />
            {(choice === 'random' || choice !== 'guided' && choice !== 'release') && (
              <>
                <Field label="Кому даровать BI">
                  <Input
                    value={targetName}
                    placeholder="Имя союзника"
                    onChange={(event) => setTargetName(event.target.value)}
                  />
                </Field>
                {bardLevel >= 14 ? (
                  <>
                    <Field label={`Бросок 1 (${dieLabel})`}>
                      <NumberInput
                        min={1}
                        max={sides}
                        value={dieRoll ?? 1}
                        onValueChange={(value) => setDieRoll(value ?? 1)}
                      />
                    </Field>
                    <Field label={`Бросок 2 (${dieLabel})`}>
                      <NumberInput
                        min={1}
                        max={sides}
                        value={dieRoll2 ?? 1}
                        onValueChange={(value) => setDieRoll2(value ?? 1)}
                      />
                    </Field>
                    <SegmentedControl
                      aria-label="Какой бросок взять"
                      value={mode === 'pick-b' ? 'pick-b' : 'use'}
                      onChange={(id) => setMode(id as 'use' | 'pick-b')}
                      options={[
                        { id: 'use', label: 'Первый бросок' },
                        { id: 'pick-b', label: 'Второй бросок' },
                      ]}
                    />
                    <Field label="Или любой дух при дубле / выборе">
                      <SegmentedControl
                        aria-label="Дух таблицы"
                        value={spiritRoll || String(spiritOptions[0]?.id ?? '')}
                        onChange={setSpiritRoll}
                        options={spiritOptions}
                      />
                    </Field>
                  </>
                ) : null}
              </>
            )}
            {choice === 'guided' ? (
              <Field label={`${GUIDED_SUMMON_NAME_RU} (−1 BI)`}>
                <SegmentedControl
                  aria-label="Управляемый дух"
                  value={spiritRoll || String(spiritOptions[0]?.id ?? '')}
                  onChange={setSpiritRoll}
                  options={spiritOptions}
                />
              </Field>
            ) : null}
            {choice === 'release' ? (
              <>
                <Field label="Дух из банка">
                  {bankOptions.length ? (
                    <SegmentedControl
                      aria-label="Выпустить духа"
                      value={spiritRoll || String(bankOptions[0]?.id ?? '')}
                      onChange={setSpiritRoll}
                      options={bankOptions}
                    />
                  ) : (
                    <Text tone="muted">Банк пуст — сначала призовите духа.</Text>
                  )}
                </Field>
                <Field label="Цель (30 фт.)">
                  <Input
                    value={targetName}
                    placeholder="Имя цели"
                    onChange={(event) => setTargetName(event.target.value)}
                  />
                </Field>
              </>
            ) : null}
          </>
        ) : null}

        {featureId === 'empowered-channeling' ? (
          <>
            <Text data-testid="p24-m02b-empowered-channeling">{EMPOWERED_CHANNELING_NAME_RU}</Text>
            <SegmentedControl
              aria-label="Улучшенный призыв"
              value={choice === 'free' || choice === 'cover' ? choice : 'force'}
              onChange={setChoice}
              options={[
                { id: 'force', label: FORCES_FROM_BEYOND_NAME_RU },
                { id: 'free', label: 'Стражи без ячейки' },
                { id: 'cover', label: SPIRIT_MANIFESTATION_NAME_RU },
              ]}
            />
            {(choice === 'force' || (choice !== 'free' && choice !== 'cover')) && (
              <Field label="Результат 1к6">
                <NumberInput
                  min={1}
                  max={6}
                  value={dieRoll ?? 1}
                  onValueChange={(value) => setDieRoll(value ?? 1)}
                />
              </Field>
            )}
          </>
        ) : null}

        {SIMPLE_TEXT[featureId] ? <Text>{SIMPLE_TEXT[featureId]}</Text> : null}
        {featureId === 'spirits-from-beyond' ? (
          <Text tone="muted">{SPIRITS_FROM_BEYOND_NAME_RU}: банк очищается на коротком или долгом отдыхе.</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
