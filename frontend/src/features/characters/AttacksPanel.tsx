import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { Button, Field, Input, Panel, Stack, Text } from '../../ui'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'

export type AttackSourceKind = 'weapon' | 'artifact' | 'custom'

export type WeaponAttack = {
  id: string
  name: string
  catalog_id: string | null
  source_kind: AttackSourceKind
  ability: AbilityKey
  is_proficient: boolean
  damage: string
  damage_type: string
}

type AttacksPanelProps = {
  edition: RulesEdition
  weapons: WeaponAttack[]
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  onChange: (weapons: WeaponAttack[]) => void
}

function createAttack(): WeaponAttack {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `attack-${Date.now()}`,
    name: '',
    catalog_id: null,
    source_kind: 'custom',
    ability: 'str',
    is_proficient: true,
    damage: '',
    damage_type: '',
  }
}

function readCatalogAbility(data: Record<string, unknown>): AbilityKey {
  const value = data.ability
  return ABILITY_KEYS.includes(value as AbilityKey) ? (value as AbilityKey) : 'str'
}

function sourceFromCatalog(entry: CatalogEntry): AttackSourceKind {
  if (entry.kind === 'weapon') return 'weapon'
  if (entry.kind === 'item') return 'artifact'
  return 'custom'
}

function sourceLabel(kind: AttackSourceKind): string {
  if (kind === 'weapon') return 'Оружие'
  if (kind === 'artifact') return 'Артефакт'
  return 'Своё'
}

export function AttacksPanel({
  edition,
  weapons,
  abilities,
  proficiencyBonus,
  onChange,
}: AttacksPanelProps) {
  function updateAttack(id: string, patch: Partial<WeaponAttack>) {
    onChange(weapons.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function applyCatalog(id: string, value: string, selected: CatalogEntry | null) {
    if (!selected) {
      updateAttack(id, { name: value, catalog_id: null, source_kind: 'custom' })
      return
    }
    const data = selected.data ?? {}
    updateAttack(id, {
      name: selected.name_ru,
      catalog_id: selected.id,
      source_kind: sourceFromCatalog(selected),
      ability: readCatalogAbility(data),
      damage: typeof data.damage === 'string' ? data.damage : '',
      damage_type: typeof data.damage_type === 'string' ? data.damage_type : '',
    })
  }

  return (
    <Panel title="Атаки">
      <Stack gap={12}>
        <Text tone="muted">
          Атака может быть обычным оружием или артефактом — у обоих есть урон. Можно выбрать из
          справочника или вписать своё название.
        </Text>

        {weapons.length === 0 ? (
          <Text tone="muted">Пока нет атак — добавь первую.</Text>
        ) : null}

        {weapons.map((attack) => {
          const attackBonus =
            abilityModifier(abilities[attack.ability]) +
            (attack.is_proficient ? proficiencyBonus : 0)
          return (
            <div key={attack.id} className="attack-card">
              <div className="attack-card__meta">
                <span className={`attack-source attack-source--${attack.source_kind}`}>
                  {sourceLabel(attack.source_kind)}
                </span>
              </div>
              <div className="attack-card__grid">
                <Field label="Оружие или артефакт">
                  <CatalogCombobox
                    kinds={['weapon', 'item']}
                    edition={edition}
                    value={attack.name}
                    placeholder="Боевой молот, Молот бури…"
                    onChange={(value, selected) => applyCatalog(attack.id, value, selected)}
                  />
                </Field>
                <Field label="Характеристика">
                  <select
                    className="ui-input"
                    value={attack.ability}
                    onChange={(event) =>
                      updateAttack(attack.id, {
                        ability: event.target.value as AbilityKey,
                      })
                    }
                  >
                    {ABILITY_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {ABILITY_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Бонус атаки">
                  <Input value={formatModifier(attackBonus)} readOnly />
                </Field>
                <Field label="Урон">
                  <Input
                    value={attack.damage}
                    placeholder="1d8"
                    onChange={(event) => updateAttack(attack.id, { damage: event.target.value })}
                  />
                </Field>
                <Field label="Тип урона">
                  <Input
                    value={attack.damage_type}
                    placeholder="дробящий"
                    onChange={(event) =>
                      updateAttack(attack.id, { damage_type: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="attack-card__footer">
                <button
                  type="button"
                  className={`sheet-chip${attack.is_proficient ? ' is-on' : ''}`}
                  onClick={() =>
                    updateAttack(attack.id, { is_proficient: !attack.is_proficient })
                  }
                >
                  {attack.is_proficient ? 'Владение' : 'Без владения'}
                </button>
                <Button
                  variant="ghost"
                  onClick={() => onChange(weapons.filter((item) => item.id !== attack.id))}
                >
                  Удалить
                </Button>
              </div>
            </div>
          )
        })}

        <div>
          <Button variant="secondary" onClick={() => onChange([...weapons, createAttack()])}>
            Добавить атаку
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
