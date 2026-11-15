/**
 * LOBBY-FIX E+: /join показывает предупреждение при уровне ≠ старту лобби.
 * Лист не меняем автоматически. Selfcheck по исходникам.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const joinPage = readFileSync(join(root, 'src/pages/JoinLobbyPage.tsx'), 'utf8')

assert.match(joinPage, /levelMismatch/)
assert.match(joinPage, /startLevel/)
assert.match(joinPage, /join-flow__level-warn/)
assert.match(joinPage, /лобби стартует/)
assert.match(joinPage, /tone="warn"/)
assert.match(joinPage, /hideMoreMenu/)
const warnBlock = joinPage.match(/join-flow__level-warn[\s\S]{0,400}/)?.[0] ?? ''
assert.match(warnBlock, /tone="warn"/)
assert.doesNotMatch(warnBlock, /tone="danger"/)
assert.doesNotMatch(joinPage, /selected\.level\s*=/)
assert.doesNotMatch(joinPage, /patchCharacter|updateCharacter|setLevel/)

console.log('lobbyFixJoinLevel.selfcheck: ok')
