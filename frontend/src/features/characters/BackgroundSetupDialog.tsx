import { useEffect, useMemo, useState } from 'react'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  backgroundGrantDefFromCatalog,
  buildAppliedBackgroundGrant,
  emptyBackgroundPicks,
  validateBackgroundPicks,
  type AppliedBackgroundGrant,
  type BackgroundGrantDef,
  type BackgroundGrantPicks,
} from '../../shared/dnd/backgroundGrants'
import { commonLanguageOptions } from '../../shared/dnd/featGrants'
import { Button, Dialog, Field, Stack, Text } from '../../ui'

export type BackgroundSetupResult = {
  entry: CatalogEntry
  def: BackgroundGrantDef
  picks: BackgroundGrantPicks
  applied: AppliedBackgroundGrant
}

type BackgroundSetupDialogProps = {
  open: boolean
  entry: CatalogEntry | null
  onConfirm: (result: BackgroundSetupResult) => void
  onClose: () => void
}

export function BackgroundSetupDialog({
  open,
  entry,
  onConfirm,
  onClose,
}: BackgroundSetupDialogProps) {
  const [picks, setPicks] = useState<BackgroundGrantPicks>(emptyBackgroundPicks())
  const [customTool, setCustomTool] = useState('')
  const [customLanguage, setCustomLanguage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const def = useMemo(
    () =>
      entry
        ? backgroundGrantDefFromCatalog({
            slug: entry.slug,
            nameRu: entry.name_ru,
            data: entry.data,
          })
        : null,
    [entry],
  )

  useEffect(() => {
    if (!open) return
    setPicks(emptyBackgroundPicks())
    setCustomTool('')
    setCustomLanguage('')
    setError(null)
  }, [open, entry?.id])

  function toggleLanguage(name: string) {
    if (!def) return
    setError(null)
    setPicks((prev) => {
      if (prev.languages.includes(name)) {
        return { ...prev, languages: prev.languages.filter((row) => row !== name) }
      }
      if (prev.languages.length >= def.languagePicks) {
        return { ...prev, languages: [...prev.languages.slice(1), name] }
      }
      return { ...prev, languages: [...prev.languages, name] }
    })
  }

  function toggleTool(name: string) {
    if (!def?.toolPicks) return
    setError(null)
    setPicks((prev) => {
      if (prev.tools.includes(name)) {
        return { ...prev, tools: prev.tools.filter((row) => row !== name) }
      }
      if (prev.tools.length >= def.toolPicks!.count) {
        return { ...prev, tools: [...prev.tools.slice(1), name] }
      }
      return { ...prev, tools: [...prev.tools, name] }
    })
  }

  function confirm() {
    if (!entry || !def) return
    const check = validateBackgroundPicks({ def, picks })
    if (check) {
      setError(check)
      return
    }
    onConfirm({
      entry,
      def,
      picks,
      applied: buildAppliedBackgroundGrant({ def, picks }),
    })
  }

  if (!entry || !def) return null

  return (
    <Dialog
      open={open}
      title={`Предыстория: ${entry.name_ru}`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      size="wide"
      onPrimary={confirm}
      onSecondary={onClose}
    >
      <Stack gap={14}>
        {def.summaryRu ? <Text>{def.summaryRu}</Text> : null}
        {def.featureRu ? <Text tone="muted">{def.featureRu}</Text> : null}
        {def.skills.length ? (
          <Text tone="muted">Навыки: {def.skills.join(', ')}</Text>
        ) : null}
        {def.tools.length ? (
          <Text tone="muted">Инструменты: {def.tools.join(', ')}</Text>
        ) : null}

        {def.toolPicks ? (
          <Field
            label={`${def.toolPicks.labelRu} (${picks.tools.length}/${def.toolPicks.count})`}
          >
            <div className="chip-row" role="group">
              {def.toolPicks.options.map((name) => (
                <Button
                  key={name}
                  type="button"
                  variant={picks.tools.includes(name) ? 'primary' : 'ghost'}
                  onClick={() => toggleTool(name)}
                >
                  {name}
                </Button>
              ))}
            </div>
            <div className="chip-row" style={{ marginTop: 8 }}>
              <input
                value={customTool}
                onChange={(event) => setCustomTool(event.target.value)}
                placeholder="Свой инструмент"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const name = customTool.trim()
                  if (!name) return
                  toggleTool(name)
                  setCustomTool('')
                }}
              >
                Добавить
              </Button>
            </div>
          </Field>
        ) : null}

        {def.languagePicks > 0 ? (
          <Field label={`Языки (${picks.languages.length}/${def.languagePicks})`}>
            <div className="chip-row" role="group">
              {commonLanguageOptions().map((name) => (
                <Button
                  key={name}
                  type="button"
                  variant={picks.languages.includes(name) ? 'primary' : 'ghost'}
                  onClick={() => toggleLanguage(name)}
                >
                  {name}
                </Button>
              ))}
            </div>
            <div className="chip-row" style={{ marginTop: 8 }}>
              <input
                value={customLanguage}
                onChange={(event) => setCustomLanguage(event.target.value)}
                placeholder="Свой язык"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const name = customLanguage.trim()
                  if (!name) return
                  toggleLanguage(name)
                  setCustomLanguage('')
                }}
              >
                Добавить
              </Button>
            </div>
          </Field>
        ) : null}

        {error ? <Text tone="danger">{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}
