/**
 * Превью C1–C3: вики сеттинга (дерево + связи + раскрытие).
 * /dev/setting-wiki-preview
 */
import { useMemo, useState } from 'react'
import {
  buildSettingPageTree,
  collectDescendantIds,
  linksForPage,
  type SettingPageNode,
} from '../features/lobby/settingPages'
import type { SettingPage, SettingPageLink } from '../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

const SEED_PAGES: SettingPage[] = [
  {
    id: 'p-root',
    setting_id: 's1',
    parent_id: null,
    title: 'Мир',
    body: 'Континент Эхо. Тон — сумерки и дорожная пыль.',
    sort_order: 0,
    revealed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p-cities',
    setting_id: 's1',
    parent_id: 'p-root',
    title: 'Города',
    body: 'Рассветный порт, Мостовой холм.',
    sort_order: 0,
    revealed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p-port',
    setting_id: 's1',
    parent_id: 'p-cities',
    title: 'Рассветный порт',
    body: 'Гавань на севере. Гильдия лодочников.',
    sort_order: 0,
    revealed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p-factions',
    setting_id: 's1',
    parent_id: null,
    title: 'Фракции',
    body: 'Вестники праха · Культ моста.',
    sort_order: 1,
    revealed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const SEED_LINKS: SettingPageLink[] = [
  {
    id: 'l1',
    from_page_id: 'p-root',
    to_page_id: 'p-factions',
    from_title: 'Мир',
    to_title: 'Фракции',
    label: '',
    created_at: new Date().toISOString(),
  },
  {
    id: 'l2',
    from_page_id: 'p-factions',
    to_page_id: 'p-port',
    from_title: 'Фракции',
    to_title: 'Рассветный порт',
    label: 'база гильдии',
    created_at: new Date().toISOString(),
  },
  {
    id: 'l3',
    from_page_id: 'p-root',
    to_page_id: 'p-cities',
    from_title: 'Мир',
    to_title: 'Города',
    label: '',
    created_at: new Date().toISOString(),
  },
]

export function SettingWikiPreviewPage() {
  const [pages, setPages] = useState(SEED_PAGES)
  const [links, setLinks] = useState(SEED_LINKS)
  const [asOwner, setAsOwner] = useState(true)
  const [selectedId, setSelectedId] = useState('p-root')
  const [linkTargetId, setLinkTargetId] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const visiblePages = useMemo(
    () => (asOwner ? pages : pages.filter((p) => p.revealed)),
    [asOwner, pages],
  )
  const visibleIds = useMemo(() => new Set(visiblePages.map((p) => p.id)), [visiblePages])
  const visibleLinks = useMemo(
    () =>
      asOwner
        ? links
        : links.filter(
            (l) => visibleIds.has(l.from_page_id) && visibleIds.has(l.to_page_id),
          ),
    [asOwner, links, visibleIds],
  )

  const tree = useMemo(() => buildSettingPageTree(visiblePages), [visiblePages])
  const selected = visiblePages.find((p) => p.id === selectedId) ?? null
  const pageLinks = useMemo(
    () => linksForPage(visibleLinks, selectedId),
    [visibleLinks, selectedId],
  )
  const linkCandidates = useMemo(() => {
    if (!asOwner) return []
    const linked = new Set(
      links.filter((l) => l.from_page_id === selectedId).map((l) => l.to_page_id),
    )
    return pages.filter((p) => p.id !== selectedId && !linked.has(p.id))
  }, [asOwner, pages, links, selectedId])

  function addChild(parentId: string | null) {
    const id = `p-${Date.now()}`
    setPages((prev) => [
      ...prev,
      {
        id,
        setting_id: 's1',
        parent_id: parentId,
        title: parentId ? 'Новый раздел' : 'Новая страница',
        body: '',
        sort_order: prev.filter((p) => p.parent_id === parentId).length,
        revealed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    setSelectedId(id)
    setToast('Страница добавлена')
  }

  function addLink() {
    if (!linkTargetId || !selected) return
    const target = pages.find((p) => p.id === linkTargetId)
    if (!target) return
    setLinks((prev) => [
      ...prev,
      {
        id: `l-${Date.now()}`,
        from_page_id: selected.id,
        to_page_id: target.id,
        from_title: selected.title,
        to_title: target.title,
        label: '',
        created_at: new Date().toISOString(),
      },
    ])
    setLinkTargetId('')
    setToast('Связь добавлена')
  }

  function setRevealed(revealed: boolean, subtree: boolean) {
    if (!selected) return
    const ids = new Set(
      subtree ? [selected.id, ...collectDescendantIds(pages, selected.id)] : [selected.id],
    )
    setPages((prev) =>
      prev.map((p) => (ids.has(p.id) ? { ...p, revealed } : p)),
    )
    setToast(
      subtree
        ? revealed
          ? 'Ветка раскрыта игрокам'
          : 'Ветка скрыта'
        : revealed
          ? 'Страница раскрыта игрокам'
          : 'Страница скрыта',
    )
  }

  function switchRole(owner: boolean) {
    setAsOwner(owner)
    const nextPages = owner ? pages : pages.filter((p) => p.revealed)
    setSelectedId(nextPages[0]?.id ?? '')
    setToast(owner ? 'Режим мастера' : 'Режим игрока')
  }

  return (
    <main className="page page--app">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Эхо Рассвета</Text>
            <Text tone="muted">Превью C1–C3 · вики + связи + раскрытие</Text>
          </div>
        </header>
        <Text tone="muted">/dev/setting-wiki-preview</Text>

        <Panel title="Сеттинг">
          <Stack gap={8}>
            <Text>Название: Эхо Рассвета</Text>
            <div className="inline-actions">
              <Button
                type="button"
                variant={asOwner ? 'primary' : 'secondary'}
                onClick={() => switchRole(true)}
              >
                Как мастер
              </Button>
              <Button
                type="button"
                variant={!asOwner ? 'primary' : 'secondary'}
                onClick={() => switchRole(false)}
              >
                Как игрок
              </Button>
            </div>
          </Stack>
        </Panel>

        <div className="setting-wiki">
          <aside className="setting-wiki__nav">
            <div className="setting-wiki__nav-head">
              <Text as="h3">Страницы</Text>
              {asOwner ? (
                <Button type="button" variant="ghost" onClick={() => addChild(null)}>
                  + Корень
                </Button>
              ) : null}
            </div>
            {tree.length === 0 ? (
              <Text tone="muted">Пока ничего не раскрыто.</Text>
            ) : (
              <ul className="setting-wiki-tree">
                {tree.map((node) => (
                  <PreviewNode
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    isOwner={asOwner}
                    onSelect={setSelectedId}
                    onAddChild={addChild}
                  />
                ))}
              </ul>
            )}
          </aside>
          <section className="setting-wiki__editor">
            {selected ? (
              <Stack gap={12}>
                <Field label="Заголовок">
                  <Input
                    value={selected.title}
                    disabled={!asOwner}
                    onChange={(e) =>
                      setPages((prev) =>
                        prev.map((p) =>
                          p.id === selected.id ? { ...p, title: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Текст">
                  <textarea
                    className="ui-input ui-textarea"
                    rows={8}
                    value={selected.body}
                    disabled={!asOwner}
                    onChange={(e) =>
                      setPages((prev) =>
                        prev.map((p) =>
                          p.id === selected.id ? { ...p, body: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </Field>
                {asOwner ? (
                  <>
                    <div className="setting-wiki-reveal">
                      <label className="setting-wiki-reveal__toggle">
                        <input
                          type="checkbox"
                          checked={selected.revealed}
                          onChange={(e) => setRevealed(e.target.checked, false)}
                        />
                        <span>Раскрыто игрокам</span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setRevealed(!selected.revealed, true)}
                      >
                        {selected.revealed ? 'Скрыть ветку' : 'Раскрыть ветку'}
                      </Button>
                    </div>
                    <Button type="button" onClick={() => setToast('Страница сохранена')}>
                      Сохранить страницу
                    </Button>
                  </>
                ) : null}

                <div className="setting-wiki-links">
                  <Text as="h3">Связи →</Text>
                  {pageLinks.outgoing.length === 0 ? (
                    <Text tone="muted">Пока нет переходов с этой страницы.</Text>
                  ) : (
                    <ul className="setting-wiki-links__list">
                      {pageLinks.outgoing.map((link) => (
                        <li key={link.id} className="setting-wiki-links__row">
                          <button
                            type="button"
                            className="setting-wiki-links__jump"
                            onClick={() => setSelectedId(link.to_page_id)}
                          >
                            {link.label || link.to_title}
                          </button>
                          {asOwner ? (
                            <button
                              type="button"
                              className="setting-wiki-links__remove"
                              onClick={() =>
                                setLinks((prev) => prev.filter((l) => l.id !== link.id))
                              }
                            >
                              ×
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {asOwner ? (
                    <div className="setting-wiki-links__add">
                      <select
                        className="ui-input"
                        value={linkTargetId}
                        disabled={linkCandidates.length === 0}
                        onChange={(e) => setLinkTargetId(e.target.value)}
                      >
                        <option value="">
                          {linkCandidates.length === 0
                            ? 'Некуда связать'
                            : 'Страница для связи…'}
                        </option>
                        {linkCandidates.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!linkTargetId}
                        onClick={addLink}
                      >
                        Связать
                      </Button>
                    </div>
                  ) : null}

                  <Text as="h3">Ссылаются сюда</Text>
                  {pageLinks.incoming.length === 0 ? (
                    <Text tone="muted">Бэклинков пока нет.</Text>
                  ) : (
                    <ul className="setting-wiki-links__list">
                      {pageLinks.incoming.map((link) => (
                        <li key={link.id} className="setting-wiki-links__row">
                          <button
                            type="button"
                            className="setting-wiki-links__jump"
                            onClick={() => setSelectedId(link.from_page_id)}
                          >
                            {link.from_title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Stack>
            ) : (
              <Text tone="muted">Нет раскрытых страниц.</Text>
            )}
          </section>
        </div>
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}

function PreviewNode({
  node,
  depth,
  selectedId,
  isOwner,
  onSelect,
  onAddChild,
}: {
  node: SettingPageNode
  depth: number
  selectedId: string
  isOwner: boolean
  onSelect: (id: string) => void
  onAddChild: (id: string) => void
}) {
  const on = node.id === selectedId
  return (
    <li>
      <div
        className={`setting-wiki-tree__row${on ? ' is-on' : ''}${
          isOwner && node.revealed ? ' is-revealed' : ''
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          type="button"
          className="setting-wiki-tree__link"
          onClick={() => onSelect(node.id)}
        >
          {node.title}
          {isOwner && node.revealed ? (
            <span className="setting-wiki-tree__eye" title="Раскрыто игрокам">
              ·
            </span>
          ) : null}
        </button>
        {isOwner ? (
          <button
            type="button"
            className="setting-wiki-tree__add"
            onClick={() => onAddChild(node.id)}
          >
            +
          </button>
        ) : null}
      </div>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <PreviewNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              isOwner={isOwner}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
