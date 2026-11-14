import { HoverTipCard, PANEL_HELP, panelExplain } from '../onboarding'
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
    <Panel
      title="Владения снаряжением"
      titleTip={<HoverTipCard tip={panelExplain(PANEL_HELP.proficiencies)} />}
    >
      <Stack gap={14}>
        <div>
          <Text tone="muted" className="ownership-editor__section-label">
            Доспехи
          </Text>
          <div className="chip-row">
            {ARMOR_PROF_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`sheet-chip${armor[option.key] ? ' is-on' : ''}`}
                aria-pressed={armor[option.key]}
                onClick={() =>
                  onChange({
                    armor: { ...armor, [option.key]: !armor[option.key] },
                  })
                }
              >
                {armor[option.key] ? (
                  <span className="sheet-chip__check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Text tone="muted" className="ownership-editor__section-label">
            Оружие — категории
          </Text>
          <div className="chip-row">
            {WEAPON_PROF_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`sheet-chip${weapons[option.key] ? ' is-on' : ''}`}
                aria-pressed={weapons[option.key]}
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
                {weapons[option.key] ? (
                  <span className="sheet-chip__check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
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
