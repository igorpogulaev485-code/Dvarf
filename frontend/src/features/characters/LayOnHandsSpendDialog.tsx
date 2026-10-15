import { useMemo, useState } from 'react'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Field, Stack, Text } from '../../ui'

type LayOnHandsSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  onSpend: (label: string, cost: number) => void
  onToast: (message: string) => void
  onClose: () => void
}

const DISEASE_COST = 5

export function LayOnHandsSpendDialog({
  open,
  resource,
  onSpend,
  onToast,
  onClose,
}: LayOnHandsSpendDialogProps) {
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const [healAmount, setHealAmount] = useState(1)

  const healChoices = useMemo(() => {
    const max = Math.max(0, remaining)
    if (max <= 0) return [1]
    return Array.from({ length: max }, (_, i) => i + 1)
  }, [remaining])

  const clampedHeal = Math.min(remaining, Math.max(1, healAmount))

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

  return (
    <Dialog
      open={open}
      title="Возложение рук"
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

        <div className="sorcery-spend-list">
          <div className="sorcery-spend-row">
            <div className="sorcery-spend-row__text">
              <b>Исцелить хиты</b>
              <span>Действием коснись существа — восстанови хиты из пула.</span>
              <Field label="Сколько хитов">
                <select
                  className="play-select"
                  value={clampedHeal}
                  disabled={remaining <= 0}
                  onChange={(event) => setHealAmount(Number(event.target.value))}
                >
                  {healChoices.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
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
      </Stack>
    </Dialog>
  )
}
