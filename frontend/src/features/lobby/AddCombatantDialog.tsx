import { useEffect, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import { Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'

type Mode = 'bestiary' | 'custom'

type Props = {
  open: boolean
  busy?: boolean
  onClose: () => void
  onSubmit: (payload: {
    catalog_id?: string
    slug?: string
    name?: string
    hp_max?: number
    ac?: number | null
    speed?: number | null
    count: number
    actions?: { name_ru: string; text_ru: string }[]
  }) => void
}

export function AddCombatantDialog({ open, busy = false, onClose, onSubmit }: Props) {
  const [mode, setMode] = useState<Mode>('bestiary')
  const [queryLabel, setQueryLabel] = useState('')
  const [selected, setSelected] = useState<CatalogEntry | null>(null)
  const [count, setCount] = useState(1)
  const [customName, setCustomName] = useState('')
  const [customHp, setCustomHp] = useState<number | null>(30)
  const [customAc, setCustomAc] = useState<number | null>(15)
  const [customAction, setCustomAction] = useState('')

  useEffect(() => {
    if (!open) return
    setMode('bestiary')
    setQueryLabel('')
    setSelected(null)
    setCount(1)
    setCustomName('')
    setCustomHp(30)
    setCustomAc(15)
    setCustomAction('')
  }, [open])

  const data = selected ? parseBestiaryData(selected.data) : null
  const canSubmit =
    mode === 'bestiary'
      ? Boolean(selected)
      : Boolean(customName.trim() && customHp != null && customHp > 0)

  return (
    <Dialog
      open={open}
      title="Посадить противника"
      primaryLabel={mode === 'bestiary' ? 'На стол' : 'Создать НПС'}
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canSubmit}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!canSubmit) return
        if (mode === 'bestiary' && selected) {
          onSubmit({
            catalog_id: selected.id,
            slug: selected.slug,
            count: Math.max(1, Math.min(12, count || 1)),
          })
          return
        }
        const actions = customAction.trim()
          ? [{ name_ru: 'Действие', text_ru: customAction.trim() }]
          : []
        onSubmit({
          name: customName.trim(),
          hp_max: customHp ?? undefined,
          ac: customAc,
          count: Math.max(1, Math.min(12, count || 1)),
          actions,
        })
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Из бестиария (MM и др.) или свой НПС. Подготовка энкаунтеров — позже (B7).
        </Text>

        <div className="session-combatant-mode">
          <button
            type="button"
            className={`session-combatant-mode__btn${mode === 'bestiary' ? ' is-on' : ''}`}
            onClick={() => setMode('bestiary')}
          >
            Бестиарий
          </button>
          <button
            type="button"
            className={`session-combatant-mode__btn${mode === 'custom' ? ' is-on' : ''}`}
            onClick={() => setMode('custom')}
          >
            Свой НПС
          </button>
        </div>

        {mode === 'bestiary' ? (
          <>
            <Field label="Кто">
              <CatalogCombobox
                kind="bestiary"
                edition="2014"
                value={queryLabel}
                placeholder="Гоблин, огр, волк…"
                onChange={(label, entry) => {
                  setQueryLabel(label)
                  setSelected(entry)
                }}
              />
            </Field>
            {data ? (
              <Text tone="muted">
                HP {data.hp_average}
                {data.hp_formula ? ` (${data.hp_formula})` : ''} · КД {data.ac}
                {data.cr ? ` · CR ${data.cr}` : ''}
                {data.source_book ? ` · ${data.source_book}` : ''}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Field label="Имя">
              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} />
            </Field>
            <div className="session-combatant-custom-row">
              <Field label="HP">
                <NumberInput value={customHp} onValueChange={setCustomHp} min={1} max={9999} />
              </Field>
              <Field label="КД">
                <NumberInput value={customAc} onValueChange={setCustomAc} min={0} max={40} />
              </Field>
            </div>
            <Field label="Действие (кратко)">
              <Input
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                placeholder="Рукопашная +5, 1к8+3…"
              />
            </Field>
          </>
        )}

        <Field label="Сколько">
          <NumberInput
            value={count}
            onValueChange={(v) => setCount(v ?? 1)}
            min={1}
            max={12}
          />
        </Field>
      </Stack>
    </Dialog>
  )
}
