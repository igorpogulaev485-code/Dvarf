import { apiRequest } from './client'

export type AdminAccountStats = {
  id: string
  email: string | null
  display_name: string | null
  email_verified: boolean
  created_at: string
  characters_2014: number
  characters_2024: number
  characters_total: number
  lobbies_owned: number
  lobbies_as_player: number
}

export type AdminAccountListResponse = {
  items: AdminAccountStats[]
  total: number
  limit: number
  offset: number
}

export type AdminChangeEmailResponse = {
  message: string
  stub: boolean
  debug_confirm_url: string | null
}

export async function listAdminAccounts(
  limit = 50,
  offset = 0,
): Promise<AdminAccountListResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  return apiRequest<AdminAccountListResponse>(`/admin/users?${params}`)
}

export async function adminChangeEmail(
  userId: string,
  newEmail: string,
  confirmNewEmail: string,
  adminPassword: string,
): Promise<AdminChangeEmailResponse> {
  return apiRequest<AdminChangeEmailResponse>(`/admin/users/${userId}/email`, {
    method: 'POST',
    body: JSON.stringify({
      new_email: newEmail,
      confirm_new_email: confirmNewEmail,
      admin_password: adminPassword,
    }),
  })
}
