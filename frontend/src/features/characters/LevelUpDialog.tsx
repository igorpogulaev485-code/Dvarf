import { useEffect, useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { CatalogCombobox } from '../catalog'
import { Dialog, Field, Stack, Text } from '../../ui'

export type LevelUpChoice =
  | { type: 'same'; classId: string }
  | { type: 'multiclass'; name: string; catalog_id: string | null }

type LevelUpDialogProps = {
  open: boolean
  edition: RulesEdition
  classes: ClassLevelEntry[]
  onConfirm: (choice: LevelUpChoice) => void
  onClose: () => void
}

export function LevelUpDialog({
  open,
  edition,
  classes,
  onConfirm,
  onClose,
}: LevelUpDialogProps) {
  const [mode, setMode] = useState<'same' | 'multiclass'>('same')
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [newClassName, setNewClassName] = useState('')
  const [newCatalogId, setNewCatalogId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMode('same')
    setClassId(classes[0]?.id ?? '')
    setNewClassName('')
    setNewCatalogId(null)
  }, [open, classes])

  const canConfirm =
    mode === 'same'
      ? Boolean(classId && classes.some((row) => row.id === classId))
      : Boolean(newClassName.trim())

  return (
    <Dialog
      open={open}
      title="Повышение уровня"
      primaryLabel="Повысить"
      secondaryLabel="Отмена"
      onPrimary={() => {
        if (!canConfirm) return
        if (mode === 'same') {
          onConfirm({ type: 'same', classId })
          return
        }
        onConfirm({
          type: 'multiclass',
          name: newClassName.trim(),
          catalog_id: newCatalogId,
        })
      }}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Куда идёт новый уровень персонажа? Можно прокачать уже взятый класс или взять 1 уровень
          другого (мультикласс).
        </Text>

        <div className="chip-row">
          <button
            type="button"
            className={`sheet-chip${mode === 'same' ? ' is-on' : ''}`}
            onClick={() => setMode('same')}
          >
            Этот класс
          </button>
          <button
            type="button"
            className={`sheet-chip${mode === 'multiclass' ? ' is-on' : ''}`}
            onClick={() => setMode('multiclass')}
          >
            Мультикласс
          </button>
        </div>

        {mode === 'same' ? (
          <Field label="Класс для +1">
            <select
              className="play-select"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              {classes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name || 'Без названия'} · сейчас {row.level}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field
            label="Новый класс"
            hint="1 уровень в другом классе. Если класс уже есть — просто +1 к нему."
          >
            <CatalogCombobox
              kind="class"
              edition={edition}
              value={newClassName}
              placeholder="Например: Волшебник"
              onChange={(value, selected) => {
                setNewClassName(value)
                setNewCatalogId(selected?.id ?? null)
              }}
            />
          </Field>
        )}

        {!canConfirm ? (
          <Text tone="muted">
            {mode === 'same'
              ? 'Выбери класс, в который идёт уровень.'
              : 'Укажи название нового класса.'}
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
