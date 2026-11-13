/**
 * O-01: filter TCE ids out of feature-choice option lists when the lobby
 * book is off. Already-selected ids stay visible.
 */

import { isTceFightingStyle } from './fightingStyles'
import { isTceManeuver } from './battleMasterManeuvers'
import { isTceMetamagic } from './sorcererMetamagic'
import { isTceInvocation, isTcePactBoon } from './warlockInvocations'
import { tceOptionVisible } from './tceOptions'

export type TceCatalogKind =
  | 'fighting_style'
  | 'maneuver'
  | 'metamagic'
  | 'invocation'
  | 'pact_boon'

export function isTceCatalogOption(kind: TceCatalogKind, id: string): boolean {
  switch (kind) {
    case 'fighting_style':
      return isTceFightingStyle(id)
    case 'maneuver':
      return isTceManeuver(id)
    case 'metamagic':
      return isTceMetamagic(id)
    case 'invocation':
      return isTceInvocation(id)
    case 'pact_boon':
      return isTcePactBoon(id)
  }
}

export function catalogKindForOptionsFrom(
  optionsFrom: string | undefined,
): TceCatalogKind | null {
  switch (optionsFrom) {
    case 'fighter_fighting_styles':
    case 'paladin_fighting_styles':
    case 'ranger_fighting_styles':
    case 'bard_swords_fighting_styles':
      return 'fighting_style'
    case 'battle_master_maneuvers':
      return 'maneuver'
    case 'sorcerer_metamagic':
      return 'metamagic'
    case 'warlock_invocations':
      return 'invocation'
    case 'warlock_pact_boons':
      return 'pact_boon'
    default:
      return null
  }
}

export function filterTceCatalogOptions(input: {
  options: string[]
  optionsFrom: string | undefined
  tceAllowed: boolean | null
  selectedIds: string[]
}): string[] {
  const kind = catalogKindForOptionsFrom(input.optionsFrom)
  if (!kind) return input.options
  const selected = new Set(input.selectedIds)
  return input.options.filter((id) => {
    if (!isTceCatalogOption(kind, id)) return true
    return tceOptionVisible({
      tceAllowed: input.tceAllowed,
      alreadySelected: selected.has(id),
    })
  })
}
