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
  type AbilityKey,
  type AbilityMethod,
} from '../../shared/dnd/pointBuy'

type AbilitiesStepProps = {
  method: AbilityMethod
  baseAbilities: AbilityScores
  racialBonuses: Partial<AbilityScores>
  classSlug: string | null
  onMethodChange: (method: AbilityMethod) => void
  onBaseChange: (scores: AbilityScores) => void
}

function finalScore(base: number, bonus: number | undefined): number {
  return base + (bonus ?? 0)
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

  function setScore(key: AbilityKey, value: number) {
    onBaseChange({ ...baseAbilities, [key]: value })
  }

  function assignArrayValue(key: AbilityKey, value: number) {
    const next = { ...baseAbilities }
    // Free the previous holder of this value if unique assignment.
    for (const other of ABILITY_ORDER) {
      if (other !== key && next[other] === value) next[other] = 0
    }
    next[key] = value
    onBaseChange(next)
  }

  return (
    <Stack gap={14}>
      <Text as="h2">Характеристики</Text>
      <Text tone="muted">
        База без расовых бонусов. Справа в сумме уже с расой. Point buy — {POINT_BUY_BUDGET} очков,
        до расы максимум {POINT_BUY_MAX}.
      </Text>

      <div className="create-pipeline__method-row">
        {(
          [
            ['manual', 'Вручную'],
            ['standard_array', 'Массив 15–8'],
            ['point_buy', 'Point buy'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={method === id ? 'primary' : 'secondary'}
            onClick={() => {
              onMethodChange(id)
              if (id === 'standard_array') {
                onBaseChange(applyStandardArrayByPriority(classSlug))
              } else if (id === 'point_buy') {
                onBaseChange(applyPointBuyByPriority(classSlug))
              } else if (id === 'manual') {
                onBaseChange(emptyBaseScores(10))
              }
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {method === 'point_buy' ? (
        <Text tone={remaining === 0 ? 'muted' : 'danger'}>
          Остаток очков: {remaining} / {POINT_BUY_BUDGET}
        </Text>
      ) : null}

      {method === 'standard_array' ? (
        <Text tone="muted">Массив: {STANDARD_ARRAY.join(', ')}. Каждое число — один раз.</Text>
      ) : null}

      <div className="create-pipeline__ability-grid">
        {ABILITY_ORDER.map((key) => {
          const bonus = racialBonuses[key] ?? 0
          return (
            <div key={key} className="create-pipeline__ability-row">
              <div>
                <Text className="create-pipeline__ability-label">{ABILITY_LABEL_RU[key]}</Text>
                {bonus ? (
                  <Text tone="muted" className="create-pipeline__ability-bonus">
                    раса {bonus > 0 ? `+${bonus}` : bonus}
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

      {classSlug ? (
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
