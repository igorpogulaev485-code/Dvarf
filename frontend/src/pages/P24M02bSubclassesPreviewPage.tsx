/**
 * DEV preview for P24-M02b Playwright: subclass resources / always-prepared / text.
 * Does not open RULES_EDITION_2024_OPEN.
 */
import { useMemo } from 'react'
import {
  computeProgression2024,
} from '../shared/dnd/edition2024Classes'
import {
  listSubclassSlugs2024,
  subclassParent2024,
  SUBCLASS_CATALOG_2024,
} from '../shared/dnd/edition2024Subclasses'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import { createClassLevel } from '../shared/dnd/classLevels'
import { Panel, Stack, Text } from '../ui'

function preview(subclassSlug: string, level: number) {
  const parent = subclassParent2024(subclassSlug) || 'fighter'
  const nameRu = SUBCLASS_CATALOG_2024[subclassSlug]?.name_ru || subclassSlug
  const parentName =
    parent === 'fighter'
      ? 'Воин'
      : parent === 'wizard'
        ? 'Волшебник'
        : parent === 'artificer'
          ? 'Артефактор'
          : parent
  return {
    nameRu,
    parent,
    classes: [
      createClassLevel({
        name: parentName,
        level,
        catalog_id: parent,
        subclass_catalog_id: level >= 3 ? subclassSlug : null,
        subclass_name: level >= 3 ? nameRu : '',
      }),
    ],
  }
}

function SubclassCard({
  subclassSlug,
  level,
  testId,
}: {
  subclassSlug: string
  level: number
  testId: string
}) {
  const { nameRu, classes } = preview(subclassSlug, level)
  const snap = useMemo(
    () =>
      computeProgression2024({
        classes,
        abilities: { str: 16, dex: 14, con: 14, int: 16, wis: 12, cha: 14 },
      }),
    [classes],
  )
  const subFeatures = snap.features.filter((f) => f.source === 'subclass')
  const subResources = snap.desiredResources.filter((r) =>
    subFeatures.some((f) => r.id.includes(f.id) || r.id.includes(subclassSlug.split('__')[1] || '')),
  )
  // Prefer pool ids from known subclass automation
  const resourceRows = snap.desiredResources.filter(
    (r) =>
      r.id.includes('superiority_dice') ||
      r.id.includes('psionic_energy') ||
      r.id.includes('experimental_elixir') ||
      r.id.includes('restorative_reagents') ||
      r.id.includes('arcane_shot') ||
      r.id.includes('psychic_veil'),
  )
  const spell = snap.spellcasting.find((s) => s.always_prepared.length > 0) || snap.spellcasting[0]
  const third = snap.spellcasting.find((s) => s.progression === 'third')

  return (
    <Panel>
      <div data-testid={testId}>
        <Text as="h2">
          {nameRu} · ур. {level}
        </Text>
        <p data-testid={`${testId}-slug`}>{subclassSlug}</p>
        <p data-testid={`${testId}-features`}>Умений подкласса: {subFeatures.length}</p>
        <ul data-testid={`${testId}-feature-list`}>
          {subFeatures.slice(0, 10).map((f) => (
            <li key={`${f.id}-${f.level}`}>
              {f.name_ru}
              {f.scaleValue ? ` · ${f.scaleValue}` : ' · текст'}
            </li>
          ))}
        </ul>
        <ul data-testid={`${testId}-resources`}>
          {(resourceRows.length ? resourceRows : subResources).map((r) => (
            <li key={r.id}>
              {r.name}: {r.max} ({r.reset}
              {r.shortRestRegain ? `, +${r.shortRestRegain} короткий` : ''})
            </li>
          ))}
          {!resourceRows.length && !subResources.length ? <li>без отдельного пула</li> : null}
        </ul>
        <p data-testid={`${testId}-spells`}>
          {third
            ? `⅓ кастер · заговоры ${third.cantrips} · известно ${third.spells_known ?? '—'} · ячейки 1×${third.slots['1'] || 0}`
            : spell
              ? `всегда подг.: ${spell.always_prepared.slice(0, 6).join(', ') || '—'}${
                  spell.always_prepared.length > 6 ? '…' : ''
                }`
              : 'без заклинаний подкласса'}
        </p>
      </div>
    </Panel>
  )
}

export function P24M02bSubclassesPreviewPage() {
  const slugs = listSubclassSlugs2024()
  const samples = [
    'fighter__battlemaster',
    'fighter__psi-warrior',
    'artificer__alchemist',
    'cleric__life-domain',
    'cleric__grave-domain',
    'fighter__eldritch-knight',
    'rogue__arcane-trickster',
    'sorcerer__draconic-sorcery',
  ]

  return (
    <main className="page page--app" data-testid="p24-m02b-preview">
      <Stack gap={4}>
        <Text as="h1">P24-M02b · Подклассы 2024</Text>
        <p data-testid="p24-m02b-flag">
          Флаг 2024: {RULES_EDITION_2024_OPEN ? 'открыт' : 'закрыт'}
        </p>
        <p data-testid="p24-m02b-count">Подклассов в каталоге: {slugs.length}</p>

        {samples.map((slug) => (
          <Stack key={slug} gap={2}>
            <SubclassCard subclassSlug={slug} level={3} testId={`p24-m02b-${slug}-l3`} />
            <SubclassCard subclassSlug={slug} level={11} testId={`p24-m02b-${slug}-l11`} />
          </Stack>
        ))}
      </Stack>
    </main>
  )
}
