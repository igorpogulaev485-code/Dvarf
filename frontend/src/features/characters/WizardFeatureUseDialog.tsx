/**
 * Wizard tradition "use": ask for the missing choice, then apply the sheet effect.
 * Patterns: Dialog / Field / chips from the UI kit.
 */

import { useState } from 'react'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import { getFeaturePick } from '../../shared/dnd/featurePicks'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  THIRD_EYE_MODES,
  TRANSMUTER_EFFECTS,
  applyWizardFeatureUse,
  type WizardFeatureUseResult,
} from '../../shared/dnd/wizardTradition'

export type WizardFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type WizardFeatureUseDialogProps = {
  open: boolean
  request: WizardFeatureRequest | null
  resources: SheetResource[]
  featurePicks: FeaturePicksState
  classes: ClassLevelEntry[]
  intelligenceScore: number
  onConfirm: (result: WizardFeatureUseResult) => void
  onClose: () => void
}

export function WizardFeatureUseDialog({
  open,
  request,
  resources,
  featurePicks,
  classes,
  intelligenceScore,
  onConfirm,
  onClose,
}: WizardFeatureUseDialogProps) {
  const [mode, setMode] = useState('')
  const [target, setTarget] = useState('')
  const [objectName, setObjectName] = useState('')
  const [saveFailed, setSaveFailed] = useState(true)
  const [dieIndex, setDieIndex] = useState(0)
  if (!request) return null
  const resource =
    resources.find((row) => row.id === request.resourceId) ??
    resources.find((row) => row.id.endsWith(`:${request.featureId}:${request.classEntryId}`)) ??
    null
  const wizardLevel =
    classes.find((row) => row.id === request.classEntryId)?.level ??
    classes.find((row) => /волшебник|wizard/i.test(row.name))?.level ??
    1
  const portentDice = resource?.dice ?? []
  const needsTarget = [
    'hypnotic_gaze',
    'instinctive_charm',
    'command_undead',
    'chronal_shift',
    'momentary_stasis',
    'convergent_future',
    'violent_attraction',
  ].includes(request.featureId)
  const needsSave = ['hypnotic_gaze', 'instinctive_charm', 'command_undead', 'momentary_stasis'].includes(
    request.featureId,
  )
  const transmuter =
    getFeaturePick(featurePicks, request.classEntryId, 'master_transmuter') ?? 'panacea'

  function confirm() {
    const result = applyWizardFeatureUse({
      featureId: request!.featureId,
      resourceId: resource?.id ?? request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      classSlug: request!.classSlug,
      wizardLevel,
      intelligenceScore,
      mode: mode || (request!.featureId === 'violent_attraction' ? 'hit' : undefined),
      target,
      saveFailed,
      objectName,
      dieIndex,
      transmuterEffect: transmuter,
    })
    onConfirm(result)
  }

  const endingBladesong = request.featureId === 'bladesong' && Boolean(resource?.activeLabel)

  return (
    <Dialog
      open={open}
      title={request.name}
      primaryLabel={endingBladesong ? 'Завершить' : 'Применить'}
      secondaryLabel="Отмена"
      onPrimary={confirm}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        {request.featureId === 'portent' ? (
          <>
            <Text>Выбери записанную кость. Она заменит конкретный бросок атаки, проверки или спасброска до того, как куб упадёт.</Text>
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
              <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Атака гоблина, проверка Внимания…" />
            </Field>
          </>
        ) : null}
        {request.featureId === 'the_third_eye' ? (
          <div className="chip-row">
            {THIRD_EYE_MODES.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`sheet-chip${(mode || THIRD_EYE_MODES[0].id) === row.id ? ' is-on' : ''}`}
                onClick={() => setMode(row.id)}
              >
                {row.label}
              </button>
            ))}
          </div>
        ) : null}
        {needsTarget ? (
          <Field label="Цель">
            <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Имя существа" />
          </Field>
        ) : null}
        {needsSave ? (
          <div className="chip-row">
            <button type="button" className={`sheet-chip${saveFailed ? ' is-on' : ''}`} onClick={() => setSaveFailed(true)}>
              Провал спасброска
            </button>
            <button type="button" className={`sheet-chip${!saveFailed ? ' is-on' : ''}`} onClick={() => setSaveFailed(false)}>
              Успех спасброска
            </button>
          </div>
        ) : null}
        {request.featureId === 'convergent_future' ? (
          <div className="chip-row">
            <button type="button" className={`sheet-chip${saveFailed ? ' is-on' : ''}`} onClick={() => setSaveFailed(true)}>
              Считать успехом
            </button>
            <button type="button" className={`sheet-chip${!saveFailed ? ' is-on' : ''}`} onClick={() => setSaveFailed(false)}>
              Считать провалом
            </button>
          </div>
        ) : null}
        {request.featureId === 'violent_attraction' ? (
          <div className="chip-row">
            <button type="button" className={`sheet-chip${mode !== 'fall' ? ' is-on' : ''}`} onClick={() => setMode('hit')}>
              Попадание оружием +1к10
            </button>
            <button type="button" className={`sheet-chip${mode === 'fall' ? ' is-on' : ''}`} onClick={() => setMode('fall')}>
              Падение +2к10
            </button>
          </div>
        ) : null}
        {request.featureId === 'minor_conjuration' || request.featureId === 'arcane_abeyance' || request.featureId === 'manifest_mind' ? (
          <Field label={request.featureId === 'arcane_abeyance' ? 'Заклинание в бусине' : request.featureId === 'manifest_mind' ? 'Облик разума' : 'Предмет'}>
            <Input
              value={objectName}
              onChange={(event) => setObjectName(event.target.value)}
              placeholder={
                request.featureId === 'manifest_mind'
                  ? 'Призрачная книга, текст или учёный'
                  : request.featureId === 'arcane_abeyance'
                    ? 'Не выше 4 круга'
                    : 'Немагический предмет, который вы видели'
              }
            />
          </Field>
        ) : null}
        {request.featureId === 'master_transmuter' ? (
          <Text>{TRANSMUTER_EFFECTS[transmuter] ?? 'Выбери эффект камня на карточке умения.'}</Text>
        ) : null}
        {request.featureId === 'bladesong' ? (
          <Text>
            {endingBladesong
              ? 'Песнь клинка сейчас действует. Завершение не возвращает использование.'
              : 'Бонусным действием, без среднего или тяжёлого доспеха и без щита. Это не концентрация.'}
          </Text>
        ) : null}
        {request.featureId === 'event_horizon' ? (
          <Text>Действием, концентрация 1 минута. Сфера 30 футов вокруг вас.</Text>
        ) : null}
        {request.featureId === 'power_surge' ? (
          <Text>Раз за ход, когда заклинание волшебника наносит урон: +{Math.max(1, Math.floor(wizardLevel / 2))} силового.</Text>
        ) : null}
        {request.featureId === 'command_undead' ? (
          <Text tone="muted">Дневного лимита нет. Интеллект 8+ даёт цели преимущество; 12+ повторяет спасбросок каждый час.</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
