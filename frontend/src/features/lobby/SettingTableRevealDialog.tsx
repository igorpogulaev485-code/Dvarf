/**
 * T2: раскрыть страницу сеттинга mid-session со стола.
 */
import { useEffect, useMemo, useState } from 'react'
import type { SettingPage } from '../../shared/api/lobbies'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import { SETTING_PAGE_KIND_LABELS, pageKindLabel } from './settingKinds'
import { readRecentPageIds } from './settingRecent'

type Props = {
  open: boolean
  busy?: boolean
  settingId: string | null
  settingName?: string | null
  pages: SettingPage[]
  onClose: () => void
  onReveal: (payload: { page_id: string; reveal_subtree: boolean }) => void
}

export function SettingTableRevealDialog({
  open,
  busy = false,
  settingId,
  settingName,
  pages,
  onClose,
  onReveal,
}: Props) {
  const [query, setQuery] = useState('')
  const [pageId, setPageId] = useState('')
  const [subtree, setSubtree] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSubtree(false)
    const recent = settingId ? readRecentPageIds(settingId) : []
    const firstHidden =
      pages.find((p) => !p.revealed && recent.includes(p.id)) ??
      pages.find((p) => !p.revealed) ??
      pages[0]
    setPageId(firstHidden?.id ?? '')
  }, [open, pages, settingId])

  const recentPages = useMemo(() => {
    if (!settingId) return []
    const byId = new Map(pages.map((p) => [p.id, p]))
    return readRecentPageIds(settingId)
      .map((id) => byId.get(id))
      .filter(Boolean) as SettingPage[]
  }, [settingId, pages])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...pages].sort((a, b) => {
      if (a.revealed !== b.revealed) return a.revealed ? 1 : -1
      return a.title.localeCompare(b.title, 'ru')
    })
    if (!q) return list
    return list.filter((p) => {
      const tags = (p.tags ?? []).join(' ')
      return `${p.title} ${tags}`.toLowerCase().includes(q)
    })
  }, [pages, query])

  const selected = pages.find((p) => p.id === pageId) ?? null
  const canReveal = Boolean(pageId && selected)

  return (
    <Dialog
      open={open}
      title="Раскрыть игрокам"
      primaryLabel={
        selected?.revealed
          ? subtree
            ? 'Уже открыто · обновить ветку'
            : 'Уже открыто'
          : subtree
            ? 'Раскрыть ветку'
            : 'Раскрыть'
      }
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canReveal || Boolean(selected?.revealed && !subtree)}
      onSecondary={onClose}
      onPrimary={() => {
        if (!pageId) return
        onReveal({ page_id: pageId, reveal_subtree: subtree })
      }}
    >
      <Stack gap={12}>
        <Text tone="muted">
          {settingName
            ? `Страница из «${settingName}» появится у игроков и в ленте.`
            : 'Страница появится у игроков и в ленте.'}
        </Text>
        {recentPages.length > 0 ? (
          <div className="setting-wiki-recent" aria-label="Недавние">
            <Text tone="muted" className="setting-wiki-recent__label">
              Недавние
            </Text>
            <div className="setting-wiki-recent__list">
              {recentPages.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`setting-wiki-recent__chip${pageId === p.id ? ' is-on' : ''}`}
                  disabled={busy}
                  onClick={() => setPageId(p.id)}
                >
                  {p.revealed ? '✓ ' : ''}
                  {p.title || 'Без названия'}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <Field label="Поиск">
          <Input
            value={query}
            disabled={busy}
            placeholder="Название или тег…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Field label="Страница">
          <select
            className="ui-input"
            value={pageId}
            disabled={busy || filtered.length === 0}
            onChange={(e) => setPageId(e.target.value)}
          >
            {filtered.length === 0 ? (
              <option value="">Ничего не найдено</option>
            ) : (
              filtered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.revealed ? '✓ ' : ''}
                  {SETTING_PAGE_KIND_LABELS[p.page_kind]?.slice(0, 1) ?? '?'} ·{' '}
                  {p.title || 'Без названия'}
                  {p.revealed ? ' (открыто)' : ''}
                </option>
              ))
            )}
          </select>
        </Field>
        {selected ? (
          <Text tone="muted">
            Тип: {pageKindLabel(selected.page_kind)}
            {selected.revealed ? ' · уже раскрыта' : ' · скрыта'}
          </Text>
        ) : null}
        <label className="setting-wiki-reveal__toggle">
          <input
            type="checkbox"
            checked={subtree}
            disabled={busy}
            onChange={(e) => setSubtree(e.target.checked)}
          />
          <span>Вместе с дочерними страницами (ветка)</span>
        </label>
      </Stack>
    </Dialog>
  )
}
