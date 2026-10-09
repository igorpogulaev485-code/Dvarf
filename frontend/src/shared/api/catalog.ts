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

type CatalogListParams = {
  kind?: CatalogKind
  edition?: RulesEdition
  q?: string
  parentId?: string
}

const CACHE_TTL_MS = 5 * 60 * 1000

type CacheEntry = {
  at: number
  promise: Promise<CatalogEntry[]>
}

const listCache = new Map<string, CacheEntry>()

function cacheKey(params: CatalogListParams): string {
  return [
    params.kind ?? '',
    params.edition ?? '',
    params.q?.trim() ?? '',
    params.parentId ?? '',
  ].join('|')
}

/** Drop in-flight / remembered catalog lists (e.g. after logout). */
export function clearCatalogCache(): void {
  listCache.clear()
}

/**
 * List catalog rows. Concurrent callers with the same filter share one request;
 * successful results are reused for a few minutes (sheet + create both need race/bg).
 */
export async function listCatalogEntries(
  params: CatalogListParams,
): Promise<CatalogEntry[]> {
  const key = cacheKey(params)
  const now = Date.now()
  const hit = listCache.get(key)
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return hit.promise
  }

  const search = new URLSearchParams()
  if (params.kind) search.set('kind', params.kind)
  if (params.edition) search.set('edition', params.edition)
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.parentId) search.set('parent_id', params.parentId)
  const query = search.toString()

  const promise = apiRequest<CatalogEntry[]>(`/catalog${query ? `?${query}` : ''}`).catch(
    (err: unknown) => {
      const current = listCache.get(key)
      if (current?.promise === promise) listCache.delete(key)
      throw err
    },
  )

  listCache.set(key, { at: now, promise })
  return promise
}
