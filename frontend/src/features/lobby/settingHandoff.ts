/** T1: handoff со стола → страница сеттинга. */

import type { SessionCombatant, SettingPageKind } from '../../shared/api/lobbies'

export type SettingHandoffDraft = {
  title: string
  page_kind: SettingPageKind
  body: string
  gm_body: string
  tags: string[]
  fields: Record<string, string | number | boolean | null>
}

/** Черновик НПС/локации из карточки противника. */
export function draftFromCombatant(
  combatant: SessionCombatant,
  opts?: { sessionName?: string | null },
): SettingHandoffDraft {
  const sessionName = opts?.sessionName?.trim() || null
  const meta: string[] = []
  if (combatant.cr) meta.push(`CR ${combatant.cr}`)
  if (combatant.type_ru) meta.push(combatant.type_ru)
  if (combatant.source_book) meta.push(combatant.source_book)
  if (combatant.custom) meta.push('свой НПС')

  const stats: string[] = []
  if (combatant.ac != null) stats.push(`КД ${combatant.ac}`)
  if (combatant.speed != null) stats.push(`${combatant.speed} фт`)
  if (combatant.hp_max) stats.push(`HP ${combatant.hp_max}`)

  const lines = [
    sessionName ? `Сохранено со стола · сессия «${sessionName}».` : 'Сохранено со стола.',
    meta.length ? meta.join(' · ') : '',
    stats.length ? stats.join(' · ') : '',
  ].filter(Boolean)

  return {
    title: combatant.name.trim() || 'Без имени',
    page_kind: 'npc',
    body: lines.join('\n'),
    gm_body: '',
    tags: ['стол'],
    fields: {
      role: combatant.type_ru || (combatant.custom ? 'НПС' : 'Противник'),
      disposition: 'враждебный',
      hooks: '',
      secrets: '',
    },
  }
}
