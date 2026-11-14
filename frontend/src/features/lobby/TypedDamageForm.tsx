import { useState, type FormEvent } from 'react'
import { DAMAGE_TYPES, damageTypeLabel, type DamageType } from '../../shared/dnd/damageTypes'
import { Button, NumberInput, Select, Text } from '../../ui'

export type TypedDamagePayload = {
  amount: number
  damageType: DamageType | null
  grantTempHp?: number
  heal: boolean
}

type Props = {
  busy?: boolean
  disabledDeal?: boolean
  disabledHeal?: boolean
  showTempHp?: boolean
  onApply: (payload: TypedDamagePayload) => void
}

/** Урон / лечение с типом (S-03). Общий жест для героя и врага. */
export function TypedDamageForm({
  busy = false,
  disabledDeal = false,
  disabledHeal = false,
  showTempHp = true,
  onApply,
}: Props) {
  const [amount, setAmount] = useState<number | null>(null)
  const [damageType, setDamageType] = useState<DamageType | ''>('bludgeoning')
  const [tempHp, setTempHp] = useState<number | null>(null)

  const hasAmount = amount != null && amount > 0

  function submit(heal: boolean) {
    if (!hasAmount || amount == null) return
    onApply({
      amount,
      damageType: heal ? null : damageType || null,
      grantTempHp: heal && tempHp != null && tempHp > 0 ? tempHp : undefined,
      heal,
    })
    setAmount(null)
    setTempHp(null)
  }

  function onForm(e: FormEvent) {
    e.preventDefault()
    if (!disabledDeal) submit(false)
  }

  return (
    <form className="session-typed-damage" onSubmit={onForm}>
      <div className="session-typed-damage__row session-typed-damage__row--inputs">
        <NumberInput
          size="md"
          narrow
          value={amount}
          min={1}
          max={9999}
          integer
          emptyValue={null}
          disabled={busy}
          placeholder="Число"
          aria-label="Количество"
          onValueChange={setAmount}
        />
        <Select
          size="md"
          className="session-typed-damage__type"
          value={damageType}
          disabled={busy}
          aria-label="Тип урона"
          onChange={(e) => setDamageType(e.target.value as DamageType | '')}
        >
          <option value="">без типа</option>
          {DAMAGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {damageTypeLabel(t)}
            </option>
          ))}
        </Select>
      </div>
      <div className="session-typed-damage__row session-typed-damage__row--actions">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={busy || disabledDeal || !hasAmount}
        >
          Урон
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={busy || disabledHeal || !hasAmount}
          onClick={() => submit(true)}
        >
          Лечение
        </Button>
      </div>
      {showTempHp ? (
        <label className="session-typed-damage__temp">
          <Text tone="muted" className="session-typed-damage__temp-label">
            Врем. HP
          </Text>
          <NumberInput
            size="md"
            narrow
            value={tempHp}
            min={1}
            max={9999}
            integer
            emptyValue={null}
            disabled={busy}
            placeholder="—"
            aria-label="Временные хиты при лечении"
            onValueChange={setTempHp}
          />
        </label>
      ) : null}
    </form>
  )
}
