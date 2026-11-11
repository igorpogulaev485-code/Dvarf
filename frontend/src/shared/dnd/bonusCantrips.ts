/**
 * Bonus cantrips that sit outside the class cantrip budget (PHB/TCE/SCAG/DMG).
 * Option keys are English catalog names so picks survive a relabel.
 */

export type BonusCantripGrant = {
  nameEn: string
  range?: string
  castingTime?: string
}

/** PHB wizard cantrips present in the bundled 2014 catalog. */
export const WIZARD_CANTRIP_NAMES = [
  'Acid Splash',
  'Chill Touch',
  'Dancing Lights',
  'Fire Bolt',
  'Light',
  'Mage Hand',
  'Mending',
  'Message',
  'Minor Illusion',
  'Poison Spray',
  'Prestidigitation',
  'Ray of Frost',
  'Shocking Grasp',
  'True Strike',
] as const

/** PHB druid cantrips present in the bundled 2014 catalog. */
export const DRUID_CANTRIP_NAMES = [
  'Druidcraft',
  'Guidance',
  'Mending',
  'Poison Spray',
  'Produce Flame',
  'Resistance',
  'Shillelagh',
] as const

/** Necromancy cantrips in the bundled catalog (Death domain). */
export const NECROMANCY_CANTRIP_NAMES = ['Chill Touch', 'Spare the Dying'] as const

export const CANTRIP_PRESETS: Record<string, readonly string[]> = {
  wizard_cantrips: WIZARD_CANTRIP_NAMES,
  druid_cantrips: DRUID_CANTRIP_NAMES,
  necromancy_cantrips: NECROMANCY_CANTRIP_NAMES,
  druidcraft_or_prestidigitation: ['Druidcraft', 'Prestidigitation'],
  druidcraft_or_thaumaturgy: ['Druidcraft', 'Thaumaturgy'],
}

const CANTRIP_LABEL_RU: Record<string, string> = {
  'Acid Splash': 'Брызги кислоты',
  'Chill Touch': 'Леденящее прикосновение',
  'Dancing Lights': 'Пляшущие огоньки',
  'Fire Bolt': 'Огненный снаряд',
  Light: 'Свет',
  'Mage Hand': 'Волшебная рука',
  Mending: 'Починка',
  Message: 'Сообщение',
  'Minor Illusion': 'Малая иллюзия',
  'Poison Spray': 'Ядовитые брызги',
  Prestidigitation: 'Фокусы',
  'Ray of Frost': 'Луч холода',
  'Shocking Grasp': 'Электрошок',
  'True Strike': 'Меткий удар',
  Druidcraft: 'Искусство друидов',
  Thaumaturgy: 'Чудотворство',
  Guidance: 'Указание',
  'Produce Flame': 'Сотворение пламени',
  Resistance: 'Сопротивление',
  Shillelagh: 'Дубинка',
  'Spare the Dying': 'Уход за умирающим',
}

export function bonusCantripLabelRu(nameEn: string): string | null {
  return CANTRIP_LABEL_RU[nameEn] ?? null
}

type BonusCantripChoiceSpec = {
  id: string
  labelRu: string
  count: number
  preset: keyof typeof CANTRIP_PRESETS
  notesRu: string
}

/** Choices injected when the catalog row has no real cantrip picker. */
const INJECTED_CANTRIP_CHOICES: Record<string, BonusCantripChoiceSpec> = {
  nature_domain: {
    id: 'nature_druid_cantrip',
    labelRu: 'Заговор друида',
    count: 1,
    preset: 'druid_cantrips',
    notesRu: 'Считается заговором жреца и не занимает лимит заговоров.',
  },
  death_domain: {
    id: 'death_necro_cantrip',
    labelRu: 'Некромантический заговор',
    count: 1,
    preset: 'necromancy_cantrips',
    notesRu: 'Дополнительный некромантический заговор, вне лимита жреца.',
  },
  circle_of_the_land: {
    id: 'land_bonus_cantrip',
    labelRu: 'Дополнительный заговор друида',
    count: 1,
    preset: 'druid_cantrips',
    notesRu: 'Бонусный заговор круга земли, вне обычного лимита.',
  },
  arcane_archer: {
    id: 'arcane_archer_cantrip',
    labelRu: 'Заговор',
    count: 1,
    preset: 'druidcraft_or_prestidigitation',
    notesRu: 'XGE: Фокусы или Искусство друидов. Вне лимита заклинаний воина.',
  },
  path_of_the_giant: {
    id: 'giant_cantrip',
    labelRu: 'Заговор',
    count: 1,
    preset: 'druidcraft_or_thaumaturgy',
    notesRu: 'BGG: Искусство друидов или Чудотворство. Базовая характеристика — Мудрость. Ячеек нет.',
  },
}

/** Picks already stored on these choice ids (catalog or injected). */
const CANTRIP_PICK_SPECS: Record<string, { id: string; preset: string }> = {
  arcana_domain: { id: 'wizard_cantrips', preset: 'wizard_cantrips' },
  nature_domain: { id: 'nature_druid_cantrip', preset: 'druid_cantrips' },
  death_domain: { id: 'death_necro_cantrip', preset: 'necromancy_cantrips' },
  circle_of_the_land: { id: 'land_bonus_cantrip', preset: 'druid_cantrips' },
  arcane_archer: { id: 'arcane_archer_cantrip', preset: 'druidcraft_or_prestidigitation' },
  path_of_the_giant: { id: 'giant_cantrip', preset: 'druidcraft_or_thaumaturgy' },
}

const FIXED_BONUS_CANTRIPS: Record<string, BonusCantripGrant[]> = {
  light_domain: [{ nameEn: 'Light' }],
  grave_domain: [
    {
      nameEn: 'Spare the Dying',
      range: '30 фт.',
      castingTime: '1 бонусное действие',
    },
  ],
  // PHB Arcane Trickster: Mage Hand is mandatory and does not spend a cantrip pick.
  arcane_trickster: [{ nameEn: 'Mage Hand' }],
  // PHB Way of Shadow: Minor Illusion if not already known.
  way_of_shadow: [{ nameEn: 'Minor Illusion' }],
}

/** PHB Improved Minor Illusion: a different wizard cantrip only if Minor Illusion is already known. */
const ILLUSION_REPLACEMENT_ID = 'illusion_replacement_cantrip'

export function resolveCantripPreset(from: string): readonly string[] | null {
  return CANTRIP_PRESETS[from] ?? null
}

export type BonusCantripChoiceInsert = {
  id: string
  labelRu: string
  kind: 'single' | 'multi'
  count: number
  from: string[]
  fromLabelsRu: Record<string, string>
  appliesTo: 'later_spells'
  required: boolean
  notesRu: string
}

export function bonusCantripChoiceInsert(slug: string): BonusCantripChoiceInsert | null {
  if (slug === 'school_of_illusion') {
    const names = WIZARD_CANTRIP_NAMES.filter((name) => name !== 'Minor Illusion')
    return {
      id: ILLUSION_REPLACEMENT_ID,
      labelRu: 'Другой заговор волшебника',
      kind: 'single',
      count: 1,
      from: [...names],
      fromLabelsRu: Object.fromEntries(names.map((name) => [name, CANTRIP_LABEL_RU[name] ?? name])),
      appliesTo: 'later_spells',
      required: false,
      notesRu:
        'PHB: если Малая иллюзия уже известна, выбери другой заговор — он не занимает лимит. Если её ещё нет, она выдаётся сама.',
    }
  }
  const spec = INJECTED_CANTRIP_CHOICES[slug]
  if (!spec) return null
  const names = CANTRIP_PRESETS[spec.preset] ?? []
  return {
    id: spec.id,
    labelRu: spec.labelRu,
    kind: spec.count > 1 ? 'multi' : 'single',
    count: spec.count,
    from: [...names],
    fromLabelsRu: Object.fromEntries(names.map((name) => [name, CANTRIP_LABEL_RU[name] ?? name])),
    appliesTo: 'later_spells',
    required: true,
    notesRu: spec.notesRu,
  }
}

function knowsMinorIllusion(knownNames: readonly string[]): boolean {
  return knownNames.some((name) => {
    const key = name.trim().toLowerCase()
    return key === 'minor illusion' || key === 'малая иллюзия'
  })
}

function selectedNames(
  picks: { values: Record<string, string | string[] | undefined> },
  id: string,
): string[] {
  const raw = picks.values[id]
  if (Array.isArray(raw)) return raw.filter((item) => typeof item === 'string' && item.trim())
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
  return []
}

/** Fixed grants plus cantrips the player picked for this archetype. */
export function bonusCantripGrants(
  slug: string,
  picks: { values: Record<string, string | string[] | undefined> },
  knownNames: readonly string[] = [],
): BonusCantripGrant[] {
  const out: BonusCantripGrant[] = [...(FIXED_BONUS_CANTRIPS[slug] ?? [])]
  if (slug === 'school_of_illusion') {
    if (!knowsMinorIllusion(knownNames)) {
      out.push({ nameEn: 'Minor Illusion' })
    } else {
      const wizardNames = new Set<string>(WIZARD_CANTRIP_NAMES)
      for (const name of selectedNames(picks, ILLUSION_REPLACEMENT_ID)) {
        if (name === 'Minor Illusion' || !wizardNames.has(name)) continue
        out.push({ nameEn: name })
      }
    }
  }
  const spec = CANTRIP_PICK_SPECS[slug]
  if (!spec) return out
  const allowed = new Set(CANTRIP_PRESETS[spec.preset] ?? [])
  for (const name of selectedNames(picks, spec.id)) {
    if (!allowed.has(name)) continue
    if (out.some((row) => row.nameEn === name)) continue
    out.push({ nameEn: name })
  }
  return out
}
