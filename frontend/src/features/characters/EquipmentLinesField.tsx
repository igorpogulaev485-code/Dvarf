/** Shared PHB a/b/c equipment line picker for class setup dialogs. */

import {
  weaponPickCount,
  type ClassEquipmentLine,
  type ClassEquipmentLinePick,
  type StartingEquipmentPackage,
} from '../../shared/dnd/classGrants'
import { listWeaponPresetsByGroup } from '../../shared/dnd/weaponPresets'
import { Field, Stack, Text } from '../../ui'

type EquipmentLinesFieldProps = {
  lines: ClassEquipmentLine[]
  linePicks: Record<string, ClassEquipmentLinePick>
  equipmentPackageId: string | null
  packages: StartingEquipmentPackage[]
  onSelectOption: (lineId: string, optionId: string) => void
  onSelectWeapon: (lineId: string, weaponName: string, slotIndex?: number) => void
  onSelectPackage: (packageId: string) => void
}

export function EquipmentLinesField({
  lines,
  linePicks,
  equipmentPackageId,
  packages,
  onSelectOption,
  onSelectWeapon,
  onSelectPackage,
}: EquipmentLinesFieldProps) {
  return (
    <Field label="Стартовое снаряжение (по строкам)">
      <Stack gap={12}>
        {lines.map((line) => {
          const pick = linePicks[line.id]
          const selectedOption = line.options.find((row) => row.id === pick?.optionId)
          const weaponNeed = selectedOption ? weaponPickCount(selectedOption) : 0
          const pickList = selectedOption?.pickFrom
          return (
            <div key={line.id}>
              <Text>
                <strong>{line.labelRu}</strong>
              </Text>
              <div className="chip-row" style={{ marginTop: 6 }}>
                {line.options.map((option) => {
                  const on = pick?.optionId === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`sheet-chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      title={option.noteRu}
                      onClick={() => onSelectOption(line.id, option.id)}
                    >
                      {option.labelRu}
                      {option.noteRu ? ' *' : ''}
                    </button>
                  )
                })}
              </div>
              {selectedOption?.noteRu ? (
                <Text tone="muted">{selectedOption.noteRu}</Text>
              ) : null}
              {pickList?.length ? (
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {pickList.map((name) => {
                    const on = pick?.weaponName === name
                    return (
                      <button
                        key={name}
                        type="button"
                        className={`sheet-chip${on ? ' is-on' : ''}`}
                        aria-pressed={on}
                        onClick={() => onSelectWeapon(line.id, name)}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              ) : null}
              {selectedOption?.pickWeapon && weaponNeed === 1 ? (
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {listWeaponPresetsByGroup(selectedOption.pickWeapon).map((weapon) => {
                    const on = pick?.weaponName === weapon.labelRu
                    return (
                      <button
                        key={weapon.labelRu}
                        type="button"
                        className={`sheet-chip${on ? ' is-on' : ''}`}
                        aria-pressed={on}
                        onClick={() => onSelectWeapon(line.id, weapon.labelRu)}
                      >
                        {weapon.labelRu}
                      </button>
                    )
                  })}
                </div>
              ) : null}
              {selectedOption?.pickWeapon && weaponNeed > 1
                ? Array.from({ length: weaponNeed }, (_, slot) => (
                    <div key={`${line.id}-slot-${slot}`} style={{ marginTop: 8 }}>
                      <Text tone="muted">Оружие {slot + 1}</Text>
                      <div className="chip-row" style={{ marginTop: 4 }}>
                        {listWeaponPresetsByGroup(selectedOption.pickWeapon!).map((weapon) => {
                          const on = (pick?.weaponNames ?? [])[slot] === weapon.labelRu
                          return (
                            <button
                              key={`${slot}-${weapon.labelRu}`}
                              type="button"
                              className={`sheet-chip${on ? ' is-on' : ''}`}
                              aria-pressed={on}
                              onClick={() => onSelectWeapon(line.id, weapon.labelRu, slot)}
                            >
                              {weapon.labelRu}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                : null}
            </div>
          )
        })}
        {packages.map((pack) => {
          const on = equipmentPackageId === pack.id
          return (
            <button
              key={pack.id}
              type="button"
              className={`sheet-chip sheet-chip--block${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onSelectPackage(pack.id)}
            >
              <strong className="sheet-chip__title">{pack.labelRu}</strong>
              <div className="sheet-chip__meta">{pack.summary}</div>
            </button>
          )
        })}
      </Stack>
    </Field>
  )
}
