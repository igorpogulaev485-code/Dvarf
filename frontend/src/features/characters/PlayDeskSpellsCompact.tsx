import { useMemo, useState } from 'react'
import {
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import type { ConcentrationState } from './play'
import { PrepareSpellsDialog } from './PrepareSpellsDialog'
import { SpellDetailDialog } from './SpellDetailDialog'
import type { SpellLearnBudget } from '../../shared/dnd/casterProgression'
import {
  buildCastProfiles,
  classSlugChipLabel,
  formatNamedCantripBudgets,
  formatNamedClassQuotas,
  formatSpellbookQuotaRu,
  formatNamedPrepareBudgets,
  mergeCastProfilesForDisplay,
  resolveSpellCastStats,
  type SpellCastProfile,
} from '../../shared/dnd/castProfiles'
import {
  resolveCastEffectSummary,
  spellSchoolLabelRu,
} from '../../shared/dnd/spellCatalog'
import { withBundledRules } from './alwaysPreparedSpellEnrichment'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  countAlwaysPreparedLeveled,
  countLearnedCantrips,
  countLearnedCantripsBySlug,
  countLearnedLeveled,
  countLearnedLeveledForSlug,
  countLockedFeatureCantrips,
  countPreparedLeveled,
  countPreparedLeveledBySlug,
  grantCastRemaining,
  groupSpellsByLevel,
  isGrantedSpellHighlight,
  isAvailableToCast,
  spellSourceBadge,
  type SheetSpell,
  type SpellsState,
} from './spells'
import { IconCast, IconConcentration, IconRitual, IconSpellBook, IconWizardHat } from './spellIcons'
import type { FormulaVars } from '../../shared/dnd/formulas'
import {
  SPELLCASTING_ABILITY_LABELS,
  clampPactSlots,
  levelLabel,
  spellAttackBonus,
  spellSaveDc,
  type SpellcastingAbility,
} from '../../shared/dnd/spells'
import type { RulesEdition } from '../../shared/api/characters'
import { type BonusLine, withSpellCastBonuses } from './modifiers'

type SpellFilter =
  | 'all'
  | 'cantrips'
  | 'rituals'
  | 'concentration'
  | 'ritual_book'
  | `class:${string}`

type PlayDeskSpellsCompactProps = {
  spells: SpellsState
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  modifiers?: BonusLine[]
  formulaVars?: FormulaVars
  /** PHB learn budget caps for compact quota chips. */
  learnBudget?: {
    mode: 'known' | 'prepared_list' | 'spellbook'
    cantrips: number | null
    leveledKnown: number | null
    maxPrepared: number | null
  } | null
  /** M2: per-class budgets for named cantrip / prepare meta. */
  learnBudgets?: SpellLearnBudget[] | null
  /** M3: class rows for cast profiles (Сл/атака по источнику). */
  classes?: ClassLevelEntry[]
  castProfiles?: SpellCastProfile[] | null
  /** Total character level — cantrip scaling in the combat list. */
  characterLevel?: number
  /** Draconic Elemental Affinity preview (+CHA to one ancestry damage roll). */
  elementalAffinity?: { damageType: string; amount: number } | null
  /** 2024 Illusionist: show Improved Illusions range on the spell card. */
  improvedIllusions?: boolean
  pinned?: boolean
  concentration?: ConcentrationState | null
  /** Rules edition for catalog description lookup in detail dialog. */
  edition?: RulesEdition
  /** Open caster setup (slots / grimoire / advanced) — replaces full panel. */
  onOpenSettings: () => void
  /** Label for settings / book entry (mobile kit: «Книга»). */
  settingsLabel?: string
  onClearSplit?: () => void
  /** Patch spells (prepare dialog). */
  onSpellsChange?: (spells: SpellsState) => void
  /** Set used count for a slot level (spend or restore, like ability pips). */
  onSlotUsedChange?: (level: number, used: number) => void
  /** Set used count for warlock pact slots. */
  onPactUsedChange?: (used: number) => void
  /** Open cast picker (slot / pact / grant / ritual). Metamagic is chosen only in CastSpellDialog. */
  onCastSpell?: (spell: SheetSpell) => void
  /** Pin concentration in hot without opening full panel. */
  onConcentrateSpell?: (spell: SheetSpell) => void
  ritualBookLabel?: string | null
  onOpenRitualBook?: () => void
}

function isRitualFromBook(
  spell: SheetSpell,
  learnMode: 'known' | 'prepared_list' | 'spellbook' | null,
  hasSpellbook: boolean,
): boolean {
  return (
    Boolean(spell.ritual) &&
    !spell.prepared &&
    spell.level > 0 &&
    learnMode === 'spellbook' &&
    hasSpellbook &&
    spell.in_spellbook !== false
  )
}

export function PlayDeskSpellsCompact({
  spells,
  abilities,
  proficiencyBonus,
  modifiers = [],
  formulaVars = {},
  learnBudget = null,
  learnBudgets = null,
  classes = [],
  castProfiles = null,
  characterLevel: characterLevelProp = 1,
  elementalAffinity = null,
  improvedIllusions = false,
  pinned = false,
  concentration = null,
  edition = '2014',
  onOpenSettings,
  settingsLabel = 'Настройки',
  onClearSplit,
  onSpellsChange,
  onSlotUsedChange,
  onPactUsedChange,
  onCastSpell,
  onConcentrateSpell,
  ritualBookLabel = null,
  onOpenRitualBook,
}: PlayDeskSpellsCompactProps) {
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [detailSpell, setDetailSpell] = useState<SheetSpell | null>(null)
  const [filter, setFilter] = useState<SpellFilter>('all')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [metaExpanded, setMetaExpanded] = useState<Record<string, boolean>>({})
  const bookLost = Boolean(spells.wizard_spellbook?.bookLost)
  const hasSpellbook =
    learnBudget?.mode === 'spellbook' &&
    Boolean(
      spells.wizard_spellbook &&
        !spells.wizard_spellbook.bookLost &&
        spells.wizard_spellbook.primaryBookItemId,
    )
  const learnMode = learnBudget?.mode ?? null

  const castable = spells.known.filter((spell) =>
    isAvailableToCast(spell, {
      learnMode,
      hasSpellbook,
    }),
  )
  const ritualBookSpells = castable.filter((spell) =>
    isRitualFromBook(spell, learnMode, hasSpellbook),
  )
  const readyBase = castable.filter(
    (spell) => !isRitualFromBook(spell, learnMode, hasSpellbook),
  )

  const classFilterSlugs = useMemo(() => {
    const profiles =
      castProfiles && castProfiles.length > 0
        ? castProfiles
        : classes.length > 0
          ? buildCastProfiles({
              classes,
              proficiencyBonus,
              abilityModFor: (ability) => abilityModifier(abilities[ability]),
            })
          : []
    return profiles.filter((row) => row.kind === 'class').map((row) => row.slug)
  }, [castProfiles, classes, proficiencyBonus, abilities])
  const isMulticlassCaster = classFilterSlugs.length > 1

  const ready = useMemo(() => {
    const q = search.trim().toLowerCase()
    const pool = filter === 'ritual_book' ? ritualBookSpells : readyBase
    return pool.filter((spell) => {
      if (filter === 'cantrips' && spell.level > 0) return false
      if (filter === 'rituals' && !spell.ritual) return false
      if (filter === 'concentration' && !spell.concentration) return false
      if (filter.startsWith('class:')) {
        const slug = filter.slice('class:'.length)
        if ((spell.class_slug ?? '').trim().toLowerCase() !== slug) return false
      }
      if (!q) return true
      return spell.name.toLowerCase().includes(q)
    })
  }, [readyBase, ritualBookSpells, filter, search])

  const pact = spells.pact_slots ? clampPactSlots(spells.pact_slots) : null
  const pactRemaining = pact && pact.max > 0 ? Math.max(0, pact.max - pact.used) : null
  const abilityKey = spells.casting_ability
  const abilityMod = abilityKey ? abilityModifier(abilities[abilityKey]) : 0
  const castStats = withSpellCastBonuses({
    baseDc: abilityKey ? spellSaveDc(abilityMod, proficiencyBonus) : null,
    baseAttack: abilityKey
      ? spellAttackBonus(abilityMod, proficiencyBonus)
      : null,
    modifiers,
    vars: formulaVars,
  })
  const dc = castStats.dc
  const attack = castStats.attack
  const profileRows = (() => {
    const built =
      castProfiles && castProfiles.length > 0
        ? castProfiles
        : classes.filter((row) => row.name.trim() && row.level > 0).length > 0
          ? buildCastProfiles({
              classes,
              proficiencyBonus,
              abilityModFor: (ability) => abilityModifier(abilities[ability]),
              dcExtra: (dc ?? 0) - (abilityKey ? spellSaveDc(abilityMod, proficiencyBonus) : 0),
              attackExtra:
                (attack ?? 0) -
                (abilityKey ? spellAttackBonus(abilityMod, proficiencyBonus) : 0),
            })
          : []
    if (built.length === 0) return null
    return mergeCastProfilesForDisplay(
      built.map((row) => {
        const boosted = withSpellCastBonuses({
          baseDc: row.saveDc,
          baseAttack: row.attackBonus,
          modifiers,
          vars: formulaVars,
          classSlug: row.slug,
        })
        return {
          ...row,
          saveDc: boosted.dc ?? row.saveDc,
          attackBonus: boosted.attack ?? row.attackBonus,
        }
      }),
    )
  })()
  const characterLevelFromClasses = classes.reduce(
    (sum, row) => sum + Math.max(0, Math.floor(row.level)),
    0,
  )
  const characterLevel = Math.max(
    1,
    Math.floor(characterLevelProp) || characterLevelFromClasses || 1,
  )
  const learnedCantrips = countLearnedCantrips(spells.known)
  const learnedLeveled = countLearnedLeveled(spells.known)
  const preparedCount = countPreparedLeveled(spells.known)
  const alwaysPreparedCount = countAlwaysPreparedLeveled(spells.known)
  const preparedBySlug = countPreparedLeveledBySlug(spells.known)
  const knownBySlug = useMemo(() => {
    const out: Record<string, number> = {}
    for (const row of learnBudgets ?? []) {
      out[row.slug] = countLearnedLeveledForSlug(spells.known, row.slug)
    }
    return out
  }, [learnBudgets, spells.known])
  const bookCountBySlug = useMemo(() => {
    const out: Record<string, number> = {}
    for (const row of learnBudgets ?? []) {
      if (row.mode === 'spellbook') {
        out[row.slug] = countLearnedLeveledForSlug(spells.known, row.slug)
      }
    }
    return out
  }, [learnBudgets, spells.known])

  const quotaLabel = (() => {
    // MAG-01: never show a false global «изв. 17/5» on multiclass.
    if (learnBudgets && learnBudgets.length === 1 && learnBudgets[0]!.mode === 'spellbook') {
      const only = learnBudgets[0]!
      return formatSpellbookQuotaRu({
        prepared: preparedBySlug[only.slug] ?? preparedCount,
        maxPrepared: only.maxPrepared,
        inBook: bookCountBySlug[only.slug] ?? learnedLeveled,
        alwaysPrepared: alwaysPreparedCount,
      })
    }
    if (learnBudgets && learnBudgets.length > 0) {
      const mixed = formatNamedClassQuotas(learnBudgets, knownBySlug, preparedBySlug, {
        bookCountBySlug,
        alwaysPrepared: alwaysPreparedCount,
      })
      if (mixed) return mixed
      const namedPrep = formatNamedPrepareBudgets(learnBudgets, preparedBySlug, {
        alwaysPrepared: alwaysPreparedCount,
      })
      if (namedPrep) return namedPrep
    }
    if (learnBudget?.mode === 'known') {
      const cap = learnBudget.leveledKnown
      return cap != null ? `изв. ${learnedLeveled}/${cap}` : `изв. ${learnedLeveled}`
    }
    if (!learnBudget) {
      if (spells.max_prepared != null) {
        return `подг. ${preparedCount}/${spells.max_prepared}`
      }
      return null
    }
    const prepCap = learnBudget.maxPrepared ?? spells.max_prepared
    if (learnBudget.mode === 'spellbook') {
      return formatSpellbookQuotaRu({
        prepared: preparedCount,
        maxPrepared: prepCap,
        inBook: learnedLeveled,
        alwaysPrepared: alwaysPreparedCount,
      })
    }
    const base =
      prepCap != null
        ? `подг. ${preparedCount}/${prepCap}`
        : `подг. ${preparedCount}`
    return alwaysPreparedCount > 0 ? `${base} · всегда ${alwaysPreparedCount}` : base
  })()
  const cantripLabel = (() => {
    const tomeExtra = countLockedFeatureCantrips(spells.known)
    if (learnBudgets && learnBudgets.length > 0) {
      const named = formatNamedCantripBudgets(
        learnBudgets,
        countLearnedCantripsBySlug(spells.known),
        { tomeExtra },
      )
      return named ? `заговоры: ${named}` : null
    }
    if (learnBudget?.cantrips != null && learnBudget.cantrips > 0) {
      return `заг. ${learnedCantrips}/${learnBudget.cantrips}`
    }
    if (tomeExtra > 0) return `Гримуар ${tomeExtra}`
    return null
  })()
  const showPrepare =
    Boolean(onSpellsChange) && learnBudget?.mode === 'spellbook'

  const levelGroups = (() => {
    const source =
      filter === 'ritual_book'
        ? ready
        : filter === 'cantrips'
          ? ready.filter((s) => s.level <= 0)
          : ready
    const grouped = groupSpellsByLevel(source)
    const byLevel = new Map(grouped.map((group) => [group.level, group]))
    // Empty slot circles only in the main combat list (not ritual-book chip).
    if (filter === 'all' && !search.trim()) {
      for (let level = 1; level <= 9; level += 1) {
        if ((spells.slots[String(level)]?.max ?? 0) > 0 && !byLevel.has(level)) {
          byLevel.set(level, { level, spells: [] })
        }
      }
    }
    return [...byLevel.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, group]) => ({ ...group, visible: group.spells }))
      .filter(
        (group) =>
          group.visible.length > 0 ||
          (group.level > 0 &&
            filter === 'all' &&
            !search.trim() &&
            (spells.slots[String(group.level)]?.max ?? 0) > 0),
      )
  })()

  function levelKey(level: number): string {
    return `lv-${level}`
  }

  function isCollapsed(level: number, spellCount: number): boolean {
    const key = levelKey(level)
    if (key in collapsed) return collapsed[key]!
    // Empty circles (slots but no spells) start collapsed.
    return spellCount === 0
  }

  function toggleLevel(level: number, spellCount: number) {
    const key = levelKey(level)
    const next = !isCollapsed(level, spellCount)
    setCollapsed((prev) => ({ ...prev, [key]: next }))
  }

  function collapseAll() {
    const next: Record<string, boolean> = {}
    for (const group of levelGroups) {
      next[levelKey(group.level)] = true
    }
    setCollapsed(next)
  }

  function expandAll() {
    const next: Record<string, boolean> = {}
    for (const group of levelGroups) {
      next[levelKey(group.level)] = false
    }
    setCollapsed(next)
  }

  const filterChips: Array<{ id: SpellFilter; label: string }> = [
    { id: 'all', label: 'все' },
    { id: 'cantrips', label: 'заговоры' },
    { id: 'rituals', label: 'ритуалы' },
    { id: 'concentration', label: 'концентрация' },
    ...(ritualBookSpells.length > 0
      ? [{ id: 'ritual_book' as const, label: 'ритуалы из книги' }]
      : []),
    ...(isMulticlassCaster
      ? classFilterSlugs.map((slug) => ({
          id: `class:${slug}` as SpellFilter,
          label: classSlugChipLabel(slug) ?? slug,
        }))
      : []),
  ]

  return (
    <div className="play-desk-compact play-desk-compact--spells">
      <div className="play-desk-compact__chrome">
        <div className="play-desk-compact__head">
          <h3>{pinned ? 'Заклинания (закреплено)' : 'Заклинания'}</h3>
          <div className="play-desk-compact__head-actions">
            {ritualBookLabel && onOpenRitualBook ? (
              <button
                type="button"
                className="play-desk-compact__link play-desk-compact__link--prepare"
                onClick={onOpenRitualBook}
              >
                <IconSpellBook className="play-desk-compact__link-icon" />
                {ritualBookLabel}
              </button>
            ) : null}
            {showPrepare ? (
              <button
                type="button"
                className="play-desk-compact__link play-desk-compact__link--prepare"
                onClick={() => setPrepareOpen(true)}
                title={
                  learnBudget?.mode === 'spellbook'
                    ? 'Выбрать на сегодня из книги (лимит = Инт + ур. волшебника)'
                    : 'Выбрать на сегодня из списка класса (лимит = мод + уровень)'
                }
              >
                <IconWizardHat className="play-desk-compact__link-icon" />
                Подготовить
              </button>
            ) : null}
            {onClearSplit ? (
              <button
                type="button"
                className="play-desk-compact__link"
                onClick={onClearSplit}
                title="Скрыть магию — основная панель на всю ширину"
              >
                Скрыть магию
              </button>
            ) : null}
            <button
              type="button"
              className="play-desk-compact__link play-desk-compact__link--settings"
              onClick={onOpenSettings}
            >
              {settingsLabel}
            </button>
          </div>
        </div>

        {learnBudget?.mode === 'spellbook' && bookLost ? (
          <p className="play-desk-compact__book-lost">
            Книга утеряна — подготовка и ритуалы из книги закрыты. Открой «{settingsLabel}» →
            статус книги, чтобы вернуть книгу из инвентаря.
          </p>
        ) : null}

        {profileRows && profileRows.length > 0 ? (
          <div
            className={`play-desk-compact__combat-stats play-desk-compact__combat-stats--profiles play-desk-compact__combat-stats--dense${
              profileRows.length > 1 ? ' is-multi' : ''
            }`}
            aria-label="Сл. спас. и атака заклинаний по классам"
          >
            {profileRows.map((row) => (
              <div
                key={row.id}
                className={`play-desk-compact__cast-profile play-desk-compact__cast-profile--line is-${row.ability}`}
                title={`${row.labelRu} · ${SPELLCASTING_ABILITY_LABELS[row.ability]}`}
              >
                <span className="play-desk-compact__cast-profile-line">
                  {row.labelRu}
                  {' · '}
                  {SPELLCASTING_ABILITY_LABELS[row.ability]}
                  {' · Сл '}
                  {row.saveDc}
                  {' · '}
                  {formatModifier(row.attackBonus)}
                </span>
              </div>
            ))}
          </div>
        ) : dc != null || attack != null ? (
          <div className="play-desk-compact__combat-stats play-desk-compact__combat-stats--dense" aria-label="Сл. спас. и атака заклинаний">
            <div className="play-desk-compact__cast-profile play-desk-compact__cast-profile--line">
              <span className="play-desk-compact__cast-profile-line">
                {abilityKey ? SPELLCASTING_ABILITY_LABELS[abilityKey] : '—'}
                {dc != null ? ` · Сл ${dc}` : ''}
                {attack != null ? ` · ${formatModifier(attack)}` : ''}
              </span>
            </div>
          </div>
        ) : null}

        {(quotaLabel || cantripLabel || concentration) && (
          <div className="play-desk-compact__meta">
            {quotaLabel ? <span>{quotaLabel}</span> : null}
            {cantripLabel ? <span>{cantripLabel}</span> : null}
            {concentration ? (
              <span className="play-desk-compact__meta-conc">конц. {concentration.name}</span>
            ) : null}
          </div>
        )}

        {pact && pact.max > 0 ? (
          <div className="play-desk-compact__pact" aria-label="Ячейки договора">
            <strong>Ячейки договора · {pact.level} ур.</strong>
            <div
              className="play-desk-compact__slot-pips is-pact"
              role="group"
              aria-label={`Ячейки договора ${pact.level}: ${pactRemaining}/${pact.max}`}
              title={`Ячейки договора ${pact.level}-го уровня: ${pactRemaining}/${pact.max}`}
            >
              {Array.from({ length: pact.max }, (_, index) => {
                const isOn = index < (pactRemaining ?? 0)
                return (
                  <button
                    key={`pact-${index}`}
                    type="button"
                    className={`play-desk-compact__slot-pip is-pact${isOn ? ' is-on' : ''}`}
                    disabled={!onPactUsedChange}
                    aria-label={
                      isOn
                        ? `Договор: потратить ${index + 1}`
                        : `Договор: вернуть ${index + 1}`
                    }
                    onClick={() => {
                      if (!onPactUsedChange || !pact) return
                      if (isOn) onPactUsedChange(Math.min(pact.max, pact.used + 1))
                      else onPactUsedChange(Math.max(0, pact.used - 1))
                    }}
                  />
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="play-desk-compact__spell-tools">
          <div className="chip-row play-desk-compact__spell-filters" role="group" aria-label="Фильтр заклинаний">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={`sheet-chip${filter === chip.id ? ' is-on' : ''}`}
                onClick={() => setFilter(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <label className="play-desk-compact__spell-search">
            <span className="sr-only">Поиск заклинания</span>
            <input
              type="search"
              className="ui-input"
              placeholder="Поиск по названию"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="play-desk-compact__collapse-actions">
            <button
              type="button"
              className="play-desk-compact__link"
              aria-label="Свернуть все круги заклинаний"
              onClick={collapseAll}
            >
              Свернуть все
            </button>
            <button
              type="button"
              className="play-desk-compact__link"
              aria-label="Развернуть все круги заклинаний"
              onClick={expandAll}
            >
              Развернуть все
            </button>
          </div>
        </div>
      </div>

      <div className="play-desk-compact__list play-desk-compact__list--dense play-desk-compact__list--scroll">
        {ready.length === 0 && levelGroups.length === 0 ? (
          <div className="play-desk-compact__empty-block">
            <p className="play-desk-compact__empty">
              {filter === 'ritual_book'
                ? 'Нет ритуалов из книги'
                : search.trim()
                  ? 'Ничего не найдено'
                  : 'Нет готовых заклинаний'}
            </p>
            {filter === 'all' && !search.trim() ? (
              <button
                type="button"
                className="play-desk-compact__link play-desk-compact__link--prepare"
                onClick={onOpenSettings}
              >
                Выбрать заклинания
              </button>
            ) : null}
          </div>
        ) : (
          levelGroups.map((group) => {
            const slot = group.level > 0 ? spells.slots[String(group.level)] : null
            const remaining =
              slot && slot.max > 0 ? Math.max(0, slot.max - slot.used) : null
            const folded = isCollapsed(group.level, group.visible.length)
            return (
              <div
                key={group.level}
                className={`play-desk-compact__level${folded ? ' is-collapsed' : ''}`}
              >
                <div className="play-desk-compact__level-head">
                  <button
                    type="button"
                    className="play-desk-compact__level-toggle"
                    aria-expanded={!folded}
                    onClick={() => toggleLevel(group.level, group.visible.length)}
                  >
                    <span className="play-desk-compact__level-chevron" aria-hidden>
                      {folded ? '▸' : '▾'}
                    </span>
                    <strong>{levelLabel(group.level)}</strong>
                    <span className="play-desk-compact__level-count">
                      {group.visible.length}
                    </span>
                  </button>
                  {slot && slot.max > 0 ? (
                    <div
                      className="play-desk-compact__slot-track"
                      role="group"
                      aria-label={`Ячейки ${group.level}: ${remaining}/${slot.max}`}
                      title={`Ячейки ${group.level}: ${remaining}/${slot.max}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span className="play-desk-compact__slot-count">
                        Ячейки {remaining}/{slot.max}
                      </span>
                      <div className="play-desk-compact__slot-pips">
                        {Array.from({ length: slot.max }, (_, index) => {
                          const isOn = index < (remaining ?? 0)
                          return (
                            <button
                              key={`${group.level}-${index}`}
                              type="button"
                              className={`play-desk-compact__slot-pip${isOn ? ' is-on' : ''}`}
                              disabled={!onSlotUsedChange}
                              aria-label={
                                isOn
                                  ? `Ячейка ${group.level}: потратить ${index + 1}`
                                  : `Ячейка ${group.level}: вернуть ${index + 1}`
                              }
                              onClick={() => {
                                if (!onSlotUsedChange || !slot) return
                                if (isOn) {
                                  onSlotUsedChange(group.level, Math.min(slot.max, slot.used + 1))
                                } else {
                                  onSlotUsedChange(group.level, Math.max(0, slot.used - 1))
                                }
                              }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
                {!folded
                  ? group.visible.map((spell) => {
                      const isActiveConc =
                        concentration != null &&
                        (concentration.spell_id === spell.id ||
                          concentration.name.trim() === (spell.name || '').trim())
                      return (
                        <SpellRow
                          key={spell.id}
                          spell={spell}
                          characterLevel={characterLevel}
                          affinity={elementalAffinity}
                          learnMode={learnMode}
                          hasSpellbook={hasSpellbook}
                          activeConcentration={isActiveConc}
                          onOpenDetail={() => setDetailSpell(spell)}
                          abilities={abilities}
                          castProfiles={castProfiles ?? null}
                          proficiencyBonus={proficiencyBonus}
                          castingAbility={spells.casting_ability ?? null}
                          showClassChip={isMulticlassCaster}
                          metaOpen={Boolean(metaExpanded[spell.id])}
                          onToggleMeta={() =>
                            setMetaExpanded((prev) => ({
                              ...prev,
                              [spell.id]: !prev[spell.id],
                            }))
                          }
                          onCast={() => {
                            if (onCastSpell) {
                              onCastSpell(spell)
                              return
                            }
                            if (spell.concentration && onConcentrateSpell) {
                              onConcentrateSpell(spell)
                            }
                          }}
                          hasCast={Boolean(onCastSpell || onConcentrateSpell)}
                        />
                      )
                    })
                  : null}
              </div>
            )
          })
        )}
      </div>

      {onSpellsChange ? (
        <PrepareSpellsDialog
          open={prepareOpen && learnBudget?.mode === 'spellbook'}
          spells={spells}
          learnMode="spellbook"
          learnBudgets={learnBudgets}
          onChange={onSpellsChange}
          onClose={() => setPrepareOpen(false)}
        />
      ) : null}

      <SpellDetailDialog
        open={detailSpell != null}
        spell={
          detailSpell
            ? spells.known.find((row) => row.id === detailSpell.id) ?? detailSpell
            : null
        }
        edition={edition}
        characterLevel={characterLevel}
        elementalAffinity={elementalAffinity}
        improvedIllusions={improvedIllusions}
        spellMod={
          detailSpell
            ? (() => {
                const spell =
                  spells.known.find((row) => row.id === detailSpell.id) ?? detailSpell
                const modStats = resolveSpellCastStats({
                  spell,
                  profiles: castProfiles ?? [],
                  abilityModFor: (ability) => abilityModifier(abilities[ability]),
                  proficiencyBonus,
                  fallbackAbility: spells.casting_ability ?? null,
                })
                return modStats.ability ? abilityModifier(abilities[modStats.ability]) : null
              })()
            : null
        }
        spellModLabel={
          detailSpell
            ? (() => {
                const spell =
                  spells.known.find((row) => row.id === detailSpell.id) ?? detailSpell
                const modStats = resolveSpellCastStats({
                  spell,
                  profiles: castProfiles ?? [],
                  abilityModFor: (ability) => abilityModifier(abilities[ability]),
                  proficiencyBonus,
                  fallbackAbility: spells.casting_ability ?? null,
                })
                return modStats.ability
                  ? SPELLCASTING_ABILITY_LABELS[modStats.ability]
                  : null
              })()
            : null
        }
        onClose={() => setDetailSpell(null)}
        onEnrichSpell={
          onSpellsChange
            ? (spellId, patch) => {
                onSpellsChange({
                  ...spells,
                  known: spells.known.map((row) =>
                    row.id === spellId ? { ...row, ...patch } : row,
                  ),
                })
              }
            : undefined
        }
        onCast={
          detailSpell && (onCastSpell || onConcentrateSpell)
            ? () => {
                const spell =
                  spells.known.find((row) => row.id === detailSpell.id) ?? detailSpell
                setDetailSpell(null)
                if (onCastSpell) onCastSpell(spell)
                else if (spell.concentration && onConcentrateSpell) {
                  onConcentrateSpell(spell)
                }
              }
            : undefined
        }
      />
    </div>
  )
}

function shortCastingTime(raw: string): string {
  const t = raw.trim().toLowerCase()
  if (!t) return ''
  if (t.includes('бонус')) return 'бонус'
  if (t.includes('реакц')) return 'реакция'
  if (t.includes('действ')) return 'действие'
  if (t.includes('минут')) return raw.trim()
  if (t.includes('час')) return raw.trim()
  return raw.trim()
}

function shortRange(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  return t
    .replace(/футов?/gi, 'фт')
    .replace(/на себя/gi, 'на себя')
    .replace(/\s+/g, ' ')
}

function compactComponents(spell: SheetSpell): string {
  const c = spell.components
  if (!c) return ''
  const parts: string[] = []
  if (c.v) parts.push('В')
  if (c.s) parts.push('С')
  if (c.m != null) parts.push('М')
  return parts.join('/')
}

function shortDamage(raw: string): string {
  const t = raw.trim()
  if (!t || t === '—') return ''
  return t.replace(/\s+/g, ' ')
}

function compactDamage(
  spell: SheetSpell,
  characterLevel: number,
  spellMod: number | null,
  spellModLabel: string | null,
  affinity?: { damageType: string; amount: number } | null,
): string {
  const rules = withBundledRules(spell)
  const level = Math.max(1, Math.floor(characterLevel) || 1)
  const slotLevel = Math.max(rules.level, 1)
  const summary = resolveCastEffectSummary(rules, {
    characterLevel: level,
    slotLevel,
    spellMod,
    spellModLabel,
    affinity,
  })
  const scaled = shortDamage(summary.effect)
  if (scaled) return scaled
  return shortDamage(rules.damage ?? '')
}

function compactSpellMeta(spell: SheetSpell): string {
  const parts: string[] = []
  const rules = withBundledRules(spell)
  const time = shortCastingTime(rules.casting_time || spell.casting_time)
  parts.push(time || '—')
  const range = shortRange(rules.range || spell.range)
  parts.push(range || '—')
  const atk = (rules.attack_or_save || spell.attack_or_save)?.trim()
  parts.push(atk && atk !== '—' ? atk : '—')
  const comps = compactComponents(rules)
  if (comps) parts.push(comps)
  if (spell.school) parts.push(spellSchoolLabelRu(spell.school))
  if (spell.duration?.trim()) parts.push(spell.duration.trim())
  return parts.join(' · ')
}

function SpellRow({
  spell,
  characterLevel,
  affinity = null,
  learnMode,
  hasSpellbook,
  activeConcentration,
  onOpenDetail,
  onCast,
  hasCast,
  abilities,
  castProfiles,
  proficiencyBonus,
  castingAbility,
  showClassChip,
  metaOpen,
  onToggleMeta,
}: {
  spell: SheetSpell
  characterLevel: number
  affinity?: { damageType: string; amount: number } | null
  learnMode: 'known' | 'prepared_list' | 'spellbook' | null
  hasSpellbook: boolean
  activeConcentration: boolean
  onOpenDetail: () => void
  onCast: () => void
  hasCast: boolean
  abilities: Record<AbilityKey, number>
  castProfiles: SpellCastProfile[] | null
  proficiencyBonus: number
  castingAbility: SpellcastingAbility | null
  showClassChip: boolean
  metaOpen: boolean
  onToggleMeta: () => void
}) {
  const levelText = spell.item_cast
    ? spell.item_cast.chargePerLevel
      ? `${spell.item_cast.castLevel}+ ур.`
      : spell.item_cast.castLevel <= 0
        ? 'заговор'
        : `${spell.item_cast.castLevel} ур.`
    : spell.level <= 0
      ? 'заговор'
      : `${spell.level} ур.`
  const chargeText = spell.item_cast
    ? spell.item_cast.charges <= 0
      ? 'неограниченно'
      : spell.item_cast.chargePerLevel
        ? `от ${spell.item_cast.charges} зар.`
        : `${spell.item_cast.charges} зар.`
    : ''
  const meta = compactSpellMeta(spell)
  const modStats = resolveSpellCastStats({
    spell,
    profiles: castProfiles ?? [],
    abilityModFor: (ability) => abilityModifier(abilities[ability]),
    proficiencyBonus,
    fallbackAbility: castingAbility,
  })
  const damage = compactDamage(
    spell,
    characterLevel,
    modStats.ability ? abilityModifier(abilities[modStats.ability]) : null,
    modStats.ability ? SPELLCASTING_ABILITY_LABELS[modStats.ability] : null,
    affinity,
  )
  const source = spellSourceBadge(spell)
  const granted = isGrantedSpellHighlight(spell)
  const grantLeft =
    spell.grant_cast && spell.grant_cast.max > 0 ? grantCastRemaining(spell) : null
  const ritualFromBook = isRitualFromBook(spell, learnMode, hasSpellbook)
  const ritualLabel = ritualFromBook
    ? 'Не подготовлено · ритуал из книги'
    : spell.ritual
      ? 'ритуал'
      : null
  const classChip = showClassChip ? classSlugChipLabel(spell.class_slug) : null
  const flags: string[] = []
  if (activeConcentration) flags.push('держит конц.')
  else if (spell.concentration) flags.push('конц.')
  if (ritualLabel) flags.push(ritualLabel)
  if (source) flags.push(source.label)
  if (classChip) flags.push(classChip)
  if (damage) flags.push(damage)

  const rowLabel = damage ? `${spell.name}, ${damage}` : `${spell.name}, без урона`

  return (
    <div
      key={`${spell.id}:${damage || '—'}`}
      className={`play-desk-compact__row is-spell is-spell-line${
        activeConcentration ? ' is-conc-active' : ''
      }${granted ? ' is-granted' : ''}${hasCast ? ' has-cast' : ''}${
        ritualFromBook ? ' is-ritual-unprepared' : ''
      }${metaOpen ? ' is-meta-open' : ''}`}
      role="button"
      tabIndex={0}
      aria-expanded={metaOpen}
      aria-label={rowLabel}
      title={
        flags.length
          ? `${spell.name} · ${flags.join(' · ')} · клик — детали строки`
          : `${spell.name} · клик — детали строки`
      }
      onClick={() => onToggleMeta()}
      onDoubleClick={(event) => {
        event.preventDefault()
        onOpenDetail()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggleMeta()
        }
      }}
    >
      <div className="play-desk-compact__spell-body">
        <div className="play-desk-compact__spell-top">
          <div className="play-desk-compact__row-main">
            <b
              className="play-desk-compact__spell-name"
              role="link"
              tabIndex={0}
              title="Открыть описание заклинания"
              onClick={(event) => {
                event.stopPropagation()
                onOpenDetail()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  onOpenDetail()
                }
              }}
            >
              {spell.name}
            </b>
            <span className="play-desk-compact__spell-level">
              {levelText}
              {chargeText ? ` · ${chargeText}` : ''}
            </span>
            <span
              className="play-desk-compact__spell-dmg"
              title="Урон / эффект для этого персонажа"
            >
              {damage || '—'}
            </span>
            {classChip ? (
              <span className="play-desk-compact__source is-class" title={`Класс · ${classChip}`}>
                {classChip}
              </span>
            ) : null}
            {source ? (
              <span
                className={`play-desk-compact__source is-${source.kind}`}
                title={source.title}
              >
                {source.label}
                {grantLeft != null ? ` ${grantLeft}/${spell.grant_cast!.max}` : ''}
              </span>
            ) : null}
          </div>
          {(spell.concentration || ritualLabel) && (
            <span className="play-desk-compact__flags">
              {ritualLabel ? (
                <span
                  className={`play-desk-compact__flag is-ritual${
                    ritualFromBook ? ' is-unprepared' : ''
                  }`}
                  title={ritualLabel}
                >
                  <IconRitual className="play-desk-compact__flag-icon" />
                  <span className="play-desk-compact__flag-label">
                    {ritualFromBook ? 'ритуал · из книги' : 'ритуал'}
                  </span>
                </span>
              ) : null}
              {spell.concentration ? (
                <span
                  className={`play-desk-compact__flag is-conc${
                    activeConcentration ? ' is-active' : ''
                  }`}
                  title={activeConcentration ? 'Держит концентрацию' : 'Концентрация'}
                >
                  <IconConcentration className="play-desk-compact__flag-icon" />
                  <span className="play-desk-compact__flag-label">конц.</span>
                </span>
              ) : null}
            </span>
          )}
        </div>
        <p
          className={`play-desk-compact__spell-meta${metaOpen ? ' is-open' : ' is-quiet'}`}
          title="Действие · дистанция · атака/спас · клик по строке — раскрыть"
        >
          {meta}
          {metaOpen ? (
            <>
              {' · '}
              <button
                type="button"
                className="play-desk-compact__link play-desk-compact__spell-desc-btn"
                title="Открыть описание заклинания"
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenDetail()
                }}
              >
                Описание
              </button>
            </>
          ) : null}
        </p>
      </div>
      {hasCast ? (
        <div className="play-desk-compact__spell-cast-wrap">
          <button
            type="button"
            className="ui-button ui-button--secondary ui-button--edge-end play-desk-compact__spell-cast"
            title={`Каст: ${spell.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onCast()
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <IconCast className="play-desk-compact__spell-cast-icon" />
            <span>Каст</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
