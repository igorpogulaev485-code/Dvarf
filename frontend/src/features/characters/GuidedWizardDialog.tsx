/** One guided dialog for create / level-up pending picks (grant → expertise → ASI…). */

import { useEffect, useMemo, useState } from 'react'
import {
  equipmentPackagesFor,
  formatFixedGrantLines,
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
import {
  newFeatGrantId,
  type ArmorProfKey,
  type AppliedFeatGrant,
  type OwnedFeatEnumSnapshot,
} from '../../shared/dnd/featGrants'
import { fightingStyleById } from '../../shared/dnd/fightingStyles'
import type { GuidedWizardStep } from '../../shared/dnd/pendingFeatureChoices'
import type { RulesEdition } from '../../shared/api/characters'
import type { CatalogEntry } from '../../shared/api/catalog'
import { CatalogCombobox } from '../catalog'
import { FeatSetupDialog, type FeatSetupResult } from './FeatSetupDialog'
import { ABILITY_KEYS, ABILITY_LABELS, SKILL_DEFS } from './sheetTypes'
import { Button, Dialog, Field, Stack, Text } from '../../ui'

type AsiUiMode = 'scores' | 'feat'

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
  /** Context for ASI → feat catalog (FeatSetupDialog). */
  armor?: Partial<Record<ArmorProfKey, boolean>>
  hasSpellcasting?: boolean
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
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onConfirmClassGrant: (picks: ClassGrantPicks) => void
  onConfirmAsi: (entry: AppliedClassAsi, featGrant?: AppliedFeatGrant) => void
  /** User picked a catalog background — parent opens setup / applies grant. */
  onSelectBackground: (entry: CatalogEntry) => void
  onAdvance: (nextIndex: number) => void
  onSkipStep: () => void
  onClose: () => void
  onToast?: (message: string) => void
  /** Jump to subclass field after subclass step */
  onFocusSubclass?: (classEntryId: string) => void
}

function skillLabel(key: string): string {
  return SKILL_DEFS.find((item) => item.key === key)?.label ?? key
}

function choiceOptionLabel(optionId: string, choice?: FeatureChoiceDef | null): string {
  if (optionId === THIEVES_TOOLS_OPTION_ID) return THIEVES_TOOLS_LABEL_RU
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

  const fixedLines = formatFixedGrantLines(pkg)

  return (
    <Stack gap={14}>
      <Text tone="muted">
        {mode === 'start'
          ? 'Выбери навыки, инструменты и стартовое снаряжение. Серые — уже с предыстории, не дублируй.'
          : 'По PHB при мультиклассе даются только владения из таблицы (без сейвов и без стартового снаряжения).'}
      </Text>
      {fixedLines.length > 0 ? (
        <Stack gap={4}>
          {mode === 'multiclass' ? <Text>Автоматически добавляются:</Text> : null}
          {fixedLines.map((line) => (
            <Text key={line} tone="muted">
              {line}
            </Text>
          ))}
        </Stack>
      ) : mode === 'multiclass' && skillNeed === 0 && toolNeed === 0 ? (
        <Text tone="muted">
          У этого класса нет дополнительных владений при мультиклассе — только уровни и умения.
        </Text>
      ) : null}
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
            <button
              type="button"
              className={`sheet-chip${picks.equipmentPackageId === 'skip' ? ' is-on' : ''}`}
              style={{ display: 'block', width: '100%', textAlign: 'left' }}
              onClick={() => onChange({ ...picks, equipmentPackageId: 'skip' })}
            >
              <strong>Без снаряжения</strong>
              <div style={{ opacity: 0.85, fontWeight: 400 }}>
                Оставить инвентарь как есть — заполню сам
              </div>
            </button>
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

function AsiStepBody({
  uiMode,
  modeId,
  keys,
  abilities,
  onUiMode,
  onModeId,
  onToggleKey,
  onOpenFeatPicker,
  featSummary,
  error,
}: {
  uiMode: AsiUiMode
  modeId: ClassAsiModeId
  keys: AbilityKey[]
  abilities: Record<AbilityKey, number>
  onUiMode: (mode: AsiUiMode) => void
  onModeId: (mode: ClassAsiModeId) => void
  onToggleKey: (key: AbilityKey) => void
  onOpenFeatPicker: () => void
  featSummary: string | null
  error: string | null
}) {
  const mode = CLASS_ASI_MODE_OPTIONS.find((row) => row.id === modeId) ?? CLASS_ASI_MODE_OPTIONS[0]
  return (
    <Stack gap={14}>
      <Text tone="muted">
        +2 к одной характеристике, +1 к двум (максимум 20) или одна черта из каталога.
      </Text>
      <div className="chip-row" role="group" aria-label="Вариант ASI">
        {CLASS_ASI_MODE_OPTIONS.map((row) => (
          <Button
            key={row.id}
            type="button"
            variant={uiMode === 'scores' && modeId === row.id ? 'primary' : 'ghost'}
            onClick={() => {
              onUiMode('scores')
              onModeId(row.id)
            }}
          >
            {row.labelRu}
          </Button>
        ))}
        <Button
          type="button"
          variant={uiMode === 'feat' ? 'primary' : 'ghost'}
          onClick={() => onUiMode('feat')}
        >
          Черта
        </Button>
      </div>
      {uiMode === 'scores' ? (
        <>
          <div className="chip-row" role="group" aria-label="Характеристики">
            {ABILITY_KEYS.map((key) => {
              const selected = keys.includes(key)
              return (
                <Button
                  key={key}
                  type="button"
                  variant={selected ? 'primary' : 'ghost'}
                  onClick={() => onToggleKey(key)}
                >
                  {ABILITY_LABELS[key]} {abilities[key]}
                </Button>
              )
            })}
          </div>
          {error ? <Text tone="danger">{error}</Text> : null}
          {!error && mode ? (
            <Text tone="muted">
              Нужно выбрать: {mode.amounts.length} · сейчас {keys.length}
            </Text>
          ) : null}
        </>
      ) : (
        <Stack gap={10}>
          <Text tone="muted">
            Открой каталог черт — ASI / заклинание и другие развилки выбираются там, гранты лягут на
            лист.
          </Text>
          {featSummary ? <Text>Выбрано: {featSummary}</Text> : null}
          <Button type="button" variant={featSummary ? 'secondary' : 'primary'} onClick={onOpenFeatPicker}>
            {featSummary ? 'Сменить черту' : 'Настроить и взять черту'}
          </Button>
        </Stack>
      )}
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
  armor = {},
  hasSpellcasting = false,
  hasMartialWeapons = false,
  raceSlug = null,
  raceParentSlug = null,
  size = null,
  characterLevel = 1,
  takenFeatSlugs = [],
  classSlugs = [],
  backgroundSlug = null,
  ownedFeatEnums = [],
  proficientSkills = [],
  onFeaturePicksChange,
  onConfirmClassGrant,
  onConfirmAsi,
  onSelectBackground,
  onAdvance,
  onSkipStep,
  onClose,
  onToast,
  onFocusSubclass,
}: GuidedWizardDialogProps) {
  const step = session?.steps[session.index] ?? null
  const total = session?.steps.length ?? 0
  const index = session?.index ?? 0

  const [grantPicks, setGrantPicks] = useState<ClassGrantPicks>({
    skills: [],
    tools: [],
    equipmentPackageId: null,
  })
  const [asiUiMode, setAsiUiMode] = useState<AsiUiMode>('scores')
  const [asiModeId, setAsiModeId] = useState<ClassAsiModeId>('plus2')
  const [asiKeys, setAsiKeys] = useState<AbilityKey[]>([])
  const [asiError, setAsiError] = useState<string | null>(null)
  const [featPickerOpen, setFeatPickerOpen] = useState(false)
  const [asiFeatResult, setAsiFeatResult] = useState<FeatSetupResult | null>(null)
  const [backgroundDraftName, setBackgroundDraftName] = useState('')

  useEffect(() => {
    if (!open || !step) return
    if (step.kind === 'class_grant') {
      setGrantPicks({ skills: [], tools: [], equipmentPackageId: null })
    }
    if (step.kind === 'asi') {
      setAsiUiMode('scores')
      setAsiModeId('plus2')
      setAsiKeys([])
      setAsiError(null)
      setFeatPickerOpen(false)
      setAsiFeatResult(null)
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

  const asiScoresReady =
    asiUiMode === 'scores' &&
    asiKeys.length ===
      (CLASS_ASI_MODE_OPTIONS.find((row) => row.id === asiModeId)?.amounts.length ?? 1)
  const asiFeatReady = asiUiMode === 'feat' && Boolean(asiFeatResult)
  const asiReady = step?.kind === 'asi' && (asiScoresReady || asiFeatReady || asiUiMode === 'feat')

  const backgroundReady = Boolean(backgroundName.trim())

  const primaryDisabled =
    step?.kind === 'class_grant'
      ? !grantReady
      : step?.kind === 'feature_choice'
        ? !featureChoiceReady
        : step?.kind === 'asi'
          ? asiUiMode === 'feat'
            ? false
            : !asiScoresReady
          : step?.kind === 'background'
            ? !backgroundReady
            : false

  const title = !step
    ? 'Настройка персонажа'
    : step.kind === 'class_grant'
      ? step.mode === 'multiclass'
        ? `${grantDef?.labelRu ?? step.className}: владения мультикласса`
        : `${grantDef?.labelRu ?? step.className}: старт класса`
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

  const primaryLabel =
    step?.kind === 'subclass'
      ? 'К полю архетипа'
      : step?.kind === 'asi' && asiUiMode === 'feat' && !asiFeatResult
        ? 'Выбрать черту'
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
        if (!asiFeatResult) {
          setFeatPickerOpen(true)
          return
        }
        confirmAsiFeat(asiFeatResult)
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
      onFocusSubclass?.(step.classEntryId)
      onToast?.(step.promptRu)
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
      onToast?.('Черта: открой настройку на шаге расы / ASI или на листе')
      onAdvance(index + 1)
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
    setFeatPickerOpen(false)
    setAsiFeatResult(result)
    onAdvance(index + 1)
  }

  if (!session || !step) return null

  return (
    <>
    <Dialog
      open={open && !featPickerOpen}
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
          <AsiStepBody
            uiMode={asiUiMode}
            modeId={asiModeId}
            keys={asiKeys}
            abilities={abilities}
            onUiMode={(mode) => {
              setAsiUiMode(mode)
              setAsiKeys([])
              setAsiError(null)
              if (mode === 'scores') setAsiFeatResult(null)
            }}
            onModeId={(mode) => {
              setAsiModeId(mode)
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
            onOpenFeatPicker={() => setFeatPickerOpen(true)}
            featSummary={
              asiFeatResult
                ? `${asiFeatResult.entry.name_ru}${
                    asiFeatResult.applied.summaryRu
                      ? ` · ${asiFeatResult.applied.summaryRu}`
                      : ''
                  }`
                : null
            }
            error={asiError}
          />
        ) : null}
        {step.kind === 'subclass' ? (
          <Stack gap={10}>
            <Text>{step.promptRu}</Text>
            <Text tone="muted">
              После выбора архетипа на листе мастер подхватит новые выборы (воззвания, дар и т.п.)
              при level-up или с умения.
            </Text>
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
            <Text tone="muted">
              Расовую черту бери на шаге «Черта» / в настройке расы; ASI-черту — в шаге увеличения
              характеристик.
            </Text>
          </Stack>
        ) : null}
      </Stack>
    </Dialog>

    <FeatSetupDialog
      open={featPickerOpen && step.kind === 'asi'}
      edition={edition}
      title={
        step.kind === 'asi'
          ? `Черта · ${step.className} ${step.classLevel}`
          : 'Черта'
      }
      abilities={abilities}
      armor={armor}
      hasSpellcasting={hasSpellcasting}
      hasMartialWeapons={hasMartialWeapons}
      raceSlug={raceSlug}
      raceParentSlug={raceParentSlug}
      size={size}
      characterLevel={characterLevel}
      takenSlugs={takenFeatSlugs}
      classSlugs={classSlugs}
      backgroundSlug={backgroundSlug}
      ownedFeatEnums={ownedFeatEnums}
      proficientSkills={proficientSkills}
      onClose={() => setFeatPickerOpen(false)}
      onConfirm={(result) => {
        setAsiFeatResult(result)
        confirmAsiFeat(result)
      }}
    />
    </>
  )
}
