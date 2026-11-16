import { apiRequest, ApiRequestError } from './client'
import { RULES_EDITION_2024_OPEN } from '../dnd/rulesEdition2024'

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
  /** S-04: открытая сессия, где персонаж сидит (лента бросков с листа) */
  open_session_id?: string | null
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
  // P24-01: client gate mirrors RULES_EDITION_2024_OPEN (opens in P24-M06).
  if (rulesEdition === '2024' && !RULES_EDITION_2024_OPEN) {
    throw new Error('Редакция 2024 ещё не открыта')
  }
  return apiRequest<CharacterDetail>('/characters', {
    method: 'POST',
    body: JSON.stringify({
      rules_edition: rulesEdition,
      name: name || undefined,
      is_draft: options?.isDraft ?? false,
    }),
  })
}

/** P24-M03: full 2024 create payload (see backend CharacterCreate2024Request). */
export type CharacterCreate2024Request = {
  name: string
  gender?: string | null
  is_draft?: boolean
  /** Required while RULES_EDITION_2024_OPEN is false (internal preview / tests). */
  is_preview?: boolean
  class_slug: string
  background_slug: string
  species_slug: string
  ability_method: 'standard_array' | 'point_buy' | 'roll' | 'manual'
  base_abilities: Record<string, number>
  background_asi_mode: '+2/+1' | '+1/+1/+1'
  background_asi: Record<string, number>
  language_ids: string[]
  class_skill_ids?: string[]
  weapon_mastery_ids?: string[]
  fighting_style_slug?: string | null
  background_tool_id?: string | null
  background_equipment?: 'pack' | 'gold'
  class_equipment?: string
  species_size?: string | null
  species_lineage_id?: string | null
  species_ancestry_id?: string | null
  origin_feat_list?: string | null
  origin_feat_cantrips?: string[]
  origin_feat_spell_id?: string | null
  origin_feat_skilled?: string[]
  cantrip_ids?: string[]
  prepared_spell_ids?: string[]
  spellbook_spell_ids?: string[]
  class_option_picks?: Record<string, unknown>
  subclass_slug?: string | null
  /** P24-M03c: create-at-N with multiclass / per-level choices. */
  class_levels?: Array<{ slug: string; level: number; subclass_slug?: string | null }> | null
  hp_choices?: Array<{
    class_slug: string
    class_level: number
    mode?: 'average' | 'roll'
    rolled?: number | null
  }>
  asi_choices?: Array<{
    class_slug: string
    class_level: number
    kind: string
    abilities?: Record<string, number>
    feat_slug?: string | null
    note_ru?: string | null
  }>
  level_gains?: Array<Record<string, unknown>>
  spells_by_class?: Record<string, unknown>
}

export type CharacterCreate2024ValidateResponse = {
  ok: boolean
  name: string
  level: number
  class_name: string
  race_name: string
  hp_max: number
  sheet: Record<string, unknown>
  warnings: string[]
}

export type Languages2024Response = {
  common_id: string
  choice_count: number
  languages: Array<{ id: string; name_ru: string; kind: string }>
  class_special: Array<{ id: string; name_ru: string; kind: string }>
}

/** P24-M03: language catalog for the 2024 create wizard. */
export async function listCreate2024Languages(
  signal?: AbortSignal,
): Promise<Languages2024Response> {
  return apiRequest<Languages2024Response>('/characters/create-2024/languages', {
    signal,
  })
}

/** P24-M03: validate a 2024 create payload without persisting. */
export async function validateCreate2024(
  payload: CharacterCreate2024Request,
  signal?: AbortSignal,
): Promise<CharacterCreate2024ValidateResponse> {
  return apiRequest<CharacterCreate2024ValidateResponse>(
    '/characters/create-2024/validate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    },
  )
}

/**
 * P24-M03: create a level-1 2024 character.
 * Does not use createCharacter() / RULES_EDITION_2024_OPEN gate — preview finalize
 * requires `is_preview: true` while the player CTA stays closed.
 */
export async function createCharacter2024(
  payload: CharacterCreate2024Request,
  signal?: AbortSignal,
): Promise<CharacterDetail> {
  return apiRequest<CharacterDetail>('/characters/create-2024', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
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
