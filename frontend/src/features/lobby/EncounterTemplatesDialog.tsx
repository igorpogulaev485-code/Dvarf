import { useEffect, useState } from 'react'
import type { EncounterTemplate } from '../../shared/api/lobbies'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'

type Props = {
  open: boolean
  busy?: boolean
  templates: EncounterTemplate[]
  canSaveFromTable?: boolean
  onClose: () => void
  onSaveFromTable: (name: string) => void
  onDeploy: (templateId: string) => void
  onDelete: (templateId: string) => void
}

/**
 * Шаблоны энкаунтеров: сохранить текущий стол / посадить сохранённый.
 */
export function EncounterTemplatesDialog({
  open,
  busy = false,
  templates,
  canSaveFromTable = false,
  onClose,
  onSaveFromTable,
  onDeploy,
  onDelete,
}: Props) {
  const [saveName, setSaveName] = useState('')

  useEffect(() => {
    if (!open) return
    setSaveName('')
  }, [open])

  return (
    <Dialog
      open={open}
      title="Шаблоны энкаунтеров"
      primaryLabel="Закрыть"
      busy={busy}
      onPrimary={onClose}
      onSecondary={onClose}
      secondaryLabel="Отмена"
      size="wide"
    >
      <Stack gap={14}>
        <Text tone="muted">
          Сохрани состав противников на столе и сажай снова одним жестом — без
          повторного поиска в бестиарии.
        </Text>

        {canSaveFromTable ? (
          <Stack gap={8}>
            <Text as="h4" className="session-xp-recipients__title">
              Сохранить стол
            </Text>
            <div className="session-encounter-save">
              <Field label="Название">
                <Input
                  value={saveName}
                  disabled={busy}
                  placeholder="Засада у моста"
                  onChange={(e) => setSaveName(e.target.value)}
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !saveName.trim()}
                onClick={() => {
                  onSaveFromTable(saveName.trim())
                  setSaveName('')
                }}
              >
                Сохранить
              </Button>
            </div>
          </Stack>
        ) : (
          <Text tone="muted">На столе нет противников — нечего сохранять.</Text>
        )}

        <Stack gap={8}>
          <Text as="h4" className="session-xp-recipients__title">
            Библиотека
          </Text>
          {templates.length === 0 ? (
            <Text tone="muted">Пока пусто.</Text>
          ) : (
            <ul className="session-encounter-list">
              {templates.map((t) => {
                const summary = t.entries
                  .map((e) => (e.count > 1 ? `${e.name}×${e.count}` : e.name))
                  .join(', ')
                return (
                  <li key={t.id}>
                    <div className="session-encounter-list__main">
                      <strong>{t.name}</strong>
                      <Text tone="muted">{summary}</Text>
                    </div>
                    <div className="session-encounter-list__actions">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => onDeploy(t.id)}
                      >
                        На стол
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onDelete(t.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Stack>
      </Stack>
    </Dialog>
  )
}
