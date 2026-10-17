import { useState } from 'react'
import { CustomSpellDialog } from '../features/characters/CustomSpellDialog'
import {
  createCustomSheetSpell,
  spellSourceBadge,
  type SheetSpell,
} from '../features/characters/spells'
import { Button, Stack, Text } from '../ui'

/**
 * Dev-only surface to review custom-spell form without auth/backend.
 * Route: /dev/custom-spell
 */
export function DevCustomSpellPreviewPage() {
  const [open, setOpen] = useState(true)
  const [saved, setSaved] = useState<SheetSpell | null>(null)
  const [editing, setEditing] = useState<SheetSpell | null>(null)

  const badge = saved ? spellSourceBadge(saved) : null

  return (
    <main className="page page--app" style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <Stack gap={14}>
        <Text as="h1">Превью: своё заклинание</Text>
        <Text tone="muted">
          Временный экран для сверки формы с UI-китом. Не для прода.
        </Text>
        <div className="chip-row">
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            Создать заклинание
          </Button>
          {saved ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(saved)
                setOpen(true)
              }}
            >
              Изменить сохранённое
            </Button>
          ) : null}
        </div>

        {saved ? (
          <div className="prepare-section">
            <strong>На листе (превью)</strong>
            <ul className="prepare-list">
              <li className="prepare-row prepare-row--spell">
                <div className="prepare-row__main">
                  <div>
                    {saved.name}
                    {badge ? (
                      <span className="prepare-row__badge is-source" title={badge.title}>
                        {badge.label}
                      </span>
                    ) : null}
                  </div>
                  <Text tone="muted">
                    {[
                      saved.level === 0 ? 'Заговор' : `${saved.level} круг`,
                      saved.casting_time,
                      saved.range,
                      saved.attack_or_save,
                      saved.damage,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </div>
                <span className="sheet-chip is-on">Подготовлено</span>
              </li>
            </ul>
          </div>
        ) : (
          <Text tone="muted">Пока ничего не сохранено — открой форму.</Text>
        )}
      </Stack>

      <CustomSpellDialog
        open={open}
        initial={editing}
        mode="known"
        onClose={() => setOpen(false)}
        onSave={(input) => {
          const next = editing
            ? { ...createCustomSheetSpell(input), id: editing.id, prepared: true }
            : { ...createCustomSheetSpell(input), prepared: true }
          setSaved(next)
          setEditing(null)
          setOpen(false)
        }}
        onDelete={
          editing
            ? () => {
                setSaved(null)
                setEditing(null)
                setOpen(false)
              }
            : undefined
        }
      />
    </main>
  )
}
