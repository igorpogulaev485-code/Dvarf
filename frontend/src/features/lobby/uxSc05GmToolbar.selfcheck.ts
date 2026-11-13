/**
 * SC-05: тулбар мастера — «Бой» и «+ Враги» (А), «Награды» (Б),
 * на мобильном нет chip-кнопки с текстом ровно «БОЙ» рядом с «Бой».
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/lobby/uxSc05GmToolbar.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const page = read('src/pages/SessionDetailPage.tsx')

assert.match(page, /data-sc05-gm-toolbar/)
assert.match(page, /data-sc05-primary/)
assert.match(page, /data-sc05-rewards/)
assert.match(page, /data-sc05-more/)
assert.match(page, /Ещё действия/)
assert.match(page, /\+ Враги/)
assert.match(page, /session-toolbar-rewards/)
assert.match(page, /settingName=\{session\.setting_name/)

// Первичная кнопка «Бой» — primary, без соседнего Text-лейбла «Бой»→«БОЙ»
const primaryStart = page.indexOf('data-sc05-primary')
const rewardsStart = page.indexOf('data-sc05-rewards')
assert.ok(primaryStart >= 0 && rewardsStart > primaryStart, 'primary + rewards blocks present')
const primaryBlock = page.slice(primaryStart, rewardsStart)
assert.doesNotMatch(
  primaryBlock,
  /session-toolbar-group__label/,
  'в primary нет подписи-чипа рядом с кнопкой «Бой»',
)
assert.match(primaryBlock, /variant="primary"[\s\S]*?>\s*Бой\s*</)
assert.match(primaryBlock, /\+ Враги/)
assert.match(primaryBlock, /Кто пришёл/)

// Награды — меню Б, не три кнопки в первом ряду
const moreStart = page.indexOf('data-sc05-more')
assert.ok(moreStart > rewardsStart)
const rewardsBlock = page.slice(rewardsStart, moreStart)
assert.match(rewardsBlock, /Награды/)
assert.match(rewardsBlock, />\s*Опыт\s*</)
assert.match(rewardsBlock, />\s*Добыча\s*</)
assert.match(rewardsBlock, />\s*Выдать\s*</)

// Мобильный баннер короче; старая длинная фраза ушла
assert.match(page, /С телефона — бой и враги/)
assert.doesNotMatch(page, /Удобнее с компьютера — здесь основные действия боя/)

// Нет пути 2024
assert.doesNotMatch(page, /D&D 2024/)

const lore = read('src/features/lobby/SessionLorePanel.tsx')
assert.match(lore, /settingName\?:/)
assert.match(lore, /Сеттинг привязан/)
assert.match(lore, /Привязать сеттинг/)

const enemies = read('src/styles/28-session-enemies.css')
assert.match(enemies, /text-transform:\s*none/)
assert.match(enemies, /session-toolbar-rewards/)
assert.match(enemies, /min-height:\s*44px/)

const journal = read('src/styles/27-session-journal-notes.css')
assert.match(
  journal,
  /session-table-toolbar--master[\s\S]*session-toolbar-group__label[\s\S]*display:\s*none/,
)

console.log('uxSc05GmToolbar.selfcheck: ok')
