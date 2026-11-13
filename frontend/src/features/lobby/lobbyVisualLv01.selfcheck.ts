/**
 * LV-01: оболочка стола игрока + баг сжатой карточки.
 * Selfcheck по исходникам — без рантайма.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const tabs = read('src/features/lobby/SessionLiveTabs.tsx')
assert.match(tabs, /label: 'Заметки'/)
assert.doesNotMatch(tabs, /label: 'Ещё'/)

const lock = read('src/styles/26-lobby-hub-lock.css')
assert.match(lock, /\.session-table-card[\s\S]*min-width:\s*min\(100%,\s*240px\)/)
assert.match(lock, /\.session-table-card__name[\s\S]*overflow-wrap:\s*break-word/)
assert.doesNotMatch(
  lock,
  /\.session-table-card__name\s*\{[^}]*overflow-wrap:\s*anywhere/,
)

const journal = read('src/styles/27-session-journal-notes.css')
assert.match(journal, /minmax\(320px/)
assert.match(journal, /is-mobile-tab-feed/)
assert.match(journal, /app-header--lobby-shell/)
assert.match(journal, /session-your-turn-banner[\s\S]*display:\s*none/)

const page = read('src/pages/SessionDetailPage.tsx')
assert.match(page, /lobbyMobileShell/)
assert.match(page, /is-mobile-tab-\$\{liveTab\}/)
assert.match(page, /Сесть за стол как/)
assert.match(page, /onApplyEffect=/)
assert.match(page, /compact=\{!canRun\}/)
assert.doesNotMatch(page, /title="Сессия"/)

const header = read('src/features/characters/AppHeader.tsx')
assert.match(header, /lobbyMobileShell/)
assert.match(header, /app-header--lobby-shell/)

const characters = read('src/pages/CharactersPage.tsx')
assert.doesNotMatch(characters, /lobbyMobileShell/)

console.log('lobbyVisualLv01.selfcheck: ok')
