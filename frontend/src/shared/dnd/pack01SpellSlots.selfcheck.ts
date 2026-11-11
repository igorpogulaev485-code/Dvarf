/**
 * Pack 01 retest: slots, bonus cantrips, level-down grants, pact, paladin 1.
 * Run from frontend/: npx tsx src/shared/dnd/pack01SpellSlots.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applySpellcastingSuggestion,
  classLevelOffersSpellPicks,
  resolveSpellLearnBudget,
  spellcastingTableChanged,
  suggestSpellcastingFromClasses,
} from './casterProgression.ts'
import { createClassLevel } from './classLevels.ts'
import {
  parseSubclassGrantDef,
  resolveSubclassChoiceOptions,
  validateSubclassPicks,
} from './subclassGrants.ts'
import {
  applySubclassGrantToDraft,
  syncSubclassAlwaysPreparedSpells,
} from '../../features/characters/subclassEffects.ts'
import { reconcileSubclassSpellcasting } from '../../features/characters/reconcileSpellcasting.ts'
import {
  countLearnedCantrips,
  countPreparedLeveled,
  createSheetSpell,
  type SpellsState,
} from '../../features/characters/spells.ts'
import type { SubclassGrantDraftSlice } from '../../features/characters/subclassEffects.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const seed = JSON.parse(
  readFileSync(
    join(here, '../../../../backend/data/classes/subclass_catalog_seed_2014.json'),
    'utf8',
  ),
) as {
  classes: Array<{
    parent_slug?: string
    subclasses?: Array<Record<string, unknown> & { slug?: string }>
  }>
}

function findSub(parent: string, slug: string) {
  for (const cls of seed.classes) {
    if (cls.parent_slug !== parent) continue
    for (const sub of cls.subclasses ?? []) {
      if (sub.slug === slug) return sub
    }
  }
  throw new Error(`missing ${parent}/${slug}`)
}

function emptySpells(): SpellsState {
  return {
    casting_ability: null,
    max_prepared: null,
    slots: Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [String(i + 1), { max: 0, used: 0 }]),
    ),
    pact_slots: null,
    known: [],
  }
}

function emptyDraft(): SubclassGrantDraftSlice {
  return {
    identity: {
      armor: { light: false, medium: false, heavy: false, shields: false },
      weapons: { simple: false, martial: false },
      tools: [],
      languages: [],
    },
    skills: {},
    classGrants: [],
    subclassGrants: [],
    subclassTransitions: [],
    raceGrant: null,
    companions: [],
    textBlocks: [],
    spells: emptySpells(),
  }
}

function clericSlots(level: number) {
  const suggestion = suggestSpellcastingFromClasses({
    classes: [createClassLevel({ name: 'Жрец', level })],
    abilityModFor: () => 3,
  })
  assert(suggestion, `cleric ${level} suggestion`)
  return suggestion.slots
}

function slotMax(slots: Record<string, { max: number }>, level: number) {
  return slots[String(level)]?.max ?? 0
}

// M13 / M242 / M251 — PHB 2014 cleric table, not the 5/4 figure in the duplicate note.
{
  assert(slotMax(clericSlots(1), 1) === 2, 'cleric 1 → 2')
  assert(slotMax(clericSlots(5), 1) === 4, 'cleric 5 → 4')
  assert(slotMax(clericSlots(5), 2) === 3, 'cleric 5 → 3 of 2nd')
  assert(slotMax(clericSlots(5), 3) === 2, 'cleric 5 → 2 of 3rd')
  assert(slotMax(clericSlots(11), 6) === 1, 'cleric 11 → 6th')
  assert(slotMax(clericSlots(17), 9) === 1, 'cleric 17 → 9th')
  assert(slotMax(clericSlots(17), 1) === 4, 'cleric 17 PHB is 4 of 1st, not 5')
  const before = emptySpells()
  before.slots['1'] = { max: 2, used: 2 }
  const next = applySpellcastingSuggestion(before, suggestSpellcastingFromClasses({
    classes: [createClassLevel({ name: 'Жрец', level: 5 })],
    abilityModFor: () => 3,
  })!)
  assert(next.slots['1']?.max === 4 && next.slots['1']?.used === 2, 'spent kept under new max')
  before.slots['3'] = { max: 2, used: 2 }
  const down = applySpellcastingSuggestion(before, suggestSpellcastingFromClasses({
    classes: [createClassLevel({ name: 'Жрец', level: 1 })],
    abilityModFor: () => 3,
  })!)
  assert(down.slots['3']?.max === 0 && down.slots['3']?.used === 0, 'spent clamped when circle closes')
  const same = applySpellcastingSuggestion(next, suggestSpellcastingFromClasses({
    classes: [createClassLevel({ name: 'Жрец', level: 5 })],
    abilityModFor: () => 3,
  })!)
  assert(!spellcastingTableChanged(next, same), 'no toast when the table did not change')
}

// M68 third caster. M116 artificer cantrip at 14.
{
  const ek = (level: number) =>
    suggestSpellcastingFromClasses({
      classes: [
        createClassLevel({
          name: 'Воин',
          level,
          subclass_name: 'Мистический рыцарь',
        }),
      ],
      abilityModFor: () => 2,
    })
  const at10 = ek(10)
  assert(at10 && slotMax(at10.slots, 2) === 3, 'EK 10 has 3 second-level slots')
  const at13 = ek(13)
  assert(at13 && slotMax(at13.slots, 3) === 2, 'EK 13 has 2 third-level slots')
  const at16 = ek(16)
  assert(at16 && slotMax(at16.slots, 3) === 3, 'EK 16 is 4/3/3')
  const at20 = ek(20)
  assert(at20 && slotMax(at20.slots, 4) === 1, 'EK 20 has a 4th-level slot')
  const art = (level: number) =>
    resolveSpellLearnBudget({
      classes: [createClassLevel({ name: 'Изобретатель', level })],
      abilityModFor: () => 3,
    })
  assert(art(13)?.cantrips === 3, 'artificer 13 has 3 cantrips')
  assert(art(14)?.cantrips === 4, 'artificer 14 opens the 4th cantrip')
  assert(art(15)?.cantrips === 4, 'artificer 15 stays at 4')
}

// M44 / M137 paladin 1.
{
  const paladin = createClassLevel({ name: 'Паладин', level: 1 })
  assert(!classLevelOffersSpellPicks(paladin, 3), 'paladin 1 does not ask for spells')
  const suggestion = suggestSpellcastingFromClasses({
    classes: [paladin],
    abilityModFor: () => 3,
  })
  assert(suggestion?.max_prepared === 0, 'paladin 1 prepare cap is 0')
  assert(slotMax(suggestion!.slots, 1) === 0, 'paladin 1 has no slots')
  const watchers = parseSubclassGrantDef({
    slug: 'oath_of_the_watchers',
    nameRu: 'Клятва смотрителей',
    parentSlug: 'paladin',
    catalogData: findSub('paladin', 'oath_of_the_watchers'),
  })
  assert(watchers, 'watchers def')
  const applied = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'pal-1',
    catalogId: 'watchers',
    def: watchers,
    picks: {
      values: {
        skills_or_tools: ['insight', 'perception'],
        languages: ['эльфийский', 'дварфийский'],
      },
    },
    classLevel: 9,
    maxSpellLevel: 3,
  })
  assert(applied, 'watchers apply')
  assert(
    applied.draft.spells.known.some((spell) => spell.level > 0),
    'watchers oath spells are on the sheet at 9',
  )
  const dropped = reconcileSubclassSpellcasting({
    classes: [createClassLevel({ id: 'pal-1', name: 'Паладин', level: 1 })],
    abilities: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 16 },
    slice: applied.draft,
  })
  assert(
    dropped.slice.spells.known.every((spell) => spell.level <= 0),
    'paladin 1 revokes oath spells',
  )
  assert(dropped.slice.spells.slots['1']?.max === 0, 'paladin 1 slots cleared')
  assert(dropped.slice.spells.max_prepared === 0, 'paladin 1 prepare cleared')
  assert(dropped.tableChanged, 'dropping to paladin 1 changes the table')
}

// M136 pact survives «По таблице».
{
  const current = emptySpells()
  current.pact_slots = { max: 1, used: 0, level: 1 }
  current.slots['1'] = { max: 2, used: 0 }
  const clericOnly = suggestSpellcastingFromClasses({
    classes: [createClassLevel({ name: 'Жрец', level: 2 })],
    abilityModFor: () => 2,
  })!
  const kept = applySpellcastingSuggestion(current, clericOnly)
  assert(kept.pact_slots == null, 'a cleric table does not keep pact magic')
  assert(kept.slots['1']?.max === 3, 'normal slots still follow the cleric table')
  const mix = suggestSpellcastingFromClasses({
    classes: [
      createClassLevel({ name: 'Жрец', level: 1 }),
      createClassLevel({ name: 'Колдун', level: 1 }),
    ],
    abilityModFor: () => 2,
  })
  assert(mix?.pact_slots?.max === 1 && mix.pact_slots.level === 1, 'cleric 1 / warlock 1 keeps pact')
  assert(mix.slots['1']?.max === 2, 'multiclass does not turn level 2 into 3 cleric slots')
  const appliedMix = applySpellcastingSuggestion(current, mix)
  assert(appliedMix.pact_slots?.max === 1, 'По таблице keeps the warlock pact')
  assert(appliedMix.slots['1']?.max === 2, 'По таблице does not rewrite the mix as a level-2 cleric')
}

// M09–M16, M38, M60 bonus cantrips.
{
  const wizardFrom = resolveSubclassChoiceOptions('wizard_cantrips')
  assert(Array.isArray(wizardFrom) && wizardFrom.length >= 2, 'wizard cantrips are real options')
  const arcana = parseSubclassGrantDef({
    slug: 'arcana_domain',
    nameRu: 'Домен магии',
    parentSlug: 'cleric',
    catalogData: findSub('cleric', 'arcana_domain'),
  })
  assert(arcana, 'arcana')
  const arcanaChoice = arcana.choices.find((choice) => choice.id === 'wizard_cantrips')
  assert(arcanaChoice && arcanaChoice.count === 2, 'arcana asks for 2')
  assert(Array.isArray(arcanaChoice.from) && arcanaChoice.from.length >= 2, 'arcana list is not one token')
  assert(validateSubclassPicks(arcana, { values: {} }), 'apply stays blocked until both cantrips')
  assert(
    !validateSubclassPicks(arcana, {
      values: { wizard_cantrips: ['Fire Bolt', 'Light'] },
    }),
    'two real cantrips enable Apply',
  )
  const arcanaSheet = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'cl-1',
    catalogId: 'arcana',
    def: arcana,
    picks: { values: { wizard_cantrips: ['Fire Bolt', 'Light'] } },
    classLevel: 1,
    maxSpellLevel: 1,
  })
  assert(arcanaSheet, 'arcana apply')
  const bonus = arcanaSheet.draft.spells.known.filter((spell) => spell.level === 0)
  assert(bonus.length === 2, 'two wizard cantrips granted')
  assert(bonus.every((spell) => spell.prepared_locked && spell.class_slug === 'cleric'), 'cleric cantrips outside the budget')
  assert(countLearnedCantrips(arcanaSheet.draft.spells.known) === 0, 'bonus cantrips do not fill the limit')

  const nature = parseSubclassGrantDef({
    slug: 'nature_domain',
    nameRu: 'Домен природы',
    parentSlug: 'cleric',
    catalogData: findSub('cleric', 'nature_domain'),
  })!
  const druidPick = nature.choices.find((choice) => choice.id === 'nature_druid_cantrip')
  assert(druidPick && Array.isArray(druidPick.from) && druidPick.from.includes('Shillelagh'), 'nature offers Shillelagh')

  const death = parseSubclassGrantDef({
    slug: 'death_domain',
    nameRu: 'Домен смерти',
    parentSlug: 'cleric',
    catalogData: findSub('cleric', 'death_domain'),
  })!
  assert(death.choices.some((choice) => choice.id === 'death_necro_cantrip'), 'death offers a necromancy cantrip')

  const light = parseSubclassGrantDef({
    slug: 'light_domain',
    nameRu: 'Домен света',
    parentSlug: 'cleric',
    catalogData: findSub('cleric', 'light_domain'),
  })!
  const lightSheet = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'cl-light',
    catalogId: 'light',
    def: light,
    picks: { values: {} },
    classLevel: 1,
    maxSpellLevel: 1,
  })!
  assert(
    lightSheet.draft.spells.known.some(
      (spell) => spell.level === 0 && spell.name === 'Свет' && spell.prepared_locked,
    ),
    'light is granted and locked',
  )

  const grave = parseSubclassGrantDef({
    slug: 'grave_domain',
    nameRu: 'Домен упокоения',
    parentSlug: 'cleric',
    catalogData: findSub('cleric', 'grave_domain'),
  })!
  const graveSheet = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'cl-grave',
    catalogId: 'grave',
    def: grave,
    picks: { values: {} },
    classLevel: 1,
    maxSpellLevel: 1,
  })!
  const spare = graveSheet.draft.spells.known.find((spell) => spell.name === 'Уход за умирающим')
  assert(spare?.prepared_locked, 'spare the dying is granted')
  assert(spare?.range === '30 фт.', 'grave range is 30 ft')
  assert(spare?.casting_time === '1 бонусное действие', 'grave casting time is a bonus action')

  const land = parseSubclassGrantDef({
    slug: 'circle_of_the_land',
    nameRu: 'Круг земли',
    parentSlug: 'druid',
    catalogData: findSub('druid', 'circle_of_the_land'),
  })!
  assert(land.choices.some((choice) => choice.id === 'land_bonus_cantrip'), 'land has a bonus cantrip choice')

  const illusion = parseSubclassGrantDef({
    slug: 'school_of_illusion',
    nameRu: 'Школа иллюзии',
    parentSlug: 'wizard',
    catalogData: findSub('wizard', 'school_of_illusion'),
  })!
  const fullBook = {
    ...emptyDraft(),
    spells: {
      ...emptySpells(),
      known: [
        { ...createSheetSpell(), name: 'Огненный снаряд', level: 0, class_slug: 'wizard' },
        { ...createSheetSpell(), name: 'Свет', level: 0, class_slug: 'wizard' },
        { ...createSheetSpell(), name: 'Волшебная рука', level: 0, class_slug: 'wizard' },
      ],
    },
  }
  const illusionSheet = applySubclassGrantToDraft({
    draft: fullBook,
    classEntryId: 'wiz-1',
    catalogId: 'illusion',
    def: illusion,
    picks: { values: {} },
    classLevel: 2,
    maxSpellLevel: 1,
  })!
  const minor = illusionSheet.draft.spells.known.filter((spell) => spell.name === 'Малая иллюзия')
  assert(minor.length === 1 && minor[0]?.prepared_locked, 'minor illusion is granted outside the full budget')
  assert(countLearnedCantrips(illusionSheet.draft.spells.known) === 3, 'the bonus does not consume a cantrip slot')

  const already = applySubclassGrantToDraft({
    draft: {
      ...emptyDraft(),
      spells: {
        ...emptySpells(),
        known: [
          { ...createSheetSpell(), name: 'Малая иллюзия', level: 0, class_slug: 'wizard' },
        ],
      },
    },
    classEntryId: 'wiz-2',
    catalogId: 'illusion',
    def: illusion,
    picks: { values: { illusion_replacement_cantrip: 'Fire Bolt' } },
    classLevel: 2,
    maxSpellLevel: 1,
  })!
  const kept = already.draft.spells.known.filter((spell) => spell.name === 'Малая иллюзия')
  assert(kept.length === 1 && !kept[0]?.prepared_locked, 'a known minor illusion stays in the budget')
  assert(
    already.draft.spells.known.some(
      (spell) => spell.name === 'Огненный снаряд' && spell.prepared_locked,
    ),
    'PHB: a different wizard cantrip is the one outside the budget',
  )
}

// M117 / M242 twilight level gate. M251 peace 17 keeps 5th-circle domain spells.
{
  const twilight = parseSubclassGrantDef({
    slug: 'twilight_domain',
    nameRu: 'Домен сумерек',
    parentSlug: 'cleric',
    catalogData: findSub('cleric', 'twilight_domain'),
  })!
  const at1 = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'tw',
    catalogId: 'twilight',
    def: twilight,
    picks: { values: {} },
    classLevel: 1,
    maxSpellLevel: 1,
  })!
  assert(at1.draft.spells.known.every((spell) => spell.level <= 1), 'twilight 1 has no higher circles')
  const at5 = syncSubclassAlwaysPreparedSpells({
    draft: at1.draft,
    maxSpellLevel: 3,
    classLevelByEntryId: { tw: 5 },
  })
  assert(at5.spells.known.some((spell) => spell.level === 3), 'twilight 5 gains 3rd-circle domain spells')
  const back = syncSubclassAlwaysPreparedSpells({
    draft: at5,
    maxSpellLevel: 1,
    classLevelByEntryId: { tw: 1 },
  })
  assert(back.spells.known.every((spell) => spell.level <= 1), 'lowering twilight revokes higher domain spells')

  const peace = parseSubclassGrantDef({
    slug: 'peace_domain',
    nameRu: 'Домен мира',
    parentSlug: 'cleric',
    catalogData: findSub('cleric', 'peace_domain'),
  })!
  const peaceSheet = applySubclassGrantToDraft({
    draft: emptyDraft(),
    classEntryId: 'peace',
    catalogId: 'peace',
    def: peace,
    picks: { values: { peace_skill: 'insight' } },
    classLevel: 17,
    maxSpellLevel: 9,
  })!
  assert(
    peaceSheet.draft.spells.known.some((spell) => spell.level === 5),
    'peace 17 keeps 5th-circle domain spells',
  )
}

// M118 domain Command does not add a second prepare.
{
  const knowledge = parseSubclassGrantDef({
    slug: 'knowledge_domain',
    nameRu: 'Домен знаний',
    parentSlug: 'cleric',
    catalogData: findSub('cleric', 'knowledge_domain'),
  })!
  const sheet = applySubclassGrantToDraft({
    draft: {
      ...emptyDraft(),
      spells: {
        ...emptySpells(),
        known: [
          { ...createSheetSpell(), name: 'Приказ', level: 1, prepared: true, class_slug: 'cleric' },
          { ...createSheetSpell(), name: 'Лечение ран', level: 1, prepared: true, class_slug: 'cleric' },
          { ...createSheetSpell(), name: 'Благословение', level: 1, prepared: true, class_slug: 'cleric' },
          { ...createSheetSpell(), name: 'Направляющий снаряд', level: 1, prepared: true, class_slug: 'cleric' },
        ],
      },
    },
    classEntryId: 'know',
    catalogId: 'knowledge',
    def: knowledge,
    picks: {
      values: {
        blessings_of_knowledge_skills: ['arcana', 'history'],
        blessings_of_knowledge_langs: ['эльфийский', 'дварфийский'],
      },
    },
    classLevel: 1,
    maxSpellLevel: 1,
  })!
  const commands = sheet.draft.spells.known.filter((spell) => spell.name === 'Приказ')
  assert(commands.length === 1 && commands[0]?.prepared_locked, 'one locked Command card')
  assert(countPreparedLeveled(sheet.draft.spells.known) === 3, 'domain Command is outside 4/4')
}

console.log('pack01SpellSlots.selfcheck: ok')
