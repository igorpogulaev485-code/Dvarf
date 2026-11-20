/**
 * 2024 book-wizard combat hints (Bladesinger Extra Attack / Song of Victory / weapon focus).
 * Edition 2024 only — does not feed the 2014 bladesinging pack.
 */
import { Text } from '../../ui'
import { resolveClassFeatureSlug } from '../../shared/dnd/classFeatures'
import {
  BLADESINGER_EXTRA_ATTACK_RULE_RU_2024,
  BLADESINGER_SONG_OF_DEFENSE_RULE_RU_2024,
  BLADESINGER_SONG_OF_VICTORY_RULE_RU_2024,
  BLADESINGER_WEAPON_FOCUS_RULE_RU_2024,
  isBladesongActive2024,
} from '../../shared/dnd/wizardBook2024Features'
import type { SheetResource } from '../../shared/dnd/rest'
import type { ClassLevelEntry } from './classLevels'

export type Wizard2024CombatBlockProps = {
  rulesEdition: string | null | undefined
  classes: ClassLevelEntry[]
  subclassSlugByEntryId: Record<string, string | null | undefined>
  resources: SheetResource[]
}

export function Wizard2024CombatBlock({
  rulesEdition,
  classes,
  subclassSlugByEntryId,
  resources,
}: Wizard2024CombatBlockProps) {
  if (String(rulesEdition || '') !== '2024') return null
  const wizard = classes.find(
    (row) => resolveClassFeatureSlug(row.name) === 'wizard' && row.level > 0,
  )
  if (!wizard) return null
  const subclass = String(
    subclassSlugByEntryId[wizard.id] || wizard.subclass_catalog_id || '',
  ).toLowerCase()
  if (subclass !== 'wizard__bladesinger') return null
  const level = wizard.level
  const songActive = isBladesongActive2024(resources)
  const extraAttack = level >= 6
  const songOfDefense = level >= 10
  const songOfVictory = level >= 14
  if (!extraAttack && !songOfDefense && !songOfVictory && level < 3) return null

  return (
    <div className="feature-resource" data-testid="wizard-2024-bladesinger-combat">
      <Text as="h3">Певец клинка{songActive ? ' · Песнь активна' : ''}</Text>
      {level >= 3 ? (
        <Text tone="muted" data-testid="wizard-bladesinger-weapon-focus">
          {BLADESINGER_WEAPON_FOCUS_RULE_RU_2024}
        </Text>
      ) : null}
      {extraAttack ? (
        <Text tone="muted" data-testid="wizard-bladesinger-extra-attack">
          Доп. атака: {BLADESINGER_EXTRA_ATTACK_RULE_RU_2024}
        </Text>
      ) : null}
      {songOfDefense ? (
        <Text tone="muted" data-testid="wizard-bladesinger-song-of-defense">
          {BLADESINGER_SONG_OF_DEFENSE_RULE_RU_2024}
        </Text>
      ) : null}
      {songOfVictory ? (
        <Text tone="muted" data-testid="wizard-bladesinger-song-of-victory">
          Песнь победы: {BLADESINGER_SONG_OF_VICTORY_RULE_RU_2024}
        </Text>
      ) : null}
    </div>
  )
}
