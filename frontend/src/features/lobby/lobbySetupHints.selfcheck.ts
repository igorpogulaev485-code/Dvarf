/**
 * L-03 selfcheck: шаги подсказки хаба.
 * Run: npx tsx frontend/src/features/lobby/lobbySetupHints.selfcheck.ts
 */

import {
  computeSetupHintSteps,
  setupHintsStorageKey,
} from './lobbySetupHints'
import type { LobbyDetail } from '../../shared/api/lobbies'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const base: LobbyDetail = {
  id: 'lobby-1',
  name: 'Тест',
  invite_code: 'ABC234',
  join_path: '/join/ABC234',
  is_owner: true,
  owner_id: 'u1',
  members: [],
  roles: [],
  settings: [],
  sessions: [],
  created_at: '',
  updated_at: '',
}

const fresh = computeSetupHintSteps(base)
assert(fresh.every((s) => !s.done), 'fresh lobby: all open')

const withMember = computeSetupHintSteps({
  ...base,
  members: [
    {
      id: 'm1',
      character_id: 'c1',
      user_id: 'u2',
      joined_at: '',
      character_name: 'Герой',
      character_level: 1,
      character_class_name: null,
      character_race_name: null,
      hp_current: null,
      hp_max: null,
    },
  ],
})
assert(withMember[0].done && !withMember[1].done, 'member → invite done')

const withSession = computeSetupHintSteps({
  ...base,
  sessions: [
    {
      id: 's1',
      lobby_id: 'lobby-1',
      setting_id: null,
      name: 'Сессия',
      seat_count: 0,
      closed_at: null,
      created_at: '',
      updated_at: '',
    },
  ],
})
assert(withSession[1].done && withSession[2].done, 'open session → session+play')

assert(
  setupHintsStorageKey('x') === 'dvarf.lobbySetupDone:x',
  'storage key',
)

console.log('lobbySetupHints.selfcheck: ok')
