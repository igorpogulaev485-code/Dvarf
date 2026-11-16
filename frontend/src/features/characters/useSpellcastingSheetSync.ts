import { useEffect, useMemo, useRef } from 'react'
import {
  backfillSpellClassFields,
  buildCastProfiles,
} from '../../shared/dnd/castProfiles'
import {
  applySpellcastingSuggestion,
  spellcastingTableChanged,
  suggestSpellcasting,
  type SpellcastingSuggestion,
  type SubclassCasterOverlay,
} from '../../shared/dnd/casterProgression'
import { createClassLevel, type ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  computeProgression2024,
  normalizeClassSlug2024,
} from '../../shared/dnd/edition2024Classes'
import { abilityModifier, type AbilityKey } from './sheetTypes'
import {
  ensureInnateGrantCasts,
  ensureKnownSpellsReady,
  isKnownSpellcastingMode,
  type SpellsState,
} from './spells'
import { clampPactSlots, clampSlot } from '../../shared/dnd/spells'

type UseSpellcastingSheetSyncArgs = {
  /** When false, only computes suggestion/knownCaster (no sheet writes). */
  enabled?: boolean
  className: string
  level: number
  classes?: ClassLevelEntry[]
  subclassCasters?: SubclassCasterOverlay[]
  spells: SpellsState
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  onChange: (spells: SpellsState) => void
  onToast?: (message: string) => void
  /** P24-M02a: use 2024 catalog tables instead of 2014 PHB progression. */
  rulesEdition?: string | null
}

function suggestionFromProgression2024(
  classes: ClassLevelEntry[],
): SpellcastingSuggestion | null {
  const snap = computeProgression2024({ classes })
  if (!snap.spellcasting.length && !Object.values(snap.multiclass_slots).some((n) => n > 0)) {
    return null
  }
  const primary = snap.spellcasting[0]
  const ability =
    primary?.class_slug === 'wizard' || primary?.class_slug === 'artificer'
      ? 'int'
      : primary?.class_slug === 'cleric' ||
          primary?.class_slug === 'druid' ||
          primary?.class_slug === 'ranger'
        ? 'wis'
        : primary
          ? 'cha'
          : null
  const slots = Object.fromEntries(
    Object.entries(snap.multiclass_slots).map(([k, max]) => [k, clampSlot({ max, used: 0 })]),
  )
  const preparedSum = snap.spellcasting.reduce((s, b) => s + (b.prepared_spells || 0), 0)
  const pact = snap.multiclass_pact
    ? clampPactSlots({
        max: snap.multiclass_pact.count,
        used: 0,
        level: snap.multiclass_pact.level,
      })
    : null
  return {
    slug: primary?.class_slug || normalizeClassSlug2024(classes[0]?.name) || 'caster',
    labelRu: 'Заклинания 2024',
    progression: (primary?.progression as SpellcastingSuggestion['progression']) || 'full',
    casting_ability: ability,
    max_prepared: preparedSum > 0 ? preparedSum : null,
    slots,
    pact_slots: pact,
  }
}

/**
 * Keep slots / prepare cap / known-ready / innate grant_cast aligned with class
 * levels — same side-effects that used to live only inside SpellsPanel.
 * M1: also exposes castProfiles and backfills class_slug when safe.
 */
export function useSpellcastingSheetSync({
  enabled = true,
  className,
  level,
  classes,
  subclassCasters,
  spells,
  abilities,
  proficiencyBonus,
  onChange,
  onToast,
  rulesEdition = '2014',
}: UseSpellcastingSheetSyncArgs) {
  const classRows = useMemo(() => {
    const rows = classes?.filter((row) => row.name.trim() && row.level > 0) ?? []
    if (rows.length > 0) return rows
    if (!className.trim()) return []
    return [createClassLevel({ name: className, level })]
  }, [classes, className, level])

  const suggestion = useMemo(() => {
    if (String(rulesEdition || '2014').trim() === '2024') {
      return suggestionFromProgression2024(classRows)
    }
    return suggestSpellcasting({
      className,
      level,
      classes,
      subclassCasters,
      abilityModFor: (ability) => abilityModifier(abilities[ability]),
    })
  }, [rulesEdition, className, level, classes, classRows, subclassCasters, abilities])

  const castProfiles = useMemo(
    () =>
      buildCastProfiles({
        classes: classRows,
        subclassCasters,
        proficiencyBonus,
        abilityModFor: (ability) => abilityModifier(abilities[ability]),
      }),
    [classRows, subclassCasters, proficiencyBonus, abilities],
  )

  const knownCaster = isKnownSpellcastingMode({
    maxPrepared: spells.max_prepared,
    hasCasterSuggestion: suggestion != null && suggestion.progression !== 'none',
  })

  useEffect(() => {
    if (!enabled || !knownCaster) return
    const next = ensureKnownSpellsReady(spells.known)
    if (next === spells.known) return
    onChange({ ...spells, known: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    knownCaster,
    spells.known.map((s) => `${s.id}:${s.prepared}`).join('|'),
  ])

  useEffect(() => {
    if (!enabled) return
    const next = ensureInnateGrantCasts(spells.known, proficiencyBonus)
    if (next === spells.known) return
    onChange({ ...spells, known: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    proficiencyBonus,
    spells.known
      .map(
        (s) =>
          `${s.id}:${s.race_grant ?? ''}:${s.feat_grant ?? ''}:${s.notes}:${s.grant_cast?.max ?? ''}`,
      )
      .join('|'),
  ])

  // M1: backfill class_slug on mono / labeled rows (no toast — silent migrate).
  useEffect(() => {
    if (!enabled || castProfiles.length === 0) return
    const next = backfillSpellClassFields(spells.known, castProfiles)
    if (next === spells.known) return
    onChange({ ...spells, known: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    castProfiles.map((row) => `${row.id}:${row.slug}`).join('|'),
    spells.known.map((s) => `${s.id}:${s.class_slug ?? ''}`).join('|'),
  ])

  const subclassCasterKey = (subclassCasters ?? [])
    .map((row) => `${row.classEntryId}:third:${row.ability ?? ''}`)
    .sort()
    .join('|')
  const classLevelKey =
    (classes && classes.length > 0
      ? classes
          .map((row) => `${row.name.trim().toLowerCase()}:${row.level}`)
          .join('|')
      : `${className.trim().toLowerCase()}|${level}`) + `::${subclassCasterKey}`
  const appliedClassLevel = useRef<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    if (appliedClassLevel.current == null) {
      appliedClassLevel.current = classLevelKey
      return
    }
    if (appliedClassLevel.current === classLevelKey) return
    appliedClassLevel.current = classLevelKey
    if (!suggestion) return
    const next = applySpellcastingSuggestion(spells, suggestion)
    if (!spellcastingTableChanged(spells, next)) return
    onChange({ ...spells, ...next })
    onToast?.(`${suggestion.labelRu}: ячейки обновлены по таблице 2014`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, classLevelKey])

  const prepareKey =
    suggestion?.max_prepared == null ? '' : `${suggestion.slug}:${suggestion.max_prepared}`
  const appliedPrepare = useRef<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    if (!prepareKey || suggestion?.max_prepared == null) return
    if (appliedPrepare.current == null) {
      appliedPrepare.current = prepareKey
      return
    }
    if (appliedPrepare.current === prepareKey) return
    appliedPrepare.current = prepareKey
    if (spells.max_prepared === suggestion.max_prepared) return
    onChange({ ...spells, max_prepared: suggestion.max_prepared })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, prepareKey])

  return { suggestion, knownCaster, castProfiles }
}
