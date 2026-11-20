/**
 * 2024 Artificer feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * Magic of Making / Flash of Genius (spend), Spell-Storing spell pick, Replicates panel,
 * plus P24-M02B desk panels: elixirs, atlas, cannon, defender, reanimator, cauldron, jolt.
 */

import { useState } from 'react'
import { Button, Dialog, Field, SegmentedControl, Stack, Text } from '../../ui'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  ARTIFICER_REPLICATE_PLANS_2024,
  replicatePlanById2024,
  type ClassOptions2024State,
} from '../../shared/dnd/edition2024ClassOptions'
import {
  ADVENTURE_ATLAS_POOL_ID,
  ADVENTURERS_ATLAS_NAME_RU,
  applyArtificer2024FeatureUse,
  ARCANE_JOLT_NAME_RU,
  ARCANE_JOLT_POOL_ID,
  artificer2024FeaturePoolId,
  artificer2024UseFeatureId,
  artificerAttunementLimit2024,
  CANNON_MODES_2024,
  CHEMICAL_MASTERY_CAULDRON_POOL_ID,
  CHEMICAL_MASTERY_NAME_RU,
  createReplicateActive2024,
  dissolveReplicateActive2024,
  ELDRITCH_CANNON_NAME_RU,
  ELDRITCH_CANNON_POOL_ID,
  eldritchCannonStats2024,
  ELIXIR_EFFECTS_2024,
  EXPERIMENTAL_ELIXIR_NAME_RU,
  EXPERIMENTAL_ELIXIR_POOL_ID,
  experimentalElixirCount2024,
  FLASH_OF_GENIUS_NAME_RU,
  FLASH_OF_GENIUS_POOL_ID,
  findArtificerPool2024,
  MAGIC_ITEMS_COLUMN_RU,
  MAGIC_OF_MAKING_NAME_RU,
  MAGIC_OF_MAKING_POOL_ID,
  MAPPING_FAERIE_FIRE_POOL_ID,
  MAPPING_MAGIC_NAME_RU,
  PLANS_KNOWN_COLUMN_RU,
  replicateAttunedCount2024,
  replicateLimits2024,
  setReplicateAttuned2024,
  SPELL_STORING_ITEM_NAME_RU,
  STEEL_DEFENDER_NAME_RU,
  STEEL_DEFENDER_POOL_ID,
  steelDefenderStats2024,
  type Artificer2024UseResult,
  type CannonMode2024,
  type ElixirEffect2024,
} from '../../shared/dnd/artificer2024Features'
import {
  EASED_RAISE_NAME_RU,
  EASED_RAISE_POOL_ID,
  FORBIDDEN_ARTIFICER_BOOK_LABELS_2024,
  REANIMATED_COMPANION_NAME_RU,
  REANIMATED_COMPANION_POOL_ID,
  reanimatedCompanionStats2024,
  REVIVING_BOLT_NAME_RU,
  REVIVING_BOLT_POOL_ID,
} from '../../shared/dnd/artificerBook2024Features'

export type ArtificerFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}

type Props = {
  open: boolean
  request: ArtificerFeatureRequest | null
  resources: SheetResource[]
  artificerLevel: number
  /** INT score for companion/cannon formulas (default 10 → mod 0). */
  intScore?: number
  classOptions2024: ClassOptions2024State | null
  onClassOptions2024Change?: (next: ClassOptions2024State) => void
  onConfirm: (result: Artificer2024UseResult) => void
  onClose: () => void
  onToast?: (message: string) => void
}

const FEATURE_TEXT: Record<string, string> = {
  'magic-of-making': `${MAGIC_OF_MAKING_NAME_RU}: действием Магия создать предмет из списка (инструменты ремонтника).`,
  magic_of_making: `${MAGIC_OF_MAKING_NAME_RU}: действием Магия создать предмет из списка (инструменты ремонтника).`,
  'flash-of-genius': `${FLASH_OF_GENIUS_NAME_RU}: реакция при провале проверки или спасброска — добавить мод. ИНТ.`,
  flash_of_genius: `${FLASH_OF_GENIUS_NAME_RU}: реакция при провале проверки или спасброска — добавить мод. ИНТ.`,
  'chemical-mastery': `${CHEMICAL_MASTERY_NAME_RU}: бурлящий котёл Таши (1/долг. отд.).`,
  chemical_mastery: `${CHEMICAL_MASTERY_NAME_RU}: бурлящий котёл Таши (1/долг. отд.).`,
  'arcane-jolt': `${ARCANE_JOLT_NAME_RU}: при попадании защитника или вашей атаки оружием — 2к6 силового или хил (с 15 ур. — 4к6).`,
  arcane_jolt: `${ARCANE_JOLT_NAME_RU}: при попадании защитника или вашей атаки оружием — 2к6 силового или хил (с 15 ур. — 4к6).`,
}

const SSI_SPELLS: Array<{ id: string; label: string }> = [
  { id: 'cure-wounds', label: 'Лечение ран' },
  { id: 'detect-magic', label: 'Обнаружение магии' },
  { id: 'faerie-fire', label: 'Огонь фей' },
  { id: 'grease', label: 'Смазка' },
  { id: 'jump', label: 'Прыжок' },
  { id: 'longstrider', label: 'Скороход' },
  { id: 'heat-metal', label: 'Раскалённый металл' },
  { id: 'invisibility', label: 'Невидимость' },
  { id: 'enlarge-reduce', label: 'Увеличение/уменьшение' },
  { id: 'fly', label: 'Полёт' },
  { id: 'haste', label: 'Ускорение' },
  { id: 'revivify', label: 'Оживление' },
]

const GENERIC_REFUND_POOLS = new Set([
  MAGIC_OF_MAKING_POOL_ID,
  FLASH_OF_GENIUS_POOL_ID,
  CHEMICAL_MASTERY_CAULDRON_POOL_ID,
  ARCANE_JOLT_POOL_ID,
  EXPERIMENTAL_ELIXIR_POOL_ID,
  ADVENTURE_ATLAS_POOL_ID,
  MAPPING_FAERIE_FIRE_POOL_ID,
  ELDRITCH_CANNON_POOL_ID,
  STEEL_DEFENDER_POOL_ID,
  REANIMATED_COMPANION_POOL_ID,
  REVIVING_BOLT_POOL_ID,
  EASED_RAISE_POOL_ID,
])

function intModFromScore(score: number | undefined): number {
  return Math.floor(((score ?? 10) - 10) / 2)
}

function elixirLabel(effect: string): string {
  const key = String(effect || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
  return ELIXIR_EFFECTS_2024.find((row) => row.id === key)?.nameRu ?? effect
}

function nextElixirId(existing: Array<{ id: string }>): string {
  const stamp = Date.now().toString(36)
  const n = existing.length + 1
  return `elixir-${stamp}-${n}`
}

function rollElixirEffect(rng = Math.random): ElixirEffect2024 {
  const roll = 1 + Math.floor(rng() * 6)
  return (ELIXIR_EFFECTS_2024.find((row) => row.roll === roll) ?? ELIXIR_EFFECTS_2024[0]!).id
}

export function Artificer2024UseDialog({
  open,
  request,
  resources,
  artificerLevel,
  intScore = 10,
  classOptions2024,
  onClassOptions2024Change,
  onConfirm,
  onClose,
  onToast,
}: Props) {
  const [mode, setMode] = useState('spend')
  const [pendingPlan, setPendingPlan] = useState('')
  const [pendingAttune, setPendingAttune] = useState(false)
  const [pendingElixirEffect, setPendingElixirEffect] = useState<ElixirEffect2024>('healing')
  const [reanimatorPool, setReanimatorPool] = useState(REANIMATED_COMPANION_POOL_ID)

  if (!request) return null

  const featureId =
    artificer2024UseFeatureId(request.featureId) ?? request.featureId.replace(/_/g, '-')
  const intMod = intModFromScore(intScore)

  const isSsi = featureId === 'spell-storing-item'
  const isReplicate = featureId === 'replicate-magic-item'
  const isElixir = featureId === 'experimental-elixir'
  const isAtlas = featureId === 'adventure-atlas' || featureId === 'mapping-magic'
  const isCannon = featureId === 'eldritch-cannon'
  const isDefender = featureId === 'steel-defender'
  const isReanimator =
    featureId === 'reanimated-companion'
    || featureId === 'reanimator-s-skill-set'
    || featureId === 'refined-reanimation'
  const isChemical = featureId === 'chemical-mastery'
  const isArcaneJolt = featureId === 'arcane-jolt'

  const poolId = artificer2024FeaturePoolId(featureId)
  const pool =
    poolId != null
      ? findArtificerPool2024(resources, poolId, request.classEntryId)
      : request.resourceId
        ? resources.find((row) => row.id === request.resourceId) ?? null
        : null

  const left = pool ? Math.max(0, pool.max - pool.used) : 0
  const refundable = poolId != null && GENERIC_REFUND_POOLS.has(poolId)

  const limits = replicateLimits2024(artificerLevel)
  const attuneLimit = artificerAttunementLimit2024(artificerLevel)

  function confirmPool(overridePoolId?: string | null) {
    const result = applyArtificer2024FeatureUse({
      featureId: request!.featureId,
      resourceId: overridePoolId ? null : request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      refund: mode === 'refund',
      poolId: overridePoolId ?? undefined,
    })
    if (result.ok) onConfirm(result)
    else if (result.message) onToast?.(result.message)
  }

  function patchOptions(patch: Partial<ClassOptions2024State>) {
    if (!classOptions2024 || !onClassOptions2024Change) return
    onClassOptions2024Change({ ...classOptions2024, ...patch })
  }

  function createReplica() {
    if (!classOptions2024 || !onClassOptions2024Change) return
    const result = createReplicateActive2024({
      state: classOptions2024,
      planId: pendingPlan,
      artificerLevel,
      attune: pendingAttune,
      attunementLimit: attuneLimit,
    })
    if (!result.ok) {
      onToast?.(result.reasonRu)
      return
    }
    onClassOptions2024Change(result.state)
    onToast?.(result.feedLineRu)
    setPendingPlan('')
    setPendingAttune(false)
  }

  if (isSsi) {
    const current = classOptions2024?.spell_storing_spell || null
    return (
      <Dialog
        open={open}
        title={SPELL_STORING_ITEM_NAME_RU}
        primaryLabel="Готово"
        secondaryLabel="Отмена"
        onPrimary={onClose}
        onSecondary={onClose}
      >
        <Stack gap={12}>
          {pool ? (
            <Text tone="muted">
              Заряды: {left}/{pool.max}
            </Text>
          ) : null}
          <Text>
            После долгого отдыха сохраните в предмете заклинание артефактора 1–3 круга. Сейчас:{' '}
            <strong>
              {SSI_SPELLS.find((s) => s.id === current)?.label ?? current ?? 'не выбрано'}
            </strong>
          </Text>
          <div className="sheet-chip-row" data-testid="ssi-spell-chips">
            {SSI_SPELLS.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`sheet-chip${current === row.id ? ' is-on' : ''}`}
                onClick={() => {
                  if (!classOptions2024 || !onClassOptions2024Change) return
                  onClassOptions2024Change({
                    ...classOptions2024,
                    spell_storing_spell: row.id,
                  })
                  onToast?.(`${SPELL_STORING_ITEM_NAME_RU}: ${row.label}`)
                }}
              >
                {row.label}
              </button>
            ))}
          </div>
        </Stack>
      </Dialog>
    )
  }

  if (isReplicate) {
    const active = classOptions2024?.replicate_active ?? []
    const plans = classOptions2024?.replicate_plans ?? []
    return (
      <Dialog
        open={open}
        title={request.name}
        primaryLabel="Готово"
        secondaryLabel="Закрыть"
        onPrimary={onClose}
        onSecondary={onClose}
      >
        <Stack gap={12}>
          <Text>
            {PLANS_KNOWN_COLUMN_RU}: {plans.length}/{limits.plansKnown}
          </Text>
          <div className="sheet-chip-row">
            {ARTIFICER_REPLICATE_PLANS_2024.filter((row) => plans.includes(row.id)).map((row) => (
              <span key={row.id} className="sheet-chip is-on">
                {row.nameRu}
              </span>
            ))}
          </div>
          <Text>
            {MAGIC_ITEMS_COLUMN_RU}: {active.length}/{limits.magicItems} · настройка{' '}
            {replicateAttunedCount2024(active)}/{attuneLimit}
          </Text>
          <ul data-testid="artificer-dialog-replicates">
            {[...active]
              .sort((a, b) => a.seq - b.seq)
              .map((row) => (
                <li key={row.seq}>
                  {replicatePlanById2024(row.planId)?.nameRu ?? row.planId}
                  {row.attuned ? ' · настроен' : ''}{' '}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!classOptions2024 || !onClassOptions2024Change) return
                      onClassOptions2024Change(dissolveReplicateActive2024(classOptions2024, row.seq))
                    }}
                  >
                    Развоплотить
                  </Button>
                  {replicatePlanById2024(row.planId)?.requiresAttunement ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!classOptions2024 || !onClassOptions2024Change) return
                        const next = setReplicateAttuned2024({
                          state: classOptions2024,
                          seq: row.seq,
                          attuned: !row.attuned,
                          attunementLimit: attuneLimit,
                        })
                        if (!next.ok) {
                          onToast?.(next.reasonRu)
                          return
                        }
                        onClassOptions2024Change(next.state)
                      }}
                    >
                      {row.attuned ? 'Снять' : 'Настроить'}
                    </Button>
                  ) : null}
                </li>
              ))}
          </ul>
          <select
            data-testid="artificer-dialog-replicate-plan"
            value={pendingPlan}
            onChange={(e) => {
              setPendingPlan(e.target.value)
              setPendingAttune(false)
            }}
          >
            <option value="">Схема…</option>
            {plans.map((id) => {
              const plan = replicatePlanById2024(id)
              return plan ? (
                <option key={id} value={id}>
                  {plan.nameRu}
                </option>
              ) : null
            })}
          </select>
          {replicatePlanById2024(pendingPlan)?.requiresAttunement ? (
            <label>
              <input
                type="checkbox"
                checked={pendingAttune}
                onChange={(e) => setPendingAttune(e.target.checked)}
              />{' '}
              Настроиться сразу
            </label>
          ) : null}
          <Button type="button" disabled={!pendingPlan} onClick={createReplica}>
            Создать реплику
          </Button>
        </Stack>
      </Dialog>
    )
  }

  if (isElixir) {
    const bottles = classOptions2024?.experimental_elixirs ?? []
    const elixirPool = findArtificerPool2024(
      resources,
      EXPERIMENTAL_ELIXIR_POOL_ID,
      request.classEntryId,
    )
    const elixirLeft = elixirPool ? Math.max(0, elixirPool.max - elixirPool.used) : 0
    const afterRestCount = experimentalElixirCount2024(artificerLevel)

    function setBottles(next: Array<{ id: string; effect: string }>) {
      patchOptions({ experimental_elixirs: next })
    }

    function fillAfterLongRest(sequential = false) {
      const next: Array<{ id: string; effect: string }> = []
      for (let i = 0; i < afterRestCount; i += 1) {
        const effect = sequential
          ? ELIXIR_EFFECTS_2024[i % ELIXIR_EFFECTS_2024.length]!.id
          : rollElixirEffect()
        next.push({ id: nextElixirId(next), effect })
      }
      setBottles(next)
      onToast?.(
        `${EXPERIMENTAL_ELIXIR_NAME_RU}: после долгого отдыха — ${next.length} флакон(ов)`,
      )
    }

    function addChosenElixir() {
      const next = [
        ...bottles,
        { id: nextElixirId(bottles), effect: pendingElixirEffect },
      ]
      setBottles(next)
      onToast?.(
        `${EXPERIMENTAL_ELIXIR_NAME_RU}: +${elixirLabel(pendingElixirEffect)} (ячейка)`,
      )
    }

    return (
      <Dialog
        open={open}
        title={EXPERIMENTAL_ELIXIR_NAME_RU}
        primaryLabel="Готово"
        secondaryLabel="Закрыть"
        onPrimary={onClose}
        onSecondary={onClose}
      >
        <div data-testid="artificer-dialog-elixirs">
          <Stack gap={12}>
            {elixirPool ? (
              <Text tone="muted">
                Пул: {elixirLeft}/{elixirPool.max}
              </Text>
            ) : null}
            <Text>
              После долгого отдыха — {afterRestCount} эликсир(ов). Эффект 1к6 из таблицы (лечение,
              проворность, устойчивость, смелость, полёт, выбор). Без временных хитов 2014.
            </Text>
            <div className="sheet-chip-row">
              <Button type="button" size="sm" onClick={() => fillAfterLongRest(false)}>
                После долгого отдыха (1к6)
              </Button>
              <Button type="button" size="sm" onClick={() => fillAfterLongRest(true)}>
                После долгого отдыха (по порядку)
              </Button>
            </div>
            <Field label="Эффект для ячейки / чипа">
              <div className="sheet-chip-row" data-testid="artificer-elixir-effect-chips">
                {ELIXIR_EFFECTS_2024.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`sheet-chip${pendingElixirEffect === row.id ? ' is-on' : ''}`}
                    onClick={() => setPendingElixirEffect(row.id)}
                  >
                    {row.roll}. {row.nameRu}
                  </button>
                ))}
              </div>
            </Field>
            <Button type="button" size="sm" onClick={addChosenElixir}>
              Создать за ячейку ({elixirLabel(pendingElixirEffect)})
            </Button>
            <ul>
              {bottles.length === 0 ? (
                <li>
                  <Text tone="muted">Флаконов нет</Text>
                </li>
              ) : (
                bottles.map((row) => (
                  <li key={row.id}>
                    {elixirLabel(row.effect)}{' '}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setBottles(bottles.filter((b) => b.id !== row.id))
                        onToast?.(`${EXPERIMENTAL_ELIXIR_NAME_RU}: выпит — ${elixirLabel(row.effect)}`)
                      }}
                    >
                      Выпить
                    </Button>{' '}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setBottles(bottles.filter((b) => b.id !== row.id))
                        onToast?.(`${EXPERIMENTAL_ELIXIR_NAME_RU}: убран`)
                      }}
                    >
                      Убрать
                    </Button>
                  </li>
                ))
              )}
            </ul>
            {elixirPool ? (
              <Field label="Пул эликсиров">
                <SegmentedControl
                  aria-label="Режим пула эликсиров"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { id: 'spend', label: 'Потратить' },
                    { id: 'refund', label: 'Вернуть' },
                  ]}
                />
                <Button type="button" size="sm" onClick={() => confirmPool(EXPERIMENTAL_ELIXIR_POOL_ID)}>
                  Применить к пулу
                </Button>
              </Field>
            ) : null}
          </Stack>
        </div>
      </Dialog>
    )
  }

  if (isAtlas) {
    const holders = classOptions2024?.atlas_holders ?? []
    const atlasPool = findArtificerPool2024(
      resources,
      ADVENTURE_ATLAS_POOL_ID,
      request.classEntryId,
    )
    const faeriePool = findArtificerPool2024(
      resources,
      MAPPING_FAERIE_FIRE_POOL_ID,
      request.classEntryId,
    )
    const atlasLeft = atlasPool ? Math.max(0, atlasPool.max - atlasPool.used) : 0
    const faerieLeft = faeriePool ? Math.max(0, faeriePool.max - faeriePool.used) : 0

    function addHolder() {
      const label = `Союзник ${holders.length + 1}`
      patchOptions({ atlas_holders: [...holders, label] })
      onToast?.(`${ADVENTURERS_ATLAS_NAME_RU}: ${label}`)
    }

    return (
      <Dialog
        open={open}
        title={featureId === 'mapping-magic' ? MAPPING_MAGIC_NAME_RU : ADVENTURERS_ATLAS_NAME_RU}
        primaryLabel="Готово"
        secondaryLabel="Закрыть"
        onPrimary={onClose}
        onSecondary={onClose}
      >
        <div data-testid="artificer-dialog-atlas">
          <Stack gap={12}>
            {atlasPool ? (
              <Text tone="muted">
                {ADVENTURERS_ATLAS_NAME_RU}: {atlasLeft}/{atlasPool.max}
              </Text>
            ) : null}
            {faeriePool ? (
              <Text tone="muted">
                {MAPPING_MAGIC_NAME_RU} (Огонь фей): {faerieLeft}/{faeriePool.max}
              </Text>
            ) : null}
            <Text>
              Держатели карт: +1к4 к инициативе; прыжок порталом между держателями; с 15 ур. —
              убежище (sanctuary) по атласу.
            </Text>
            <div className="sheet-chip-row">
              {holders.map((label, idx) => (
                <button
                  key={`${label}-${idx}`}
                  type="button"
                  className="sheet-chip is-on"
                  onClick={() => {
                    patchOptions({
                      atlas_holders: holders.filter((_, i) => i !== idx),
                    })
                  }}
                >
                  {label} ×
                </button>
              ))}
            </div>
            <Button type="button" size="sm" onClick={addHolder}>
              Добавить «Союзник {holders.length + 1}»
            </Button>
            <Field label="Пул">
              <SegmentedControl
                aria-label="Режим пула атласа"
                value={mode}
                onChange={setMode}
                options={[
                  { id: 'spend', label: 'Потратить' },
                  { id: 'refund', label: 'Вернуть' },
                ]}
              />
              <div className="sheet-chip-row">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => confirmPool(ADVENTURE_ATLAS_POOL_ID)}
                >
                  Атлас
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => confirmPool(MAPPING_FAERIE_FIRE_POOL_ID)}
                >
                  Огонь фей
                </Button>
              </div>
            </Field>
          </Stack>
        </div>
      </Dialog>
    )
  }

  if (isCannon) {
    const stats = eldritchCannonStats2024({ artificerLevel, intMod })
    const current = classOptions2024?.cannon_mode ?? null
    return (
      <Dialog
        open={open}
        title={ELDRITCH_CANNON_NAME_RU}
        primaryLabel="Готово"
        secondaryLabel="Закрыть"
        onPrimary={onClose}
        onSecondary={onClose}
      >
        <div data-testid="artificer-dialog-cannon">
          <Stack gap={12}>
            {pool ? (
              <Text tone="muted">
                Пул: {left}/{pool.max} · макс. пушек: {stats.maxCannons}
              </Text>
            ) : (
              <Text tone="muted">Макс. пушек: {stats.maxCannons}</Text>
            )}
            <Text>
              КД {stats.ac} · хиты {stats.hp} · урон {stats.damageDice}
            </Text>
            <Text>{stats.modesRu}</Text>
            {stats.detonationRu ? <Text>{stats.detonationRu}</Text> : null}
            <Text tone="muted">{stats.notesRu}</Text>
            <Field label="Режим активации">
              <div className="sheet-chip-row" data-testid="artificer-cannon-mode-chips">
                {CANNON_MODES_2024.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`sheet-chip${current === row.id ? ' is-on' : ''}`}
                    onClick={() => {
                      patchOptions({ cannon_mode: row.id as CannonMode2024 })
                      onToast?.(`${ELDRITCH_CANNON_NAME_RU}: ${row.nameRu}`)
                    }}
                  >
                    {row.nameRu}
                  </button>
                ))}
              </div>
            </Field>
            {pool ? (
              <Field label="Пул пушки">
                <SegmentedControl
                  aria-label="Режим пула пушки"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { id: 'spend', label: 'Потратить' },
                    { id: 'refund', label: 'Вернуть' },
                  ]}
                />
                <Button type="button" size="sm" onClick={() => confirmPool(ELDRITCH_CANNON_POOL_ID)}>
                  Применить к пулу
                </Button>
              </Field>
            ) : null}
          </Stack>
        </div>
      </Dialog>
    )
  }

  if (isDefender) {
    const stats = steelDefenderStats2024({ artificerLevel, intMod })
    return (
      <Dialog
        open={open}
        title={STEEL_DEFENDER_NAME_RU}
        primaryLabel="Готово"
        secondaryLabel="Закрыть"
        onPrimary={onClose}
        onSecondary={onClose}
      >
        <div data-testid="artificer-dialog-defender">
          <Stack gap={12}>
            {pool ? (
              <Text tone="muted">
                Пул: {left}/{pool.max}
              </Text>
            ) : null}
            <Text>
              КД {stats.ac} · хиты {stats.hp} · скорость {stats.speed} · ремонт {stats.repairMax}/день
            </Text>
            <Text>{stats.actionsRu}</Text>
            <Text tone="muted">{stats.notesRu}</Text>
            {pool ? (
              <Field label="Пул защитника">
                <SegmentedControl
                  aria-label="Режим пула защитника"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { id: 'spend', label: 'Потратить' },
                    { id: 'refund', label: 'Вернуть' },
                  ]}
                />
                <Button type="button" size="sm" onClick={() => confirmPool(STEEL_DEFENDER_POOL_ID)}>
                  Применить к пулу
                </Button>
              </Field>
            ) : null}
          </Stack>
        </div>
      </Dialog>
    )
  }

  if (isReanimator) {
    const stats = reanimatedCompanionStats2024({
      artificerLevel,
      intMod,
      modifications: [],
    })
    const forbidden = FORBIDDEN_ARTIFICER_BOOK_LABELS_2024[0]
    const companionPool = findArtificerPool2024(
      resources,
      REANIMATED_COMPANION_POOL_ID,
      request.classEntryId,
    )
    const boltPool = findArtificerPool2024(
      resources,
      REVIVING_BOLT_POOL_ID,
      request.classEntryId,
    )
    const raisePool = findArtificerPool2024(
      resources,
      EASED_RAISE_POOL_ID,
      request.classEntryId,
    )
    const activePoolId =
      featureId === 'reanimator-s-skill-set'
        ? REVIVING_BOLT_POOL_ID
        : featureId === 'refined-reanimation'
          ? EASED_RAISE_POOL_ID
          : reanimatorPool
    const activePool = findArtificerPool2024(resources, activePoolId, request.classEntryId)
    const activeLeft = activePool ? Math.max(0, activePool.max - activePool.used) : 0

    return (
      <Dialog
        open={open}
        title={REANIMATED_COMPANION_NAME_RU}
        primaryLabel="Готово"
        secondaryLabel="Закрыть"
        onPrimary={onClose}
        onSecondary={onClose}
      >
        <div data-testid="artificer-dialog-reanimator">
          <Stack gap={12}>
            <Text tone="muted">
              Метка: {REANIMATED_COMPANION_NAME_RU}
              {forbidden ? ` (не «${forbidden}»)` : ''}
            </Text>
            <Text>
              КД {stats.ac} · хиты {stats.hp} · скорость {stats.speed} · {stats.sizeRu}
            </Text>
            <Text>{stats.actionsRu}</Text>
            <Text>{stats.deathBurstRu}</Text>
            <Text tone="muted">{stats.notesRu}</Text>
            <Text tone="muted">
              Пулы:{' '}
              {companionPool
                ? `${REANIMATED_COMPANION_NAME_RU} ${Math.max(0, companionPool.max - companionPool.used)}/${companionPool.max}`
                : 'спутник —'}
              {' · '}
              {boltPool
                ? `${REVIVING_BOLT_NAME_RU} ${Math.max(0, boltPool.max - boltPool.used)}/${boltPool.max}`
                : 'разряд —'}
              {' · '}
              {raisePool
                ? `${EASED_RAISE_NAME_RU} ${Math.max(0, raisePool.max - raisePool.used)}/${raisePool.max}`
                : 'воскрешение —'}
            </Text>
            {featureId === 'reanimated-companion' ? (
              <Field label="Пул для траты">
                <div className="sheet-chip-row">
                  {(
                    [
                      { id: REANIMATED_COMPANION_POOL_ID, label: REANIMATED_COMPANION_NAME_RU },
                      { id: REVIVING_BOLT_POOL_ID, label: REVIVING_BOLT_NAME_RU },
                      { id: EASED_RAISE_POOL_ID, label: EASED_RAISE_NAME_RU },
                    ] as const
                  ).map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className={`sheet-chip${reanimatorPool === row.id ? ' is-on' : ''}`}
                      onClick={() => setReanimatorPool(row.id)}
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
              </Field>
            ) : null}
            {activePool ? (
              <>
                <Text tone="muted">
                  Выбранный пул: {activeLeft}/{activePool.max}
                </Text>
                <Field label="Режим">
                  <SegmentedControl
                    aria-label="Режим пула реаниматора"
                    value={mode}
                    onChange={setMode}
                    options={[
                      { id: 'spend', label: 'Потратить' },
                      { id: 'refund', label: 'Вернуть' },
                    ]}
                  />
                </Field>
                <Button type="button" onClick={() => confirmPool(activePoolId)}>
                  Применить
                </Button>
              </>
            ) : (
              <Text tone="muted">Пул не найден на листе</Text>
            )}
          </Stack>
        </div>
      </Dialog>
    )
  }

  const body =
    FEATURE_TEXT[featureId] ?? FEATURE_TEXT[request.featureId] ?? request.name
  const joltNote =
    isArcaneJolt
      ? artificerLevel >= 15
        ? 'Урон/хил: 4к6 (с 15 ур.).'
        : 'Урон/хил: 2к6 (с 15 ур. — 4к6).'
      : null

  return (
    <Dialog
      open={open}
      title={request.name}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      onPrimary={() => confirmPool()}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        {pool ? (
          <Text tone="muted">
            Осталось: {left}/{pool.max}
          </Text>
        ) : null}
        {refundable || isChemical || isArcaneJolt ? (
          <Field label="Режим">
            <SegmentedControl
              aria-label="Режим"
              value={mode}
              onChange={setMode}
              options={[
                { id: 'spend', label: 'Потратить' },
                { id: 'refund', label: 'Вернуть' },
              ]}
            />
          </Field>
        ) : null}
        <Text>{body}</Text>
        {joltNote ? <Text tone="muted">{joltNote}</Text> : null}
      </Stack>
    </Dialog>
  )
}
