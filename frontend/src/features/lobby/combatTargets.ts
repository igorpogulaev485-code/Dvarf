/** S-04: общие цели боя для атаки врага и контракта T-01/T-02. */

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
  /** Крючок S-05: party | enemies | … */
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

/** Локальная сборка целей из SessionDetail (пока API не ответил / офлайн). */
export function targetsFromSession(detail: {
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
    members?: Array<{
      id: string
      name: string
      hp_current: number
      hp_max: number
    }> | null
    hp_current?: number | null
    hp_max?: number | null
  }> | null
}): CombatTarget[] {
  const out: CombatTarget[] = []
  for (const seat of detail.seats ?? []) {
    out.push({
      id: seat.character_id,
      kind: 'pc',
      ref_id: seat.character_id,
      name: seat.character_name,
      hp_current: seat.hp_current,
      hp_max: seat.hp_max,
      ac: seat.ac,
      conditions: seat.conditions ?? [],
      side: 'party',
      is_ally: true,
    })
    for (const c of seat.companions ?? []) {
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
        side: 'party',
        is_ally: true,
      })
    }
  }
  for (const enemy of detail.combatants ?? []) {
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
          side: 'enemies',
          is_ally: false,
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
        side: 'enemies',
        is_ally: false,
      })
    }
  }
  return out
}
