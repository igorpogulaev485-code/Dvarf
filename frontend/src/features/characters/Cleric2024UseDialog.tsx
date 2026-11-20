/**
 * 2024 Cleric feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * UI kit only (Dialog / Field / Stack / Text / Button / SegmentedControl / NumberInput).
 */

import { useMemo, useState } from 'react'
import { Button, Dialog, Field, Input, NumberInput, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  applyCleric2024FeatureUse,
  CHANNEL_DIVINITY_NAME_RU,
  CHANNEL_DIVINITY_POOL_ID,
  cleric2024UseFeatureId,
  DIVINE_SPARK_MODES_2024,
  divineInterventionAvailability2024,
  divineSparkFormulaRu2024,
  findClericPool2024,
  GREATER_DIVINE_INTERVENTION_NAME_RU,
  INVOKE_DUPLICITY_ACTIVE_PICK_ID_2024,
  INVOKE_DUPLICITY_MODES_2024,
  preserveLifePool2024,
  radianceOfTheDawnFormulaRu2024,
  readWishLock2024,
  searUndeadFormulaRu2024,
  SEAR_UNDEAD_MIN_LEVEL_2024,
  TRICKSTERS_TRANSPOSITION_NAME_RU,
  tricksterTranspositionAvailable2024,
  trickeryDuplicityEndHeal2024,
  WAR_GODS_BLESSING_SPELLS_2024,
  type Cleric2024UseResult,
  type DivineInterventionSpellRow,
} from '../../shared/dnd/cleric2024Features'
import {
  CIRCLE_OF_MORTALITY_NAME_RU,
  FORTIFYING_SPELL_NAME_RU,
  KEEPER_OF_SOULS_NAME_RU,
  KNOWLEDGE_DOMAIN_DIVINATION_SPELLS_2024,
  PATH_TO_THE_GRAVE_ACTIVE_PICK,
  PATH_TO_THE_GRAVE_NAME_RU,
  TENACIOUS_SPELL_NAME_RU,
  circleMortalityExtraDie2024,
  keeperOfSoulsHeal2024,
  modifyMagicTempHpFormulaRu2024,
  pathToTheGraveExtraDamage2024,
} from '../../shared/dnd/clericBook2024Features'
import { getFeaturePick } from '../../shared/dnd/featurePicks'

export type ClericFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type Props = {
  open: boolean
  request: ClericFeatureRequest | null
  resources: SheetResource[]
  featurePicks: FeaturePicksState
  clericLevel: number
  wisMod?: number
  /** Eligible Divine Intervention spells (see `filterDivineInterventionSpells2024`). */
  interventionSpells?: DivineInterventionSpellRow[]
  onConfirm: (result: Cleric2024UseResult) => void
  onClose: () => void
}

const SIMPLE_SPEND_TEXT: Record<string, string> = {
  'warding-flare': 'Реакция: помеха на атаку по тебе от существа, которое ты видишь в 30 фт.',
  'war-priest': 'После действия «Атака»: одна атака оружием бонусным действием.',
  'corona-of-light':
    'Яркий свет 60 фт. на 1 мин.; помеха врагам на спасброски от «Сияния рассвета» и заклинаний огня или излучения.',
  'guided-strike': '+10 к броску атаки (твоей или существа в 30 фт.) после броска.',
  'sentinel-at-death-s-door':
    'Реакция: урон атаки по тебе или Окровавленному в 60 фт. вдвое вниз; эффекты крита отменяются.',
}

export function Cleric2024UseDialog({
  open,
  request,
  resources,
  featurePicks,
  clericLevel,
  wisMod = 0,
  interventionSpells,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState('')
  const [sparkMode, setSparkMode] = useState('heal')
  const [wgbChoice, setWgbChoice] = useState<string>(WAR_GODS_BLESSING_SPELLS_2024[0].id)
  const [preserveAmount, setPreserveAmount] = useState<number | null>(null)
  const [spellId, setSpellId] = useState('')
  const [slotLevel, setSlotLevel] = useState(6)
  const [graveDamage, setGraveDamage] = useState('necrotic')

  const featureId =
    cleric2024UseFeatureId(request?.featureId) ?? request?.featureId.replace(/_/g, '-') ?? ''

  const channelRow = useMemo(
    () => findClericPool2024(resources, CHANNEL_DIVINITY_POOL_ID, request?.classEntryId),
    [resources, request?.classEntryId],
  )

  if (!request) return null

  const channelLeft = channelRow ? Math.max(0, channelRow.max - channelRow.used) : 0
  const pathActive =
    getFeaturePick(featurePicks, request.classEntryId, PATH_TO_THE_GRAVE_ACTIVE_PICK) === '1'
  const usesChannel =
    featureId === 'divine-spark' ||
    featureId === 'turn-undead' ||
    featureId === 'preserve-life' ||
    featureId === 'radiance-of-the-dawn' ||
    featureId === 'guided-strike' ||
    featureId === 'war-gods-blessing' ||
    featureId === 'modify-magic' ||
    featureId === 'mind-magic' ||
    (featureId === 'path-to-the-grave' && (mode || 'curse') !== 'end-hit') ||
    (featureId === 'dispelling-recovery' && mode === 'restore') ||
    (featureId === 'divine-reaper' && (mode || 'second-target') === 'second-target') ||
    (featureId === 'invoke-duplicity' && mode !== 'move' && mode !== 'dismiss' && mode !== 'transposition')

  const pool = preserveLifePool2024(clericLevel)
  const duplicityActive =
    getFeaturePick(featurePicks, request.classEntryId, INVOKE_DUPLICITY_ACTIVE_PICK_ID_2024) === 'on'
  const duplicityMode =
    mode || (duplicityActive ? 'move' : 'create')
  const transposition = tricksterTranspositionAvailable2024(clericLevel)
  const duplicityEndHeal = trickeryDuplicityEndHeal2024(clericLevel)

  const availability =
    featureId === 'divine-intervention'
      ? divineInterventionAvailability2024({
          clericLevel,
          resources,
          featurePicks,
          classEntryId: request.classEntryId,
        })
      : null
  const wishLock = readWishLock2024(featurePicks, request.classEntryId)
  const wishAllowed = availability?.available === true && availability.wishAvailable
  const interventionMode = mode === 'wish' && wishAllowed ? 'wish' : 'spell'
  const spells = interventionSpells ?? []

  function confirm() {
    let useMode: string | undefined = mode || undefined
    if (featureId === 'divine-spark') useMode = sparkMode
    if (featureId === 'invoke-duplicity') useMode = duplicityMode
    if (featureId === 'divine-intervention') useMode = interventionMode
    if (featureId === 'modify-magic') useMode = mode || 'fortifying'
    if (featureId === 'path-to-the-grave') useMode = mode || (pathActive ? 'end-hit' : 'curse')
    if (featureId === 'dispelling-recovery') useMode = mode || 'cast'
    if (featureId === 'divine-foreknowledge') useMode = mode || 'activate'
    if (featureId === 'divine-reaper') useMode = mode || 'second-target'
    const result = applyCleric2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      clericLevel,
      wisMod,
      mode: useMode,
      choice:
        featureId === 'war-gods-blessing'
          ? wgbChoice
          : featureId === 'path-to-the-grave'
            ? graveDamage
            : undefined,
      spellId:
        featureId === 'divine-intervention' || featureId === 'mind-magic'
          ? spellId.trim()
          : undefined,
      amount:
        featureId === 'preserve-life'
          ? (preserveAmount ?? pool)
          : featureId === 'divine-foreknowledge' || featureId === 'divine-reaper'
            ? slotLevel
            : undefined,
      featurePicks,
    })
    onConfirm(result)
  }

  const primaryDisabled =
    (featureId === 'divine-intervention' &&
      (availability?.available !== true || (interventionMode === 'spell' && !spellId.trim()))) ||
    (featureId === 'mind-magic' && !spellId.trim()) ||
    (featureId === 'modify-magic' && !mode && false)

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
        {usesChannel ? (
          <Text tone="muted">
            {CHANNEL_DIVINITY_NAME_RU}: {channelLeft}/{channelRow?.max ?? 0}
          </Text>
        ) : null}

        {featureId === 'divine-spark' ? (
          <>
            <Text>
              Действие «Магия», существо в 30 фт.: {divineSparkFormulaRu2024(clericLevel, wisMod)}.
              Лечение или урон (спас Тел — половина при успехе).
            </Text>
            <Field label="Эффект">
              <SegmentedControl
                aria-label="Эффект искры"
                value={sparkMode}
                onChange={setSparkMode}
                options={DIVINE_SPARK_MODES_2024.map((row) => ({ id: row.id, label: row.nameRu }))}
              />
            </Field>
          </>
        ) : null}

        {featureId === 'turn-undead' ? (
          <>
            <Text>
              Нежить в 30 фт., спас Мдр: при провале Испугана и Недееспособна на 1 мин. (до
              получения урона).
            </Text>
            {clericLevel >= SEAR_UNDEAD_MIN_LEVEL_2024 ? (
              <Text tone="muted">
                Испепеление нежити: {searUndeadFormulaRu2024(wisMod)} излучения каждой нежити,
                провалившей спасбросок.
              </Text>
            ) : null}
          </>
        ) : null}

        {featureId === 'sear-undead' ? (
          <Text>
            При «Изгнании нежити»: {searUndeadFormulaRu2024(wisMod)} излучения каждой нежити,
            провалившей спасбросок. Ресурс не тратится.
          </Text>
        ) : null}

        {featureId === 'preserve-life' ? (
          <>
            <Text>
              Пул лечения: {pool} хитов. Каждому существу в 30 фт. — не выше половины его максимума
              хитов (только Окровавленные).
            </Text>
            <Field label="Потратить из пула">
              <NumberInput
                min={1}
                max={pool}
                value={preserveAmount ?? pool}
                onValueChange={(value) => setPreserveAmount(Math.max(1, Math.min(pool, value ?? pool)))}
              />
            </Field>
          </>
        ) : null}

        {featureId === 'radiance-of-the-dawn' ? (
          <Text>
            {radianceOfTheDawnFormulaRu2024(clericLevel)} излучения, спас Тел — половина при успехе
            (30 фт.). Рассеивает магическую тьму.
          </Text>
        ) : null}

        {featureId === 'war-gods-blessing' ? (
          <>
            <Text tone="muted">
              Заклинание через Проведение божественности вместо ячейки; концентрация не нужна.
            </Text>
            <Field label="Заклинание">
              <SegmentedControl
                aria-label="Заклинание"
                value={wgbChoice}
                onChange={setWgbChoice}
                options={WAR_GODS_BLESSING_SPELLS_2024.map((row) => ({
                  id: row.id,
                  label: row.nameRu,
                }))}
              />
            </Field>
          </>
        ) : null}

        {featureId === 'invoke-duplicity' ? (
          <>
            <Text tone="muted">
              Бонусное действие, концентрация, 1 мин. Двойник появляется в 30 фт. и двигается на 30
              фт. за бонусное действие.
              {duplicityActive ? ' Двойник сейчас активен.' : ''}
            </Text>
            <SegmentedControl
              aria-label="Действие с двойником"
              value={duplicityMode}
              onChange={setMode}
              options={[
                ...INVOKE_DUPLICITY_MODES_2024.map((row) => ({ id: row.id, label: row.nameRu })),
                ...(transposition
                  ? [{ id: 'transposition', label: TRICKSTERS_TRANSPOSITION_NAME_RU }]
                  : []),
              ]}
            />
            {duplicityMode === 'dismiss' && duplicityEndHeal > 0 ? (
              <Text tone="muted">
                Улучшенная двуличность: ты или существо в 5 фт. восстанавливает {duplicityEndHeal}{' '}
                хитов.
              </Text>
            ) : null}
          </>
        ) : null}

        {featureId === 'divine-intervention' ? (
          <>
            {availability && !availability.available ? (
              <Text tone="muted">{availability.reasonRu}</Text>
            ) : (
              <Text>
                Действие «Магия»: заклинание жреца до 5 круга без ячейки и материальных компонентов.
                Раз за долгий отдых.
              </Text>
            )}
            {wishAllowed ? (
              <SegmentedControl
                aria-label="Вариант вмешательства"
                value={interventionMode}
                onChange={setMode}
                options={[
                  { id: 'spell', label: 'Заклинание' },
                  { id: 'wish', label: 'Желание' },
                ]}
              />
            ) : null}
            {interventionMode === 'wish' ? (
              <Text tone="muted">
                {GREATER_DIVINE_INTERVENTION_NAME_RU}: «Желание» без ячейки. После применения
                бросается 2к4 — столько долгих отдыхов вмешательство недоступно.
              </Text>
            ) : spells.length > 0 ? (
              <Field label="Заклинание">
                <Stack gap={6}>
                  {spells.map((spell) => (
                    <Button
                      key={spell.slug}
                      size="sm"
                      variant={spellId === spell.slug ? 'primary' : 'secondary'}
                      onClick={() => setSpellId(spell.slug)}
                    >
                      {spell.name_ru ?? spell.slug} · {spell.level ?? spell.circle ?? '?'} кр.
                    </Button>
                  ))}
                </Stack>
              </Field>
            ) : (
              <Field label="Заклинание (id)">
                <Input
                  value={spellId}
                  placeholder="например, raise-dead"
                  onChange={(event) => setSpellId(event.target.value)}
                />
              </Field>
            )}
            {wishLock > 0 ? (
              <Text tone="muted">Блокировка после «Желания»: ещё {wishLock} долг. отд.</Text>
            ) : null}
          </>
        ) : null}

        {featureId === 'modify-magic' ? (
          <>
            <Text>
              При сотворении заклинания потрать одно Проведение божественности (отдельного действия
              нет).
            </Text>
            <SegmentedControl
              aria-label="Режим изменения магии"
              value={mode || 'fortifying'}
              onChange={setMode}
              options={[
                { id: 'fortifying', label: FORTIFYING_SPELL_NAME_RU },
                { id: 'tenacious', label: TENACIOUS_SPELL_NAME_RU },
              ]}
            />
            <Text tone="muted">
              {(mode || 'fortifying') === 'fortifying'
                ? `Временные хиты ${modifyMagicTempHpFormulaRu2024(clericLevel)} одной цели.`
                : '−1к6 к первому успешному спасброску видимой цели против этого заклинания.'}
            </Text>
          </>
        ) : null}

        {featureId === 'mind-magic' ? (
          <>
            <Text>
              Действие «Магия»: сотворить подготовленное Прорицание из таблицы домена знаний без
              ячейки и материальных компонентов.
            </Text>
            <Field label="Заклинание Прорицания">
              <Stack gap={6}>
                {KNOWLEDGE_DOMAIN_DIVINATION_SPELLS_2024.map((slug) => (
                  <Button
                    key={slug}
                    size="sm"
                    variant={spellId === slug ? 'primary' : 'secondary'}
                    onClick={() => setSpellId(slug)}
                  >
                    {slug}
                  </Button>
                ))}
              </Stack>
            </Field>
          </>
        ) : null}

        {featureId === 'path-to-the-grave' ? (
          <>
            <Text>
              {PATH_TO_THE_GRAVE_NAME_RU}: бонусным действием проклясть видимое существо в 30 фт. до
              начала твоего следующего хода (помеха на атаки и спасброски).
            </Text>
            <SegmentedControl
              aria-label="Путь к могиле"
              value={mode || (pathActive ? 'end-hit' : 'curse')}
              onChange={setMode}
              options={[
                { id: 'curse', label: 'Проклясть' },
                { id: 'end-hit', label: 'Снять при попадании' },
              ]}
            />
            {(mode || (pathActive ? 'end-hit' : 'curse')) === 'end-hit' ? (
              <Field label="Доп. урон">
                <SegmentedControl
                  aria-label="Тип урона"
                  value={graveDamage}
                  onChange={setGraveDamage}
                  options={[
                    { id: 'necrotic', label: `Некротический +${pathToTheGraveExtraDamage2024(clericLevel)}` },
                    { id: 'radiant', label: `Излучение +${pathToTheGraveExtraDamage2024(clericLevel)}` },
                  ]}
                />
              </Field>
            ) : null}
          </>
        ) : null}

        {featureId === 'dispelling-recovery' ? (
          <>
            <Text>
              После заклинания, лечащего или снимающего состояние: «Рассеивание магии» без ячейки
              частью того же действия. 1 / короткий или долгий; можно восстановить каналом.
            </Text>
            <SegmentedControl
              aria-label="Рассеивающее восстановление"
              value={mode || 'cast'}
              onChange={setMode}
              options={[
                { id: 'cast', label: 'Сотворить' },
                { id: 'restore', label: 'Восстановить каналом' },
              ]}
            />
          </>
        ) : null}

        {featureId === 'divine-foreknowledge' ? (
          <>
            <Text>
              Бонусным на 1 час — Преимущество на все Тесты к20. 1 / долгий; можно восстановить
              ячейкой 6+.
            </Text>
            <SegmentedControl
              aria-label="Божественное предзнание"
              value={mode || 'activate'}
              onChange={setMode}
              options={[
                { id: 'activate', label: 'Включить' },
                { id: 'restore', label: 'Восстановить ячейкой' },
              ]}
            />
            {(mode || 'activate') === 'restore' ? (
              <Field label="Круг ячейки">
                <NumberInput
                  min={6}
                  max={9}
                  value={slotLevel}
                  onValueChange={(value) => setSlotLevel(Math.max(6, Math.min(9, value ?? 6)))}
                />
              </Field>
            ) : null}
          </>
        ) : null}

        {featureId === 'divine-reaper' ? (
          <>
            <Text>
              Усовершенствованная некромантия: вторая цель через канал. {KEEPER_OF_SOULS_NAME_RU}: при
              смерти врага в 60 фт. — {keeperOfSoulsHeal2024(clericLevel)} хитов (1 / короткий или
              долгий; восстановить ячейкой 6+).
            </Text>
            <SegmentedControl
              aria-label="Божественный жнец"
              value={mode || 'second-target'}
              onChange={setMode}
              options={[
                { id: 'second-target', label: 'Вторая цель' },
                { id: 'keeper', label: 'Хранитель душ' },
                { id: 'keeper-restore', label: 'Восстановить ячейкой' },
              ]}
            />
            {(mode || 'second-target') === 'keeper-restore' ? (
              <Field label="Круг ячейки">
                <NumberInput
                  min={6}
                  max={9}
                  value={slotLevel}
                  onValueChange={(value) => setSlotLevel(Math.max(6, Math.min(9, value ?? 6)))}
                />
              </Field>
            ) : null}
          </>
        ) : null}

        {featureId === 'circle-of-mortality' ? (
          <Text>
            {CIRCLE_OF_MORTALITY_NAME_RU}: {circleMortalityExtraDie2024(clericLevel)} доп.
            некротического 1/ход по цели ниже макс. хитов; Уход за умирающим бонусным; макс. кости
            лечения на 0 HP.
          </Text>
        ) : null}

        {SIMPLE_SPEND_TEXT[featureId] ? <Text>{SIMPLE_SPEND_TEXT[featureId]}</Text> : null}
      </Stack>
    </Dialog>
  )
}
