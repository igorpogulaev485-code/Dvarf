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
  can_edit?: boolean
  /** L-08: персонаж в лобби — правила кампании для листа */
  lobby_id?: string | null
  campaign_rules?: unknown
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

export async function uploadCharacterAvatar(
  id: string,
  file: File,
): Promise<CharacterDetail> {
  const body = new FormData()
  body.append('file', file)
  return apiRequest<CharacterDetail>(`/characters/${id}/avatar`, {
    method: 'POST',
    body,
  })
}

export async function deleteCharacterAvatar(id: string): Promise<CharacterDetail> {
  return apiRequest<CharacterDetail>(`/characters/${id}/avatar`, {
    method: 'DELETE',
  })
}

export async function deleteCharacter(id: string): Promise<void> {
  await apiRequest<void>(`/characters/${id}`, {
    method: 'DELETE',
  })
}

export type ApplyEffectPayload = {
  target_character_ids: string[]
  effect: {
    id?: string
    name: string
    kind?: string
    slug?: string
    origin?: string
    linked_concentration?: boolean
    ac_bonus?: number
    charges?: number
    mods?: Array<{
      target: string
      op: string
      value?: number
      dice?: string
      condition?: string
      once?: boolean
    }>
    duration?: {
      unit: string
      value?: number
      started_at?: string
      started_round?: number
      remaining_rounds?: number
    }
  }
  linked_concentration?: boolean
}

export async function applyCharacterEffects(
  sourceCharacterId: string,
  payload: ApplyEffectPayload,
): Promise<{ applied: number; character_ids: string[] }> {
  return apiRequest<{ applied: number; character_ids: string[] }>(
    `/characters/${sourceCharacterId}/effects/apply`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function clearCharacterConcentrationEffects(
  characterId: string,
  options?: { clearConcentration?: boolean },
): Promise<{ removed: number }> {
  return apiRequest<{ removed: number }>(
    `/characters/${characterId}/effects/clear-concentration`,
    {
      method: 'POST',
      body: JSON.stringify({
        clear_concentration: options?.clearConcentration !== false,
      }),
    },
  )
}
