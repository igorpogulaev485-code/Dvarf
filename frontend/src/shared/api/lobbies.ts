import { apiRequest } from './client'

export type LobbySummary = {
  id: string
  name: string
  invite_code: string | null
  is_owner: boolean
  member_count: number
  created_at: string
  updated_at: string
}

export type LobbyMember = {
  id: string
  character_id: string
  user_id: string
  joined_at: string
  character_name: string
  character_level: number
  character_class_name: string | null
  character_race_name: string | null
  hp_current: number | null
  hp_max: number | null
}

export type SettingSummary = {
  id: string
  lobby_id: string
  name: string
  world_notes: string
  created_at: string
  updated_at: string
}

export type SessionSummary = {
  id: string
  lobby_id: string
  setting_id: string | null
  setting_name: string | null
  name: string
  seat_count: number
  created_at: string
  updated_at: string
}

export type LobbyDetail = {
  id: string
  name: string
  invite_code: string | null
  join_path: string | null
  is_owner: boolean
  owner_id: string
  members: LobbyMember[]
  settings: SettingSummary[]
  sessions: SessionSummary[]
  /** JSON профиля видимости; нормализуется на клиенте */
  visibility_profile?: unknown
  created_at: string
  updated_at: string
}

export type LobbyUpdatePayload = {
  name?: string
  visibility_profile?: unknown
}

export type SessionSeat = {
  character_id: string
  character_name: string
  character_level: number
  character_class_name: string | null
  character_race_name: string | null
  hp_current: number | null
  hp_max: number | null
  ac?: number | null
  speed?: number | null
  inspiration?: boolean
  passive_perception?: number | null
  passive_insight?: number | null
  passive_investigation?: number | null
  seated_at: string
}

export type SessionDetail = {
  id: string
  lobby_id: string
  lobby_name: string
  setting_id: string | null
  setting_name: string | null
  name: string
  is_owner: boolean
  seats: SessionSeat[]
  lobby_members: LobbyMember[]
  visibility_profile?: unknown
  created_at: string
  updated_at: string
}

export type SessionEvent = {
  id: string
  session_id: string
  event_type: string
  character_id: string | null
  actor_user_id: string | null
  character_name: string | null
  title: string
  formula: string | null
  breakdown: string | null
  total: number | null
  is_master_roll: boolean
  payload: Record<string, unknown>
  created_at: string
}

export async function listLobbies(): Promise<LobbySummary[]> {
  return apiRequest<LobbySummary[]>('/lobbies')
}

export async function createLobby(name?: string): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>('/lobbies', {
    method: 'POST',
    body: JSON.stringify({ name: name || undefined }),
  })
}

export async function getLobby(id: string): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${id}`)
}

export async function updateLobby(
  id: string,
  payload: LobbyUpdatePayload,
): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteLobby(id: string): Promise<void> {
  await apiRequest<void>(`/lobbies/${id}`, { method: 'DELETE' })
}

export async function joinLobby(code: string, characterId: string): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>('/lobbies/join', {
    method: 'POST',
    body: JSON.stringify({ code, character_id: characterId }),
  })
}

export async function addLobbyMember(lobbyId: string, characterId: string): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/members`, {
    method: 'POST',
    body: JSON.stringify({ character_id: characterId }),
  })
}

export async function removeLobbyMember(
  lobbyId: string,
  characterId: string,
): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/members/${characterId}`, {
    method: 'DELETE',
  })
}

export async function createSetting(
  lobbyId: string,
  payload: { name?: string; world_notes?: string },
): Promise<SettingSummary> {
  return apiRequest<SettingSummary>(`/lobbies/${lobbyId}/settings`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getSetting(id: string): Promise<SettingSummary> {
  return apiRequest<SettingSummary>(`/settings/${id}`)
}

export async function updateSetting(
  id: string,
  payload: { name?: string; world_notes?: string },
): Promise<SettingSummary> {
  return apiRequest<SettingSummary>(`/settings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteSetting(id: string): Promise<void> {
  await apiRequest<void>(`/settings/${id}`, { method: 'DELETE' })
}

export async function createSession(
  lobbyId: string,
  payload: {
    name?: string
    setting_id?: string | null
    /** Кто пришёл — сразу за стол (посещаемость) */
    character_ids?: string[]
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/lobbies/${lobbyId}/sessions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getSession(id: string): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${id}`)
}

export async function updateSession(
  id: string,
  payload: { name?: string; setting_id?: string | null; clear_setting?: boolean },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteSession(id: string): Promise<void> {
  await apiRequest<void>(`/sessions/${id}`, { method: 'DELETE' })
}

export async function seatCharacter(sessionId: string, characterId: string): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/seats`, {
    method: 'POST',
    body: JSON.stringify({ character_id: characterId }),
  })
}

export async function unseatCharacter(
  sessionId: string,
  characterId: string,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/seats/${characterId}`, {
    method: 'DELETE',
  })
}

export function lobbyQrUrl(inviteCode: string): string {
  const joinUrl = `${window.location.origin}/join/${inviteCode}`
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`
}

export async function listSessionEvents(
  sessionId: string,
  opts?: { rollsOnly?: boolean },
): Promise<SessionEvent[]> {
  const q = opts?.rollsOnly ? '?rolls_only=true' : ''
  return apiRequest<SessionEvent[]>(`/sessions/${sessionId}/events${q}`)
}

export async function createSessionRoll(
  sessionId: string,
  payload: {
    character_id?: string | null
    title: string
    formula?: string | null
    breakdown?: string | null
    total: number
    is_master_roll?: boolean
  },
): Promise<SessionEvent> {
  return apiRequest<SessionEvent>(`/sessions/${sessionId}/rolls`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function sessionWsUrl(sessionId: string, accessToken: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.host
  return `${proto}://${host}/sessions/${sessionId}/ws?token=${encodeURIComponent(accessToken)}`
}
