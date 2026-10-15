import { useEffect, useState } from 'react'
import { getLobby, listLobbies, type LobbyMember } from '../../shared/api/lobbies'

export type AllyPickDemo = {
  lobbyName: string
  members: Array<{ character_id: string; character_name: string }>
}

export type PartyOption = {
  character_id: string
  character_name: string
  isSelf: boolean
}

/**
 * Участники лобби текущего персонажа (включая себя) — для select’ов в касте.
 */
export function useLobbyParty(
  characterId: string | undefined,
  demo: AllyPickDemo | null = null,
): {
  loading: boolean
  lobbyId: string | null
  lobbyName: string | null
  options: PartyOption[]
  setLobbyId: (id: string | null) => void
  lobbies: Array<{ id: string; name: string }>
} {
  const [lobbyId, setLobbyId] = useState<string | null>(demo ? 'demo-lobby' : null)
  const [lobbies, setLobbies] = useState<Array<{ id: string; name: string }>>([])
  const [members, setMembers] = useState<LobbyMember[]>([])
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
      setLoading(false)
      return
    }
    if (!characterId) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    listLobbies()
      .then(async (list) => {
        const found: Array<{ id: string; name: string }> = []
        for (const summary of list) {
          const detail = await getLobby(summary.id)
          if (!active) return
          if (detail.members.some((m) => m.character_id === characterId)) {
            found.push({ id: summary.id, name: summary.name })
          }
        }
        if (!active) return
        setLobbies(found)
        const first = found[0]?.id ?? null
        setLobbyId(first)
      })
      .catch(() => {
        if (active) setLobbies([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [characterId, demo])

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

  const options: PartyOption[] = members.map((m) => ({
    character_id: m.character_id,
    character_name: m.character_name,
    isSelf: m.character_id === characterId,
  }))

  return {
    loading,
    lobbyId,
    lobbyName,
    options,
    setLobbyId,
    lobbies,
  }
}
