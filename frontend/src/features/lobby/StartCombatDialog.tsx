import { useEffect, useMemo, useState } from 'react'
import type {
  CombatEntryInput,
  CombatWaveInput,
  SessionCombatant,
  SessionSeat,
} from '../../shared/api/lobbies'
import { Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'
import { seatCompanionInInitiativeSeed } from './companionCombatSeat'

type DraftRow = CombatEntryInput & {
  key: string
  waveIndex: number
}

type Props = {
  open: boolean
  busy?: boolean
  seats: SessionSeat[]
  combatants: SessionCombatant[]
  onClose: () => void
  onSubmit: (payload: { entries: CombatEntryInput[]; waves: CombatWaveInput[] }) => void
}

function formatMod(mod: number | null | undefined): string {
  if (mod == null) return '—'
  return mod >= 0 ? `+${mod}` : String(mod)
}

/**
 * S-02: волны + инициатива. Игроки бросают сами; ведущий вводит за врагов/НПС.
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
        initiative: null,
        initiative_pending: true,
        dex_mod: seat.dex_mod ?? null,
        waveIndex: 1,
      })
      for (const companion of seat.companions ?? []) {
        // C-02: «ход хозяина» — не отдельная строка инициативы.
        if (!seatCompanionInInitiativeSeed(companion)) continue
        rows.push({
          key: `comp-${seat.character_id}-${companion.id}`,
          kind: 'companion',
          ref_id: seat.character_id,
          companion_id: companion.id,
          name: `${companion.name} (${seat.character_name})`,
          initiative: null,
          initiative_pending: true,
          dex_mod: companion.dex_mod ?? null,
          waveIndex: 1,
        })
      }
    }
    for (const enemy of combatants) {
      if ((enemy.alive_count ?? 1) <= 0) continue
      const label =
        (enemy.member_count ?? 1) > 1
          ? `${enemy.name} ×${enemy.alive_count ?? enemy.member_count}`
          : enemy.name
      rows.push({
        key: `enemy-${enemy.id}`,
        kind: 'enemy',
        ref_id: enemy.id,
        name: label,
        initiative: 10 + (enemy.dex_mod ?? 0),
        initiative_pending: false,
        dex_mod: enemy.dex_mod ?? null,
        waveIndex: 1,
      })
    }
    return rows
  }, [seats, combatants])

  const [rows, setRows] = useState<DraftRow[]>([])
  const [waveConditions, setWaveConditions] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!open) return
    setRows(seed)
    setWaveConditions({})
  }, [open, seed])

  const waveIndexes = useMemo(() => {
    const set = new Set(rows.filter((r) => r.kind === 'enemy').map((r) => r.waveIndex))
    if (set.size === 0) set.add(1)
    return [...set].sort((a, b) => a - b)
  }, [rows])

  const canSubmit = rows.length > 0

  return (
    <Dialog
      open={open}
      title="Бой"
      primaryLabel="Начать бой"
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canSubmit}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!canSubmit) return
        const waves: CombatWaveInput[] = waveIndexes.map((index) => ({
          index,
          released: index === 1,
          condition_text: waveConditions[index]?.trim() || null,
          combatant_ids: rows
            .filter((r) => r.kind === 'enemy' && r.waveIndex === index)
            .map((r) => r.ref_id),
        }))
        // если врагов нет — всё равно волна 1
        const finalWaves =
          waves.length > 0
            ? waves
            : [{ index: 1, released: true, condition_text: null, combatant_ids: [] }]
        onSubmit({
          waves: finalWaves,
          entries: rows.map(
            ({ kind, ref_id, companion_id, name, initiative, initiative_pending, dex_mod }) => ({
              kind,
              ref_id,
              companion_id,
              name,
              initiative: initiative_pending || initiative == null ? null : initiative,
              initiative_pending: Boolean(initiative_pending || initiative == null),
              dex_mod,
            }),
          ),
        })
      }}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Волна 1 сразу на столе. Остальные скрыты, пока не выпустишь. Игроки бросают инициативу
          сами; за врагов можно вписать число сейчас или позже. Бой можно начать и без противников —
          герои бьют друг друга выбором цели.
        </Text>
        {rows.length === 0 ? (
          <Text tone="muted">Некого сажать в бой — посади игроков или противников.</Text>
        ) : (
          <ul className="session-init-list">
            {rows.map((row) => (
              <li key={row.key} className="session-init-list__row session-init-list__row--s02">
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
                    {row.kind === 'pc' ? ' · бросит сам' : null}
                  </Text>
                </div>
                {row.kind === 'enemy' ? (
                  <Field label="Волна">
                    <NumberInput
                      value={row.waveIndex}
                      min={1}
                      max={12}
                      integer
                      emptyValue={1}
                      disabled={busy}
                      aria-label={`Волна ${row.name}`}
                      onValueChange={(value) => {
                        setRows((prev) =>
                          prev.map((r) =>
                            r.key === row.key
                              ? { ...r, waveIndex: Math.max(1, value ?? 1) }
                              : r,
                          ),
                        )
                      }}
                    />
                  </Field>
                ) : (
                  <div />
                )}
                  <Field label={row.kind === 'pc' ? 'Иниц. (позже)' : 'Иниц.'}>
                  <NumberInput
                    value={
                      row.initiative_pending || row.initiative == null
                        ? null
                        : row.initiative
                    }
                    min={-20}
                    max={99}
                    integer
                    emptyValue={null}
                    disabled={busy || row.kind === 'pc'}
                    aria-label={`Инициатива ${row.name}`}
                    onValueChange={(value) => {
                      setRows((prev) =>
                        prev.map((r) =>
                          r.key === row.key
                            ? {
                                ...r,
                                initiative: value ?? null,
                                initiative_pending: value == null,
                              }
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
        {waveIndexes
          .filter((i) => i > 1)
          .map((index) => (
            <Field key={index} label={`Напоминание волны ${index} (не автозапуск)`}>
              <Input
                value={waveConditions[index] ?? ''}
                disabled={busy}
                placeholder="например: когда пал последний гоблин"
                onChange={(e) =>
                  setWaveConditions((prev) => ({ ...prev, [index]: e.target.value }))
                }
              />
            </Field>
          ))}
      </Stack>
    </Dialog>
  )
}
