import { useEffect, useMemo, useState } from 'react'
import { resolveCastEffect } from '../../shared/dnd/spellCatalog'
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
  const slotLevels = spell && !isCantrip ? availableCastSlotLevels(spells.slots, spellLevel) : []
  const pactOk =
    spell != null && !isCantrip && canSpendPactSlot(spells.pact_slots, spellLevel)
  const [usePact, setUsePact] = useState(false)
  const [slotLevel, setSlotLevel] = useState(1)

  useEffect(() => {
    if (!spell || isCantrip) return
    if (pactOk) {
      setUsePact(true)
      setSlotLevel(spells.pact_slots?.level ?? spellLevel)
      return
    }
    setUsePact(false)
    setSlotLevel(slotLevels[0] ?? spellLevel)
  }, [spell?.id, spellLevel, isCantrip, pactOk, slotLevels.join(','), spells.pact_slots?.level])

  const effectiveSlotLevel = useMemo(() => {
    if (!spell || isCantrip) return 0
    if (usePact && spells.pact_slots) return spells.pact_slots.level
    return slotLevel
  }, [spell, isCantrip, usePact, spells.pact_slots, slotLevel])

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

  const canCast = isCantrip || pactOk || slotLevels.length > 0
  const selectedSlot = !usePact ? spells.slots[String(slotLevel)] : null
  const remaining = selectedSlot ? slotsRemaining(selectedSlot) : 0
  const pactRemaining = spells.pact_slots
    ? Math.max(0, spells.pact_slots.max - spells.pact_slots.used)
    : 0

  const metaParts = [
    spell.casting_time,
    spell.range,
    spell.attack_or_save,
    castEffect.effect || spell.damage,
  ].filter(Boolean)

  return (
    <Dialog
      open={open}
      title={isCantrip ? 'Использовать заговор?' : 'Кастовать заклинание?'}
      primaryLabel={canCast ? (busy ? 'Кастуем…' : 'Каст') : 'Нет ячеек'}
      secondaryLabel="Отмена"
      onPrimary={() => {
        if (!canCast || busy) return
        onConfirm({
          usePact: !isCantrip && usePact && pactOk,
          slotLevel: isCantrip ? 0 : usePact ? (spells.pact_slots?.level ?? spellLevel) : slotLevel,
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
          {spell.concentration ? ' · концентрация' : ''}
        </Text>
        {metaParts.length > 0 ? <Text tone="muted">{metaParts.join(' · ')}</Text> : null}
        {castEffect.scaled && castEffect.effect ? (
          <Text>
            Эффект сейчас: <strong>{castEffect.effect}</strong>
            {isCantrip
              ? ` (ур. персонажа ${Math.max(1, characterLevel)})`
              : effectiveSlotLevel > spell.level
                ? ` (ячейка ${effectiveSlotLevel})`
                : ''}
          </Text>
        ) : null}

        {isCantrip ? (
          <Text tone="muted">Заговоры не тратят ячейки.</Text>
        ) : canCast ? (
          <>
            <div>
              <Text tone="muted">Ячейка (можно выше уровня заклинания)</Text>
              <div className="chip-row" style={{ marginTop: 8 }}>
                {pactOk && spells.pact_slots ? (
                  <button
                    type="button"
                    className={`sheet-chip${usePact ? ' is-on' : ''}`}
                    onClick={() => setUsePact(true)}
                  >
                    Pact {spells.pact_slots.level}
                  </button>
                ) : null}
                {slotLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`sheet-chip${!usePact && slotLevel === level ? ' is-on' : ''}`}
                    onClick={() => {
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
            {usePact && spells.pact_slots ? (
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
            )}
          </>
        ) : (
          <Text tone="danger">
            Нет свободных ячеек {spell.level}-го уровня или выше
            {spells.pact_slots ? ' и подходящего pact' : ''}. Верни пипс или сделай отдых.
          </Text>
        )}

        {spell.concentration ? (
          <Text tone="muted">
            Это концентрация — станет активной на листе (предыдущая снимется).
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
