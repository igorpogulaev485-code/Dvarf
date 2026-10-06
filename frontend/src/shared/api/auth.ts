import { apiRequest, clearTokens, setTokens } from './client'

export type User = {
  id: string
  email: string | null
  login: string | null
  display_name: string | null
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  email_verified_at: string | null
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

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      display_name: displayName,
    }),
  })
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const result = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setTokens(result.access_token, result.refresh_token)
  return result
}

export type RegisterResponse = {
  message: string
  stub: boolean
  debug_verify_url: string | null
}

export type VerifyEmailResponse = TokenResponse

export async function verifyEmail(token: string): Promise<VerifyEmailResponse> {
  const result = await apiRequest<VerifyEmailResponse>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
  setTokens(result.access_token, result.refresh_token)
  return result
}

export type ResendVerificationResponse = {
  message: string
  stub: boolean
  debug_verify_url: string | null
}

export async function resendVerification(email: string): Promise<ResendVerificationResponse> {
  return apiRequest<ResendVerificationResponse>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
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

export type ChangePasswordResponse = {
  message: string
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResponse> {
  return apiRequest<ChangePasswordResponse>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
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

export type EmailChangeRequestResponse = {
  message: string
  stub: boolean
  debug_confirm_url: string | null
}

export type EmailChangeConfirmResponse = {
  message: string
  user: User
}

export async function requestEmailChange(newEmail: string): Promise<EmailChangeRequestResponse> {
  return apiRequest<EmailChangeRequestResponse>('/auth/me/email/request', {
    method: 'POST',
    body: JSON.stringify({ new_email: newEmail }),
  })
}

export async function confirmEmailChange(token: string): Promise<EmailChangeConfirmResponse> {
  return apiRequest<EmailChangeConfirmResponse>('/auth/me/email/confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export type DeleteAccountResponse = {
  message: string
}

export async function deleteAccount(
  confirmEmail: string,
  password: string | null,
): Promise<DeleteAccountResponse> {
  return apiRequest<DeleteAccountResponse>('/auth/me', {
    method: 'DELETE',
    body: JSON.stringify({
      confirm_email: confirmEmail,
      password,
    }),
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
