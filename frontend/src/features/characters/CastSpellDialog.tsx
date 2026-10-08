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
import type { SheetSpell, SpellsState } from './spells'

export type CastChoice = {
  usePact: boolean
  slotLevel: number
  /** Ritual: no slot / pact spent (PHB +10 min). */
  ritual?: boolean
}

type CastSpellDialogProps = {
  open: boolean
  spell: SheetSpell | null
  spells: SpellsState
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
  characterLevel,
  busy = false,
  onConfirm,
  onClose,
}: CastSpellDialogProps) {
  const isCantrip = spell != null && spell.level <= 0
  const spellLevel = spell?.level ?? 0
  const isRitual = Boolean(spell?.ritual && !isCantrip)
  const slotLevels = spell && !isCantrip ? availableCastSlotLevels(spells.slots, spellLevel) : []
  const pactOk =
    spell != null && !isCantrip && canSpendPactSlot(spells.pact_slots, spellLevel)
  const hasSlotPath = pactOk || slotLevels.length > 0
  const [usePact, setUsePact] = useState(false)
  const [useRitual, setUseRitual] = useState(false)
  const [slotLevel, setSlotLevel] = useState(1)

  useEffect(() => {
    if (!spell || isCantrip) {
      setUseRitual(false)
      return
    }
    // Prefer slots/pact when available; fall back to ritual if tagged and no slots.
    if (hasSlotPath) {
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
    setUsePact(false)
    setUseRitual(isRitual)
    setSlotLevel(spellLevel)
  }, [
    spell?.id,
    spellLevel,
    isCantrip,
    isRitual,
    hasSlotPath,
    pactOk,
    slotLevels.join(','),
    spells.pact_slots?.level,
  ])

  const effectiveSlotLevel = useMemo(() => {
    if (!spell || isCantrip || useRitual) return spell?.level ?? 0
    if (usePact && spells.pact_slots) return spells.pact_slots.level
    return slotLevel
  }, [spell, isCantrip, useRitual, usePact, spells.pact_slots, slotLevel])

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

  const canCast = isCantrip || (useRitual && isRitual) || hasSlotPath
  const selectedSlot = !usePact && !useRitual ? spells.slots[String(slotLevel)] : null
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
    effectiveSlotLevel > spell.level

  return (
    <Dialog
      open={open}
      title={isCantrip ? 'Использовать заговор?' : 'Кастовать заклинание?'}
      primaryLabel={canCast ? (busy ? 'Кастуем…' : useRitual ? 'Ритуал' : 'Каст') : 'Нет ячеек'}
      secondaryLabel="Отмена"
      onPrimary={() => {
        if (!canCast || busy) return
        onConfirm({
          ritual: !isCantrip && useRitual && isRitual,
          usePact: !isCantrip && !useRitual && usePact && pactOk,
          slotLevel: isCantrip || useRitual
            ? spellLevel
            : usePact
              ? (spells.pact_slots?.level ?? spellLevel)
              : slotLevel,
        })
      }}
      onSecondary={onClose}
      busy={busy || !canCast}
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
              : !useRitual && effectiveSlotLevel > spell.level
                ? ` (ячейка ${effectiveSlotLevel})`
                : ''}
          </Text>
        ) : null}
        {showHigherLevels ? (
          <Text tone="muted">На больших уровнях: {spell.higher_levels}</Text>
        ) : null}

        {isCantrip ? (
          <Text tone="muted">Заговоры не тратят ячейки.</Text>
        ) : (
          <>
            <div>
              <Text tone="muted">Источник каста</Text>
              <div className="chip-row" style={{ marginTop: 8 }}>
                {isRitual ? (
                  <button
                    type="button"
                    className={`sheet-chip${useRitual ? ' is-on' : ''}`}
                    onClick={() => {
                      setUseRitual(true)
                      setUsePact(false)
                    }}
                  >
                    Ритуал
                  </button>
                ) : null}
                {pactOk && spells.pact_slots ? (
                  <button
                    type="button"
                    className={`sheet-chip${!useRitual && usePact ? ' is-on' : ''}`}
                    onClick={() => {
                      setUseRitual(false)
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
                      !useRitual && !usePact && slotLevel === level ? ' is-on' : ''
                    }`}
                    onClick={() => {
                      setUseRitual(false)
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
            {useRitual ? (
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
                {isRitual ? ', либо выбери ритуал' : ''}.
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
