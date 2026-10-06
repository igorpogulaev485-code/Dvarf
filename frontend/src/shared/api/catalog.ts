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

/** Full catalog row — only via GET /catalog/{id} after the user picks an item. */
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

/** Lightweight search hit — no fat `data` blob. */
export type CatalogEntryListItem = {
  id: string
  kind: CatalogKind
  slug: string
  name_ru: string
  name_en: string | null
  rules_edition: RulesEdition | 'both'
  parent_id: string | null
  sort_order: number
  preview: Record<string, unknown>
}

export async function listCatalogEntries(params: {
  kind?: CatalogKind
  edition?: RulesEdition
  q?: string
  parentId?: string
  limit?: number
  spellLevel?: number
  spellClass?: string
}): Promise<CatalogEntryListItem[]> {
  const search = new URLSearchParams()
  if (params.kind) search.set('kind', params.kind)
  if (params.edition) search.set('edition', params.edition)
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.parentId) search.set('parent_id', params.parentId)
  if (params.limit != null) search.set('limit', String(params.limit))
  if (params.spellLevel != null) search.set('spell_level', String(params.spellLevel))
  if (params.spellClass) search.set('spell_class', params.spellClass)
  const query = search.toString()
  return apiRequest<CatalogEntryListItem[]>(`/catalog${query ? `?${query}` : ''}`)
}

export async function getCatalogEntry(entryId: string): Promise<CatalogEntry> {
  return apiRequest<CatalogEntry>(`/catalog/${entryId}`)
}
