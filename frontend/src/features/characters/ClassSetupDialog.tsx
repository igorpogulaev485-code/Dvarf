import { useEffect, useMemo, useState } from 'react'
import {
  equipmentPackagesFor,
  packageForMode,
  skillOptionsForPackage,
  type ClassEquipmentFocusPick,
  type ClassGrantDef,
  type ClassGrantPicks,
} from '../../shared/dnd/classGrants'
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
  const equipmentPackages = def && mode === 'start' ? equipmentPackagesFor(def) : []
  const blockedSkills = useMemo(() => new Set(blockedSkillKeys), [blockedSkillKeys])
  const blockedTools = useMemo(
    () => new Set(blockedToolNames.map((name) => name.trim().toLowerCase())),
    [blockedToolNames],
  )

  const [skills, setSkills] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [equipmentPackageId, setEquipmentPackageId] = useState<string | null>(null)
  const [focusSelection, setFocusSelection] = useState<FocusSelection | null>(null)

  useEffect(() => {
    if (!open) return
    setSkills([])
    setTools([])
    setEquipmentPackageId(null)
    setFocusSelection(null)
  }, [open, def?.slug, mode])

  const selectedPack = useMemo(
    () => equipmentPackages.find((row) => row.id === equipmentPackageId) ?? null,
    [equipmentPackages, equipmentPackageId],
  )

  const focusPlaceholder = useMemo(() => {
    if (!selectedPack) return null
    for (const item of selectedPack.items) {
      const kind = detectFocusPlaceholder(item.name)
      if (kind) return { name: item.name, kind }
    }
    return null
  }, [selectedPack])

  useEffect(() => {
    setFocusSelection(null)
  }, [equipmentPackageId])

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

  const equipmentOk =
    mode !== 'start' ||
    equipmentPackages.length === 0 ||
    Boolean(equipmentPackageId)

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
        })
      }}
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          {mode === 'start'
            ? 'Выбери навыки, инструменты и снаряжение. Серые — уже с предыстории.'
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

        {mode === 'start' && equipmentPackages.length > 0 ? (
          <Field label="Стартовое снаряжение">
            <Stack gap={8}>
              {equipmentPackages.map((pack) => {
                const on = equipmentPackageId === pack.id
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={`sheet-chip${on ? ' is-on' : ''}`}
                    style={{ display: 'block', width: '100%', textAlign: 'left' }}
                    onClick={() => setEquipmentPackageId(pack.id)}
                  >
                    <strong>{pack.labelRu}</strong>
                    <div style={{ opacity: 0.85, fontWeight: 400 }}>{pack.summary}</div>
                  </button>
                )
              })}
              <button
                type="button"
                className={`sheet-chip${equipmentPackageId === 'skip' ? ' is-on' : ''}`}
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => setEquipmentPackageId('skip')}
              >
                <strong>Без снаряжения</strong>
                <div style={{ opacity: 0.85, fontWeight: 400 }}>
                  Оставить инвентарь как есть — заполню сам
                </div>
              </button>
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
