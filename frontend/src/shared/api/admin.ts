import { apiRequest } from './client'

export type AdminSectionId = 'accounts' | 'help' | 'metrics' | 'feedback' | 'catalog'

export type AdminStatus = {
  panel_enabled: boolean
  is_full_admin: boolean
  is_catalog_moderator?: boolean
  admin_password_set: boolean
  display_name: string | null
  sections?: AdminSectionId[]
}

export type AdminCatalogRevisionItem = {
  id: string
  status: string
  status_label: string
  name_ru: string
  name_en: string | null
  previous_name_ru: string | null
  previous_name_en: string | null
  author_id: string | null
  author_name: string | null
  reviewer_id: string | null
  reviewer_name: string | null
  created_at: string
  reviewed_at: string | null
  can_rollback: boolean
}

export type AdminCatalogListItem = {
  id: string
  kind: string
  kind_label: string
  slug: string
  name_ru_live: string
  name_en_live: string | null
  name_ru_seed: string
  name_en_seed: string | null
  names_differ: boolean
  rules_edition: string
  source: string | null
  content_layer: string
  content_layer_label: string
  has_pending: boolean
  pending_name_ru: string | null
  is_active: boolean
  updated_at: string
}

export type AdminCatalogPage = {
  items: AdminCatalogListItem[]
  total: number
  page: number
  page_size: number
}

export type AdminCatalogDetail = {
  id: string
  kind: string
  kind_label: string
  slug: string
  name_ru_live: string
  name_en_live: string | null
  name_ru_seed: string
  name_en_seed: string | null
  names_differ: boolean
  pending: AdminCatalogRevisionItem | null
  rules_edition: string
  source: string | null
  content_layer: string
  content_layer_label: string
  parent_id: string | null
  parent_name_ru: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  revisions: AdminCatalogRevisionItem[]
  can_edit_draft: boolean
  can_accept: boolean
  can_reject: boolean
  can_withdraw: boolean
}

export type AdminCatalogNameFeedbackItem = {
  id: string
  body: string
  author_name: string | null
  is_anonymous: boolean
  status: string
  status_label: string
  created_at: string
}

export type AdminCatalogNameFeedbackPage = {
  items: AdminCatalogNameFeedbackItem[]
  total: number
}

export type AdminAccountLoginMethods = {
  has_password: boolean
  yandex: boolean
  vk: boolean
}

export type AdminAccountCharacterStats = {
  total: number
  edition_2014: number
  edition_2024: number
  drafts: number
}

export type AdminAccountLobbyStats = {
  owned: number
  as_player: number
}

export type AdminAccountItem = {
  id: string
  email: string | null
  email_verified: boolean
  display_name: string | null
  created_at: string
  last_seen_at: string | null
  is_blocked: boolean
  login_methods: AdminAccountLoginMethods
  characters: AdminAccountCharacterStats
  lobbies: AdminAccountLobbyStats
}

export type AdminAccountsPage = {
  items: AdminAccountItem[]
  total: number
  page: number
  page_size: number
}

export type AdminSessionItem = {
  id: string
  created_at: string
  last_seen_at: string
  user_agent: string | null
  ip_address: string | null
}

export type AdminMessageResult = {
  message: string
  stub?: boolean
  debug_url?: string | null
  debug_confirm_url?: string | null
}

/** ADM-03: сводка метрик — только числа, без почт и имён. */
export type AdminMetricsDayPoint = {
  date: string
  signups: number
  logins_unique: number
  characters_created: number
  lobbies_created: number
  play_started: number
}

export type AdminMetrics = {
  period_days: number
  timezone: string
  note: string
  accounts: {
    total: number
    email_verified: number
    new_in_period: number
    new_1d: number
    new_7d: number
    new_30d: number
    blocked: number
  }
  active: {
    active_1d: number
    active_7d: number
    active_30d: number
  }
  characters: {
    total_alive: number
    edition_2014: number
    edition_2024: number
    drafts: number
  }
  lobbies: {
    total: number
    new_in_period: number
  }
  sessions: {
    started_in_period: number
    closed_in_period: number
  }
  /** ADM-04: число сообщений со статусом «Новое». */
  feedback_new?: number
  daily: AdminMetricsDayPoint[]
}

export async function getAdminStatus(): Promise<AdminStatus> {
  return apiRequest<AdminStatus>('/admin/status')
}

export async function getAdminMetrics(period: 1 | 7 | 30 = 7): Promise<AdminMetrics> {
  return apiRequest<AdminMetrics>(`/admin/metrics?period=${period}`)
}

export async function listAdminAccounts(params: {
  q?: string
  page?: number
  page_size?: number
}): Promise<AdminAccountsPage> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  const qs = search.toString()
  return apiRequest<AdminAccountsPage>(`/admin/accounts${qs ? `?${qs}` : ''}`)
}

export async function getAdminAccount(userId: string): Promise<AdminAccountItem> {
  return apiRequest<AdminAccountItem>(`/admin/accounts/${userId}`)
}

export async function listAdminAccountSessions(
  userId: string,
): Promise<{ items: AdminSessionItem[] }> {
  return apiRequest(`/admin/accounts/${userId}/sessions`)
}

export async function setupAdminPassword(
  password: string,
  passwordConfirm: string,
): Promise<{ message: string; admin_password_set: boolean }> {
  return apiRequest('/admin/password/setup', {
    method: 'POST',
    body: JSON.stringify({
      password,
      password_confirm: passwordConfirm,
    }),
  })
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
  newPasswordConfirm: string,
): Promise<{ message: string; admin_password_set: boolean }> {
  return apiRequest('/admin/password/change', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    }),
  })
}

export async function adminChangeEmail(
  userId: string,
  newEmail: string,
  newEmailConfirm: string,
  adminPassword: string,
): Promise<AdminMessageResult> {
  return apiRequest(`/admin/accounts/${userId}/email/change`, {
    method: 'POST',
    body: JSON.stringify({
      new_email: newEmail,
      new_email_confirm: newEmailConfirm,
      admin_password: adminPassword,
    }),
  })
}

export async function adminResendVerification(
  userId: string,
  adminPassword: string,
): Promise<AdminMessageResult> {
  return apiRequest(`/admin/accounts/${userId}/email/resend-verification`, {
    method: 'POST',
    body: JSON.stringify({ admin_password: adminPassword }),
  })
}

export async function adminMarkEmailVerified(
  userId: string,
  adminPassword: string,
): Promise<AdminMessageResult> {
  return apiRequest(`/admin/accounts/${userId}/email/mark-verified`, {
    method: 'POST',
    body: JSON.stringify({ admin_password: adminPassword }),
  })
}

export async function adminSendPasswordReset(
  userId: string,
  adminPassword: string,
): Promise<AdminMessageResult> {
  return apiRequest(`/admin/accounts/${userId}/password/reset`, {
    method: 'POST',
    body: JSON.stringify({ admin_password: adminPassword }),
  })
}

export async function adminRevokeSession(
  userId: string,
  sessionId: string,
  adminPassword: string,
): Promise<AdminMessageResult> {
  return apiRequest(`/admin/accounts/${userId}/sessions/${sessionId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ admin_password: adminPassword }),
  })
}

export async function adminRevokeAllSessions(
  userId: string,
  adminPassword: string,
): Promise<AdminMessageResult> {
  return apiRequest(`/admin/accounts/${userId}/sessions/revoke-all`, {
    method: 'POST',
    body: JSON.stringify({ admin_password: adminPassword }),
  })
}

export async function adminUnlinkOAuth(
  userId: string,
  provider: 'yandex' | 'vk',
  adminPassword: string,
): Promise<AdminMessageResult> {
  return apiRequest(`/admin/accounts/${userId}/oauth/unlink`, {
    method: 'POST',
    body: JSON.stringify({ provider, admin_password: adminPassword }),
  })
}

export async function adminBlockUser(
  userId: string,
  adminPassword: string,
): Promise<AdminMessageResult> {
  return apiRequest(`/admin/accounts/${userId}/block`, {
    method: 'POST',
    body: JSON.stringify({ admin_password: adminPassword }),
  })
}

export async function adminUnblockUser(
  userId: string,
  adminPassword: string,
): Promise<AdminMessageResult> {
  return apiRequest(`/admin/accounts/${userId}/unblock`, {
    method: 'POST',
    body: JSON.stringify({ admin_password: adminPassword }),
  })
}

export async function adminDeleteUser(
  userId: string,
  confirm: string,
  adminPassword: string,
): Promise<AdminMessageResult> {
  return apiRequest(`/admin/accounts/${userId}/delete`, {
    method: 'POST',
    body: JSON.stringify({ confirm, admin_password: adminPassword }),
  })
}

export async function listAdminCatalog(params: {
  q?: string
  kind?: string
  edition?: string
  source?: string
  layer?: string
  has_pending?: boolean
  include_inactive?: boolean
  page?: number
  page_size?: number
}): Promise<AdminCatalogPage> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.kind) search.set('kind', params.kind)
  if (params.edition) search.set('edition', params.edition)
  if (params.source) search.set('source', params.source)
  if (params.layer) search.set('layer', params.layer)
  if (params.has_pending === true) search.set('has_pending', 'true')
  if (params.has_pending === false) search.set('has_pending', 'false')
  if (params.include_inactive === false) search.set('include_inactive', 'false')
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  const qs = search.toString()
  return apiRequest<AdminCatalogPage>(`/admin/catalog${qs ? `?${qs}` : ''}`)
}

export async function getAdminCatalogEntry(entryId: string): Promise<AdminCatalogDetail> {
  return apiRequest<AdminCatalogDetail>(`/admin/catalog/${entryId}`)
}

export async function upsertAdminCatalogDraft(
  entryId: string,
  nameRu: string,
  nameEn?: string | null,
): Promise<AdminCatalogDetail> {
  return apiRequest<AdminCatalogDetail>(`/admin/catalog/${entryId}/draft`, {
    method: 'PUT',
    body: JSON.stringify({
      name_ru: nameRu,
      name_en: nameEn ?? null,
    }),
  })
}

export async function withdrawAdminCatalogDraft(entryId: string): Promise<AdminCatalogDetail> {
  return apiRequest<AdminCatalogDetail>(`/admin/catalog/${entryId}/draft`, {
    method: 'DELETE',
  })
}

export async function acceptAdminCatalogDraft(entryId: string): Promise<AdminCatalogDetail> {
  return apiRequest<AdminCatalogDetail>(`/admin/catalog/${entryId}/accept`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function rejectAdminCatalogDraft(entryId: string): Promise<AdminCatalogDetail> {
  return apiRequest<AdminCatalogDetail>(`/admin/catalog/${entryId}/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function rollbackAdminCatalogRevision(
  entryId: string,
  revisionId: string,
): Promise<AdminCatalogDetail> {
  return apiRequest<AdminCatalogDetail>(
    `/admin/catalog/${entryId}/revisions/${revisionId}/rollback`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  )
}

export async function listAdminCatalogNameFeedback(params?: {
  page?: number
  page_size?: number
}): Promise<AdminCatalogNameFeedbackPage> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.page_size) search.set('page_size', String(params.page_size))
  const qs = search.toString()
  return apiRequest<AdminCatalogNameFeedbackPage>(
    `/admin/catalog/name-feedback${qs ? `?${qs}` : ''}`,
  )
}
