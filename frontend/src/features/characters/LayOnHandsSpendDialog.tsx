import { useMemo, useState } from 'react'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Field, NumberInput, Stack, Text } from '../../ui'
import {
  evaluateLayOnHandsSpend2024,
  LAY_ON_HANDS_NAME_RU,
  RESTORING_TOUCH_CONDITION_NAME_RU,
  RESTORING_TOUCH_CONDITIONS_2024,
  RESTORING_TOUCH_MIN_LEVEL_2024,
  type RestoringTouchCondition2024,
} from '../../shared/dnd/paladin2024Features'

type LayOnHandsSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  onSpend: (label: string, cost: number) => void
  onToast: (message: string) => void
  onClose: () => void
  /** 2024 path: bonus action, poison-only, Restoring Touch at L14+. */
  rulesEdition?: '2014' | '2024'
  paladinLevel?: number
}

const DISEASE_COST = 5
const POISON_COST = 5

export function LayOnHandsSpendDialog({
  open,
  resource,
  onSpend,
  onToast,
  onClose,
  rulesEdition = '2014',
  paladinLevel = 1,
}: LayOnHandsSpendDialogProps) {
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const [healAmount, setHealAmount] = useState(1)
  const [poison, setPoison] = useState(false)
  const [conditions, setConditions] = useState<RestoringTouchCondition2024[]>([])
  const is2024 = rulesEdition === '2024'
  const clampedHeal =
    remaining <= 0 ? 1 : Math.min(remaining, Math.max(1, healAmount))
  const showRestoringTouch = is2024 && paladinLevel >= RESTORING_TOUCH_MIN_LEVEL_2024

  const eval2024 = useMemo(() => {
    if (!is2024) return null
    return evaluateLayOnHandsSpend2024({
      heal: healAmount > 0 ? Math.min(remaining, Math.max(0, healAmount)) : 0,
      poison,
      conditions,
      paladinLevel,
    })
  }, [is2024, healAmount, remaining, poison, conditions, paladinLevel])

  function spend(label: string, cost: number) {
    if (remaining <= 0) {
      onToast('Пул Возложения рук пуст')
      return
    }
    if (cost > remaining) {
      onToast(`Не хватает пула (нужно ${cost}, есть ${remaining})`)
      return
    }
    onSpend(label, cost)
  }

  function toggleCondition(id: RestoringTouchCondition2024) {
    setConditions((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id],
    )
  }

  function apply2024() {
    const result = evaluateLayOnHandsSpend2024({
      heal: healAmount > 0 ? Math.min(remaining, Math.max(0, Math.floor(healAmount))) : 0,
      poison,
      conditions,
      paladinLevel,
    })
    if (!result.ok) {
      onToast(result.message ?? 'Нельзя применить')
      return
    }
    const parts: string[] = []
    const heal = Math.floor(healAmount > 0 ? Math.min(remaining, Math.max(0, healAmount)) : 0)
    if (heal > 0) parts.push(`Исцеление ${heal} хитов`)
    if (poison) parts.push('Снять Отравленного')
    if (conditions.length) {
      parts.push(
        conditions.map((id) => RESTORING_TOUCH_CONDITION_NAME_RU[id]).join(', '),
      )
    }
    spend(parts.join('; ') || LAY_ON_HANDS_NAME_RU, result.cost)
  }

  return (
    <Dialog
      open={open}
      title={resource?.name?.trim() || 'Возложение рук'}
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Сейчас {remaining}/{resource?.max ?? 0} хитов в пуле (5 × уровень паладина).
        </Text>

        {is2024 ? (
          <div className="sorcery-spend-list">
            <div className="sorcery-spend-row">
              <div className="sorcery-spend-row__text">
                <b>Исцелить хиты</b>
                <span>
                  Бонусным действием коснись существа — восстанови хиты из пула.
                </span>
                <Field label="Сколько хитов">
                  <NumberInput
                    value={Math.min(remaining, Math.max(0, healAmount))}
                    min={0}
                    max={Math.max(0, remaining)}
                    disabled={remaining <= 0}
                    emptyValue={0}
                    aria-label="Сколько хитов исцелить"
                    onValueChange={(next) => {
                      if (next == null) return
                      setHealAmount(next)
                    }}
                  />
                </Field>
              </div>
            </div>

            <div className="sorcery-spend-row">
              <div className="sorcery-spend-row__text">
                <label className="sheet-check">
                  <input
                    type="checkbox"
                    checked={poison}
                    disabled={remaining < POISON_COST && !poison}
                    onChange={(event) => setPoison(event.target.checked)}
                  />
                  <span>
                    <b>Снять Отравленного</b> (−{POISON_COST}, не лечит)
                  </span>
                </label>
              </div>
            </div>

            {showRestoringTouch ? (
              <div className="sorcery-spend-row">
                <div className="sorcery-spend-row__text">
                  <b>Восстанавливающее касание</b>
                  <span>Каждое состояние −{POISON_COST} из пула (не лечит).</span>
                  <Stack gap={6}>
                    {RESTORING_TOUCH_CONDITIONS_2024.map((id) => (
                      <label key={id} className="sheet-check">
                        <input
                          type="checkbox"
                          checked={conditions.includes(id)}
                          onChange={() => toggleCondition(id)}
                        />
                        <span>{RESTORING_TOUCH_CONDITION_NAME_RU[id]} (−5)</span>
                      </label>
                    ))}
                  </Stack>
                </div>
              </div>
            ) : null}

            <div className="sorcery-spend-row">
              <div className="sorcery-spend-row__text">
                <Text tone="muted">
                  Итого: {eval2024?.ok ? eval2024.cost : '—'} из пула
                  {eval2024 && !eval2024.ok && eval2024.message
                    ? ` · ${eval2024.message}`
                    : ''}
                </Text>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={remaining <= 0 || !eval2024?.ok}
                onClick={apply2024}
              >
                −{eval2024?.ok ? eval2024.cost : 0}
              </Button>
            </div>
          </div>
        ) : (
          <div className="sorcery-spend-list">
            <div className="sorcery-spend-row">
              <div className="sorcery-spend-row__text">
                <b>Исцелить хиты</b>
                <span>Действием коснись существа — восстанови хиты из пула.</span>
                <Field label="Сколько хитов">
                  <NumberInput
                    value={clampedHeal}
                    min={1}
                    max={Math.max(1, remaining)}
                    disabled={remaining <= 0}
                    emptyValue={1}
                    aria-label="Сколько хитов исцелить"
                    onValueChange={(next) => {
                      if (next == null) return
                      setHealAmount(next)
                    }}
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={remaining <= 0}
                onClick={() => spend(`Исцеление ${clampedHeal} хитов`, clampedHeal)}
              >
                −{clampedHeal || 1}
              </Button>
            </div>

            <div className="sorcery-spend-row">
              <div className="sorcery-spend-row__text">
                <b>Снять болезнь или яд</b>
                <span>
                  Потрать {DISEASE_COST} из пула — нейтрализовать одну болезнь или яд
                  (вместо исцеления хитов).
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={remaining < DISEASE_COST}
                onClick={() => spend('Снять болезнь / яд', DISEASE_COST)}
              >
                −{DISEASE_COST}
              </Button>
            </div>
          </div>
        )}
      </Stack>
    </Dialog>
  )
}
