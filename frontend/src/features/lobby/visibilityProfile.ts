/** Профиль видимости лобби (наследуется всеми сессиями). Референс IA — LSS, визуал — наш кит. */

export type EventHistoryMode = 'active' | 'hide_master_rolls' | 'off'
export type FieldMode = 'active' | 'off'
export type HpMode = 'active' | 'color_only' | 'off'
export type FieldPreset = 'all' | 'complex_combat' | 'minimum' | 'custom'

export type VisibilityProfile = {
  event_history: EventHistoryMode
  preset: FieldPreset
  fields: {
    identity: {
      enabled: boolean
      name: FieldMode
      portrait: FieldMode
      race_class: FieldMode
    }
    health: {
      enabled: boolean
      hp: HpMode
      death_saves: FieldMode
      conditions: FieldMode
      hit_dice: FieldMode
    }
    progression: {
      enabled: boolean
      xp: FieldMode
    }
    abilities: {
      enabled: boolean
      passives: FieldMode
      saves: FieldMode
      scores: FieldMode
      skills: FieldMode
    }
    combat: {
      enabled: boolean
      ac: FieldMode
      initiative: FieldMode
      movement: FieldMode
      attacks: FieldMode
    }
    magic: {
      enabled: boolean
      caster: FieldMode
      slots: FieldMode
      pact: FieldMode
      prepared: FieldMode
    }
    resources: {
      enabled: boolean
      resources: FieldMode
      inspiration: FieldMode
    }
    economy: {
      enabled: boolean
      coins: FieldMode
    }
  }
}

export const VISIBILITY_FIELD_META: Record<
  keyof VisibilityProfile['fields'],
  { label: string; keys: Array<{ key: string; label: string; modes?: Array<'active' | 'off' | 'color_only'> }> }
> = {
  identity: {
    label: 'Личность',
    keys: [
      { key: 'name', label: 'Имя персонажа' },
      { key: 'portrait', label: 'Портрет' },
      { key: 'race_class', label: 'Раса и класс' },
    ],
  },
  health: {
    label: 'Здоровье',
    keys: [
      { key: 'hp', label: 'Здоровье', modes: ['active', 'color_only', 'off'] },
      { key: 'death_saves', label: 'Спасброски от смерти' },
      { key: 'conditions', label: 'Состояния' },
      { key: 'hit_dice', label: 'Кости хитов' },
    ],
  },
  progression: {
    label: 'Прогрессия',
    keys: [{ key: 'xp', label: 'Опыт' }],
  },
  abilities: {
    label: 'Характеристики',
    keys: [
      { key: 'passives', label: 'Пассивные чувства' },
      { key: 'saves', label: 'Спасброски' },
      { key: 'scores', label: 'Характеристики' },
      { key: 'skills', label: 'Навыки' },
    ],
  },
  combat: {
    label: 'Бой',
    keys: [
      { key: 'ac', label: 'Класс доспеха' },
      { key: 'initiative', label: 'Инициатива' },
      { key: 'movement', label: 'Параметры движения' },
      { key: 'attacks', label: 'Атаки' },
    ],
  },
  magic: {
    label: 'Магия',
    keys: [
      { key: 'caster', label: 'Параметры заклинателя' },
      { key: 'slots', label: 'Ячейки заклинаний' },
      { key: 'pact', label: 'Ячейки договора' },
      { key: 'prepared', label: 'Подготовленные заклинания' },
    ],
  },
  resources: {
    label: 'Ресурсы',
    keys: [
      { key: 'resources', label: 'Ресурсы' },
      { key: 'inspiration', label: 'Вдохновение' },
    ],
  },
  economy: {
    label: 'Экономика',
    keys: [{ key: 'coins', label: 'Монеты' }],
  },
}

function allActive(): VisibilityProfile {
  return {
    event_history: 'active',
    preset: 'all',
    fields: {
      identity: { enabled: true, name: 'active', portrait: 'active', race_class: 'active' },
      health: {
        enabled: true,
        hp: 'active',
        death_saves: 'active',
        conditions: 'active',
        hit_dice: 'active',
      },
      progression: { enabled: true, xp: 'active' },
      abilities: {
        enabled: true,
        passives: 'active',
        saves: 'active',
        scores: 'active',
        skills: 'active',
      },
      combat: {
        enabled: true,
        ac: 'active',
        initiative: 'active',
        movement: 'active',
        attacks: 'active',
      },
      magic: {
        enabled: true,
        caster: 'active',
        slots: 'active',
        pact: 'active',
        prepared: 'active',
      },
      resources: { enabled: true, resources: 'active', inspiration: 'active' },
      economy: { enabled: true, coins: 'active' },
    },
  }
}

function complexCombat(): VisibilityProfile {
  const base = allActive()
  return {
    ...base,
    preset: 'complex_combat',
    fields: {
      ...base.fields,
      progression: { enabled: false, xp: 'off' },
      economy: { enabled: false, coins: 'off' },
      health: {
        enabled: true,
        hp: 'color_only',
        death_saves: 'off',
        conditions: 'active',
        hit_dice: 'off',
      },
    },
  }
}

function minimum(): VisibilityProfile {
  return {
    event_history: 'active',
    preset: 'minimum',
    fields: {
      identity: { enabled: true, name: 'active', portrait: 'active', race_class: 'active' },
      health: {
        enabled: true,
        hp: 'color_only',
        death_saves: 'off',
        conditions: 'off',
        hit_dice: 'off',
      },
      progression: { enabled: false, xp: 'off' },
      abilities: {
        enabled: false,
        passives: 'off',
        saves: 'off',
        scores: 'off',
        skills: 'off',
      },
      combat: {
        enabled: true,
        ac: 'active',
        initiative: 'off',
        movement: 'off',
        attacks: 'off',
      },
      magic: {
        enabled: false,
        caster: 'off',
        slots: 'off',
        pact: 'off',
        prepared: 'off',
      },
      resources: { enabled: false, resources: 'off', inspiration: 'off' },
      economy: { enabled: false, coins: 'off' },
    },
  }
}

export function defaultVisibilityProfile(): VisibilityProfile {
  return allActive()
}

export function applyVisibilityPreset(
  preset: Exclude<FieldPreset, 'custom'>,
): VisibilityProfile {
  if (preset === 'complex_combat') return complexCombat()
  if (preset === 'minimum') return minimum()
  return allActive()
}

export function normalizeVisibilityProfile(raw: unknown): VisibilityProfile {
  const fallback = defaultVisibilityProfile()
  if (!raw || typeof raw !== 'object') return fallback
  const obj = raw as Partial<VisibilityProfile>
  const merged: VisibilityProfile = {
    event_history:
      obj.event_history === 'hide_master_rolls' || obj.event_history === 'off'
        ? obj.event_history
        : 'active',
    preset:
      obj.preset === 'complex_combat' ||
      obj.preset === 'minimum' ||
      obj.preset === 'custom' ||
      obj.preset === 'all'
        ? obj.preset
        : 'all',
    fields: { ...fallback.fields },
  }
  for (const section of Object.keys(fallback.fields) as Array<keyof VisibilityProfile['fields']>) {
    const incoming = obj.fields?.[section]
    if (incoming && typeof incoming === 'object') {
      merged.fields[section] = { ...fallback.fields[section], ...incoming } as never
    }
  }
  return merged
}

export function sectionCheckboxState(
  section: VisibilityProfile['fields'][keyof VisibilityProfile['fields']],
): 'on' | 'off' | 'partial' {
  if (!section.enabled) return 'off'
  const values = Object.entries(section)
    .filter(([k]) => k !== 'enabled')
    .map(([, v]) => v)
  const activeCount = values.filter((v) => v !== 'off').length
  if (activeCount === 0) return 'partial'
  if (activeCount === values.length && !values.includes('color_only')) return 'on'
  if (activeCount === values.length) return 'on'
  return 'partial'
}
