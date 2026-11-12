import { ApiRequestError } from '../../shared/api/client'
import type { CharacterInOtherLobbyData } from '../../shared/api/lobbies'

export function parseCharacterInOtherLobby(
  err: unknown,
): CharacterInOtherLobbyData | null {
  if (!(err instanceof ApiRequestError)) return null
  if (err.code !== 'character_in_other_lobby') return null
  const data = err.data
  if (!data) return null
  const other_lobby_id = String(data.other_lobby_id || '')
  const other_lobby_name = String(data.other_lobby_name || '')
  if (!other_lobby_id || !other_lobby_name) return null
  return {
    other_lobby_id,
    other_lobby_name,
    can_transfer: Boolean(data.can_transfer),
  }
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function formatPersonalNotesExport(
  lobbyName: string,
  notes: Array<{ title: string; body: string; updated_at?: string }>,
): string {
  const lines = [`Личные заметки — ${lobbyName}`, '']
  if (notes.length === 0) {
    lines.push('(пусто)')
    return lines.join('\n')
  }
  for (const note of notes) {
    lines.push(`## ${note.title || 'Без названия'}`)
    if (note.updated_at) lines.push(`(${note.updated_at})`)
    lines.push(note.body || '')
    lines.push('')
  }
  return lines.join('\n')
}
