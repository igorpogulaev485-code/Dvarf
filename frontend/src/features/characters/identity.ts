import { readNameList } from './languagesTools'
import { asRecord, readNumber } from './sheetTypes'

export type ArmorProficiency = {
  light: boolean
  medium: boolean
  heavy: boolean
  shields: boolean
}

export type WeaponProficiency = {
  simple: boolean
  martial: boolean
}

export type IdentityExtras = {
  experience: number
  subclassName: string
  background: string
  /** Catalog slug when picked from kind=background; used for feat prereqs. */
  backgroundSlug: string | null
  alignment: string
  size: string
  darkvision: number
  armor: ArmorProficiency
  weapons: WeaponProficiency
  languages: string[]
  tools: string[]
  /** Languages last applied from a race pick; removed on next race apply. */
  raceAppliedLanguages: string[]
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
    },
    languages: readNameList(proficiency.languages),
    tools: readNameList(proficiency.tools),
    raceAppliedLanguages: readNameList(identity.race_applied_languages),
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
      size: extras.size.trim() || 'medium',
      race_applied_languages: extras.raceAppliedLanguages
        .map((item) => item.trim())
        .filter(Boolean),
    },
    combatPatch: {
      darkvision: Math.max(0, Math.floor(extras.darkvision)),
    },
    proficiencyPatch: {
      armor: { ...extras.armor },
      weapons: { ...extras.weapons },
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

export const WEAPON_PROF_OPTIONS: Array<{ key: keyof WeaponProficiency; label: string }> = [
  { key: 'simple', label: 'Простое' },
  { key: 'martial', label: 'Воинское' },
]
