/**
 * DMG p. 200 gate before the shared cast dialog.
 * A failed check spends the scroll. Success opens CastSpellDialog.
 */
import { useEffect, useRef, useState } from 'react'
import { listCatalogEntries } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { SPELLCASTING_ABILITY_LABELS, type SpellcastingAbility } from '../../shared/dnd/spells'
import { Dialog, Stack, Text } from '../../ui'
import { rollCheck } from './deskRolls'
import { sheetSpellForScroll } from './itemSpellCast'
import type { InventoryItem } from './inventory'
import {
  isCastableSpellScroll,
  scrollReadGate,
  spellScrollCastStats,
  type ScrollCaster,
  type SpellScrollCastStats,
} from './spellScroll'
import type { SheetSpell } from './spells'

export function useScrollSpellClasses(
  items: InventoryItem[],
  edition: RulesEdition,
): { ready: boolean; index: Record<string, string[]> } {
  const needs = items.some(
    (item) => item.scroll_spell && item.qty > 0 && !item.scroll_spell.classes,
  )
  const [index, setIndex] = useState<Record<string, string[]>>({})
  const [ready, setReady] = useState(!needs)
  useEffect(() => {
    if (!needs) {
      setReady(true)
      return
    }
    let cancel = false
    setReady(false)
    listCatalogEntries({ kind: 'spell', edition })
      .then((rows) => {
        if (cancel) return
        const next: Record<string, string[]> = {}
        for (const row of rows) {
          const raw = row.data?.classes
          const classes = Array.isArray(raw)
            ? raw.filter((item): item is string => typeof item === 'string')
            : []
          next[row.id] = classes
          next[row.slug] = classes
        }
        setIndex(next)
        setReady(true)
      })
      .catch(() => {
        if (!cancel) setReady(true)
      })
    return () => {
      cancel = true
    }
  }, [needs, edition])
  return { ready, index }
}

type ScrollCastGateProps = {
  open: boolean
  item: InventoryItem | null
  spellClasses: string[] | null
  casters: ScrollCaster[]
  thiefRogue13: boolean
  abilityMod: (ability: SpellcastingAbility) => number
  edition: RulesEdition
  onOpenCast: (spell: SheetSpell, itemId: string, stats: SpellScrollCastStats) => void
  onConsume: (itemId: string, message: string) => void
  onClose: () => void
}

export function ScrollCastGate({
  open,
  item,
  spellClasses,
  casters,
  thiefRogue13,
  abilityMod,
  edition,
  onOpenCast,
  onConsume,
  onClose,
}: ScrollCastGateProps) {
  const [rolling, setRolling] = useState(false)
  const openRef = useRef(onOpenCast)
  const closeRef = useRef(onClose)
  openRef.current = onOpenCast
  closeRef.current = onClose
  const binding = item?.scroll_spell ?? null
  const gate =
    binding && isCastableSpellScroll(item!)
      ? scrollReadGate({
          spellLevel: binding.level,
          spellClasses,
          casters,
          thiefRogue13,
        })
      : null

  const gateStatus = gate?.status ?? ''
  useEffect(() => {
    if (!open || !item || !binding || gateStatus !== 'cast') return
    let cancel = false
    const itemId = item.id
    const level = binding.level
    void sheetSpellForScroll(binding, edition).then((spell) => {
      if (cancel || !spell) return
      openRef.current(spell, itemId, spellScrollCastStats(level))
      closeRef.current()
    })
    return () => {
      cancel = true
    }
  }, [open, item?.id, binding?.slug, binding?.level, binding?.name, binding?.catalog_id, gateStatus, edition])

  if (!open || !item || !binding || !gate || gate.status === 'cast') return null

  if (gate.status === 'unknown') {
    return (
      <Dialog open title="Свиток заклинания" primaryLabel="Понятно" onPrimary={onClose}>
        <Text>Сверяем заклинание со списком класса…</Text>
      </Dialog>
    )
  }

  if (gate.status === 'blocked') {
    return (
      <Dialog open title="Свиток не прочесть" primaryLabel="Понятно" onPrimary={onClose}>
        <Stack gap={8}>
          <Text>
            <strong>{binding.name}</strong>
          </Text>
          <Text>{gate.reason}</Text>
        </Stack>
      </Dialog>
    )
  }

  const mod = abilityMod(gate.ability)
  const label = SPELLCASTING_ABILITY_LABELS[gate.ability]

  return (
    <Dialog
      open
      title="Проверка свитка"
      primaryLabel={rolling ? 'Бросаем…' : 'Бросить проверку'}
      secondaryLabel="Отмена"
      busy={rolling}
      onSecondary={onClose}
      onPrimary={() => {
        if (rolling) return
        setRolling(true)
        const roll = rollCheck(mod, 'normal')
        const success = roll.total >= gate.dc
        if (!success) {
          onConsume(
            item.id,
            `Свиток: ${binding.name} · проверка ${label} ${roll.total} против Сл ${gate.dc} · провал, свиток потрачен, эффекта нет`,
          )
          setRolling(false)
          onClose()
          return
        }
        void sheetSpellForScroll(binding, edition).then((spell) => {
          setRolling(false)
          if (!spell) {
            onClose()
            return
          }
          onOpenCast(spell, item.id, spellScrollCastStats(binding.level))
          onClose()
        })
      }}
    >
      <Stack gap={8}>
        <Text>
          <strong>{binding.name}</strong>
          {binding.level <= 0 ? ' · заговор' : ` · ${binding.level} круг`}
        </Text>
        <Text>
          Заклинание в списке класса, но круг выше доступного. Проверка {label}{' '}
          {mod >= 0 ? `+${mod}` : mod}, Сл {gate.dc}. Успех — каст свитка. Провал — свиток
          рассыпается, эффекта нет.
        </Text>
      </Stack>
    </Dialog>
  )
}
