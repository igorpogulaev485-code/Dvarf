/**
 * Lightweight self-check: npx --yes tsx src/shared/dnd/raceNaturalWeapons.selfcheck.ts
 *
 * Expected natural-weapon dice from handbook / dnd.su audit (EEPC/POA for aarakocra talons;
 * MPMM peers; VRGtR dhampir). Uses inlined catalog slices so `tsc` stays node-free.
 */
import { resolveRaceGrantDef } from './raceGrants.ts'
import {
  ensureRaceNaturalWeaponAttacks,
  raceNaturalWeaponAttacksMatch,
} from '../../features/characters/raceEffects.ts'
import type { WeaponAttack } from '../../features/characters/AttacksPanel.tsx'
import type { AppliedRaceGrant } from './raceGrants.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

type NwExpect = { id: string; damage: string; ability: 'str' | 'con'; nameRu: string }

/** Minimal race catalog rows (mirrors backend specs). */
type CatalogSlice = {
  slug: string
  name_ru: string
  speed: number
  traits_text: string
  natural_weapons: Array<{
    id: string
    name_ru: string
    damage: string
    damage_type: string
    ability: string
    proficient: boolean
  }>
}

function slice(
  slug: string,
  name_ru: string,
  weapon: CatalogSlice['natural_weapons'][number],
): CatalogSlice {
  return {
    slug,
    name_ru,
    speed: 30,
    traits_text: `${name_ru}: ${weapon.name_ru} (${weapon.damage})`,
    natural_weapons: [weapon],
  }
}

const CATALOG_SLICES: CatalogSlice[] = [
  slice('aarakocra', 'Ааракокра', {
    id: 'talons',
    name_ru: 'Когти',
    damage: '1к4',
    damage_type: 'рубящий',
    ability: 'str',
    proficient: true,
  }),
  slice('tortle', 'Тортл', {
    id: 'claw',
    name_ru: 'Коготь',
    damage: '1к4',
    damage_type: 'рубящий',
    ability: 'str',
    proficient: true,
  }),
  slice('leonin', 'Леонин', {
    id: 'claws',
    name_ru: 'Когти',
    damage: '1к4',
    damage_type: 'рубящий',
    ability: 'str',
    proficient: true,
  }),
  slice('tabaxi', 'Табакси', {
    id: 'claws',
    name_ru: 'Кошачьи когти',
    damage: '1к6',
    damage_type: 'рубящий',
    ability: 'str',
    proficient: true,
  }),
  slice('centaur', 'Кентавр', {
    id: 'hooves',
    name_ru: 'Копыта',
    damage: '1к6',
    damage_type: 'дробящий',
    ability: 'str',
    proficient: true,
  }),
  slice('minotaur', 'Минотавр', {
    id: 'horns',
    name_ru: 'Рога',
    damage: '1к6',
    damage_type: 'колющий',
    ability: 'str',
    proficient: true,
  }),
  slice('satyr', 'Сатир', {
    id: 'ram',
    name_ru: 'Таран',
    damage: '1к6',
    damage_type: 'дробящий',
    ability: 'str',
    proficient: true,
  }),
  slice('lizardfolk', 'Людоящер', {
    id: 'bite',
    name_ru: 'Укус',
    damage: '1к6',
    damage_type: 'рубящий',
    ability: 'str',
    proficient: true,
  }),
  slice('dhampir', 'Дампир', {
    id: 'bite',
    name_ru: 'Укус вампира',
    damage: '1к4',
    damage_type: 'колющий',
    ability: 'con',
    proficient: true,
  }),
]

const EXPECTED: Record<string, NwExpect> = {
  aarakocra: { id: 'talons', damage: '1к4', ability: 'str', nameRu: 'Когти' },
  tortle: { id: 'claw', damage: '1к4', ability: 'str', nameRu: 'Коготь' },
  leonin: { id: 'claws', damage: '1к4', ability: 'str', nameRu: 'Когти' },
  tabaxi: { id: 'claws', damage: '1к6', ability: 'str', nameRu: 'Кошачьи когти' },
  centaur: { id: 'hooves', damage: '1к6', ability: 'str', nameRu: 'Копыта' },
  minotaur: { id: 'horns', damage: '1к6', ability: 'str', nameRu: 'Рога' },
  satyr: { id: 'ram', damage: '1к6', ability: 'str', nameRu: 'Таран' },
  lizardfolk: { id: 'bite', damage: '1к6', ability: 'str', nameRu: 'Укус' },
  dhampir: { id: 'bite', damage: '1к4', ability: 'con', nameRu: 'Укус вампира' },
}

function emptyGrant(
  slug: string,
  naturalWeapons: AppliedRaceGrant['naturalWeapons'],
): AppliedRaceGrant {
  return {
    raceCatalogId: 'test',
    slug,
    parentSlug: null,
    speed: 30,
    size: 'medium',
    darkvision: 0,
    abilityBonuses: {},
    languages: [],
    skills: [],
    tools: [],
    armorKeys: [],
    weaponNames: [],
    traitsText: '',
    traitCards: [],
    ancestryId: null,
    featNoteRu: null,
    naturalArmor: null,
    naturalWeapons,
    movement: { climb: null, swim: null, fly: null },
    racialSpells: [],
  }
}

for (const row of CATALOG_SLICES) {
  const want = EXPECTED[row.slug]
  assert(want, `missing EXPECTED for ${row.slug}`)
  const def = resolveRaceGrantDef({
    raceName: row.name_ru,
    catalogSlug: row.slug,
    catalogData: row,
    nameRu: row.name_ru,
  })
  assert(def, `resolveRaceGrantDef failed for ${row.slug}`)
  const nw = def.naturalWeapons.find((w) => w.id === want.id)
  assert(nw, `${row.slug}: natural weapon ${want.id} missing`)
  assert(
    nw.damage === want.damage,
    `${row.slug}.${want.id} damage: got ${nw.damage}, want ${want.damage}`,
  )
  assert(
    nw.ability === want.ability,
    `${row.slug}.${want.id} ability: got ${nw.ability}, want ${want.ability}`,
  )
  assert(nw.nameRu === want.nameRu, `${row.slug}.${want.id} name`)

  const attacks = ensureRaceNaturalWeaponAttacks({
    weapons: [] as WeaponAttack[],
    grant: emptyGrant(row.slug, def.naturalWeapons),
    catalogWeapons: def.naturalWeapons,
  })
  assert(
    raceNaturalWeaponAttacksMatch({
      weapons: attacks,
      raceSlug: row.slug,
      naturalWeapons: def.naturalWeapons,
    }),
    `${row.slug}: attack cards must match catalog after ensure`,
  )
  const card = attacks.find((a) => a.id === `race-nw:${row.slug}:${want.id}`)
  assert(card, `${row.slug}: attack card missing`)
  assert(card.damage === want.damage, `${row.slug}: card damage ${card.damage}`)
  assert(card.source_kind === 'race', `${row.slug}: source_kind race`)
}

// Spec file must stay in sync with EEPC/POA talons (guards against re-introducing 1к6).
assert(
  CATALOG_SLICES.find((r) => r.slug === 'aarakocra')?.natural_weapons[0]?.damage === '1к4',
  'aarakocra talons must be 1к4',
)

console.log(
  'raceNaturalWeapons.selfcheck: ok (aarakocra talons=1к4; tortle/leonin 1к4; peers 1к6; dhampir CON)',
)
