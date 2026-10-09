import { useEffect, useMemo, useState } from 'react'
import {
  formatSpellComponents,
  resolveCastEffect,
  spellSchoolLabelRu,
} from '../../shared/dnd/spellCatalog'
import {
  availableCastSlotLevels,
  canSpendPactSlot,
  levelLabel,
  slotsRemaining,
} from '../../shared/dnd/spells'
import { Dialog, Stack, Text } from '../../ui'
import {
  canSpendGrantCast,
  grantCastRemaining,
  type SheetSpell,
  type SpellsState,
} from './spells'
import { checkSpellMaterials, type MaterialInventoryItem } from './spellMaterials'

export type CastChoice = {
  usePact: boolean
  slotLevel: number
  /** Ritual: no slot / pact spent (PHB +10 min). */
  ritual?: boolean
  /** Spend race/feat grant free-cast charge instead of a slot. */
  useGrant?: boolean
  /** When material is consumed — whether to decrement inventory. */
  consumeMaterial?: boolean
  /** Inventory item id to consume (cheapest sufficient). */
  consumeItemId?: string | null
}

type CastSpellDialogProps = {
  open: boolean
  spell: SheetSpell | null
  spells: SpellsState
  /** Inventory snapshot for costly / fallback free components. */
  inventoryItems: MaterialInventoryItem[]
  /** Total character level — cantrip scaling 1/5/11/17. */
  characterLevel: number
  busy?: boolean
  onConfirm: (choice: CastChoice) => void
  onClose: () => void
}

export function CastSpellDialog({
  open,
  spell,
  spells,
  inventoryItems,
  characterLevel,
  busy = false,
  onConfirm,
  onClose,
}: CastSpellDialogProps) {
  const isCantrip = spell != null && spell.level <= 0
  const spellLevel = spell?.level ?? 0
  const isRitual = Boolean(spell?.ritual && !isCantrip)
  const grantOk = spell != null && !isCantrip && canSpendGrantCast(spell)
  const grantRemaining = spell ? grantCastRemaining(spell) : 0
  const slotLevels = spell && !isCantrip ? availableCastSlotLevels(spells.slots, spellLevel) : []
  const pactOk =
    spell != null && !isCantrip && canSpendPactSlot(spells.pact_slots, spellLevel)
  const hasSlotPath = pactOk || slotLevels.length > 0
  const [usePact, setUsePact] = useState(false)
  const [useRitual, setUseRitual] = useState(false)
  const [useGrant, setUseGrant] = useState(false)
  const [slotLevel, setSlotLevel] = useState(1)
  const [consumeMaterial, setConsumeMaterial] = useState(true)

  const materialText = spell?.components?.m

  const materialCheck = useMemo(
    () =>
      checkSpellMaterials({
        material: materialText,
        flags: {
          has_spell_focus: Boolean(spells.has_spell_focus),
          has_component_pouch: Boolean(spells.has_component_pouch),
        },
        items: inventoryItems,
      }),
    [
      materialText,
      spells.has_spell_focus,
      spells.has_component_pouch,
      inventoryItems,
    ],
  )

  useEffect(() => {
    if (!open) return
    setConsumeMaterial(true)
  }, [open, spell?.id])

  useEffect(() => {
    if (!spell || isCantrip) {
      setUseRitual(false)
      setUseGrant(false)
      return
    }
    // Prefer grant free cast when available; else slots/pact; else ritual.
    if (grantOk) {
      setUseGrant(true)
      setUseRitual(false)
      setUsePact(false)
      setSlotLevel(spellLevel)
      return
    }
    if (hasSlotPath) {
      setUseGrant(false)
      setUseRitual(false)
      if (pactOk) {
        setUsePact(true)
        setSlotLevel(spells.pact_slots?.level ?? spellLevel)
      } else {
        setUsePact(false)
        setSlotLevel(slotLevels[0] ?? spellLevel)
      }
      return
    }
    setUseGrant(false)
    setUsePact(false)
    setUseRitual(isRitual)
    setSlotLevel(spellLevel)
  }, [
    spell?.id,
    spellLevel,
    isCantrip,
    isRitual,
    grantOk,
    hasSlotPath,
    pactOk,
    slotLevels.join(','),
    spells.pact_slots?.level,
  ])

  const effectiveSlotLevel = useMemo(() => {
    if (!spell || isCantrip || useRitual || useGrant) return spell?.level ?? 0
    if (usePact && spells.pact_slots) return spells.pact_slots.level
    return slotLevel
  }, [spell, isCantrip, useRitual, useGrant, usePact, spells.pact_slots, slotLevel])

  const castEffect = useMemo(() => {
    if (!spell) return { effect: '', scaled: false }
    return resolveCastEffect(spell, {
      characterLevel,
      slotLevel: effectiveSlotLevel || spell.level,
    })
  }, [spell, characterLevel, effectiveSlotLevel])

  if (!spell) {
    return null
  }

  const materialsOk = materialCheck.ok
  const needsConsumeChoice = Boolean(
    materialCheck.ok &&
      materialCheck.requirement &&
      materialCheck.requirement.minCostGp > 0 &&
      materialCheck.requirement.consumed &&
      materialCheck.cheapest,
  )

  const canCast =
    materialsOk &&
    (isCantrip ||
      (useGrant && grantOk) ||
      (useRitual && isRitual) ||
      (!useGrant && !useRitual && hasSlotPath))
  const selectedSlot =
    !usePact && !useRitual && !useGrant ? spells.slots[String(slotLevel)] : null
  const remaining = selectedSlot ? slotsRemaining(selectedSlot) : 0
  const pactRemaining = spells.pact_slots
    ? Math.max(0, spells.pact_slots.max - spells.pact_slots.used)
    : 0

  const metaParts = [
    spell.casting_time,
    spell.range,
    spell.duration ? `длится ${spell.duration}` : '',
    spell.components ? formatSpellComponents(spell.components) : '',
    spell.school ? spellSchoolLabelRu(spell.school) : '',
    spell.attack_or_save,
    castEffect.effect || spell.damage,
  ].filter(Boolean)

  const showHigherLevels =
    Boolean(spell.higher_levels) &&
    !isCantrip &&
    !useRitual &&
    !useGrant &&
    effectiveSlotLevel > spell.level

  const grantLabel = spell.grant_cast?.label ?? 'Грант'
  const grantExhausted =
    Boolean(spell.grant_cast && spell.grant_cast.max > 0 && !grantOk)

  const primaryLabel = !materialsOk
    ? 'Нет компонента'
    : !canCast
      ? 'Нет ячеек'
      : busy
        ? 'Кастуем…'
        : useGrant
          ? `Каст (${grantLabel})`
          : useRitual
            ? 'Ритуал'
            : 'Каст'

  return (
    <Dialog
      open={open}
      title={isCantrip ? 'Использовать заговор?' : 'Кастовать заклинание?'}
      primaryLabel={primaryLabel}
      secondaryLabel="Отмена"
      onPrimary={() => {
        if (!canCast || busy) return
        onConfirm({
          useGrant: !isCantrip && useGrant && grantOk,
          ritual: !isCantrip && !useGrant && useRitual && isRitual,
          usePact: !isCantrip && !useGrant && !useRitual && usePact && pactOk,
          slotLevel:
            isCantrip || useRitual || useGrant
              ? spellLevel
              : usePact
                ? (spells.pact_slots?.level ?? spellLevel)
                : slotLevel,
          consumeMaterial: needsConsumeChoice ? consumeMaterial : false,
          consumeItemId:
            needsConsumeChoice && consumeMaterial
              ? materialCheck.cheapest?.item.id ?? null
              : null,
        })
      }}
      onSecondary={onClose}
      busy={busy || !canCast}
      primaryDisabled={!canCast}
    >
      <Stack gap={10}>
        <Text>
          <strong>{spell.name || 'Без названия'}</strong>
          {' · '}
          {levelLabel(spell.level)}
          {spell.ritual ? ' · ритуал' : ''}
          {spell.concentration ? ' · концентрация' : ''}
          {spell.source_book ? ` · ${spell.source_book}` : ''}
        </Text>
        {metaParts.length > 0 ? <Text tone="muted">{metaParts.join(' · ')}</Text> : null}
        {castEffect.scaled && castEffect.effect ? (
          <Text>
            Эффект сейчас: <strong>{castEffect.effect}</strong>
            {isCantrip
              ? ` (ур. персонажа ${Math.max(1, characterLevel)})`
              : !useRitual && !useGrant && effectiveSlotLevel > spell.level
                ? ` (ячейка ${effectiveSlotLevel})`
                : ''}
          </Text>
        ) : null}
        {showHigherLevels ? (
          <Text tone="muted">На больших уровнях: {spell.higher_levels}</Text>
        ) : null}

        {materialCheck.requirement ? (
          <div className="cast-material-box">
            <Text tone={materialsOk ? 'muted' : 'danger'}>{materialCheck.message}</Text>
            {materialCheck.requirement.raw ? (
              <Text tone="muted">М: {materialCheck.requirement.raw}</Text>
            ) : null}
            {needsConsumeChoice ? (
              <button
                type="button"
                className={`sheet-chip${consumeMaterial ? ' is-on' : ''}`}
                onClick={() => setConsumeMaterial((prev) => !prev)}
              >
                {consumeMaterial
                  ? `Списать «${materialCheck.cheapest?.item.name}»`
                  : 'Не списывать (тест)'}
              </button>
            ) : null}
          </div>
        ) : null}

        {isCantrip ? (
          <Text tone="muted">Заговоры не тратят ячейки.</Text>
        ) : (
          <>
            <div>
              <Text tone="muted">Источник каста</Text>
              <div className="chip-row" style={{ marginTop: 8 }}>
                {spell.grant_cast && spell.grant_cast.max > 0 ? (
                  <button
                    type="button"
                    className={`sheet-chip${useGrant ? ' is-on' : ''}${
                      grantExhausted ? ' is-disabled' : ''
                    }`}
                    disabled={grantExhausted}
                    title={
                      grantExhausted
                        ? `${grantLabel}: заряд исчерпан до отдыха`
                        : `${grantLabel}: без ячейки`
                    }
                    onClick={() => {
                      if (grantExhausted) return
                      setUseGrant(true)
                      setUseRitual(false)
                      setUsePact(false)
                    }}
                  >
                    {grantLabel} {grantRemaining}/{spell.grant_cast.max}
                  </button>
                ) : null}
                {isRitual ? (
                  <button
                    type="button"
                    className={`sheet-chip${useRitual ? ' is-on' : ''}`}
                    onClick={() => {
                      setUseRitual(true)
                      setUseGrant(false)
                      setUsePact(false)
                    }}
                  >
                    Ритуал
                  </button>
                ) : null}
                {pactOk && spells.pact_slots ? (
                  <button
                    type="button"
                    className={`sheet-chip${
                      !useRitual && !useGrant && usePact ? ' is-on' : ''
                    }`}
                    onClick={() => {
                      setUseRitual(false)
                      setUseGrant(false)
                      setUsePact(true)
                      setSlotLevel(spells.pact_slots?.level ?? spellLevel)
                    }}
                  >
                    Pact {spells.pact_slots.level}
                  </button>
                ) : null}
                {slotLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`sheet-chip${
                      !useRitual && !useGrant && !usePact && slotLevel === level
                        ? ' is-on'
                        : ''
                    }`}
                    onClick={() => {
                      setUseRitual(false)
                      setUseGrant(false)
                      setUsePact(false)
                      setSlotLevel(level)
                    }}
                  >
                    {level}-й
                    {level > spellLevel ? ' ↑' : ''}
                  </button>
                ))}
              </div>
            </div>
            {useGrant ? (
              <Text tone="muted">
                Каст через {grantLabel}: ячейка не тратится. Останется {grantRemaining - 1} из{' '}
                {spell.grant_cast?.max ?? 0}
                {spell.grant_cast?.reset === 'short'
                  ? ' (сброс на коротком отдыхе)'
                  : ' (сброс на продолжительном)'}
                .
              </Text>
            ) : useRitual ? (
              <Text tone="muted">
                Ритуал: ячейка не тратится (+10 минут к времени каста по PHB). Upcast недоступен.
              </Text>
            ) : hasSlotPath ? (
              usePact && spells.pact_slots ? (
                <Text tone="muted">
                  Будет потрачена 1 pact-ячейка {spells.pact_slots.level}-го уровня. Останется{' '}
                  {pactRemaining - 1} из {spells.pact_slots.max}.
                </Text>
              ) : (
                <Text tone="muted">
                  Будет потрачена 1 ячейка {slotLevel}-го уровня
                  {slotLevel > spellLevel ? ' (upcast)' : ''}. Останется {remaining - 1} из{' '}
                  {selectedSlot?.max ?? 0}.
                </Text>
              )
            ) : (
              <Text tone="danger">
                Нет свободных ячеек {spell.level}-го уровня или выше
                {spells.pact_slots ? ' и подходящего pact' : ''}. Верни пипс или сделай отдых
                {isRitual || grantExhausted
                  ? `, либо ${grantExhausted ? 'восстанови заряд гранта' : 'выбери ритуал'}`
                  : ''}
                .
              </Text>
            )}
          </>
        )}

        {spell.concentration && !useRitual ? (
          <Text tone="muted">
            Это концентрация — станет активной на листе (предыдущая снимется).
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
