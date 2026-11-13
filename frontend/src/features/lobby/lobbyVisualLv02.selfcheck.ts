/**
 * LV-02: чипы хода ≥44 px, липкая своя карточка, peek инициативы.
 * Selfcheck по исходникам — без рантайма.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const enemiesRest = read('src/styles/29-session-enemies-rest.css')
assert.match(enemiesRest, /\.session-turn-chip\s*\{[^}]*min-height:\s*44px/)
assert.match(enemiesRest, /\.session-turn-chip\s*\{[^}]*min-width:\s*44px/)
assert.match(enemiesRest, /session-combat-order-wrap/)
assert.match(enemiesRest, /session-combat-track__progress/)
assert.doesNotMatch(
  enemiesRest,
  /\.session-turn-chip\s*\{[^}]*min-height:\s*28px/,
)

const journal = read('src/styles/27-session-journal-notes.css')
assert.match(
  journal,
  /\.session-table-card__actions\s+\.ui-button\s*\{[^}]*min-height:\s*44px/,
)
assert.match(journal, /\.session-seat-stack\.is-your-turn\s*\{[^}]*position:\s*sticky/)
assert.match(journal, /session-center-slot--init[\s\S]*order:\s*2/)
assert.match(journal, /session-center-slot--cards[\s\S]*order:\s*3/)

const track = read('src/features/lobby/CombatTrack.tsx')
assert.match(track, /ход \{turnNumber\} из \{turnTotal\}/)
assert.match(track, /session-combat-order-wrap/)
assert.match(track, /scrollBy/)

const chips = read('src/features/characters/TurnEconomyChips.tsx')
assert.match(chips, /markClearBlocked/)
assert.match(chips, /asGm/)
assert.match(chips, /Отметку мастера снимает только мастер/)

const page = read('src/pages/SessionDetailPage.tsx')
assert.match(page, /Сесть за стол как/)
assert.match(page, /turnEconomyAsGm/)

console.log('lobbyVisualLv02.selfcheck: ok')
