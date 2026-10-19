import { useEffect, useMemo, useState } from 'react'
import { Dialog, Stack, Text } from '../../ui'
import { AllyTargetFields } from '../lobby/AllyTargetFields'
import { useLobbyParty, type AllyPickDemo } from '../lobby/useLobbyParty'

type Props = {
  open: boolean
  characterId: string
  characterName: string
  abilityName: string
  /** Сколько слотов целей (обычно 1 для вдохновения барда); заполнение необязательно */
  targetCount?: number
  allyDemo?: AllyPickDemo | null
  onClose: () => void
  /** После выбора целей (может быть пусто) — списать ресурс */
  onConfirm: (targetIds: string[], lobbyId: string | null) => void
  onToast?: (message: string) => void
}

/**
 * Трата способности на союзника/себя: тот же паттерн, что у каста —
 * Field + play-select. Цели необязательны.
 */
export function UseAllyAbilityDialog({
  open,
  characterId,
  characterName,
  abilityName,
  targetCount = 1,
  allyDemo = null,
  onClose,
  onConfirm,
  onToast,
}: Props) {
  const count = Math.max(1, Math.min(6, targetCount))
  const [targetSlots, setTargetSlots] = useState<string[]>(() =>
    Array.from({ length: count }, () => ''),
  )
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

  const targetsOk = !duplicateTarget

  if (!open) return null

  return (
    <Dialog
      open={open}
      title={abilityName || 'Способность'}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      primaryDisabled={!targetsOk}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!targetsOk) return
        if (allyDemo) {
          onConfirm(selectedIds, 'demo-lobby')
          onClose()
          onToast?.(
            selectedIds.length > 0
              ? `${abilityName} · ${characterName} → ${selectedIds.length}`
              : `${abilityName} · ${characterName}`,
          )
          return
        }
        if (selectedIds.length > 0 && !party.lobbyId) {
          onToast?.('Нет лобби для целей')
          return
        }
        onConfirm(selectedIds, party.lobbyId)
        onClose()
      }}
    >
      <Stack gap={12}>
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
