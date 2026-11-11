/** Состояние и эффекты листа, часть 2. Порядок хуков совпадает с прежним компонентом. */
import type { SheetModel } from './sheetModel'
import { useEffect, useMemo, useRef } from 'react'
import { createSheetSyncChannel, publishSheetSync } from '../../../shared/sync/characterSheetChannel'
import { totalCharacterLevel } from '../../../shared/dnd/classLevels'
import { hydrateAlwaysPreparedFromSubclassCatalog, hydrateAlwaysPreparedMechanics } from '../hydrateAlwaysPrepared'
import { listCatalogEntries } from '../../../shared/api/catalog'
import { resolveRaceGrantDef, resolveRaceMovement } from '../../../shared/dnd/raceGrants'
import { aggregateGearEffects } from '../gearEffects'
import { fightingStyleFromFeatGrants, sumFeatInitiativeBonus, sumFeatPassiveBonus, type AppliedFeatGrant } from '../../../shared/dnd/featGrants'
import { buildAsiFeatGrantFromCatalog, findMissingAsiFeatEntries, matchFeatCatalogEntry } from '../asiFeatHydrate'
import { hydrateManeuversFromSubclassGrants } from '../../../shared/dnd/battleMasterManeuverBridge'
import { applyFeatGrantToDraft, ensureFeatSpellsFromLedger, featSpellsMissingFromKnown } from '../featEffects'
import { syncFeatureResources } from '../../../shared/dnd/featureResources'
import { classWalkSpeedBonusFt, resolveWalkSpeedFt } from '../../../shared/dnd/classMovement'
import { applyFeatureSaveProficiencies } from '../../../shared/dnd/featureSaveProficiency'
import { syncMonkUnarmedAttack } from '../../../shared/dnd/martialArts'
import { findFightingStylePick } from '../../../shared/dnd/featurePicks'
import { darkvisionFtFromFeatures, initiativeBonusFromFeatures, initiativeBonusFromRace } from '../featureCombatBonuses'
import { saveBonusFromFeatures } from '../ClassFeaturesPanel'
import { ensureRaceNaturalWeaponAttacks, raceNaturalWeaponAttacksMatch, syncRaceSpellsForSheetState } from '../raceEffects'
import { characterHasCasterClass, highestSpellSlotLevelForClasses } from '../../../shared/dnd/casterProgression'
import { equippedArmorPieces } from '../inventory'
import { SKILL_DEFS, abilityModifier } from '../sheetTypes'
import { passiveScore, skillModifierFromState } from '../../../shared/dnd/passives'

export function useSheetEditorPart2(model: SheetModel) {

  // Prefetch full race catalog so subrace popup opens without a second network round-trip.
  useEffect(() => {
    let active = true
    model.raceCatalogCacheRef.current = null
    model.setRaceCatalogRows([])
    listCatalogEntries({ kind: 'race', edition: model.rulesEdition })
      .then((rows) => {
        if (!active) return
        model.raceCatalogCacheRef.current = rows
        model.setRaceCatalogRows(rows)
        // Backfill natural-weapon cards + movement speeds for races chosen earlier.
        model.setDraft((prev) => {
          if (!prev.raceGrant) return prev
          const entry =
            rows.find((row) => row.id === prev.raceGrant!.raceCatalogId) ??
            rows.find((row) => row.slug === prev.raceGrant!.slug)
          const catalogDef = entry
            ? resolveRaceGrantDef({
                raceName: entry.name_ru,
                catalogSlug: entry.slug,
                catalogData: entry.data,
                nameRu: entry.name_ru,
              })
            : null
          const catalogWeapons = catalogDef?.naturalWeapons ?? null
          const weaponsSource =
            catalogWeapons && catalogWeapons.length > 0
              ? catalogWeapons
              : prev.raceGrant.naturalWeapons ?? []
          const weaponsMatch =
            weaponsSource.length === 0 ||
            raceNaturalWeaponAttacksMatch({
              weapons: prev.weapons,
              raceSlug: prev.raceGrant.slug,
              naturalWeapons: weaponsSource,
            })
          const nextWeapons = weaponsMatch
            ? prev.weapons
            : ensureRaceNaturalWeaponAttacks({
                weapons: prev.weapons,
                grant: prev.raceGrant,
                catalogWeapons,
              })

          let nextGrant = prev.raceGrant
          let climbSpeed = prev.climbSpeed
          let swimSpeed = prev.swimSpeed
          let flySpeed = prev.flySpeed
          if (catalogDef) {
            const movement = resolveRaceMovement({
              walk: catalogDef.speed,
              movement: catalogDef.movement,
            })
            const grantMove = prev.raceGrant.movement
            const grantEmpty =
              grantMove == null ||
              (grantMove.climb == null &&
                grantMove.swim == null &&
                grantMove.fly == null)
            const draftEmpty =
              climbSpeed == null && swimSpeed == null && flySpeed == null
            const hasCatalogMove =
              movement.climb != null ||
              movement.swim != null ||
              movement.fly != null
            // Only fill when both ledger and draft lack alt speeds (pre-feature sheets).
            if (hasCatalogMove && grantEmpty && draftEmpty) {
              nextGrant = { ...nextGrant, movement }
              climbSpeed = movement.climb
              swimSpeed = movement.swim
              flySpeed = movement.fly
            }
          }
          if (catalogWeapons && catalogWeapons.length > 0) {
            nextGrant = { ...nextGrant, naturalWeapons: catalogWeapons }
          }
          if (catalogDef?.racialSpells && catalogDef.racialSpells.length > 0) {
            nextGrant = { ...nextGrant, racialSpells: catalogDef.racialSpells }
          }
          if (catalogDef?.traitCards && catalogDef.traitCards.length > 0) {
            // Always refresh from catalog so trait renames/copy fixes (e.g. Hungry Jaws)
            // reach sheets that already snapshotted an older trait_cards blob.
            nextGrant = { ...nextGrant, traitCards: catalogDef.traitCards }
          }
          if (catalogDef?.traitsText && !nextGrant.traitsText?.trim()) {
            nextGrant = { ...nextGrant, traitsText: catalogDef.traitsText }
          }

          const nextSpells = syncRaceSpellsForSheetState({
            spells: prev.spells,
            grant: nextGrant,
            characterLevel: totalCharacterLevel(prev.classes),
            hasCasterClass: characterHasCasterClass(prev.classes),
            catalogSpells: catalogDef?.racialSpells ?? null,
            raceLabelRu: catalogDef?.labelRu || prev.raceName,
          })

          if (
            nextWeapons === prev.weapons &&
            nextGrant === prev.raceGrant &&
            nextSpells === prev.spells &&
            climbSpeed === prev.climbSpeed &&
            swimSpeed === prev.swimSpeed &&
            flySpeed === prev.flySpeed
          ) {
            return prev
          }
          return {
            ...prev,
            weapons: nextWeapons,
            spells: nextSpells,
            raceGrant: nextGrant,
            climbSpeed,
            swimSpeed,
            flySpeed,
          }
        })
      })
      .catch(() => {
        if (!active) return
        model.raceCatalogCacheRef.current = null
        model.setRaceCatalogRows([])
      })
    return () => {
      active = false
    }
  }, [model.rulesEdition, model.character.id])

  // Keep feat:* pools in play.resources aligned with unlocked features (PB, archetype).
  useEffect(() => {
    model.setDraft((prev) => {
      const nextResources = syncFeatureResources(
        prev.play.resources,
        model.featureDesiredResources,
      )
      if (
        nextResources.length === prev.play.resources.length &&
        nextResources.every((row, index) => {
          const cur = prev.play.resources[index]
          return (
            cur &&
            cur.id === row.id &&
            cur.name === row.name &&
            cur.max === row.max &&
            cur.used === row.used &&
            cur.reset === row.reset
          )
        })
      ) {
        return prev
      }
      return {
        ...prev,
        play: { ...prev.play, resources: nextResources },
      }
    })
  }, [model.featureDesiredResources])

  // Diamond Soul (and similar): force-enable save proficiencies from features.
  useEffect(() => {
    model.setDraft((prev) => {
      const nextSaves = applyFeatureSaveProficiencies(prev.saves, model.unlockedFeatures)
      if (nextSaves === prev.saves) return prev
      return { ...prev, saves: nextSaves }
    })
  }, [model.unlockedFeatures])

  // Martial Arts: keep a live «Безоружный удар» card while the feature is unlocked.
  useEffect(() => {
    model.setDraft((prev) => {
      const nextWeapons = syncMonkUnarmedAttack({
        weapons: prev.weapons,
        martialArtsDie: model.martialArtsDie,
        str: prev.abilities.str,
        dex: prev.abilities.dex,
      })
      if (
        nextWeapons.length === prev.weapons.length &&
        nextWeapons.every((row, index) => {
          const cur = prev.weapons[index]
          return (
            cur &&
            cur.id === row.id &&
            cur.name === row.name &&
            cur.damage === row.damage &&
            cur.ability === row.ability
          )
        })
      ) {
        return prev
      }
      return { ...prev, weapons: nextWeapons }
    })
  }, [model.martialArtsDie, model.draft.abilities.str, model.draft.abilities.dex])

  const onRemoteSaveRef = useRef(model.onRemoteSave)
  model.onRemoteSaveRef = onRemoteSaveRef
  useEffect(() => {
    onRemoteSaveRef.current = model.onRemoteSave
  }, [model.onRemoteSave])

  useEffect(() => {
    const channel = createSheetSyncChannel((message) => {
      if (message.type !== 'sheet-saved') {
        return
      }
      if (message.characterId !== model.character.id) {
        return
      }
      onRemoteSaveRef.current?.(message)
    })
    model.channelRef.current = channel
    publishSheetSync(channel, {
      type: 'sheet-opened',
      characterId: model.character.id,
      sheetVersion: model.character.sheet_version,
    })
    return () => {
      channel?.close()
      model.channelRef.current = null
    }
    // Channel is per open character; avoid reconnect on every local save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.character.id])

  const proficiencyBonus = useMemo(
    () => 2 + Math.floor((Math.max(model.characterLevel, 1) - 1) / 4),
    [model.characterLevel],
  )
  model.proficiencyBonus = proficiencyBonus

  // Older create dropped feat spells (Magic Initiate) from known while keeping ledger.
  useEffect(() => {
    if (model.featSpellsHydrateAttemptedRef.current) return
    const level = totalCharacterLevel(model.draft.classes)
    if (
      !featSpellsMissingFromKnown({
        known: model.draft.spells.known,
        featGrants: model.draft.featGrants,
        characterLevel: level,
      })
    ) {
      return
    }
    model.featSpellsHydrateAttemptedRef.current = true
    model.setDraft((prev) => {
      const againLevel = totalCharacterLevel(prev.classes)
      if (
        !featSpellsMissingFromKnown({
          known: prev.spells.known,
          featGrants: prev.featGrants,
          characterLevel: againLevel,
        })
      ) {
        return prev
      }
      const nextSpells = ensureFeatSpellsFromLedger({
        spells: prev.spells,
        featGrants: prev.featGrants,
        characterLevel: againLevel,
      })
      model.onToast('Восстановлены заклинания от черт')
      return { ...prev, spells: nextSpells }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot backfill
  }, [model.draft.featGrants, model.draft.spells.known, model.draft.classes])

  // Older create discarded ASI→feat packages; rebuild Alert/Mobile/etc. from catalog once.
  useEffect(() => {
    if (model.asiFeatHydrateAttemptedRef.current) return
    const missing = findMissingAsiFeatEntries(model.draft.classAsi, model.draft.featGrants)
    if (!missing.length) return
    model.asiFeatHydrateAttemptedRef.current = true
    let active = true
    listCatalogEntries({ kind: 'feat', edition: model.rulesEdition })
      .then((rows) => {
        if (!active) return
        const level = totalCharacterLevel(model.draft.classes)
        const rebuilt: AppliedFeatGrant[] = []
        for (const entry of missing) {
          if (entry.resolution.kind !== 'feat') continue
          const catalogEntry = matchFeatCatalogEntry(rows, entry.resolution)
          if (!catalogEntry) continue
          const grant = buildAsiFeatGrantFromCatalog({
            entry,
            catalogEntry,
            characterLevel: level,
          })
          if (grant) rebuilt.push(grant)
        }
        if (!rebuilt.length) return
        model.setDraft((prev) => {
          let next = prev
          let applied = 0
          const names: string[] = []
          for (const grant of rebuilt) {
            if (grant.source.kind !== 'asi') continue
            const source = grant.source
            const already = next.featGrants.some(
              (row) =>
                row.id === grant.id ||
                (row.source.kind === 'asi' &&
                  row.featCatalogId === grant.featCatalogId &&
                  row.source.classEntryId === source.classEntryId &&
                  row.source.featureId === source.featureId),
            )
            if (already) continue
            next = model.mergeFeatSlice(
              next,
              applyFeatGrantToDraft({ draft: model.featSliceFrom(next), grant }),
            )
            applied += 1
            names.push(grant.nameRu)
          }
          if (applied > 0) {
            model.onToast(
              applied === 1
                ? `Восстановлена черта ASI «${names[0]}»`
                : `Восстановлены черты ASI: ${names.join(', ')}`,
            )
          }
          return next
        })
      })
      .catch(() => {
        /* allow a later remount to retry */
        model.asiFeatHydrateAttemptedRef.current = false
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot backfill
  }, [model.draft.classAsi, model.draft.featGrants, model.draft.classes, model.rulesEdition])

  // Older create stored BM maneuvers only in subclass_grants (flavor); copy into feature_picks.
  useEffect(() => {
    if (model.bmManeuverHydrateAttemptedRef.current) return
    const probe = hydrateManeuversFromSubclassGrants({
      featurePicks: model.draft.featurePicks,
      subclassGrants: model.draft.subclassGrants,
    })
    if (!probe.bridgedClassEntryIds.length) return
    model.bmManeuverHydrateAttemptedRef.current = true
    model.setDraft((prev) => {
      const again = hydrateManeuversFromSubclassGrants({
        featurePicks: prev.featurePicks,
        subclassGrants: prev.subclassGrants,
      })
      if (!again.bridgedClassEntryIds.length) return prev
      model.onToast('Восстановлены манёвры Мастера боя из выбора архетипа')
      return { ...prev, featurePicks: again.featurePicks }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot backfill
  }, [model.draft.subclassGrants, model.draft.featurePicks])

  // QA 22.10: backfill always-prepared mechanics (Bless concentration) + Artillerist lists.
  useEffect(() => {
    if (model.alwaysPreparedHydrateAttemptedRef.current) return
    if (model.draft.subclassGrants.length === 0 && model.draft.spells.known.length === 0) return
    model.alwaysPreparedHydrateAttemptedRef.current = true
    let active = true

    const applyLocalMechanics = () => {
      model.setDraft((prev) => {
        const mechanics = hydrateAlwaysPreparedMechanics(prev.spells.known)
        if (!mechanics.changed) return prev
        return {
          ...prev,
          spells: { ...prev.spells, known: mechanics.known },
        }
      })
    }

    listCatalogEntries({ kind: 'subclass', edition: model.rulesEdition })
      .then((entries) => {
        if (!active) return
        model.setDraft((prev) => {
          const hydrated = hydrateAlwaysPreparedFromSubclassCatalog({
            draft: model.subclassSliceFrom(prev),
            subclassEntries: Array.isArray(entries) ? entries : [],
            classLevelByEntryId: Object.fromEntries(
              prev.classes.map((row) => [row.id, row.level]),
            ),
            maxSpellLevel: highestSpellSlotLevelForClasses(
              prev.classes,
              prev.subclassGrants
                .filter((row) => row.caster?.progression === 'third')
                .map((row) => ({
                  classEntryId: row.classEntryId,
                  progression: 'third' as const,
                  ability: row.caster?.ability ?? null,
                })),
            ),
          })
          if (!hydrated.changed) return prev
          return model.mergeSubclassSlice(prev, hydrated.draft)
        })
      })
      .catch(() => {
        // Offline / catalog fail: still fix Bless concentration from bundled JSON.
        if (active) applyLocalMechanics()
      })

    // Immediate local pass (Bless) without waiting for subclass catalog.
    applyLocalMechanics()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot backfill
  }, [model.draft.subclassGrants, model.draft.spells.known.length, model.rulesEdition])

  const featPassiveBonus = useMemo(
    () => sumFeatPassiveBonus(model.draft.featGrants),
    [model.draft.featGrants],
  )
  model.featPassiveBonus = featPassiveBonus
  const featInitiativeBonus = useMemo(
    () => sumFeatInitiativeBonus(model.draft.featGrants),
    [model.draft.featGrants],
  )
  model.featInitiativeBonus = featInitiativeBonus
  const featureInitiativeBonus = useMemo(
    () =>
      initiativeBonusFromFeatures({
        features: model.unlockedFeatures,
        abilities: model.draft.abilities,
      }),
    [model.unlockedFeatures, model.draft.abilities],
  )
  model.featureInitiativeBonus = featureInitiativeBonus
  const raceInitiativeBonus = useMemo(
    () =>
      initiativeBonusFromRace({
        grant: model.draft.raceGrant,
        proficiencyBonus,
      }),
    [model.draft.raceGrant, proficiencyBonus],
  )
  model.raceInitiativeBonus = raceInitiativeBonus
  const totalInitiativeBonus =
    featInitiativeBonus + featureInitiativeBonus + raceInitiativeBonus
  model.totalInitiativeBonus = totalInitiativeBonus
  const activeFightingStyleId = useMemo(
    () =>
      findFightingStylePick(model.draft.featurePicks) ??
      fightingStyleFromFeatGrants(model.draft.featGrants),
    [model.draft.featurePicks, model.draft.featGrants],
  )
  model.activeFightingStyleId = activeFightingStyleId
  const featureDarkvisionFt = useMemo(
    () =>
      darkvisionFtFromFeatures({
        features: model.unlockedFeatures,
        baseDarkvision: model.draft.identity.darkvision,
      }),
    [model.unlockedFeatures, model.draft.identity.darkvision],
  )
  model.featureDarkvisionFt = featureDarkvisionFt

  const passives = useMemo(() => {
    const modFor = (skillKey: string) => {
      const def = SKILL_DEFS.find((skill) => skill.key === skillKey)
      if (!def) return 0
      const state = model.draft.skills[skillKey]
      return skillModifierFromState({
        abilityMod: abilityModifier(model.draft.abilities[def.base]),
        proficiencyBonus,
        isProficient: state.is_proficient,
        isExpertise: state.is_expertise,
      })
    }
    return {
      perception: passiveScore(modFor('perception')) + featPassiveBonus,
      investigation: passiveScore(modFor('investigation')) + featPassiveBonus,
      insight: passiveScore(modFor('insight')),
    }
  }, [model.draft.abilities, model.draft.skills, proficiencyBonus, featPassiveBonus])
  model.passives = passives

  const auraSaveBonus = useMemo(
    () =>
      saveBonusFromFeatures({
        features: model.unlockedFeatures,
        abilities: model.draft.abilities,
      }),
    [model.unlockedFeatures, model.draft.abilities],
  )
  model.auraSaveBonus = auraSaveBonus

  const gearEffects = useMemo(
    () =>
      aggregateGearEffects({
        items: model.draft.inventory.items,
        attunements: model.draft.attunements,
      }),
    [model.draft.inventory.items, model.draft.attunements],
  )
  model.gearEffects = gearEffects

  const armorPiecesForSpeed = useMemo(
    () => equippedArmorPieces(model.draft.inventory.items),
    [model.draft.inventory.items],
  )
  model.armorPiecesForSpeed = armorPiecesForSpeed
  const displaySpeed = useMemo(() => {
    const wearingHeavy = armorPiecesForSpeed.armor?.kind === 'heavy'
    const wearingArmorOrShield = Boolean(
      armorPiecesForSpeed.armor || armorPiecesForSpeed.shield,
    )
    const classBonus = classWalkSpeedBonusFt({
      classes: model.draft.classes,
      wearingHeavyArmor: wearingHeavy,
      wearingArmorOrShield,
    })
    const classBonusMax = classWalkSpeedBonusFt({
      classes: model.draft.classes,
      wearingHeavyArmor: false,
      wearingArmorOrShield: false,
    })
    return resolveWalkSpeedFt({
      storedSpeed: model.draft.speed,
      raceSpeed: model.draft.raceGrant?.speed ?? null,
      classBonusFt: classBonus,
      classBonusFtMax: classBonusMax,
      featBonusFt: model.featSpeedBonusFt,
      gearBonusFt: gearEffects.speedBonusFt,
    })
  }, [
    armorPiecesForSpeed,
    model.draft.classes,
    model.draft.speed,
    model.draft.raceGrant?.speed,
    model.featSpeedBonusFt,
    gearEffects.speedBonusFt,
  ])
  model.displaySpeed = displaySpeed
}
