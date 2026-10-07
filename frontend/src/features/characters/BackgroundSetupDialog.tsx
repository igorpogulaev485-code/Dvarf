import { useEffect, useMemo, useState } from 'react'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  backgroundHasRoleplayTables,
  emptyBackgroundPicks,
  personalityPickCount,
  skillOptionsForBackground,
  type BackgroundGrantDef,
  type BackgroundGrantPicks,
} from '../../shared/dnd/backgroundGrants'
import { LANGUAGE_PRESETS } from './languagesTools'
import { SKILL_DEFS } from './sheetTypes'
import { Dialog, Field, Input, Stack, Text } from '../../ui'

export type BackgroundSetupConfirm = {
  entry: CatalogEntry
  def: BackgroundGrantDef
  picks: BackgroundGrantPicks
}

type BackgroundSetupDialogProps = {
  open: boolean
  entry: CatalogEntry | null
  def: BackgroundGrantDef | null
  onConfirm: (result: BackgroundSetupConfirm) => void
  onClose: () => void
}

function skillLabel(key: string): string {
  return SKILL_DEFS.find((item) => item.key === key)?.label ?? key
}

function ChipList({
  options,
  selected,
  multi,
  onToggle,
}: {
  options: string[]
  selected: string[]
  multi: boolean
  onToggle: (value: string) => void
}) {
  return (
    <div className="chip-row">
      {options.map((name) => {
        const on = selected.includes(name)
        return (
          <button
            key={name}
            type="button"
            className={`sheet-chip${on ? ' is-on' : ''}`}
            style={
              multi
                ? undefined
                : { display: 'block', width: '100%', textAlign: 'left' }
            }
            onClick={() => onToggle(name)}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}

export function BackgroundSetupDialog({
  open,
  entry,
  def,
  onConfirm,
  onClose,
}: BackgroundSetupDialogProps) {
  const skillNeed = def?.skillChoices?.count ?? 0
  const toolNeed = def?.toolChoices?.count ?? 0
  const langNeed = def?.languagesChoose ?? 0
  const traitNeed = def ? personalityPickCount(def) : 0
  const skillOptions = useMemo(
    () => (def ? skillOptionsForBackground(def) : []),
    [def],
  )
  const toolOptions = def?.toolChoices?.from ?? []
  const languageOptions = useMemo(() => {
    const fixed = new Set((def?.languages ?? []).map((item) => item.toLowerCase()))
    return LANGUAGE_PRESETS.filter((name) => !fixed.has(name.toLowerCase()))
  }, [def])
  const equipmentPackages = def?.equipment ?? []
  const hasRp = def ? backgroundHasRoleplayTables(def) : false

  const [skills, setSkills] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [equipmentPackageId, setEquipmentPackageId] = useState<string | null>(null)
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([])
  const [ideal, setIdeal] = useState<string | null>(null)
  const [bond, setBond] = useState<string | null>(null)
  const [flaw, setFlaw] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSkills([])
    setTools([])
    setLanguages([])
    setEquipmentPackageId(null)
    setPersonalityTraits([])
    setIdeal(null)
    setBond(null)
    setFlaw(null)
  }, [open, def?.slug])

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

  function toggleLanguage(name: string) {
    setLanguages((prev) => {
      if (prev.includes(name)) return prev.filter((item) => item !== name)
      if (prev.length >= langNeed) return prev
      return [...prev, name]
    })
  }

  function toggleTrait(name: string) {
    setPersonalityTraits((prev) => {
      if (prev.includes(name)) return prev.filter((item) => item !== name)
      if (prev.length >= traitNeed) return prev
      return [...prev, name]
    })
  }

  const equipmentOk =
    equipmentPackages.length === 0 || Boolean(equipmentPackageId)

  // RP optional: either untouched (0) or complete set.
  const traitsOk =
    personalityTraits.length === 0 || personalityTraits.length === traitNeed

  const canConfirm =
    Boolean(def && entry) &&
    skills.length === skillNeed &&
    tools.length === toolNeed &&
    languages.length === langNeed &&
    equipmentOk &&
    traitsOk

  if (!def || !entry) return null

  const fixedSkills = def.skillProficiencies
    .map((key) => skillLabel(key))
    .join(', ')
  const fixedTools = def.toolProficiencies.join(', ')
  const fixedLangs = def.languages.join(', ')

  return (
    <Dialog
      open={open}
      title={`${def.labelRu}: настройка предыстории`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      size="wide"
      onPrimary={() => {
        if (!canConfirm) return
        onConfirm({
          entry,
          def,
          picks: {
            skills,
            tools,
            languages,
            equipmentPackageId:
              equipmentPackages.length > 0 ? equipmentPackageId : null,
            personalityTraits,
            ideal,
            bond,
            flaw,
          },
        })
      }}
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Механика (навыки, языки, инструменты, снаряжение) — обязательна. Черты характера /
          идеалы / привязанности / слабости — по желанию: можно пропустить и заполнить позже.
        </Text>

        {(fixedSkills || fixedTools || fixedLangs) && (
          <Text>
            {[
              fixedSkills ? `Навыки: ${fixedSkills}` : null,
              fixedTools ? `Инструменты: ${fixedTools}` : null,
              fixedLangs ? `Языки: ${fixedLangs}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}

        {def.featureNameRu ? (
          <Field label={`Умение: ${def.featureNameRu}`}>
            <Text tone="muted">{def.featureTextRu || '—'}</Text>
            {def.featNoteRu ? <Text tone="muted">{def.featNoteRu}</Text> : null}
          </Field>
        ) : null}

        {skillNeed > 0 ? (
          <Field label={`Навыки на выбор (${skills.length}/${skillNeed})`}>
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
          <Field label={`Инструменты на выбор (${tools.length}/${toolNeed})`}>
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

        {langNeed > 0 ? (
          <Field
            label={`Языки на выбор (${languages.length}/${langNeed})`}
            hint={def.languagesChooseNoteRu ?? undefined}
          >
            <div className="chip-row">
              {languageOptions.map((name) => {
                const on = languages.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    className={`sheet-chip${on ? ' is-on' : ''}`}
                    onClick={() => toggleLanguage(name)}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          </Field>
        ) : null}

        {equipmentPackages.length > 0 ? (
          <Field label="Снаряжение предыстории">
            <Stack gap={8}>
              {equipmentPackages.map((pack) => {
                const on = equipmentPackageId === pack.id
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={`sheet-chip${on ? ' is-on' : ''}`}
                    style={{ display: 'block', width: '100%', textAlign: 'left' }}
                    onClick={() => setEquipmentPackageId(pack.id)}
                  >
                    <strong>{pack.labelRu}</strong>
                    <div style={{ opacity: 0.85, fontWeight: 400 }}>{pack.summary}</div>
                  </button>
                )
              })}
              <button
                type="button"
                className={`sheet-chip${equipmentPackageId === 'skip' ? ' is-on' : ''}`}
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => setEquipmentPackageId('skip')}
              >
                <strong>Без снаряжения</strong>
                <div style={{ opacity: 0.85, fontWeight: 400 }}>
                  Куплю снаряжение за золото / заполню сам
                </div>
              </button>
            </Stack>
          </Field>
        ) : null}

        {hasRp ? (
          <Stack gap={12}>
            <Text>
              <strong>Персонализация</strong>
              <span style={{ opacity: 0.8 }}>
                {' '}
                — таблицы из книги; можно оставить пустым
              </span>
            </Text>

            {traitNeed > 0 ? (
              <Field
                label={`Черты характера (${personalityTraits.length}/${traitNeed})`}
                hint="PHB: обычно две черты. Можно пропустить."
              >
                <ChipList
                  options={def.personalityTraits}
                  selected={personalityTraits}
                  multi
                  onToggle={toggleTrait}
                />
              </Field>
            ) : null}

            {def.ideals.length > 0 ? (
              <Field label="Идеал" hint="Один или пропустить">
                <ChipList
                  options={def.ideals}
                  selected={ideal ? [ideal] : []}
                  multi={false}
                  onToggle={(value) => setIdeal((prev) => (prev === value ? null : value))}
                />
              </Field>
            ) : null}

            {def.bonds.length > 0 ? (
              <Field label="Привязанность" hint="Одна или пропустить">
                <ChipList
                  options={def.bonds}
                  selected={bond ? [bond] : []}
                  multi={false}
                  onToggle={(value) => setBond((prev) => (prev === value ? null : value))}
                />
              </Field>
            ) : null}

            {def.flaws.length > 0 ? (
              <Field label="Слабость" hint="Одна или пропустить">
                <ChipList
                  options={def.flaws}
                  selected={flaw ? [flaw] : []}
                  multi={false}
                  onToggle={(value) => setFlaw((prev) => (prev === value ? null : value))}
                />
              </Field>
            ) : null}
          </Stack>
        ) : (
          <Text tone="muted">
            У этой предыстории в источнике нет таблиц черт/идеалов — блоки на листе заполняешь
            вручную.
          </Text>
        )}

        {!canConfirm ? (
          <Text tone="muted">Отметь все обязательные развилки, чтобы продолжить.</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}

type HomebrewBackgroundDialogProps = {
  open: boolean
  initialName?: string
  onConfirm: (name: string) => void
  onClose: () => void
}

export function HomebrewBackgroundDialog({
  open,
  initialName = '',
  onConfirm,
  onClose,
}: HomebrewBackgroundDialogProps) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (!open) return
    setName(initialName)
  }, [open, initialName])

  const trimmed = name.trim()
  const canConfirm = trimmed.length > 0

  return (
    <Dialog
      open={open}
      title="Хомбрю-предыстория"
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      onPrimary={() => {
        if (!canConfirm) return
        onConfirm(trimmed)
      }}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Своя предыстория: только название на листе. Навыки, языки, инструменты и снаряжение
          задаёшь сам — пакет из справочника не подставляем.
        </Text>
        <Field label="Название на листе" hint="Например: Бывший гладиатор арены…">
          <Input
            value={name}
            placeholder="Название предыстории"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        {!canConfirm ? <Text tone="muted">Введи название предыстории.</Text> : null}
      </Stack>
    </Dialog>
  )
}

export { emptyBackgroundPicks }
