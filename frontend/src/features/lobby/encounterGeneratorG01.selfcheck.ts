/**
 * G-01 selfcheck: мета генератора + контракт высадки.
 * Run: npx tsx frontend/src/features/lobby/encounterGeneratorG01.selfcheck.ts
 */

import {
  ENCOUNTER_COMPOSITIONS,
  ENCOUNTER_ENEMY_CASTERS,
  ENCOUNTER_FLYERS,
  ENCOUNTER_WAVE_PROFILES,
} from './encounterGeneratorMeta'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(
  ENCOUNTER_COMPOSITIONS.map((c) => c.id).join(',') === 'horde,boss,mixed',
  '§5 order: толпа / босс / смешанный',
)
assert(ENCOUNTER_WAVE_PROFILES.some((p) => p.id === 'escalation'), 'escalation profile')
assert(ENCOUNTER_FLYERS[0]?.id === 'auto', 'flyers default auto first')
assert(
  ENCOUNTER_ENEMY_CASTERS.every((c) => c.id !== 'some'),
  'enemy_casters must not use ambiguous some',
)
assert(
  ENCOUNTER_ENEMY_CASTERS.map((c) => c.id).join(',') === 'none,any,several',
  'casters order: нет / как выйдет / несколько',
)

type DeployPick = {
  waveIndex: number
  boss: { slug: string } | null
  pack: { slug: string } | null
  packCount: number
}

function rolesForPick(pick: DeployPick): Array<{ slug: string; count: number }> {
  const roles: Array<{ slug: string; count: number }> = []
  if (pick.boss) roles.push({ slug: pick.boss.slug, count: 1 })
  if (pick.pack && pick.packCount >= 1) {
    roles.push({ slug: pick.pack.slug, count: pick.packCount })
  }
  return roles
}

assert(
  rolesForPick({
    waveIndex: 1,
    boss: null,
    pack: { slug: 'goblin' },
    packCount: 6,
  }).length === 1,
  'horde deploy = pack only',
)
assert(
  rolesForPick({
    waveIndex: 1,
    boss: { slug: 'orc-war' },
    pack: null,
    packCount: 0,
  }).length === 1,
  'boss deploy = boss only',
)

console.log('encounterGeneratorG01.selfcheck: ok')
