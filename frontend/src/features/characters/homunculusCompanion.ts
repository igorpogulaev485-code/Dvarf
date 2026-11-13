/**
 * C-03: Homunculus Servant (Tasha) — infusion creates/revives one construct card.
 * Never use MM Homunculus (5 HP bite).
 */

import {
  createCompanion,
  isHomunculusCompanion,
  type CompanionEntry,
} from './companions'
import { listActiveInfusionBindings } from '../../shared/dnd/infusionsActive'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import { proficiencyBonusForLevel } from './spells'

export const HOMUNCULUS_COMPANION_ID = 'infusion-companion:homunculus_servant'
export const HOMUNCULUS_FEATURE = 'homunculus_servant'

/** TCE: HP = 1 + INT mod + artificer level. */
export function homunculusServantHp(
  artificerLevel: number,
  intelligenceMod: number,
): number {
  const level = Math.max(1, Math.floor(artificerLevel) || 1)
  const intMod = Math.floor(intelligenceMod)
  return Math.max(1, 1 + intMod + level)
}

export function homunculusServantTemplate(input: {
  artificerLevel: number
  intelligenceMod: number
  characterLevel: number
  spellAttackBonus: number
}): {
  hp: number
  ac: number
  actions: string
  notes: string
  stats: CompanionEntry['stats']
} {
  const hp = homunculusServantHp(input.artificerLevel, input.intelligenceMod)
  const pb = proficiencyBonusForLevel(input.characterLevel)
  const atk = input.spellAttackBonus
  return {
    hp,
    ac: 13,
    actions: [
      `Силовой удар: +${atk} дальнобойная атака, 1к4+${pb} силового урона`,
      'Реакция «Канал магии»: доставляет заклинание касания хозяина (до 120 фт.)',
      'Без команды — Уклонение. Команда хозяина — бонусное действие.',
    ].join('\n'),
    notes:
      'Слуга-гомункул (TCE) · телепатия 1 миля · иммунитет к яду и истощению · самоцвет не ломается',
    stats: {
      hp,
      hp_max: hp,
      ac: 13,
      speed: 20,
      speed_fly: 30,
      str: 4,
      dex: 15,
      con: 12,
      int: 10,
      wis: 10,
      cha: 7,
      immunities: 'яд; истощение',
    },
  }
}

export function infusionHasHomunculus(
  featurePicks: FeaturePicksState | null | undefined,
  classEntryId: string | null | undefined,
): boolean {
  if (!classEntryId || !featurePicks) return false
  return listActiveInfusionBindings(featurePicks, classEntryId).some(
    (row) => row.infusionId === 'homunculus_servant',
  )
}

/**
 * Keep one Homunculus Servant card while infusion is active.
 * Removing infusion or 0 HP → «не призван» / «пал», card stays (Н8).
 */
export function syncHomunculusCompanion(input: {
  companions: CompanionEntry[]
  featurePicks: FeaturePicksState
  artificerClassEntryId: string | null
  artificerLevel: number
  intelligenceMod: number
  characterLevel: number
  spellAttackBonus: number
}): CompanionEntry[] {
  const active = infusionHasHomunculus(
    input.featurePicks,
    input.artificerClassEntryId,
  )
  const existing = input.companions.find(
    (row) =>
      row.id === HOMUNCULUS_COMPANION_ID || isHomunculusCompanion(row),
  )
  const template = homunculusServantTemplate({
    artificerLevel: input.artificerLevel,
    intelligenceMod: input.intelligenceMod,
    characterLevel: input.characterLevel,
    spellAttackBonus: input.spellAttackBonus,
  })

  if (!active) {
    if (!existing) return input.companions
    // Keep card, mark unsummoned (Н8). Do not delete.
    return input.companions.map((row) =>
      row.id === existing.id
        ? {
            ...row,
            active: false,
            mounted: false,
            notes: row.notes.includes('инфузия снята')
              ? row.notes
              : `${row.notes}${row.notes.trim() ? ' · ' : ''}инфузия снята`,
          }
        : row,
    )
  }

  if (existing) {
    // Revive only when was inactive due to infusion off / fallen and infusion back on.
    // Do not overwrite current HP if already active with HP set.
    const shouldRefreshStats = !existing.active || (existing.stats.hp ?? 0) <= 0
    return input.companions.map((row) => {
      if (row.id !== existing.id) return row
      if (!shouldRefreshStats) {
        return {
          ...row,
          active: true,
          source: {
            kind: 'feature',
            labelRu: 'Инфузия: Слуга-гомункул',
            feature: HOMUNCULUS_FEATURE,
          },
          initiativeMode: 'with_master',
          commandCost: 'bonus',
          nature: 'construct',
        }
      }
      return {
        ...row,
        active: true,
        death: null,
        nature: 'construct',
        initiativeMode: 'with_master',
        commandCost: 'bonus',
        source: {
          kind: 'feature',
          labelRu: 'Инфузия: Слуга-гомункул',
          feature: HOMUNCULUS_FEATURE,
        },
        stats: { ...template.stats },
        actions: template.actions,
        notes: template.notes,
      }
    })
  }

  const created = createCompanion({
    id: HOMUNCULUS_COMPANION_ID,
    kind: 'other',
    name: 'Слуга-гомункул',
    nature: 'construct',
    active: true,
    initiativeMode: 'with_master',
    commandCost: 'bonus',
    source: {
      kind: 'feature',
      labelRu: 'Инфузия: Слуга-гомункул',
      feature: HOMUNCULUS_FEATURE,
    },
    stats: template.stats,
    actions: template.actions,
    notes: template.notes,
  })
  return [...input.companions, created]
}
