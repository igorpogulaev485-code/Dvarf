import { useEffect, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import { Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'

type Mode = 'bestiary' | 'custom'

type Props = {
  open: boolean
  busy?: boolean
  /** S-02: в идущем бою новая пачка = скрытая волна */
  combatActive?: boolean
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
    wave_condition_text?: string | null
  }) => void
}

export function AddCombatantDialog({
  open,
  busy = false,
  combatActive = false,
  onClose,
  onSubmit,
}: Props) {
  const [mode, setMode] = useState<Mode>('bestiary')
  const [queryLabel, setQueryLabel] = useState('')
  const [selected, setSelected] = useState<CatalogEntry | null>(null)
  const [count, setCount] = useState(1)
  const [customName, setCustomName] = useState('')
  const [customHp, setCustomHp] = useState<number | null>(30)
  const [customAc, setCustomAc] = useState<number | null>(15)
  const [customAction, setCustomAction] = useState('')
  const [waveCondition, setWaveCondition] = useState('')

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
    setWaveCondition('')
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
        const waveBit = combatActive
          ? { wave_condition_text: waveCondition.trim() || null }
          : {}
        if (mode === 'bestiary' && selected) {
          onSubmit({
            catalog_id: selected.id,
            slug: selected.slug,
            count: Math.max(1, Math.min(12, count || 1)),
            ...waveBit,
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
          ...waveBit,
        })
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          {combatActive
            ? 'В идущем бою пачка станет новой скрытой волной — выпусти её кнопкой.'
            : 'Из бестиария (MM и др.) или свой НПС. Волны раскладываются в диалоге «Бой».'}
        </Text>
        {combatActive ? (
          <Field label="Напоминание волны (необязательно)">
            <Input
              value={waveCondition}
              disabled={busy}
              placeholder="например: на раунде 3"
              onChange={(e) => setWaveCondition(e.target.value)}
            />
          </Field>
        ) : null}

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
            max={20}
          />
        </Field>
        {count > 1 ? (
          <Text tone="muted">
            На стол одной пачкой ({count}). Быстрый урон — первому живому; в «Составе» —
            кому сколько.
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
