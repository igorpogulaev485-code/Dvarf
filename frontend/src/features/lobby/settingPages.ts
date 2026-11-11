import type {
  SettingPage,
  SettingPageKind,
  SettingPageLink,
  SettingPageTemplate,
} from '../../shared/api/lobbies'

export type SettingPageNode = SettingPage & { children: SettingPageNode[] }

/** Фильтр дерева: поиск по title/body/tags + тип + тег. */
export function filterSettingPages(
  pages: SettingPage[],
  opts: { query?: string; kind?: SettingPageKind | 'all'; tag?: string },
): SettingPage[] {
  const q = (opts.query ?? '').trim().toLowerCase()
  const kind = opts.kind ?? 'all'
  const tag = (opts.tag ?? '').trim().toLowerCase()
  return pages.filter((p) => {
    if (kind !== 'all' && p.page_kind !== kind) return false
    if (tag) {
      const pageTags = (p.tags ?? []).map((t) => t.toLowerCase())
      if (!pageTags.includes(tag)) return false
    }
    if (!q) return true
    const tagHay = (p.tags ?? []).join(' ')
    const hay = `${p.title} ${p.body} ${tagHay}`.toLowerCase()
    return hay.includes(q)
  })
}

/** Уникальные теги из списка страниц (casefold-деdup). */
export function collectPageTags(pages: SettingPage[]): string[] {
  const seen = new Map<string, string>()
  for (const page of pages) {
    for (const tag of page.tags ?? []) {
      const key = tag.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.set(key, tag.trim())
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'ru'))
}

export function normalizeClientTags(raw: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const tag = item.trim().replace(/\s+/g, ' ').slice(0, 48)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length >= 20) break
  }
  return out
}

export function templateForPage(
  templates: SettingPageTemplate[],
  page: SettingPage | null,
): SettingPageTemplate | null {
  if (!page) return null
  if (page.template_id) {
    const byId = templates.find((t) => t.id === page.template_id)
    if (byId) return byId
  }
  return templates.find((t) => t.page_kind === page.page_kind && t.is_system) ?? null
}

/** Плоский список → дерево по parent_id / sort_order.
 * Если родителя нет в списке (C3: скрыт у игрока) — страница становится корнем.
 */
export function buildSettingPageTree(pages: SettingPage[]): SettingPageNode[] {
  const ids = new Set(pages.map((p) => p.id))
  const byParent = new Map<string | null, SettingPage[]>()
  for (const page of pages) {
    const key =
      page.parent_id != null && ids.has(page.parent_id) ? page.parent_id : null
    const list = byParent.get(key) ?? []
    list.push(page)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'ru'))
  }

  function walk(parentId: string | null): SettingPageNode[] {
    return (byParent.get(parentId) ?? []).map((page) => ({
      ...page,
      children: walk(page.id),
    }))
  }
  return walk(null)
}

/** Потомки страницы (не включая саму). */
export function collectDescendantIds(
  pages: SettingPage[],
  rootId: string,
): string[] {
  const byParent = new Map<string | null, SettingPage[]>()
  for (const page of pages) {
    const list = byParent.get(page.parent_id) ?? []
    list.push(page)
    byParent.set(page.parent_id, list)
  }
  const out: string[] = []
  function walk(id: string) {
    for (const child of byParent.get(id) ?? []) {
      out.push(child.id)
      walk(child.id)
    }
  }
  walk(rootId)
  return out
}

export function flattenSettingPageTree(nodes: SettingPageNode[]): SettingPage[] {
  const out: SettingPage[] = []
  function walk(list: SettingPageNode[]) {
    for (const node of list) {
      const { children, ...page } = node
      out.push(page)
      walk(children)
    }
  }
  walk(nodes)
  return out
}

/** Исходящие и входящие рёбра для выбранной страницы. */
export function linksForPage(
  links: SettingPageLink[],
  pageId: string,
): { outgoing: SettingPageLink[]; incoming: SettingPageLink[] } {
  const outgoing: SettingPageLink[] = []
  const incoming: SettingPageLink[] = []
  for (const link of links) {
    if (link.from_page_id === pageId) outgoing.push(link)
    if (link.to_page_id === pageId) incoming.push(link)
  }
  return { outgoing, incoming }
}
