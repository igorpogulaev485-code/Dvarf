/**
 * SC-04: живой стол — куб свёрнут (Б/В), вкладки «Заметки | Чат | Вики».
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/lobby/uxSc04LiveTable.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const form = read('src/features/lobby/ManualRollForm.tsx')
assert.match(form, /Записать живой куб/)
assert.match(form, /diceOnTable/)
assert.match(form, /const open = Boolean\(diceOnTable\) \|\| userOpen/)
assert.match(form, /if \(!open\)/)
assert.doesNotMatch(
  form,
  /Физический куб/,
  'заголовок анкеты не висит как постоянный «Физический куб»',
)

const page = read('src/pages/SessionDetailPage.tsx')
assert.match(page, /setSideTab\('chat'\)/)
assert.match(page, />\s*Чат\s*</)
assert.match(page, />\s*Заметки\s*</)
assert.match(page, />\s*Вики\s*</)
assert.doesNotMatch(page, /Заметки \/ Чат/)
assert.match(page, /diceOnTable=\{Boolean\(session\.combat\?\.dice_on_table\)\}/)
assert.match(page, /data-side-pane="notes"/)
assert.match(page, /data-side-pane="chat"/)
assert.match(page, /hidden=\{sideTab !== 'notes'\}/)
assert.match(page, /session-center-empty/)

const feed = read('src/features/lobby/SessionEventFeed.tsx')
assert.match(feed, /\['all', 'Всё'\]/)
assert.match(feed, /\['combat', 'Бой'\]/)
assert.match(feed, /\['rolls', 'Броски'\]/)

const tabs = read('src/features/lobby/SessionLiveTabs.tsx')
assert.match(tabs, /label: 'Стол'/)
assert.match(tabs, /label: 'Лента'/)
assert.match(tabs, /label: 'Заметки'/)

const css = read('src/styles/27-session-journal-notes.css')
assert.match(css, /manual-roll-form--collapsed/)
assert.match(css, /min-height:\s*min\(70vh,\s*640px\)/)
assert.match(css, /session-center-empty/)

console.log('uxSc04LiveTable.selfcheck: ok')
