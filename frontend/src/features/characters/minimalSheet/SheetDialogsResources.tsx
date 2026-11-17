/** Диалоги отдыха и классовых ресурсов. */
import { useEffect, useState } from 'react'
import type { SheetModel } from './sheetModel'
import { dismissSelfFormsOnRest } from '../companions'
import { healCompanionsOnRest } from '../companionCombat'
import { applyConcentrationChangeToCompanions } from '../spellCompanions'
import { SpellFormDialog } from '../SpellFormDialog'
import { FamiliarPickDialog } from '../FamiliarPickDialog'
import { CompanionCreaturePickDialog } from '../CompanionCreaturePickDialog'
import { spendFeatureUse } from '../../../shared/dnd/featureResources'
import { FeatureSelfFormDialog, type FeatureSelfFormDialogResult } from '../FeatureSelfFormDialog'
import { shapechangerFormLimits } from '../featureForms'
import { WildShapeDialog } from '../WildShapeDialog'
import { RestDialog } from '../RestDialog'
import {
  characterHasWeaponMastery,
  markLongRestWeaponMasterySwap,
} from '../../../shared/dnd/weaponMastery'
import { normalizeCampaignRules } from '../../lobby/campaignRules'
import { SorceryPointsSpendDialog } from '../SorceryPointsSpendDialog'
import { ChannelDivinitySpendDialog } from '../ChannelDivinitySpendDialog'
import { KiSpendDialog } from '../KiSpendDialog'
import { BardicInspirationSpendDialog } from '../BardicInspirationSpendDialog'
import { LayOnHandsSpendDialog } from '../LayOnHandsSpendDialog'
import { SuperiorityDiceSpendDialog } from '../SuperiorityDiceSpendDialog'
import { ArcaneRecoverySpendDialog } from '../ArcaneRecoverySpendDialog'
import type { Druid2024RestPanelProps } from '../Druid2024RestPanel'
import type { LandTerrain2024 } from '../../../shared/dnd/druid2024Features'
import { WizardFeatureUseDialog } from '../WizardFeatureUseDialog'
import { Wizard2024UseDialog } from '../Wizard2024UseDialog'
import { Sorcerer2024UseDialog } from '../Sorcerer2024UseDialog'
import { Monk2024UseDialog } from '../Monk2024UseDialog'
import { Warlock2024UseDialog } from '../Warlock2024UseDialog'
import { Cleric2024UseDialog, type ClericFeatureRequest } from '../Cleric2024UseDialog'
import { Bard2024UseDialog, type BardFeatureRequest } from '../Bard2024UseDialog'
import { bard2024UseFeatureId, type Bard2024UseResult } from '../../../shared/dnd/bard2024Features'
import type { WizardFeatureUseResult } from '../../../shared/dnd/wizardTradition'
import {
  applySelfDamage2024,
  cantripSwapFromCandidates2024,
  canMemorizeSpell2024,
  capstoneLockedIds,
  masteryCandidates2024,
  masteryPickForTier,
  memorizeFromCandidates2024,
  memorizeToCandidates2024,
  restoreSlot2024,
  swapMemorizeSpell,
  swapSpellcastingCantrip2024,
  swapSpellMastery2024,
  wizard2024Context,
  wizard2024UseFeatureId,
  WIZARD_SPELL_MASTERY_LEVEL_2024,
  type W24Result,
} from '../../../shared/dnd/wizard2024Features'
import {
  sorcerer2024UseFeatureId,
  type SorcererFeatureUseResult,
} from '../../../shared/dnd/sorcerer2024Features'
import {
  monk2024UseFeatureId,
  type MonkFeatureUseResult,
} from '../../../shared/dnd/monk2024Features'
import {
  hasPactOfTheTome2024,
  warlock2024UseFeatureId,
  type WarlockFeatureUseResult,
} from '../../../shared/dnd/warlock2024Features'
import {
  cleric2024UseFeatureId,
  type Cleric2024UseResult,
} from '../../../shared/dnd/cleric2024Features'
import { Druid2024UseDialog, type DruidFeatureRequest, type Druid2024ConfirmResult } from '../Druid2024UseDialog'
import { druid2024UseFeatureId } from '../../../shared/dnd/druid2024Features'
import { addFlexibleSpellSlot } from '../../../shared/dnd/spells'
import { applyStarryForm } from '../wildShape'
import { applyLongRestFeaturePicks2024 } from '../../../shared/dnd/rest2024'
import { chooseTempHpPool } from '../../../shared/dnd/activeEffects'
import { resolveClassCasterSlug, warlockLevels } from '../../../shared/dnd/casterProgression'
import type { Wizard2024RestProps } from '../Wizard2024RestSwaps'
import type { Warlock2024RestPanelProps } from '../Warlock2024RestPanel'
import { ensurePactTomeSpellCatalog } from '../PactTomeCantripsPicker'
import { isWarlockClassName, syncPactTomeCantrips } from '../pactTomeEffects'
import {
  PACT_TOME_CANTRIP_CLASS_LISTS,
  spellOptionsForClassLists,
  spellOptionsForPactTomeCantrips,
  type FeatSpellCatalogRow,
} from '../../../shared/dnd/featSpellListOptions'
import { listCatalogEntries } from '../../../shared/api/catalog'
import { parseSpellCatalogData, spellAvailableOnClassList } from '../../../shared/dnd/spellCatalog'
import { maxSpellLevelForClassAlone } from '../../../shared/dnd/casterProgression'
import { getFeaturePickList } from '../../../shared/dnd/featurePicks'
import { SPELL_MASTERY_FEATURE_ID } from '../../../shared/dnd/wizardTradition'
import { sheetSpellFromCatalog, type SheetSpell } from '../spells'
import { createCompanion } from '../companions'
import { setConcentration } from '../../../shared/dnd/concentration'
import { InfusionsActiveDialog } from '../InfusionsActiveDialog'
import { WarlockArcanumSpendDialog } from '../WarlockArcanumSpendDialog'
import { WarlockInvocationsDialog } from '../WarlockInvocationsDialog'
import { PsionicDiceSpendDialog } from '../PsionicDiceSpendDialog'
import { SoulTrinketsSpendDialog } from '../SoulTrinketsSpendDialog'
import { RangerFavoredDeskDialog } from '../RangerFavoredDeskDialog'
import { UseAllyAbilityDialog } from '../UseAllyAbilityDialog'
import { abilityModifier } from '../sheetTypes'
import { songOfRestDie } from '../../../shared/dnd/bardCollege'
import { bardicInspirationDieLabel } from '../../../shared/dnd/bardInspirationSpend'
import {
  resolveB04BardicSpend,
  resolveB04ChannelSpend,
  resolveB04KiSpend,
  resolveB04SuperioritySpend,
} from '../b04FeatureSpend'
import { resolveB05ChannelSpend } from '../b05FeatureSpend'
import {
  bonusCantripLabelRu,
  WIZARD_CANTRIP_NAMES,
} from '../../../shared/dnd/bonusCantrips'

export function SheetDialogsResources({ model }: { model: SheetModel }) {
  const [pendingAllyBuff, setPendingAllyBuff] = useState<{
    slug: string
    name: string
    die: string | null
    classLevel?: number
    casterMod?: number
    slotLevel?: number
    auraAllyDefaultOff?: boolean
  } | null>(null)

  const onWizardUseConfirm = (result: WizardFeatureUseResult) => {
    if (!result.ok) {
      model.onToast(result.message)
      return
    }
    model.setDraft((prev) => {
      let companions = prev.companions
      if (result.companion) {
        const next = createCompanion({
          id: result.companion.id,
          name: result.companion.name,
          notes: result.companion.notes,
          kind: 'familiar',
          role: 'ally',
          nature: 'summoned',
          control: 'with_master',
          active: true,
          source: {
            kind: 'feature',
            labelRu: 'Проявить разум',
            feature: 'manifest_mind',
            classEntryId: model.wizardFeatureUse?.classEntryId,
          },
        })
        companions = [
          ...companions.filter((row) => row.id !== next.id),
          next,
        ]
      }
      const exhaustion = Math.min(
        6,
        Math.max(0, (prev.play.exhaustion ?? 0) + result.exhaustionDelta),
      )
      let slots = prev.spells.slots
      if (result.spendSlotLevel) {
        const key = String(result.spendSlotLevel)
        const row = slots[key]
        if (row) slots = { ...slots, [key]: { ...row, used: Math.min(row.max, row.used + 1) } }
      }
      if (result.restoreSlotLevel) {
        slots = restoreSlot2024(slots, result.restoreSlotLevel) ?? slots
      }
      const damaged = result.selfDamage
        ? applySelfDamage2024({
            hpCurrent: prev.hpCurrent ?? null,
            hpTemp: prev.play.hpTemp ?? 0,
            amount: result.selfDamage,
          })
        : null
      return {
        ...prev,
        ...(damaged ? { hpCurrent: damaged.hpCurrent } : {}),
        spells: slots === prev.spells.slots ? prev.spells : { ...prev.spells, slots },
        companions,
        play: {
          ...prev.play,
          ...(damaged ? { hpTemp: damaged.hpTemp } : {}),
          resources: result.resources,
          exhaustion,
          concentration: result.concentrationName
            ? setConcentration({
                spellId: `feature:${model.wizardFeatureUse?.featureId ?? 'wizard'}`,
                name: result.concentrationName,
              })
            : prev.play.concentration,
        },
      }
    })
    model.onToast(result.message)
    model.setWizardFeatureUse(null)
  }

  const onSorcererUseConfirm = (result: SorcererFeatureUseResult) => {
    if (!result.ok) {
      model.onToast(result.message)
      return
    }
    model.setDraft((prev) => {
      let spells = prev.spells
      if (result.slots) {
        spells = { ...prev.spells, slots: result.slots }
      }
      return {
        ...prev,
        ...(result.featurePicks ? { featurePicks: result.featurePicks } : {}),
        spells,
        play: {
          ...prev.play,
          resources: result.resources,
        },
      }
    })
    model.onToast(result.message)
    model.setSorcererFeatureUse(null)
  }

  const onMonkUseConfirm = (result: MonkFeatureUseResult) => {
    if (!result.ok) {
      model.onToast(result.message)
      return
    }
    model.setDraft((prev) => ({
      ...prev,
      ...(result.featurePicks ? { featurePicks: result.featurePicks } : {}),
      play: {
        ...prev.play,
        resources: result.resources,
        concentration: result.concentrationName
          ? setConcentration({
              spellId: `feature:${model.monkFeatureUse?.featureId ?? 'monk'}`,
              name: result.concentrationName,
            })
          : prev.play.concentration,
      },
    }))
    model.onToast(result.message)
    model.setMonkFeatureUse(null)
  }

  const onWarlockUseConfirm = (result: WarlockFeatureUseResult) => {
    if (!result.ok) {
      model.onToast(result.message)
      return
    }
    const featureId = model.warlockFeatureUse?.featureId ?? 'warlock'
    model.setDraft((prev) => ({
      ...prev,
      ...(result.featurePicks ? { featurePicks: result.featurePicks } : {}),
      ...(result.pact_slots !== undefined
        ? { spells: { ...prev.spells, pact_slots: result.pact_slots } }
        : {}),
      play: {
        ...prev.play,
        resources: result.resources,
        concentration: result.concentrationName
          ? setConcentration({
              spellId: `feature:${featureId}`,
              name: result.concentrationName,
            })
          : prev.play.concentration,
      },
    }))
    const incomingTemp =
      typeof result.tempHp === 'number' ? Math.max(0, Math.floor(result.tempHp)) : 0
    if (incomingTemp > 0) {
      const current = Math.max(0, model.draft.play.hpTemp || 0)
      const applyTemp = (value: number) =>
        model.setDraft((prev) => ({
          ...prev,
          play: { ...prev.play, hpTemp: value },
        }))
      const ask = model.askTempHpReplace as
        | ((input: { current: number; incoming: number }) => Promise<'keep' | 'replace'>)
        | undefined
      if (current <= 0) {
        applyTemp(incomingTemp)
      } else if (typeof ask === 'function') {
        void ask({ current, incoming: incomingTemp }).then((choice) =>
          applyTemp(chooseTempHpPool(current, incomingTemp, choice)),
        )
      } else {
        applyTemp(Math.max(current, incomingTemp))
      }
    }
    model.onToast(result.message)
    model.setWarlockFeatureUse(null)
  }

  const onClericUseConfirm = (result: Cleric2024UseResult) => {
    if (!result.ok) {
      model.onToast(result.message ?? 'Не удалось применить умение')
      return
    }
    const featureId = cleric2024UseFeatureId(model.clericFeatureUse?.featureId) ?? 'cleric'
    const patches = result.patches
    model.setDraft((prev) => ({
      ...prev,
      ...(patches?.featurePicks ? { featurePicks: patches.featurePicks } : {}),
      play: {
        ...prev.play,
        resources: result.resources,
        concentration: patches?.concentrationName
          ? setConcentration({
              spellId: `feature:${featureId}`,
              name: patches.concentrationName,
            })
          : patches?.concentrationName === null &&
              prev.play.concentration?.spell_id === `feature:${featureId}`
            ? null
            : prev.play.concentration,
      },
    }))
    model.onToast(result.feedLineRu)
    model.setClericFeatureUse(null)
  }

  const onBardUseConfirm = (result: Bard2024UseResult) => {
    if (!result.ok) {
      model.onToast(result.message ?? 'Не удалось применить умение')
      return
    }
    const featureId = bard2024UseFeatureId(model.bardFeatureUse?.featureId) ?? 'bard'
    const patches = result.patches
    model.setDraft((prev) => ({
      ...prev,
      ...(result.slots ? { spells: { ...prev.spells, slots: result.slots } } : {}),
      play: {
        ...prev.play,
        resources: result.resources,
        concentration: patches?.concentrationName
          ? setConcentration({
              spellId: `feature:${featureId}`,
              name: patches.concentrationName,
            })
          : prev.play.concentration,
      },
    }))
    model.onToast(result.feedLineRu)
    model.setBardFeatureUse(null)
  }

  const onDruidUseConfirm = (result: Druid2024ConfirmResult) => {
    if (!result.ok) {
      model.onToast(result.message ?? 'Не удалось применить умение')
      return
    }
    const patches = result.patches
    const request = model.druidFeatureUse as DruidFeatureRequest | null
    const starry = result.featureId === 'starry-form' && result.starryForm
    model.setDraft((prev) => {
      let slots = prev.spells.slots
      if (patches?.spendSlotLevel) {
        const key = String(patches.spendSlotLevel)
        const row = slots[key]
        if (row) slots = { ...slots, [key]: { ...row, used: Math.min(row.max, row.used + 1) } }
      }
      if (patches?.gainSlotLevel) {
        if (patches.createSlot) {
          // Nature Magician: create a temporary slot (2 levels per Wild Shape use).
          const created = addFlexibleSpellSlot(slots, patches.gainSlotLevel, { maxCircle: 9 })
          if (created) slots = created
        } else {
          // Wild Resurgence shape→slot: restore one spent slot of that circle.
          const key = String(patches.gainSlotLevel)
          const row = slots[key]
          if (row) slots = { ...slots, [key]: { ...row, used: Math.max(0, row.used - 1) } }
        }
      }
      const druidRow = request
        ? prev.classes.find((row) => row.id === request.classEntryId)
        : null
      return {
        ...prev,
        ...(patches?.featurePicks ? { featurePicks: patches.featurePicks } : {}),
        ...(starry
          ? {
              companions: applyStarryForm({
                companions: prev.companions,
                constellation: result.starryForm as 'archer' | 'chalice' | 'dragon',
                hostHp: prev.hpCurrent ?? 0,
                hostHpMax: prev.hpMax ?? 0,
                druidLevel: druidRow?.level ?? model.druidLevel,
              }),
            }
          : {}),
        spells: slots === prev.spells.slots ? prev.spells : { ...prev.spells, slots },
        play: { ...prev.play, resources: result.resources },
      }
    })
    if (starry && typeof model.applyFeatureBuff === 'function') {
      void model.applyFeatureBuff({
        slug: `starry_form_${result.starryForm}`,
        name: 'Звёздный облик',
        classLevel: model.druidLevel,
        option: result.starryForm,
      })
    }
    model.onToast(result.feedLineRu)
    model.setDruidFeatureUse(null)
    if (patches?.wildCompanion) {
      model.setPendingFamiliar({
        spell: null,
        mode: 'wild_companion',
        slotLevel: patches.wildCompanion.slotLevel,
      })
    }
  }

  const [wizardCantripCatalog, setWizardCantripCatalog] = useState<SheetSpell[]>([])
  useEffect(() => {
    if (!model.restOpen || model.rulesEdition !== '2024') return
    let active = true
    listCatalogEntries({ kind: 'spell', edition: '2024' })
      .then((entries) => {
        if (!active) return
        const rows: SheetSpell[] = []
        for (const entry of entries ?? []) {
          const parsed = parseSpellCatalogData(entry.data)
          if (
            !spellAvailableOnClassList({
              classes: parsed.classes,
              subclasses: parsed.subclasses,
              classSlug: 'wizard',
            })
          ) {
            continue
          }
          const spell = sheetSpellFromCatalog(entry)
          if (spell.level === 0) rows.push({ ...spell, class_slug: 'wizard' })
        }
        rows.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        setWizardCantripCatalog(rows)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [model.restOpen, model.rulesEdition])

  const wizard2024Rest: Wizard2024RestProps | null = (() => {
    const ctx = wizard2024Context({
      rulesEdition: model.rulesEdition,
      classes: model.draft.classes,
      subclassSlugByEntryId: model.subclassSlugByEntryId,
    })
    if (!ctx) return null
    const known = model.draft.spells.known
    const locked = capstoneLockedIds(model.draft.featurePicks, ctx.classEntryId)
    const maxSpellLevel = maxSpellLevelForClassAlone('full', ctx.level)
    const applyKnown = (run: (rows: SheetSpell[]) => W24Result<SheetSpell>): boolean => {
      const first = run(known)
      if (!first.ok) {
        model.onToast(first.message)
        return false
      }
      model.setDraft((prev) => {
        const next = run(prev.spells.known)
        return next.ok ? { ...prev, spells: { ...prev.spells, known: next.known } } : prev
      })
      model.onToast(first.message)
      return true
    }
    const memorize = canMemorizeSpell2024({ rulesEdition: model.rulesEdition, wizardLevel: ctx.level })
      ? {
          from: memorizeFromCandidates2024(known, locked).map((row) => ({
            id: row.id,
            name: row.name,
            hint: `${row.level} круг`,
          })),
          to: memorizeToCandidates2024(known, { lockedIds: locked, maxSpellLevel }).map((row) => ({
            id: row.id,
            name: row.name,
            hint: `${row.level} круг`,
          })),
        }
      : null
    const knownCantrips = cantripSwapFromCandidates2024(known)
    const knownNames = new Set(known.filter((row) => row.level === 0).map((row) => row.name.toLowerCase()))
    const cantrip = {
      from: knownCantrips.map((row) => ({ id: row.id, name: row.name })),
      catalog: wizardCantripCatalog
        .filter((row) => !knownNames.has(row.name.toLowerCase()))
        .map((row) => ({ id: row.catalog_id ?? row.id, name: row.name })),
    }
    const masteryIds = getFeaturePickList(
      model.draft.featurePicks,
      ctx.classEntryId,
      SPELL_MASTERY_FEATURE_ID,
    )
    const mastery =
      ctx.level >= WIZARD_SPELL_MASTERY_LEVEL_2024
        ? [1, 2].flatMap((tier) => {
            const current = masteryPickForTier(known, masteryIds, tier)
            if (!current) return []
            return [
              {
                tier,
                currentName: current.name,
                options: masteryCandidates2024(known, tier, masteryIds).map((row) => ({
                  id: row.id,
                  name: row.name,
                })),
              },
            ]
          })
        : null
    return {
      memorize,
      cantrip,
      mastery: mastery && mastery.length > 0 ? mastery : null,
      onMemorize: (fromId, toId) =>
        applyKnown((rows) =>
          swapMemorizeSpell({
            known: rows,
            fromId,
            toId,
            wizardLevel: ctx.level,
            rulesEdition: model.rulesEdition,
            lockedIds: locked,
            maxSpellLevel,
          }),
        ),
      onCantrip: (fromId, catalogId) => {
        const replacement = wizardCantripCatalog.find(
          (row) => (row.catalog_id ?? row.id) === catalogId,
        )
        if (!replacement) return false
        return applyKnown((rows) =>
          swapSpellcastingCantrip2024({
            known: rows,
            fromId,
            replacement,
            rulesEdition: model.rulesEdition,
          }),
        )
      },
      onMastery: (tier, toId) => {
        const run = (picks: typeof model.draft.featurePicks, rows: SheetSpell[]) =>
          swapSpellMastery2024({
            known: rows,
            picks,
            classEntryId: ctx.classEntryId,
            tier,
            toId,
            wizardLevel: ctx.level,
            rulesEdition: model.rulesEdition,
          })
        const first = run(model.draft.featurePicks, known)
        if (!first.ok) {
          model.onToast(first.message)
          return false
        }
        model.setDraft((prev) => {
          const next = run(prev.featurePicks, prev.spells.known)
          return next.ok ? { ...prev, featurePicks: next.picks } : prev
        })
        model.onToast(first.message)
        return true
      },
    }
  })()

  const warlock2024Entry =
    model.rulesEdition === '2024'
      ? (model.draft.classes.find((row) => isWarlockClassName(row.name) && row.level > 0) ?? null)
      : null
  const warlock2024Invocations = model.draft.classOptions2024?.eldritch_invocations ?? []
  const warlock2024HasTome = warlock2024Entry != null && hasPactOfTheTome2024(warlock2024Invocations)

  const [tomeSpellCatalog, setTomeSpellCatalog] = useState<FeatSpellCatalogRow[]>([])
  useEffect(() => {
    if (!model.restOpen || !warlock2024HasTome) return
    let active = true
    ensurePactTomeSpellCatalog('2024')
      .then((rows) => {
        if (active) setTomeSpellCatalog(rows)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [model.restOpen, warlock2024HasTome])

  const warlock2024Rest: Omit<Warlock2024RestPanelProps, 'kind'> | null = (() => {
    if (!warlock2024Entry) return null
    const cantripRows = spellOptionsForPactTomeCantrips({ spells: tomeSpellCatalog })
    const ritualRows = spellOptionsForClassLists({
      spells: tomeSpellCatalog,
      classSlugs: [...PACT_TOME_CANTRIP_CLASS_LISTS],
      level: 1,
      ritualOnly: true,
      anyClassList: true,
    })
    return {
      classEntryId: warlock2024Entry.id,
      warlockLevel: warlock2024Entry.level,
      subclassSlug: model.subclassSlugByEntryId?.[warlock2024Entry.id] ?? null,
      invocations: warlock2024Invocations,
      featurePicks: model.draft.featurePicks,
      cantripOptions: cantripRows.map((row) => ({ id: row.id, name: row.label_ru })),
      ritualOptions: ritualRows.map((row) => ({ id: row.id, name: row.label_ru })),
      onToast: model.onToast,
      onFeaturePicksChange: (featurePicks) =>
        model.setDraft((prev) => {
          const synced = syncPactTomeCantrips({
            spells: prev.spells,
            featurePicks,
            classes: prev.classes,
            edition: '2024',
            invocations2024: prev.classOptions2024?.eldritch_invocations,
            resolveSpell: (slug) => {
              const hit = cantripRows.find((row) => row.id === slug)
              return hit ? { slug, nameRu: hit.label_ru, catalogId: slug } : null
            },
          })
          return {
            ...prev,
            featurePicks,
            ...(synced.changed ? { spells: synced.spells } : {}),
          }
        }),
    }
  })()

  const druid2024Rest: Omit<Druid2024RestPanelProps, 'kind'> | null = (() => {
    const row = model.druidClassRow
    if (model.rulesEdition !== '2024' || !row) return null
    const natural = model.draft.play.resources.find(
      (res) => res.id.startsWith('feat:druid:') && res.id.includes(':natural_recovery:'),
    )
    return {
      classEntryId: row.id,
      druidLevel: row.level,
      subclassSlug: model.druidSubclassSlug,
      featurePicks: model.draft.featurePicks,
      onFeaturePicksChange: (featurePicks) => model.setDraft((prev) => ({ ...prev, featurePicks })),
      landChoice: model.draft.classOptions2024?.land_choice ?? null,
      onLandChoiceChange: (terrain) =>
        model.setDraft((prev) => ({
          ...prev,
          classOptions2024: { ...(prev.classOptions2024 ?? {}), land_choice: terrain as LandTerrain2024 },
        })),
      knownForms: model.draft.knownForms,
      onKnownFormsChange: (knownForms) => model.setDraft((prev) => ({ ...prev, knownForms })),
      naturalRecovery: natural
        ? { id: natural.id, used: natural.used, max: natural.max }
        : null,
      onOpenNaturalRecovery: (id) => model.setArcaneRecoverySpendId(id),
      onToast: model.onToast,
    }
  })()

  const wizard2024Use =
    model.rulesEdition === '2024' &&
    model.wizardFeatureUse != null &&
    wizard2024UseFeatureId(model.wizardFeatureUse.featureId)

  const sorcerer2024Use =
    model.rulesEdition === '2024' &&
    model.sorcererFeatureUse != null &&
    sorcerer2024UseFeatureId(model.sorcererFeatureUse.featureId)

  const monk2024Use =
    model.rulesEdition === '2024' &&
    model.monkFeatureUse != null &&
    monk2024UseFeatureId(model.monkFeatureUse.featureId)

  const warlock2024Use =
    model.rulesEdition === '2024' &&
    model.warlockFeatureUse != null &&
    warlock2024UseFeatureId(model.warlockFeatureUse.featureId)

  const clericRequest = model.clericFeatureUse as ClericFeatureRequest | null
  const cleric2024Use =
    model.rulesEdition === '2024' &&
    clericRequest != null &&
    cleric2024UseFeatureId(clericRequest.featureId)

  const clericLevel = (() => {
    const entry = clericRequest
      ? model.draft.classes.find((row) => row.id === clericRequest.classEntryId)
      : null
    if (entry) return Math.max(0, entry.level || 0)
    let level = 0
    for (const row of model.draft.classes) {
      if (resolveClassCasterSlug(row.name) === 'cleric' || /жрец/i.test(row.name)) {
        level += Math.max(0, row.level || 0)
      }
    }
    return level
  })()

  const bardRequest = model.bardFeatureUse as BardFeatureRequest | null
  const bard2024Use =
    model.rulesEdition === '2024' &&
    bardRequest != null &&
    bard2024UseFeatureId(bardRequest.featureId)

  const bardLevel = (() => {
    const entry = bardRequest
      ? model.draft.classes.find((row) => row.id === bardRequest.classEntryId)
      : null
    if (entry) return Math.max(0, entry.level || 0)
    let level = 0
    for (const row of model.draft.classes) {
      if (resolveClassCasterSlug(row.name) === 'bard' || /бард/i.test(row.name)) {
        level += Math.max(0, row.level || 0)
      }
    }
    return level
  })()

  const druidRequest = model.druidFeatureUse as DruidFeatureRequest | null
  const druid2024Use =
    model.rulesEdition === '2024' &&
    druidRequest != null &&
    druid2024UseFeatureId(druidRequest.featureId)
  const druidRequestRow = druidRequest
    ? model.draft.classes.find((row) => row.id === druidRequest.classEntryId)
    : null

  const warlockLevel = warlockLevels(model.draft.classes)

  const sorcererLevel = (() => {
    let level = 0
    for (const row of model.draft.classes) {
      if (resolveClassCasterSlug(row.name) === 'sorcerer') {
        level += Math.max(0, row.level || 0)
      }
    }
    return level
  })()

  const monkLevel = (() => {
    let level = 0
    for (const row of model.draft.classes) {
      if (resolveClassCasterSlug(row.name) === 'monk' || /монах/i.test(row.name)) {
        level += Math.max(0, row.level || 0)
      }
    }
    return level
  })()

  const hasControlledChaos = (model.unlockedFeatures ?? []).some(
    (f: { id?: string }) =>
      f.id === 'controlled-chaos' || f.id === 'controlled_chaos',
  )

  const innateActive = Boolean(
    model.draft.play.resources.some((row) =>
      /врождённ.*чародей/i.test(row.name) && row.activeLabel,
    ),
  )

  return (
    <>
      <RestDialog
        open={model.restOpen}
        level={model.characterLevel}
        hpCurrent={model.draft.hpCurrent}
        hpMax={model.draft.hpMax}
        constitutionMod={abilityModifier(model.draft.abilities.con)}
        play={model.draft.play}
        spells={model.draft.spells}
        featureDesiredResources={model.featureDesiredResources}
        songOfRest={songOfRestDie(model.unlockedFeatures ?? [])}
        raceSlug={model.draft.raceGrant?.slug ?? null}
        grittyRest={(() => {
          const hb = normalizeCampaignRules(model.campaignRulesRaw).homebrew
          return Boolean(hb.gritty_rest)
        })()}
        epicHeroism={(() => {
          const hb = normalizeCampaignRules(model.campaignRulesRaw).homebrew
          return Boolean(hb.dmg_epic_heroism && !hb.gritty_rest)
        })()}
        rulesEdition={
          model.baseCharacter?.rules_edition ?? model.rulesEdition ?? '2014'
        }
        preferKind={model.restPreferKind ?? null}
        wizard2024Rest={wizard2024Rest}
        warlock2024Rest={warlock2024Rest}
        druid2024Rest={druid2024Rest}
        cantripFormulas={(() => {
          const tceOn =
            model.campaignRulesRaw != null &&
            normalizeCampaignRules(model.campaignRulesRaw).start.allowed_sources.includes(
              'tce',
            )
          const hasFeature = (model.playActiveFeatures ?? model.unlockedFeatures ?? []).some(
            (f: { id?: string }) => f.id === 'cantrip_formulas',
          )
          if (!tceOn || !hasFeature) return null
          const known = (model.draft.spells.known ?? [])
            .filter(
              (s: { level?: number; class_slug?: string | null; name?: string }) =>
                (s.level ?? 1) === 0 &&
                (s.class_slug === 'wizard' || /волшебник|wizard/i.test(String(s.class_slug ?? ''))),
            )
            .map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))
          if (!known.length) return null
          const knownNames = new Set(known.map((k: { name: string }) => k.name.toLowerCase()))
          const catalog = WIZARD_CANTRIP_NAMES.filter(
            (en) => !knownNames.has((bonusCantripLabelRu(en) || en).toLowerCase()),
          ).map((en) => ({
            id: en,
            name: bonusCantripLabelRu(en) || en,
          }))
          if (!catalog.length) return null
          return {
            known,
            catalog,
            onSwap: (fromId: string, _toCatalogId: string, toName: string) => {
              model.setDraft((prev) => ({
                ...prev,
                spells: {
                  ...prev.spells,
                  known: prev.spells.known.map((row) =>
                    row.id === fromId ? { ...row, name: toName, catalog_id: null } : row,
                  ),
                },
              }))
            },
          }
        })()}
        onPlayChange={(play) =>
          model.setDraft((prev) => {
            const result = applyConcentrationChangeToCompanions({
              companions: prev.companions,
              previous: prev.play.concentration,
              next: play.concentration,
            })
            return {
              ...prev,
              play,
              companions: result.companions,
            }
          })
        }
        onSpellsChange={(spells) => model.setDraft((prev) => ({ ...prev, spells }))}
        onCombatChange={(patch) =>
          model.setDraft((prev) => ({
            ...prev,
            ...(patch.hpCurrent !== undefined ? { hpCurrent: patch.hpCurrent } : {}),
          }))
        }
        onCompanionRest={(kind) => {
          let dismissed: string[] = []
          model.setDraft((prev) => {
            const result = dismissSelfFormsOnRest(prev.companions, kind, {
              edition: model.baseCharacter?.rules_edition ?? model.rulesEdition ?? '2014',
            })
            dismissed = result.dismissedNames
            // C-02 Н9: heal companions after resource reset / form dismiss (Р26 effects untouched).
            const companions = healCompanionsOnRest(result.companions, kind)
            return { ...prev, companions }
          })
          if (dismissed.length) {
            model.onToast(`Отдых: облик сброшен (${dismissed.join(', ')})`)
          } else if (kind === 'long') {
            model.onToast('Отдых: напарники восстановлены по правилам')
          }
        }}
        onLongRestComplete={() => {
          const edition =
            model.baseCharacter?.rules_edition ?? model.rulesEdition ?? '2014'
          if (edition !== '2024') return
          model.setDraft((prev) => {
            const featurePicks = applyLongRestFeaturePicks2024(prev.featurePicks)
            const picksChanged = featurePicks !== prev.featurePicks
            if (!characterHasWeaponMastery(edition, prev.classes)) {
              return picksChanged ? { ...prev, featurePicks } : prev
            }
            return {
              ...prev,
              ...(picksChanged ? { featurePicks } : {}),
              weaponMastery: markLongRestWeaponMasterySwap(prev.weaponMastery),
            }
          })
        }}
        onToast={model.onToast}
        onClose={() => {
          model.setRestOpen(false)
          model.setRestPreferKind?.(null)
        }}
      />

      <SorceryPointsSpendDialog
        open={model.sorcerySpendId != null}
        resource={model.sorceryResource}
        metamagicIds={model.sorcererMetamagicIds}
        rulesEdition={model.rulesEdition === '2024' ? '2024' : undefined}
        sorcererLevel={sorcererLevel}
        slots={model.draft.spells.slots}
        onSetUsed={(used) => {
          if (!model.sorcerySpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === model.sorcerySpendId ? { ...row, used } : row,
              ),
            },
          }))
        }}
        onSlotsChange={(slots) =>
          model.setDraft((prev) => ({
            ...prev,
            spells: { ...prev.spells, slots },
          }))
        }
        onToast={model.onToast}
        onClose={() => model.setSorcerySpendId(null)}
      />

      <ChannelDivinitySpendDialog
        open={model.channelDivinitySpendId != null}
        resource={model.channelDivinityResource}
        features={model.unlockedFeatures}
        resources={model.draft.play.resources}
        slots={model.draft.spells.slots}
        characterLevel={model.characterLevel}
        edition={model.rulesEdition === '2024' ? '2024' : '2014'}
        onClericFeatureUse={(request) => {
          model.setChannelDivinitySpendId(null)
          model.setClericFeatureUse(request)
        }}
        onSpend={(label) => {
          if (!model.channelDivinitySpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === model.channelDivinitySpendId && row.used < row.max
                  ? { ...row, used: row.used + 1 }
                  : row,
              ),
            },
          }))
          model.onToast(`${label}: −1 Божественный канал`)
          model.setChannelDivinitySpendId(null)
          const b04 = resolveB04ChannelSpend(label, model.characterLevel)
          const b05 =
            b04.kind === 'none'
              ? resolveB05ChannelSpend(
                  label,
                  model.characterLevel,
                  model.draft.abilities,
                )
              : { kind: 'none' as const }
          const action = b04.kind !== 'none' ? b04 : b05
          if (action.kind === 'heal') {
            model.setDraft((prev) => ({
              ...prev,
              hpCurrent: Math.min(
                prev.hpMax ?? action.amount,
                (prev.hpCurrent ?? 0) + action.amount,
              ),
            }))
            model.onToast(action.label)
            return
          }
          if (action.kind === 'buff') {
            if (action.targetsSelf === false) {
              setPendingAllyBuff({
                slug: action.slug,
                name: action.name || label,
                die: null,
                classLevel: action.classLevel,
                casterMod:
                  typeof action.casterMod === 'number'
                    ? action.casterMod
                    : undefined,
                slotLevel:
                  'slotLevel' in action && typeof action.slotLevel === 'number'
                    ? action.slotLevel
                    : undefined,
                auraAllyDefaultOff:
                  'auraAllyDefaultOff' in action
                    ? Boolean(action.auraAllyDefaultOff)
                    : action.slug.startsWith('aura_of_'),
              })
            } else {
              void model.applyFeatureBuff?.({
                slug: action.slug,
                name: action.name,
                classLevel: action.classLevel,
                casterMod: action.casterMod,
                slotLevel:
                  'slotLevel' in action ? action.slotLevel : undefined,
              })
            }
          }
        }}
        onHarnessDivinePower={({ resources, slots, message }) => {
          const teApi = model.turnEconomyApi as
            | {
                canFeature?: (t: 'action' | 'bonus' | 'reaction') => {
                  ok: boolean
                  reason?: string
                }
                spendFeature?: (t: 'action' | 'bonus' | 'reaction') => void
              }
            | undefined
          const gate = teApi?.canFeature?.('bonus')
          if (gate && !gate.ok) {
            model.onToast(gate.reason || 'Бонусное уже потрачено')
            return
          }
          model.setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, resources },
            spells: { ...prev.spells, slots },
          }))
          teApi?.spendFeature?.('bonus')
          model.onToast(message)
          model.setChannelDivinitySpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setChannelDivinitySpendId(null)}
      />

      <KiSpendDialog
        open={model.kiSpendId != null}
        resource={model.kiResource}
        features={model.unlockedFeatures}
        onSpend={(label, cost, timing) => {
          if (!model.kiSpendId) return
          const teApi = model.turnEconomyApi as
            | {
                canFeature?: (t: 'action' | 'bonus' | 'reaction') => {
                  ok: boolean
                  reason?: string
                }
                spendFeature?: (t: 'action' | 'bonus' | 'reaction') => void
                markKiSpent?: (t: 'action' | 'bonus' | 'reaction') => void
              }
            | undefined
          if (timing === 'action' || timing === 'bonus' || timing === 'reaction') {
            const gate = teApi?.canFeature?.(timing)
            if (gate && !gate.ok) {
              model.onToast(gate.reason || 'Отметка хода уже занята')
              return
            }
          }
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== model.kiSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          if (timing === 'action' || timing === 'bonus' || timing === 'reaction') {
            teApi?.spendFeature?.(timing)
            teApi?.markKiSpent?.(timing)
          }
          model.onToast(`${label}: −${cost} ци`)
          model.setKiSpendId(null)
          const action = resolveB04KiSpend(label)
          if (action.kind === 'buff') {
            void model.applyFeatureBuff?.({
              slug: action.slug,
              name: action.name,
              option: action.option,
            })
          }
        }}
        onToast={model.onToast}
        onClose={() => model.setKiSpendId(null)}
      />

      {model.wildShapeFork ? (
        <WildShapeDialog
          open
          onClose={() => model.setWildShapeFork(null)}
          features={model.unlockedFeatures.filter(
            (f: { classEntryId?: string }) =>
              f.classEntryId === model.wildShapeFork.classEntryId,
          )}
          resources={model.draft.play.resources}
          companions={model.draft.companions}
          knownForms={model.draft.knownForms}
          classSlug={model.wildShapeFork.classSlug}
          classEntryId={model.wildShapeFork.classEntryId}
          druidLevel={model.druidLevel}
          subclassSlug={model.druidSubclassSlug}
          hostHp={model.draft.hpCurrent ?? 0}
          hostHpMax={model.draft.hpMax ?? 0}
          edition={model.rulesEdition === '2024' ? '2024' : '2014'}
          wisMod={abilityModifier(model.draft.abilities.wis)}
          featurePicks={model.draft.featurePicks}
          onKnownFormsChange={(knownForms) =>
            model.setDraft((prev) => ({ ...prev, knownForms }))
          }
          onConfirm={(result) => {
            model.applyWildShapeResult(result)
            model.setWildShapeFork(null)
          }}
        />
      ) : null}

      <WizardFeatureUseDialog
        open={model.wizardFeatureUse != null && !wizard2024Use}
        request={wizard2024Use ? null : model.wizardFeatureUse}
        resources={model.draft.play.resources}
        featurePicks={model.draft.featurePicks}
        classes={model.draft.classes}
        intelligenceScore={model.draft.abilities.int ?? 10}
        onClose={() => model.setWizardFeatureUse(null)}
        onConfirm={onWizardUseConfirm}
      />
      {wizard2024Use ? (
        <Wizard2024UseDialog
          key={`${model.wizardFeatureUse?.featureId}:${model.wizardFeatureUse?.classEntryId}`}
          open
          request={model.wizardFeatureUse}
          resources={model.draft.play.resources}
          slots={model.draft.spells.slots}
          onClose={() => model.setWizardFeatureUse(null)}
          onConfirm={onWizardUseConfirm}
        />
      ) : null}

      {sorcerer2024Use ? (
        <Sorcerer2024UseDialog
          key={`${model.sorcererFeatureUse?.featureId}:${model.sorcererFeatureUse?.classEntryId}`}
          open
          request={model.sorcererFeatureUse}
          resources={model.draft.play.resources}
          slots={model.draft.spells.slots}
          featurePicks={model.draft.featurePicks}
          sorcererLevel={sorcererLevel}
          innateActive={innateActive}
          hasControlledChaos={hasControlledChaos}
          onClose={() => model.setSorcererFeatureUse(null)}
          onConfirm={onSorcererUseConfirm}
        />
      ) : null}

      {monk2024Use ? (
        <Monk2024UseDialog
          key={`${model.monkFeatureUse?.featureId}:${model.monkFeatureUse?.classEntryId}`}
          open
          request={model.monkFeatureUse}
          resources={model.draft.play.resources}
          featurePicks={model.draft.featurePicks}
          monkLevel={monkLevel}
          wisMod={abilityModifier(model.draft.abilities.wis)}
          onClose={() => model.setMonkFeatureUse(null)}
          onConfirm={onMonkUseConfirm}
        />
      ) : null}

      {warlock2024Use ? (
        <Warlock2024UseDialog
          key={`${model.warlockFeatureUse?.featureId}:${model.warlockFeatureUse?.classEntryId}`}
          open
          request={model.warlockFeatureUse}
          resources={model.draft.play.resources}
          featurePicks={model.draft.featurePicks}
          pactSlots={model.draft.spells.pact_slots ?? null}
          warlockLevel={warlockLevel}
          chaMod={abilityModifier(model.draft.abilities.cha)}
          onClose={() => model.setWarlockFeatureUse(null)}
          onConfirm={onWarlockUseConfirm}
        />
      ) : null}

      {cleric2024Use ? (
        <Cleric2024UseDialog
          key={`${clericRequest?.featureId}:${clericRequest?.classEntryId}`}
          open
          request={clericRequest}
          resources={model.draft.play.resources}
          featurePicks={model.draft.featurePicks}
          clericLevel={clericLevel}
          wisMod={abilityModifier(model.draft.abilities.wis)}
          onClose={() => model.setClericFeatureUse(null)}
          onConfirm={onClericUseConfirm}
        />
      ) : null}

      {bard2024Use ? (
        <Bard2024UseDialog
          key={`${bardRequest?.featureId}:${bardRequest?.classEntryId}`}
          open
          request={bardRequest}
          resources={model.draft.play.resources}
          slots={model.draft.spells.slots}
          bardLevel={bardLevel}
          chaScore={model.draft.abilities.cha}
          onClose={() => model.setBardFeatureUse(null)}
          onConfirm={onBardUseConfirm}
        />
      ) : null}

      {druid2024Use ? (
        <Druid2024UseDialog
          key={`${druidRequest?.featureId}:${druidRequest?.classEntryId}`}
          open
          request={druidRequest}
          resources={model.draft.play.resources}
          slots={model.draft.spells.slots}
          featurePicks={model.draft.featurePicks}
          druidLevel={Math.max(0, druidRequestRow?.level ?? model.druidLevel ?? 0)}
          wisMod={abilityModifier(model.draft.abilities.wis)}
          subclassSlug={model.subclassSlugByEntryId?.[druidRequest?.classEntryId ?? ''] ?? model.druidSubclassSlug}
          onClose={() => model.setDruidFeatureUse(null)}
          onConfirm={onDruidUseConfirm}
        />
      ) : null}

      {model.featureSelfForm ? (
        <FeatureSelfFormDialog
          open
          onClose={() => model.setFeatureSelfForm(null)}
          limits={shapechangerFormLimits()}
          companions={model.draft.companions}
          knownForms={model.draft.knownForms}
          hostHp={model.draft.hpCurrent ?? 0}
          hostHpMax={model.draft.hpMax ?? 0}
          edition={model.rulesEdition === '2024' ? '2024' : '2014'}
          onConfirm={(result: FeatureSelfFormDialogResult) => {
            const spent = spendFeatureUse({
              resources: model.draft.play.resources,
              feature: model.featureSelfForm.feature,
              classSlug: model.featureSelfForm.classSlug,
            })
            if (!spent.ok) {
              model.onToast(spent.message)
              return
            }
            model.setDraft((prev) => ({
              ...prev,
              companions: result.companions,
              knownForms: result.knownForms,
              play: { ...prev.play, resources: spent.resources },
            }))
            model.onToast(result.toast)
            model.setFeatureSelfForm(null)
          }}
        />
      ) : null}

      {model.pendingSpellSelfForm ? (
        <SpellFormDialog
          open
          spell={model.pendingSpellSelfForm.spell}
          slug={model.pendingSpellSelfForm.slug}
          companions={model.draft.companions}
          knownForms={model.draft.knownForms}
          characterLevel={model.characterLevel}
          hostHp={model.draft.hpCurrent ?? 0}
          hostHpMax={model.draft.hpMax ?? 0}
          edition={model.rulesEdition === '2024' ? '2024' : '2014'}
          onConfirm={model.applySpellSelfFormResult}
          onClose={() => {
            model.setPendingSpellSelfForm(null)
            model.onToast(
              'Облик не выбран — концентрация активна; карточку можно не создавать',
            )
          }}
        />
      ) : null}

      {model.pendingFamiliar ? (
        <FamiliarPickDialog
          open
          mode={model.pendingFamiliar.mode}
          spell={model.pendingFamiliar.spell}
          slotLevel={model.pendingFamiliar.slotLevel}
          companions={model.draft.companions}
          characterLevel={model.characterLevel}
          druidLevel={
            model.draft.classes.find((row) => /друид|druid/i.test(row.name))?.level ??
            1
          }
          edition={model.rulesEdition === '2024' ? '2024' : '2014'}
          onConfirm={model.applyFamiliarPickResult}
          onClose={() => {
            const wildCompanion = model.pendingFamiliar?.mode === 'wild_companion'
            model.setPendingFamiliar(null)
            model.onToast(
              wildCompanion
                ? 'Фамильяр не выбран — расход «Дикого спутника» уже списан'
                : 'Фамильяр не выбран — каст уже списан; можно кастануть снова',
            )
          }}
        />
      ) : null}

      {model.pendingCreaturePick ? (
        <CompanionCreaturePickDialog
          open
          kind={model.pendingCreaturePick.kind}
          spell={model.pendingCreaturePick.spell}
          slotLevel={model.pendingCreaturePick.slotLevel}
          companions={model.draft.companions}
          edition={model.rulesEdition === '2024' ? '2024' : '2014'}
          undeadThralls={Boolean(
            model.draft.classes.some((row) => {
              if (!/волшебник|wizard/i.test(row.name)) return false
              if (row.level < 6) return false
              const slug = model.subclassSlugByEntryId?.[row.id] || ''
              return slug === 'school_of_necromancy' || /некромант/i.test(row.subclass_name || '')
            }),
          )}
          wizardLevel={
            model.draft.classes.find((row) => /волшебник|wizard/i.test(row.name))?.level ?? 1
          }
          proficiencyBonus={model.proficiencyBonus ?? 2}
          onConfirm={model.applyCreaturePickResult}
          onClose={() => {
            model.setPendingCreaturePick(null)
            model.onToast('Существо не выбрано — каст уже списан; можно кастануть снова')
          }}
        />
      ) : null}

      <BardicInspirationSpendDialog
        open={model.bardicInspirationSpendId != null}
        resource={model.bardicInspirationResource}
        features={model.unlockedFeatures}
        onSpend={(label, cost) => {
          if (!model.bardicInspirationSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== model.bardicInspirationSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          model.onToast(`${label}: −${cost} Бардовское вдохновение`)
          model.setBardicInspirationSpendId(null)
          const die =
            bardicInspirationDieLabel(
              model.unlockedFeatures,
              model.unlockedFeatures.find((f: { id: string }) => f.id === 'bardic_inspiration')
                ?.classEntryId ?? '',
            ) || '1к6'
          const mapped = resolveB04BardicSpend(label, die)
          if (mapped?.needsAlly) {
            setPendingAllyBuff({
              slug: mapped.slug,
              name: mapped.name,
              die,
              classLevel: model.characterLevel,
            })
          } else if (mapped) {
            void model.applyFeatureBuff?.({
              slug: mapped.slug,
              name: mapped.name,
              option: die,
              classLevel: model.characterLevel,
            })
          }
        }}
        onToast={model.onToast}
        onClose={() => model.setBardicInspirationSpendId(null)}
      />

      {pendingAllyBuff ? (
        <UseAllyAbilityDialog
          open
          characterId={String(model.baseCharacter.id)}
          characterName={model.draft.name?.trim() || model.baseCharacter.name || 'Персонаж'}
          abilityName={pendingAllyBuff.name}
          targetCount={pendingAllyBuff.slug === 'mantle_of_inspiration' ? 3 : 1}
          onClose={() => setPendingAllyBuff(null)}
          onConfirm={(targetIds) => {
            const targets =
              targetIds.length > 0 ? targetIds : [String(model.baseCharacter.id)]
            void model
              .applyFeatureBuff?.({
                slug: pendingAllyBuff.slug,
                name: pendingAllyBuff.name,
                targets,
                option: pendingAllyBuff.die,
                classLevel: pendingAllyBuff.classLevel,
                casterMod: pendingAllyBuff.casterMod,
                slotLevel: pendingAllyBuff.slotLevel,
                auraAllyDefaultOff: pendingAllyBuff.auraAllyDefaultOff,
              })
              .then((res: { error?: string; applied?: number } | undefined) => {
                if (res?.error) model.onToast(res.error)
                else model.onToast(`${pendingAllyBuff.name}: целей ${targets.length}`)
              })
            setPendingAllyBuff(null)
          }}
          onToast={model.onToast}
        />
      ) : null}

      <LayOnHandsSpendDialog
        open={model.layOnHandsSpendId != null}
        resource={model.layOnHandsResource}
        onSpend={(label, cost) => {
          if (!model.layOnHandsSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== model.layOnHandsSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          model.onToast(`${label}: −${cost} из пула Возложения рук`)
          model.setLayOnHandsSpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setLayOnHandsSpendId(null)}
      />

      <SuperiorityDiceSpendDialog
        open={model.superioritySpendId != null}
        resource={model.superiorityResource}
        features={model.unlockedFeatures}
        featurePicks={model.draft.featurePicks}
        featGrants={model.draft.featGrants}
        onSpend={(label, cost) => {
          if (!model.superioritySpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== model.superioritySpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          model.onToast(`${label}: −${cost} кость превосходства`)
          model.setSuperioritySpendId(null)
          const die =
            model.unlockedFeatures.find((f: { id: string; scaleValue?: string }) =>
              /superiority|боевой\s*мастер|ман[её]вр/i.test(f.id + (f.scaleValue || '')),
            )?.scaleValue || '1к8'
          const action = resolveB04SuperioritySpend(
            label,
            die,
            abilityModifier(model.draft.abilities.cha ?? 10),
          )
          if (action.kind === 'buff') {
            if (action.targetsSelf === false) {
              setPendingAllyBuff({
                slug: action.slug,
                name: action.name || label,
                die: action.option || die,
                casterMod: action.casterMod ?? undefined,
              })
            } else {
              void model.applyFeatureBuff?.({
                slug: action.slug,
                name: action.name,
                option: action.option,
                casterMod: action.casterMod,
              })
            }
          }
        }}
        onToast={model.onToast}
        onClose={() => model.setSuperioritySpendId(null)}
      />

      <ArcaneRecoverySpendDialog
        open={model.arcaneRecoverySpendId != null}
        resource={model.arcaneRecoveryResource}
        wizardLevel={model.arcaneRecoveryWizardLevel}
        slots={model.draft.spells.slots}
        onRecover={(slots, label) => {
          if (!model.arcaneRecoverySpendId) return
          model.setDraft((prev) => ({
            ...prev,
            spells: { ...prev.spells, slots },
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === model.arcaneRecoverySpendId && row.used < row.max
                  ? { ...row, used: row.used + 1 }
                  : row,
              ),
            },
          }))
          model.onToast(label)
          model.setArcaneRecoverySpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setArcaneRecoverySpendId(null)}
      />

      <InfusionsActiveDialog
        open={model.infusionsSpendId != null && model.infusionsContext != null}
        resource={model.infusionsResource}
        characterId={model.baseCharacter.id}
        characterName={model.draft.name?.trim() || model.baseCharacter.name || 'Изобретатель'}
        classEntryId={model.infusionsContext?.classEntryId ?? ''}
        artificerLevel={model.infusionsContext?.level ?? 1}
        featurePicks={model.draft.featurePicks}
        onFeaturePicksChange={(featurePicks) =>
          model.setDraft((prev) => ({ ...prev, featurePicks }))
        }
        onSlotsUsedChange={(used) => {
          if (!model.infusionsSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === model.infusionsSpendId
                  ? { ...row, used: Math.min(row.max, Math.max(0, used)) }
                  : row,
              ),
            },
          }))
        }}
        onToast={model.onToast}
        onClose={() => model.setInfusionsSpendId(null)}
        items={model.draft.inventory.items}
      />

      <WarlockArcanumSpendDialog
        open={model.arcanumSpendId != null}
        resource={model.arcanumResource}
        features={model.unlockedFeatures}
        resources={model.draft.play.resources}
        featurePicks={model.draft.featurePicks}
        onSpend={(poolResourceId, label) => {
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === poolResourceId && row.used < row.max
                  ? { ...row, used: row.used + 1 }
                  : row,
              ),
            },
          }))
          model.onToast(`${label}: −1`)
          model.setArcanumSpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setArcanumSpendId(null)}
      />

      <WarlockInvocationsDialog
        open={model.invocationsOpen != null}
        classEntryId={model.invocationsOpen?.classEntryId ?? ''}
        featurePicks={model.draft.featurePicks}
        onToast={model.onToast}
        onClose={() => model.setInvocationsOpen(null)}
      />

      <PsionicDiceSpendDialog
        open={model.psionicSpendId != null}
        resource={model.psionicResource}
        features={model.unlockedFeatures}
        onSpend={(label, cost) => {
          if (!model.psionicSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== model.psionicSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          model.onToast(`${label}: −${cost} пси`)
          model.setPsionicSpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setPsionicSpendId(null)}
      />

      <SoulTrinketsSpendDialog
        open={model.soulTrinketsSpendId != null}
        resource={model.soulTrinketsResource}
        features={model.unlockedFeatures}
        onBurn={(label) => {
          if (!model.soulTrinketsSpendId) return
          model.setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === model.soulTrinketsSpendId && row.used > 0
                  ? { ...row, used: row.used - 1 }
                  : row,
              ),
            },
          }))
          model.onToast(`${label}: −1 частица`)
          model.setSoulTrinketsSpendId(null)
        }}
        onToast={model.onToast}
        onClose={() => model.setSoulTrinketsSpendId(null)}
      />

      <RangerFavoredDeskDialog
        open={model.rangerFavoredOpen != null}
        classEntryId={model.rangerFavoredOpen?.classEntryId ?? ''}
        featurePicks={model.draft.featurePicks}
        onToast={model.onToast}
        onClose={() => model.setRangerFavoredOpen(null)}
      />

    </>
  )
}
