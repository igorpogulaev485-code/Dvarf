import { useEffect, useMemo, useRef } from 'react'
import {
  backfillSpellClassFields,
  buildCastProfiles,
} from '../../shared/dnd/castProfiles'
import {
  applySpellcastingSuggestion,
  suggestSpellcasting,
  type SubclassCasterOverlay,
} from '../../shared/dnd/casterProgression'
import { createClassLevel, type ClassLevelEntry } from '../../shared/dnd/classLevels'
import { abilityModifier, type AbilityKey } from './sheetTypes'
import {
  ensureInnateGrantCasts,
  ensureKnownSpellsReady,
  isKnownSpellcastingMode,
  type SpellsState,
} from './spells'

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
}: UseSpellcastingSheetSyncArgs) {
  const classRows = useMemo(() => {
    const rows = classes?.filter((row) => row.name.trim() && row.level > 0) ?? []
    if (rows.length > 0) return rows
    if (!className.trim()) return []
    return [createClassLevel({ name: className, level })]
  }, [classes, className, level])

  const suggestion = useMemo(
    () =>
      suggestSpellcasting({
        className,
        level,
        classes,
        subclassCasters,
        abilityModFor: (ability) => abilityModifier(abilities[ability]),
      }),
    [className, level, classes, subclassCasters, abilities],
  )

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
    onChange({ ...spells, ...applySpellcastingSuggestion(spells, suggestion) })
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
