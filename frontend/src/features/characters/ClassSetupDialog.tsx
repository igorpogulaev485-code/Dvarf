import { useEffect, useMemo, useState } from 'react'
import {
  buildItemsFromEquipmentLines,
  equipmentLinesFor,
  equipmentPackagesFor,
  grantNeedsSetupDialog,
  packageForMode,
  PHB_LINES_PACKAGE_ID,
  skillOptionsForPackage,
  validateEquipmentLinePicks,
  type ClassEquipmentFocusPick,
  type ClassEquipmentLinePick,
  type ClassGrantDef,
  type ClassGrantPicks,
} from '../../shared/dnd/classGrants'
import { listWeaponPresetsByGroup } from '../../shared/dnd/weaponPresets'
import type { RulesEdition } from '../../shared/api/characters'
import { SKILL_DEFS } from './sheetTypes'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import { FocusCatalogSelect } from './FocusCatalogSelect'
import {
  detectFocusPlaceholder,
  type FocusSelection,
} from './focusCatalog'
import type { FocusKind } from './spellFocus'

type ClassSetupDialogProps = {
  open: boolean
  def: ClassGrantDef | null
  mode: 'start' | 'multiclass'
  /** Already from background — cannot pick again. */
  blockedSkillKeys?: string[]
  blockedToolNames?: string[]
  edition: RulesEdition
  onConfirm: (picks: ClassGrantPicks) => void
  onClose: () => void
}

function skillLabel(key: string): string {
  return SKILL_DEFS.find((item) => item.key === key)?.label ?? key
}

function toPick(selection: FocusSelection): ClassEquipmentFocusPick {
  return {
    name: selection.name,
    catalog_id: selection.catalog_id,
    cost_gp: selection.cost_gp,
    weight_lb: selection.weight_lb,
    focus_kind: selection.focus_kind,
    custom: selection.custom,
  }
}

export function ClassSetupDialog({
  open,
  def,
  mode,
  blockedSkillKeys = [],
  blockedToolNames = [],
  edition,
  onConfirm,
  onClose,
}: ClassSetupDialogProps) {
  const pkg = def ? packageForMode(def, mode) : null
  const skillNeed = pkg?.skillChoices?.count ?? 0
  const toolNeed = pkg?.toolChoices?.count ?? 0
  const skillOptions = useMemo(() => {
    if (!def) return []
    return skillOptionsForPackage(packageForMode(def, mode))
  }, [def, mode])
  const toolOptions = def ? packageForMode(def, mode).toolChoices?.from ?? [] : []
  const equipmentLines = def && mode === 'start' ? equipmentLinesFor(def) : []
  const equipmentPackages = def && mode === 'start' ? equipmentPackagesFor(def) : []
  const blockedSkills = useMemo(() => new Set(blockedSkillKeys), [blockedSkillKeys])
  const blockedTools = useMemo(
    () => new Set(blockedToolNames.map((name) => name.trim().toLowerCase())),
    [blockedToolNames],
  )

  const [skills, setSkills] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [equipmentPackageId, setEquipmentPackageId] = useState<string | null>(null)
  const [linePicks, setLinePicks] = useState<Record<string, ClassEquipmentLinePick>>({})
  const [focusSelection, setFocusSelection] = useState<FocusSelection | null>(null)

  useEffect(() => {
    if (!open || !def) return
    const lines = mode === 'start' ? equipmentLinesFor(def) : []
    setSkills([])
    setTools([])
    setEquipmentPackageId(lines.length > 0 ? PHB_LINES_PACKAGE_ID : null)
    const initial: Record<string, ClassEquipmentLinePick> = {}
    for (const line of lines) {
      if (line.options.length === 1) {
        initial[line.id] = { optionId: line.options[0]!.id }
      }
    }
    setLinePicks(initial)
    setFocusSelection(null)
  }, [open, def, mode])

  // Multiclass with only fixed armor/weapons (друид, колдун…): nothing to pick —
  // apply empty picks immediately so the dialog does not sit waiting for «Отмена».
  useEffect(() => {
    if (!open || !def || mode !== 'multiclass') return
    if (grantNeedsSetupDialog(def, mode)) return
    onConfirm({
      skills: [],
      tools: [],
      equipmentPackageId: null,
      equipmentFocusPick: null,
      equipmentLinePicks: {},
    })
    // Intentionally omit onConfirm: parent often passes an inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/def/mode gate the auto-apply
  }, [open, def, mode])

  const selectedPack = useMemo(
    () => equipmentPackages.find((row) => row.id === equipmentPackageId) ?? null,
    [equipmentPackages, equipmentPackageId],
  )

  const lineItems = useMemo(() => {
    if (equipmentPackageId !== PHB_LINES_PACKAGE_ID || equipmentLines.length === 0) {
      return null
    }
    if (validateEquipmentLinePicks({ lines: equipmentLines, picks: linePicks })) {
      return null
    }
    return buildItemsFromEquipmentLines({ lines: equipmentLines, picks: linePicks })
  }, [equipmentPackageId, equipmentLines, linePicks])

  const focusPlaceholder = useMemo(() => {
    const items =
      equipmentPackageId === PHB_LINES_PACKAGE_ID
        ? lineItems ?? []
        : selectedPack?.items ?? []
    for (const row of items) {
      const kind = detectFocusPlaceholder(row.name)
      if (kind) return { name: row.name, kind }
    }
    return null
  }, [equipmentPackageId, lineItems, selectedPack])

  useEffect(() => {
    setFocusSelection(null)
  }, [equipmentPackageId, linePicks])

  function toggleSkill(key: string) {
    if (blockedSkills.has(key)) return
    setSkills((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key)
      if (prev.length >= skillNeed) return prev
      return [...prev, key]
    })
  }

  function toggleTool(name: string) {
    if (blockedTools.has(name.trim().toLowerCase())) return
    setTools((prev) => {
      if (prev.includes(name)) return prev.filter((item) => item !== name)
      if (prev.length >= toolNeed) return prev
      return [...prev, name]
    })
  }

  function setLineOption(lineId: string, optionId: string) {
    setEquipmentPackageId(PHB_LINES_PACKAGE_ID)
    setLinePicks((prev) => ({
      ...prev,
      [lineId]: { optionId, weaponName: null },
    }))
  }

  function setLineWeapon(lineId: string, weaponName: string) {
    setLinePicks((prev) => {
      const current = prev[lineId]
      if (!current) return prev
      return { ...prev, [lineId]: { ...current, weaponName } }
    })
  }

  const equipmentOk =
    mode !== 'start' ||
    (equipmentLines.length === 0 && equipmentPackages.length === 0) ||
    (equipmentPackageId === PHB_LINES_PACKAGE_ID
      ? !validateEquipmentLinePicks({ lines: equipmentLines, picks: linePicks })
      : Boolean(equipmentPackageId))

  const focusOk = !focusPlaceholder || focusSelection != null

  const canConfirm =
    Boolean(def && pkg) &&
    skills.length === skillNeed &&
    tools.length === toolNeed &&
    equipmentOk &&
    focusOk

  if (!def || !pkg) return null

  return (
    <Dialog
      open={open}
      title={`${def.labelRu}: настройка класса`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      size="wide"
      primaryDisabled={!canConfirm}
      onPrimary={() => {
        if (!canConfirm) return
        onConfirm({
          skills,
          tools,
          equipmentPackageId: mode === 'start' ? equipmentPackageId : null,
          equipmentFocusPick: focusSelection ? toPick(focusSelection) : null,
          equipmentLinePicks:
            mode === 'start' && equipmentPackageId === PHB_LINES_PACKAGE_ID
              ? linePicks
              : {},
        })
      }}
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          {mode === 'start'
            ? equipmentLines.length > 0
              ? 'Выбери навыки и снаряжение по каждой строке PHB. Серые навыки — уже с предыстории.'
              : 'Выбери навыки, инструменты и снаряжение. Серые — уже с предыстории.'
            : 'Мультикласс: только владения из таблицы PHB (без стартового снаряжения).'}
        </Text>

        {skillNeed > 0 ? (
          <Field label={`Навыки (${skills.length}/${skillNeed})`}>
            <div className="chip-row">
              {skillOptions.map((key) => {
                const blocked = blockedSkills.has(key)
                const on = !blocked && skills.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={blocked}
                    title={blocked ? 'Уже есть с предыстории' : undefined}
                    className={`sheet-chip${on ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}`}
                    onClick={() => toggleSkill(key)}
                  >
                    {skillLabel(key)}
                    {blocked ? ' · уже есть' : ''}
                  </button>
                )
              })}
            </div>
          </Field>
        ) : null}

        {toolNeed > 0 ? (
          <Field label={`Инструменты (${tools.length}/${toolNeed})`}>
            <div className="chip-row">
              {toolOptions.map((name) => {
                const blocked = blockedTools.has(name.trim().toLowerCase())
                const on = !blocked && tools.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={blocked}
                    title={blocked ? 'Уже есть с предыстории' : undefined}
                    className={`sheet-chip${on ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}`}
                    onClick={() => toggleTool(name)}
                  >
                    {name}
                    {blocked ? ' · уже есть' : ''}
                  </button>
                )
              })}
            </div>
          </Field>
        ) : null}

        {mode === 'start' && equipmentLines.length > 0 ? (
          <Field label="Стартовое снаряжение (по строкам)">
            <Stack gap={12}>
              {equipmentLines.map((line) => {
                const pick = linePicks[line.id]
                const selectedOption = line.options.find((row) => row.id === pick?.optionId)
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
                            onClick={() => setLineOption(line.id, option.id)}
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
                    {selectedOption?.pickWeapon ? (
                      <div className="chip-row" style={{ marginTop: 8 }}>
                        {listWeaponPresetsByGroup(selectedOption.pickWeapon).map((weapon) => {
                          const on = pick?.weaponName === weapon.labelRu
                          return (
                            <button
                              key={weapon.labelRu}
                              type="button"
                              className={`sheet-chip${on ? ' is-on' : ''}`}
                              aria-pressed={on}
                              onClick={() => setLineWeapon(line.id, weapon.labelRu)}
                            >
                              {weapon.labelRu}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
              {equipmentPackages.map((pack) => {
                const on = equipmentPackageId === pack.id
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={`sheet-chip sheet-chip--block${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => setEquipmentPackageId(pack.id)}
                  >
                    <strong className="sheet-chip__title">{pack.labelRu}</strong>
                    <div className="sheet-chip__meta">{pack.summary}</div>
                  </button>
                )
              })}
            </Stack>
          </Field>
        ) : null}

        {mode === 'start' && equipmentLines.length === 0 && equipmentPackages.length > 0 ? (
          <Field label="Стартовое снаряжение">
            <Stack gap={8}>
              {equipmentPackages.map((pack) => {
                const on = equipmentPackageId === pack.id
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={`sheet-chip sheet-chip--block${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => setEquipmentPackageId(pack.id)}
                  >
                    <strong className="sheet-chip__title">{pack.labelRu}</strong>
                    <div className="sheet-chip__meta">{pack.summary}</div>
                  </button>
                )
              })}
            </Stack>
          </Field>
        ) : null}

        {focusPlaceholder ? (
          <Stack gap={8}>
            <Text>
              В пакете «{focusPlaceholder.name}» — выбери конкретный предмет из справочника
              или своё название.
            </Text>
            <FocusCatalogSelect
              edition={edition}
              family={focusPlaceholder.kind as FocusKind}
              value={focusSelection}
              onChange={setFocusSelection}
              label="Фокус / символ"
              allowFamilyPick={focusPlaceholder.kind === 'any'}
              phbStartingOnly
            />
          </Stack>
        ) : null}

        {!canConfirm ? (
          <Text tone="muted">Отметь все обязательные развилки, чтобы продолжить.</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}

type HomebrewClassDialogProps = {
  open: boolean
  initialName?: string
  onConfirm: (name: string) => void
  onClose: () => void
}

export function HomebrewClassDialog({
  open,
  initialName = '',
  onConfirm,
  onClose,
}: HomebrewClassDialogProps) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (!open) return
    setName(initialName)
  }, [open, initialName])

  const trimmed = name.trim()
  const canConfirm = trimmed.length > 0

  return (
    <Dialog
      open={open}
      title="Хомбрю-класс"
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      onPrimary={() => {
        if (!canConfirm) return
        onConfirm(trimmed)
      }}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Field label="Название класса">
          <Input
            value={name}
            placeholder="Например: Ведьмак"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </Stack>
    </Dialog>
  )
}
