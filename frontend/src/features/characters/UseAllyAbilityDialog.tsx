import { useEffect, useMemo, useState } from 'react'
import { shareLobbyEffect } from '../../shared/api/lobbies'
import { ApiRequestError } from '../../shared/api/client'
import { Dialog, Stack, Text } from '../../ui'
import { AllyTargetFields } from '../lobby/AllyTargetFields'
import { useLobbyParty, type AllyPickDemo } from '../lobby/useLobbyParty'

type Props = {
  open: boolean
  characterId: string
  characterName: string
  abilityName: string
  /** Сколько целей (обычно 1 для вдохновения барда) */
  targetCount?: number
  linkConcentration?: boolean
  allyDemo?: AllyPickDemo | null
  onClose: () => void
  onSpent: () => void
  onToast: (message: string) => void
}

/**
 * Трата способности на союзника/себя: та же форма, что у каста —
 * Field + select (себя можно выбрать или нет).
 */
export function UseAllyAbilityDialog({
  open,
  characterId,
  characterName,
  abilityName,
  targetCount = 1,
  linkConcentration = false,
  allyDemo = null,
  onClose,
  onSpent,
  onToast,
}: Props) {
  const count = Math.max(1, Math.min(6, targetCount))
  const [targetSlots, setTargetSlots] = useState<string[]>(() =>
    Array.from({ length: count }, () => ''),
  )
  const [busy, setBusy] = useState(false)
  const party = useLobbyParty(open ? characterId : undefined, allyDemo)

  useEffect(() => {
    if (!open) return
    setTargetSlots(Array.from({ length: count }, () => ''))
  }, [open, abilityName, count])

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

  const targetsOk = selectedIds.length === count && !duplicateTarget

  if (!open) return null

  return (
    <Dialog
      open={open}
      title={abilityName || 'Способность'}
      primaryLabel={busy ? 'Применяем…' : 'Применить'}
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!targetsOk}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!targetsOk) return
        if (allyDemo) {
          onSpent()
          onClose()
          onToast(`${abilityName} · ${characterName} → ${selectedIds.length}`)
          return
        }
        if (!party.lobbyId) {
          onToast('Нет лобби для целей')
          return
        }
        setBusy(true)
        shareLobbyEffect(party.lobbyId, {
          source_character_id: characterId,
          name: abilityName.trim() || 'Эффект',
          target_character_ids: selectedIds,
          linked_concentration: linkConcentration,
        })
          .then((result) => {
            onSpent()
            onClose()
            onToast(
              result.applied > 0
                ? `${abilityName} · ${result.applied}`
                : `${abilityName} применена`,
            )
          })
          .catch((err: unknown) => {
            onToast(
              err instanceof ApiRequestError ? err.message : 'Не удалось пометить цели',
            )
          })
          .finally(() => setBusy(false))
      }}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Выберите {count === 1 ? 'кого' : `${count} целей`}. Себя можно включить в любой
          слот — или не включать.
        </Text>
        <AllyTargetFields
          count={count}
          values={targetSlots}
          onChange={(index, nextId) => {
            setTargetSlots((prev) => {
              const next = [...prev]
              next[index] = nextId
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
      </Stack>
    </Dialog>
  )
}
