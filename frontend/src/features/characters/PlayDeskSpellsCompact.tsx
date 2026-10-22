import { useState } from 'react'
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
  formatNamedCantripBudgets,
  formatNamedPrepareBudgets,
  mergeCastProfilesForDisplay,
  type SpellCastProfile,
} from '../../shared/dnd/castProfiles'
import { resolveCastEffect } from '../../shared/dnd/spellCatalog'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  countAlwaysPreparedLeveled,
  countLearnedCantrips,
  countLearnedCantripsBySlug,
  countLearnedLeveled,
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
import { IconCast, IconConcentration, IconRitual, IconWizardHat } from './spellIcons'
import { spellSchoolLabelRu } from '../../shared/dnd/spellCatalog'
import type { FormulaVars } from '../../shared/dnd/formulas'
import {
  SPELLCASTING_ABILITY_LABELS,
  clampPactSlots,
  levelLabel,
  spellAttackBonus,
  spellSaveDc,
} from '../../shared/dnd/spells'
import type { RulesEdition } from '../../shared/api/characters'
import { type BonusLine, withSpellCastBonuses } from './modifiers'

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
  /** Open cast picker (slot / pact / grant / ritual). */
  onCastSpell?: (spell: SheetSpell) => void
  /** Pin concentration in hot without opening full panel. */
  onConcentrateSpell?: (spell: SheetSpell) => void
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
  characterLevel = 1,
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
}: PlayDeskSpellsCompactProps) {
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [detailSpell, setDetailSpell] = useState<SheetSpell | null>(null)
  const [showAllSpells, setShowAllSpells] = useState(false)
  const hasSpellbook =
    learnBudget?.mode === 'spellbook' &&
    Boolean(
      spells.wizard_spellbook &&
        !spells.wizard_spellbook.bookLost &&
        spells.wizard_spellbook.primaryBookItemId,
    )
  const ready = spells.known.filter((spell) =>
    isAvailableToCast(spell, {
      learnMode: learnBudget?.mode ?? null,
      hasSpellbook,
    }),
  )
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
    // Unscoped lines + lines matching this profile.slug (M3).
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
  const learnedCantrips = countLearnedCantrips(spells.known)
  const learnedLeveled = countLearnedLeveled(spells.known)
  const preparedCount = countPreparedLeveled(spells.known)
  const alwaysPreparedCount = countAlwaysPreparedLeveled(spells.known)
  const quotaLabel = (() => {
    if (learnBudget?.mode === 'known') {
      const cap = learnBudget.leveledKnown
      return cap != null ? `изв. ${learnedLeveled}/${cap}` : `изв. ${learnedLeveled}`
    }
    // Prefer per-class prepare chips when several prepare casters are present.
    if (learnBudgets && learnBudgets.length > 0) {
      const named = formatNamedPrepareBudgets(
        learnBudgets,
        countPreparedLeveledBySlug(spells.known),
        { alwaysPrepared: alwaysPreparedCount },
      )
      if (named) return named
    }
    if (!learnBudget) {
      if (spells.max_prepared != null) {
        return `подг. ${preparedCount}/${spells.max_prepared}`
      }
      return null
    }
    const prepCap = learnBudget.maxPrepared ?? spells.max_prepared
    const base =
      prepCap != null
        ? `подг. ${preparedCount}/${prepCap}`
        : `подг. ${preparedCount}`
    return alwaysPreparedCount > 0 ? `${base} · всегда ${alwaysPreparedCount}` : base
  })()
  const cantripLabel = (() => {
    if (learnBudgets && learnBudgets.length > 0) {
      return formatNamedCantripBudgets(
        learnBudgets,
        countLearnedCantripsBySlug(spells.known),
        { tomeExtra: countLockedFeatureCantrips(spells.known) },
      )
    }
    if (learnBudget?.cantrips != null) {
      return `заг. ${learnedCantrips}/${learnBudget.cantrips}`
    }
    return null
  })()
  /**
   * «Подготовить» на листе — только волшебник (быстрый набор из книги).
   * Жрец и компания готовят в гримуаре; known — без daily prepare.
   */
  const showPrepare =
    Boolean(onSpellsChange) && learnBudget?.mode === 'spellbook'

  const maxRows = 14
  const levelGroups = (() => {
    const grouped = groupSpellsByLevel(ready)
    const byLevel = new Map(grouped.map((group) => [group.level, group]))
    for (let level = 1; level <= 9; level += 1) {
      if ((spells.slots[String(level)]?.max ?? 0) > 0 && !byLevel.has(level)) {
        byLevel.set(level, { level, spells: [] })
      }
    }
    let remaining = showAllSpells ? Number.POSITIVE_INFINITY : maxRows
    return [...byLevel.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, group]) => {
        const visible = group.spells.slice(0, Math.max(0, remaining))
        remaining -= visible.length
        return { ...group, visible }
      })
      .filter((group) => group.visible.length > 0 || (group.level > 0 && (spells.slots[String(group.level)]?.max ?? 0) > 0))
  })()

  return (
    <div className="play-desk-compact">
      <div className="play-desk-compact__head">
        <h3>{pinned ? 'Заклинания (закреплено)' : 'Заклинания'}</h3>
        <div className="play-desk-compact__head-actions">
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

      {profileRows && profileRows.length > 0 ? (
        <div
          className={`play-desk-compact__combat-stats play-desk-compact__combat-stats--profiles${
            profileRows.length > 1 ? ' is-multi' : ''
          }`}
          aria-label="Сл. спас. и атака заклинаний по классам"
        >
          {profileRows.map((row) => (
            <div
              key={row.id}
              className={`play-desk-compact__cast-profile is-${row.ability}`}
              title={`${row.labelRu} · ${SPELLCASTING_ABILITY_LABELS[row.ability]}`}
            >
              <span className="play-desk-compact__cast-profile-source">
                {row.labelRu}
                <em>{SPELLCASTING_ABILITY_LABELS[row.ability]}</em>
              </span>
              <span className="play-desk-compact__cast-profile-nums">
                <span>
                  Сл <b>{row.saveDc}</b>
                </span>
                <span>
                  Атака <b>{formatModifier(row.attackBonus)}</b>
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : (dc != null || attack != null) ? (
        <div className="play-desk-compact__combat-stats" aria-label="Сл. спас. и атака заклинаний">
          {dc != null ? (
            <div className="play-desk-compact__combat-stat">
              <span>Сл. спас.</span>
              <b>{dc}</b>
            </div>
          ) : null}
          {attack != null ? (
            <div className="play-desk-compact__combat-stat">
              <span>Атака</span>
              <b>{formatModifier(attack)}</b>
            </div>
          ) : null}
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

      <div className="play-desk-compact__list play-desk-compact__list--dense">
        {ready.length === 0 && levelGroups.length === 0 ? (
          <div className="play-desk-compact__empty-block">
            <p className="play-desk-compact__empty">Нет готовых заклинаний</p>
            <button
              type="button"
              className="play-desk-compact__link play-desk-compact__link--prepare"
              onClick={onOpenSettings}
            >
              Выбрать заклинания
            </button>
          </div>
        ) : (
          levelGroups.map((group) => {
            const slot = group.level > 0 ? spells.slots[String(group.level)] : null
            const remaining =
              slot && slot.max > 0 ? Math.max(0, slot.max - slot.used) : null
            return (
              <div key={group.level} className="play-desk-compact__level">
                <div className="play-desk-compact__level-head">
                  <strong>{levelLabel(group.level)}</strong>
                  {slot && slot.max > 0 ? (
                    <div
                      className="play-desk-compact__slot-pips"
                      role="group"
                      aria-label={`Ячейки ${group.level}: ${remaining}/${slot.max}`}
                      title={`Ячейки ${group.level}: ${remaining}/${slot.max}`}
                    >
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
                  ) : null}
                </div>
                {group.visible.map((spell) => {
                  const isActiveConc =
                    concentration != null &&
                    (concentration.spell_id === spell.id ||
                      concentration.name.trim() === (spell.name || '').trim())
                  return (
                    <SpellRow
                      key={spell.id}
                      spell={spell}
                      characterLevel={characterLevel}
                      learnMode={learnBudget?.mode ?? null}
                      hasSpellbook={hasSpellbook}
                      activeConcentration={isActiveConc}
                      onOpenDetail={() => setDetailSpell(spell)}
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
                })}
              </div>
            )
          })
        )}
        {ready.length > maxRows ? (
          showAllSpells ? (
            <button
              type="button"
              className="play-desk-compact__more play-desk-compact__more--btn"
              onClick={() => setShowAllSpells(false)}
            >
              Свернуть список
            </button>
          ) : (
            <button
              type="button"
              className="play-desk-compact__more play-desk-compact__more--btn"
              onClick={() => setShowAllSpells(true)}
            >
              + ещё {ready.length - maxRows} · показать все
            </button>
          )
        ) : null}
      </div>

      {onSpellsChange ? (
        <PrepareSpellsDialog
          open={prepareOpen && learnBudget?.mode === 'spellbook'}
          spells={spells}
          learnMode="spellbook"
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

/** Actual effect for this character (cantrip/slot scaling), not the catalog base. */
function compactDamage(spell: SheetSpell, characterLevel: number): string {
  const { effect } = resolveCastEffect(spell, {
    characterLevel: Math.max(1, characterLevel),
    slotLevel: Math.max(spell.level, 1),
  })
  return shortDamage(effect)
}

/** Unified card skeleton: action · range · attack/save (always present). */
function compactSpellMeta(spell: SheetSpell): string {
  const parts: string[] = []
  const time = shortCastingTime(spell.casting_time)
  parts.push(time || '—')
  const range = shortRange(spell.range)
  parts.push(range || '—')
  const atk = spell.attack_or_save?.trim()
  parts.push(atk && atk !== '—' ? atk : '—')
  const comps = compactComponents(spell)
  if (comps) parts.push(comps)
  if (spell.school) parts.push(spellSchoolLabelRu(spell.school))
  if (spell.duration?.trim()) parts.push(spell.duration.trim())
  return parts.join(' · ')
}

function SpellRow({
  spell,
  characterLevel,
  learnMode,
  hasSpellbook,
  activeConcentration,
  onOpenDetail,
  onCast,
  hasCast,
}: {
  spell: SheetSpell
  characterLevel: number
  learnMode: 'known' | 'prepared_list' | 'spellbook' | null
  hasSpellbook: boolean
  activeConcentration: boolean
  onOpenDetail: () => void
  onCast: () => void
  hasCast: boolean
}) {
  const levelText = spell.level <= 0 ? 'заговор' : `${spell.level} ур.`
  const meta = compactSpellMeta(spell)
  const damage = compactDamage(spell, characterLevel)
  const source = spellSourceBadge(spell)
  const granted = isGrantedSpellHighlight(spell)
  const grantLeft =
    spell.grant_cast && spell.grant_cast.max > 0 ? grantCastRemaining(spell) : null
  const ritualFromBook =
    Boolean(spell.ritual) &&
    !spell.prepared &&
    learnMode === 'spellbook' &&
    hasSpellbook
  const ritualLabel = ritualFromBook
    ? 'Не подготовлено · ритуал из книги'
    : spell.ritual
      ? 'ритуал'
      : null
  const flags: string[] = []
  if (activeConcentration) flags.push('держит конц.')
  else if (spell.concentration) flags.push('конц.')
  if (ritualLabel) flags.push(ritualLabel)
  if (source) flags.push(source.label)
  if (damage) flags.push(damage)

  return (
    <div
      className={`play-desk-compact__row is-spell${
        activeConcentration ? ' is-conc-active' : ''
      }${granted ? ' is-granted' : ''}${hasCast ? ' has-cast' : ''}${
        ritualFromBook ? ' is-ritual-unprepared' : ''
      }`}
    >
      <button
        type="button"
        className="play-desk-compact__spell-body"
        title={
          flags.length
            ? `${spell.name} · ${flags.join(' · ')} · описание`
            : `${spell.name} · описание`
        }
        onClick={onOpenDetail}
      >
        <div className="play-desk-compact__spell-top">
          <div className="play-desk-compact__row-main">
            <b>{spell.name}</b>
            <span className="play-desk-compact__spell-level">{levelText}</span>
            <span
              className="play-desk-compact__spell-dmg"
              title="Урон / эффект для этого персонажа"
            >
              {damage || '—'}
            </span>
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
        <p className="play-desk-compact__spell-meta" title="Действие · дистанция · атака/спас">
          {meta}
        </p>
        {ritualFromBook ? (
          <p className="play-desk-compact__spell-ritual-note">{ritualLabel}</p>
        ) : null}
      </button>
      {hasCast ? (
        <button
          type="button"
          className="play-desk-compact__spell-cast"
          title={`Каст: ${spell.name}`}
          onClick={(event) => {
            event.stopPropagation()
            onCast()
          }}
        >
          <IconCast className="play-desk-compact__spell-cast-icon" />
          <span>Каст</span>
        </button>
      ) : null}
    </div>
  )
}
