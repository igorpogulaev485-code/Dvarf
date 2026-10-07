import { useEffect, useMemo, useState } from 'react'
import {
  emptySubclassPicks,
  validateSubclassPicks,
  type SubclassGrantDef,
  type SubclassGrantPicks,
} from '../../shared/dnd/subclassGrants'
import { SKILL_DEFS } from './sheetTypes'
import { LANGUAGE_PRESETS } from './languagesTools'
import { Dialog, Field, Input, Stack, Text } from '../../ui'

type SubclassSetupDialogProps = {
  open: boolean
  def: SubclassGrantDef | null
  onConfirm: (picks: SubclassGrantPicks) => void
  onClose: () => void
}

function skillLabel(key: string): string {
  return SKILL_DEFS.find((item) => item.key === key)?.label ?? key
}

function optionLabel(
  key: string,
  labels?: Record<string, string>,
): string {
  return labels?.[key] ?? skillLabel(key)
}

export function SubclassSetupDialog({
  open,
  def,
  onConfirm,
  onClose,
}: SubclassSetupDialogProps) {
  const [picks, setPicks] = useState<SubclassGrantPicks>(emptySubclassPicks())

  useEffect(() => {
    if (!open) return
    setPicks(emptySubclassPicks())
  }, [open, def?.slug])

  const error = useMemo(
    () => (def ? validateSubclassPicks(def, picks) : 'Нет данных'),
    [def, picks],
  )

  if (!def) return null

  function setSingle(id: string, value: string) {
    setPicks((prev) => ({ values: { ...prev.values, [id]: value } }))
  }

  function toggleMulti(id: string, value: string, count: number) {
    setPicks((prev) => {
      const current = prev.values[id]
      const list = Array.isArray(current) ? [...current] : []
      const idx = list.indexOf(value)
      if (idx >= 0) list.splice(idx, 1)
      else if (list.length < count) list.push(value)
      return { values: { ...prev.values, [id]: list } }
    })
  }

  return (
    <Dialog
      open={open}
      title={`${def.labelRu}: настройка архетипа`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      size="wide"
      onPrimary={() => {
        if (error) return
        onConfirm(picks)
      }}
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Выбери развилки архетипа. При смене архетипа старые выборы снимутся; общие заметки
          персонажа не трогаем.
        </Text>
        {def.notesRu ? <Text tone="muted">{def.notesRu}</Text> : null}

        {def.choices.map((choice) => {
          const value = picks.values[choice.id]
          if (choice.kind === 'open_text') {
            return (
              <Field key={choice.id} label={choice.labelRu} hint={choice.notesRu}>
                <Input
                  value={typeof value === 'string' ? value : ''}
                  placeholder="Имя / описание"
                  onChange={(event) => setSingle(choice.id, event.target.value)}
                />
              </Field>
            )
          }

          const selected = Array.isArray(value)
            ? value
            : typeof value === 'string' && value
              ? [value]
              : []
          const options =
            choice.from === 'any'
              ? choice.id.toLowerCase().includes('lang')
                ? [...LANGUAGE_PRESETS]
                : SKILL_DEFS.map((skill) => skill.key)
              : choice.from

          return (
            <Field
              key={choice.id}
              label={`${choice.labelRu}${
                choice.kind === 'multi' ? ` (${selected.length}/${choice.count})` : ''
              }`}
              hint={choice.notesRu}
            >
              <div className="chip-row">
                {options.map((key) => {
                  const on = selected.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`sheet-chip${on ? ' is-on' : ''}`}
                      onClick={() => {
                        if (choice.kind === 'single') setSingle(choice.id, key)
                        else toggleMulti(choice.id, key, choice.count)
                      }}
                    >
                      {optionLabel(key, choice.fromLabelsRu)}
                    </button>
                  )
                })}
              </div>
            </Field>
          )
        })}

        {error ? <Text tone="muted">{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}
