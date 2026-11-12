import { useEffect, useState } from 'react'
import type { CombatEntry, SessionSeat } from '../../shared/api/lobbies'
import { Button, Dialog, Field, NumberInput, Stack, Text } from '../../ui'

type Props = {
  open: boolean
  busy?: boolean
  entry: CombatEntry | null
  seat?: SessionSeat | null
  onClose: () => void
  onRoll: (payload: { advantage?: boolean }) => void
  onManual: (value: number) => void
}

function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : String(n)
}

/** S-02 Ф26: бросок или число с кубиков. */
export function InitiativeRollDialog({
  open,
  busy = false,
  entry,
  seat,
  onClose,
  onRoll,
  onManual,
}: Props) {
  const dex = seat?.dex_mod ?? entry?.dex_mod ?? 0
  const bonus = seat?.initiative_bonus ?? 0
  const hasAdv = Boolean(seat?.initiative_advantage)
  const [manual, setManual] = useState<number | null>(null)
  const [adv, setAdv] = useState(false)

  useEffect(() => {
    if (!open) return
    setManual(null)
    setAdv(hasAdv)
  }, [open, hasAdv, entry?.id])

  if (!entry) return null

  return (
    <Dialog
      open={open}
      title={`Инициатива: ${entry.name}`}
      primaryLabel="Бросить"
      secondaryLabel="Отмена"
      busy={busy}
      onSecondary={onClose}
      onPrimary={() => onRoll({ advantage: adv || undefined })}
      size="default"
    >
      <Stack gap={12}>
        <Text tone="muted">
          1к20 {formatMod(dex)}
          {bonus ? ` ${formatMod(bonus)}` : ''}
          {hasAdv ? ' · на листе преимущество' : ''}
        </Text>
        <label className="session-feed-filter">
          <input
            type="checkbox"
            checked={adv}
            disabled={busy}
            onChange={(e) => setAdv(e.target.checked)}
          />
          Преимущество
        </label>
        <Field label="Или число с кубиков">
          <NumberInput
            value={manual}
            min={-20}
            max={99}
            integer
            emptyValue={null}
            disabled={busy}
            onValueChange={setManual}
          />
        </Field>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || manual == null}
          onClick={() => {
            if (manual == null) return
            onManual(manual)
          }}
        >
          Вписать число
        </Button>
      </Stack>
    </Dialog>
  )
}
