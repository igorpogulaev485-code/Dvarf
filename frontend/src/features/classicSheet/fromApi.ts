import type { CharacterDetail } from '../../shared/api/characters'
import {
  createTextPart,
  readTextBlocks,
  textBlocksToSheet,
  withBlockPlainText,
  type TextBlock,
} from '../characters/textBlocks'
import {
  ABILITY_KEYS,
  SKILL_DEFS,
  asRecord,
  readNumber,
  type AbilityKey,
} from '../characters/sheetTypes'

/** Classic-only note mirrors that textBlocksToSheet does not always own. */
export const CLASSIC_EXTRA_NOTE_KEYS = new Set([
  'allies',
  'treasure',
  'attacks',
  'free',
  'appearance',
  'background',
  'quests',
])

/** Merge full text-block write-back without dropping classic-only note mirrors. */
export function mergeClassicTextBlocks(
  character: CharacterDetail,
  blocks: TextBlock[],
  extraNoteMirrors?: Record<string, string>,
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const packed = textBlocksToSheet(blocks)
  const prevNotes = asRecord(sheet.notes)
  const nextNotes = asRecord(packed.notes)

  sheet.text_blocks = packed.text_blocks
  sheet.text_blocks_order = packed.text_blocks_order
  sheet.features_text = {
    ...asRecord(sheet.features_text),
    ...asRecord(packed.features_text),
  }
  sheet.personality = {
    ...asRecord(sheet.personality),
    ...asRecord(packed.personality),
  }
  sheet.notes = {
    ...prevNotes,
    ...nextNotes,
    ...(extraNoteMirrors ?? {}),
  }
  return { sheet }
}

export type ClassicPatch = {
  name?: string
  level?: number
  class_name?: string | null
  race_name?: string | null
  hp_current?: number | null
  hp_max?: number | null
  sheet?: Record<string, unknown>
}

export function cloneSheet(sheet: Record<string, unknown>): Record<string, unknown> {
  return structuredClone(sheet)
}

function setPath(root: Record<string, unknown>, path: string[], value: unknown): void {
  let cursor = root
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i]
    const next = cursor[key]
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cursor[key] = {}
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  cursor[path[path.length - 1]] = value
}

export function abilityScore(character: CharacterDetail, key: AbilityKey): number {
  const abilities = asRecord(asRecord(character.sheet).abilities)
  return readNumber(asRecord(abilities[key]).score, 10)
}

export function isSaveProficient(character: CharacterDetail, key: AbilityKey): boolean {
  const saves = asRecord(asRecord(character.sheet).saves)
  return Boolean(asRecord(saves[key]).is_proficient)
}

export function skillFlags(character: CharacterDetail, key: string): {
  is_proficient: boolean
  is_expertise: boolean
} {
  const skills = asRecord(asRecord(character.sheet).skills)
  const block = asRecord(skills[key])
  return {
    is_proficient: Boolean(block.is_proficient),
    is_expertise: Boolean(block.is_expertise),
  }
}

export function combatField(character: CharacterDetail, key: string): unknown {
  return asRecord(asRecord(character.sheet).combat)[key]
}

export function identityField(character: CharacterDetail, key: string): unknown {
  return asRecord(asRecord(character.sheet).identity)[key]
}

export function textBlockValue(character: CharacterDetail, key: string): string {
  const sheet = asRecord(character.sheet)
  const features = asRecord(sheet.features_text)
  const personality = asRecord(sheet.personality)
  const notes = asRecord(sheet.notes)
  const blocks = asRecord(sheet.text_blocks)
  const fromBlocks = asRecord(blocks[key])
  if (typeof fromBlocks.value === 'string') return fromBlocks.value
  if (typeof features[key] === 'string') return features[key] as string
  if (typeof personality[key] === 'string') return personality[key] as string
  if (typeof notes[key] === 'string') return notes[key] as string
  // Classic P2: allies used to live under «quests» on early classic builds
  if (key === 'allies' && typeof notes.quests === 'string') return notes.quests
  return ''
}

/** Physical description fields on official 2014 page 2 header. */
export function physiqueField(character: CharacterDetail, key: string): string {
  const value = identityField(character, key)
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

export function applyClassicEdits(
  character: CharacterDetail,
  edits: {
    name?: string
    level?: number
    class_name?: string | null
    race_name?: string | null
    hp_current?: number | null
    hp_max?: number | null
    identity?: Record<string, unknown>
    combat?: Record<string, unknown>
    abilities?: Partial<Record<AbilityKey, number>>
    saveProficiency?: Partial<Record<AbilityKey, boolean>>
    skillProficiency?: Record<string, boolean>
    /** When true, also forces proficiency on. */
    skillExpertise?: Record<string, boolean>
    textBlocks?: Record<string, string>
    otherProficiencies?: string
    proficiencyBonus?: number
    /** Freeform classic equipment box (overrides derived item list). */
    equipmentText?: string
  },
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))

  if (edits.proficiencyBonus != null) {
    const proficiency = asRecord(sheet.proficiency)
    proficiency.bonus = edits.proficiencyBonus
    sheet.proficiency = proficiency
  }
  if (edits.identity) {
    const identity = asRecord(sheet.identity)
    Object.assign(identity, edits.identity)
    sheet.identity = identity
  }
  if (edits.combat) {
    const combat = asRecord(sheet.combat)
    Object.assign(combat, edits.combat)
    sheet.combat = combat
  }
  if (edits.abilities) {
    const abilities = asRecord(sheet.abilities)
    for (const key of ABILITY_KEYS) {
      if (edits.abilities[key] == null) continue
      const block = asRecord(abilities[key])
      block.score = edits.abilities[key]
      abilities[key] = block
    }
    sheet.abilities = abilities
  }
  if (edits.saveProficiency) {
    const saves = asRecord(sheet.saves)
    for (const key of ABILITY_KEYS) {
      if (edits.saveProficiency[key] == null) continue
      const block = asRecord(saves[key])
      block.is_proficient = edits.saveProficiency[key]
      saves[key] = block
    }
    sheet.saves = saves
  }
  if (edits.skillProficiency) {
    const skills = asRecord(sheet.skills)
    for (const skill of SKILL_DEFS) {
      if (edits.skillProficiency[skill.key] == null) continue
      const block = asRecord(skills[skill.key])
      block.base_stat = skill.base
      block.is_proficient = edits.skillProficiency[skill.key]
      // Turning proficiency off also clears expertise.
      if (!edits.skillProficiency[skill.key]) block.is_expertise = false
      skills[skill.key] = block
    }
    sheet.skills = skills
  }
  if (edits.skillExpertise) {
    const skills = asRecord(sheet.skills)
    for (const skill of SKILL_DEFS) {
      if (edits.skillExpertise[skill.key] == null) continue
      const block = asRecord(skills[skill.key])
      block.base_stat = skill.base
      const expertise = edits.skillExpertise[skill.key]
      block.is_expertise = expertise
      if (expertise) block.is_proficient = true
      skills[skill.key] = block
    }
    sheet.skills = skills
  }
  if (edits.textBlocks) {
    // Rebuild via the same path as the interactive sheet so `parts` stay in sync.
    let blocks = readTextBlocks(sheet)
    const extraMirrors: Record<string, string> = {}
    for (const [key, value] of Object.entries(edits.textBlocks)) {
      const index = blocks.findIndex((block) => block.key === key)
      if (index >= 0) {
        const next = [...blocks]
        next[index] = withBlockPlainText(next[index], value)
        blocks = next
      } else {
        const stub: TextBlock = withBlockPlainText(
          {
            key,
            defaultLabel: key,
            customLabel: null,
            isHidden: false,
            isCustom: false,
            value: '',
            resourceId: null,
            parts: [createTextPart('')],
          },
          value,
        )
        blocks = [...blocks, stub]
      }
      if (CLASSIC_EXTRA_NOTE_KEYS.has(key)) extraMirrors[key] = value
    }
    const patched = mergeClassicTextBlocks(
      { ...character, sheet },
      blocks,
      extraMirrors,
    )
    if (patched.sheet) Object.assign(sheet, patched.sheet)
  }
  if (edits.otherProficiencies != null) {
    setPath(sheet, ['notes', 'proficiencies'], edits.otherProficiencies)
  }
  if (edits.equipmentText != null) {
    const inventory = asRecord(sheet.inventory)
    inventory.classic_text = edits.equipmentText
    sheet.inventory = inventory
  }
  if (edits.hp_current !== undefined) {
    const combat = asRecord(sheet.combat)
    combat.hp_current = edits.hp_current
    sheet.combat = combat
  }
  if (edits.hp_max !== undefined) {
    const combat = asRecord(sheet.combat)
    combat.hp_max = edits.hp_max
    sheet.combat = combat
  }

  return {
    name: edits.name,
    level: edits.level,
    class_name: edits.class_name,
    race_name: edits.race_name,
    hp_current: edits.hp_current,
    hp_max: edits.hp_max,
    sheet,
  }
}

export function inventoryCoins(character: CharacterDetail): Record<string, string> {
  const coins = asRecord(asRecord(asRecord(character.sheet).inventory).coins)
  return {
    cp: String(coins.cp ?? ''),
    sp: String(coins.sp ?? ''),
    ep: String(coins.ep ?? ''),
    gp: String(coins.gp ?? ''),
    pp: String(coins.pp ?? ''),
  }
}

export function setCoins(character: CharacterDetail, coins: Record<string, string>): Record<string, unknown> {
  const sheet = cloneSheet(asRecord(character.sheet))
  const inventory = asRecord(sheet.inventory)
  inventory.coins = {
    cp: Number(coins.cp) || 0,
    sp: Number(coins.sp) || 0,
    ep: Number(coins.ep) || 0,
    gp: Number(coins.gp) || 0,
    pp: Number(coins.pp) || 0,
  }
  sheet.inventory = inventory
  return sheet
}

export function weaponsSummary(character: CharacterDetail): Array<{
  name: string
  attackBonus: string
  damageType: string
}> {
  const raw = asRecord(character.sheet).weapons
  if (!Array.isArray(raw)) return [{ name: '', attackBonus: '', damageType: '' }]
  const rows = raw.map((item) => {
    const row = asRecord(item)
    const damage = [row.damage, row.damage_type].filter((part) => typeof part === 'string' && part).join(' ')
    return {
      name: typeof row.name === 'string' ? row.name : '',
      attackBonus: typeof row.attack_bonus === 'string' ? row.attack_bonus : '',
      damageType: damage,
    }
  })
  while (rows.length < 3) rows.push({ name: '', attackBonus: '', damageType: '' })
  return rows.slice(0, 6)
}

export function equipmentText(character: CharacterDetail): string {
  const inventory = asRecord(asRecord(character.sheet).inventory)
  if (typeof inventory.classic_text === 'string') return inventory.classic_text
  const items = inventory.items
  if (!Array.isArray(items)) return typeof inventory.notes === 'string' ? inventory.notes : ''
  const names = items
    .map((item) => {
      const row = asRecord(item)
      return typeof row.name === 'string' ? row.name : ''
    })
    .filter(Boolean)
  const notes = typeof inventory.notes === 'string' ? inventory.notes : ''
  return [names.join(', '), notes].filter(Boolean).join('\n')
}

/**
 * Classic skill bubble cycle: none → proficient → expertise → none.
 * Matches how players usually mark the print sheet.
 */
export function cycleSkillMastery(
  character: CharacterDetail,
  skillKey: string,
): ReturnType<typeof applyClassicEdits> {
  const flags = skillFlags(character, skillKey)
  if (flags.is_expertise) {
    return applyClassicEdits(character, {
      skillProficiency: { [skillKey]: false },
      skillExpertise: { [skillKey]: false },
    })
  }
  if (flags.is_proficient) {
    return applyClassicEdits(character, { skillExpertise: { [skillKey]: true } })
  }
  return applyClassicEdits(character, { skillProficiency: { [skillKey]: true } })
}
