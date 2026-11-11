/**
 * TCE artificer spellcasting focus.
 * An artificer spell with an M component needs thieves' tools or artisan's tools
 * in hand, an item that bears one of your infusions (in hand / worn), the
 * armorer's worn Arcane Armor, or the artillerist's held Arcane Firearm.
 * V/S spells (no M) do not need a focus. A component pouch does not replace
 * the class focus. Stowed items and qty 0 do not count.
 */

export type ArtificerFocusItem = {
  id: string
  name: string
  qty?: number | null
  equipped?: boolean | null
  armor_kind?: string | null
  spell_tooling?: string | null
}

const TOOL_RE =
  /инструмент|воровск|thieves|alchemist|artisan|tools/i

const FIREARM_RE = /жезл|посох|ижезл|wand|rod|staff/i

export function isArtisanToolName(name: string): boolean {
  return TOOL_RE.test(name.trim())
}

export function isBodyArmorKind(kind: string | null | undefined): boolean {
  return kind === 'light' || kind === 'medium' || kind === 'heavy'
}

export function artificerFocusGate(input: {
  classSlug: string | null | undefined
  /** Material text. `undefined` = no M component. `''` = unspecified M. */
  material: string | undefined
  items: ArtificerFocusItem[]
  /** Armorer with the Arcane Armor feature. */
  arcaneArmor: boolean
  /** Artillerist with Arcane Firearm (a held wand/staff/rod). */
  arcaneFirearm: boolean
  /** Inventory ids of items bearing this artificer's own infusions. */
  infusedItemIds?: ReadonlySet<string>
}): { ok: boolean; message: string } {
  const slug = (input.classSlug ?? '').trim().toLowerCase()
  if (slug !== 'artificer') return { ok: true, message: '' }
  if (input.material === undefined) return { ok: true, message: '' }

  const infused = input.infusedItemIds ?? new Set<string>()
  const present = input.items.filter((item) => (item.qty ?? 1) > 0 && item.equipped)
  const tool = present.some((item) => isArtisanToolName(item.name))
  const infusedHeld = present.some((item) => infused.has(item.id))
  const armor =
    input.arcaneArmor &&
    input.items.some(
      (item) =>
        (item.qty ?? 1) > 0 &&
        item.equipped &&
        isBodyArmorKind(item.armor_kind),
    )
  const firearm =
    input.arcaneFirearm &&
    present.some((item) => FIREARM_RE.test(item.name))

  if (tool || infusedHeld || armor || firearm) {
    return { ok: true, message: 'Фокус изобретателя готов' }
  }
  return {
    ok: false,
    message:
      'Заклинание изобретателя с М: нужен инструмент в руке (не «убран» и не 0), надетый магический доспех бронника или предмет с вашей инфузией',
  }
}
