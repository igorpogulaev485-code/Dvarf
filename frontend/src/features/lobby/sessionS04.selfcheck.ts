import { targetsFromSession } from './combatTargets'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

function blockFromKitKind(kind: string): string {
  if (kind === 'бонус') return 'bonus_actions'
  if (kind === 'реакция') return 'reactions'
  if (kind === 'легенд.') return 'legendary_actions'
  if (kind === 'черта') return 'traits'
  return 'actions'
}

const targets = targetsFromSession({
  seats: [
    {
      character_id: 'pc1',
      character_name: 'Торин',
      hp_current: 20,
      hp_max: 30,
      ac: 16,
      companions: [{ id: 'c1', name: 'Волк', hp_current: 11, hp_max: 11 }],
    },
  ],
  combatants: [
    {
      id: 'e1',
      name: 'Огр',
      ac: 11,
      members: [
        { id: 'm1', name: 'Огр', hp_current: 40, hp_max: 59 },
        { id: 'm2', name: 'Огр 2', hp_current: 0, hp_max: 59 },
      ],
    },
  ],
  combat: {
    entries: [
      { kind: 'pc', ref_id: 'pc1', side: 'party' },
      { kind: 'companion', ref_id: 'pc1', companion_id: 'c1', side: 'party' },
      { kind: 'enemy', ref_id: 'e1', side: 'enemies' },
    ],
  },
})

assert(targets.some((t) => t.kind === 'pc' && t.name === 'Торин'), 'pc target')
assert(targets.some((t) => t.kind === 'companion'), 'companion target')
assert(targets.some((t) => t.kind === 'enemy' && t.name === 'Огр'), 'living enemy')
assert(!targets.some((t) => t.name === 'Огр 2'), 'dead enemy excluded')
assert(targets.find((t) => t.name === 'Торин')?.is_ally === true, 'pc ally')
assert(targets.find((t) => t.name === 'Огр')?.is_ally === false, 'enemy not ally')
assert(blockFromKitKind('бонус') === 'bonus_actions', 'kit kind map')
assert(blockFromKitKind('действие') === 'actions', 'action kit')

console.log('sessionS04.selfcheck: ok')
