import { useEffect, useMemo, useState } from 'react'
import {
  packageForMode,
  skillOptionsForPackage,
  startingEquipmentFor,
  type ClassGrantDef,
  type ClassGrantPicks,
} from '../../shared/dnd/classGrants'
import { SKILL_DEFS } from './sheetTypes'
import { Dialog, Field, Input, Stack, Text } from '../../ui'

type ClassSetupDialogProps = {
  open: boolean
  def: ClassGrantDef | null
  mode: 'start' | 'multiclass'
  onConfirm: (picks: ClassGrantPicks) => void
  onClose: () => void
}

function skillLabel(key: string): string {
  return SKILL_DEFS.find((item) => item.key === key)?.label ?? key
}

export function ClassSetupDialog({
  open,
  def,
  mode,
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
  const equipmentPackages = def && mode === 'start' ? startingEquipmentFor(def.slug) : []

  const [skills, setSkills] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [equipmentPackageId, setEquipmentPackageId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSkills([])
    setTools([])
    setEquipmentPackageId(null)
  }, [open, def?.slug, mode])

  function toggleSkill(key: string) {
    setSkills((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key)
      if (prev.length >= skillNeed) return prev
      return [...prev, key]
    })
  }

  function toggleTool(name: string) {
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

  const canConfirm =
    Boolean(def && pkg) &&
    skills.length === skillNeed &&
    tools.length === toolNeed &&
    equipmentOk

  if (!def || !pkg) return null

  return (
    <Dialog
      open={open}
      title={`${def.labelRu}: настройка класса`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      size="wide"
      onPrimary={() => {
        if (!canConfirm) return
        onConfirm({
          skills,
          tools,
          equipmentPackageId: mode === 'start' ? equipmentPackageId : null,
        })
      }}
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          {mode === 'start'
            ? 'Выбери все развилки старта: навыки, инструменты и стартовое снаряжение (или золото). Классовые способности пока вручную.'
            : 'Мультикласс: только владения из таблицы PHB (без стартового снаряжения).'}
        </Text>

        {skillNeed > 0 ? (
          <Field label={`Навыки (${skills.length}/${skillNeed})`}>
            <div className="chip-row">
              {skillOptions.map((key) => {
                const on = skills.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    className={`sheet-chip${on ? ' is-on' : ''}`}
                    onClick={() => toggleSkill(key)}
                  >
                    {skillLabel(key)}
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
                const on = tools.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    className={`sheet-chip${on ? ' is-on' : ''}`}
                    onClick={() => toggleTool(name)}
                  >
                    {name}
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
        <Text tone="muted">
          Свой класс: укажи, как он будет называться на листе. Владения, навыки, снаряжение и
          способности задаёшь сам — ничего из PHB не подставляем.
        </Text>
        <Field label="Название на листе" hint="Например: Ведьмак, Рыцарь пустоты…">
          <Input
            value={name}
            placeholder="Название класса"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        {!canConfirm ? <Text tone="muted">Введи название класса.</Text> : null}
      </Stack>
    </Dialog>
  )
}
