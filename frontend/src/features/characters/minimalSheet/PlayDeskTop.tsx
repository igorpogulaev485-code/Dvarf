/** Шапка стола, полоска жизни на телефоне и док напарников. */
import type { SheetModel } from './sheetModel'
import { isSelfForm } from '../companions'
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
  listRollDieChips,
  mergeDeskRollMode,
  resolveAdvantageFromEffects,
} from '../../../shared/dnd/activeEffects'
import {
  alignmentNeedsClarification,
  alignmentSheetLabel,
} from '../../../shared/dnd/alignments'
import { COMPANION_KIND_SHORT } from './draft'
import { ActiveEffectsPanel } from '../ActiveEffectsPanel'

function formatInitiativeToast(model: SheetModel): string {
  const mode = mergeDeskRollMode(
    model.effectiveRollMode(),
    resolveAdvantageFromEffects(model.draft.play.effects, { rollKind: 'initiative' }),
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
  const damageProfile = sheetDamageProfile({
    raceSlug: model.draft.raceGrant?.slug,
    raceResistances: model.draft.raceGrant?.damageResistances,
    gear: model.gearEffects,
    effects: model.draft.play.effects,
  })
  const alignmentHint = alignmentNeedsClarification(model.draft.identity)
    ? 'Уточните мировоззрение'
    : ''
  return (
    <>
      {model.isPlayDesk ? (
        <div className="play-desk__top" data-onboarding="combat-header">
          <CharacterAvatarControl
            character={model.baseCharacter}
            size="md"
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
            classes={model.draft.classes}
            hitDie={model.draft.play.hitDie}
            constitutionMod={abilityModifier(model.draft.abilities.con)}
            hpCurrent={model.draft.hpCurrent}
            hpMax={model.draft.hpMax}
            damageProfile={damageProfile}
            play={model.draft.play}
            autoAc={model.armorClass.ac}
            acHint={model.armorClass.summary}
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
            climbSpeed={model.draft.climbSpeed}
            swimSpeed={model.draft.swimSpeed}
            flySpeed={model.draft.flySpeed}
            jumpLongFt={model.jump.longFt}
            jumpHighFt={model.jump.highFt}
            movementHint={model.classSpeedHint}
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
            onInitiativeRoll={() => model.emitToast(formatInitiativeToast(model))}
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
          <ActiveEffectsPanel
            effects={model.draft.play.effects ?? []}
            onChange={(effects) => model.applyEffectsChange?.(effects)}
            onToast={model.onToast}
            onHeroismTurnStart={() => model.applyHeroismTurnStart?.()}
          />
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
          play={model.draft.play}
          autoAc={model.armorClass.ac}
          acOverride={model.draft.ac}
          acHint={model.armorClass.summary}
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
              climb: model.draft.climbSpeed,
              swim: model.draft.swimSpeed,
              fly: model.draft.flySpeed,
            }),
            model.classSpeedHint,
          ]
            .filter(Boolean)
            .join(' · ') || null}
          climbSpeed={model.draft.climbSpeed}
          swimSpeed={model.draft.swimSpeed}
          flySpeed={model.draft.flySpeed}
          jumpLongFt={model.jump.longFt}
          jumpHighFt={model.jump.highFt}
          initiative={model.initiativeValue}
          onOpenInitiative={() => model.setInitiativeBreakdownOpen(true)}
          proficiencyBonus={model.proficiencyBonus}
          inspiration={model.draft.inspiration}
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
        />
        <ActiveEffectsPanel
          effects={model.draft.play.effects ?? []}
          onChange={(effects) => model.applyEffectsChange?.(effects)}
          onToast={model.onToast}
          onHeroismTurnStart={() => model.applyHeroismTurnStart?.()}
        />
        </div>
      )}

      {model.isPlayDesk && model.dockCompanions.length > 0 ? (
        <div className="play-desk__dock" aria-label="Напарники">
          <span className="play-desk__dock-label">Напарники</span>
          {model.dockCompanions.map((row, index) => {
            const initial = (row.name.trim()[0] || '?').toUpperCase()
            const isPrimary = index === 0
            const inForm = isSelfForm(row) && row.active
            const kind = COMPANION_KIND_SHORT[row.kind] ?? 'Спутник'
            return (
              <button
                key={row.id}
                type="button"
                className={`play-desk__comp${isPrimary ? ' is-primary' : ''}${inForm ? ' is-form' : ''}`}
                onClick={() => {
                  model.setDeskMode('companions')
                  model.setActivePanel('companions')
                }}
              >
                <span className="play-desk__comp-face" aria-hidden>
                  {initial}
                </span>
                <span className="play-desk__comp-text">
                  <b>{row.name || 'Без имени'}</b>
                  <span>
                    {inForm ? 'В облике' : isPrimary ? 'Основной' : kind}
                    {row.stats.hp != null ? ` · ${row.stats.hp} HP` : ''}
                  </span>
                </span>
                <span className="play-desk__comp-hp">
                  {row.stats.hp != null ? row.stats.hp : '—'}
                </span>
              </button>
            )
          })}
          <p className="play-desk__dock-note">
            Док всегда виден. Полный список — панель «Напарники».
          </p>
        </div>
      ) : null}
    </>
  )
}
