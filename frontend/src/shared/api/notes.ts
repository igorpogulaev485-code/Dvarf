import { apiRequest } from './client'

export type NoteScope = 'personal' | 'party' | 'master'

export type Note = {
  id: string
  lobby_id: string
  scope: NoteScope | string
  author_user_id: string
  character_id: string | null
  character_name: string | null
  title: string
  body: string
  shared_with_master: boolean
  pinned: boolean
  updated_by_user_id: string | null
  updated_by_name: string | null
  created_at: string
  updated_at: string
  can_edit: boolean
  can_delete: boolean
  can_pin: boolean
  can_share_with_master: boolean
  can_send_to_journal: boolean
}

export type NotesExport = {
  filename: string
  content: string
}

export async function listNotes(
  lobbyId: string,
  scope?: NoteScope | string,
): Promise<Note[]> {
  const q = scope ? `?scope=${encodeURIComponent(scope)}` : ''
  return apiRequest<Note[]>(`/lobbies/${lobbyId}/notes${q}`)
}

export async function exportNotes(lobbyId: string): Promise<NotesExport> {
  return apiRequest<NotesExport>(`/lobbies/${lobbyId}/notes/export`)
}

export async function createNote(
  lobbyId: string,
  payload: {
    scope: NoteScope | string
    title?: string
    body?: string
    character_id?: string | null
    pinned?: boolean
  },
): Promise<Note> {
  return apiRequest<Note>(`/lobbies/${lobbyId}/notes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateNote(
  noteId: string,
  payload: {
    title?: string
    body?: string
    shared_with_master?: boolean
    pinned?: boolean
    updated_at?: string
  },
): Promise<Note> {
  return apiRequest<Note>(`/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteNote(noteId: string): Promise<void> {
  await apiRequest<void>(`/notes/${noteId}`, { method: 'DELETE' })
}
