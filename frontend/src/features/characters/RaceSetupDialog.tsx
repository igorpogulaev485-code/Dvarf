import { useEffect, useMemo, useState } from 'react'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  abilityKeysForBonusChoice,
  emptyRacePicks,
  resolveRaceGrantDef,
  type RaceGrantDef,
  type RaceGrantPicks,
} from '../../shared/dnd/raceGrants'
import { LANGUAGE_PRESETS } from './languagesTools'
import { ABILITY_KEYS, ABILITY_LABELS, SKILL_DEFS } from './sheetTypes'
import { Dialog, Field, Input, Stack, Text } from '../../ui'

export type RaceSetupConfirm = {
  entry: CatalogEntry
  def: RaceGrantDef
  picks: RaceGrantPicks
}

type RaceSetupDialogProps = {
  open: boolean
  root: CatalogEntry | null
  subraces: CatalogEntry[]
  subraceRequired: boolean
  onConfirm: (result: RaceSetupConfirm) => void
  onClose: () => void
}

const SKIP_SUBRACE = '__none__'

function skillLabel(key: string): string {
  return SKILL_DEFS.find((item) => item.key === key)?.label ?? key
}

function defForEntry(entry: CatalogEntry): RaceGrantDef | null {
  return resolveRaceGrantDef({
    raceName: entry.name_ru,
    catalogSlug: entry.slug,
    catalogData: entry.data,
    nameRu: entry.name_ru,
  })
}

export function RaceSetupDialog({
  open,
  root,
  subraces,
  subraceRequired,
  onConfirm,
  onClose,
}: RaceSetupDialogProps) {
  const hasSubraceFork = subraces.length > 0
  const [subraceKey, setSubraceKey] = useState<string | null>(null)

  const effectiveEntry = useMemo(() => {
    if (!root) return null
    if (!hasSubraceFork) return root
    if (subraceKey === SKIP_SUBRACE) return root
    if (!subraceKey) return null
    return subraces.find((row) => row.id === subraceKey) ?? null
  }, [root, hasSubraceFork, subraceKey, subraces])

  const def = useMemo(
    () => (effectiveEntry ? defForEntry(effectiveEntry) : null),
    [effectiveEntry],
  )

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
    setSubraceKey(hasSubraceFork ? null : SKIP_SUBRACE)
    const empty = emptyRacePicks()
    setAbilityBonusKeys(empty.abilityBonusKeys)
    setLanguages(empty.languages)
    setSkills(empty.skills)
    setTools(empty.tools)
    setAncestryId(empty.ancestryId)
  }, [open, root?.id, hasSubraceFork])

  useEffect(() => {
    // Reset fork picks when subrace changes.
    const empty = emptyRacePicks()
    setAbilityBonusKeys(empty.abilityBonusKeys)
    setLanguages(empty.languages)
    setSkills(empty.skills)
    setTools(empty.tools)
    setAncestryId(empty.ancestryId)
  }, [subraceKey])

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

  const subraceOk =
    !hasSubraceFork ||
    (subraceRequired ? Boolean(subraceKey && subraceKey !== SKIP_SUBRACE) : Boolean(subraceKey))

  const ancestryOk = !def || def.ancestryChoices.length === 0 || Boolean(ancestryId)

  const canConfirm =
    Boolean(root && def && effectiveEntry) &&
    subraceOk &&
    abilityBonusKeys.length === asiNeed &&
    languages.length === langNeed &&
    skills.length === skillNeed &&
    tools.length === toolNeed &&
    ancestryOk

  if (!root) return null

  const fixedAsi = def
    ? Object.entries(def.abilityBonuses)
        .map(
          ([key, value]) =>
            `${ABILITY_LABELS[key as keyof typeof ABILITY_LABELS]} ${value! > 0 ? '+' : ''}${value}`,
        )
        .join(', ')
    : ''

  return (
    <Dialog
      open={open}
      title={`${root.name_ru}: настройка расы`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      size="wide"
      onPrimary={() => {
        if (!canConfirm || !def || !effectiveEntry) return
        onConfirm({
          entry: effectiveEntry,
          def,
          picks: {
            abilityBonusKeys,
            languages,
            skills,
            tools,
            ancestryId,
          },
        })
      }}
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Сначала раса из списка, развилки — здесь (как у класса). Подрасу выбираешь в этом окне
          {subraceRequired ? ' — обязательно' : hasSubraceFork ? ' — можно оставить без подрасы' : ''}.
        </Text>

        {hasSubraceFork ? (
          <Field
            label={subraceRequired ? 'Разновидности (обязательно)' : 'Разновидности (необязательно)'}
          >
            <Stack gap={8}>
              {!subraceRequired ? (
                <button
                  type="button"
                  className={`sheet-chip${subraceKey === SKIP_SUBRACE ? ' is-on' : ''}`}
                  style={{ display: 'block', width: '100%', textAlign: 'left' }}
                  onClick={() => setSubraceKey(SKIP_SUBRACE)}
                >
                  <strong>Без подрасы</strong>
                  <div style={{ opacity: 0.85, fontWeight: 400 }}>
                    Оставить базовую «{root.name_ru}»
                  </div>
                </button>
              ) : null}
              {subraces.map((row) => {
                const on = subraceKey === row.id
                const source =
                  typeof row.source === 'string' && row.source.trim()
                    ? row.source.trim().toUpperCase()
                    : typeof row.data.source === 'string'
                      ? String(row.data.source).toUpperCase()
                      : ''
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={`sheet-chip${on ? ' is-on' : ''}`}
                    style={{ display: 'block', width: '100%', textAlign: 'left' }}
                    onClick={() => setSubraceKey(row.id)}
                  >
                    <span
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'baseline',
                      }}
                    >
                      <strong>{row.name_ru}</strong>
                      {source ? (
                        <span style={{ opacity: 0.65, fontWeight: 600, fontSize: '0.85em' }}>
                          {source}
                        </span>
                      ) : null}
                    </span>
                    {typeof row.data.traits_text === 'string' && row.data.traits_text.trim() ? (
                      <div style={{ opacity: 0.85, fontWeight: 400 }}>
                        {String(row.data.traits_text).slice(0, 120)}
                        {String(row.data.traits_text).length > 120 ? '…' : ''}
                      </div>
                    ) : null}
                  </button>
                )
              })}
            </Stack>
          </Field>
        ) : null}

        {!def && subraceOk ? (
          <Text tone="muted">Для этой записи пока нет пакета эффектов — закрой и заполни вручную.</Text>
        ) : null}

        {def ? (
          <>
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
          </>
        ) : null}

        {!canConfirm ? (
          <Text tone="muted">
            {!subraceOk
              ? subraceRequired
                ? 'Выбери разновидность, чтобы продолжить.'
                : 'Выбери разновидность или «Без подрасы».'
              : 'Отметь все обязательные развилки, чтобы продолжить.'}
          </Text>
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
