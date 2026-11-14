/**
 * UIKIT-02: 6 polish-инвариантов после UIKIT-01.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/lobby/uikit02Polish.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const card = read('src/features/lobby/SessionTableCard.tsx')
assert.match(card, /session-table-card__identity/)
assert.match(card, /session-insp-toggle/)

const lock = read('src/styles/26-lobby-hub-lock.css')
assert.match(lock, /\.session-table-card__identity/)
assert.match(
  lock,
  /\.session-table-card__name\s*\{[\s\S]*?text-overflow:\s*ellipsis/,
)

const attacks = read('src/features/characters/PlayDeskAttacksCompact.tsx')
assert.match(attacks, /play-desk-compact__holds/)
assert.match(attacks, /from '\.\.\/\.\.\/ui'/)
assert.match(attacks, /size="sm"/)
assert.match(attacks, /: 'взять'/)
assert.match(attacks, />\s*предмет\s*</)
assert.doesNotMatch(attacks, /play-desk-compact__hold\$\{/)

const holdsCss = read('src/styles/18-spell-compact-cards.css')
assert.match(holdsCss, /\.play-desk-compact__holds\s*\{/)
assert.doesNotMatch(holdsCss, /\.play-desk-compact__hold\s*\{/)

const damage = read('src/features/lobby/TypedDamageForm.tsx')
assert.match(damage, /session-typed-damage__row--inputs/)
assert.match(damage, /session-typed-damage__row--actions/)
assert.match(damage, /\bSelect\b/)

const select = read('src/ui/Select.tsx')
assert.match(select, /export function Select/)
assert.match(select, /ui-select/)

const deskUi = read('src/features/characters/playDeskUi.ts')
assert.match(deskUi, /collapsedRaw[\s\S]*?:\s*\[\.\.\.ABILITY_KEYS\]/)

const rail = read('src/styles/21-ability-rail.css')
assert.match(rail, /\.abil-column__list\s*\{[\s\S]*?grid-template-columns:\s*1fr 1fr/)

const enemy = read('src/features/lobby/EnemyCard.tsx')
assert.match(enemy, /variant="secondary"[\s\S]*?Сторона/)
assert.doesNotMatch(enemy, /session-side-btn/)

const initCss = read('src/styles/29-session-enemies-rest.css')
assert.match(
  initCss,
  /\.session-combat-order__name\s*\{[\s\S]*?text-overflow:\s*ellipsis/,
)
assert.match(initCss, /-webkit-line-clamp:\s*2/)

const page = read('src/pages/SessionDetailPage.tsx')
assert.match(page, /DetailsMenu/)
assert.match(page, /data-sc05-rewards/)
assert.match(page, /data-sc05-more/)

const tokens = read('src/styles/01-tokens-base.css')
assert.match(tokens, /\.ui-menu__panel\s*\{[\s\S]*?position:\s*absolute/)

assert.match(rail, /align-items:\s*stretch/)
assert.match(rail, /\.play-desk__stage\s*\{[\s\S]*?min-height:\s*100%/)

const pinned = read('src/styles/20-pinned-spells.css')
assert.match(pinned, /min-height:\s*100%/)
assert.match(
  pinned,
  /\.play-desk--split\s+\.play-desk__scene-wrap\s*\{[\s\S]*?align-items:\s*stretch/,
)

const typedCss = read('src/styles/26-lobby-hub-lock.css')
assert.match(typedCss, /\.session-typed-damage__row--actions/)
assert.match(typedCss, /\.session-typed-damage__row--inputs/)
assert.match(typedCss, /minmax\(4\.5rem,\s*6\.75rem\)/)

assert.match(holdsCss, /border:\s*none/)
assert.match(tokens, /\.ui-input--narrow\s*\{[\s\S]*?min-width:\s*4\.5rem/)

console.log('uikit02Polish.selfcheck: ok')
