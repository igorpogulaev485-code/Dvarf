/**
 * MAG-01: which metamagic options apply to a cast, costs, and cast-parameter effects.
 * Names/costs come from sorcererMetamagic.ts — do not invent labels here.
 */
import {
  metamagicById,
  metamagicSpendCost,
  type MetamagicDef,
} from './sorcererMetamagic'

export type MetamagicCastFlags = {
  careful?: boolean
  distant?: boolean
  empowered?: boolean
  extended?: boolean
  heightened?: boolean
  quickened?: boolean
  subtle?: boolean
  twinned?: boolean
  seeking?: boolean
  transmutedType?: string | null
}

/** Options that may stack with one other metamagic on the same cast (PHB/TCE). */
export const STACKABLE_METAMAGIC_IDS = new Set(['empowered', 'seeking'])

export function metamagicAppliesToSpell(
  def: MetamagicDef,
  spell: {
    level: number
    casting_time?: string | null
    range?: string | null
    duration?: string | null
    damage?: string | null
    concentration?: boolean
    components?: { v?: boolean; s?: boolean; m?: string | boolean | null } | null
    attack_or_save?: string | null
  },
): boolean {
  const time = (spell.casting_time ?? '').toLowerCase()
  const range = (spell.range ?? '').toLowerCase()
  const duration = (spell.duration ?? '').toLowerCase()
  const damage = String(spell.damage ?? '')
  const atkSave = (spell.attack_or_save ?? '').toLowerCase()
  switch (def.id) {
    case 'careful':
      return /спас|save/i.test(atkSave) || /спас|save/i.test(damage)
    case 'distant':
      return Boolean(range.trim()) && !/на себя|self/i.test(range)
    case 'empowered':
      return Boolean(damage.trim()) && damage !== '—'
    case 'extended':
      return (
        Boolean(duration.trim()) &&
        !/мгновенн|instant/i.test(duration) &&
        (/мин|час|minute|hour|день|day/i.test(duration) || spell.concentration === true)
      )
    case 'heightened':
      return /спас|save/i.test(atkSave) || /спас|save/i.test(damage)
    case 'quickened':
      return /действ|action/i.test(time) && !/бонус|bonus|реакц|reaction|мин|час|minute|hour/i.test(time)
    case 'subtle': {
      const c = spell.components
      return Boolean(c?.v || c?.s)
    }
    case 'twinned':
      // Single-target spells only — heuristic: not area/radius/cone/cube/line.
      return (
        !/радиус|область|конус|куб|линия|sphere|radius|cone|cube|line|каждый|всех/i.test(
          `${range} ${damage} ${atkSave}`,
        ) && Boolean(range.trim())
      )
    case 'seeking':
      return /атак|attack/i.test(atkSave) || /атак|attack/i.test(damage)
    case 'transmuted':
      return /звук|кисл|огн|холод|электр|яд|thunder|acid|fire|cold|lightning|poison/i.test(
        damage,
      )
    default:
      return false
  }
}

export function listApplicableMetamagic(
  knownIds: string[],
  spell: Parameters<typeof metamagicAppliesToSpell>[1],
  options?: { allowTce?: boolean },
): MetamagicDef[] {
  return listKnownMetamagic(knownIds, options).filter((def) =>
    metamagicAppliesToSpell(def, spell),
  )
}

/** All known metamagic options (including ones that do not apply to this spell). */
export function listKnownMetamagic(
  knownIds: string[],
  options?: { allowTce?: boolean },
): MetamagicDef[] {
  const allowTce = options?.allowTce !== false
  const out: MetamagicDef[] = []
  for (const id of knownIds) {
    const def = metamagicById(id)
    if (!def) continue
    if (def.sourceBook === 'tce' && !allowTce) continue
    out.push(def)
  }
  return out
}

/** Short label for collapsed header («Далёкое»). */
export function metamagicShortLabel(def: MetamagicDef): string {
  return def.nameRu.replace(/\s+заклинание$/i, '').trim() || def.nameRu
}

/** Cost face: «1 очк.» / «3 очк.» */
export function metamagicCostLabel(cost: number): string {
  return `${cost} очк.`
}

/**
 * Why an option is inactive for this cast (points / spell fit / timing).
 * Returns null when the option can be toggled on.
 */
export function metamagicDisableReason(
  def: MetamagicDef,
  spell: Parameters<typeof metamagicAppliesToSpell>[1],
  ctx: {
    sorceryLeft: number
    cost: number
    checked: boolean
    castingIsAction: boolean
    useEmbodiment: boolean
  },
): string | null {
  if (!metamagicAppliesToSpell(def, spell)) {
    switch (def.id) {
      case 'careful':
      case 'heightened':
        return 'нет спасброска'
      case 'distant':
        return 'нет дистанции'
      case 'empowered':
      case 'transmuted':
        return 'нет урона'
      case 'extended':
        return 'неподходящая длительность'
      case 'quickened':
        return 'нужно действие'
      case 'subtle':
        return 'нет В/С'
      case 'twinned':
        return 'не одна цель'
      case 'seeking':
        return 'нет атаки'
      default:
        return 'не подходит'
    }
  }
  if (def.id === 'quickened' && ctx.useEmbodiment) return 'уже воплощение'
  if (def.id === 'quickened' && !ctx.castingIsAction) return 'нужно действие'
  if (!ctx.checked && ctx.sorceryLeft < ctx.cost) return 'не хватает очков'
  return null
}

export function metamagicSelectionCost(
  flags: MetamagicCastFlags,
  spellSlotLevel: number,
): number {
  let total = 0
  const ids: Array<keyof MetamagicCastFlags> = [
    'careful',
    'distant',
    'empowered',
    'extended',
    'heightened',
    'quickened',
    'subtle',
    'twinned',
    'seeking',
  ]
  for (const id of ids) {
    if (!flags[id]) continue
    const def = metamagicById(id)
    if (!def) continue
    total += metamagicSpendCost(def, spellSlotLevel)
  }
  if (flags.transmutedType) {
    const def = metamagicById('transmuted')
    if (def) total += metamagicSpendCost(def, spellSlotLevel)
  }
  return total
}

/** Apply metamagic to displayable cast parameters (range, time, components, notes). */
export function applyMetamagicToCastParams(
  spell: {
    casting_time?: string | null
    range?: string | null
    duration?: string | null
    components?: { v?: boolean; s?: boolean; m?: string | boolean | null } | null
  },
  flags: MetamagicCastFlags,
): {
  casting_time: string
  range: string
  duration: string
  componentsLabel: string
  notes: string[]
} {
  let casting_time = (spell.casting_time ?? '').trim() || '—'
  let range = (spell.range ?? '').trim() || '—'
  let duration = (spell.duration ?? '').trim() || '—'
  const notes: string[] = []
  const c = spell.components
  let v = Boolean(c?.v)
  let s = Boolean(c?.s)
  const m = c?.m

  if (flags.quickened) {
    casting_time = '1 бонусное действие'
    notes.push('Ускоренное: каст как бонусное действие')
  }
  if (flags.distant) {
    const originalRange = range
    if (/касание|touch/i.test(originalRange)) {
      range = '30 фт.'
      notes.push('Далёкое: дистанция ×2 (касание → 30 фт.)')
    } else {
      const match = originalRange.match(/(\d+)\s*(фт\.?|фут(?:ов|а|ы)?|ft\.?|feet)/i)
      if (match) {
        const fromN = Number(match[1])
        const toN = fromN * 2
        range = originalRange.replace(match[0], `${toN} фт.`)
        notes.push(`Далёкое: дистанция ×2 (${fromN} → ${toN} фт.)`)
      } else {
        range = `${originalRange} (×2)`
        notes.push(`Далёкое: дистанция ×2 (${originalRange} → ×2)`)
      }
    }
  }
  if (flags.subtle) {
    v = false
    s = false
    notes.push('Тонкое: без В и С')
  }
  if (flags.extended) {
    duration = `${duration} (×2, макс. 24 ч.)`
    notes.push('Продлённое: длительность ×2 (макс. 24 ч.)')
  }
  if (flags.careful) {
    notes.push('Осторожное: выбранные существа (≤ Хар.) автоуспех на спас')
  }
  if (flags.empowered) {
    notes.push('Усиленное: перебрось до Хар. костей урона')
  }
  if (flags.heightened) {
    notes.push('Напряжённое: одна цель с помехой на первый спас')
  }
  if (flags.twinned) {
    notes.push('Разделённое: вторая цель в пределах дистанции')
  }
  if (flags.seeking) {
    notes.push('Ищущее: при промахе перебрось к20 (новый результат обязателен)')
  }
  if (flags.transmutedType) {
    const typeRu: Record<string, string> = {
      thunder: 'звук',
      acid: 'кислота',
      fire: 'огонь',
      cold: 'холод',
      lightning: 'электричество',
      poison: 'яд',
    }
    notes.push(
      `Преобразованное: тип урона → ${typeRu[flags.transmutedType] ?? flags.transmutedType}`,
    )
  }

  const parts: string[] = []
  if (v) parts.push('В')
  if (s) parts.push('С')
  if (m != null && m !== false) parts.push('М')
  const componentsLabel = parts.length > 0 ? parts.join('/') : '—'

  return { casting_time, range, duration, componentsLabel, notes }
}

/** Validate stacking: at most one non-stackable + any stackables. */
export function metamagicStackOk(flags: MetamagicCastFlags): boolean {
  const primary: string[] = []
  const stackable: string[] = []
  const check = (id: string, on: boolean | string | null | undefined) => {
    if (!on) return
    if (STACKABLE_METAMAGIC_IDS.has(id)) stackable.push(id)
    else primary.push(id)
  }
  check('careful', flags.careful)
  check('distant', flags.distant)
  check('empowered', flags.empowered)
  check('extended', flags.extended)
  check('heightened', flags.heightened)
  check('quickened', flags.quickened)
  check('subtle', flags.subtle)
  check('twinned', flags.twinned)
  check('seeking', flags.seeking)
  check('transmuted', flags.transmutedType)
  return primary.length <= 1
}
