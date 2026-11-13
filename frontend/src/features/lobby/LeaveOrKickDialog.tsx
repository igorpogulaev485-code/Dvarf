import { useEffect, useState } from 'react'
import { downloadTextFile } from './joinConflict'
import { deleteNote, exportNotes, listNotes } from '../../shared/api/notes'
import { Button, Dialog, Stack, Text } from '../../ui'

type Mode = 'leave' | 'kick'

type Props = {
  open: boolean
  mode: Mode
  lobbyId: string
  lobbyName: string
  characterName: string
  /** Персонаж сидит в открытой сессии / в бою */
  seatedInOpenSession: boolean
  busy?: boolean
  onClose: () => void
  onConfirm: (opts: {
    combat_fate?: 'release' | 'retain'
    delete_personal_notes: boolean
  }) => void
}

export function LeaveOrKickDialog({
  open,
  mode,
  lobbyId,
  lobbyName: _lobbyName,
  characterName,
  seatedInOpenSession,
  busy,
  onClose,
  onConfirm,
}: Props) {
  void _lobbyName
  const [deleteNotes, setDeleteNotes] = useState(false)
  const [combatFate, setCombatFate] = useState<'release' | 'retain'>('release')
  const [notesBusy, setNotesBusy] = useState(false)
  const [notesHint, setNotesHint] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDeleteNotes(false)
    setCombatFate('release')
    setNotesHint(null)
  }, [open])

  async function onDownloadNotes() {
    setNotesBusy(true)
    setNotesHint(null)
    try {
      // L-05: полный экспорт (не минимальный формат L-04)
      const file = await exportNotes(lobbyId)
      downloadTextFile(file.filename, file.content)
      setNotesHint(file.content.includes('(пусто)') ? 'Заметок нет' : 'Скачано')
    } catch {
      setNotesHint('Не удалось скачать заметки')
    } finally {
      setNotesBusy(false)
    }
  }

  async function onDeleteNotesNow() {
    setNotesBusy(true)
    setNotesHint(null)
    try {
      const notes = await listNotes(lobbyId, 'personal')
      for (const note of notes) {
        await deleteNote(note.id)
      }
      setDeleteNotes(true)
      setNotesHint(notes.length ? `Удалено: ${notes.length}` : 'Личных заметок нет')
    } catch {
      setNotesHint('Не удалось удалить заметки')
    } finally {
      setNotesBusy(false)
    }
  }

  const title = mode === 'leave' ? 'Покинуть лобби' : `Убрать «${characterName}»`
  const primary =
    mode === 'leave'
      ? 'Покинуть'
      : combatFate === 'retain'
        ? 'Убрать и оставить в бою'
        : 'Убрать'

  return (
    <Dialog
      open={open}
      title={title}
      primaryLabel={busy ? '…' : primary}
      secondaryLabel="Отмена"
      onPrimary={() =>
        onConfirm({
          combat_fate: mode === 'kick' && seatedInOpenSession ? combatFate : undefined,
          delete_personal_notes: mode === 'leave' ? deleteNotes : false,
        })
      }
      onSecondary={onClose}
      busy={busy || notesBusy}
      primaryDisabled={Boolean(busy)}
    >
      <Stack gap={12}>
        {mode === 'leave' ? (
          <>
            <Text>
              Лист, опыт и лут останутся у вас. Общая доска заметок не трогается. При возврате по
              коду личные заметки подтянутся, если их не удалить.
            </Text>
            <Text tone="muted">Личные заметки этого лобби:</Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="button" variant="secondary" disabled={notesBusy} onClick={() => void onDownloadNotes()}>
                Скачать
              </Button>
              <Button type="button" variant="ghost" disabled={notesBusy} onClick={() => void onDeleteNotesNow()}>
                Удалить
              </Button>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={deleteNotes}
                onChange={(e) => setDeleteNotes(e.target.checked)}
              />
              <Text>Удалить личные заметки при выходе</Text>
            </label>
            {notesHint ? <Text tone="muted">{notesHint}</Text> : null}
          </>
        ) : (
          <>
            <Text>
              Персонаж сразу выйдет из состава. Лист игрока останется. Подтвердите удаление
              «{characterName}».
            </Text>
            {seatedInOpenSession ? (
              <Stack gap={8}>
                <Text>Персонаж сейчас за столом / в бою:</Text>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="combat_fate"
                    checked={combatFate === 'release'}
                    onChange={() => setCombatFate('release')}
                  />
                  <Text>Отпустить персонажа (снять со стола и из боя)</Text>
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="combat_fate"
                    checked={combatFate === 'retain'}
                    onChange={() => setCombatFate('retain')}
                  />
                  <Text>Оставить врагом/напарником до конца боя</Text>
                </label>
              </Stack>
            ) : null}
          </>
        )}
      </Stack>
    </Dialog>
  )
}
