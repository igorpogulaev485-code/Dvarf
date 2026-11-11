/**
 * Race feat spells (Magic Initiate) must survive create-pipeline merge.
 * Run: npx tsx frontend/src/features/createPipeline/mergeCreatePipelineSpells.selfcheck.ts
 */

import {
  createSheetSpell,
  type SpellsState,
} from '../characters/spells.ts'
import {
  applyFeatGrantToDraft,
  ensureFeatSpellsFromLedger,
  expectedFeatSpellIds,
  featSpellsMissingFromKnown,
  type FeatGrantDraftSlice,
} from '../characters/featEffects.ts'
import {
  emptyFeatPicks,
  type AppliedFeatGrant,
  type FeatGrantsPackage,
  type FeatSpell,
} from '../../shared/dnd/featGrants.ts'
import { mergeCreatePipelineSpells } from './mergeCreatePipelineSpells.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function emptySpells(): SpellsState {
  return {
    casting_ability: 'int',
    max_prepared: null,
    slots: Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [String(i + 1), { max: 0, used: 0 }]),
    ),
    pact_slots: null,
    known: [],
  }
}

function emptyFeatSlice(): FeatGrantDraftSlice {
  return {
    abilities: {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    },
    saves: {
      str: false,
      dex: false,
      con: false,
      int: false,
      wis: false,
      cha: false,
    },
    skills: {},
    speed: 30,
    hpMax: 8,
    hpCurrent: 8,
    featGrants: [],
    identity: {
      languages: [],
      tools: [],
      armor: { light: false, medium: false, heavy: false, shields: false },
    },
    textBlocks: [],
    resources: [],
    spells: emptySpells(),
    totalLevel: 1,
  }
}

function spell(
  partial: Pick<FeatSpell, 'id' | 'nameRu' | 'level'> & Partial<FeatSpell>,
): FeatSpell {
  return {
    spellSlug: partial.id,
    castingAbility: null,
    notesRu: null,
    unlockLevel: 1,
    grant: 'innate',
    ...partial,
  }
}

function packageWithSpells(
  spells: FeatSpell[],
  extra?: Partial<FeatGrantsPackage>,
): FeatGrantsPackage {
  return {
    abilityBonuses: {},
    armorProficiencies: [],
    weaponNames: [],
    skills: [],
    tools: [],
    languages: [],
    savingThrows: [],
    initiativeBonus: 0,
    speedBonus: 0,
    passiveBonus: 0,
    hpPerLevel: 0,
    acBonusDualWield: 0,
    flags: [],
    resource: null,
    unarmedDamage: null,
    naturalArmor: null,
    spells,
    expertiseSkills: [],
    benefitsRu: '',
    summaryRu: '',
    enumPicks: {},
    enumMultiPicks: {},
    ...extra,
  }
}

const magicInitiate: AppliedFeatGrant = {
  id: 'grant-mi-1',
  featCatalogId: 'feat-magic-initiate',
  slug: 'magic-initiate',
  nameRu: 'Посвящённый в магию',
  source: {
    kind: 'race',
    raceCatalogId: 'race-human-variant',
    raceSlug: 'human-variant',
  },
  applied: packageWithSpells([
    spell({ id: 'guidance', nameRu: 'Указание', level: 0 }),
    spell({ id: 'toll-the-dead', nameRu: 'Погребальный звон', level: 0 }),
    spell({ id: 'guiding-bolt', nameRu: 'Направленный снаряд', level: 1 }),
  ]),
  picks: emptyFeatPicks(),
}

const shadowTouched: AppliedFeatGrant = {
  id: 'grant-st-1',
  featCatalogId: 'feat-shadow-touched',
  slug: 'shadow-touched',
  nameRu: 'Отмеченный тенями',
  source: { kind: 'manual' },
  applied: packageWithSpells(
    [
      spell({ id: 'false-life', nameRu: 'Псевдожизнь', level: 1 }),
      spell({ id: 'invisibility', nameRu: 'Невидимость', level: 2 }),
    ],
    { abilityBonuses: { int: 1 } },
  ),
  picks: emptyFeatPicks(),
}

// --- create merge keeps Magic Initiate when player known has only class spells ---
{
  const withMi = applyFeatGrantToDraft({
    draft: emptyFeatSlice(),
    grant: magicInitiate,
  })
  const classCantrip = {
    ...createSheetSpell(),
    id: 'class:fire-bolt',
    name: 'Огненный снаряд',
    level: 0,
    source_kind: 'class' as const,
  }
  const playerSpells = {
    ...emptySpells(),
    known: [classCantrip],
  }
  const merged = mergeCreatePipelineSpells({
    playerSpells,
    draftSpells: withMi.spells,
    subclassGrantedIds: new Set(),
  })
  const miIds = expectedFeatSpellIds([magicInitiate], 1)
  assert(merged.known.some((row) => row.id === classCantrip.id), 'keeps class cantrip')
  for (const id of miIds) {
    assert(
      merged.known.some((row) => row.id === id),
      `merge keeps Magic Initiate row ${id}`,
    )
  }
  assert(
    merged.known.filter((row) => row.source_kind === 'feat').length === 3,
    'three feat rows after merge',
  )
}

// --- regression: old filter (race-only) would drop feat rows ---
{
  const withMi = applyFeatGrantToDraft({
    draft: emptyFeatSlice(),
    grant: magicInitiate,
  })
  const playerSpells = emptySpells()
  const oldBroken = {
    ...playerSpells,
    known: [
      ...playerSpells.known.filter((row) => row.source_kind !== 'race'),
      ...withMi.spells.known.filter((row) => row.source_kind === 'race'),
    ],
  }
  assert(oldBroken.known.length === 0, 'old race-only merge drops MI (repro)')
  const fixed = mergeCreatePipelineSpells({
    playerSpells,
    draftSpells: withMi.spells,
    subclassGrantedIds: new Set(),
  })
  assert(fixed.known.length === 3, 'fixed merge keeps MI')
}

// --- MI + Shadow Touched both present ---
{
  let draft = applyFeatGrantToDraft({
    draft: emptyFeatSlice(),
    grant: magicInitiate,
  })
  draft = applyFeatGrantToDraft({ draft, grant: shadowTouched })
  const merged = mergeCreatePipelineSpells({
    playerSpells: emptySpells(),
    draftSpells: draft.spells,
    subclassGrantedIds: new Set(),
  })
  assert(
    merged.known.some((row) => row.name === 'Указание'),
    'Guidance present',
  )
  assert(
    merged.known.some((row) => row.name === 'Направленный снаряд'),
    'Guiding Bolt present',
  )
  assert(
    merged.known.some((row) => row.name === 'Невидимость'),
    'Invisibility present',
  )
  assert(merged.known.length === 5, 'MI(3)+ST(2) = 5')
}

// --- heal existing sheet: ledger present, known empty ---
{
  const knownEmpty = emptySpells()
  assert(
    featSpellsMissingFromKnown({
      known: knownEmpty.known,
      featGrants: [magicInitiate],
      characterLevel: 1,
    }),
    'detects missing MI spells',
  )
  const healed = ensureFeatSpellsFromLedger({
    spells: knownEmpty,
    featGrants: [magicInitiate, shadowTouched],
    characterLevel: 1,
  })
  assert(healed.known.length === 5, 'heal rematerializes both feats')
  assert(
    !featSpellsMissingFromKnown({
      known: healed.known,
      featGrants: [magicInitiate, shadowTouched],
      characterLevel: 1,
    }),
    'heal clears missing flag',
  )
}

console.log('mergeCreatePipelineSpells.selfcheck: ok')
