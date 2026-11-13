/**
 * LV-06: кит и копирайт лобби — токены warn/down, RU книги, Добыча, статус квеста.
 * LV-01…LV-05 и L-21 / «Сесть за стол» не откатываем.
 * Selfcheck по исходникам — без рантайма.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join as pathJoin } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = pathJoin(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(pathJoin(root, rel), 'utf8')

const tokens = read('src/styles/01-tokens-base.css')
assert.match(tokens, /--warn:\s*#b54708/)
assert.match(tokens, /--down:\s*#b42318/)

const lock = read('src/styles/26-lobby-hub-lock.css')
assert.match(lock, /UI KIT LOCK — Lobby Hub/)
assert.match(lock, /lobby-member-card__hp--warn[\s\S]*var\(--warn\)/)
assert.match(lock, /session-hp-bar--warn::after[\s\S]*var\(--warn\)/)
assert.match(lock, /session-table-card__chip--hp\.is-down[\s\S]*var\(--down\)/)
assert.doesNotMatch(lock, /#b54708|#9f1239/)

const campaignCss = read('src/styles/26c-campaign-rules.css')
assert.doesNotMatch(campaignCss, /--ink-muted/)
assert.match(campaignCss, /var\(--muted\)/)
assert.match(campaignCss, /var\(--card\)/)

const enemies = read('src/styles/28-session-enemies.css')
assert.match(enemies, /session-companion-card--warn[\s\S]*var\(--warn\)/)
assert.match(enemies, /session-enemy-card--down[\s\S]*var\(--down\)/)
assert.doesNotMatch(enemies, /#0f766e|#b54708/)

const rest = read('src/styles/29-session-enemies-rest.css')
assert.match(rest, /session-combat-order__dot\.is-warn[\s\S]*var\(--warn\)/)
assert.match(rest, /session-combat-track__reaction[\s\S]*var\(--warn\)/)
assert.doesNotMatch(rest, /#b45309/)

const books = read('src/features/lobby/campaignRules.ts')
assert.match(books, /label_ru:\s*'Книга игрока'/)
assert.match(books, /label_ru:\s*'Котел Таши'/)
assert.match(books, /label_ru:\s*'Руководство Занатара'/)
assert.match(books, /entry\?\.label_ru/)
assert.doesNotMatch(
  books.slice(books.indexOf('summarizeStartRules')),
  /Player's Handbook/,
)

const kinds = read('src/features/lobby/settingKinds.ts')
assert.match(kinds, /export function questStatusLabel/)
assert.match(kinds, /Статус неизвестен/)
assert.match(kinds, /planned:\s*'План'/)
assert.match(kinds, /failed:\s*'Провал'/)

const panel = read('src/features/lobby/CampaignRulesPanel.tsx')
assert.match(panel, /summarizeEnabledRules/)
// P13: в readOnly-сводке нет второго заголовка «Правила старта» (редактор мастера — ок)
assert.match(panel, /LV-06 P13/)
const playerSummaryIdx = panel.indexOf('Сводка включённых правил')
const masterEditorIdx = panel.indexOf('Варианты 2014')
assert.ok(playerSummaryIdx > 0 && masterEditorIdx > playerSummaryIdx)
const playerSummaryBlock = panel.slice(playerSummaryIdx, masterEditorIdx)
assert.doesNotMatch(playerSummaryBlock, /Правила старта/)
assert.match(panel, /<Text as="h3">Правила старта<\/Text>/) // осталось в редакторе мастера

const award = read('src/features/lobby/AwardLootDialog.tsx')
assert.match(award, /title="Добыча"/)
assert.doesNotMatch(award, /title="Лут"/)

const combatEditor = read('src/features/lobby/CombatPageEditor.tsx')
assert.match(combatEditor, /Добыча \(заготовка\)/)
assert.doesNotMatch(combatEditor, /Лут \(заготовка\)/)

const session = read('src/pages/SessionDetailPage.tsx')
assert.match(session, /Добыча/)
assert.match(session, /Сесть за стол/)
assert.match(session, /session-center--master-desk/)
assert.match(session, /session-master-mobile-hint/)
assert.doesNotMatch(session, /D&D 2024/)

const join = read('src/pages/JoinLobbyPage.tsx')
assert.match(join, /summarizeStartRules/)
assert.match(join, /Сесть за стол/)

console.log('lobbyVisualLv06.selfcheck: ok')
