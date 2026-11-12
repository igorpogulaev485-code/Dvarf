/** Состояние и эффекты листа, часть 3. Порядок хуков совпадает с прежним компонентом. */
import type { SheetModel } from './sheetModel'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { getCharacter, updateCharacter } from '../../../shared/api/characters'
import { ApiRequestError } from '../../../shared/api/client'
import { publishSheetSync } from '../../../shared/sync/characterSheetChannel'
import { formatClassSummary, totalCharacterLevel } from '../../../shared/dnd/classLevels'
import { armorKindLabel, computeArmorClass, mageArmorCompetingFormula } from '../../../shared/dnd/armor'
import {
  acFormulasFromActiveEffects,
  acMinFromActiveEffects,
  speedModsFromActiveEffects,
} from '../../../shared/dnd/activeEffects'
import { bladesongBonuses } from '../../../shared/dnd/wizardTradition'
import { buildSheetFormulaVars } from '../../../shared/dnd/formulas'
import {
  abilityCheckBonus,
  abilitySaveBonus,
  applyAbilityScoreBonuses,
  applyBonusStack,
  bonusesForTarget,
  formatBonusSummary,
  modifiersToSheet,
} from '../modifiers'
import { resolveRaceGrantDef } from '../../../shared/dnd/raceGrants'
import { DEFAULT_ABILITY_SCORE_MAX, clampAbilityScore, resolveAbilityMaxes } from '../../../shared/dnd/abilityScoreCaps'
import { applyHpDelta, constitutionHpDelta } from '../../../shared/dnd/constitutionHp'
import { syncPrimalChampion } from '../../../shared/dnd/primalChampion'
import { customFeaturesToSheet } from '../customFeatures'
import {
  appendSpellCastModifiers,
  applyGearAbilityScores,
  attunedItemIdSet,
  gearDarkvisionFt,
  resolveGearAcBonus,
} from '../gearEffects'
import { passiveScore, skillModifierFromState } from '../../../shared/dnd/passives'
import { syncGearCompanions, syncGearGrantSpells, syncGearResources } from '../gearGrantsSync'
import { listShieldItems } from '../heldEquip'
import { attunementsToSheet } from '../attunement'
import { classLevelsToSheet } from '../classLevels'
import { naturalArmorFromFeatGrants } from '../../../shared/dnd/featGrants'
import { proficiencyBonusForTotalLevel } from '../../../shared/dnd/classFeatures'
import { classWalkSpeedBonusFt } from '../../../shared/dnd/classMovement'
import { featurePicksToSheet } from '../../../shared/dnd/featurePicks'
import { fightingStyleAcBonusFromIds } from '../../../shared/dnd/fightingStyles'
import {
  elegantCourtierPersuasionBonus,
  remarkableAthleteCheckBonus,
} from '../featureCombatBonuses'
import { aggregateInfusionBonuses } from '../../../shared/dnd/infusionEffects'
import { infusionAcFromSharedEffects } from '../../../shared/dnd/infusionItems'
import { beastPhysicalOverlay } from '../wildShape'
import { syncPactBladeAttack } from '../pactBladeAttack'
import { syncRangerConclaveSpells } from '../rangerConclaveSpells'
import { syncSorcererOriginSpells } from '../sorcererOriginSpells'
import { syncDruidicWarriorCantrips } from '../druidicWarrior'
import { stripForgeBlessing } from '../forgeBlessing'
import { syncDruidCircleSpells } from '../druidCircleSpells'
import { reconcileDruidStartWeapons } from '../classEffects'
import { withDruidicLanguage } from '../languagesTools'
import { syncPactChainFamiliar } from '../pactChainEffects'
import { syncCastWithoutSlotGrants } from '../castWithoutSlots'
import { syncPactTomeCantrips } from '../pactTomeEffects'
import { syncMagicalSecrets } from '../bardSecretsSync'
import {
  isMantleCommandSpell,
  MANTLE_CONCENTRATION_ID,
  stripMantleCommand,
  stripSpiritSessionSpells,
} from '../../../shared/dnd/bardCollege'
import { ensurePactTomeSpellCatalog, resolvePactTomeCantripFromOptions } from '../PactTomeCantripsPicker'
import { spellOptionsForPactTomeCantrips } from '../../../shared/dnd/featSpellListOptions'
import { sheetUiToPatch } from '../playDeskUi'
import { identityExtrasToSheet } from '../identity'
import { type InventoryItem, equippedArmorPieces, inventoryToSheet } from '../inventory'
import { playToSheet } from '../play'
import { spellsToSheet } from '../spells'
import { textBlocksToSheet } from '../textBlocks'
import {
  ABILITY_KEYS,
  SKILL_DEFS,
  abilityModifier,
  asRecord,
  type AbilityKey,
} from '../sheetTypes'

export function useSheetEditorPart3(model: SheetModel) {
  const classSpeedHint = useMemo(() => {
    const wearingHeavy = model.armorPiecesForSpeed.armor?.kind === 'heavy'
    const wearingArmorOrShield = Boolean(
      model.armorPiecesForSpeed.armor || model.armorPiecesForSpeed.shield,
    )
    const classBonus = classWalkSpeedBonusFt({
      classes: model.draft.classes,
      wearingHeavyArmor: wearingHeavy,
      wearingArmorOrShield,
    })
    const bits: string[] = []
    if (model.featSpeedBonusFt) bits.push(`черта +${model.featSpeedBonusFt}`)
    if (classBonus) bits.push(`класс +${classBonus}`)
    if (model.gearEffects.speedBonusFt) {
      bits.push(
        `предметы ${model.gearEffects.speedBonusFt >= 0 ? '+' : ''}${model.gearEffects.speedBonusFt}`,
      )
    }
    const effectSpeed = speedModsFromActiveEffects(model.draft.play.effects)
    if (effectSpeed.notes.length) bits.push(...effectSpeed.notes)
    return bits.length ? bits.join(', ') : null
  }, [
    model.armorPiecesForSpeed,
    model.draft.classes,
    model.featSpeedBonusFt,
    model.gearEffects.speedBonusFt,
    model.draft.play.effects,
  ])
  model.classSpeedHint = classSpeedHint
  model.effectSpeedMods = speedModsFromActiveEffects(model.draft.play.effects)

  const attunedItemIds = useMemo(
    () =>
      new Set(
        model.draft.attunements
          .map((slot) => slot.item_id)
          .filter((id): id is string => Boolean(id)),
      ),
    [model.draft.attunements],
  )
  model.attunedItemIds = attunedItemIds

  // Live sources only (class/archetype + active inventory). Baked sheet.max_score
  // is written on save from this resolve — so unequipping an artifact drops the cap.
  const abilityCeilings = useMemo(
    () =>
      resolveAbilityMaxes({
        classes: model.draft.classes,
        inventoryItems: model.draft.inventory.items.map((item) => {
          const extra = item as InventoryItem & {
            item_kind?: string
            magic_mods?: Record<string, unknown> | null
            artifact_snapshot?: Record<string, unknown> | null
          }
          return {
            id: item.id,
            name: item.name,
            qty: item.qty,
            equipped: item.equipped,
            item_kind: extra.item_kind ?? 'other',
            requires_attunement: item.requires_attunement,
            magic_mods: extra.magic_mods ?? null,
            artifact_snapshot: extra.artifact_snapshot ?? null,
            effects: item.effects,
          }
        }),
        attunedItemIds,
      }),
    [model.draft.classes, model.draft.inventory.items, attunedItemIds],
  )
  model.abilityCeilings = abilityCeilings

  // Keep gear-granted companions / charge pools / spells / slot deltas in sync.
  useEffect(() => {
    model.setDraft((prev) => {
      const resources = syncGearResources(prev.play.resources, model.gearEffects)
      const companions = syncGearCompanions(prev.companions, model.gearEffects)
      const spells = syncGearGrantSpells(prev.spells, model.gearEffects)
      const sameRes =
        resources.length === prev.play.resources.length &&
        resources.every((row, index) => {
          const cur = prev.play.resources[index]
          return (
            cur &&
            cur.id === row.id &&
            cur.max === row.max &&
            cur.name === row.name &&
            cur.reset === row.reset
          )
        })
      const sameComp =
        companions.length === prev.companions.length &&
        companions.every((row, index) => prev.companions[index]?.id === row.id)
      const sameSpells =
        spells.known.length === prev.spells.known.length &&
        spells.known.every((row, index) => prev.spells.known[index]?.id === row.id) &&
        JSON.stringify(spells.gear_slot_deltas ?? {}) ===
          JSON.stringify(prev.spells.gear_slot_deltas ?? {}) &&
        [1, 2, 3, 4, 5, 6, 7, 8, 9].every((level) => {
          const a = spells.slots[String(level)]
          const b = prev.spells.slots[String(level)]
          return (a?.max ?? 0) === (b?.max ?? 0)
        })
      if (sameRes && sameComp && sameSpells) return prev
      return {
        ...prev,
        companions,
        spells,
        play: { ...prev.play, resources },
      }
    })
  }, [model.gearEffects])

  // Sorcerer origin spells (Aberrant, Clockwork, Divine, Shadow, Lunar).
  useEffect(() => {
    model.setDraft((prev) => {
      const synced = syncSorcererOriginSpells({
        spells: prev.spells,
        classes: prev.classes,
        subclassSlugByEntryId: model.subclassSlugByEntryId,
        featurePicks: prev.featurePicks,
        subclassGrants: prev.subclassGrants,
      })
      if (!synced.changed) return prev
      return {
        ...prev,
        spells: synced.spells,
        featurePicks: synced.featurePicks,
        subclassGrants: synced.subclassGrants,
      }
    })
  }, [
    model.draft.classes,
    model.draft.featurePicks,
    model.draft.subclassGrants,
    model.subclassSlugByEntryId,
  ])

  // Pact of the Blade weapon card.
  useEffect(() => {
    model.setDraft((prev) => {
      const synced = syncPactBladeAttack({
        weapons: prev.weapons,
        featurePicks: prev.featurePicks,
        classes: prev.classes,
        subclassSlugByEntryId: model.subclassSlugByEntryId,
      })
      if (!synced.changed) return prev
      return { ...prev, weapons: synced.weapons }
    })
  }, [model.draft.classes, model.draft.featurePicks, model.draft.weapons, model.subclassSlugByEntryId])

  // Gloom Stalker (etc.) bonus spells: keep always-prepared list in sync with level.
  useEffect(() => {
    model.setDraft((prev) => {
      const synced = syncRangerConclaveSpells({
        spells: prev.spells,
        classes: prev.classes,
        subclassSlugByEntryId: model.subclassSlugByEntryId,
      })
      if (!synced.changed) return prev
      return { ...prev, spells: synced.spells }
    })
  }, [model.draft.classes, model.subclassSlugByEntryId])

  useEffect(() => {
    model.setDraft((prev) => {
      const synced = syncDruidicWarriorCantrips({
        spells: prev.spells,
        featurePicks: prev.featurePicks,
        classes: prev.classes,
      })
      if (!synced.changed) return prev
      return { ...prev, spells: synced.spells }
    })
  }, [model.draft.classes, model.draft.featurePicks])

  useEffect(() => {
    model.setDraft((prev) => {
      const synced = syncMagicalSecrets({
        spells: prev.spells,
        featurePicks: prev.featurePicks,
        classes: prev.classes,
      })
      const hasSpirits = Object.values(model.subclassSlugByEntryId).includes('college_of_spirits')
      const known = hasSpirits
        ? synced.spells.known
        : stripSpiritSessionSpells(synced.spells.known)
      const same =
        known.length === prev.spells.known.length &&
        known.every(
          (spell, index) =>
            spell.id === prev.spells.known[index]?.id &&
            spell.name === prev.spells.known[index]?.name &&
            spell.prepared_locked === prev.spells.known[index]?.prepared_locked,
        )
      if (same) return prev
      return { ...prev, spells: { ...prev.spells, known } }
    })
  }, [model.draft.classes, model.draft.featurePicks, model.subclassSlugByEntryId])

  useEffect(() => {
    model.setDraft((prev) => {
      const active = prev.play.concentration?.spell_id === MANTLE_CONCENTRATION_ID
      if (active || !prev.spells.known.some(isMantleCommandSpell)) return prev
      return {
        ...prev,
        spells: { ...prev.spells, known: stripMantleCommand(prev.spells.known) },
      }
    })
  }, [model.draft.play.concentration])

  useEffect(() => {
    model.setDraft((prev) => {
      const pool = prev.play.resources.find((row) =>
        row.id.includes(':blessing_of_the_forge:'),
      )
      if (!pool || pool.used > 0) return prev
      const stripped = stripForgeBlessing(prev.inventory.items)
      if (!stripped.changed) return prev
      return { ...prev, inventory: { ...prev.inventory, items: stripped.items } }
    })
  }, [model.draft.play.resources])

  // Wildfire (etc.) circle spells: always-prepared as druid for MC cast profiles.
  useEffect(() => {
    model.setDraft((prev) => {
      const synced = syncDruidCircleSpells({
        spells: prev.spells,
        classes: prev.classes,
        subclassSlugByEntryId: model.subclassSlugByEntryId,
        featurePicks: prev.featurePicks,
        subclassGrants: prev.subclassGrants,
      })
      if (!synced.changed) return prev
      return { ...prev, spells: synced.spells }
    })
  }, [
    model.draft.classes,
    model.draft.featurePicks,
    model.draft.subclassGrants,
    model.subclassSlugByEntryId,
  ])

  useEffect(() => {
    model.setDraft((prev) => {
      const hasDruid = prev.classes.some(
        (row) => row.level > 0 && /друид|druid/i.test(row.name),
      )
      const languages = withDruidicLanguage(prev.identity.languages, hasDruid)
      const weapons = reconcileDruidStartWeapons({
        classGrants: prev.classGrants,
        subclassWeaponKeys: prev.subclassGrants.flatMap((grant) => grant.weaponKeys),
        weapons: prev.identity.weapons,
      })
      if (!languages.changed && !weapons.changed) return prev
      return {
        ...prev,
        classGrants: weapons.changed ? weapons.classGrants : prev.classGrants,
        identity: {
          ...prev.identity,
          languages: languages.languages,
          weapons: weapons.changed ? weapons.weapons : prev.identity.weapons,
        },
      }
    })
  }, [model.draft.classes, model.draft.classGrants, model.draft.subclassGrants])

  // Pact of the Tome: materialize / revoke +3 any-list cantrips from feature picks.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let rows: Awaited<ReturnType<typeof ensurePactTomeSpellCatalog>> = []
      try {
        rows = await ensurePactTomeSpellCatalog(model.rulesEdition)
      } catch {
        rows = []
      }
      if (cancelled) return
      const options = spellOptionsForPactTomeCantrips({ spells: rows })
      model.setDraft((prev) => {
        const synced = syncPactTomeCantrips({
          spells: prev.spells,
          featurePicks: prev.featurePicks,
          classes: prev.classes,
          resolveSpell: (slug) => resolvePactTomeCantripFromOptions(slug, options),
        })
        if (!synced.changed) return prev
        return { ...prev, spells: synced.spells }
      })
    })()
    return () => {
      cancelled = true
    }
  }, [model.draft.featurePicks, model.draft.classes, model.rulesEdition])

  // Pact of the Chain: Find Familiar as warlock ritual (card appears after cast).
  useEffect(() => {
    model.setDraft((prev) => {
      const synced = syncPactChainFamiliar({
        spells: prev.spells,
        featurePicks: prev.featurePicks,
        classes: prev.classes,
      })
      if (!synced.changed) return prev
      return { ...prev, spells: synced.spells }
    })
  }, [model.draft.featurePicks, model.draft.classes])

  // Ritual books, at-will invocations, elemental discipline cards.
  useEffect(() => {
    model.setDraft((prev) => {
      const synced = syncCastWithoutSlotGrants({
        spells: prev.spells,
        inventory: prev.inventory,
        featurePicks: prev.featurePicks,
        featGrants: prev.featGrants,
        classes: prev.classes,
        subclassSlugByEntryId: model.subclassSlugByEntryId,
        characterLevel: totalCharacterLevel(prev.classes),
      })
      if (!synced.changed) return prev
      return { ...prev, spells: synced.spells, inventory: synced.inventory }
    })
  }, [
    model.draft.featurePicks,
    model.draft.classes,
    model.draft.featGrants,
    model.draft.spells,
    model.draft.inventory,
    model.subclassSlugByEntryId,
  ])

  const infusionBonuses = useMemo(
    () =>
      aggregateInfusionBonuses({
        featurePicks: model.draft.featurePicks,
        classes: model.draft.classes,
        wearingArmor: Boolean(model.armorPiecesForSpeed.armor),
        wearingShield: Boolean(model.armorPiecesForSpeed.shield),
        items: model.draft.inventory.items,
        attunedItemIds: attunedItemIdSet(model.draft.attunements),
      }),
    [
      model.draft.featurePicks,
      model.draft.classes,
      model.armorPiecesForSpeed.armor,
      model.armorPiecesForSpeed.shield,
      model.draft.inventory.items,
      model.draft.attunements,
    ],
  )
  model.infusionBonuses = infusionBonuses

  /** One list: sheet lines + class-scoped gear + held attuned focus infusion. */
  const spellCastModifiers = useMemo(
    () =>
      appendSpellCastModifiers({
        modifiers: model.draft.modifiers,
        gear: model.gearEffects,
        infusionSpellAttack: infusionBonuses.spellAttackBonus,
      }),
    [model.draft.modifiers, model.gearEffects, infusionBonuses.spellAttackBonus],
  )
  model.spellCastModifiers = spellCastModifiers

  const effectiveDarkvisionFt = useMemo(
    () =>
      Math.max(
        model.featureDarkvisionFt,
        gearDarkvisionFt(model.gearEffects),
        infusionBonuses.darkvisionFt,
      ),
    [model.featureDarkvisionFt, model.gearEffects, infusionBonuses.darkvisionFt],
  )
  model.effectiveDarkvisionFt = effectiveDarkvisionFt

  const ownFormulaVars = useMemo(() => {
    const mods = {
      str: abilityModifier(model.draft.abilities.str),
      dex: abilityModifier(model.draft.abilities.dex),
      con: abilityModifier(model.draft.abilities.con),
      int: abilityModifier(model.draft.abilities.int),
      wis: abilityModifier(model.draft.abilities.wis),
      cha: abilityModifier(model.draft.abilities.cha),
    }
    return buildSheetFormulaVars({
      mods,
      proficiencyBonus: model.proficiencyBonus,
      level: model.characterLevel,
    })
  }, [model.draft.abilities, model.proficiencyBonus, model.characterLevel])

  const gearAbilities = useMemo(() => {
    const boosted = applyAbilityScoreBonuses(
      model.draft.abilities,
      model.draft.modifiers,
      ownFormulaVars,
    )
    return applyGearAbilityScores(boosted, model.gearEffects, infusionBonuses.abilityFloor)
  }, [
    model.draft.abilities,
    model.draft.modifiers,
    ownFormulaVars,
    model.gearEffects,
    infusionBonuses.abilityFloor,
  ])
  model.gearAbilities = gearAbilities

  const formulaVarsBase = useMemo(() => {
    const mods = {
      str: abilityModifier(gearAbilities.str),
      dex: abilityModifier(gearAbilities.dex),
      con: abilityModifier(gearAbilities.con),
      int: abilityModifier(gearAbilities.int),
      wis: abilityModifier(gearAbilities.wis),
      cha: abilityModifier(gearAbilities.cha),
    }
    return buildSheetFormulaVars({
      mods,
      proficiencyBonus: model.proficiencyBonus,
      level: model.characterLevel,
    })
  }, [gearAbilities, model.proficiencyBonus, model.characterLevel])
  model.formulaVarsBase = formulaVarsBase

  const effectiveAbilities = useMemo(() => {
    const form = beastPhysicalOverlay(model.draft.companions)
    if (!form) return gearAbilities
    return {
      ...gearAbilities,
      ...(form.str != null ? { str: form.str } : {}),
      ...(form.dex != null ? { dex: form.dex } : {}),
      ...(form.con != null ? { con: form.con } : {}),
    }
  }, [gearAbilities, model.draft.companions])
  model.effectiveAbilities = effectiveAbilities

  const passivesFromGear = useMemo(() => {
    const modFor = (skillKey: string) => {
      const def = SKILL_DEFS.find((skill) => skill.key === skillKey)
      if (!def) return 0
      const state = model.draft.skills[skillKey]
      return skillModifierFromState({
        abilityMod: abilityModifier(gearAbilities[def.base]),
        proficiencyBonus: model.proficiencyBonus,
        isProficient: Boolean(state?.is_proficient),
        isExpertise: Boolean(state?.is_expertise),
      })
    }
    const featPassive = model.featPassiveBonus ?? 0
    return {
      perception: passiveScore(modFor('perception')) + featPassive,
      investigation: passiveScore(modFor('investigation')) + featPassive,
      insight: passiveScore(modFor('insight')),
    }
  }, [gearAbilities, model.draft.skills, model.proficiencyBonus, model.featPassiveBonus])
  model.passives = passivesFromGear

  const abilityCheckExtras = useMemo(() => {
    const out: Partial<Record<AbilityKey, number>> = {}
    for (const key of ABILITY_KEYS) {
      const n = abilityCheckBonus(key, model.draft.modifiers, formulaVarsBase)
      const athlete = remarkableAthleteCheckBonus({
        features: model.unlockedFeatures,
        proficiencyBonus: model.proficiencyBonus,
        ability: key,
        includesProficiency: false,
      })
      const total = n + athlete
      if (total) out[key] = total
    }
    return out
  }, [model.draft.modifiers, formulaVarsBase, model.unlockedFeatures, model.proficiencyBonus])
  model.abilityCheckExtras = abilityCheckExtras

  const featureSkillBonuses = useMemo(() => {
    const out: Record<string, number> = {}
    for (const skill of SKILL_DEFS) {
      const state = model.draft.skills[skill.key]
      const proficient = Boolean(state?.is_proficient || state?.is_expertise)
      const athlete = remarkableAthleteCheckBonus({
        features: model.unlockedFeatures,
        proficiencyBonus: model.proficiencyBonus,
        ability: skill.base,
        includesProficiency: proficient,
      })
      const courtier = elegantCourtierPersuasionBonus({
        features: model.unlockedFeatures,
        wisdomScore: effectiveAbilities.wis,
        skillKey: skill.key,
      })
      const total = athlete + courtier
      if (total) out[skill.key] = total
    }
    return out
  }, [
    model.draft.skills,
    effectiveAbilities.wis,
    model.unlockedFeatures,
    model.proficiencyBonus,
  ])
  model.featureSkillBonuses = featureSkillBonuses

  const abilitySaveExtras = useMemo(() => {
    const out: Partial<Record<AbilityKey, number>> = {}
    for (const key of ABILITY_KEYS) {
      const n = abilitySaveBonus(key, model.draft.modifiers, formulaVarsBase)
      if (n) out[key] = n
    }
    return out
  }, [model.draft.modifiers, formulaVarsBase])
  model.abilitySaveExtras = abilitySaveExtras

  const armorClass = useMemo(() => {
    const pieces = equippedArmorPieces(model.draft.inventory.items)
    const mods = {
      str: abilityModifier(effectiveAbilities.str),
      dex: abilityModifier(effectiveAbilities.dex),
      con: abilityModifier(effectiveAbilities.con),
      int: abilityModifier(effectiveAbilities.int),
      wis: abilityModifier(effectiveAbilities.wis),
      cha: abilityModifier(effectiveAbilities.cha),
    }
    let naturalArmor = model.draft.raceGrant?.naturalArmor ?? null
    // Backfill for sheets that applied the race before natural_armor was catalogued.
    if (!naturalArmor && model.draft.raceGrant) {
      const entry =
        model.raceCatalogRows.find((row) => row.id === model.draft.raceGrant!.raceCatalogId) ??
        model.raceCatalogRows.find((row) => row.slug === model.draft.raceGrant!.slug)
      if (entry) {
        naturalArmor =
          resolveRaceGrantDef({
            raceName: entry.name_ru,
            catalogSlug: entry.slug,
            catalogData: entry.data,
            nameRu: entry.name_ru,
          })?.naturalArmor ?? null
      }
    }
    const featNatural = naturalArmorFromFeatGrants(model.draft.featGrants)
    if (featNatural && (!naturalArmor || featNatural.base > naturalArmor.base)) {
      naturalArmor = featNatural
    }
    const unarmoredDefense = (() => {
      if (pieces.armor) return null
      const hasBarb = model.unlockedFeatures.some(
        (feature: { id: string }) => feature.id === 'unarmored_defense_barb',
      )
      if (hasBarb) {
        return {
          labelRu: 'Защита без доспехов',
          secondMod: 'con' as const,
          allowsShield: true,
        }
      }
      const hasMonk = model.unlockedFeatures.some(
        (feature: { id: string }) => feature.id === 'unarmored_defense_monk',
      )
      if (hasMonk) {
        return {
          labelRu: 'Защита без доспехов',
          secondMod: 'wis' as const,
          allowsShield: false,
        }
      }
      return null
    })()
    const effectsRaw = model.draft.play.effects?.length
      ? model.draft.play.effects
      : asRecord(asRecord(model.baseCharacter.sheet).combat).effects
    const mageArmorFromConc = pieces.armor
      ? null
      : mageArmorCompetingFormula(model.draft.play.concentration?.name)
    const mageFromConcFormula = mageArmorFromConc
      ? { ...mageArmorFromConc, key: 'mage_armor' }
      : null
    const effectFormulas = pieces.armor ? [] : acFormulasFromActiveEffects(effectsRaw)
    const draconic = (() => {
      if (pieces.armor) return null
      const has = model.unlockedFeatures.some(
        (feature: { id: string }) => feature.id === 'draconic_resilience',
      )
      if (!has) return null
      return {
        key: 'draconic_resilience',
        label: 'Драконья устойчивость',
        base: 13,
        dexCap: null as number | null,
        allowsShield: true,
      }
    })()
    const extraFormulas = pieces.armor
      ? []
      : [
          ...model.gearEffects.acFormulas,
          ...(mageFromConcFormula ? [mageFromConcFormula] : []),
          ...effectFormulas,
          ...(draconic ? [draconic] : []),
        ]
    const acMinFloor = acMinFromActiveEffects(effectsRaw)
    const preferredKey = model.draft.acFormulaKey
    const withoutShield = computeArmorClass({
      dexMod: mods.dex,
      abilityMods: mods,
      armor: pieces.armor,
      shield: null,
      naturalArmor,
      unarmoredDefense,
      extraFormulas,
      preferredFormulaKey: preferredKey,
      acMinFloor,
    })
    const base = computeArmorClass({
      dexMod: mods.dex,
      abilityMods: mods,
      armor: pieces.armor,
      shield: pieces.shield,
      naturalArmor,
      unarmoredDefense,
      extraFormulas,
      preferredFormulaKey: preferredKey,
      acMinFloor,
    })
    const styleBonus = fightingStyleAcBonusFromIds({
      styleIds: model.fightingStyleIds ?? [],
      wearingArmor: Boolean(pieces.armor),
    })
    let coreAc = base.ac
    let gearSummary = base.summary
    if (styleBonus > 0) {
      coreAc += styleBonus
      gearSummary = `${gearSummary} · стиль +${styleBonus}`
    }
    const song = bladesongBonuses({
      resources: model.draft.play.resources,
      intelligenceScore: model.draft.abilities.int ?? 10,
    })
    if (song.ac > 0) {
      coreAc += song.ac
      gearSummary = `${gearSummary} · песнь +${song.ac}`
    }
    const gearAc = resolveGearAcBonus(model.gearEffects, {
      wearingArmor: Boolean(pieces.armor),
      wearingShield: Boolean(pieces.shield),
    })
    if (gearAc.total) {
      coreAc += gearAc.total
      gearSummary = `${gearSummary} · ${gearAc.parts.join(' · ')}`
    }
    const sharedInfusionAc = infusionAcFromSharedEffects(effectsRaw)
    if (infusionBonuses.acBonus) {
      coreAc += infusionBonuses.acBonus
      gearSummary = `${gearSummary} · инфузия +${infusionBonuses.acBonus}`
    }
    if (sharedInfusionAc) {
      coreAc += sharedInfusionAc
      gearSummary = `${gearSummary} · эффекты +${sharedInfusionAc}`
    }
    const formulaVars = buildSheetFormulaVars({
      mods,
      proficiencyBonus: model.proficiencyBonus,
      level: model.characterLevel,
    })
    const acBonuses = bonusesForTarget(model.draft.modifiers, 'ac')
    const stacked = applyBonusStack(coreAc, acBonuses, formulaVars)
    const bonusSummary = formatBonusSummary(stacked.applied)
    const summary = bonusSummary ? `${gearSummary} · ${bonusSummary}` : gearSummary
    const baseLabel = pieces.armor
      ? `${pieces.armor.baseAc} ${
          pieces.armor.name || armorKindLabel(pieces.armor.kind)
        } · ${armorKindLabel(pieces.armor.kind).toLowerCase()} доспех`
      : withoutShield.summary
    const spareShield = listShieldItems(model.draft.inventory.items)[0]
    const shieldBonus = pieces.shield
      ? Math.max(0, Math.floor(pieces.shield.baseAc || 2))
      : Math.max(0, Math.floor(spareShield?.base_ac ?? 2))
    return {
      ac: stacked.total,
      summary,
      gearSummary,
      baseLabel,
      shieldBonus,
      formulaVars,
      formulaKey: base.formulaKey,
      formulaLabel: base.formulaLabel,
      candidates: base.candidates,
      floorApplied: base.floorApplied,
    }
  }, [
    effectiveAbilities,
    model.draft.inventory.items,
    model.draft.play.resources,
    model.draft.abilities.int,
    model.draft.raceGrant,
    model.fightingStyleIds,
    model.draft.modifiers,
    model.raceCatalogRows,
    model.unlockedFeatures,
    model.gearEffects.acBonus,
    model.gearEffects.conditionalAc,
    model.gearEffects.acFormulas,
    model.draft.play.concentration?.name,
    model.draft.play.effects,
    model.draft.acFormulaKey,
    infusionBonuses.acBonus,
    model.baseCharacter.sheet,
    model.proficiencyBonus,
    model.characterLevel,
  ])
  model.armorClass = armorClass

  const persistDraft = useCallback(async (options?: {
    quiet?: boolean
    /** After a version conflict we already rebased once — do not loop. */
    conflictRetry?: boolean
  }) => {
    const quiet = options?.quiet ?? false
    const draftSnap = model.draftRef.current
    const baseSnap = model.baseCharacterRef.current
    const versionSnap = model.sheetVersionRef.current
    model.setSaveStatus('saving')
    if (!quiet) model.setError(null)
    try {
      const sheet = structuredClone(asRecord(baseSnap.sheet))
      const identity = asRecord(sheet.identity)
      const abilities = asRecord(sheet.abilities)
      const saves = asRecord(sheet.saves)
      const skills = asRecord(sheet.skills)
      const combat = asRecord(sheet.combat)

      const primary = draftSnap.classes[0]
      const totalLevel = totalCharacterLevel(draftSnap.classes)
      const summary = formatClassSummary(draftSnap.classes)
      const identityForSave = {
        ...draftSnap.identity,
        subclassName: primary?.subclass_name ?? draftSnap.identity.subclassName,
      }
      const identityExtras = identityExtrasToSheet(identityForSave)
      identity.race_catalog_id = draftSnap.raceCatalogId
      identity.background_catalog_id = draftSnap.backgroundCatalogId
      identity.class_catalog_id = primary?.catalog_id ?? null
      Object.assign(identity, identityExtras.identityPatch)
      sheet.identity = identity
      Object.assign(sheet, classLevelsToSheet(draftSnap.classes))
      sheet.class_grants = draftSnap.classGrants
      sheet.subclass_grants = draftSnap.subclassGrants
      sheet.subclass_transitions = draftSnap.subclassTransitions
      sheet.race_grant = draftSnap.raceGrant
      sheet.background_grant = draftSnap.backgroundGrant
      sheet.companions = draftSnap.companions
      sheet.known_forms = draftSnap.knownForms
      sheet.feature_picks = featurePicksToSheet(draftSnap.featurePicks)
      sheet.class_asi = draftSnap.classAsi
      sheet.primal_champion = draftSnap.primalChampion
      sheet.feat_grants = draftSnap.featGrants
      Object.assign(sheet, customFeaturesToSheet(draftSnap.customFeatures))

      for (const key of ABILITY_KEYS) {
        const ceiling = abilityCeilings[key]?.max ?? DEFAULT_ABILITY_SCORE_MAX
        const row: Record<string, unknown> = {
          ...asRecord(abilities[key]),
          score: clampAbilityScore(draftSnap.abilities[key], ceiling),
        }
        if (ceiling > DEFAULT_ABILITY_SCORE_MAX) {
          row.max_score = ceiling
        } else {
          delete row.max_score
        }
        abilities[key] = row
        saves[key] = {
          ...asRecord(saves[key]),
          is_proficient: draftSnap.saves[key],
        }
      }
      sheet.abilities = abilities
      sheet.saves = saves

      for (const skill of SKILL_DEFS) {
        const current = asRecord(skills[skill.key])
        skills[skill.key] = {
          ...current,
          base_stat: skill.base,
          is_proficient: draftSnap.skills[skill.key].is_proficient,
          is_expertise: draftSnap.skills[skill.key].is_expertise,
        }
      }
      sheet.skills = skills

      combat.hp_current = draftSnap.hpCurrent
      combat.hp_max = draftSnap.hpMax
      combat.ac = draftSnap.ac
      if (draftSnap.acFormulaKey) combat.ac_formula_key = draftSnap.acFormulaKey
      else delete combat.ac_formula_key
      combat.speed = draftSnap.speed
      combat.climb_speed = draftSnap.climbSpeed
      combat.swim_speed = draftSnap.swimSpeed
      combat.fly_speed = draftSnap.flySpeed
      combat.initiative = draftSnap.initiativeOverride
      combat.inspiration = draftSnap.inspiration
      combat.darkvision = identityExtras.combatPatch.darkvision
      const playSheet = playToSheet(draftSnap.play)
      combat.conditions = playSheet.combatPatch.conditions
      combat.exhaustion = playSheet.combatPatch.exhaustion
      combat.hp_temp = playSheet.combatPatch.hp_temp
      combat.hit_die = playSheet.combatPatch.hit_die
      combat.hp_dice_current = playSheet.combatPatch.hp_dice_current
      combat.hit_dice_by_class = playSheet.combatPatch.hit_dice_by_class
      combat.is_dying = playSheet.combatPatch.is_dying
      combat.death_successes = playSheet.combatPatch.death_successes
      combat.death_fails = playSheet.combatPatch.death_fails
      combat.concentration = playSheet.combatPatch.concentration
      combat.shillelagh = playSheet.combatPatch.shillelagh
      combat.effects = playSheet.combatPatch.effects
      sheet.combat = combat
      const proficiency = asRecord(sheet.proficiency)
      proficiency.bonus = proficiencyBonusForTotalLevel(totalLevel)
      proficiency.armor = identityExtras.proficiencyPatch.armor
      proficiency.weapons = identityExtras.proficiencyPatch.weapons
      proficiency.languages = identityExtras.proficiencyPatch.languages
      proficiency.tools = identityExtras.proficiencyPatch.tools
      sheet.proficiency = proficiency
      sheet.weapons = draftSnap.weapons
      sheet.resources = playSheet.resources
      Object.assign(sheet, inventoryToSheet(draftSnap.inventory))
      Object.assign(sheet, attunementsToSheet(draftSnap.attunements))
      Object.assign(sheet, spellsToSheet(draftSnap.spells))
      Object.assign(sheet, textBlocksToSheet(draftSnap.textBlocks))
      Object.assign(sheet, modifiersToSheet(draftSnap.modifiers))
      sheet.ui = {
        ...asRecord(sheet.ui),
        ...sheetUiToPatch(draftSnap.sheetUi),
      }

      const updated = await updateCharacter(baseSnap.id, {
        sheet_version: versionSnap,
        name: draftSnap.name.trim() || 'Новый персонаж',
        level: totalLevel,
        race_name: draftSnap.raceName.trim() || null,
        class_name: summary || primary?.name.trim() || null,
        hp_current: draftSnap.hpCurrent,
        hp_max: draftSnap.hpMax,
        sheet,
      })
      // Sync refs before any pending resave — React state alone is one frame late.
      model.baseCharacterRef.current = updated
      model.sheetVersionRef.current = updated.sheet_version
      model.setBaseCharacter(updated)
      model.setSheetVersion(updated.sheet_version)
      // Keep live draft — rebuilding would stomp keystrokes during autosave.
      model.onSavedRef.current(updated)
      publishSheetSync(model.channelRef.current, {
        type: 'sheet-saved',
        characterId: updated.id,
        sheetVersion: updated.sheet_version,
      })
      model.setSaveStatus('saved')
      model.setConflictOpen(false)
      model.conflictOpenRef.current = false
      if (!quiet) model.onToastRef.current('Лист сохранён')
      return true
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'sheet_version_conflict') {
        // Common race: two autosaves with the same version. Rebase once and retry silently.
        if (!options?.conflictRetry) {
          try {
            const fresh = await getCharacter(baseSnap.id)
            model.baseCharacterRef.current = fresh
            model.sheetVersionRef.current = fresh.sheet_version
            model.setBaseCharacter(fresh)
            model.setSheetVersion(fresh.sheet_version)
            return await persistDraft({ quiet, conflictRetry: true })
          } catch {
            // Fall through to the dialog.
          }
        }
        model.setConflictOpen(true)
        model.conflictOpenRef.current = true
        model.setError(null)
        model.setSaveStatus('error')
      } else {
        model.setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить лист')
        model.setSaveStatus('error')
      }
      return false
    }
  }, [])
  model.persistDraft = persistDraft

  const conHpRef = useRef<{ mod: number } | null>(null)
  useEffect(() => {
    const level = totalCharacterLevel(model.draft.classes)
    const mod = abilityModifier(model.gearAbilities?.con ?? model.draft.abilities.con)
    if (model.draft.hpMax == null) return
    const prev = conHpRef.current
    if (!prev) {
      conHpRef.current = { mod }
      return
    }
    if (prev.mod === mod) return
    const delta = constitutionHpDelta({
      previousMod: prev.mod,
      nextMod: mod,
      levelCount: level,
    })
    conHpRef.current = { mod }
    if (delta === 0) return
    model.setDraft((current) => {
      const next = applyHpDelta({
        hpMax: current.hpMax,
        hpCurrent: current.hpCurrent,
        delta,
      })
      if (next.hpMax === current.hpMax && next.hpCurrent === current.hpCurrent) return current
      return { ...current, hpMax: next.hpMax, hpCurrent: next.hpCurrent }
    })
    model.onToast(
      delta > 0
        ? `Телосложение: максимум хитов +${delta} за все уровни`
        : `Телосложение: максимум хитов ${delta} за все уровни`,
    )
  }, [model.gearAbilities, model.draft.abilities.con, model.draft.classes, model.draft.hpMax])

  useEffect(() => {
    const exhaustion = model.draft.play.exhaustion ?? 0
    if (exhaustion < 4) return
    const max = model.draft.hpMax
    const current = model.draft.hpCurrent
    if (max == null || current == null) return
    const cap = Math.floor(max / 2)
    if (current <= cap) return
    model.setDraft((prev) => {
      if (prev.hpMax == null || prev.hpCurrent == null) return prev
      if ((prev.play.exhaustion ?? 0) < 4) return prev
      const nextCap = Math.floor(prev.hpMax / 2)
      if (prev.hpCurrent <= nextCap) return prev
      return { ...prev, hpCurrent: nextCap }
    })
  }, [model.draft.play.exhaustion, model.draft.hpMax, model.draft.hpCurrent])

  useEffect(() => {
    model.setDraft((prev) => {
      const next = syncPrimalChampion(prev, {
        str: abilityCeilings.str?.max ?? DEFAULT_ABILITY_SCORE_MAX,
        con: abilityCeilings.con?.max ?? DEFAULT_ABILITY_SCORE_MAX,
      })
      if (next === prev) return prev
      const gained =
        !prev.primalChampion &&
        next.primalChampion != null &&
        (next.primalChampion.str > 0 || next.primalChampion.con > 0)
      if (gained) {
        queueMicrotask(() => {
          model.onToast('Изначальный чемпион: Сила и Телосложение +4, потолок 24')
        })
      }
      return next
    })
  }, [
    abilityCeilings,
    model.draft.classes,
    model.draft.abilities.str,
    model.draft.abilities.con,
    model.draft.primalChampion,
  ])
}
