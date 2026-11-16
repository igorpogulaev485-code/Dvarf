import { useEffect, useState } from 'react'
import { listCharacters, type CharacterSummary } from '../../shared/api/characters'
import { ApiRequestError } from '../../shared/api/client'
import {
  submitFeedback,
  type FeedbackTopic,
} from '../../shared/api/feedback'
import { listLobbies, type LobbySummary } from '../../shared/api/lobbies'
import {
  Button,
  Field,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  ToggleChip,
} from '../../ui'

const TOPIC_OPTIONS: { id: FeedbackTopic; label: string }[] = [
  { id: 'bug', label: 'Ошибка' },
  { id: 'question', label: 'Вопрос' },
  { id: 'idea', label: 'Идея' },
  { id: 'name', label: 'Название' },
]

type Props = {
  onToast: (message: string) => void
}

export function FeedbackForm({ onToast }: Props) {
  const [topic, setTopic] = useState<FeedbackTopic>('bug')
  const [body, setBody] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [characterId, setCharacterId] = useState('')
  const [lobbyId, setLobbyId] = useState('')
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [lobbies, setLobbies] = useState<LobbySummary[]>([])
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([listCharacters().catch(() => []), listLobbies().catch(() => [])]).then(
      ([chars, rooms]) => {
        if (!active) return
        setCharacters(Array.isArray(chars) ? chars.filter((c) => !c.is_draft) : [])
        setLobbies(Array.isArray(rooms) ? rooms : [])
      },
    )
    return () => {
      active = false
    }
  }, [])

  async function onSubmit() {
    const text = body.trim()
    if (!text) {
      setError('Напишите текст сообщения')
      return
    }
    setBusy(true)
    setError(null)
    setSent(false)
    try {
      const pagePath =
        typeof window !== 'undefined'
          ? window.location.pathname.slice(0, 300)
          : '/cabinet'
      await submitFeedback({
        topic,
        body: text,
        is_anonymous: anonymous,
        character_id: characterId || null,
        lobby_id: lobbyId || null,
        page_path: pagePath,
      })
      setBody('')
      setAnonymous(false)
      setCharacterId('')
      setLobbyId('')
      setTopic('bug')
      setSent(true)
      onToast('Сообщение ушло, спасибо!')
    } catch (err: unknown) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : 'Не удалось отправить. Проверьте сеть и попробуйте снова.'
      setError(message)
      onToast(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap={12}>
      <Text tone="muted">
        Напишите про ошибку, вопрос или идею. Разберём сообщения вручную.
      </Text>

      <Field label="Тема">
        <SegmentedControl
          aria-label="Тема сообщения"
          value={topic}
          options={TOPIC_OPTIONS}
          onChange={(id) => setTopic(id as FeedbackTopic)}
        />
      </Field>

      <Field label="Сообщение" hint="От 1 до 4000 символов">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          rows={5}
          placeholder="Опишите коротко, что случилось или что хотите предложить"
          disabled={busy}
        />
      </Field>

      {characters.length > 0 ? (
        <Field label="Персонаж (по желанию)">
          <Select
            aria-label="Персонаж"
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            disabled={busy}
          >
            <option value="">Не указывать</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {lobbies.length > 0 ? (
        <Field label="Лобби (по желанию)">
          <Select
            aria-label="Лобби"
            value={lobbyId}
            onChange={(e) => setLobbyId(e.target.value)}
            disabled={busy}
          >
            <option value="">Не указывать</option>
            {lobbies.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <ToggleChip
        main="Отправить анонимно"
        rest="Имя и почта не покажутся в разборе"
        checked={anonymous}
        onChange={setAnonymous}
        disabled={busy}
      />

      {error ? <Text tone="danger">{error}</Text> : null}
      {sent ? <Text>Сообщение ушло, спасибо!</Text> : null}

      <div>
        <Button
          variant="primary"
          disabled={busy || !body.trim()}
          onClick={() => {
            void onSubmit()
          }}
        >
          {busy ? 'Отправляем…' : 'Отправить'}
        </Button>
      </div>
    </Stack>
  )
}
