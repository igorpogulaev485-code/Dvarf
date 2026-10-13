import {
  createCustomAttack,
  isRaceNaturalWeaponAttack,
  type WeaponAttack,
} from './AttacksPanel'
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
  onChange: (weapons: WeaponAttack[]) => void
  onToggleHeld?: (attack: WeaponAttack) => void
  onClose: () => void
}

function sourceLabel(kind: WeaponAttack['source_kind']): string {
  if (kind === 'weapon') return 'Оружие'
  if (kind === 'artifact') return 'Артефакт'
  if (kind === 'race') return 'Раса'
  return 'Своё'
}

export function AttacksSettingsDialog({
  open,
  weapons,
  abilities,
  proficiencyBonus,
  weaponProficiency,
  gearBonusesByItem,
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
          Оверрайды и «Своё». Официальное оружие — из инвентаря (сцена Исследование). Броски,
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
          const gear =
            !raceNatural && attack.inventory_item_id && attack.held
              ? gearBonusesByItem?.[attack.inventory_item_id]
              : undefined
          const magicAtk = gear?.attackBonus ?? 0
          const magicDmg = gear?.damageBonus ?? 0
          const proficient = isWeaponProficient({
            name: attack.name,
            weapons: weaponProficiency,
            sourceKind: attack.source_kind,
            attackId: attack.id,
          })
          const attackBonus =
            abilityModifier(abilities[attack.ability]) +
            (proficient ? proficiencyBonus : 0) +
            magicAtk
          const damageDisplay =
            magicDmg && attack.damage
              ? `${attack.damage}${magicDmg >= 0 ? '+' : ''}${magicDmg}`
              : attack.damage
          const damageHero = damageDisplay || '—'
          const linked = Boolean(attack.inventory_item_id)

          return (
            <div
              key={attack.id}
              className={`attack-card${
                !raceNatural && linked && !attack.held ? ' attack-card--stowed' : ''
              }`}
            >
              <div className="attack-card__meta">
                <span className={`attack-source attack-source--${attack.source_kind}`}>
                  {sourceLabel(attack.source_kind)}
                </span>
                {raceNatural ? (
                  <span className="attack-held-tag">природное</span>
                ) : linked ? (
                  <span className="attack-held-tag">
                    {attack.held ? 'в руках' : 'убран'}
                  </span>
                ) : null}
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
                        : undefined
                  }
                >
                  <Input
                    value={attack.name}
                    className="attack-card__name-input"
                    readOnly={raceNatural || linked}
                    placeholder="Своя атака"
                    onChange={
                      raceNatural || linked
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
                  hint={raceNatural ? 'От расы' : undefined}
                >
                  {raceNatural ? (
                    <Input value={ABILITY_LABELS[attack.ability]} readOnly />
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
                      ? `От расы (+${ABILITY_LABELS[attack.ability]})`
                      : magicDmg
                        ? `с магией ${damageDisplay} (${magicDmg >= 0 ? '+' : ''}${magicDmg})`
                        : undefined
                  }
                >
                  <Input
                    value={attack.damage}
                    placeholder="1к8"
                    readOnly={raceNatural}
                    onChange={
                      raceNatural
                        ? undefined
                        : (event) => updateAttack(attack.id, { damage: event.target.value })
                    }
                  />
                </Field>
                <Field label="Тип урона" hint={raceNatural ? 'От расы' : undefined}>
                  <Input
                    value={attack.damage_type}
                    placeholder="дробящий"
                    readOnly={raceNatural}
                    onChange={
                      raceNatural
                        ? undefined
                        : (event) =>
                            updateAttack(attack.id, { damage_type: event.target.value })
                    }
                  />
                </Field>
                {!raceNatural ? (
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
                {!raceNatural && linked && onToggleHeld ? (
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
                      : 'Из владений снаряжением на листе'
                  }
                >
                  {proficient ? 'Владение' : 'Нет владения'}
                </span>
                {raceNatural ? (
                  <Text tone="muted">С расы</Text>
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
    </Dialog>
  )
}
