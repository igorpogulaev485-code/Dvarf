/**
 * T4: сменить статус квеста со стола (+ опционально дневник).
 */
import { useEffect, useState } from 'react'
import type { QuestStatus, SessionLorePage } from '../../shared/api/lobbies'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import { QUEST_STATUS_LABELS } from './settingKinds'

type Props = {
  open: boolean
  busy?: boolean
  quest: SessionLorePage | null
  onClose: () => void
  onSave: (payload: {
    page_id: string
    quest_status: QuestStatus
    write_journal: boolean
    title?: string
    summary?: string
  }) => void
}

const STATUSES: QuestStatus[] = ['planned', 'active', 'done', 'failed']

export function SessionQuestStatusDialog({
  open,
  busy = false,
  quest,
  onClose,
  onSave,
}: Props) {
  const [status, setStatus] = useState<QuestStatus>('active')
  const [writeJournal, setWriteJournal] = useState(true)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!open || !quest) return
    setStatus((quest.quest_status as QuestStatus) || 'active')
    setWriteJournal(true)
    setTitle('')
    setSummary('')
  }, [open, quest])

  const closing = status === 'done' || status === 'failed'

  return (
    <Dialog
      open={open}
      title={quest ? `Квест: ${quest.title}` : 'Квест'}
      primaryLabel="Сохранить"
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!quest}
      onSecondary={onClose}
      onPrimary={() => {
        if (!quest) return
        onSave({
          page_id: quest.id,
          quest_status: status,
          write_journal: closing && writeJournal,
          title: title.trim() || undefined,
          summary: summary.trim() || undefined,
        })
      }}
    >
      <Stack gap={12}>
        <Text tone="muted">Статус виден на панели лора. Закрытие можно записать в дневник.</Text>
        <Field label="Статус">
          <select
            className="ui-input"
            value={status}
            disabled={busy}
            onChange={(e) => setStatus(e.target.value as QuestStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {QUEST_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        {closing ? (
          <>
            <label className="setting-wiki-reveal__toggle">
              <input
                type="checkbox"
                checked={writeJournal}
                disabled={busy}
                onChange={(e) => setWriteJournal(e.target.checked)}
              />
              <span>Записать в дневник</span>
            </label>
            {writeJournal ? (
              <>
                <Field label="Заголовок (опционально)">
                  <Input
                    value={title}
                    disabled={busy}
                    placeholder={`Квест: ${QUEST_STATUS_LABELS[status]} · ${quest?.title ?? ''}`}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
                <Field label="Итог (опционально)">
                  <textarea
                    className="ui-input ui-textarea"
                    rows={3}
                    value={summary}
                    disabled={busy}
                    placeholder="Что произошло…"
                    onChange={(e) => setSummary(e.target.value)}
                  />
                </Field>
              </>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Dialog>
  )
}
