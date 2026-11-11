import { useEffect, useState, type FormEvent } from 'react'
import {
  getSetting,
  type JournalEntryType,
  type SettingPage,
  type SettingSummary,
} from '../../shared/api/lobbies'
import { Button, Field, Input, Stack, Text } from '../../ui'

export type JournalComposePayload = {
  entry_type: JournalEntryType
  title: string
  body: string
  image_url?: string | null
  setting_id?: string | null
  page_id?: string | null
}

type Props = {
  settings: SettingSummary[]
  busy?: boolean
  onSubmit: (payload: JournalComposePayload) => Promise<void> | void
}

const TYPES: Array<{ id: JournalEntryType; label: string }> = [
  { id: 'text', label: 'Пост' },
  { id: 'chapter', label: 'Глава' },
  { id: 'setting_link', label: 'Ссылка на вики' },
  { id: 'image', label: 'Картинка (URL)' },
]

export function JournalComposer({ settings, busy = false, onSubmit }: Props) {
  const [entryType, setEntryType] = useState<JournalEntryType>('text')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [settingId, setSettingId] = useState(settings[0]?.id ?? '')
  const [pageId, setPageId] = useState('')
  const [pages, setPages] = useState<SettingPage[]>([])
  const [pagesBusy, setPagesBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (entryType !== 'setting_link' || !settingId) {
      setPages([])
      setPageId('')
      return
    }
    let active = true
    setPagesBusy(true)
    getSetting(settingId)
      .then((detail) => {
        if (!active) return
        setPages(detail.pages)
        setPageId('')
      })
      .catch(() => {
        if (!active) return
        setPages([])
        setPageId('')
      })
      .finally(() => {
        if (active) setPagesBusy(false)
      })
    return () => {
      active = false
    }
  }, [entryType, settingId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (entryType === 'chapter' && !title.trim()) {
      setLocalError('У главы нужен заголовок')
      return
    }
    if (entryType === 'text' && !title.trim() && !body.trim()) {
      setLocalError('Напишите заголовок или текст')
      return
    }
    if (entryType === 'image' && !imageUrl.trim()) {
      setLocalError('Укажите URL картинки')
      return
    }
    if (entryType === 'setting_link' && !settingId) {
      setLocalError('Выберите сеттинг')
      return
    }
    await onSubmit({
      entry_type: entryType,
      title: title.trim(),
      body,
      image_url: entryType === 'image' ? imageUrl.trim() : null,
      setting_id: entryType === 'setting_link' ? settingId : null,
      page_id: entryType === 'setting_link' && pageId ? pageId : null,
    })
    setTitle('')
    setBody('')
    setImageUrl('')
    setPageId('')
  }

  return (
    <form className="journal-composer" onSubmit={(e) => void handleSubmit(e)}>
      <Stack gap={10}>
        <Text as="h3" className="journal-composer__heading">
          Новый пост
        </Text>

        <Field label="Тип">
          <select
            className="ui-input"
            value={entryType}
            disabled={busy}
            onChange={(e) => setEntryType(e.target.value as JournalEntryType)}
          >
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        {entryType !== 'setting_link' ? (
          <Field label={entryType === 'chapter' ? 'Заголовок главы' : 'Заголовок'}>
            <Input
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={entryType === 'chapter' ? 'Глава 4 — Туннель' : 'Опционально'}
            />
          </Field>
        ) : null}

        {entryType === 'setting_link' ? (
          <>
            <Field label="Сеттинг">
              {settings.length === 0 ? (
                <Text tone="muted">Сначала создайте сеттинг во вкладке «Сеттинг».</Text>
              ) : (
                <select
                  className="ui-input"
                  value={settingId}
                  disabled={busy}
                  onChange={(e) => setSettingId(e.target.value)}
                >
                  {settings.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Страница вики" hint="необязательно — можно связать весь сеттинг">
              <select
                className="ui-input"
                value={pageId}
                disabled={busy || pagesBusy || pages.length === 0}
                onChange={(e) => setPageId(e.target.value)}
              >
                <option value="">
                  {pagesBusy ? 'Загрузка…' : 'Весь сеттинг (без страницы)'}
                </option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || 'Без названия'}
                    {p.revealed ? '' : ' · скрыта'}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}

        {entryType === 'image' ? (
          <Field label="URL картинки">
            <Input
              value={imageUrl}
              disabled={busy}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        ) : null}

        {entryType !== 'setting_link' ? (
          <Field label="Текст">
            <textarea
              className="ui-input ui-textarea"
              rows={4}
              value={body}
              disabled={busy}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                entryType === 'image' ? 'Подпись (необязательно)' : 'Что записать в дневник…'
              }
            />
          </Field>
        ) : (
          <Field label="Заметка" hint="необязательно">
            <textarea
              className="ui-input ui-textarea"
              rows={2}
              value={body}
              disabled={busy}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Краткий комментарий"
            />
          </Field>
        )}

        {localError ? <Text tone="danger">{localError}</Text> : null}

        <Button
          type="submit"
          disabled={busy || (entryType === 'setting_link' && settings.length === 0)}
        >
          {busy ? 'Публикуем…' : 'Опубликовать'}
        </Button>
      </Stack>
    </form>
  )
}
