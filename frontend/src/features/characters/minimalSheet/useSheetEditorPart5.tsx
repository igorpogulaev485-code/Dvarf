/** Состояние и эффекты листа, часть 5. Порядок хуков совпадает с прежним компонентом. */
import type { SheetModel } from './sheetModel'
import { useMemo } from 'react'
import { isSelfForm } from '../companions'
import { DEFAULT_ABILITY_SCORE_MAX, clampAbilityScore } from '../../../shared/dnd/abilityScoreCaps'
import { AbilitySkillsColumn } from '../AbilitySkillsColumn'
import { ABILITY_KEYS, type AbilityKey } from '../sheetTypes'
import { cycleSkill } from './draft'

export function useSheetEditorPart5(model: SheetModel) {

  const mergedSaveExtras = useMemo(() => {
    const out: Partial<Record<AbilityKey | 'all', number>> = {
      ...model.gearEffects.saveBonuses,
    }
    for (const key of ABILITY_KEYS) {
      const extra = model.abilitySaveExtras[key] ?? 0
      if (!extra) continue
      out[key] = (out[key] ?? 0) + extra
    }
    if (model.infusionBonuses.saveBonus) {
      out.all = (out.all ?? 0) + model.infusionBonuses.saveBonus
    }
    return out
  }, [model.gearEffects.saveBonuses, model.abilitySaveExtras, model.infusionBonuses.saveBonus])
  model.mergedSaveExtras = mergedSaveExtras

  const abilityColumn = (
    <AbilitySkillsColumn
      abilityOrder={model.draft.sheetUi.abilityOrder}
      collapsedAbilities={model.draft.sheetUi.collapsedAbilities}
      abilities={model.draft.abilities}
      displayAbilities={model.effectiveAbilities}
      saves={model.draft.saves}
      skills={model.draft.skills}
      proficiencyBonus={model.proficiencyBonus}
      auraSaveBonus={model.auraSaveBonus}
      saveBonusExtra={mergedSaveExtras}
      checkBonusExtra={model.abilityCheckExtras}
      skillBonusExtra={model.gearEffects.skillBonuses}
      onOpenAbility={(key) => model.setAbilityBreakdownKey(key)}
      onRollCheck={model.rollAbilityCheck}
      onRollSave={model.rollAbilitySave}
      onRollSkill={model.rollModeSkill}
      abilityMaxes={Object.fromEntries(
        ABILITY_KEYS.map((key) => [
          key,
          model.abilityCeilings[key]?.max ?? DEFAULT_ABILITY_SCORE_MAX,
        ]),
      ) as Record<AbilityKey, number>}
      onAbilityScoreChange={(key, score) =>
        model.setDraft((prev) => {
          const max = model.abilityCeilings[key]?.max ?? DEFAULT_ABILITY_SCORE_MAX
          return {
            ...prev,
            abilities: {
              ...prev.abilities,
              [key]: clampAbilityScore(score, max),
            },
          }
        })
      }
      onSaveToggle={(key) =>
        model.setDraft((prev) => ({
          ...prev,
          saves: { ...prev.saves, [key]: !prev.saves[key] },
        }))
      }
      onSkillCycle={(skillKey) =>
        model.setDraft((prev) => ({
          ...prev,
          skills: {
            ...prev.skills,
            [skillKey]: cycleSkill(prev.skills[skillKey]),
          },
        }))
      }
      onReorder={(abilityOrder) => model.patchSheetUi({ abilityOrder })}
      onCollapsedChange={(collapsedAbilities) => model.patchSheetUi({ collapsedAbilities })}
      showValueTips={model.showValueTips}
    />
  )
  model.abilityColumn = abilityColumn

  const passivesCompact = (
    <div className="play-desk__passives play-desk__passives--compact">
      <div className="play-desk__passives-label">Пассивы</div>
      <div className="passive-grid passive-grid--desk">
        <div className="passive-card">
          <span className="passive-card__label">Внимат.</span>
          <strong>{model.passives.perception}</strong>
        </div>
        <div className="passive-card">
          <span className="passive-card__label">Анализ</span>
          <strong>{model.passives.investigation}</strong>
        </div>
        <div className="passive-card">
          <span className="passive-card__label">Прониц.</span>
          <strong>{model.passives.insight}</strong>
        </div>
      </div>
    </div>
  )
  model.passivesCompact = passivesCompact

  const dockCompanions = [...model.draft.companions]
    .filter((row) => row.name.trim())
    .sort((a, b) => {
      const aForm = isSelfForm(a) && a.active ? 0 : 1
      const bForm = isSelfForm(b) && b.active ? 0 : 1
      if (aForm !== bForm) return aForm - bForm
      if (a.active !== b.active) return a.active ? -1 : 1
      return 0
    })
    .slice(0, 4)
  model.dockCompanions = dockCompanions
}
