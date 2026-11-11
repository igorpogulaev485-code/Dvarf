import { Panel, Stack, Text } from '../../ui'
import {
  ARMOR_PROF_OPTIONS,
  WEAPON_PROF_OPTIONS,
  type ArmorProficiency,
  type WeaponProficiency,
} from './identity'
import { NameListPicker } from './NameListPicker'
import { WEAPON_EXTRA_PRESETS } from './weaponProficiencyExtras'

type EquipmentProficienciesPanelProps = {
  armor: ArmorProficiency
  weapons: WeaponProficiency
  onChange: (patch: {
    armor?: ArmorProficiency
    weapons?: WeaponProficiency
  }) => void
}

export function EquipmentProficienciesPanel({
  armor,
  weapons,
  onChange,
}: EquipmentProficienciesPanelProps) {
  const extras = weapons.extras ?? []

  return (
    <Panel title="Владения снаряжением">
      <Stack gap={14}>
        <Text tone="muted">
          Отсюда считается, можно ли надеть доспех/щит и даёт ли оружие бонус мастерства в атаках —
          на карточке атаки это не переключается вручную.
        </Text>
        <div>
          <Text tone="muted">Доспехи</Text>
          <div className="chip-row">
            {ARMOR_PROF_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`sheet-chip${armor[option.key] ? ' is-on' : ''}`}
                onClick={() =>
                  onChange({
                    armor: { ...armor, [option.key]: !armor[option.key] },
                  })
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Text tone="muted">Оружие — категории</Text>
          <div className="chip-row">
            {WEAPON_PROF_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`sheet-chip${weapons[option.key] ? ' is-on' : ''}`}
                onClick={() =>
                  onChange({
                    weapons: {
                      ...weapons,
                      extras,
                      [option.key]: !weapons[option.key],
                    },
                  })
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <NameListPicker
          title="Отдельные виды оружия"
          hint="Если владеешь не всем воинским, а например только рапирой и коротким мечом — добавь сюда. Как языки: пресет или свой текст."
          presets={WEAPON_EXTRA_PRESETS}
          selected={extras}
          placeholder="Найти оружие…"
          onChange={(next) =>
            onChange({
              weapons: { ...weapons, extras: next },
            })
          }
        />
      </Stack>
    </Panel>
  )
}
