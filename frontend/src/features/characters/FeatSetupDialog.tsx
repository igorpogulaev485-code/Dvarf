import { useEffect, useMemo, useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  buildAppliedFeatPackage,
  commonLanguageOptions,
  emptyFeatPicks,
  featGrantDefFromCatalog,
  validateFeatGrantPicks,
  type AbilityKey,
  type ArmorProfKey,
  type FeatGrantDef,
  type FeatGrantPicks,
  type FeatGrantsPackage,
} from '../../shared/dnd/featGrants'
import { CatalogCombobox } from '../catalog'
import { ABILITY_LABELS, SKILL_DEFS } from './sheetTypes'
import { Button, Dialog, Field, Stack, Text } from '../../ui'

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
  onConfirm,
  onClose,
}: FeatSetupDialogProps) {
  const [selected, setSelected] = useState<CatalogEntry | null>(null)
  const [value, setValue] = useState('')
  const [picks, setPicks] = useState<FeatGrantPicks>(emptyFeatPicks())
  const [customTool, setCustomTool] = useState('')
  const [customWeapon, setCustomWeapon] = useState('')
  const [customLanguage, setCustomLanguage] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!open) return
    setSelected(null)
    setValue('')
    setPicks(emptyFeatPicks())
    setCustomTool('')
    setCustomWeapon('')
    setCustomLanguage('')
    setError(null)
  }, [open])

  useEffect(() => {
    setPicks(emptyFeatPicks())
    setError(null)
  }, [selected?.id])

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
    })
    if (check) {
      setError(check)
      return
    }
    onConfirm({
      entry: selected,
      def,
      picks,
      applied: buildAppliedFeatPackage({ def, picks }),
    })
  }

  return (
    <Dialog
      open={open}
      title={title}
      primaryLabel="Взять черту"
      secondaryLabel="Отмена"
      size="wide"
      onPrimary={confirm}
      onSecondary={onClose}
      primaryDisabled={!selected || !def}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Каталог черт 2014 (PHB → TCE → XGE → FTD → ERLW → SCC…). Гранты — на лист.
        </Text>

        <Field label="Черта">
          <CatalogCombobox
            kind="feat"
            edition={edition}
            value={value}
            placeholder="Начни вводить название…"
            filterEntry={(entry) => !takenSlugs.includes(entry.slug)}
            onChange={(next, entry) => {
              setValue(next)
              setSelected(entry)
            }}
          />
        </Field>

        {def ? (
          <>
            {def.prerequisitesRu ? (
              <Text tone="muted">Требования: {def.prerequisitesRu}</Text>
            ) : null}
            {def.fixedGrants.summaryRu ? (
              <Text>{def.fixedGrants.summaryRu}</Text>
            ) : null}
            {def.fixedGrants.benefitsRu ? (
              <Text tone="muted">{def.fixedGrants.benefitsRu}</Text>
            ) : null}

            {def.choices.map((choice) => {
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
                          onClick={() => setEnumPick(choice.id, opt.id)}
                        >
                          {opt.label_ru}
                        </Button>
                      ))}
                    </div>
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
            })}
          </>
        ) : null}

        {error ? <Text tone="danger">{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}
