import { useEffect, useMemo, useState } from 'react'
import type {
  CombatEntryInput,
  SessionCombatant,
  SessionSeat,
} from '../../shared/api/lobbies'
import { Dialog, Field, NumberInput, Stack, Text } from '../../ui'

type DraftRow = CombatEntryInput & { key: string }

type Props = {
  open: boolean
  busy?: boolean
  seats: SessionSeat[]
  combatants: SessionCombatant[]
  onClose: () => void
  onSubmit: (entries: CombatEntryInput[]) => void
}

function formatMod(mod: number | null | undefined): string {
  if (mod == null) return '—'
  return mod >= 0 ? `+${mod}` : String(mod)
}

/**
 * Мастер вводит инициативу с физ. кубов (d20 + ловк.) для всех за столом.
 */
export function StartCombatDialog({
  open,
  busy = false,
  seats,
  combatants,
  onClose,
  onSubmit,
}: Props) {
  const seed = useMemo(() => {
    const rows: DraftRow[] = []
    for (const seat of seats) {
      rows.push({
        key: `pc-${seat.character_id}`,
        kind: 'pc',
        ref_id: seat.character_id,
        name: seat.character_name,
        initiative: 10 + (seat.dex_mod ?? 0),
        dex_mod: seat.dex_mod ?? null,
      })
      for (const companion of seat.companions ?? []) {
        rows.push({
          key: `comp-${seat.character_id}-${companion.id}`,
          kind: 'companion',
          ref_id: seat.character_id,
          companion_id: companion.id,
          name: `${companion.name} (${seat.character_name})`,
          initiative: 10,
          dex_mod: null,
        })
      }
    }
    for (const enemy of combatants) {
      if ((enemy.alive_count ?? 1) <= 0) continue
      rows.push({
        key: `enemy-${enemy.id}`,
        kind: 'enemy',
        ref_id: enemy.id,
        name: enemy.name,
        initiative: 10 + (enemy.dex_mod ?? 0),
        dex_mod: enemy.dex_mod ?? null,
      })
    }
    return rows
  }, [seats, combatants])

  const [rows, setRows] = useState<DraftRow[]>([])

  useEffect(() => {
    if (!open) return
    setRows(seed)
  }, [open, seed])

  const canSubmit = rows.length > 0 && rows.every((r) => Number.isFinite(r.initiative))

  return (
    <Dialog
      open={open}
      title="Инициатива"
      primaryLabel="Начать бой"
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canSubmit}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!canSubmit) return
        onSubmit(
          rows.map(({ kind, ref_id, companion_id, name, initiative, dex_mod }) => ({
            kind,
            ref_id,
            companion_id,
            name,
            initiative,
            dex_mod,
          })),
        )
      }}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Введи результат с физических кубов (обычно d20 + мод. Ловкости). Порядок
          отсортируется сам.
        </Text>
        {rows.length === 0 ? (
          <Text tone="muted">Некого сажать в бой — посади игроков или противников.</Text>
        ) : (
          <ul className="session-init-list">
            {rows.map((row) => (
              <li key={row.key} className="session-init-list__row">
                <div className="session-init-list__who">
                  <span className="session-init-list__name">{row.name}</span>
                  <Text tone="muted" className="session-init-list__meta">
                    {row.kind === 'pc'
                      ? 'герой'
                      : row.kind === 'companion'
                        ? 'напарник'
                        : 'враг'}
                    {' · '}
                    Ловк. {formatMod(row.dex_mod)}
                  </Text>
                </div>
                <Field label="Иниц.">
                  <NumberInput
                    value={row.initiative}
                    min={-20}
                    max={99}
                    integer
                    emptyValue={0}
                    disabled={busy}
                    aria-label={`Инициатива ${row.name}`}
                    onValueChange={(value) => {
                      setRows((prev) =>
                        prev.map((r) =>
                          r.key === row.key
                            ? { ...r, initiative: value ?? 0 }
                            : r,
                        ),
                      )
                    }}
                  />
                </Field>
              </li>
            ))}
          </ul>
        )}
      </Stack>
    </Dialog>
  )
}
