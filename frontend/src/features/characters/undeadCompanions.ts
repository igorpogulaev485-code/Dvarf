/**
 * C-03: Animate Dead («Восставший труп») / Create Undead + Undead Thralls.
 */

import { createPackCompanion, resizeCompanionPack } from './companionPack'
import {
  isAnimateDeadFeature,
  type CompanionEntry,
} from './companions'
import type { BestiaryFormPick } from './wildShape'

export type UndeadKindOption = {
  slug: string
  nameRu: string
  /** Fallback MM stats when pick not yet merged. */
  ac: number
  hp: number
}

export const ANIMATE_DEAD_OPTIONS: UndeadKindOption[] = [
  { slug: 'skeleton', nameRu: 'Скелет', ac: 13, hp: 13 },
  { slug: 'zombie', nameRu: 'Зомби', ac: 8, hp: 22 },
]

export const CREATE_UNDEAD_GHOUL: UndeadKindOption = {
  slug: 'ghoul',
  nameRu: 'Упырь',
  ac: 12,
  hp: 22,
}
export const CREATE_UNDEAD_GHAST: UndeadKindOption = {
  slug: 'ghast',
  nameRu: 'Вурдалак',
  ac: 13,
  hp: 36,
}
export const CREATE_UNDEAD_WIGHT: UndeadKindOption = {
  slug: 'wight',
  nameRu: 'Умертвие',
  ac: 14,
  hp: 45,
}
export const CREATE_UNDEAD_MUMMY: UndeadKindOption = {
  slug: 'mummy',
  nameRu: 'Мумия',
  ac: 11,
  hp: 58,
}

/** Animate Dead: base 1; +2 per slot above 3rd. Undead Thralls: +1. */
export function animateDeadCreatureLimit(
  slotLevel: number,
  undeadThralls: boolean,
): number {
  const slot = Math.max(3, Math.floor(slotLevel) || 3)
  const base = 1 + 2 * Math.max(0, slot - 3)
  return undeadThralls ? base + 1 : base
}

export type CreateUndeadChoice = {
  option: UndeadKindOption
  maxCount: number
  labelRu: string
}

/** Create Undead options by slot (pack C03-6). */
export function createUndeadChoices(slotLevel: number): CreateUndeadChoice[] {
  const slot = Math.max(6, Math.floor(slotLevel) || 6)
  if (slot >= 9) {
    return [
      { option: CREATE_UNDEAD_GHOUL, maxCount: 6, labelRu: '6 упырей' },
      { option: CREATE_UNDEAD_GHAST, maxCount: 3, labelRu: '3 вурдалака' },
      { option: CREATE_UNDEAD_WIGHT, maxCount: 3, labelRu: '3 умертвия' },
      { option: CREATE_UNDEAD_MUMMY, maxCount: 2, labelRu: '2 мумии' },
    ]
  }
  if (slot >= 8) {
    return [
      { option: CREATE_UNDEAD_GHOUL, maxCount: 5, labelRu: '5 упырей' },
      { option: CREATE_UNDEAD_GHAST, maxCount: 2, labelRu: '2 вурдалака' },
      { option: CREATE_UNDEAD_WIGHT, maxCount: 2, labelRu: '2 умертвия' },
    ]
  }
  if (slot >= 7) {
    return [{ option: CREATE_UNDEAD_GHOUL, maxCount: 4, labelRu: '4 упыря' }]
  }
  return [{ option: CREATE_UNDEAD_GHOUL, maxCount: 3, labelRu: 'до 3 упырей' }]
}

export function undeadThrallsBonuses(input: {
  wizardLevel: number
  proficiencyBonus: number
}): { extraHp: number; weaponDamageBonus: number } {
  return {
    extraHp: Math.max(0, Math.floor(input.wizardLevel)),
    weaponDamageBonus: Math.max(0, Math.floor(input.proficiencyBonus)),
  }
}

export function applyUndeadThrallsToUnit(input: {
  unitHp: number
  actions: string
  wizardLevel: number
  proficiencyBonus: number
}): { unitHp: number; actions: string; notesExtra: string } {
  const { extraHp, weaponDamageBonus } = undeadThrallsBonuses({
    wizardLevel: input.wizardLevel,
    proficiencyBonus: input.proficiencyBonus,
  })
  return {
    unitHp: input.unitHp + extraHp,
    actions: input.actions.includes(`+${weaponDamageBonus} урона оружием`)
      ? input.actions
      : `${input.actions}${input.actions.trim() ? '\n' : ''}+${weaponDamageBonus} урона оружием (Рабы-нежить)`,
    notesExtra: `Рабы-нежить: +${extraHp} хитов, +${weaponDamageBonus} урона оружием`,
  }
}

export function findUndeadPackForSpell(
  companions: CompanionEntry[],
  spellSlug: 'animate_dead' | 'create_undead',
  unitSlug?: string,
): CompanionEntry | undefined {
  const feature = `spell:${spellSlug}`
  return companions.find((row) => {
    if (!isAnimateDeadFeature(row.source?.feature)) return false
    if ((row.source?.feature ?? '').toLowerCase() !== feature) return false
    if (unitSlug && row.bestiary_ref && !row.bestiary_ref.includes(unitSlug)) {
      // Allow match by name unit
      if (!(row.pack?.unit_name_ru && row.bestiary_name_ru?.includes(unitSlug))) {
        if (row.bestiary_ref !== unitSlug) return false
      }
    }
    return Boolean(row.pack) || true
  })
}

export function applyAnimateOrCreateUndead(input: {
  companions: CompanionEntry[]
  spellSlug: 'animate_dead' | 'create_undead'
  spellName: string
  spellId?: string
  option: UndeadKindOption
  count: number
  pick?: BestiaryFormPick | null
  /** Extend control / add up to limit without exceeding. */
  mode: 'create' | 'extend'
  undeadThralls?: boolean
  wizardLevel?: number
  proficiencyBonus?: number
}): { companions: CompanionEntry[]; name: string; refreshed: boolean } {
  const feature = `spell:${input.spellSlug}`
  const source = {
    kind: 'spell' as const,
    labelRu: `Заклинание: ${input.spellName}`,
    feature,
    spellId: input.spellId,
  }
  let unitHp = input.pick?.hp ?? input.option.hp
  let actions =
    input.pick?.actions_text ||
    'Команда — бонусное действие хозяина (60–120 фт.). Без команды только защищается.'
  let notesExtra = ''
  if (input.undeadThralls && input.spellSlug === 'animate_dead') {
    const thrall = applyUndeadThrallsToUnit({
      unitHp,
      actions,
      wizardLevel: input.wizardLevel ?? 6,
      proficiencyBonus: input.proficiencyBonus ?? 3,
    })
    unitHp = thrall.unitHp
    actions = thrall.actions
    notesExtra = thrall.notesExtra
  }
  const ac = input.pick?.ac ?? input.option.ac
  const unitName = input.pick?.name_ru ?? input.option.nameRu
  const control = {
    labelRu: 'контроль 24 часа',
    controlled: true,
  }

  const existing = input.companions.find(
    (row) =>
      row.source?.feature === feature &&
      (row.pack?.unit_name_ru === unitName ||
        row.bestiary_ref === input.option.slug ||
        row.bestiary_name_ru === unitName),
  )

  const desired = Math.max(1, Math.floor(input.count))

  if (existing?.pack && input.mode === 'extend') {
    const nextCount = Math.min(
      Math.max(existing.pack.alive_count, desired),
      // When extending, cap at requested count (caller already applied slot limit).
      desired,
    )
    // If extending control only (same or fewer): refresh control, heal living to max optional.
    const resized = resizeCompanionPack(
      {
        ...existing,
        undead_control: control,
        active: true,
        notes: existing.notes.includes('контроль 24 часа')
          ? existing.notes
          : `${existing.notes}${existing.notes.trim() ? ' · ' : ''}контроль обновлён (24 часа)${notesExtra ? ` · ${notesExtra}` : ''}`,
      },
      Math.max(existing.pack.alive_count, nextCount),
    )
    return {
      companions: input.companions.map((row) =>
        row.id === existing.id ? resized : row,
      ),
      name: resized.name,
      refreshed: true,
    }
  }

  const created = createPackCompanion({
    unitNameRu: unitName,
    count: desired,
    unitHpMax: unitHp,
    ac,
    speed: input.pick?.speed_walk ?? null,
    dex: input.pick?.dex ?? null,
    str: input.pick?.str ?? null,
    con: input.pick?.con ?? null,
    actions,
    notes: `${source.labelRu} · ${control.labelRu}${notesExtra ? ` · ${notesExtra}` : ''}${input.spellSlug === 'create_undead' ? ' · только ночью' : ''}`,
    source,
    nature: 'summoned',
    initiativeMode: 'own_initiative',
    commandCost: 'bonus',
    bestiary_ref: input.pick?.catalog_id ?? input.option.slug,
    bestiary_name_ru: unitName,
    undead_control: control,
  })

  if (existing) {
    return {
      companions: input.companions.map((row) =>
        row.id === existing.id ? { ...created, id: existing.id } : row,
      ),
      name: created.name,
      refreshed: true,
    }
  }
  return {
    companions: [...input.companions, created],
    name: created.name,
    refreshed: false,
  }
}
