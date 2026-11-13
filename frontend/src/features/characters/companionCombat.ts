/**
 * C-02: initiative + command cost (Н5), dodge, dismiss, rest heal for naparniki.
 * Host turn marks come from turnEconomy — no second economy here.
 */

import {
  applyHpChange,
  createCompanion,
  deriveLegacyControl,
  emptyCompanionTurnMarks,
  isSelfForm,
  readCompanionTurnMarks,
  type CompanionCommandCost,
  type CompanionEntry,
  type CompanionInitiativeMode,
  type CompanionTurnMarks,
  defaultCombatModesForCompanion,
  mapLegacyControlToCombatModes,
  resolveCombatModesOnRead,
} from './companions'
import { isPermanentCompanionSlot, isWildfireSpiritCompanion } from './companionBackfill'

export type {
  CompanionInitiativeMode,
  CompanionCommandCost,
  CompanionTurnMarks,
}

export {
  defaultCombatModesForCompanion,
  mapLegacyControlToCombatModes,
  resolveCombatModesOnRead,
  emptyCompanionTurnMarks,
  readCompanionTurnMarks,
  deriveLegacyControl,
}

export const INITIATIVE_MODE_LABELS: Record<CompanionInitiativeMode, string> = {
  with_master: 'Ход хозяина',
  own_initiative: 'Своя инициатива',
}

export const COMMAND_COST_LABELS: Record<CompanionCommandCost, string> = {
  none: 'Команда бесплатно',
  action: 'Команда · действие',
  bonus: 'Команда · бонусное',
  reaction: 'Команда · реакция',
}

/** Short chip text for card / strip. */
export function companionCombatSummary(row: CompanionEntry): string {
  const init = INITIATIVE_MODE_LABELS[row.initiativeMode]
  const cost = COMMAND_COST_LABELS[row.commandCost]
  return `${init} · ${cost}`
}

export function companionNeedsCommand(row: CompanionEntry): boolean {
  if (isSelfForm(row)) return false
  if (!row.active) return false
  return row.commandCost === 'action' || row.commandCost === 'bonus'
}

/** Separate initiative row only for own_initiative active allies. */
export function companionGetsOwnInitiativeRow(row: {
  active?: boolean | null
  initiativeMode?: CompanionInitiativeMode | null
  role?: string | null
  kind?: string | null
}): boolean {
  if (row.active === false) return false
  if (row.role === 'self_form' || row.kind === 'transformed_self') return false
  return row.initiativeMode === 'own_initiative'
}

export function abilityModFromScore(score: number | null | undefined): number | null {
  if (score == null || !Number.isFinite(score)) return null
  return Math.floor((Number(score) - 10) / 2)
}

export function isStoryCompanion(row: CompanionEntry): boolean {
  return Boolean(row.story)
}

/** Death saves at 0 HP: story always; PHB beast / primal / drake — no (пал). */
export function companionUsesDeathSaves(row: CompanionEntry): boolean {
  if (isSelfForm(row)) return false
  if (isStoryCompanion(row)) return true
  if (
    row.kind === 'beast_companion' ||
    row.kind === 'primal_companion' ||
    row.kind === 'drake'
  ) {
    return false
  }
  return false
}

/**
 * Apply HP via C-02 death-save / fallen / dismiss semantics.
 * Prefer this over raw applyHpChange for naparnik HP edits.
 */
export function applyCompanionHpChange(
  row: CompanionEntry,
  hp: number | null,
): CompanionEntry {
  if (hp == null) {
    return { ...row, stats: { ...row.stats, hp } }
  }
  const nextHp = Math.max(0, Math.floor(hp))
  if (nextHp > 0) {
    const healed = applyHpChange(row, nextHp)
    return {
      ...healed,
      turnMarks: {
        ...readCompanionTurnMarks(row.turnMarks),
        dodge: row.turnMarks?.dodge ?? false,
      },
    }
  }

  if (isSelfForm(row)) {
    return applyHpChange(row, 0)
  }

  if (companionUsesDeathSaves(row)) {
    return {
      ...row,
      active: false,
      stats: { ...row.stats, hp: 0 },
      death: row.death ?? { successes: 0, failures: 0 },
    }
  }

  // Permanent slot (spirit, defender, drake, beast, cannon, …): fallen, stay on strip.
  if (isPermanentCompanionSlot(row) || isWildfireSpiritCompanion(row)) {
    return {
      ...row,
      active: false,
      stats: { ...row.stats, hp: 0 },
      death: null,
    }
  }

  // Temporary spell summon: dismiss (active false; strip hides).
  return {
    ...row,
    active: false,
    stats: { ...row.stats, hp: 0 },
    death: null,
  }
}

/** «Отпустить» — temp summons leave strip; permanent → не призван. */
export function dismissCompanion(row: CompanionEntry): CompanionEntry {
  if (isSelfForm(row)) return row
  if (isPermanentCompanionSlot(row) || isWildfireSpiritCompanion(row)) {
    return {
      ...row,
      active: false,
      death: null,
      turnMarks: emptyCompanionTurnMarks(),
      stats: {
        ...row.stats,
        hp: row.stats.hp_max != null ? row.stats.hp_max : row.stats.hp,
      },
    }
  }
  return {
    ...row,
    active: false,
    death: null,
    turnMarks: emptyCompanionTurnMarks(),
    stats: { ...row.stats, hp: 0 },
    notes: row.notes.includes('отпущен')
      ? row.notes
      : `${row.notes}${row.notes.trim() ? ' · ' : ''}отпущен`,
  }
}

/**
 * Host began turn: reset with_master companion marks; auto-Dodge if command needed.
 */
export function resetCompanionsForHostTurn(
  companions: CompanionEntry[],
): CompanionEntry[] {
  return companions.map((row) => {
    if (isSelfForm(row) || !row.active) return row
    if (row.initiativeMode !== 'with_master') return row
    const needs = companionNeedsCommand(row)
    return {
      ...row,
      turnMarks: {
        ...emptyCompanionTurnMarks(),
        dodge: needs,
        commanded: false,
      },
    }
  })
}

export function resetCompanionOwnTurn(row: CompanionEntry): CompanionEntry {
  if (!row.active || isSelfForm(row)) return row
  const needs = companionNeedsCommand(row)
  return {
    ...row,
    turnMarks: {
      ...emptyCompanionTurnMarks(),
      dodge: needs,
      commanded: false,
    },
  }
}

export type IssueCommandResult = {
  companion: CompanionEntry
  hostMark: 'action' | 'bonus' | 'reaction' | null
  blockedReason?: string
}

/** Mark host command + companion action; clear Dodge. */
export function issueCompanionCommand(
  row: CompanionEntry,
  hostEconomy: { action: boolean; bonus: boolean; reaction: boolean },
): IssueCommandResult {
  if (!row.active) {
    return { companion: row, hostMark: null, blockedReason: 'Напарник не активен' }
  }
  const cost = row.commandCost
  if (cost === 'action' && hostEconomy.action) {
    return {
      companion: row,
      hostMark: null,
      blockedReason: 'Действие хозяина уже потрачено',
    }
  }
  if (cost === 'bonus' && hostEconomy.bonus) {
    return {
      companion: row,
      hostMark: null,
      blockedReason: 'Бонусное хозяина уже потрачено',
    }
  }
  if (cost === 'reaction' && hostEconomy.reaction) {
    return {
      companion: row,
      hostMark: null,
      blockedReason: 'Реакция хозяина уже потрачена',
    }
  }
  const marks = readCompanionTurnMarks(row.turnMarks)
  return {
    companion: {
      ...row,
      turnMarks: {
        ...marks,
        commanded: true,
        dodge: false,
        action: true,
      },
    },
    hostMark: cost === 'none' ? null : cost,
  }
}

/** Long rest: full HP; story/beast/primal reactivate; permanent slots stay unsummoned if inactive. */
export function applyCompanionLongRestHeal(row: CompanionEntry): CompanionEntry {
  if (isSelfForm(row)) return row
  const max = row.stats.hp_max
  const healed: CompanionEntry =
    max != null
      ? { ...row, stats: { ...row.stats, hp: max }, death: null }
      : { ...row, death: null }
  if (isStoryCompanion(row)) {
    return { ...healed, active: true }
  }
  if (row.kind === 'beast_companion' || row.kind === 'primal_companion' || row.kind === 'drake') {
    return { ...healed, active: true }
  }
  // Constructs / spirit slots: HP full, active unchanged (need re-summon).
  return healed
}

/**
 * Rest heal (Н9): short → leave current HP; long → full by rule above.
 * Resources still reset via resetCompanionResourcesOnRest.
 */
export function healCompanionsOnRest(
  companions: CompanionEntry[],
  kind: 'short' | 'long',
): CompanionEntry[] {
  if (kind === 'short') return companions
  return companions.map(applyCompanionLongRestHeal)
}

/** Build a story companion from bestiary / manual fields. */
export function createStoryCompanion(input: {
  name: string
  hp: number | null
  hp_max: number | null
  ac: number | null
  speed?: number | null
  dex?: number | null
  str?: number | null
  con?: number | null
  actions?: string
  bestiary_ref?: string | null
  bestiary_name_ru?: string | null
  initiativeMode?: CompanionInitiativeMode
  commandCost?: CompanionCommandCost
}): CompanionEntry {
  const modes = {
    initiativeMode: input.initiativeMode ?? ('own_initiative' as const),
    commandCost: input.commandCost ?? ('none' as const),
  }
  return createCompanion({
    kind: 'other',
    role: 'ally',
    nature: 'living',
    name: input.name,
    story: true,
    active: true,
    initiativeMode: modes.initiativeMode,
    commandCost: modes.commandCost,
    control: deriveLegacyControl({
      initiativeMode: modes.initiativeMode,
      commandCost: modes.commandCost,
    }),
    source: { kind: 'manual', labelRu: 'Сюжетный (мастер)' },
    bestiary_ref: input.bestiary_ref ?? null,
    bestiary_name_ru: input.bestiary_name_ru ?? null,
    stats: {
      hp: input.hp,
      hp_max: input.hp_max,
      ac: input.ac,
      speed: input.speed ?? null,
      dex: input.dex ?? null,
      str: input.str ?? null,
      con: input.con ?? null,
    },
    actions: input.actions ?? '',
    turnMarks: emptyCompanionTurnMarks(),
  })
}
