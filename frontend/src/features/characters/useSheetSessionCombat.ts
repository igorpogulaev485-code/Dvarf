import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getSession,
  listSessionCombatTargets,
  type CombatEntry,
  type SessionDetail,
} from '../../shared/api/lobbies'
import type { CombatTarget } from '../lobby/combatTargets'
import { targetsFromSession } from '../lobby/combatTargets'
import { useSessionRealtime } from '../lobby/useSessionRealtime'
import { turnsUntilOwn } from '../../shared/dnd/turnEconomy'

export type SheetCombatView = {
  session: SessionDetail | null
  combatActive: boolean
  round: number
  activeEntry: CombatEntry | null
  yourTurn: boolean
  turnsUntil: number | null
  initiativePending: boolean
  pendingEntry: CombatEntry | null
  diceOnTableSession: boolean
  targets: CombatTarget[]
  reload: () => void
}

/**
 * T-01: лист подписан на открытую сессию персонажа (getSession + useSessionRealtime).
 * Второй сокет не пишем.
 */
export function useSheetSessionCombat(
  openSessionId: string | null | undefined,
  characterId: string | null | undefined,
  opts?: {
    onTurnStarted?: (payload: {
      character_id: string
      entry_id?: string
      round?: number
    }) => void
    onTurnEconomyReset?: (reason?: string) => void
  },
): SheetCombatView {
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [targets, setTargets] = useState<CombatTarget[]>([])
  const onTurnStartedRef = useRef(opts?.onTurnStarted)
  const onResetRef = useRef(opts?.onTurnEconomyReset)
  onTurnStartedRef.current = opts?.onTurnStarted
  onResetRef.current = opts?.onTurnEconomyReset

  const reload = useCallback(() => {
    const sid = openSessionId?.trim()
    if (!sid) {
      setSession(null)
      setTargets([])
      return
    }
    void getSession(sid)
      .then((detail) => {
        setSession(detail)
        if (detail.combat?.active) {
          void listSessionCombatTargets(sid)
            .then((res) =>
              setTargets((res.targets ?? []) as CombatTarget[]),
            )
            .catch(() => {
              setTargets(targetsFromSession(detail))
            })
        } else {
          setTargets([])
        }
      })
      .catch(() => {
        setSession(null)
        setTargets([])
      })
  }, [openSessionId])

  useEffect(() => {
    reload()
  }, [reload])

  useSessionRealtime(openSessionId, {
    onSessionUpdate: (detail) => {
      setSession(detail)
      if (detail.combat?.active) {
        setTargets(targetsFromSession(detail))
        void listSessionCombatTargets(detail.id)
          .then((res) =>
            setTargets((res.targets ?? []) as CombatTarget[]),
          )
          .catch(() => null)
      } else {
        setTargets([])
      }
    },
    onSessionChanged: () => reload(),
    onReconnect: () => reload(),
    onTurnStarted: (payload) => {
      onTurnStartedRef.current?.(payload)
      reload()
    },
    onTurnEconomyReset: (payload) => {
      onResetRef.current?.(payload?.reason)
      reload()
    },
  })

  const combat = session?.combat
  const combatActive = Boolean(combat?.active)
  const entries = combat?.entries ?? []
  const activeIndex = combat?.active_index ?? 0
  const activeEntry =
    combatActive && entries.length > 0
      ? entries[activeIndex] ?? null
      : null
  const yourTurn = Boolean(
    characterId &&
      activeEntry?.kind === 'pc' &&
      activeEntry.ref_id === characterId &&
      !activeEntry.initiative_pending,
  )
  const pendingEntry =
    characterId && combatActive
      ? entries.find(
          (e) =>
            e.kind === 'pc' &&
            e.ref_id === characterId &&
            e.initiative_pending,
        ) ?? null
      : null
  const turnsUntil =
    characterId && combatActive
      ? turnsUntilOwn(entries, activeIndex, characterId)
      : null

  return {
    session,
    combatActive,
    round: combat?.round ?? 1,
    activeEntry,
    yourTurn,
    turnsUntil,
    initiativePending: Boolean(pendingEntry),
    pendingEntry,
    diceOnTableSession: Boolean(
      combat?.dice_on_table ?? false,
    ),
    targets,
    reload,
  }
}
