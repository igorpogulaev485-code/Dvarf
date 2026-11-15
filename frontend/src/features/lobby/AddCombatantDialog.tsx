import { useEffect, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import { Dialog, Field, Input, NumberInput, Select, Stack, Text } from '../../ui'

type Mode = 'bestiary' | 'custom'

/** DMG 2014 CR → XP (краткая подпись для мастера). */
const CR_OPTIONS: { cr: string; xp: number }[] = [
  { cr: '0', xp: 10 },
  { cr: '1/8', xp: 25 },
  { cr: '1/4', xp: 50 },
  { cr: '1/2', xp: 100 },
  { cr: '1', xp: 200 },
  { cr: '2', xp: 450 },
  { cr: '3', xp: 700 },
  { cr: '4', xp: 1100 },
  { cr: '5', xp: 1800 },
  { cr: '6', xp: 2300 },
  { cr: '7', xp: 2900 },
  { cr: '8', xp: 3900 },
  { cr: '9', xp: 5000 },
  { cr: '10', xp: 5900 },
  { cr: '11', xp: 7200 },
  { cr: '12', xp: 8400 },
  { cr: '13', xp: 10000 },
  { cr: '14', xp: 11500 },
  { cr: '15', xp: 13000 },
  { cr: '16', xp: 15000 },
  { cr: '17', xp: 18000 },
  { cr: '18', xp: 20000 },
  { cr: '19', xp: 22000 },
  { cr: '20', xp: 25000 },
  { cr: '21', xp: 33000 },
  { cr: '22', xp: 41000 },
  { cr: '23', xp: 50000 },
  { cr: '24', xp: 62000 },
  { cr: '25', xp: 75000 },
  { cr: '26', xp: 90000 },
  { cr: '27', xp: 105000 },
  { cr: '28', xp: 120000 },
  { cr: '29', xp: 135000 },
  { cr: '30', xp: 155000 },
]

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
    cr?: string
    actions?: {
      name_ru: string
      text_ru: string
      attack_bonus?: number | null
      damage_dice?: string | null
      damage_type?: string | null
      save_dc?: number | null
    }[]
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
  const [customCr, setCustomCr] = useState('1/4')
  const [actionName, setActionName] = useState('Атака')
  const [actionBonus, setActionBonus] = useState<number | null>(5)
  const [actionDamage, setActionDamage] = useState('1к8+3')
  const [actionDamageType, setActionDamageType] = useState('рубящего')
  const [actionSaveDc, setActionSaveDc] = useState<number | null>(null)
  const [actionText, setActionText] = useState('')
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
    setCustomCr('1/4')
    setActionName('Атака')
    setActionBonus(5)
    setActionDamage('1к8+3')
    setActionDamageType('рубящего')
    setActionSaveDc(null)
    setActionText('')
    setWaveCondition('')
  }, [open])

  const data = selected ? parseBestiaryData(selected.data) : null
  const crXp = CR_OPTIONS.find((o) => o.cr === customCr)?.xp
  const canSubmit =
    mode === 'bestiary'
      ? Boolean(selected)
      : Boolean(customName.trim() && customHp != null && customHp > 0 && customCr)

  return (
    <Dialog
      open={open}
      title="Посадить противника"
      primaryLabel={mode === 'bestiary' ? 'Настол' : 'Создать НПС'}
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
        const name = actionName.trim() || 'Действие'
        const text =
          actionText.trim() ||
          [
            actionBonus != null ? `+${actionBonus} к попаданию` : null,
            actionDamage.trim()
              ? `${actionDamage.trim()} ${actionDamageType.trim()}`.trim()
              : null,
            actionSaveDc != null ? `Сл ${actionSaveDc}` : null,
          ]
            .filter(Boolean)
            .join(', ')
        const actions = [
          {
            name_ru: name,
            text_ru: text,
            attack_bonus: actionBonus,
            damage_dice: actionDamage.trim() || null,
            damage_type: actionDamageType.trim() || null,
            save_dc: actionSaveDc,
          },
        ]
        onSubmit({
          name: customName.trim(),
          hp_max: customHp ?? undefined,
          ac: customAc,
          cr: customCr,
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
            : 'Бестиарий или свой НПС. Для своего НПС укажите ПО — опыт возьмётся из таблицы 2014.'}
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
              <Field label="ПО (опасность)" hint={crXp != null ? `${crXp} XP` : undefined}>
                <Select
                  value={customCr}
                  disabled={busy}
                  aria-label="Показатель опасности"
                  onChange={(e) => setCustomCr(e.target.value)}
                >
                  {CR_OPTIONS.map((o) => (
                    <option key={o.cr} value={o.cr}>
                      {o.cr} · {o.xp} XP
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Text as="h4">Действие</Text>
            <Field label="Название">
              <Input
                value={actionName}
                onChange={(e) => setActionName(e.target.value)}
                placeholder="Дубина"
              />
            </Field>
            <div className="session-combatant-custom-row">
              <Field label="Бонус атаки">
                <NumberInput
                  value={actionBonus}
                  onValueChange={setActionBonus}
                  min={-10}
                  max={30}
                  emptyValue={null}
                />
              </Field>
              <Field label="Урон">
                <Input
                  value={actionDamage}
                  onChange={(e) => setActionDamage(e.target.value)}
                  placeholder="2к8+4"
                />
              </Field>
              <Field label="Тип">
                <Input
                  value={actionDamageType}
                  onChange={(e) => setActionDamageType(e.target.value)}
                  placeholder="дробящего"
                />
              </Field>
            </div>
            <Field label="СЛ спасброска" hint="если действие требует спас">
              <NumberInput
                value={actionSaveDc}
                onValueChange={setActionSaveDc}
                min={1}
                max={40}
                emptyValue={null}
              />
            </Field>
            <Field label="Текст (необязательно)">
              <Input
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="Краткое описание"
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
            Настол одной пачкой ({count}). Быстрый урон — первому живому; в «Составе» —
            кому сколько.
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
