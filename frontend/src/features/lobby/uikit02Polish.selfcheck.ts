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
  /\.session-table-card__name\s*\{[\s\S]*?overflow-wrap:\s*anywhere/,
)
assert.doesNotMatch(
  lock,
  /\.session-table-card__name\s*\{[\s\S]*?text-overflow:\s*ellipsis/,
)

const attacks = read('src/features/characters/PlayDeskAttacksCompact.tsx')
assert.match(attacks, /play-desk-compact__holds/)
assert.match(attacks, /play-desk-compact__weapon-tools/)
assert.match(attacks, /play-desk-compact__ammo/)
assert.match(attacks, /play-desk-compact__ammo-chip/)
assert.match(attacks, /from '\.\.\/\.\.\/ui'/)
assert.match(attacks, /size="sm"/)
assert.match(attacks, /: 'взять'/)
assert.match(attacks, />\s*предмет\s*</)
assert.match(attacks, />\s*мод\.\s*</)
assert.match(attacks, /WeaponAttackBreakdownDialog/)
assert.doesNotMatch(attacks, /play-desk-compact__hold\$\{/)
assert.doesNotMatch(
  attacks,
  /needsAmmo[\s\S]{0,400}className="chip-row"/,
)

const holdsCss = read('src/styles/18-spell-compact-cards.css')
assert.match(holdsCss, /\.play-desk-compact__holds\s*\{/)
assert.match(holdsCss, /\.play-desk-compact__weapon-tools\s*\{/)
assert.match(holdsCss, /\.play-desk-compact__ammo\s*\{/)
assert.match(holdsCss, /\.play-desk-compact__ammo-chip\s*\{/)
assert.doesNotMatch(holdsCss, /\.play-desk-compact__hold\s*\{/)

const attackRowCss = read('src/styles/17-death-saves-compact.css')
assert.match(
  attackRowCss,
  /\.play-desk-compact__row\.is-attack\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/,
)

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
/* UIKIT-02: 2-col ability grid rolled back — list stays single column */
assert.doesNotMatch(
  rail,
  /\.abil-column__list\s*\{[\s\S]*?grid-template-columns:\s*1fr 1fr/,
)
const abilList = read('src/styles/20-pinned-spells.css')
assert.match(abilList, /\.abil-column__list\s*\{[\s\S]*?display:\s*grid/)
assert.doesNotMatch(
  abilList,
  /\.abil-column__list\s*\{[\s\S]*?grid-template-columns:\s*1fr 1fr/,
)

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

/* UIKIT-02: kit Dialog backdrop covers iPad Safari dynamic viewport */
const dialogCss = read('src/styles/07-features-dialogs.css')
assert.match(
  dialogCss,
  /\.ui-dialog-backdrop\s*\{[\s\S]*?position:\s*fixed[\s\S]*?inset:\s*0[\s\S]*?100dvh[\s\S]*?100lvh/,
)

/* UIKIT-02: live table fills center; cards ≥280px; no overflow clip */
assert.match(
  lock,
  /\.session-table-grid\s*\{[\s\S]*?repeat\(auto-fill,\s*minmax\(280px,\s*1fr\)/,
)
assert.match(
  lock,
  /\.session-table-card\s*\{[^}]*overflow:\s*visible/,
)
assert.match(lock, /container-type:\s*inline-size/)
assert.doesNotMatch(
  lock,
  /\.session-table-card\s*\{[^}]*overflow:\s*hidden/,
)

const liveDesk = read('src/styles/27-session-journal-notes.css')
assert.match(
  liveDesk,
  /\.session-live-desk\.is-side-collapsed\s+\.session-live-desk__side-tabs\s*\{[\s\S]*?display:\s*none/,
)

const sessionPage = read('src/pages/SessionDetailPage.tsx')
assert.match(sessionPage, /max-width:\s*1180px/)
assert.match(sessionPage, /return false/)

const effectsPanel = read('src/features/characters/ActiveEffectsPanel.tsx')
assert.match(effectsPanel, /Раунд −1/)
assert.doesNotMatch(effectsPanel, />\s*−раунд\s*</)

const headerCss = read('src/styles/15-play-desk-header-identity.css')
assert.match(
  headerCss,
  /\.play-desk-header__name\s*\{[\s\S]*?-webkit-line-clamp:\s*2/,
)
assert.match(headerCss, /\.active-effects__chip-text\.is-clamped/)

const vitalsCss = read('src/styles/16-play-desk-header-vitals.css')
assert.match(
  vitalsCss,
  /\.play-desk-vital--shield\s*>\s*\.play-desk-vital__icon[\s\S]*?display:\s*none/,
)

/* UIKIT-02 follow-up: hot strip one row + scroll; pip squares dense */
const hotCss = read('src/styles/20-pinned-spells.css')
assert.match(
  hotCss,
  /\.play-desk--wide\s+\.play-desk__hot\s*\{[^}]*flex-wrap:\s*nowrap[^}]*overflow-x:\s*auto/,
)
assert.match(hotCss, /\.play-desk__pips\s*\{[^}]*gap:\s*4px/)
assert.doesNotMatch(
  hotCss,
  /\.play-desk--wide\s+\.play-desk__hot\s*\{[^}]*flex-wrap:\s*wrap/,
)

const hotBar = read('src/features/characters/PlayDeskHotBar.tsx')
assert.match(hotBar, /play-desk__pips/)
assert.match(hotBar, /shouldUseCompactResourceTrack/)
assert.doesNotMatch(hotBar, /UIKIT-02: имя \+ «N\/M»/)

const deskHeader = read('src/features/characters/PlayDeskHeader.tsx')
assert.doesNotMatch(deskHeader, /NeedsSetupIndicator/)
assert.doesNotMatch(deskHeader, /IconShield/)

const combatOrder = read('src/styles/29-session-enemies-rest.css')
assert.match(
  combatOrder,
  /\.session-combat-order\s*>\s*li\s*>\s*\.session-combat-order__chip\s*\{[\s\S]*?flex:\s*1\s+1\s+100%/,
)

/* T-01 / UIKIT-02: attack target chips first, «Атаковать {имя}» */
const picker = read('src/features/characters/CombatTargetPicker.tsx')
assert.match(picker, /combat-target-picker__chips/)
assert.match(picker, /Атаковать \$\{selected\.name\}/)
assert.match(picker, /rememberKey/)

const tableCard = read('src/features/lobby/SessionTableCard.tsx')
assert.match(tableCard, /session-table-card__companions/)
assert.doesNotMatch(
  tableCard,
  /<\/article>\s*\{companions\.map/,
)

/* UIKIT-02: compact feed total chip (no 48×48 inflate) */
const feedCss = read('src/styles/27-session-journal-notes.css')
assert.match(
  feedCss,
  /\.session-event-feed__total\s*\{[\s\S]*?inline-flex[\s\S]*?font-size:\s*0\.82rem/,
)
assert.doesNotMatch(
  feedCss,
  /\.session-event-feed__total\s*\{[\s\S]*?min-width:\s*48px[\s\S]*?height:\s*48px/,
)

/* App canvas fills viewport — no white Safari strip under short pages */
assert.match(
  tokens,
  /html\s*\{[\s\S]*?min-height:\s*100dvh[\s\S]*?background:\s*var\(--app-canvas-bg\)/,
)
assert.match(tokens, /#root\s*\{[\s\S]*?min-height:\s*100dvh/)

console.log('uikit02Polish.selfcheck: ok')
