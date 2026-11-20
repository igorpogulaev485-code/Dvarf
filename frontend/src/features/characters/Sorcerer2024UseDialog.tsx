/**
 * 2024 Sorcerer subclass / core feature uses — edition branch only.
 */

import { useMemo, useState } from 'react'
import { displayDiceNotation } from '../../shared/dnd/diceNotation'
import { Button, Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import type { SpellSlotState } from '../../shared/dnd/spells'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  applySorcerer2024FeatureUse,
  CREATE_SLOT_COST_2024,
  ELEMENTAL_AFFINITY_TYPES_2024,
  findInnateSorceryResource,
  findSorcerousRestorationResource,
  findSorceryResource,
  RESTORE_SP_COST,
  REVELATION_OPTIONS_2024,
  rollWildMagicSurgePair2024,
  type SorcererFeatureUseResult,
} from '../../shared/dnd/sorcerer2024Features'
import { getFeaturePick } from '../../shared/dnd/featurePicks'
import { parseFeatureResourceId } from '../../shared/dnd/featureResources'
import {
  BEASTS_OF_ILL_OMEN_NAME_RU,
  CROWN_OF_SPELLFIRE_NAME_RU,
  RADIANT_FLAME_NAME_RU,
  SHADOW_WALK_NAME_RU,
  SPELLFIRE_BURST_NAME_RU,
  SPELLFIRE_BURST_POOL_ID,
  SPELLFIRE_BURST_TURN_PICK_KEY,
  STRENGTH_OF_THE_GRAVE_NAME_RU,
  SUMMON_BEAST_SPIRIT_NAME_RU,
  SUSTAINING_FLAMES_NAME_RU,
  UMBRAL_FORM_NAME_RU,
  isShadowSorcery2024,
  isSpellfireSorcery2024,
  spellfireBurstDie2024,
  strengthOfTheGraveDc2024,
  strengthOfTheGraveHp2024,
} from '../../shared/dnd/sorcererBook2024Features'
import {
  resolveWildMagicSurge2024,
  tamedSurgeChoices2024,
  type WildMagicSurgeRow2024,
} from '../../shared/dnd/wildMagicSurgesSorcerer2024'
import type { SorcererFeatureRequest } from './SorcererFeatureUseDialog'

type Props = {
  open: boolean
  request: SorcererFeatureRequest | null
  resources: SheetResource[]
  slots: Record<string, SpellSlotState>
  featurePicks: FeaturePicksState
  sorcererLevel: number
  innateActive?: boolean
  hasControlledChaos?: boolean
  chaMod?: number
  subclassSlug?: string | null
  onConfirm: (result: SorcererFeatureUseResult) => void
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

export function Sorcerer2024UseDialog({
  open,
  request,
  resources,
  slots,
  featurePicks,
  sorcererLevel,
  innateActive = false,
  hasControlledChaos = false,
  chaMod = 0,
  subclassSlug = null,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState('')
  const [slotLevel, setSlotLevel] = useState(1)
  const [amount, setAmount] = useState(1)
  const [target, setTarget] = useState('')
  const [revelationId, setRevelationId] = useState('')
  const [elementalType, setElementalType] = useState('')
  const [chosenSurgeLow, setChosenSurgeLow] = useState(0)
  const [surgePickIndex, setSurgePickIndex] = useState(0)
  const [surgeRolls, setSurgeRolls] = useState<number[]>([])
  const [innateOverlay, setInnateOverlay] = useState<'none' | 'crown' | 'umbral'>('none')
  const [burstMode, setBurstMode] = useState<'sustaining' | 'radiant-fire' | 'radiant-radiant'>(
    'sustaining',
  )
  const [noConcentration, setNoConcentration] = useState(true)
  const [damageTaken, setDamageTaken] = useState(10)
  const [hitDiceCount, setHitDiceCount] = useState(1)
  const [selfLighting, setSelfLighting] = useState<'dim' | 'dark' | ''>('')
  const [targetLighting, setTargetLighting] = useState<'dim' | 'dark' | ''>('')
  const [destinationRu, setDestinationRu] = useState('')

  const featureId = request?.featureId.replace(/_/g, '-') ?? ''
  const sorcery = useMemo(() => findSorceryResource(resources), [resources])
  const sorceryLeft = sorcery ? Math.max(0, sorcery.max - sorcery.used) : 0
  const innateRow = useMemo(() => findInnateSorceryResource(resources), [resources])
  const innateOn = Boolean(innateRow?.activeLabel || innateActive)
  const spellfire = isSpellfireSorcery2024(subclassSlug)
  const shadow = isShadowSorcery2024(subclassSlug)
  const burstDie = spellfireBurstDie2024(sorcererLevel)
  const burstUsedThisTurn = useMemo(() => {
    if (!request || featureId !== 'spellfire-burst') return false
    if (getFeaturePick(featurePicks, request.classEntryId, SPELLFIRE_BURST_TURN_PICK_KEY) === 'on') {
      return true
    }
    const row = resources.find(
      (item) => parseFeatureResourceId(item.id)?.poolId === SPELLFIRE_BURST_POOL_ID,
    )
    return Boolean(row && row.used >= row.max)
  }, [featureId, featurePicks, request, resources])

  const slotLevels = LEVELS.filter((level) => (slots[String(level)]?.max ?? 0) > 0)
  const freeLevels = slotLevels.filter((level) => {
    const row = slots[String(level)]
    return (row?.max ?? 0) - (row?.used ?? 0) > 0
  })

  if (!request) return null

  function confirm() {
    const result = applySorcerer2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      slots,
      sorcererLevel,
      sorceryMax: sorcery?.max ?? sorcererLevel,
      sorceryUsed: sorcery?.used ?? 0,
      mode: mode || undefined,
      slotLevel,
      amount,
      target: target || undefined,
      revelationId: revelationId || undefined,
      elementalType: elementalType || undefined,
      chosenSurgeLow: chosenSurgeLow || undefined,
      surgePickIndex,
      surgeRolls: surgeRolls.length ? surgeRolls : undefined,
      featurePicks,
      innateActive: innateOn,
      controlledChaos: hasControlledChaos,
      chaMod,
      innateOverlay: featureId === 'innate-sorcery' ? innateOverlay : 'none',
      burstMode: featureId === 'spellfire-burst' ? burstMode : undefined,
      noConcentration: featureId === 'beasts-of-ill-omen' ? noConcentration : undefined,
      damageTaken: featureId === 'power-of-shadow' ? damageTaken : undefined,
      hitDiceCount: featureId === 'crown-of-spellfire' ? hitDiceCount : undefined,
      counterspellFailed: featureId === 'absorb-spells' && mode === 'restore',
      selfLighting:
        featureId === 'shadow-walk' && (selfLighting === 'dim' || selfLighting === 'dark')
          ? selfLighting
          : undefined,
      targetLighting:
        featureId === 'shadow-walk' && (targetLighting === 'dim' || targetLighting === 'dark')
          ? targetLighting
          : undefined,
      destinationRu: featureId === 'shadow-walk' ? destinationRu || target || undefined : undefined,
    })
    onConfirm(result)
  }

  const shadowWalkReady =
    featureId !== 'shadow-walk' ||
    ((selfLighting === 'dim' || selfLighting === 'dark') &&
      (targetLighting === 'dim' || targetLighting === 'dark'))
  const primaryDisabled =
    (featureId === 'spellfire-burst' && burstUsedThisTurn) ||
    (featureId === 'shadow-walk' && !shadowWalkReady)

  const fontCreateLevels = [1, 2, 3, 4, 5].filter((level) => {
    const row = CREATE_SLOT_COST_2024[level]
    return row && sorcererLevel >= row.minSorcererLevel
  })

  return (
    <Dialog
      open={open}
      title={request.name}
      primaryLabel="Применить"
      primaryDisabled={primaryDisabled}
      secondaryLabel="Отмена"
      onPrimary={confirm}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        {featureId === 'innate-sorcery' ? (
          <>
            <Text tone="muted">
              Бонусное действие: 1 мин — Сл чародея +1; атаки заклинаниями с преимуществом.
            </Text>
            {innateOn ? (
              <Text>
                <strong>Сейчас активно.</strong> Заверши, когда эффект кончился.
              </Text>
            ) : null}
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode !== 'end' ? ' is-on' : ''}`}
                disabled={innateOn}
                onClick={() => setMode('activate')}
              >
                Включить
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'end' ? ' is-on' : ''}`}
                disabled={!innateOn}
                onClick={() => setMode('end')}
              >
                Завершить
              </button>
            </div>
            {!innateOn && mode !== 'end' && sorcererLevel >= 18 && (spellfire || shadow) ? (
              <>
                <Text tone="muted">Опция книжного пути на время Врождённого чародейства:</Text>
                <div className="chip-row">
                  <button
                    type="button"
                    className={`sheet-chip${innateOverlay === 'none' ? ' is-on' : ''}`}
                    onClick={() => setInnateOverlay('none')}
                  >
                    Без опции
                  </button>
                  {spellfire ? (
                    <button
                      type="button"
                      className={`sheet-chip${innateOverlay === 'crown' ? ' is-on' : ''}`}
                      onClick={() => setInnateOverlay('crown')}
                    >
                      {CROWN_OF_SPELLFIRE_NAME_RU}
                    </button>
                  ) : null}
                  {shadow ? (
                    <button
                      type="button"
                      className={`sheet-chip${innateOverlay === 'umbral' ? ' is-on' : ''}`}
                      onClick={() => setInnateOverlay('umbral')}
                    >
                      {UMBRAL_FORM_NAME_RU}
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {featureId === 'spellfire-burst' ? (
          <>
            <Text tone="muted">
              {SPELLFIRE_BURST_NAME_RU}: после траты ≥1 очка в действие «Магия» или бонусное в ваш
              ход. Только раз в ход. Кость: {burstDie}.
            </Text>
            {burstUsedThisTurn ? (
              <Text tone="danger">Уже использован в этот ход — сброс на «Начало моего хода».</Text>
            ) : null}
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${burstMode === 'sustaining' ? ' is-on' : ''}`}
                disabled={burstUsedThisTurn}
                onClick={() => setBurstMode('sustaining')}
              >
                {SUSTAINING_FLAMES_NAME_RU}
              </button>
              <button
                type="button"
                className={`sheet-chip${burstMode === 'radiant-fire' ? ' is-on' : ''}`}
                disabled={burstUsedThisTurn}
                onClick={() => setBurstMode('radiant-fire')}
              >
                {RADIANT_FLAME_NAME_RU} (огонь)
              </button>
              <button
                type="button"
                className={`sheet-chip${burstMode === 'radiant-radiant' ? ' is-on' : ''}`}
                disabled={burstUsedThisTurn}
                onClick={() => setBurstMode('radiant-radiant')}
              >
                {RADIANT_FLAME_NAME_RU} (излучение)
              </button>
            </div>
          </>
        ) : null}

        {featureId === 'absorb-spells' ? (
          <>
            <Text tone="muted">
              Контрзаклинание всегда подготовлено. Если цель провалила спас — восстановить 1к4
              очков.
            </Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode !== 'restore' ? ' is-on' : ''}`}
                onClick={() => setMode('hint')}
              >
                Напомнить
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'restore' ? ' is-on' : ''}`}
                onClick={() => setMode('restore')}
              >
                Цель провалила спас → +1к4 очков
              </button>
            </div>
          </>
        ) : null}

        {featureId === 'crown-of-spellfire' ? (
          <>
            <Text tone="muted">
              Корона включается вместе с Врождённым чародейством. Здесь — восстановление за{' '}
              {RESTORE_SP_COST.crownOfSpellfire} очк. или Горящая жизнь.
            </Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode === 'restore' ? ' is-on' : ''}`}
                onClick={() => setMode('restore')}
              >
                Восстановить ({RESTORE_SP_COST.crownOfSpellfire} очк.)
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'burning-life' ? ' is-on' : ''}`}
                onClick={() => setMode('burning-life')}
              >
                Горящая жизнь
              </button>
            </div>
            {mode === 'burning-life' ? (
              <Field label={`Кости хитов (макс. ${Math.max(1, chaMod)})`}>
                <NumberInput
                  value={hitDiceCount}
                  min={1}
                  max={Math.max(1, chaMod)}
                  onValueChange={(v) => setHitDiceCount(Math.max(1, Number(v) || 1))}
                />
              </Field>
            ) : null}
          </>
        ) : null}

        {featureId === 'power-of-shadow' ? (
          <>
            <Text tone="muted">
              Глаза тьмы уже на листе (ТЗ 120 / слепое 10). {STRENGTH_OF_THE_GRAVE_NAME_RU}: спас
              Хар Сл {strengthOfTheGraveDc2024(damageTaken)}; при успехе хиты ={' '}
              {strengthOfTheGraveHp2024({ chaMod, sorcererLevel })}.
            </Text>
            <Field label="Урон, опустивший хиты до 0">
              <NumberInput
                value={damageTaken}
                min={0}
                max={999}
                onValueChange={(v) => setDamageTaken(Math.max(0, Number(v) || 0))}
              />
            </Field>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode === 'grave-success' || mode === 'grave' ? ' is-on' : ''}`}
                onClick={() => setMode('grave-success')}
              >
                Успех спаса
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'grave-fail' ? ' is-on' : ''}`}
                onClick={() => setMode('grave-fail')}
              >
                Провал
              </button>
            </div>
          </>
        ) : null}

        {featureId === 'beasts-of-ill-omen' ? (
          <>
            <Text tone="muted">
              {BEASTS_OF_ILL_OMEN_NAME_RU}: бонусным потратить 3 очка → {SUMMON_BEAST_SPIRIT_NAME_RU}{' '}
              (тени). Враги в 5 фт. с помехой на спас от ваших заклинаний. Очков:{' '}
              {sorceryLeft}/{sorcery?.max ?? 0}.
            </Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${noConcentration ? ' is-on' : ''}`}
                onClick={() => setNoConcentration(true)}
              >
                Без концентрации (1 мин)
              </button>
              <button
                type="button"
                className={`sheet-chip${!noConcentration ? ' is-on' : ''}`}
                onClick={() => setNoConcentration(false)}
              >
                С концентрацией
              </button>
            </div>
          </>
        ) : null}

        {featureId === 'shadow-walk' ? (
          <>
            <Text tone="muted">
              {SHADOW_WALK_NAME_RU}: бонусным телепорт ≤120 фт. Нужны тусклый свет или темнота у
              вас и у цели.
            </Text>
            <Text tone="muted">Вы сейчас:</Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${selfLighting === 'dim' ? ' is-on' : ''}`}
                onClick={() => setSelfLighting('dim')}
              >
                Тусклый свет
              </button>
              <button
                type="button"
                className={`sheet-chip${selfLighting === 'dark' ? ' is-on' : ''}`}
                onClick={() => setSelfLighting('dark')}
              >
                Темнота
              </button>
            </div>
            <Text tone="muted">Цель (незанятое пространство):</Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${targetLighting === 'dim' ? ' is-on' : ''}`}
                onClick={() => setTargetLighting('dim')}
              >
                Тусклый свет
              </button>
              <button
                type="button"
                className={`sheet-chip${targetLighting === 'dark' ? ' is-on' : ''}`}
                onClick={() => setTargetLighting('dark')}
              >
                Темнота
              </button>
            </div>
            <Field label="Куда телепортируетесь (стол)">
              <Input
                value={destinationRu}
                onChange={(e) => setDestinationRu(e.target.value)}
                placeholder="например: за колонну, 80 фт."
              />
            </Field>
            {!shadowWalkReady ? (
              <Text tone="danger">Отметьте освещение у себя и у цели.</Text>
            ) : null}
          </>
        ) : null}

        {featureId === 'umbral-form' ? (
          <>
            <Text tone="muted">
              Форма включается с Врождённым чародейством. Восстановление за {RESTORE_SP_COST.umbralForm}{' '}
              очк. или завершение раньше.
            </Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode === 'restore' ? ' is-on' : ''}`}
                onClick={() => setMode('restore')}
              >
                Восстановить ({RESTORE_SP_COST.umbralForm} очк.)
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'end' ? ' is-on' : ''}`}
                onClick={() => setMode('end')}
              >
                Завершить форму
              </button>
            </div>
          </>
        ) : null}

        {featureId === 'font-of-magic' ? (
          <>
            <Text>
              Очки чародейства: {sorceryLeft}/{sorcery?.max ?? 0}. Созданные ячейки исчезают после
              долгого отдыха.
            </Text>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode !== 'create' ? ' is-on' : ''}`}
                onClick={() => setMode('convert')}
              >
                Ячейка → очки
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'create' ? ' is-on' : ''}`}
                onClick={() => setMode('create')}
              >
                Очки → ячейка
              </button>
            </div>
            <Field
              label={
                mode === 'create'
                  ? 'Создать ячейку (мин. уровень чародея в подсказке)'
                  : 'Потратить ячейку'
              }
            >
              <LevelChips
                levels={mode === 'create' ? fontCreateLevels : freeLevels}
                value={slotLevel}
                onPick={setSlotLevel}
              />
            </Field>
            {mode === 'create' && slotLevel > 0 ? (
              <Text tone="muted">
                Стоимость: {CREATE_SLOT_COST_2024[slotLevel]?.cost ?? '—'} очк. · с{' '}
                {CREATE_SLOT_COST_2024[slotLevel]?.minSorcererLevel ?? '—'} ур. чародея
              </Text>
            ) : null}
          </>
        ) : null}

        {featureId === 'sorcerous-restoration' ? (
          <>
            <Text>
              Короткий или долгий отдых: вернуть до {Math.floor(sorcererLevel / 2)} потраченных
              очков. Сейчас {sorcery?.used ?? 0} потрачено.
            </Text>
            {findSorcerousRestorationResource(resources) ? (
              <Text tone="muted">До долгого отдыха — одно применение.</Text>
            ) : null}
          </>
        ) : null}

        {(featureId === 'wild-magic-surge' || featureId === 'controlled-chaos') && (
          <>
            <Text tone="muted">
              После каста заклинания 1+ круга — бросок d100 по таблице всплеска.
            </Text>
            <div className="feature-resource__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (featureId === 'controlled-chaos' || hasControlledChaos) {
                    setSurgeRolls(rollWildMagicSurgePair2024())
                    setSurgePickIndex(0)
                  } else {
                    const one = resolveWildMagicSurge2024({})
                    setSurgeRolls(one.rolls)
                  }
                }}
              >
                Бросить к100
              </Button>
            </div>
            {surgeRolls.length === 2 ? (
              <>
                <Text>Два броска — выбери, какой применить:</Text>
                <div className="chip-row">
                  {surgeRolls.map((roll, index) => (
                    <button
                      key={`${roll}:${index}`}
                      type="button"
                      className={`sheet-chip${surgePickIndex === index ? ' is-on' : ''}`}
                      onClick={() => setSurgePickIndex(index)}
                    >
                      {roll.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </>
            ) : surgeRolls.length === 1 ? (
              <Text>
                Выпало {surgeRolls[0]?.toString().padStart(2, '0')}:{' '}
                {resolveWildMagicSurge2024({ rolls: surgeRolls }).chosen.effectRu.slice(0, 120)}…
              </Text>
            ) : null}
          </>
        )}

        {featureId === 'tamed-surge' ? (
          <>
            <Text tone="muted">Выбери строку таблицы (кроме 97–00).</Text>
            <div className="chip-row">
              {tamedSurgeChoices2024().map((row: WildMagicSurgeRow2024) => (
                <button
                  key={row.low}
                  type="button"
                  className={`sheet-chip${chosenSurgeLow === row.low ? ' is-on' : ''}`}
                  title={row.effectRu}
                  onClick={() => setChosenSurgeLow(row.low)}
                >
                  {row.low.toString().padStart(2, '0')}–{row.high.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {featureId === 'tides-of-chaos' ? (
          <Text>Потрать использование: преимущество на броски до применения всплеска дикой магии.</Text>
        ) : null}

        {featureId === 'revelation-in-flesh' ? (
          <>
            <Text tone="muted">Бонусное действие, 10 мин; 1–4 очка на вариант.</Text>
            <Field label="Очков (1–4)">
              <NumberInput
                min={1}
                max={4}
                value={amount}
                onValueChange={(value) => setAmount(Math.max(1, Math.min(4, value ?? 1)))}
              />
            </Field>
            <div className="chip-row">
              {REVELATION_OPTIONS_2024.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`sheet-chip${revelationId === row.id ? ' is-on' : ''}`}
                  title={displayDiceNotation(row.summaryRu)}
                  onClick={() => setRevelationId(row.id)}
                >
                  {row.nameRu}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {featureId === 'elemental-affinity' ? (
          <>
            <Text tone="muted">Тип для +Хар. к одному броску урона заклинанием.</Text>
            <div className="chip-row">
              {ELEMENTAL_AFFINITY_TYPES_2024.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`sheet-chip${elementalType === row.id ? ' is-on' : ''}`}
                  onClick={() => setElementalType(row.id)}
                >
                  {row.nameRu}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {featureId === 'telepathic-speech' ? (
          <>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${mode !== 'end' ? ' is-on' : ''}`}
                onClick={() => setMode('activate')}
              >
                Включить
              </button>
              <button
                type="button"
                className={`sheet-chip${mode === 'end' ? ' is-on' : ''}`}
                onClick={() => setMode('end')}
              >
                Завершить
              </button>
            </div>
            <Field label="С кем (необязательно)">
              <Input value={target} onChange={(event) => setTarget(event.target.value)} />
            </Field>
          </>
        ) : null}

        {featureId === 'bastion-of-law' ? (
          <>
            <Field label="Очков чародейства (1–5)">
              <NumberInput
                min={1}
                max={5}
                value={amount}
                onValueChange={(value) => setAmount(Math.max(1, Math.min(5, value ?? 1)))}
              />
            </Field>
            <Field label="Союзник">
              <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Имя" />
            </Field>
          </>
        ) : null}

        {featureId === 'bend-luck' ? (
          <>
            <Field label="Очков (1–2)">
              <NumberInput
                min={1}
                max={2}
                value={amount}
                onValueChange={(value) => setAmount(Math.max(1, Math.min(2, value ?? 1)))}
              />
            </Field>
            <Field label="Какой бросок">
              <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Атака, спас…" />
            </Field>
          </>
        ) : null}

        {['dragon-wings', 'trance-of-order', 'warping-explosion', 'clockwork-cavalcade'].includes(
          featureId,
        ) ? (
          <Text tone="muted">
            Восстановить одно использование за очки чародейства (см. стоимость в правилах).
          </Text>
        ) : null}

        {featureId === 'arcane-apotheosis' ? (
          <Text>
            На 20 ур.: при активном Врождённом чародействе одна метамагия на заклинание в ход
            без траты очков — отмечай при касте.
          </Text>
        ) : null}

        {featureId === 'sorcery-incarnate' ? (
          <Text>
            Если нет использований Врождённого чародейства — активируй его за 2 очка через карточку
            «Врождённое чародейство».
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}