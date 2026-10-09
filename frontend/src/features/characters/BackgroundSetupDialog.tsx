import { useEffect, useMemo, useState } from 'react'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  backgroundHasRoleplayTables,
  emptyBackgroundPicks,
  alignmentSuggestionFromIdeal,
  personalityPickCount,
  resolveBackgroundGrantDef,
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
  root: CatalogEntry | null
  /** Catalog children / PHB variants (spy, gladiator, …). */
  variants: CatalogEntry[]
  onConfirm: (result: BackgroundSetupConfirm) => void
  onClose: () => void
}

const KEEP_ROOT = '__root__'

function skillLabel(key: string): string {
  return SKILL_DEFS.find((item) => item.key === key)?.label ?? key
}

function ChipList({
  options,
  selected,
  onToggle,
  block,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  block?: boolean
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
            style={block ? { display: 'block', width: '100%', textAlign: 'left' } : undefined}
            onClick={() => onToggle(name)}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}

function defFor(entry: CatalogEntry): BackgroundGrantDef | null {
  return resolveBackgroundGrantDef({
    backgroundName: entry.name_ru,
    catalogSlug: entry.slug,
    catalogData: entry.data,
    nameRu: entry.name_ru,
  })
}

export function BackgroundSetupDialog({
  open,
  root,
  variants,
  onConfirm,
  onClose,
}: BackgroundSetupDialogProps) {
  const hasVariantFork = variants.length > 0
  const [variantKey, setVariantKey] = useState<string | null>(null)

  const effectiveEntry = useMemo(() => {
    if (!root) return null
    if (!hasVariantFork) return root
    if (variantKey === KEEP_ROOT) return root
    if (!variantKey) return null
    return variants.find((row) => row.id === variantKey) ?? null
  }, [root, hasVariantFork, variantKey, variants])

  const def = useMemo(
    () => (effectiveEntry ? defFor(effectiveEntry) : null),
    [effectiveEntry],
  )

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
  const choiceTables = def?.choiceTables ?? []

  const [skills, setSkills] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [equipmentPackageId, setEquipmentPackageId] = useState<string | null>(null)
  const [equipmentOrPicks, setEquipmentOrPicks] = useState<Record<string, string>>(
    {},
  )
  const [choiceTablePicks, setChoiceTablePicks] = useState<Record<string, string[]>>(
    {},
  )
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([])
  const [ideal, setIdeal] = useState<string | null>(null)
  const [bond, setBond] = useState<string | null>(null)
  const [flaw, setFlaw] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setVariantKey(hasVariantFork ? null : KEEP_ROOT)
  }, [open, root?.id, hasVariantFork])

  useEffect(() => {
    if (!open) return
    setSkills([])
    setTools([])
    setLanguages([])
    setEquipmentPackageId(null)
    setEquipmentOrPicks({})
    setChoiceTablePicks({})
    setPersonalityTraits([])
    setIdeal(null)
    setBond(null)
    setFlaw(null)
  }, [open, effectiveEntry?.id])

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

  function toggleChoice(tableId: string, option: string, need: number) {
    setChoiceTablePicks((prev) => {
      const current = prev[tableId] ?? []
      if (current.includes(option)) {
        return { ...prev, [tableId]: current.filter((item) => item !== option) }
      }
      if (need <= 1) return { ...prev, [tableId]: [option] }
      if (current.length >= need) return prev
      return { ...prev, [tableId]: [...current, option] }
    })
  }

  const variantOk = !hasVariantFork || Boolean(variantKey)
  const equipmentOk =
    !def || equipmentPackages.length === 0 || Boolean(equipmentPackageId)
  const orNeed =
    def && equipmentPackageId && equipmentPackageId !== 'skip'
      ? def.equipmentOrChoices
      : []
  const orOk = orNeed.every((choice) => Boolean(equipmentOrPicks[choice.id]))
  const tablesOk = choiceTables.every((table) => {
    const picked = choiceTablePicks[table.id] ?? []
    return picked.length === table.count
  })
  const traitsOk =
    personalityTraits.length === 0 || personalityTraits.length === traitNeed

  const canConfirm =
    Boolean(def && effectiveEntry && variantOk) &&
    skills.length === skillNeed &&
    tools.length === toolNeed &&
    languages.length === langNeed &&
    equipmentOk &&
    orOk &&
    tablesOk &&
    traitsOk

  if (!root) return null

  const fixedSkills = (def?.skillProficiencies ?? [])
    .map((key) => skillLabel(key))
    .join(', ')
  const fixedTools = (def?.toolProficiencies ?? []).join(', ')
  const fixedLangs = (def?.languages ?? []).join(', ')

  return (
    <Dialog
      open={open}
      title={`${root.name_ru}: настройка предыстории`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      size="wide"
      onPrimary={() => {
        if (!canConfirm || !def || !effectiveEntry) return
        onConfirm({
          entry: effectiveEntry,
          def,
          picks: {
            skills,
            tools,
            languages,
            equipmentPackageId:
              equipmentPackages.length > 0 ? equipmentPackageId : null,
            equipmentOrPicks,
            choiceTablePicks,
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
          Сначала вариант (если есть), затем механика и таблицы из книги. Черты/идеалы можно
          пропустить. Смена предыстории отзовёт пакет.
        </Text>

        {hasVariantFork ? (
          <Field label="Вариант предыстории" hint="Как подраса у расы — выбираешь в попапе">
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${variantKey === KEEP_ROOT ? ' is-on' : ''}`}
                onClick={() => setVariantKey(KEEP_ROOT)}
              >
                {root.name_ru} (базовый)
              </button>
              {variants.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`sheet-chip${variantKey === row.id ? ' is-on' : ''}`}
                  onClick={() => setVariantKey(row.id)}
                >
                  {row.name_ru}
                </button>
              ))}
            </div>
          </Field>
        ) : null}

        {!variantOk ? (
          <Text tone="muted">Выбери базовый вариант или ответвление.</Text>
        ) : null}

        {def && effectiveEntry ? (
          <>
            {def.notesRu ? <Text tone="muted">{def.notesRu}</Text> : null}

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

            {choiceTables.map((table) => {
              const picked = choiceTablePicks[table.id] ?? []
              return (
                <Field
                  key={table.id}
                  label={`${table.labelRu} (${picked.length}/${table.count})`}
                >
                  <ChipList
                    options={table.options}
                    selected={picked}
                    block={table.options.some((row) => row.length > 48)}
                    onToggle={(option) => toggleChoice(table.id, option, table.count)}
                  />
                </Field>
              )
            })}

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
              <Field
                label="Снаряжение предыстории"
                hint={def.equipmentNoteRu ?? undefined}
              >
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
                    onClick={() => {
                      setEquipmentPackageId('skip')
                      setEquipmentOrPicks({})
                    }}
                  >
                    <strong>Без снаряжения</strong>
                    <div style={{ opacity: 0.85, fontWeight: 400 }}>
                      Куплю снаряжение за золото / заполню сам
                    </div>
                  </button>
                </Stack>
              </Field>
            ) : null}

            {orNeed.map((choice) => (
              <Field key={choice.id} label={`Снаряжение: ${choice.labelRu}`}>
                <div className="chip-row">
                  {choice.options.map((option) => {
                    const on = equipmentOrPicks[choice.id] === option
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`sheet-chip${on ? ' is-on' : ''}`}
                        onClick={() =>
                          setEquipmentOrPicks((prev) => ({
                            ...prev,
                            [choice.id]: option,
                          }))
                        }
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </Field>
            ))}

            {hasRp ? (
              <Stack gap={12}>
                <Text>
                  <strong>Персонализация</strong>
                  <span style={{ opacity: 0.8 }}> — по желанию</span>
                </Text>

                {traitNeed > 0 ? (
                  <Field
                    label={`Черты характера (${personalityTraits.length}/${traitNeed})`}
                  >
                    <ChipList
                      options={def.personalityTraits}
                      selected={personalityTraits}
                      onToggle={toggleTrait}
                      block
                    />
                  </Field>
                ) : null}

                {def.ideals.length > 0 ? (
                  <Field
                    label="Идеал"
                    hint={(() => {
                      if (!ideal) {
                        return 'По идеалу подставим мировоззрение на лист; потом можно править руками'
                      }
                      const suggested = alignmentSuggestionFromIdeal(ideal)
                      return suggested
                        ? `Мировоззрение на лист: ${suggested} (можно поменять вручную)`
                        : 'Идеал «любой» — мировоззрение задай сам на листе'
                    })()}
                  >
                    <ChipList
                      options={def.ideals}
                      selected={ideal ? [ideal] : []}
                      onToggle={(value) =>
                        setIdeal((prev) => (prev === value ? null : value))
                      }
                      block
                    />
                  </Field>
                ) : null}

                {def.bonds.length > 0 ? (
                  <Field label="Привязанность">
                    <ChipList
                      options={def.bonds}
                      selected={bond ? [bond] : []}
                      onToggle={(value) =>
                        setBond((prev) => (prev === value ? null : value))
                      }
                      block
                    />
                  </Field>
                ) : null}

                {def.flaws.length > 0 ? (
                  <Field label="Слабость">
                    <ChipList
                      options={def.flaws}
                      selected={flaw ? [flaw] : []}
                      onToggle={(value) =>
                        setFlaw((prev) => (prev === value ? null : value))
                      }
                      block
                    />
                  </Field>
                ) : null}
              </Stack>
            ) : null}
          </>
        ) : null}

        {!canConfirm && variantOk ? (
          <Text tone="muted">Отметь обязательные развилки, чтобы продолжить.</Text>
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
          Своя предыстория: только название на листе. Владения и таблицы задаёшь сам.
        </Text>
        <Field label="Название на листе">
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
