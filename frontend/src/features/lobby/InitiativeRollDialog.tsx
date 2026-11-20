import { useEffect, useState } from 'react'
import type { CombatEntry, SessionSeat } from '../../shared/api/lobbies'
import {
  SURPRISE_2024_HINT,
  usesSurpriseInitiativeDisadvantage,
} from '../../shared/dnd/surprise2024'
import { Button, Dialog, Field, NumberInput, Stack, Text } from '../../ui'

type Props = {
  open: boolean
  busy?: boolean
  entry: CombatEntry | null
  seat?: SessionSeat | null
  /** P24-M04: lobby edition — surprised → disadv on initiative for 2024. */
  rulesEdition?: string | null
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
  rulesEdition = '2014',
  onClose,
  onRoll,
  onManual,
}: Props) {
  const dex = seat?.dex_mod ?? entry?.dex_mod ?? 0
  const bonus = seat?.initiative_bonus ?? 0
  const hasAdv = Boolean(seat?.initiative_advantage)
  const surprised2024 =
    usesSurpriseInitiativeDisadvantage(rulesEdition) && Boolean(entry?.surprised)
  const [manual, setManual] = useState<number | null>(null)
  const [adv, setAdv] = useState(false)

  useEffect(() => {
    if (!open) return
    setManual(null)
    // Surprised 2024 cancels advantage into normal; UI still shows disadv note.
    setAdv(hasAdv && !surprised2024)
  }, [open, hasAdv, surprised2024, entry?.id])

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
          {hasAdv && !surprised2024 ? ' · на листе преимущество' : ''}
          {surprised2024 ? ' · врасплох: помеха к инициативе' : ''}
        </Text>
        {surprised2024 ? (
          <Text tone="muted" data-testid="initiative-surprise-2024-hint">
            {SURPRISE_2024_HINT}
          </Text>
        ) : null}
        <label className="session-feed-filter">
          <input
            type="checkbox"
            checked={adv}
            disabled={busy || surprised2024}
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
