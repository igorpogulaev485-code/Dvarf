/**
 * DEV preview for P24-M02a Playwright: class tables / resources / spell prep.
 * Does not open RULES_EDITION_2024_OPEN.
 */
import { useMemo, useState } from 'react'
import {
  actionSurgeAllowsAction2024,
  applyShortRestResources2024,
  checkMulticlassPrerequisites2024,
  computeProgression2024,
  listClassSlugs2024,
  SRD_SUBCLASS_BY_PARENT,
} from '../shared/dnd/edition2024Classes'
import {
  ELDRITCH_INVOCATIONS_2024,
  METAMAGIC_2024,
  metamagicKnownLimit2024,
  warlockInvocationLimit2024,
} from '../shared/dnd/edition2024ClassOptions'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import { createClassLevel } from '../shared/dnd/classLevels'
import { Panel, Stack, Text, Button } from '../ui'
import type { SheetResource } from '../shared/dnd/rest'

function previewClasses(slug: string, level: number, nameRu: string) {
  return [
    createClassLevel({
      name: nameRu,
      level,
      catalog_id: slug,
      subclass_catalog_id: level >= 3 ? SRD_SUBCLASS_BY_PARENT[slug] || null : null,
      subclass_name: level >= 3 ? SRD_SUBCLASS_BY_PARENT[slug] || '' : '',
    }),
  ]
}

function ClassCard({
  slug,
  nameRu,
  level,
  testId,
}: {
  slug: string
  nameRu: string
  level: number
  testId: string
}) {
  const snap = useMemo(
    () =>
      computeProgression2024({
        classes: previewClasses(slug, level, nameRu),
        abilities: { str: 16, dex: 14, con: 14, int: 16, wis: 12, cha: 14 },
      }),
    [slug, nameRu, level],
  )
  const pools = snap.desiredResources
  const spell = snap.spellcasting[0]

  return (
    <Panel>
      <div data-testid={testId}>
        <Text as="h2">
          {nameRu} {level}
        </Text>
        <p data-testid={`${testId}-pb`}>БМ +{snap.proficiency_bonus}</p>
        <p data-testid={`${testId}-feats`}>
          Умений: {snap.features.length}
          {snap.epic_boon_reached ? ' · эпический дар' : ''}
          {snap.feat_levels_reached.length
            ? ` · черты: ${snap.feat_levels_reached.join(',')}`
            : ''}
        </p>
        <ul data-testid={`${testId}-resources`}>
          {pools.map((p) => (
            <li key={p.id}>
              {p.name}: {p.max} ({p.reset}
              {p.shortRestRegain ? `, +${p.shortRestRegain} на короткий` : ''})
            </li>
          ))}
        </ul>
        {spell ? (
          <p data-testid={`${testId}-spells`}>
            Заговоры {spell.cantrips} · подготовлено {spell.prepared_spells} · ячейки{' '}
            {Object.entries(spell.slots)
              .filter(([, n]) => n > 0)
              .map(([k, n]) => `${k}×${n}`)
              .join(', ') || '—'}
            {spell.always_prepared.length
              ? ` · всегда: ${spell.always_prepared.slice(0, 4).join(', ')}`
              : ''}
          </p>
        ) : (
          <p data-testid={`${testId}-spells`}>Без заклинаний</p>
        )}
        <ul data-testid={`${testId}-feature-list`}>
          {snap.features.slice(0, 8).map((f) => (
            <li key={`${f.id}-${f.level}-${f.source}`}>
              {f.name_ru}
              {f.source === 'subclass' ? ' (подкласс)' : ''}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

export function P24M02aClassesPreviewPage() {
  const [restLog, setRestLog] = useState('—')
  const slugs = listClassSlugs2024()

  const fighterSnap = useMemo(
    () =>
      computeProgression2024({
        classes: previewClasses('fighter', 5, 'Боец'),
      }),
    [],
  )
  const secondWind = fighterSnap.desiredResources.find((r) =>
    r.id.includes('second_wind'),
  )

  const mc = checkMulticlassPrerequisites2024({
    currentClasses: ['fighter'],
    newClass: 'wizard',
    abilities: { str: 15, dex: 10, con: 12, int: 14, wis: 10, cha: 10 },
  })

  return (
    <main className="page page--app" data-testid="p24-m02a-preview">
      <Stack gap={4}>
        <Text as="h1">P24-M02a · Классы 2024</Text>
        <p data-testid="p24-m02a-flag">
          Флаг 2024: {RULES_EDITION_2024_OPEN ? 'открыт' : 'закрыт'}
        </p>
        <p data-testid="p24-m02a-class-count">Классов в каталоге: {slugs.length}</p>
        <p data-testid="p24-m02a-surge-magic">
          Action Surge → Магия:{' '}
          {actionSurgeAllowsAction2024('magic') ? 'разрешено (ошибка)' : 'запрещено'}
        </p>
        <p data-testid="p24-m02a-bardic-heroic">
          Бардовское ≠ Героическое:{' '}
          {computeProgression2024({
            classes: previewClasses('bard', 5, 'Бард'),
          }).desiredResources.some((r) => r.id.includes('bardic_inspiration'))
            ? 'отдельный пул'
            : 'ошибка'}
        </p>
        <p data-testid="p24-m02a-multiclass">
          Мультикласс боец→волшебник: {mc.ok ? 'пороги ок' : mc.reasonRu}
        </p>

        <ClassCard slug="fighter" nameRu="Боец" level={5} testId="p24-m02a-fighter5" />
        <ClassCard slug="wizard" nameRu="Волшебник" level={5} testId="p24-m02a-wizard5" />

        <Panel>
          <div data-testid="p24-m02a-warlock5">
            <Text as="h2">Колдун 5 · воззвания</Text>
            <p data-testid="p24-m02a-warlock5-limit">
              Лимит воззваний: {warlockInvocationLimit2024(5)}
            </p>
            <ul data-testid="p24-m02a-warlock5-invocations">
              {[
                'pact-of-the-blade',
                'agonizing-blast',
                'devils-sight',
                'thirsting-blade',
                'repelling-blast',
              ].map((id) => {
                const row = ELDRITCH_INVOCATIONS_2024.find((r) => r.id === id)
                return (
                  <li key={id}>
                    {row?.nameRu || id}
                    {row?.requiresPact ? ` (договор ${row.requiresPact})` : ''}
                  </li>
                )
              })}
            </ul>
          </div>
        </Panel>

        <Panel>
          <div data-testid="p24-m02a-sorcerer5">
            <Text as="h2">Чародей 5 · метамагия</Text>
            <p data-testid="p24-m02a-sorcerer5-limit">
              Известно вариантов: {metamagicKnownLimit2024(5)} · очков чародейства:{' '}
              {
                computeProgression2024({
                  classes: previewClasses('sorcerer', 5, 'Чародей'),
                }).desiredResources.find((r) => r.id.includes('sorcery_points'))?.max
              }
            </p>
            <ul data-testid="p24-m02a-sorcerer5-metamagic">
              {METAMAGIC_2024.filter((r) => ['quickened', 'careful'].includes(r.id)).map(
                (row) => (
                  <li key={row.id}>
                    {row.nameRu} (−{row.cost} очк.) — {row.summaryRu}
                  </li>
                ),
              )}
            </ul>
          </div>
        </Panel>

        <Panel>
          <div data-testid="p24-m02a-rest">
            <Text as="h2">Отдых · Второе дыхание</Text>
            <p data-testid="p24-m02a-sw-max">
              Макс. применений бойца 5: {secondWind?.max ?? 0} (часть на короткий)
            </p>
            <Button
              type="button"
              data-testid="p24-m02a-short-rest"
              onClick={() => {
                const resources: SheetResource[] = [
                  {
                    id: secondWind?.id || 'feat:fighter:second_wind:second_wind',
                    name: 'Второе дыхание',
                    max: secondWind?.max || 3,
                    used: secondWind?.max || 3,
                    reset: 'long',
                    shortRestRegain: 1,
                  },
                ]
                const after = applyShortRestResources2024(resources)
                setRestLog(`после короткого used=${after[0]?.used}`)
              }}
            >
              Короткий отдых
            </Button>
            <p data-testid="p24-m02a-rest-log">{restLog}</p>
          </div>
        </Panel>
      </Stack>
    </main>
  )
}
