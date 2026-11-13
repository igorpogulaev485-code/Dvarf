/** Parse L-16 start_rules_mismatch 409 from joinLobby. */

import { ApiRequestError } from '../../shared/api/client'

export type StartRulesMismatchData = {
  mismatches: string[]
  lobby_id?: string
  lobby_name?: string
}

export function parseStartRulesMismatch(err: unknown): StartRulesMismatchData | null {
  if (!(err instanceof ApiRequestError)) return null
  if (err.code !== 'start_rules_mismatch') return null
  const data = err.data
  if (!data || !Array.isArray(data.mismatches)) return null
  return {
    mismatches: data.mismatches.map(String),
    lobby_id: data.lobby_id != null ? String(data.lobby_id) : undefined,
    lobby_name: data.lobby_name != null ? String(data.lobby_name) : undefined,
  }
}
