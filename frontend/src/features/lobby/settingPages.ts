import type { SettingPage } from '../../shared/api/lobbies'

export type SettingPageNode = SettingPage & { children: SettingPageNode[] }

/** Плоский список → дерево по parent_id / sort_order. */
export function buildSettingPageTree(pages: SettingPage[]): SettingPageNode[] {
  const byParent = new Map<string | null, SettingPage[]>()
  for (const page of pages) {
    const key = page.parent_id
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
