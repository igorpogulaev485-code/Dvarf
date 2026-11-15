/**
 * FIX-01: mobile dialog kit, spell name → detail, attack target dismiss/chips/HP.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/fix01MobileTarget.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  formatTargetHpFeedLine,
  resolveHitVsAc,
} from '../lobby/attackOutcome.ts'
import { modifiersFromTargetConditions } from './TargetModifiersFields.tsx'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const dialog = read('src/ui/Dialog.tsx')
const dialogCss = read('src/styles/07-features-dialogs.css')
const mobileCss = read('src/styles/22-mobile-shell.css')
const html = read('index.html')
const spells = read('src/features/characters/PlayDeskSpellsCompact.tsx')
const picker = read('src/features/characters/CombatTargetPicker.tsx')
const mods = read('src/features/characters/TargetModifiersFields.tsx')
const attacks = read('src/features/characters/PlayDeskAttacksCompact.tsx')
const api = read('src/shared/api/lobbies.ts')
const tokens = read('src/styles/01-tokens-base.css')

// 1. Dialog kit — visible viewport + sticky footer + close
assert.match(html, /viewport-fit=cover/)
assert.match(dialogCss, /100svh/)
assert.match(dialogCss, /100dvh/)
assert.doesNotMatch(dialogCss.match(/\.ui-dialog-backdrop\s*\{[\s\S]*?\n\}/)![0], /100lvh/)
assert.match(dialogCss, /touch-action:\s*pan-y/)
assert.match(dialogCss, /\.ui-dialog__close/)
assert.match(dialog, /showClose/)
assert.match(mobileCss, /safe-area-inset-bottom/)

// 2. Spell name opens detail; meta keeps «Описание»
assert.match(spells, /play-desk-compact__spell-name/)
assert.match(spells, /onOpenDetail\(\)/)
assert.match(spells, /Описание/)

// 3. Target picker dismiss without roll; ToggleChip; fear/blind/invisible
assert.match(picker, /onDismiss=\{onClose\}/)
assert.match(picker, /showClose/)
assert.match(mods, /ToggleChip/)
assert.match(mods, /Цель ослеплена/)
assert.match(mods, /Цель невидима/)
assert.match(mods, /Источник страха виден/)
assert.match(mods, /attackerFrightened/)
assert.match(mods, /modifiersFromTargetConditions/)
assert.match(attacks, /fearSourceVisible, setFearSourceVisible\] = useState\(false\)/)
assert.match(attacks, /attackerFrightened/)
assert.match(attacks, /onTargetSelect/)
assert.match(attacks, /modifiersFromTargetConditions/)
assert.match(attacks, /resolveHitVsAc/)
assert.match(attacks, /resolveSessionSheetCombatAttack/)
assert.match(api, /combat\/sheet-attack/)

// Hit vs AC helpers
assert.deepEqual(resolveHitVsAc({ attackTotal: 18, natural: 12, ac: 15 }), {
  hit: true,
  crit: false,
})
assert.deepEqual(resolveHitVsAc({ attackTotal: 14, natural: 8, ac: 15 }), {
  hit: false,
  crit: false,
})
assert.deepEqual(resolveHitVsAc({ attackTotal: 2, natural: 1, ac: 10 }), {
  hit: false,
  crit: false,
})
assert.deepEqual(resolveHitVsAc({ attackTotal: 5, natural: 20, ac: 30 }), {
  hit: true,
  crit: true,
})
assert.equal(
  formatTargetHpFeedLine({
    targetName: 'Тестовый противник',
    damageApplied: 9,
    hpCurrent: 21,
    hpMax: 30,
  }),
  'Тестовый противник: −9, 21/30',
)
assert.equal(
  formatTargetHpFeedLine({
    targetName: 'Гоблин',
    damageApplied: 4,
    hpCurrent: 0,
    hpMax: 7,
  }),
  'Гоблин: −4, 0/7 · 0 хитов',
)

const fromTable = modifiersFromTargetConditions([
  { slug: 'prone', name: 'Опрокинутый' },
  { slug: 'blinded', name: 'Ослеплённый' },
])
assert.equal(fromTable.prone, true)
assert.equal(fromTable.blinded, true)
assert.equal(fromTable.invisible, false)

// 4. One turn row: groups + marks inside CombatActions (no separate chips row)
assert.doesNotMatch(attacks, /TurnEconomyChips/)
assert.match(attacks, /TurnEconomyCombatActions/)
assert.match(attacks, /play-desk-turn-actions-wrap/)
const turnUi = read('src/features/characters/TurnEconomyCombatActions.tsx')
assert.match(turnUi, /play-desk-turn-actions__mark/)
assert.match(turnUi, /object_interaction/)
assert.match(turnUi, /toggleMoved/)
assert.match(turnUi, /Снять отметку/)
assert.match(turnUi, /personalFeatures/)
assert.match(turnUi, /Атака/)
assert.match(turnUi, /Заклинание/)
assert.match(attacks, /personalTurnFeatures/)
assert.match(attacks, /inferFeatureTiming/)
assert.match(mobileCss, /play-desk-turn-actions__tabs/)
assert.match(mobileCss, /flex-wrap:\s*wrap/)
assert.match(tokens, /ui-toggle-chip\.is-on/)
assert.match(tokens, /background-color: var\(--accent\)/)

const detail = read('src/features/characters/SpellDetailDialog.tsx')
assert.match(detail, /withBundledRules/)
assert.match(detail, /resolveCastEffectSummary/)
assert.match(detail, /Заговор/)
const enrich = read('src/features/characters/alwaysPreparedSpellEnrichment.ts')
assert.match(enrich, /range:\s*fromCatalog\.range/)

console.log('fix01MobileTarget.selfcheck: ok')
