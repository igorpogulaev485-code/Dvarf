import { useState } from 'react'
import {
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import { formatCheckRoll, rollCheck, type DeskRollMode } from './deskRolls'
import type { ConcentrationState } from './play'
import { PrepareSpellsDialog } from './PrepareSpellsDialog'
import {
  countLearnedCantrips,
  countLearnedLeveled,
  countPreparedLeveled,
  grantCastRemaining,
  groupSpellsByLevel,
  isGrantedSpellHighlight,
  isReadyInCombat,
  spellSourceBadge,
  type SheetSpell,
  type SpellsState,
} from './spells'
import { IconCast, IconConcentration, IconRitual, IconWizardHat } from './spellIcons'
import { spellSchoolLabelRu } from '../../shared/dnd/spellCatalog'
import { levelLabel, spellAttackBonus, spellSaveDc } from '../../shared/dnd/spells'

type PlayDeskSpellsCompactProps = {
  spells: SpellsState
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  /** PHB learn budget caps for compact quota chips. */
  learnBudget?: {
    mode: 'known' | 'prepared_list' | 'spellbook'
    cantrips: number | null
    leveledKnown: number | null
    maxPrepared: number | null
  } | null
  pinned?: boolean
  concentration?: ConcentrationState | null
  onOpenFull: () => void
  onClearSplit?: () => void
  /** Patch spells (prepare dialog). */
  onSpellsChange?: (spells: SpellsState) => void
  /** Set used count for a slot level (spend or restore, like ability pips). */
  onSlotUsedChange?: (level: number, used: number) => void
  onToast?: (message: string) => void
  /** Open full cast flow for leveled non-concentration (or explicit cast). */
  onCastSpell?: (spell: SheetSpell) => void
  /** Pin concentration in hot without opening full panel. */
  onConcentrateSpell?: (spell: SheetSpell) => void
  rollMode?: DeskRollMode
}

export function PlayDeskSpellsCompact({
  spells,
  abilities,
  proficiencyBonus,
  learnBudget = null,
  pinned = false,
  concentration = null,
  onOpenFull,
  onClearSplit,
  onSpellsChange,
  onSlotUsedChange,
  onToast,
  onCastSpell,
  onConcentrateSpell,
  rollMode = 'normal',
}: PlayDeskSpellsCompactProps) {
  const [prepareOpen, setPrepareOpen] = useState(false)
  const ready = spells.known.filter(isReadyInCombat)
  const abilityKey = spells.casting_ability
  const abilityMod = abilityKey ? abilityModifier(abilities[abilityKey]) : 0
  const dc = abilityKey ? spellSaveDc(abilityMod, proficiencyBonus) : null
  const attack = abilityKey ? spellAttackBonus(abilityMod, proficiencyBonus) : null
  const learnedCantrips = countLearnedCantrips(spells.known)
  const learnedLeveled = countLearnedLeveled(spells.known)
  const preparedCount = countPreparedLeveled(spells.known)
  const quotaLabel = (() => {
    if (!learnBudget) {
      if (spells.max_prepared != null) {
        return `подг. ${preparedCount}/${spells.max_prepared}`
      }
      return null
    }
    if (learnBudget.mode === 'known') {
      const cap = learnBudget.leveledKnown
      return cap != null ? `изв. ${learnedLeveled}/${cap}` : `изв. ${learnedLeveled}`
    }
    const prepCap = learnBudget.maxPrepared ?? spells.max_prepared
    return prepCap != null
      ? `подг. ${preparedCount}/${prepCap}`
      : `подг. ${preparedCount}`
  })()
  const cantripLabel =
    learnBudget?.cantrips != null
      ? `заг. ${learnedCantrips}/${learnBudget.cantrips}`
      : null

  const maxRows = 14
  const levelGroups = (() => {
    const grouped = groupSpellsByLevel(ready)
    const byLevel = new Map(grouped.map((group) => [group.level, group]))
    for (let level = 1; level <= 9; level += 1) {
      if ((spells.slots[String(level)]?.max ?? 0) > 0 && !byLevel.has(level)) {
        byLevel.set(level, { level, spells: [] })
      }
    }
    let remaining = maxRows
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
          {onSpellsChange ? (
            <button
              type="button"
              className="play-desk-compact__link play-desk-compact__link--prepare"
              onClick={() => setPrepareOpen(true)}
            >
              <IconWizardHat className="play-desk-compact__link-icon" />
              Подготовить
            </button>
          ) : null}
          {onClearSplit ? (
            <button type="button" className="play-desk-compact__link" onClick={onClearSplit}>
              без заклинаний
            </button>
          ) : null}
          <button type="button" className="play-desk-compact__link" onClick={onOpenFull}>
            полностью
          </button>
        </div>
      </div>

      {(dc != null || attack != null) && (
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
      )}

      {(quotaLabel || cantripLabel || concentration) && (
        <div className="play-desk-compact__meta">
          {quotaLabel ? <span>{quotaLabel}</span> : null}
          {cantripLabel ? <span>{cantripLabel}</span> : null}
          {concentration ? (
            <span className="play-desk-compact__meta-conc">конц. {concentration.name}</span>
          ) : null}
        </div>
      )}

      <div className="play-desk-compact__list play-desk-compact__list--dense">
        {ready.length === 0 && levelGroups.length === 0 ? (
          <p className="play-desk-compact__empty">Нет готовых заклинаний</p>
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
                      spellAttack={attack}
                      spellDc={dc}
                      rollMode={rollMode}
                      activeConcentration={isActiveConc}
                      onToast={onToast}
                      onActivate={() => {
                        if (onCastSpell) {
                          onCastSpell(spell)
                          return
                        }
                        if (spell.concentration && onConcentrateSpell) {
                          onConcentrateSpell(spell)
                        }
                      }}
                      hasActivate={Boolean(onCastSpell || onConcentrateSpell)}
                    />
                  )
                })}
              </div>
            )
          })
        )}
        {ready.length > maxRows ? (
          <p className="play-desk-compact__more">+ ещё {ready.length - maxRows}</p>
        ) : null}
      </div>

      {onSpellsChange ? (
        <PrepareSpellsDialog
          open={prepareOpen}
          spells={spells}
          onChange={onSpellsChange}
          onClose={() => setPrepareOpen(false)}
        />
      ) : null}
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

function compactSpellMeta(spell: SheetSpell): string {
  const parts: string[] = []
  if (spell.school) parts.push(spellSchoolLabelRu(spell.school))
  const comps = compactComponents(spell)
  if (comps) parts.push(comps)
  const range = shortRange(spell.range)
  if (range) parts.push(range)
  const time = shortCastingTime(spell.casting_time)
  if (time) parts.push(time)
  if (spell.duration?.trim()) parts.push(spell.duration.trim())
  const atk = spell.attack_or_save?.trim()
  if (atk && atk !== '—') parts.push(atk)
  return parts.join(' · ')
}

function SpellRow({
  spell,
  spellAttack,
  spellDc,
  rollMode,
  activeConcentration,
  onToast,
  onActivate,
  hasActivate,
}: {
  spell: SheetSpell
  spellAttack: number | null
  spellDc: number | null
  rollMode: DeskRollMode
  activeConcentration: boolean
  onToast?: (message: string) => void
  onActivate?: () => void
  hasActivate: boolean
}) {
  const levelText = spell.level <= 0 ? 'заговор' : `${spell.level} ур.`
  const meta = compactSpellMeta(spell)
  const source = spellSourceBadge(spell)
  const granted = isGrantedSpellHighlight(spell)
  const grantLeft =
    spell.grant_cast && spell.grant_cast.max > 0 ? grantCastRemaining(spell) : null
  const flags: string[] = []
  if (activeConcentration) flags.push('держит конц.')
  else if (spell.concentration) flags.push('конц.')
  if (spell.ritual) flags.push('ритуал')
  if (source) flags.push(source.label)

  return (
    <button
      type="button"
      className={`play-desk-compact__row is-spell${
        activeConcentration ? ' is-conc-active' : ''
      }${granted ? ' is-granted' : ''}${hasActivate ? ' is-action' : ''}`}
      title={
        flags.length
          ? `${spell.name} · ${flags.join(' · ')}${source ? ` · ${source.title}` : ''}`
          : hasActivate
            ? `Каст: ${spell.name}`
            : spell.name
      }
      onClick={() => {
        if (hasActivate && onActivate) {
          onActivate()
          return
        }
        const head = `${spell.name} · ${levelText}${
          flags.length ? ` · ${flags.join(', ')}` : ''
        }`
        if (spellAttack != null) {
          const roll = rollCheck(spellAttack, rollMode)
          onToast?.(
            `${formatCheckRoll(spell.name, roll)}${
              spellDc != null ? ` · Сл ${spellDc}` : ''
            } · ${levelText}`,
          )
          return
        }
        onToast?.(`${head}${spellDc != null ? ` · Сл ${spellDc}` : ''}`)
      }}
    >
      <div className="play-desk-compact__spell-top">
        <div className="play-desk-compact__row-main">
          {hasActivate ? <IconCast className="play-desk-compact__row-icon" /> : null}
          <b>{spell.name}</b>
          <span className="play-desk-compact__spell-level">{levelText}</span>
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
        {(spell.concentration || spell.ritual) && (
          <span className="play-desk-compact__flags">
            {spell.ritual ? (
              <span className="play-desk-compact__flag is-ritual" title="Ритуал">
                <IconRitual className="play-desk-compact__flag-icon" />
                <span className="play-desk-compact__flag-label">ритуал</span>
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
      {meta ? <p className="play-desk-compact__spell-meta">{meta}</p> : null}
    </button>
  )
}
