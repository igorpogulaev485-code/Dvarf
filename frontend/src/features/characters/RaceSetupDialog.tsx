import { useEffect, useMemo, useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  abilityBonusModeSlotCount,
  abilityKeysForBonusChoice,
  emptyRacePicks,
  RACE_SIZE_LABELS,
  effectiveRaceSkillChoices,
  resolveAbilityBonusModes,
  resolveRaceGrantDef,
  resolveSelectedAbilityBonusMode,
  resolveVariableTraitChoice,
  type AbilityBonusMode,
  type AbilityKey,
  type RaceGrantDef,
  type RaceGrantPicks,
  type RaceSize,
} from '../../shared/dnd/raceGrants'
import {
  raceRequiresFeatPick,
  type ArmorProfKey,
  type OwnedFeatEnumSnapshot,
} from '../../shared/dnd/featGrants'
import { LANGUAGE_PRESETS } from './languagesTools'
import { ABILITY_LABELS, SKILL_DEFS } from './sheetTypes'
import { FeatSetupDialog, type FeatSetupResult } from './FeatSetupDialog'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'

export type RaceSetupConfirm = {
  entry: CatalogEntry
  def: RaceGrantDef
  picks: RaceGrantPicks
  featResult: FeatSetupResult | null
}

type RaceSetupDialogProps = {
  open: boolean
  edition: RulesEdition
  root: CatalogEntry | null
  subraces: CatalogEntry[]
  subraceRequired: boolean
  abilities: Record<AbilityKey, number>
  armor: Partial<Record<ArmorProfKey, boolean>>
  hasSpellcasting: boolean
  hasMartialWeapons?: boolean
  characterLevel?: number
  takenSlugs?: string[]
  classSlugs?: string[]
  backgroundSlug?: string | null
  ownedFeatEnums?: OwnedFeatEnumSnapshot[]
  proficientSkills?: string[]
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
  edition,
  root,
  subraces,
  subraceRequired,
  abilities,
  armor,
  hasSpellcasting,
  hasMartialWeapons = false,
  characterLevel = 1,
  takenSlugs = [],
  classSlugs = [],
  backgroundSlug = null,
  ownedFeatEnums = [],
  proficientSkills = [],
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

  const asiModes = useMemo(
    () => resolveAbilityBonusModes(def?.abilityBonusChoices ?? null),
    [def],
  )
  const langNeed = def?.languagesChoose ?? 0
  const toolNeed = def?.toolChoices?.count ?? 0

  const asiOptions = useMemo(() => {
    if (!def?.abilityBonusChoices) return []
    return abilityKeysForBonusChoice(def.abilityBonusChoices)
  }, [def])

  const toolOptions = def?.toolChoices?.from ?? []
  const languageOptions = useMemo(() => {
    const fixed = new Set((def?.languages ?? []).map((item) => item.toLowerCase()))
    return LANGUAGE_PRESETS.filter((name) => !fixed.has(name.toLowerCase()))
  }, [def])

  const [abilityBonusModeId, setAbilityBonusModeId] = useState<string | null>(null)
  /** Per-bucket ability picks for the selected ASI mode (flattened on confirm). */
  const [asiBucketPicks, setAsiBucketPicks] = useState<AbilityKey[][]>([])
  const [sizePick, setSizePick] = useState<RaceSize | null>(null)
  const [variableTraitId, setVariableTraitId] = useState<string | null>(null)
  const [featResult, setFeatResult] = useState<FeatSetupResult | null>(null)
  const [featPickerOpen, setFeatPickerOpen] = useState(false)
  const [languages, setLanguages] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [ancestryId, setAncestryId] = useState<string | null>(null)

  const sizeChoices = def?.sizeChoices ?? []
  const sizeNeed = sizeChoices.length > 1
  const variableTraitChoices = def?.variableTraitChoices ?? []
  const variableTraitNeed = variableTraitChoices.length > 0
  const selectedVariableTrait = useMemo(
    () =>
      def
        ? resolveVariableTraitChoice({
            def,
            picks: { variableTraitId },
          })
        : null,
    [def, variableTraitId],
  )
  const skillChoice = useMemo(
    () =>
      def
        ? effectiveRaceSkillChoices(def, { variableTraitId })
        : null,
    [def, variableTraitId],
  )
  const skillNeed = skillChoice?.count ?? 0
  const skillOptions = useMemo(() => {
    if (!skillChoice) return []
    if (skillChoice.from === 'any') return SKILL_DEFS.map((item) => item.key)
    return skillChoice.from
  }, [skillChoice])

  const selectedAsiMode: AbilityBonusMode | null = useMemo(
    () =>
      resolveSelectedAbilityBonusMode({
        choice: def?.abilityBonusChoices ?? null,
        modeId: abilityBonusModeId,
      }),
    [def, abilityBonusModeId],
  )

  const abilityBonusKeys = useMemo(() => asiBucketPicks.flat(), [asiBucketPicks])
  const asiNeed = selectedAsiMode ? abilityBonusModeSlotCount(selectedAsiMode) : 0

  function emptyBucketPicks(mode: AbilityBonusMode | null): AbilityKey[][] {
    if (!mode) return []
    return mode.buckets.map(() => [])
  }

  useEffect(() => {
    if (!open) return
    setSubraceKey(hasSubraceFork ? null : SKIP_SUBRACE)
    const empty = emptyRacePicks()
    setAbilityBonusModeId(empty.abilityBonusModeId)
    setAsiBucketPicks([])
    setSizePick(empty.size)
    setVariableTraitId(empty.variableTraitId)
    setFeatResult(null)
    setFeatPickerOpen(false)
    setLanguages(empty.languages)
    setSkills(empty.skills)
    setTools(empty.tools)
    setAncestryId(empty.ancestryId)
  }, [open, root?.id, hasSubraceFork])

  useEffect(() => {
    // Reset fork picks when subrace changes.
    const empty = emptyRacePicks()
    setAbilityBonusModeId(empty.abilityBonusModeId)
    setAsiBucketPicks([])
    setSizePick(empty.size)
    setVariableTraitId(empty.variableTraitId)
    setFeatResult(null)
    setFeatPickerOpen(false)
    setLanguages(empty.languages)
    setSkills(empty.skills)
    setTools(empty.tools)
    setAncestryId(empty.ancestryId)
  }, [subraceKey])

  useEffect(() => {
    // Clear skills when variable trait no longer needs them.
    if (skillNeed === 0 && skills.length > 0) setSkills([])
  }, [skillNeed, skills.length])

  useEffect(() => {
    // Auto-select sole ASI mode (legacy count/amount); clear keys when mode changes.
    if (asiModes.length === 1) {
      const only = asiModes[0]
      if (only && abilityBonusModeId !== only.id) {
        setAbilityBonusModeId(only.id)
        setAsiBucketPicks(emptyBucketPicks(only))
      }
      return
    }
    if (
      abilityBonusModeId &&
      !asiModes.some((mode) => mode.id === abilityBonusModeId)
    ) {
      setAbilityBonusModeId(null)
      setAsiBucketPicks([])
    }
  }, [asiModes, abilityBonusModeId])

  function selectAsiMode(modeId: string) {
    const mode = asiModes.find((row) => row.id === modeId) ?? null
    setAbilityBonusModeId(modeId)
    setAsiBucketPicks(emptyBucketPicks(mode))
  }

  function keysInBucket(bucketIndex: number): AbilityKey[] {
    return asiBucketPicks[bucketIndex] ?? []
  }

  function toggleAbilityInBucket(bucketIndex: number, key: AbilityKey) {
    if (!selectedAsiMode) return
    const need = selectedAsiMode.buckets[bucketIndex]?.count ?? 0
    setAsiBucketPicks((prev) => {
      const next = selectedAsiMode.buckets.map((_, idx) => [...(prev[idx] ?? [])])
      const current = next[bucketIndex] ?? []
      if (current.includes(key)) {
        next[bucketIndex] = current.filter((item) => item !== key)
        return next
      }
      if (current.length >= need) return prev
      for (let i = 0; i < next.length; i += 1) {
        next[i] = (next[i] ?? []).filter((item) => item !== key)
      }
      next[bucketIndex] = [...(next[bucketIndex] ?? []), key]
      return next
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

  const sizeOk = !sizeNeed || (sizePick != null && sizeChoices.includes(sizePick))
  const variableTraitOk =
    !variableTraitNeed || Boolean(selectedVariableTrait)

  const asiModeOk =
    asiModes.length === 0 ||
    (Boolean(selectedAsiMode) && abilityBonusKeys.length === asiNeed)

  const featNeed = Boolean(def && raceRequiresFeatPick(def))
  const featOk = !featNeed || Boolean(featResult)

  const canConfirm =
    Boolean(root && def && effectiveEntry) &&
    subraceOk &&
    sizeOk &&
    variableTraitOk &&
    asiModeOk &&
    languages.length === langNeed &&
    skills.length === skillNeed &&
    tools.length === toolNeed &&
    ancestryOk &&
    featOk

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
    <>
    <Dialog
      open={open && !featPickerOpen}
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
            abilityBonusModeId:
              selectedAsiMode?.id ?? abilityBonusModeId,
            abilityBonusKeys,
            size: sizeNeed ? sizePick : null,
            variableTraitId: variableTraitNeed ? variableTraitId : null,
            languages,
            skills,
            tools,
            ancestryId,
            featCatalogId: featResult?.entry.id ?? null,
          },
          featResult,
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
            {sizeNeed ? (
              <Field label="Размер" hint="Средний или Маленький — выбери при создании персонажа">
                <div className="chip-row">
                  {sizeChoices.map((size) => {
                    const on = sizePick === size
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`sheet-chip${on ? ' is-on' : ''}`}
                        onClick={() => setSizePick(size)}
                      >
                        {RACE_SIZE_LABELS[size]}
                      </button>
                    )
                  })}
                </div>
              </Field>
            ) : null}

            {variableTraitNeed ? (
              <Field label="Переменная черта" hint="Выбери одно">
                <Stack gap={8}>
                  {variableTraitChoices.map((row) => {
                    const on = variableTraitId === row.id
                    return (
                      <button
                        key={row.id}
                        type="button"
                        className={`sheet-chip${on ? ' is-on' : ''}`}
                        style={{ display: 'block', width: '100%', textAlign: 'left' }}
                        onClick={() => setVariableTraitId(row.id)}
                      >
                        {row.labelRu}
                      </button>
                    )
                  })}
                </Stack>
              </Field>
            ) : null}

            {fixedAsi ? (
              <Text>
                Фиксированные бонусы: <strong>{fixedAsi}</strong>
              </Text>
            ) : null}

            {asiModes.length > 0 && def.abilityBonusChoices ? (
              <Stack gap={10}>
                <Field
                  label="Увеличение характеристик"
                  hint={
                    asiModes.length > 1
                      ? 'Выберите одно из:'
                      : selectedAsiMode
                        ? selectedAsiMode.labelRu
                        : undefined
                  }
                >
                  {asiModes.length > 1 ? (
                    <Stack gap={8}>
                      {asiModes.map((mode) => {
                        const on = abilityBonusModeId === mode.id
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            className={`sheet-chip${on ? ' is-on' : ''}`}
                            style={{ display: 'block', width: '100%', textAlign: 'left' }}
                            onClick={() => selectAsiMode(mode.id)}
                          >
                            {mode.labelRu}
                          </button>
                        )
                      })}
                    </Stack>
                  ) : null}
                </Field>

                {selectedAsiMode
                  ? selectedAsiMode.buckets.map((bucket, bucketIndex) => {
                      const picked = keysInBucket(bucketIndex)
                      const takenElsewhere = new Set(
                        asiBucketPicks
                          .flatMap((keys, idx) => (idx === bucketIndex ? [] : keys))
                          .filter(Boolean),
                      )
                      return (
                        <Field
                          key={`${selectedAsiMode.id}-${bucketIndex}-${bucket.amount}`}
                          label={`+${bucket.amount} (${picked.length}/${bucket.count})`}
                          hint={
                            bucket.count === 1
                              ? 'Выбери одну характеристику'
                              : `Выбери ${bucket.count} разные характеристики`
                          }
                        >
                          <div className="chip-row">
                            {asiOptions.map((key) => {
                              const on = picked.includes(key)
                              const disabled = !on && takenElsewhere.has(key)
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  className={`sheet-chip${on ? ' is-on' : ''}`}
                                  disabled={disabled}
                                  onClick={() => toggleAbilityInBucket(bucketIndex, key)}
                                >
                                  {ABILITY_LABELS[key]}
                                </button>
                              )
                            })}
                          </div>
                        </Field>
                      )
                    })
                  : null}
              </Stack>
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

            {featNeed ? (
              <Field label="Черта (обязательно)">
                <Stack gap={8}>
                  {def.featNoteRu ? <Text tone="muted">{def.featNoteRu}</Text> : null}
                  <Text>
                    {featResult
                      ? `Выбрано: ${featResult.entry.name_ru}${
                          featResult.applied.summaryRu
                            ? ` · ${featResult.applied.summaryRu}`
                            : ''
                        }`
                      : 'Черта ещё не выбрана — открой настройку, чтобы выбрать ASI / заклинание.'}
                  </Text>
                  <Button
                    type="button"
                    variant={featResult ? 'secondary' : 'primary'}
                    onClick={() => setFeatPickerOpen(true)}
                  >
                    {featResult ? 'Сменить черту' : 'Настроить и взять черту'}
                  </Button>
                </Stack>
              </Field>
            ) : def.featNoteRu ? (
              <Text tone="muted">{def.featNoteRu}</Text>
            ) : null}
          </>
        ) : null}

        {!canConfirm ? (
          <Text tone="muted">
            {!subraceOk
              ? subraceRequired
                ? 'Выбери разновидность, чтобы продолжить.'
                : 'Выбери разновидность или «Без подрасы».'
              : !featOk
                ? 'Выбери черту, чтобы продолжить.'
                : 'Отметь все обязательные развилки, чтобы продолжить.'}
          </Text>
        ) : null}
      </Stack>
    </Dialog>

    <FeatSetupDialog
      open={featPickerOpen}
      edition={edition}
      title="Черта расы"
      abilities={abilities}
      armor={armor}
      hasSpellcasting={hasSpellcasting}
      hasMartialWeapons={hasMartialWeapons}
      raceSlug={effectiveEntry?.slug ?? root.slug}
      raceParentSlug={
        effectiveEntry && effectiveEntry.id !== root.id ? root.slug : null
      }
      size={sizeNeed ? sizePick : def?.size ?? null}
      characterLevel={characterLevel}
      takenSlugs={takenSlugs}
      classSlugs={classSlugs}
      backgroundSlug={backgroundSlug}
      ownedFeatEnums={ownedFeatEnums}
      proficientSkills={proficientSkills}
      onClose={() => setFeatPickerOpen(false)}
      onConfirm={(result) => {
        setFeatResult(result)
        setFeatPickerOpen(false)
      }}
    />
    </>
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
