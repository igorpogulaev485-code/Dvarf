import {
  createCustomAttack,
  isClassMartialArtsAttack,
  isRaceNaturalWeaponAttack,
  type WeaponAttack,
} from './AttacksPanel'
import {
  effectiveMartialArtsDamage,
  isMonkWeaponName,
  monkAttackAbility,
} from '../../shared/dnd/martialArts'
import { isWeaponProficient } from './equipmentProficiency'
import type { WeaponProficiency } from './identity'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import { Button, Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'

type AttacksSettingsDialogProps = {
  open: boolean
  weapons: WeaponAttack[]
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  weaponProficiency: WeaponProficiency
  gearBonusesByItem?: Record<string, { attackBonus: number; damageBonus: number }>
  martialArtsDie?: string | null
  onChange: (weapons: WeaponAttack[]) => void
  onToggleHeld?: (attack: WeaponAttack) => void
  onClose: () => void
}

function sourceLabel(kind: WeaponAttack['source_kind'], linked: boolean): string {
  if (linked) return 'Из инвентаря'
  if (kind === 'weapon') return 'Оружие'
  if (kind === 'artifact') return 'Артефакт'
  if (kind === 'race') return 'Раса'
  if (kind === 'class') return 'Класс'
  return 'Вручную'
}

export function AttacksSettingsDialog({
  open,
  weapons,
  abilities,
  proficiencyBonus,
  weaponProficiency,
  gearBonusesByItem,
  martialArtsDie = null,
  onChange,
  onToggleHeld,
  onClose,
}: AttacksSettingsDialogProps) {
  function updateAttack(id: string, patch: Partial<WeaponAttack>) {
    onChange(weapons.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function addCustom() {
    onChange([
      ...weapons,
      {
        ...createCustomAttack(),
        name: 'Своя атака',
        damage: '1d4',
        damage_type: '',
      },
    ])
  }

  return (
    <Dialog
      open={open}
      title="Настройки атак"
      size="wide"
      primaryLabel="Готово"
      onPrimary={onClose}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
    >
      <Stack gap={14} className="attacks-settings">
        <Text tone="muted">
          Ручные правки и «Своё». Официальное оружие — из инвентаря (сцена Исследование). Броски,
          ресурсы и расходники остаются в компакте.
        </Text>

        <div className="attacks-settings__toolbar">
          <Button variant="secondary" onClick={addCustom}>
            Своё
          </Button>
        </div>

        {weapons.length === 0 ? (
          <Text tone="muted">
            Пока нет атак — добавь оружие в инвентарь или нажми «Своё».
          </Text>
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
          const abilityDmg = abilityModifier(abilities[attackAbility])
          const attackBonus =
            abilityDmg + (proficient ? proficiencyBonus : 0) + magicAtk
          const totalDmgBonus = abilityDmg + magicDmg
          const damageDisplay =
            baseDamage && totalDmgBonus
              ? `${baseDamage}${totalDmgBonus >= 0 ? '+' : ''}${totalDmgBonus}`
              : baseDamage
          const damageHero = damageDisplay || '—'
          const linked = Boolean(attack.inventory_item_id)

          return (
            <div
              key={attack.id}
              className={`attack-card${
                !raceNatural && !classMa && linked && !attack.held
                  ? ' attack-card--stowed'
                  : ''
              }`}
            >
              <div className="attack-card__meta">
                <span className={`attack-source attack-source--${attack.source_kind}`}>
                  {sourceLabel(attack.source_kind, linked)}
                </span>
                {raceNatural ? (
                  <span className="attack-held-tag">природное</span>
                ) : classMa ? (
                  <span className="attack-held-tag">боевые искусства</span>
                ) : linked ? (
                  <span className="attack-held-tag">
                    {attack.held ? 'в руках' : 'убран'}
                  </span>
                ) : (
                  <span className="attack-held-tag">атака на столе</span>
                )}
                {attack.qty != null && attack.qty > 1 ? (
                  <span className="attack-held-tag">×{attack.qty}</span>
                ) : null}
              </div>

              <div className="attack-card__name">
                <Field
                  label="Название"
                  hint={
                    linked
                      ? 'Из инвентаря — имя правится там'
                      : raceNatural
                        ? 'С расы'
                        : classMa
                          ? 'С класса'
                          : undefined
                  }
                >
                  <Input
                    value={attack.name}
                    className="attack-card__name-input"
                    readOnly={raceNatural || classMa || linked}
                    placeholder="Своя атака"
                    onChange={
                      raceNatural || classMa || linked
                        ? undefined
                        : (event) => updateAttack(attack.id, { name: event.target.value })
                    }
                  />
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
                      ? `От расы (+${ABILITY_LABELS[attackAbility]})`
                      : classMa || (monkWeapon && baseDamage !== attack.damage)
                        ? `Боевые искусства · ${damageDisplay || baseDamage}`
                        : magicDmg
                          ? `с магией ${damageDisplay} (${magicDmg >= 0 ? '+' : ''}${magicDmg})`
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
                {!raceNatural && !classMa && linked && onToggleHeld ? (
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
                    title={
                      linked
                        ? 'Убирает строку атаки со стола. Предмет в инвентаре останется.'
                        : 'Убирает эту атаку со стола.'
                    }
                    onClick={() => onChange(weapons.filter((item) => item.id !== attack.id))}
                  >
                    {linked ? 'Убрать атаку со стола' : 'Убрать атаку'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </Stack>
    </Dialog>
  )
}
