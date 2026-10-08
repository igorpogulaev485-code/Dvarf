/** Cast → Напарники: summon/familiar spells create or refresh a companion card. */

import {
  createCompanion,
  type CompanionEntry,
  type CompanionKind,
} from './companions'
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
  const notes = `${labelRu}${slotNote}${concNote}. Статы — из бестиария или вручную.`

  const existing = input.companions.find(
    (row) => row.source?.kind === 'spell' && row.source.feature === feature,
  )

  if (existing) {
    const hpMax = existing.stats.hp_max
    const refreshed: CompanionEntry = {
      ...existing,
      nature: 'summoned',
      active: true,
      death: null,
      stats: {
        ...existing.stats,
        hp:
          hpMax != null
            ? hpMax
            : existing.stats.hp != null && existing.stats.hp > 0
              ? existing.stats.hp
              : 1,
      },
      notes,
      source: {
        kind: 'spell',
        labelRu,
        feature,
      },
    }
    return {
      companions: input.companions.map((row) =>
        row.id === existing.id ? refreshed : row,
      ),
      name: refreshed.name.trim() || defaults.titleRu,
      refreshed: true,
    }
  }

  const created = createCompanion({
    kind: defaults.kind,
    name: defaults.titleRu,
    nature: 'summoned',
    control: defaults.control,
    active: true,
    notes,
    actions:
      slug === 'find_familiar'
        ? 'Не атакует; телепатия 100 фт.; передача касания'
        : 'Команды устно; статы по заклинанию / бестиарию',
    source: {
      kind: 'spell',
      labelRu,
      feature,
    },
  })

  return {
    companions: [...input.companions, created],
    name: created.name,
    refreshed: false,
  }
}
