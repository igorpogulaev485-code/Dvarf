import { useEffect, useState } from 'react'
import { shareLobbyEffect } from '../../shared/api/lobbies'
import { ApiRequestError } from '../../shared/api/client'
import { Dialog, Stack, Text } from '../../ui'
import { AllyPickSection } from '../lobby/AllyPickSection'

type Props = {
  open: boolean
  characterId: string
  characterName: string
  abilityName: string
  /** Связать с текущей Conc кастера, если есть */
  linkConcentration?: boolean
  onClose: () => void
  /** После успешной раздачи (или без целей) — подтвердить трату ресурса */
  onSpent: () => void
  onToast: (message: string) => void
}

/**
 * Трата способности «на союзников» (вдохновение барда, инфузия…):
 * выбор целей вшит в сам жест, не отдельная кнопка «Раздать».
 */
export function UseAllyAbilityDialog({
  open,
  characterId,
  characterName,
  abilityName,
  linkConcentration = false,
  onClose,
  onSpent,
  onToast,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setLobbyId(null)
  }, [open, abilityName])

  if (!open) return null

  return (
    <Dialog
      open={open}
      title={abilityName || 'Способность'}
      primaryLabel={busy ? 'Применяем…' : 'Применить'}
      secondaryLabel="Отмена"
      busy={busy}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (selected.size === 0 || !lobbyId) {
          // Можно потратить «в никуда» — только ресурс
          onSpent()
          onClose()
          onToast(`${abilityName || 'Способность'} · без цели`)
          return
        }
        setBusy(true)
        shareLobbyEffect(lobbyId, {
          source_character_id: characterId,
          name: abilityName.trim() || 'Эффект',
          target_character_ids: [...selected],
          linked_concentration: linkConcentration,
        })
          .then((result) => {
            onSpent()
            onClose()
            onToast(
              result.applied > 0
                ? `${abilityName} · ${characterName} → ${result.applied}`
                : `${abilityName} применена`,
            )
          })
          .catch((err: unknown) => {
            onToast(
              err instanceof ApiRequestError ? err.message : 'Не удалось пометить союзников',
            )
          })
          .finally(() => setBusy(false))
      }}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Выберите, на ком висит «{abilityName || 'эффект'}». Пометка уйдёт в их листы и на
          стол.
        </Text>
        <AllyPickSection
          characterId={characterId}
          busy={busy}
          selected={selected}
          onSelectedChange={setSelected}
          lobbyId={lobbyId}
          onLobbyIdChange={setLobbyId}
        />
      </Stack>
    </Dialog>
  )
}
