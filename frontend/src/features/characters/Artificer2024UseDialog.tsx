/**
 * 2024 Artificer feature «use» dialog — edition branch only (`rules_edition === '2024'`).
 * Magic of Making / Flash of Genius (spend), Spell-Storing spell pick, Replicates panel.
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
  applyArtificer2024FeatureUse,
  artificer2024UseFeatureId,
  artificerAttunementLimit2024,
  createReplicateActive2024,
  dissolveReplicateActive2024,
  FLASH_OF_GENIUS_NAME_RU,
  FLASH_OF_GENIUS_POOL_ID,
  findArtificerPool2024,
  MAGIC_ITEMS_COLUMN_RU,
  MAGIC_OF_MAKING_NAME_RU,
  MAGIC_OF_MAKING_POOL_ID,
  PLANS_KNOWN_COLUMN_RU,
  replicateAttunedCount2024,
  replicateLimits2024,
  setReplicateAttuned2024,
  SPELL_STORING_ITEM_NAME_RU,
  type Artificer2024UseResult,
} from '../../shared/dnd/artificer2024Features'

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

export function Artificer2024UseDialog({
  open,
  request,
  resources,
  artificerLevel,
  classOptions2024,
  onClassOptions2024Change,
  onConfirm,
  onClose,
  onToast,
}: Props) {
  const [mode, setMode] = useState('spend')
  const [pendingPlan, setPendingPlan] = useState('')
  const [pendingAttune, setPendingAttune] = useState(false)

  if (!request) return null

  const featureId =
    artificer2024UseFeatureId(request.featureId) ?? request.featureId.replace(/_/g, '-')

  const isSsi = featureId === 'spell-storing-item' || featureId === 'spell_storing_item'
  const isReplicate =
    featureId === 'replicate-magic-item' || featureId === 'replicate_magic_item'

  const poolId =
    featureId === 'magic-of-making' || featureId === 'magic_of_making'
      ? MAGIC_OF_MAKING_POOL_ID
      : featureId === 'flash-of-genius' || featureId === 'flash_of_genius'
        ? FLASH_OF_GENIUS_POOL_ID
        : isSsi
          ? 'spell_storing_item'
          : null

  const pool =
    poolId != null
      ? findArtificerPool2024(resources, poolId, request.classEntryId)
      : request.resourceId
        ? resources.find((row) => row.id === request.resourceId) ?? null
        : null

  const left = pool ? Math.max(0, pool.max - pool.used) : 0
  const refundable = poolId === MAGIC_OF_MAKING_POOL_ID || poolId === FLASH_OF_GENIUS_POOL_ID

  const limits = replicateLimits2024(artificerLevel)
  const attuneLimit = artificerAttunementLimit2024(artificerLevel)

  function confirmPool() {
    const result = applyArtificer2024FeatureUse({
      featureId: request!.featureId,
      resourceId: request!.resourceId,
      resources,
      classEntryId: request!.classEntryId,
      refund: mode === 'refund',
    })
    if (result.ok) onConfirm(result)
    else if (result.message) onToast?.(result.message)
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

  const body =
    FEATURE_TEXT[featureId] ?? FEATURE_TEXT[request.featureId] ?? request.name

  return (
    <Dialog
      open={open}
      title={request.name}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      onPrimary={confirmPool}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        {pool ? (
          <Text tone="muted">
            Осталось: {left}/{pool.max}
          </Text>
        ) : null}
        {refundable ? (
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
      </Stack>
    </Dialog>
  )
}
