/** S-04/S-05: общие цели боя для атаки врага и контракта T-01/T-02. */

import {
  SIDE_ENEMIES,
  SIDE_PARTY,
  defaultSideForKind,
  findEntrySide,
  foesOf,
  isAllySide,
} from './combatSides'

export type CombatTargetKind = 'pc' | 'companion' | 'enemy'

export type CombatTarget = {
  id: string
  kind: CombatTargetKind
  ref_id: string
  name: string
  hp_current?: number | null
  hp_max?: number | null
  ac?: number | null
  conditions?: unknown[]
  /** S-05: party | enemies | … */
  side: string
  is_ally: boolean
  user_id?: string | null
  companion_id?: string | null
  member_id?: string | null
}

export type CombatTargetsPayload = {
  session_id: string
  dice_on_table: boolean
  waiting_reaction: boolean
  targets: CombatTarget[]
}

export { alliesOf, foesOf, isAllySide, SIDE_PARTY, SIDE_ENEMIES } from './combatSides'

/** Локальная сборка целей из SessionDetail (пока API не ответил / офлайн). */
export function targetsFromSession(
  detail: {
    seats?: Array<{
      character_id: string
      character_name: string
      hp_current?: number | null
      hp_max?: number | null
      ac?: number | null
      conditions?: unknown[]
      companions?: Array<{
        id: string
        name: string
        hp_current?: number | null
        hp_max?: number | null
        ac?: number | null
        conditions?: unknown[]
      }> | null
    }>
    combatants?: Array<{
      id: string
      name: string
      ac?: number | null
      conditions?: unknown[]
      side?: string | null
      members?: Array<{
        id: string
        name: string
        hp_current: number
        hp_max: number
      }> | null
      hp_current?: number | null
      hp_max?: number | null
    }> | null
    combat?: {
      entries?: Array<{
        kind: string
        ref_id: string
        companion_id?: string | null
        side?: string | null
      }>
    } | null
  },
  opts?: { actorSide?: string | null },
): CombatTarget[] {
  const actorSide = opts?.actorSide ?? SIDE_PARTY
  const combat = detail.combat
  const out: CombatTarget[] = []
  for (const seat of detail.seats ?? []) {
    const side = findEntrySide(combat, 'pc', seat.character_id)
    out.push({
      id: seat.character_id,
      kind: 'pc',
      ref_id: seat.character_id,
      name: seat.character_name,
      hp_current: seat.hp_current,
      hp_max: seat.hp_max,
      ac: seat.ac,
      conditions: seat.conditions ?? [],
      side,
      is_ally: isAllySide(actorSide, side),
    })
    for (const c of seat.companions ?? []) {
      const cSide = findEntrySide(combat, 'companion', seat.character_id, c.id)
      out.push({
        id: `${seat.character_id}:${c.id}`,
        kind: 'companion',
        ref_id: seat.character_id,
        companion_id: c.id,
        name: c.name,
        hp_current: c.hp_current,
        hp_max: c.hp_max,
        ac: c.ac,
        conditions: c.conditions ?? [],
        side: cSide,
        is_ally: isAllySide(actorSide, cSide),
      })
    }
  }
  for (const enemy of detail.combatants ?? []) {
    const eSide =
      findEntrySide(combat, 'enemy', enemy.id) ||
      enemy.side ||
      defaultSideForKind('enemy')
    const members = enemy.members?.length
      ? enemy.members.filter((m) => m.hp_current > 0)
      : null
    if (members && members.length > 0) {
      for (const m of members) {
        out.push({
          id: `${enemy.id}:${m.id}`,
          kind: 'enemy',
          ref_id: enemy.id,
          member_id: m.id,
          name: m.name,
          hp_current: m.hp_current,
          hp_max: m.hp_max,
          ac: enemy.ac,
          conditions: enemy.conditions ?? [],
          side: eSide,
          is_ally: isAllySide(actorSide, eSide),
        })
      }
    } else {
      out.push({
        id: enemy.id,
        kind: 'enemy',
        ref_id: enemy.id,
        name: enemy.name,
        hp_current: enemy.hp_current,
        hp_max: enemy.hp_max,
        ac: enemy.ac,
        conditions: enemy.conditions ?? [],
        side: eSide,
        is_ally: isAllySide(actorSide, eSide),
      })
    }
  }
  return out
}

/** Цели по умолчанию для атаки врага: не своей стороны (обычно не партия). */
export function defaultHostileTargets(
  targets: CombatTarget[],
  attackerSide: string = SIDE_ENEMIES,
): CombatTarget[] {
  return foesOf(targets, attackerSide)
}
