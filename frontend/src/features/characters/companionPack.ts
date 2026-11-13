/**
 * C-03: pack companions («Волк ×8») — one card, shared initiative, HP dots.
 */

import {
  createCompanion,
  packDisplayName,
  type CompanionEntry,
  type CompanionPackState,
  type CompanionSource,
} from './companions'

export function buildCompanionPack(input: {
  unitNameRu: string
  count: number
  unitHpMax: number
  memberHp?: number[]
}): CompanionPackState {
  const member_count = Math.max(1, Math.floor(input.count))
  const unit_hp_max = Math.max(1, Math.floor(input.unitHpMax))
  const member_hp =
    input.memberHp && input.memberHp.length
      ? input.memberHp
          .map((v) => Math.max(0, Math.floor(v)))
          .slice(0, member_count)
      : Array.from({ length: member_count }, () => unit_hp_max)
  while (member_hp.length < member_count) member_hp.push(unit_hp_max)
  const alive = member_hp.filter((hp) => hp > 0)
  return {
    member_count,
    alive_count: alive.length,
    member_hp: alive,
    unit_name_ru: input.unitNameRu.trim() || 'Существо',
    unit_hp_max,
  }
}

export function companionPackHpTotal(pack: CompanionPackState | null | undefined): number {
  if (!pack) return 0
  return pack.member_hp.reduce((sum, hp) => sum + Math.max(0, hp), 0)
}

export function companionPackHpMaxTotal(pack: CompanionPackState | null | undefined): number {
  if (!pack) return 0
  return pack.unit_hp_max * pack.member_count
}

/** Damage the pack: knock out members at 0 HP one by one (current member first). */
export function applyDamageToCompanionPack(
  pack: CompanionPackState,
  damage: number,
): CompanionPackState {
  const dmg = Math.max(0, Math.floor(damage))
  if (dmg <= 0) return pack
  let remaining = dmg
  const nextHp = [...pack.member_hp]
  for (let i = 0; i < nextHp.length && remaining > 0; i += 1) {
    const cur = nextHp[i]!
    if (cur <= 0) continue
    const taken = Math.min(cur, remaining)
    nextHp[i] = cur - taken
    remaining -= taken
  }
  const alive = nextHp.filter((hp) => hp > 0)
  return {
    ...pack,
    alive_count: alive.length,
    member_hp: alive,
  }
}

export function healCompanionPack(
  pack: CompanionPackState,
  amount: number,
): CompanionPackState {
  const heal = Math.max(0, Math.floor(amount))
  if (heal <= 0) return pack
  const next = pack.member_hp.map((hp) =>
    Math.min(pack.unit_hp_max, hp + heal),
  )
  // Do not revive dead members on heal — only living dots.
  return {
    ...pack,
    alive_count: next.length,
    member_hp: next,
  }
}

export function syncCompanionNameWithPack(row: CompanionEntry): CompanionEntry {
  if (!row.pack) return row
  const name = packDisplayName(row.pack.unit_name_ru, row.pack.alive_count)
  const hp = companionPackHpTotal(row.pack)
  const hp_max = companionPackHpMaxTotal(row.pack)
  return {
    ...row,
    name,
    stats: { ...row.stats, hp, hp_max },
    active: row.pack.alive_count > 0 ? row.active : false,
  }
}

export function createPackCompanion(input: {
  unitNameRu: string
  count: number
  unitHpMax: number
  ac: number | null
  speed?: number | null
  dex?: number | null
  str?: number | null
  con?: number | null
  int?: number | null
  actions?: string
  notes?: string
  source: CompanionSource
  nature?: CompanionEntry['nature']
  initiativeMode?: CompanionEntry['initiativeMode']
  commandCost?: CompanionEntry['commandCost']
  bestiary_ref?: string | null
  bestiary_name_ru?: string | null
  undead_control?: CompanionEntry['undead_control']
  kind?: CompanionEntry['kind']
}): CompanionEntry {
  const pack = buildCompanionPack({
    unitNameRu: input.unitNameRu,
    count: input.count,
    unitHpMax: input.unitHpMax,
  })
  const base = createCompanion({
    kind: input.kind ?? 'other',
    name: packDisplayName(pack.unit_name_ru, pack.alive_count),
    nature: input.nature ?? 'summoned',
    active: true,
    initiativeMode: input.initiativeMode,
    commandCost: input.commandCost,
    source: input.source,
    bestiary_ref: input.bestiary_ref ?? null,
    bestiary_name_ru: input.bestiary_name_ru ?? input.unitNameRu,
    stats: {
      hp: companionPackHpTotal(pack),
      hp_max: companionPackHpMaxTotal(pack),
      ac: input.ac,
      speed: input.speed ?? null,
      dex: input.dex ?? null,
      str: input.str ?? null,
      con: input.con ?? null,
      int: input.int ?? null,
    },
    actions: input.actions ?? '',
    notes: input.notes ?? '',
    pack,
    undead_control: input.undead_control ?? null,
  })
  return syncCompanionNameWithPack(base)
}

/** Set absolute pack alive count (e.g. after picker). */
export function resizeCompanionPack(
  row: CompanionEntry,
  aliveCount: number,
): CompanionEntry {
  if (!row.pack) return row
  const count = Math.max(0, Math.floor(aliveCount))
  const member_hp = Array.from(
    { length: count },
    (_, i) => row.pack!.member_hp[i] ?? row.pack!.unit_hp_max,
  )
  const pack: CompanionPackState = {
    ...row.pack,
    member_count: Math.max(row.pack.member_count, count),
    alive_count: count,
    member_hp,
  }
  return syncCompanionNameWithPack({ ...row, pack, active: count > 0 })
}
