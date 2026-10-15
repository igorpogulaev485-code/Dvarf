import { useEffect, useMemo, useRef, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  applySpellcastingSuggestion,
  resolveSpellLearnBudget,
  suggestSpellcasting,
  warlockLevels,
  warlockPactForLevel,
  type SubclassCasterOverlay,
} from '../../shared/dnd/casterProgression'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { setConcentration } from '../../shared/dnd/concentration'
import {
  SPELLCASTING_ABILITIES,
  SPELLCASTING_ABILITY_LABELS,
  canCastLeveledSpell,
  clampPactSlots,
  levelLabel,
  spendPactSlot,
  spendSpellSlot,
  spellAttackBonus,
  spellSaveDc,
  type SpellcastingAbility,
} from '../../shared/dnd/spells'
import { Button, Dialog, Field, Input, NumberInput, Panel, SlotPips, Stack, Text } from '../../ui'
import { abilityModifier, formatModifier, type AbilityKey } from './sheetTypes'
import { CastSpellDialog, type CastChoice } from './CastSpellDialog'
import {
  formatSpellComponents,
  resolveCastEffect,
  spellSchoolLabelRu,
} from '../../shared/dnd/spellCatalog'
import { GrimoireDialog } from './GrimoireDialog'
import { PrepareSpellsDialog } from './PrepareSpellsDialog'
import { SpellbookManageDialog } from './SpellbookManageDialog'
import { canCastWizardRitualFromBook } from '../../shared/dnd/wizardSpellbook'
import { wizardSpellbookStatusLabel } from './wizardSpellbookInventory'
import { resolveSubclassFeatureSlug } from '../../shared/dnd/classFeatures'
import {
  IconCast,
  IconConcentration,
  IconFocus,
  IconPouch,
  IconRitual,
  IconSpellBook,
  IconWizardHat,
} from './spellIcons'
import type { ConcentrationState } from './play'
import {
  canRemoveSheetSpell,
  canSpendGrantCast,
  countLearnedCantrips,
  countPreparedLeveled,
  ensureInnateGrantCasts,
  ensureKnownSpellsReady,
  grantCastRemaining,
  isGrantedSpellHighlight,
  isKnownSpellcastingMode,
  groupSpellsByLevel,
  isAvailableToCast,
  preparedLockChip,
  readCatalogSpellFields,
  setSpellPrepared,
  spellSourceBadge,
  spendGrantCast,
  type SheetSpell,
  type SpellsState,
} from './spells'
import type { FormulaVars } from '../../shared/dnd/formulas'
import type { InventoryItem, InventoryState } from './inventory'
import { type BonusLine, withSpellCastBonuses } from './modifiers'
import { consumeMaterialItem } from './spellMaterials'

type SpellsPanelProps = {
  edition: RulesEdition
  className: string
  level: number
  classes?: ClassLevelEntry[]
  /** EK / Arcane Trickster etc. — unlocks ⅓ caster slot math. */
  subclassCasters?: SubclassCasterOverlay[]
  spells: SpellsState
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  modifiers?: BonusLine[]
  formulaVars?: FormulaVars
  inventoryItems: InventoryItem[]
  onChange: (spells: SpellsState) => void
  onInventoryChange?: (inventory: InventoryState) => void
  inventory?: InventoryState
  concentration?: ConcentrationState | null
  onConcentrationChange?: (concentration: ConcentrationState | null) => void
  onToast?: (message: string) => void
  /** Open cast dialog for this spell id once (from play-desk compact). */
  initialCastSpellId?: string | null
  onInitialCastConsumed?: () => void
}

export function SpellsPanel({
  edition,
  className,
  level,
  classes,
  subclassCasters,
  spells,
  abilities,
  proficiencyBonus,
  modifiers = [],
  formulaVars = {},
  inventoryItems,
  inventory,
  concentration = null,
  onChange,
  onInventoryChange,
  onConcentrationChange,
  onToast,
  initialCastSpellId = null,
  onInitialCastConsumed,
}: SpellsPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [grimoireOpen, setGrimoireOpen] = useState(false)
  const [bookManageOpen, setBookManageOpen] = useState(false)
  const [castSpell, setCastSpell] = useState<SheetSpell | null>(null)
  const [pendingConc, setPendingConc] = useState<{
    spell: SheetSpell
    choice: CastChoice
  } | null>(null)
  const [filter, setFilter] = useState<'all' | number>('all')
  const [showAllKnown, setShowAllKnown] = useState(false)

  useEffect(() => {
    if (!initialCastSpellId) return
    const spell = spells.known.find((row) => row.id === initialCastSpellId) ?? null
    if (spell) setCastSpell(spell)
    onInitialCastConsumed?.()
  }, [initialCastSpellId, spells.known, onInitialCastConsumed])

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
  const preparedCount = countPreparedLeveled(spells.known)

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

  const learnBudget = useMemo(() => {
    const rows = classes?.filter((row) => row.name.trim() && row.level > 0) ?? []
    if (rows.length === 0) return null
    return resolveSpellLearnBudget({
      classes: rows,
      subclassCasters,
      abilityModFor: (ability) => abilityModifier(abilities[ability]),
    })
  }, [classes, subclassCasters, abilities])

  const combatPool = useMemo(() => {
    if (showAllKnown) return spells.known
    const hasSpellbook =
      learnBudget?.mode === 'spellbook' &&
      Boolean(
        spells.wizard_spellbook &&
          !spells.wizard_spellbook.bookLost &&
          spells.wizard_spellbook.primaryBookItemId,
      )
    return spells.known.filter((spell) =>
      isAvailableToCast(spell, {
        learnMode: learnBudget?.mode ?? null,
        hasSpellbook,
      }),
    )
  }, [showAllKnown, spells.known, spells.wizard_spellbook, learnBudget?.mode])

  const filterOptions = useMemo(() => {
    const levels = new Set<number>([0])
    for (const spell of combatPool) levels.add(spell.level)
    for (let level = 1; level <= 9; level += 1) {
      if ((spells.slots[String(level)]?.max ?? 0) > 0) levels.add(level)
    }
    return [...levels].sort((a, b) => a - b)
  }, [combatPool, spells.slots])

  const visibleSpells = useMemo(() => {
    const list =
      filter === 'all' ? combatPool : combatPool.filter((spell) => spell.level === filter)
    const grouped = groupSpellsByLevel(list)
    const byLevel = new Map(grouped.map((group) => [group.level, group]))
    const ensureLevel = (level: number) => {
      if (!byLevel.has(level)) byLevel.set(level, { level, spells: [] })
    }
    if (filter === 'all') {
      for (let level = 1; level <= 9; level += 1) {
        if ((spells.slots[String(level)]?.max ?? 0) > 0) ensureLevel(level)
      }
      if (list.some((spell) => spell.level === 0) || byLevel.has(0)) ensureLevel(0)
    } else if (typeof filter === 'number') {
      ensureLevel(filter)
    }
    return [...byLevel.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, group]) => group)
  }, [filter, combatPool, spells.slots])

  const knownCaster = isKnownSpellcastingMode({
    maxPrepared: spells.max_prepared,
    hasCasterSuggestion: suggestion != null && suggestion.progression !== 'none',
  })

  useEffect(() => {
    if (!knownCaster) return
    const next = ensureKnownSpellsReady(spells.known)
    if (next === spells.known) return
    onChange({ ...spells, known: next })
    // Keep known-list spells combat-ready when class has no prepare budget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownCaster, spells.known.map((s) => `${s.id}:${s.prepared}`).join('|')])

  useEffect(() => {
    const next = ensureInnateGrantCasts(spells.known, proficiencyBonus)
    if (next === spells.known) return
    onChange({ ...spells, known: next })
    // Backfill grant_cast on innate race/feat spells (PB / notes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    proficiencyBonus,
    spells.known
      .map((s) => `${s.id}:${s.race_grant ?? ''}:${s.feat_grant ?? ''}:${s.notes}:${s.grant_cast?.max ?? ''}`)
      .join('|'),
  ])

  function patch(next: Partial<SpellsState>) {
    onChange({ ...spells, ...next })
  }

  function applyFromClass() {
    if (!suggestion) {
      onToast?.('Класс не в таблице 2014 — ячейки задай вручную')
      return
    }
    onChange({ ...spells, ...applySpellcastingSuggestion(spells, suggestion) })
    const prep =
      suggestion.max_prepared == null
        ? suggestion.progression === 'none'
          ? ''
          : ' · без лимита подготовки'
        : ` · подготовка ${suggestion.max_prepared}`
    onToast?.(`${suggestion.labelRu}: ячейки 2014${prep}`)
  }

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
    if (appliedClassLevel.current == null) {
      appliedClassLevel.current = classLevelKey
      return
    }
    if (appliedClassLevel.current === classLevelKey) return
    appliedClassLevel.current = classLevelKey
    if (!suggestion) return
    onChange({ ...spells, ...applySpellcastingSuggestion(spells, suggestion) })
    onToast?.(`${suggestion.labelRu}: ячейки обновлены по таблице 2014`)
    // Apply once per class/level/subclass-caster change; skip first paint for saved sheets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classLevelKey])

  const prepareKey =
    suggestion?.max_prepared == null ? '' : `${suggestion.slug}:${suggestion.max_prepared}`
  const appliedPrepare = useRef<string | null>(null)
  useEffect(() => {
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
  }, [prepareKey])

  function updateSpell(id: string, next: Partial<SheetSpell>) {
    patch({
      known: spells.known.map((spell) => {
        if (spell.id !== id) return spell
        const merged = { ...spell, ...next }
        if (merged.level <= 0) merged.prepared = true
        return merged
      }),
    })
  }

  function setSlotMax(level: number, max: number) {
    const key = String(level)
    const current = spells.slots[key] ?? { max: 0, used: 0 }
    const nextMax = Math.max(0, max)
    patch({
      slots: {
        ...spells.slots,
        [key]: { max: nextMax, used: Math.min(nextMax, current.used) },
      },
    })
  }

  function setSlotUsed(level: number, used: number) {
    const key = String(level)
    const current = spells.slots[key] ?? { max: 0, used: 0 }
    patch({
      slots: {
        ...spells.slots,
        [key]: { max: current.max, used: Math.min(current.max, Math.max(0, used)) },
      },
    })
  }

  function applyCatalog(id: string, value: string, selected: CatalogEntry | null) {
    if (!selected) {
      updateSpell(id, { name: value, catalog_id: null })
      return
    }
    updateSpell(id, {
      name: selected.name_ru,
      catalog_id: selected.id,
      ...readCatalogSpellFields(selected.data ?? {}),
    })
  }

  function setCastingAbility(next: SpellcastingAbility) {
    patch({
      casting_ability: spells.casting_ability === next ? null : next,
    })
  }

  function commitConcentration(spell: SheetSpell) {
    onConcentrationChange?.(
      setConcentration({
        spellId: spell.id,
        name: spell.name || 'Заклинание',
      }),
    )
  }

  function applyConcentrationIfNeeded(spell: SheetSpell) {
    if (!spell.concentration) return
    commitConcentration(spell)
  }

  function needsConcentrationSwap(spell: SheetSpell): boolean {
    if (!spell.concentration || !concentration) return false
    return (
      concentration.spell_id !== spell.id &&
      concentration.name.trim() !== (spell.name || '').trim()
    )
  }

  function applyMaterialConsume(choice: CastChoice): string {
    if (!choice.consumeMaterial || !choice.consumeItemId || !inventory || !onInventoryChange) {
      return ''
    }
    const target = inventory.items.find((row) => row.id === choice.consumeItemId)
    if (!target) return ''
    onInventoryChange({
      ...inventory,
      items: consumeMaterialItem(inventory.items, choice.consumeItemId, 1),
    })
    return ` · −1 «${target.name}»`
  }

  function confirmCast(choice: CastChoice) {
    if (!castSpell) return
    if (needsConcentrationSwap(castSpell)) {
      setPendingConc({ spell: castSpell, choice })
      setCastSpell(null)
      return
    }
    runCast(castSpell, choice)
  }

  function runCast(castSpell: SheetSpell, choice: CastChoice) {
    const name = castSpell.name || 'Заклинание'
    const ritualCast = Boolean(choice.ritual && castSpell.ritual && castSpell.level > 0)
    const grantSpellId = choice.grantSpellId || castSpell.id
    const grantRow =
      choice.useGrant
        ? spells.known.find((row) => row.id === grantSpellId) ?? castSpell
        : null
    const grantCast = Boolean(grantRow && canSpendGrantCast(grantRow))
    const slotForEffect =
      castSpell.level <= 0 || ritualCast || grantCast
        ? castSpell.level
        : choice.usePact
          ? (spells.pact_slots?.level ?? castSpell.level)
          : choice.slotLevel
    const { effect, scaled } = resolveCastEffect(castSpell, {
      characterLevel: level,
      slotLevel: slotForEffect || castSpell.level,
    })
    const effectNote = scaled && effect ? ` · ${effect}` : ''
    const consumeNote = applyMaterialConsume(choice)

    if (castSpell.level <= 0) {
      applyConcentrationIfNeeded(castSpell)
      onToast?.(
        castSpell.concentration
          ? `Каст: ${name}${effectNote}${consumeNote} (концентрация)`
          : `Каст: ${name}${effectNote}${consumeNote}`,
      )
      setCastSpell(null)
      return
    }
    if (grantCast && grantRow) {
      const label = grantRow.grant_cast?.label ?? 'Грант'
      onChange({
        ...spells,
        known: spendGrantCast(spells.known, grantRow.id),
      })
      applyConcentrationIfNeeded(castSpell)
      onToast?.(
        `Каст: ${name} (−1 ${label})${effectNote}${consumeNote}${
          castSpell.concentration ? ' · концентрация' : ''
        }`,
      )
      setCastSpell(null)
      return
    }
    if (ritualCast) {
      if (learnBudget?.mode === 'spellbook') {
        const gate = canCastWizardRitualFromBook({
          spell: castSpell,
          book: spells.wizard_spellbook,
        })
        if (!gate.ok) {
          onToast?.(gate.message)
          return
        }
      }
      applyConcentrationIfNeeded(castSpell)
      onToast?.(
        `Ритуал: ${name} (без ячейки)${effectNote}${consumeNote}${
          castSpell.concentration ? ' · концентрация' : ''
        }`,
      )
      setCastSpell(null)
      return
    }
    if (choice.usePact && spells.pact_slots) {
      const pactResult = spendPactSlot(spells.pact_slots)
      if (!pactResult.ok) {
        onToast?.('Нет свободных ячеек договора')
        return
      }
      patch({ pact_slots: pactResult.pact })
      applyConcentrationIfNeeded(castSpell)
      onToast?.(
        `Каст: ${name} (−1 договор ${pactResult.pact.level} ур.)${effectNote}${consumeNote}${
          castSpell.concentration ? ' · концентрация' : ''
        }`,
      )
      setCastSpell(null)
      return
    }
    const result = spendSpellSlot(spells.slots, choice.slotLevel)
    if (!result.ok) {
      onToast?.(`Нет ячеек ${choice.slotLevel}-го уровня`)
      return
    }
    patch({ slots: result.slots })
    applyConcentrationIfNeeded(castSpell)
    const upcast =
      choice.slotLevel > castSpell.level ? ` · upcast ${choice.slotLevel}` : ''
    onToast?.(
      `Каст: ${name} (−1 ячейка ${choice.slotLevel} ур.)${upcast}${effectNote}${consumeNote}${
        castSpell.concentration ? ' · концентрация' : ''
      }`,
    )
    setCastSpell(null)
  }

  const warlockLvl = useMemo(() => {
    const rows =
      classes?.filter((row) => row.name.trim() && row.level > 0) ??
      (className.trim()
        ? [
            {
              id: 'primary',
              name: className,
              catalog_id: null,
              level,
              subclass_name: '',
              subclass_catalog_id: null,
            },
          ]
        : [])
    return warlockLevels(rows)
  }, [classes, className, level])

  const tablePact = useMemo(() => {
    if (suggestion?.pact_slots) return suggestion.pact_slots
    if (warlockLvl > 0) return warlockPactForLevel(warlockLvl)
    return null
  }, [suggestion, warlockLvl])

  useEffect(() => {
    if (!spells.pact_slots || !tablePact) return
    if (spells.pact_slots.level === tablePact.level) return
    onChange({
      ...spells,
      pact_slots: clampPactSlots({
        ...spells.pact_slots,
        level: tablePact.level,
      }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablePact?.level, spells.pact_slots?.level])

  function enablePact() {
    const fromTable = tablePact ?? warlockPactForLevel(Math.max(1, warlockLvl))
    patch({
      pact_slots: clampPactSlots({
        max: fromTable.max,
        used: 0,
        level: fromTable.level,
      }),
    })
  }

  function disablePact() {
    patch({ pact_slots: null })
  }

  function patchPact(partial: { max?: number; used?: number; level?: number }) {
    if (!spells.pact_slots) return
    const levelAuto = tablePact?.level ?? partial.level ?? spells.pact_slots.level
    patch({
      pact_slots: clampPactSlots({
        ...spells.pact_slots,
        ...partial,
        level: levelAuto,
      }),
    })
  }

  const prepareLimitLabel =
    spells.max_prepared == null ? String(preparedCount) : `${preparedCount}/${spells.max_prepared}`

  return (
    <Panel title="Заклинания">
      <Stack gap={14}>
        <Text tone="muted">
          {knownCaster
            ? 'Известные заклинания всегда доступны для каста. Каст тратит ячейку или ячейку договора. Новые — из гримуара.'
            : 'Боевой список = заговоры + подготовленные. Каст тратит ячейку. Новые — из гримуара, затем подготовь.'}
        </Text>

        <div className="spells-summary">
          <div className="spells-summary__stat spells-summary__stat--key">
            <span className="spells-summary__label">Сл. спас.</span>
            <strong>{dc == null ? '—' : dc}</strong>
          </div>
          <div className="spells-summary__stat spells-summary__stat--key">
            <span className="spells-summary__label">Атака закл.</span>
            <strong>{attack == null ? '—' : formatModifier(attack)}</strong>
          </div>
          <div className="spells-summary__stat">
            <span className="spells-summary__label">
              {knownCaster ? 'Известно' : 'Подготовлено'}
            </span>
            <strong>
              {knownCaster
                ? (() => {
                    const n = spells.known.filter((s) => s.level > 0).length
                    const cap = learnBudget?.leveledKnown
                    return cap != null ? `${n}/${cap}` : String(n)
                  })()
                : prepareLimitLabel}
            </strong>
          </div>
          {learnBudget?.cantrips != null ? (
            <div className="spells-summary__stat">
              <span className="spells-summary__label">Заговоры</span>
              <strong>
                {countLearnedCantrips(spells.known)}/{learnBudget.cantrips}
              </strong>
            </div>
          ) : null}
        </div>

        <div className="chip-row spells-focus-chips">
          <span
            className={`sheet-chip spells-focus-chips__chip${
              spells.has_spell_focus ? ' is-on' : ''
            }`}
            title="Магический / друидический фокус в инвентаре"
          >
            <IconFocus className="spells-btn-icon" />
            {spells.has_spell_focus ? 'Фокус ✓' : 'Фокус ✗'}
          </span>
          <span
            className={`sheet-chip spells-focus-chips__chip${
              spells.has_component_pouch ? ' is-on' : ''
            }`}
            title="Мешочек с компонентами в инвентаре"
          >
            <IconPouch className="spells-btn-icon" />
            {spells.has_component_pouch ? 'Мешочек ✓' : 'Мешочек ✗'}
          </span>
          {learnBudget?.mode === 'spellbook' ? (
            <button
              type="button"
              className={`sheet-chip spells-focus-chips__chip${
                wizardSpellbookStatusLabel(spells).ok ? ' is-on' : ''
              }`}
              title="Управление книгой заклинаний"
              onClick={() => setBookManageOpen(true)}
            >
              <IconSpellBook className="spells-btn-icon" />
              {wizardSpellbookStatusLabel(spells).label}
            </button>
          ) : null}
          <Text tone="muted">
            Ищем в инвентаре тип «Фокус» / «Мешочек» (имя может быть любым). М с ценой — отдельный
            предмет.
          </Text>
        </div>

        <div className="spells-panel__toolbar">
          <Button variant="secondary" onClick={() => setSettingsOpen((open) => !open)}>
            {settingsOpen ? 'Скрыть настройки' : 'Настройки'}
          </Button>
          {!knownCaster ? (
            <Button
              variant="secondary"
              onClick={() => setPrepareOpen(true)}
              title="Выбрать заклинания на сегодня (лимит подготовки класса)"
            >
              <IconWizardHat className="spells-btn-icon" />
              Подготовить
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setGrimoireOpen(true)}>
            <IconSpellBook className="spells-btn-icon" />
            Гримуар
          </Button>
        </div>

        {settingsOpen ? (
          <div className="spells-settings">
            <Stack gap={12}>
              <div>
                <Text>Характеристика заклинаний</Text>
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {SPELLCASTING_ABILITIES.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`sheet-chip${spells.casting_ability === key ? ' is-on' : ''}`}
                      onClick={() => setCastingAbility(key)}
                    >
                      {SPELLCASTING_ABILITY_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
              <Field
                label="Лимит подготовки"
                hint={
                  suggestion?.max_prepared != null
                    ? `Таблица 2014: ${suggestion.max_prepared} (${suggestion.labelRu})`
                    : suggestion
                      ? 'У этого класса нет лимита подготовки (известные заклинания)'
                      : 'Пусто = без лимита. Подставь таблицу от класса или задай вручную.'
                }
              >
                <NumberInput
                  min={0}
                  max={50}
                  emptyValue={null}
                  value={spells.max_prepared}
                  onValueChange={(max_prepared) => patch({ max_prepared })}
                />
              </Field>
              <div>
                <div className="play-resources-head">
                  <Text>Количество ячеек</Text>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={applyFromClass}
                    disabled={!suggestion}
                    title="Подставить макс. ячеек, договор и лимит подготовки по таблице PHB 2014. Потраченные ячейки не сбрасываются."
                  >
                    По таблице
                  </Button>
                </div>
                {suggestion ? (
                  <Text tone="muted">
                    «По таблице» → {suggestion.labelRu}
                    {suggestion.progression === 'pact'
                      ? ` · договор ${suggestion.pact_slots?.level ?? '—'} / ${suggestion.pact_slots?.max ?? 0}`
                      : suggestion.progression === 'none'
                        ? ' · не заклинатель'
                        : ' · слоты PHB 2014'}
                    . При смене класса/уровня подставляется само; spent не сбрасываем.
                  </Text>
                ) : (
                  <Text tone="muted">
                    Класс не распознан — оставь числа вручную. Известные: жрец, волшебник, паладин,
                    колдун…
                  </Text>
                )}
                <div className="sheet-grid sheet-grid--slots">
                  {Array.from({ length: 9 }, (_, index) => {
                    const level = index + 1
                    const key = String(level)
                    return (
                      <Field key={key} label={`${level}`}>
                        <NumberInput
                          min={0}
                          max={20}
                          emptyValue={0}
                          value={spells.slots[key]?.max ?? 0}
                          onValueChange={(max) => setSlotMax(level, max ?? 0)}
                          aria-label={`Ячейки ${level}-го круга`}
                        />
                      </Field>
                    )
                  })}
                </div>
              </div>
              <div className="pact-settings">
                <div className="play-resources-head">
                  <Text>Магия договора (колдун)</Text>
                  {spells.pact_slots ? (
                    <button type="button" className="linkish" onClick={disablePact}>
                      Выключить
                    </button>
                  ) : (
                    <Button type="button" variant="secondary" onClick={enablePact}>
                      Включить
                    </Button>
                  )}
                </div>
                {spells.pact_slots ? (
                  <div className="spells-settings__pact-row">
                    <div
                      className="spells-settings__pact-level"
                      title="Уровень ячеек договора по таблице колдуна (PHB 2014)"
                    >
                      <span className="spells-settings__pact-level-label">Ур. ячеек</span>
                      <strong>{tablePact?.level ?? spells.pact_slots.level}</strong>
                      <span className="spells-settings__pact-level-auto">авто</span>
                    </div>
                    <Field
                      label="Макс."
                      hint={tablePact != null ? `табл. ${tablePact.max}` : undefined}
                    >
                      <NumberInput
                        min={0}
                        max={10}
                        emptyValue={0}
                        value={spells.pact_slots.max}
                        onValueChange={(max) => patchPact({ max: max ?? 0 })}
                      />
                    </Field>
                  </div>
                ) : (
                  <Text tone="muted">
                    Уровень ячеек — по уровню колдуна. Каст договора, если круг ≤ этого уровня.
                  </Text>
                )}
              </div>
            </Stack>
          </div>
        ) : null}

        {spells.pact_slots && spells.pact_slots.max > 0 ? (
          <div className="pact-pips">
            <SlotPips
              max={spells.pact_slots.max}
              used={spells.pact_slots.used}
              label={`Договор ${spells.pact_slots.level}-го уровня`}
              onChange={(used) => patchPact({ used })}
            />
          </div>
        ) : null}

        <div className="chip-row">
          <button
            type="button"
            className={`sheet-chip${!showAllKnown ? ' is-on' : ''}`}
            onClick={() => setShowAllKnown(false)}
          >
            К бою
          </button>
          <button
            type="button"
            className={`sheet-chip${showAllKnown ? ' is-on' : ''}`}
            onClick={() => setShowAllKnown(true)}
          >
            Все известные
          </button>
          <button
            type="button"
            className={`sheet-chip${filter === 'all' ? ' is-on' : ''}`}
            onClick={() => setFilter('all')}
          >
            Ур. все
          </button>
          {filterOptions.map((level) => (
            <button
              key={level}
              type="button"
              className={`sheet-chip${filter === level ? ' is-on' : ''}`}
              onClick={() => setFilter(level)}
            >
              {level === 0 ? '0' : String(level)}
            </button>
          ))}
        </div>

        {visibleSpells.length === 0 ? (
          <Text tone="muted">
            {spells.known.length === 0
              ? 'Пока нет заклинаний — добавь ниже или подготовь из списка.'
              : 'В боевом виде пусто — нажми «Подготовить» или «Все известные».'}
          </Text>
        ) : (
          visibleSpells.map((group) => {
            const slot = group.level > 0 ? spells.slots[String(group.level)] : null
            return (
              <div key={group.level} className="spell-level-block">
                <div className="spell-level-block__header">
                  <strong>{levelLabel(group.level)}</strong>
                  {slot && slot.max > 0 ? (
                    <SlotPips
                      max={slot.max}
                      used={slot.used}
                      label={`Ячейки ${group.level}`}
                      summary={`${Math.max(0, slot.max - slot.used)}/${slot.max}`}
                      onChange={(used) => setSlotUsed(group.level, used)}
                    />
                  ) : group.level === 0 ? (
                    <span className="spell-level-block__hint">без ячеек</span>
                  ) : null}
                </div>
                <Stack gap={10}>
                  {group.spells.length === 0 ? (
                    <Text tone="muted">Нет заклинаний этого круга в списке.</Text>
                  ) : null}
                  {group.spells.map((spell) => (
                    <div
                      key={spell.id}
                      className={`spell-card${
                        isGrantedSpellHighlight(spell) ? ' is-granted' : ''
                      }`}
                    >
                      <div className="spell-card__top">
                        <Field label="Заклинание">
                          <CatalogCombobox
                            kind="spell"
                            edition={edition}
                            value={spell.name}
                            placeholder="Название или из справочника"
                            onChange={(value, selected) => applyCatalog(spell.id, value, selected)}
                          />
                        </Field>
                        <Field label="Ур.">
                          <NumberInput
                            min={0}
                            max={9}
                            emptyValue={0}
                            value={spell.level}
                            onValueChange={(level) =>
                              updateSpell(spell.id, { level: level ?? 0 })
                            }
                          />
                        </Field>
                      </div>
                      <div className="spell-card__meta">
                        <Field label="Время">
                          <Input
                            value={spell.casting_time}
                            placeholder="1 действие…"
                            onChange={(event) =>
                              updateSpell(spell.id, { casting_time: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Дистанция">
                          <Input
                            value={spell.range}
                            placeholder="60 футов"
                            onChange={(event) =>
                              updateSpell(spell.id, { range: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Длительность">
                          <Input
                            value={spell.duration ?? ''}
                            placeholder="Мгновенная / 1 мин…"
                            onChange={(event) =>
                              updateSpell(spell.id, {
                                duration: event.target.value || undefined,
                              })
                            }
                          />
                        </Field>
                        <Field label="Атака / спас">
                          <Input
                            value={spell.attack_or_save}
                            placeholder="МУД DC / +N"
                            onChange={(event) =>
                              updateSpell(spell.id, { attack_or_save: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Эффект">
                          <Input
                            value={spell.damage}
                            placeholder="1d8…"
                            onChange={(event) =>
                              updateSpell(spell.id, { damage: event.target.value })
                            }
                          />
                        </Field>
                      </div>
                      {spell.components || spell.school || spell.source_book || spell.higher_levels ? (
                        <Text tone="muted" className="spell-card__extras">
                          {[
                            spell.components
                              ? formatSpellComponents(spell.components)
                              : '',
                            spell.school ? spellSchoolLabelRu(spell.school) : '',
                            spell.source_book ?? '',
                            spell.higher_levels ? `↑ ${spell.higher_levels}` : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      ) : null}
                      <div className="spell-card__footer">
                        {spell.level > 0 ? (
                          (() => {
                            const lock = preparedLockChip(spell)
                            if (lock) {
                              return (
                                <span className="sheet-chip is-on" title={lock.title}>
                                  {lock.label}
                                </span>
                              )
                            }
                            if (knownCaster) {
                              return (
                                <span
                                  className="sheet-chip is-on"
                                  title="Известное заклинание — всегда доступно"
                                >
                                  Известно
                                </span>
                              )
                            }
                            return (
                              <button
                                type="button"
                                className={`sheet-chip${spell.prepared ? ' is-on' : ''}`}
                                onClick={() =>
                                  patch({
                                    known: setSpellPrepared(
                                      spells.known,
                                      spell.id,
                                      !spell.prepared,
                                      spells.max_prepared,
                                    ),
                                  })
                                }
                              >
                                {spell.prepared ? 'Подготовлено' : 'Не подготовлено'}
                              </button>
                            )
                          })()
                        ) : (
                          <span className="sheet-chip is-on">Заговор</span>
                        )}
                        {(() => {
                          const source = spellSourceBadge(spell)
                          const lock = preparedLockChip(spell)
                          // Always-prepared already shows lock chip; spell_list / other grants need source.
                          if (!source || lock) return null
                          return (
                            <span className="sheet-chip is-on" title={source.title}>
                              {source.label}
                            </span>
                          )
                        })()}
                        {spell.grant_cast && spell.grant_cast.max > 0 ? (
                          <span
                            className={`sheet-chip${
                              grantCastRemaining(spell) > 0 ? ' is-on' : ''
                            }`}
                            title={`${spell.grant_cast.label}: бесплатный каст без ячейки`}
                          >
                            {spell.grant_cast.label} {grantCastRemaining(spell)}/
                            {spell.grant_cast.max}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className={`sheet-chip spell-card__flag${
                            spell.concentration ? ' is-on' : ''
                          }`}
                          onClick={() =>
                            updateSpell(spell.id, { concentration: !spell.concentration })
                          }
                          title="Концентрация"
                          aria-pressed={spell.concentration}
                        >
                          <IconConcentration className="spells-btn-icon" />
                          конц.
                        </button>
                        <button
                          type="button"
                          className={`sheet-chip spell-card__flag${
                            spell.ritual ? ' is-on' : ''
                          }`}
                          onClick={() => updateSpell(spell.id, { ritual: !spell.ritual })}
                          title="Ритуал"
                          aria-pressed={spell.ritual}
                        >
                          <IconRitual className="spells-btn-icon" />
                          ритуал
                        </button>
                        {canRemoveSheetSpell(spell) ? (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              patch({
                                known: spells.known.filter((item) => item.id !== spell.id),
                              })
                            }
                          >
                            Удалить
                          </Button>
                        ) : null}
                        <Button
                          className="spell-card__cast"
                          disabled={
                            (spell.level > 0 && !spell.prepared) ||
                            (spell.level > 0 &&
                              !spell.ritual &&
                              !canSpendGrantCast(spell) &&
                              !canCastLeveledSpell(
                                spells.slots,
                                spells.pact_slots,
                                spell.level,
                              ))
                          }
                          onClick={() => setCastSpell(spell)}
                        >
                          <IconCast className="spells-btn-icon" />
                          Каст
                        </Button>
                      </div>
                    </div>
                  ))}
                </Stack>
              </div>
            )
          })
        )}

        <Text tone="muted">
          Новые заклинания — через гримуар (справочник → добавить на лист).
        </Text>
      </Stack>

      <PrepareSpellsDialog
        open={prepareOpen}
        spells={spells}
        learnMode={learnBudget?.mode ?? (knownCaster ? 'known' : 'prepared_list')}
        onChange={onChange}
        onClose={() => setPrepareOpen(false)}
      />
      {learnBudget?.mode === 'spellbook' && inventory && onInventoryChange ? (
        <SpellbookManageDialog
          open={bookManageOpen}
          spells={spells}
          inventoryItems={inventoryItems}
          coins={inventory.coins}
          wizardLevel={
            (classes?.find((row) => /волшебник|wizard|маг/i.test(row.name))?.level ??
              level) || 1
          }
          subclassSlug={(() => {
            const row = classes?.find((item) => /волшебник|wizard|маг/i.test(item.name))
            const raw = row?.subclass_name?.trim() || ''
            if (!raw) return null
            return resolveSubclassFeatureSlug(raw) ?? raw.toLowerCase().replace(/\s+/g, '_')
          })()}
          onChangeSpells={onChange}
          onChangeCoins={(coins) => onInventoryChange({ ...inventory, coins })}
          onChangeInventoryItems={(items) =>
            onInventoryChange({ ...inventory, items })
          }
          onChangeInventory={({ coins, items }) =>
            onInventoryChange({ ...inventory, coins, items })
          }
          onClose={() => setBookManageOpen(false)}
          onToast={onToast}
        />
      ) : null}
      <GrimoireDialog
        open={grimoireOpen}
        edition={edition}
        spells={spells}
        knownCaster={knownCaster}
        abilityModFor={(ability) => abilityModifier(abilities[ability])}
        classes={
          classes?.length
            ? classes
            : [
                {
                  id: 'primary',
                  name: className,
                  catalog_id: null,
                  level,
                  subclass_name: '',
                  subclass_catalog_id: null,
                },
              ]
        }
        subclassCasters={subclassCasters}
        coins={inventory?.coins ?? null}
        onCoinsChange={
          inventory && onInventoryChange
            ? (coins) => onInventoryChange({ ...inventory, coins })
            : undefined
        }
        inventoryItems={inventoryItems}
        onChange={onChange}
        onClose={() => setGrimoireOpen(false)}
        onToast={onToast}
      />
      <CastSpellDialog
        open={castSpell != null}
        spell={castSpell}
        spells={spells}
        inventoryItems={inventoryItems}
        characterLevel={level}
        wizardRitualFromBook={learnBudget?.mode === 'spellbook'}
        onConfirm={confirmCast}
        onClose={() => setCastSpell(null)}
      />
      <Dialog
        open={pendingConc != null}
        title="Смена концентрации"
        primaryLabel="Сменить и кастовать"
        secondaryLabel="Отмена"
        primaryVariant="danger"
        onPrimary={() => {
          if (!pendingConc) return
          const { spell, choice } = pendingConc
          setPendingConc(null)
          runCast(spell, choice)
        }}
        onSecondary={() => setPendingConc(null)}
      >
        <Text>
          Сейчас концентрация: «{concentration?.name ?? '—'}». Сменить на «
          {pendingConc?.spell.name || 'Заклинание'}»? Ячейка потратится после подтверждения.
        </Text>
      </Dialog>
    </Panel>
  )
}
