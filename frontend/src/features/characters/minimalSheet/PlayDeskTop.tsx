/** Шапка стола, полоска жизни на телефоне и док напарников. */
import { useMemo } from 'react'
import type { SheetModel } from './sheetModel'
import { formatRaceMovementHint } from '../../../shared/dnd/raceGrants'
import { syncAttacksHeldFromInventory } from '../AttacksPanel'
import { canWearArmor, armorProficiencyHint } from '../equipmentProficiency'
import { listShieldItems, toggleShieldInHand } from '../heldEquip'
import { CharacterAvatarControl } from '../CharacterAvatarControl'
import { PlayDeskHeader } from '../PlayDeskHeader'
import { MobileVitalsBar } from '../MobileVitalsBar'
import { formatSkillRoll } from '../deskRolls'
import { appendXpHistory } from '../playDeskUi'
import { equippedArmorPieces } from '../inventory'
import { abilityModifier } from '../sheetTypes'
import { sheetDamageProfile } from '../gearEffects'
import {
  featResistanceTypes,
  hasFeatFlag,
} from '../../../shared/dnd/b07FeatCombat'
import {
  listKnownManeuvers,
  martialAdeptManeuverIds,
  superiorityDieLabel,
} from '../../../shared/dnd/superiorityDiceSpend'
import {
  hasReactionSpellSlot,
  listReactionSpells,
  parseSuperiorityDieSides,
} from '../../../shared/dnd/o07Reactions'
import { spellReadyToCast } from '../itemSpellCast'
import {
  listRollDieChips,
  mergeDeskRollMode,
  resolveAdvantageFromEffects,
} from '../../../shared/dnd/activeEffects'
import {
  alignmentNeedsClarification,
  alignmentSheetLabel,
} from '../../../shared/dnd/alignments'
import { ActiveEffectsPanel } from '../ActiveEffectsPanel'
import { IconCompanions } from '../deskIcons'
import {
  buildNeedsSetupItems,
  listRaceSpellSetupItems,
  raceGrantDefFromCatalogRow,
  type NeedsSetupItem,
} from '../needsSetup'
import { normalizeCampaignRules } from '../../lobby/campaignRules'
import {
  hasDraconicResilienceFeature,
  initiativeAdvantageFromFeatures,
} from '../featureCombatBonuses'
import { isBladesongActive2024 } from '../../../shared/dnd/wizardBook2024Features'
import {
  DWARVEN_TOUGHNESS_NAME_RU,
  dwarvenToughnessHpTotal2024,
  resolveSpeciesSlug2024,
} from '../../../shared/dnd/speciesHpBonus2024'

function initiativeAdvantageFromSheet(model: SheetModel): 'advantage' | 'disadvantage' | 'normal' {
  const fromFx = resolveAdvantageFromEffects(model.draft.play.effects, {
    rollKind: 'initiative',
  })
  const edition = model.baseCharacter.rules_edition ?? model.rulesEdition
  const fromFeatures = initiativeAdvantageFromFeatures(
    model.unlockedFeatures ?? model.playActiveFeatures ?? [],
    edition,
  )
  if (model.infusionBonuses?.initiativeAdvantage || fromFeatures) {
    if (fromFx === 'disadvantage') return 'normal'
    return 'advantage'
  }
  return fromFx
}

function formatInitiativeToast(model: SheetModel): string {
  const mode = mergeDeskRollMode(
    model.effectiveRollMode(),
    initiativeAdvantageFromSheet(model),
  )
  const bonus = listRollDieChips(model.draft.play.effects ?? [], 'initiative').map((chip) => ({
    dice: chip.dice,
    label: chip.name,
  }))
  return formatSkillRoll(
    'Инициатива',
    model.initiativeValue,
    mode,
    undefined,
    undefined,
    null,
    bonus,
  )
}

export function PlayDeskTop({ model }: { model: SheetModel }) {
  const alignmentLabel = alignmentSheetLabel(model.draft.identity)
  const wornArmorKind = equippedArmorPieces(model.draft.inventory.items).armor?.kind
  const damageProfile = sheetDamageProfile({
    raceSlug: model.draft.raceGrant?.slug,
    raceResistances: model.draft.raceGrant?.damageResistances,
    gear: model.gearEffects,
    effects: model.draft.play.effects,
    infusionResistances: model.infusionBonuses?.resistances,
    featResistances: featResistanceTypes(model.draft.featGrants),
  })
  const heavyArmorMaster =
    wornArmorKind === 'heavy' &&
    hasFeatFlag(model.draft.featGrants, 'heavy_armor_master')
  const hasShieldMasterEvasion =
    hasFeatFlag(model.draft.featGrants, 'shield_master') &&
    Boolean(equippedArmorPieces(model.draft.inventory.items).shield)
  const raceSlug = model.draft.raceGrant?.slug ?? ''
  const edition = model.baseCharacter.rules_edition ?? model.rulesEdition
  const maxHpExtraBonuses = useMemo(() => {
    if (edition !== '2024') return []
    const speciesSlug = resolveSpeciesSlug2024({
      speciesSlug: model.draft.identity.speciesSlug,
      raceGrantSlug: model.draft.raceGrant?.slug,
      raceName: model.draft.raceName,
    })
    const amount = dwarvenToughnessHpTotal2024({
      characterLevel: model.characterLevel ?? 1,
      speciesSlug,
    })
    if (amount <= 0) return []
    return [{ label: DWARVEN_TOUGHNESS_NAME_RU, amount }]
  }, [
    edition,
    model.characterLevel,
    model.draft.identity.speciesSlug,
    model.draft.raceGrant?.slug,
    model.draft.raceName,
  ])
  // Stable preview amounts for the pad chips (exact roll is table-facing; here mean+mod).
  const stonesCut =
    raceSlug === 'goliath'
      ? 7 + abilityModifier(model.draft.abilities.con ?? 10)
      : null
  const hadozeeCut =
    raceSlug === 'hadozee' ? 4 + Math.max(1, model.characterLevel ?? 1) : null

  const adeptIds = martialAdeptManeuverIds(model.draft.featGrants)
  const knowsParry = (() => {
    const ids = new Set(adeptIds)
    for (const row of model.draft.classes ?? []) {
      for (const m of listKnownManeuvers(
        model.draft.featurePicks,
        row.id,
        adeptIds,
      )) {
        ids.add(m.id)
      }
    }
    return ids.has('parry')
  })()
  const superiorityPool = (model.draft.play.resources ?? []).find(
    (row: { id: string; used: number; max: number }) =>
      (/:superiority_dice:/.test(row.id) ||
        /:superiority_dice_st:/.test(row.id) ||
        /superiority_die_adept/.test(row.id)) &&
      row.used < row.max,
  )
  const teApi = model.turnEconomyApi as
    | {
        canFeature?: (t: 'reaction') => { ok: boolean }
        spendFeature?: (t: 'reaction') => void
      }
    | undefined
  const reactionFree = teApi?.canFeature?.('reaction')?.ok !== false
  const dieSides = (() => {
    if (!superiorityPool) return 8
    const classEntryId = String(superiorityPool.id).split(':')[0] || ''
    const label = superiorityDieLabel(
      model.unlockedFeatures ?? [],
      classEntryId,
    )
    return parseSuperiorityDieSides(label)
  })()
  // Preview cut = mid die + Dex (table rolls the face; chip shows expected).
  const parryReduction =
    knowsParry && superiorityPool && reactionFree
      ? Math.ceil((dieSides + 1) / 2) +
        abilityModifier(model.draft.abilities.dex ?? 10)
      : null
  const reactionSpells = listReactionSpells(model.draft.spells)
  const hasShieldSpell = reactionSpells.some(
    (s) =>
      s.kind === 'shield' &&
      hasReactionSpellSlot(model.draft.spells.slots, s.level),
  )
  const hasAbsorbSpell = reactionSpells.some(
    (s) =>
      s.kind === 'absorb_elements' &&
      hasReactionSpellSlot(model.draft.spells.slots, s.level),
  )
  const hasHellishSpell = reactionSpells.some(
    (s) =>
      s.kind === 'hellish_rebuke' &&
      hasReactionSpellSlot(model.draft.spells.slots, s.level),
  )
  const openReactionSpell = (kind: string) => {
    const spell = reactionSpells.find((s) => s.kind === kind)
    if (!spell) {
      model.onToast('Заклинание не найдено на листе')
      return
    }
    void spellReadyToCast(spell as never, model.rulesEdition).then((ready) =>
      model.setDeskCastSpell(ready),
    )
  }
  const onParryUsed = () => {
    teApi?.spendFeature?.('reaction')
    if (!superiorityPool) return
    const poolId = superiorityPool.id
    model.setDraft((prev) => ({
      ...prev,
      play: {
        ...prev.play,
        resources: prev.play.resources.map((row) =>
          row.id === poolId
            ? { ...row, used: Math.min(row.max, row.used + 1) }
            : row,
        ),
      },
    }))
    model.onToast('Парирование: реакция и кость превосходства потрачены')
  }
  const o07HpPad = {
    hasParry: Boolean(knowsParry && superiorityPool && reactionFree),
    parryReduction,
    onParryUsed,
    offerShieldReaction: Boolean(hasShieldSpell && reactionFree),
    onCastShield: () => openReactionSpell('shield'),
    offerAbsorbElements: Boolean(hasAbsorbSpell && reactionFree),
    onCastAbsorbElements: () => openReactionSpell('absorb_elements'),
    offerHellishRebuke: Boolean(hasHellishSpell && reactionFree),
    onCastHellishRebuke: () => openReactionSpell('hellish_rebuke'),
  }
  const activeMount = (model.draft.companions ?? []).find(
    (c) => c.mounted && c.active !== false,
  )
  const o10HpPad = {
    canRedirectToMount: Boolean(
      hasFeatFlag(model.draft.featGrants, 'mounted_combatant') && activeMount,
    ),
    mountName: activeMount?.name ?? null,
    onRedirectDamageToMount: (amount: number, note: string) => {
      if (!activeMount) return
      const mountId = activeMount.id
      const cur = Number(activeMount.stats?.hp ?? 0)
      const nextHp = Math.max(0, cur - Math.max(0, amount))
      model.setDraft((prev) => ({
        ...prev,
        companions: prev.companions.map((c) =>
          c.id === mountId
            ? {
                ...c,
                stats: { ...c.stats, hp: nextHp },
                ...(nextHp <= 0 ? { mounted: false } : {}),
              }
            : c,
        ),
      }))
      model.onToast(note || `Урон скакуну −${amount}`)
    },
  }

  const alignmentHint = alignmentNeedsClarification(model.draft.identity)
    ? 'Уточните мировоззрение'
    : ''
  const raceMpmmNotice = (model.draft.uiNotices ?? []).find(
    (row: { id: string; dismissed?: boolean; text_ru: string }) =>
      row.id === 'race_updated_mpmm' && !row.dismissed,
  )

  const raceSpellSetupItems = useMemo(() => {
    // Prod may have race_catalog_id without raceGrant (astral elf gap) — still prompt.
    const catalogId = model.draft.raceCatalogId
    if (!catalogId) return []
    const grant = model.draft.raceGrant
    const row =
      model.raceCatalogRows.find((entry) => entry.id === catalogId) ??
      (grant
        ? model.raceCatalogRows.find((entry) => entry.slug === grant.slug)
        : null) ??
      null
    if (!row) return []
    const def = raceGrantDefFromCatalogRow({
      slug: row.slug,
      nameRu: row.name_ru,
      data: row.data,
    })
    return listRaceSpellSetupItems({
      raceGrantDef: def,
      picks: model.draft.raceGrantPicks,
      raceCatalogId: catalogId,
    })
  }, [
    model.draft.raceGrant,
    model.draft.raceCatalogId,
    model.draft.raceGrantPicks,
    model.raceCatalogRows,
  ])

  const needsSetupItems = useMemo(
    () =>
      buildNeedsSetupItems({
        unlocked: model.unlockedFeatures ?? [],
        featurePicks: model.draft.featurePicks,
        classAsi: model.draft.classAsi ?? [],
        learnBudgets: model.spellLearnBudgets ?? [],
        known: model.draft.spells.known,
        alignment: model.draft.identity.alignment ?? '',
        alignmentText: model.draft.identity.alignmentText ?? '',
        companions: model.draft.companions,
        raceSpellItems: raceSpellSetupItems,
      }),
    [
      model.unlockedFeatures,
      model.draft.featurePicks,
      model.draft.classAsi,
      model.spellLearnBudgets,
      model.draft.spells.known,
      model.draft.identity.alignment,
      model.draft.identity.alignmentText,
      model.draft.companions,
      raceSpellSetupItems,
    ],
  )

  function handleNeedsSetupSelect(item: NeedsSetupItem) {
    if (item.kind === 'feature_choice' || item.kind === 'asi') {
      model.setFeaturesFilterRequest('needs_setup')
      model.setDeskMode('features')
      model.setActivePanel('features')
      return
    }
    if (item.kind === 'spells') {
      model.setDeskMode('combat')
      model.setActivePanel('spells')
      model.setSpellsSettingsOpen(true)
      return
    }
    if (item.kind === 'alignment') {
      model.setIdentityOpen(true)
      return
    }
    if (item.kind === 'race_spell') {
      void model.openRaceSetupFromNeedsSetup()
      return
    }
    if (item.kind === 'companion' && item.targetId) {
      model.setFocusCompanionId(item.targetId)
      model.setDeskMode('companions')
      model.setActivePanel('companions')
    }
  }

  return (
    <>
      {raceMpmmNotice ? (
        <div className="sheet-banner" role="status">
          <span>{raceMpmmNotice.text_ru}</span>
          <div className="sheet-banner__actions">
            <button
              type="button"
              className="sheet-chip"
              onClick={() => {
                const journal = (model.draft.migrations ?? []).find(
                  (row: Record<string, unknown>) =>
                    row.id === raceMpmmNotice.migration_id ||
                    row.id === 'b08_mpmm_race_remap_v1',
                )
                if (journal?.text_ru) {
                  model.onToast(String(journal.text_ru))
                } else {
                  model.onToast(raceMpmmNotice.text_ru)
                }
              }}
            >
              Смотреть
            </button>
            <button
              type="button"
              className="sheet-chip"
              onClick={() => {
                model.setDraft((prev) => ({
                  ...prev,
                  uiNotices: (prev.uiNotices ?? []).map((row) =>
                    row.id === 'race_updated_mpmm'
                      ? { ...row, dismissed: true }
                      : row,
                  ),
                }))
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : null}
      {/* Header chip UIKIT-02 off; banner so old astral (catalog id, no picks) still see «нужен выбор». */}
      {raceSpellSetupItems.length > 0 ? (
        <div
          className="sheet-banner"
          role="status"
          data-testid="race-spell-needs-setup"
        >
          <span>
            {raceSpellSetupItems.map((item) => item.label).join(' · ')}
          </span>
          <div className="sheet-banner__actions">
            <button
              type="button"
              className="sheet-chip"
              onClick={() => {
                void model.openRaceSetupFromNeedsSetup()
              }}
            >
              Выбрать
            </button>
          </div>
        </div>
      ) : null}
      {model.isPlayDesk ? (
        <div className="play-desk__top" data-onboarding="combat-header">
          <CharacterAvatarControl
            character={model.baseCharacter}
            size="sm"
            showActions={false}
            onOpen={() => model.setIdentityOpen(true)}
            onChanged={(updated) => {
              model.setBaseCharacter(updated)
              model.onSaved(updated)
            }}
          />
          <PlayDeskHeader
            name={model.draft.name}
            raceName={model.draft.raceName}
            className={model.classSummary || model.primaryClass?.name || ''}
            alignment={alignmentLabel}
            alignmentHint={alignmentHint}
            rulesEdition={model.baseCharacter.rules_edition}
            level={model.characterLevel}
            experience={model.draft.identity.experience}
            progressionMode={
              normalizeCampaignRules(model.campaignRulesRaw).progression.mode ===
              'milestones'
                ? 'milestones'
                : 'xp'
            }
            classes={model.draft.classes}
            hitDie={model.draft.play.hitDie}
            constitutionMod={abilityModifier(model.draft.abilities.con)}
            hpCurrent={model.draft.hpCurrent}
            hpMax={model.draft.hpMax}
            damageProfile={damageProfile}
            hasEvasion={(model.unlockedFeatures ?? []).some(
              (f: { id?: string }) => f.id === 'evasion',
            )}
            hasUncannyDodge={(model.unlockedFeatures ?? []).some(
              (f: { id?: string }) => f.id === 'uncanny_dodge',
            )}
            heavyArmorMaster={heavyArmorMaster}
            stonesEnduranceReduction={stonesCut}
            hadozeeDodgeReduction={hadozeeCut}
            raceSlug={model.draft.raceGrant?.slug ?? null}
            hasShieldMasterEvasion={hasShieldMasterEvasion}
            {...o07HpPad}
            {...o10HpPad}
            draconicResilience={hasDraconicResilienceFeature(
              model.unlockedFeatures ?? [],
              model.baseCharacter.rules_edition ?? model.rulesEdition,
            )}
            dwarvenToughness={
              model.draft.raceGrant?.slug === 'hill_dwarf' ||
              model.draft.raceGrant?.slug === 'gold_dwarf'
            }
            maxHpExtraBonuses={maxHpExtraBonuses}
            play={model.draft.play}
            autoAc={model.armorClass.ac}
            acHint={model.armorClass.summary}
            formVitalLabel={model.wildShapeFormLabel2024 ?? null}
            onOpenAc={() => model.setAcBreakdownOpen(true)}
            shieldInHand={Boolean(equippedArmorPieces(model.draft.inventory.items).shield)}
            shieldAvailable={listShieldItems(model.draft.inventory.items).length > 0}
            onToggleShield={() => {
              const shields = listShieldItems(model.draft.inventory.items)
              const anyOn = shields.some((row) => row.equipped)
              if (!anyOn && !canWearArmor('shield', model.draft.identity.armor)) {
                model.onToast(armorProficiencyHint('shield'))
                return
              }
              const result = toggleShieldInHand(model.draft.inventory.items)
              if (!result.ok) {
                model.onToast(result.reason)
                return
              }
              model.setDraft((prev) => ({
                ...prev,
                inventory: { ...prev.inventory, items: result.items },
                weapons: syncAttacksHeldFromInventory(prev.weapons, result.items),
              }))
              model.onToast(
                result.equipped
                  ? `Щит «${result.name}» в руке`
                  : `Щит «${result.name}» убран`,
              )
            }}
            speed={model.displaySpeed}
            climbSpeed={model.displayClimbSpeed ?? model.draft.climbSpeed}
            swimSpeed={model.displaySwimSpeed ?? model.draft.swimSpeed}
            flySpeed={model.displayFlySpeed ?? model.draft.flySpeed}
            jumpLongFt={model.jump.longFt}
            jumpHighFt={model.jump.highFt}
            movementHint={
              [model.classSpeedHint, model.displayFlySpeedNote]
                .filter(Boolean)
                .join(' · ') || null
            }
            proficiencyBonus={model.proficiencyBonus}
            initiative={model.initiativeValue}
            inspiration={model.draft.inspiration}
            coins={model.draft.inventory.coins}
            xpHistory={model.draft.sheetUi.xpHistory}
            onOpenRest={() => model.setRestOpen(true)}
            onOpenIdentity={() => model.setIdentityOpen(true)}
            onExperienceChange={(experience, meta) => {
              model.setDraft((prev) => {
                const prevXp = prev.identity.experience
                const delta = experience - prevXp
                return {
                  ...prev,
                  identity: { ...prev.identity, experience },
                  sheetUi: {
                    ...prev.sheetUi,
                    xpHistory: delta
                      ? appendXpHistory(prev.sheetUi.xpHistory, {
                          delta,
                          reason: meta?.reason ?? '',
                        })
                      : prev.sheetUi.xpHistory,
                  },
                }
              })
            }}
            onRequestLevelUp={() => model.setLevelUpOpen(true)}
            onToggleInspiration={() =>
              model.setDraft((prev) => ({ ...prev, inspiration: !prev.inspiration }))
            }
            onExhaustionChange={(exhaustion) =>
              model.setDraft((prev) => ({
                ...prev,
                play: { ...prev.play, exhaustion },
              }))
            }
            onOpenInitiative={() => model.setInitiativeBreakdownOpen(true)}
            onOpenSpeed={() => model.setSpeedBreakdownOpen(true)}
            onAltSpeedChange={(patch) =>
              model.setDraft((prev) => ({
                ...prev,
                ...patch,
              }))
            }
            onInitiativeRoll={() => {
              model.emitToast(formatInitiativeToast(model))
              model.applyBardInitiativeInspiration()
            }}
            onPlayChange={(play) => model.setDraft((prev) => ({ ...prev, play }))}
            onCoinsChange={(coins) =>
              model.setDraft((prev) => ({
                ...prev,
                inventory: { ...prev.inventory, coins },
              }))
            }
            coinPadOpen={model.coinPadOpen}
            onCoinPadOpenChange={model.setCoinPadOpen}
            showValueTips={model.showValueTips}
            needsSetupItems={needsSetupItems}
            onNeedsSetupSelect={handleNeedsSetupSelect}
            onCombatChange={(patch) =>
              model.setDraft((prev) => {
                const nextHp =
                  patch.hpCurrent !== undefined ? patch.hpCurrent : prev.hpCurrent
                const droppedToZero =
                  patch.hpCurrent !== undefined &&
                  (patch.hpCurrent ?? 0) <= 0 &&
                  (prev.hpCurrent ?? 0) > 0
                if (droppedToZero && prev.play.concentration) {
                  queueMicrotask(() =>
                    model.clearConcentrationDismissingCompanions(null),
                  )
                }
                if (droppedToZero) {
                  const slug = prev.raceGrant?.slug ?? ''
                  const spent = (prev.play.effects ?? []).some(
                    (fx) =>
                      fx.slug === 'relentless_endurance_spent' ||
                      (fx.mods ?? []).some(
                        (m) => m.condition === 'relentless_endurance_spent',
                      ),
                  )
                  if (
                    !spent &&
                    (slug === 'half_orc' ||
                      slug === 'orc' ||
                      slug.startsWith('half_orc'))
                  ) {
                    queueMicrotask(() => model.setRelentlessEndurancePending?.(true))
                  }
                  if (String(edition) === '2024') {
                    const shadow = (prev.classes ?? []).some((row) => {
                      const fromMap = model.subclassSlugByEntryId?.[row.id]
                      const slug = String(
                        fromMap || row.subclass_catalog_id || '',
                      ).toLowerCase()
                      return slug === 'sorcerer__shadow-sorcery'
                    })
                    const grave = (prev.play.resources ?? []).find(
                      (row) =>
                        (typeof row.id === 'string' &&
                          row.id.includes(':power_of_shadow:')) ||
                        /сила\s*могил/i.test(String(row.name || '')),
                    )
                    const graveLeft =
                      grave != null
                        ? Math.max(0, (grave.max ?? 0) - (grave.used ?? 0))
                        : 0
                    if (shadow && graveLeft > 0) {
                      const dmg = Math.max(
                        1,
                        (prev.hpCurrent ?? 0) - (patch.hpCurrent ?? 0),
                      )
                      queueMicrotask(() =>
                        model.setStrengthOfTheGravePending?.({ damage: dmg }),
                      )
                    }
                  }
                }
                return {
                  ...prev,
                  ...(patch.hpCurrent !== undefined ? { hpCurrent: patch.hpCurrent } : {}),
                  ...(patch.hpMax !== undefined ? { hpMax: patch.hpMax } : {}),
                  ...(droppedToZero
                    ? {
                        play: {
                          ...prev.play,
                          isDying: (nextHp ?? 0) <= 0 ? true : prev.play.isDying,
                        },
                      }
                    : {}),
                }
              })
            }
            onToast={model.onToast}
            onDamaged={(damageToHp) => {
              if (!model.draft.play.concentration || damageToHp <= 0) return
              model.setConcDamageAsk({
                damage: damageToHp,
                spellName: model.draft.play.concentration.name,
                dc: Math.max(10, Math.floor(damageToHp / 2)),
              })
            }}
          />
          {(model.draft.play.effects ?? []).length > 0 ||
          model.dockCompanions.length > 0 ? (
            <div className="play-desk__top-extras">
              <ActiveEffectsPanel
                effects={model.draft.play.effects ?? []}
                onChange={(effects) => model.applyEffectsChange?.(effects)}
                onToast={model.onToast}
                onHeroismTurnStart={() => model.applyHeroismTurnStart?.()}
              />
              {model.dockCompanions.length > 0 ? (
                <button
                  type="button"
                  className="play-desk__dock-chip"
                  aria-label={`Напарники ${model.dockCompanions.length}`}
                  title={model.dockCompanions
                    .map((row) => row.name || 'Без имени')
                    .join(', ')}
                  onClick={() => {
                    model.setDeskMode('companions')
                    model.setActivePanel('companions')
                  }}
                >
                  Напарники {model.dockCompanions.length}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="play-desk__mobile-chrome" data-onboarding="combat-header">
        <MobileVitalsBar
          character={model.baseCharacter}
          name={model.draft.name}
          raceName={model.draft.raceName}
          classSummary={model.classSummary || model.primaryClass?.name || ''}
          alignment={alignmentHint ? `${alignmentLabel} · уточните мировоззрение` : alignmentLabel}
          level={model.characterLevel}
          hpCurrent={model.draft.hpCurrent}
          hpMax={model.draft.hpMax}
          damageProfile={damageProfile}
          hasEvasion={(model.unlockedFeatures ?? []).some(
            (f: { id?: string }) => f.id === 'evasion',
          )}
          hasUncannyDodge={(model.unlockedFeatures ?? []).some(
            (f: { id?: string }) => f.id === 'uncanny_dodge',
          )}
          heavyArmorMaster={heavyArmorMaster}
          hasShieldMasterEvasion={hasShieldMasterEvasion}
          stonesEnduranceReduction={stonesCut}
          hadozeeDodgeReduction={hadozeeCut}
          raceSlug={model.draft.raceGrant?.slug ?? null}
          {...o07HpPad}
          {...o10HpPad}
          draconicResilience={hasDraconicResilienceFeature(
            model.unlockedFeatures ?? [],
            model.baseCharacter.rules_edition ?? model.rulesEdition,
          )}
          dwarvenToughness={
            model.draft.raceGrant?.slug === 'hill_dwarf' ||
            model.draft.raceGrant?.slug === 'gold_dwarf'
          }
          maxHpExtraBonuses={maxHpExtraBonuses}
          play={model.draft.play}
          autoAc={model.armorClass.ac}
          acOverride={
            model.wildShapeFormLabel2024 ||
            isBladesongActive2024(model.draft.play.resources)
              ? null
              : model.draft.ac
          }
          acHint={model.armorClass.summary}
          formVitalLabel={model.wildShapeFormLabel2024 ?? null}
          onOpenAc={() => model.setAcBreakdownOpen(true)}
          shieldInHand={Boolean(equippedArmorPieces(model.draft.inventory.items).shield)}
          shieldAvailable={listShieldItems(model.draft.inventory.items).length > 0}
          onToggleShield={() => {
            const shields = listShieldItems(model.draft.inventory.items)
            const anyOn = shields.some((row) => row.equipped)
            if (!anyOn && !canWearArmor('shield', model.draft.identity.armor)) {
              model.onToast(armorProficiencyHint('shield'))
              return
            }
            const result = toggleShieldInHand(model.draft.inventory.items)
            if (!result.ok) {
              model.onToast(result.reason)
              return
            }
            model.setDraft((prev) => ({
              ...prev,
              inventory: { ...prev.inventory, items: result.items },
              weapons: syncAttacksHeldFromInventory(prev.weapons, result.items),
            }))
            model.onToast(
              result.equipped
                ? `Щит «${result.name}» в руке`
                : `Щит «${result.name}» убран`,
            )
          }}
          speed={model.displaySpeed}
          movementHint={[
            formatRaceMovementHint({
              climb: model.displayClimbSpeed ?? model.draft.climbSpeed,
              swim: model.displaySwimSpeed ?? model.draft.swimSpeed,
              fly: model.displayFlySpeed ?? model.draft.flySpeed,
            }),
            model.classSpeedHint,
            model.displayFlySpeedNote,
          ]
            .filter(Boolean)
            .join(' · ') || null}
          climbSpeed={model.displayClimbSpeed ?? model.draft.climbSpeed}
          swimSpeed={model.displaySwimSpeed ?? model.draft.swimSpeed}
          flySpeed={model.displayFlySpeed ?? model.draft.flySpeed}
          onAltSpeedChange={(patch) =>
            model.setDraft((prev) => ({
              ...prev,
              ...patch,
            }))
          }
          jumpLongFt={model.jump.longFt}
          jumpHighFt={model.jump.highFt}
          initiative={model.initiativeValue}
          onOpenInitiative={() => model.setInitiativeBreakdownOpen(true)}
          onOpenSpeed={() => model.setSpeedBreakdownOpen(true)}
          proficiencyBonus={model.proficiencyBonus}
          inspiration={model.draft.inspiration}
          rulesEdition={model.baseCharacter.rules_edition}
          coins={model.draft.inventory.coins}
          constitutionMod={abilityModifier(model.draft.abilities.con)}
          classes={model.draft.classes}
          hitDie={model.draft.play.hitDie}
          onOpenIdentity={() => model.setIdentityOpen(true)}
          onOpenAbilities={() => model.setMobileAbilitiesOpen(true)}
          onOpenRest={() => model.setRestOpen(true)}
          onOpenConditions={() => model.setHotConditionsOpen(true)}
          onToggleInspiration={() =>
            model.setDraft((prev) => ({ ...prev, inspiration: !prev.inspiration }))
          }
          onAvatarChanged={(updated) => {
            model.setBaseCharacter(updated)
            model.onSaved(updated)
          }}
          onPlayChange={(play) => model.setDraft((prev) => ({ ...prev, play }))}
          onCoinsChange={(coins) =>
            model.setDraft((prev) => ({
              ...prev,
              inventory: { ...prev.inventory, coins },
            }))
          }
          onCombatChange={(patch) =>
            model.setDraft((prev) => {
              const droppedToZero =
                patch.hpCurrent !== undefined &&
                (patch.hpCurrent ?? 0) <= 0 &&
                (prev.hpCurrent ?? 0) > 0
              if (droppedToZero && prev.play.concentration) {
                queueMicrotask(() => model.clearConcentrationDismissingCompanions(null))
              }
              if (droppedToZero) {
                const slug = prev.raceGrant?.slug ?? ''
                const spent = (prev.play.effects ?? []).some(
                  (fx) =>
                    fx.slug === 'relentless_endurance_spent' ||
                    (fx.mods ?? []).some(
                      (m) => m.condition === 'relentless_endurance_spent',
                    ),
                )
                if (
                  !spent &&
                  (slug === 'half_orc' ||
                    slug === 'orc' ||
                    slug.startsWith('half_orc'))
                ) {
                  queueMicrotask(() => model.setRelentlessEndurancePending?.(true))
                }
                if (String(edition) === '2024') {
                  const shadow = (prev.classes ?? []).some((row) => {
                    const fromMap = model.subclassSlugByEntryId?.[row.id]
                    const slug = String(
                      fromMap || row.subclass_catalog_id || '',
                    ).toLowerCase()
                    return slug === 'sorcerer__shadow-sorcery'
                  })
                  const grave = (prev.play.resources ?? []).find(
                    (row) =>
                      (typeof row.id === 'string' &&
                        row.id.includes(':power_of_shadow:')) ||
                      /сила\s*могил/i.test(String(row.name || '')),
                  )
                  const graveLeft =
                    grave != null
                      ? Math.max(0, (grave.max ?? 0) - (grave.used ?? 0))
                      : 0
                  if (shadow && graveLeft > 0) {
                    const dmg = Math.max(
                      1,
                      (prev.hpCurrent ?? 0) - (patch.hpCurrent ?? 0),
                    )
                    queueMicrotask(() =>
                      model.setStrengthOfTheGravePending?.({ damage: dmg }),
                    )
                  }
                }
              }
              return {
                ...prev,
                ...(patch.hpCurrent !== undefined ? { hpCurrent: patch.hpCurrent } : {}),
                ...(patch.hpMax !== undefined ? { hpMax: patch.hpMax } : {}),
              }
            })
          }
          onDamaged={(damageToHp) => {
            if (!model.draft.play.concentration || damageToHp <= 0) return
            model.setConcDamageAsk({
              damage: damageToHp,
              spellName: model.draft.play.concentration.name,
              dc: Math.max(10, Math.floor(damageToHp / 2)),
            })
          }}
          onToast={model.onToast}
          showValueTips={model.showValueTips}
          needsSetupItems={needsSetupItems}
          onNeedsSetupSelect={handleNeedsSetupSelect}
        />
        {(model.draft.play.effects ?? []).length > 0 ||
        model.dockCompanions.length > 0 ? (
          <div className="play-desk__mobile-effects">
            <ActiveEffectsPanel
              effects={model.draft.play.effects ?? []}
              onChange={(effects) => model.applyEffectsChange?.(effects)}
              onToast={model.onToast}
              onHeroismTurnStart={() => model.applyHeroismTurnStart?.()}
              chipLayout="scroll"
            />
            {model.dockCompanions.length > 0 ? (
              <button
                type="button"
                className="play-desk__dock-chip"
                aria-label={`Напарники ${model.dockCompanions.length}`}
                title={`Напарники: ${model.dockCompanions
                  .map((row) => row.name || 'Без имени')
                  .join(', ')}`}
                onClick={() => {
                  model.setDeskMode('companions')
                  model.setActivePanel('companions')
                }}
              >
                <IconCompanions className="play-desk__dock-chip-icon" />
                <span>{model.dockCompanions.length}</span>
              </button>
            ) : null}
          </div>
        ) : null}
        </div>
      )}
    </>
  )
}
