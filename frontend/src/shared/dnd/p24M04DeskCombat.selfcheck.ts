/**
 * P24-M04 selfcheck: surprise / heroic / rest wiring invariants.
 * Run: npx --yes tsx src/shared/dnd/p24M04DeskCombat.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join as pathJoin } from 'node:path'
import {
  initiativeModeWithSurprise2024,
  surpriseRoundAllowed,
  usesSurpriseInitiativeDisadvantage,
} from './surprise2024.ts'
import {
  canSpendHeroicInspiration,
  grantHeroicInspiration,
  spendHeroicInspiration,
  usesHeroicInspiration,
} from './heroicInspiration.ts'
import { applyLongRest } from './rest.ts'
import { RULES_EDITION_2024_OPEN } from './rulesEdition2024.ts'

assert.equal(RULES_EDITION_2024_OPEN, false, 'flag stays closed')

assert.equal(initiativeModeWithSurprise2024('normal', true), 'disadvantage')
assert.equal(surpriseRoundAllowed('2024'), false)
assert.equal(surpriseRoundAllowed('2014'), true)
assert.equal(usesSurpriseInitiativeDisadvantage('2024'), true)

assert.ok(usesHeroicInspiration('2024'))
assert.ok(!usesHeroicInspiration('2014'))
assert.ok(canSpendHeroicInspiration(true))
assert.equal(spendHeroicInspiration(true).ok, true)
assert.equal(grantHeroicInspiration({ current: true }).ok, false)
assert.equal(
  grantHeroicInspiration({ current: true, allyIdWithout: 'ally' }).transferred,
  true,
)

const rest24 = applyLongRest({
  resources: [],
  slots: {},
  pact_slots: null,
  exhaustion: 1,
  hp_max: 20,
  hp_current: 5,
  hit_dice_current: 0,
  hit_dice_max: 8,
  rules_edition: '2024',
})
assert.equal(rest24.hit_dice_current, 8, '2024 restores all dice')

const rest14 = applyLongRest({
  resources: [],
  slots: {},
  pact_slots: null,
  exhaustion: 1,
  hp_max: 20,
  hit_dice_current: 0,
  hit_dice_max: 8,
  rules_edition: '2014',
})
assert.equal(rest14.hit_dice_current, 4, '2014 half dice')

const root = pathJoin(process.cwd(), 'src')
const startCombat = readFileSync(
  pathJoin(root, 'features/lobby/StartCombatDialog.tsx'),
  'utf8',
)
assert.match(startCombat, /SURPRISE_2024_HINT/)
assert.match(startCombat, /rulesEdition/)

const addCombatant = readFileSync(
  pathJoin(root, 'features/lobby/AddCombatantDialog.tsx'),
  'utf8',
)
assert.match(addCombatant, /catalogEdition/)
assert.doesNotMatch(addCombatant, /edition="2014"/)

const combatEditor = readFileSync(
  pathJoin(root, 'features/lobby/CombatPageEditor.tsx'),
  'utf8',
)
assert.match(combatEditor, /rulesEdition/)
assert.match(combatEditor, /catalogEdition/)
assert.doesNotMatch(combatEditor, /edition="2014"/)

const companionDialog = readFileSync(
  pathJoin(root, 'features/lobby/AddStoryCompanionDialog.tsx'),
  'utf8',
)
assert.match(companionDialog, /rulesEdition/)
assert.match(companionDialog, /catalogEdition/)
assert.doesNotMatch(companionDialog, /edition="2014"/)

const sessionDetail = readFileSync(
  pathJoin(root, 'pages/SessionDetailPage.tsx'),
  'utf8',
)
assert.match(
  sessionDetail,
  /InitiativeRollDialog[\s\S]*rulesEdition=\{session\.rules_edition/,
)

const part4 = readFileSync(
  pathJoin(root, 'features/characters/minimalSheet/useSheetEditorPart4.ts'),
  'utf8',
)
assert.match(part4, /tryGrantHeroicInspiration/)
assert.match(part4, /openHeroicTransfer/)

const deskHost = readFileSync(
  pathJoin(root, 'features/characters/TurnEconomyDeskHost.tsx'),
  'utf8',
)
assert.match(deskHost, /deskHeroicAllies/)

const joinPage = readFileSync(pathJoin(root, 'pages/JoinLobbyPage.tsx'), 'utf8')
assert.match(joinPage, /lobby_rules_edition_mismatch/)
assert.match(joinPage, /seatableCharacters/)

const rolls = readFileSync(
  pathJoin(root, 'features/characters/minimalSheet/SheetDialogsRolls.tsx'),
  'utf8',
)
assert.match(rolls, /postSheetRollToSession/)
assert.match(rolls, /Героическое вдохновение/)

console.log('p24M04DeskCombat.selfcheck: ok')
