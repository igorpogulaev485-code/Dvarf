import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { parseWeaponCatalogData } from '../../shared/dnd/gearCatalog'
import { fightingStyleAttackBonus } from '../../shared/dnd/fightingStyles'
import {
  effectiveMartialArtsDamage,
  isMonkUnarmedAttack,
  isMonkWeaponName,
  monkAttackAbility,
} from '../../shared/dnd/martialArts'
import { HoverTipCard, PANEL_HELP, panelExplain } from '../onboarding'
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
import { syncAttacksHeldFromInventory } from './attacksInventorySync'

export { syncAttacksHeldFromInventory }

export type AttackSourceKind = 'weapon' | 'artifact' | 'custom' | 'race' | 'class'

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

export function isClassMartialArtsAttack(
  attack: Pick<WeaponAttack, 'id' | 'source_kind'>,
): boolean {
  return attack.source_kind === 'class' || isMonkUnarmedAttack(attack)
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
  /** Active fighting style id (archery → +2 on ranged attacks). */
  fightingStyleId?: string | null
  /** Monk Martial Arts die (e.g. "1к10") — overrides monk weapon / unarmed damage. */
  martialArtsDie?: string | null
  /** Active Artificer infusion weapon bonuses (Enhanced Weapon / …). */
  infusionAttackBonus?: number
  infusionDamageBonus?: number
}

/** Empty custom attack card («Своё» / Добавить атаку). */
export function createCustomAttack(): WeaponAttack {
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

function sourceFromCatalog(entry: CatalogEntry): AttackSourceKind {
  if (entry.kind === 'weapon') return 'weapon'
  if (entry.kind === 'item') return 'artifact'
  return 'custom'
}

function sourceLabel(kind: AttackSourceKind): string {
  if (kind === 'weapon') return 'Оружие'
  if (kind === 'artifact') return 'Артефакт'
  if (kind === 'race') return 'Раса'
  if (kind === 'class') return 'Класс'
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
  fightingStyleId = null,
  martialArtsDie = null,
  infusionAttackBonus = 0,
  infusionDamageBonus = 0,
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
    <Panel
      title="Атаки"
      className="attack-panel"
      titleTip={<HoverTipCard tip={panelExplain(PANEL_HELP.attacks)} />}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Оружие из инвентаря появляется здесь само. «В руках» — держишь сейчас; убрать = в ножны
          (в бою это действие). Владение — из блока «Владения снаряжением».
        </Text>

        <div className="attack-panel__toolbar">
          <Button variant="secondary" onClick={() => onChange([...weapons, createCustomAttack()])}>
            Добавить атаку
          </Button>
        </div>

        {weapons.length === 0 ? (
          <Text tone="muted">Пока нет атак — добавь первую или оружие в инвентарь.</Text>
        ) : null}

        {weapons.map((attack) => {
          const raceNatural = isRaceNaturalWeaponAttack(attack)
          const classMa = isClassMartialArtsAttack(attack)
          const monkWeapon =
            Boolean(martialArtsDie) &&
            (classMa || isMonkWeaponName(attack.name))
          const attackAbility = monkWeapon
            ? monkAttackAbility({
                str: abilities.str,
                dex: abilities.dex,
                weaponAbility: attack.ability,
              })
            : attack.ability
          const baseDamage = monkWeapon
            ? effectiveMartialArtsDamage({
                weaponDamage: attack.damage,
                martialArtsDie,
                forceMartialArts: classMa,
              })
            : attack.damage
          const gear =
            !raceNatural && !classMa && attack.inventory_item_id && attack.held
              ? gearBonusesByItem?.[attack.inventory_item_id]
              : undefined
          const magicAtk = gear?.attackBonus ?? 0
          const magicDmg = gear?.damageBonus ?? 0
          const proficient =
            classMa ||
            isWeaponProficient({
              name: attack.name,
              weapons: weaponProficiency,
              sourceKind: attack.source_kind,
              attackId: attack.id,
            })
          const styleAtk = fightingStyleAttackBonus({
            styleId: fightingStyleId,
            weaponName: attack.name,
          })
          const infusionAtk =
            !raceNatural && !classMa ? Math.max(0, Math.floor(infusionAttackBonus)) : 0
          const infusionDmg =
            !raceNatural && !classMa ? Math.max(0, Math.floor(infusionDamageBonus)) : 0
          const attackBonus =
            abilityModifier(abilities[attackAbility]) +
            (proficient ? proficiencyBonus : 0) +
            magicAtk +
            styleAtk +
            infusionAtk
          const abilityDmg = abilityModifier(abilities[attackAbility])
          const totalDmgBonus = abilityDmg + magicDmg + infusionDmg
          const damageDisplay =
            baseDamage && totalDmgBonus
              ? `${baseDamage}${totalDmgBonus >= 0 ? '+' : ''}${totalDmgBonus}`
              : baseDamage
          const damageHero = damageDisplay || '—'
          return (
            <div
              key={attack.id}
              className={`attack-card${
                !raceNatural && !classMa && attack.inventory_item_id && !attack.held
                  ? ' attack-card--stowed'
                  : ''
              }`}
            >
              <div className="attack-card__meta">
                <span className={`attack-source attack-source--${attack.source_kind}`}>
                  {sourceLabel(attack.source_kind)}
                </span>
                {raceNatural ? (
                  <span className="attack-held-tag">природное</span>
                ) : classMa ? (
                  <span className="attack-held-tag">боевые искусства</span>
                ) : attack.inventory_item_id ? (
                  <span className="attack-held-tag">
                    {attack.held ? 'в руках' : 'убран'}
                  </span>
                ) : null}
                {attack.qty != null && attack.qty > 1 ? (
                  <span className="attack-held-tag">×{attack.qty}</span>
                ) : null}
              </div>

              <div className="attack-card__name">
                <Field label="Оружие или артефакт">
                  {raceNatural ? (
                    <Input value={attack.name} readOnly className="attack-card__name-input" />
                  ) : (
                    <CatalogCombobox
                      kinds={['weapon', 'item']}
                      edition={edition}
                      value={attack.name}
                      placeholder="Боевой молот, Молот бури…"
                      onChange={(value, selected) => applyCatalog(attack.id, value, selected)}
                    />
                  )}
                </Field>
              </div>

              <div className="attack-card__stats" aria-label="Бонус атаки и урон">
                <div className="attack-card__stat">
                  <span className="attack-card__stat-value">{formatModifier(attackBonus)}</span>
                  <span className="attack-card__stat-label">
                    атака
                    {magicAtk ? (
                      <span className="attack-card__stat-hint">
                        {' '}
                        · магия {magicAtk >= 0 ? '+' : ''}
                        {magicAtk}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="attack-card__stat-divider" aria-hidden />
                <div className="attack-card__stat">
                  <span className="attack-card__stat-value">{damageHero}</span>
                  <span className="attack-card__stat-label">
                    урон
                    {attack.damage_type ? (
                      <span className="attack-card__stat-hint"> {attack.damage_type}</span>
                    ) : null}
                  </span>
                </div>
              </div>

              <div className="attack-card__grid">
                <Field
                  label="Характеристика"
                  hint={
                    raceNatural
                      ? 'От расы'
                      : monkWeapon && attackAbility !== attack.ability
                        ? `Боевые искусства → ${ABILITY_LABELS[attackAbility]}`
                        : undefined
                  }
                >
                  {raceNatural || classMa ? (
                    <Input value={ABILITY_LABELS[attackAbility]} readOnly />
                  ) : (
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
                  )}
                </Field>
                <Field
                  label="Урон"
                  hint={
                    raceNatural
                      ? `От расы · итого ${damageDisplay || attack.damage} (+${ABILITY_LABELS[attackAbility]})`
                      : classMa
                        ? `Боевые искусства · итого ${damageDisplay || baseDamage}`
                        : monkWeapon && baseDamage !== attack.damage
                          ? `Боевые искусства · итого ${damageDisplay || baseDamage}`
                          : damageDisplay && damageDisplay !== attack.damage
                            ? `итого ${damageDisplay}`
                            : undefined
                  }
                >
                  <Input
                    value={
                      raceNatural || classMa || (monkWeapon && baseDamage !== attack.damage)
                        ? damageDisplay || baseDamage
                        : attack.damage
                    }
                    placeholder="1к8"
                    readOnly={raceNatural || classMa}
                    onChange={
                      raceNatural || classMa
                        ? undefined
                        : (event) => updateAttack(attack.id, { damage: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Тип урона"
                  hint={raceNatural ? 'От расы' : classMa ? 'Боевые искусства' : undefined}
                >
                  <Input
                    value={attack.damage_type}
                    placeholder="дробящий"
                    readOnly={raceNatural || classMa}
                    onChange={
                      raceNatural || classMa
                        ? undefined
                        : (event) =>
                            updateAttack(attack.id, { damage_type: event.target.value })
                    }
                  />
                </Field>
                {!raceNatural && !classMa ? (
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
                ) : null}
              </div>
              <div className="attack-card__footer">
                {!raceNatural && !classMa && attack.inventory_item_id && onToggleHeld ? (
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
                  title={
                    raceNatural
                      ? 'Природное оружие расы — всегда владение'
                      : classMa
                        ? 'Боевые искусства — всегда владение'
                        : 'Из владений снаряжением на листе'
                  }
                >
                  {proficient ? 'Владение' : 'Нет владения'}
                </span>
                {raceNatural ? (
                  <Text tone="muted">С расы</Text>
                ) : classMa ? (
                  <Text tone="muted">С класса</Text>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => onChange(weapons.filter((item) => item.id !== attack.id))}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </Stack>
    </Panel>
  )
}
