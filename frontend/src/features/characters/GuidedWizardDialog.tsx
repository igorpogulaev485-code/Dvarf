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
import { ABILITY_KEYS, ABILITY_LABELS, SKILL_DEFS } from './sheetTypes'
import { Button, Dialog, Field, Stack, Text } from '../../ui'

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
  abilities: Record<AbilityKey, number>
  skills: SkillExpertiseState
  tools: string[]
  featurePicks: FeaturePicksState
  expertiseKeys: Array<{ classEntryId: string; featureId: string }>
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onConfirmClassGrant: (picks: ClassGrantPicks) => void
  onConfirmAsi: (entry: AppliedClassAsi) => void
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
}: {
  def: ClassGrantDef
  mode: 'start' | 'multiclass'
  picks: ClassGrantPicks
  onChange: (picks: ClassGrantPicks) => void
}) {
  const pkg = packageForMode(def, mode)
  const skillNeed = pkg.skillChoices?.count ?? 0
  const toolNeed = pkg.toolChoices?.count ?? 0
  const skillOptions = skillOptionsForPackage(pkg)
  const toolOptions = pkg.toolChoices?.from ?? []
  const equipmentPackages = mode === 'start' ? equipmentPackagesFor(def) : []

  function toggleSkill(key: string) {
    const skills = picks.skills.includes(key)
      ? picks.skills.filter((item) => item !== key)
      : picks.skills.length >= skillNeed
        ? picks.skills
        : [...picks.skills, key]
    onChange({ ...picks, skills })
  }

  function toggleTool(name: string) {
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
          ? 'Выбери навыки, инструменты и стартовое снаряжение. Дальше мастер предложит умения с выбором.'
          : 'Мультикласс: только владения из таблицы PHB.'}
      </Text>
      {skillNeed > 0 ? (
        <Field label={`Навыки (${picks.skills.length}/${skillNeed})`}>
          <div className="chip-row">
            {skillOptions.map((key) => {
              const on = picks.skills.includes(key)
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
        <Field label={`Инструменты (${picks.tools.length}/${toolNeed})`}>
          <div className="chip-row">
            {toolOptions.map((name) => {
              const on = picks.tools.includes(name)
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
  modeId,
  keys,
  abilities,
  onModeId,
  onToggleKey,
  error,
}: {
  modeId: ClassAsiModeId
  keys: AbilityKey[]
  abilities: Record<AbilityKey, number>
  onModeId: (mode: ClassAsiModeId) => void
  onToggleKey: (key: AbilityKey) => void
  error: string | null
}) {
  const mode = CLASS_ASI_MODE_OPTIONS.find((row) => row.id === modeId) ?? CLASS_ASI_MODE_OPTIONS[0]
  return (
    <Stack gap={14}>
      <Text tone="muted">
        +2 к одной характеристике или +1 к двум (максимум 20). Черты появятся здесь, когда каталог
        будет готов.
      </Text>
      <div className="chip-row" role="group" aria-label="Вариант ASI">
        {CLASS_ASI_MODE_OPTIONS.map((row) => (
          <Button
            key={row.id}
            type="button"
            variant={modeId === row.id ? 'primary' : 'ghost'}
            onClick={() => onModeId(row.id)}
          >
            {row.labelRu}
          </Button>
        ))}
        <Button type="button" variant="ghost" disabled title="Каталог черт ещё собирается">
          Черта (скоро)
        </Button>
      </div>
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
    </Stack>
  )
}

export function GuidedWizardDialog({
  open,
  session,
  abilities,
  skills,
  tools,
  featurePicks,
  expertiseKeys,
  onFeaturePicksChange,
  onConfirmClassGrant,
  onConfirmAsi,
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
  const [asiModeId, setAsiModeId] = useState<ClassAsiModeId>('plus2')
  const [asiKeys, setAsiKeys] = useState<AbilityKey[]>([])
  const [asiError, setAsiError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !step) return
    if (step.kind === 'class_grant') {
      setGrantPicks({ skills: [], tools: [], equipmentPackageId: null })
    }
    if (step.kind === 'asi') {
      setAsiModeId('plus2')
      setAsiKeys([])
      setAsiError(null)
    }
  }, [open, step?.id, step?.kind])

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
    asiKeys.length ===
      (CLASS_ASI_MODE_OPTIONS.find((row) => row.id === asiModeId)?.amounts.length ?? 1)

  const primaryDisabled =
    step?.kind === 'class_grant'
      ? !grantReady
      : step?.kind === 'feature_choice'
        ? !featureChoiceReady
        : step?.kind === 'asi'
          ? !asiReady
          : false

  const title = !step
    ? 'Настройка персонажа'
    : step.kind === 'class_grant'
      ? `${grantDef?.labelRu ?? step.className}: настройка класса`
      : step.kind === 'asi'
        ? `Увеличение характеристик · ${step.className} ${step.classLevel}`
        : step.kind === 'subclass'
          ? `${step.featureNameRu} · ${step.className}`
          : `${step.choice.label_ru} · ${step.className}`

  const primaryLabel =
    step?.kind === 'subclass'
      ? 'К полю архетипа'
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
    }
  }

  if (!session || !step) return null

  return (
    <Dialog
      open={open}
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
            modeId={asiModeId}
            keys={asiKeys}
            abilities={abilities}
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
      </Stack>
    </Dialog>
  )
}
