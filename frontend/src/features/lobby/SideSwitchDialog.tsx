import { useEffect, useMemo, useState } from 'react'
import type { CombatEntry, CombatSide } from '../../shared/api/lobbies'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import { DEFAULT_SIDE_LABELS, SIDE_ENEMIES, SIDE_PARTY, sideLabel } from './combatSides'

type Props = {
  open: boolean
  busy?: boolean
  entry: CombatEntry | null
  sides: CombatSide[]
  onClose: () => void
  onSubmit: (payload: {
    entry_id: string
    side: string
    side_label?: string | null
    side_hidden: boolean
  }) => void
  onReveal?: (entryId: string) => void
}

/**
 * S-05: мастер переводит участника на сторону / скрывает / раскрывает.
 */
export function SideSwitchDialog({
  open,
  busy = false,
  entry,
  sides,
  onClose,
  onSubmit,
  onReveal,
}: Props) {
  const registry = useMemo(() => {
    const base = sides?.length
      ? sides
      : [
          { id: SIDE_PARTY, label: DEFAULT_SIDE_LABELS[SIDE_PARTY] },
          { id: SIDE_ENEMIES, label: DEFAULT_SIDE_LABELS[SIDE_ENEMIES] },
        ]
    return base
  }, [sides])

  const [side, setSide] = useState(SIDE_PARTY)
  const [customLabel, setCustomLabel] = useState('')
  const [hidden, setHidden] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')

  useEffect(() => {
    if (!open || !entry) return
    setSide(entry.side || (entry.kind === 'enemy' ? SIDE_ENEMIES : SIDE_PARTY))
    setHidden(Boolean(entry.side_hidden))
    setCustomLabel('')
    setMode('existing')
  }, [open, entry])

  if (!entry) return null

  return (
    <Dialog
      open={open}
      title={`Сторона · ${entry.name}`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      busy={busy}
      onSecondary={onClose}
      onPrimary={() => {
        if (mode === 'new') {
          const label = customLabel.trim()
          if (!label) return
          onSubmit({
            entry_id: entry.id,
            side: label,
            side_label: label,
            side_hidden: hidden,
          })
          return
        }
        onSubmit({
          entry_id: entry.id,
          side,
          side_hidden: hidden,
        })
      }}
      primaryDisabled={mode === 'new' && !customLabel.trim()}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Сторона влияет на «своих» (цели, лечение союзников, ауры). Предатель остаётся игроком со
          своим листом. Скрытая сторона видна только ведущему, пока не раскроете или он не ударит
          «своих».
        </Text>

        <div className="session-combatant-mode">
          <button
            type="button"
            className={`session-combatant-mode__btn${mode === 'existing' ? ' is-on' : ''}`}
            disabled={busy}
            onClick={() => setMode('existing')}
          >
            Существующая
          </button>
          <button
            type="button"
            className={`session-combatant-mode__btn${mode === 'new' ? ' is-on' : ''}`}
            disabled={busy}
            onClick={() => setMode('new')}
          >
            Новая
          </button>
        </div>

        {mode === 'existing' ? (
          <Field label="Сторона">
            <select
              className="play-select"
              value={side}
              disabled={busy}
              onChange={(e) => setSide(e.target.value)}
            >
              {registry.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Название новой стороны">
            <Input
              value={customLabel}
              disabled={busy}
              placeholder="Культисты"
              onChange={(e) => setCustomLabel(e.target.value)}
            />
          </Field>
        )}

        <label className="manual-roll-form__check">
          <input
            type="checkbox"
            checked={hidden}
            disabled={busy}
            onChange={(e) => setHidden(e.target.checked)}
          />
          Скрыть сторону (остальным как «{sideLabel(SIDE_PARTY, registry)}»)
        </label>

        {entry.side_hidden && onReveal ? (
          <button
            type="button"
            className="ui-button ui-button--ghost"
            disabled={busy}
            onClick={() => onReveal(entry.id)}
          >
            Раскрыть сейчас
          </button>
        ) : null}
      </Stack>
    </Dialog>
  )
}
