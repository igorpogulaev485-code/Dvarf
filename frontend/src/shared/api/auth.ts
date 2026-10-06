import { apiRequest, clearTokens, setTokens } from './client'

export type User = {
  id: string
  email: string | null
  login: string | null
  display_name: string | null
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  providers: string[]
}

export type UserUpdatePayload = {
  display_name: string | null
  full_name: string | null
  phone: string | null
}

export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export type OAuthStartResponse = {
  provider: string
  configured: boolean
  authorize_url: string | null
  message: string | null
}

export async function register(email: string, password: string): Promise<TokenResponse> {
  const result = await apiRequest<TokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setTokens(result.access_token, result.refresh_token)
  return result
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const result = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setTokens(result.access_token, result.refresh_token)
  return result
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST' })
  clearTokens()
}

export async function getMe(): Promise<User> {
  return apiRequest<User>('/auth/me')
}

export async function updateMe(payload: UserUpdatePayload): Promise<User> {
  return apiRequest<User>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function uploadAvatar(file: File): Promise<User> {
  const body = new FormData()
  body.append('file', file)
  return apiRequest<User>('/auth/me/avatar', {
    method: 'POST',
    body,
  })
}

export async function deleteAvatar(): Promise<User> {
  return apiRequest<User>('/auth/me/avatar', {
    method: 'DELETE',
  })
}

export async function startOAuth(provider: 'yandex' | 'vk'): Promise<OAuthStartResponse> {
  return apiRequest<OAuthStartResponse>(`/auth/oauth/${provider}/start`)
}

export type ForgotPasswordResponse = {
  message: string
  stub: boolean
  debug_reset_url: string | null
}

export type ResetPasswordResponse = {
  message: string
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}
