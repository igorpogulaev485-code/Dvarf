import { useMemo, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  SPELLCASTING_ABILITIES,
  SPELLCASTING_ABILITY_LABELS,
  levelLabel,
  spellAttackBonus,
  spellSaveDc,
  type SpellcastingAbility,
} from '../../shared/dnd/spells'
import { Button, Field, Input, NumberInput, Panel, SlotPips, Stack, Text } from '../../ui'
import { abilityModifier, formatModifier, type AbilityKey } from './sheetTypes'
import {
  createSheetSpell,
  groupSpellsByLevel,
  readCatalogSpellFields,
  type SheetSpell,
  type SpellsState,
} from './spells'

type SpellsPanelProps = {
  edition: RulesEdition
  spells: SpellsState
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  onChange: (spells: SpellsState) => void
}

export function SpellsPanel({
  edition,
  spells,
  abilities,
  proficiencyBonus,
  onChange,
}: SpellsPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | number>('all')

  const abilityKey = spells.casting_ability
  const abilityMod = abilityKey ? abilityModifier(abilities[abilityKey]) : 0
  const dc = abilityKey ? spellSaveDc(abilityMod, proficiencyBonus) : null
  const attack = abilityKey ? spellAttackBonus(abilityMod, proficiencyBonus) : null

  const filterOptions = useMemo(() => {
    const levels = new Set<number>([0])
    for (const spell of spells.known) levels.add(spell.level)
    for (let level = 1; level <= 9; level += 1) {
      if ((spells.slots[String(level)]?.max ?? 0) > 0) levels.add(level)
    }
    return [...levels].sort((a, b) => a - b)
  }, [spells.known, spells.slots])

  const visibleSpells = useMemo(() => {
    const list =
      filter === 'all' ? spells.known : spells.known.filter((spell) => spell.level === filter)
    return groupSpellsByLevel(list)
  }, [filter, spells.known])

  function patch(next: Partial<SpellsState>) {
    onChange({ ...spells, ...next })
  }

  function updateSpell(id: string, next: Partial<SheetSpell>) {
    patch({
      known: spells.known.map((spell) => (spell.id === id ? { ...spell, ...next } : spell)),
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

  return (
    <Panel title="Заклинания">
      <Stack gap={14}>
        <Text tone="muted">
          S1: DC/атака, слоты-пипсы, список на листе. Подготовка из гримуара и кнопка «каст» — следующими
          слайсами.
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
            <Text tone="muted">Характеристика</Text>
            <strong>
              {abilityKey ? SPELLCASTING_ABILITY_LABELS[abilityKey] : 'не задана'}
            </strong>
          </div>
        </div>

        <div className="spells-toolbar">
          <Button variant="secondary" onClick={() => setSettingsOpen((open) => !open)}>
            {settingsOpen ? 'Скрыть настройки' : 'Настройки'}
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
            className={`sheet-chip${filter === 'all' ? ' is-on' : ''}`}
            onClick={() => setFilter('all')}
          >
            Все
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
          <Text tone="muted">Пока нет заклинаний в списке — добавь ниже.</Text>
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
                <div className="spell-meta-head" aria-hidden>
                  <span>Время</span>
                  <span>Дист.</span>
                  <span>Атака/спас</span>
                  <span>Эффект</span>
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
                        <button
                          type="button"
                          className={`sheet-chip${spell.prepared ? ' is-on' : ''}`}
                          onClick={() => updateSpell(spell.id, { prepared: !spell.prepared })}
                        >
                          {spell.prepared ? 'Подготовлено' : 'Не подготовлено'}
                        </button>
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
    </Panel>
  )
}
