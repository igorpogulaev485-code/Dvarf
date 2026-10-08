/** Cast → Напарники: summon/familiar spells create or refresh a companion card. */

import type { ConcentrationState } from '../../shared/dnd/concentration'
import {
  createCompanion,
  mergeCompanionResources,
  type CompanionEntry,
  type CompanionKind,
} from './companions'
import {
  companionFromTemplate,
  resolveSpellCompanionTemplate,
  type CompanionTemplateContext,
} from './companionTemplates'
import { spellKeyFromName, type SheetSpell } from './spells'

/** Spells that look like "conjure/summon" but are not naparnik entities. */
const EXCLUDED_SLUGS = new Set([
  'conjure_barrage',
  'conjure_volley',
  'spiritual_weapon',
])

/** Official 2014 slug → default RU card title. */
const SPELL_NAPARNIK_DEFAULTS: Record<
  string,
  { titleRu: string; kind: CompanionKind; control: CompanionEntry['control'] }
> = {
  find_familiar: {
    titleRu: 'Фамильяр',
    kind: 'familiar',
    control: 'own_initiative',
  },
  conjure_animals: {
    titleRu: 'Призванные звери',
    kind: 'other',
    control: 'own_initiative',
  },
  conjure_celestial: {
    titleRu: 'Призванный небожитель',
    kind: 'other',
    control: 'own_initiative',
  },
  conjure_elemental: {
    titleRu: 'Призванный элементаль',
    kind: 'other',
    control: 'own_initiative',
  },
  conjure_fey: {
    titleRu: 'Призванная фея',
    kind: 'other',
    control: 'own_initiative',
  },
  conjure_minor_elementals: {
    titleRu: 'Малые элементали',
    kind: 'other',
    control: 'own_initiative',
  },
  conjure_woodland_beings: {
    titleRu: 'Лесные обитатели',
    kind: 'other',
    control: 'own_initiative',
  },
  summon_aberration: {
    titleRu: 'Дух аберрации',
    kind: 'other',
    control: 'bonus_action_command',
  },
  summon_beast: {
    titleRu: 'Дух зверя',
    kind: 'other',
    control: 'bonus_action_command',
  },
  summon_celestial: {
    titleRu: 'Дух небожителя',
    kind: 'other',
    control: 'bonus_action_command',
  },
  summon_construct: {
    titleRu: 'Дух конструкта',
    kind: 'other',
    control: 'bonus_action_command',
  },
  summon_draconic_spirit: {
    titleRu: 'Дух дракона',
    kind: 'other',
    control: 'bonus_action_command',
  },
  summon_elemental: {
    titleRu: 'Дух стихии',
    kind: 'other',
    control: 'bonus_action_command',
  },
  summon_fey: {
    titleRu: 'Дух феи',
    kind: 'other',
    control: 'bonus_action_command',
  },
  summon_fiend: {
    titleRu: 'Дух исчадия',
    kind: 'other',
    control: 'bonus_action_command',
  },
  summon_greater_demon: {
    titleRu: 'Высший демон',
    kind: 'other',
    control: 'own_initiative',
  },
  summon_lesser_demons: {
    titleRu: 'Низшие демоны',
    kind: 'other',
    control: 'own_initiative',
  },
  summon_shadowspawn: {
    titleRu: 'Дух тени',
    kind: 'other',
    control: 'bonus_action_command',
  },
  summon_undead: {
    titleRu: 'Дух нежити',
    kind: 'other',
    control: 'bonus_action_command',
  },
}

/** Normalized spell name key → slug. */
const NAME_KEY_TO_SLUG: Record<string, string> = {
  'find-familiar': 'find_familiar',
  'поиск-фамильяра': 'find_familiar',
  'find_familiar': 'find_familiar',
  'conjure-animals': 'conjure_animals',
  'призыв-животных': 'conjure_animals',
  'conjure-celestial': 'conjure_celestial',
  'призыв-небожителя': 'conjure_celestial',
  'conjure-elemental': 'conjure_elemental',
  'призыв-элементаля': 'conjure_elemental',
  'conjure-fey': 'conjure_fey',
  'призыв-феи': 'conjure_fey',
  'conjure-minor-elementals': 'conjure_minor_elementals',
  'призыв-малых-элементалей': 'conjure_minor_elementals',
  'conjure-woodland-beings': 'conjure_woodland_beings',
  'призыв-лесных-обитателей': 'conjure_woodland_beings',
  'summon-aberration': 'summon_aberration',
  'призыв-духа-аберрации': 'summon_aberration',
  'summon-beast': 'summon_beast',
  'призыв-духа-зверя': 'summon_beast',
  'summon-celestial': 'summon_celestial',
  'призыв-духа-небожителя': 'summon_celestial',
  'summon-construct': 'summon_construct',
  'призыв-духа-конструкта': 'summon_construct',
  'summon-draconic-spirit': 'summon_draconic_spirit',
  'призыв-духа-дракона': 'summon_draconic_spirit',
  'summon-elemental': 'summon_elemental',
  'призыв-духа-стихии': 'summon_elemental',
  'summon-fey': 'summon_fey',
  'призыв-духа-феи': 'summon_fey',
  'summon-fiend': 'summon_fiend',
  'призыв-духа-исчадия': 'summon_fiend',
  'summon-greater-demon': 'summon_greater_demon',
  'призыв-высшего-демона': 'summon_greater_demon',
  'summon-lesser-demons': 'summon_lesser_demons',
  'призыв-низших-демонов': 'summon_lesser_demons',
  'summon-shadowspawn': 'summon_shadowspawn',
  'призыв-духа-тени': 'summon_shadowspawn',
  'summon-undead': 'summon_undead',
  'призыв-духа-нежити': 'summon_undead',
  // Explicit non-companions
  'spiritual-weapon': '',
  'духовное-оружие': '',
  'conjure-barrage': '',
  'conjure-volley': '',
}

export function resolveSpellNaparnikSlug(spell: SheetSpell): string | null {
  const key = spellKeyFromName(spell.name)
  if (Object.prototype.hasOwnProperty.call(NAME_KEY_TO_SLUG, key)) {
    const mapped = NAME_KEY_TO_SLUG[key]
    return mapped || null
  }
  const compact = key.replace(/-/g, '_')
  if (EXCLUDED_SLUGS.has(compact)) return null
  if (compact in SPELL_NAPARNIK_DEFAULTS) return compact
  if (compact.includes('фамильяр') || compact.includes('familiar')) {
    return 'find_familiar'
  }
  if (compact.startsWith('summon_') || compact.startsWith('conjure_')) {
    if (EXCLUDED_SLUGS.has(compact)) return null
    return compact
  }
  return null
}

export function isSpellNaparnikCast(spell: SheetSpell): boolean {
  return resolveSpellNaparnikSlug(spell) != null
}

function spellSourceFeature(slug: string): string {
  return `spell:${slug}`
}

export function applySpellCastToCompanions(input: {
  companions: CompanionEntry[]
  spell: SheetSpell
  slotLevel: number
  characterLevel?: number
  spellMod?: number
}): { companions: CompanionEntry[]; name: string; refreshed: boolean } | null {
  const slug = resolveSpellNaparnikSlug(input.spell)
  if (!slug) return null
  const defaults = SPELL_NAPARNIK_DEFAULTS[slug] ?? {
    titleRu: input.spell.name || 'Призыв',
    kind: 'other' as CompanionKind,
    control: 'own_initiative' as const,
  }
  const feature = spellSourceFeature(slug)
  const labelRu = `Заклинание: ${input.spell.name || defaults.titleRu}`
  const slotNote =
    input.slotLevel > 0 && input.slotLevel !== input.spell.level
      ? ` · ячейка ${input.slotLevel}`
      : input.slotLevel > 0
        ? ` · ${input.slotLevel} ур.`
        : ''
  const concNote = input.spell.concentration ? ' · концентрация' : ''
  const templateCtx: CompanionTemplateContext = {
    hostClassLevel: input.characterLevel ?? 1,
    characterLevel: input.characterLevel ?? 1,
    spellMod: input.spellMod ?? 0,
    slotLevel: input.slotLevel,
  }
  const template = resolveSpellCompanionTemplate({ slug, ctx: templateCtx })
  const baseNotes = template?.notes ?? 'Статы — из бестиария или вручную'
  const notes = `${labelRu}${slotNote}${concNote}. ${baseNotes}`

  const spellSource = {
    kind: 'spell' as const,
    labelRu,
    feature,
    spellId: input.spell.id,
  }

  const existing = input.companions.find(
    (row) =>
      row.source?.kind === 'spell' &&
      (row.source.spellId === input.spell.id || row.source.feature === feature),
  )

  if (existing) {
    const fromTemplate = template
      ? companionFromTemplate({
          template,
          name: existing.name.trim() || template.defaultName,
          source: spellSource,
        })
      : null
    const hpMax = fromTemplate?.stats.hp_max ?? existing.stats.hp_max
    const refreshed: CompanionEntry = {
      ...existing,
      kind: fromTemplate?.kind ?? existing.kind,
      nature: 'summoned',
      active: true,
      death: null,
      control: fromTemplate?.control ?? existing.control,
      stats: {
        hp: hpMax != null ? hpMax : existing.stats.hp != null && existing.stats.hp > 0 ? existing.stats.hp : 1,
        hp_max: hpMax,
        ac: fromTemplate?.stats.ac ?? existing.stats.ac,
        speed: fromTemplate?.stats.speed ?? existing.stats.speed,
      },
      actions: fromTemplate?.actions || existing.actions,
      resources: fromTemplate
        ? mergeCompanionResources(existing.resources, fromTemplate.resources)
        : existing.resources,
      notes,
      source: spellSource,
    }
    return {
      companions: input.companions.map((row) =>
        row.id === existing.id ? refreshed : row,
      ),
      name: refreshed.name.trim() || defaults.titleRu,
      refreshed: true,
    }
  }

  const created = template
    ? companionFromTemplate({
        template,
        name: defaults.titleRu,
        source: spellSource,
      })
    : createCompanion({
        kind: defaults.kind,
        name: defaults.titleRu,
        nature: 'summoned',
        control: defaults.control,
        active: true,
        notes,
        actions: 'Команды устно; статы по заклинанию / бестиарию',
        source: spellSource,
      })
  const withNotes = { ...created, notes, source: spellSource, active: true }

  return {
    companions: [...input.companions, withNotes],
    name: withNotes.name,
    refreshed: false,
  }
}

function matchesEndedConcentration(
  row: CompanionEntry,
  ended: ConcentrationState,
): boolean {
  if (row.source?.kind !== 'spell') return false
  if (ended.spell_id && row.source.spellId === ended.spell_id) return true
  const slug = resolveSpellNaparnikSlug({
    id: ended.spell_id,
    name: ended.name,
    catalog_id: null,
    level: 1,
    prepared: true,
    notes: '',
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: true,
  })
  if (!slug) return false
  return row.source.feature === spellSourceFeature(slug)
}

/** When concentration ends or switches: dismiss matching summoned naparniki (keep card). */
export function dismissCompanionsForEndedConcentration(input: {
  companions: CompanionEntry[]
  ended: ConcentrationState | null | undefined
}): { companions: CompanionEntry[]; dismissedNames: string[] } {
  if (!input.ended) {
    return { companions: input.companions, dismissedNames: [] }
  }
  const dismissedNames: string[] = []
  const companions = input.companions.map((row) => {
    if (!matchesEndedConcentration(row, input.ended!)) return row
    if (!row.active && (row.stats.hp ?? 1) <= 0) return row
    dismissedNames.push(row.name.trim() || row.source?.labelRu || 'Напарник')
    return {
      ...row,
      active: false,
      death: null,
      stats: {
        ...row.stats,
        hp: 0,
      },
      notes: row.notes.includes('концентрация снята')
        ? row.notes
        : `${row.notes}${row.notes.trim() ? ' · ' : ''}концентрация снята`,
    }
  })
  return { companions, dismissedNames }
}

/**
 * Apply a concentration change: dismiss naparniki tied to the previous spell
 * when it ends or is replaced.
 */
export function applyConcentrationChangeToCompanions(input: {
  companions: CompanionEntry[]
  previous: ConcentrationState | null | undefined
  next: ConcentrationState | null | undefined
}): { companions: CompanionEntry[]; dismissedNames: string[] } {
  if (!input.previous) {
    return { companions: input.companions, dismissedNames: [] }
  }
  if (
    input.next &&
    input.next.spell_id === input.previous.spell_id
  ) {
    return { companions: input.companions, dismissedNames: [] }
  }
  return dismissCompanionsForEndedConcentration({
    companions: input.companions,
    ended: input.previous,
  })
}
