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
  closed_at?: string | null
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

export type SeatCondition = {
  slug: string
  name: string
  catalog_id?: string | null
}

export type SeatCompanion = {
  id: string
  name: string
  hp_current: number | null
  hp_max: number | null
  ac: number | null
  conditions: SeatCondition[]
}

export type SeatConcentration = {
  spell_id: string
  name: string
}

export type SeatEffect = {
  id: string
  name: string
  source_character_id?: string | null
  source_name?: string | null
  linked_concentration?: boolean
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
  conditions?: SeatCondition[]
  effects?: SeatEffect[]
  concentration?: SeatConcentration | null
  /** Conc + подготовленные Conc-заклинания с листа кастера */
  effect_suggestions?: string[]
  companions?: SeatCompanion[]
  passive_perception?: number | null
  passive_insight?: number | null
  passive_investigation?: number | null
  seated_at: string
}

export type CombatantAction = {
  name_ru: string
  text_ru?: string
  name_en?: string | null
}

export type SessionCombatant = {
  id: string
  name: string
  hp_current: number
  hp_max: number
  ac?: number | null
  speed?: number | null
  cr?: string | null
  catalog_id?: string | null
  slug?: string | null
  source_book?: string | null
  type_ru?: string | null
  custom?: boolean
  conditions?: SeatCondition[]
  traits?: CombatantAction[]
  actions?: CombatantAction[]
  bonus_actions?: CombatantAction[]
  reactions?: CombatantAction[]
  legendary_actions?: CombatantAction[]
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
  combatants?: SessionCombatant[]
  lobby_members: LobbyMember[]
  visibility_profile?: unknown
  closed_at?: string | null
  created_at: string
  updated_at: string
}

export type JournalEntryType = 'text' | 'chapter' | 'setting_link' | 'image' | 'session_summary'

export type JournalEntry = {
  id: string
  lobby_id: string
  author_user_id: string | null
  entry_type: JournalEntryType | string
  title: string
  body: string
  image_url: string | null
  setting_id: string | null
  setting_name: string | null
  from_session_id: string | null
  from_session_name: string | null
  created_at: string
  updated_at: string
}

export type JournalPage = {
  items: JournalEntry[]
  total: number
  offset: number
  limit: number
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

export async function shareLobbyEffect(
  lobbyId: string,
  payload: {
    source_character_id: string
    name: string
    target_character_ids: string[]
    linked_concentration?: boolean
  },
): Promise<{ applied: number; lobby: LobbyDetail }> {
  return apiRequest<{ applied: number; lobby: LobbyDetail }>(
    `/lobbies/${lobbyId}/share-effect`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
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

export async function patchSeatCombat(
  sessionId: string,
  characterId: string,
  payload: {
    inspiration?: boolean
    conditions?: SeatCondition[]
    effects?: SeatEffect[]
    concentration?: SeatConcentration | null
    clear_concentration?: boolean
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/seats/${characterId}/combat`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function addSeatCompanion(
  sessionId: string,
  characterId: string,
  payload: {
    name: string
    hp_current?: number | null
    hp_max?: number | null
    ac?: number | null
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/seats/${characterId}/companions`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function patchSeatCompanion(
  sessionId: string,
  characterId: string,
  companionId: string,
  payload: {
    name?: string
    hp_current?: number | null
    hp_max?: number | null
    ac?: number | null
    conditions?: SeatCondition[]
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/seats/${characterId}/companions/${companionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function deleteSeatCompanion(
  sessionId: string,
  characterId: string,
  companionId: string,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/seats/${characterId}/companions/${companionId}`,
    { method: 'DELETE' },
  )
}

export async function addSessionCombatants(
  sessionId: string,
  payload: {
    catalog_id?: string | null
    slug?: string | null
    name?: string | null
    hp_max?: number | null
    ac?: number | null
    speed?: number | null
    count?: number
    actions?: CombatantAction[]
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combatants`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function patchSessionCombatant(
  sessionId: string,
  combatantId: string,
  payload: {
    hp_current?: number
    hp_max?: number
    ac?: number | null
    name?: string
    damage?: number
    conditions?: SeatCondition[]
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combatants/${combatantId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteSessionCombatant(
  sessionId: string,
  combatantId: string,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combatants/${combatantId}`, {
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

export async function listJournal(
  lobbyId: string,
  opts?: { offset?: number; limit?: number },
): Promise<JournalPage> {
  const params = new URLSearchParams()
  if (opts?.offset != null) params.set('offset', String(opts.offset))
  if (opts?.limit != null) params.set('limit', String(opts.limit))
  const q = params.toString()
  return apiRequest<JournalPage>(`/lobbies/${lobbyId}/journal${q ? `?${q}` : ''}`)
}

export async function createJournalEntry(
  lobbyId: string,
  payload: {
    entry_type: JournalEntryType | string
    title?: string
    body?: string
    image_url?: string | null
    setting_id?: string | null
  },
): Promise<JournalEntry> {
  return apiRequest<JournalEntry>(`/lobbies/${lobbyId}/journal`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  await apiRequest<void>(`/journal/${entryId}`, { method: 'DELETE' })
}

export async function closeSession(
  sessionId: string,
  payload: { title?: string; summary?: string; write_journal?: boolean },
): Promise<{ session: SessionDetail; journal_entry: JournalEntry | null }> {
  return apiRequest(`/sessions/${sessionId}/close`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
