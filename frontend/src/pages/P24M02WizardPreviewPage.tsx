/**
 * DEV preview for P24-M02-wizard Playwright screenshots.
 * Does not open RULES_EDITION_2024_OPEN.
 */
import { useMemo } from 'react'
import { createClassLevel } from '../shared/dnd/classLevels'
import { computeProgression2024 } from '../shared/dnd/edition2024Classes'
import {
  buildPermanentBonuses2024,
  buildSubclassResources2024,
  SUBCLASS_CATALOG_2024,
} from '../shared/dnd/edition2024Subclasses'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import {
  MEMORIZE_SPELL_NAME_RU,
  OVERCHANNEL_LEVEL_2024,
  SIGNATURE_SPELLS_NAME_RU,
  SPELL_MASTERY_NAME_RU,
  WIZARD_MEMORIZE_LEVEL_2024,
  WIZARD_SIGNATURE_LEVEL_2024,
  WIZARD_SPELL_MASTERY_LEVEL_2024,
} from '../shared/dnd/wizard2024Features'
import {
  newSlotTiersGainedAtWizardLevel,
  resolveWizardCopyMods2024,
  scrollCopyDc,
} from '../shared/dnd/wizardSpellbook2024'
import { Panel, Stack, Text } from '../ui'

const LEVELS = [1, 3, 5, 11, 20] as const
const SUBCLASSES = [
  'wizard__evoker',
  'wizard__abjurer',
  'wizard__diviner',
  'wizard__illusionist',
] as const

function WizardLevelCard({ level }: { level: number }) {
  const classes = useMemo(
    () => [
      createClassLevel({
        name: 'Волшебник',
        level,
        catalog_id: 'wizard',
        subclass_catalog_id: level >= 3 ? 'wizard__evoker' : null,
        subclass_name: level >= 3 ? 'Воплотитель' : '',
      }),
    ],
    [level],
  )
  const snap = useMemo(
    () =>
      computeProgression2024({
        classes,
        abilities: { str: 8, dex: 14, con: 14, int: 16, wis: 12, cha: 10 },
      }),
    [classes],
  )
  const sc = snap.spellcasting[0]
  const features = snap.features.filter((f) => f.source === 'class' || f.source === 'subclass')
  const recovery = snap.desiredResources.find((r) => r.pool_id === 'arcane_recovery')
  const scholar = features.find((f) => f.id === 'scholar')
  const memorize = features.find((f) => f.id === 'memorize_spell')
  const mastery = features.find((f) => f.id === 'spell_mastery')
  const signature = features.find((f) => f.id === 'signature_spells')
  const newTier = newSlotTiersGainedAtWizardLevel(level)

  return (
    <Panel>
      <div data-testid={`p24-m02-wizard-l${level}`}>
        <Text as="h2">Волшебник · ур. {level}</Text>
        <p data-testid={`p24-m02-wizard-l${level}-pb`}>БМ +{snap.proficiencyBonus}</p>
        <p data-testid={`p24-m02-wizard-l${level}-spells`}>
          заговоры {sc?.cantrips ?? 0} · подготовлено {sc?.prepared_spells ?? 0} · ячейки 1×
          {sc?.slots['1'] ?? 0}
          {sc?.slots['2'] ? ` 2×${sc.slots['2']}` : ''}
          {sc?.slots['3'] ? ` 3×${sc.slots['3']}` : ''}
          {sc?.slots['6'] ? ` 6×${sc.slots['6']}` : ''}
          {sc?.slots['9'] ? ` 9×${sc.slots['9']}` : ''}
        </p>
        <p data-testid={`p24-m02-wizard-l${level}-recovery`}>
          {recovery
            ? `${recovery.name_ru}: ${recovery.max} (${recovery.reset})`
            : 'без Магического восстановления'}
        </p>
        <ul data-testid={`p24-m02-wizard-l${level}-features`}>
          {features.slice(0, 16).map((f) => (
            <li key={`${f.id}-${f.level}`}>
              {f.name_ru}
              {f.choice ? ' · выбор' : ''}
              {f.resource?.pool_id ? ` · пул ${f.resource.pool_id}` : ''}
            </li>
          ))}
        </ul>
        <p data-testid={`p24-m02-wizard-l${level}-gates`}>
          Академические знания: {scholar ? 'есть' : 'нет'}
          {' · '}
          {MEMORIZE_SPELL_NAME_RU}:{' '}
          {level >= WIZARD_MEMORIZE_LEVEL_2024 && memorize ? 'есть' : 'нет'}
          {' · '}
          {SPELL_MASTERY_NAME_RU}:{' '}
          {level >= WIZARD_SPELL_MASTERY_LEVEL_2024 && mastery ? 'есть' : 'нет'}
          {' · '}
          {SIGNATURE_SPELLS_NAME_RU}:{' '}
          {level >= WIZARD_SIGNATURE_LEVEL_2024 && signature ? 'есть' : 'нет'}
          {' · '}
          новый круг: {newTier != null ? String(newTier) : '—'}
        </p>
      </div>
    </Panel>
  )
}

function SubclassCard({ slug, level }: { slug: string; level: number }) {
  const nameRu = SUBCLASS_CATALOG_2024[slug]?.name_ru || slug
  const classes = useMemo(
    () => [
      createClassLevel({
        name: 'Волшебник',
        level,
        catalog_id: 'wizard',
        subclass_catalog_id: slug,
        subclass_name: nameRu,
      }),
    ],
    [slug, level, nameRu],
  )
  const snap = useMemo(
    () =>
      computeProgression2024({
        classes,
        abilities: { str: 8, dex: 14, con: 14, int: 16, wis: 12, cha: 10 },
      }),
    [classes],
  )
  const pools = buildSubclassResources2024({
    subclassSlug: slug,
    classLevel: level,
    abilities: { int: 16 },
  })
  const bonuses = buildPermanentBonuses2024({
    subclassSlug: slug,
    classLevel: level,
    abilities: { int: 16 },
  })
  const sub = snap.features.filter((f) => f.source === 'subclass')
  const mods = resolveWizardCopyMods2024({ subclassSlug: slug, wizardLevel: level })
  const testId = `p24-m02-wizard-${slug}-l${level}`

  return (
    <Panel>
      <div data-testid={testId}>
        <Text as="h2">
          {nameRu} · ур. {level}
        </Text>
        <p data-testid={`${testId}-school`}>
          школа: {mods.savantLabelRu ?? '—'} · полцены: нет
        </p>
        <ul data-testid={`${testId}-features`}>
          {sub.map((f) => (
            <li key={`${f.id}-${f.level}`}>
              {f.name_ru}
              {f.resource?.pool_id ? ` · ${f.resource.pool_id}` : ''}
              {f.scaleValue ? ` · ${f.scaleValue}` : ''}
            </li>
          ))}
        </ul>
        <ul data-testid={`${testId}-resources`}>
          {pools.map((r) => (
            <li key={r.id}>
              {r.name}: {r.max} ({r.reset}
              {r.die ? `, ${r.die}` : ''})
            </li>
          ))}
          {!pools.length ? <li>без отдельного пула</li> : null}
        </ul>
        <ul data-testid={`${testId}-calcs`}>
          {bonuses.map((b) => (
            <li key={`${b.feature_id}-${b.kind}`}>
              {b.name_ru}: {b.kind}
            </li>
          ))}
          {!bonuses.length ? <li>без постоянных бонусов</li> : null}
        </ul>
        {slug === 'wizard__evoker' && level >= OVERCHANNEL_LEVEL_2024 ? (
          <p data-testid={`${testId}-overchannel`}>Перегрузка доступна</p>
        ) : null}
      </div>
    </Panel>
  )
}

export function P24M02WizardPreviewPage() {
  return (
    <main className="page page--app" data-testid="p24-m02-wizard-preview">
      <Stack gap={4}>
        <Text as="h1">P24-M02 · Волшебник 2024</Text>
        <p data-testid="p24-m02-wizard-flag">
          Флаг 2024: {RULES_EDITION_2024_OPEN ? 'открыт' : 'закрыт'}
        </p>
        <p data-testid="p24-m02-wizard-scroll-dc">
          Свиток 3 круга: Сл {scrollCopyDc(3)} (Интеллект · Тайная магия)
        </p>

        {LEVELS.map((level) => (
          <WizardLevelCard key={level} level={level} />
        ))}

        {SUBCLASSES.map((slug) => (
          <SubclassCard
            key={slug}
            slug={slug}
            level={slug === 'wizard__evoker' ? 14 : slug === 'wizard__illusionist' ? 10 : 14}
          />
        ))}
      </Stack>
    </main>
  )
}
