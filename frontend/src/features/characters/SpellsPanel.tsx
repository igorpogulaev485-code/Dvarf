import { useEffect, useMemo, useRef, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  applySpellcastingSuggestion,
  suggestSpellcasting,
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
import { Button, Field, Input, NumberInput, Panel, SlotPips, Stack, Text } from '../../ui'
import { abilityModifier, formatModifier, type AbilityKey } from './sheetTypes'
import { CastSpellDialog, type CastChoice } from './CastSpellDialog'
import {
  formatSpellComponents,
  resolveCastEffect,
  spellSchoolLabelRu,
} from '../../shared/dnd/spellCatalog'
import { GrimoireDialog } from './GrimoireDialog'
import { PrepareSpellsDialog } from './PrepareSpellsDialog'
import type { ConcentrationState } from './play'
import {
  canRemoveSheetSpell,
  canSpendGrantCast,
  countPreparedLeveled,
  createSheetSpell,
  ensureInnateGrantCasts,
  ensureKnownSpellsReady,
  grantCastRemaining,
  isFeatSheetSpell,
  isKnownSpellcastingMode,
  isRaceSheetSpell,
  groupSpellsByLevel,
  isReadyInCombat,
  preparedLockChip,
  readCatalogSpellFields,
  setSpellPrepared,
  spendGrantCast,
  type SheetSpell,
  type SpellsState,
} from './spells'
import type { InventoryItem, InventoryState } from './inventory'
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
  inventoryItems: InventoryItem[]
  onChange: (spells: SpellsState) => void
  onInventoryChange?: (inventory: InventoryState) => void
  inventory?: InventoryState
  onConcentrationChange?: (concentration: ConcentrationState | null) => void
  onToast?: (message: string) => void
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
  inventoryItems,
  inventory,
  onChange,
  onInventoryChange,
  onConcentrationChange,
  onToast,
}: SpellsPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [grimoireOpen, setGrimoireOpen] = useState(false)
  const [castSpell, setCastSpell] = useState<SheetSpell | null>(null)
  const [filter, setFilter] = useState<'all' | number>('all')
  const [showAllKnown, setShowAllKnown] = useState(false)

  const abilityKey = spells.casting_ability
  const abilityMod = abilityKey ? abilityModifier(abilities[abilityKey]) : 0
  const dc = abilityKey ? spellSaveDc(abilityMod, proficiencyBonus) : null
  const attack = abilityKey ? spellAttackBonus(abilityMod, proficiencyBonus) : null
  const preparedCount = countPreparedLeveled(spells.known)

  const combatPool = useMemo(
    () => (showAllKnown ? spells.known : spells.known.filter(isReadyInCombat)),
    [showAllKnown, spells.known],
  )

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
    return groupSpellsByLevel(list)
  }, [filter, combatPool])

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

  function applyConcentrationIfNeeded(spell: SheetSpell) {
    if (!spell.concentration) return
    onConcentrationChange?.(
      setConcentration({
        spellId: spell.id,
        name: spell.name || 'Заклинание',
      }),
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
    const name = castSpell.name || 'Заклинание'
    const ritualCast = Boolean(choice.ritual && castSpell.ritual && castSpell.level > 0)
    const grantCast = Boolean(choice.useGrant && canSpendGrantCast(castSpell))
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
    if (grantCast) {
      const label = castSpell.grant_cast?.label ?? 'Грант'
      onChange({
        ...spells,
        known: spendGrantCast(spells.known, castSpell.id),
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
        onToast?.('Нет свободных pact-ячеек')
        return
      }
      patch({ pact_slots: pactResult.pact })
      applyConcentrationIfNeeded(castSpell)
      onToast?.(
        `Каст: ${name} (−1 pact ${pactResult.pact.level} ур.)${effectNote}${consumeNote}${
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

  function enablePact() {
    patch({
      pact_slots: clampPactSlots({ max: 1, used: 0, level: 1 }),
    })
  }

  function disablePact() {
    patch({ pact_slots: null })
  }

  function patchPact(partial: { max?: number; used?: number; level?: number }) {
    if (!spells.pact_slots) return
    patch({
      pact_slots: clampPactSlots({ ...spells.pact_slots, ...partial }),
    })
  }

  const prepareLimitLabel =
    spells.max_prepared == null ? String(preparedCount) : `${preparedCount}/${spells.max_prepared}`

  return (
    <Panel title="Заклинания">
      <Stack gap={14}>
        <Text tone="muted">
          {knownCaster
            ? 'Известные заклинания всегда доступны для каста. Каст тратит ячейку/pact. Новые — из гримуара.'
            : 'Боевой список = заговоры + подготовленные. Каст тратит ячейку. Новые — из гримуара, затем подготовь.'}
        </Text>

        <div className="spells-summary">
          <div className="spells-summary__stat">
            <Text tone="muted">Спасбросок</Text>
            <strong>{dc == null ? '—' : dc}</strong>
          </div>
          <div className="spells-summary__stat">
            <Text tone="muted">Атака</Text>
            <strong>{attack == null ? '—' : formatModifier(attack)}</strong>
          </div>
          <div className="spells-summary__stat">
            <Text tone="muted">{knownCaster ? 'Известно' : 'Подготовлено'}</Text>
            <strong>
              {knownCaster
                ? String(spells.known.filter((s) => s.level > 0).length)
                : prepareLimitLabel}
            </strong>
          </div>
        </div>

        <div className="chip-row spells-focus-chips">
          <span
            className={`sheet-chip${spells.has_spell_focus ? ' is-on' : ''}`}
            title="Магический / друидический фокус в инвентаре"
          >
            {spells.has_spell_focus ? 'Фокус ✓' : 'Фокус ✗'}
          </span>
          <span
            className={`sheet-chip${spells.has_component_pouch ? ' is-on' : ''}`}
            title="Мешочек с компонентами в инвентаре"
          >
            {spells.has_component_pouch ? 'Мешочек ✓' : 'Мешочек ✗'}
          </span>
          <Text tone="muted">
            Ищем в инвентаре тип «Фокус» / «Мешочек» (имя может быть любым). М с ценой — отдельный
            предмет.
          </Text>
        </div>

        <div className="spells-toolbar">
          <Button variant="secondary" onClick={() => setSettingsOpen((open) => !open)}>
            {settingsOpen ? 'Скрыть настройки' : 'Настройки'}
          </Button>
          {!knownCaster ? (
            <Button variant="secondary" onClick={() => setPrepareOpen(true)}>
              Подготовить заклинания
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setGrimoireOpen(true)}>
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
                  >
                    От класса
                  </Button>
                </div>
                {suggestion ? (
                  <Text tone="muted">
                    {suggestion.labelRu}
                    {suggestion.progression === 'pact'
                      ? ` · pact ${suggestion.pact_slots?.level ?? '—'} / ${suggestion.pact_slots?.max ?? 0}`
                      : suggestion.progression === 'none'
                        ? ' · не заклинатель'
                        : ' · слоты PHB 2014'}
                    . При смене класса или уровня подставляется само; spent не сбрасываем.
                  </Text>
                ) : (
                  <Text tone="muted">
                    Класс не распознан — оставь числа вручную. Известные: жрец, волшебник, паладин,
                    колдун…
                  </Text>
                )}
                <div className="sheet-grid sheet-grid--slots" style={{ marginTop: 8 }}>
                  {Array.from({ length: 9 }, (_, index) => {
                    const level = index + 1
                    const key = String(level)
                    return (
                      <Field key={key} label={`${level}-й`}>
                        <NumberInput
                          min={0}
                          max={20}
                          emptyValue={0}
                          value={spells.slots[key]?.max ?? 0}
                          onValueChange={(max) => setSlotMax(level, max ?? 0)}
                        />
                      </Field>
                    )
                  })}
                </div>
              </div>
              <div className="pact-settings">
                <div className="play-resources-head">
                  <Text>Pact magic (варлок)</Text>
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
                  <div className="sheet-grid sheet-grid--2" style={{ marginTop: 8 }}>
                    <Field label="Уровень pact">
                      <NumberInput
                        min={1}
                        max={9}
                        emptyValue={1}
                        value={spells.pact_slots.level}
                        onValueChange={(level) => patchPact({ level: level ?? 1 })}
                      />
                    </Field>
                    <Field label="Макс. ячеек">
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
                  <Text tone="muted">Каст с pact тратит эти ячейки, если уровень заклинания ≤ pact.</Text>
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
              label={`Pact ${spells.pact_slots.level}-го уровня`}
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
              : 'В боевом виде пусто — нажми «Подготовить заклинания» или «Все известные».'}
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
                      label={`Ячейки ${group.level}-го уровня`}
                      onChange={(used) => setSlotUsed(group.level, used)}
                    />
                  ) : null}
                </div>
                <Stack gap={10}>
                  {group.spells.map((spell) => (
                    <div key={spell.id} className="spell-card">
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
                        {isRaceSheetSpell(spell) && spell.race_grant === 'spell_list' ? (
                          <span
                            className="sheet-chip is-on"
                            title="Список метки/расы — готовь как классовое"
                          >
                            Метка
                          </span>
                        ) : null}
                        {isFeatSheetSpell(spell) && spell.feat_grant === 'spell_list' ? (
                          <span
                            className="sheet-chip is-on"
                            title="Список черты — готовь как классовое"
                          >
                            Черта
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className={`sheet-chip${spell.concentration ? ' is-on' : ''}`}
                          onClick={() =>
                            updateSpell(spell.id, { concentration: !spell.concentration })
                          }
                        >
                          К
                        </button>
                        <button
                          type="button"
                          className={`sheet-chip${spell.ritual ? ' is-on' : ''}`}
                          onClick={() => updateSpell(spell.id, { ritual: !spell.ritual })}
                          title="Ритуал"
                        >
                          Ритуал
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

        <div>
          <Button
            variant="secondary"
            onClick={() => patch({ known: [...spells.known, createSheetSpell()] })}
          >
            Добавить заклинание
          </Button>
        </div>
      </Stack>

      <PrepareSpellsDialog
        open={prepareOpen}
        spells={spells}
        onChange={onChange}
        onClose={() => setPrepareOpen(false)}
      />
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
        onConfirm={confirmCast}
        onClose={() => setCastSpell(null)}
      />
    </Panel>
  )
}
