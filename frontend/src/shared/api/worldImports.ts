/** W-API-01…11: клиент импорта мира (отдельно от lobbies.ts). */
import { apiRequest } from './client'

export type WorldImportJobStatus =
  | 'received'
  | 'parsing'
  | 'ready_for_review'
  | 'confirmed'
  | 'cancelled'
  | 'failed'

export type WorldImportDiffStatus =
  | 'new'
  | 'update'
  | 'unchanged'
  | 'conflict'
  | 'missing_in_source'
  | 'ai_suggestion'
  | 'error'

export type WorldImportJob = {
  id: string
  setting_id: string
  lobby_id: string
  author_id: string
  status: WorldImportJobStatus | string
  rules_edition: string
  source_kind: string
  idempotency_key: string | null
  source_ref: string | null
  last_confirmed_at: string | null
  created_at: string
  updated_at: string
}

export type WorldApiToken = {
  id: string
  lobby_id: string
  setting_id: string
  owner_id: string
  token_prefix: string
  can_read: boolean
  can_write: boolean
  revoked_at: string | null
  last_used_at: string | null
  created_at: string
}

export type WorldApiTokenCreated = WorldApiToken & { secret: string }

export type WorldImportSettings = {
  setting_id: string
  lobby_id: string
  ai_can_confirm: boolean
}

export type WorldImportDiffEntry = {
  draft_item_id: string | null
  source_key: string
  item_type: string
  status: WorldImportDiffStatus
  title: string
  page_id: string | null
  message: string
  hint: string
}

export type WorldImportDiff = {
  job_id: string
  setting_id: string
  entries: WorldImportDiffEntry[]
  counts: Record<string, number>
}

export type WorldImportDraftItem = {
  id: string
  job_id: string
  item_type: string
  source_key: string
  status: string
  proposal: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type WorldImportDraftLink = {
  id: string
  job_id: string
  from_source_key: string
  to_source_key: string | null
  to_alias: string | null
  kind: string
  label: string
  confidence: string
  status: string
  office_title: string | null
  office_holder_status: string | null
  succession_order: number | null
  tenure_from: string | null
  tenure_to: string | null
  hint: string | null
  created_at: string
}

export type WorldVaultParseResult = {
  job: WorldImportJob
  items: WorldImportDraftItem[]
  skipped: Array<Record<string, string>>
  created_count: number
  updated_count: number
  links: WorldImportDraftLink[]
  links_count: number
  extract_mode: string
  extract_message: string
  extract_warnings: string[]
}

export type WorldImportValidateOut = {
  rules_edition: string
  type_counts: Record<string, number>
  file_count: number
  text_bytes: number
  skipped: Array<Record<string, string>>
  warnings: string[]
  errors: Array<{ code: string; path: string; message: string; hint: string }>
  media_quota_bytes: number
  media_used_bytes: number
  media_free_bytes: number
  limits: Record<string, number>
  ok: boolean
  extract_mode: string
  extract_message: string
}

export type WorldImportConfirmOut = {
  job: WorldImportJob
  confirmation_id: string
  actor_kind: 'user' | 'ai_token' | string
  confirmed_item_ids: string[]
  created_page_ids: string[]
  updated_page_ids: string[]
  created_character_ids: string[]
  updated_character_ids: string[]
  created_attachment_ids: string[]
  journal_entry_ids: string[]
  links_created: number
}

export type WorldImportConfirmation = {
  id: string
  job_id: string
  setting_id: string
  lobby_id: string
  actor_kind: string
  actor_user_id: string | null
  actor_token_id: string | null
  item_ids: unknown[]
  confirmed_at: string
  undone_at: string | null
}

export type ConflictResolution = 'keep_ours' | 'take_source'

export function mcpWorldImportUrl(): string {
  if (typeof window === 'undefined') return '/mcp/world-import'
  return `${window.location.origin}/mcp/world-import`
}

export async function createWorldApiToken(
  lobbyId: string,
  settingId: string,
): Promise<WorldApiTokenCreated> {
  return apiRequest<WorldApiTokenCreated>(
    `/lobbies/${lobbyId}/settings/${settingId}/world-api-tokens`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function listWorldApiTokens(
  lobbyId: string,
  settingId: string,
): Promise<WorldApiToken[]> {
  return apiRequest<WorldApiToken[]>(
    `/lobbies/${lobbyId}/settings/${settingId}/world-api-tokens`,
  )
}

export async function revokeWorldApiToken(
  lobbyId: string,
  settingId: string,
  tokenId: string,
): Promise<WorldApiToken> {
  return apiRequest<WorldApiToken>(
    `/lobbies/${lobbyId}/settings/${settingId}/world-api-tokens/${tokenId}`,
    { method: 'DELETE' },
  )
}

export async function getWorldImportSettings(
  settingId: string,
): Promise<WorldImportSettings> {
  return apiRequest<WorldImportSettings>(`/settings/${settingId}/world-import-settings`)
}

export async function patchWorldImportSettings(
  settingId: string,
  aiCanConfirm: boolean,
): Promise<WorldImportSettings> {
  return apiRequest<WorldImportSettings>(`/settings/${settingId}/world-import-settings`, {
    method: 'PATCH',
    body: JSON.stringify({ ai_can_confirm: aiCanConfirm }),
  })
}

export async function listWorldImports(settingId: string): Promise<WorldImportJob[]> {
  return apiRequest<WorldImportJob[]>(`/settings/${settingId}/world-imports`)
}

export async function getWorldImport(
  settingId: string,
  jobId: string,
): Promise<WorldImportJob> {
  return apiRequest<WorldImportJob>(`/settings/${settingId}/world-imports/${jobId}`)
}

export async function getWorldImportDiff(
  settingId: string,
  jobId: string,
): Promise<WorldImportDiff> {
  return apiRequest<WorldImportDiff>(`/settings/${settingId}/world-imports/${jobId}/diff`)
}

export async function listWorldImportDraftItems(
  settingId: string,
  jobId: string,
): Promise<WorldImportDraftItem[]> {
  return apiRequest<WorldImportDraftItem[]>(
    `/settings/${settingId}/world-imports/${jobId}/draft-items`,
  )
}

export async function listWorldImportDraftLinks(
  settingId: string,
  jobId: string,
): Promise<WorldImportDraftLink[]> {
  return apiRequest<WorldImportDraftLink[]>(
    `/settings/${settingId}/world-imports/${jobId}/draft-links`,
  )
}

export async function listWorldImportConfirmations(
  settingId: string,
  jobId: string,
): Promise<WorldImportConfirmation[]> {
  return apiRequest<WorldImportConfirmation[]>(
    `/settings/${settingId}/world-imports/${jobId}/confirmations`,
  )
}

export async function upsertWorldImportFiles(
  settingId: string,
  files: Array<{ path: string; content: string; content_base64?: string }>,
  opts?: { rules_edition?: string; source_kind?: string; idempotencyKey?: string },
): Promise<WorldVaultParseResult> {
  const headers: Record<string, string> = {}
  if (opts?.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey
  return apiRequest<WorldVaultParseResult>(`/settings/${settingId}/world-imports`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      rules_edition: opts?.rules_edition ?? '2014',
      source_kind: opts?.source_kind ?? 'api',
      files,
    }),
  })
}

export async function importWorldFromGit(
  settingId: string,
  url: string,
  opts?: { rules_edition?: string; idempotencyKey?: string },
): Promise<WorldVaultParseResult> {
  const headers: Record<string, string> = {}
  if (opts?.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey
  return apiRequest<WorldVaultParseResult>(`/settings/${settingId}/world-imports/from-git`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, rules_edition: opts?.rules_edition ?? '2014' }),
  })
}

export async function createWorldImportJob(
  settingId: string,
  opts?: { rules_edition?: string; source_kind?: string; idempotencyKey?: string },
): Promise<WorldImportJob> {
  const headers: Record<string, string> = {}
  if (opts?.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey
  return apiRequest<WorldImportJob>(`/settings/${settingId}/world-imports/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      rules_edition: opts?.rules_edition ?? '2014',
      source_kind: opts?.source_kind ?? 'zip',
    }),
  })
}

export async function uploadWorldImportZip(
  settingId: string,
  jobId: string,
  file: File,
  rulesEdition = '2014',
): Promise<WorldVaultParseResult> {
  const body = new FormData()
  body.append('file', file)
  body.append('rules_edition', rulesEdition)
  return apiRequest<WorldVaultParseResult>(
    `/settings/${settingId}/world-imports/${jobId}/vault-zip`,
    { method: 'POST', body },
  )
}

export async function confirmWorldImport(
  settingId: string,
  jobId: string,
  opts?: {
    item_ids?: string[]
    conflict_resolutions?: Array<{ draft_item_id: string; resolution: ConflictResolution }>
  },
): Promise<WorldImportConfirmOut> {
  return apiRequest<WorldImportConfirmOut>(
    `/settings/${settingId}/world-imports/${jobId}/confirm`,
    {
      method: 'POST',
      body: JSON.stringify({
        item_ids: opts?.item_ids ?? null,
        conflict_resolutions: opts?.conflict_resolutions ?? null,
      }),
    },
  )
}

export async function cancelWorldImport(
  settingId: string,
  jobId: string,
): Promise<{ job: WorldImportJob }> {
  return apiRequest<{ job: WorldImportJob }>(
    `/settings/${settingId}/world-imports/${jobId}/cancel`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function undoWorldImport(
  settingId: string,
  jobId: string,
): Promise<{ job: WorldImportJob; message: string }> {
  return apiRequest<{ job: WorldImportJob; message: string }>(
    `/settings/${settingId}/world-imports/${jobId}/undo`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function rejectWorldImportDraftItem(
  settingId: string,
  jobId: string,
  itemId: string,
): Promise<WorldImportDraftItem> {
  return apiRequest<WorldImportDraftItem>(
    `/settings/${settingId}/world-imports/${jobId}/draft-items/${itemId}/reject`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export function worldImportAttachmentUrl(lobbyId: string, attachmentId: string): string {
  return `/lobbies/${lobbyId}/world-import-attachments/${attachmentId}/file`
}
