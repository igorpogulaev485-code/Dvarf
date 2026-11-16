/**
 * P24-M02b: subclass resources / always-prepared / third-caster for 2024 sheets.
 * Mirror of backend/app/dnd/edition_2024_subclasses.py.
 */
import subclassesSrd from './data/edition2024/subclasses_srd.json'
import subclassesEfa from './data/edition2024/subclasses_efa.json'
import subclassesPh24 from './data/edition2024/subclasses_ph24.json'
import subclassesFrhof from './data/edition2024/subclasses_frhof.json'
import subclassesRtw from './data/edition2024/subclasses_rtw.json'
import subclassesAu from './data/edition2024/subclasses_au.json'

type CatalogFile = {
  meta?: { source?: string }
  entries: Array<{
    slug: string
    name_ru?: string
    name_en?: string
    source?: string
    data: Record<string, unknown>
  }>
}

export type SubclassCatalogRow = {
  slug: string
  name_ru: string
  name_en: string
  source: string
  data: Record<string, unknown>
}

export const THIRD_CASTER_SUBCLASSES: Record<
  string,
  { ability: string; name_ru: string }
> = {
  'fighter__eldritch-knight': { ability: 'int', name_ru: 'Заклинания мистического рыцаря' },
  'rogue__arcane-trickster': { ability: 'int', name_ru: 'Заклинания мистического ловкача' },
  'monk__warrior-of-the-mystic-arts': {
    ability: 'wis',
    name_ru: 'Заклинания мистического воина',
  },
}

const THIRD_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
]

const THIRD_CASTER_CANTRIPS = [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
const THIRD_CASTER_SPELLS_KNOWN = [
  0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13,
]

function abilityMod(score: number): number {
  return Math.floor((Math.max(1, Math.floor(score)) - 10) / 2)
}

function scaleUses(level: number, table: Record<number, number>): number {
  let best = 0
  for (const [lv, val] of Object.entries(table)) {
    if (level >= Number(lv)) best = val
  }
  return best
}

function psiTable(level: number): { count: number; die: string } {
  const rows: Array<[number, number, string]> = [
    [3, 4, 'd6'],
    [5, 6, 'd8'],
    [9, 8, 'd8'],
    [11, 8, 'd10'],
    [13, 10, 'd10'],
    [17, 12, 'd12'],
  ]
  let count = 0
  let die = 'd6'
  for (const [lv, c, d] of rows) {
    if (level >= lv) {
      count = c
      die = d
    }
  }
  return { count, die }
}

function superiorityDie(level: number): string {
  if (level >= 18) return 'd12'
  if (level >= 10) return 'd10'
  return 'd8'
}

function buildCatalog(): Record<string, SubclassCatalogRow> {
  const out: Record<string, SubclassCatalogRow> = {}
  for (const file of [
    subclassesSrd,
    subclassesEfa,
    subclassesPh24,
    subclassesFrhof,
    subclassesRtw,
    subclassesAu,
  ] as CatalogFile[]) {
    const source = file.meta?.source || '2024'
    for (const entry of file.entries || []) {
      const slug = String(entry.slug || '').trim()
      if (!slug) continue
      out[slug] = {
        slug,
        name_ru: entry.name_ru || slug,
        name_en: entry.name_en || slug,
        source: entry.source || source,
        data: entry.data || {},
      }
    }
  }
  return out
}

export const SUBCLASS_CATALOG_2024 = buildCatalog()

export function listSubclassSlugs2024(): string[] {
  return Object.keys(SUBCLASS_CATALOG_2024).sort()
}

export function subclassParent2024(slug: string): string | null {
  const parent = String(SUBCLASS_CATALOG_2024[slug]?.data?.parent_class || '').trim()
  return parent || null
}

export type SubclassResource2024 = {
  id: string
  pool_id: string
  class_slug: string
  subclass_slug: string
  name: string
  max: number
  reset: 'short' | 'long'
  shortRestRegain?: number
  die?: string
  feature_id: string
}

export function buildSubclassResources2024(input: {
  subclassSlug: string
  classLevel: number
  abilities?: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}): SubclassResource2024[] {
  const { subclassSlug, classLevel } = input
  if (classLevel < 3) return []
  const parent = subclassParent2024(subclassSlug) || 'class'
  const intMod = abilityMod(input.abilities?.int ?? 10)
  const out: SubclassResource2024[] = []

  const push = (
    pool_id: string,
    name: string,
    max: number,
    reset: 'short' | 'long',
    feature_id: string,
    extra?: { shortRestRegain?: number; die?: string },
  ) => {
    if (max <= 0) return
    out.push({
      id: `feat:${parent}:${pool_id}:${feature_id.replace(/-/g, '_')}`,
      pool_id,
      class_slug: parent,
      subclass_slug: subclassSlug,
      name,
      max,
      reset,
      shortRestRegain: extra?.shortRestRegain,
      die: extra?.die,
      feature_id,
    })
  }

  if (subclassSlug === 'fighter__battlemaster') {
    push(
      'superiority_dice',
      'Кости превосходства',
      scaleUses(classLevel, { 3: 4, 7: 5, 15: 6 }),
      'short',
      'combat-superiority',
      { die: superiorityDie(classLevel) },
    )
  } else if (
    subclassSlug === 'fighter__psi-warrior' ||
    subclassSlug === 'rogue__soulknife'
  ) {
    const { count, die } = psiTable(classLevel)
    push('psionic_energy_dice', 'Кости пси-энергии', count, 'long', 'psionic-power', {
      shortRestRegain: 1,
      die,
    })
    if (subclassSlug === 'rogue__soulknife' && classLevel >= 13) {
      push('psychic_veil', 'Психическая завеса', 1, 'long', 'psychic-veil')
    }
  } else if (subclassSlug === 'fighter__arcane-archer') {
    push('arcane_shot', 'Чародейный выстрел', Math.max(1, intMod), 'long', 'arcane-shot')
  } else if (subclassSlug === 'artificer__alchemist') {
    push(
      'experimental_elixir',
      'Экспериментальный эликсир',
      scaleUses(classLevel, { 3: 2, 5: 3, 9: 4, 15: 5 }),
      'long',
      'experimental-elixir',
    )
    if (classLevel >= 9) {
      push(
        'restorative_reagents',
        'Малое восстановление (реагенты)',
        Math.max(1, intMod),
        'long',
        'restorative-reagents',
      )
    }
  } else if (subclassSlug === 'sorcerer__wild-magic-sorcery' && classLevel >= 18) {
    push('tamed_wild_surge', 'Укрощённый всплеск', 1, 'long', 'tamed-wild-magic-surge')
  }
  return out
}

export function alwaysPreparedForSubclass2024(
  subclassSlug: string | null | undefined,
  classLevel: number,
  landChoice?: string | null,
): string[] {
  if (!subclassSlug) return []
  const sub = SUBCLASS_CATALOG_2024[subclassSlug]
  if (!sub) return []
  const out: string[] = []
  const list =
    (sub.data.spell_list as Array<{ level?: number; land?: string; spells?: string[] }>) ||
    []
  for (const block of list) {
    if (Number(block.level || 0) > classLevel) continue
    if (block.land) {
      if (!landChoice || String(block.land).toLowerCase() !== String(landChoice).toLowerCase()) {
        continue
      }
    }
    for (const spell of block.spells || []) {
      if (spell && !out.includes(spell)) out.push(spell)
    }
  }
  return out
}

export function thirdCasterBlock2024(subclassSlug: string, classLevel: number) {
  const meta = THIRD_CASTER_SUBCLASSES[subclassSlug]
  if (!meta || classLevel < 3) return null
  const lv = Math.min(20, Math.max(1, Math.floor(classLevel)))
  const row = THIRD_CASTER_SLOTS[lv - 1]
  return {
    class_slug: subclassParent2024(subclassSlug) || 'class',
    subclass_slug: subclassSlug,
    progression: 'third' as const,
    ability: meta.ability,
    name_ru: meta.name_ru,
    cantrips: THIRD_CASTER_CANTRIPS[lv - 1],
    prepared_spells: 0,
    spells_known: THIRD_CASTER_SPELLS_KNOWN[lv - 1],
    slots: Object.fromEntries(row.map((n, i) => [String(i + 1), n])),
    pact_slots: null as null,
    always_prepared: [] as string[],
  }
}

export function featureAutomationMode2024(input: {
  featureId: string
  subclassSlug: string | null
  hasResource: boolean
}): 'resource' | 'always_prepared' | 'third_caster' | 'text' {
  const fid = input.featureId.replace(/_/g, '-')
  if (input.hasResource) return 'resource'
  if (fid.endsWith('-spells') || fid.endsWith('-domain-spells')) return 'always_prepared'
  if (
    input.subclassSlug &&
    THIRD_CASTER_SUBCLASSES[input.subclassSlug] &&
    (fid === 'spellcasting' || fid === 'spellcasting-ek')
  ) {
    return 'third_caster'
  }
  return 'text'
}
