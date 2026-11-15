/**
 * SC-05 / LOBBY-FIX: тулбар мастера — «Бой» / «Следующий ход»+«Завершить» в primary;
 * «+ Враги», награды и остальное в «Ещё».
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
assert.match(page, /summary="Ещё"/)
assert.match(page, /\+ Враги/)
assert.match(page, /session-toolbar-rewards/)
assert.match(page, /settingName=\{session\.setting_name/)
assert.match(page, /Следующий ход/)
assert.match(page, /Завершить бой/)

// Первичная кнопка «Бой» — primary, без соседнего Text-лейбла «БОЙ»
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
assert.match(primaryBlock, /Следующий ход/)
assert.doesNotMatch(primaryBlock, /\+ Враги/)

// Ещё — группы Награды / Бой / Сюжет (награды выше, чтобы «Добыча» не уезжала на 390)
const moreStart = page.indexOf('data-sc05-more')
assert.ok(moreStart >= 0)
const moreBlock = page.slice(moreStart, moreStart + 9000)
assert.match(moreBlock, /Бой/)
assert.match(moreBlock, /Награды/)
assert.match(moreBlock, /Сюжет/)
assert.match(moreBlock, /label="\+ Враги"/)
assert.match(moreBlock, /label="Награды"/)
assert.match(moreBlock, /label="Опыт"/)
assert.match(moreBlock, /label="Добыча"/)
assert.match(moreBlock, /label="Выдать"/)
const nagrIdx = moreBlock.indexOf('aria-label="Награды"')
const boyIdx = moreBlock.indexOf('aria-label="Бой"')
assert.ok(nagrIdx >= 0 && boyIdx > nagrIdx, 'Награды выше Боя в «Ещё»')
assert.doesNotMatch(moreBlock, /Генератор и вики удобнее с компьютера/)
assert.match(moreBlock, /session-toolbar-more__item-why|why=\{/)

// LOBBY-FIX visual 4: служебная плашка убрана
assert.doesNotMatch(page, /С телефона — бой и враги/)
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
assert.match(enemies, /ui-menu/)

const tokens = read('src/styles/01-tokens-base.css')
assert.match(tokens, /\.ui-menu__summary\s*\{[\s\S]*?min-height:\s*var\(--control-h-lg\)/)
assert.match(tokens, /\.ui-menu__panel\s*\{[\s\S]*?position:\s*absolute/)
assert.match(tokens, /\.ui-menu__panel--portal[\s\S]*?z-index:\s*70/)

const menu = read('src/ui/DetailsMenu.tsx')
assert.match(menu, /export function DetailsMenu/)
assert.match(menu, /ui-menu__panel/)
assert.match(menu, /closeMenu/)
assert.match(menu, /button:not\(:disabled\)/)

const journal = read('src/styles/27-session-journal-notes.css')
assert.match(
  journal,
  /session-table-toolbar--master[\s\S]*session-toolbar-group__label[\s\S]*display:\s*none/,
)

console.log('uxSc05GmToolbar.selfcheck: ok')
