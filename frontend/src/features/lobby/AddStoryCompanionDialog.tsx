/**
 * C-02 Н12/Н13: master adds story companion from full bestiary (reuse CatalogCombobox
 * like AddCombatantDialog) or manually, then assigns to a seated player.
 */
import { useEffect, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import { Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'

type Mode = 'bestiary' | 'manual'

export type StoryCompanionSubmit = {
  name: string
  hp_current: number | null
  hp_max: number | null
  ac: number | null
  speed?: number | null
  dex?: number | null
  str?: number | null
  con?: number | null
  actions?: string | null
  story: true
  bestiary_ref?: string | null
  bestiary_name_ru?: string | null
  initiative_mode: 'with_master' | 'own_initiative'
  command_cost: 'none' | 'action' | 'bonus' | 'reaction'
  notes?: string | null
}

type Props = {
  open: boolean
  busy?: boolean
  hostName?: string | null
  onClose: () => void
  onSubmit: (payload: StoryCompanionSubmit) => void
}

export function AddStoryCompanionDialog({
  open,
  busy = false,
  hostName,
  onClose,
  onSubmit,
}: Props) {
  const [mode, setMode] = useState<Mode>('bestiary')
  const [queryLabel, setQueryLabel] = useState('')
  const [selected, setSelected] = useState<CatalogEntry | null>(null)
  const [name, setName] = useState('')
  const [hp, setHp] = useState<number | null>(11)
  const [ac, setAc] = useState<number | null>(13)
  const [speed, setSpeed] = useState<number | null>(null)
  const [dex, setDex] = useState<number | null>(null)
  const [str, setStr] = useState<number | null>(null)
  const [con, setCon] = useState<number | null>(null)
  const [actions, setActions] = useState('')
  const [initiativeMode, setInitiativeMode] = useState<
    'with_master' | 'own_initiative'
  >('own_initiative')
  const [offRulesHint, setOffRulesHint] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode('bestiary')
    setQueryLabel('')
    setSelected(null)
    setName('')
    setHp(11)
    setAc(13)
    setSpeed(null)
    setDex(null)
    setStr(null)
    setCon(null)
    setActions('')
    setInitiativeMode('own_initiative')
    setOffRulesHint(false)
  }, [open])

  useEffect(() => {
    if (!selected) return
    const data = parseBestiaryData(selected.data)
    if (!data) return
    setName(selected.name_ru || selected.name_en || selected.slug || '')
    setHp(data.hp_average ?? null)
    setAc(data.ac ?? null)
    setSpeed(data.speed?.walk ?? null)
    setDex(data.abilities?.dex ?? null)
    setStr(data.abilities?.str ?? null)
    setCon(data.abilities?.con ?? null)
    const actionLines = (data.actions || [])
      .map((a) => `${a.name_ru}: ${a.text_ru}`)
      .join('\n')
    setActions(actionLines)
    // Soft hint only — never block (Н13).
    const cr = String(data.cr || '')
    setOffRulesHint(Boolean(cr && cr !== '0' && cr !== '1/8' && cr !== '1/4' && cr !== '1/2'))
  }, [selected])

  const canSubmit = Boolean(name.trim() && (hp == null || hp >= 0))

  return (
    <Dialog
      open={open}
      title="Сюжетный напарник"
      primaryLabel={busy ? 'Добавляем…' : 'Отдать игроку'}
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canSubmit}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!canSubmit) return
        onSubmit({
          name: name.trim(),
          hp_current: hp,
          hp_max: hp,
          ac,
          speed,
          dex,
          str,
          con,
          actions: actions.trim() || null,
          story: true,
          bestiary_ref: selected?.id ?? selected?.slug ?? null,
          bestiary_name_ru: selected?.name_ru ?? name.trim(),
          initiative_mode: initiativeMode,
          command_cost: 'none',
          notes: offRulesHint ? 'подсказка: не по правилам (КР)' : null,
        })
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          {hostName
            ? `Карточка появится у ${hostName} в полосе и под ним на столе. При 0 хитов — спасброски, как у персонажа.`
            : 'Из всего бестиария или вручную. Запрещать выбор нельзя.'}
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
            className={`session-combatant-mode__btn${mode === 'manual' ? ' is-on' : ''}`}
            onClick={() => setMode('manual')}
          >
            Вручную
          </button>
        </div>

        {mode === 'bestiary' ? (
          <Field label="Кто">
            <CatalogCombobox
              kind="bestiary"
              edition="2014"
              value={queryLabel}
              placeholder="Волк, медведь, наёмник…"
              onChange={(label, entry) => {
                setQueryLabel(label)
                setSelected(entry)
              }}
            />
          </Field>
        ) : null}

        {offRulesHint ? (
          <Text tone="muted">Подсказка: выбранное существо может быть «не по правилам» для спутника — выбор всё равно можно отдать.</Text>
        ) : null}

        <Field label="Имя">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="manual-roll-form__row">
          <Field label="ХП">
            <NumberInput value={hp} min={0} max={9999} onValueChange={setHp} />
          </Field>
          <Field label="КД">
            <NumberInput value={ac} min={0} max={40} onValueChange={setAc} />
          </Field>
          <Field label="Скорость">
            <NumberInput value={speed} min={0} max={999} onValueChange={setSpeed} />
          </Field>
        </div>
        <div className="manual-roll-form__row">
          <Field label="СИЛ">
            <NumberInput value={str} min={1} max={30} onValueChange={setStr} />
          </Field>
          <Field label="ЛОВ">
            <NumberInput value={dex} min={1} max={30} onValueChange={setDex} />
          </Field>
          <Field label="ТЕЛ">
            <NumberInput value={con} min={1} max={30} onValueChange={setCon} />
          </Field>
        </div>
        <Field label="Действия">
          <textarea
            className="ui-input"
            rows={4}
            value={actions}
            onChange={(e) => setActions(e.target.value)}
          />
        </Field>
        <Field label="Инициатива">
          <select
            className="ui-input"
            value={initiativeMode}
            onChange={(e) =>
              setInitiativeMode(e.target.value as 'with_master' | 'own_initiative')
            }
          >
            <option value="own_initiative">Своя (по умолчанию)</option>
            <option value="with_master">Ход хозяина</option>
          </select>
        </Field>
      </Stack>
    </Dialog>
  )
}
