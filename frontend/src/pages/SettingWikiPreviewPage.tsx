/**
 * Превью C1–C5: вики + связи + раскрытие + типы/шаблоны/quick create.
 * /dev/setting-wiki-preview
 */
import { useMemo, useState } from 'react'
import { SettingMentionBody } from '../features/lobby/SettingMentionBody'
import { SettingQuickCreateDialog } from '../features/lobby/SettingQuickCreateDialog'
import { extractMentionTitles } from '../features/lobby/settingMentions'
import {
  QUEST_STATUS_LABELS,
  SETTING_PAGE_KIND_LABELS,
  SETTING_PAGE_KINDS,
  pageKindLabel,
  type QuestStatus,
  type SettingPageKind,
} from '../features/lobby/settingKinds'
import {
  buildSettingPageTree,
  collectDescendantIds,
  filterSettingPages,
  linksForPage,
  templateForPage,
  type SettingPageNode,
} from '../features/lobby/settingPages'
import type {
  SettingPage,
  SettingPageLink,
  SettingPageTemplate,
} from '../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

const SEED_TEMPLATES: SettingPageTemplate[] = [
  {
    id: 't-location',
    setting_id: null,
    page_kind: 'location',
    name: 'Локация',
    body_seed: '',
    schema: [
      { key: 'region', label: 'Регион', type: 'text' },
      { key: 'atmosphere', label: 'Атмосфера', type: 'long' },
      { key: 'dangers', label: 'Опасности', type: 'long' },
      { key: 'gm_notes', label: 'Заметки мастера', type: 'long', gm_only: true },
    ],
    enabled: true,
    is_system: true,
  },
  {
    id: 't-npc',
    setting_id: null,
    page_kind: 'npc',
    name: 'НПС',
    body_seed: '',
    schema: [
      { key: 'role', label: 'Роль', type: 'text' },
      {
        key: 'disposition',
        label: 'Отношение',
        type: 'select',
        options: ['дружелюбный', 'нейтральный', 'враждебный', 'неизвестно'],
      },
      { key: 'hooks', label: 'Зацепки', type: 'long' },
      { key: 'secrets', label: 'Секреты', type: 'long', gm_only: true },
    ],
    enabled: true,
    is_system: true,
  },
  {
    id: 't-faction',
    setting_id: null,
    page_kind: 'faction',
    name: 'Фракция',
    body_seed: '',
    schema: [
      { key: 'goals', label: 'Цели', type: 'long' },
      { key: 'resources', label: 'Ресурсы', type: 'long' },
    ],
    enabled: true,
    is_system: true,
  },
  {
    id: 't-quest',
    setting_id: null,
    page_kind: 'quest',
    name: 'Квест',
    body_seed: '',
    schema: [{ key: 'reward', label: 'Награда', type: 'long' }],
    enabled: true,
    is_system: true,
  },
  {
    id: 't-item',
    setting_id: null,
    page_kind: 'item_lore',
    name: 'Предмет (лор)',
    body_seed: '',
    schema: [{ key: 'origin', label: 'Происхождение', type: 'long' }],
    enabled: true,
    is_system: true,
  },
  {
    id: 't-note',
    setting_id: null,
    page_kind: 'note',
    name: 'Заметка',
    body_seed: '',
    schema: [],
    enabled: true,
    is_system: true,
  },
]

function emptyFields(template: SettingPageTemplate | undefined) {
  const out: Record<string, string> = {}
  for (const f of template?.schema ?? []) out[f.key] = ''
  return out
}

const now = () => new Date().toISOString()

const SEED_PAGES: SettingPage[] = [
  {
    id: 'p-root',
    setting_id: 's1',
    parent_id: null,
    title: 'Мир',
    body: 'Континент Эхо. Тон — сумерки и дорожная пыль.\nСм. [[Рассветный порт]] и @Капитан_Вера. Тайный [[Культ моста]].',
    sort_order: 0,
    revealed: true,
    page_kind: 'note',
    template_id: 't-note',
    fields: {},
    quest_status: null,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: 'p-cities',
    setting_id: 's1',
    parent_id: 'p-root',
    title: 'Города',
    body: 'Рассветный порт, Мостовой холм.',
    sort_order: 0,
    revealed: true,
    page_kind: 'note',
    template_id: 't-note',
    fields: {},
    quest_status: null,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: 'p-port',
    setting_id: 's1',
    parent_id: 'p-cities',
    title: 'Рассветный порт',
    body: 'Гавань на севере. Гильдия лодочников.',
    sort_order: 0,
    revealed: false,
    page_kind: 'location',
    template_id: 't-location',
    fields: {
      region: 'Север',
      atmosphere: 'Соль и смола',
      dangers: 'Контрабандисты',
      gm_notes: 'Культ моста в подвалах',
    },
    quest_status: null,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: 'p-factions',
    setting_id: 's1',
    parent_id: null,
    title: 'Фракции',
    body: 'Вестники праха · Культ моста.',
    sort_order: 1,
    revealed: false,
    page_kind: 'faction',
    template_id: 't-faction',
    fields: { goals: 'Контроль мостов', resources: 'Шпионы' },
    quest_status: null,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: 'p-npc',
    setting_id: 's1',
    parent_id: 'p-port',
    title: 'Капитан Вера',
    body: 'Хозяйка причала.',
    sort_order: 0,
    revealed: true,
    page_kind: 'npc',
    template_id: 't-npc',
    fields: {
      role: 'Капитан гильдии',
      disposition: 'нейтральный',
      hooks: 'Ищет пропавший груз',
      secrets: 'Платит культу',
    },
    quest_status: null,
    created_at: now(),
    updated_at: now(),
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
    kind: 'semantic',
    created_at: now(),
  },
  {
    id: 'l2',
    from_page_id: 'p-factions',
    to_page_id: 'p-port',
    from_title: 'Фракции',
    to_title: 'Рассветный порт',
    label: 'база гильдии',
    kind: 'semantic',
    created_at: now(),
  },
  {
    id: 'l3',
    from_page_id: 'p-root',
    to_page_id: 'p-cities',
    from_title: 'Мир',
    to_title: 'Города',
    label: '',
    kind: 'semantic',
    created_at: now(),
  },
  {
    id: 'lm1',
    from_page_id: 'p-root',
    to_page_id: 'p-port',
    from_title: 'Мир',
    to_title: 'Рассветный порт',
    label: '',
    kind: 'mention',
    created_at: now(),
  },
  {
    id: 'lm2',
    from_page_id: 'p-root',
    to_page_id: 'p-npc',
    from_title: 'Мир',
    to_title: 'Капитан Вера',
    label: '',
    kind: 'mention',
    created_at: now(),
  },
]

export function SettingWikiPreviewPage() {
  const [pages, setPages] = useState(SEED_PAGES)
  const [links, setLinks] = useState(SEED_LINKS)
  const [asOwner, setAsOwner] = useState(true)
  const [selectedId, setSelectedId] = useState('p-root')
  const [linkTargetId, setLinkTargetId] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<SettingPageKind | 'all'>('all')
  const [quickOpen, setQuickOpen] = useState(false)

  const ownerPages = pages
  const visiblePages = useMemo(() => {
    const base = asOwner ? ownerPages : ownerPages.filter((p) => p.revealed)
    return filterSettingPages(base, { query: searchQuery, kind: kindFilter })
  }, [asOwner, ownerPages, searchQuery, kindFilter])

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
  const activeTemplate = templateForPage(SEED_TEMPLATES, selected)
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
        page_kind: 'note',
        template_id: 't-note',
        fields: {},
        quest_status: null,
        created_at: now(),
        updated_at: now(),
      },
    ])
    setSelectedId(id)
    setToast('Страница добавлена')
  }

  function quickCreate(payload: {
    page_kind: SettingPageKind
    template_id: string | null
    parent_id: string | null
    titles: string[]
  }) {
    const template =
      SEED_TEMPLATES.find((t) => t.id === payload.template_id) ??
      SEED_TEMPLATES.find((t) => t.page_kind === payload.page_kind)
    const createdIds: string[] = []
    setPages((prev) => {
      let order = prev.filter((p) => p.parent_id === payload.parent_id).length
      const next = [...prev]
      for (const title of payload.titles) {
        const id = `p-${Date.now()}-${order}`
        createdIds.push(id)
        next.push({
          id,
          setting_id: 's1',
          parent_id: payload.parent_id,
          title,
          body: '',
          sort_order: order++,
          revealed: false,
          page_kind: payload.page_kind,
          template_id: template?.id ?? null,
          fields: emptyFields(template),
          quest_status: payload.page_kind === 'quest' ? 'planned' : null,
          created_at: now(),
          updated_at: now(),
        })
      }
      return next
    })
    setSelectedId(createdIds[createdIds.length - 1] ?? selectedId)
    setQuickOpen(false)
    setToast(
      payload.titles.length > 1
        ? `Создано: ${payload.titles.length}`
        : 'Страница создана',
    )
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
        kind: 'semantic',
        created_at: now(),
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
    setPages((prev) => prev.map((p) => (ids.has(p.id) ? { ...p, revealed } : p)))
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

  function patchSelected(patch: Partial<SettingPage>) {
    if (!selected) return
    setPages((prev) =>
      prev.map((p) => (p.id === selected.id ? { ...p, ...patch, updated_at: now() } : p)),
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
            <Text tone="muted">Превью C1–C6 · типы · шаблоны · @mentions</Text>
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
                <div className="inline-actions">
                  <Button type="button" variant="ghost" onClick={() => setQuickOpen(true)}>
                    Быстро
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => addChild(null)}>
                    + Корень
                  </Button>
                </div>
              ) : null}
            </div>
            <Field label="Поиск">
              <Input
                value={searchQuery}
                placeholder="Название…"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Field>
            <div className="setting-wiki-kind-filters" role="group" aria-label="Тип">
              <button
                type="button"
                className={`setting-wiki-kind-chip${kindFilter === 'all' ? ' is-on' : ''}`}
                onClick={() => setKindFilter('all')}
              >
                Все
              </button>
              {SETTING_PAGE_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`setting-wiki-kind-chip${kindFilter === kind ? ' is-on' : ''}`}
                  onClick={() => setKindFilter(kind)}
                >
                  {SETTING_PAGE_KIND_LABELS[kind]}
                </button>
              ))}
            </div>
            {tree.length === 0 ? (
              <Text tone="muted">Ничего не найдено.</Text>
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
                    onChange={(e) => patchSelected({ title: e.target.value })}
                  />
                </Field>
                <Text tone="muted">Тип: {pageKindLabel(selected.page_kind)}</Text>
                {selected.page_kind === 'quest' ? (
                  <Text tone="muted">
                    Статус:{' '}
                    {QUEST_STATUS_LABELS[(selected.quest_status as QuestStatus) || 'planned']}
                  </Text>
                ) : null}
                {(activeTemplate?.schema ?? []).length > 0 ? (
                  <div className="setting-wiki-fields">
                    <Text as="h3">Поля шаблона</Text>
                    {(activeTemplate?.schema ?? []).map((field) => {
                      if (!asOwner && field.gm_only) return null
                      const value = String(selected.fields?.[field.key] ?? '')
                      return (
                        <Field
                          key={field.key}
                          label={field.gm_only ? `${field.label} (мастер)` : field.label}
                        >
                          {field.type === 'long' ? (
                            <textarea
                              className="ui-input ui-textarea"
                              rows={2}
                              value={value}
                              disabled={!asOwner}
                              onChange={(e) =>
                                patchSelected({
                                  fields: { ...selected.fields, [field.key]: e.target.value },
                                })
                              }
                            />
                          ) : field.type === 'select' && field.options?.length ? (
                            <select
                              className="ui-input"
                              value={value}
                              disabled={!asOwner}
                              onChange={(e) =>
                                patchSelected({
                                  fields: { ...selected.fields, [field.key]: e.target.value },
                                })
                              }
                            >
                              <option value="">—</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={value}
                              disabled={!asOwner}
                              onChange={(e) =>
                                patchSelected({
                                  fields: { ...selected.fields, [field.key]: e.target.value },
                                })
                              }
                            />
                          )}
                        </Field>
                      )
                    })}
                  </div>
                ) : null}
                <Field
                  label="Текст"
                  hint={
                    asOwner
                      ? '@Имя или [[Название]] — упоминание; у игрока скрытое → «неизвестно»'
                      : undefined
                  }
                >
                  {asOwner ? (
                    <textarea
                      className="ui-input ui-textarea"
                      rows={8}
                      value={selected.body}
                      onChange={(e) => {
                        const body = e.target.value
                        patchSelected({ body })
                        // синхрон mention-рёбер (как на бэке)
                        const titles = extractMentionTitles(body)
                        setLinks((prev) => {
                          const kept = prev.filter(
                            (l) =>
                              !(l.from_page_id === selected.id && l.kind === 'mention'),
                          )
                          const byTitle = new Map(
                            pages.map((p) => [p.title.trim().toLowerCase(), p]),
                          )
                          const added: SettingPageLink[] = []
                          for (const title of titles) {
                            const target = byTitle.get(title.toLowerCase())
                            if (!target || target.id === selected.id) continue
                            added.push({
                              id: `lm-${selected.id}-${target.id}`,
                              from_page_id: selected.id,
                              to_page_id: target.id,
                              from_title: selected.title,
                              to_title: target.title,
                              label: '',
                              kind: 'mention',
                              created_at: now(),
                            })
                          }
                          return [...kept, ...added]
                        })
                      }}
                    />
                  ) : (
                    <SettingMentionBody
                      body={selected.body}
                      pages={pages}
                      isOwner={false}
                      onOpenPage={setSelectedId}
                    />
                  )}
                </Field>
                {asOwner ? (
                  <div className="setting-mention-body" style={{ marginTop: 4 }}>
                    <Text tone="muted">Превью:</Text>
                    <SettingMentionBody
                      body={selected.body}
                      pages={pages}
                      isOwner
                      onOpenPage={setSelectedId}
                    />
                  </div>
                ) : null}
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
                    <div className="inline-actions">
                      <Button type="button" variant="secondary" onClick={() => addChild(selected.id)}>
                        + Дочерняя
                      </Button>
                    </div>
                  </>
                ) : null}

                <div className="setting-wiki-links">
                  <Text as="h3">Связи →</Text>
                  {pageLinks.outgoing.length === 0 ? (
                    <Text tone="muted">Пока нет переходов.</Text>
                  ) : (
                    <ul className="setting-wiki-links__list">
                      {pageLinks.outgoing.map((link) => (
                        <li
                          key={link.id}
                          className={`setting-wiki-links__row${
                            link.kind === 'mention' ? ' is-mention' : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="setting-wiki-links__jump"
                            onClick={() => setSelectedId(link.to_page_id)}
                          >
                            {link.kind === 'mention' ? '@ ' : ''}
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
                        onChange={(e) => setLinkTargetId(e.target.value)}
                      >
                        <option value="">Страница для связи…</option>
                        {linkCandidates.map((p) => (
                          <option key={p.id} value={p.id}>
                            {pageKindLabel(p.page_kind)} · {p.title}
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
                        <li key={link.id}>
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
              <Text tone="muted">Выбери страницу слева.</Text>
            )}
          </section>
        </div>
      </Stack>
      <SettingQuickCreateDialog
        open={quickOpen && asOwner}
        templates={SEED_TEMPLATES}
        parentOptions={pages.map((p) => ({ id: p.id, title: p.title }))}
        defaultParentId={selectedId}
        onClose={() => setQuickOpen(false)}
        onCreate={quickCreate}
      />
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
          <span className="setting-wiki-tree__kind">
            {SETTING_PAGE_KIND_LABELS[node.page_kind]?.slice(0, 1) ?? '?'}
          </span>
          {node.title}
          {isOwner && node.revealed ? (
            <span className="setting-wiki-tree__eye">·</span>
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
