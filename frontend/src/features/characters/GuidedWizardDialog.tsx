/** One guided dialog for create / level-up pending picks (grant → expertise → ASI…). */

import { useEffect, useMemo, useState } from 'react'
import {
  equipmentPackagesFor,
  packageForMode,
  skillOptionsForPackage,
  type ClassGrantDef,
  type ClassGrantPicks,
} from '../../shared/dnd/classGrants'
import {
  CLASS_ASI_MODE_OPTIONS,
  validateClassAsiPicks,
  type AbilityKey,
  type AppliedClassAsi,
  type ClassAsiModeId,
} from '../../shared/dnd/classAsi'
import {
  newFeatGrantId,
  type AppliedFeatGrant,
  type ArmorProfKey,
  type OwnedFeatEnumSnapshot,
} from '../../shared/dnd/featGrants'
import {
  resolveChoiceMaxPicks,
  resolveFeatureChoiceOptions,
  type FeatureChoiceDef,
} from '../../shared/dnd/classFeatures'
import {
  collectExpertiseOptionIdsFromPicks,
  isExpertiseChoice,
  listExpertiseOptions,
  THIEVES_TOOLS_LABEL_RU,
  THIEVES_TOOLS_OPTION_ID,
  type SkillExpertiseState,
} from '../../shared/dnd/expertise'
import {
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  toggleFeaturePickInList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { fightingStyleById } from '../../shared/dnd/fightingStyles'
import type { GuidedWizardStep } from '../../shared/dnd/pendingFeatureChoices'
import type { RulesEdition } from '../../shared/api/characters'
import type { CatalogEntry } from '../../shared/api/catalog'
import { CatalogCombobox } from '../catalog'
import { AsiChoiceBody } from './AsiChoiceBody'
import { SKILL_DEFS } from './sheetTypes'
import { FeatSetupDialog, type FeatSetupResult } from './FeatSetupDialog'
import { Button, Dialog, Field, Stack, Text } from '../../ui'

export type GuidedFeatContext = {
  armor: Partial<Record<ArmorProfKey, boolean>>
  hasSpellcasting: boolean
  hasMartialWeapons?: boolean
  raceSlug?: string | null
  raceParentSlug?: string | null
  size?: string | null
  characterLevel?: number
  takenFeatSlugs?: string[]
  classSlugs?: string[]
  backgroundSlug?: string | null
  ownedFeatEnums?: OwnedFeatEnumSnapshot[]
  proficientSkills?: string[]
}

export type GuidedWizardSession = {
  steps: GuidedWizardStep[]
  index: number
  /** Optional grant context when first step is class_grant */
  grant?: {
    def: ClassGrantDef
    catalogSlug?: string | null
    catalogData?: Record<string, unknown> | null
  }
}

type GuidedWizardDialogProps = {
  open: boolean
  session: GuidedWizardSession | null
  edition: RulesEdition
  abilities: Record<AbilityKey, number>
  skills: SkillExpertiseState
  tools: string[]
  featurePicks: FeaturePicksState
  expertiseKeys: Array<{ classEntryId: string; featureId: string }>
  /** Current background name on the sheet (after grant). */
  backgroundName?: string
  /** Skills/tools already granted by background — blocked on class step. */
  blockedSkillKeys?: string[]
  blockedToolNames?: string[]
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onConfirmClassGrant: (picks: ClassGrantPicks) => void
  onConfirmAsi: (entry: AppliedClassAsi, featGrant?: AppliedFeatGrant) => void
  /** Sheet context for the feat catalog (ASI or racial feat step). */
  featContext?: GuidedFeatContext
  /** Racial / listed feat step — parent writes the grant. */
  onConfirmFeat?: (result: FeatSetupResult) => void
  /** User picked a catalog background — parent opens setup / applies grant. */
  onSelectBackground: (entry: CatalogEntry) => void
  onAdvance: (nextIndex: number) => void
  onSkipStep: () => void
  onClose: () => void
  onToast?: (message: string) => void
  /**
   * Pick archetype inside the subclass wizard step.
   * Parent pauses this wizard, opens SubclassSetup for forks (or commits empty
   * packs immediately), then resumes / advances the queue.
   */
  onPickSubclass?: (classEntryId: string, entry: CatalogEntry) => void
  /** classEntryId → parent class catalog id (filters subclass combobox). */
  subclassParentCatalogIdByEntryId?: Record<string, string | null | undefined>
  /** classEntryId → already selected subclass display name. */
  selectedSubclassNameByEntryId?: Record<string, string | undefined>
}

function skillLabel(key: string): string {
  return SKILL_DEFS.find((item) => item.key === key)?.label ?? key
}

const OPTION_LABEL_FALLBACKS_RU: Record<string, string> = {
  plus2: '+2 к одной характеристике',
  plus1x2: '+1 к двум характеристикам',
  feat_coming_soon: 'Черта',
}

function choiceOptionLabel(optionId: string, choice?: FeatureChoiceDef | null): string {
  if (optionId === THIEVES_TOOLS_OPTION_ID) return THIEVES_TOOLS_LABEL_RU
  const labeled = choice?.option_labels_ru?.[optionId]?.trim()
  if (labeled) return labeled
  if (OPTION_LABEL_FALLBACKS_RU[optionId]) return OPTION_LABEL_FALLBACKS_RU[optionId]
  if (isExpertiseChoice(choice)) {
    return skillLabel(optionId)
  }
  return (
    fightingStyleById(optionId)?.nameRu ||
    skillLabel(optionId) ||
    optionId
  )
}

function ClassGrantStepBody({
  def,
  mode,
  picks,
  onChange,
  blockedSkillKeys = [],
  blockedToolNames = [],
}: {
  def: ClassGrantDef
  mode: 'start' | 'multiclass'
  picks: ClassGrantPicks
  onChange: (picks: ClassGrantPicks) => void
  /** Already from background — cannot pick again on class. */
  blockedSkillKeys?: string[]
  blockedToolNames?: string[]
}) {
  const pkg = packageForMode(def, mode)
  const skillNeed = pkg.skillChoices?.count ?? 0
  const toolNeed = pkg.toolChoices?.count ?? 0
  const skillOptions = skillOptionsForPackage(pkg)
  const toolOptions = pkg.toolChoices?.from ?? []
  const equipmentPackages = mode === 'start' ? equipmentPackagesFor(def) : []
  const blockedSkills = new Set(blockedSkillKeys)
  const blockedTools = new Set(
    blockedToolNames.map((name) => name.trim().toLowerCase()),
  )

  function toggleSkill(key: string) {
    if (blockedSkills.has(key)) return
    const skills = picks.skills.includes(key)
      ? picks.skills.filter((item) => item !== key)
      : picks.skills.length >= skillNeed
        ? picks.skills
        : [...picks.skills, key]
    onChange({ ...picks, skills })
  }

  function toggleTool(name: string) {
    if (blockedTools.has(name.trim().toLowerCase())) return
    const tools = picks.tools.includes(name)
      ? picks.tools.filter((item) => item !== name)
      : picks.tools.length >= toolNeed
        ? picks.tools
        : [...picks.tools, name]
    onChange({ ...picks, tools })
  }

  return (
    <Stack gap={14}>
      <Text tone="muted">
        {mode === 'start'
          ? 'Выбери навыки, инструменты и стартовое снаряжение. Серые — уже с предыстории, не дублируй.'
          : 'Мультикласс: только владения из таблицы PHB.'}
      </Text>
      {skillNeed > 0 ? (
        <Field label={`Навыки (${picks.skills.length}/${skillNeed})`}>
          <div className="chip-row">
            {skillOptions.map((key) => {
              const blocked = blockedSkills.has(key)
              const on = !blocked && picks.skills.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  disabled={blocked}
                  title={blocked ? 'Уже есть с предыстории' : undefined}
                  className={`sheet-chip${on ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}`}
                  onClick={() => toggleSkill(key)}
                >
                  {skillLabel(key)}
                  {blocked ? ' · уже есть' : ''}
                </button>
              )
            })}
          </div>
        </Field>
      ) : null}
      {toolNeed > 0 ? (
        <Field label={`Инструменты (${picks.tools.length}/${toolNeed})`}>
          <div className="chip-row">
            {toolOptions.map((name) => {
              const blocked = blockedTools.has(name.trim().toLowerCase())
              const on = !blocked && picks.tools.includes(name)
              return (
                <button
                  key={name}
                  type="button"
                  disabled={blocked}
                  title={blocked ? 'Уже есть с предыстории' : undefined}
                  className={`sheet-chip${on ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}`}
                  onClick={() => toggleTool(name)}
                >
                  {name}
                  {blocked ? ' · уже есть' : ''}
                </button>
              )
            })}
          </div>
        </Field>
      ) : null}
      {mode === 'start' && equipmentPackages.length > 0 ? (
        <Field label="Стартовое снаряжение">
          <Stack gap={8}>
            {equipmentPackages.map((pack) => {
              const on = picks.equipmentPackageId === pack.id
              return (
                <button
                  key={pack.id}
                  type="button"
                  className={`sheet-chip${on ? ' is-on' : ''}`}
                  style={{ display: 'block', width: '100%', textAlign: 'left' }}
                  onClick={() => onChange({ ...picks, equipmentPackageId: pack.id })}
                >
                  <strong>{pack.labelRu}</strong>
                  <div style={{ opacity: 0.85, fontWeight: 400 }}>{pack.summary}</div>
                </button>
              )
            })}
          </Stack>
        </Field>
      ) : null}
    </Stack>
  )
}

function FeatureChoiceStepBody({
  step,
  skills,
  tools,
  featurePicks,
  expertiseKeys,
  onFeaturePicksChange,
}: {
  step: Extract<GuidedWizardStep, { kind: 'feature_choice' }>
  skills: SkillExpertiseState
  tools: string[]
  featurePicks: FeaturePicksState
  expertiseKeys: Array<{ classEntryId: string; featureId: string }>
  onFeaturePicksChange: (picks: FeaturePicksState) => void
}) {
  const choice = step.choice
  const maxPicks = resolveChoiceMaxPicks(choice, step.classLevel)
  const multi = maxPicks > 1 || Boolean(choice.max_picks_by_level)
  const selectedList = multi
    ? getFeaturePickList(featurePicks, step.classEntryId, step.featureId)
    : []
  const selected = multi
    ? null
    : getFeaturePick(featurePicks, step.classEntryId, step.featureId)

  const options = useMemo(() => {
    if (isExpertiseChoice(choice)) {
      const excluded = collectExpertiseOptionIdsFromPicks({
        featurePicks,
        expertiseKeys,
        except: { classEntryId: step.classEntryId, featureId: step.featureId },
      })
      return listExpertiseOptions({ skills, tools, excludeOptionIds: excluded }).map((row) => ({
        id: row.id,
        label: row.kind === 'tool' ? row.labelRu : skillLabel(row.id),
      }))
    }
    return resolveFeatureChoiceOptions(choice).map((id) => ({
      id,
      label: choiceOptionLabel(id, choice),
    }))
  }, [choice, skills, tools, featurePicks, expertiseKeys, step.classEntryId, step.featureId])

  const selectedDef = fightingStyleById(selected)

  return (
    <Stack gap={14}>
      <Text tone="muted">
        {step.featureNameRu} · {step.className} {step.classLevel}
        {multi ? ` · выбери ${maxPicks}` : ''}
      </Text>
      {isExpertiseChoice(choice) ? (
        <Text tone="muted">
          Только из того, чем уже владеешь (класс, раса, архетип…). Воровские инструменты — если они
          есть на листе.
        </Text>
      ) : null}
      {selectedDef ? <Text tone="muted">{selectedDef.summaryRu}</Text> : null}
      <div className="chip-row" role="group" aria-label={choice.label_ru}>
        {options.map((option) => {
          const active = multi
            ? selectedList.includes(option.id)
            : selected === option.id
          return (
            <Button
              key={option.id}
              type="button"
              variant={active ? 'primary' : 'ghost'}
              onClick={() => {
                if (multi) {
                  onFeaturePicksChange(
                    toggleFeaturePickInList(
                      featurePicks,
                      step.classEntryId,
                      step.featureId,
                      option.id,
                      maxPicks,
                    ),
                  )
                  return
                }
                onFeaturePicksChange(
                  setFeaturePick(featurePicks, step.classEntryId, step.featureId, option.id),
                )
              }}
            >
              {active && multi ? `✓ ${option.label}` : option.label}
            </Button>
          )
        })}
      </div>
      {options.length === 0 ? (
        <Text tone="muted">Пока нет доступных вариантов — сначала возьми владения.</Text>
      ) : null}
      {multi ? (
        <Text tone="muted">
          Выбрано: {selectedList.length}/{maxPicks}
          {selectedList.length
            ? ` · ${selectedList.map((id) => choiceOptionLabel(id, choice)).join(', ')}`
            : ''}
        </Text>
      ) : null}
    </Stack>
  )
}

export function GuidedWizardDialog({
  open,
  session,
  edition,
  abilities,
  skills,
  tools,
  featurePicks,
  expertiseKeys,
  backgroundName = '',
  blockedSkillKeys = [],
  blockedToolNames = [],
  onFeaturePicksChange,
  onConfirmClassGrant,
  onConfirmAsi,
  featContext,
  onConfirmFeat,
  onSelectBackground,
  onAdvance,
  onSkipStep,
  onClose,
  onToast,
  onPickSubclass,
  subclassParentCatalogIdByEntryId,
  selectedSubclassNameByEntryId,
}: GuidedWizardDialogProps) {
  const step = session?.steps[session.index] ?? null
  const total = session?.steps.length ?? 0
  const index = session?.index ?? 0

  const [grantPicks, setGrantPicks] = useState<ClassGrantPicks>({
    skills: [],
    tools: [],
    equipmentPackageId: null,
  })
  const [asiModeId, setAsiModeId] = useState<ClassAsiModeId>('plus2')
  const [asiUiMode, setAsiUiMode] = useState<'scores' | 'feat'>('scores')
  const [asiKeys, setAsiKeys] = useState<AbilityKey[]>([])
  const [asiError, setAsiError] = useState<string | null>(null)
  const [featOpen, setFeatOpen] = useState(false)
  const [backgroundDraftName, setBackgroundDraftName] = useState('')

  useEffect(() => {
    if (!open || !step) return
    if (step.kind === 'class_grant') {
      setGrantPicks({ skills: [], tools: [], equipmentPackageId: null })
    }
    if (step.kind === 'asi') {
      setAsiModeId('plus2')
      setAsiUiMode('scores')
      setAsiKeys([])
      setAsiError(null)
      setFeatOpen(false)
    }
    if (step.kind === 'feat') {
      setFeatOpen(false)
    }
    if (step.kind === 'background') {
      setBackgroundDraftName(backgroundName)
    }
  }, [open, step?.id, step?.kind, backgroundName])

  const grantDef = session?.grant?.def ?? null
  const grantReady = useMemo(() => {
    if (!step || step.kind !== 'class_grant' || !grantDef) return false
    const pkg = packageForMode(grantDef, step.mode)
    const skillNeed = pkg.skillChoices?.count ?? 0
    const toolNeed = pkg.toolChoices?.count ?? 0
    const equipmentPackages = step.mode === 'start' ? equipmentPackagesFor(grantDef) : []
    const equipmentOk =
      step.mode !== 'start' ||
      equipmentPackages.length === 0 ||
      Boolean(grantPicks.equipmentPackageId)
    return (
      grantPicks.skills.length === skillNeed &&
      grantPicks.tools.length === toolNeed &&
      equipmentOk
    )
  }, [step, grantDef, grantPicks])

  const featureChoiceReady = useMemo(() => {
    if (!step || step.kind !== 'feature_choice') return false
    const maxPicks = resolveChoiceMaxPicks(step.choice, step.classLevel)
    const multi = maxPicks > 1 || Boolean(step.choice.max_picks_by_level)
    if (multi) {
      return (
        getFeaturePickList(featurePicks, step.classEntryId, step.featureId).length >= maxPicks
      )
    }
    return Boolean(getFeaturePick(featurePicks, step.classEntryId, step.featureId))
  }, [step, featurePicks])

  const asiReady =
    step?.kind === 'asi' &&
    (asiUiMode === 'feat' ||
      asiKeys.length ===
        (CLASS_ASI_MODE_OPTIONS.find((row) => row.id === asiModeId)?.amounts.length ?? 1))

  const backgroundReady = Boolean(backgroundName.trim())
  const subclassSelectedName =
    step?.kind === 'subclass'
      ? selectedSubclassNameByEntryId?.[step.classEntryId]?.trim() || ''
      : ''
  const subclassReady = Boolean(subclassSelectedName)
  const subclassParentId =
    step?.kind === 'subclass'
      ? subclassParentCatalogIdByEntryId?.[step.classEntryId] ?? null
      : null

  const primaryDisabled =
    step?.kind === 'class_grant'
      ? !grantReady
      : step?.kind === 'feature_choice'
        ? !featureChoiceReady
        : step?.kind === 'asi'
          ? asiUiMode === 'scores' && !asiReady
          : step?.kind === 'background'
            ? !backgroundReady
            : step?.kind === 'subclass'
              ? !subclassReady
              : false

  const title = !step
    ? 'Настройка персонажа'
    : step.kind === 'class_grant'
      ? `${grantDef?.labelRu ?? step.className}: настройка класса`
      : step.kind === 'asi'
        ? `Увеличение характеристик · ${step.className} ${step.classLevel}`
        : step.kind === 'subclass'
          ? `${step.featureNameRu} · ${step.className}`
          : step.kind === 'background'
            ? 'Предыстория'
            : step.kind === 'feat'
              ? 'Черта'
              : step.kind === 'feature_choice'
                ? `${step.choice.label_ru} · ${step.className}`
                : 'Настройка персонажа'

  const choosingFeat =
    (step?.kind === 'asi' && asiUiMode === 'feat') || step?.kind === 'feat'

  const primaryLabel = choosingFeat
    ? 'Выбрать черту'
    : step?.kind === 'subclass'
      ? index >= total - 1
        ? 'Готово'
        : 'Далее'
      : index >= total - 1
        ? 'Готово'
        : 'Далее'

  const canSkip = step?.kind !== 'class_grant'

  function goNext() {
    if (!session || !step) return

    if (step.kind === 'class_grant') {
      if (!grantReady) return
      // Parent applies grant (+ optional jump to starting level) and replaces the wizard queue.
      onConfirmClassGrant(grantPicks)
      return
    }

    if (step.kind === 'feature_choice') {
      if (!featureChoiceReady) return
      onToast?.(`${step.choice.label_ru}: готово`)
      onAdvance(index + 1)
      return
    }

    if (step.kind === 'asi') {
      if (asiUiMode === 'feat') {
        setFeatOpen(true)
        return
      }
      const check = validateClassAsiPicks({
        modeId: asiModeId,
        keys: asiKeys,
        abilities,
      })
      if (!check.ok) {
        setAsiError(check.reason)
        return
      }
      onConfirmAsi({
        classEntryId: step.classEntryId,
        featureId: step.featureId,
        atClassLevel: step.classLevel,
        resolution: { kind: 'scores', modeId: asiModeId, keys: [...asiKeys] },
        bonuses: check.bonuses,
      })
      onAdvance(index + 1)
      return
    }

    if (step.kind === 'subclass') {
      if (!subclassReady) return
      onToast?.(`Архетип «${subclassSelectedName}» выбран`)
      onAdvance(index + 1)
      return
    }

    if (step.kind === 'background') {
      if (!backgroundReady) return
      onToast?.(
        backgroundName.trim()
          ? `Предыстория «${backgroundName.trim()}» записана. Дальше — класс.`
          : 'Предыстория выбрана. Дальше — класс.',
      )
      onAdvance(index + 1)
      return
    }

    if (step.kind === 'feat') {
      setFeatOpen(true)
    }
  }

  function confirmAsiFeat(result: FeatSetupResult) {
    if (!step || step.kind !== 'asi') return
    const grantId = newFeatGrantId()
    const featGrant: AppliedFeatGrant = {
      id: grantId,
      featCatalogId: result.entry.id,
      slug: result.entry.slug,
      nameRu: result.entry.name_ru,
      source: {
        kind: 'asi',
        classEntryId: step.classEntryId,
        featureId: step.featureId,
        atClassLevel: step.classLevel,
      },
      applied: result.applied,
      picks: result.picks,
    }
    onConfirmAsi(
      {
        classEntryId: step.classEntryId,
        featureId: step.featureId,
        atClassLevel: step.classLevel,
        resolution: {
          kind: 'feat',
          featCatalogId: result.entry.id,
          featSlug: result.entry.slug,
          featGrantId: grantId,
        },
        bonuses: {},
      },
      featGrant,
    )
    setFeatOpen(false)
    onAdvance(index + 1)
  }

  function confirmListedFeat(result: FeatSetupResult) {
    onConfirmFeat?.(result)
    setFeatOpen(false)
    onToast?.(`Черта «${result.entry.name_ru}»`)
    onAdvance(index + 1)
  }

  if (!session || !step) return null

  const feat = featContext ?? { armor: {}, hasSpellcasting: false }
  const featTitle =
    step?.kind === 'asi'
      ? `Черта · ${step.className} ${step.classLevel}`
      : 'Черта'

  return (
    <>
    <Dialog
      open={open && !featOpen}
      title={title}
      primaryLabel={primaryLabel}
      secondaryLabel={canSkip ? 'Позже' : 'Отмена'}
      size="wide"
      primaryDisabled={primaryDisabled}
      onPrimary={goNext}
      onSecondary={canSkip ? onSkipStep : onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Шаг {index + 1} из {total}
        </Text>
        {step.kind === 'class_grant' && grantDef ? (
          <ClassGrantStepBody
            def={grantDef}
            mode={step.mode}
            picks={grantPicks}
            onChange={setGrantPicks}
            blockedSkillKeys={blockedSkillKeys}
            blockedToolNames={blockedToolNames}
          />
        ) : null}
        {step.kind === 'feature_choice' ? (
          <FeatureChoiceStepBody
            step={step}
            skills={skills}
            tools={tools}
            featurePicks={featurePicks}
            expertiseKeys={expertiseKeys}
            onFeaturePicksChange={onFeaturePicksChange}
          />
        ) : null}
        {step.kind === 'asi' ? (
          <AsiChoiceBody
            uiMode={asiUiMode}
            modeId={asiModeId}
            keys={asiKeys}
            abilities={abilities}
            onModeId={(mode) => {
              setAsiUiMode('scores')
              setAsiModeId(mode)
              setAsiKeys([])
              setAsiError(null)
            }}
            onChooseFeat={() => {
              setAsiUiMode('feat')
              setAsiKeys([])
              setAsiError(null)
            }}
            onToggleKey={(key) => {
              setAsiError(null)
              setAsiKeys((prev) => {
                if (prev.includes(key)) return prev.filter((item) => item !== key)
                const limit =
                  CLASS_ASI_MODE_OPTIONS.find((row) => row.id === asiModeId)?.amounts.length ?? 1
                return [...prev, key].slice(-limit)
              })
            }}
            error={asiError}
          />
        ) : null}
        {step.kind === 'subclass' ? (
          <Stack gap={12}>
            <Text>{step.promptRu}</Text>
            <Field label="Архетип из справочника">
              <CatalogCombobox
                id={`wizard-subclass-${step.classEntryId}`}
                kind="subclass"
                edition={edition}
                parentId={subclassParentId}
                disabled={!subclassParentId}
                value={subclassSelectedName}
                placeholder="Начни вводить: Клятва мести, Школа воплощения…"
                onChange={(_value, selected) => {
                  if (!selected) return
                  onPickSubclass?.(step.classEntryId, selected)
                }}
              />
            </Field>
            {!subclassParentId ? (
              <Text tone="muted">Сначала зафиксируй класс из справочника — иначе архетипы не отфильтруются.</Text>
            ) : subclassSelectedName ? (
              <Text>
                Выбрано: <strong>{subclassSelectedName}</strong> — жми «Далее».
              </Text>
            ) : (
              <Text tone="muted">
                Выбор откроет настройки архетипа (если нужны). «Позже» — можно вернуться через
                развилки или сменить архетип отдельным действием.
              </Text>
            )}
          </Stack>
        ) : null}
        {step.kind === 'background' ? (
          <Stack gap={12}>
            <Text>{step.promptRu}</Text>
            <Field label="Предыстория из справочника">
              <CatalogCombobox
                id="wizard-background"
                kind="background"
                edition={edition}
                value={backgroundDraftName || backgroundName}
                placeholder="Начни вводить: преступник, мудрец…"
                filterEntry={(entry) => !entry.parent_id}
                onChange={(value, selected) => {
                  setBackgroundDraftName(value)
                  if (selected) onSelectBackground(selected)
                }}
              />
            </Field>
            {backgroundName.trim() ? (
              <Text>
                Выбрано: <strong>{backgroundName.trim()}</strong> — жми «Далее».
              </Text>
            ) : (
              <Text tone="muted">
                После выбора откроется настройка развилок (навыки, языки, снаряжение). «Позже» —
                можно взять предысторию на листе.
              </Text>
            )}
          </Stack>
        ) : null}
        {step.kind === 'feat' ? (
          <Stack gap={10}>
            <Text>{step.promptRu}</Text>
            {step.noteRu ? <Text tone="muted">{step.noteRu}</Text> : null}
            <Text tone="muted">«Выбрать черту» откроет каталог.</Text>
          </Stack>
        ) : null}
      </Stack>
    </Dialog>
    <FeatSetupDialog
      open={featOpen}
      edition={edition}
      title={featTitle}
      abilities={abilities}
      armor={feat.armor}
      hasSpellcasting={feat.hasSpellcasting}
      hasMartialWeapons={feat.hasMartialWeapons}
      raceSlug={feat.raceSlug}
      raceParentSlug={feat.raceParentSlug}
      size={feat.size}
      characterLevel={feat.characterLevel}
      takenSlugs={feat.takenFeatSlugs}
      classSlugs={feat.classSlugs}
      backgroundSlug={feat.backgroundSlug}
      ownedFeatEnums={feat.ownedFeatEnums}
      proficientSkills={feat.proficientSkills}
      onClose={() => setFeatOpen(false)}
      onConfirm={step.kind === 'asi' ? confirmAsiFeat : confirmListedFeat}
    />
    </>
  )
}
