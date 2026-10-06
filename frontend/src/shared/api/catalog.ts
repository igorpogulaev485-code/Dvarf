import { apiRequest } from './client'
import type { RulesEdition } from './characters'

export type CatalogKind =
  | 'race'
  | 'class'
  | 'subclass'
  | 'background'
  | 'alignment'
  | 'skill'
  | 'feat'
  | 'spell'
  | 'weapon'
  | 'armor'
  | 'item'
  | 'condition'

export type CatalogEntry = {
  id: string
  kind: CatalogKind
  slug: string
  name_ru: string
  name_en: string | null
  rules_edition: RulesEdition | 'both'
  parent_id: string | null
  source: string | null
  external_ref: Record<string, unknown> | null
  data: Record<string, unknown>
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function listCatalogEntries(params: {
  kind?: CatalogKind
  edition?: RulesEdition
  q?: string
  parentId?: string
}): Promise<CatalogEntry[]> {
  const search = new URLSearchParams()
  if (params.kind) search.set('kind', params.kind)
  if (params.edition) search.set('edition', params.edition)
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.parentId) search.set('parent_id', params.parentId)
  const query = search.toString()
  return apiRequest<CatalogEntry[]>(`/catalog${query ? `?${query}` : ''}`)
}
