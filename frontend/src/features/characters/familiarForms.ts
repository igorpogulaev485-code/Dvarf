/**
 * Find Familiar / Pact of the Chain / Wild Companion — form lists + companion apply.
 *
 * Sources differ:
 * - spell: PHB beast forms; cost = slot or ritual (any class that has the spell)
 * - pact_chain: PHB beasts + imp / quasit / sprite / pseudodragon when Chain warlock casts
 * - wild_companion: PHB beasts as fey; cost = Wild Shape use; duration = ½ druid level hours
 */

import {
  getFeaturePick,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import {
  createCompanion,
  type CompanionEntry,
} from './companions'
import { isPactChainSpellId } from './pactChainEffects'
import { PACT_BOON_FEATURE_ID, isWarlockClassName } from './pactTomeEffects'
import { resolveSpellNaparnikSlug } from './spellCompanions'
import type { SheetSpell } from './spells'
import type { BestiaryFormPick } from './wildShape'

/** How the familiar is being summoned — drives options + card notes. */
export type FamiliarCastMode = 'spell' | 'pact_chain' | 'wild_companion'

/** PHB Find Familiar beasts (SRD slugs). */
export const FIND_FAMILIAR_BEAST_SLUGS = [
  'bat',
  'cat',
  'crab',
  'frog',
  'hawk',
  'lizard',
  'octopus',
  'owl',
  'poisonous_snake',
  'quipper',
  'rat',
  'raven',
  'sea_horse',
  'spider',
  'weasel',
] as const

/** Pact of the Chain special forms (MM). */
export const PACT_CHAIN_SPECIAL_SLUGS = [
  'imp',
  'pseudodragon',
  'quasit',
  'sprite',
] as const

export const FIND_FAMILIAR_FALLBACK_PICKS: Record<string, BestiaryFormPick> = {
  bat: {
    slug: 'bat',
    name_ru: 'Летучая мышь',
    cr: '0',
    type: 'beast',
    ac: 12,
    hp: 1,
    speed_walk: 5,
    speed_fly: 30,
    actions_text: 'Не атакует; телепатия; передача касания.',
  },
  cat: {
    slug: 'cat',
    name_ru: 'Кошка',
    cr: '0',
    type: 'beast',
    ac: 12,
    hp: 2,
    speed_walk: 40,
    actions_text: 'Не атакует; телепатия; передача касания.',
  },
  owl: {
    slug: 'owl',
    name_ru: 'Сова',
    cr: '0',
    type: 'beast',
    ac: 11,
    hp: 1,
    speed_walk: 5,
    speed_fly: 60,
    actions_text: 'Не атакует; телепатия; передача касания. Тёмное зрение.',
  },
  raven: {
    slug: 'raven',
    name_ru: 'Ворон',
    cr: '0',
    type: 'beast',
    ac: 12,
    hp: 1,
    speed_walk: 10,
    speed_fly: 50,
    actions_text: 'Не атакует; телепатия; передача касания. Mimicry.',
  },
  imp: {
    slug: 'imp',
    name_ru: 'Бес',
    cr: '1',
    type: 'fiend',
    ac: 13,
    hp: 10,
    speed_walk: 20,
    speed_fly: 40,
    actions_text: 'Жало; невидимость; смена облика. Телепатия хозяина.',
  },
  quasit: {
    slug: 'quasit',
    name_ru: 'Квазит',
    cr: '1',
    type: 'fiend',
    ac: 13,
    hp: 7,
    speed_walk: 40,
    actions_text: 'Когти; страх; невидимость; смена облика.',
  },
  pseudodragon: {
    slug: 'pseudodragon',
    name_ru: 'Псевдодракон',
    cr: '1/4',
    type: 'dragon',
    ac: 13,
    hp: 7,
    speed_walk: 15,
    speed_fly: 60,
    actions_text: 'Укус; жало (яд). Телепатия.',
  },
  sprite: {
    slug: 'sprite',
    name_ru: 'Спрайт',
    cr: '1/4',
    type: 'fey',
    ac: 15,
    hp: 2,
    speed_walk: 10,
    speed_fly: 40,
    actions_text: 'Длинный меч; короткий лук; Heart Sight; невидимость.',
  },
}

export function isFindFamiliarSpell(spell: Pick<SheetSpell, 'name' | 'id'>): boolean {
  if (isPactChainSpellId(spell.id)) return true
  return resolveSpellNaparnikSlug(spell as SheetSpell) === 'find_familiar'
}

export function warlockHasPactChain(
  featurePicks: FeaturePicksState,
  classes: Array<{ id: string; name: string; level: number }>,
): boolean {
  return classes.some(
    (row) =>
      isWarlockClassName(row.name) &&
      row.level > 0 &&
      getFeaturePick(featurePicks, row.id, PACT_BOON_FEATURE_ID) === 'chain',
  )
}

/**
 * Resolve cast mode for Find Familiar.
 * Chain warlock gets special forms for any Find Familiar they cast (feature or book).
 */
export function resolveFamiliarCastMode(input: {
  spell?: Pick<SheetSpell, 'id' | 'name'> | null
  featurePicks: FeaturePicksState
  classes: Array<{ id: string; name: string; level: number }>
  /** Force Wild Companion path (from Wild Shape fork). */
  forceMode?: FamiliarCastMode
}): FamiliarCastMode {
  if (input.forceMode) return input.forceMode
  if (input.spell && isPactChainSpellId(input.spell.id)) return 'pact_chain'
  if (warlockHasPactChain(input.featurePicks, input.classes)) return 'pact_chain'
  return 'spell'
}

export function familiarAllowedSlugs(mode: FamiliarCastMode): string[] {
  if (mode === 'pact_chain') {
    return [...FIND_FAMILIAR_BEAST_SLUGS, ...PACT_CHAIN_SPECIAL_SLUGS]
  }
  return [...FIND_FAMILIAR_BEAST_SLUGS]
}

export function familiarModeLabelRu(mode: FamiliarCastMode): string {
  if (mode === 'pact_chain') return 'Поиск фамильяра · Цепь'
  if (mode === 'wild_companion') return 'Дикий спутник'
  return 'Поиск фамильяра'
}

export function familiarModeHintRu(mode: FamiliarCastMode): string {
  if (mode === 'pact_chain') {
    return 'Звери PHB + особые формы Цепи (бес, квазит, спрайт, псевдодракон). Каст — ритуал или ячейка.'
  }
  if (mode === 'wild_companion') {
    return 'Как «Поиск фамильяра», но тип — фея. Тратится использование Дикого облика; длительность = ½ ур. друида (часы).'
  }
  return 'Звери из PHB. Каст — ячейка или ритуал (если доступен).'
}

export function familiarPickAllowed(
  pick: BestiaryFormPick,
  mode: FamiliarCastMode,
): boolean {
  const allowed = new Set(familiarAllowedSlugs(mode))
  if (allowed.has(pick.slug)) return true
  // Catalog may use alternate slugs; still allow tiny beasts for spell/wild lists.
  if (mode === 'pact_chain') return false
  const type = (pick.type || '').toLowerCase()
  return type.includes('beast') && (pick.cr === '0' || pick.cr === '1/8')
}

export function mergeFamiliarCatalogWithFallbacks(
  catalog: BestiaryFormPick[],
  mode: FamiliarCastMode,
): BestiaryFormPick[] {
  const bySlug = new Map(catalog.map((row) => [row.slug, row]))
  const out: BestiaryFormPick[] = []
  for (const slug of familiarAllowedSlugs(mode)) {
    const fromCatalog = bySlug.get(slug)
    const fallback = FIND_FAMILIAR_FALLBACK_PICKS[slug]
    if (fromCatalog) out.push(fromCatalog)
    else if (fallback) out.push(fallback)
  }
  return out
}

function spellSourceFeature(): string {
  return 'spell:find_familiar'
}

export function applyFindFamiliarCompanion(input: {
  companions: CompanionEntry[]
  pick: BestiaryFormPick
  mode: FamiliarCastMode
  spell?: SheetSpell | null
  slotLevel?: number
  characterLevel?: number
  druidLevel?: number
}): { companions: CompanionEntry[]; name: string; refreshed: boolean } {
  const pick = input.pick
  const mode = input.mode
  const hours =
    mode === 'wild_companion'
      ? Math.max(1, Math.floor((input.druidLevel ?? 1) / 2))
      : null

  const typeNote =
    mode === 'wild_companion'
      ? 'Тип — фея (даже если облик зверя).'
      : mode === 'pact_chain' &&
          (PACT_CHAIN_SPECIAL_SLUGS as readonly string[]).includes(pick.slug)
        ? 'Особая форма Пакта Цепи.'
        : 'Форма PHB «Поиск фамильяра».'

  const costNote =
    mode === 'wild_companion'
      ? `Дикий облик · ${hours} ч.`
      : input.slotLevel != null && input.slotLevel > 0
        ? `ячейка ${input.slotLevel}`
        : 'ритуал / без ячейки'

  const labelRu =
    mode === 'wild_companion'
      ? 'Дикий спутник'
      : `Заклинание: ${input.spell?.name?.trim() || 'Поиск фамильяра'}`

  const notes = [
    labelRu,
    costNote,
    typeNote,
    'Не атакует; телепатия 100 фт.; передача касания.',
  ]
    .filter(Boolean)
    .join(' · ')

  const source =
    mode === 'wild_companion'
      ? {
          kind: 'class' as const,
          labelRu: 'Дикий спутник',
          feature: 'wild_companion',
        }
      : {
          kind: 'spell' as const,
          labelRu,
          feature: spellSourceFeature(),
          spellId: input.spell?.id,
        }

  const displayName =
    mode === 'wild_companion'
      ? `Дикий спутник · ${pick.name_ru}`
      : pick.name_ru

  const withoutOld = input.companions.filter((row) => {
    if (mode === 'wild_companion') {
      return row.source?.feature !== 'wild_companion'
    }
    if (row.source?.kind === 'spell') {
      if (input.spell?.id && row.source.spellId === input.spell.id) return false
      if (row.source.feature === spellSourceFeature()) return false
    }
    if (row.kind === 'familiar' && row.source?.feature === 'pact_chain') return false
    return true
  })

  const existing = input.companions.find((row) => {
    if (mode === 'wild_companion') return row.source?.feature === 'wild_companion'
    if (row.source?.kind !== 'spell') return false
    if (input.spell?.id && row.source.spellId === input.spell.id) return true
    return row.source.feature === spellSourceFeature()
  })

  const next = createCompanion({
    id: existing?.id,
    kind: 'familiar',
    role: 'ally',
    name: displayName,
    bestiary_ref: pick.catalog_id ?? pick.slug,
    bestiary_name_ru: pick.name_ru,
    nature: 'summoned',
    control: 'own_initiative',
    active: true,
    stats: {
      hp: pick.hp,
      hp_max: pick.hp,
      ac: pick.ac,
      speed: pick.speed_walk || pick.speed_fly || 20,
    },
    actions:
      pick.actions_text ||
      'Не атакует; телепатия; передача касания. Статы — из бестиария.',
    notes,
    source,
  })

  const refreshed = Boolean(existing)
  return {
    companions: [...withoutOld.filter((row) => row.id !== next.id), next],
    name: next.name,
    refreshed,
  }
}
