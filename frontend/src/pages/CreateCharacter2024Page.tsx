/**
 * P24-M03 / M03c: D&D 2024 character creation wizard (create-at-N + multiclass).
 * Same shell and step order as the 2014 pipeline: вид → черта* → предыстория → класс →
 * характеристики → прокачка. Picks live in setup dialogs on phone / detail column on desktop.
 * Entry: `/characters/create?edition=2024&preview=1` (embedded from CreateCharacterPage).
 * Legacy `/characters/create-2024` redirects here.
 * «Прокачка» materializes levels 1–20 with per-level forks and multiclass (same engine as sheet).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LAND_TERRAINS_2024, type LandTerrain2024 } from '../shared/dnd/druid2024Features'
import {
  isVestigeCompanionType2024,
  isVestigeDomain2024,
  type VestigeCompanionType2024,
  type VestigeDomain2024,
} from '../shared/dnd/warlockBook2024Features'
import { readKnownForms } from '../features/characters/knownForms'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AbilitiesStep } from '../features/createPipeline/AbilitiesStep'
import { CatalogCardList, type CatalogCardItem } from '../features/createPipeline/CatalogCardList'
import { CreatePipelineShell } from '../features/createPipeline/CreatePipelineShell'
import { Create2024IdentityFields } from '../features/createPipeline2024/Create2024IdentityFields'
import { Create2024DetailPanel } from '../features/createPipeline2024/Create2024DetailPanel'
import {
  BackgroundPicks,
  BardLevelingPicks,
  BardBookLevelingPicks,
  PaladinBookLevelingPicks,
  FighterBookLevelingPicks,
  ArtificerLevelingPicks,
  BarbarianLevelingPicks,
  RangerLevelingPicks,
  RogueLevelingPicks,
  WarlockLevelingPicks,
  WizardBookLevelingPicks,
  ClericBookLevelingPicks,
  ClassPicks,
  SpeciesFeatPicks,
  SpeciesPicks,
} from '../features/createPipeline2024/Create2024Picks'
import { Create2024SheetPreview } from '../features/createPipeline2024/Create2024SheetPreview'
import { LevelingForks2024 } from '../features/createPipeline2024/LevelingForks2024'
import {
  buildSorcererSeedSpells,
  parseSorcererSeed,
  sorcererMetamagicForLevel,
  type SorcererSeedSpells,
} from '../features/createPipeline2024/e2eSorcererSeed2024'
import {
  buildWizardSeedSpells,
  parseWizardSeed,
  type WizardSeedSpells,
} from '../features/createPipeline2024/e2eWizardSeed2024'
import {
  buildMysticArtsSeedSpells,
  monkAsiChoicesForLevel,
  parseMonkSeed,
} from '../features/createPipeline2024/e2eMonkSeed2024'
import {
  buildWarlockClassOptionPicks,
  buildWarlockSeedSpells,
  parseWarlockSeed,
  warlockAsiChoicesForLevel,
} from '../features/createPipeline2024/e2eWarlockSeed2024'
import {
  parseClericSeed,
  buildClericSeedSpells,
  buildClericClassOptionPicks,
  clericAsiChoicesForLevel,
} from '../features/createPipeline2024/e2eClericSeed2024'
import {
  parseBardSeed,
  buildBardSeedSpells,
  buildBardClassOptionPicks,
  bardAsiChoicesForLevel,
} from '../features/createPipeline2024/e2eBardSeed2024'
import {
  parsePaladinSeed,
  buildPaladinSeedSpells,
  buildPaladinClassOptionPicks,
  paladinAsiChoicesForLevel,
} from '../features/createPipeline2024/e2ePaladinSeed2024'
import {
  parseRangerSeed,
  buildRangerSeedSpells,
  buildRangerClassOptionPicks,
  rangerAsiChoicesForLevel,
} from '../features/createPipeline2024/e2eRangerSeed2024'
import {
  parseArtificerSeed,
  buildArtificerSeedSpells,
  buildArtificerClassOptionPicks,
  artificerAsiChoicesForLevel,
} from '../features/createPipeline2024/e2eArtificerSeed2024'
import {
  parseFighterSeed,
  buildFighterClassOptionPicks,
  fighterAsiChoicesForLevel,
} from '../features/createPipeline2024/e2eFighterSeed2024'
import { createClassLevel, totalCharacterLevel } from '../shared/dnd/classLevels'
import { thirdCasterBlock2024 } from '../shared/dnd/edition2024Subclasses'
import { ensureHpChoices } from '../features/createPipeline/LevelingStep'
import type { AbilityScores } from '../shared/dnd/multiclassRules'
import {
  buildItemNameIndex,
  castingTimeLabelRu,
  hitDieLabel,
  sizeLabelRu,
  spellSchoolLabelRu,
} from '../features/createPipeline2024/create2024Labels'
import {
  catalogSpellLevel,
  originFeatNameOf,
  spellsByLevelForClass,
  spellsUpToLevelForClass,
} from '../features/createPipeline2024/create2024FeatPicks'
import {
  buildCreate2024SheetPreview,
  overlayServerCombat,
} from '../features/createPipeline2024/create2024SheetPreview'
import {
  backgroundAsiOverlay,
  backgroundAsiTrio,
  classStartingPacks,
  clearVestigePicksIfNeeded2024,
  create2024StepIssues,
  creatableSpecies,
  findFeat,
  humanOriginFeatOptions,
  nextCreate2024Step,
  prevCreate2024Step,
  setAsiPlus2Plus1,
  speciesLineages,
  speciesNeedsAncestry,
  speciesNeedsLineage,
  speciesSizeOptions,
  toggleSpellbookPick,
  toggleUniquePick,
} from '../features/createPipeline2024/createPipeline2024State'
import {
  ARCANE_TRICKSTER_LOCKED_CANTRIP,
  CREATE_2024_STEP_LABELS,
  classL1Spellcasting,
  classSpellcastingAtLevel,
  createEmptyCreate2024State,
  entryData,
  toCreate2024Request,
  usesSpellbook,
  visibleCreate2024Steps,
  type Create2024CatalogBundle,
  type Create2024State,
  type Create2024StepId,
  type LanguagesBundle,
} from '../features/createPipeline2024/createPipeline2024Types'
import { maxSpellLevelForClassAlone } from '../shared/dnd/casterProgression'
import { wizardCreateBookNeed2024 } from '../shared/dnd/wizardSpellbook2024'
import { useIsPhone } from '../features/createPipeline2024/useIsPhone'
import { listCatalogEntries, type CatalogEntry, type CatalogKind } from '../shared/api/catalog'
import {
  createCharacter2024,
  listCreate2024Languages,
  validateCreate2024,
  type CharacterCreate2024ValidateResponse,
} from '../shared/api/characters'
import { getAccessToken } from '../shared/api/client'
import { catalogSourceLabelRu } from '../shared/dnd/catalogSourceLabelRu'
import { CHARACTER_GENDER_LABELS, parseCharacterGender } from '../shared/dnd/characterGender'
import { ABILITY_LABEL_RU, type AbilityKey } from '../shared/dnd/pointBuy'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import { Button, Dialog, Stack, Text } from '../ui'

export type Create2024Harness = {
  catalog: Create2024CatalogBundle
  languages: LanguagesBundle
}

export type CreateCharacter2024PageProps = {
  /** DEV / e2e only: full catalog injected by the preview page (no API reads). */
  harness?: Create2024Harness | null
  rootTestId?: string
  /** Rendered inside another page (no own route): skip the preview / flag gate and the back link. */
  embedded?: boolean
}

function findBySlug(list: readonly CatalogEntry[], slug: string | null): CatalogEntry | null {
  if (!slug) return null
  return list.find((e) => e.slug === slug) ?? null
}

function byNameRu(list: readonly CatalogEntry[]): CatalogEntry[] {
  return [...list].sort((a, b) => a.name_ru.localeCompare(b.name_ru, 'ru'))
}

function mergeItems(catalog: Create2024CatalogBundle): CatalogEntry[] {
  const seen = new Set<string>()
  const out: CatalogEntry[] = []
  for (const row of [...catalog.items, ...catalog.weapons]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out
}

async function loadLiveCatalog(
  signal: AbortSignal,
): Promise<{ catalog: Create2024CatalogBundle; languages: LanguagesBundle }> {
  const q = (kind: CatalogKind) => listCatalogEntries({ kind, edition: '2024' }, signal)
  const [
    classes,
    subclasses,
    backgrounds,
    species,
    feats,
    weapons,
    armor,
    gear,
    spells,
    languages,
  ] = await Promise.all([
    q('class'),
    q('subclass'),
    q('background'),
    q('race'),
    q('feat'),
    q('weapon'),
    q('armor'),
    q('item'),
    q('spell'),
    listCreate2024Languages(signal),
  ])
  return {
    catalog: {
      classes,
      subclasses,
      backgrounds,
      species,
      feats,
      weapons,
      spells,
      items: [...armor, ...gear],
    },
    languages,
  }
}

function CreateShellMessage({
  rootTestId,
  title,
  children,
}: {
  rootTestId?: string
  title: string
  children?: ReactNode
}) {
  return (
    <main
      className="page page--app page--create-pipeline"
      data-testid={rootTestId}
    >
      <Stack gap={12}>
        <Text as="h1">{title}</Text>
        {children}
        <Link className="back-link" to="/characters">
          ← К списку персонажей
        </Link>
      </Stack>
    </main>
  )
}

type CatalogStepKind = 'class' | 'background' | 'species' | 'feat'

export function CreateCharacter2024Page({
  harness = null,
  rootTestId,
  embedded = false,
}: CreateCharacter2024PageProps) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const phone = useIsPhone()
  const previewQuery = params.get('preview') === '1'
  // Internal e2e: jump to leveling with seeded builds (screenshots / forks).
  const e2eLeveling = params.get('e2eLeveling') === '1'
  const e2eSeed = params.get('e2eSeed') || 'fighter5'
  /** Acceptance: jump to leveling at N but leave spell/book picks for the real UI. */
  const e2eEmptySpells = params.get('e2eEmptySpells') === '1'
  // Even when embedded in `/characters/create`, keep the M06 gate (preview or flag).
  const blocked = !harness && !previewQuery && !RULES_EDITION_2024_OPEN

  const [state, setState] = useState<Create2024State>(() => createEmptyCreate2024State())
  const [catalog, setCatalog] = useState<Create2024CatalogBundle | null>(harness?.catalog ?? null)
  const [languages, setLanguages] = useState<LanguagesBundle | null>(harness?.languages ?? null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validated, setValidated] = useState<CharacterCreate2024ValidateResponse | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [spellTab, setSpellTab] = useState<'cantrips' | 'book' | 'level1'>('cantrips')
  const [focusSpellSlug, setFocusSpellSlug] = useState<string | null>(null)
  const [harnessDone, setHarnessDone] = useState(false)
  const e2eLevelingSeeded = useRef(false)

  useEffect(() => {
    if (harness || blocked) return
    const ac = new AbortController()
    setLoadError(null)
    void loadLiveCatalog(ac.signal)
      .then((loaded) => {
        setCatalog(loaded.catalog)
        setLanguages(loaded.languages)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        const name = err instanceof Error ? err.name : ''
        if (name === 'AbortError') return
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : 'Не удалось загрузить каталог правил 2024.',
        )
      })
    return () => ac.abort()
  }, [harness, blocked, reloadKey])

  const items = useMemo(() => buildItemNameIndex(catalog ? mergeItems(catalog) : []), [catalog])
  const classNames = useMemo(
    () => new Map((catalog?.classes ?? []).map((c) => [c.slug, c.name_ru])),
    [catalog],
  )
  const classEntry = findBySlug(catalog?.classes ?? [], state.classSlug)
  const backgroundEntry = findBySlug(catalog?.backgrounds ?? [], state.backgroundSlug)
  const speciesEntry = findBySlug(catalog?.species ?? [], state.speciesSlug)
  const steps = useMemo(() => visibleCreate2024Steps(speciesEntry), [speciesEntry])
  const step = (steps.includes(state.step) ? state.step : steps[0]) as Create2024StepId

  useEffect(() => {
    if (!steps.includes(state.step) && steps[0]) {
      setState((prev) => ({ ...prev, step: steps[0]! }))
    }
  }, [steps, state.step])

  useEffect(() => {
    if (!e2eLeveling || !catalog || e2eLevelingSeeded.current) return
    const bySlug = (list: typeof catalog.classes, slug: string) =>
      list.find((e) => e.slug === slug)
    const soldier = bySlug(catalog.backgrounds, 'soldier') || catalog.backgrounds[0]
    const dwarf = bySlug(catalog.species, 'dwarf') || catalog.species[0]
    if (!soldier || !dwarf) return

    const make = (
      slug: string,
      level: number,
      subclass?: string | null,
    ): ReturnType<typeof createClassLevel> | null => {
      const entry = bySlug(catalog.classes, slug)
      if (!entry) return null
      const sub = subclass ? catalog.subclasses.find((s) => s.slug === subclass) : null
      return createClassLevel({
        name: entry.name_ru,
        catalog_id: entry.slug || entry.id,
        level,
        subclass_catalog_id: subclass || null,
        subclass_name: sub?.name_ru || '',
      })
    }

    type Seed = {
      name: string
      classSlug: string
      abilities: Create2024State['baseAbilities']
      rows: Array<{ slug: string; level: number; subclass?: string }>
      fighting?: string
      mastery?: number
      asi?: Create2024State['asiChoices']
      skills?: string[]
      classToolIds?: string[]
      backgroundAsi?: Create2024State['backgroundAsi']
      spells?: WizardSeedSpells | SorcererSeedSpells
      classOptionPicks?: Create2024State['classOptionPicks']
    }
    const seeds: Record<string, Seed> = {
      fighter5: {
        name: 'Тестовый воин',
        classSlug: 'fighter',
        abilities: { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 },
        rows: [{ slug: 'fighter', level: 5 }],
        fighting: 'defense',
        mastery: 3,
      },
      fighter4wizard1: {
        name: 'Воин 4 / Волшебник 1',
        classSlug: 'fighter',
        abilities: { str: 15, dex: 13, con: 14, int: 14, wis: 10, cha: 8 },
        rows: [
          { slug: 'fighter', level: 4, subclass: 'fighter__champion' },
          { slug: 'wizard', level: 1 },
        ],
        fighting: 'defense',
        mastery: 3,
        asi: [{ classSlug: 'fighter', classLevel: 4, kind: 'asi_plus2', abilities: { str: 2 } }],
      },
      wizard3cleric2: {
        name: 'Волшебник 3 / Жрец 2',
        classSlug: 'wizard',
        abilities: { str: 8, dex: 14, con: 13, int: 15, wis: 14, cha: 10 },
        rows: [
          { slug: 'wizard', level: 3, subclass: 'wizard__evoker' },
          { slug: 'cleric', level: 2 },
        ],
      },
      artificer3wizard1: {
        name: 'Артефактор 3 / Волшебник 1',
        classSlug: 'artificer',
        abilities: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
        rows: [
          { slug: 'artificer', level: 3 },
          { slug: 'wizard', level: 1 },
        ],
      },
      fighter3ekwizard2: {
        name: 'Воин 3 ЭК / Волшебник 2',
        classSlug: 'fighter',
        abilities: { str: 13, dex: 14, con: 14, int: 15, wis: 10, cha: 8 },
        rows: [
          { slug: 'fighter', level: 3, subclass: 'fighter__eldritch-knight' },
          { slug: 'wizard', level: 2 },
        ],
        fighting: 'defense',
        mastery: 3,
      },
      paladin2warlock3: {
        name: 'Паладин 2 / Колдун 3',
        classSlug: 'paladin',
        abilities: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 },
        rows: [
          { slug: 'paladin', level: 2 },
          { slug: 'warlock', level: 3, subclass: 'warlock__fiend-patron' },
        ],
        fighting: 'defense',
        mastery: 2,
      },
      paladin5warlock3: {
        name: 'Паладин 5 / Колдун 3',
        classSlug: 'paladin',
        abilities: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 },
        rows: [
          { slug: 'paladin', level: 5, subclass: 'paladin__oath-of-devotion' },
          { slug: 'warlock', level: 3, subclass: 'warlock__fiend-patron' },
        ],
        fighting: 'defense',
        mastery: 2,
      },
    }
    const wizardSpec = parseWizardSeed(e2eSeed)
    const wizardClass = bySlug(catalog.classes, 'wizard')
    if (wizardSpec && wizardClass) {
      const sub = wizardSpec.subclassSlug
      const wizardPicks: Create2024State['classOptionPicks'] = {}
      if (sub === 'wizard__enchanter' && wizardSpec.level >= 3) {
        wizardPicks.enchanting_conversationalist = 'persuasion'
      }
      if (sub === 'wizard__bladesinger' && wizardSpec.level >= 3) {
        wizardPicks.training_in_war_and_song = 'acrobatics'
      }
      if (sub === 'wizard__transmuter' && wizardSpec.level >= 3) {
        wizardPicks.transmuter_stone_benefit = 'speed'
      }
      if (sub === 'wizard__transmuter' && wizardSpec.level >= 10) {
        wizardPicks.transmuter_stone_benefit_2 = 'mighty_build'
      }
      seeds[e2eSeed] = {
        name: `Волшебник ${wizardSpec.level}`,
        classSlug: 'wizard',
        abilities: { str: 8, dex: 13, con: 14, int: 15, wis: 12, cha: 10 },
        rows: [
          {
            slug: 'wizard',
            level: wizardSpec.level,
            ...(sub ? { subclass: sub } : {}),
          },
        ],
        skills: ['arcana', 'history'],
        backgroundAsi: { con: 2, dex: 1 },
        spells: buildWizardSeedSpells(
          catalog.spells,
          wizardClass,
          wizardSpec.level,
          wizardSpec.subclassSlug,
        ),
        classOptionPicks: wizardPicks,
      }
    }
    const sorcererSpec = parseSorcererSeed(e2eSeed)
    const sorcererClass = bySlug(catalog.classes, 'sorcerer')
    if (sorcererSpec && sorcererClass) {
      seeds[e2eSeed] = {
        name: `Чародей ${sorcererSpec.level}`,
        classSlug: 'sorcerer',
        abilities: { str: 8, dex: 13, con: 14, int: 10, wis: 12, cha: 15 },
        rows: [
          {
            slug: 'sorcerer',
            level: sorcererSpec.level,
            ...(sorcererSpec.subclassSlug ? { subclass: sorcererSpec.subclassSlug } : {}),
          },
        ],
        skills: ['arcana', 'persuasion'],
        backgroundAsi: { con: 2, dex: 1 },
        spells: buildSorcererSeedSpells(catalog.spells, sorcererClass, sorcererSpec.level),
        classOptionPicks: { metamagic: sorcererMetamagicForLevel(sorcererSpec.level) },
      }
    }
    const monkSpec = parseMonkSeed(e2eSeed)
    const monkClass = bySlug(catalog.classes, 'monk')
    if (monkSpec && monkClass) {
      const mysticSpells =
        monkSpec.subclassSlug === 'monk__warrior-of-the-mystic-arts'
          ? buildMysticArtsSeedSpells(catalog.spells, monkSpec.level)
          : null
      seeds[e2eSeed] = {
        name: `Монах ${monkSpec.level}`,
        classSlug: 'monk',
        // Point-buy friendly: DEX/WIS primary, CON solid (dwarf + soldier bump CON/DEX).
        abilities: { str: 8, dex: 15, con: 13, int: 10, wis: 14, cha: 12 },
        rows: [
          {
            slug: 'monk',
            level: monkSpec.level,
            ...(monkSpec.subclassSlug ? { subclass: monkSpec.subclassSlug } : {}),
          },
        ],
        skills: ['acrobatics', 'stealth'],
        classToolIds: ['smiths-tools'],
        backgroundAsi: { con: 2, dex: 1 },
        asi: monkAsiChoicesForLevel(monkSpec.level),
        ...(mysticSpells ? { spells: mysticSpells } : {}),
      }
    }
    const warlockSpec = parseWarlockSeed(e2eSeed)
    const warlockClass = bySlug(catalog.classes, 'warlock')
    if (warlockSpec && warlockClass) {
      seeds[e2eSeed] = {
        name: `Колдун ${warlockSpec.level}`,
        classSlug: 'warlock',
        abilities: { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 },
        rows: [
          {
            slug: 'warlock',
            level: warlockSpec.level,
            ...(warlockSpec.subclassSlug ? { subclass: warlockSpec.subclassSlug } : {}),
          },
        ],
        skills: ['arcana', 'deception'],
        backgroundAsi: { con: 2, dex: 1 },
        asi: warlockAsiChoicesForLevel(warlockSpec.level),
        spells: buildWarlockSeedSpells(catalog.spells, warlockClass, warlockSpec.level),
        classOptionPicks: buildWarlockClassOptionPicks(
          warlockSpec.level,
          warlockSpec.subclassSlug,
        ),
      }
    }
    const clericSpec = parseClericSeed(e2eSeed)
    const clericClass = bySlug(catalog.classes, 'cleric')
    if (clericSpec && clericClass) {
      seeds[e2eSeed] = {
        name: `Жрец ${clericSpec.level}`,
        classSlug: 'cleric',
        abilities: { str: 8, dex: 12, con: 14, int: 10, wis: 15, cha: 13 },
        rows: [
          {
            slug: 'cleric',
            level: clericSpec.level,
            ...(clericSpec.subclassSlug ? { subclass: clericSpec.subclassSlug } : {}),
          },
        ],
        skills: ['insight', 'religion'],
        backgroundAsi: { con: 2, dex: 1 },
        asi: clericAsiChoicesForLevel(clericSpec.level),
        spells: buildClericSeedSpells(catalog.spells, clericClass, clericSpec.level),
        classOptionPicks: buildClericClassOptionPicks(
          clericSpec.level,
          clericSpec.subclassSlug,
        ),
      }
    }
    const bardSpec = parseBardSeed(e2eSeed)
    const bardClass = bySlug(catalog.classes, 'bard')
    if (bardSpec && bardClass) {
      // PHB 2024 Bard picks 3 class skills.
      const bardSkills = ['performance', 'persuasion', 'deception']
      seeds[e2eSeed] = {
        name: `Бард ${bardSpec.level}`,
        classSlug: 'bard',
        // Standard array 15/14/13/12/10/8 (CHA primary, DEX/CON next).
        abilities: { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 },
        rows: [
          {
            slug: 'bard',
            level: bardSpec.level,
            ...(bardSpec.subclassSlug ? { subclass: bardSpec.subclassSlug } : {}),
          },
        ],
        skills: bardSkills,
        classToolIds: ['lute'],
        backgroundAsi: { con: 2, dex: 1 },
        asi: bardAsiChoicesForLevel(bardSpec.level),
        spells: buildBardSeedSpells(catalog.spells, bardClass, bardSpec.level),
        classOptionPicks: buildBardClassOptionPicks(
          bardSpec.level,
          bardSpec.subclassSlug,
          bardSkills,
        ),
      }
    }
    const paladinSpec = parsePaladinSeed(e2eSeed)
    const paladinClass = bySlug(catalog.classes, 'paladin')
    if (paladinSpec && paladinClass) {
      const paladinSkills = ['athletics', 'persuasion']
      seeds[e2eSeed] = {
        name: `Паладин ${paladinSpec.level}`,
        classSlug: 'paladin',
        // Standard array; soldier ASI only str/dex/con — keep CHA high in base.
        abilities: { str: 13, dex: 10, con: 14, int: 8, wis: 12, cha: 15 },
        rows: [
          {
            slug: 'paladin',
            level: paladinSpec.level,
            ...(paladinSpec.subclassSlug ? { subclass: paladinSpec.subclassSlug } : {}),
          },
        ],
        skills: paladinSkills,
        backgroundAsi: { str: 2, con: 1 },
        asi: paladinAsiChoicesForLevel(paladinSpec.level),
        fighting: 'defense',
        mastery: Math.min(2, Math.max(0, paladinSpec.level >= 1 ? 2 : 0)),
        spells: buildPaladinSeedSpells(catalog.spells, paladinClass, paladinSpec.level),
        classOptionPicks: buildPaladinClassOptionPicks(
          paladinSpec.level,
          paladinSpec.subclassSlug,
        ),
      }
    }
    const rangerSpec = parseRangerSeed(e2eSeed)
    const rangerClass = bySlug(catalog.classes, 'ranger')
    if (rangerSpec && rangerClass) {
      const rangerSkills = ['perception', 'survival', 'stealth']
      seeds[e2eSeed] = {
        name: `Следопыт ${rangerSpec.level}`,
        classSlug: 'ranger',
        // Standard array; WIS primary, DEX/CON next.
        abilities: { str: 10, dex: 14, con: 13, int: 8, wis: 15, cha: 12 },
        rows: [
          {
            slug: 'ranger',
            level: rangerSpec.level,
            ...(rangerSpec.subclassSlug ? { subclass: rangerSpec.subclassSlug } : {}),
          },
        ],
        skills: rangerSkills,
        backgroundAsi: { dex: 2, con: 1 },
        asi: rangerAsiChoicesForLevel(rangerSpec.level),
        fighting: rangerSpec.level >= 2 ? 'defense' : undefined,
        mastery: Math.min(2, Math.max(0, rangerSpec.level >= 1 ? 2 : 0)),
        spells: buildRangerSeedSpells(catalog.spells, rangerClass, rangerSpec.level),
        classOptionPicks: buildRangerClassOptionPicks(
          rangerSpec.level,
          rangerSpec.subclassSlug,
        ),
      }
    }
    const artificerSpec = parseArtificerSeed(e2eSeed)
    const artificerClass = bySlug(catalog.classes, 'artificer')
    if (artificerSpec && artificerClass) {
      seeds[e2eSeed] = {
        name: `Артефактор ${artificerSpec.level}`,
        classSlug: 'artificer',
        // Soldier background ASI is str/dex/con only; keep INT high on the base array.
        abilities: { str: 10, dex: 13, con: 14, int: 15, wis: 12, cha: 8 },
        rows: [
          {
            slug: 'artificer',
            level: artificerSpec.level,
            ...(artificerSpec.subclassSlug ? { subclass: artificerSpec.subclassSlug } : {}),
          },
        ],
        skills: ['investigation', 'arcana'],
        classToolIds: ['smiths-tools'],
        backgroundAsi: { dex: 2, con: 1 },
        asi: artificerAsiChoicesForLevel(artificerSpec.level),
        spells: buildArtificerSeedSpells(catalog.spells, artificerClass, artificerSpec.level),
        classOptionPicks: buildArtificerClassOptionPicks(
          artificerSpec.level,
          artificerSpec.subclassSlug,
        ),
      }
    }
    const fighterSpec = parseFighterSeed(e2eSeed)
    if (fighterSpec) {
      const isArcher = fighterSpec.subclassSlug === 'fighter__arcane-archer'
      const isBanneret = fighterSpec.subclassSlug === 'fighter__banneret'
      seeds[e2eSeed] = {
        name: isArcher
          ? `Мистический лучник ${fighterSpec.level}`
          : isBanneret
            ? `Знаменосец ${fighterSpec.level}`
            : `Воин ${fighterSpec.level}`,
        classSlug: 'fighter',
        // Standard-array permutation (15/14/13/12/10/8). Archer: DEX+INT; Banneret: STR+CHA.
        abilities: isArcher
          ? { str: 12, dex: 15, con: 13, int: 14, wis: 10, cha: 8 }
          : isBanneret
            ? { str: 15, dex: 12, con: 13, int: 8, wis: 10, cha: 14 }
            : { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 },
        rows: [
          {
            slug: 'fighter',
            level: fighterSpec.level,
            ...(fighterSpec.subclassSlug ? { subclass: fighterSpec.subclassSlug } : {}),
          },
        ],
        skills: isArcher ? ['athletics', 'perception'] : ['athletics', 'perception'],
        // Soldier ASI is only str/dex/con — CHA for Banneret comes from the array.
        backgroundAsi: isArcher
          ? { dex: 2, con: 1 }
          : isBanneret
            ? { str: 2, con: 1 }
            : { str: 2, con: 1 },
        asi: fighterAsiChoicesForLevel(fighterSpec.level, fighterSpec.subclassSlug),
        fighting: 'defense',
        mastery: Math.min(6, fighterSpec.level >= 16 ? 6 : fighterSpec.level >= 10 ? 5 : fighterSpec.level >= 4 ? 4 : 3),
        classOptionPicks: buildFighterClassOptionPicks(
          fighterSpec.level,
          fighterSpec.subclassSlug,
        ),
      }
    }
    const seed = seeds[e2eSeed] || seeds.fighter5
    const classes = seed.rows
      .map((row) => make(row.slug, row.level, row.subclass))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
    if (!classes.length) return
    e2eLevelingSeeded.current = true
    const subclassByEntryId: Record<string, string | null> = {}
    for (let i = 0; i < classes.length; i += 1) {
      const sub = seed.rows[i]?.subclass
      if (sub) subclassByEntryId[classes[i]!.id] = sub
    }
    setState((prev) => ({
      ...prev,
      step: 'leveling',
      characterName: seed.name,
      gender: 'male',
      classSlug: seed.classSlug,
      backgroundSlug: soldier.slug,
      speciesSlug: dwarf.slug,
      speciesSize: 'medium',
      languageIds: ['elvish', 'dwarvish'],
      classSkillIds: seed.skills ?? ['athletics', 'perception'],
      classToolIds: seed.classToolIds ?? [],
      weaponMasteryIds: (catalog.weapons || []).slice(0, seed.mastery || 0).map((w) => w.slug),
      fightingStyleSlug: seed.fighting || null,
      backgroundAsiMode: '+2/+1',
      backgroundToolId: 'dice-set',
      backgroundAsi: seed.backgroundAsi ?? { str: 2, con: 1 },
      backgroundEquipment: 'pack',
      classEquipment: 'a',
      baseAbilities: seed.abilities,
      cantripIds: e2eEmptySpells ? [] : (seed.spells?.cantripIds ?? []),
      spellbookSpellIds: e2eEmptySpells ? [] : (seed.spells?.spellbookSpellIds ?? []),
      preparedSpellIds: e2eEmptySpells ? [] : (seed.spells?.preparedSpellIds ?? []),
      classOptionPicks: seed.classOptionPicks
        ? { ...state.classOptionPicks, ...seed.classOptionPicks }
        : state.classOptionPicks,
      classes,
      primaryClassEntryId: classes[0]!.id,
      hpChoices: ensureHpChoices(classes, []),
      characterLevel: totalCharacterLevel(classes),
      subclassByEntryId,
      subclassSlug: seed.rows[0]?.subclass || null,
      asiChoices: seed.asi || [],
    }))
  }, [e2eLeveling, e2eSeed, e2eEmptySpells, catalog])

  const issues = catalog
    ? create2024StepIssues(step, state, {
        classEntry,
        backgroundEntry,
        speciesEntry,
        languageChoiceCount: languages?.choice_count ?? 2,
        catalog,
        items,
      })
    : []
  const canNext = issues.length === 0

  const patch = useCallback((partial: Partial<Create2024State>) => {
    setState((prev) => ({ ...prev, ...partial }))
    setError(null)
    setValidated(null)
  }, [])

  function goToStep(nextStep: string) {
    if (!(steps as readonly string[]).includes(nextStep)) return
    setSetupOpen(false)
    const next = nextStep as Create2024StepId
    const curIdx = steps.indexOf(step)
    const nextIdx = steps.indexOf(next)
    // «Назад» сбрасывает только поля покидаемого шага (как в 2014).
    if (nextIdx >= 0 && nextIdx < curIdx) {
      if (step === 'leveling') {
        const primary = createClassLevel({
          id: state.primaryClassEntryId,
          name: classEntry?.name_ru || '',
          catalog_id: classEntry?.id || null,
          level: 1,
        })
        patch({
          step: next,
          classes: [primary],
          characterLevel: 1,
          hpChoices: ensureHpChoices([primary], []),
          asiChoices: [],
          subclassByEntryId: {},
          subclassSlug: null,
          multiclassSlug: null,
          cantripIds: [],
          spellbookSpellIds: [],
          preparedSpellIds: [],
        })
        return
      }
      if (step === 'abilities') {
        patch({
          step: next,
          abilityMethod: 'standard_array',
          baseAbilities: state.baseAbilities,
        })
        return
      }
    }
    patch({ step: next })
  }

  const requestKey = useMemo(() => JSON.stringify(toCreate2024Request(state)), [state])
  const liveValidate = Boolean(getAccessToken()) && !harness

  useEffect(() => {
    if (step !== 'leveling' || !liveValidate || !catalog) return
    const ac = new AbortController()
    const payload = JSON.parse(requestKey) as ReturnType<typeof toCreate2024Request>
    if (!state.characterName.trim()) return
    void validateCreate2024(payload, ac.signal)
      .then(setValidated)
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Не удалось проверить персонажа.')
      })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, requestKey, liveValidate, catalog])

  async function onFinish(asDraft = false) {
    if (!canNext || !catalog) return
    setBusy(true)
    setError(null)
    try {
      if (!getAccessToken()) {
        if (harness) {
          setHarnessDone(true)
          return
        }
        setError('Войдите в аккаунт, чтобы создать персонажа.')
        return
      }
      const payload = toCreate2024Request(state, {
        isPreview: !RULES_EDITION_2024_OPEN,
        isDraft: asDraft,
      })
      const created = await createCharacter2024(payload)
      navigate(`/characters/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать персонажа')
    } finally {
      setBusy(false)
    }
  }

  if (blocked) {
    return (
      <CreateShellMessage rootTestId={rootTestId} title="Создание персонажа 2024 пока закрыто">
        <Text tone="muted">Новая редакция правил ещё не открыта для игроков.</Text>
      </CreateShellMessage>
    )
  }

  if (loadError) {
    return (
      <CreateShellMessage rootTestId={rootTestId} title="Каталог правил 2024 недоступен">
        <Text tone="danger" data-testid="p24-m03-load-error">
          {loadError}
        </Text>
        <div>
          <Button onClick={() => setReloadKey((k) => k + 1)}>Повторить</Button>
        </div>
      </CreateShellMessage>
    )
  }

  if (!catalog || !languages) {
    return (
      <main className="page page--app page--create-pipeline" data-testid={rootTestId}>
        <Text tone="muted">Загрузка каталога правил 2024…</Text>
      </main>
    )
  }

  const catalogData = catalog
  const languagesData = languages
  const bonuses = backgroundAsiOverlay(state)
  const next = nextCreate2024Step(step, steps)
  const prev = prevCreate2024Step(step, steps)

  const issueNode =
    issues.length > 0 ? (
      <div className="create-2024__issues" data-testid="p24-m03-issues" role="status">
        <Text tone="muted">Осталось выбрать:</Text>
        <ul className="create-2024__list">
          {issues.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    ) : null

  const identityFields = (
    <Create2024IdentityFields state={state} speciesEntry={speciesEntry} patch={patch} />
  )

  function phoneSetupBar(title: string, name: string) {
    return (
      <div className="create-2024__setup-bar" data-testid="p24-m03-setup-bar">
        <Text>
          <strong>{name}</strong>
        </Text>
        <Text tone="muted">
          {issues.length ? `Осталось выбрать: ${issues.length}` : 'Все выборы сделаны'}
        </Text>
        <Button
          variant="secondary"
          onClick={() => setSetupOpen(true)}
          data-testid="p24-m03-setup-open"
        >
          {title}
        </Button>
      </div>
    )
  }

  function catalogStep(options: {
    testId: string
    list: ReactNode
    entry: CatalogEntry | null
    kind: CatalogStepKind
    emptyTitle: string
    setupTitle: string
    picks: ReactNode
  }) {
    const { testId, list, entry, kind, emptyTitle, setupTitle, picks } = options
    const panel = (withPicks: boolean) => (
      <Create2024DetailPanel
        kind={kind}
        entry={entry}
        emptyTitle={emptyTitle}
        feats={catalogData.feats}
        items={items}
      >
        {withPicks && entry ? (
          <div className="create-2024__setup" data-testid={`${testId}-setup`}>
            <Text as="h3" className="create-pipeline__section-title">
              Ваш выбор
            </Text>
            {picks}
            {issueNode}
          </div>
        ) : null}
      </Create2024DetailPanel>
    )
    return {
      cards: (
        <div data-testid={testId}>
          <Stack gap={12}>
            {list}
            {phone && entry ? phoneSetupBar(setupTitle, entry.name_ru) : null}
          </Stack>
        </div>
      ),
      detail: panel(!phone),
      setupDialog: (
        <Dialog
          open={phone && setupOpen && Boolean(entry)}
          title={setupTitle}
          size="wide"
          primaryLabel="Готово"
          onPrimary={() => setSetupOpen(false)}
          onSecondary={() => setSetupOpen(false)}
          closeOnBackdrop
        >
          <div data-testid={`${testId}-setup-dialog`}>{panel(true)}</div>
        </Dialog>
      ),
    }
  }

  let cards: ReactNode = null
  let detail: ReactNode = null
  let footer: ReactNode = null
  let setupDialog: ReactNode = null
  let detailPrimary = false

  if (step === 'species') {
    const built = catalogStep({
      testId: 'p24-m03-step-species',
      kind: 'species',
      entry: speciesEntry,
      emptyTitle: 'Вид',
      setupTitle: 'Настроить вид',
      picks: speciesEntry ? (
        <Stack gap={14}>
          {identityFields}
          <SpeciesPicks
            state={state}
            patch={patch}
            catalog={catalogData}
            items={items}
            speciesEntry={speciesEntry}
          />
        </Stack>
      ) : null,
      list: (
        <CatalogCardList
          resetToken={step}
          selectedId={speciesEntry?.id ?? null}
          cardTestIdPrefix="p24-m03-card"
          searchPlaceholder="Поиск вида…"
          items={byNameRu(creatableSpecies(catalogData.species)).map<CatalogCardItem>((e) => {
            const sizes = speciesSizeOptions(e).map(sizeLabelRu).join(' / ')
            const extra = speciesNeedsLineage(e)
              ? 'родословная'
              : speciesNeedsAncestry(e)
                ? 'наследие дракона'
                : ''
            return {
              id: e.id,
              title: e.name_ru,
              source: catalogSourceLabelRu(e.source),
              meta: [sizes, extra].filter(Boolean).join(' · '),
            }
          })}
          onSelect={(id) => {
            const entry = catalogData.species.find((e) => e.id === id)
            if (!entry) return
            const sizes = speciesSizeOptions(entry)
            patch({
              speciesSlug: entry.slug,
              speciesSize: sizes.length === 1 ? sizes[0]! : null,
              speciesLineageId: null,
              speciesAncestryId: null,
              speciesPicks: {},
              speciesFeatSlug: null,
              speciesFeatPicks: {},
            })
            setSetupOpen(true)
          }}
        />
      ),
    })
    cards = built.cards
    detail = built.detail
    setupDialog = built.setupDialog
  }

  if (step === 'feat') {
    const featEntry = findFeat(catalogData.feats, state.speciesFeatSlug)
    const options = humanOriginFeatOptions(catalogData.feats, null)
    const built = catalogStep({
      testId: 'p24-m03-step-feat',
      kind: 'feat',
      entry: featEntry,
      emptyTitle: 'Черта происхождения',
      setupTitle: 'Настроить черту',
      picks: featEntry ? (
        <SpeciesFeatPicks
          state={state}
          patch={patch}
          catalog={catalogData}
          items={items}
          featEntry={featEntry}
        />
      ) : null,
      list: (
        <CatalogCardList
          resetToken={step}
          selectedId={featEntry?.id ?? null}
          cardTestIdPrefix="p24-m03-card"
          searchPlaceholder="Поиск черты…"
          items={byNameRu(options).map<CatalogCardItem>((e) => ({
            id: e.id,
            title: e.name_ru,
            source: catalogSourceLabelRu(e.source),
          }))}
          onSelect={(id) => {
            const entry = catalogData.feats.find((e) => e.id === id)
            if (!entry) return
            patch({ speciesFeatSlug: entry.slug, speciesFeatPicks: {} })
            setSetupOpen(true)
          }}
        />
      ),
    })
    cards = built.cards
    detail = built.detail
    setupDialog = built.setupDialog
  }

  if (step === 'background') {
    const built = catalogStep({
      testId: 'p24-m03-step-background',
      kind: 'background',
      entry: backgroundEntry,
      emptyTitle: 'Предыстория',
      setupTitle: 'Настроить предысторию',
      picks: backgroundEntry ? (
        <BackgroundPicks
          state={state}
          patch={patch}
          catalog={catalogData}
          items={items}
          backgroundEntry={backgroundEntry}
          languages={languagesData}
        />
      ) : null,
      list: (
        <CatalogCardList
          resetToken={step}
          selectedId={backgroundEntry?.id ?? null}
          cardTestIdPrefix="p24-m03-card"
          searchPlaceholder="Поиск предыстории…"
          items={byNameRu(catalogData.backgrounds).map<CatalogCardItem>((e) => {
            const featName = originFeatNameOf(e)
            const trio = backgroundAsiTrio(e)
            return {
              id: e.id,
              title: e.name_ru,
              source: catalogSourceLabelRu(e.source),
              meta: [
                trio.length ? trio.map((k) => ABILITY_LABEL_RU[k]).join('/') : '',
                featName ? `черта: ${featName}` : '',
              ]
                .filter(Boolean)
                .join(' · '),
            }
          })}
          onSelect={(id) => {
            const entry = catalogData.backgrounds.find((e) => e.id === id)
            if (!entry) return
            const trio = backgroundAsiTrio(entry)
            patch({
              backgroundSlug: entry.slug,
              backgroundAsiMode: '+2/+1',
              backgroundAsi:
                trio.length >= 2 ? setAsiPlus2Plus1(trio, trio[0]!, trio[1]!) : {},
              backgroundToolId: null,
              backgroundEquipment: 'pack',
              originFeatPicks: {},
            })
            setSetupOpen(true)
          }}
        />
      ),
    })
    cards = built.cards
    detail = built.detail
    setupDialog = built.setupDialog
  }

  if (step === 'class') {
    const built = catalogStep({
      testId: 'p24-m03-step-class',
      kind: 'class',
      entry: classEntry,
      emptyTitle: 'Класс',
      setupTitle: 'Настроить класс',
      picks: classEntry ? (
        <ClassPicks
          state={state}
          patch={patch}
          catalog={catalogData}
          items={items}
          classEntry={classEntry}
        />
      ) : null,
      list: (
        <CatalogCardList
          resetToken={step}
          selectedId={classEntry?.id ?? null}
          cardTestIdPrefix="p24-m03-card"
          searchPlaceholder="Поиск класса…"
          items={byNameRu(catalogData.classes).map<CatalogCardItem>((e) => {
            const data = entryData(e)
            const primary = Array.isArray(data.primary_abilities)
              ? (data.primary_abilities as string[])
                  .map((a) => ABILITY_LABEL_RU[a as AbilityKey] ?? '')
                  .filter(Boolean)
                  .join(' / ')
              : ''
            return {
              id: e.id,
              title: e.name_ru,
              source: catalogSourceLabelRu(e.source),
              meta: [hitDieLabel(data.hit_die), primary].filter(Boolean).join(' · '),
            }
          })}
          onSelect={(id) => {
            const entry = catalogData.classes.find((e) => e.id === id)
            if (!entry) return
            const packs = classStartingPacks(entry)
            const primary = createClassLevel({
              id: state.primaryClassEntryId,
              name: entry.name_ru,
              catalog_id: entry.id,
              level: 1,
            })
            patch({
              classSlug: entry.slug,
              classSkillIds: [],
              weaponMasteryIds: [],
              fightingStyleSlug: null,
              classOptionPicks: {},
              classToolIds: [],
              classEquipment: packs[0]?.id || 'a',
              cantripIds: [],
              spellbookSpellIds: [],
              preparedSpellIds: [],
              subclassSlug: null,
              classes: [primary],
              primaryClassEntryId: primary.id,
              hpChoices: ensureHpChoices([primary], []),
              asiChoices: [],
              subclassByEntryId: {},
              characterLevel: 1,
            })
            setSpellTab('cantrips')
            setSetupOpen(true)
          }}
        />
      ),
    })
    cards = built.cards
    detail = built.detail
    setupDialog = built.setupDialog
  }

  if (step === 'abilities') {
    detailPrimary = true
    const trio = backgroundAsiTrio(backgroundEntry)
    cards = (
      <Stack gap={8}>
        <Text as="h3" className="create-pipeline__section-title">
          Бонусы предыстории
        </Text>
        <Text tone="muted">
          Бонусы даёт предыстория «{backgroundEntry?.name_ru ?? '—'}», вид характеристики не
          меняет. Потолок после бонусов — 20.
        </Text>
        <ul className="create-2024__list">
          {trio.map((k) => (
            <li key={k}>
              {ABILITY_LABEL_RU[k]}: {bonuses[k] ? `+${bonuses[k]}` : 'без бонуса'}
            </li>
          ))}
        </ul>
      </Stack>
    )
    detail = (
      <div data-testid="p24-m03-step-abilities">
        <Stack gap={12}>
          <AbilitiesStep
            method={state.abilityMethod}
            baseAbilities={state.baseAbilities}
            racialBonuses={bonuses}
            classSlug={state.classSlug}
            bonusLabel="предыстория"
            onMethodChange={(abilityMethod) => patch({ abilityMethod })}
            onBaseChange={(baseAbilities) => patch({ baseAbilities })}
          />
          {issueNode}
        </Stack>
      </div>
    )
  }

  if (step === 'leveling') {
    detailPrimary = true
    const classSlug = state.classSlug || ''
    const primaryRow =
      state.classes.find((row) => row.id === state.primaryClassEntryId) ?? state.classes[0]
    const subclassSlug =
      (primaryRow && state.subclassByEntryId[primaryRow.id]) || state.subclassSlug || null
    const wizardLevel = Math.max(
      1,
      state.classes.find((c) => c.name === classEntry?.name_ru || classSlug === 'wizard')?.level ??
        (classSlug === 'wizard' ? state.characterLevel : 1),
    )
    const sc =
      classSpellcastingAtLevel(classEntry, wizardLevel, {
        divineOrder:
          classSlug === 'cleric' ? String(state.classOptionPicks.divine_order || '') : null,
        primalOrder:
          classSlug === 'druid' ? String(state.classOptionPicks.primal_order || '') : null,
        subclassSlug,
      }) ?? (subclassSlug ? null : classL1Spellcasting(classEntry))
    const spellListSlug = sc?.spellListSlug || classSlug
    const lockedCantrips = sc?.lockedCantrips ?? []
    const maxBookCircle = Math.max(
      1,
      sc && sc.maxSlotLevel > 0
        ? sc.maxSlotLevel
        : maxSpellLevelForClassAlone(
            sc?.spellListSlug && sc.spellListSlug !== classSlug ? 'third' : 'full',
            wizardLevel,
          ) || 1,
    )
    const cantrips = spellsByLevelForClass(catalogData.spells, 0, [spellListSlug])
    const bookPool = spellsUpToLevelForClass(catalogData.spells, maxBookCircle, [spellListSlug])
    // Magical Secrets (bard 10+): prepared picker unions Bard + Wizard + Druid + Cleric
    // (same extra lists as GrimoireDialog extraListSlugs).
    const preparedListSlugs =
      classSlug === 'bard' && wizardLevel >= 10
        ? (['bard', 'wizard', 'druid', 'cleric'] as const)
        : ([spellListSlug] as const)
    // Prepared casters (sorcerer 2024 etc.): same circle cap as slots — not L1-only.
    const preparedPool = spellsUpToLevelForClass(
      catalogData.spells,
      maxBookCircle,
      preparedListSlugs,
    )
    const wizardBook = usesSpellbook(classSlug)
    const bookSlugs = new Set(state.spellbookSpellIds)
    let tab: 'cantrips' | 'book' | 'level1' = spellTab
    if (!wizardBook && tab === 'book') tab = 'level1'
    if (tab === 'cantrips' && (sc?.cantrips ?? 0) === 0) tab = wizardBook ? 'book' : 'level1'
    const spellList =
      tab === 'cantrips'
        ? cantrips
        : tab === 'book'
          ? bookPool
          : wizardBook
            ? bookPool.filter((row) => bookSlugs.has(row.slug))
            : preparedPool
    const selected =
      tab === 'cantrips'
        ? state.cantripIds
        : tab === 'book'
          ? state.spellbookSpellIds
          : state.preparedSpellIds
    const wizardBookNeed = wizardCreateBookNeed2024({
      wizardLevel,
      subclassSlug: state.subclassSlug || null,
    })
    const max =
      tab === 'cantrips'
        ? (sc?.cantrips ?? 0)
        : tab === 'book'
          ? wizardBookNeed
          : (sc?.prepared_spells ?? 0)
    const focus =
      catalogData.spells.find((row) => row.slug === focusSpellSlug) ??
      spellList.find((row) => row.slug === selected[selected.length - 1]) ??
      null

    const totalLevel = Math.max(1, totalCharacterLevel(state.classes) || state.characterLevel)
    const finalAbilities = {
      str: state.baseAbilities.str + (bonuses.str || 0),
      dex: state.baseAbilities.dex + (bonuses.dex || 0),
      con: state.baseAbilities.con + (bonuses.con || 0),
      int: state.baseAbilities.int + (bonuses.int || 0),
      wis: state.baseAbilities.wis + (bonuses.wis || 0),
      cha: state.baseAbilities.cha + (bonuses.cha || 0),
    } as AbilityScores

    // Keep primary class row labelled when arriving from earlier steps.
    const levelingClasses =
      state.classes[0] && classEntry
        ? state.classes.map((row, index) =>
            index === 0
              ? {
                  ...row,
                  name: row.name || classEntry.name_ru,
                  catalog_id: row.catalog_id || classEntry.id,
                }
              : row,
          )
        : state.classes

    const model =
      classEntry && backgroundEntry && speciesEntry
        ? overlayServerCombat(
            buildCreate2024SheetPreview({
              state: {
                ...state,
                characterName: state.characterName.trim() || 'Без имени',
                characterLevel: totalLevel,
              },
              catalog: catalogData,
              languages: languagesData,
              classEntry,
              backgroundEntry,
              speciesEntry,
              items,
            }),
            validated?.sheet,
          )
        : null
    const humanFeat = findFeat(catalogData.feats, state.speciesFeatSlug)
    const genderLabel = parseCharacterGender(state.gender)
    const classSummary = levelingClasses
      .filter((row) => row.level > 0)
      .map((row) => `${row.name || 'Класс'} ${row.level}`)
      .join(' / ')
    const choices: Array<[string, string]> = [
      ['Имя', state.characterName.trim() || '—'],
      ['Пол', genderLabel ? CHARACTER_GENDER_LABELS[genderLabel] : '—'],
      ['Вид', speciesEntry?.name_ru ?? '—'],
      ['Предыстория', backgroundEntry?.name_ru ?? '—'],
      ['Классы', classSummary || classEntry?.name_ru || '—'],
      [
        'Увеличение характеристик',
        Object.entries(state.backgroundAsi)
          .map(([k, v]) => `${ABILITY_LABEL_RU[k as AbilityKey]} +${v}`)
          .join(', ') || '—',
      ],
      ['Уровень', String(totalLevel)],
    ]
    if (humanFeat) choices.push(['Гибкий', humanFeat.name_ru])
    const lineage = speciesLineages(speciesEntry).find((l) => l.id === state.speciesLineageId)
    if (lineage) choices.push(['Родословная', lineage.name_ru])

    cards = (
      <Stack gap={8}>
        <Text as="h3" className="create-pipeline__section-title">
          Ваш выбор
        </Text>
        <ul className="create-2024__list">
          {choices.map(([label, value]) => (
            <li key={label}>
              <strong>{label}:</strong> {value}
            </li>
          ))}
        </ul>
      </Stack>
    )
    detail = (
      <div data-testid="p24-m03-step-leveling">
        <Stack gap={16}>
          <LevelingForks2024
            classes={levelingClasses}
            classCatalog={[...catalogData.classes, ...(catalogData.subclasses ?? [])]}
            abilities={finalAbilities}
            hpChoices={
              state.hpChoices.length
                ? state.hpChoices
                : ensureHpChoices(levelingClasses, [])
            }
            primaryClassEntryId={state.primaryClassEntryId}
            subclassByEntryId={state.subclassByEntryId}
            asiChoices={state.asiChoices}
            fightingStyleNameRu={
              state.fightingStyleSlug
                ? findFeat(catalogData.feats, state.fightingStyleSlug)?.name_ru || 'Боевой стиль'
                : null
            }
            weaponMasteryNamesRu={state.weaponMasteryIds.map((slug) => {
              const weapon = catalogData.weapons.find((w) => w.slug === slug)
              return weapon?.name_ru || slug
            })}
            onClassesChange={(classes) => {
              const primary =
                classes.find((row) => row.id === state.primaryClassEntryId) ?? classes[0]
              const newLevel = Math.max(1, primary?.level ?? 1)
              const patchBody: Partial<Create2024State> = {
                classes,
                characterLevel: totalCharacterLevel(classes),
                hpChoices: ensureHpChoices(classes, state.hpChoices),
              }
              if (state.classSlug === 'wizard') {
                const sub =
                  (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || null
                const effectiveSub = newLevel < 3 ? null : sub
                const bookNeed = wizardCreateBookNeed2024({
                  wizardLevel: newLevel,
                  subclassSlug: effectiveSub,
                })
                if (state.spellbookSpellIds.length > bookNeed) {
                  patchBody.spellbookSpellIds = state.spellbookSpellIds.slice(0, bookNeed)
                  patchBody.preparedSpellIds = state.preparedSpellIds.filter((id) =>
                    (patchBody.spellbookSpellIds ?? state.spellbookSpellIds).includes(id),
                  )
                }
                const nextPicks = { ...state.classOptionPicks }
                let picksChanged = false
                if (newLevel < 3) {
                  for (const key of [
                    'enchanting_conversationalist',
                    'training_in_war_and_song',
                    'transmuter_stone_benefit',
                    'transmuter_stone_benefit_2',
                  ] as const) {
                    if (nextPicks[key] != null) {
                      delete nextPicks[key]
                      picksChanged = true
                    }
                  }
                  patchBody.subclassSlug = null
                  if (primary) {
                    patchBody.subclassByEntryId = {
                      ...state.subclassByEntryId,
                      [primary.id]: null,
                    }
                  }
                } else if (newLevel < 10 && nextPicks.transmuter_stone_benefit_2 != null) {
                  delete nextPicks.transmuter_stone_benefit_2
                  picksChanged = true
                }
                if (picksChanged) patchBody.classOptionPicks = nextPicks
              }
              if (state.classSlug === 'monk') {
                const sub =
                  (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || null
                const mystic = sub === 'monk__warrior-of-the-mystic-arts'
                if (mystic && newLevel < 3) {
                  patchBody.subclassSlug = null
                  if (primary) {
                    patchBody.subclassByEntryId = {
                      ...state.subclassByEntryId,
                      [primary.id]: null,
                    }
                  }
                  patchBody.cantripIds = []
                  patchBody.preparedSpellIds = []
                } else if (mystic) {
                  const third = thirdCasterBlock2024(sub, newLevel)
                  if (third) {
                    const canNeed = Number(third.cantrips || 0)
                    const prepNeed = Number(third.prepared_spells || 0)
                    if (state.cantripIds.length > canNeed) {
                      patchBody.cantripIds = state.cantripIds.slice(0, canNeed)
                    }
                    if (state.preparedSpellIds.length > prepNeed) {
                      patchBody.preparedSpellIds = state.preparedSpellIds.slice(0, prepNeed)
                    }
                  }
                }
              }
              if (state.classSlug === 'warlock') {
                const sub =
                  (primary && state.subclassByEntryId[primary.id]) || state.subclassSlug || null
                const cleared = clearVestigePicksIfNeeded2024(
                  state.classOptionPicks,
                  newLevel < 3 ? null : sub,
                  newLevel,
                )
                if (cleared !== state.classOptionPicks) {
                  patchBody.classOptionPicks = cleared
                }
              }
              if (state.classSlug === 'paladin') {
                const nextPicks = { ...state.classOptionPicks }
                let picksChanged = false
                if (newLevel < 7 && nextPicks.elemental_shielding_type != null) {
                  delete nextPicks.elemental_shielding_type
                  picksChanged = true
                }
                if (newLevel < 3 && nextPicks.genies_splendor_skill != null) {
                  delete nextPicks.genies_splendor_skill
                  picksChanged = true
                }
                if (picksChanged) patchBody.classOptionPicks = nextPicks
              }
              if (state.classSlug === 'fighter') {
                const nextPicks = { ...state.classOptionPicks }
                let picksChanged = false
                if (newLevel < 3) {
                  for (const key of [
                    'arcane_archer_lore_cantrip',
                    'arcane_shot_options',
                    'knightly_envoy_language',
                    'knightly_envoy_skill',
                  ]) {
                    if (nextPicks[key] != null) {
                      delete nextPicks[key]
                      picksChanged = true
                    }
                  }
                }
                if (picksChanged) patchBody.classOptionPicks = nextPicks
              }
              patch(patchBody)
            }}
            onHpChoicesChange={(hpChoices) => patch({ hpChoices })}
            onSubclassChange={(classEntryId, subclassSlug) => {
              const next = {
                ...state.subclassByEntryId,
                [classEntryId]: subclassSlug,
              }
              const primarySub =
                classEntryId === state.primaryClassEntryId ? subclassSlug : state.subclassSlug
              const patchBody: Partial<Create2024State> = {
                subclassByEntryId: next,
                subclassSlug: primarySub,
              }
              // Arcane Trickster: Mage Hand is mandatory from 3rd — lock it into cantrips.
              if (
                classEntryId === state.primaryClassEntryId &&
                subclassSlug === 'rogue__arcane-trickster' &&
                !state.cantripIds.includes(ARCANE_TRICKSTER_LOCKED_CANTRIP)
              ) {
                patchBody.cantripIds = [
                  ARCANE_TRICKSTER_LOCKED_CANTRIP,
                  ...state.cantripIds.filter((id) => id !== ARCANE_TRICKSTER_LOCKED_CANTRIP),
                ]
              }
              // Leaving mystic arts clears its third-caster picks.
              if (
                classEntryId === state.primaryClassEntryId &&
                state.subclassSlug === 'monk__warrior-of-the-mystic-arts' &&
                subclassSlug !== 'monk__warrior-of-the-mystic-arts'
              ) {
                patchBody.cantripIds = []
                patchBody.preparedSpellIds = []
              }
              // Leaving Vestige Patron (or picking a different patron) clears domain/companion.
              if (classEntryId === state.primaryClassEntryId && state.classSlug === 'warlock') {
                const primary =
                  state.classes.find((row) => row.id === state.primaryClassEntryId) ??
                  state.classes[0]
                const warlockLevel = Math.max(1, primary?.level ?? state.characterLevel ?? 1)
                const cleared = clearVestigePicksIfNeeded2024(
                  state.classOptionPicks,
                  subclassSlug,
                  warlockLevel,
                )
                if (cleared !== state.classOptionPicks) {
                  patchBody.classOptionPicks = cleared
                }
              }
              patch(patchBody)
            }}
            onAsiChoicesChange={(asiChoices) => patch({ asiChoices })}
            blessedStrikesPick={
              state.classOptionPicks.blessed_strikes === 'divine_strike' ||
              state.classOptionPicks.blessed_strikes === 'potent_spellcasting'
                ? state.classOptionPicks.blessed_strikes
                : null
            }
            onBlessedStrikesChange={(pick) =>
              patch({ classOptionPicks: { ...state.classOptionPicks, blessed_strikes: pick } })
            }
            elementalFuryPick={
              state.classOptionPicks.elemental_fury === 'potent_spellcasting' ||
              state.classOptionPicks.elemental_fury === 'primal_strike'
                ? state.classOptionPicks.elemental_fury
                : null
            }
            onElementalFuryChange={(pick) =>
              patch({ classOptionPicks: { ...state.classOptionPicks, elemental_fury: pick } })
            }
            landChoicePick={
              LAND_TERRAINS_2024.some((row) => row.id === state.classOptionPicks.land_choice)
                ? (state.classOptionPicks.land_choice as LandTerrain2024)
                : null
            }
            onLandChoiceChange={(pick) =>
              patch({ classOptionPicks: { ...state.classOptionPicks, land_choice: pick } })
            }
            vestigeDomainPick={
              isVestigeDomain2024(String(state.classOptionPicks.vestige_domain || ''))
                ? (state.classOptionPicks.vestige_domain as VestigeDomain2024)
                : null
            }
            onVestigeDomainChange={(pick) =>
              patch({ classOptionPicks: { ...state.classOptionPicks, vestige_domain: pick } })
            }
            vestigeCompanionTypePick={
              isVestigeCompanionType2024(String(state.classOptionPicks.vestige_companion_type || ''))
                ? (state.classOptionPicks.vestige_companion_type as VestigeCompanionType2024)
                : null
            }
            onVestigeCompanionTypeChange={(pick) =>
              patch({
                classOptionPicks: { ...state.classOptionPicks, vestige_companion_type: pick },
              })
            }
            knownFormsPick={readKnownForms(state.classOptionPicks.known_forms)}
            onKnownFormsChange={(forms) =>
              patch({ classOptionPicks: { ...state.classOptionPicks, known_forms: forms } })
            }
            onOpenSpells={() => {
              setSpellTab(wizardBook ? 'book' : 'cantrips')
              setFocusSpellSlug(null)
            }}
            onOpenFork={(_classEntryId, _classLevel, kind) => {
              // Epic boon catalog is still a stub; class features for sorcerer/wizard packs are real.
              if (kind === 'epic_boon') {
                setError(
                  'Эпический дар: каталог дополнится пачками M02 — развилка сохранена как заглушка.',
                )
              }
            }}
          />
          {classSlug === 'bard' && model ? (
            <BardLevelingPicks
              state={state}
              patch={patch}
              proficientSkillIds={model.skills.filter((row) => row.proficient).map((row) => row.key)}
              allSkillIds={model.skills.map((row) => row.key)}
            />
          ) : null}
          {classSlug === 'bard' ? <BardBookLevelingPicks state={state} patch={patch} /> : null}
          {classSlug === 'paladin' ? <PaladinBookLevelingPicks state={state} patch={patch} /> : null}
          {classSlug === 'fighter' ? <FighterBookLevelingPicks state={state} patch={patch} /> : null}
          {classSlug === 'rogue' ? <RogueLevelingPicks state={state} patch={patch} /> : null}
          {classSlug === 'ranger' ? <RangerLevelingPicks state={state} patch={patch} /> : null}
          {classSlug === 'warlock' ? <WarlockLevelingPicks state={state} patch={patch} /> : null}
          {classSlug === 'wizard' ? <WizardBookLevelingPicks state={state} patch={patch} /> : null}
          {classSlug === 'cleric' ? <ClericBookLevelingPicks state={state} patch={patch} /> : null}
          {classSlug === 'barbarian' ? (
            <BarbarianLevelingPicks state={state} patch={patch} catalog={catalog} />
          ) : null}
          {classSlug === 'artificer' ? (
            <ArtificerLevelingPicks state={state} patch={patch} catalog={catalog} />
          ) : null}
          {sc ? (
            <div data-testid="p24-m03-step-spells">
              <CatalogCardList
                resetToken={`${step}-${tab}`}
                selectedId={null}
                selectedIds={selected}
                cardTestIdPrefix="p24-m03-card"
                searchPlaceholder="Поиск заклинания…"
                items={spellList.map<CatalogCardItem>((row) => {
                  const circle = catalogSpellLevel(row)
                  const circleLabel =
                    circle <= 0 ? 'Заговор' : `${circle} круг`
                  return {
                    id: row.slug,
                    title: row.name_ru,
                    source: catalogSourceLabelRu(row.source),
                    meta: `${circleLabel} · ${spellSchoolLabelRu(row)} · ${castingTimeLabelRu(row)}`,
                  }
                })}
                headerSlot={
                  <Stack gap={8}>
                    <div className="create-2024__tabs" role="tablist" aria-label="Тип заклинаний">
                      {sc.cantrips > 0 ? (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tab === 'cantrips'}
                          className={`create-pipeline__chip${tab === 'cantrips' ? ' create-pipeline__chip--active' : ''}`}
                          onClick={() => setSpellTab('cantrips')}
                          data-testid="p24-m03-spell-tab-cantrips"
                        >
                          Заговоры {state.cantripIds.length}/{sc.cantrips}
                        </button>
                      ) : null}
                      {wizardBook ? (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tab === 'book'}
                          className={`create-pipeline__chip${tab === 'book' ? ' create-pipeline__chip--active' : ''}`}
                          onClick={() => setSpellTab('book')}
                          data-testid="p24-m03-spell-tab-book"
                        >
                          В книгу {state.spellbookSpellIds.length}/{wizardBookNeed}
                        </button>
                      ) : null}
                      {sc.prepared_spells > 0 ? (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tab === 'level1'}
                          className={`create-pipeline__chip${tab === 'level1' ? ' create-pipeline__chip--active' : ''}`}
                          onClick={() => setSpellTab('level1')}
                          data-testid="p24-m03-spell-tab-level1"
                        >
                          Подготовка {state.preparedSpellIds.length}/{sc.prepared_spells}
                        </button>
                      ) : null}
                    </div>
                    <p
                      className="ui-text ui-text--muted"
                      data-testid="p24-m03-spell-pick-counter"
                    >
                      Выбрано {selected.length} из {max}
                      {wizardBook && tab === 'book'
                        ? `. Книга: ≥6 первого круга, далее любой доступный · круги 1–${maxBookCircle}.`
                        : null}
                      {!wizardBook && tab === 'cantrips' && lockedCantrips.includes(ARCANE_TRICKSTER_LOCKED_CANTRIP)
                        ? '. «Волшебная рука» обязательна; ещё заговоры волшебника (её заменить нельзя).'
                        : null}
                      {!wizardBook && tab === 'level1' && maxBookCircle > 0
                        ? classSlug === 'bard' && wizardLevel >= 10
                          ? `. Магические тайны: списки Барда, Волшебника, Друида, Жреца · круги 1–${maxBookCircle}.`
                          : spellListSlug === 'wizard' && classSlug !== 'wizard'
                            ? `. Подготовка из списка Волшебника (без ограничения школ) · круги 1–${maxBookCircle}.`
                            : `. Подготовка из списка класса · круги 1–${maxBookCircle} (по ячейкам).`
                        : null}
                    </p>
                  </Stack>
                }
                onSelect={(slug) => {
                  setFocusSpellSlug(slug)
                  if (tab === 'book') {
                    const entry = catalogData.spells.find((row) => row.slug === slug)
                    if (entry && catalogSpellLevel(entry) > maxBookCircle) return
                    patch(
                      toggleSpellbookPick(
                        state.spellbookSpellIds,
                        state.preparedSpellIds,
                        slug,
                        wizardBookNeed,
                      ),
                    )
                    return
                  }
                  if (tab === 'level1' && !wizardBook) {
                    const entry = catalogData.spells.find((row) => row.slug === slug)
                    if (entry && catalogSpellLevel(entry) > maxBookCircle) return
                  }
                  if (tab === 'cantrips' && lockedCantrips.includes(slug) && selected.includes(slug)) {
                    // Locked AT Mage Hand (and similar) cannot be deselected.
                    return
                  }
                  const nextList = toggleUniquePick(selected, slug, max)
                  if (tab === 'cantrips') {
                    const withLocked = [
                      ...lockedCantrips.filter((id) => !nextList.includes(id)),
                      ...nextList,
                    ].slice(0, Math.max(max, lockedCantrips.length))
                    // Keep locked cantrips even if toggleUniquePick dropped them for cap.
                    const merged = Array.from(
                      new Set([...lockedCantrips, ...withLocked]),
                    ).slice(0, max)
                    // If over cap after forcing locked, drop non-locked from the end.
                    while (merged.length > max) {
                      const idx = [...merged].reverse().findIndex((id) => !lockedCantrips.includes(id))
                      if (idx < 0) break
                      merged.splice(merged.length - 1 - idx, 1)
                    }
                    patch({ cantripIds: merged })
                  } else {
                    patch({ preparedSpellIds: nextList })
                  }
                }}
              />
              {focus ? (
                <Create2024DetailPanel
                  kind="spell"
                  entry={focus}
                  emptyTitle="Заклинания"
                  classNames={classNames}
                />
              ) : null}
            </div>
          ) : null}
          {model ? <Create2024SheetPreview model={model} /> : null}
          {validated?.warnings?.length ? (
            <ul className="create-2024__list">
              {validated.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {issueNode}
          {harnessDone ? (
            <Text tone="muted" data-testid="p24-m03-harness-done">
              Тестовый стенд: запись персонажа отключена.
            </Text>
          ) : null}
        </Stack>
      </div>
    )
    footer = (
      <div className="create-pipeline__footer-actions">
        <Button
          variant="secondary"
          disabled={busy || !canNext}
          onClick={() => void onFinish(true)}
          data-testid="p24-m03-draft"
        >
          Сохранить черновик
        </Button>
        <Button
          disabled={busy || !canNext}
          onClick={() => void onFinish(false)}
          data-testid="p24-m03-finish"
        >
          {busy ? 'Создаём…' : 'Готово'}
        </Button>
      </div>
    )
  }

  if (!footer) {
    footer = (
      <Button
        disabled={!canNext || !next}
        onClick={() => next && goToStep(next)}
        data-testid="p24-m03-next"
      >
        Далее
      </Button>
    )
  }

  return (
    <main className="page page--app page--create-pipeline" data-testid={rootTestId}>
      {embedded ? null : (
        <div className="create-pipeline__topbar">
          <Link className="back-link" to="/characters">
            ← К списку
          </Link>
          <Text tone="muted">Создание · D&D 2024</Text>
        </div>
      )}
      {error ? (
        <Text tone="danger" data-testid="p24-m03-error">
          {error}
        </Text>
      ) : null}
      <CreatePipelineShell
        step={step}
        steps={steps}
        stepLabels={CREATE_2024_STEP_LABELS}
        title="Создание персонажа"
        subtitle="Вид → черта* → предыстория → класс → характеристики → прокачка"
        cards={cards}
        detail={detail}
        footer={footer}
        detailPrimary={detailPrimary}
        onStepClick={goToStep}
        onBack={prev ? () => goToStep(prev) : () => navigate('/characters')}
      />
      {setupDialog}
    </main>
  )
}
