import { useMemo, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  SPELLCASTING_ABILITIES,
  SPELLCASTING_ABILITY_LABELS,
  canSpendSlot,
  levelLabel,
  spendSpellSlot,
  spellAttackBonus,
  spellSaveDc,
  type SpellcastingAbility,
} from '../../shared/dnd/spells'
import { Button, Field, Input, NumberInput, Panel, SlotPips, Stack, Text } from '../../ui'
import { abilityModifier, formatModifier, type AbilityKey } from './sheetTypes'
import { CastSpellDialog } from './CastSpellDialog'
import { PrepareSpellsDialog } from './PrepareSpellsDialog'
import {
  countPreparedLeveled,
  createSheetSpell,
  groupSpellsByLevel,
  isReadyInCombat,
  readCatalogSpellFields,
  setSpellPrepared,
  type SheetSpell,
  type SpellsState,
} from './spells'

type SpellsPanelProps = {
  edition: RulesEdition
  spells: SpellsState
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  onChange: (spells: SpellsState) => void
  onToast?: (message: string) => void
}

export function SpellsPanel({
  edition,
  spells,
  abilities,
  proficiencyBonus,
  onChange,
  onToast,
}: SpellsPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [prepareOpen, setPrepareOpen] = useState(false)
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

  function patch(next: Partial<SpellsState>) {
    onChange({ ...spells, ...next })
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

  function confirmCast() {
    if (!castSpell) return
    const result = spendSpellSlot(spells.slots, castSpell.level)
    if (!result.ok) {
      onToast?.(`Нет ячеек ${castSpell.level}-го уровня`)
      return
    }
    patch({ slots: result.slots })
    const name = castSpell.name || 'Заклинание'
    if (castSpell.level <= 0) {
      onToast?.(`Каст: ${name}`)
    } else {
      onToast?.(`Каст: ${name} (−1 ячейка ${castSpell.level} ур.)`)
    }
    setCastSpell(null)
  }

  const prepareLimitLabel =
    spells.max_prepared == null ? String(preparedCount) : `${preparedCount}/${spells.max_prepared}`

  return (
    <Panel title="Заклинания">
      <Stack gap={14}>
        <Text tone="muted">
          Боевой список = заговоры + подготовленные. Каст тратит ячейку (S3). Гримуар — S4.
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
            <Text tone="muted">Подготовлено</Text>
            <strong>{prepareLimitLabel}</strong>
          </div>
        </div>

        <div className="spells-toolbar">
          <Button variant="secondary" onClick={() => setSettingsOpen((open) => !open)}>
            {settingsOpen ? 'Скрыть настройки' : 'Настройки'}
          </Button>
          <Button variant="secondary" onClick={() => setPrepareOpen(true)}>
            Подготовить заклинания
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
                hint="Пусто = без лимита. Позже подтянем от класса/уровня."
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
                <Text>Количество ячеек</Text>
                <div className="sheet-grid sheet-grid--slots">
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
            </Stack>
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
                            placeholder="Д / БД…"
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
                      <div className="spell-card__footer">
                        {spell.level > 0 ? (
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
                        ) : (
                          <span className="sheet-chip is-on">Заговор</span>
                        )}
                        <button
                          type="button"
                          className={`sheet-chip${spell.concentration ? ' is-on' : ''}`}
                          onClick={() =>
                            updateSpell(spell.id, { concentration: !spell.concentration })
                          }
                        >
                          К
                        </button>
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
                        <Button
                          className="spell-card__cast"
                          disabled={
                            (spell.level > 0 && !spell.prepared) ||
                            (spell.level > 0 && !canSpendSlot(spells.slots, spell.level))
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
      <CastSpellDialog
        open={castSpell != null}
        spell={castSpell}
        spells={spells}
        onConfirm={confirmCast}
        onClose={() => setCastSpell(null)}
      />
    </Panel>
  )
}
