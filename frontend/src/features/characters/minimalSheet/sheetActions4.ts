/** Действия листа, группа 4. Тела функций перенесены без изменения порядка вызовов. */
import type { SheetModel } from './sheetModel'
import type { Draft } from './draft'
import { type CompanionEntry } from '../companions'
import {
  applyConcentrationChangeToCompanions,
  applySpellCastToCompanions,
  resolveSpellNaparnikSlug,
} from '../spellCompanions'
import { isSpellSelfFormCast, resolveSpellSelfFormSlug } from '../spellForms'
import { type SpellFormDialogResult } from '../SpellFormDialog'
import { type FamiliarPickDialogResult } from '../FamiliarPickDialog'
import type {
  CompanionCreaturePickKind,
  CompanionCreaturePickResult,
} from '../CompanionCreaturePickDialog'
import { isConjurePickSpell } from '../conjureCompanions'
import { isFindSteedSpellSlug } from '../steedCompanions'
import { isFindFamiliarSpell, resolveFamiliarCastMode } from '../familiarForms'
import { wildShapeCastBlock } from '../wildShape'
import { type AttunementSlot } from '../attunement'
import { isPactChainActive, isPactChainSpellId, pactChainFamiliarSpellId, syncPactChainFamiliar } from '../pactChainEffects'
import { isWarlockClassName } from '../pactTomeEffects'
import { toggleCombatConsumableFavorite } from '../combatConsumables'
import {
  formatSkillRoll,
  resolveRollMode,
  type BonusDiePart,
  type DeskRollMode,
} from '../deskRolls'
import {
  chooseTempHpPool,
  consumeRollDieChips,
  listRollDieChips,
  mergeDeskRollMode,
  resolveAdvantageFromEffects,
  saveBonusFromActiveEffects,
  skillBonusFromActiveEffects,
} from '../../../shared/dnd/activeEffects'
import { formatSaveAdvantageNote } from '../gearEffects'
import { isMantleCommandSpell, MANTLE_CONCENTRATION_ID, silverTongueApplies } from '../../../shared/dnd/bardCollege'
import { exhaustionRollFlags } from '../../../shared/dnd/exhaustion2014'
import {
  MAGICAL_GUIDANCE_SHEET_NAME,
  primalKnowledgeAbilityOverride,
} from '../../../shared/dnd/o02TashaFeatures'
import { normalizeCampaignRules } from '../../lobby/campaignRules'
import { proficiencyRollContribution } from '../../../shared/dnd/o04DmgAdvanced'
import {
  MODE_DEFAULT_PANEL,
  MODE_SKILL_KEYS,
  defaultDeskSplitForMode,
  type PlayDeskCompactPanelId,
  type PlayDeskMode,
  type PlayDeskPanelId,
  type SheetUiState,
} from '../playDeskUi'
import { setConcentration } from '../../../shared/dnd/concentration'
import { equipInventoryItem } from '../inventory'
import { consumeScrollItem } from '../spellScroll'
import { spendItemCharges } from '../itemSpellCast'
import { canCastWizardRitualFromBook } from '../../../shared/dnd/wizardSpellbook'
import { canOfferRitualCast, castAccessAllowsRitual } from '../../../shared/dnd/ritualCasting'
import { ritualBookBlockReason } from '../castWithoutSlots'
import { spendFeatureCast } from '../featureCastSpend'
import { resolveCastTiming } from '../../../shared/dnd/upcastDuration'
import {
  applyAbjurationToWard,
  bladesongBonuses,
  gainPowerSurge,
  isAbjurationSchool,
  wizardLeveledCastGate,
} from '../../../shared/dnd/wizardTradition'
import { type CastChoice } from '../CastSpellDialog'
import { applySpellBuffToTargets } from '../applySpellBuff'
import { clearCharacterConcentrationEffects } from '../../../shared/api/characters'
import { type ActiveEffect } from '../../../shared/dnd/activeEffects'
import { consumeMaterialItem } from '../spellMaterials'
import { canSpendGrantCast, spendGrantCast, type SheetSpell } from '../spells'
import { resolveCastEffect } from '../../../shared/dnd/spellCatalog'
import { getFeaturePick } from '../../../shared/dnd/featurePicks'
import {
  lunarFreeCastBlocked,
} from '../sorcererOriginSpells'
import {
  elementalAffinityPreview,
  normalizeLunarPhase,
} from '../../../shared/dnd/pack04SorcererWarlock'
import {
  REPELLING_BLAST_HINT,
  agonizingBlastDamageBonus,
  formatEldritchBlastDamagePreview,
  hasRepellingBlast,
  isEldritchBlastSpell,
} from '../../../shared/dnd/o06StylesBreathInvocations'
import { resolveSpellCastStats } from '../../../shared/dnd/castProfiles'
import {
  canCastLeveledSpell,
  SPELLCASTING_ABILITY_LABELS,
  spendPactSlot,
  spendSpellSlot,
  type SpellcastingAbility,
} from '../../../shared/dnd/spells'
import { isShillelaghSpell, pickShillelaghAttack } from '../shillelagh'
import {
  ABILITY_LABELS,
  ABILITY_NAMES,
  SKILL_DEFS,
  abilityModifier,
  type AbilityKey,
} from '../sheetTypes'
import { skillModifierFromState } from '../../../shared/dnd/passives'

export function installSheetActions4(model: SheetModel) {
  model.patchSheetUi = function patchSheetUi(patch: Partial<SheetUiState>) {
    model.setDraft((prev) => ({
      ...prev,
      sheetUi: { ...prev.sheetUi, ...patch },
    }))
  }

  model.toggleCombatFavorite = function toggleCombatFavorite(itemId: string) {
    const result = toggleCombatConsumableFavorite(
      model.draft.sheetUi.combatConsumableFavoriteIds,
      itemId,
    )
    if (!result.ok) {
      model.onToast(result.reason ?? 'Нельзя добавить в избранное')
      return
    }
    const adding = !model.draft.sheetUi.combatConsumableFavoriteIds.includes(itemId)
    const name =
      model.draft.inventory.items.find((row) => row.id === itemId)?.name.trim() || 'предмет'
    model.patchSheetUi({ combatConsumableFavoriteIds: result.ids })
    model.onToast(
      adding
        ? `«${name}» в расходниках боя (${result.ids.length}/3)`
        : `«${name}» убран из избранного`,
    )
  }

  model.setDeskMode = function setDeskMode(mode: PlayDeskMode) {
    const nextPanel = MODE_DEFAULT_PANEL[mode]
    // Combat: pin spells when magic exists. Explore/social: full width (A3).
    const nextSplit =
      mode === 'features' || mode === 'companions'
        ? false
        : defaultDeskSplitForMode(mode, model.hasMagicSources)
    model.patchSheetUi({ deskMode: mode, deskSplit: nextSplit })
    model.setActivePanel(nextPanel)
    model.setForceFullPanel(null)
    model.setAttacksSettingsOpen(false)
    model.setSpellsSettingsOpen(false)
    model.setMobileSpellSurface('combat')
  }

  model.applyDeskConcentration = function applyDeskConcentration(spell: SheetSpell) {
    const hadConc = Boolean(model.draft.play.concentration)
    const sourceId = String(model.baseCharacter.id)
    model.setDraft((prev) => {
      const next = model.withDeskConcentration(prev, spell)
      if (!hadConc) return next
      return {
        ...next,
        play: {
          ...next.play,
          effects: (next.play.effects ?? []).filter((row: ActiveEffect) =>
            !(
              row.linked_concentration &&
              String(row.source_character_id || '') === sourceId
            ),
          ),
        },
      }
    })
    // Server clear of old linked effects is chained from successToast (before apply).
  }

  model.withDeskConcentration = function withDeskConcentration<
    T extends { play: typeof model.draft.play; companions: CompanionEntry[] },
  >(prev: T, spell: SheetSpell): T {
    if (!spell.concentration) return prev
    const next = setConcentration({
      spellId: spell.id,
      name: spell.name || 'Заклинание',
    })
    const result = applyConcentrationChangeToCompanions({
      companions: prev.companions,
      previous: prev.play.concentration,
      next,
    })
    return {
      ...prev,
      companions: result.companions,
      play: {
        ...prev.play,
        concentration: next,
      },
    }
  }

  model.needsDeskConcentrationSwap = function needsDeskConcentrationSwap(spell: SheetSpell): boolean {
    const current = model.draft.play.concentration
    if (!spell.concentration || !current) return false
    return (
      current.spell_id !== spell.id &&
      current.name.trim() !== (spell.name || '').trim()
    )
  }

  model.applyDeskNaparnikFromCast = function applyDeskNaparnikFromCast(spell: SheetSpell, slotLevel: number): string {
    const abilityKey = model.draft.spells.casting_ability
    const spellMod = abilityKey ? abilityModifier(model.effectiveAbilities[abilityKey]) : 0
    const castCtx = {
      spell,
      slotLevel,
      characterLevel: model.characterLevel,
      spellMod,
    }
    const preview = applySpellCastToCompanions({
      companions: model.draft.companions,
      ...castCtx,
    })
    if (!preview) return ''
    model.setDraft((prev) => {
      const result = applySpellCastToCompanions({
        companions: prev.companions,
        ...castCtx,
      })
      return result ? { ...prev, companions: result.companions } : prev
    })
    return preview.refreshed
      ? ` · напарник «${preview.name}» снова в строю`
      : ` · напарник «${preview.name}»`
  }

/** Pact of the Chain: ensure Find Familiar row, then open cast dialog. */
  model.openPactChainFamiliarCast = function openPactChainFamiliarCast(classEntryId?: string) {
    const warlock = model.draft.classes.find(
      (row) =>
        isWarlockClassName(row.name) &&
        row.level > 0 &&
        (!classEntryId || row.id === classEntryId),
    )
    if (!warlock || !isPactChainActive(model.draft.featurePicks, warlock.id)) {
      model.onToast('Нужен договор Цепь у колдуна')
      return
    }
    const synced = syncPactChainFamiliar({
      spells: model.draft.spells,
      featurePicks: model.draft.featurePicks,
      classes: model.draft.classes,
    })
    if (synced.changed) {
      model.setDraft((prev) => ({ ...prev, spells: synced.spells }))
    }
    const known = synced.spells.known
    const spell =
      known.find((row) => row.id === pactChainFamiliarSpellId()) ??
      known.find((row) => isPactChainSpellId(row.id)) ??
      known.find(
        (row) =>
          row.class_slug === 'warlock' &&
          /поиск\s+фамильяра|find\s*familiar/i.test(row.name),
      )
    if (!spell) {
      model.onToast('Нет «Поиска фамильяра» — проверь договор Цепь у колдуна')
      return
    }
    model.setDeskCastSpell(spell)
  }

  model.openDeskSelfFormPickerIfNeeded = function openDeskSelfFormPickerIfNeeded(spell: SheetSpell, choice: CastChoice) {
    if (choice.selfFormTarget === 'other') return false
    if (!isSpellSelfFormCast(spell)) return false
    const slug = resolveSpellSelfFormSlug(spell)
    if (!slug) return false
    model.setPendingSpellSelfForm({ spell, slug })
    return true
  }

  model.openDeskFamiliarPickerIfNeeded = function openDeskFamiliarPickerIfNeeded(
    spell: SheetSpell,
    slotLevel: number,
  ): boolean {
    if (!isFindFamiliarSpell(spell)) return false
    const mode = resolveFamiliarCastMode({
      spell,
      featurePicks: model.draft.featurePicks,
      classes: model.draft.classes,
    })
    model.setPendingFamiliar({ spell, mode, slotLevel })
    return true
  }

  model.openDeskCreaturePickerIfNeeded = function openDeskCreaturePickerIfNeeded(
    spell: SheetSpell,
    slotLevel: number,
  ): boolean {
    const slug = resolveSpellNaparnikSlug(spell)
    if (!slug) return false
    let kind: CompanionCreaturePickKind | null = null
    if (isFindSteedSpellSlug(slug)) {
      kind = {
        type: 'steed',
        slug: slug as 'find_steed' | 'find_greater_steed',
      }
    } else if (slug === 'animate_dead' || slug === 'create_undead') {
      kind = { type: 'undead', slug }
    } else if (isConjurePickSpell(slug)) {
      kind = {
        type: 'conjure',
        slug: slug as
          | 'conjure_animals'
          | 'conjure_woodland_beings'
          | 'conjure_minor_elementals'
          | 'conjure_elemental'
          | 'conjure_fey'
          | 'conjure_celestial',
      }
    }
    if (!kind) return false
    model.setPendingCreaturePick({ spell, slotLevel, kind })
    return true
  }

  model.applySpellSelfFormResult = function applySpellSelfFormResult(result: SpellFormDialogResult) {
    model.setDraft((prev) => ({
      ...prev,
      companions: result.companions,
      knownForms: result.knownForms,
    }))
    if (result.toast) model.onToast(result.toast)
    model.setPendingSpellSelfForm(null)
  }

  model.applyFamiliarPickResult = function applyFamiliarPickResult(result: FamiliarPickDialogResult) {
    model.setDraft((prev) => ({ ...prev, companions: result.companions }))
    if (result.toast) model.onToast(result.toast)
    model.setPendingFamiliar(null)
  }

  model.applyCreaturePickResult = function applyCreaturePickResult(
    result: CompanionCreaturePickResult,
  ) {
    model.setDraft((prev) => ({ ...prev, companions: result.companions }))
    if (result.toast) model.onToast(result.toast)
    model.setPendingCreaturePick(null)
  }

  function wizardCastFollowUp(
    spell: SheetSpell,
    slotLevel: number,
    choice: CastChoice,
  ): string {
    if (spell.level <= 0) return ''
    let resources = model.draft.play.resources
    const notes: string[] = []
    if (isAbjurationSchool(spell.school)) {
      const repaired = applyAbjurationToWard(resources, slotLevel)
      resources = repaired.resources
      if (repaired.note) notes.push(repaired.note)
    }
    if (choice.powerSurge) {
      const gained = gainPowerSurge(resources)
      resources = gained.resources
      if (gained.note) notes.push(gained.note)
    }
    if (resources !== model.draft.play.resources) {
      const nextResources = resources
      model.setDraft((prev) => ({
        ...prev,
        play: { ...prev.play, resources: nextResources },
      }))
    }
    return notes.length ? ` · ${notes.join(' · ')}` : ''
  }

  model.runDeskCast = function runDeskCast(spell: SheetSpell, choice: CastChoice): boolean {
    let castSucceeded = false
    const ritualCastEarly = Boolean(choice.ritual && spell.ritual && spell.level > 0)
    const teApi = model.turnEconomyApi as
      | {
          canCast: (
            t: 'action' | 'bonus' | 'reaction' | null,
            level?: number,
          ) => { ok: boolean; reason?: string }
          spendCast: (input: {
            timing: 'action' | 'bonus' | 'reaction' | null
            name: string
            level: number
            id?: string
            quickened?: boolean
          }) => void
        }
      | undefined
    const toMark =
      (model.castingTimeToEconomyMark as
        | ((raw: unknown) => 'action' | 'bonus' | 'reaction' | null)
        | undefined) ?? null
    let castTiming: 'action' | 'bonus' | 'reaction' | null = toMark
      ? toMark(spell.casting_time)
      : 'action'
    if (choice.embodimentOfLaw) castTiming = 'bonus'
    // Э8: «Ускоренное» переводит каст действием → бонусное
    const quickened =
      Boolean(choice.quickened) &&
      (castTiming === 'action' || castTiming == null)
    if (quickened) castTiming = 'bonus'
    if (ritualCastEarly) castTiming = null
    if (teApi) {
      const gate = teApi.canCast(castTiming, spell.level)
      if (!gate.ok) {
        model.onToast(gate.reason ?? 'уже потрачено — сними отметку вручную')
        return false
      }
    }
    // Э8 / O-01: списать очки чародейства за метамагию до проведения каста
    const seeking = Boolean(choice.seeking)
    const transmutedType =
      typeof choice.transmutedType === 'string' && choice.transmutedType.trim()
        ? choice.transmutedType.trim()
        : null
    const metaSpCost = (quickened ? 2 : 0) + (seeking ? 2 : 0) + (transmutedType ? 1 : 0)
    if (metaSpCost > 0) {
      const pool = model.draft.play.resources.find((row: { id: string; name: string }) =>
        model.isSorceryPointsResource(row),
      )
      const left = pool ? Math.max(0, pool.max - pool.used) : 0
      if (!pool || left < metaSpCost) {
        model.onToast(
          `Не хватает очков чародейства для метамагии (нужно ${metaSpCost}, есть ${left})`,
        )
        return false
      }
      const poolId = pool.id
      model.setDraft((prev) => ({
        ...prev,
        play: {
          ...prev.play,
          resources: prev.play.resources.map((row) =>
            row.id === poolId ? { ...row, used: row.used + metaSpCost } : row,
          ),
        },
      }))
    }
    const metaNotes: string[] = []
    if (seeking) {
      metaNotes.push('Ищущее: при промахе перебрось к20 (новый результат обязателен)')
    }
    if (transmutedType) {
      const typeRu =
        (
          {
            thunder: 'звук',
            acid: 'кислота',
            fire: 'огонь',
            cold: 'холод',
            lightning: 'электричество',
            poison: 'яд',
          } as Record<string, string>
        )[transmutedType] ?? transmutedType
      metaNotes.push(`Преобразованное: тип урона → ${typeRu}`)
    }
    if (choice.magicalInspiration) {
      metaNotes.push(
        'Магическое вдохновение: добавь кость BI цели к урону/лечению одной цели — кость тратится',
      )
      // If self holds a BI die buff, consume it.
      const hasBi = (model.draft.play.effects ?? []).some(
        (e: { slug?: string | null; inactive?: boolean | null }) =>
          e.slug === 'bardic_inspiration' && !e.inactive,
      )
      if (hasBi) {
        model.setDraft((prev) => ({
          ...prev,
          play: {
            ...prev.play,
            effects: (prev.play.effects ?? []).map((e) =>
              e.slug === 'bardic_inspiration' && !e.inactive
                ? { ...e, inactive: true }
                : e,
            ),
          },
        }))
      }
    }
    const successToast = (message: string) => {
      castSucceeded = true
      teApi?.spendCast({
        timing: castTiming,
        name: spell.name || 'Заклинание',
        level: spell.level,
        id: spell.id,
        quickened,
      })
      const full =
        metaNotes.length > 0 ? `${message} · ${metaNotes.join(' · ')}` : message
      model.onToast(full)
      const sourceId = String(model.baseCharacter.id)
      void (async () => {
        if (spell.concentration) {
          await clearCharacterConcentrationEffects(sourceId, {
            clearConcentration: false,
          }).catch(() => null)
        }
        const castingAbility = model.draft.spells.casting_ability as AbilityKey | undefined
        const casterMod =
          castingAbility && model.draft.abilities[castingAbility] != null
            ? abilityModifier(model.draft.abilities[castingAbility] as number)
            : abilityModifier(model.draft.abilities.cha ?? 10)
        const res = await applySpellBuffToTargets({
          spell,
          choice,
          sourceCharacterId: sourceId,
          sourceName: model.draft.name || model.baseCharacter.name || 'Заклинатель',
          casterMod,
          buffOption: choice.buffOption ?? null,
          onHpMaxGrant: (bonus) => {
            model.setDraft((prev) => ({
              ...prev,
              hpMax: Math.max(1, (prev.hpMax ?? 0) + bonus),
              hpCurrent: (prev.hpCurrent ?? 0) + bonus,
            }))
          },
          onTempHpGrant: (incoming) => {
            const current = Math.max(0, model.draft.play.hpTemp || 0)
            if (current <= 0) {
              model.setDraft((prev) => ({
                ...prev,
                play: { ...prev.play, hpTemp: incoming },
              }))
              return true
            }
            // Ask via model hook (TempHpReplaceDialog). Fallback: keep larger.
            const ask = model.askTempHpReplace as
              | ((input: { current: number; incoming: number }) => Promise<'keep' | 'replace'>)
              | undefined
            if (typeof ask === 'function') {
              return ask({ current, incoming }).then((choiceKeep: 'keep' | 'replace') => {
                const next = chooseTempHpPool(
                  current,
                  incoming,
                  choiceKeep === 'keep' ? 'keep' : 'replace',
                )
                model.setDraft((prev) => ({
                  ...prev,
                  play: { ...prev.play, hpTemp: next },
                }))
                return next === incoming
              })
            }
            const next = Math.max(current, incoming)
            model.setDraft((prev) => ({
              ...prev,
              play: { ...prev.play, hpTemp: next },
            }))
            return next === incoming
          },
          onApplyLocal: (effect: ActiveEffect) => {
            model.setDraft((prev) => ({
              ...prev,
              play: {
                ...prev.play,
                effects: [...(prev.play.effects ?? []), effect],
              },
            }))
          },
        })
        if (res.error) model.onToast(res.error)
        else if (res.applied > 0) model.onToast(`Эффект на целях: ${res.applied}`)
      })()
    }
    const wildBlock = wildShapeCastBlock({
      companions: model.draft.companions,
      classes: model.draft.classes,
      classSlug: spell.class_slug,
      material: spell.components?.m,
    })
    if (wildBlock) {
      model.onToast(wildBlock)
      return false
    }
    const name = spell.name || 'Заклинание'
    const ritualCast = Boolean(choice.ritual && spell.ritual && spell.level > 0)
    const atWillCast = Boolean(choice.atWill || spell.cast_access === 'at_will')
    const featureCast = Boolean(choice.useFeature || spell.cast_access === 'feature')
    if ((ritualCast || spell.cast_access === 'ritual_only') && ritualBookBlockReason(model.draft.spells, spell)) {
      model.onToast(ritualBookBlockReason(model.draft.spells, spell) ?? 'Нет книги')
      return false
    }
    if (ritualCast && model.spellLearnBudget?.mode !== 'spellbook') {
      const allowed = canOfferRitualCast({
        ritual: true,
        level: spell.level,
        classSlug: spell.class_slug,
        casterSlugs: (model.spellcastingSync?.castProfiles ?? []).map(
          (row: { slug: string }) => row.slug,
        ),
        castAccess: spell.cast_access,
      })
      if (!allowed) {
        model.onToast(
          'Ритуал недоступен: у этого класса нет умения «Ритуальное колдовство». Кастуй ячейкой.',
        )
        return false
      }
    }
    if (choice.embodimentOfLaw) {
      const pool = model.draft.play.resources.find(
        (row) => row.id.includes(':embodiment_of_the_law:') && row.max - row.used > 0,
      )
      if (!pool) {
        model.onToast('Нет зарядов Воплощения закона')
        return false
      }
      model.setDraft((prev) => ({
        ...prev,
        play: {
          ...prev.play,
          resources: prev.play.resources.map((row) =>
            row.id === pool.id ? { ...row, used: row.used + 1 } : row,
          ),
        },
      }))
    }
    const voice =
      model.unlockedFeatures.some((row: { id: string }) => row.id === 'voice_of_authority') &&
      spell.level > 0 &&
      !ritualCast
    const allyNote = `${
      choice.allyTargetIds && choice.allyTargetIds.length > 0
        ? ` · целей ${choice.allyTargetIds.length}`
        : ''
    }${voice ? ' · Голос власти: союзник может реакцией атаковать' : ''}${
      choice.embodimentOfLaw ? ' · бонусное действие' : ''
    }${
      /проклятие|bestow curse/i.test(spell.name) && spell.duration ? ` · ${spell.duration}` : ''
    }`
    const grantSpellId = choice.grantSpellId || spell.id
    const grantRow =
      choice.useGrant
        ? model.draft.spells.known.find((row) => row.id === grantSpellId) ?? spell
        : null
    const grantCast = Boolean(grantRow && canSpendGrantCast(grantRow))
    const slotForEffect = choice.noSlot
      ? choice.slotLevel || spell.level
      : spell.level <= 0 || ritualCast || grantCast || atWillCast || featureCast
        ? spell.level
        : choice.usePact
          ? (model.draft.spells.pact_slots?.level ?? spell.level)
          : choice.slotLevel
    const castStats = resolveSpellCastStats({
      spell,
      profiles: model.spellcastingSync?.castProfiles ?? [],
      abilityModFor: (ability: SpellcastingAbility) =>
        abilityModifier(model.effectiveAbilities[ability]),
      proficiencyBonus: model.proficiencyBonus,
      fallbackAbility: model.draft.spells.casting_ability,
    })
    const sorc = model.draft.classes.find((row) => /чародей|sorcerer/i.test(row.name))
    const elementalAffinity = sorc
      ? elementalAffinityPreview({
          subclassSlug: model.subclassSlugByEntryId?.[sorc.id] || sorc.subclass_name,
          sorcererLevel: sorc.level,
          ancestry: getFeaturePick(model.draft.featurePicks, sorc.id, 'dragon_ancestor'),
          chaMod: abilityModifier(model.effectiveAbilities.cha),
        })
      : null
    const warlockInvocationIds: string[] = []
    for (const row of model.draft.classes) {
      if (!/колдун|warlock/i.test(row.name)) continue
      const raw =
        model.draft.featurePicks.values[`${row.id}:eldritch_invocations`] ?? ''
      for (const id of raw.split(',')) {
        const t = id.trim()
        if (t) warlockInvocationIds.push(t)
      }
    }
    const chaMod = abilityModifier(model.effectiveAbilities.cha)
    const agonizing = agonizingBlastDamageBonus({
      knownInvocationIds: warlockInvocationIds,
      chaMod,
      spellName: spell.name,
      catalogId: spell.catalog_id,
    })
    const affinity =
      agonizing !== 0
        ? { damageType: 'силовое поле', amount: agonizing }
        : elementalAffinity
    let { effect, scaled } = resolveCastEffect(spell, {
      characterLevel: model.characterLevel,
      slotLevel: slotForEffect || spell.level,
      spellMod: castStats.ability
        ? abilityModifier(model.effectiveAbilities[castStats.ability])
        : null,
      spellModLabel: castStats.ability
        ? SPELLCASTING_ABILITY_LABELS[castStats.ability]
        : null,
      damageChoice: choice.damageChoice,
      affinity,
    })
    if (
      isEldritchBlastSpell({ name: spell.name, catalogId: spell.catalog_id })
    ) {
      effect = formatEldritchBlastDamagePreview({
        characterLevel: model.characterLevel,
        chaMod,
        hasAgonizing: agonizing !== 0,
      })
      scaled = true
      if (hasRepellingBlast(warlockInvocationIds)) {
        effect = `${effect} · ${REPELLING_BLAST_HINT}`
      }
    }
    if (choice.noSlot) {
      const spent = spendItemCharges(
        model.draft.play.resources,
        {
          resourceId: choice.itemResourceId ?? null,
          charges: choice.itemChargeCost ?? 0,
        },
        choice.itemChargeCost ?? 0,
      )
      if (!spent.ok) {
        model.onToast(spent.message)
        return false
      }
      model.setDraft((prev) =>
        model.withDeskConcentration(
          {
            ...prev,
            play: { ...prev.play, resources: spent.resources },
            inventory: choice.scrollItemId
              ? {
                  ...prev.inventory,
                  items: consumeScrollItem(prev.inventory.items, choice.scrollItemId),
                }
              : prev.inventory,
          },
          spell,
        ),
      )
      const chargeNote =
        (choice.itemChargeCost ?? 0) > 0 ? ` · −${choice.itemChargeCost} зарядов` : ''
      const hint = spent.hint ? ` · ${spent.hint}` : ''
      model.setDeskScrollLock(null)
      successToast(
        `Каст: ${name}${choice.scrollItemId ? ' со свитка' : ' из предмета'} (без ячейки)${
          effect ? ` · ${effect}` : ''
        }${chargeNote}${hint}${spell.concentration ? ' · концентрация' : ''}`,
      )
      return true
    }
    let shillelaghNote = ''
    if (isShillelaghSpell(spell)) {
      const weapon = pickShillelaghAttack(model.draft.weapons)
      if (weapon && castStats.ability) {
        const ability = castStats.ability
        model.setDraft((prev) => ({
          ...prev,
          play: {
            ...prev.play,
            shillelagh: { attackId: weapon.id, ability },
          },
        }))
        shillelaghNote = ` · ${weapon.name}: ${SPELLCASTING_ABILITY_LABELS[ability]}, кость к8`
      } else {
        shillelaghNote = ' · нет дубинки или посоха'
      }
    }
    const effectNote = `${scaled && effect ? ` · ${effect}` : ''}${shillelaghNote}`
    let consumeNote = ''
    if (choice.consumeMaterial && choice.consumeItemId) {
      const target = model.draft.inventory.items.find((row) => row.id === choice.consumeItemId)
      if (target) {
        model.setDraft((prev) => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            items: consumeMaterialItem(prev.inventory.items, choice.consumeItemId!, 1),
          },
        }))
        consumeNote = ` · −1 «${target.name}»`
      }
    }
    const naparnikSlot = slotForEffect || spell.level
    const familiarSlot = ritualCast || grantCast || atWillCast || featureCast ? 0 : naparnikSlot
    const wantsForm = model.openDeskSelfFormPickerIfNeeded(spell, choice)
    const wantsFamiliar =
      !wantsForm && model.openDeskFamiliarPickerIfNeeded(spell, familiarSlot)
    const wantsCreaturePick =
      !wantsForm &&
      !wantsFamiliar &&
      model.openDeskCreaturePickerIfNeeded(spell, familiarSlot || naparnikSlot)
    const formNote = wantsForm
      ? ' · выбери форму'
      : wantsFamiliar
        ? ' · выбери фамильяра'
        : wantsCreaturePick
          ? ' · выбери существо'
          : ''

    if (atWillCast) {
      if (spell.concentration) model.applyDeskConcentration(spell)
      successToast(
        `Каст: ${name} (по желанию, без ячейки)${effectNote}${consumeNote}${allyNote}${
          spell.concentration ? ' · концентрация' : ''
        }${formNote}`,
      )
      return true
    }
    if (featureCast) {
      const spent = spendFeatureCast({
        resources: model.draft.play.resources,
        spell,
      })
      if (!spent.ok) {
        model.onToast(spent.message)
        return false
      }
      model.setDraft((prev) => ({
        ...prev,
        play: { ...prev.play, resources: spent.resources },
      }))
      if (spell.concentration) model.applyDeskConcentration(spell)
      successToast(
        `Каст: ${name} (${spent.message}, без ячейки)${effectNote}${consumeNote}${allyNote}${
          spell.concentration ? ' · концентрация' : ''
        }${formNote}`,
      )
      return true
    }
    if (isMantleCommandSpell(spell)) {
      const conc = model.draft.play.concentration
      if (!conc || conc.spell_id !== MANTLE_CONCENTRATION_ID) {
        model.onToast('Приказ мантии доступен, только пока держится концентрация на «Мантии величия»')
        return false
      }
      successToast(`Каст: ${name} (Мантия величия, без ячейки)${effectNote}${consumeNote}${allyNote}`)
      return true
    }
    if (spell.level <= 0) {
      if (spell.concentration) model.applyDeskConcentration(spell)
      const naparnikNote =
        wantsForm || wantsFamiliar || wantsCreaturePick
          ? ''
          : model.applyDeskNaparnikFromCast(spell, naparnikSlot)
      model.onToast(
        spell.concentration
          ? `Каст: ${name}${effectNote}${consumeNote}${allyNote} (концентрация)${naparnikNote}${formNote}`
          : `Каст: ${name}${effectNote}${consumeNote}${allyNote}${naparnikNote}${formNote}`,
      )
      return true
    }
    if (grantCast && grantRow) {
      const phase = normalizeLunarPhase(
        getFeaturePick(model.draft.featurePicks, spell.class_entry_id ?? '', 'lunar_embodiment'),
      )
      if (
        lunarFreeCastBlocked({
          spell: grantRow,
          phase,
          classLevel: model.characterLevel,
        })
      ) {
        model.onToast('Бесплатный каст этой лунной фазы доступен, только пока фаза активна')
        return false
      }
      const label = grantRow.grant_cast?.label ?? 'Грант'
      model.setDraft((prev) =>
        model.withDeskConcentration(
          {
            ...prev,
            spells: {
              ...prev.spells,
              known: spendGrantCast(prev.spells.known, grantRow.id),
            },
          },
          spell,
        ),
      )
      const naparnikNote =
        wantsForm || wantsFamiliar || wantsCreaturePick
          ? ''
          : model.applyDeskNaparnikFromCast(spell, naparnikSlot)
      const wardNote = wizardCastFollowUp(spell, spell.level, choice)
      successToast(
        `Каст: ${name} (−1 ${label})${effectNote}${consumeNote}${allyNote}${
          spell.concentration ? ' · концентрация' : ''
        }${naparnikNote}${formNote}${wardNote}`,
      )
      return true
    }
    if (choice.useMastery) {
      const gate = wizardLeveledCastGate(spell)
      if (!gate.slot) {
        model.onToast(gate.message || 'Мастерство требует подготовленное заклинание')
        return false
      }
      if (spell.concentration) model.applyDeskConcentration(spell)
      const wardNote = wizardCastFollowUp(spell, spell.level, choice)
      successToast(
        `Каст: ${name} (мастерство, без ячейки)${effectNote}${consumeNote}${allyNote}${
          spell.concentration ? ' · концентрация' : ''
        }${wardNote}`,
      )
      return true
    }
    if (ritualCast) {
      const externalRitual = spell.ritual_book != null || castAccessAllowsRitual(spell.cast_access)
      if (model.spellLearnBudget?.mode === 'spellbook' && !externalRitual) {
        const gate = canCastWizardRitualFromBook({
          spell,
          book: model.draft.spells.wizard_spellbook,
        })
        if (!gate.ok) {
          model.onToast(gate.message)
          return false
        }
      }
      if (spell.concentration) model.applyDeskConcentration(spell)
      const naparnikNote =
        wantsForm || wantsFamiliar || wantsCreaturePick
          ? ''
          : model.applyDeskNaparnikFromCast(spell, naparnikSlot)
      const wardNote = wizardCastFollowUp(spell, spell.level, choice)
      successToast(
        `Ритуал: ${name} (без ячейки)${effectNote}${consumeNote}${allyNote}${
          spell.concentration ? ' · концентрация' : ''
        }${naparnikNote}${formNote}${wardNote}`,
      )
      return true
    }
    if (model.spellLearnBudget?.mode === 'spellbook' && !choice.useGrant) {
      const gate = wizardLeveledCastGate(spell)
      if (!gate.slot) {
        model.onToast(gate.message)
        return false
      }
    }
    if (
      !canCastLeveledSpell(
        model.draft.spells.slots,
        model.draft.spells.pact_slots,
        spell.level,
      )
    ) {
      model.onToast('Нет ячейки этого круга')
      return false
    }
    if (choice.usePact && model.draft.spells.pact_slots) {
      const pactResult = spendPactSlot(model.draft.spells.pact_slots)
      if (!pactResult.ok) {
        model.onToast('Нет свободных ячеек договора')
        return false
      }
      model.setDraft((prev) =>
        model.withDeskConcentration(
          {
            ...prev,
            spells: { ...prev.spells, pact_slots: pactResult.pact },
          },
          spell,
        ),
      )
      const naparnikNote =
        wantsForm || wantsFamiliar || wantsCreaturePick
          ? ''
          : model.applyDeskNaparnikFromCast(spell, pactResult.pact.level)
      const wardNote = wizardCastFollowUp(spell, pactResult.pact.level, choice)
      successToast(
        `Каст: ${name} (−1 договор ${pactResult.pact.level} ур.)${effectNote}${consumeNote}${allyNote}${
          spell.concentration ? ' · концентрация' : ''
        }${naparnikNote}${formNote}${wardNote}`,
      )
      return true
    }
    const result = spendSpellSlot(model.draft.spells.slots, choice.slotLevel)
    if (!result.ok) {
      model.onToast(`Нет ячеек ${choice.slotLevel}-го уровня`)
      return false
    }
    model.setDraft((prev) =>
      model.withDeskConcentration(
        {
          ...prev,
          spells: { ...prev.spells, slots: result.slots },
        },
        spell,
      ),
    )
    const naparnikNote =
      wantsForm || wantsFamiliar || wantsCreaturePick
        ? ''
        : model.applyDeskNaparnikFromCast(spell, choice.slotLevel)
    const upcast =
      choice.slotLevel > spell.level ? ` · upcast ${choice.slotLevel}` : ''
    const wardNote = wizardCastFollowUp(spell, choice.slotLevel, choice)
    successToast(
      `Каст: ${name} (−1 ячейка ${choice.slotLevel} ур.)${upcast}${effectNote}${consumeNote}${allyNote}${
        spell.concentration ? ' · концентрация' : ''
      }${naparnikNote}${formNote}${wardNote}`,
    )
    return castSucceeded
  }

  model.confirmDeskCast = function confirmDeskCast(choice: CastChoice) {
    if (!model.deskCastSpell) return
    const raw = model.deskCastSpell
    const slotLevel = choice.usePact
      ? (model.draft.spells.pact_slots?.level ?? raw.level)
      : choice.slotLevel
    const timing = resolveCastTiming({
      name: raw.name,
      catalogId: raw.catalog_id,
      duration: raw.duration,
      concentration: raw.concentration,
      slotLevel: choice.ritual || choice.useGrant ? raw.level : slotLevel || raw.level,
    })
    const spell = {
      ...raw,
      concentration: timing.concentration,
      duration: timing.duration || raw.duration,
    }
    if (model.needsDeskConcentrationSwap(spell)) {
      model.setDeskCastPending({ spell, choice })
      model.setDeskCastSpell(null)
      return
    }
    model.setDeskCastSpell(null)
    model.runDeskCast(spell, choice)
  }

  model.applyAttunements = function applyAttunements(attunements: AttunementSlot[]) {
    const prevLinked = new Set(
      model.draft.attunements.map((slot) => slot.item_id).filter((id): id is string => Boolean(id)),
    )
    const newlyLinked = attunements
      .map((slot) => slot.item_id)
      .filter((id): id is string => id != null && id !== '' && !prevLinked.has(id))
    let nextItems = model.draft.inventory.items
    const equippedNames: string[] = []
    for (const id of newlyLinked) {
      const item = nextItems.find((row) => row.id === id)
      if (!item || item.equipped) continue
      const shouldEquip =
        (item.wear_slot != null && item.wear_slot !== 'none') ||
        item.armor_kind === 'light' ||
        item.armor_kind === 'medium' ||
        item.armor_kind === 'heavy' ||
        item.armor_kind === 'shield' ||
        item.item_kind === 'magic' ||
        Boolean(item.setting_artifact_id) ||
        Boolean(item.artifact_snapshot)
      if (!shouldEquip) continue
      nextItems = equipInventoryItem(nextItems, id, true)
      if (item.name.trim()) equippedNames.push(item.name.trim())
    }
    model.setDraft((prev) => ({
      ...prev,
      attunements,
      inventory:
        nextItems === model.draft.inventory.items
          ? prev.inventory
          : { ...prev.inventory, items: nextItems },
    }))
    if (equippedNames.length > 0) {
      model.onToast(
        equippedNames.length === 1
          ? `Настроено и надето: «${equippedNames[0]}»`
          : `Настроено и надето: ${equippedNames.map((name) => `«${name}»`).join(', ')}`,
      )
    }
  }

  model.showCompact = function showCompact(id: PlayDeskCompactPanelId): boolean {
    // Spells / attacks: compact is the only play surface (desk + phone); setup in dialogs.
    if (id === 'spells' || id === 'attacks') return true
    // Explore / Social / Features / Companions: glance→expand — no compact/full flip.
    if (
      id === 'inventory' ||
      id === 'texts' ||
      id === 'features' ||
      id === 'companions'
    ) {
      return false
    }
    return model.forceFullPanel !== id
  }

  model.skillModFor = function skillModFor(skillKey: string): number {
    const def = SKILL_DEFS.find((skill) => skill.key === skillKey)
    if (!def) return 0
    const state = model.draft.skills[skillKey]
    const abilities = model.effectiveAbilities ?? model.draft.abilities
    const raging = (model.draft.play.effects ?? []).some(
      (e: { slug?: string | null; inactive?: boolean | null }) =>
        e.slug === 'rage' && !e.inactive,
    )
    const tceAllowed =
      model.campaignRulesRaw == null
        ? false
        : normalizeCampaignRules(model.campaignRulesRaw).start.allowed_sources.includes('tce')
    const useStr = primalKnowledgeAbilityOverride({
      skillKey,
      raging,
      hasPrimalKnowledge: (model.playActiveFeatures ?? model.unlockedFeatures ?? []).some(
        (f: { id?: string }) => f.id === 'primal_knowledge',
      ),
      tceAllowed,
    })
    const abilityKey = useStr ?? def.base
    return (
      skillModifierFromState({
        abilityMod: abilityModifier(abilities[abilityKey]),
        proficiencyBonus: model.proficiencyBonus,
        isProficient: state?.is_proficient ?? false,
        isExpertise: state?.is_expertise ?? false,
      }) +
      (model.gearEffects.skillBonuses[skillKey] ?? 0) +
      (model.featureSkillBonuses?.[skillKey] ?? 0) +
      skillBonusFromActiveEffects(model.draft.play.effects, skillKey)
    )
  }

  model.modeSkillChips = function modeSkillChips(mode: 'combat' | 'explore' | 'social') {
    return MODE_SKILL_KEYS[mode].map((key) => {
      const def = SKILL_DEFS.find((skill) => skill.key === key)
      const state = model.draft.skills[key]
      return {
        key,
        label: def?.label ?? key,
        mod: model.skillModFor(key),
        trained: Boolean(state?.is_proficient || state?.is_expertise),
      }
    })
  }

  model.exhaustionFlags = function exhaustionFlags() {
    return exhaustionRollFlags(model.draft.play.exhaustion ?? 0)
  }

  model.strengthCheckFloor = function strengthCheckFloor(applies: boolean) {
    if (!applies) return null
    const on = (model.unlockedFeatures ?? []).some(
      (feature: { id?: string; name_en?: string }) =>
        feature.id === 'indomitable_might' || feature.name_en === 'Indomitable Might',
    )
    if (!on) return null
    const score = Math.floor(model.effectiveAbilities?.str ?? model.draft.abilities.str)
    return { value: score, label: 'неукротимая мощь' }
  }

  model.effectiveRollMode = function effectiveRollMode(skillKey?: string): DeskRollMode {
    const armor = skillKey === 'stealth' && model.stealthArmorDisadvantage
    const exhaustion = model.exhaustionFlags().disadvantageOnChecks
    const song =
      skillKey === 'acrobatics' &&
      bladesongBonuses({
        resources: model.draft.play.resources,
        intelligenceScore: model.draft.abilities.int ?? 10,
      }).active
    const fromFx = resolveAdvantageFromEffects(model.draft.play.effects, {
      rollKind: 'check',
      abilityKey: skillKey ?? null,
    })
    const withFx = mergeDeskRollMode(model.deskRollMode, fromFx)
    const base = resolveRollMode(withFx, armor || exhaustion)
    if (!song) return base
    if (base === 'disadvantage') return 'normal'
    return 'advantage'
  }

  model.attackRollMode = function attackRollMode(): DeskRollMode {
    const fromFx = resolveAdvantageFromEffects(model.draft.play.effects, {
      rollKind: 'attack',
    })
    return resolveRollMode(
      mergeDeskRollMode(model.deskRollMode, fromFx),
      model.exhaustionFlags().disadvantageOnAttacksAndSaves,
    )
  }

  model.saveRollMode = function saveRollMode(abilityKey?: string): DeskRollMode {
    let fromFx = resolveAdvantageFromEffects(model.draft.play.effects, {
      rollKind: 'save',
      abilityKey: abilityKey ?? null,
    })
    // B-04 Danger Sense: permanent feature → advantage on Dex saves (visible effects).
    if (
      fromFx === 'normal' &&
      String(abilityKey || '').toLowerCase() === 'dex' &&
      (model.unlockedFeatures ?? []).some(
        (f: { id?: string }) => f.id === 'danger_sense',
      )
    ) {
      fromFx = 'advantage'
    }
    // B-07 War Caster: advantage on Constitution saves to maintain concentration.
    if (
      fromFx === 'normal' &&
      String(abilityKey || '').toLowerCase() === 'con' &&
      Boolean(model.draft.play.concentration) &&
      (model.draft.featGrants ?? []).some((row: { applied?: { flags?: string[] } }) =>
        (row.applied?.flags ?? []).some(
          (f) => String(f).toLowerCase().replace(/-/g, '_') === 'war_caster',
        ),
      )
    ) {
      fromFx = 'advantage'
    }
    return resolveRollMode(
      mergeDeskRollMode(model.deskRollMode, fromFx),
      model.exhaustionFlags().disadvantageOnAttacksAndSaves,
    )
  }

  model.rollModeSkill = function rollModeSkill(skill: { key: string; label: string; mod: number }) {
    const mode = model.effectiveRollMode(skill.key)
    const armor = skill.key === 'stealth' && model.stealthArmorDisadvantage
    const exhaustion = model.exhaustionFlags().disadvantageOnChecks
    const note = armor
      ? mode === 'normal' && model.deskRollMode === 'advantage'
        ? ' · доспех отменил преим.'
        : mode === 'disadvantage' && model.deskRollMode !== 'disadvantage'
          ? exhaustion
            ? ' · помеха от доспеха и истощения'
            : ' · помеха от доспеха'
          : ''
      : exhaustion && model.deskRollMode === 'advantage'
        ? ' · истощение отменило преим.'
        : exhaustion && model.deskRollMode !== 'disadvantage'
          ? ' · помеха от истощения'
          : ''
    const base = SKILL_DEFS.find((item) => item.key === skill.key)?.base
    const silver = silverTongueApplies(
      skill.key,
      (model.unlockedFeatures ?? []).some(
        (feature: { id?: string }) => feature.id === 'silver_tongue',
      ),
    )
    const bonusDice = buffDiceFor('check')
    const homebrew = normalizeCampaignRules(model.campaignRulesRaw).homebrew
    const skillProficient = Boolean(
      (model.draft.skills as Record<string, { is_proficient?: boolean }>)[skill.key]
        ?.is_proficient,
    )
    let rollMod = skill.mod
    let profNote = ''
    if (homebrew.dmg_proficiency_dice && skillProficient) {
      const pb = Math.max(0, Math.floor(model.proficiencyBonus ?? 0))
      const teDice = (model.turnEconomyApi as { diceOnTable?: boolean } | undefined)?.diceOnTable
      if (teDice) {
        // В режиме кубиков на столе игрок вводит d20; кость мастерства — отдельно в тосте-подсказке.
        rollMod = skill.mod - pb
        const sides =
          pb === 2 ? 4 : pb === 3 ? 6 : pb === 4 ? 8 : pb === 5 ? 10 : pb >= 6 ? 12 : 0
        profNote = sides
          ? ` · кость мастерства вместо БМ +${pb} (добавьте выпавшее к${sides} вручную)`
          : ''
      } else {
        const rolled = proficiencyRollContribution({
          proficient: true,
          proficiencyBonus: pb,
          diceEnabled: true,
        })
        rollMod = skill.mod - pb + rolled.value
        profNote = ` · ${rolled.label} вместо БМ +${pb}`
      }
    }
    const text = `${formatSkillRoll(
      skill.label,
      rollMod,
      mode,
      undefined,
      model.strengthCheckFloor(base === 'str'),
      silver ? { value: 10, label: 'серебряный язык' } : null,
      bonusDice,
    )}${note}${profNote}`
    model.emitToast(text)
    const te = model.turnEconomyApi as
      | {
          diceOnTable?: boolean
          openEnterOwnNumber?: (o: {
            title: string
            mode?: 'total' | 'd20'
            modifier?: number
            onDone?: (total: number) => void
          }) => void
          postRoll?: (o: { title: string; total: number; physicalDice?: boolean }) => void
        }
      | undefined
    if (te?.diceOnTable && te.openEnterOwnNumber) {
      te.openEnterOwnNumber({
        title: `Проверка: ${skill.label}`,
        mode: 'd20',
        modifier: skill.mod,
      })
    }
    // O-02: Магическое наставление — предложить переброс при провале (игрок решает).
    const tceForGuidance =
      model.campaignRulesRaw == null
        ? false
        : normalizeCampaignRules(model.campaignRulesRaw).start.allowed_sources.includes('tce')
    const hasGuidance = (model.playActiveFeatures ?? model.unlockedFeatures ?? []).some(
      (f: { id?: string }) => f.id === 'magical_guidance',
    )
    if (tceForGuidance && hasGuidance && typeof model.setMagicalGuidanceOffer === 'function') {
      model.setMagicalGuidanceOffer({
        label: skill.label,
        mod: skill.mod,
      })
      model.emitToast(`${MAGICAL_GUIDANCE_SHEET_NAME}: при провале можно перебросить за 1 очко`)
    }
    consumeOnceBuffDice('check')
  }

  function buffDiceFor(
    rollKind: 'attack' | 'save' | 'check' | 'initiative',
  ): BonusDiePart[] {
    return listRollDieChips(model.draft.play.effects ?? [], rollKind).map((chip) => ({
      dice: chip.dice,
      label: chip.name,
    }))
  }

  function consumeOnceBuffDice(rollKind: 'attack' | 'save' | 'check' | 'initiative') {
    const chips = listRollDieChips(model.draft.play.effects ?? [], rollKind).filter(
      (chip) => chip.once,
    )
    if (!chips.length) return
    model.setDraft((prev) => ({
      ...prev,
      play: {
        ...prev.play,
        effects: consumeRollDieChips(prev.play.effects ?? [], chips),
      },
    }))
  }

  model.rollAbilityCheck = function rollAbilityCheck(key: AbilityKey, mod: number) {
    const exhaustion = model.exhaustionFlags().disadvantageOnChecks
    const note =
      exhaustion && model.deskRollMode === 'advantage'
        ? ' · истощение отменило преим.'
        : exhaustion && model.deskRollMode !== 'disadvantage'
          ? ' · помеха от истощения'
          : ''
    const bonusDice = buffDiceFor('check')
    const text = `${formatSkillRoll(
      `Проверка · ${ABILITY_NAMES[key] ?? ABILITY_LABELS[key]}`,
      mod,
      model.effectiveRollMode(),
      undefined,
      model.strengthCheckFloor(key === 'str'),
      null,
      bonusDice,
    )}${note}`
    model.emitToast(text)
    const te = model.turnEconomyApi as
      | {
          diceOnTable?: boolean
          openEnterOwnNumber?: (o: {
            title: string
            mode?: 'total' | 'd20'
            modifier?: number
          }) => void
        }
      | undefined
    if (te?.diceOnTable && te.openEnterOwnNumber) {
      te.openEnterOwnNumber({
        title: `Проверка · ${ABILITY_NAMES[key] ?? ABILITY_LABELS[key]}`,
        mode: 'd20',
        modifier: mod,
      })
    }
    consumeOnceBuffDice('check')
  }

  model.rollAbilitySave = function rollAbilitySave(key: AbilityKey, mod: number) {
    const song =
      key === 'con' && model.draft.play.concentration
        ? bladesongBonuses({
            resources: model.draft.play.resources,
            intelligenceScore: model.draft.abilities.int ?? 10,
          })
        : null
    const effectSave =
      saveBonusFromActiveEffects(model.draft.play.effects, key) +
      saveBonusFromActiveEffects(model.draft.play.effects, 'all')
    const rolledMod = mod + (song?.active ? song.concentrationSave : 0) + effectSave
    const songNote = song?.active ? ` · песнь +${song.concentrationSave}` : ''
    const exhaustion = model.exhaustionFlags().disadvantageOnAttacksAndSaves
    const note =
      exhaustion && model.deskRollMode === 'advantage'
        ? ' · истощение отменило преим.'
        : exhaustion && model.deskRollMode !== 'disadvantage'
          ? ' · помеха от истощения'
          : ''
    const spellAdvantage = formatSaveAdvantageNote(
      model.gearEffects.saveAdvantages,
      model.raceSaveAdvantageNotes ?? [],
    )
    const spellNote = spellAdvantage ? ` · ${spellAdvantage}` : ''
    const bonusDice = buffDiceFor('save')
    const saveTitle = `Спас · ${ABILITY_NAMES[key] ?? ABILITY_LABELS[key]}`
    const homebrewSave = normalizeCampaignRules(model.campaignRulesRaw).homebrew
    const saveProficient = Boolean(
      (model.draft.saves as Record<string, boolean> | undefined)?.[key],
    )
    let saveRollMod = rolledMod
    let saveProfNote = ''
    if (homebrewSave.dmg_proficiency_dice && saveProficient) {
      const pb = Math.max(0, Math.floor(model.proficiencyBonus ?? 0))
      const teDice = (model.turnEconomyApi as { diceOnTable?: boolean } | undefined)?.diceOnTable
      if (teDice) {
        saveRollMod = rolledMod - pb
        const sides =
          pb === 2 ? 4 : pb === 3 ? 6 : pb === 4 ? 8 : pb === 5 ? 10 : pb >= 6 ? 12 : 0
        saveProfNote = sides
          ? ` · кость мастерства вместо БМ +${pb} (добавьте к${sides} вручную)`
          : ''
      } else {
        const rolled = proficiencyRollContribution({
          proficient: true,
          proficiencyBonus: pb,
          diceEnabled: true,
        })
        saveRollMod = rolledMod - pb + rolled.value
        saveProfNote = ` · ${rolled.label} вместо БМ +${pb}`
      }
    }
    const teSave = model.turnEconomyApi as
      | {
          diceOnTable?: boolean
          openTableSave?: (title: string) => void
          openEnterOwnNumber?: (o: {
            title: string
            mode?: 'total' | 'd20'
            modifier?: number
          }) => void
        }
      | undefined
    if (teSave?.diceOnTable && teSave.openTableSave) {
      teSave.openTableSave(saveTitle)
      if (saveProfNote) model.emitToast(`${saveTitle}${saveProfNote}`)
    } else {
      model.emitToast(
        `${formatSkillRoll(
          saveTitle,
          saveRollMod,
          model.saveRollMode(key),
          undefined,
          null,
          null,
          bonusDice,
        )}${note}${songNote}${spellNote}${saveProfNote}`,
      )
    }
    consumeOnceBuffDice('save')
  }

  model.stageHidden = function stageHidden(id: PlayDeskPanelId): boolean {
    // Mobile kit: always one panel (no all-panels stack).
    if (model.deskSplit && model.splitSecondary && (id === model.activePanel || id === model.splitSecondary)) {
      return false
    }
    return model.activePanel !== id
  }

  model.isSorceryPointsResource = function isSorceryPointsResource(row: { id: string; name: string }): boolean {
    return (
      row.id.includes('sorcery_points') ||
      /очки чародейства/i.test(row.name) ||
      /sorcery points/i.test(row.name)
    )
  }

  model.isChannelDivinityResource = function isChannelDivinityResource(row: { id: string; name: string }): boolean {
    return (
      row.id.includes(':channel_divinity:') ||
      row.id.includes('channel_divinity') ||
      /божественный канал/i.test(row.name) ||
      /channel divinity/i.test(row.name)
    )
  }

  model.isKiResource = function isKiResource(row: { id: string; name: string }): boolean {
    // feat:{class}:ki:{entryId} — avoid matching unrelated names that contain «ки».
    return /:ki:/.test(row.id) || /^ки$/i.test(row.name.trim())
  }

  model.isBardicInspirationResource = function isBardicInspirationResource(row: { id: string; name: string }): boolean {
    return (
      /:bardic_inspiration:/.test(row.id) ||
      /бардовское вдохновение/i.test(row.name) ||
      /bardic inspiration/i.test(row.name)
    )
  }

  model.isLayOnHandsResource = function isLayOnHandsResource(row: { id: string; name: string }): boolean {
    return (
      /:lay_on_hands:/.test(row.id) ||
      /возложение рук/i.test(row.name) ||
      /lay on hands/i.test(row.name)
    )
  }

  model.isSuperiorityDiceResource = function isSuperiorityDiceResource(row: { id: string; name: string }): boolean {
    return (
      /:superiority_dice:/.test(row.id) ||
      /:superiority_dice_st:/.test(row.id) ||
      /superiority_die_adept/.test(row.id) ||
      /кость\s*превосходства|кости превосходства/i.test(row.name) ||
      /superiority dice/i.test(row.name)
    )
  }

  /** B-04: shared hooks for feature → ActiveEffect apply. */
  model.featureBuffHooks = function featureBuffHooks() {
    return {
      onApplyLocal: (effect: ActiveEffect) => {
        model.setDraft((prev: Draft) => ({
          ...prev,
          play: {
            ...prev.play,
            effects: [...(prev.play.effects ?? []), effect],
          },
        }))
      },
      onHpMaxGrant: (bonus: number) => {
        model.setDraft((prev: Draft) => ({
          ...prev,
          hpMax: Math.max(1, (prev.hpMax ?? 0) + bonus),
          hpCurrent: (prev.hpCurrent ?? 0) + bonus,
        }))
      },
      onTempHpGrant: (incoming: number) => {
        const current = Math.max(0, model.draft.play.hpTemp || 0)
        if (current <= 0) {
          model.setDraft((prev: Draft) => ({
            ...prev,
            play: { ...prev.play, hpTemp: incoming },
          }))
          return true
        }
        const ask = model.askTempHpReplace as
          | ((input: { current: number; incoming: number }) => Promise<'keep' | 'replace'>)
          | undefined
        if (typeof ask === 'function') {
          return ask({ current, incoming }).then((choiceKeep: 'keep' | 'replace') => {
            const next = chooseTempHpPool(
              current,
              incoming,
              choiceKeep === 'keep' ? 'keep' : 'replace',
            )
            model.setDraft((prev: Draft) => ({
              ...prev,
              play: { ...prev.play, hpTemp: next },
            }))
            return next === incoming
          })
        }
        const next = Math.max(current, incoming)
        model.setDraft((prev: Draft) => ({
          ...prev,
          play: { ...prev.play, hpTemp: next },
        }))
        return next === incoming
      },
    }
  }

  model.applyFeatureBuff = async function applyFeatureBuff(input: {
    slug: string
    name?: string
    targets?: string[]
    classLevel?: number | null
    casterMod?: number | null
    option?: string | null
    slotLevel?: number | null
    auraAllyDefaultOff?: boolean
  }) {
    const { applyFeatureBuffToTargets } = await import('../applyFeatureBuff')
    return applyFeatureBuffToTargets({
      slug: input.slug,
      name: input.name,
      targets: input.targets,
      classLevel: input.classLevel,
      casterMod: input.casterMod,
      option: input.option,
      slotLevel: input.slotLevel,
      auraAllyDefaultOff: input.auraAllyDefaultOff,
      sourceCharacterId: String(model.baseCharacter.id),
      sourceName:
        model.draft.name?.trim() || model.baseCharacter.name || 'Персонаж',
      ...model.featureBuffHooks(),
    })
  }
}
