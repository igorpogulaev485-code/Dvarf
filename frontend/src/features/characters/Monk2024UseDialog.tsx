/**
 * 2024 Monk feature «use» dialog — edition branch only.
 * Patterns: Dialog / Field / chips from the UI kit (Sorcerer2024 / Wizard2024).
 */

import { useMemo, useState } from 'react'
import { displayDiceNotation } from '../../shared/dnd/diceNotation'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  applyMonk2024FeatureUse,
  ELEMENTAL_DAMAGE_TYPES_2024,
  findFocusResource,
  findUncannyMetabolismResource,
  flurryStrikeCount2024,
  FOCUS_POINTS_NAME_RU,
  isCloakOfShadowsActive,
  martialArtsDie2024,
  monk2024UseFeatureId,
  OPEN_HAND_TECHNIQUES_2024,
  patientDefenseTempHpDice2024,
  SELF_RESTORATION_CONDITIONS_2024,
  slowFallReduce2024,
  STUNNING_STRIKE_NAME_RU,
  UNCANNY_METABOLISM_NAME_RU,
  type MonkFeatureUseResult,
} from '../../shared/dnd/monk2024Features'
import {
  FOCUSED_STRIKE_NAME_RU,
  IMPROVED_MYSTIC_FIGHTING_STYLE_NAME_RU,
  isMysticArtsMonk2024,
  MYSTIC_FIGHTING_STYLE_NAME_RU,
  MYSTIC_FOCUS_NAME_RU,
  MYSTIC_FOCUS_SLOT_RESTORE,
} from '../../shared/dnd/monkBook2024Features'
import type { SpellSlotState } from '../../shared/dnd/spells'

export type MonkFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type Props = {
  open: boolean
  request: MonkFeatureRequest | null
  resources: SheetResource[]
  featurePicks: FeaturePicksState
  monkLevel: number
  wisMod?: number
  subclassSlug?: string | null
  slots?: Record<string, SpellSlotState> | null
  cantripIds?: string[] | null
  preparedSpellIds?: string[] | null
  onConfirm: (result: MonkFeatureUseResult) => void
  onClose: () => void
}

export function Monk2024UseDialog({
  open,
  request,
  resources,
  featurePicks,
  monkLevel,
  wisMod = 0,
  subclassSlug = null,
  slots = null,
  cantripIds = null,
  preparedSpellIds = null,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState('')
  const [technique, setTechnique] = useState('flurry-of-blows')
  const [paid, setPaid] = useState(false)
  const [choice, setChoice] = useState('')
  const [target, setTarget] = useState('')
  const [slotLevel, setSlotLevel] = useState(1)

  const featureId =
    monk2024UseFeatureId(request?.featureId) ??
    request?.featureId.replace(/_/g, '-') ??
    ''

  const focus = useMemo(() => findFocusResource(resources), [resources])
  const focusLeft = focus ? Math.max(0, focus.max - focus.used) : 0
  const cloakOn = request
    ? isCloakOfShadowsActive(featurePicks, request.classEntryId)
    : false
  const maDie = martialArtsDie2024(monkLevel)
  const metabolismRow = useMemo(() => findUncannyMetabolismResource(resources), [resources])

  if (!request) return null

  const showTechniquePicker = featureId === 'monks-focus'
  const activeTechnique = showTechniquePicker
    ? technique
    : featureId === 'flurry-of-blows' ||
        featureId === 'patient-defense' ||
        featureId === 'step-of-the-wind'
      ? featureId
      : ''

  function confirm() {
    const useFeatureId = showTechniquePicker ? technique : request!.featureId
    let useMode = mode || undefined
    if (
      activeTechnique === 'patient-defense' ||
      activeTechnique === 'step-of-the-wind' ||
      featureId === 'patient-defense' ||
      featureId === 'step-of-the-wind'
    ) {
      useMode = paid ? 'paid' : 'free'
    }
    let useChoice = choice || undefined
    let useAmount: number | undefined
    if (featureId === 'mystic-focus') {
      useMode = mode || 'slot-to-focus'
      useChoice = String(slotLevel)
      useAmount = slotLevel
    }
    if (featureId === 'improved-mystic-fighting-style') {
      useAmount = Math.max(1, Math.min(2, slotLevel))
    }
    const result = applyMonk2024FeatureUse({
      featureId: useFeatureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      monkLevel,
      focusMax: focus?.max,
      focusUsed: focus?.used,
      mode: useMode,
      choice: useChoice,
      target: target || undefined,
      amount: useAmount,
      featurePicks,
      cloakOfShadowsActive: cloakOn,
      metabolismUsed: metabolismRow ? metabolismRow.used >= metabolismRow.max : undefined,
      wisMod,
      subclassSlug,
      slots,
      cantripIds,
      preparedSpellIds,
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
        <Text tone="muted">
          {FOCUS_POINTS_NAME_RU}: {focusLeft}/{focus?.max ?? 0} · кость БИ {maDie}
          {cloakOn ? ' · Покров теней' : ''}
        </Text>

        {showTechniquePicker ? (
          <>
            <Text>Выбери технику Монашеской сосредоточенности.</Text>
            <div className="chip-row">
              {(
                [
                  ['flurry-of-blows', 'Шквал ударов'],
                  ['patient-defense', 'Терпеливая защита'],
                  ['step-of-the-wind', 'Поступь ветра'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`sheet-chip${technique === id ? ' is-on' : ''}`}
                  onClick={() => {
                    setTechnique(id)
                    setPaid(false)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {activeTechnique === 'flurry-of-blows' ? (
          <Text>
            Бонусным: {flurryStrikeCount2024(monkLevel)} безоружных удара
            {cloakOn ? ' (Покров — без очков)' : ' (−1 очк.)'}.
          </Text>
        ) : null}

        {activeTechnique === 'patient-defense' ? (
          <>
            <Text tone="muted">Бесплатно — Отход; за очко — Отход + Уклонение.</Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${!paid ? ' is-on' : ''}`}
                onClick={() => setPaid(false)}
              >
                Бесплатно
              </button>
              <button
                type="button"
                className={`sheet-chip${paid ? ' is-on' : ''}`}
                onClick={() => setPaid(true)}
              >
                За 1 очко
              </button>
            </div>
            {paid && patientDefenseTempHpDice2024(monkLevel) ? (
              <Text>Врем. хиты: {patientDefenseTempHpDice2024(monkLevel)}</Text>
            ) : null}
          </>
        ) : null}

        {activeTechnique === 'step-of-the-wind' ? (
          <>
            <Text tone="muted">Бесплатно — Рывок; за очко — Отход + Рывок, прыжки ×2.</Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${!paid ? ' is-on' : ''}`}
                onClick={() => setPaid(false)}
              >
                Бесплатно
              </button>
              <button
                type="button"
                className={`sheet-chip${paid ? ' is-on' : ''}`}
                onClick={() => setPaid(true)}
              >
                За 1 очко
              </button>
            </div>
            {paid && monkLevel >= 10 ? (
              <>
                <div className="chip-row">
                  <button
                    type="button"
                    className={`sheet-chip${choice !== 'creature' ? ' is-on' : ''}`}
                    onClick={() => setChoice('')}
                  >
                    Только себя
                  </button>
                  <button
                    type="button"
                    className={`sheet-chip${choice === 'creature' ? ' is-on' : ''}`}
                    onClick={() => setChoice('creature')}
                  >
                    Взять существо
                  </button>
                </div>
                {choice === 'creature' ? (
                  <Field label="Существо">
                    <Input value={target} onChange={(e) => setTarget(e.target.value)} />
                  </Field>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {featureId === 'uncanny-metabolism' ? (
          <Text>
            Инициатива: восстановить все очки и вылечить {maDie}+{monkLevel}. 1/долгий отдых.
          </Text>
        ) : null}

        {featureId === 'perfect-focus' ? (
          <Text>
            Инициатива: если ≤3 очков и метаболизм не использован — восстановить до 4.
          </Text>
        ) : null}

        {featureId === 'deflect-attacks' || featureId === 'deflect-energy' ? (
          <>
            <Text tone="muted">Реакция: снизить урон; при 0 — можно перенаправить за 1 очко.</Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode !== 'redirect' ? ' is-on' : ''}`}
                onClick={() => setMode('reduce')}
              >
                Снизить урон
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'redirect' ? ' is-on' : ''}`}
                onClick={() => setMode('redirect')}
              >
                Перенаправить (−1)
              </button>
            </div>
            {mode === 'redirect' ? (
              <Field label="Цель">
                <Input value={target} onChange={(e) => setTarget(e.target.value)} />
              </Field>
            ) : null}
          </>
        ) : null}

        {featureId === 'stunning-strike' ? (
          <>
            <Text>Один раз за ход, −1 очко. Спас Тел.</Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode !== 'success' ? ' is-on' : ''}`}
                onClick={() => setMode('fail')}
              >
                Провал → ошеломлён
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'success' ? ' is-on' : ''}`}
                onClick={() => setMode('success')}
              >
                Успех → ½ скорости
              </button>
            </div>
            {isMysticArtsMonk2024(subclassSlug) && monkLevel >= 11 ? (
              <>
                <Text tone="muted">
                  {FOCUSED_STRIKE_NAME_RU}: цель с помехой к спасам от твоих заклинаний до начала
                  твоего следующего хода (даже при успехе).
                </Text>
                <Field label="Цель">
                  <Input value={target} onChange={(e) => setTarget(e.target.value)} />
                </Field>
              </>
            ) : null}
          </>
        ) : null}

        {featureId === 'slow-fall' ? (
          <Text>Реакция: урон от падения −{slowFallReduce2024(monkLevel)}.</Text>
        ) : null}

        {featureId === 'superior-defense' ? (
          <>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode !== 'end' ? ' is-on' : ''}`}
                onClick={() => setMode('activate')}
              >
                Включить (−3)
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'end' ? ' is-on' : ''}`}
                onClick={() => setMode('end')}
              >
                Завершить
              </button>
            </div>
          </>
        ) : null}

        {featureId === 'disciplined-survivor' ? (
          <Text>Потрать 1 очко, чтобы перебросить проваленный спас (новый результат обязателен).</Text>
        ) : null}

        {featureId === 'self-restoration' ? (
          <>
            <Text tone="muted">В конце хода снять одно состояние.</Text>
            <div className="chip-row">
              {SELF_RESTORATION_CONDITIONS_2024.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`sheet-chip${choice === row.id ? ' is-on' : ''}`}
                  onClick={() => setChoice(row.id)}
                >
                  {row.nameRu}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {featureId === 'empowered-strikes' ? (
          <div className="chip-row">
            <button
              type="button"
              className={`sheet-chip${mode !== 'force' ? ' is-on' : ''}`}
              onClick={() => setMode('normal')}
            >
              Обычный тип
            </button>
            <button
              type="button"
              className={`sheet-chip${mode === 'force' ? ' is-on' : ''}`}
              onClick={() => setMode('force')}
            >
              Силовой
            </button>
          </div>
        ) : null}

        {featureId === 'open-hand-technique' ? (
          <div className="chip-row">
            {OPEN_HAND_TECHNIQUES_2024.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`sheet-chip${choice === row.id ? ' is-on' : ''}`}
                title={displayDiceNotation(row.summaryRu)}
                onClick={() => setChoice(row.id)}
              >
                {row.nameRu}
              </button>
            ))}
          </div>
        ) : null}

        {featureId === 'wholeness-of-body' ? (
          <Text>Бонусным: лечение {maDie}+Мдр (мин. 1).</Text>
        ) : null}

        {featureId === 'quivering-palm' ? (
          <>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode !== 'detonate' && mode !== 'end-harmless' ? ' is-on' : ''}`}
                onClick={() => setMode('start')}
              >
                Начать (−4)
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'detonate' ? ' is-on' : ''}`}
                onClick={() => setMode('detonate')}
              >
                Завершить с уроном
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'end-harmless' ? ' is-on' : ''}`}
                onClick={() => setMode('end-harmless')}
              >
                Снять без вреда
              </button>
            </div>
            <Field label="Цель">
              <Input value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
          </>
        ) : null}

        {featureId === 'shadow-arts' ? (
          <div className="chip-row">
            <button
              type="button"
              className={`sheet-chip${choice !== 'minor-illusion' ? ' is-on' : ''}`}
              onClick={() => setChoice('darkness')}
            >
              Тьма (−1)
            </button>
            <button
              type="button"
              className={`sheet-chip${choice === 'minor-illusion' ? ' is-on' : ''}`}
              onClick={() => setChoice('minor-illusion')}
            >
              Малая иллюзия
            </button>
          </div>
        ) : null}

        {featureId === 'shadow-step' ? (
          <Text>Бонусным: телепорт 60 фт. из/в тусклый свет или тьму.</Text>
        ) : null}

        {featureId === 'improved-shadow-step' ? (
          <Text>−1 очко: шаг без требования тьмы + безоружный удар.</Text>
        ) : null}

        {featureId === 'cloak-of-shadows' ? (
          <div className="chip-row">
            <button
              type="button"
              className={`sheet-chip${mode !== 'end' ? ' is-on' : ''}`}
              onClick={() => setMode('activate')}
            >
              Включить (−3)
            </button>
            <button
              type="button"
              className={`sheet-chip${mode === 'end' ? ' is-on' : ''}`}
              onClick={() => setMode('end')}
            >
              Завершить
            </button>
          </div>
        ) : null}

        {featureId === 'hand-of-healing' || featureId === 'hand-of-harm' ? (
          <>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode !== 'flurry' ? ' is-on' : ''}`}
                onClick={() => setMode('spend')}
              >
                За 1 очко
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'flurry' ? ' is-on' : ''}`}
                onClick={() => setMode('flurry')}
              >
                Через Шквал (без очка)
              </button>
            </div>
            <Text>
              {featureId === 'hand-of-healing'
                ? `Лечение ${maDie}+Мдр`
                : `+${maDie}+Мдр некротического (1/ход)`}
            </Text>
          </>
        ) : null}

        {featureId === 'flurry-of-healing-and-harm' ? (
          <Text>Отметить использование: Шквал даёт Исцеляющую/Повреждающую без очков.</Text>
        ) : null}

        {featureId === 'hand-of-ultimate-mercy' ? (
          <>
            <Text>−5 очков: воскрешение (4к10+Мдр), 1/долгий отдых.</Text>
            <Field label="Цель">
              <Input value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
          </>
        ) : null}

        {featureId === 'elemental-attunement' ? (
          <div className="chip-row">
            <button
              type="button"
              className={`sheet-chip${mode !== 'end' ? ' is-on' : ''}`}
              onClick={() => setMode('activate')}
            >
              Включить (−1)
            </button>
            <button
              type="button"
              className={`sheet-chip${mode === 'end' ? ' is-on' : ''}`}
              onClick={() => setMode('end')}
            >
              Завершить
            </button>
          </div>
        ) : null}

        {featureId === 'elemental-burst' || featureId === 'elemental-epitome' ? (
          <>
            <Text tone="muted">
              {featureId === 'elemental-burst' ? '−2 очка · сфера 20 фт.' : 'Сопротивление стихии'}
            </Text>
            <div className="chip-row">
              {ELEMENTAL_DAMAGE_TYPES_2024.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`sheet-chip${choice === row.id ? ' is-on' : ''}`}
                  onClick={() => setChoice(row.id)}
                >
                  {row.nameRu}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {['heightened-focus', 'evasion', 'acrobatic-movement', 'body-and-mind'].includes(
          featureId,
        ) ? (
          <Text tone="muted">Справка по правилу — подтверди, чтобы записать в ленту.</Text>
        ) : null}

        {featureId === 'mystic-focus' ? (
          <>
            <Text>{MYSTIC_FOCUS_NAME_RU}: обмен ячеек ↔ очков.</Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode !== 'focus-to-slot' ? ' is-on' : ''}`}
                onClick={() => setMode('slot-to-focus')}
              >
                Ячейка → очки
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'focus-to-slot' ? ' is-on' : ''}`}
                onClick={() => setMode('focus-to-slot')}
              >
                Очки → ячейка
              </button>
            </div>
            {mode !== 'focus-to-slot' ? (
              <>
                <Text tone="muted">Потрать ячейку (без действия) → очки = уровень ячейки.</Text>
                <div className="chip-row">
                  {[1, 2, 3, 4].map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      className={`sheet-chip${slotLevel === lv ? ' is-on' : ''}`}
                      onClick={() => setSlotLevel(lv)}
                    >
                      {lv} кр.
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Text tone="muted">
                  После короткого отдыха / {UNCANNY_METABOLISM_NAME_RU}: восстановить одну ячейку.
                </Text>
                <div className="chip-row">
                  {MYSTIC_FOCUS_SLOT_RESTORE.filter((row) => monkLevel >= row.minMonkLevel).map(
                    (row) => (
                      <button
                        key={row.slotLevel}
                        type="button"
                        className={`sheet-chip${slotLevel === row.slotLevel ? ' is-on' : ''}`}
                        onClick={() => setSlotLevel(row.slotLevel)}
                      >
                        {row.slotLevel} кр. (−{row.focusCost})
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </>
        ) : null}

        {featureId === 'mystic-fighting-style' ? (
          <>
            <Text>
              {MYSTIC_FIGHTING_STYLE_NAME_RU}: заменить один Безоружный удар заговором Чародея
              (время — действие).
            </Text>
            <div className="chip-row">
              {(cantripIds ?? []).length
                ? (cantripIds ?? []).map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`sheet-chip${choice === id ? ' is-on' : ''}`}
                      onClick={() => setChoice(id)}
                    >
                      {id}
                    </button>
                  ))
                : null}
            </div>
            {!(cantripIds ?? []).length ? (
              <Field label="Заговор (slug)">
                <Input value={choice} onChange={(e) => setChoice(e.target.value)} />
              </Field>
            ) : null}
          </>
        ) : null}

        {featureId === 'focused-strike' ? (
          <Text tone="muted">
            {FOCUSED_STRIKE_NAME_RU}: срабатывает при {STUNNING_STRIKE_NAME_RU} (см. кнопку
            «Ошеломить»).
          </Text>
        ) : null}

        {featureId === 'improved-mystic-fighting-style' ? (
          <>
            <Text>
              {IMPROVED_MYSTIC_FIGHTING_STYLE_NAME_RU}: при Шквале заменить два Безоружных удара
              заклинанием 1–2 круга (то же бонусное действие).
            </Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${slotLevel === 1 ? ' is-on' : ''}`}
                onClick={() => setSlotLevel(1)}
              >
                1 кр.
              </button>
              <button
                type="button"
                className={`sheet-chip${slotLevel === 2 ? ' is-on' : ''}`}
                onClick={() => setSlotLevel(2)}
              >
                2 кр.
              </button>
            </div>
            <div className="chip-row">
              {(preparedSpellIds ?? []).length
                ? (preparedSpellIds ?? []).map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`sheet-chip${choice === id ? ' is-on' : ''}`}
                      onClick={() => setChoice(id)}
                    >
                      {id}
                    </button>
                  ))
                : null}
            </div>
            {!(preparedSpellIds ?? []).length ? (
              <Field label="Заклинание (slug)">
                <Input value={choice} onChange={(e) => setChoice(e.target.value)} />
              </Field>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Dialog>
  )
}
