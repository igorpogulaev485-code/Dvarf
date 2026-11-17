/**
 * DEV harness: ERLW mark d4 / pale-elf advantage proof (2014 only).
 * ?fixture=shadow|sentinel|finding|pale|human|2024 · ?clean=1 · ?journal=1
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MinimalSheetEditor } from '../features/characters/MinimalSheetEditor'
import { DiceRollerHost } from '../features/diceRoller'
import { sampleClassic2014Character } from '../features/classicSheet/sampleClassicCharacter'
import type { CharacterDetail } from '../shared/api/characters'
import type { DiceLogEntry } from '../features/diceRoller/types'
import type { AppliedRaceGrant } from '../shared/dnd/raceGrants'
import { Text } from '../ui'

type Fixture = 'shadow' | 'sentinel' | 'finding' | 'pale' | 'human' | '2024'

function baseGrant(partial: Partial<AppliedRaceGrant> & Pick<AppliedRaceGrant, 'slug'>): AppliedRaceGrant {
  return {
    raceCatalogId: `preview-${partial.slug}`,
    slug: partial.slug,
    parentSlug: partial.parentSlug ?? null,
    speed: partial.speed ?? 30,
    size: partial.size ?? 'medium',
    darkvision: partial.darkvision ?? 60,
    abilityBonuses: partial.abilityBonuses ?? {},
    languages: partial.languages ?? ['Общий'],
    skills: partial.skills ?? [],
    tools: partial.tools ?? [],
    armorKeys: partial.armorKeys ?? [],
    weaponNames: partial.weaponNames ?? [],
    traitsText: partial.traitsText ?? '',
    traitCards: partial.traitCards ?? [],
    ancestryId: null,
    featNoteRu: null,
    naturalArmor: null,
    naturalWeapons: [],
    movement: { climb: null, swim: null, fly: null },
    activatedMovement: [],
    damageResistances: partial.damageResistances ?? [],
    combatBonuses: { initiative: null },
    rollBonuses: partial.rollBonuses ?? [],
    racialSpells: [],
    racialResources: [],
  }
}

function withGrant(
  character: CharacterDetail,
  opts: {
    id: string
    name: string
    raceName: string
    className: string
    edition: '2014' | '2024'
    grant: AppliedRaceGrant | null
    skills?: Record<string, { is_proficient?: boolean }>
  },
): CharacterDetail {
  const sheet = { ...(character.sheet ?? {}) } as Record<string, unknown>
  const skills = {
    ...((sheet.skills as Record<string, unknown> | undefined) ?? {}),
    ...(opts.skills ?? {}),
  }
  sheet.skills = skills
  if (opts.grant) {
    sheet.race_grant = opts.grant
  } else {
    delete sheet.race_grant
  }
  if (opts.edition === '2024') {
    const ui = { ...((sheet.ui as Record<string, unknown> | undefined) ?? {}) }
    ui.classic_sheet_layout = '2024'
    sheet.ui = ui
  }
  return {
    ...character,
    id: opts.id,
    name: opts.name,
    race_name: opts.raceName,
    class_name: opts.className,
    level: 5,
    rules_edition: opts.edition,
    sheet,
  }
}

function fixtureCharacter(fixture: Fixture): CharacterDetail {
  const base = sampleClassic2014Character
  if (fixture === '2024') {
    return withGrant(base, {
      id: 'preview-race-roll-2024',
      name: 'Элара Ветрокрылая',
      raceName: 'Эльф (высший)',
      className: 'Плут',
      edition: '2024',
      grant: baseGrant({
        slug: 'high_elf',
        parentSlug: 'elf',
        rollBonuses: [
          // Should be ignored on 2024 sheets even if present in grant.
          {
            id: 'cunning_intuition',
            nameRu: 'Интуиция лукавого',
            dice: '1d4',
            skills: ['stealth', 'performance'],
            tools: [],
            advantage: false,
          },
        ],
      }),
    })
  }
  if (fixture === 'human') {
    return withGrant(base, {
      id: 'preview-race-roll-human',
      name: 'Борис Человеков',
      raceName: 'Человек',
      className: 'Воин',
      edition: '2014',
      grant: baseGrant({
        slug: 'human',
        parentSlug: null,
        darkvision: 0,
        rollBonuses: [],
      }),
    })
  }
  if (fixture === 'pale') {
    return withGrant(base, {
      id: 'preview-race-roll-pale',
      name: 'Лунный Ткач',
      raceName: 'Эльф (бледный)',
      className: 'Плут',
      edition: '2014',
      grant: baseGrant({
        slug: 'pale_elf',
        parentSlug: 'elf',
        rollBonuses: [
          {
            id: 'incisive_sense',
            nameRu: 'Острый ум',
            dice: null,
            skills: ['investigation', 'insight'],
            tools: [],
            advantage: true,
          },
        ],
      }),
      skills: {
        investigation: { is_proficient: true },
        insight: { is_proficient: true },
      },
    })
  }
  if (fixture === 'sentinel') {
    return withGrant(base, {
      id: 'preview-race-roll-sentinel',
      name: 'Страж Дома',
      raceName: 'Человек (метка стража)',
      className: 'Воин',
      edition: '2014',
      grant: baseGrant({
        slug: 'mark_of_sentinel',
        parentSlug: 'human',
        darkvision: 0,
        rollBonuses: [
          {
            id: 'sentinels_intuition',
            nameRu: 'Интуиция стража',
            dice: '1d4',
            skills: ['insight', 'perception'],
            tools: [],
            advantage: false,
          },
        ],
      }),
      skills: {
        insight: { is_proficient: true },
        perception: { is_proficient: true },
      },
    })
  }
  if (fixture === 'finding') {
    return withGrant(base, {
      id: 'preview-race-roll-finding',
      name: 'Искатель Троп',
      raceName: 'Человек (метка поиска)',
      className: 'Следопыт',
      edition: '2014',
      grant: baseGrant({
        slug: 'mark_of_finding_human',
        parentSlug: 'human',
        rollBonuses: [
          {
            id: 'hunters_intuition',
            nameRu: 'Интуиция охотника',
            dice: '1d4',
            skills: ['perception', 'survival'],
            tools: [],
            advantage: false,
          },
        ],
      }),
      skills: {
        perception: { is_proficient: true },
        survival: { is_proficient: true },
      },
    })
  }
  // shadow (default)
  return withGrant(base, {
    id: 'preview-race-roll-shadow',
    name: 'Тень Фирендии',
    raceName: 'Эльф (метка тени)',
    className: 'Плут',
    edition: '2014',
    grant: baseGrant({
      slug: 'mark_of_shadow',
      parentSlug: 'elf',
      skills: ['perception'],
      rollBonuses: [
        {
          id: 'cunning_intuition',
          nameRu: 'Интуиция лукавого',
          dice: '1d4',
          skills: ['performance', 'stealth'],
          tools: [],
          advantage: false,
        },
      ],
    }),
    skills: {
      stealth: { is_proficient: true },
      performance: { is_proficient: true },
      athletics: { is_proficient: true },
    },
  })
}

function journalFor(fixture: Fixture): DiceLogEntry[] | undefined {
  if (fixture === 'shadow') {
    return [
      {
        id: 'shadow-stealth',
        at: Date.now() - 8_000,
        expression: '1d20+7+1к4',
        advantageMode: 'none',
        total: 21,
        modifierTotal: 10,
        dice: [
          { sides: 20, value: 11, dropped: false },
          { sides: 4, value: 3, dropped: false },
        ],
        title: 'Скрытность',
        toastText: 'Скрытность: 21 (d20:11 +7) + 3 (+1к4 (Интуиция лукавого))',
        source: 'sheet',
        repeatable: true,
      },
      {
        id: 'shadow-athletics',
        at: Date.now() - 4_000,
        expression: '1d20+2',
        advantageMode: 'none',
        total: 14,
        modifierTotal: 2,
        dice: [{ sides: 20, value: 12, dropped: false }],
        title: 'Атлетика',
        toastText: 'Атлетика: 14 (d20:12 +2)',
        source: 'sheet',
        repeatable: true,
      },
    ]
  }
  if (fixture === 'sentinel') {
    return [
      {
        id: 'sentinel-insight',
        at: Date.now() - 5_000,
        expression: '1d20+5+1к4',
        advantageMode: 'none',
        total: 16,
        modifierTotal: 8,
        dice: [
          { sides: 20, value: 9, dropped: false },
          { sides: 4, value: 2, dropped: false },
        ],
        title: 'Проницательность',
        toastText: 'Проницательность: 16 (d20:9 +5) + 2 (+1к4 (Интуиция стража))',
        source: 'sheet',
        repeatable: true,
      },
    ]
  }
  if (fixture === 'finding') {
    return [
      {
        id: 'finding-survival',
        at: Date.now() - 5_000,
        expression: '1d20+6+1к4',
        advantageMode: 'none',
        total: 19,
        modifierTotal: 9,
        dice: [
          { sides: 20, value: 11, dropped: false },
          { sides: 4, value: 2, dropped: false },
        ],
        title: 'Выживание',
        toastText: 'Выживание: 19 (d20:11 +6) + 2 (+1к4 (Интуиция охотника))',
        source: 'sheet',
        repeatable: true,
      },
    ]
  }
  return undefined
}

export function RaceRollBonusesPreviewPage() {
  const [params] = useSearchParams()
  const raw = (params.get('fixture') || 'shadow') as Fixture
  const fixture: Fixture = [
    'shadow',
    'sentinel',
    'finding',
    'pale',
    'human',
    '2024',
  ].includes(raw)
    ? raw
    : 'shadow'
  const clean = params.get('clean') === '1'
  const journal = params.get('journal') === '1'
  const [character, setCharacter] = useState(() => fixtureCharacter(fixture))
  const seedLog = useMemo(
    () => (journal ? journalFor(fixture) : undefined),
    [fixture, journal],
  )

  return (
    <main
      className={`page page--app${clean ? ' dice-preview--clean' : ''}`}
      data-testid="race-roll-bonuses-preview"
      data-fixture={fixture}
    >
      {!clean ? (
        <Text tone="muted">
          /dev/race-roll-bonuses-preview · {fixture} · тестовые данные
        </Text>
      ) : null}
      <MinimalSheetEditor
        key={character.id}
        character={character}
        onSaved={setCharacter}
        onToast={() => undefined}
      />
      <DiceRollerHost
        characterId={character.id}
        defaultOpen={journal}
        initialLog={seedLog}
      />
    </main>
  )
}
