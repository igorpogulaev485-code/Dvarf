/**
 * 2024 bard on the combat stage: Bardic Inspiration, Font of Inspiration (slot → use),
 * Valor Extra Attack cantrip hint, Dance Bardic Damage formula. Edition 2024 only.
 */
import { Button, Text } from '../../ui'
import {
  BARD_SUBCLASS_SLUGS_2024,
  FONT_OF_INSPIRATION_MIN_LEVEL_2024,
  SUBCLASS_L6_2024,
  VALOR_EXTRA_ATTACK_RULE_RU_2024,
  bardicInspirationDieLabelRu2024,
  danceBardicDamageFormulaRu2024,
} from '../../shared/dnd/bard2024Features'
import { resolveClassFeatureSlug } from '../../shared/dnd/classFeatures'
import { parseFeatureResourceId } from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import type { ClassLevelEntry } from './classLevels'
import type { BardFeatureRequest } from './Bard2024UseDialog'

export type Bard2024CombatBlockProps = {
  rulesEdition: string | null | undefined
  classes: ClassLevelEntry[]
  subclassSlugByEntryId: Record<string, string | null | undefined>
  resources: SheetResource[]
  dexMod: number
  danceActive: boolean
  onBardFeatureUse: (request: BardFeatureRequest) => void
}

export function Bard2024CombatBlock({
  rulesEdition,
  classes,
  subclassSlugByEntryId,
  resources,
  dexMod,
  danceActive,
  onBardFeatureUse,
}: Bard2024CombatBlockProps) {
  if (String(rulesEdition || '') !== '2024') return null
  const bard = classes.find((row) => resolveClassFeatureSlug(row.name) === 'bard' && row.level > 0)
  if (!bard) return null
  const level = bard.level
  const subclass = String(subclassSlugByEntryId[bard.id] || bard.subclass_catalog_id || '')
  const pool = resources.find(
    (row) =>
      /:bardic_inspiration:/.test(row.id) ||
      /бардовское вдохновение|bardic inspiration/i.test(row.name),
  )
  const parsed = pool ? parseFeatureResourceId(pool.id) : null
  const left = pool ? Math.max(0, pool.max - pool.used) : 0
  const valorExtraAttack = subclass === BARD_SUBCLASS_SLUGS_2024.valor && level >= SUBCLASS_L6_2024
  const dance = subclass === BARD_SUBCLASS_SLUGS_2024.dance && danceActive

  function open(featureId: string, name: string) {
    if (!pool || !parsed) return
    onBardFeatureUse({
      featureId,
      resourceId: pool.id,
      classSlug: parsed.classSlug,
      classEntryId: parsed.classEntryId,
      name,
    })
  }

  return (
    <div className="feature-resource" data-testid="bard-2024-combat">
      <Text as="h3">
        Бард · {bardicInspirationDieLabelRu2024(level)}
        {pool ? ` · вдохновение ${left}/${pool.max}` : ''}
      </Text>
      {pool && parsed ? (
        <div className="feature-resource__actions">
          <Button
            type="button"
            data-testid="bard-combat-inspire"
            onClick={() => open('bardic-inspiration', 'Бардовское вдохновение')}
          >
            Даровать вдохновение…
          </Button>
          {level >= FONT_OF_INSPIRATION_MIN_LEVEL_2024 ? (
            <Button
              type="button"
              variant="secondary"
              data-testid="bard-combat-font"
              onClick={() => open('font-of-inspiration', 'Источник вдохновения')}
            >
              Ячейка → вдохновение…
            </Button>
          ) : null}
        </div>
      ) : null}
      {valorExtraAttack ? (
        <Text tone="muted" data-testid="bard-valor-extra-attack">
          Дополнительная атака (Доблесть): {VALOR_EXTRA_ATTACK_RULE_RU_2024}
        </Text>
      ) : null}
      {dance ? (
        <Text tone="muted" data-testid="bard-dance-damage">
          Бардовский урон (Танец), безоружный удар: {danceBardicDamageFormulaRu2024(level, dexMod)}
        </Text>
      ) : null}
    </div>
  )
}
