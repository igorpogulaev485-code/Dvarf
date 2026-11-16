import { apiRequest } from './client'

export type AdminStatus = {
  panel_enabled: boolean
  is_full_admin: boolean
  admin_password_set: boolean
  display_name: string | null
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

export async function getAdminStatus(): Promise<AdminStatus> {
  return apiRequest<AdminStatus>('/admin/status')
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
