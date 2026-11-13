/**
 * W-01: режим чтения вики — оглавление по типам, «что нового», журнал квестов,
 * карточка полей шаблона. Редактор мастера не трогает.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  KnownLegend,
  SettingDetail,
  SettingPage,
  SettingPageTemplateField,
} from '../../shared/api/lobbies'
import { Button, Field, Input, Text } from '../../ui'
import { SettingMentionBody } from './SettingMentionBody'
import { useAuthedMediaUrl } from './useAuthedMediaUrl'
import type { LobbyMedia } from '../../shared/api/lobbies'

function WikiReaderImage({ media, label }: { media: LobbyMedia; label: string }) {
  const url = useAuthedMediaUrl(media.preview_url || media.url)
  if (!url) return null
  return (
    <figure className="wiki-media-thumb">
      <img src={url} alt={media.original_filename || label} />
      <figcaption>{label}</figcaption>
    </figure>
  )
}
import {
  questStatusLabel,
  SETTING_PAGE_KIND_READER_LABELS,
  SETTING_READER_KIND_ORDER,
  TEMPLATE_CARD_KINDS,
  type SettingPageKind,
} from './settingKinds'
import { filterSettingPages, templateForPage } from './settingPages'
import {
  latestRevealedAt,
  markWikiRevealSeen,
  readWikiRevealSeenAt,
  recentRevealedPages,
  wikiRevealHasNew,
} from './wikiRevealSeen'

type Props = {
  setting: SettingDetail
  userKey: string
  canEditWiki: boolean
  canSeeHidden: boolean
  compact?: boolean
  onBindSetting?: () => void
  showBindHint?: boolean
}

export function SettingWikiReader({
  setting,
  userKey,
  canEditWiki,
  canSeeHidden,
  compact,
  onBindSetting,
  showBindHint,
}: Props) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewList, setShowNewList] = useState(false)
  const [seenAt, setSeenAt] = useState<string | null>(() =>
    readWikiRevealSeenAt(setting.id, userKey),
  )

  const pages = setting.pages
  const legends: KnownLegend[] = setting.known_legends ?? []
  const latest = useMemo(() => latestRevealedAt(pages), [pages])
  const hasNew = wikiRevealHasNew(latest, seenAt)
  const recent = useMemo(() => recentRevealedPages(pages, 10), [pages])
  const selectedLegend = useMemo(() => {
    if (!selectedId) return null
    const page = pages.find((p) => p.id === selectedId)
    if (!page?.artifact_id) return null
    return legends.find((l) => l.artifact_id === page.artifact_id) ?? null
  }, [selectedId, pages, legends])

  useEffect(() => {
    // Первое открытие: запомнить время, точку не показывать.
    if (seenAt == null) {
      const stamp = latest || new Date().toISOString()
      markWikiRevealSeen(setting.id, userKey, stamp)
      setSeenAt(stamp)
      return
    }
  }, [setting.id, userKey, seenAt, latest])

  function markTabSeen() {
    const stamp = new Date().toISOString()
    markWikiRevealSeen(setting.id, userKey, stamp)
    setSeenAt(stamp)
    setShowNewList(false)
  }

  const filtered = useMemo(
    () =>
      filterSettingPages(pages, { query }).filter((p) => p.page_kind !== 'combat'),
    [pages, query],
  )

  const byKind = useMemo(() => {
    const map = new Map<SettingPageKind, SettingPage[]>()
    for (const kind of SETTING_READER_KIND_ORDER) map.set(kind, [])
    for (const p of filtered) {
      if (p.page_kind === 'combat') continue
      const kind = (p.page_kind || 'note') as SettingPageKind
      const list = map.get(kind) ?? []
      list.push(p)
      map.set(kind, list)
    }
    return map
  }, [filtered])

  const quests = useMemo(
    () =>
      pages
        .filter((p) => p.page_kind === 'quest' && p.revealed)
        .sort((a, b) => a.title.localeCompare(b.title, 'ru')),
    [pages],
  )

  const selected = pages.find((p) => p.id === selectedId) ?? null
  const template = templateForPage(setting.templates ?? [], selected)
  const cardFields: SettingPageTemplateField[] = useMemo(() => {
    if (!selected || !TEMPLATE_CARD_KINDS.includes(selected.page_kind as SettingPageKind)) {
      return []
    }
    const schema = template?.schema ?? []
    return schema.filter((f) => !f.gm_only)
  }, [selected, template])

  if (showBindHint && onBindSetting) {
    return (
      <div className="setting-wiki-reader">
        <Button type="button" variant="secondary" onClick={onBindSetting}>
          Привязать сеттинг
        </Button>
      </div>
    )
  }

  return (
    <div className={`setting-wiki-reader${compact ? ' setting-wiki-reader--compact' : ''}`}>
      {setting.in_trash ? (
        <div className="wiki-trash-banner">
          <Text>Сеттинг в корзине — сессия остаётся привязанной.</Text>
        </div>
      ) : null}
      <div className="setting-wiki-reader__toolbar">
        <Field label="Поиск">
          <Input
            value={query}
            placeholder="Название, текст или тег…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <button
          type="button"
          className={`setting-wiki-reader__new${hasNew ? ' is-on' : ''}`}
          onClick={() => {
            setShowNewList((v) => !v)
            if (hasNew) markTabSeen()
          }}
          title="Что нового раскрыли"
        >
          Новое{hasNew ? ' ·' : ''}
          {hasNew ? <span className="setting-wiki-reader__dot" aria-hidden /> : null}
        </button>
        {canEditWiki ? (
          <Link className="ui-button ui-button--ghost" to={`/settings/${setting.id}`}>
            Полная вики
          </Link>
        ) : null}
      </div>

      {showNewList ? (
        <div className="setting-wiki-reader__recent" aria-label="Последние раскрытые">
          <Text as="h4">Что нового раскрыли</Text>
          {recent.length === 0 ? (
            <Text tone="muted">Пока ничего не раскрывали.</Text>
          ) : (
            <ul>
              {recent.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setSelectedId(p.id)}>
                    {p.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="setting-wiki-reader__body">
        <nav className="setting-wiki-reader__toc" aria-label="Оглавление">
          {SETTING_READER_KIND_ORDER.map((kind) => {
            const list = byKind.get(kind) ?? []
            if (list.length === 0) return null
            return (
              <div key={kind} className="setting-wiki-reader__toc-group">
                <Text as="h4">{SETTING_PAGE_KIND_READER_LABELS[kind]}</Text>
                <ul>
                  {list.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={selectedId === p.id ? 'is-on' : undefined}
                        onClick={() => setSelectedId(p.id)}
                      >
                        {p.title || 'Без названия'}
                        {canSeeHidden && !p.revealed ? ' · скрыто' : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="setting-wiki-reader__page">
          {selected ? (
            <>
              <Text as="h3">{selected.title}</Text>
              {selected.primary_image ? (
                <WikiReaderImage media={selected.primary_image} label="Главная картинка" />
              ) : null}
              {selected.page_kind === 'location' && selected.map_image ? (
                <WikiReaderImage media={selected.map_image} label="Карта" />
              ) : null}
              {cardFields.length > 0 ? (
                <div className="setting-wiki-reader__card" aria-label="Поля шаблона">
                  {cardFields.map((f) => {
                    const raw = selected.fields?.[f.key]
                    const value =
                      raw == null || raw === '' ? '—' : String(raw)
                    return (
                      <div key={f.key} className="setting-wiki-reader__card-row">
                        <span className="setting-wiki-reader__card-label">{f.label}</span>
                        <span>{value}</span>
                      </div>
                    )
                  })}
                </div>
              ) : null}
              {selected.page_kind === 'item_lore' && selectedLegend ? (
                <div className="setting-wiki-reader__legends" aria-label="Легенда предмета">
                  <Text as="h4">{selectedLegend.name}</Text>
                  {selectedLegend.primary_image ? (
                    <WikiReaderImage media={selectedLegend.primary_image} label="Картинка легенды" />
                  ) : selected.primary_image ? (
                    <WikiReaderImage media={selected.primary_image} label="Картинка легенды" />
                  ) : null}
                  {selectedLegend.description ? (
                    <Text>{selectedLegend.description}</Text>
                  ) : (
                    <Text tone="muted">Описание легенды пока пусто.</Text>
                  )}
                </div>
              ) : null}
              <SettingMentionBody
                body={selected.body}
                pages={pages}
                isOwner={canSeeHidden}
                onOpenPage={(id) => setSelectedId(id)}
              />
            </>
          ) : (
            <Text tone="muted">Выберите страницу в оглавлении.</Text>
          )}
        </div>
      </div>

      <div className="setting-wiki-reader__legends-list" aria-label="Известные легенды">
        <Text as="h4">Известные легенды</Text>
        {legends.length === 0 ? (
          <Text tone="muted">Пока ничего не раскрыто.</Text>
        ) : (
          <ul>
            {legends.map((L) => (
              <li key={L.artifact_id}>
                <button
                  type="button"
                  onClick={() => {
                    if (L.page_id) setSelectedId(L.page_id)
                  }}
                >
                  {L.name}
                </button>
                {L.description ? (
                  <Text tone="muted"> — {L.description.slice(0, 120)}{L.description.length > 120 ? '…' : ''}</Text>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="setting-wiki-reader__quests" aria-label="Журнал квестов">
        <Text as="h4">Журнал квестов</Text>
        {quests.length === 0 ? (
          <Text tone="muted">Раскрытых квестов пока нет.</Text>
        ) : (
          <ul>
            {quests.map((q) => (
              <li key={q.id}>
                <button type="button" onClick={() => setSelectedId(q.id)}>
                  {q.title}
                </button>
                <span className="setting-wiki-reader__quest-status">
                  {questStatusLabel(q.quest_status || 'planned')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
