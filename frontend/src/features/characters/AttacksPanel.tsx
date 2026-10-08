import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { parseWeaponCatalogData } from '../../shared/dnd/gearCatalog'
import { Button, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import { isWeaponProficient } from './equipmentProficiency'
import type { WeaponProficiency } from './identity'

export type AttackSourceKind = 'weapon' | 'artifact' | 'custom' | 'race'

export type WeaponAttack = {
  id: string
  name: string
  catalog_id: string | null
  source_kind: AttackSourceKind
  ability: AbilityKey
  is_proficient: boolean
  damage: string
  damage_type: string
  /** Stack size (javelins ×4); omit/null when each card is one weapon. */
  qty?: number | null
  /** Linked inventory row — held state mirrors item.equipped. */
  inventory_item_id?: string | null
  /** In hand right now (synced from inventory when linked). */
  held?: boolean
}

/** Stable attack id for race natural weapons (revoke on race change). */
export function raceNaturalWeaponAttackId(raceSlug: string, weaponId: string): string {
  return `race-nw:${raceSlug}:${weaponId}`
}

export function isRaceNaturalWeaponAttack(attack: Pick<WeaponAttack, 'id' | 'source_kind'>): boolean {
  return attack.source_kind === 'race' || attack.id.startsWith('race-nw:')
}

/** Stable attack id for class starting-equipment weapons. */
export function classEquipmentAttackId(classEntryId: string, inventoryItemId: string): string {
  return `class-eq:${classEntryId}:${inventoryItemId}`
}

export function isClassEquipmentAttack(attack: Pick<WeaponAttack, 'id'>): boolean {
  return attack.id.startsWith('class-eq:')
}

/** Stable attack id for background starting-equipment weapons. */
export function backgroundEquipmentAttackId(
  backgroundSlug: string,
  inventoryItemId: string,
): string {
  return `bg-eq:${backgroundSlug}:${inventoryItemId}`
}

export function isBackgroundEquipmentAttack(attack: Pick<WeaponAttack, 'id'>): boolean {
  return attack.id.startsWith('bg-eq:')
}

type AttacksPanelProps = {
  edition: RulesEdition
  weapons: WeaponAttack[]
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  /** Sheet weapon categories + named extras — drives attack PB automatically. */
  weaponProficiency: WeaponProficiency
  onChange: (weapons: WeaponAttack[]) => void
  /** Toggle in-hand for an attack linked to inventory (hand-slot rules). */
  onToggleHeld?: (attack: WeaponAttack) => void
  /** Per inventory item: magic attack/damage from active gear effects. */
  gearBonusesByItem?: Record<string, { attackBonus: number; damageBonus: number }>
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
    qty: null,
    inventory_item_id: null,
    held: false,
  }
}

/** Mirror inventory.equipped onto linked attack cards. */
export function syncAttacksHeldFromInventory(
  weapons: WeaponAttack[],
  items: Array<{ id: string; equipped: boolean }>,
): WeaponAttack[] {
  const equippedById = new Map(items.map((item) => [item.id, item.equipped]))
  let changed = false
  const next = weapons.map((attack) => {
    if (!attack.inventory_item_id) return attack
    const held = Boolean(equippedById.get(attack.inventory_item_id))
    if (attack.held === held) return attack
    changed = true
    return { ...attack, held }
  })
  return changed ? next : weapons
}

function sourceFromCatalog(entry: CatalogEntry): AttackSourceKind {
  if (entry.kind === 'weapon') return 'weapon'
  if (entry.kind === 'item') return 'artifact'
  return 'custom'
}

function sourceLabel(kind: AttackSourceKind): string {
  if (kind === 'weapon') return 'Оружие'
  if (kind === 'artifact') return 'Артефакт'
  if (kind === 'race') return 'Раса'
  return 'Своё'
}

export function AttacksPanel({
  edition,
  weapons,
  abilities,
  proficiencyBonus,
  weaponProficiency,
  onChange,
  onToggleHeld,
  gearBonusesByItem,
}: AttacksPanelProps) {
  function updateAttack(id: string, patch: Partial<WeaponAttack>) {
    onChange(weapons.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function applyCatalog(id: string, value: string, selected: CatalogEntry | null) {
    if (!selected) {
      updateAttack(id, { name: value, catalog_id: null, source_kind: 'custom' })
      return
    }
    const parsed = parseWeaponCatalogData(selected.data ?? {})
    updateAttack(id, {
      name: selected.name_ru,
      catalog_id: selected.id,
      source_kind: sourceFromCatalog(selected),
      ability: parsed.ability,
      damage: parsed.damage,
      damage_type: parsed.damage_type,
    })
  }

  return (
    <Panel title="Атаки">
      <Stack gap={12}>
        <Text tone="muted">
          Атака может быть обычным оружием или артефактом. «В руках» — сейчас держишь (двуручное
          занимает обе руки; иначе до двух одноручных / одноручное+щит). Убрать = убрать в ножны
          (в бою это действие). Владение (бонус мастерства) — от блока «Владения снаряжением», не
          вручную на карточке.
        </Text>

        {weapons.length === 0 ? (
          <Text tone="muted">Пока нет атак — добавь первую.</Text>
        ) : null}

        {weapons.map((attack) => {
          const gear =
            attack.inventory_item_id && attack.held
              ? gearBonusesByItem?.[attack.inventory_item_id]
              : undefined
          const magicAtk = gear?.attackBonus ?? 0
          const magicDmg = gear?.damageBonus ?? 0
          const proficient = isWeaponProficient({
            name: attack.name,
            weapons: weaponProficiency,
          })
          const attackBonus =
            abilityModifier(abilities[attack.ability]) +
            (proficient ? proficiencyBonus : 0) +
            magicAtk
          const damageDisplay =
            magicDmg && attack.damage
              ? `${attack.damage}${magicDmg >= 0 ? '+' : ''}${magicDmg}`
              : attack.damage
          return (
            <div
              key={attack.id}
              className={`attack-card${
                attack.inventory_item_id && !attack.held ? ' attack-card--stowed' : ''
              }`}
            >
              <div className="attack-card__meta">
                <span className={`attack-source attack-source--${attack.source_kind}`}>
                  {sourceLabel(attack.source_kind)}
                </span>
                {attack.inventory_item_id ? (
                  <span className="attack-held-tag">
                    {attack.held ? 'в руках' : 'убран'}
                  </span>
                ) : null}
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
                <Field
                  label="Бонус атаки"
                  hint={magicAtk ? `магия ${magicAtk >= 0 ? '+' : ''}${magicAtk}` : undefined}
                >
                  <Input value={formatModifier(attackBonus)} readOnly />
                </Field>
                <Field
                  label="Урон"
                  hint={
                    magicDmg
                      ? `с магией ${damageDisplay} (${magicDmg >= 0 ? '+' : ''}${magicDmg})`
                      : undefined
                  }
                >
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
                <Field label="Кол-во" hint="для метательных / запасов">
                  <NumberInput
                    min={1}
                    emptyValue={null}
                    value={attack.qty ?? null}
                    onValueChange={(qty) =>
                      updateAttack(attack.id, {
                        qty: qty == null || qty <= 1 ? null : qty,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="attack-card__footer">
                {attack.inventory_item_id && onToggleHeld ? (
                  <button
                    type="button"
                    className={`sheet-chip${attack.held ? ' is-on' : ''}`}
                    onClick={() => onToggleHeld(attack)}
                  >
                    {attack.held ? 'В руках' : 'Убран'}
                  </button>
                ) : null}
                <span
                  className={`sheet-chip${proficient ? ' is-on' : ''}`}
                  title="Из владений снаряжением на листе"
                >
                  {proficient ? 'Владение' : 'Нет владения'}
                </span>
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
