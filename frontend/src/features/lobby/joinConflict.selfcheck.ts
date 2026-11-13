import { ApiRequestError } from '../../shared/api/client'
import {
  formatPersonalNotesExport,
  parseCharacterInOtherLobby,
} from './joinConflict'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

const ok = parseCharacterInOtherLobby(
  new ApiRequestError('уже', 409, 'character_in_other_lobby', {
    other_lobby_id: 'a',
    other_lobby_name: 'Кампания',
    can_transfer: true,
  }),
)
assert(ok?.other_lobby_name === 'Кампания', 'parse name')
assert(ok?.can_transfer === true, 'parse can_transfer')

assert(
  parseCharacterInOtherLobby(new ApiRequestError('x', 400, 'other')) === null,
  'ignore other codes',
)

const text = formatPersonalNotesExport('Стол', [
  { title: 'Тайна', body: 'текст', updated_at: '2026-01-01' },
])
assert(text.includes('Личные заметки — Стол'), 'export header')
assert(text.includes('## Тайна'), 'export title')
assert(text.includes('текст'), 'export body')

console.log('joinConflict.selfcheck: ok')
