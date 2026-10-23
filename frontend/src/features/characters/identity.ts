import {
  parseCharacterGender,
  type CharacterGender,
} from '../../shared/dnd/characterGender'
import { canonicalLanguageList } from '../../shared/dnd/languages'
import { readNameList } from './languagesTools'
import { asRecord, readNumber } from './sheetTypes'

export type { CharacterGender }

export type ArmorProficiency = {
  light: boolean
  medium: boolean
  heavy: boolean
  shields: boolean
}

export type WeaponProficiency = {
  simple: boolean
  martial: boolean
  /** Specific weapons (рапира, короткий меч…) when not covered by simple/martial. */
  extras: string[]
}

/** Physical description — same keys as classic print page 2. */
export type PhysiqueFields = {
  age: string
  height: string
  weight: string
  eyes: string
  skin: string
  hair: string
}

export type IdentityExtras = {
  experience: number
  subclassName: string
  background: string
  /** Catalog slug when picked from kind=background; used for feat prereqs. */
  backgroundSlug: string | null
  alignment: string
  /** Character gender from create-pipeline / identity editor. */
  gender: CharacterGender | null
  size: string
  darkvision: number
  armor: ArmorProficiency
  weapons: WeaponProficiency
  languages: string[]
  tools: string[]
  /** Languages last applied from a race pick; removed on next race apply. */
  raceAppliedLanguages: string[]
  /** Рост / вес / возраст / глаза / кожа / волосы (B10). */
  physique: PhysiqueFields
}

export const EMPTY_PHYSIQUE: PhysiqueFields = {
  age: '',
  height: '',
  weight: '',
  eyes: '',
  skin: '',
  hair: '',
}

function readPhysiqueString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

export const EMPTY_ARMOR: ArmorProficiency = {
  light: false,
  medium: false,
  heavy: false,
  shields: false,
}

export const EMPTY_WEAPONS: WeaponProficiency = {
  simple: false,
  martial: false,
  extras: [],
}

export function readIdentityExtras(sheet: Record<string, unknown>): IdentityExtras {
  const identity = asRecord(sheet.identity)
  const combat = asRecord(sheet.combat)
  const proficiency = asRecord(sheet.proficiency)
  const armor = asRecord(proficiency.armor)
  const weapons = asRecord(proficiency.weapons)

  return {
    experience: Math.max(0, Math.floor(readNumber(identity.experience, 0))),
    subclassName: typeof identity.subclass_name === 'string' ? identity.subclass_name : '',
    background: typeof identity.background === 'string' ? identity.background : '',
    backgroundSlug:
      typeof identity.background_slug === 'string' && identity.background_slug.trim()
        ? identity.background_slug.trim()
        : typeof identity.backgroundSlug === 'string' && identity.backgroundSlug.trim()
          ? identity.backgroundSlug.trim()
          : null,
    alignment: typeof identity.alignment === 'string' ? identity.alignment : '',
    gender: parseCharacterGender(identity.gender),
    size: typeof identity.size === 'string' && identity.size.trim() ? identity.size : 'medium',
    darkvision: Math.max(0, Math.floor(readNumber(combat.darkvision, 0))),
    armor: {
      light: Boolean(armor.light),
      medium: Boolean(armor.medium),
      heavy: Boolean(armor.heavy),
      shields: Boolean(armor.shields),
    },
    weapons: {
      simple: Boolean(weapons.simple),
      martial: Boolean(weapons.martial),
      extras: readNameList(weapons.extras),
    },
    languages: canonicalLanguageList(readNameList(proficiency.languages)),
    tools: readNameList(proficiency.tools),
    raceAppliedLanguages: canonicalLanguageList(readNameList(identity.race_applied_languages)),
    physique: {
      age: readPhysiqueString(identity.age),
      height: readPhysiqueString(identity.height),
      weight: readPhysiqueString(identity.weight),
      eyes: readPhysiqueString(identity.eyes),
      skin: readPhysiqueString(identity.skin),
      hair: readPhysiqueString(identity.hair),
    },
  }
}

export function identityExtrasToSheet(extras: IdentityExtras): {
  identityPatch: Record<string, unknown>
  combatPatch: { darkvision: number }
  proficiencyPatch: {
    armor: ArmorProficiency
    weapons: WeaponProficiency
    languages: string[]
    tools: string[]
  }
} {
  return {
    identityPatch: {
      experience: Math.max(0, Math.floor(extras.experience)),
      subclass_name: extras.subclassName.trim() || null,
      background: extras.background.trim() || null,
      background_slug: extras.backgroundSlug?.trim() || null,
      alignment: extras.alignment.trim() || null,
      gender: extras.gender,
      size: extras.size.trim() || 'medium',
      race_applied_languages: extras.raceAppliedLanguages
        .map((item) => item.trim())
        .filter(Boolean),
      age: extras.physique.age.trim() || null,
      height: extras.physique.height.trim() || null,
      weight: extras.physique.weight.trim() || null,
      eyes: extras.physique.eyes.trim() || null,
      skin: extras.physique.skin.trim() || null,
      hair: extras.physique.hair.trim() || null,
    },
    combatPatch: {
      darkvision: Math.max(0, Math.floor(extras.darkvision)),
    },
    proficiencyPatch: {
      armor: { ...extras.armor },
      weapons: {
        simple: extras.weapons.simple,
        martial: extras.weapons.martial,
        extras: (extras.weapons.extras ?? []).map((item) => item.trim()).filter(Boolean),
      },
      languages: extras.languages.map((item) => item.trim()).filter(Boolean),
      tools: extras.tools.map((item) => item.trim()).filter(Boolean),
    },
  }
}

export const ARMOR_PROF_OPTIONS: Array<{ key: keyof ArmorProficiency; label: string }> = [
  { key: 'light', label: 'Лёгкие' },
  { key: 'medium', label: 'Средние' },
  { key: 'heavy', label: 'Тяжёлые' },
  { key: 'shields', label: 'Щиты' },
]

export const WEAPON_PROF_OPTIONS: Array<{
  key: 'simple' | 'martial'
  label: string
}> = [
  { key: 'simple', label: 'Простое' },
  { key: 'martial', label: 'Воинское' },
]
