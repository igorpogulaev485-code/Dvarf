/**
 * DEV preview for P24-M02b Playwright: subclass resources / always-prepared / text.
 * Does not open RULES_EDITION_2024_OPEN.
 */
import { useMemo } from 'react'
import {
  computeProgression2024,
} from '../shared/dnd/edition2024Classes'
import {
  buildPermanentBonuses2024,
  buildSubclassResources2024,
  listSubclassSlugs2024,
  sharedOptionsForSubclass2024,
  subclassParent2024,
  SUBCLASS_CATALOG_2024,
} from '../shared/dnd/edition2024Subclasses'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import { createClassLevel } from '../shared/dnd/classLevels'
import { Panel, Stack, Text } from '../ui'

const PARENT_NAME: Record<string, string> = {
  fighter: 'Воин',
  wizard: 'Волшебник',
  artificer: 'Артефактор',
  cleric: 'Жрец',
  warlock: 'Колдун',
  sorcerer: 'Чародей',
  bard: 'Бард',
  druid: 'Друид',
  monk: 'Монах',
  paladin: 'Паладин',
  ranger: 'Следопыт',
  rogue: 'Плут',
  barbarian: 'Варвар',
}

function preview(subclassSlug: string, level: number) {
  const parent = subclassParent2024(subclassSlug) || 'fighter'
  const nameRu = SUBCLASS_CATALOG_2024[subclassSlug]?.name_ru || subclassSlug
  const parentName = PARENT_NAME[parent] || parent
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
  abilities,
}: {
  subclassSlug: string
  level: number
  testId: string
  abilities?: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}) {
  const abs = abilities || { str: 16, dex: 14, con: 14, int: 16, wis: 16, cha: 16 }
  const { nameRu, classes, parent } = preview(subclassSlug, level)
  const snap = useMemo(
    () =>
      computeProgression2024({
        classes,
        abilities: abs,
      }),
    [classes, abs],
  )
  const pools = buildSubclassResources2024({
    subclassSlug,
    classLevel: level,
    abilities: abs,
  })
  const shared = sharedOptionsForSubclass2024(subclassSlug, level)
  const bonuses = buildPermanentBonuses2024({
    subclassSlug,
    classLevel: level,
    abilities: abs,
  })
  const subFeatures = snap.features.filter((f) => f.source === 'subclass')
  const spell = snap.spellcasting.find((s) => s.always_prepared.length > 0) || snap.spellcasting[0]
  const third = snap.spellcasting.find((s) => s.progression === 'third')
  const crit = snap.scales[`${parent}:crit_threshold`]
  const ac = snap.scales[`${parent}:ac_formula`]

  return (
    <Panel>
      <div data-testid={testId}>
        <Text as="h2">
          {nameRu} · ур. {level}
        </Text>
        <p data-testid={`${testId}-slug`}>{subclassSlug}</p>
        <p data-testid={`${testId}-features`}>Умений подкласса: {subFeatures.length}</p>
        <ul data-testid={`${testId}-feature-list`}>
          {subFeatures.slice(0, 12).map((f) => (
            <li key={`${f.id}-${f.level}`}>
              {f.name_ru}
              {f.resource?.pool_id ? ` · кнопка→${f.resource.pool_id}` : ''}
              {f.automationMode || f.scaleValue ? ` · ${f.automationMode ?? f.scaleValue}` : ' · текст'}
            </li>
          ))}
        </ul>
        <ul data-testid={`${testId}-resources`}>
          {pools.map((r) => (
            <li key={r.id}>
              {r.name}: {r.max} ({r.reset}
              {r.shortRestRegain ? `, +${r.shortRestRegain} короткий` : ''}
              {r.die ? `, ${r.die}` : ''})
            </li>
          ))}
          {shared.map((o) => (
            <li key={o.feature_id}>
              {o.name_ru}: опция → {o.spend_pool}
              {o.cost ? ` (−${o.cost})` : ''}
            </li>
          ))}
          {!pools.length && !shared.length ? <li>без отдельного пула</li> : null}
        </ul>
        <ul data-testid={`${testId}-calcs`}>
          {bonuses.map((b) => (
            <li key={`${b.feature_id}-${b.kind}`}>
              {b.name_ru}: {b.kind}={JSON.stringify(b.value)}
            </li>
          ))}
          {crit != null ? <li>crit_threshold={String(crit)}</li> : null}
          {ac != null ? <li>ac_formula={JSON.stringify(ac)}</li> : null}
          {!bonuses.length && crit == null && ac == null ? <li>без постоянных бонусов</li> : null}
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
    { slug: 'cleric__light-domain', level: 6, abilities: { wis: 16, cha: 12, int: 12, str: 10, dex: 12, con: 14 } },
    { slug: 'fighter__champion', level: 15, abilities: { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 10 } },
    { slug: 'wizard__abjurer', level: 6, abilities: { int: 16, wis: 12, cha: 10, str: 8, dex: 14, con: 14 } },
    { slug: 'warlock__celestial-patron', level: 5, abilities: { cha: 16, wis: 12, int: 12, str: 10, dex: 14, con: 14 } },
    { slug: 'fighter__battlemaster', level: 11 },
    { slug: 'artificer__alchemist', level: 11 },
    { slug: 'fighter__eldritch-knight', level: 3 },
    { slug: 'sorcerer__draconic-sorcery', level: 6 },
  ]

  return (
    <main className="page page--app" data-testid="p24-m02b-preview">
      <Stack gap={4}>
        <Text as="h1">P24-M02b · Подклассы 2024</Text>
        <p data-testid="p24-m02b-flag">
          Флаг 2024: {RULES_EDITION_2024_OPEN ? 'открыт' : 'закрыт'}
        </p>
        <p data-testid="p24-m02b-count">Подклассов в каталоге: {slugs.length}</p>

        {samples.map((row) => (
          <SubclassCard
            key={`${row.slug}-${row.level}`}
            subclassSlug={row.slug}
            level={row.level}
            abilities={row.abilities}
            testId={`p24-m02b-${row.slug}-l${row.level}`}
          />
        ))}
      </Stack>
    </main>
  )
}
