import type { SettingPage, SettingPageLink } from '../../shared/api/lobbies'

export type SettingPageNode = SettingPage & { children: SettingPageNode[] }

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
