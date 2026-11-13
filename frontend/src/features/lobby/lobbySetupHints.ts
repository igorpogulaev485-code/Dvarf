/**
 * L-03: трёхшаговая подсказка после создания лобби.
 * Признаки шагов — по состоянию лобби; «все три закрыты» фиксируется в localStorage,
 * чтобы уход игрока не вернул подсказку (без миграции).
 */

import type { LobbyDetail } from '../../shared/api/lobbies'

export type SetupHintStepId = 'invite' | 'session' | 'play'

export type SetupHintStep = {
  id: SetupHintStepId
  title: string
  done: boolean
}

const STORAGE_PREFIX = 'dvarf.lobbySetupDone:'

export function setupHintsStorageKey(lobbyId: string): string {
  return `${STORAGE_PREFIX}${lobbyId}`
}

export function isSetupHintsLatched(lobbyId: string): boolean {
  try {
    return localStorage.getItem(setupHintsStorageKey(lobbyId)) === '1'
  } catch {
    return false
  }
}

export function latchSetupHintsDone(lobbyId: string): void {
  try {
    localStorage.setItem(setupHintsStorageKey(lobbyId), '1')
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Признаки шагов (без колонки в БД):
 * - invite: в составе есть кто-то / есть роль observer|comaster (вход по коду);
 * - session: есть хотя бы одна сессия;
 * - play: незакрытая сессия, либо seat_count > 0, либо сессия уже закрывалась.
 */
export function computeSetupHintSteps(lobby: LobbyDetail): SetupHintStep[] {
  const inviteDone =
    lobby.members.length > 0 ||
    (lobby.roles ?? []).some((r) => r.role === 'observer' || r.role === 'comaster')

  const sessionDone = lobby.sessions.length > 0

  const playDone = lobby.sessions.some(
    (s) => s.closed_at == null || (s.seat_count ?? 0) > 0 || Boolean(s.closed_at),
  )

  return [
    {
      id: 'invite',
      title: 'Раздай код приглашения',
      done: inviteDone,
    },
    {
      id: 'session',
      title: 'Создай сессию',
      done: sessionDone,
    },
    {
      id: 'play',
      title: 'Начни игру',
      done: playDone,
    },
  ]
}

export function shouldShowSetupHints(lobby: LobbyDetail): boolean {
  if (isSetupHintsLatched(lobby.id)) return false
  const steps = computeSetupHintSteps(lobby)
  if (steps.every((s) => s.done)) {
    latchSetupHintsDone(lobby.id)
    return false
  }
  return true
}
