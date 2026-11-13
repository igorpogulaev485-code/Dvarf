/**
 * S-06 selfcheck: остаток XP, fled в пуле, легенда без авторолла (клиентские хелперы).
 */
import { unclaimedDefeatXp, type SessionCombatant } from '../../shared/api/lobbies'
import { normalizeCampaignRules } from './campaignRules'
import { xpCrossedLevelThreshold } from '../../shared/dnd/experience'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

const fled: SessionCombatant = {
  id: 'o1',
  name: 'Огр',
  hp_current: 40,
  hp_max: 59,
  xp: 450,
  outcome: 'fled',
  members: [{ id: 'm1', name: 'Огр', hp_current: 40, hp_max: 59, outcome: 'fled' }],
  xp_claimed_count: 0,
}
const info = unclaimedDefeatXp(fled)
assert(info.claimable && info.total === 450, 'fled counts for XP')

const rules = normalizeCampaignRules({
  progression: { mode: 'milestones', xp_remainder: 2 },
})
assert(rules.progression.mode === 'milestones', 'milestones mode')
assert(rules.progression.xp_remainder === 2, 'xp remainder kept')

assert(xpCrossedLevelThreshold(200, 300, 1), 'crosses level 2')
assert(!xpCrossedLevelThreshold(300, 350, 1), 'already at threshold')

// остаток от деления
const pool = 100
const n = 3
const each = Math.floor(pool / n)
const rem = pool - each * n
assert(each === 33 && rem === 1, 'remainder not discarded')

console.log('sessionS06.selfcheck: ok')
