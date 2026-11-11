import type { CharacterDetail } from '../../shared/api/characters'
import {
  formatSpellComponents,
  spellSchoolLabelRu,
  type SpellComponents,
} from '../../shared/dnd/spellCatalog'
import type { SheetSpell } from '../characters/spells'
import { classicSpellsState } from './classicSpells'

/** Poker / MTG size — easy to cut and sleeve (same idea as LSS cards). */
export const SPELL_CARDS_PER_PAGE = 9

/** Rough body capacity for one card face (chars). Continuations carry the rest. */
const CARD_BODY_CHARS = 420

export type SpellCardFace = {
  key: string
  spellId: string
  name: string
  levelLabel: string
  school: string
  badges: string[]
  castingTime: string
  range: string
  components: string
  duration: string
  attackOrSave: string
  damage: string
  body: string
  part: number
  partsTotal: number
  isContinuation: boolean
}

function levelLabel(level: number): string {
  if (level <= 0) return 'Заговор'
  return `${level} круг`
}

function componentsLabel(components: SpellComponents | undefined): string {
  if (!components) return ''
  return formatSpellComponents(components)
}

function buildBody(spell: SheetSpell): string {
  const chunks: string[] = []
  if (spell.description?.trim()) chunks.push(spell.description.trim())
  if (spell.higher_levels?.trim()) {
    chunks.push(`На больших уровнях. ${spell.higher_levels.trim()}`)
  }
  if (spell.notes?.trim()) chunks.push(spell.notes.trim())
  return chunks.join('\n\n')
}

function splitBody(text: string, maxChars: number): string[] {
  const trimmed = text.trim()
  if (!trimmed) return ['']
  if (trimmed.length <= maxChars) return [trimmed]

  const parts: string[] = []
  let rest = trimmed
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(' ', maxChars)
    if (cut < maxChars * 0.55) cut = maxChars
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts.length ? parts : ['']
}

export function spellToCardFaces(spell: SheetSpell): SpellCardFace[] {
  const name = spell.name.trim()
  if (!name) return []

  const bodies = splitBody(buildBody(spell), CARD_BODY_CHARS)
  const partsTotal = bodies.length
  const school = spell.school ? spellSchoolLabelRu(spell.school) : ''
  const badges: string[] = []
  if (spell.ritual) badges.push('Ритуал')
  if (spell.concentration) badges.push('Концентрация')
  if (spell.prepared && spell.level > 0) badges.push('Подг.')

  return bodies.map((body, index) => ({
    key: `${spell.id}-p${index + 1}`,
    spellId: spell.id,
    name,
    levelLabel: levelLabel(spell.level),
    school,
    badges,
    castingTime: spell.casting_time || '',
    range: spell.range || '',
    components: componentsLabel(spell.components),
    duration: spell.duration || '',
    attackOrSave: spell.attack_or_save || '',
    damage: spell.damage || '',
    body,
    part: index + 1,
    partsTotal,
    isContinuation: index > 0,
  }))
}

export function classicSpellCardFaces(character: CharacterDetail): SpellCardFace[] {
  const spells = classicSpellsState(character).known
  const faces: SpellCardFace[] = []
  for (const spell of spells) {
    faces.push(...spellToCardFaces(spell))
  }
  return faces
}

export function chunkSpellCardPages(faces: SpellCardFace[]): SpellCardFace[][] {
  if (faces.length === 0) return []
  const pages: SpellCardFace[][] = []
  for (let i = 0; i < faces.length; i += SPELL_CARDS_PER_PAGE) {
    pages.push(faces.slice(i, i + SPELL_CARDS_PER_PAGE))
  }
  return pages
}
