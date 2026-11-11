/** Действия листа, группа 5. Тела функций перенесены без изменения порядка вызовов. */
import type { SheetModel } from './sheetModel'

export function installSheetActions5(model: SheetModel) {
  model.isArcaneRecoveryResource = function isArcaneRecoveryResource(row: { id: string; name: string }): boolean {
    return (
      /:arcane_recovery:/.test(row.id) ||
      /магическое восстановление/i.test(row.name) ||
      /arcane recovery/i.test(row.name)
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
    return false
  }

  model.spendResourceOrOpenSorcery = function spendResourceOrOpenSorcery(id: string) {
    if (model.openResourceSpendDialog(id)) return
    model.setDraft((prev) => ({
      ...prev,
      play: {
        ...prev.play,
        resources: prev.play.resources.map((item) =>
          item.id === id && item.used < item.max
            ? { ...item, used: item.used + 1 }
            : item,
        ),
      },
    }))
  }
}
