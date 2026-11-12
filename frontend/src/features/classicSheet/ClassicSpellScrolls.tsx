/**
 * Bound spell scrolls on the classic sheet. Cast uses the same gate and dialog as Play Desk.
 */
import { useState } from 'react'
import type { CharacterDetail, RulesEdition } from '../../shared/api/characters'
import { abilityModifier, asRecord } from '../characters/sheetTypes'
import { readClassLevels } from '../characters/classLevels'
import { readInventory, inventoryToSheet } from '../characters/inventory'
import { ignoresClassRaceLevel } from '../characters/attunementRules'
import { CastSpellDialog, type CastChoice } from '../characters/CastSpellDialog'
import { ScrollCastGate, useScrollSpellClasses } from '../characters/ScrollCastGate'
import {
  consumeScrollItem,
  listBoundSpellScrolls,
  resolveScrollClasses,
  scrollCastersFromProfiles,
  scrollCastBlockReason,
  spellScrollCastStats,
} from '../characters/spellScroll'
import { readSpells, type SheetSpell } from '../characters/spells'
import { classicCastProfiles } from './classicSpells'
import { classicEffectiveAbilities } from './classicDerivedCombat'
import type { ClassicPatch } from './fromApi'
import { Stack, Text } from '../../ui'

export function ClassicSpellScrolls({
  character,
  onPatch,
}: {
  character: CharacterDetail
  onPatch: (patch: ClassicPatch) => void
}) {
  const sheet = asRecord(character.sheet)
  const inventory = readInventory(sheet)
  const scrolls = listBoundSpellScrolls(inventory.items)
  const edition = character.rules_edition
  const index = useScrollSpellClasses(inventory.items, edition)
  const classes = readClassLevels(sheet, {
    className: character.class_name ?? '',
    level: character.level,
    subclassName: String(asRecord(sheet.identity).subclass_name ?? ''),
    classCatalogId: null,
  })
  const casters = scrollCastersFromProfiles(classicCastProfiles(character))
  const thief = ignoresClassRaceLevel(classes)
  const abilities = classicEffectiveAbilities(character)
  const spells = readSpells(sheet)
  const [scrollId, setScrollId] = useState<string | null>(null)
  const [castSpell, setCastSpell] = useState<SheetSpell | null>(null)
  const [lock, setLock] = useState<{ itemId: string; saveDc: number; attackBonus: number } | null>(
    null,
  )
  const [note, setNote] = useState('')
  if (scrolls.length === 0) return null
  const active = scrollId
    ? inventory.items.find((row) => row.id === scrollId) ?? null
    : null

  function writeItems(items: typeof inventory.items, message: string) {
    const nextSheet = { ...sheet, inventory: inventoryToSheet({ ...inventory, items }).inventory }
    onPatch({ sheet: nextSheet })
    setNote(message)
  }

  return (
    <div className="classic-scrolls">
      <Text>
        <strong>Свитки</strong>
      </Text>
      <Stack gap={4}>
        {scrolls.map((item) => {
          const binding = item.scroll_spell!
          const stats = spellScrollCastStats(binding.level)
          const block = scrollCastBlockReason(
            item,
            casters,
            thief,
            resolveScrollClasses(item, index.index, index.ready),
          )
          return (
            <div key={item.id} className="chip-row">
              <Text>
                {binding.name}
                {binding.level <= 0 ? ' · заговор' : ` · ${binding.level} круг`}
                {` · Сл ${stats.saveDc} · атака +${stats.attackBonus}`}
                {item.qty > 1 ? ` · ×${item.qty}` : ''}
              </Text>
              <button
                type="button"
                className="sheet-chip is-on"
                disabled={Boolean(block)}
                title={block ?? 'Каст со свитка'}
                onClick={() => setScrollId(item.id)}
              >
                {block ? 'нельзя' : 'Каст'}
              </button>
              {block ? <Text tone="muted">{block}</Text> : null}
            </div>
          )
        })}
      </Stack>
      {note ? <Text tone="muted">{note}</Text> : null}
      <ScrollCastGate
        open={scrollId != null && castSpell == null}
        item={active}
        spellClasses={
          active ? resolveScrollClasses(active, index.index, index.ready) : null
        }
        casters={casters}
        thiefRogue13={thief}
        abilityMod={(ability) => abilityModifier(abilities[ability])}
        edition={edition as RulesEdition}
        onOpenCast={(spell, itemId, stats) => {
          setLock({ itemId, saveDc: stats.saveDc, attackBonus: stats.attackBonus })
          setCastSpell(spell)
          setScrollId(null)
        }}
        onConsume={(itemId, message) => {
          writeItems(consumeScrollItem(inventory.items, itemId), message)
          setScrollId(null)
        }}
        onClose={() => setScrollId(null)}
      />
      <CastSpellDialog
        open={castSpell != null}
        spell={castSpell}
        spells={spells}
        inventoryItems={inventory.items}
        characterLevel={character.level}
        abilities={abilities}
        proficiencyBonus={2}
        statLock={lock ? { saveDc: lock.saveDc, attackBonus: lock.attackBonus } : null}
        scrollItemId={lock?.itemId ?? null}
        onConfirm={(_choice: CastChoice) => {
          if (!lock) return
          const spell = castSpell
          const items = consumeScrollItem(inventory.items, lock.itemId)
          const nextSheet: Record<string, unknown> = {
            ...sheet,
            inventory: inventoryToSheet({ ...inventory, items }).inventory,
          }
          if (spell?.concentration) {
            const combat = { ...asRecord(sheet.combat) }
            combat.concentration = {
              spell_id: `scroll:${lock.itemId}:${spell.catalog_id ?? spell.name}`,
              name: spell.name,
            }
            nextSheet.combat = combat
          }
          onPatch({ sheet: nextSheet })
          setNote(
            `Свиток: ${spell?.name ?? 'заклинание'} · Сл ${lock.saveDc} · +${lock.attackBonus} · израсходован`,
          )
          setCastSpell(null)
          setLock(null)
        }}
        onClose={() => {
          setCastSpell(null)
          setLock(null)
        }}
      />
    </div>
  )
}
