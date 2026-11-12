import { apiRequest, getAccessToken } from './client'

export type ChatChannel = {
  id: string
  lobby_id: string
  name: string
  created_by_user_id: string | null
  created_at: string
  message_count: number
}

export type ChatMessage = {
  id: string
  channel_id: string
  author_user_id: string | null
  character_id: string | null
  character_name: string | null
  body: string
  created_at: string
}

export type MasterLetterSummary = {
  id: string
  lobby_id: string
  character_id: string | null
  character_name: string
  subject: string
  status: string
  last_message_at: string
  preview: string
}

export type MasterLetterMessage = {
  id: string
  letter_id: string
  author_user_id: string | null
  is_master: boolean
  body: string
  created_at: string
}

export type MasterLetter = {
  id: string
  lobby_id: string
  author_user_id: string
  character_id: string | null
  character_name: string
  subject: string
  status: string
  created_at: string
  updated_at: string
  last_message_at: string
  messages: MasterLetterMessage[]
}

export type MasterLetterBadge = {
  count: number
  items: MasterLetterSummary[]
}

export type WhisperPeer = {
  user_id: string
  label: string
  is_master: boolean
}

export type WhisperThread = {
  id: string
  lobby_id: string
  peer_user_id: string
  peer_label: string
  peer_is_master: boolean
  last_message_at: string
  unread_count: number
  created_at: string
}

export type WhisperMessage = {
  id: string
  thread_id: string
  author_user_id: string | null
  character_id: string | null
  character_name: string | null
  body: string
  created_at: string
}

export type WhisperFact = {
  thread_id: string
  lobby_id: string
  user_a_id: string
  user_b_id: string
  label_a: string
  label_b: string
  last_message_at: string
}

export type ChatsBadge = {
  letters: number
  channels: number
  whispers: number
  total: number
}

export async function listChannels(lobbyId: string): Promise<ChatChannel[]> {
  return apiRequest<ChatChannel[]>(`/lobbies/${lobbyId}/channels`)
}

export async function createChannel(lobbyId: string, name: string): Promise<ChatChannel> {
  return apiRequest<ChatChannel>(`/lobbies/${lobbyId}/channels`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function listChannelMessages(
  channelId: string,
  limit = 50,
): Promise<ChatMessage[]> {
  return apiRequest<ChatMessage[]>(`/channels/${channelId}/messages?limit=${limit}`)
}

export async function postChannelMessage(
  channelId: string,
  payload: { body: string; character_id?: string | null },
): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(`/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listLetters(lobbyId: string): Promise<MasterLetterSummary[]> {
  return apiRequest<MasterLetterSummary[]>(`/lobbies/${lobbyId}/letters`)
}

export async function letterBadge(lobbyId: string): Promise<MasterLetterBadge> {
  return apiRequest<MasterLetterBadge>(`/lobbies/${lobbyId}/letters/badge`)
}

export async function createLetter(
  lobbyId: string,
  payload: { subject: string; body: string; character_id?: string | null },
): Promise<MasterLetter> {
  return apiRequest<MasterLetter>(`/lobbies/${lobbyId}/letters`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getLetter(letterId: string): Promise<MasterLetter> {
  return apiRequest<MasterLetter>(`/letters/${letterId}`)
}

export async function replyLetter(letterId: string, body: string): Promise<MasterLetter> {
  return apiRequest<MasterLetter>(`/letters/${letterId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export async function closeLetter(letterId: string): Promise<MasterLetter> {
  return apiRequest<MasterLetter>(`/letters/${letterId}/close`, { method: 'POST' })
}

export async function listWhisperPeers(lobbyId: string): Promise<WhisperPeer[]> {
  return apiRequest<WhisperPeer[]>(`/lobbies/${lobbyId}/whispers/peers`)
}

export async function listWhispers(lobbyId: string): Promise<WhisperThread[]> {
  return apiRequest<WhisperThread[]>(`/lobbies/${lobbyId}/whispers`)
}

export async function listWhisperFacts(lobbyId: string): Promise<WhisperFact[]> {
  return apiRequest<WhisperFact[]>(`/lobbies/${lobbyId}/whispers/facts`)
}

export async function openWhisper(lobbyId: string, peerUserId: string): Promise<WhisperThread> {
  return apiRequest<WhisperThread>(`/lobbies/${lobbyId}/whispers`, {
    method: 'POST',
    body: JSON.stringify({ peer_user_id: peerUserId }),
  })
}

export async function listWhisperMessages(
  threadId: string,
  limit = 50,
): Promise<WhisperMessage[]> {
  return apiRequest<WhisperMessage[]>(`/whispers/${threadId}/messages?limit=${limit}`)
}

export async function postWhisperMessage(
  threadId: string,
  payload: { body: string; character_id?: string | null },
): Promise<WhisperMessage> {
  return apiRequest<WhisperMessage>(`/whispers/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function chatsBadge(lobbyId: string): Promise<ChatsBadge> {
  return apiRequest<ChatsBadge>(`/lobbies/${lobbyId}/chats/badge`)
}

export async function markChatRead(
  lobbyId: string,
  targetKind: 'channel' | 'whisper' | 'letter',
  targetId: string,
): Promise<ChatsBadge> {
  return apiRequest<ChatsBadge>(`/lobbies/${lobbyId}/chats/read`, {
    method: 'POST',
    body: JSON.stringify({ target_kind: targetKind, target_id: targetId }),
  })
}

export function lobbyWsUrl(lobbyId: string, accessToken: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.host
  return `${proto}://${host}/lobbies/${lobbyId}/ws?token=${encodeURIComponent(accessToken)}`
}

export function getLobbyWsToken(): string | null {
  return getAccessToken()
}
