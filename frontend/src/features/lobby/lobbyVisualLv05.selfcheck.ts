/**
 * LV-05: мобилка мастера — MVP (ход, хиты, кто пришёл, простой опыт).
 * Десктоп LV-04 и оболочка игрока LV-01 не откатываем.
 * Selfcheck по исходникам — без рантайма.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const page = read('src/pages/SessionDetailPage.tsx')
assert.match(page, /AwardXpDialog/)
assert.match(page, /simpleXpOpen/)
assert.match(page, /session-master-mobile-hint/)
assert.match(page, /Удобнее с компьютера — здесь основные действия боя/)
assert.match(page, /session-toolbar-group--mvp/)
assert.match(page, /session-toolbar-mobile-only/)
assert.match(page, /session-toolbar-desktop-only/)
assert.match(page, /Полная добыча, генератор и вики — удобнее с компьютера/)
assert.match(page, /Сесть за стол как/)
assert.match(page, /session-center--master-desk/)
assert.match(page, /session-table-toolbar--master/)
assert.match(page, /Настройки стола/)
assert.match(page, /RewardsDialog/)

const track = read('src/features/lobby/CombatTrack.tsx')
assert.match(track, /session-combat-order__side-action/)
assert.match(track, /showEndAction/)

const journal = read('src/styles/27-session-journal-notes.css')
assert.match(
  journal,
  /session-center--master-desk[\s\S]*session-center-slot--init[\s\S]*order:\s*1/,
)
assert.match(journal, /session-toolbar-desktop-only/)
assert.match(journal, /session-master-mobile-hint/)
assert.match(journal, /session-combat-order__side-action/)
// Игрок LV-01: порядок хода / инициативы / карточки не трогаем
assert.match(journal, /session-center--player-focus[\s\S]*session-center-slot--cards[\s\S]*order:\s*3/)

const enemies = read('src/styles/28-session-enemies.css')
assert.match(enemies, /session-toolbar-group--mvp/)
assert.match(enemies, /session-toolbar-more__desk-note/)

const lock = read('src/styles/26-lobby-hub-lock.css')
assert.match(lock, /ui-dialog \.session-attendance-list/)
assert.match(lock, /lobby-hub-invite-acc/)
assert.match(lock, /\.session-table-card[\s\S]*min-width:\s*min\(100%,\s*240px\)/)

// L-21 / seat CTA не откатываем
assert.match(page, /compact=\{!canRun\}/)
assert.doesNotMatch(page, /D&D 2024/)

console.log('lobbyVisualLv05.selfcheck: ok')
