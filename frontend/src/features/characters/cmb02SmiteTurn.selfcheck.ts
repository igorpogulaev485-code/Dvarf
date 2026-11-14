/**
 * CMB-02: Кара under weapon + Действие/Бонусное/Реакция groups.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/cmb02SmiteTurn.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  divineSmitePresentLevels,
  formatDivineSmiteExtra,
  resolveSmiteAfterAttack,
  rollDivineSmiteExtra,
} from './divineSmite.ts'
import {
  TURN_ACTION_CATALOG,
  catalogRowsForGroup,
  cunningActionGroups,
} from './turnActionGroups.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const attacks = read('src/features/characters/PlayDeskAttacksCompact.tsx')
const smiteUi = read('src/features/characters/DivineSmiteCombatBlock.tsx')
const turnUi = read('src/features/characters/TurnEconomyCombatActions.tsx')

assert.match(attacks, /play-desk-turn-actions-wrap/)
assert.match(attacks, /IconDivineSmite/)
assert.match(attacks, /resolveSmiteAfterAttack/)
assert.match(attacks, /play-desk-compact__attack-block/)
assert.doesNotMatch(attacks, /play-desk-attacks-more__summary/)
assert.doesNotMatch(attacks, /mode="everyTurn"/)
assert.doesNotMatch(attacks, /mode="more"/)

assert.match(smiteUi, /Попал\? Выбери круг/)
assert.match(smiteUi, /play-desk-smite--inline/)
assert.match(smiteUi, /ui-resource-pip/)
assert.match(smiteUi, /play-desk-smite__miss[\s\S]*?Промах/)
assert.doesNotMatch(smiteUi, /Промах — не тратить ячейку/)

assert.match(turnUi, /Действие/)
assert.match(turnUi, /Бонусное/)
assert.match(turnUi, /Реакция/)
assert.match(turnUi, /play-desk-turn-actions__tab/)
assert.match(turnUi, /is-spent/)
assert.match(turnUi, /Хитрое действие: Засада/)
assert.match(turnUi, /Увёртливость/)
assert.match(turnUi, /hasUncannyDodge/)
assert.match(turnUi, /Добивание \(0 хитов\)/)
assert.match(turnUi, /mode === 'everyTurn'/)
assert.match(turnUi, /return null/)
assert.doesNotMatch(attacks, /play-desk-turn-actions__gwm/)
assert.match(attacks, /hasUncannyDodge/)
assert.match(attacks, /onO05GwmFinishing/)
assert.match(attacks, /turnGroupedFeatureIds/)
assert.match(attacks, /steady_aim/)
assert.doesNotMatch(
  attacks,
  /hasSteadyAim=\{\s*tceAllowed && combatFeatures\.some/,
)
assert.ok(TURN_ACTION_CATALOG.some((r) => r.id === 'gwm_finish' && r.tier === 'personal'))

// Nat 1 → no smite offer, no spend path
const nat1 = resolveSmiteAfterAttack({ naturalDie: 1 })
assert.equal(nat1.offer, false)
assert.equal(nat1.autoMiss, true)
assert.equal(nat1.crit, false)

// Nat 20 → crit + offer
const nat20 = resolveSmiteAfterAttack({ naturalDie: 20 })
assert.equal(nat20.offer, true)
assert.equal(nat20.crit, true)
assert.equal(nat20.autoMiss, false)

// Existing crit flag wins with normal die
const flagged = resolveSmiteAfterAttack({ naturalDie: 15, critFlag: true })
assert.equal(flagged.crit, true)
assert.equal(flagged.offer, true)

// Table miss
const miss = resolveSmiteAfterAttack({ tableMiss: true, naturalDie: 18 })
assert.equal(miss.autoMiss, true)
assert.equal(miss.offer, false)

// Crit doubles smite dice (already via rollDamage)
const spend = {
  label_ru: 'Божественная кара',
  min_slot: 1,
  max_slot: 5,
  dice_base: 2,
  dice_per_slot_above: 1,
  dice_cap: 5,
  dice_size: 8,
}
const critLine = formatDivineSmiteExtra({
  spend,
  slotLevel: 1,
  vsUndeadOrFiend: false,
  crit: true,
  rng: (() => {
    const values = [0, 0.25, 0.5, 0.75]
    let i = 0
    return () => values[i++] ?? 0
  })(),
})
assert.match(critLine, /4d8:/)
assert.match(critLine, /крит/)

const critRoll = rollDivineSmiteExtra({
  spend,
  slotLevel: 1,
  vsUndeadOrFiend: false,
  crit: true,
  rng: () => 0,
})
assert.ok(critRoll)
assert.match(critRoll.chip, /излучением/)

// Circles with max=0 hidden
const levels = divineSmitePresentLevels(spend, {
  '1': { max: 4, used: 1 },
  '2': { max: 2, used: 2 },
  '3': { max: 0, used: 0 },
})
assert.deepEqual(levels, [1, 2])

// Rogue 5: Хитрое действие только в Бонусном; Точное прицеливание — Бонусное; Увёртливость — Реакция
assert.deepEqual(cunningActionGroups(), ['bonus'])
const bonusIds = catalogRowsForGroup('bonus').map((r) => r.id)
assert.ok(bonusIds.includes('cunning_hide'))
assert.ok(bonusIds.includes('cunning_dash'))
assert.ok(bonusIds.includes('steady_aim'))
assert.ok(bonusIds.includes('two_weapon'))
assert.ok(bonusIds.includes('gwm_bonus'))
assert.ok(bonusIds.includes('gwm_finish'))
assert.ok(bonusIds.includes('shield_shove'))

const actionIds = catalogRowsForGroup('action').map((r) => r.id)
assert.ok(actionIds.includes('dash'))
assert.ok(actionIds.includes('search'))
assert.ok(actionIds.includes('hide'))
assert.ok(!actionIds.includes('cunning_hide'))
assert.ok(!actionIds.includes('cunning_dash'))
assert.ok(!actionIds.includes('steady_aim'))

const reactionIds = catalogRowsForGroup('reaction').map((r) => r.id)
assert.ok(reactionIds.includes('opportunity'))
assert.ok(reactionIds.includes('uncanny_dodge'))
assert.ok(reactionIds.includes('interception'))
assert.ok(reactionIds.includes('parry'))

assert.ok(TURN_ACTION_CATALOG.some((r) => r.id === 'blind_sight' && r.tier === 'info'))
assert.ok(TURN_ACTION_CATALOG.some((r) => r.id === 'gwm_finish' && r.group === 'bonus'))
assert.ok(TURN_ACTION_CATALOG.some((r) => r.id === 'overrun' && r.tier === 'more'))
assert.ok(
  TURN_ACTION_CATALOG.every(
    (r) => !r.id.startsWith('cunning_') || (r.group === 'bonus' && !r.alsoGroup),
  ),
)

console.log('cmb02SmiteTurn.selfcheck ok')
