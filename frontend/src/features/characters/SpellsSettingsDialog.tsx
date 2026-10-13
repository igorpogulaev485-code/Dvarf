import { useMemo, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  applySpellcastingSuggestion,
  type SpellcastingSuggestion,
  type SubclassCasterOverlay,
} from '../../shared/dnd/casterProgression'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  SPELLCASTING_ABILITIES,
  SPELLCASTING_ABILITY_LABELS,
  clampPactSlots,
  type SpellcastingAbility,
} from '../../shared/dnd/spells'
import {
  formatSpellComponents,
  spellSchoolLabelRu,
} from '../../shared/dnd/spellCatalog'
import { Button, Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'
import { abilityModifier, type AbilityKey } from './sheetTypes'
import { GrimoireDialog } from './GrimoireDialog'
import { PrepareSpellsDialog } from './PrepareSpellsDialog'
import {
  IconFocus,
  IconPouch,
  IconSpellBook,
  IconWizardHat,
} from './spellIcons'
import {
  canRemoveSheetSpell,
  grantCastRemaining,
  groupSpellsByLevel,
  isGrantedSpellHighlight,
  preparedLockChip,
  readCatalogSpellFields,
  setSpellPrepared,
  spellSourceBadge,
  type SheetSpell,
  type SpellsState,
} from './spells'
type SpellsSettingsDialogProps = {
  open: boolean
  edition: RulesEdition
  className: string
  level: number
  classes?: ClassLevelEntry[]
  subclassCasters?: SubclassCasterOverlay[]
  spells: SpellsState
  abilities: Record<AbilityKey, number>
  suggestion: SpellcastingSuggestion | null
  knownCaster: boolean
  onChange: (spells: SpellsState) => void
  onClose: () => void
  onToast?: (message: string) => void
}

export function SpellsSettingsDialog({
  open,
  edition,
  className,
  level,
  classes,
  subclassCasters,
  spells,
  abilities,
  suggestion,
  knownCaster,
  onChange,
  onClose,
  onToast,
}: SpellsSettingsDialogProps) {
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [grimoireOpen, setGrimoireOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const classRows = useMemo(
    () =>
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
          ],
    [classes, className, level],
  )

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

  function setSlotMax(slotLevel: number, max: number) {
    const key = String(slotLevel)
    const current = spells.slots[key] ?? { max: 0, used: 0 }
    const nextMax = Math.max(0, max)
    patch({
      slots: {
        ...spells.slots,
        [key]: { max: nextMax, used: Math.min(nextMax, current.used) },
      },
    })
  }

  function setCastingAbility(next: SpellcastingAbility) {
    patch({
      casting_ability: spells.casting_ability === next ? null : next,
    })
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

  const groups = groupSpellsByLevel(spells.known)

  return (
    <>
      <Dialog
        open={open && !prepareOpen && !grimoireOpen}
        title="Настройки заклинаний"
        size="wide"
        primaryLabel="Готово"
        onPrimary={onClose}
        secondaryLabel="Закрыть"
        onSecondary={onClose}
      >
        <Stack gap={14}>
          <Text tone="muted">
            Здесь — ресурсы кастера и книга. Каст и потраченные ячейки остаются в компактном боевом
            списке.
          </Text>

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
          </div>

          <div className="spells-settings-dialog__books">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPrepareOpen(true)}
            >
              <IconWizardHat className="spells-btn-icon" />
              Подготовить
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setGrimoireOpen(true)}
            >
              <IconSpellBook className="spells-btn-icon" />
              Гримуар
            </Button>
          </div>

          <div className="spells-settings">
            <Stack gap={10}>
              <div className="spells-settings__top">
                <div>
                  <Text>Характеристика заклинаний</Text>
                  <div className="chip-row" style={{ marginTop: 6 }}>
                    {SPELLCASTING_ABILITIES.map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={`sheet-chip${
                          spells.casting_ability === key ? ' is-on' : ''
                        }`}
                        onClick={() => setCastingAbility(key)}
                      >
                        {SPELLCASTING_ABILITY_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="spells-settings__prep">
                  <Field
                    label="Подготовка"
                    hint={
                      suggestion?.max_prepared != null
                        ? `табл. ${suggestion.max_prepared}`
                        : suggestion
                          ? 'без лимита'
                          : 'пусто = ∞'
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
                </div>
              </div>
              <div>
                <div className="play-resources-head">
                  <Text>Ячейки (макс.)</Text>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={applyFromClass}
                    disabled={!suggestion}
                  >
                    От класса
                  </Button>
                </div>
                <Text tone="muted" className="spells-settings__slots-hint">
                  {suggestion
                    ? `${suggestion.labelRu}${
                        suggestion.progression === 'pact'
                          ? ` · договор ${suggestion.pact_slots?.level ?? '—'} / ${suggestion.pact_slots?.max ?? 0}`
                          : suggestion.progression === 'none'
                            ? ' · не заклинатель'
                            : ' · PHB 2014'
                      }`
                    : 'Класс не распознан — задай вручную'}
                </Text>
                <div className="sheet-grid sheet-grid--slots">
                  {Array.from({ length: 9 }, (_, index) => {
                    const slotLevel = index + 1
                    const key = String(slotLevel)
                    return (
                      <Field key={key} label={`${slotLevel}`}>
                        <NumberInput
                          min={0}
                          max={20}
                          emptyValue={0}
                          value={spells.slots[key]?.max ?? 0}
                          onValueChange={(max) => setSlotMax(slotLevel, max ?? 0)}
                          aria-label={`Ячейки ${slotLevel}-го круга`}
                        />
                      </Field>
                    )
                  })}
                </div>
              </div>
              <div className="pact-settings">
                <div className="play-resources-head">
                  <Text>Договор (колдун)</Text>
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
                  <div className="sheet-grid sheet-grid--2" style={{ marginTop: 6 }}>
                    <Field label="Ур.">
                      <NumberInput
                        min={1}
                        max={9}
                        emptyValue={1}
                        value={spells.pact_slots.level}
                        onValueChange={(pactLevel) =>
                          patchPact({ level: pactLevel ?? 1 })
                        }
                        aria-label="Уровень договора"
                      />
                    </Field>
                    <Field label="Макс.">
                      <NumberInput
                        min={0}
                        max={10}
                        emptyValue={0}
                        value={spells.pact_slots.max}
                        onValueChange={(max) => patchPact({ max: max ?? 0 })}
                        aria-label="Максимум ячеек договора"
                      />
                    </Field>
                  </div>
                ) : (
                  <Text tone="muted">Каст через договор, если уровень заклинания ≤ договора.</Text>
                )}
              </div>
            </Stack>
          </div>

          <div className="spells-settings-dialog__advanced">
            <button
              type="button"
              className="spells-settings-dialog__advanced-toggle"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              {advancedOpen ? 'Скрыть расширенное' : 'Расширенное'}
              <span className="spells-settings-dialog__advanced-hint">
                ручные поля, удаление
              </span>
            </button>
            {advancedOpen ? (
              <Stack gap={12}>
                {groups.length === 0 ? (
                  <Text tone="muted">
                    Пока нет заклинаний — открой гримуар и добавь из справочника.
                  </Text>
                ) : (
                  groups.map((group) => (
                    <div key={group.level} className="spell-level-block">
                      <div className="spell-level-block__header">
                        <strong>
                          {group.level === 0 ? 'Заговоры' : `${group.level}-й круг`}
                        </strong>
                      </div>
                      <Stack gap={10}>
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
                                  onChange={(value, selected) =>
                                    applyCatalog(spell.id, value, selected)
                                  }
                                />
                              </Field>
                              <Field label="Ур.">
                                <NumberInput
                                  min={0}
                                  max={9}
                                  emptyValue={0}
                                  value={spell.level}
                                  onValueChange={(spellLevel) =>
                                    updateSpell(spell.id, { level: spellLevel ?? 0 })
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
                                    updateSpell(spell.id, {
                                      casting_time: event.target.value,
                                    })
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
                                    updateSpell(spell.id, {
                                      attack_or_save: event.target.value,
                                    })
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
                            {spell.components ||
                            spell.school ||
                            spell.source_book ||
                            spell.higher_levels ? (
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
                                      <span
                                        className="sheet-chip is-on"
                                        title={lock.title}
                                      >
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
                                      className={`sheet-chip${
                                        spell.prepared ? ' is-on' : ''
                                      }`}
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
                                if (!source || lock) return null
                                return (
                                  <span
                                    className="sheet-chip is-on"
                                    title={source.title}
                                  >
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
                              {canRemoveSheetSpell(spell) ? (
                                <Button
                                  variant="ghost"
                                  onClick={() =>
                                    patch({
                                      known: spells.known.filter(
                                        (item) => item.id !== spell.id,
                                      ),
                                    })
                                  }
                                >
                                  Удалить
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </Stack>
                    </div>
                  ))
                )}
                <Text tone="muted">
                  Новые заклинания — только через гримуар (справочник → добавить на лист).
                </Text>
              </Stack>
            ) : null}
          </div>
        </Stack>
      </Dialog>

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
        classes={classRows}
        subclassCasters={subclassCasters}
        onChange={onChange}
        onClose={() => setGrimoireOpen(false)}
        onToast={onToast}
      />
    </>
  )
}
