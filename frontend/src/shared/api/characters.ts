import { apiRequest, ApiRequestError } from './client'

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
  /** Incomplete create-pipeline character. */
  is_draft?: boolean
  created_at: string
  updated_at: string
}

export type CharacterDetail = CharacterSummary & {
  sheet: Record<string, unknown>
}

export async function listCharacters(): Promise<CharacterSummary[]> {
  const data = await apiRequest<CharacterSummary[] | unknown>('/characters')
  if (!Array.isArray(data)) {
    throw new ApiRequestError(
      'Некорректный ответ списка персонажей',
      502,
      'invalid_character_list',
    )
  }
  return data
}

export async function createCharacter(
  rulesEdition: RulesEdition,
  name?: string,
  options?: { isDraft?: boolean },
): Promise<CharacterDetail> {
  return apiRequest<CharacterDetail>('/characters', {
    method: 'POST',
    body: JSON.stringify({
      rules_edition: rulesEdition,
      name: name || undefined,
      is_draft: options?.isDraft ?? false,
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
  is_draft?: boolean
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
