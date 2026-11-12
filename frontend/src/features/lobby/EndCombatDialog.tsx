import { useEffect, useState } from 'react'
import type { SessionCombat } from '../../shared/api/lobbies'
import { Dialog, Field, Input, Stack, Text } from '../../ui'

type Props = {
  open: boolean
  busy?: boolean
  combat: SessionCombat | null | undefined
  onClose: () => void
  onConfirm: (payload: {
    keep_unreleased_waves: boolean
    summary: string
  }) => void
}

/**
 * S-02: завершение боя — вопрос про невыпущенные волны + строка итога.
 * Дальше страница открывает награды (S-06 / временный AwardXpDialog).
 */
export function EndCombatDialog({ open, busy = false, combat, onClose, onConfirm }: Props) {
  const unreleased = (combat?.waves ?? []).filter((w) => !w.released)
  const [keep, setKeep] = useState(true)
  const [summary, setSummary] = useState('Партия победила')

  useEffect(() => {
    if (!open) return
    setKeep(true)
    setSummary('Партия победила')
  }, [open])

  return (
    <Dialog
      open={open}
      title="Завершить бой"
      primaryLabel="Завершить"
      secondaryLabel="Отмена"
      busy={busy}
      onSecondary={onClose}
      onPrimary={() =>
        onConfirm({
          keep_unreleased_waves: unreleased.length > 0 ? keep : false,
          summary: summary.trim() || 'Бой завершён',
        })
      }
    >
      <Stack gap={12}>
        <Text tone="muted">
          Выпущенные и павшие враги уйдут со стола. Откроется окно наград (опыт / лут).
        </Text>
        {unreleased.length > 0 ? (
          <Stack gap={8}>
            <Text>
              Невыпущенные волны: {unreleased.map((w) => w.index).join(', ')}. Сохранить на сессии
              или выбросить?
            </Text>
            <div className="session-combatant-mode">
              <button
                type="button"
                className={`session-combatant-mode__btn${keep ? ' is-on' : ''}`}
                onClick={() => setKeep(true)}
              >
                Сохранить
              </button>
              <button
                type="button"
                className={`session-combatant-mode__btn${!keep ? ' is-on' : ''}`}
                onClick={() => setKeep(false)}
              >
                Выбросить
              </button>
            </div>
          </Stack>
        ) : null}
        <Field label="Итог в ленту">
          <Input
            value={summary}
            disabled={busy}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Партия победила"
          />
        </Field>
      </Stack>
    </Dialog>
  )
}
