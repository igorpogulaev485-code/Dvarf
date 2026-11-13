import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  getLobbyMediaUsage,
  getSetting,
  uploadLobbyMedia,
  type JournalChapterRef,
  type JournalEntryType,
  type LobbyMediaUsage,
  type SettingPage,
  type SettingSummary,
} from '../../shared/api/lobbies'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Field, Input, Stack, Text } from '../../ui'
import { HIDDEN_CLOSE, HIDDEN_OPEN, wrapSelectionAsHidden } from './journalHidden'

export type JournalComposePayload = {
  entry_type: JournalEntryType
  title: string
  body: string
  image_url?: string | null
  setting_id?: string | null
  page_id?: string | null
  is_draft?: boolean
  chapter_id?: string | null
  media_id?: string | null
}

type Props = {
  lobbyId: string
  settings: SettingSummary[]
  chapters?: JournalChapterRef[]
  busy?: boolean
  mediaUsage?: LobbyMediaUsage | null
  onMediaUsageChange?: (next: LobbyMediaUsage) => void
  onSubmit: (payload: JournalComposePayload) => Promise<void> | void
  /** Prefill при переносе с доски */
  initialTitle?: string
  initialBody?: string
  submitLabel?: string
}

const TYPES: Array<{ id: JournalEntryType; label: string }> = [
  { id: 'text', label: 'Пост' },
  { id: 'chapter', label: 'Глава' },
  { id: 'setting_link', label: 'Ссылка на вики' },
  { id: 'image', label: 'Картинка' },
]

function formatMb(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1).replace(/\.0$/, '')
}

export function JournalComposer({
  lobbyId,
  settings,
  chapters = [],
  busy = false,
  mediaUsage = null,
  onMediaUsageChange,
  onSubmit,
  initialTitle = '',
  initialBody = '',
  submitLabel,
}: Props) {
  const [entryType, setEntryType] = useState<JournalEntryType>('text')
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [settingId, setSettingId] = useState(settings[0]?.id ?? '')
  const [pageId, setPageId] = useState('')
  const [pages, setPages] = useState<SettingPage[]>([])
  const [pagesBusy, setPagesBusy] = useState(false)
  const [chapterId, setChapterId] = useState('')
  const [asDraft, setAsDraft] = useState(false)
  const [mediaId, setMediaId] = useState<string | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [usage, setUsage] = useState<LobbyMediaUsage | null>(mediaUsage)
  const fileRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setUsage(mediaUsage)
  }, [mediaUsage])

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

  async function ensureUsage(): Promise<LobbyMediaUsage | null> {
    if (usage) return usage
    try {
      const next = await getLobbyMediaUsage(lobbyId)
      setUsage(next)
      onMediaUsageChange?.(next)
      return next
    } catch {
      return null
    }
  }

  async function onPickFile(file: File | null) {
    if (!file) return
    setLocalError(null)
    setUploadBusy(true)
    try {
      await ensureUsage()
      const row = await uploadLobbyMedia(lobbyId, file, { type: 'journal' })
      setMediaId(row.id)
      const next = await getLobbyMediaUsage(lobbyId)
      setUsage(next)
      onMediaUsageChange?.(next)
    } catch (err) {
      setLocalError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить файл')
    } finally {
      setUploadBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function hideSelection() {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    if (start === end) {
      setBody((prev) => `${prev}${HIDDEN_OPEN}${HIDDEN_CLOSE}`)
      return
    }
    setBody((prev) => wrapSelectionAsHidden(prev, start, end))
  }

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
    if (entryType === 'image' && !mediaId) {
      setLocalError('Загрузите файл картинки')
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
      image_url: null,
      setting_id: entryType === 'setting_link' ? settingId : null,
      page_id: entryType === 'setting_link' && pageId ? pageId : null,
      is_draft: asDraft,
      chapter_id: entryType !== 'chapter' && chapterId ? chapterId : null,
      media_id: mediaId,
    })
    setTitle('')
    setBody('')
    setPageId('')
    setMediaId(null)
    setAsDraft(false)
  }

  const disabled = busy || uploadBusy

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
            disabled={disabled}
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
              disabled={disabled}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={entryType === 'chapter' ? 'Глава 4 — Туннель' : 'Опционально'}
            />
          </Field>
        ) : null}

        {entryType !== 'chapter' && chapters.length > 0 ? (
          <Field label="Глава">
            <select
              className="ui-input"
              value={chapterId}
              disabled={disabled}
              onChange={(e) => setChapterId(e.target.value)}
            >
              <option value="">Без главы</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || 'Без названия'}
                </option>
              ))}
            </select>
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
                  disabled={disabled}
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
                disabled={disabled || pagesBusy || pages.length === 0}
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
          <Field label="Файл картинки">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <div className="inline-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={disabled}
                onClick={() => fileRef.current?.click()}
              >
                {uploadBusy ? 'Загружаем…' : mediaId ? 'Заменить файл' : 'Загрузить файл'}
              </Button>
              {mediaId ? <Text tone="muted">Файл готов</Text> : null}
            </div>
            {usage ? (
              <Text tone="muted">
                Место: {formatMb(usage.used_mb)} / {formatMb(usage.limit_mb)} МБ
              </Text>
            ) : null}
          </Field>
        ) : null}

        {entryType !== 'setting_link' ? (
          <Field
            label="Текст"
            hint={`Скрытый кусок: ${HIDDEN_OPEN}…${HIDDEN_CLOSE}`}
          >
            <textarea
              ref={bodyRef}
              className="ui-input ui-textarea"
              rows={4}
              value={body}
              disabled={disabled}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                entryType === 'image' ? 'Подпись (необязательно)' : 'Что записать в дневник…'
              }
            />
            <Button type="button" variant="ghost" disabled={disabled} onClick={hideSelection}>
              Скрыть выделенное
            </Button>
          </Field>
        ) : (
          <Field label="Заметка" hint="необязательно">
            <textarea
              className="ui-input ui-textarea"
              rows={2}
              value={body}
              disabled={disabled}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Краткий комментарий"
            />
          </Field>
        )}

        <label className="journal-composer__draft">
          <input
            type="checkbox"
            checked={asDraft}
            disabled={disabled}
            onChange={(e) => setAsDraft(e.target.checked)}
          />
          <span>Сохранить как черновик (видит только мастер)</span>
        </label>

        {localError ? <Text tone="danger">{localError}</Text> : null}

        <Button
          type="submit"
          disabled={disabled || (entryType === 'setting_link' && settings.length === 0)}
        >
          {busy
            ? 'Сохраняем…'
            : submitLabel || (asDraft ? 'Сохранить черновик' : 'Опубликовать')}
        </Button>
      </Stack>
    </form>
  )
}
