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

export type WeaponAttack = {
  id: string
  name: string
  catalog_id: string | null
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

function createWeapon(): WeaponAttack {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `weapon-${Date.now()}`,
    name: '',
    catalog_id: null,
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

export function AttacksPanel({
  edition,
  weapons,
  abilities,
  proficiencyBonus,
  onChange,
}: AttacksPanelProps) {
  function updateWeapon(id: string, patch: Partial<WeaponAttack>) {
    onChange(weapons.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function applyCatalog(id: string, value: string, selected: CatalogEntry | null) {
    if (!selected) {
      updateWeapon(id, { name: value, catalog_id: null })
      return
    }
    const data = selected.data ?? {}
    updateWeapon(id, {
      name: selected.name_ru,
      catalog_id: selected.id,
      ability: readCatalogAbility(data),
      damage: typeof data.damage === 'string' ? data.damage : '',
      damage_type: typeof data.damage_type === 'string' ? data.damage_type : '',
    })
  }

  return (
    <Panel title="Атаки и оружие">
      <Stack gap={12}>
        {weapons.length === 0 ? (
          <Text tone="muted">Пока нет атак — добавь оружие из справочника или впиши своё.</Text>
        ) : null}

        {weapons.map((weapon) => {
          const attackBonus =
            abilityModifier(abilities[weapon.ability]) +
            (weapon.is_proficient ? proficiencyBonus : 0)
          return (
            <div key={weapon.id} className="attack-card">
              <div className="attack-card__grid">
                <Field label="Оружие / атака">
                  <CatalogCombobox
                    kind="weapon"
                    edition={edition}
                    value={weapon.name}
                    placeholder="Боевой молот, арбалет…"
                    onChange={(value, selected) => applyCatalog(weapon.id, value, selected)}
                  />
                </Field>
                <Field label="Характеристика">
                  <select
                    className="ui-input"
                    value={weapon.ability}
                    onChange={(event) =>
                      updateWeapon(weapon.id, {
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
                    value={weapon.damage}
                    placeholder="1d8"
                    onChange={(event) => updateWeapon(weapon.id, { damage: event.target.value })}
                  />
                </Field>
                <Field label="Тип урона">
                  <Input
                    value={weapon.damage_type}
                    placeholder="дробящий"
                    onChange={(event) =>
                      updateWeapon(weapon.id, { damage_type: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="attack-card__footer">
                <button
                  type="button"
                  className={`sheet-chip${weapon.is_proficient ? ' is-on' : ''}`}
                  onClick={() =>
                    updateWeapon(weapon.id, { is_proficient: !weapon.is_proficient })
                  }
                >
                  {weapon.is_proficient ? 'Владение' : 'Без владения'}
                </button>
                <Button
                  variant="ghost"
                  onClick={() => onChange(weapons.filter((item) => item.id !== weapon.id))}
                >
                  Удалить
                </Button>
              </div>
            </div>
          )
        })}

        <div>
          <Button variant="secondary" onClick={() => onChange([...weapons, createWeapon()])}>
            Добавить атаку
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
