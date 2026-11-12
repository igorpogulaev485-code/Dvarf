/** Состояние и эффекты листа, часть 4. Порядок хуков совпадает с прежним компонентом. */
import type { SheetModel } from './sheetModel'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { formatConditionLabel } from '../../../shared/dnd/conditions'
import { type SpellSelfFormSlug } from '../spellForms'
import type { WizardFeatureRequest } from '../WizardFeatureUseDialog'
import { type FamiliarCastMode } from '../familiarForms'
import { withInitiativeBonus } from '../modifiers'
import { type ToastInput } from '../../../ui'
import {
  appendConsumableSpendLog,
  formatConsumableSpendToast,
  formatConsumableUndoToast,
  markConsumableSpendUndone,
  newConsumableSpendId,
  type ConsumableSpendLogEntry,
  type ConsumableUndoSession,
} from '../consumableSpend'
import { jumpDistances } from '../../../shared/dnd/jumpDistance'
import { useSpellcastingSheetSync } from '../useSpellcastingSheetSync'
import { getFeaturePickList } from '../../../shared/dnd/featurePicks'
import { isPactChainActive } from '../pactChainEffects'
import { isWarlockClassName } from '../pactTomeEffects'
import { parseInfusionSlotsResourceId } from '../InfusionsActiveDialog'
import { armorGivesStealthDisadvantage, type DeskRollMode } from '../deskRolls'
import {
  appendRollHistory,
  isDeskRollToast,
  MODE_DEFAULT_PANEL,
  defaultDeskSplitForMode,
  modeUsesSpellSplit,
  splitSecondaryPanel,
  type PlayDeskPanelId,
} from '../playDeskUi'
import { resolveSpellLearnBudgets } from '../../../shared/dnd/castProfiles'
import { resolveClassCasterSlug, resolveSpellLearnBudget } from '../../../shared/dnd/casterProgression'
import { equippedArmorPieces } from '../inventory'
import { type CastChoice } from '../CastSpellDialog'
import { isCastableSpellScroll } from '../spellScroll'
import { applyInstantDice, instantDice } from '../gearCharges'
import { type SheetSpell } from '../spells'
import { abilityModifier, formatModifier, type AbilityKey } from '../sheetTypes'
import {
  applyEffectStacking,
  clampHpAfterMaxLoss,
  hpMaxBonusFromSingleEffect,
  parseActiveEffects,
  tempHpGrantFromEffect,
  type ActiveEffect,
} from '../../../shared/dnd/activeEffects'
import { buildPotionBuffEffect } from '../../../shared/dnd/b06PotionBuffs'

export function useSheetEditorPart4(model: SheetModel) {

  const flushAutosave = useCallback(async () => {
    if (model.conflictOpenRef.current) return
    if (model.saveInFlightRef.current) {
      model.pendingResaveRef.current = true
      return
    }
    model.saveInFlightRef.current = true
    try {
      await model.persistDraft({ quiet: true })
    } finally {
      model.saveInFlightRef.current = false
      if (model.pendingResaveRef.current && !model.conflictOpenRef.current) {
        model.pendingResaveRef.current = false
        void flushAutosave()
      }
    }
  }, [model.persistDraft])
  model.flushAutosave = flushAutosave

  useEffect(() => {
    if (model.skipAutosaveRef.current) {
      model.skipAutosaveRef.current = false
      return
    }
    if (model.conflictOpen) return
    model.setSaveStatus('dirty')
    if (model.autosaveTimerRef.current) window.clearTimeout(model.autosaveTimerRef.current)
    model.autosaveTimerRef.current = window.setTimeout(() => {
      void flushAutosave()
    }, 650)
    return () => {
      if (model.autosaveTimerRef.current) window.clearTimeout(model.autosaveTimerRef.current)
    }
  }, [model.draft, model.conflictOpen, flushAutosave])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden' && model.saveStatusRef.current === 'dirty') {
        void flushAutosave()
      }
    }
    window.addEventListener('visibilitychange', onVis)
    return () => window.removeEventListener('visibilitychange', onVis)
  }, [flushAutosave])

  useEffect(() => {
    return () => {
      if (model.autosaveTimerRef.current) window.clearTimeout(model.autosaveTimerRef.current)
    }
  }, [])


  const [ownershipOpen, setOwnershipOpen] = useState(false)
  model.ownershipOpen = ownershipOpen
  model.setOwnershipOpen = setOwnershipOpen
  const [identityOpen, setIdentityOpen] = useState(false)
  model.identityOpen = identityOpen
  model.setIdentityOpen = setIdentityOpen
  const [restOpen, setRestOpen] = useState(false)
  model.restOpen = restOpen
  model.setRestOpen = setRestOpen
  const [sorcerySpendId, setSorcerySpendId] = useState<string | null>(null)
  model.sorcerySpendId = sorcerySpendId
  model.setSorcerySpendId = setSorcerySpendId
  const [channelDivinitySpendId, setChannelDivinitySpendId] = useState<string | null>(
    null,
  )
  model.channelDivinitySpendId = channelDivinitySpendId
  model.setChannelDivinitySpendId = setChannelDivinitySpendId
  const [kiSpendId, setKiSpendId] = useState<string | null>(null)
  model.kiSpendId = kiSpendId
  model.setKiSpendId = setKiSpendId
  const [bardicInspirationSpendId, setBardicInspirationSpendId] = useState<
    string | null
  >(null)
  model.bardicInspirationSpendId = bardicInspirationSpendId
  model.setBardicInspirationSpendId = setBardicInspirationSpendId
  const [layOnHandsSpendId, setLayOnHandsSpendId] = useState<string | null>(null)
  model.layOnHandsSpendId = layOnHandsSpendId
  model.setLayOnHandsSpendId = setLayOnHandsSpendId
  const [superioritySpendId, setSuperioritySpendId] = useState<string | null>(null)
  model.superioritySpendId = superioritySpendId
  model.setSuperioritySpendId = setSuperioritySpendId
  const [arcaneRecoverySpendId, setArcaneRecoverySpendId] = useState<string | null>(
    null,
  )
  model.arcaneRecoverySpendId = arcaneRecoverySpendId
  model.setArcaneRecoverySpendId = setArcaneRecoverySpendId
  const [wizardFeatureUse, setWizardFeatureUse] = useState<WizardFeatureRequest | null>(
    null,
  )
  model.wizardFeatureUse = wizardFeatureUse
  model.setWizardFeatureUse = setWizardFeatureUse
  const [infusionsSpendId, setInfusionsSpendId] = useState<string | null>(null)
  model.infusionsSpendId = infusionsSpendId
  model.setInfusionsSpendId = setInfusionsSpendId
  const [arcanumSpendId, setArcanumSpendId] = useState<string | null>(null)
  model.arcanumSpendId = arcanumSpendId
  model.setArcanumSpendId = setArcanumSpendId
  const [invocationsOpen, setInvocationsOpen] = useState<{
    classEntryId: string
  } | null>(null)
  model.invocationsOpen = invocationsOpen
  model.setInvocationsOpen = setInvocationsOpen
  const [psionicSpendId, setPsionicSpendId] = useState<string | null>(null)
  model.psionicSpendId = psionicSpendId
  model.setPsionicSpendId = setPsionicSpendId
  const [soulTrinketsSpendId, setSoulTrinketsSpendId] = useState<string | null>(
    null,
  )
  model.soulTrinketsSpendId = soulTrinketsSpendId
  model.setSoulTrinketsSpendId = setSoulTrinketsSpendId
  const [rangerFavoredOpen, setRangerFavoredOpen] = useState<{
    classEntryId: string
  } | null>(null)
  model.rangerFavoredOpen = rangerFavoredOpen
  model.setRangerFavoredOpen = setRangerFavoredOpen
  const [concDamageAsk, setConcDamageAsk] = useState<{
    damage: number
    spellName: string
    dc: number
  } | null>(null)
  model.concDamageAsk = concDamageAsk
  model.setConcDamageAsk = setConcDamageAsk
  const [hotConditionsOpen, setHotConditionsOpen] = useState(false)
  model.hotConditionsOpen = hotConditionsOpen
  model.setHotConditionsOpen = setHotConditionsOpen
  const [acBreakdownOpen, setAcBreakdownOpen] = useState(false)
  model.acBreakdownOpen = acBreakdownOpen
  model.setAcBreakdownOpen = setAcBreakdownOpen
  const [tempHpReplaceAsk, setTempHpReplaceAsk] = useState<{
    current: number
    incoming: number
    resolve: (choice: 'keep' | 'replace') => void
  } | null>(null)
  model.tempHpReplaceAsk = tempHpReplaceAsk
  model.setTempHpReplaceAsk = setTempHpReplaceAsk
  model.askTempHpReplace = (input: { current: number; incoming: number }) =>
    new Promise<'keep' | 'replace'>((resolve) => {
      setTempHpReplaceAsk({
        current: input.current,
        incoming: input.incoming,
        resolve: (choice) => {
          setTempHpReplaceAsk(null)
          resolve(choice)
        },
      })
    })
  model.applyEffectsChange = (nextEffects: ActiveEffect[]) => {
    model.setDraft((prev) => {
      const prevRows = parseActiveEffects(prev.play.effects)
      const nextIds = new Set(nextEffects.map((row) => row.id))
      const removed = prevRows.filter((row) => !nextIds.has(row.id))
      let hpMax = prev.hpMax ?? 1
      let hpCurrent = prev.hpCurrent ?? 0
      let hpTemp = prev.play.hpTemp
      for (const row of removed) {
        const lost = hpMaxBonusFromSingleEffect({ ...row, inactive: false })
        if (lost > 0) {
          const clamped = clampHpAfterMaxLoss({
            hpCurrent: hpCurrent ?? 0,
            hpMaxBefore: hpMax ?? 1,
            lostMax: lost,
          })
          hpMax = clamped.hpMax
          hpCurrent = clamped.hpCurrent
        }
        const clearsTemp = (row.mods ?? []).some(
          (mod) =>
            mod.target === 'temp_hp' &&
            (mod.condition === 'clear_on_end' || row.slug === 'tensers_transformation'),
        )
        if (clearsTemp) hpTemp = 0
      }
      return {
        ...prev,
        hpMax,
        hpCurrent,
        play: { ...prev.play, effects: nextEffects, hpTemp },
      }
    })
  }
  model.applyHeroismTurnStart = () => {
    const effects = model.draft.play.effects ?? []
    const heroism = effects.find(
      (row: { slug?: string | null; inactive?: boolean }) =>
        row.slug === 'heroism' && !row.inactive,
    )
    if (!heroism) {
      model.onToast('Нет эффекта «Героизм»')
      return
    }
    const mod =
      heroism.mods?.find((m: { target?: string }) => m.target === 'temp_hp')?.value ?? 0
    if (typeof mod !== 'number' || mod <= 0) return
    const current = model.draft.play.hpTemp || 0
    if (current > 0 && current !== mod) {
      void model.askTempHpReplace({ current, incoming: mod }).then((choice: 'keep' | 'replace') => {
        if (choice === 'replace') {
          model.setDraft((prev: typeof model.draft) => ({
            ...prev,
            play: { ...prev.play, hpTemp: mod },
          }))
        }
      })
    } else {
      model.setDraft((prev: typeof model.draft) => ({
        ...prev,
        play: { ...prev.play, hpTemp: Math.max(current, mod) },
      }))
    }
  }
  const [abilityBreakdownKey, setAbilityBreakdownKey] = useState<AbilityKey | null>(
    null,
  )
  model.abilityBreakdownKey = abilityBreakdownKey
  model.setAbilityBreakdownKey = setAbilityBreakdownKey
  const [initiativeBreakdownOpen, setInitiativeBreakdownOpen] = useState(false)
  model.initiativeBreakdownOpen = initiativeBreakdownOpen
  model.setInitiativeBreakdownOpen = setInitiativeBreakdownOpen
  /** Compact play-desk cast (dialog), not the full spells editor. */
  const [deskCastSpell, setDeskCastSpell] = useState<SheetSpell | null>(null)
  model.deskCastSpell = deskCastSpell
  model.setDeskCastSpell = setDeskCastSpell
  const [pendingSpellSelfForm, setPendingSpellSelfForm] = useState<{
    spell: SheetSpell
    slug: SpellSelfFormSlug
  } | null>(null)
  model.pendingSpellSelfForm = pendingSpellSelfForm
  model.setPendingSpellSelfForm = setPendingSpellSelfForm
  const [pendingFamiliar, setPendingFamiliar] = useState<{
    spell: SheetSpell
    mode: FamiliarCastMode
    slotLevel: number
  } | null>(null)
  model.pendingFamiliar = pendingFamiliar
  model.setPendingFamiliar = setPendingFamiliar
  const [deskCastScrollId, setDeskCastScrollId] = useState<string | null>(null)
  model.deskCastScrollId = deskCastScrollId
  const [deskScrollLock, setDeskScrollLock] = useState<{
    itemId: string
    saveDc: number
    attackBonus: number
  } | null>(null)
  model.deskScrollLock = deskScrollLock
  model.setDeskScrollLock = setDeskScrollLock
  model.setDeskCastScrollId = setDeskCastScrollId
  const [consumableSpendPadId, setConsumableSpendPadId] = useState<string | null>(null)
  model.consumableSpendPadId = consumableSpendPadId
  model.setConsumableSpendPadId = setConsumableSpendPadId
  const [consumableSpendLog, setConsumableSpendLog] = useState<ConsumableSpendLogEntry[]>(
    [],
  )
  model.consumableSpendLog = consumableSpendLog
  model.setConsumableSpendLog = setConsumableSpendLog
  const consumableUndoRef = useRef<ConsumableUndoSession | null>(null)
  model.consumableUndoRef = consumableUndoRef
  const [deskCastScrollPending, setDeskCastScrollPending] = useState<{
    itemId: string
    name: string
    concentration: boolean
  } | null>(null)
  model.deskCastScrollPending = deskCastScrollPending
  model.setDeskCastScrollPending = setDeskCastScrollPending
  /** Play-desk spells setup (replaces force-full SpellsPanel). */
  const [spellsSettingsOpen, setSpellsSettingsOpen] = useState(false)
  model.spellsSettingsOpen = spellsSettingsOpen
  model.setSpellsSettingsOpen = setSpellsSettingsOpen
  /** Mobile M1.1: Бой (ready list) | Книга (settings / grimoire sheet). */
  const [mobileSpellSurface, setMobileSpellSurface] = useState<'combat' | 'book'>(
    'combat',
  )
  model.mobileSpellSurface = mobileSpellSurface
  model.setMobileSpellSurface = setMobileSpellSurface
  /** Play-desk attacks setup (replaces force-full AttacksPanel). */
  const [attacksSettingsOpen, setAttacksSettingsOpen] = useState(false)
  model.attacksSettingsOpen = attacksSettingsOpen
  model.setAttacksSettingsOpen = setAttacksSettingsOpen
  /** Explore summary → attunement pad (not stage jump). */
  const [attunementDialogOpen, setAttunementDialogOpen] = useState(false)
  model.attunementDialogOpen = attunementDialogOpen
  model.setAttunementDialogOpen = setAttunementDialogOpen
  /** Shared header CoinPad — also opened from inventory readout. */
  const [coinPadOpen, setCoinPadOpen] = useState(false)
  model.coinPadOpen = coinPadOpen
  model.setCoinPadOpen = setCoinPadOpen
  const [mobileAbilitiesOpen, setMobileAbilitiesOpen] = useState(false)
  model.mobileAbilitiesOpen = mobileAbilitiesOpen
  model.setMobileAbilitiesOpen = setMobileAbilitiesOpen
  const [deskCastPending, setDeskCastPending] = useState<{
    spell: SheetSpell
    choice: CastChoice
  } | null>(null)
  model.deskCastPending = deskCastPending
  model.setDeskCastPending = setDeskCastPending
  const [activePanel, setActivePanel] = useState<PlayDeskPanelId>(
    () => MODE_DEFAULT_PANEL[model.draft.sheetUi.deskMode],
  )
  model.activePanel = activePanel
  model.setActivePanel = setActivePanel
  /** When set, show full editor panel instead of combat compact strip. */
  const [forceFullPanel, setForceFullPanel] = useState<PlayDeskPanelId | null>(null)
  model.forceFullPanel = forceFullPanel
  model.setForceFullPanel = setForceFullPanel
  const [deskRollMode, setDeskRollMode] = useState<DeskRollMode>('normal')
  model.deskRollMode = deskRollMode
  model.setDeskRollMode = setDeskRollMode
  const [rollHistoryOpen, setRollHistoryOpen] = useState(false)
  model.rollHistoryOpen = rollHistoryOpen
  model.setRollHistoryOpen = setRollHistoryOpen
  const [isPlayDesk, setIsPlayDesk] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 960px)').matches,
  )
  model.isPlayDesk = isPlayDesk
  model.setIsPlayDesk = setIsPlayDesk

  const emitToast = useCallback(
    (message: ToastInput) => {
      model.onToast(message)
      const text = typeof message === 'string' ? message : message.message
      if (!isDeskRollToast(text)) return
      model.setDraft((prev) => ({
        ...prev,
        sheetUi: {
          ...prev.sheetUi,
          rollHistory: appendRollHistory(prev.sheetUi.rollHistory, { text }),
        },
      }))
    },
    [model.onToast],
  )
  model.emitToast = emitToast

  const undoConsumableSpend = useCallback(
    (session: ConsumableUndoSession) => {
      if (consumableUndoRef.current?.token === session.token) {
        consumableUndoRef.current = null
      }
      model.setDraft((prev) => {
        let effects = prev.play.effects
        let hpMax = prev.hpMax
        let hpCurrent =
          session.hpBefore !== undefined ? session.hpBefore : prev.hpCurrent
        if (session.effectId) {
          const prevRows = parseActiveEffects(prev.play.effects)
          const removed = prevRows.find((row) => row.id === session.effectId)
          effects = prevRows.filter((row) => row.id !== session.effectId)
          if (removed) {
            const lost = hpMaxBonusFromSingleEffect({ ...removed, inactive: false })
            if (lost > 0 && hpMax != null) {
              const clamped = clampHpAfterMaxLoss({
                hpCurrent: hpCurrent ?? 0,
                hpMaxBefore: hpMax,
                lostMax: lost,
              })
              hpMax = clamped.hpMax
              hpCurrent = clamped.hpCurrent
            }
          }
        }
        return {
          ...prev,
          ...(session.hpBefore !== undefined || session.effectId
            ? { hpCurrent }
            : {}),
          ...(session.effectId ? { hpMax } : {}),
          inventory: {
            ...prev.inventory,
            items: prev.inventory.items.map((row) =>
              row.id === session.itemId
                ? { ...row, qty: (row.qty ?? 0) + session.amount }
                : row,
            ),
          },
          play: { ...prev.play, effects },
        }
      })
      setConsumableSpendLog((prev) => markConsumableSpendUndone(prev, session.logId))
      model.onToast(formatConsumableUndoToast(session.name, session.amount))
    },
    [model.onToast],
  )
  model.undoConsumableSpend = undoConsumableSpend

  const spendConsumableFromDesk = useCallback(
    (itemId: string, amount = 1) => {
      const item = model.draft.inventory.items.find((row) => row.id === itemId)
      if (!item || (item.qty ?? 0) <= 0) return
      if (isCastableSpellScroll(item)) {
        setDeskCastScrollId(itemId)
        return
      }
      const spendAmount = Math.max(1, Math.min(amount, item.qty ?? 0))
      const nextQty = Math.max(0, (item.qty ?? 0) - spendAmount)
      const heal = instantDice(item.effects, 'heal')
      const harm = heal ? null : instantDice(item.effects, 'harm')
      const dice = heal ?? harm
      let hpBefore: number | null | undefined
      let hpAfter: number | null = null
      let hpMaxAfter: number | null = null
      const diceLines: string[] = []
      if (dice) {
        if (heal && model.draft.hpMax == null) {
          model.onToast('Задай максимум хитов — зелье не выпито')
          return
        }
        hpBefore = model.draft.hpCurrent
        let hp = model.draft.hpCurrent
        for (let i = 0; i < spendAmount; i += 1) {
          const rolled = applyInstantDice({
            hp,
            max: model.draft.hpMax,
            dice: dice.dice,
            kind: heal ? 'heal' : 'harm',
          })
          if (!rolled) break
          hp = rolled.hp
          diceLines.push(rolled.line)
        }
        hpAfter = hp
      }

      // B-06: duration potions apply ActiveEffect (kind: item) after qty spend.
      const potionFx =
        spendAmount >= 1
          ? buildPotionBuffEffect({
              catalogId: item.catalog_id,
              name: item.name,
              sourceCharacterId: model.baseCharacter?.id ?? null,
              sourceName: model.draft.name,
              hpMax: model.draft.hpMax,
            })
          : null
      if (potionFx?.slug === 'potion_of_giant_size') {
        const maxBonus = hpMaxBonusFromSingleEffect(potionFx)
        if (maxBonus > 0) {
          const prevMax = model.draft.hpMax ?? 0
          const prevHp = hpAfter ?? model.draft.hpCurrent ?? 0
          hpMaxAfter = prevMax + maxBonus
          hpAfter = Math.min(hpMaxAfter, (prevHp || 0) + maxBonus)
          if (hpBefore === undefined) hpBefore = model.draft.hpCurrent
        }
      }

      const logId = newConsumableSpendId()
      const token = Date.now()
      const session: ConsumableUndoSession = {
        token,
        itemId,
        name: item.name,
        amount: spendAmount,
        logId,
        ...(hpBefore !== undefined ? { hpBefore } : {}),
        ...(potionFx ? { effectId: potionFx.id } : {}),
      }
      consumableUndoRef.current = session
      model.setDraft((prev) => {
        let effects = prev.play.effects
        if (potionFx) {
          effects = applyEffectStacking([
            ...parseActiveEffects(prev.play.effects),
            potionFx,
          ])
        }
        return {
          ...prev,
          ...(hpAfter != null ? { hpCurrent: hpAfter } : {}),
          ...(hpMaxAfter != null ? { hpMax: hpMaxAfter } : {}),
          inventory: {
            ...prev.inventory,
            items: prev.inventory.items.map((row) =>
              row.id === itemId
                ? { ...row, qty: Math.max(0, (row.qty ?? 0) - spendAmount) }
                : row,
            ),
          },
          play: { ...prev.play, effects },
        }
      })

      if (potionFx) {
        const tempGrant = tempHpGrantFromEffect(potionFx)
        if (tempGrant != null && tempGrant > 0 && model.askTempHpReplace) {
          const current = model.draft.play.hpTemp || 0
          void model.askTempHpReplace({ current, incoming: tempGrant }).then(
            (choice: 'keep' | 'replace') => {
              if (choice === 'replace' || current <= 0) {
                model.setDraft((prev) => ({
                  ...prev,
                  play: { ...prev.play, hpTemp: tempGrant },
                }))
              }
            },
          )
        }
      }

      setConsumableSpendLog((prev) =>
        appendConsumableSpendLog(prev, {
          id: logId,
          itemId,
          name: item.name,
          amount: spendAmount,
          atMs: token,
        }),
      )
      const drinkNote = diceLines.length
        ? ` · ${diceLines.join(' · ')}${harm?.note ? ` · ${harm.note}` : ''}`
        : potionFx
          ? ` · эффект: ${potionFx.name}`
          : ''
      model.onToast({
        message: `${formatConsumableSpendToast(item.name, spendAmount, nextQty)}${drinkNote}`,
        durationMs: 8000,
        actionLabel: 'Отменить',
        onAction: () => {
          if (consumableUndoRef.current?.token !== token) return
          undoConsumableSpend(session)
        },
      })
    },
    [
      model.draft.inventory.items,
      model.draft.hpMax,
      model.draft.hpCurrent,
      model.draft.name,
      model.draft.play.hpTemp,
      model.baseCharacter?.id,
      model.onToast,
      model.askTempHpReplace,
      undoConsumableSpend,
    ],
  )
  model.spendConsumableFromDesk = spendConsumableFromDesk

  const undoConsumableSpendFromLog = useCallback(
    (logId: string) => {
      const entry = consumableSpendLog.find((row) => row.id === logId)
      if (!entry || entry.undone) return
      const session: ConsumableUndoSession = {
        token: entry.atMs,
        itemId: entry.itemId,
        name: entry.name,
        amount: entry.amount,
        logId: entry.id,
      }
      undoConsumableSpend(session)
    },
    [consumableSpendLog, undoConsumableSpend],
  )
  model.undoConsumableSpendFromLog = undoConsumableSpendFromLog

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px)')
    const onChange = () => setIsPlayDesk(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  /**
   * Default desk_split is ON for every sheet. Once per character: collapse when
   * there is no magic; if race/feat grants hydrate later, reopen once.
   * Does not fight a later manual «Показать магию» on a non-caster.
   */
  const magicSplitSeededRef = useRef<string | null>(null)
  model.magicSplitSeededRef = magicSplitSeededRef
  const reopenSplitWhenMagicArrivesRef = useRef(false)
  model.reopenSplitWhenMagicArrivesRef = reopenSplitWhenMagicArrivesRef
  useEffect(() => {
    const id = model.character.id
    if (magicSplitSeededRef.current !== id) {
      magicSplitSeededRef.current = id
      if (!model.hasMagicSources) {
        reopenSplitWhenMagicArrivesRef.current = true
        if (model.draft.sheetUi.deskSplit) model.patchSheetUi({ deskSplit: false })
      } else {
        reopenSplitWhenMagicArrivesRef.current = false
      }
      return
    }
    if (model.hasMagicSources && reopenSplitWhenMagicArrivesRef.current) {
      reopenSplitWhenMagicArrivesRef.current = false
      // Only auto-reopen on combat (explore/social stay full-width until «Показать магию»).
      if (
        defaultDeskSplitForMode(model.draft.sheetUi.deskMode, true) &&
        !model.draft.sheetUi.deskSplit
      ) {
        model.patchSheetUi({ deskSplit: true })
      }
    }
    // Seed / late-hydrate only — not on every deskSplit toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.character.id, model.hasMagicSources])

  const pactChainFamiliarReady = model.draft.classes.some(
    (row) =>
      isWarlockClassName(row.name) &&
      row.level > 0 &&
      isPactChainActive(model.draft.featurePicks, row.id),
  )
  model.pactChainFamiliarReady = pactChainFamiliarReady

  const stealthArmorPieces = equippedArmorPieces(model.draft.inventory.items)
  model.stealthArmorPieces = stealthArmorPieces
  const wornBody = model.draft.inventory.items.find(
    (item) =>
      item.equipped &&
      (item.armor_kind === 'light' ||
        item.armor_kind === 'medium' ||
        item.armor_kind === 'heavy'),
  )
  const stealthArmorDisadvantage = armorGivesStealthDisadvantage({
    armorKind: stealthArmorPieces.armor?.kind ?? null,
    armorName: stealthArmorPieces.armor?.name ?? null,
    stealthDisadvantage: wornBody?.stealth_disadvantage,
  })
  model.stealthArmorDisadvantage = stealthArmorDisadvantage

  /** Split only on wide desk; phone = one scene panel (+ combat segment for spells). */
  const deskSplit = isPlayDesk && model.draft.sheetUi.deskSplit
  model.deskSplit = deskSplit
  const splitSecondary =
    deskSplit && modeUsesSpellSplit(model.draft.sheetUi.deskMode)
      ? splitSecondaryPanel(model.draft.sheetUi.deskMode, activePanel)
      : null
  model.splitSecondary = splitSecondary

  const initiativeAutoCore =
    abilityModifier(model.effectiveAbilities.dex) + model.totalInitiativeBonus
  model.initiativeAutoCore = initiativeAutoCore
  const initiativeCore = model.draft.initiativeOverride ?? initiativeAutoCore
  model.initiativeCore = initiativeCore
  const initiativeValue = withInitiativeBonus({
    core: initiativeCore,
    modifiers: model.draft.modifiers,
    vars: model.formulaVarsBase,
  }).total
  model.initiativeValue = initiativeValue
  const initiativeAutoLabel = [
    `ЛОВ ${formatModifier(abilityModifier(model.effectiveAbilities.dex))}`,
    model.raceInitiativeBonus
      ? `раса ${formatModifier(model.raceInitiativeBonus)}`
      : null,
    model.featInitiativeBonus
      ? `черта ${formatModifier(model.featInitiativeBonus)}`
      : null,
    model.featureInitiativeBonus
      ? `умение ${formatModifier(model.featureInitiativeBonus)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  model.initiativeAutoLabel = initiativeAutoLabel
  const remarkableAthlete = (model.unlockedFeatures ?? []).some(
    (feature: { id?: string }) => feature.id === 'remarkable_athlete',
  )
  const strengthMod = abilityModifier(model.effectiveAbilities.str)
  const jump = jumpDistances({
    strengthScore: model.effectiveAbilities.str,
    strengthMod,
    longBonusFt: remarkableAthlete ? Math.max(0, strengthMod) : 0,
  })
  model.jump = jump
  const hotConditionNames = model.draft.play.conditions
    .filter((item) => item.slug !== 'exhaustion')
    .map((item) => formatConditionLabel(item))
  model.hotConditionNames = hotConditionNames

  const subclassCastersForSpells = useMemo(
    () =>
      model.draft.subclassGrants
        .filter((row) => row.caster?.progression === 'third')
        .map((row) => ({
          classEntryId: row.classEntryId,
          progression: 'third' as const,
          ability: row.caster?.ability ?? null,
        })),
    [model.draft.subclassGrants],
  )
  model.subclassCastersForSpells = subclassCastersForSpells

  const spellLearnBudget = useMemo(() => {
    const rows = model.draft.classes.filter((row) => row.name.trim() && row.level > 0)
    if (rows.length === 0) return null
    return resolveSpellLearnBudget({
      classes: rows,
      subclassCasters: subclassCastersForSpells,
      abilityModFor: (ability) => abilityModifier(model.draft.abilities[ability]),
    })
  }, [model.draft.classes, subclassCastersForSpells, model.draft.abilities])
  model.spellLearnBudget = spellLearnBudget

  const spellLearnBudgets = useMemo(() => {
    const rows = model.draft.classes.filter((row) => row.name.trim() && row.level > 0)
    if (rows.length === 0) return null
    return resolveSpellLearnBudgets({
      classes: rows,
      subclassCasters: subclassCastersForSpells,
      abilityModFor: (ability) => abilityModifier(model.draft.abilities[ability]),
      proficiencyBonus: model.proficiencyBonus,
    })
  }, [model.draft.classes, subclassCastersForSpells, model.draft.abilities, model.proficiencyBonus])
  model.spellLearnBudgets = spellLearnBudgets

  const spellcastingSync = useSpellcastingSheetSync({
    enabled: true,
    className: model.classSummary || model.primaryClass?.name || '',
    level: model.characterLevel,
    classes: model.draft.classes,
    subclassCasters: subclassCastersForSpells,
    spells: model.draft.spells,
    abilities: model.draft.abilities,
    proficiencyBonus: model.proficiencyBonus,
    onChange: (spells) => model.setDraft((prev) => ({ ...prev, spells })),
    onToast: model.onToast,
  })
  model.spellcastingSync = spellcastingSync

  const sorcererMetamagicIds = useMemo(() => {
    const ids: string[] = []
    for (const row of model.draft.classes) {
      if (resolveClassCasterSlug(row.name) !== 'sorcerer') continue
      ids.push(...getFeaturePickList(model.draft.featurePicks, row.id, 'metamagic'))
    }
    return [...new Set(ids)]
  }, [model.draft.classes, model.draft.featurePicks])
  model.sorcererMetamagicIds = sorcererMetamagicIds

  const sorceryResource =
    sorcerySpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === sorcerySpendId) ?? null)
  model.sorceryResource = sorceryResource
  const channelDivinityResource =
    channelDivinitySpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === channelDivinitySpendId) ?? null)
  model.channelDivinityResource = channelDivinityResource
  const kiResource =
    kiSpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === kiSpendId) ?? null)
  model.kiResource = kiResource
  const bardicInspirationResource =
    bardicInspirationSpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === bardicInspirationSpendId) ??
        null)
  model.bardicInspirationResource = bardicInspirationResource
  const layOnHandsResource =
    layOnHandsSpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === layOnHandsSpendId) ?? null)
  model.layOnHandsResource = layOnHandsResource
  const superiorityResource =
    superioritySpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === superioritySpendId) ?? null)
  model.superiorityResource = superiorityResource
  const arcaneRecoveryResource =
    arcaneRecoverySpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === arcaneRecoverySpendId) ??
        null)
  model.arcaneRecoveryResource = arcaneRecoveryResource

  const arcaneRecoveryWizardLevel = useMemo(() => {
    if (!arcaneRecoverySpendId) return 1
    // feat:wizard:arcane_recovery:{classEntryId}
    const parts = arcaneRecoverySpendId.split(':')
    const classEntryId = parts[parts.length - 1]
    const row = model.draft.classes.find((c) => c.id === classEntryId)
    return Math.max(1, Math.floor(row?.level ?? 1))
  }, [arcaneRecoverySpendId, model.draft.classes])
  model.arcaneRecoveryWizardLevel = arcaneRecoveryWizardLevel

  const infusionsResource =
    infusionsSpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === infusionsSpendId) ?? null)
  model.infusionsResource = infusionsResource
  const infusionsContext = useMemo(() => {
    if (!infusionsSpendId) return null
    const parsed = parseInfusionSlotsResourceId(infusionsSpendId)
    if (!parsed) return null
    const row = model.draft.classes.find((c) => c.id === parsed.classEntryId)
    return {
      classEntryId: parsed.classEntryId,
      level: Math.max(1, Math.floor(row?.level ?? 1)),
    }
  }, [infusionsSpendId, model.draft.classes])
  model.infusionsContext = infusionsContext

  const arcanumResource =
    arcanumSpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === arcanumSpendId) ?? null)
  model.arcanumResource = arcanumResource

  const psionicResource =
    psionicSpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === psionicSpendId) ?? null)
  model.psionicResource = psionicResource

  const soulTrinketsResource =
    soulTrinketsSpendId == null
      ? null
      : (model.draft.play.resources.find((row) => row.id === soulTrinketsSpendId) ??
        null)
  model.soulTrinketsResource = soulTrinketsResource
}
