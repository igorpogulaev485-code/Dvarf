import { useState } from 'react'
import { Button, Field, NumberInput, Stack, Text } from '../../ui'
import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import {
  ABILITY_LABEL_RU,
  ABILITY_ORDER,
  POINT_BUY_BUDGET,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  STANDARD_ARRAY,
  applyPointBuyByPriority,
  applyStandardArrayByPriority,
  emptyBaseScores,
  pointBuyRemaining,
  roll4d6DropLowest,
  rollAllAbilities,
  type AbilityKey,
  type AbilityMethod,
  type AbilityRollDetail,
} from '../../shared/dnd/pointBuy'

type AbilitiesStepProps = {
  method: AbilityMethod
  baseAbilities: AbilityScores
  racialBonuses: Partial<AbilityScores>
  classSlug: string | null
  onMethodChange: (method: AbilityMethod) => void
  onBaseChange: (scores: AbilityScores) => void
}

type MethodCard = {
  id: AbilityMethod
  title: string
  subtitle: string
}

const METHOD_CARDS: MethodCard[] = [
  {
    id: 'standard_array',
    title: 'Массив',
    subtitle: STANDARD_ARRAY.join(', '),
  },
  {
    id: 'point_buy',
    title: 'Point buy',
    subtitle: `${POINT_BUY_BUDGET} очков · до ${POINT_BUY_MAX}`,
  },
  {
    id: 'roll',
    title: 'Бросок',
    subtitle: '4d6, отбросить младший',
  },
  {
    id: 'manual',
    title: 'Вручную',
    subtitle: 'Значения 1–20',
  },
]

function finalScore(base: number, bonus: number | undefined): number {
  return base + (bonus ?? 0)
}

function formatDice(detail: AbilityRollDetail): string {
  return detail.dice
    .map((n) => (n === detail.dropped ? `[${n}]` : String(n)))
    .join(' · ')
}

export function AbilitiesStep({
  method,
  baseAbilities,
  racialBonuses,
  classSlug,
  onMethodChange,
  onBaseChange,
}: AbilitiesStepProps) {
  const remaining = pointBuyRemaining(baseAbilities)
  const usedArrayValues = ABILITY_ORDER.map((key) => baseAbilities[key]).filter((v) => v > 0)
  const [rollDetails, setRollDetails] = useState<
    Partial<Record<AbilityKey, AbilityRollDetail>>
  >({})

  function applyMethod(id: AbilityMethod) {
    onMethodChange(id)
    if (id === 'standard_array') {
      setRollDetails({})
      onBaseChange(applyStandardArrayByPriority(classSlug))
    } else if (id === 'point_buy') {
      setRollDetails({})
      onBaseChange(applyPointBuyByPriority(classSlug))
    } else if (id === 'manual') {
      setRollDetails({})
      onBaseChange(emptyBaseScores(10))
    } else if (id === 'roll') {
      const { scores, details } = rollAllAbilities()
      setRollDetails(details)
      onBaseChange(scores)
    }
  }

  function setScore(key: AbilityKey, value: number) {
    onBaseChange({ ...baseAbilities, [key]: value })
  }

  function assignArrayValue(key: AbilityKey, value: number) {
    const next = { ...baseAbilities }
    for (const other of ABILITY_ORDER) {
      if (other !== key && next[other] === value) next[other] = 0
    }
    next[key] = value
    onBaseChange(next)
  }

  function rerollOne(key: AbilityKey) {
    const detail = roll4d6DropLowest()
    setRollDetails((prev) => ({ ...prev, [key]: detail }))
    setScore(key, detail.total)
  }

  function rerollAll() {
    const { scores, details } = rollAllAbilities()
    setRollDetails(details)
    onBaseChange(scores)
  }

  return (
    <Stack gap={14}>
      <Text as="h2" className="create-pipeline__section-title">
        Характеристики
      </Text>
      <Text tone="muted">
        База без расовых бонусов. Справа в сумме уже с расой. Point buy — {POINT_BUY_BUDGET} очков,
        до расы максимум {POINT_BUY_MAX}.
      </Text>

      <div className="create-pipeline__method-cards" role="group" aria-label="Метод характеристик">
        {METHOD_CARDS.map((card) => {
          const selected = method === card.id
          return (
            <button
              key={card.id}
              type="button"
              className={
                selected
                  ? 'create-pipeline__method-card create-pipeline__method-card--selected'
                  : 'create-pipeline__method-card'
              }
              aria-pressed={selected}
              onClick={() => applyMethod(card.id)}
            >
              <span className="create-pipeline__method-card-title">{card.title}</span>
              <span className="create-pipeline__method-card-sub">{card.subtitle}</span>
            </button>
          )
        })}
      </div>

      {method === 'point_buy' ? (
        <Text tone={remaining === 0 ? 'muted' : 'danger'}>
          Остаток очков: {remaining} / {POINT_BUY_BUDGET}
        </Text>
      ) : null}

      {method === 'standard_array' ? (
        <Text tone="muted">Массив: {STANDARD_ARRAY.join(', ')}. Каждое число — один раз.</Text>
      ) : null}

      {method === 'roll' ? (
        <Stack gap={8}>
          <Text tone="muted">
            Для каждой характеристики: 4d6, младший в скобках не считается. Можно перебросить одну
            или все.
          </Text>
          <Button variant="secondary" onClick={rerollAll}>
            Перебросить все
          </Button>
        </Stack>
      ) : null}

      <div className="create-pipeline__ability-grid">
        {ABILITY_ORDER.map((key) => {
          const bonus = racialBonuses[key] ?? 0
          const detail = rollDetails[key]
          return (
            <div key={key} className="create-pipeline__ability-row">
              <div>
                <Text className="create-pipeline__ability-label">{ABILITY_LABEL_RU[key]}</Text>
                {bonus ? (
                  <Text tone="muted" className="create-pipeline__ability-bonus">
                    раса {bonus > 0 ? `+${bonus}` : bonus}
                  </Text>
                ) : null}
                {method === 'roll' && detail ? (
                  <Text tone="muted" className="create-pipeline__ability-dice">
                    {formatDice(detail)}
                  </Text>
                ) : null}
              </div>
              {method === 'standard_array' ? (
                <select
                  className="create-pipeline__select"
                  value={baseAbilities[key] || ''}
                  onChange={(event) => {
                    const raw = Number(event.target.value)
                    if (!raw) {
                      setScore(key, 0)
                      return
                    }
                    assignArrayValue(key, raw)
                  }}
                >
                  <option value="">—</option>
                  {STANDARD_ARRAY.map((score) => {
                    const taken =
                      usedArrayValues.includes(score) && baseAbilities[key] !== score
                    return (
                      <option key={score} value={score} disabled={taken}>
                        {score}
                      </option>
                    )
                  })}
                </select>
              ) : method === 'roll' ? (
                <div className="create-pipeline__roll-controls">
                  <Text className="create-pipeline__ability-roll-total">{baseAbilities[key]}</Text>
                  <Button variant="ghost" onClick={() => rerollOne(key)}>
                    Ещё раз
                  </Button>
                </div>
              ) : (
                <Field label="база">
                  <NumberInput
                    value={baseAbilities[key]}
                    min={method === 'point_buy' ? POINT_BUY_MIN : 1}
                    max={method === 'point_buy' ? POINT_BUY_MAX : 30}
                    onValueChange={(value) => setScore(key, value ?? POINT_BUY_MIN)}
                  />
                </Field>
              )}
              <Text className="create-pipeline__ability-final">
                = {finalScore(baseAbilities[key], racialBonuses[key])}
              </Text>
            </div>
          )
        })}
      </div>

      {classSlug && method !== 'roll' ? (
        <Button
          variant="ghost"
          onClick={() => {
            if (method === 'point_buy') onBaseChange(applyPointBuyByPriority(classSlug))
            else if (method === 'standard_array') {
              onBaseChange(applyStandardArrayByPriority(classSlug))
            }
          }}
        >
          Разложить по приоритету класса
        </Button>
      ) : null}
    </Stack>
  )
}
