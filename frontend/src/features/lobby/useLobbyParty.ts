import { useEffect, useState } from 'react'
import { getCharacter, listCharacters } from '../../shared/api/characters'
import {
  getLobby,
  getSession,
  listLobbies,
  type LobbyMember,
} from '../../shared/api/lobbies'

export type AllyPickDemo = {
  lobbyName: string
  members: Array<{ character_id: string; character_name: string }>
}

export type PartyOption = {
  character_id: string
  character_name: string
  isSelf: boolean
}

type UseLobbyPartyOptions = {
  /** Явный lobbyId (query со стола / проп / сессия). */
  preferredLobbyId?: string | null
}

/**
 * Участники лобби текущего персонажа + собственные персонажи игрока (Р25).
 * L-20: не обходим все лобби серией getLobby и не берём «первое из списка».
 * Текущее = preferredLobbyId → лобби открытой сессии персонажа → character.lobby_id.
 */
export function useLobbyParty(
  characterId: string | undefined,
  demo: AllyPickDemo | null = null,
  opts: UseLobbyPartyOptions = {},
): {
  loading: boolean
  lobbyId: string | null
  lobbyName: string | null
  options: PartyOption[]
  setLobbyId: (id: string | null) => void
  lobbies: Array<{ id: string; name: string }>
} {
  const preferredLobbyId = opts.preferredLobbyId ?? null
  const [lobbyId, setLobbyId] = useState<string | null>(demo ? 'demo-lobby' : null)
  const [lobbies, setLobbies] = useState<Array<{ id: string; name: string }>>([])
  const [members, setMembers] = useState<LobbyMember[]>([])
  const [ownChars, setOwnChars] = useState<Array<{ id: string; name: string }>>([])
  const [lobbyName, setLobbyName] = useState<string | null>(demo?.lobbyName ?? null)
  const [loading, setLoading] = useState(!demo && Boolean(characterId))

  useEffect(() => {
    if (demo) {
      setLobbyId('demo-lobby')
      setLobbyName(demo.lobbyName)
      setLobbies([{ id: 'demo-lobby', name: demo.lobbyName }])
      setMembers(
        demo.members.map((m, index) => ({
          id: `demo-${index}`,
          character_id: m.character_id,
          user_id: '',
          joined_at: '',
          character_name: m.character_name,
          character_level: 1,
          character_class_name: null,
          character_race_name: null,
          hp_current: null,
          hp_max: null,
        })),
      )
      setOwnChars([])
      setLoading(false)
      return
    }
    if (!characterId) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    Promise.all([getCharacter(characterId), listCharacters(), listLobbies()])
      .then(async ([detail, chars, list]) => {
        if (!active) return
        setOwnChars(chars.map((c) => ({ id: c.id, name: c.name })))

        let sessionLobbyId: string | null = null
        const openSessionId = detail.open_session_id?.trim() || null
        if (openSessionId) {
          try {
            const session = await getSession(openSessionId)
            if (!active) return
            if (session?.lobby_id) sessionLobbyId = session.lobby_id
          } catch {
            // сессия могла закрыться — падаем на lobby_id листа
          }
        }

        const membershipId = detail.lobby_id?.trim() || null
        // Кандидаты, где этот персонаж реально состоит (L-04: обычно один).
        const candidateIds = new Set<string>()
        if (membershipId) candidateIds.add(membershipId)
        if (sessionLobbyId) candidateIds.add(sessionLobbyId)
        if (preferredLobbyId) candidateIds.add(preferredLobbyId)

        const found: Array<{ id: string; name: string }> = []
        for (const summary of list) {
          if (candidateIds.size > 0 && !candidateIds.has(summary.id)) continue
          // Без серии getLobby по всем лобби: если кандидатов нет — не угадываем found[0].
          if (candidateIds.size === 0) continue
          found.push({ id: summary.id, name: summary.name })
        }
        // Если listLobbies ещё не знает имя, но id есть — добавим заглушку.
        for (const id of candidateIds) {
          if (!found.some((f) => f.id === id)) {
            const fromList = list.find((s) => s.id === id)
            found.push({ id, name: fromList?.name ?? 'Лобби' })
          }
        }

        if (!active) return
        setLobbies(found)

        const resolved =
          (preferredLobbyId && found.some((f) => f.id === preferredLobbyId)
            ? preferredLobbyId
            : null) ||
          (sessionLobbyId && found.some((f) => f.id === sessionLobbyId)
            ? sessionLobbyId
            : null) ||
          membershipId ||
          (found.length === 1 ? found[0]!.id : null)

        setLobbyId(resolved)
      })
      .catch(() => {
        if (active) {
          setLobbies([])
          setLobbyId(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [characterId, demo, preferredLobbyId])

  useEffect(() => {
    if (demo || !lobbyId || !characterId) return
    let active = true
    getLobby(lobbyId)
      .then((detail) => {
        if (!active) return
        setMembers(detail.members)
        setLobbyName(detail.name)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [lobbyId, characterId, demo])

  const seen = new Set<string>()
  const options: PartyOption[] = []
  for (const m of members) {
    if (seen.has(m.character_id)) continue
    seen.add(m.character_id)
    options.push({
      character_id: m.character_id,
      character_name: m.character_name,
      isSelf: m.character_id === characterId,
    })
  }
  for (const own of ownChars) {
    if (seen.has(own.id)) continue
    seen.add(own.id)
    options.push({
      character_id: own.id,
      character_name: own.name,
      isSelf: own.id === characterId,
    })
  }

  return {
    loading,
    lobbyId,
    lobbyName,
    options,
    setLobbyId,
    lobbies,
  }
}
