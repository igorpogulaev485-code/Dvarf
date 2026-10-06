import { apiRequest } from './client'

export type RulesEdition = '2014' | '2024'

export type CharacterSummary = {
  id: string
  name: string
  avatar_url: string | null
  level: number
  class_name: string | null
  race_name: string | null
  hp_current: number | null
  hp_max: number | null
  rules_edition: RulesEdition
  sheet_version: number
  created_at: string
  updated_at: string
}

export type CharacterDetail = CharacterSummary & {
  sheet: Record<string, unknown>
}

export async function listCharacters(): Promise<CharacterSummary[]> {
  const data = await apiRequest<CharacterSummary[] | unknown>('/characters')
  if (!Array.isArray(data)) {
    throw new Error('Некорректный ответ списка персонажей')
  }
  return data
}

export async function createCharacter(
  rulesEdition: RulesEdition,
  name?: string,
): Promise<CharacterDetail> {
  return apiRequest<CharacterDetail>('/characters', {
    method: 'POST',
    body: JSON.stringify({
      rules_edition: rulesEdition,
      name: name || undefined,
    }),
  })
}

export async function getCharacter(id: string): Promise<CharacterDetail> {
  return apiRequest<CharacterDetail>(`/characters/${id}`)
}

export type CharacterUpdatePayload = {
  sheet_version: number
  name?: string
  level?: number
  class_name?: string | null
  race_name?: string | null
  hp_current?: number | null
  hp_max?: number | null
  sheet?: Record<string, unknown>
}

export async function updateCharacter(
  id: string,
  payload: CharacterUpdatePayload,
): Promise<CharacterDetail> {
  return apiRequest<CharacterDetail>(`/characters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
