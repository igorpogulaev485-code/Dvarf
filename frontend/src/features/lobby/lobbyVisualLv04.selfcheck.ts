/**
 * LV-04: тулбар мастера на десктопе — иерархия, один «Завершить бой»,
 * награды после боя, настройки/деструктив не в первом экране.
 * Selfcheck по исходникам — без рантайма.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const page = read('src/pages/SessionDetailPage.tsx')
assert.match(page, /session-center--master-desk/)
assert.match(page, /session-table-toolbar--master/)
assert.match(page, /session-toolbar-group--rewards-spotlight/)
assert.match(page, /session-toolbar-rewards/)
assert.match(page, /Ещё действия/)
assert.match(page, /Настройки стола/)
assert.match(page, /variant="danger"/)
assert.match(page, /compact=\{canRun\}/)
assert.match(page, /Сесть за стол как/)
assert.match(page, /data-sc05-gm-toolbar/)
assert.match(page, /settingName=\{session\.setting_name/)
assert.doesNotMatch(
  page,
  /session-top-actions[\s\S]*Удалить сессию[\s\S]*<\/div>\s*<\/div>\s*\{error/,
)

const track = read('src/features/lobby/CombatTrack.tsx')
assert.match(track, /showEndAction/)
assert.match(track, /showEndAction && onEnd/)

const lore = read('src/features/lobby/SessionLorePanel.tsx')
assert.match(lore, /compact\?: boolean/)
assert.match(lore, /session-lore-panel--compact/)

const enemies = read('src/styles/28-session-enemies.css')
assert.match(enemies, /session-table-toolbar--master/)
assert.match(enemies, /session-toolbar-more/)
assert.match(enemies, /session-toolbar-group--rewards-spotlight/)

const journal = read('src/styles/27-session-journal-notes.css')
assert.match(journal, /session-center--master-desk/)
assert.match(journal, /session-center-slot--cards[\s\S]*order:\s*2/)

const density = read('src/styles/03-density-cabinet.css')
assert.match(density, /session-lore-panel--compact/)

// LV-01 карточка / LV-02 чипы / L-21 не откатываем
const lock = read('src/styles/26-lobby-hub-lock.css')
assert.match(lock, /\.session-table-card[\s\S]*min-width:\s*min\(100%,\s*240px\)/)
assert.match(page, /lobbyMobileShell/)

console.log('lobbyVisualLv04.selfcheck: ok')
