/** Short meta lines for create-pipeline catalog cards (race / background). */

import type { CatalogEntry } from '../../shared/api/catalog'
import { resolveBackgroundGrantDef } from '../../shared/dnd/backgroundGrants'
import { resolveRaceGrantDef } from '../../shared/dnd/raceGrants'
import { ABILITY_LABELS, SKILL_DEFS, type AbilityKey } from '../characters/sheetTypes'

function skillLabel(key: string): string {
  return SKILL_DEFS.find((row) => row.key === key)?.label ?? key
}

export function raceCardMeta(entry: CatalogEntry): string {
  const def = resolveRaceGrantDef({
    raceName: entry.name_ru,
    catalogSlug: entry.slug,
    catalogData: entry.data,
    nameRu: entry.name_ru,
  })
  if (!def) return ''

  const fixed = (Object.entries(def.abilityBonuses) as [AbilityKey, number][])
    .filter(([, value]) => value)
    .map(([key, value]) => `${ABILITY_LABELS[key] ?? key}+${value}`)
  const asi = fixed.length
    ? fixed.join(', ')
    : def.abilityBonusChoices
      ? 'ASI гибкий'
      : null

  const speed = `${def.speed} фт`
  const darkvision = def.darkvision ? `ТЗ ${def.darkvision}` : 'ТЗ нет'
  return [asi, speed, darkvision].filter(Boolean).join(' · ')
}

export function backgroundCardMeta(entry: CatalogEntry): string {
  const def = resolveBackgroundGrantDef({
    backgroundName: entry.name_ru,
    catalogSlug: entry.slug,
    catalogData: entry.data,
  })
  if (!def) return ''

  if (def.skillProficiencies.length) {
    return def.skillProficiencies.map(skillLabel).join(', ')
  }
  if (def.skillChoices) {
    return `навыки: выбрать ${def.skillChoices.count}`
  }
  return ''
}
