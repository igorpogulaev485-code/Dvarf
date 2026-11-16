import { apiRequest } from './client'

export type FeedbackTopic = 'bug' | 'question' | 'idea' | 'name'

export type FeedbackStatus = 'new' | 'in_progress' | 'closed' | 'not_bug'

export type FeedbackCreatePayload = {
  topic: FeedbackTopic
  body: string
  is_anonymous?: boolean
  character_id?: string | null
  lobby_id?: string | null
  page_path?: string | null
}

export type FeedbackCreateResult = {
  id: string
  message: string
}

export type AdminFeedbackAuthor = {
  id: string
  email: string | null
  display_name: string | null
}

export type AdminFeedbackItem = {
  id: string
  topic: string
  topic_label: string
  status: string
  status_label: string
  body: string
  is_anonymous: boolean
  author: AdminFeedbackAuthor | null
  character_id: string | null
  character_name: string | null
  lobby_id: string | null
  lobby_name: string | null
  page_path: string | null
  admin_note: string | null
  created_at: string
  updated_at: string
}

export type AdminFeedbackPage = {
  items: AdminFeedbackItem[]
  total: number
  page: number
  page_size: number
  new_count: number
}

/** Форма игрока — работает без флага админки. */
export async function submitFeedback(
  payload: FeedbackCreatePayload,
): Promise<FeedbackCreateResult> {
  return apiRequest<FeedbackCreateResult>('/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listAdminFeedback(params: {
  status?: string
  topic?: string
  page?: number
  page_size?: number
}): Promise<AdminFeedbackPage> {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.topic) search.set('topic', params.topic)
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  const qs = search.toString()
  return apiRequest<AdminFeedbackPage>(`/admin/feedback${qs ? `?${qs}` : ''}`)
}

export async function getAdminFeedback(id: string): Promise<AdminFeedbackItem> {
  return apiRequest<AdminFeedbackItem>(`/admin/feedback/${id}`)
}

export async function patchAdminFeedback(
  id: string,
  payload: { status?: FeedbackStatus; admin_note?: string | null },
): Promise<AdminFeedbackItem> {
  return apiRequest<AdminFeedbackItem>(`/admin/feedback/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
