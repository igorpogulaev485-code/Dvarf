/**
 * 2024 Wizard subclass "use": slot / mode / damage inputs, then applyWizard2024FeatureUse.
 * Patterns: Dialog / Field / chips from the UI kit.
 */

import { useMemo, useState } from 'react'
import { Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import type { SpellSlotState } from '../../shared/dnd/spells'
import {
  OVERCHANNEL_MAX_SLOT_2024,
  THIRD_EYE_MODES_2024,
  applyWizard2024FeatureUse,
  expertDivinationRestoreLevel2024,
  overchannelNecroticDice2024,
  overchannelUseCount2024,
  parseSculptCreatureNames,
  sculptCreatureLimit2024,
  slotRemaining2024,
  slotUsed2024,
} from '../../shared/dnd/wizard2024Features'
import { parseFeatureResourceId } from '../../shared/dnd/featureResources'
import type { WizardFeatureUseResult } from '../../shared/dnd/wizardTradition'
import type { WizardFeatureRequest } from './WizardFeatureUseDialog'

type Props = {
  open: boolean
  request: WizardFeatureRequest | null
  resources: SheetResource[]
  slots: Record<string, SpellSlotState>
  onConfirm: (result: WizardFeatureUseResult) => void
  onClose: () => void
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function LevelChips({
  levels,
  value,
  onPick,
  disabledFor,
}: {
  levels: number[]
  value: number
  onPick: (level: number) => void
  disabledFor?: (level: number) => boolean
}) {
  return (
    <div className="chip-row">
      {levels.map((level) => (
        <button
          key={level}
          type="button"
          className={`sheet-chip${value === level ? ' is-on' : ''}`}
          disabled={disabledFor?.(level)}
          onClick={() => onPick(level)}
        >
          {level} круг
        </button>
      ))}
    </div>
  )
}

export function Wizard2024UseDialog({ open, request, resources, slots, onConfirm, onClose }: Props) {
  const [mode, setMode] = useState('')
  const [target, setTarget] = useState('')
  const [dieIndex, setDieIndex] = useState(0)
  const [slotLevel, setSlotLevel] = useState(0)
  const [castLevel, setCastLevel] = useState(2)
  const [amount, setAmount] = useState(0)
  const [sculptNames, setSculptNames] = useState('')

  const featureId = request?.featureId ?? ''
  const resource = useMemo(() => {
    if (!request) return null
    return (
      resources.find((row) => row.id === request.resourceId) ??
      resources.find((row) => {
        const parsed = parseFeatureResourceId(row.id)
        return parsed?.poolId === request.featureId && parsed.classEntryId === request.classEntryId
      }) ??
      null
    )
  }, [request, resources])
  if (!request) return null

  const slotLevels = LEVELS.filter((level) => (slots[String(level)]?.max ?? 0) > 0)
  const freeLevels = slotLevels.filter((level) => slotRemaining2024(slots, level) > 0)
  const spentLevels = slotLevels.filter((level) => slotUsed2024(slots, level) > 0)
  const portentDice = resource?.dice ?? []
  const illusoryRecover = featureId === 'illusory_self' && mode === 'recover'
  const expertAuto = expertDivinationRestoreLevel2024(slots, castLevel)
  const expertLevel = featureId === 'expert_divination' ? slotLevel || expertAuto || 0 : 0
  const overUse = overchannelUseCount2024(resource) + 1
  const sculptLimit = sculptCreatureLimit2024(slotLevel)
  const sculptCount = parseSculptCreatureNames(sculptNames).length

  function confirm() {
    const result = applyWizard2024FeatureUse({
      featureId,
      resourceId: resource?.id ?? request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      slots,
      mode: mode || undefined,
      slotLevel: featureId === 'expert_divination' ? expertLevel : slotLevel,
      castLevel,
      amount,
      target: featureId === 'sculpt_spells' ? sculptNames : target,
      dieIndex,
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
        {featureId === 'portent' ? (
          <>
            <Text>
              Выбери кость. Решение — до броска, один раз за ход: она заменит бросок к20 вашего
              или чужого существа.
            </Text>
            <div className="chip-row">
              {portentDice.map((value, index) => (
                <button
                  key={`${value}:${index}`}
                  type="button"
                  className={`sheet-chip${dieIndex === index ? ' is-on' : ''}`}
                  onClick={() => setDieIndex(index)}
                >
                  {value}
                </button>
              ))}
            </div>
            <Field label="Какой бросок заменяем">
              <Input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="Атака гоблина, проверка Внимания…"
              />
            </Field>
          </>
        ) : null}

        {featureId === 'the_third_eye' ? (
          <>
            <Text tone="muted">Бонусное действие. Сброс: короткий или долгий отдых.</Text>
            <div className="chip-row">
              {THIRD_EYE_MODES_2024.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`sheet-chip${(mode || THIRD_EYE_MODES_2024[0].id) === row.id ? ' is-on' : ''}`}
                  onClick={() => setMode(row.id)}
                >
                  {row.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {featureId === 'overchannel' ? (
          <>
            <Text>
              Максимальный урон заклинания волшебника 1–5 круга. Использование №{overUse}:{' '}
              {overUse <= 1
                ? 'без вреда'
                : `${overchannelNecroticDice2024(overUse, slotLevel || 1)}к12 некротического урона себе (${overUse}к12 за круг ячейки)`}
              .
            </Text>
            <Field label="Круг ячейки заклинания">
              <LevelChips
                levels={slotLevels.filter((level) => level <= OVERCHANNEL_MAX_SLOT_2024)}
                value={slotLevel}
                onPick={setSlotLevel}
              />
            </Field>
          </>
        ) : null}

        {featureId === 'illusory_self' ? (
          <>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${!illusoryRecover ? ' is-on' : ''}`}
                onClick={() => setMode('use')}
              >
                Реакция: промах
              </button>
              <button
                type="button"
                className={`sheet-chip${illusoryRecover ? ' is-on' : ''}`}
                disabled={(resource?.used ?? 0) <= 0}
                onClick={() => setMode('recover')}
              >
                Вернуть ячейкой 2+ круга
              </button>
            </div>
            {illusoryRecover ? (
              <LevelChips
                levels={freeLevels.filter((level) => level >= 2)}
                value={slotLevel}
                onPick={setSlotLevel}
              />
            ) : (
              <Text tone="muted">
                Реакция, когда существо попадает по вам: атака промахивается. Иллюзия рассеивается.
              </Text>
            )}
          </>
        ) : null}

        {featureId === 'illusory_reality' ? (
          <Text>
            Бонусное действие, пока идёт ваше заклинание иллюзии (ячейка): один неживой немагический
            предмет иллюзии реален 1 минуту, без урона и состояний.
          </Text>
        ) : null}

        {featureId === 'arcane_ward' ? (
          <>
            <Text>
              Бонусное действие: потрать ячейку — щит получает 2 × круг ячейки хитов (не выше
              максимума).
            </Text>
            <LevelChips levels={freeLevels} value={slotLevel} onPick={setSlotLevel} />
          </>
        ) : null}

        {featureId === 'projected_ward' ? (
          <>
            <Text>Реакция: щит поглощает урон существа в 30 фт. от вас; остаток получает оно.</Text>
            <Field label="Урон по существу">
              <NumberInput
                min={0}
                emptyValue={0}
                value={amount}
                onValueChange={(value) => setAmount(Math.max(0, value ?? 0))}
              />
            </Field>
            <Field label="Кого защищаем">
              <Input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="Имя союзника"
              />
            </Field>
          </>
        ) : null}

        {featureId === 'spell_breaker' ? (
          <>
            <Text>
              Контрзаклинание и Рассеивание магии подготовлены всегда. Если заклинание не пресекло
              цель — ячейка возвращается. Выбери круг потраченной ячейки.
            </Text>
            <LevelChips levels={spentLevels} value={slotLevel} onPick={setSlotLevel} />
          </>
        ) : null}

        {featureId === 'expert_divination' ? (
          <>
            <Text>
              Заклинание прорицания ячейкой 2+ круга возвращает одну потраченную ячейку ниже, не
              выше 5 круга.
            </Text>
            <Field label="Круг сотворённого заклинания">
              <LevelChips
                levels={slotLevels.filter((level) => level >= 2)}
                value={castLevel}
                onPick={(level) => {
                  setCastLevel(level)
                  setSlotLevel(0)
                }}
              />
            </Field>
            <Field label="Вернуть ячейку">
              <LevelChips
                levels={spentLevels.filter((level) => level < castLevel && level <= 5)}
                value={expertLevel}
                onPick={setSlotLevel}
              />
            </Field>
          </>
        ) : null}

        {featureId === 'sculpt_spells' ? (
          <>
            <Text>
              Заклинание воплощения: защитите существ — они автоматически преуспевают в спасброске и
              не получают урона.
            </Text>
            <Field label="Круг заклинания">
              <LevelChips levels={slotLevels} value={slotLevel} onPick={setSlotLevel} />
            </Field>
            {slotLevel > 0 ? (
              <>
                <Field
                  label={`Защищённые существа (до ${sculptLimit})`}
                  hint="По одному на строку или через запятую"
                >
                  <textarea
                    className="ui-input ui-textarea"
                    rows={3}
                    value={sculptNames}
                    placeholder={'Арн\nБела'}
                    onChange={(event) => setSculptNames(event.target.value)}
                  />
                </Field>
                <Text tone={sculptCount > sculptLimit ? 'danger' : 'muted'}>
                  защищены: {sculptCount} (лимит {sculptLimit} = 1 + круг {slotLevel}) · автоматически
                  успешный спас, 0 урона
                  {sculptCount > sculptLimit ? ' · слишком много существ' : ''}
                </Text>
              </>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Dialog>
  )
}
