import { useEffect, useMemo, useState } from 'react'
import {
  packageForMode,
  skillOptionsForPackage,
  type ClassGrantDef,
  type ClassGrantPicks,
} from '../../shared/dnd/classGrants'
import { SKILL_DEFS } from './sheetTypes'
import { Dialog, Field, Stack, Text } from '../../ui'

type ClassGrantPickerDialogProps = {
  open: boolean
  def: ClassGrantDef | null
  mode: 'start' | 'multiclass'
  onConfirm: (picks: ClassGrantPicks) => void
  onClose: () => void
}

function skillLabel(key: string): string {
  return SKILL_DEFS.find((item) => item.key === key)?.label ?? key
}

export function ClassGrantPickerDialog({
  open,
  def,
  mode,
  onConfirm,
  onClose,
}: ClassGrantPickerDialogProps) {
  const skillOptions = useMemo(() => {
    if (!def) return []
    return skillOptionsForPackage(packageForMode(def, mode))
  }, [def, mode])
  const toolOptions = def ? packageForMode(def, mode).toolChoices?.from ?? [] : []
  const pkg = def ? packageForMode(def, mode) : null
  const skillNeed = pkg?.skillChoices?.count ?? 0
  const toolNeed = pkg?.toolChoices?.count ?? 0

  const [skills, setSkills] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setSkills([])
    setTools([])
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

  const canConfirm =
    Boolean(def && pkg) && skills.length === skillNeed && tools.length === toolNeed

  if (!def || !pkg) return null

  return (
    <Dialog
      open={open}
      title={`${def.labelRu}: выбор владений`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      size="wide"
      onPrimary={() => {
        if (!canConfirm) return
        onConfirm({ skills, tools })
      }}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          {mode === 'start'
            ? 'Стартовый пакет класса (без снаряжения): выбери то, что требует PHB.'
            : 'Владения при мультиклассе (без снаряжения): выбери по таблице PHB.'}
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

        {!canConfirm ? (
          <Text tone="muted">Отметь нужное число навыков и инструментов.</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
