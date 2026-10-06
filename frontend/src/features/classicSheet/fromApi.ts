import type { CharacterDetail } from '../../shared/api/characters'
import {
  ABILITY_KEYS,
  SKILL_DEFS,
  asRecord,
  readNumber,
  type AbilityKey,
} from '../characters/sheetTypes'

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
  return ''
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
    textBlocks?: Record<string, string>
    otherProficiencies?: string
  },
): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))

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
      skills[skill.key] = block
    }
    sheet.skills = skills
  }
  if (edits.textBlocks) {
    const features = asRecord(sheet.features_text)
    const personality = asRecord(sheet.personality)
    const notes = asRecord(sheet.notes)
    const blocks = asRecord(sheet.text_blocks)
    for (const [key, value] of Object.entries(edits.textBlocks)) {
      if (key === 'features' || key === 'traits' || key === 'feats') features[key] = value
      else if (key === 'personality' || key === 'ideals' || key === 'bonds' || key === 'flaws') {
        personality[key] = value
      } else if (key === 'appearance' || key === 'background' || key === 'quests' || key === 'free') {
        notes[key] = value
      }
      const existing = asRecord(blocks[key])
      existing.value = value
      blocks[key] = existing
    }
    sheet.features_text = features
    sheet.personality = personality
    sheet.notes = notes
    sheet.text_blocks = blocks
  }
  if (edits.otherProficiencies != null) {
    setPath(sheet, ['notes', 'proficiencies'], edits.otherProficiencies)
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
