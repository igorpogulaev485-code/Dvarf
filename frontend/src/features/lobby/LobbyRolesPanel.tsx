import { useMemo, useState, type FormEvent } from 'react'
import {
  assignLeadToday,
  assignLobbyRole,
  clearLeadToday,
  removeLobbyRole,
  transferLobby,
  type LobbyDetail,
  type LobbyRole,
} from '../../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text } from '../../ui'

type Props = {
  lobby: LobbyDetail
  busy: boolean
  onLobby: (next: LobbyDetail) => void
  onToast: (msg: string) => void
  onError: (msg: string) => void
  run: (fn: () => Promise<void>) => void
  ownCharacterId?: string | null
}

function roleLabel(role: LobbyRole['role']): string {
  if (role === 'comaster') return 'Сомастер'
  if (role === 'observer') return 'Наблюдатель'
  return 'Ведёт сегодня'
}

export function LobbyRolesPanel({
  lobby,
  busy,
  onLobby,
  onToast,
  onError,
  run,
  ownCharacterId,
}: Props) {
  const canChange = Boolean(lobby.can_change_roles || lobby.is_owner)
  const canTransfer = Boolean(lobby.can_transfer_lobby || lobby.is_owner)
  const roles = lobby.roles ?? []
  const comasters = roles.filter((r) => r.role === 'comaster')
  const observers = roles.filter((r) => r.role === 'observer')
  const leads = roles.filter((r) => r.role === 'lead_today')

  const [transferUserId, setTransferUserId] = useState('')
  const [confirmName, setConfirmName] = useState('')
  const [formerFate, setFormerFate] = useState<'become_player' | 'leave'>('leave')
  const [leadUserId, setLeadUserId] = useState('')
  const [leadSessionId, setLeadSessionId] = useState(lobby.sessions[0]?.id ?? '')

  const transferCandidates = useMemo(() => {
    const byUser = new Map<string, string>()
    for (const r of comasters) {
      byUser.set(r.user_id, r.display_name || r.user_id.slice(0, 8))
    }
    for (const m of lobby.members) {
      if (m.user_id === lobby.owner_id) continue
      byUser.set(m.user_id, m.character_name)
    }
    return [...byUser.entries()].map(([id, name]) => ({ id, name }))
  }, [comasters, lobby.members, lobby.owner_id])

  const playerCandidates = useMemo(() => {
    const seen = new Set<string>()
    const out: { id: string; name: string; characterId: string }[] = []
    for (const m of lobby.members) {
      if (m.user_id === lobby.owner_id) continue
      if (seen.has(m.user_id)) continue
      seen.add(m.user_id)
      out.push({ id: m.user_id, name: m.character_name, characterId: m.character_id })
    }
    return out
  }, [lobby.members, lobby.owner_id])

  const openSessions = lobby.sessions.filter((s) => !s.closed_at)

  return (
    <Panel title="Роли за столом">
      <Stack gap={14}>
        <Text tone="muted">
          Владелец — мастер лобби. Сомастеры и наблюдатели входят по тому же коду без персонажа.
        </Text>

        <div className="lobby-roles-block">
          <Text as="h3" className="lobby-roles-block__title">
            Владелец
          </Text>
          <Text>{lobby.owner_id.slice(0, 8)}… (вы {lobby.is_owner ? 'мастер' : 'не мастер'})</Text>
        </div>

        <div className="lobby-roles-block">
          <Text as="h3" className="lobby-roles-block__title">
            Сомастеры
          </Text>
          {comasters.length === 0 ? (
            <Text tone="muted">Пока никого.</Text>
          ) : (
            <ul className="lobby-roles-list">
              {comasters.map((r) => (
                <li key={r.id} className="lobby-roles-list__item">
                  <span>{r.display_name || r.user_id.slice(0, 8)}</span>
                  {canChange ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const next = await removeLobbyRole(lobby.id, r.user_id, 'comaster')
                          onLobby(next)
                          onToast('Роль снята')
                        })
                      }
                    >
                      Снять
                    </Button>
                  ) : null}
                  {canChange ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const next = await assignLobbyRole(lobby.id, r.user_id, 'observer')
                          onLobby(next)
                          onToast('Стал наблюдателем')
                        })
                      }
                    >
                      В наблюдатели
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lobby-roles-block">
          <Text as="h3" className="lobby-roles-block__title">
            Наблюдатели
          </Text>
          {observers.length === 0 ? (
            <Text tone="muted">Пока никого. Войти можно через /join без персонажа.</Text>
          ) : (
            <ul className="lobby-roles-list">
              {observers.map((r) => (
                <li key={r.id} className="lobby-roles-list__item">
                  <span>{r.display_name || r.user_id.slice(0, 8)}</span>
                  {canChange ? (
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const next = await assignLobbyRole(lobby.id, r.user_id, 'comaster')
                          onLobby(next)
                          onToast('Назначен сомастером')
                        })
                      }
                    >
                      Сделать сомастером
                    </Button>
                  ) : null}
                  {canChange ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const next = await removeLobbyRole(lobby.id, r.user_id, 'observer')
                          onLobby(next)
                          onToast('Роль снята')
                        })
                      }
                    >
                      Снять
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lobby-roles-block">
          <Text as="h3" className="lobby-roles-block__title">
            Повести сегодня
          </Text>
          {leads.length === 0 ? (
            <Text tone="muted">Стол у владельца / сомастеров.</Text>
          ) : (
            <ul className="lobby-roles-list">
              {leads.map((r) => (
                <li key={r.id} className="lobby-roles-list__item">
                  <span>
                    {roleLabel(r.role)}: {r.display_name || r.user_id.slice(0, 8)}
                    {r.session_id ? ` · сессия ${r.session_id.slice(0, 8)}` : ''}
                    {r.character_fate === 'waiting' ? ' · персонаж ждёт' : ''}
                  </span>
                  {canChange && r.session_id ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const next = await clearLeadToday(lobby.id, r.session_id!)
                          onLobby(next)
                          onToast('Стол возвращён')
                        })
                      }
                    >
                      Вернуть стол
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {canChange && openSessions.length > 0 && playerCandidates.length > 0 ? (
            <form
              className="inline-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                if (!leadUserId || !leadSessionId) {
                  onError('Выберите игрока и сессию')
                  return
                }
                const player = playerCandidates.find((p) => p.id === leadUserId)
                run(async () => {
                  const next = await assignLeadToday(lobby.id, {
                    user_id: leadUserId,
                    session_id: leadSessionId,
                    character_fate: 'waiting',
                    character_id: player?.characterId,
                  })
                  onLobby(next)
                  onToast('Игрок ведёт эту сессию')
                })
              }}
            >
              <Field label="Игрок">
                <select
                  className="ui-input"
                  value={leadUserId}
                  onChange={(e) => setLeadUserId(e.target.value)}
                >
                  <option value="">—</option>
                  {playerCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Сессия">
                <select
                  className="ui-input"
                  value={leadSessionId}
                  onChange={(e) => setLeadSessionId(e.target.value)}
                >
                  {openSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="submit" disabled={busy}>
                Повести сегодня
              </Button>
            </form>
          ) : null}
        </div>

        {canTransfer ? (
          <div className="lobby-roles-block">
            <Text as="h3" className="lobby-roles-block__title">
              Передать лобби
            </Text>
            <form
              className="stack-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                if (!transferUserId) {
                  onError('Выберите нового владельца')
                  return
                }
                run(async () => {
                  const next = await transferLobby(lobby.id, {
                    new_owner_user_id: transferUserId,
                    confirm_name: confirmName,
                    former_owner_fate: formerFate,
                    former_owner_character_id:
                      formerFate === 'become_player' ? ownCharacterId : null,
                  })
                  onLobby(next)
                  onToast('Лобби передано')
                  setConfirmName('')
                })
              }}
            >
              <Field label="Новый владелец">
                <select
                  className="ui-input"
                  value={transferUserId}
                  onChange={(e) => setTransferUserId(e.target.value)}
                >
                  <option value="">—</option>
                  {transferCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Введите название «${lobby.name}»`}>
                <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
              </Field>
              <Field label="Вы после передачи">
                <select
                  className="ui-input"
                  value={formerFate}
                  onChange={(e) =>
                    setFormerFate(e.target.value as 'become_player' | 'leave')
                  }
                >
                  <option value="leave">Выйти</option>
                  <option value="become_player">Стать игроком</option>
                </select>
              </Field>
              <Button type="submit" variant="danger" disabled={busy || !confirmName.trim()}>
                Передать лобби
              </Button>
            </form>
          </div>
        ) : null}
      </Stack>
    </Panel>
  )
}
