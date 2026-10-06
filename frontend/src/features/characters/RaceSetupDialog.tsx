import { useEffect, useMemo, useState } from 'react'
import {
  abilityKeysForBonusChoice,
  emptyRacePicks,
  type RaceGrantDef,
  type RaceGrantPicks,
} from '../../shared/dnd/raceGrants'
import { LANGUAGE_PRESETS } from './languagesTools'
import { ABILITY_KEYS, ABILITY_LABELS, SKILL_DEFS } from './sheetTypes'
import { Dialog, Field, Input, Stack, Text } from '../../ui'

type RaceSetupDialogProps = {
  open: boolean
  def: RaceGrantDef | null
  onConfirm: (picks: RaceGrantPicks) => void
  onClose: () => void
}

function skillLabel(key: string): string {
  return SKILL_DEFS.find((item) => item.key === key)?.label ?? key
}

export function RaceSetupDialog({
  open,
  def,
  onConfirm,
  onClose,
}: RaceSetupDialogProps) {
  const asiNeed = def?.abilityBonusChoices?.count ?? 0
  const langNeed = def?.languagesChoose ?? 0
  const skillNeed = def?.skillChoices?.count ?? 0
  const toolNeed = def?.toolChoices?.count ?? 0

  const asiOptions = useMemo(() => {
    if (!def?.abilityBonusChoices) return []
    return abilityKeysForBonusChoice(def.abilityBonusChoices)
  }, [def])

  const skillOptions = useMemo(() => {
    if (!def?.skillChoices) return []
    if (def.skillChoices.from === 'any') return SKILL_DEFS.map((item) => item.key)
    return def.skillChoices.from
  }, [def])

  const toolOptions = def?.toolChoices?.from ?? []
  const languageOptions = useMemo(() => {
    const fixed = new Set((def?.languages ?? []).map((item) => item.toLowerCase()))
    return LANGUAGE_PRESETS.filter((name) => !fixed.has(name.toLowerCase()))
  }, [def])

  const [abilityBonusKeys, setAbilityBonusKeys] = useState<RaceGrantPicks['abilityBonusKeys']>(
    [],
  )
  const [languages, setLanguages] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [ancestryId, setAncestryId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const empty = emptyRacePicks()
    setAbilityBonusKeys(empty.abilityBonusKeys)
    setLanguages(empty.languages)
    setSkills(empty.skills)
    setTools(empty.tools)
    setAncestryId(empty.ancestryId)
  }, [open, def?.slug])

  function toggleAbility(key: (typeof ABILITY_KEYS)[number]) {
    setAbilityBonusKeys((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key)
      if (prev.length >= asiNeed) return prev
      return [...prev, key]
    })
  }

  function toggleLanguage(name: string) {
    setLanguages((prev) => {
      if (prev.includes(name)) return prev.filter((item) => item !== name)
      if (prev.length >= langNeed) return prev
      return [...prev, name]
    })
  }

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

  const ancestryOk =
    !def || def.ancestryChoices.length === 0 || Boolean(ancestryId)

  const canConfirm =
    Boolean(def) &&
    abilityBonusKeys.length === asiNeed &&
    languages.length === langNeed &&
    skills.length === skillNeed &&
    tools.length === toolNeed &&
    ancestryOk

  if (!def) return null

  const fixedAsi = Object.entries(def.abilityBonuses)
    .map(([key, value]) => `${ABILITY_LABELS[key as keyof typeof ABILITY_LABELS]} ${value! > 0 ? '+' : ''}${value}`)
    .join(', ')

  return (
    <Dialog
      open={open}
      title={`${def.labelRu}: настройка расы`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      size="wide"
      onPrimary={() => {
        if (!canConfirm) return
        onConfirm({
          abilityBonusKeys,
          languages,
          skills,
          tools,
          ancestryId,
        })
      }}
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Развилки расы — как у класса: отметь обязательные выборы, затем примени. ASI
          подставится в характеристики; при смене расы откатим грант.
        </Text>

        {fixedAsi ? (
          <Text>
            Фиксированные бонусы: <strong>{fixedAsi}</strong>
          </Text>
        ) : null}

        {asiNeed > 0 && def.abilityBonusChoices ? (
          <Field
            label={`Бонусы характеристик (${abilityBonusKeys.length}/${asiNeed})`}
            hint={`+${def.abilityBonusChoices.amount} к каждой выбранной`}
          >
            <div className="chip-row">
              {asiOptions.map((key) => {
                const on = abilityBonusKeys.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    className={`sheet-chip${on ? ' is-on' : ''}`}
                    onClick={() => toggleAbility(key)}
                  >
                    {ABILITY_LABELS[key]}
                  </button>
                )
              })}
            </div>
          </Field>
        ) : null}

        {langNeed > 0 ? (
          <Field label={`Языки на выбор (${languages.length}/${langNeed})`}>
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

        {skillNeed > 0 ? (
          <Field label={`Навыки (${skills.length}/${skillNeed})`}>
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
          <Field label={`Инструменты (${tools.length}/${toolNeed})`}>
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

        {def.ancestryChoices.length > 0 ? (
          <Field label="Драконье происхождение">
            <Stack gap={8}>
              {def.ancestryChoices.map((row) => {
                const on = ancestryId === row.id
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={`sheet-chip${on ? ' is-on' : ''}`}
                    style={{ display: 'block', width: '100%', textAlign: 'left' }}
                    onClick={() => setAncestryId(row.id)}
                  >
                    <strong>{row.labelRu}</strong>
                    <div style={{ opacity: 0.85, fontWeight: 400 }}>
                      {row.damage} · дыхание {row.breath}
                    </div>
                  </button>
                )
              })}
            </Stack>
          </Field>
        ) : null}

        {def.featNoteRu ? <Text tone="muted">{def.featNoteRu}</Text> : null}

        {!canConfirm ? (
          <Text tone="muted">Отметь все обязательные развилки, чтобы продолжить.</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}

type HomebrewRaceDialogProps = {
  open: boolean
  initialName?: string
  onConfirm: (name: string) => void
  onClose: () => void
}

export function HomebrewRaceDialog({
  open,
  initialName = '',
  onConfirm,
  onClose,
}: HomebrewRaceDialogProps) {
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
      title="Хомбрю-раса"
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
          Своя раса: укажи название на листе. Скорость, ТЗ, языки, ASI и особенности задаёшь
          сам — из PHB ничего не подставляем.
        </Text>
        <Field label="Название на листе" hint="Например: Гитозерк, Калштаар…">
          <Input
            value={name}
            placeholder="Название расы"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        {!canConfirm ? <Text tone="muted">Введи название расы.</Text> : null}
      </Stack>
    </Dialog>
  )
}
