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
