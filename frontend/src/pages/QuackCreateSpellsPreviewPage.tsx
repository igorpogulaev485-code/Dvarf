/**
 * DEV: LevelingStep spell overview for M7 create board (Art15 / Warlock5).
 */
import { useMemo, useState } from 'react'
import { LevelingStep } from '../features/createPipeline/LevelingStep'
import type { SpellsState } from '../features/characters/spells'
import {
  countLearnedCantripsForSlug,
  countLearnedLeveledForSlug,
} from '../features/characters/spells'
import { createClassLevel } from '../shared/dnd/classLevels'
import {
  formatNamedCantripBudgets,
  resolveSpellLearnBudgets,
} from '../shared/dnd/castProfiles'
import { abilityModifier, type AbilityKey } from '../features/characters/sheetTypes'
import { GrimoireDialog } from '../features/characters/GrimoireDialog'
import type { CatalogEntry } from '../shared/api/catalog'

const ABILITIES = {
  str: 8,
  dex: 12,
  con: 14,
  int: 20,
  wis: 10,
  cha: 19,
} as const satisfies Record<AbilityKey, number>

export function QuackCreateSpellsPreviewPage() {
  const [classes, setClasses] = useState(() => [
    createClassLevel({
      id: 'art',
      name: 'Изобретатель',
      level: 15,
      subclass_name: 'Артиллерист',
    }),
    createClassLevel({
      id: 'wlk',
      name: 'Колдун',
      level: 5,
      subclass_name: 'Исчадие',
    }),
  ])
  const [spells, setSpells] = useState<SpellsState>(() => ({
    casting_ability: 'int',
    max_prepared: 12,
    slots: {
      '1': { max: 4, used: 0 },
      '2': { max: 3, used: 0 },
      '3': { max: 3, used: 0 },
      '4': { max: 3, used: 0 },
      '5': { max: 2, used: 0 },
    },
    pact_slots: { max: 2, used: 0, level: 3 },
    known: [
      {
        id: 'a1',
        name: 'Огненный болт',
        catalog_id: null,
        level: 0,
        prepared: true,
        notes: '',
        casting_time: '',
        range: '',
        attack_or_save: '',
        damage: '',
        concentration: false,
        class_slug: 'artificer',
        source_kind: 'catalog',
      },
      {
        id: 'a2',
        name: 'Починка',
        catalog_id: null,
        level: 0,
        prepared: true,
        notes: '',
        casting_time: '',
        range: '',
        attack_or_save: '',
        damage: '',
        concentration: false,
        class_slug: 'artificer',
        source_kind: 'catalog',
      },
      {
        id: 'a3',
        name: 'Фокусы',
        catalog_id: null,
        level: 0,
        prepared: true,
        notes: '',
        casting_time: '',
        range: '',
        attack_or_save: '',
        damage: '',
        concentration: false,
        class_slug: 'artificer',
        source_kind: 'catalog',
      },
      {
        id: 'a4',
        name: 'Брызги кислоты',
        catalog_id: null,
        level: 0,
        prepared: true,
        notes: '',
        casting_time: '',
        range: '',
        attack_or_save: '',
        damage: '',
        concentration: false,
        class_slug: 'artificer',
        source_kind: 'catalog',
      },
      {
        id: 'w1',
        name: 'Мистический заряд',
        catalog_id: null,
        level: 0,
        prepared: true,
        notes: '',
        casting_time: '',
        range: '',
        attack_or_save: '',
        damage: '',
        concentration: false,
        class_slug: 'warlock',
        source_kind: 'catalog',
      },
      {
        id: 'w2',
        name: 'Чудотворство',
        catalog_id: null,
        level: 0,
        prepared: true,
        notes: '',
        casting_time: '',
        range: '',
        attack_or_save: '',
        damage: '',
        concentration: false,
        class_slug: 'warlock',
        source_kind: 'catalog',
      },
      {
        id: 'w3',
        name: 'Малая иллюзия',
        catalog_id: null,
        level: 0,
        prepared: true,
        notes: '',
        casting_time: '',
        range: '',
        attack_or_save: '',
        damage: '',
        concentration: false,
        class_slug: 'warlock',
        source_kind: 'catalog',
      },
    ],
  }))
  const [grimoireOpen, setGrimoireOpen] = useState(false)
  const [focusSlug, setFocusSlug] = useState<string | null>(null)

  const budgets = useMemo(
    () =>
      resolveSpellLearnBudgets({
        classes,
        proficiencyBonus: 6,
        abilityModFor: (ability) => abilityModifier(ABILITIES[ability]),
      }),
    [classes],
  )

  const emptyCatalog: CatalogEntry[] = []

  return (
    <main className="page page--app" data-testid="quack-create-spells-preview">
      <header style={{ padding: '12px 16px', maxWidth: 720 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: 0 }}>
          Create · магия MC (LevelingStep)
        </h1>
        <p style={{ color: 'var(--muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>
          Квакк-клон · обзор кастеров + «Выбрать заклинания»
        </p>
      </header>
      <div style={{ maxWidth: 640, margin: '0 16px 24px' }} className="create-pipeline">
        <LevelingStep
          classes={classes}
          classCatalog={emptyCatalog}
          abilities={ABILITIES}
          hpChoices={[]}
          primaryClassEntryId="art"
          hasCasterClass
          onClassesChange={setClasses}
          onHpChoicesChange={() => undefined}
          onOpenChoices={() => undefined}
          onChangeArchetype={() => undefined}
          onOpenSpells={() => {
            setFocusSlug(null)
            setGrimoireOpen(true)
          }}
          onOpenSpellsForClass={(slug) => {
            setFocusSlug(slug)
            setGrimoireOpen(true)
          }}
          spellBudgetMeta={formatNamedCantripBudgets(
            budgets,
            Object.fromEntries(
              budgets.map((row) => [
                row.slug,
                countLearnedCantripsForSlug(spells.known, row.slug),
              ]),
            ),
            { tomeExtra: 3 },
          )}
          spellClassBudgets={budgets.map((row) => ({
            slug: row.slug,
            labelRu: row.labelRu,
            mode: row.mode,
            cantripsKnown: countLearnedCantripsForSlug(spells.known, row.slug),
            cantripsMax: row.cantrips,
            leveledKnown: countLearnedLeveledForSlug(spells.known, row.slug),
            leveledKnownMax: row.leveledKnown,
          }))}
          spellcasting={{
            labelRu: 'Изобретатель / Колдун',
            mode: 'prepared_list',
            maxPrepared: 12,
            knownLeveled: 0,
            preparedLeveled: 0,
            cantripsKnown: 7,
            cantripsMax: 7,
            slots: spells.slots,
            pactSlots: spells.pact_slots,
          }}
        />
      </div>
      <GrimoireDialog
        open={grimoireOpen}
        edition="2014"
        spells={spells}
        classes={classes}
        knownCaster
        abilityModFor={(ability) => abilityModifier(ABILITIES[ability])}
        initialClassFilter={focusSlug}
        accessContext="create"
        onChange={setSpells}
        onClose={() => setGrimoireOpen(false)}
      />
    </main>
  )
}
