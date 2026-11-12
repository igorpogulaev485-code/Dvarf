/** Действия листа, группа 5. Тела функций перенесены без изменения порядка вызовов. */
import type { SheetModel } from './sheetModel'
import { parseFeatureResourceId } from '../../../shared/dnd/featureResources'
import { wizardResolvedFeatureId } from '../../../shared/dnd/wizardTradition'

export function installSheetActions5(model: SheetModel) {
  model.isArcaneRecoveryResource = function isArcaneRecoveryResource(row: { id: string; name: string }): boolean {
    return (
      /:arcane_recovery:/.test(row.id) ||
      /:natural_recovery:/.test(row.id) ||
      /магическое восстановление/i.test(row.name) ||
      /природное восстановление/i.test(row.name) ||
      /arcane recovery/i.test(row.name) ||
      /natural recovery/i.test(row.name)
    )
  }

  model.isInfusionSlotsResource = function isInfusionSlotsResource(row: { id: string; name: string }): boolean {
    return (
      /:infusion_slots:/.test(row.id) ||
      /активные инфузии/i.test(row.name)
    )
  }

  model.isMysticArcanumResource = function isMysticArcanumResource(row: { id: string; name: string }): boolean {
    return (
      /:mystic_arcanum_/.test(row.id) ||
      /арканум/i.test(row.name) ||
      /mystic arcanum/i.test(row.name)
    )
  }

  model.isPsionicDiceResource = function isPsionicDiceResource(row: { id: string; name: string }): boolean {
    return (
      /:psionic_energy_dice:/.test(row.id) ||
      /пси-кост/i.test(row.name) ||
      /psionic energy/i.test(row.name)
    )
  }

  model.isSoulTrinketsResource = function isSoulTrinketsResource(row: { id: string; name: string }): boolean {
    return (
      /:soul_trinkets:/.test(row.id) ||
      /частиц/i.test(row.name) ||
      /soul trinket/i.test(row.name)
    )
  }

  model.openResourceSpendDialog = function openResourceSpendDialog(id: string): boolean {
    const row = model.draft.play.resources.find((item) => item.id === id)
    if (!row) return false
    if (model.isSorceryPointsResource(row)) {
      model.setSorcerySpendId(id)
      return true
    }
    if (model.isChannelDivinityResource(row)) {
      model.setChannelDivinitySpendId(id)
      return true
    }
    if (model.isKiResource(row)) {
      model.setKiSpendId(id)
      return true
    }
    if (model.isBardicInspirationResource(row)) {
      model.setBardicInspirationSpendId(id)
      return true
    }
    if (model.isLayOnHandsResource(row)) {
      model.setLayOnHandsSpendId(id)
      return true
    }
    if (model.isSuperiorityDiceResource(row)) {
      model.setSuperioritySpendId(id)
      return true
    }
    if (model.isArcaneRecoveryResource(row)) {
      model.setArcaneRecoverySpendId(id)
      return true
    }
    if (model.isInfusionSlotsResource(row)) {
      model.setInfusionsSpendId(id)
      return true
    }
    if (model.isMysticArcanumResource(row)) {
      model.setArcanumSpendId(id)
      return true
    }
    if (model.isPsionicDiceResource(row)) {
      model.setPsionicSpendId(id)
      return true
    }
    if (model.isSoulTrinketsResource(row)) {
      model.setSoulTrinketsSpendId(id)
      return true
    }
    const parsed = parseFeatureResourceId(row.id)
    if (parsed?.poolId === 'shapechanger') {
      const feature = (model.unlockedFeatures ?? []).find(
        (item: { id: string; classEntryId: string }) =>
          item.id === 'shapechanger' && item.classEntryId === parsed.classEntryId,
      )
      if (feature) {
        model.setFeatureSelfForm({
          feature,
          classSlug: parsed.classSlug,
          classEntryId: parsed.classEntryId,
        })
        return true
      }
    }
    if (parsed && wizardResolvedFeatureId(parsed.poolId)) {
      model.setWizardFeatureUse({
        featureId: parsed.poolId,
        resourceId: row.id,
        classSlug: parsed.classSlug,
        classEntryId: parsed.classEntryId,
        name: row.name,
      })
      return true
    }
    return false
  }

  model.spendResourceOrOpenSorcery = function spendResourceOrOpenSorcery(id: string) {
    if (model.openResourceSpendDialog(id)) return
    const current = model.draft.play.resources.find((item) => item.id === id)
    model.setDraft((prev) => ({
      ...prev,
      play: {
        ...prev.play,
        resources: prev.play.resources.map((item) => {
          if (item.id !== id) return item
          if (item.track === 'stock') {
            if (item.used <= 0) return item
            return { ...item, used: item.used - 1 }
          }
          if (item.used >= item.max) return item
          return { ...item, used: item.used + 1 }
        }),
      },
    }))
    if (
      current &&
      current.track !== 'stock' &&
      current.used + 1 >= current.max &&
      current.depleteHint
    ) {
      model.onToast(current.depleteHint)
    }
  }
}
