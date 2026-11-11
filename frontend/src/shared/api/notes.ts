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
  created_at: string
  updated_at: string
  can_edit: boolean
}

export async function listNotes(
  lobbyId: string,
  scope?: NoteScope | string,
): Promise<Note[]> {
  const q = scope ? `?scope=${encodeURIComponent(scope)}` : ''
  return apiRequest<Note[]>(`/lobbies/${lobbyId}/notes${q}`)
}

export async function createNote(
  lobbyId: string,
  payload: {
    scope: NoteScope | string
    title?: string
    body?: string
    character_id?: string | null
  },
): Promise<Note> {
  return apiRequest<Note>(`/lobbies/${lobbyId}/notes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateNote(
  noteId: string,
  payload: { title?: string; body?: string },
): Promise<Note> {
  return apiRequest<Note>(`/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteNote(noteId: string): Promise<void> {
  await apiRequest<void>(`/notes/${noteId}`, { method: 'DELETE' })
}
