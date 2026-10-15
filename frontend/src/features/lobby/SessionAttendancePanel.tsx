import type { LobbyMember } from '../../shared/api/lobbies'
import { Button, Stack, Text } from '../../ui'
import { LobbyMemberMiniCard } from './LobbyMemberMiniCard'

type Props = {
  members: LobbyMember[]
  /** character_id присутствующих */
  presentIds: Set<string>
  busy?: boolean
  readOnly?: boolean
  /** Режим создания: только чекбоксы, без API seat */
  mode: 'create' | 'manage'
  onToggle: (characterId: string, nextPresent: boolean) => void
  isOwner?: boolean
  ownCharacterIds?: Set<string>
}

/** Кто пришёл на сессию (= seats в A2). */
export function SessionAttendancePanel({
  members,
  presentIds,
  busy,
  readOnly,
  mode,
  onToggle,
  isOwner,
  ownCharacterIds,
}: Props) {
  const present = members.filter((m) => presentIds.has(m.character_id))
  const absent = members.filter((m) => !presentIds.has(m.character_id))

  return (
    <Stack gap={16}>
      <Text tone="muted">
        {mode === 'create'
          ? 'Отметьте, кто пришёл на эту сессию. Позже можно поправить на экране сессии.'
          : 'Присутствующие за столом. Живой стол (лента, бой) — следующий слайс.'}
      </Text>

      {members.length === 0 ? (
        <Text tone="muted">В лобби пока нет персонажей.</Text>
      ) : (
        <div className="session-attendance-list">
          {members.map((m) => {
            const presentNow = presentIds.has(m.character_id)
            return (
              <label
                key={m.character_id}
                className={`session-attendance-row${presentNow ? ' is-present' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={presentNow}
                  disabled={readOnly || busy}
                  onChange={(e) => onToggle(m.character_id, e.target.checked)}
                />
                <span className="session-attendance-row__body">
                  <strong>{m.character_name}</strong>
                  <span className="session-attendance-row__meta">
                    ур. {m.character_level}
                    {m.character_class_name ? ` · ${m.character_class_name}` : ''}
                  </span>
                </span>
                <span className="session-attendance-row__badge">
                  {presentNow ? 'Пришёл' : 'Нет'}
                </span>
              </label>
            )
          })}
        </div>
      )}

      {mode === 'manage' && present.length > 0 ? (
        <Stack gap={10}>
          <Text as="h3">За столом ({present.length})</Text>
          <div className="lobby-member-grid">
            {present.map((m) => {
              const isOwn = ownCharacterIds?.has(m.character_id)
              return (
                <LobbyMemberMiniCard
                  key={m.character_id}
                  member={m}
                  busy={busy}
                  sheetLabel={isOwner && !isOwn ? 'Смотреть' : 'Лист'}
                  onRemove={
                    readOnly
                      ? undefined
                      : () => onToggle(m.character_id, false)
                  }
                />
              )
            })}
          </div>
        </Stack>
      ) : null}

      {mode === 'manage' && !readOnly && absent.length > 0 ? (
        <Text tone="muted">
          Не отмечены: {absent.map((m) => m.character_name).join(', ')}. Включите галочку выше,
          чтобы посадить за стол.
        </Text>
      ) : null}

      {mode === 'create' && !readOnly ? (
        <div className="inline-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={busy || members.length === 0}
            onClick={() => {
              for (const m of members) {
                if (!presentIds.has(m.character_id)) onToggle(m.character_id, true)
              }
            }}
          >
            Отметить всех
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy || presentIds.size === 0}
            onClick={() => {
              for (const id of [...presentIds]) onToggle(id, false)
            }}
          >
            Снять всех
          </Button>
        </div>
      ) : null}
    </Stack>
  )
}
