/**
 * DEV harness: Квакк-клон (Грунг Art15 / Warlock5) для скринов M1–M3.
 * Реальные компоненты PlayDesk — без auth/API. Статы как у репорта Ильи.
 */
import { useMemo, useState } from 'react'
import { PlayDeskSpellsCompact } from '../features/characters/PlayDeskSpellsCompact'
import type { SpellsState } from '../features/characters/spells'
import { createClassLevel } from '../shared/dnd/classLevels'
import {
  buildCastProfiles,
  resolveSpellLearnBudgets,
} from '../shared/dnd/castProfiles'
import { abilityModifier, type AbilityKey } from '../features/characters/sheetTypes'
import type { SheetSpell } from '../features/characters/spells'

const ABILITIES: Record<AbilityKey, number> = {
  str: 8,
  dex: 12,
  con: 14,
  int: 20,
  wis: 10,
  cha: 19,
}

const PB = 6

function spell(
  partial: Pick<SheetSpell, 'id' | 'name' | 'level'> & Partial<SheetSpell>,
): SheetSpell {
  return {
    catalog_id: null,
    prepared: true,
    notes: '',
    casting_time: '1 действие',
    range: '60 фт.',
    attack_or_save: '',
    damage: '',
    concentration: false,
    source_kind: 'catalog',
    ...partial,
  }
}

function buildKnown(): SheetSpell[] {
  return [
    spell({
      id: 'art-c1',
      name: 'Огненный болт',
      level: 0,
      class_slug: 'artificer',
      attack_or_save: 'атака',
      damage: '1к10 огонь',
    }),
    spell({
      id: 'art-c2',
      name: 'Починка',
      level: 0,
      class_slug: 'artificer',
    }),
    spell({
      id: 'art-c3',
      name: 'Фокусы',
      level: 0,
      class_slug: 'artificer',
    }),
    spell({
      id: 'art-c4',
      name: 'Брызги кислоты',
      level: 0,
      class_slug: 'artificer',
      attack_or_save: 'ЛОВк',
    }),
    spell({
      id: 'wlk-c1',
      name: 'Мистический заряд',
      level: 0,
      class_slug: 'warlock',
      attack_or_save: 'атака',
      damage: '1к10 сила',
    }),
    spell({
      id: 'wlk-c2',
      name: 'Чудотворство',
      level: 0,
      class_slug: 'warlock',
    }),
    spell({
      id: 'wlk-c3',
      name: 'Малая иллюзия',
      level: 0,
      class_slug: 'warlock',
    }),
    spell({
      id: 'tome-1',
      name: 'Свет',
      level: 0,
      class_slug: 'warlock',
      source_kind: 'feature',
      prepared_locked: true,
      prepare_source_label: 'Гримуар договора',
    }),
    spell({
      id: 'tome-2',
      name: 'Указание',
      level: 0,
      class_slug: 'warlock',
      source_kind: 'feature',
      prepared_locked: true,
      prepare_source_label: 'Гримуар договора',
    }),
    spell({
      id: 'tome-3',
      name: 'Сообщение',
      level: 0,
      class_slug: 'warlock',
      source_kind: 'feature',
      prepared_locked: true,
      prepare_source_label: 'Гримуар договора',
    }),
    spell({
      id: 'art-1',
      name: 'Огненный шар',
      level: 3,
      class_slug: 'artificer',
      attack_or_save: 'ЛОВк',
      damage: '8к6 огонь',
    }),
    spell({
      id: 'wlk-1',
      name: 'Адское возмездие',
      level: 1,
      class_slug: 'warlock',
      attack_or_save: 'ЛОВк',
      damage: '2к10 огонь',
    }),
    spell({
      id: 'wlk-2',
      name: 'Тьма',
      level: 2,
      class_slug: 'warlock',
      concentration: true,
    }),
  ]
}

function buildSpells(): SpellsState {
  return {
    casting_ability: 'int',
    max_prepared: 12,
    slots: {
      '1': { max: 4, used: 0 },
      '2': { max: 3, used: 0 },
      '3': { max: 3, used: 1 },
      '4': { max: 2, used: 0 },
      '5': { max: 0, used: 0 },
      '6': { max: 0, used: 0 },
      '7': { max: 0, used: 0 },
      '8': { max: 0, used: 0 },
      '9': { max: 0, used: 0 },
    },
    pact_slots: { max: 2, used: 0, level: 3 },
    known: buildKnown(),
    has_spell_focus: true,
    has_component_pouch: false,
  }
}

export function QuackSpellPreviewPage() {
  const [spells, setSpells] = useState<SpellsState>(() => buildSpells())
  const classes = useMemo(
    () => [
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
    ],
    [],
  )

  const castProfiles = useMemo(
    () =>
      buildCastProfiles({
        classes,
        proficiencyBonus: PB,
        abilityModFor: (ability) => abilityModifier(ABILITIES[ability]),
      }),
    [classes],
  )

  const learnBudgets = useMemo(
    () =>
      resolveSpellLearnBudgets({
        classes,
        proficiencyBonus: PB,
        abilityModFor: (ability) => abilityModifier(ABILITIES[ability]),
      }),
    [classes],
  )

  return (
    <main className="page page--app" data-testid="quack-spell-preview">
      <header style={{ padding: '12px 16px', maxWidth: 720 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: 0 }}>
          Квакк-Арканист · превью стола
        </h1>
        <p style={{ color: 'var(--muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>
          Грунг · Изобретатель 15 (Артиллерист) / Колдун 5 (Исчадие) · БМ +6 · ИНТ 20 · ХАР 19 ·
          хиты 143
        </p>
      </header>
      <div
        className="play-desk"
        style={{ maxWidth: 420, margin: '0 16px 24px', padding: 12 }}
      >
        <PlayDeskSpellsCompact
          spells={spells}
          abilities={ABILITIES}
          proficiencyBonus={PB}
          learnBudgets={learnBudgets}
          classes={classes}
          castProfiles={castProfiles}
          onOpenSettings={() => undefined}
          onSpellsChange={setSpells}
          onCastSpell={() => undefined}
          onSlotUsedChange={(level, used) => {
            const key = String(level)
            setSpells((prev) => ({
              ...prev,
              slots: {
                ...prev.slots,
                [key]: { ...(prev.slots[key] ?? { max: 0, used: 0 }), used },
              },
            }))
          }}
          onPactUsedChange={(used) => {
            setSpells((prev) =>
              prev.pact_slots
                ? { ...prev, pact_slots: { ...prev.pact_slots, used } }
                : prev,
            )
          }}
        />
      </div>
    </main>
  )
}
