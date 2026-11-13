/** W-02: @Имя без совпадения → Создать / Похожие (без молчаливого create). */
import { useMemo, useState } from 'react'
import {
  createSettingPage,
  resolveWikiMention,
  type SettingDetail,
  type SettingPageKind,
  type WikiMentionResolve,
} from '../../shared/api/lobbies'
import { ApiRequestError } from '../../shared/api/client'
import { extractMentionTitles } from './settingMentions'
import { Button, Field, Text } from '../../ui'
import { SETTING_PAGE_KINDS, pageKindLabel } from './settingKinds'

type Props = {
  settingId: string
  body: string
  existingTitles: Set<string>
  busy: boolean
  onCreated: (detail: SettingDetail, pageId: string) => void
}

export function WikiMentionAssist({
  settingId,
  body,
  existingTitles,
  busy,
  onCreated,
}: Props) {
  const missing = useMemo(() => {
    const titles = extractMentionTitles(body)
    return titles.filter((t) => !existingTitles.has(t.toLowerCase()))
  }, [body, existingTitles])

  const [active, setActive] = useState<string | null>(null)
  const [resolved, setResolved] = useState<WikiMentionResolve | null>(null)
  const [kind, setKind] = useState<SettingPageKind>('note')
  const [error, setError] = useState<string | null>(null)
  const [localBusy, setLocalBusy] = useState(false)

  if (missing.length === 0) return null

  async function openAssist(title: string) {
    setActive(title)
    setError(null)
    setLocalBusy(true)
    try {
      const res = await resolveWikiMention(settingId, title)
      setResolved(res)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось найти похожие')
      setResolved(null)
    } finally {
      setLocalBusy(false)
    }
  }

  async function createPage(title: string) {
    setLocalBusy(true)
    setError(null)
    try {
      const next = await createSettingPage(settingId, {
        title,
        page_kind: kind,
        body: '',
      })
      const created = next.pages.find((p) => p.title === title)
      onCreated(next, created?.id ?? next.pages[next.pages.length - 1]?.id ?? '')
      setActive(null)
      setResolved(null)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось создать')
    } finally {
      setLocalBusy(false)
    }
  }

  return (
    <div className="wiki-mention-assist">
      <Text as="h3">Упоминания без страницы</Text>
      <Text tone="muted">Пустые страницы сами не создаются — выберите действие.</Text>
      {error ? <Text tone="danger">{error}</Text> : null}
      <ul className="wiki-mention-assist__list">
        {missing.map((title) => (
          <li key={title}>
            <button
              type="button"
              className="setting-mention setting-mention--missing"
              disabled={busy || localBusy}
              onClick={() => void openAssist(title)}
            >
              @{title}
            </button>
          </li>
        ))}
      </ul>
      {active ? (
        <div className="wiki-mention-assist__panel">
          <Text>«{active}» — создать или выбрать похожее</Text>
          <Field label="Тип новой страницы">
            <select
              className="ui-input"
              value={kind}
              disabled={busy || localBusy}
              onChange={(e) => setKind(e.target.value as SettingPageKind)}
            >
              {SETTING_PAGE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {pageKindLabel(k)}
                </option>
              ))}
            </select>
          </Field>
          <div className="inline-actions">
            <Button
              type="button"
              disabled={busy || localBusy}
              onClick={() => void createPage(active)}
            >
              Создать страницу
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy || localBusy}
              onClick={() => {
                setActive(null)
                setResolved(null)
              }}
            >
              Закрыть
            </Button>
          </div>
          {resolved && resolved.similar.length > 0 ? (
            <>
              <Text as="h4">Похожие</Text>
              <ul>
                {resolved.similar.map((s) => (
                  <li key={s.id}>
                    <Text>
                      {s.title} ({pageKindLabel(s.page_kind)}) · {Math.round(s.score * 100)}%
                    </Text>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
