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
  isSelfForm,
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

/** Permanent slot stays on the strip even when inactive («не призван»). */
export function isPermanentCompanionSlot(row: CompanionEntry): boolean {
  if (isSelfForm(row)) return false
  if (row.source?.kind === 'spell') return false
  if (row.source?.kind === 'subclass' || row.source?.kind === 'feature') return true
  if (row.source?.kind === 'class') return true
  if (row.nature === 'living' || row.nature === 'construct') return true
  if (row.source?.kind === 'manual') return true
  // Ally wildfire without source.kind quirk — still permanent.
  if (isWildfireSpiritCompanion(row)) return true
  return false
}

/** Strip / glance list: permanent always; temporary only while active. */
export function shouldShowOnCompanionStrip(row: CompanionEntry): boolean {
  if (!row.name.trim()) return false
  if (isSelfForm(row)) return row.active
  if (isPermanentCompanionSlot(row)) return true
  return row.active
}

export function companionStatusChip(row: CompanionEntry): string | null {
  if (isSelfForm(row)) return null
  if (!row.active) {
    if ((row.stats.hp ?? 1) <= 0 && isPermanentCompanionSlot(row)) return 'пал'
    if (row.death && (row.death.successes > 0 || row.death.failures > 0)) {
      return 'спасброски'
    }
    if ((row.stats.hp ?? 1) <= 0 && row.story) return 'спасброски'
    if (isPermanentCompanionSlot(row)) return 'не призван'
    return 'неактивен'
  }
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
          ? guessPrimalVariant(row)
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
    return resolveCompanionTemplate({
      choiceId: 'companion_type',
      pickValue: guessPrimalVariant(row),
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

function guessPrimalVariant(row: CompanionEntry): string {
  const blob = `${row.name} ${row.notes} ${row.actions}`.toLowerCase()
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
