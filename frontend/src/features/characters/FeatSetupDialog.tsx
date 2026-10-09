import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import {
  buildAppliedFeatPackage,
  commonLanguageOptions,
  emptyFeatPicks,
  featGrantDefFromCatalog,
  featPrerequisitesUnmet,
  resolveEnumMultiCount,
  spellOneOptionsForPicks,
  validateFeatGrantPicks,
  type AbilityKey,
  type ArmorProfKey,
  type FeatGrantDef,
  type FeatGrantPicks,
  type FeatGrantsPackage,
  type OwnedFeatEnumSnapshot,
} from '../../shared/dnd/featGrants'
import { ABILITY_LABELS, SKILL_DEFS } from './sheetTypes'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'

export type FeatSetupResult = {
  entry: CatalogEntry
  def: FeatGrantDef
  picks: FeatGrantPicks
  applied: FeatGrantsPackage
}

type FeatSetupDialogProps = {
  open: boolean
  edition: RulesEdition
  title?: string
  abilities: Record<AbilityKey, number>
  armor: Partial<Record<ArmorProfKey, boolean>>
  hasSpellcasting: boolean
  hasMartialWeapons?: boolean
  raceSlug?: string | null
  raceParentSlug?: string | null
  size?: string | null
  characterLevel?: number
  /** Already taken feat slugs (optional soft filter + prereq checks). */
  takenSlugs?: string[]
  classSlugs?: string[]
  backgroundSlug?: string | null
  ownedFeatEnums?: OwnedFeatEnumSnapshot[]
  /** Skill keys the character is already proficient in (expertise picker). */
  proficientSkills?: string[]
  /** Lock picker to one feat (background / race grant). */
  forcedSlug?: string | null
  /** Pre-select this catalog row (create-pipeline feat step). */
  presetEntry?: CatalogEntry | null
  onConfirm: (result: FeatSetupResult) => void
  onClose: () => void
}

export function FeatSetupDialog({
  open,
  edition,
  title = 'Выбор черты',
  abilities,
  armor,
  hasSpellcasting,
  hasMartialWeapons = false,
  raceSlug = null,
  raceParentSlug = null,
  size = null,
  characterLevel = 1,
  takenSlugs = [],
  classSlugs = [],
  backgroundSlug = null,
  ownedFeatEnums = [],
  proficientSkills = [],
  forcedSlug = null,
  presetEntry = null,
  onConfirm,
  onClose,
}: FeatSetupDialogProps) {
  const [selected, setSelected] = useState<CatalogEntry | null>(null)
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [picks, setPicks] = useState<FeatGrantPicks>(emptyFeatPicks())
  const [customTool, setCustomTool] = useState('')
  const [customWeapon, setCustomWeapon] = useState('')
  const [customLanguage, setCustomLanguage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const picksAnchorRef = useRef<HTMLDivElement | null>(null)

  const def = useMemo(
    () =>
      selected
        ? featGrantDefFromCatalog({
            slug: selected.slug,
            nameRu: selected.name_ru,
            data: selected.data,
          })
        : null,
    [selected],
  )

  const prereqContext = useMemo(
    () => ({
      abilities,
      armor,
      hasSpellcasting,
      hasMartialWeapons,
      raceSlug,
      raceParentSlug,
      size,
      characterLevel,
      ownedFeatSlugs: takenSlugs,
      classSlugs,
      backgroundSlug,
      ownedFeatEnums,
    }),
    [
      abilities,
      armor,
      hasSpellcasting,
      hasMartialWeapons,
      raceSlug,
      raceParentSlug,
      size,
      characterLevel,
      takenSlugs,
      classSlugs,
      backgroundSlug,
      ownedFeatEnums,
    ],
  )

  const filterEligibleFeat = useCallback(
    (entry: CatalogEntry) => {
      if (forcedSlug) return entry.slug === forcedSlug
      if (takenSlugs.includes(entry.slug)) return false
      const entryDef = featGrantDefFromCatalog({
        slug: entry.slug,
        nameRu: entry.name_ru,
        data: entry.data,
      })
      if (!entryDef) return false
      return featPrerequisitesUnmet(entryDef, prereqContext) == null
    },
    [forcedSlug, takenSlugs, prereqContext],
  )

  useEffect(() => {
    if (!open) return
    setSelected(presetEntry)
    setQuery(presetEntry?.name_ru ?? '')
    setPicks(emptyFeatPicks())
    setCustomTool('')
    setCustomWeapon('')
    setCustomLanguage('')
    setError(null)
    let active = true
    setCatalogLoading(true)
    void listCatalogEntries({ kind: 'feat', edition })
      .then((rows) => {
        if (!active) return
        const activeRows = rows.filter((row) => row.is_active)
        setCatalog(activeRows)
        if (presetEntry) {
          const match =
            activeRows.find((row) => row.id === presetEntry.id) ??
            activeRows.find((row) => row.slug === presetEntry.slug) ??
            presetEntry
          setSelected(match)
        }
      })
      .catch(() => {
        if (!active) return
        setCatalog(presetEntry ? [presetEntry] : [])
        setError('Не удалось загрузить каталог черт')
      })
      .finally(() => {
        if (active) setCatalogLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, edition, presetEntry])

  useEffect(() => {
    setPicks(emptyFeatPicks())
    setError(null)
  }, [selected?.id])

  const eligibleFeats = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog
      .filter((entry) => filterEligibleFeat(entry))
      .filter((entry) => {
        if (!q) return true
        const hay = `${entry.name_ru} ${entry.name_en ?? ''} ${entry.source ?? ''} ${entry.slug}`
        return hay.toLowerCase().includes(q)
      })
      .sort((a, b) => a.name_ru.localeCompare(b.name_ru, 'ru'))
  }, [catalog, filterEligibleFeat, query])

  const languageNeed =
    def?.choices.find((choice) => choice.type === 'languages')?.count ?? 0
  const skillToolNeed =
    def?.choices.find((choice) => choice.type === 'skill_or_tool')?.count ?? 0
  const weaponNeed =
    def?.choices.find((choice) => choice.type === 'weapons')?.count ?? 0

  function setAbilityPick(choiceId: string, key: AbilityKey) {
    setError(null)
    setPicks((prev) => ({
      ...prev,
      abilityKeys: { ...prev.abilityKeys, [choiceId]: key },
    }))
  }

  function setEnumPick(choiceId: string, optionId: string) {
    setError(null)
    setPicks((prev) => ({
      ...prev,
      enumIds: { ...prev.enumIds, [choiceId]: optionId },
    }))
  }

  function toggleEnumList(choiceId: string, optionId: string, need: number) {
    setError(null)
    setPicks((prev) => {
      const current = prev.enumLists[choiceId] ?? []
      if (current.includes(optionId)) {
        return {
          ...prev,
          enumLists: {
            ...prev.enumLists,
            [choiceId]: current.filter((id) => id !== optionId),
          },
        }
      }
      if (current.length >= need) {
        return {
          ...prev,
          enumLists: {
            ...prev.enumLists,
            [choiceId]: [...current.slice(1), optionId],
          },
        }
      }
      return {
        ...prev,
        enumLists: {
          ...prev.enumLists,
          [choiceId]: [...current, optionId],
        },
      }
    })
  }

  function toggleExpertise(skillKey: string, need: number) {
    setError(null)
    setPicks((prev) => {
      if (prev.expertiseSkills.includes(skillKey)) {
        return {
          ...prev,
          expertiseSkills: prev.expertiseSkills.filter((key) => key !== skillKey),
        }
      }
      if (prev.expertiseSkills.length >= need) {
        return {
          ...prev,
          expertiseSkills: [...prev.expertiseSkills.slice(1), skillKey],
        }
      }
      return { ...prev, expertiseSkills: [...prev.expertiseSkills, skillKey] }
    })
  }

  function toggleLanguage(name: string) {
    setError(null)
    setPicks((prev) => {
      if (prev.languages.includes(name)) {
        return { ...prev, languages: prev.languages.filter((row) => row !== name) }
      }
      if (prev.languages.length >= languageNeed) {
        return { ...prev, languages: [...prev.languages.slice(1), name] }
      }
      return { ...prev, languages: [...prev.languages, name] }
    })
  }

  function toggleSkill(key: string) {
    setError(null)
    setPicks((prev) => {
      if (prev.skills.includes(key)) {
        return { ...prev, skills: prev.skills.filter((row) => row !== key) }
      }
      const total = prev.skills.length + prev.tools.length
      if (total >= skillToolNeed) return prev
      return { ...prev, skills: [...prev.skills, key] }
    })
  }

  function addTool() {
    const name = customTool.trim()
    if (!name) return
    setError(null)
    setPicks((prev) => {
      if (prev.tools.some((row) => row.toLowerCase() === name.toLowerCase())) {
        return prev
      }
      const total = prev.skills.length + prev.tools.length
      if (total >= skillToolNeed) return prev
      return { ...prev, tools: [...prev.tools, name] }
    })
    setCustomTool('')
  }

  function addWeapon() {
    const name = customWeapon.trim()
    if (!name) return
    setError(null)
    setPicks((prev) => {
      if (prev.weapons.some((row) => row.toLowerCase() === name.toLowerCase())) {
        return prev
      }
      if (prev.weapons.length >= weaponNeed) {
        return { ...prev, weapons: [...prev.weapons.slice(1), name] }
      }
      return { ...prev, weapons: [...prev.weapons, name] }
    })
    setCustomWeapon('')
  }

  function addLanguageCustom() {
    const name = customLanguage.trim()
    if (!name) return
    toggleLanguage(name)
    setCustomLanguage('')
  }

  function confirm() {
    if (!selected || !def) return
    const check = validateFeatGrantPicks({
      def,
      picks,
      abilities,
      armor,
      hasSpellcasting,
      hasMartialWeapons,
      raceSlug,
      raceParentSlug,
      size,
      characterLevel,
      ownedFeatSlugs: takenSlugs,
      classSlugs,
      backgroundSlug,
      ownedFeatEnums,
      proficientSkills,
    })
    if (check) {
      setError(check)
      picksAnchorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      return
    }
    onConfirm({
      entry: selected,
      def,
      picks,
      applied: buildAppliedFeatPackage({ def, picks, characterLevel }),
    })
  }

  const picksIncomplete = Boolean(
    def &&
      validateFeatGrantPicks({
        def,
        picks,
        abilities,
        armor,
        hasSpellcasting,
        hasMartialWeapons,
        raceSlug,
        raceParentSlug,
        size,
        characterLevel,
        ownedFeatSlugs: takenSlugs,
        classSlugs,
        backgroundSlug,
        ownedFeatEnums,
        proficientSkills,
      }),
  )

  const hasChoiceForks = Boolean(def && def.choices.length > 0)

  useEffect(() => {
    if (!selected || !hasChoiceForks) return
    picksAnchorRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selected?.id, hasChoiceForks])

  const choiceFields = def
    ? def.choices.map((choice) => {
              if (choice.type === 'ability_one') {
                const current = picks.abilityKeys[choice.id]
                return (
                  <Field key={choice.id} label={choice.label_ru}>
                    <div className="chip-row" role="group">
                      {choice.from.map((key) => (
                        <Button
                          key={key}
                          type="button"
                          variant={current === key ? 'primary' : 'ghost'}
                          onClick={() => setAbilityPick(choice.id, key)}
                        >
                          {ABILITY_LABELS[key]} {abilities[key]}
                          {choice.amount ? ` (+${choice.amount})` : ''}
                        </Button>
                      ))}
                    </div>
                  </Field>
                )
              }
              if (choice.type === 'enum') {
                const current = picks.enumIds[choice.id]
                return (
                  <Field key={choice.id} label={choice.label_ru}>
                    <div className="chip-row" role="group">
                      {choice.options.map((opt) => (
                        <Button
                          key={opt.id}
                          type="button"
                          variant={current === opt.id ? 'primary' : 'ghost'}
                          onClick={() => {
                            setError(null)
                            // Clear dependent spell_one picks when list/college changes.
                            setPicks((prev) => {
                              const nextEnum = { ...prev.enumIds, [choice.id]: opt.id }
                              for (const row of def.choices) {
                                if (
                                  row.type === 'spell_one' &&
                                  row.filterEnum === choice.id
                                ) {
                                  delete nextEnum[row.id]
                                }
                              }
                              return { ...prev, enumIds: nextEnum }
                            })
                          }}
                        >
                          {opt.label_ru}
                        </Button>
                      ))}
                    </div>
                  </Field>
                )
              }
              if (choice.type === 'spell_one') {
                const options = spellOneOptionsForPicks(choice, picks.enumIds)
                const current = picks.enumIds[choice.id]
                if (choice.filterEnum && !picks.enumIds[choice.filterEnum]) {
                  return (
                    <Text key={choice.id} tone="muted">
                      {choice.label_ru}: сначала выбери список / колледж выше.
                    </Text>
                  )
                }
                return (
                  <Field key={choice.id} label={choice.label_ru}>
                    <div className="chip-row" role="group">
                      {options.map((opt) => (
                        <Button
                          key={opt.id}
                          type="button"
                          variant={current === opt.id ? 'primary' : 'ghost'}
                          onClick={() => setEnumPick(choice.id, opt.id)}
                        >
                          {opt.label_ru}
                        </Button>
                      ))}
                    </div>
                  </Field>
                )
              }
              if (choice.type === 'enum_multi') {
                const need = resolveEnumMultiCount(choice, characterLevel)
                const selectedIds = picks.enumLists[choice.id] ?? []
                return (
                  <Field
                    key={choice.id}
                    label={`${choice.label_ru} (${selectedIds.length}/${need})`}
                  >
                    <div className="chip-row" role="group">
                      {choice.options.map((opt) => (
                        <Button
                          key={opt.id}
                          type="button"
                          variant={selectedIds.includes(opt.id) ? 'primary' : 'ghost'}
                          onClick={() => toggleEnumList(choice.id, opt.id, need)}
                        >
                          {opt.label_ru}
                        </Button>
                      ))}
                    </div>
                  </Field>
                )
              }
              if (choice.type === 'expertise') {
                const owned = new Set([...proficientSkills, ...picks.skills])
                const options = SKILL_DEFS.filter((skill) => owned.has(skill.key))
                return (
                  <Field
                    key={choice.id}
                    label={`${choice.label_ru} (${picks.expertiseSkills.length}/${choice.count})`}
                  >
                    {options.length ? (
                      <div className="chip-row" role="group">
                        {options.map((skill) => (
                          <Button
                            key={skill.key}
                            type="button"
                            variant={
                              picks.expertiseSkills.includes(skill.key)
                                ? 'primary'
                                : 'ghost'
                            }
                            onClick={() => toggleExpertise(skill.key, choice.count)}
                          >
                            {skill.label}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Text tone="muted">
                        Сначала возьми владение навыком (выше) или отметь навыки на листе.
                      </Text>
                    )}
                  </Field>
                )
              }
              if (choice.type === 'languages') {
                return (
                  <Field
                    key={choice.id}
                    label={`${choice.label_ru} (${picks.languages.length}/${choice.count})`}
                  >
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
                      <Button type="button" variant="ghost" onClick={addLanguageCustom}>
                        Добавить
                      </Button>
                    </div>
                  </Field>
                )
              }
              if (choice.type === 'skill_or_tool') {
                return (
                  <Field
                    key={choice.id}
                    label={`${choice.label_ru} (${picks.skills.length + picks.tools.length}/${choice.count})`}
                  >
                    <div className="chip-row" role="group">
                      {SKILL_DEFS.map((skill) => (
                        <Button
                          key={skill.key}
                          type="button"
                          variant={picks.skills.includes(skill.key) ? 'primary' : 'ghost'}
                          onClick={() => toggleSkill(skill.key)}
                        >
                          {skill.label}
                        </Button>
                      ))}
                    </div>
                    <div className="chip-row" style={{ marginTop: 8 }}>
                      {picks.tools.map((tool) => (
                        <Button
                          key={tool}
                          type="button"
                          variant="primary"
                          onClick={() =>
                            setPicks((prev) => ({
                              ...prev,
                              tools: prev.tools.filter((row) => row !== tool),
                            }))
                          }
                        >
                          {tool} ×
                        </Button>
                      ))}
                      <input
                        value={customTool}
                        onChange={(event) => setCustomTool(event.target.value)}
                        placeholder="Инструмент"
                      />
                      <Button type="button" variant="ghost" onClick={addTool}>
                        + инструмент
                      </Button>
                    </div>
                  </Field>
                )
              }
              if (choice.type === 'weapons') {
                return (
                  <Field
                    key={choice.id}
                    label={`${choice.label_ru} (${picks.weapons.length}/${choice.count})`}
                  >
                    <div className="chip-row">
                      {picks.weapons.map((weapon) => (
                        <Button
                          key={weapon}
                          type="button"
                          variant="primary"
                          onClick={() =>
                            setPicks((prev) => ({
                              ...prev,
                              weapons: prev.weapons.filter((row) => row !== weapon),
                            }))
                          }
                        >
                          {weapon} ×
                        </Button>
                      ))}
                      <input
                        value={customWeapon}
                        onChange={(event) => setCustomWeapon(event.target.value)}
                        placeholder="Название оружия"
                      />
                      <Button type="button" variant="ghost" onClick={addWeapon}>
                        Добавить
                      </Button>
                    </div>
                  </Field>
                )
              }
              return (
                <Text key={choice.id} tone="muted">
                  {choice.label_ru}: {choice.text_ru}
                </Text>
              )
            })
    : null

  const picksBlock =
    def && selected ? (
      <div ref={picksAnchorRef}>
        <Stack gap={12}>
          <Text>
            <strong>{selected.name_ru}</strong>
            {selected.name_en ? ` · ${selected.name_en}` : ''}
          </Text>
          {def.prerequisitesRu ? (
            <Text tone="muted">Требования: {def.prerequisitesRu}</Text>
          ) : null}
          {def.fixedGrants.summaryRu ? <Text>{def.fixedGrants.summaryRu}</Text> : null}
          {def.fixedGrants.benefitsRu ? (
            <Text tone="muted">{def.fixedGrants.benefitsRu}</Text>
          ) : null}
          {hasChoiceForks ? (
            <Text tone="muted">Отметь ASI / заклинание — без развилок черту взять нельзя.</Text>
          ) : null}
          {choiceFields}
        </Stack>
      </div>
    ) : null

  return (
    <Dialog
      open={open}
      title={title}
      primaryLabel="Взять черту"
      secondaryLabel="Отмена"
      size="wide"
      onPrimary={confirm}
      onSecondary={onClose}
      primaryDisabled={!selected || !def || picksIncomplete}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Только доступные тебе черты (требования уже отфильтрованы). Выбери карточку — как на
          других шагах. Гранты попадут на лист.
        </Text>

        {/* Picks first when a fork-feat is selected — list used to bury ASI/spell chips. */}
        {hasChoiceForks ? picksBlock : null}

        <Field label="Поиск">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по имени…"
          />
        </Field>
        {forcedSlug ? (
          <Text tone="muted">Черта предыстории / расы: выбери «{forcedSlug}» в списке.</Text>
        ) : null}

        {catalogLoading ? (
          <Text tone="muted">Загружаем каталог черт…</Text>
        ) : eligibleFeats.length === 0 ? (
          <Text tone="muted">Нет доступных черт по текущим требованиям.</Text>
        ) : (
          <Field label={hasChoiceForks ? 'Сменить черту' : `Черта (${eligibleFeats.length})`}>
            <div
              className="feat-setup__list"
              style={{
                maxHeight: hasChoiceForks ? '22vh' : '40vh',
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              <Stack gap={8}>
                {eligibleFeats.map((entry) => {
                  const on = selected?.id === entry.id
                  const entryDef = featGrantDefFromCatalog({
                    slug: entry.slug,
                    nameRu: entry.name_ru,
                    data: entry.data,
                  })
                  const summary =
                    entryDef?.fixedGrants.summaryRu?.trim() ||
                    entryDef?.prerequisitesRu?.trim() ||
                    entry.name_en ||
                    entry.source ||
                    ''
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`sheet-chip${on ? ' is-on' : ''}`}
                      style={{ display: 'block', width: '100%', textAlign: 'left' }}
                      onClick={() => {
                        setSelected(entry)
                        setError(null)
                      }}
                    >
                      <strong>{entry.name_ru}</strong>
                      {summary ? (
                        <div style={{ opacity: 0.85, fontWeight: 400 }}>{summary}</div>
                      ) : null}
                      {entry.source ? (
                        <div style={{ opacity: 0.65, fontWeight: 400, fontSize: 12 }}>
                          {entry.source}
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </Stack>
            </div>
          </Field>
        )}

        {/* Feats without forks still show summary under the list. */}
        {!hasChoiceForks ? picksBlock : null}

        {error ? <Text tone="danger">{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}
