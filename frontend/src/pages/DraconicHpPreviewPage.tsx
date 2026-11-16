/**
 * DEV harness for Draconic Resilience / Dwarven Toughness HP screenshots.
 * ?fixture=sheet58|sheet50|create8|level7|wizard · ?clean=1
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MinimalSheetEditor } from '../features/characters/MinimalSheetEditor'
import { sampleClassic2014Character } from '../features/classicSheet/sampleClassicCharacter'
import type { CharacterDetail } from '../shared/api/characters'
import { Text } from '../ui'

type FixtureId = 'sheet58' | 'sheet50' | 'create8' | 'level7' | 'wizard'

function sorcererFixture(input: {
  id: string
  name: string
  level: number
  hpMax: number
  /** Omit ledger so open-sheet reconcile can run (sheet50). */
  ledger?: { draconic: number; dwarven: number } | null
}): CharacterDetail {
  const classId = 'class-sorc-preview'
  const base = sampleClassic2014Character
  const sheet = structuredClone(base.sheet ?? {}) as Record<string, unknown>
  const abilities = {
    str: { score: 10 },
    dex: { score: 14 },
    con: { score: 14 },
    int: { score: 10 },
    wis: { score: 12 },
    cha: { score: 16 },
  }
  sheet.abilities = abilities
  sheet.identity = {
    ...((sheet.identity as Record<string, unknown>) || {}),
    subclass_name: 'Драконья кровь',
    background: 'Отшельник',
    alignment: 'Хаотично-добрый',
    experience: input.level >= 8 ? 34_000 : input.level >= 7 ? 23_000 : 0,
  }
  sheet.classes = [
    {
      id: classId,
      name: 'Чародей',
      catalog_id: null,
      level: input.level,
      subclass_name: 'Драконья кровь',
      subclass_catalog_id: 'draconic_bloodline',
    },
  ]
  sheet.combat = {
    ...((sheet.combat as Record<string, unknown>) || {}),
    hp_current: input.hpMax,
    hp_max: input.hpMax,
    ac: 13,
    initiative: 2,
    speed: 30,
    hit_die: 'к6',
    hp_dice_current: input.level,
  }
  sheet.race_grant = {
    raceCatalogId: 'preview-human',
    slug: 'human',
    parentSlug: null,
    speed: 30,
    size: 'medium',
    darkvision: 0,
    abilityBonuses: {},
    languages: ['Общий'],
    skills: [],
    tools: [],
    armorKeys: [],
    weaponNames: [],
    traitsText: 'Человек',
    traitCards: [],
  }
  if (input.ledger) {
    sheet.passive_hp_bonuses = input.ledger
  } else if (input.ledger === null) {
    delete sheet.passive_hp_bonuses
  }
  return {
    ...base,
    id: input.id,
    name: input.name,
    level: input.level,
    class_name: `Чародей ${input.level}`,
    race_name: 'Человек',
    hp_current: input.hpMax,
    hp_max: input.hpMax,
    rules_edition: '2014',
    sheet,
  }
}

function wizardRegression(): CharacterDetail {
  return {
    ...sampleClassic2014Character,
    id: 'preview-wizard-regression',
    name: 'Торин Камнебород',
    class_name: 'Волшебник 5',
  }
}

function fixtureCharacter(id: FixtureId): CharacterDetail {
  switch (id) {
    case 'sheet50':
      // Prod bug snapshot: average without Draconic → reconcile to 58 on open.
      return sorcererFixture({
        id: 'preview-draconic-50',
        name: 'Аэрин Драконья Кровь',
        level: 8,
        hpMax: 50,
        ledger: null,
      })
    case 'create8':
      return sorcererFixture({
        id: 'preview-draconic-create8',
        name: 'Создание на 8 ур.',
        level: 8,
        hpMax: 58,
        ledger: { draconic: 8, dwarven: 0 },
      })
    case 'level7':
      return sorcererFixture({
        id: 'preview-draconic-level7',
        name: 'Прокачка 7→8',
        level: 7,
        hpMax: 51,
        ledger: { draconic: 7, dwarven: 0 },
      })
    case 'wizard':
      return wizardRegression()
    case 'sheet58':
    default:
      return sorcererFixture({
        id: 'preview-draconic-58',
        name: 'Аэрин Драконья Кровь',
        level: 8,
        hpMax: 58,
        ledger: { draconic: 8, dwarven: 0 },
      })
  }
}

export function DraconicHpPreviewPage() {
  const [params] = useSearchParams()
  const raw = (params.get('fixture') || 'sheet58') as FixtureId
  const fixture: FixtureId = [
    'sheet58',
    'sheet50',
    'create8',
    'level7',
    'wizard',
  ].includes(raw)
    ? raw
    : 'sheet58'
  const clean = params.get('clean') === '1'
  const seed = useMemo(() => fixtureCharacter(fixture), [fixture])
  const [character, setCharacter] = useState(seed)
  useEffect(() => {
    setCharacter(seed)
  }, [seed])

  return (
    <main
      className={`page page--app${clean ? ' dice-preview--clean' : ''}`}
      data-testid="draconic-hp-preview"
      data-fixture={fixture}
    >
      {!clean ? (
        <Text tone="muted">
          /dev/draconic-hp-preview · {fixture} · Тел 14 / чародей драконьей крови
          {fixture === 'sheet50' ? ' (ожидаем пересчёт 50→58)' : ''}
        </Text>
      ) : null}
      <MinimalSheetEditor
        key={seed.id}
        character={character}
        onSaved={setCharacter}
        onToast={() => undefined}
      />
    </main>
  )
}
