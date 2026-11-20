/**
 * MAG-01: which metamagic options apply to a cast, costs, and cast-parameter effects.
 * Names/costs come from sorcererMetamagic.ts — do not invent labels here.
 */
import { metamagicById2024 } from './edition2024ClassOptions'
import {
  resolveMetamagicOnCast2024,
  sorcerer2024Context,
  type MetamagicCastSelection2024,
} from './sorcerer2024Features'
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
  rulesEdition?: string | null,
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
      if (rulesEdition === '2024') {
        return Boolean(c?.v || c?.s || (c?.m != null && c?.m !== false))
      }
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
  options?: { allowTce?: boolean; rulesEdition?: string | null },
): MetamagicDef[] {
  if (options?.rulesEdition === '2024') {
    const out: MetamagicDef[] = []
    for (const id of knownIds) {
      const row = metamagicById2024(id)
      if (!row) continue
      out.push({
        id: row.id,
        nameRu: row.nameRu,
        nameEn: row.id,
        summaryRu: row.summaryRu,
        costRu: String(row.cost),
        costPoints: row.cost,
      })
    }
    return out
  }
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
    rulesEdition?: string | null
    sorceryLeft: number
    cost: number
    checked: boolean
    castingIsAction: boolean
    useEmbodiment: boolean
  },
): string | null {
  if (!metamagicAppliesToSpell(def, spell, ctx.rulesEdition)) {
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
  rulesEdition?: string | null,
): number {
  if (rulesEdition === '2024') {
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
      const def = metamagicById2024(String(id))
      if (def) total += def.cost
    }
    if (flags.transmutedType) {
      const def = metamagicById2024('transmuted')
      if (def) total += def.cost
    }
    return total
  }
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
  rulesEdition?: string | null,
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
  }
  if (flags.subtle) {
    notes.push(
      rulesEdition === '2024'
        ? 'Неуловимое: без В, С и М (кроме расходуемых/с ценой)'
        : 'Тонкое: без В и С',
    )
    if (rulesEdition === '2024') {
      const m = spell.components?.m
      if (m == null || m === false) {
        /* no material to strip */
      }
    }
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
  const showMaterial =
    m != null && m !== false && !(flags.subtle && rulesEdition === '2024')
  if (showMaterial) parts.push('М')
  const componentsLabel = parts.length > 0 ? parts.join('/') : '—'

  return { casting_time, range, duration, componentsLabel, notes }
}

export function metamagicSpendCostForCast(
  def: MetamagicDef,
  spellSlotLevel: number,
  rulesEdition?: string | null,
): number {
  if (rulesEdition === '2024') {
    return def.costPoints != null ? def.costPoints : metamagicById2024(def.id)?.cost ?? 1
  }
  return metamagicSpendCost(def, spellSlotLevel)
}

export function validateMetamagicCast2024(input: {
  flags: MetamagicCastFlags
  metamagicKnown: string[]
  sorcererLevel: number
  innateSorceryActive: boolean
  spell: { level: number; casting_time?: string | null }
}): { ok: boolean; reasonRu?: string; cost?: number } {
  const ids: string[] = []
  const { flags } = input
  if (flags.careful) ids.push('careful')
  if (flags.distant) ids.push('distant')
  if (flags.empowered) ids.push('empowered')
  if (flags.extended) ids.push('extended')
  if (flags.heightened) ids.push('heightened')
  if (flags.quickened) ids.push('quickened')
  if (flags.subtle) ids.push('subtle')
  if (flags.twinned) ids.push('twinned')
  if (flags.seeking) ids.push('seeking')
  if (flags.transmutedType) ids.push('transmuted')
  const selection: MetamagicCastSelection2024 = {
    primaryId: ids[0] ?? null,
    secondaryId: ids[1] ?? null,
    freeApotheosisOn: null,
    transmutedType: flags.transmutedType,
  }

  const ctx = sorcerer2024Context({
    rulesEdition: '2024',
    sorcererLevel: input.sorcererLevel,
    innateSorceryActive: input.innateSorceryActive,
    metamagicKnown: input.metamagicKnown,
  })
  if (!ctx) return { ok: true, cost: 0 }
  const resolved = resolveMetamagicOnCast2024({
    flags: ctx,
    selection,
    spell: input.spell,
  })
  if (!resolved.ok) return { ok: false, reasonRu: resolved.reasonRu }
  return { ok: true, cost: resolved.cost }
}

/** Validate stacking: at most one non-stackable + any stackables. */
export function metamagicStackOk(
  flags: MetamagicCastFlags,
  options?: { rulesEdition?: string | null; sorcererLevel?: number; innateSorceryActive?: boolean; metamagicKnown?: string[]; spell?: { level: number; casting_time?: string | null } },
): boolean {
  if (options?.rulesEdition === '2024' && options.spell) {
    const check = validateMetamagicCast2024({
      flags,
      metamagicKnown: options.metamagicKnown ?? [],
      sorcererLevel: options.sorcererLevel ?? 1,
      innateSorceryActive: Boolean(options.innateSorceryActive),
      spell: options.spell,
    })
    return check.ok
  }
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
