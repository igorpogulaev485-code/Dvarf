import { useEffect, useMemo, useState } from 'react'
import {
  availableCastSlotLevels,
  canSpendPactSlot,
  levelLabel,
  slotsRemaining,
} from '../../shared/dnd/spells'
import { Dialog, Stack, Text } from '../../ui'
import { AllyTargetFields } from '../lobby/AllyTargetFields'
import { useLobbyParty, type AllyPickDemo } from '../lobby/useLobbyParty'
import type { SheetSpell, SpellsState } from './spells'

export type CastChoice = {
  usePact: boolean
  slotLevel: number
  /** Выбранные цели (себя и/или союзники), без пустых слотов */
  allyTargetIds: string[]
  lobbyId: string | null
}

type CastSpellDialogProps = {
  open: boolean
  spell: SheetSpell | null
  spells: SpellsState
  characterId?: string
  busy?: boolean
  allyDemo?: AllyPickDemo | null
  onConfirm: (choice: CastChoice) => void
  onClose: () => void
}

export function CastSpellDialog({
  open,
  spell,
  spells,
  characterId,
  busy = false,
  allyDemo = null,
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

  const showTargets = Boolean(spell?.applies_to_allies && characterId)
  const targetCount = Math.max(1, Math.min(6, spell?.ally_target_count ?? 1))
  const [targetSlots, setTargetSlots] = useState<string[]>(() =>
    Array.from({ length: targetCount }, () => ''),
  )

  const party = useLobbyParty(showTargets ? characterId : undefined, allyDemo)

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

  useEffect(() => {
    if (!open) return
    setTargetSlots(Array.from({ length: targetCount }, () => ''))
  }, [open, spell?.id, targetCount])

  const selectedIds = useMemo(
    () => targetSlots.filter((id) => id.trim().length > 0),
    [targetSlots],
  )

  const duplicateTarget = useMemo(() => {
    const seen = new Set<string>()
    for (const id of selectedIds) {
      if (seen.has(id)) return true
      seen.add(id)
    }
    return false
  }, [selectedIds])

  if (!spell) {
    return null
  }

  const canCast = isCantrip || pactOk || slotLevels.length > 0
  const targetsOk =
    !showTargets || (selectedIds.length === targetCount && !duplicateTarget)
  const selectedSlot = !usePact ? spells.slots[String(slotLevel)] : null
  const remaining = selectedSlot ? slotsRemaining(selectedSlot) : 0
  const pactRemaining = spells.pact_slots
    ? Math.max(0, spells.pact_slots.max - spells.pact_slots.used)
    : 0

  return (
    <Dialog
      open={open}
      title={isCantrip ? 'Использовать заговор?' : 'Кастовать заклинание?'}
      primaryLabel={canCast ? (busy ? 'Кастуем…' : 'Каст') : 'Нет ячеек'}
      secondaryLabel="Отмена"
      size={showTargets ? 'wide' : undefined}
      onPrimary={() => {
        if (!canCast || busy || !targetsOk) return
        onConfirm({
          usePact: !isCantrip && usePact && pactOk,
          slotLevel: isCantrip
            ? 0
            : usePact
              ? (spells.pact_slots?.level ?? spellLevel)
              : slotLevel,
          allyTargetIds: showTargets ? selectedIds : [],
          lobbyId: showTargets ? party.lobbyId : null,
        })
      }}
      onSecondary={onClose}
      busy={busy}
      primaryDisabled={!canCast || (showTargets && !targetsOk)}
    >
      <Stack gap={12}>
        <Text>
          <strong>{spell.name || 'Без названия'}</strong>
          {' · '}
          {levelLabel(spell.level)}
          {spell.concentration ? ' · концентрация' : ''}
          {spell.applies_to_allies ? ` · целей: ${targetCount}` : ''}
        </Text>
        {spell.damage || spell.attack_or_save || spell.range ? (
          <Text tone="muted">
            {[spell.casting_time, spell.range, spell.attack_or_save, spell.damage]
              .filter(Boolean)
              .join(' · ')}
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

        {showTargets ? (
          <>
            <AllyTargetFields
              count={targetCount}
              values={targetSlots}
              onChange={(index, characterIdNext) => {
                setTargetSlots((prev) => {
                  const next = [...prev]
                  next[index] = characterIdNext
                  return next
                })
              }}
              options={party.options}
              loading={party.loading}
              busy={busy}
              lobbyName={party.lobbyName}
              lobbies={party.lobbies}
              lobbyId={party.lobbyId}
              onLobbyIdChange={party.setLobbyId}
            />
            {duplicateTarget ? (
              <Text tone="danger">Одна и та же цель в двух слотах — выберите разных.</Text>
            ) : null}
            {selectedIds.length < targetCount ? (
              <Text tone="muted">
                Выбрано {selectedIds.length} из {targetCount}.
              </Text>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Dialog>
  )
}
