/**
 * Превью C1: вики сеттинга (дерево страниц).
 * /dev/setting-wiki-preview
 */
import { useMemo, useState } from 'react'
import {
  buildSettingPageTree,
  type SettingPageNode,
} from '../features/lobby/settingPages'
import type { SettingPage } from '../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

const SEED: SettingPage[] = [
  {
    id: 'p-root',
    setting_id: 's1',
    parent_id: null,
    title: 'Мир',
    body: 'Континент Эхо. Тон — сумерки и дорожная пыль.',
    sort_order: 0,
    revealed: false,
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
    revealed: false,
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

export function SettingWikiPreviewPage() {
  const [pages, setPages] = useState(SEED)
  const [selectedId, setSelectedId] = useState('p-root')
  const [toast, setToast] = useState<string | null>(null)
  const tree = useMemo(() => buildSettingPageTree(pages), [pages])
  const selected = pages.find((p) => p.id === selectedId) ?? null

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

  return (
    <main className="page page--app">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Эхо Рассвета</Text>
            <Text tone="muted">Превью C1 · вики сеттинга</Text>
          </div>
        </header>
        <Text tone="muted">/dev/setting-wiki-preview</Text>

        <Panel title="Сеттинг">
          <Text>Название: Эхо Рассвета</Text>
        </Panel>

        <div className="setting-wiki">
          <aside className="setting-wiki__nav">
            <div className="setting-wiki__nav-head">
              <Text as="h3">Страницы</Text>
              <Button type="button" variant="ghost" onClick={() => addChild(null)}>
                + Корень
              </Button>
            </div>
            <ul className="setting-wiki-tree">
              {tree.map((node) => (
                <PreviewNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onAddChild={addChild}
                />
              ))}
            </ul>
          </aside>
          <section className="setting-wiki__editor">
            {selected ? (
              <Stack gap={12}>
                <Field label="Заголовок">
                  <Input
                    value={selected.title}
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
                    rows={12}
                    value={selected.body}
                    onChange={(e) =>
                      setPages((prev) =>
                        prev.map((p) =>
                          p.id === selected.id ? { ...p, body: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </Field>
                <Button type="button" onClick={() => setToast('Страница сохранена')}>
                  Сохранить страницу
                </Button>
              </Stack>
            ) : null}
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
  onSelect,
  onAddChild,
}: {
  node: SettingPageNode
  depth: number
  selectedId: string
  onSelect: (id: string) => void
  onAddChild: (id: string) => void
}) {
  const on = node.id === selectedId
  return (
    <li>
      <div
        className={`setting-wiki-tree__row${on ? ' is-on' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          type="button"
          className="setting-wiki-tree__link"
          onClick={() => onSelect(node.id)}
        >
          {node.title}
        </button>
        <button
          type="button"
          className="setting-wiki-tree__add"
          onClick={() => onAddChild(node.id)}
        >
          +
        </button>
      </div>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <PreviewNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
