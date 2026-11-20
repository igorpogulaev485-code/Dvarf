/**
 * 2024 Warlock feature «use» dialog — edition branch only.
 * UI kit only (Dialog / Field / Stack / Text / NumberInput / SegmentedControl).
 */

import { useMemo, useState } from 'react'
import { Dialog, Field, NumberInput, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  applyWarlock2024FeatureUse,
  arcanumCirclesForWarlockLevel2024,
  AT_WILL_INVOCATION_CASTS_2024,
  FIENDISH_RESILIENCE_TYPES_2024,
  findHealingLightResource,
  findMagicalCunningResource,
  findMysticArcanumResource,
  FORM_OF_DREAD_NAME_RU,
  GRAVE_TOUCHED_NAME_RU,
  healingLightMaxDicePerUse2024,
  NECROTIC_HUSK_NAME_RU,
  SEMBLANCE_OF_LIFE_NAME_RU,
  STEPS_OF_THE_FEY_MODES_2024,
  SUPERIOR_DREAD_NAME_RU,
  VESTIGE_POWER_NAME_RU,
  VESTIGE_RECOVERY_NAME_RU,
  warlock2024ArcanumCircleFromId,
  warlock2024UseFeatureId,
  type WarlockFeatureUseResult,
  type WarlockPactSlots2024,
} from '../../shared/dnd/warlock2024Features'
import {
  FORM_OF_DREAD_ACTIVE_PICK,
  semblanceSpellLevel2024,
} from '../../shared/dnd/warlockBook2024Features'
import { getFeaturePick } from '../../shared/dnd/featurePicks'

export type WarlockFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type Props = {
  open: boolean
  request: WarlockFeatureRequest | null
  resources: SheetResource[]
  featurePicks: FeaturePicksState
  pactSlots: WarlockPactSlots2024
  warlockLevel: number
  chaMod?: number
  onConfirm: (result: WarlockFeatureUseResult) => void
  onClose: () => void
}

const RECOVERABLE_WITH_PACT = new Set([
  'beguiling-defenses',
  'clairvoyant-combatant',
  'hurl-through-hell',
])

export function Warlock2024UseDialog({
  open,
  request,
  resources,
  featurePicks,
  pactSlots,
  warlockLevel,
  chaMod = 0,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState('')
  const [circle, setCircle] = useState<number | null>(null)
  const [amount, setAmount] = useState(1)
  const [damageType, setDamageType] = useState('')
  const [armorOn, setArmorOn] = useState(true)

  const featureId =
    warlock2024UseFeatureId(request?.featureId) ?? request?.featureId.replace(/_/g, '-') ?? ''

  const cunningRow = useMemo(() => findMagicalCunningResource(resources), [resources])
  const healingRow = useMemo(() => findHealingLightResource(resources), [resources])
  const circles = useMemo(() => arcanumCirclesForWarlockLevel2024(warlockLevel), [warlockLevel])

  if (!request) return null

  const pactLeft = pactSlots ? Math.max(0, pactSlots.max - pactSlots.used) : 0
  const pactSpent = pactSlots ? Math.min(pactSlots.max, pactSlots.used) : 0
  const idCircle = warlock2024ArcanumCircleFromId(request.featureId)
  const activeCircle = circle ?? idCircle ?? (circles.length === 1 ? circles[0]! : null)
  const arcanumRow =
    featureId === 'mystic-arcanum' && activeCircle != null
      ? findMysticArcanumResource(resources, activeCircle)
      : null
  const healingLeft = healingRow ? Math.max(0, healingRow.max - healingRow.used) : 0
  const healingCap = healingLightMaxDicePerUse2024(chaMod)
  const atWill = AT_WILL_INVOCATION_CASTS_2024[featureId]

  const stepsModes = STEPS_OF_THE_FEY_MODES_2024.filter((row) => warlockLevel >= row.minLevel)
  const stepsMode = mode || (featureId === 'misty-escape' ? 'concealing' : 'refreshing')

  const dreadActive =
    getFeaturePick(featurePicks, request.classEntryId, FORM_OF_DREAD_ACTIVE_PICK) === 'on'
  const semblanceCircle = semblanceSpellLevel2024(warlockLevel)

  function confirm() {
    let useMode: string | undefined = mode || undefined
    if (featureId === 'steps-of-the-fey' || featureId === 'misty-escape') useMode = stepsMode
    if (featureId === 'mystic-arcanum') useMode = mode || 'cast'
    if (featureId === 'armor-of-shadows') useMode = armorOn ? 'on' : 'off'
    if (featureId === 'form-of-dread') {
      useMode = mode === 'end' || mode === 'fear' ? mode : 'activate'
    }
    if (featureId === 'grave-touched') {
      useMode = mode === 'extra-die' ? 'extra-die' : 'damage-swap'
    }
    const result = applyWarlock2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      warlockLevel,
      chaMod,
      pactSlots,
      mode: useMode,
      circle: activeCircle,
      amount,
      choice:
        featureId === 'fiendish-resilience'
          ? damageType || FIENDISH_RESILIENCE_TYPES_2024[0].id
          : undefined,
      featurePicks,
    })
    onConfirm(result)
  }

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
        {pactSlots && pactSlots.max > 0 ? (
          <Text tone="muted">
            Ячейки договора: {pactLeft}/{pactSlots.max} · {pactSlots.level} круг
          </Text>
        ) : (
          <Text tone="muted">Ячеек Магии договора нет.</Text>
        )}

        {featureId === 'magical-cunning' || featureId === 'eldritch-master' ? (
          <>
            <Text>
              {warlockLevel >= 20
                ? 'Таинственный мастер: 1 минута ритуала — восстанавливаются все потраченные ячейки договора.'
                : 'Ритуал на 1 минуту: восстанавливается до половины максимума ячеек договора (округляя вверх).'}
            </Text>
            <Text tone="muted">
              Потрачено ячеек: {pactSpent}
              {cunningRow && cunningRow.used >= cunningRow.max
                ? ' · Магическая искусность уже использована до долгого отдыха'
                : ''}
            </Text>
            {featureId === 'eldritch-master' ? (
              <SegmentedControl
                aria-label="Режим"
                value={mode === 'cunning' ? 'cunning' : 'info'}
                onChange={setMode}
                options={[
                  { id: 'info', label: 'Правило' },
                  { id: 'cunning', label: 'Восстановить ячейки' },
                ]}
              />
            ) : null}
          </>
        ) : null}

        {featureId === 'contact-patron' ? (
          <Text>
            Раз за долгий отдых: «Связь с иным миром» без ячейки и компонентов; спасбросок
            автоматически успешен.
          </Text>
        ) : null}

        {featureId === 'mystic-arcanum' ? (
          <>
            <Text tone="muted">Одно заклинание выбранного круга без ячейки за долгий отдых.</Text>
            {idCircle == null && circles.length > 1 ? (
              <Field label="Круг арканума">
                <SegmentedControl
                  aria-label="Круг арканума"
                  value={String(activeCircle ?? circles[0])}
                  onChange={(id) => setCircle(Number(id))}
                  options={circles.map((c) => ({ id: String(c), label: `${c} круг` }))}
                />
              </Field>
            ) : null}
            {arcanumRow ? (
              <Text tone="muted">
                {arcanumRow.used >= arcanumRow.max ? 'Потрачен' : 'Доступен'} · {activeCircle} круг
              </Text>
            ) : null}
            <SegmentedControl
              aria-label="Действие"
              value={mode === 'return' ? 'return' : 'cast'}
              onChange={setMode}
              options={[
                { id: 'cast', label: 'Сотворить' },
                { id: 'return', label: 'Вернуть использование' },
              ]}
            />
          </>
        ) : null}

        {featureId === 'steps-of-the-fey' || featureId === 'misty-escape' ? (
          <>
            <Text tone="muted">
              {featureId === 'misty-escape'
                ? 'Реакция при получении урона: «Туманный шаг», затем эффект.'
                : 'Бонусное действие: «Туманный шаг», затем эффект.'}
            </Text>
            <Field label="Эффект">
              <SegmentedControl
                aria-label="Эффект шага"
                value={stepsMode}
                onChange={setMode}
                options={stepsModes.map((row) => ({ id: row.id, label: row.nameRu }))}
              />
            </Field>
            <Text tone="muted">
              {stepsModes.find((row) => row.id === stepsMode)?.summaryRu ?? ''}
            </Text>
          </>
        ) : null}

        {RECOVERABLE_WITH_PACT.has(featureId) ? (
          <>
            <Text tone="muted">
              Раз за отдых или восстановить за одну ячейку Магии договора (доступно: {pactLeft}).
            </Text>
            <SegmentedControl
              aria-label="Действие"
              value={mode === 'recover' ? 'recover' : 'use'}
              onChange={setMode}
              options={[
                { id: 'use', label: 'Применить' },
                { id: 'recover', label: 'Восстановить за ячейку' },
              ]}
            />
          </>
        ) : null}

        {featureId === 'bewitching-magic' ? (
          <Text>
            После заклинания Очарования или Иллюзии (ячейкой) сотвори «Туманный шаг» без ячейки в
            рамках того же действия.
          </Text>
        ) : null}

        {featureId === 'awakened-mind' ? (
          <Text>Телепатия с существом в 30 фт., которое ты видишь; общий язык не нужен.</Text>
        ) : null}

        {featureId === 'eldritch-hex' ? (
          <Text>
            «Сглаз» всегда подготовлен; цель под «Сглазом» делает спасброски выбранной
            характеристики с помехой.
          </Text>
        ) : null}

        {featureId === 'thought-shield' ? (
          <Text>
            Мысли закрыты; сопротивление психическому; отражение психического урона атакующему.
          </Text>
        ) : null}

        {featureId === 'create-thrall' ? (
          <Text>
            «Вызов аберрации» без концентрации на 1 минуту + временные хиты; доп. психический урон
            по цели под «Сглазом».
          </Text>
        ) : null}

        {featureId === 'healing-light' ? (
          <>
            <Text>
              Костей к6: {healingLeft}/{healingRow?.max ?? 0}. За раз не больше {healingCap}.
            </Text>
            <Field label="Потратить костей">
              <NumberInput
                min={1}
                max={Math.max(1, Math.min(healingCap, healingLeft))}
                value={amount}
                onValueChange={(value) =>
                  setAmount(Math.max(1, Math.min(healingCap, value ?? 1)))
                }
              />
            </Field>
          </>
        ) : null}

        {featureId === 'dark-ones-own-luck' ? (
          <Text>Потрать использование: +1к10 к проверке характеристики или спасброску.</Text>
        ) : null}

        {featureId === 'dark-ones-blessing' ? (
          <Text>
            Врем. хиты = Хар + уровень колдуна (мин. 1), когда ты или союзник в пределах 10 фт.
            опускаете врага до 0 хитов.
          </Text>
        ) : null}

        {featureId === 'fiendish-resilience' ? (
          <Field label="Тип урона (кроме силового)">
            <SegmentedControl
              aria-label="Тип урона"
              value={damageType || FIENDISH_RESILIENCE_TYPES_2024[0].id}
              onChange={setDamageType}
              options={FIENDISH_RESILIENCE_TYPES_2024.map((row) => ({
                id: row.id,
                label: row.nameRu,
              }))}
            />
          </Field>
        ) : null}

        {featureId === 'searing-vengeance' ? (
          <Text>
            Раз за долгий отдых, вместо спасброска от смерти: хиты до половины максимума;
            существа в 30 фт. получают 2к8 + мод. Хар. излучения и Ослеплены.
          </Text>
        ) : null}

        {featureId === 'celestial-resilience' ? (
          <Text>
            После короткого или долгого отдыха: врем. хиты тебе и до пяти существ (уровень колдуна
            + Хар для тебя, половина уровня + Хар для союзников).
          </Text>
        ) : null}

        {featureId === 'armor-of-shadows' ? (
          <>
            <Text tone="muted">«Доспех мага» на себя без ячейки: КД = 13 + мод. Ловкости.</Text>
            <SegmentedControl
              aria-label="Доспех теней"
              value={armorOn ? 'on' : 'off'}
              onChange={(id) => setArmorOn(id === 'on')}
              options={[
                { id: 'on', label: 'Надеть' },
                { id: 'off', label: 'Снять' },
              ]}
            />
          </>
        ) : null}

        {featureId === 'fiendish-vigor' ? (
          <Text>
            «Псевдожизнь» на себя без ячейки; временные хиты по максимуму костей (2к4 + 4 = 12 на
            базовом круге).
          </Text>
        ) : null}

        {atWill && featureId !== 'armor-of-shadows' && featureId !== 'fiendish-vigor' ? (
          <Text>
            «{atWill.spellRu}» {atWill.noteRu}.
          </Text>
        ) : null}

        {featureId === 'form-of-dread' ? (
          <>
            <Text tone="muted">
              {dreadActive
                ? `${FORM_OF_DREAD_NAME_RU} активен. Можно завершить раньше или отметить ужас раз за ход.`
                : `${FORM_OF_DREAD_NAME_RU}: бонусное действие — врем. хиты 1к10+ур., иммунитет к «Испуганный», 1 минута.`}
            </Text>
            <SegmentedControl
              aria-label="Аватар ужаса"
              value={mode === 'end' ? 'end' : mode === 'fear' ? 'fear' : 'activate'}
              onChange={setMode}
              options={[
                { id: 'activate', label: dreadActive ? 'Обновить' : 'Активировать' },
                { id: 'fear', label: 'Ужас (ход)' },
                { id: 'end', label: 'Завершить' },
              ]}
            />
          </>
        ) : null}

        {featureId === 'grave-touched' ? (
          <>
            <Text tone="muted">
              {GRAVE_TOUCHED_NAME_RU}: отметьте использование раз за ход.
            </Text>
            <SegmentedControl
              aria-label="Прикосновение могилы"
              value={mode === 'extra-die' ? 'extra-die' : 'damage-swap'}
              onChange={setMode}
              options={[
                { id: 'damage-swap', label: 'Тип → некротический' },
                { id: 'extra-die', label: '+1к8 некрот.' },
              ]}
            />
          </>
        ) : null}

        {featureId === 'necrotic-husk' ? (
          <Text>
            {NECROTIC_HUSK_NAME_RU}: когда хиты падают до 0 — вместо этого хиты = 2×ур. колдуна;
            эманация 2к10 некротического; +1 истощение. Подтвердите применение.
          </Text>
        ) : null}

        {featureId === 'superior-dread' ? (
          <Text>
            {SUPERIOR_DREAD_NAME_RU}: пассивное усиление «{FORM_OF_DREAD_NAME_RU}» (полёт,
            сопротивление некротическому и др.).
          </Text>
        ) : null}

        {featureId === 'vestige-power' ? (
          <Text>
            {VESTIGE_POWER_NAME_RU}: «Божественная сила» спутника восстанавливается коротким
            отдыхом и «Магической искусностью». Нажмите, чтобы отметить восстановление.
          </Text>
        ) : null}

        {featureId === 'vestige-recovery' ? (
          <Text>
            {VESTIGE_RECOVERY_NAME_RU}: потратьте 1 ячейку договора — полное исцеление
            спутника-предтечи и телепорт (доступно ячеек: {pactLeft}).
          </Text>
        ) : null}

        {featureId === 'semblance-of-life' ? (
          <Text>
            {SEMBLANCE_OF_LIFE_NAME_RU}: дух в облике заклинания {semblanceCircle} круга (½
            уровня колдуна). Раз за долгий отдых.
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
