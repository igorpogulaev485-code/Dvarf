import { useEffect, useMemo, useState } from 'react'
import {
  findDualCastSiblings,
  resolveSpellCastStats,
  type SpellCastProfile,
} from '../../shared/dnd/castProfiles'
import type { FormulaVars } from '../../shared/dnd/formulas'
import {
  formatSpellComponents,
  resolveCastEffectSummary,
  spellSchoolLabelRu,
} from '../../shared/dnd/spellCatalog'
import {
  availableCastSlotLevels,
  canSpendPactSlot,
  levelLabel,
  slotsRemaining,
  type SpellcastingAbility,
} from '../../shared/dnd/spells'
import { canCastWizardRitualFromBook } from '../../shared/dnd/wizardSpellbook'
import { Button, Dialog, Stack, Text } from '../../ui'
import { AllyTargetFields } from '../lobby/AllyTargetFields'
import { useLobbyParty, type AllyPickDemo } from '../lobby/useLobbyParty'
import {
  listCastGrantOptions,
  type SheetSpell,
  type SpellsState,
} from './spells'
import { checkSpellMaterials, type MaterialInventoryItem } from './spellMaterials'
import { isSpellSelfFormCast } from './spellForms'
import { type BonusLine, withSpellCastBonuses } from './modifiers'
import { abilityModifier, formatModifier, type AbilityKey } from './sheetTypes'

/**
 * Ally-target heuristics live IN this module on purpose.
 * Cross-chunk named imports of guessAppliesToAllies were mangled to the same
 * short names as locals in MinimalSheetEditor (stealth `io`), so prod cast
 * dialog never opened the lobby target picker for Щит веры / Bless / …
 */
const CAST_ALLY_NAME_RE =
  /благословен|bless|ускорен|haste|щит\s*вер|shield of faith|наставлен|guidance|помощ[ьи]|\baid\b|героизм|heroism|вардинг|warding bond|вдохновен|inspiration|инфуз|infusion|бафф?|\bбаф\b/i
const CAST_ALLY_CATALOG_RE =
  /shield_of_faith|\bbless\b|\baid\b|\bhaste\b|\bheroism\b|warding_bond|\bguidance\b|beacon_of_hope|enhance_ability/i
const CAST_MULTI_TARGET_RE = /благословен|bless|помощ[ьи]|\baid\b/i
const CAST_MULTI_CATALOG_RE = /\bbless\b|\baid\b/i

function castSpellAppliesToAllies(spell: SheetSpell): boolean {
  if (spell.applies_to_allies === true) return true
  const catalog = String(spell.catalog_id ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  if (catalog && CAST_ALLY_CATALOG_RE.test(catalog)) return true
  const name = String(spell.name ?? '').trim()
  return Boolean(name) && CAST_ALLY_NAME_RE.test(name)
}

function castSpellAllyTargetCount(spell: SheetSpell): number {
  if (typeof spell.ally_target_count === 'number' && spell.ally_target_count >= 1) {
    return Math.min(6, Math.floor(spell.ally_target_count))
  }
  const catalog = String(spell.catalog_id ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  if (catalog && CAST_MULTI_CATALOG_RE.test(catalog)) return 3
  const name = String(spell.name ?? '').trim()
  if (name && CAST_MULTI_TARGET_RE.test(name)) return 3
  return 1
}

/** §2.8 — путь расхода до подтверждения каста. */
function castPathRestLabel(input: {
  kind: 'slot' | 'pact' | 'grant' | 'ritual'
  level?: number
  grantLabel?: string
  reset?: 'short' | 'long'
}): string {
  if (input.kind === 'slot') {
    return `Обычная, ${input.level ?? '?'} круг — долгий отдых`
  }
  if (input.kind === 'pact') {
    return `Договор, ${input.level ?? '?'} круг — короткий отдых`
  }
  if (input.kind === 'grant') {
    const rest = input.reset === 'short' ? 'короткий отдых' : 'длинный отдых'
    return `Заряд · ${input.grantLabel?.trim() || 'Грант'} — ${rest}`
  }
  return 'Ритуал · без ячейки'
}

function dualSourceLabel(
  row: SheetSpell,
  profiles: SpellCastProfile[],
): string {
  const slug = row.class_slug?.trim().toLowerCase() || ''
  if (slug) {
    const hit = profiles.find((p) => p.slug === slug)
    if (hit) return hit.labelRu
  }
  return row.prepare_source_label?.trim() || row.class_slug?.trim() || '—'
}

export type CastChoice = {
  usePact: boolean
  slotLevel: number
  /** Ritual: no slot / pact spent (PHB +10 min). */
  ritual?: boolean
  /** Spend race/feat/artifact grant free-cast charge instead of a slot. */
  useGrant?: boolean
  /** Which sheet row's grant_cast to spend (sibling race/gear row ok). */
  grantSpellId?: string | null
  /** When material is consumed — whether to decrement inventory. */
  consumeMaterial?: boolean
  /** Inventory item id to consume (cheapest sufficient). */
  consumeItemId?: string | null
  /**
   * Polymorph / Shapechange / True Polymorph:
   * self → open form picker; other → spend only, no self_form card.
   */
  selfFormTarget?: 'self' | 'other'
  /** Выбранные цели (себя и/или союзники), без пустых слотов */
  allyTargetIds?: string[]
  lobbyId?: string | null
}

type CastSpellDialogProps = {
  open: boolean
  spell: SheetSpell | null
  spells: SpellsState
  /** Inventory snapshot for costly / fallback free components. */
  inventoryItems: MaterialInventoryItem[]
  /** Total character level — cantrip scaling 1/5/11/17. */
  characterLevel: number
  /** Нужен для выбора союзников из лобби этого персонажа. */
  characterId?: string
  /**
   * Wizard: ritual casting requires the spell in the physical spellbook (PHB).
   * When true, ritual path is gated by canCastWizardRitualFromBook.
   */
  wizardRitualFromBook?: boolean
  busy?: boolean
  /** Превью без API */
  allyDemo?: AllyPickDemo | null
  /** M3: resolve DC/attack from class association. */
  abilities?: Record<AbilityKey, number> | null
  proficiencyBonus?: number
  castProfiles?: SpellCastProfile[] | null
  modifiers?: BonusLine[]
  formulaVars?: FormulaVars
  /**
   * When dual-cast siblings exist, parent can switch the active sheet row.
   * Dialog still owns the picker UI.
   */
  onSelectSpellVariant?: (spell: SheetSpell) => void
  onConfirm: (choice: CastChoice) => void
  onClose: () => void
  /** K14: open Rest when no free slots (inline recovery). */
  onRequestRest?: () => void
  /** K14: reset warlock pact used → 0 without leaving cast sheet. */
  onRestorePact?: () => void
}

export function CastSpellDialog({
  open,
  spell,
  spells,
  inventoryItems,
  characterLevel,
  characterId,
  wizardRitualFromBook = false,
  busy = false,
  allyDemo = null,
  abilities = null,
  proficiencyBonus = 2,
  castProfiles = null,
  modifiers = [],
  formulaVars = {},
  onSelectSpellVariant,
  onConfirm,
  onClose,
  onRequestRest,
  onRestorePact,
}: CastSpellDialogProps) {
  const isCantrip = spell != null && spell.level <= 0
  const spellLevel = spell?.level ?? 0
  const dualOptions = useMemo(
    () => (spell ? findDualCastSiblings(spells.known, spell) : []),
    [spell, spells.known],
  )
  const wizardRitualGate = useMemo(() => {
    if (!wizardRitualFromBook || !spell || isCantrip || !spell.ritual) {
      return { ok: true, message: '' }
    }
    return canCastWizardRitualFromBook({
      spell,
      book: spells.wizard_spellbook,
    })
  }, [wizardRitualFromBook, spell, isCantrip, spells.wizard_spellbook])
  const isRitual = Boolean(spell?.ritual && !isCantrip && wizardRitualGate.ok)
  const ritualBlockedReason =
    wizardRitualFromBook && spell?.ritual && !isCantrip && !wizardRitualGate.ok
      ? wizardRitualGate.message
      : null
  const grantOptions = useMemo(
    () => (spell && !isCantrip ? listCastGrantOptions(spell, spells.known) : []),
    [spell, isCantrip, spells.known],
  )
  const grantAvailable = grantOptions.filter((row) => row.remaining > 0)
  const slotLevels = spell && !isCantrip ? availableCastSlotLevels(spells.slots, spellLevel) : []
  const pactOk =
    spell != null && !isCantrip && canSpendPactSlot(spells.pact_slots, spellLevel)
  const hasSlotPath = pactOk || slotLevels.length > 0
  const [usePact, setUsePact] = useState(false)
  const [useRitual, setUseRitual] = useState(false)
  const [useGrant, setUseGrant] = useState(false)
  const [grantSpellId, setGrantSpellId] = useState<string | null>(null)
  const [slotLevel, setSlotLevel] = useState(1)
  const [consumeMaterial, setConsumeMaterial] = useState(true)
  const [selfFormTarget, setSelfFormTarget] = useState<'self' | 'other'>('self')
  const isTransformSelf = spell != null && isSpellSelfFormCast(spell)

  const appliesToAllies = Boolean(spell && castSpellAppliesToAllies(spell))
  /** Показываем блок целей всегда для ally-баффов: в лобби — select, иначе подсказка. */
  const showTargets = appliesToAllies
  const targetCount = Math.max(
    1,
    Math.min(6, spell ? castSpellAllyTargetCount(spell) : 1),
  )
  const [targetSlots, setTargetSlots] = useState<string[]>(() =>
    Array.from({ length: targetCount }, () => ''),
  )
  const party = useLobbyParty(showTargets ? characterId : undefined, allyDemo)

  const materialText = spell?.components?.m

  const materialCheck = useMemo(
    () =>
      checkSpellMaterials({
        material: materialText,
        flags: {
          has_spell_focus: Boolean(spells.has_spell_focus),
          has_component_pouch: Boolean(spells.has_component_pouch),
        },
        items: inventoryItems,
      }),
    [
      materialText,
      spells.has_spell_focus,
      spells.has_component_pouch,
      inventoryItems,
    ],
  )

  useEffect(() => {
    if (!open) return
    setConsumeMaterial(true)
    setTargetSlots(Array.from({ length: targetCount }, () => ''))
  }, [open, spell?.id, targetCount])

  useEffect(() => {
    if (!spell || isCantrip) {
      setUseRitual(false)
      setUseGrant(false)
      setGrantSpellId(null)
      setSelfFormTarget('self')
      return
    }
    setSelfFormTarget('self')
    // Prefer first available grant; else slots/pact; else ritual.
    if (grantAvailable.length > 0) {
      setUseGrant(true)
      setGrantSpellId(grantAvailable[0]!.spellId)
      setUseRitual(false)
      setUsePact(false)
      setSlotLevel(spellLevel)
      return
    }
    if (hasSlotPath) {
      setUseGrant(false)
      setGrantSpellId(null)
      setUseRitual(false)
      if (pactOk) {
        setUsePact(true)
        setSlotLevel(spells.pact_slots?.level ?? spellLevel)
      } else {
        setUsePact(false)
        setSlotLevel(slotLevels[0] ?? spellLevel)
      }
      return
    }
    setUseGrant(false)
    setGrantSpellId(null)
    setUsePact(false)
    setUseRitual(isRitual)
    setSlotLevel(spellLevel)
  }, [
    spell?.id,
    spellLevel,
    isCantrip,
    isRitual,
    grantAvailable.map((row) => `${row.spellId}:${row.remaining}`).join('|'),
    hasSlotPath,
    pactOk,
    slotLevels.join(','),
    spells.pact_slots?.level,
  ])

  const selectedGrant = useMemo(
    () => grantOptions.find((row) => row.spellId === grantSpellId) ?? null,
    [grantOptions, grantSpellId],
  )
  const grantOk = Boolean(useGrant && selectedGrant && selectedGrant.remaining > 0)

  const effectiveSlotLevel = useMemo(() => {
    if (!spell || isCantrip || useRitual || useGrant) return spell?.level ?? 0
    if (usePact && spells.pact_slots) return spells.pact_slots.level
    return slotLevel
  }, [spell, isCantrip, useRitual, useGrant, usePact, spells.pact_slots, slotLevel])

  const castEffect = useMemo(() => {
    if (!spell) return { effect: '', scaled: false, lines: [] as string[] }
    return resolveCastEffectSummary(spell, {
      characterLevel,
      slotLevel: effectiveSlotLevel || spell.level,
    })
  }, [spell, characterLevel, effectiveSlotLevel])

  const selectedIds = useMemo(
    () => targetSlots.filter((id) => id.trim().length > 0),
    [targetSlots],
  )
  const duplicateTarget = useMemo(() => {
    const seen = new Set<string>()
    for (const id of selectedIds) {
      if (seen.has(id)) return true
      seen.add(id)
    }
    return false
  }, [selectedIds])

  const castStats = useMemo(() => {
    if (!spell || !abilities) return null
    const resolved = resolveSpellCastStats({
      spell,
      profiles: castProfiles ?? [],
      abilityModFor: (ability: SpellcastingAbility) =>
        abilityModifier(abilities[ability]),
      proficiencyBonus,
      fallbackAbility: spells.casting_ability,
    })
    if (resolved.saveDc == null && resolved.attackBonus == null) return null
    const boosted = withSpellCastBonuses({
      baseDc: resolved.saveDc,
      baseAttack: resolved.attackBonus,
      modifiers,
      vars: formulaVars,
      classSlug: spell.class_slug ?? resolved.profile?.slug ?? null,
    })
    return {
      ...resolved,
      saveDc: boosted.dc,
      attackBonus: boosted.attack,
    }
  }, [
    spell,
    abilities,
    castProfiles,
    proficiencyBonus,
    spells.casting_ability,
    modifiers,
    formulaVars,
  ])

  if (!spell) {
    return null
  }

  const materialsOk = materialCheck.ok
  const needsConsumeChoice = Boolean(
    materialCheck.ok &&
      materialCheck.requirement &&
      materialCheck.requirement.minCostGp > 0 &&
      materialCheck.requirement.consumed &&
      materialCheck.cheapest,
  )

  const canCast =
    materialsOk &&
    (isCantrip ||
      grantOk ||
      (useRitual && isRitual) ||
      (!useGrant && !useRitual && hasSlotPath))
  /** Цели необязательны; блок только при дублях в слотах */
  const targetsOk = !showTargets || !duplicateTarget
  const selectedSlot =
    !usePact && !useRitual && !useGrant ? spells.slots[String(slotLevel)] : null
  const remaining = selectedSlot ? slotsRemaining(selectedSlot) : 0
  const pactRemaining = spells.pact_slots
    ? Math.max(0, spells.pact_slots.max - spells.pact_slots.used)
    : 0

  const metaParts = [
    spell.casting_time,
    spell.range,
    spell.duration ? `длится ${spell.duration}` : '',
    spell.components ? formatSpellComponents(spell.components) : '',
    spell.school ? spellSchoolLabelRu(spell.school) : '',
    spell.attack_or_save,
    castEffect.effect || spell.damage,
  ].filter(Boolean)

  const showHigherLevels =
    Boolean(spell.higher_levels) &&
    !isCantrip &&
    !useRitual &&
    !useGrant &&
    effectiveSlotLevel > spell.level

  const grantLabel = selectedGrant?.label ?? 'Грант'
  const activeRestLabel = isCantrip
    ? null
    : useGrant && selectedGrant
      ? castPathRestLabel({
          kind: 'grant',
          grantLabel: selectedGrant.label,
          reset: selectedGrant.reset,
        })
      : useRitual
        ? castPathRestLabel({ kind: 'ritual' })
        : usePact && spells.pact_slots
          ? castPathRestLabel({
              kind: 'pact',
              level: spells.pact_slots.level,
            })
          : hasSlotPath
            ? castPathRestLabel({ kind: 'slot', level: slotLevel })
            : null

  const primaryLabel = !materialsOk
    ? 'Нет компонента'
    : !canCast
      ? 'Нет ячеек'
      : busy
        ? 'Кастуем…'
        : useGrant
          ? `Каст (${grantLabel})`
          : useRitual
            ? 'Ритуал'
            : 'Каст'

  function clearGrant() {
    setUseGrant(false)
    setGrantSpellId(null)
  }

  return (
    <Dialog
      open={open}
      title={isCantrip ? 'Использовать заговор?' : 'Кастовать заклинание?'}
      primaryLabel={primaryLabel}
      secondaryLabel="Отмена"
      size={showTargets ? 'wide' : undefined}
      onPrimary={() => {
        if (!canCast || busy || !targetsOk) return
        onConfirm({
          useGrant: !isCantrip && grantOk,
          grantSpellId: !isCantrip && grantOk ? grantSpellId : null,
          ritual: !isCantrip && !useGrant && useRitual && isRitual,
          usePact: !isCantrip && !useGrant && !useRitual && usePact && pactOk,
          slotLevel:
            isCantrip || useRitual || useGrant
              ? spellLevel
              : usePact
                ? (spells.pact_slots?.level ?? spellLevel)
                : slotLevel,
          consumeMaterial: needsConsumeChoice ? consumeMaterial : false,
          consumeItemId:
            needsConsumeChoice && consumeMaterial
              ? materialCheck.cheapest?.item.id ?? null
              : null,
          selfFormTarget: isTransformSelf ? selfFormTarget : undefined,
          allyTargetIds: showTargets ? selectedIds : [],
          lobbyId: showTargets ? party.lobbyId : null,
        })
      }}
      onSecondary={onClose}
      busy={busy}
      primaryDisabled={!canCast || busy || !targetsOk}
    >
      <Stack gap={10}>
        <Text>
          <strong>{spell.name || 'Без названия'}</strong>
          {' · '}
          {levelLabel(spell.level)}
          {spell.ritual ? ' · ритуал' : ''}
          {spell.concentration ? ' · концентрация' : ''}
          {appliesToAllies ? ` · до ${targetCount} цел.` : ''}
          {spell.source_book ? ` · ${spell.source_book}` : ''}
        </Text>
        {dualOptions.length > 1 && onSelectSpellVariant ? (
          <div>
            <Text tone="muted">Как кастуем (класс-источник)</Text>
            <div className="chip-row cast-source-row" style={{ marginTop: 8 }}>
              {dualOptions.map((row) => {
                const selected = row.id === spell.id
                const label = dualSourceLabel(row, castProfiles ?? [])
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={`sheet-chip cast-source-chip${selected ? ' is-on' : ''}`}
                    title={`Каст как ${label}`}
                    onClick={() => onSelectSpellVariant(row)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
        {castStats && (castStats.saveDc != null || castStats.attackBonus != null) ? (
          <div
            className="cast-stats-banner"
            aria-label="Сл. спас. и атака для этого заклинания"
          >
            <Text>
              {castStats.sourceLabel}
              {castStats.saveDc != null ? (
                <>
                  {' · '}Сл <strong>{castStats.saveDc}</strong>
                </>
              ) : null}
              {castStats.attackBonus != null ? (
                <>
                  {' · '}Атака{' '}
                  <strong>{formatModifier(castStats.attackBonus)}</strong>
                </>
              ) : null}
            </Text>
          </div>
        ) : null}
        {metaParts.length > 0 ? <Text tone="muted">{metaParts.join(' · ')}</Text> : null}
        {castEffect.lines.length > 0 || castEffect.effect ? (
          <div className="cast-effect-summary" aria-label="Итог эффекта для выбранной ячейки">
            <Text>
              Эффект сейчас
              {isCantrip
                ? ` (ур. персонажа ${Math.max(1, characterLevel)})`
                : !useRitual && !useGrant
                  ? ` (ячейка ${Math.max(spell.level, effectiveSlotLevel)} · база ${spell.level})`
                  : ''}
              :
            </Text>
            {castEffect.lines.length > 0 ? (
              <ul className="cast-effect-summary__list">
                {castEffect.lines.map((line) => (
                  <li key={line}>
                    <strong>{line}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <Text>
                <strong>{castEffect.effect}</strong>
              </Text>
            )}
          </div>
        ) : null}
        {showHigherLevels && castEffect.lines.length === 0 ? (
          <Text tone="muted">На больших уровнях: {spell.higher_levels}</Text>
        ) : null}

        {materialCheck.requirement ? (
          <div className="cast-material-box">
            <Text tone={materialsOk ? 'muted' : 'danger'}>{materialCheck.message}</Text>
            {materialCheck.requirement.raw ? (
              <Text tone="muted">М: {materialCheck.requirement.raw}</Text>
            ) : null}
            {needsConsumeChoice ? (
              <button
                type="button"
                className={`sheet-chip${consumeMaterial ? ' is-on' : ''}`}
                onClick={() => setConsumeMaterial((prev) => !prev)}
              >
                {consumeMaterial
                  ? `Списать «${materialCheck.cheapest?.item.name}»`
                  : 'Не списывать (тест)'}
              </button>
            ) : null}
          </div>
        ) : null}

        {isCantrip ? (
          <Text tone="muted">Заговоры не тратят ячейки.</Text>
        ) : (
          <>
            <div>
              <Text tone="muted">За счёт чего кастуем</Text>
              <div className="chip-row cast-source-row" style={{ marginTop: 8 }}>
                {slotLevels.map((level) => {
                  const rest = castPathRestLabel({ kind: 'slot', level })
                  return (
                    <button
                      key={level}
                      type="button"
                      className={`sheet-chip cast-source-chip${
                        !useRitual && !useGrant && !usePact && slotLevel === level
                          ? ' is-on'
                          : ''
                      }`}
                      title={rest}
                      onClick={() => {
                        setUseRitual(false)
                        clearGrant()
                        setUsePact(false)
                        setSlotLevel(level)
                      }}
                    >
                      <span className="cast-source-chip__main">
                        Обычная {level}
                        {level > spellLevel ? ' ↑' : ''}
                      </span>
                      <span className="cast-source-chip__rest">долгий отдых</span>
                    </button>
                  )
                })}
                {pactOk && spells.pact_slots ? (
                  <button
                    type="button"
                    className={`sheet-chip cast-source-chip${
                      !useRitual && !useGrant && usePact ? ' is-on' : ''
                    }`}
                    title={castPathRestLabel({
                      kind: 'pact',
                      level: spells.pact_slots.level,
                    })}
                    onClick={() => {
                      setUseRitual(false)
                      clearGrant()
                      setUsePact(true)
                      setSlotLevel(spells.pact_slots?.level ?? spellLevel)
                    }}
                  >
                    <span className="cast-source-chip__main">
                      Договор {spells.pact_slots.level}
                    </span>
                    <span className="cast-source-chip__rest">короткий отдых</span>
                  </button>
                ) : null}
                {grantOptions.map((option) => {
                  const exhausted = option.remaining <= 0
                  const selected = useGrant && grantSpellId === option.spellId
                  const rest = castPathRestLabel({
                    kind: 'grant',
                    grantLabel: option.label,
                    reset: option.reset,
                  })
                  return (
                    <button
                      key={option.spellId}
                      type="button"
                      className={`sheet-chip cast-source-chip${selected ? ' is-on' : ''}${
                        exhausted ? ' is-disabled' : ''
                      }`}
                      disabled={exhausted}
                      title={
                        exhausted
                          ? `${option.label}: заряд исчерпан до отдыха`
                          : rest
                      }
                      onClick={() => {
                        if (exhausted) return
                        setUseGrant(true)
                        setGrantSpellId(option.spellId)
                        setUseRitual(false)
                        setUsePact(false)
                      }}
                    >
                      <span className="cast-source-chip__main">
                        {option.label} {option.remaining}/{option.max}
                      </span>
                      <span className="cast-source-chip__rest">
                        {option.reset === 'short' ? 'короткий отдых' : 'длинный отдых'}
                      </span>
                    </button>
                  )
                })}
                {isRitual ? (
                  <button
                    type="button"
                    className={`sheet-chip cast-source-chip${useRitual ? ' is-on' : ''}`}
                    title={castPathRestLabel({ kind: 'ritual' })}
                    onClick={() => {
                      setUseRitual(true)
                      clearGrant()
                      setUsePact(false)
                    }}
                  >
                    <span className="cast-source-chip__main">Ритуал</span>
                    <span className="cast-source-chip__rest">без ячейки</span>
                  </button>
                ) : ritualBlockedReason ? (
                  <button
                    type="button"
                    className="sheet-chip cast-source-chip is-disabled"
                    disabled
                    title={ritualBlockedReason}
                  >
                    Ритуал (книга)
                  </button>
                ) : null}
              </div>
              {ritualBlockedReason ? (
                <Text tone="muted">{ritualBlockedReason}</Text>
              ) : null}
            </div>
            {activeRestLabel ? (
              <Text tone="muted">
                <strong>{activeRestLabel}</strong>
                {useGrant && selectedGrant
                  ? `. Останется ${selectedGrant.remaining - 1} из ${selectedGrant.max}.`
                  : useRitual
                    ? '. +10 минут к времени каста по PHB. Upcast недоступен.'
                    : usePact && spells.pact_slots
                      ? `. Останется ${pactRemaining - 1} из ${spells.pact_slots.max}.`
                      : hasSlotPath
                        ? `. Останется ${remaining - 1} из ${selectedSlot?.max ?? 0}${
                            slotLevel > spellLevel ? ' (upcast)' : ''
                          }.`
                        : '.'}
              </Text>
            ) : hasSlotPath || useGrant || useRitual ? null : (
              <Stack gap={8}>
                <Text tone="danger">
                  Нет свободных ячеек {spell.level}-го уровня или выше
                  {spells.pact_slots ? ' и подходящей ячейки договора' : ''}. Верни пипс или
                  сделай отдых
                  {isRitual || grantOptions.some((row) => row.remaining <= 0)
                    ? `, либо ${
                        grantOptions.some((row) => row.remaining <= 0)
                          ? 'восстанови заряд умения/предмета'
                          : 'выбери ритуал'
                      }`
                    : ''}
                  .
                </Text>
                {onRequestRest ||
                (onRestorePact &&
                  spells.pact_slots &&
                  spells.pact_slots.max > 0 &&
                  spells.pact_slots.used > 0) ? (
                  <div className="cast-recovery" role="group" aria-label="Восстановить ресурс">
                    {onRequestRest ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={onRequestRest}
                      >
                        Отдых…
                      </Button>
                    ) : null}
                    {onRestorePact &&
                    spells.pact_slots &&
                    spells.pact_slots.max > 0 &&
                    spells.pact_slots.used > 0 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={onRestorePact}
                      >
                        Сброс ячеек договора
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </Stack>
            )}
          </>
        )}

        {spell.concentration && !useRitual ? (
          <Text tone="muted">
            Это концентрация — станет активной на листе (предыдущая снимется).
          </Text>
        ) : null}

        {isTransformSelf ? (
          <div>
            <Text tone="muted">Цель превращения (v1)</Text>
            <div className="chip-row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className={`sheet-chip${selfFormTarget === 'self' ? ' is-on' : ''}`}
                onClick={() => setSelfFormTarget('self')}
              >
                На себя → облик
              </button>
              <button
                type="button"
                className={`sheet-chip${selfFormTarget === 'other' ? ' is-on' : ''}`}
                onClick={() => setSelfFormTarget('other')}
              >
                Другая цель (без карточки)
              </button>
            </div>
            <Text tone="muted">
              «На себя» после каста откроет пикер формы в Напарниках. На союзника/врага в
              v1 карточку не создаём.
            </Text>
          </div>
        ) : null}

        {showTargets ? (
          <>
            <AllyTargetFields
              count={targetCount}
              values={targetSlots}
              onChange={(index, nextId) => {
                setTargetSlots((prev) => {
                  const next = [...prev]
                  next[index] = nextId
                  return next
                })
              }}
              options={party.options}
              loading={party.loading}
              busy={busy}
              lobbyName={party.lobbyName}
              lobbies={party.lobbies}
              lobbyId={party.lobbyId}
              onLobbyIdChange={party.setLobbyId}
            />
            {duplicateTarget ? (
              <Text tone="danger">Одна и та же цель в двух слотах — выберите разных.</Text>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Dialog>
  )
}
