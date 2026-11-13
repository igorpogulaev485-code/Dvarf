/**
 * B-01 / B04 / Р15: live-refresh combat.effects via lobby WS (#299) or 15s poll.
 * B-02: also pull hp_max / hp_current / hp_temp so Aid / temp HP land on allies.
 * S-07: также inventory (передача / выдача мастером).
 */
import { useEffect, useRef } from 'react'
import { getCharacter } from '../../shared/api/characters'
import { useLobbyRealtime } from '../lobby/useLobbyRealtime'
import { useLobbyParty } from '../lobby/useLobbyParty'
import { parseActiveEffects, type ActiveEffect } from '../../shared/dnd/activeEffects'
import { asRecord } from './sheetTypes'
import { readInventory, type InventoryState } from './inventory'

const POLL_MS = 15_000

export type SheetEffectsCombatPatch = {
  effects: ActiveEffect[]
  sheetVersion: number
  hpMax?: number | null
  hpCurrent?: number | null
  hpTemp?: number | null
  /** S-07: полный кошелёк и вещи с сервера. */
  inventory?: InventoryState
}

type Args = {
  characterId: string | undefined
  enabled?: boolean
  /** Merge remote effects (+ optional HP) into the open draft without wiping other edits. */
  onEffects: (patch: SheetEffectsCombatPatch) => void
}

export function useSheetEffectsRealtime({
  characterId,
  enabled = true,
  onEffects,
}: Args): void {
  const party = useLobbyParty(enabled ? characterId : undefined)
  const onEffectsRef = useRef(onEffects)
  onEffectsRef.current = onEffects
  const lastVersionRef = useRef(0)

  async function pull() {
    if (!characterId) return
    try {
      const fresh = await getCharacter(characterId)
      if (fresh.sheet_version <= lastVersionRef.current) return
      lastVersionRef.current = fresh.sheet_version
      const combat = asRecord(asRecord(fresh.sheet).combat)
      const hpMax =
        typeof combat.hp_max === 'number'
          ? combat.hp_max
          : fresh.hp_max
      const hpCurrent =
        typeof combat.hp_current === 'number'
          ? combat.hp_current
          : fresh.hp_current
      const hpTemp =
        typeof combat.hp_temp === 'number' ? Math.max(0, combat.hp_temp) : null
      onEffectsRef.current({
        effects: parseActiveEffects(combat.effects),
        sheetVersion: fresh.sheet_version,
        hpMax,
        hpCurrent,
        hpTemp,
        inventory: readInventory(fresh.sheet),
      })
    } catch {
      // ignore transient network errors
    }
  }

  useLobbyRealtime(
    enabled ? party.lobbyId : null,
    (data) => {
      if (!characterId) return
      if (data.type === 'sheet_effects_changed') {
        const ids = Array.isArray(data.character_ids)
          ? data.character_ids.map(String)
          : []
        if (ids.length === 0 || ids.includes(characterId)) void pull()
        return
      }
      if (data.type === 'lobby_resync') void pull()
    },
    () => {
      void pull()
    },
  )

  useEffect(() => {
    if (!enabled || !characterId) return
    void pull()
    const timer = window.setInterval(() => {
      void pull()
    }, POLL_MS)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pull uses refs
  }, [enabled, characterId, party.lobbyId])
}
