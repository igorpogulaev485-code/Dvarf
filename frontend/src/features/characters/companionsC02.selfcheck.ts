/**
 * C-02 selfcheck: initiative/command defaults, HP→fallen, story death saves,
 * rest heal, dismiss, host-turn dodge.
 */
import {
  createCompanion,
  readCompanions,
  restoreCompanion,
} from './companions'
import {
  applyCompanionHpChange,
  companionGetsOwnInitiativeRow,
  companionNeedsCommand,
  companionUsesDeathSaves,
  createStoryCompanion,
  defaultCombatModesForCompanion,
  dismissCompanion,
  healCompanionsOnRest,
  issueCompanionCommand,
  resetCompanionsForHostTurn,
  resolveCombatModesOnRead,
} from './companionCombat'
import { seatCompanionInInitiativeSeed } from '../lobby/companionCombatSeat'
import type { SeatCompanion } from '../../shared/api/lobbies'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`companionsC02 selfcheck: ${msg}`)
}

// --- Н5 defaults ---
const spirit = defaultCombatModesForCompanion({ kind: 'ally' })
assert(spirit.initiativeMode === 'with_master', 'spirit init')
assert(spirit.commandCost === 'bonus', 'spirit cost')

const beast = defaultCombatModesForCompanion({ kind: 'beast_companion' })
assert(beast.commandCost === 'action', 'PHB beast action')

const primal = defaultCombatModesForCompanion({ kind: 'primal_companion' })
assert(primal.commandCost === 'bonus', 'primal bonus')

const tasha = defaultCombatModesForCompanion({
  kind: 'other',
  source: { kind: 'spell', labelRu: 'Summon Fey', feature: 'spell:summon_fey' },
})
assert(tasha.initiativeMode === 'with_master', 'tasha init')
assert(tasha.commandCost === 'none', 'tasha free')

const familiar = defaultCombatModesForCompanion({ kind: 'familiar' })
assert(familiar.initiativeMode === 'own_initiative', 'familiar own')

// --- migration: known kind fixes wrong legacy control; other kept ---
const migratedBeast = resolveCombatModesOnRead({
  kind: 'beast_companion',
  control: 'bonus_action_command', // old wrong default
  source: { kind: 'subclass', labelRu: 'Зверь', feature: 'rangers_companion' },
})
assert(migratedBeast.commandCost === 'action', 'migrate beast → action')

const keepOther = resolveCombatModesOnRead({
  kind: 'other',
  control: 'other',
  source: { kind: 'manual', labelRu: 'Вручную' },
})
assert(keepOther.initiativeMode === 'own_initiative', 'other stays mapped safely')

// --- readCompanions fills new fields ---
const fromLegacy = readCompanions([
  {
    id: 'wf1',
    kind: 'ally',
    name: 'Искра',
    control: 'own_initiative', // wrong old default for ally
    source: { kind: 'subclass', labelRu: 'Дикий огонь', feature: 'wildfire_spirit' },
    stats: { hp: 30, hp_max: 30, ac: 13, speed: 30, dex: 14 },
  },
])
assert(fromLegacy[0]!.initiativeMode === 'with_master', 'read migrates spirit init')
assert(fromLegacy[0]!.commandCost === 'bonus', 'read migrates spirit cost')

// --- seat initiative seed ---
const seatSpirit: SeatCompanion = {
  id: 'c1',
  name: 'Искра',
  hp_current: 30,
  hp_max: 30,
  ac: 13,
  dex_mod: 2,
  active: true,
  initiative_mode: 'with_master',
  command_cost: 'bonus',
  conditions: [],
}
assert(seatCompanionInInitiativeSeed(seatSpirit) === false, 'spirit no own row')

const seatWolf: SeatCompanion = {
  id: 'c2',
  name: 'Волк',
  hp_current: 11,
  hp_max: 11,
  ac: 13,
  dex_mod: 2,
  active: true,
  initiative_mode: 'own_initiative',
  command_cost: 'none',
  story: true,
  conditions: [],
}
assert(seatCompanionInInitiativeSeed(seatWolf) === true, 'story wolf own row')
assert(
  companionGetsOwnInitiativeRow({
    active: true,
    initiativeMode: 'own_initiative',
  }) === true,
  'own initiative helper',
)

// --- 0 HP ---
const aliveSpirit = createCompanion({
  kind: 'ally',
  name: 'Искра',
  active: true,
  source: { kind: 'subclass', labelRu: 'Дух', feature: 'wildfire_spirit' },
  stats: { hp: 30, hp_max: 30, ac: 13, speed: 30 },
})
const fallenSpirit = applyCompanionHpChange(aliveSpirit, 0)
assert(fallenSpirit.active === false, 'spirit inactive at 0')
assert(fallenSpirit.death == null, 'spirit no death saves')
assert(fallenSpirit.stats.hp === 0, 'spirit hp 0')

const story = createStoryCompanion({
  name: 'Волк',
  hp: 11,
  hp_max: 11,
  ac: 13,
  dex: 15,
})
assert(story.story === true, 'story flag')
assert(companionUsesDeathSaves(story) === true, 'story death saves')
const dyingStory = applyCompanionHpChange(story, 0)
assert(dyingStory.active === false, 'story inactive')
assert(dyingStory.death != null, 'story starts death track')

const tempSummon = createCompanion({
  kind: 'other',
  name: 'Фея',
  nature: 'summoned',
  active: true,
  source: { kind: 'spell', labelRu: 'Призыв феи', feature: 'spell:conjure_fey', spellId: 'x' },
  stats: { hp: 20, hp_max: 20, ac: 12, speed: 40 },
})
const gone = applyCompanionHpChange(tempSummon, 0)
assert(gone.active === false, 'temp dismiss')
const dismissed = dismissCompanion(tempSummon)
assert(dismissed.active === false, 'dismiss button')

const beastRow = createCompanion({
  kind: 'beast_companion',
  name: 'Волк',
  active: true,
  source: { kind: 'subclass', labelRu: 'Зверь', feature: 'rangers_companion' },
  stats: { hp: 11, hp_max: 11, ac: 13, speed: 40 },
})
assert(companionNeedsCommand(beastRow) === true, 'beast needs command')
assert(companionUsesDeathSaves(beastRow) === false, 'beast no death saves')

// --- command spends ---
const cmd = issueCompanionCommand(aliveSpirit, {
  action: false,
  bonus: false,
  reaction: false,
})
assert(cmd.hostMark === 'bonus', 'spirit command → bonus')
assert(cmd.companion.turnMarks.commanded === true, 'commanded')
assert(cmd.companion.turnMarks.dodge === false, 'no dodge after command')

const blocked = issueCompanionCommand(aliveSpirit, {
  action: false,
  bonus: true,
  reaction: false,
})
assert(Boolean(blocked.blockedReason), 'blocked when bonus spent')

// --- host turn dodge ---
const reset = resetCompanionsForHostTurn([aliveSpirit])
assert(reset[0]!.turnMarks.dodge === true, 'auto dodge at host turn')

// --- rest ---
const wounded = applyCompanionHpChange(
  createCompanion({
    kind: 'primal_companion',
    name: 'Зверь',
    active: true,
    source: { kind: 'subclass', labelRu: 'Спутник', feature: 'companion_type' },
    stats: { hp: 5, hp_max: 40, ac: 15, speed: 40 },
  }),
  5,
)
const afterShort = healCompanionsOnRest([wounded], 'short')
assert(afterShort[0]!.stats.hp === 5, 'short rest leaves HP')
const afterLong = healCompanionsOnRest([wounded], 'long')
assert(afterLong[0]!.stats.hp === 40, 'long rest full HP')
assert(afterLong[0]!.active === true, 'primal active after long')

const restored = restoreCompanion(fallenSpirit)
assert(restored.active === true || restored.stats.hp === 30, 'restore helper')

console.log('companionsC02.selfcheck: ok')
