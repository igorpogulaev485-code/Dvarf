/**
 * C-01 / U10: fill empty companion stats from known templates on sheet open.
 * Never overwrite non-empty player values. Current HP kept if set.
 */

import {
  isCompanionStatEmpty,
} from './companionAttacks'
import {
  companionFromTemplate,
  resolveCompanionTemplate,
  type CompanionTemplateContext,
  type CompanionTemplatePatch,
} from './companionTemplates'
import {
  isHomunculusCompanion,
  isSelfForm,
  isSteedCompanion,
  type CompanionEntry,
} from './companions'

// re-export guard for selfcheck imports
export { isCompanionStatEmpty }

const WILDFIRE_FEATURES = new Set([
  'wildfire_spirit',
  'summon_wildfire_spirit',
])

export function isWildfireSpiritCompanion(row: CompanionEntry): boolean {
  const feature = row.source?.feature?.trim().toLowerCase() ?? ''
  if (WILDFIRE_FEATURES.has(feature)) return true
  const ref = (row.bestiary_ref ?? '').toLowerCase()
  if (ref.includes('wildfire')) return true
  const name = row.bestiary_name_ru?.toLowerCase() ?? ''
  if (name.includes('дикого огня')) return true
  return false
}

/**
 * COMP-01: spell summons that keep a grey «не призван» slot after «Отпустить»,
 * but leave the list at 0 HP (familiar, steed, Дикий спутник).
 */
export function isSpellBoundCompanionSlot(row: CompanionEntry): boolean {
  if (isSelfForm(row)) return false
  if (row.kind === 'familiar') return true
  if (isSteedCompanion(row)) return true
  const feature = (row.source?.feature ?? '').trim().toLowerCase()
  if (feature === 'wild_companion' || feature === 'spell:find_familiar') return true
  return false
}

/** Archetype companions (beast, drake, defender, cannon, wildfire, …) stay at 0 HP as «повержен». */
export function isArchetypeCompanionSlot(row: CompanionEntry): boolean {
  if (isSelfForm(row) || isSpellBoundCompanionSlot(row)) return false
  if (
    row.kind === 'beast_companion' ||
    row.kind === 'primal_companion' ||
    row.kind === 'drake' ||
    row.kind === 'steel_defender' ||
    row.kind === 'eldritch_cannon'
  ) {
    return true
  }
  if (isHomunculusCompanion(row) || isWildfireSpiritCompanion(row)) return true
  if (row.source?.kind === 'subclass' || row.source?.kind === 'feature') return true
  if (row.source?.kind === 'class' && row.source.feature !== 'wild_companion') return true
  return false
}

/**
 * COMP-01: conjure / find-familiar / steed at 0 HP leave the strip;
 * archetype slots stay («повержен»). Story mounts with death saves stay.
 */
export function companionVanishesAtZeroHp(row: CompanionEntry): boolean {
  if (isSelfForm(row)) return false
  if (row.story) return false
  if (isArchetypeCompanionSlot(row)) return false
  if (isSpellBoundCompanionSlot(row)) return true
  if (row.source?.kind === 'spell') return true
  if (row.nature === 'summoned') return true
  return !isPermanentCompanionSlot(row)
}

/** Permanent slot stays on the strip even when inactive («не призван»). */
export function isPermanentCompanionSlot(row: CompanionEntry): boolean {
  if (isSelfForm(row)) return false
  // COMP-01: familiar keeps strip after dismiss (resummon via cast).
  if (isSpellBoundCompanionSlot(row)) return true
  // C-03: Homunculus Servant keep the strip slot when fallen.
  if (isHomunculusCompanion(row)) return true
  if (row.source?.kind === 'spell') return false
  if (row.source?.kind === 'subclass' || row.source?.kind === 'feature') return true
  if (row.source?.kind === 'class') return true
  if (row.nature === 'living' || row.nature === 'construct') return true
  if (row.source?.kind === 'manual') return true
  // Ally wildfire without source.kind quirk — still permanent.
  if (isWildfireSpiritCompanion(row)) return true
  return false
}

/** Strip / glance list: permanent always (except 0 HP summons); temporary only while active. */
export function shouldShowOnCompanionStrip(row: CompanionEntry): boolean {
  if (!row.name.trim()) return false
  if (isSelfForm(row)) return row.active
  if ((row.stats.hp ?? 1) <= 0 && companionVanishesAtZeroHp(row)) return false
  if (isPermanentCompanionSlot(row)) return true
  return row.active
}

/** Drop spell summons at 0 HP from the companions array (COMP-01). */
export function pruneVanishedCompanions(
  companions: CompanionEntry[],
): CompanionEntry[] {
  return companions.filter((row) => {
    if ((row.stats.hp ?? 1) > 0) return true
    if (isSelfForm(row)) return true
    return !companionVanishesAtZeroHp(row)
  })
}

export function companionStatusChip(row: CompanionEntry): string | null {
  if (isSelfForm(row)) return null
  if (!row.active) {
    if ((row.stats.hp ?? 1) <= 0 && isArchetypeCompanionSlot(row)) return 'повержен'
    if ((row.stats.hp ?? 1) <= 0 && isPermanentCompanionSlot(row) && !companionVanishesAtZeroHp(row)) {
      return 'повержен'
    }
    if (row.death && (row.death.successes > 0 || row.death.failures > 0)) {
      return 'спасброски'
    }
    if ((row.stats.hp ?? 1) <= 0 && row.story) return 'спасброски'
    if (isPermanentCompanionSlot(row)) return 'не призван'
    return 'неактивен'
  }
  if (row.mounted) return 'верхом'
  if (row.turnMarks?.dodge) return 'Уклонение'
  return null
}

function templateForCompanion(
  row: CompanionEntry,
  ctx: CompanionTemplateContext,
): CompanionTemplatePatch | null {
  const feature = row.source?.feature?.trim() ?? ''
  if (isWildfireSpiritCompanion(row) || feature.includes('wildfire')) {
    return resolveCompanionTemplate({
      choiceId: 'wildfire_spirit',
      pickValue: '',
      ctx,
    })
  }
  if (feature) {
    // Cannon variant may live in notes «Вариант: …» or name.
    const pickHint =
      row.kind === 'eldritch_cannon'
        ? guessCannonVariant(row)
        : row.kind === 'primal_companion'
          ? guessPrimalVariant(row, ctx.rulesEdition)
          : ''
    const fromFeature = resolveCompanionTemplate({
      choiceId: feature,
      pickValue: pickHint,
      ctx,
    })
    if (fromFeature) return fromFeature
  }
  if (row.kind === 'steel_defender') {
    return resolveCompanionTemplate({
      choiceId: 'steel_defender_name',
      pickValue: '',
      ctx,
    })
  }
  if (row.kind === 'eldritch_cannon') {
    return resolveCompanionTemplate({
      choiceId: 'eldritch_cannon',
      pickValue: guessCannonVariant(row),
      ctx,
    })
  }
  if (row.kind === 'drake') {
    return resolveCompanionTemplate({
      choiceId: 'drake_companion',
      pickValue: '',
      ctx,
    })
  }
  if (row.kind === 'primal_companion') {
    const pick = guessPrimalVariant(row, ctx.rulesEdition)
    const choiceId =
      ctx.rulesEdition === '2024' && ['land', 'sea', 'sky'].includes(pick)
        ? 'primal-companion'
        : 'companion_type'
    return resolveCompanionTemplate({
      choiceId,
      pickValue: pick,
      ctx,
    })
  }
  if (row.kind === 'beast_companion') {
    return resolveCompanionTemplate({
      choiceId: 'rangers_companion',
      pickValue: 'phb_beast_cr_1_4',
      ctx,
    })
  }
  if (row.kind === 'ally' && /дикого огня|wildfire/i.test(row.name + row.notes)) {
    return resolveCompanionTemplate({
      choiceId: 'wildfire_spirit',
      pickValue: '',
      ctx,
    })
  }
  return null
}

function guessCannonVariant(row: CompanionEntry): string {
  const blob = `${row.name} ${row.notes} ${row.actions}`.toLowerCase()
  if (blob.includes('огнем') || blob.includes('flamethrower')) return 'flamethrower'
  if (blob.includes('баллист') || blob.includes('ballista')) return 'force_ballista'
  if (blob.includes('защит') || blob.includes('protector')) return 'protector'
  return 'force_ballista'
}

function guessPrimalVariant(row: CompanionEntry, rulesEdition?: string | null): string {
  const blob = `${row.name} ${row.notes} ${row.actions}`.toLowerCase()
  if (rulesEdition === '2024') {
    if (blob.includes('мор') || blob.includes('sea')) return 'sea'
    if (blob.includes('неб') || blob.includes('sky')) return 'sky'
    return 'land'
  }
  if (blob.includes('мор') || blob.includes('sea')) return 'beast_of_the_sea'
  if (blob.includes('неб') || blob.includes('sky')) return 'beast_of_the_sky'
  return 'beast_of_the_land'
}

/**
 * Fill only empty fields from the template. Notes never touched.
 * Current HP kept when already set (even if 0).
 * Returns same array reference when nothing changed.
 */
export function backfillCompanionStatsFromTemplates(input: {
  companions: CompanionEntry[]
  ctx: CompanionTemplateContext
}): { companions: CompanionEntry[]; filledCount: number } {
  let filledCount = 0
  let changed = false
  const next = input.companions.map((row) => {
    if (isSelfForm(row)) return row
    const template = templateForCompanion(row, input.ctx)
    if (!template) return row

    const tplStats = template.stats
    const stats = { ...row.stats }
    let rowChanged = false

    const assignNum = (
      key: keyof CompanionEntry['stats'],
      value: number | null | undefined,
    ) => {
      if (value == null || !Number.isFinite(value)) return
      if (!isCompanionStatEmpty(stats[key])) return
      ;(stats as Record<string, unknown>)[key as string] = value
      rowChanged = true
    }

    // Current HP: only if empty (null / —). Do not overwrite 0 or a set number.
    if (isCompanionStatEmpty(stats.hp) && tplStats.hp != null) {
      stats.hp = tplStats.hp
      rowChanged = true
    }
    assignNum('hp_max', tplStats.hp_max)
    assignNum('ac', tplStats.ac)
    assignNum('speed', tplStats.speed)
    assignNum('speed_fly', tplStats.speed_fly)
    assignNum('speed_swim', tplStats.speed_swim)
    assignNum('speed_climb', tplStats.speed_climb)
    assignNum('str', tplStats.str)
    assignNum('dex', tplStats.dex)
    assignNum('con', tplStats.con)
    if (
      isCompanionStatEmpty(stats.immunities) &&
      typeof tplStats.immunities === 'string' &&
      tplStats.immunities.trim()
    ) {
      stats.immunities = tplStats.immunities
      rowChanged = true
    }
    if (
      isCompanionStatEmpty(stats.resistances) &&
      typeof tplStats.resistances === 'string' &&
      tplStats.resistances.trim()
    ) {
      stats.resistances = tplStats.resistances
      rowChanged = true
    }

    let actions = row.actions
    if (isCompanionStatEmpty(actions) && template.actions.trim()) {
      actions = template.actions
      rowChanged = true
    }

    let resources = row.resources
    if (
      (!resources || resources.length === 0) &&
      template.resources &&
      template.resources.length > 0
    ) {
      resources = template.resources.map((r) => ({ ...r }))
      rowChanged = true
    }

    // Kind unify for wildfire: ally (not other).
    let kind = row.kind
    if (isWildfireSpiritCompanion(row) && row.kind === 'other') {
      kind = 'ally'
      rowChanged = true
    }

    if (!rowChanged) return row
    filledCount += 1
    changed = true
    return {
      ...row,
      kind,
      stats,
      actions,
      resources,
    }
  })

  return {
    companions: changed ? next : input.companions,
    filledCount,
  }
}

/** Build a filled card from template (grant path). Always active:false («не призван»). */
export function companionFromSubclassTemplate(input: {
  template: CompanionTemplatePatch
  name: string
  source: CompanionEntry['source']
  notesExtra?: string
}): CompanionEntry {
  const created = companionFromTemplate({
    template: input.template,
    name: input.name,
    source: input.source,
  })
  return {
    ...created,
    active: false,
    notes: [created.notes, input.notesExtra].filter((s) => s && s.trim()).join('\n'),
  }
}
