/**
 * LV-03: хаб и список лобби — создание за кнопкой, живые сверху,
 * табы с peek, приглашение-аккордеон, чаты sticky ≥16px, состав ≥44px.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const lobbies = read('src/pages/LobbiesPage.tsx')
assert.match(lobbies, /createOpen/)
assert.match(lobbies, /sortLobbiesLiveFirst/)
assert.match(lobbies, /'Создать'/)
assert.match(lobbies, /createOpen \? \([\s\S]*Panel title="Создать лобби"/)

const tabs = read('src/features/lobby/LobbyHubTabs.tsx')
assert.match(tabs, /scrollTo/)
assert.match(tabs, /lobby-hub-tabs__edge/)
assert.match(tabs, /activeRef/)

const detail = read('src/pages/LobbyDetailPage.tsx')
assert.match(detail, /lobby-hub-invite-acc/)
assert.match(detail, /inviteOpen/)
assert.match(detail, /Сейчас открыта/)
assert.match(detail, /Карточки состава/)
assert.match(detail, /без дубля на каждом табе/)
const inviteQrCount = (detail.match(/<InviteQr\b/g) || []).length
assert.equal(inviteQrCount, 1, 'InviteQr только в аккордеоне шапки')

const chats = read('src/features/lobby/LobbyChatsPanel.tsx')
assert.match(chats, /chat-composer--sticky/)
assert.match(chats, /chat-composer__input/)
assert.match(chats, /chat-mode-tab/)

const lock = read('src/styles/26-lobby-hub-lock.css')
assert.match(lock, /lobby-hub-invite-acc/)
assert.match(lock, /lobby-hub-tabs__edge/)
assert.match(
  lock,
  /\.lobby-member-card__actions\s+\.ui-button\s*\{[^}]*min-height:\s*44px/,
)

const journal = read('src/styles/27-session-journal-notes.css')
assert.match(journal, /chat-composer--sticky/)
assert.match(chats, /ui-input--touch/)
const tokens = read('src/styles/01-tokens-base.css')
assert.match(tokens, /\.ui-input--touch\s*\{[\s\S]*?font-size:\s*16px/)
assert.match(journal, /\.chat-mode-tab\s*\{/)

// LV-01/LV-02 не откатываем
const sessionPage = read('src/pages/SessionDetailPage.tsx')
assert.match(sessionPage, /Сесть за стол как/)
assert.match(sessionPage, /lobbyMobileShell/)

console.log('lobbyVisualLv03.selfcheck: ok')
