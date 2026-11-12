/**
 * Aggregate active gear effects from inventory (equipped + attuned when required).
 * MVP: ac_bonus, sense, attack/damage bonus, ability_score / ability_mod,
 * spellcasting_bonus, resource (incl. free Channel Divinity),
 * conditional AC, AC formulas, resistances, save advantage.
 */

import type { CompetingAcFormula } from '../../shared/dnd/armor'
import { defensesFromActiveEffects } from '../../shared/dnd/activeEffects'
import {
  addDefense,
  emptyDamageProfile,
  formatDefenseList,
  type DefenseLine,
  type IncomingDamageProfile,
} from '../../shared/dnd/damageTypes'
import type {
  AbilityScoreKey,
  AcBonusCondition,
  GearEffect,
} from '../../shared/dnd/gearCatalog'
import type { AttunementSlot } from './attunement'
import { createBonusLine, type BonusLine } from './modifiers'
import {
  suppressedAttunementItemIds,
  type AttunementCharacter,
} from './attunementRules'
import type { InventoryItem } from './inventory'
import type { ResourceReset } from '../../shared/dnd/rest'
import { depleteHintFromCode } from './gearCharges'

export type ActiveGearEffect = {
  effect: GearEffect
  itemId: string
  itemName: string
}

export type ConditionalAcBonus = {
  value: number
  condition: AcBonusCondition
  itemName: string
}

export type SaveAdvantageLine = {
  against: 'spells' | 'magic'
  itemName: string
  itemId: string
  note: string
}

export type AggregatedGearEffects = {
  /** Flat AC from cloaks / rings / armor +N. Conditional bonuses are separate. */
  acBonus: number
  /** +N that applies only without armor and/or a shield. */
  conditionalAc: ConditionalAcBonus[]
  /** Formulas that compete while no body armor is worn (robe, barrier tattoo). */
  acFormulas: CompetingAcFormula[]
  /** Darkvision / blindsight / … — max range per sense key. */
  senses: Record<string, number>
  /** Fixed scores (gauntlets, belts). The highest floor wins; nothing is lowered. */
  abilityScores: Partial<Record<AbilityScoreKey, number>>
  /** Uncapped ability deltas. Capped ones live in abilityModCaps. */
  abilityMods: Partial<Record<AbilityScoreKey, number>>
  /** +N with a ceiling («+2, максимум 20»). A cap never lowers a higher score. */
  abilityModCaps: Array<{ ability: AbilityScoreKey; value: number; max: number }>
  /** Per inventory item: attack / damage bonuses (weapon +1 while held). */
  byItem: Record<string, { attackBonus: number; damageBonus: number }>
  /** Skill key → flat bonus (cloak of elvenkind stealth, …). */
  skillBonuses: Record<string, number>
  /** Ability save bonuses; `all` applies to every save. */
  saveBonuses: Partial<Record<AbilityScoreKey | 'all', number>>
  /** Walk speed delta (ft), summed. */
  speedBonusFt: number
  /** Extra spell slots by level (Ring of Spell Storing–style deltas). */
  spellSlotDeltas: Record<number, number>
  /** Raw sum of spellcasting values. The lines below are what the sheet applies. */
  spellcastingBonus: number
  /**
   * One row per active item. Empty `classes` applies to every spell.
   * Several classes (amulet: cleric and paladin) become several bonus lines.
   */
  spellcastingLines: SpellcastingGearLine[]
  /** Standing damage resistances. Temporary rows (potions) are not included. */
  resistances: DefenseLine[]
  vulnerabilities: DefenseLine[]
  immunities: DefenseLine[]
  /** Advantage the player may turn on when the save matches. */
  saveAdvantages: SaveAdvantageLine[]
  /** Charge pools from `resource` effects. */
  resources: Array<{
    key: string
    name: string
    max: number
    reset: ResourceReset
    itemId: string
    rechargeDice?: string
    depleteHint?: string
  }>
  /** Companions granted while item is active. */
  companions: Array<{
    key: string
    kind: string
    nameRu: string
    itemId: string
    hpMax?: number | null
    ac?: number | null
    actions?: string
    notes?: string
  }>
  /** Condition immunities from setting artifacts (frightened, illusions, …). */
  conditionImmunities: Array<{ slug: string; name: string; itemName: string }>
  /** Tool proficiencies granted while the item is active. */
  toolProficiencies: string[]
  /** Spells granted with optional free charges or a shared item pool. */
  grantSpells: GearGrantSpell[]
  /** Human-readable lines for UI. */
  notes: string[]
  active: ActiveGearEffect[]
}

export type GearGrantPool = 'uses' | 'charges' | 'unlimited'

export type GearGrantSpell = {
  key: string
  slug: string
  nameRu: string
  uses: number | null
  reset: 'short' | 'long'
  itemId: string
  itemName: string
  /** `uses` is the old per-spell counter. `charges` spends the item pool. */
  pool: GearGrantPool
  chargeCost: number
  castLevel: number
  chargePerLevel: boolean
  maxCastLevel: number | null
  saveDc: number | null
  attackBonus: number | null
  resourceKey: string | null
}

export type SpellcastingAppliesTo = 'attack' | 'dc' | 'both'

export type SpellcastingGearLine = {
  value: number
  appliesTo: SpellcastingAppliesTo
  /** Empty = every spell. Otherwise only these class slugs (I02 field). */
  classes: string[]
  itemId: string
  label: string
}

const ABILITY_KEYS: AbilityScoreKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function isAbilityKey(value: unknown): value is AbilityScoreKey {
  return typeof value === 'string' && (ABILITY_KEYS as string[]).includes(value)
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

/** Item contributes effects when equipped; if attunement required — also linked in a slot. */
export function isGearEffectActive(
  item: InventoryItem,
  attunedItemIds: ReadonlySet<string>,
  suppressedItemIds?: ReadonlySet<string>,
): boolean {
  if (item.parent_id) return false
  // Magic ammunition is carried, not worn. Its bonus lands on the attack card
  // linked to this stack (I06). A general ammo picker is still an open question.
  if (item.base_ammo_slug) return (item.qty ?? 0) > 0
  if (!item.equipped) return false
  if (item.requires_attunement && !attunedItemIds.has(item.id)) return false
  if (suppressedItemIds?.has(item.id)) return false
  return true
}

export function attunedItemIdSet(attunements: AttunementSlot[]): Set<string> {
  const ids = new Set<string>()
  for (const slot of attunements) {
    if (slot.item_id) ids.add(slot.item_id)
  }
  return ids
}

export function emptyAggregatedGearEffects(): AggregatedGearEffects {
  return {
    acBonus: 0,
    conditionalAc: [],
    acFormulas: [],
    senses: {},
    abilityScores: {},
    abilityMods: {},
    abilityModCaps: [],
    byItem: {},
    skillBonuses: {},
    saveBonuses: {},
    speedBonusFt: 0,
    spellSlotDeltas: {},
    spellcastingBonus: 0,
    spellcastingLines: [],
    resistances: [],
    vulnerabilities: [],
    immunities: [],
    saveAdvantages: [],
    resources: [],
    companions: [],
    conditionImmunities: [],
    toolProficiencies: [],
    grantSpells: [],
    notes: [],
    active: [],
  }
}

function asReset(value: unknown): ResourceReset | null {
  if (value === 'long_rest') return 'long'
  if (value === 'short_rest') return 'short'
  if (
    value === 'short' ||
    value === 'long' ||
    value === 'manual' ||
    value === 'dawn' ||
    value === 'midnight'
  ) {
    return value
  }
  return null
}

function readReset(value: unknown): ResourceReset {
  const direct = asReset(value)
  if (direct) return direct
  if (value && typeof value === 'object') {
    const nested = asReset((value as { restore?: unknown }).restore)
    if (nested) return nested
  }
  return 'long'
}

function normalizeSkillKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function resourceDisplayName(itemName: string, resourceId: string): string {
  if (resourceId === 'channel_divinity') {
    return `${itemName || 'Предмет'} · Божественный канал`
  }
  return `${itemName || 'Предмет'} · ${resourceId}`
}

/** Detect Amulet of the Devout +N from inventory name (legacy custom_note-only rows). */
export function devoutAmuletBonusFromName(name: string): number | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  if (!/амулет\s+благочестия|amulet\s+of\s+the\s+devout/i.test(trimmed)) return null
  const plus = trimmed.match(/\+(\d+)/)
  if (plus) {
    const n = Number(plus[1])
    if (n >= 1 && n <= 3) return n
  }
  return 1
}

function readAppliesTo(value: unknown): SpellcastingAppliesTo {
  if (value === 'attack' || value === 'dc' || value === 'both') return value
  return 'both'
}

function classSlugs(values: string[] | null | undefined): string[] {
  if (!values?.length) return []
  const out: string[] = []
  for (const raw of values) {
    const slug = raw.trim().toLowerCase()
    if (slug && !out.includes(slug)) out.push(slug)
  }
  return out
}

function appliesLabel(appliesTo: SpellcastingAppliesTo): string {
  if (appliesTo === 'attack') return 'атака закл.'
  if (appliesTo === 'dc') return 'Сл закл.'
  return 'атака закл./Сл'
}

function pushSpellcastingLine(
  out: AggregatedGearEffects,
  item: InventoryItem,
  value: number,
  appliesTo: SpellcastingAppliesTo,
  classes: string[],
): void {
  if (!value) return
  const amount = Math.floor(value)
  out.spellcastingBonus += amount
  out.spellcastingLines.push({
    value: amount,
    appliesTo,
    classes,
    itemId: item.id,
    label: item.name?.trim() || 'Снаряжение',
  })
  const scope = classes.length ? ` (${classes.join(', ')})` : ''
  out.notes.push(
    `${item.name || 'предмет'}: ${appliesLabel(appliesTo)} ${amount >= 0 ? '+' : ''}${amount}${scope}`,
  )
}

function pushChannelDivinityResource(
  out: AggregatedGearEffects,
  item: InventoryItem,
): void {
  const key = `gear-res:${item.id}:channel_divinity`
  if (out.resources.some((row) => row.key === key)) return
  out.resources.push({
    key,
    name: resourceDisplayName(item.name || 'Предмет', 'channel_divinity'),
    max: 1,
    reset: 'long',
    itemId: item.id,
  })
  out.notes.push(`${item.name || 'предмет'}: Божественный канал ×1 (без траты пула)`)
}

/**
 * Collect effects from active inventory rows.
 * Unknown effect types are skipped (never throw).
 */
export function aggregateGearEffects(input: {
  items: InventoryItem[]
  attunements: AttunementSlot[]
  /** Class, race, alignment, family, and the artificer slot limit. */
  gate?: AttunementCharacter | null
}): AggregatedGearEffects {
  const attuned = attunedItemIdSet(input.attunements)
  const suppressed = suppressedAttunementItemIds({
    slots: input.attunements,
    items: input.items,
    character: input.gate,
  })
  const out = emptyAggregatedGearEffects()

  for (const item of input.items) {
    if (!isGearEffectActive(item, attuned, suppressed)) continue
    const effects = item.effects ?? []

    let itemAttack = 0
    let itemDamage = 0
    let appliedSpellcasting = false
    let appliedChannelResource = false

    for (const effect of effects) {
      const type = typeof effect.type === 'string' ? effect.type : ''
      if (!type) continue
      out.active.push({ effect, itemId: item.id, itemName: item.name || 'Без названия' })

      if (type === 'ac_bonus') {
        const value = Math.floor(asNumber((effect as { value?: unknown }).value) ?? 0)
        const condition = readAcCondition((effect as { condition?: unknown }).condition)
        if (condition) {
          if (value) {
            out.conditionalAc.push({
              value,
              condition,
              itemName: item.name || 'предмет',
            })
            out.notes.push(
              `${item.name || 'предмет'}: КД ${value >= 0 ? '+' : ''}${value} (${acConditionLabel(condition)})`,
            )
          }
        } else {
          out.acBonus += value
          if (value) {
            out.notes.push(
              `${item.name || 'предмет'}: КД ${value >= 0 ? '+' : ''}${value}`,
            )
          }
        }
        continue
      }

      if (type === 'ac_formula') {
        const base = asNumber((effect as { base?: unknown }).base)
        if (base == null) continue
        const dexRaw = (effect as { dex_cap?: unknown }).dex_cap
        const dexCap =
          dexRaw == null ? null : asNumber(dexRaw) == null ? null : Math.floor(asNumber(dexRaw) as number)
        const label =
          String((effect as { label?: unknown }).label ?? '').trim() ||
          item.name ||
          'Формула КД'
        out.acFormulas.push({
          label,
          base: Math.floor(base),
          dexCap,
          allowsShield: (effect as { allows_shield?: unknown }).allows_shield !== false,
        })
        const dexNote = dexCap == null ? '+ЛОВ' : dexCap === 0 ? '' : `+ЛОВ≤${dexCap}`
        out.notes.push(`${item.name || 'предмет'}: КД ${Math.floor(base)}${dexNote} без доспеха`)
        continue
      }

      if (type === 'sense') {
        const sense = String((effect as { sense?: unknown }).sense ?? '').trim().toLowerCase()
        const range = asNumber((effect as { range_ft?: unknown }).range_ft) ?? 0
        if (!sense) continue
        const prev = out.senses[sense] ?? 0
        out.senses[sense] = Math.max(prev, Math.floor(range))
        out.notes.push(
          `${item.name || 'предмет'}: ${sense}${range ? ` ${Math.floor(range)} фт` : ''}`,
        )
        continue
      }

      if (type === 'attack_bonus') {
        const value = asNumber((effect as { value?: unknown }).value) ?? 0
        itemAttack += Math.floor(value)
        continue
      }

      if (type === 'damage_bonus') {
        const value = asNumber((effect as { value?: unknown }).value) ?? 0
        itemDamage += Math.floor(value)
        continue
      }

      if (type === 'ability_score') {
        const ability = (effect as { ability?: unknown }).ability
        const value = asNumber((effect as { value?: unknown }).value)
        if (!isAbilityKey(ability) || value == null) continue
        const floor = Math.floor(value)
        const prev = out.abilityScores[ability]
        out.abilityScores[ability] = prev == null ? floor : Math.max(prev, floor)
        out.notes.push(
          `${item.name || 'предмет'}: ${ability.toUpperCase()} не ниже ${floor}`,
        )
        continue
      }

      if (type === 'ability_mod') {
        const ability = (effect as { ability?: unknown }).ability
        const value = asNumber((effect as { value?: unknown }).value)
        if (!isAbilityKey(ability) || value == null) continue
        const delta = Math.floor(value)
        const cap = asNumber((effect as { max?: unknown }).max)
        if (cap != null) {
          out.abilityModCaps.push({
            ability,
            value: delta,
            max: Math.floor(cap),
          })
          out.notes.push(
            `${item.name || 'предмет'}: ${ability.toUpperCase()} ${
              delta >= 0 ? '+' : ''
            }${delta}, максимум ${Math.floor(cap)}`,
          )
        } else {
          out.abilityMods[ability] = (out.abilityMods[ability] ?? 0) + delta
          out.notes.push(
            `${item.name || 'предмет'}: ${ability.toUpperCase()} ${
              delta >= 0 ? '+' : ''
            }${delta}`,
          )
        }
        continue
      }

      if (type === 'skill_bonus') {
        const skillRaw = String((effect as { skill?: unknown }).skill ?? '').trim()
        const value = asNumber((effect as { value?: unknown }).value) ?? 0
        if (!skillRaw || !value) continue
        const skill = normalizeSkillKey(skillRaw)
        out.skillBonuses[skill] = (out.skillBonuses[skill] ?? 0) + Math.floor(value)
        out.notes.push(
          `${item.name || 'предмет'}: ${skill} ${value >= 0 ? '+' : ''}${Math.floor(value)}`,
        )
        continue
      }

      if (type === 'save_advantage') {
        const againstRaw = (effect as { against?: unknown }).against
        const against = againstRaw === 'magic' ? 'magic' : againstRaw === 'spells' ? 'spells' : null
        if (!against) continue
        const note = String((effect as { note?: unknown }).note ?? '').trim()
        out.saveAdvantages.push({
          against,
          itemName: item.name || 'предмет',
          itemId: item.id,
          note,
        })
        out.notes.push(
          `${item.name || 'предмет'}: ${
            against === 'magic'
              ? 'преимущество против заклинаний и магических эффектов'
              : 'преимущество против заклинаний'
          }${note ? ` (${note})` : ''}`,
        )
        continue
      }

      if (type === 'resistance') {
        if ((effect as { temporary?: unknown }).temporary === true) {
          out.notes.push(`${item.name || 'предмет'}: временное сопротивление (бафы)`)
          continue
        }
        const damageType = String((effect as { damage_type?: unknown }).damage_type ?? '')
        addDefense(
          out.resistances,
          damageType,
          item.name || 'предмет',
          (effect as { nonmagical?: unknown }).nonmagical === true,
        )
        continue
      }

      if (type === 'vulnerability') {
        addDefense(
          out.vulnerabilities,
          String((effect as { damage_type?: unknown }).damage_type ?? ''),
          item.name || 'предмет',
        )
        continue
      }

      if (type === 'immunity') {
        addDefense(
          out.immunities,
          String((effect as { damage_type?: unknown }).damage_type ?? ''),
          item.name || 'предмет',
        )
        continue
      }

      if (type === 'save_bonus') {
        const value = asNumber((effect as { value?: unknown }).value) ?? 0
        if (!value) continue
        const abilityRaw = (effect as { ability?: unknown }).ability
        const key: AbilityScoreKey | 'all' = isAbilityKey(abilityRaw)
          ? abilityRaw
          : 'all'
        out.saveBonuses[key] = (out.saveBonuses[key] ?? 0) + Math.floor(value)
        out.notes.push(
          `${item.name || 'предмет'}: спас ${key === 'all' ? 'все' : key.toUpperCase()} ${
            value >= 0 ? '+' : ''
          }${Math.floor(value)}`,
        )
        continue
      }

      if (type === 'speed') {
        const value = asNumber((effect as { value_ft?: unknown }).value_ft) ?? 0
        if (!value) continue
        out.speedBonusFt += Math.floor(value)
        out.notes.push(
          `${item.name || 'предмет'}: скорость ${value >= 0 ? '+' : ''}${Math.floor(value)} фт`,
        )
        continue
      }

      if (type === 'spell_slots') {
        const level = asNumber((effect as { level?: unknown }).level)
        const delta = asNumber((effect as { delta?: unknown }).delta) ?? 0
        if (level == null || level < 1 || level > 9 || !delta) continue
        const key = Math.floor(level)
        out.spellSlotDeltas[key] = (out.spellSlotDeltas[key] ?? 0) + Math.floor(delta)
        out.notes.push(
          `${item.name || 'предмет'}: ячейки ${key} ${delta >= 0 ? '+' : ''}${Math.floor(delta)}`,
        )
        continue
      }

      if (type === 'spellcasting_bonus') {
        const value = asNumber((effect as { value?: unknown }).value) ?? 0
        if (!value) continue
        const effectRow = effect as {
          applies_to?: unknown
          class_scoped?: unknown
        }
        const classScoped = effectRow.class_scoped === true
        const classes = classScoped ? classSlugs(item.attunement_classes) : []
        // A class-scoped bonus with no I02 class list must not leak onto every spell.
        if (classScoped && classes.length === 0) continue
        pushSpellcastingLine(out, item, value, readAppliesTo(effectRow.applies_to), classes)
        appliedSpellcasting = true
        continue
      }

      if (type === 'resource') {
        const id = String((effect as { id?: unknown }).id ?? '').trim() || 'charges'
        const max = asNumber((effect as { max?: unknown }).max) ?? 0
        if (max <= 0) continue
        const reset = readReset(
          (effect as { restore?: unknown }).restore ?? effect,
        )
        const rechargeDice = String(
          (effect as { recharge_dice?: unknown }).recharge_dice ?? '',
        ).trim()
        const depleteHint = depleteHintFromCode(
          (effect as { deplete?: unknown }).deplete,
        )
        const key = `gear-res:${item.id}:${id}`
        const namedPool = Boolean(rechargeDice || depleteHint)
        out.resources.push({
          key,
          name: namedPool
            ? `${item.name || 'Предмет'}: заряды`
            : resourceDisplayName(item.name || 'Предмет', id),
          max: Math.floor(max),
          reset,
          itemId: item.id,
          ...(rechargeDice ? { rechargeDice } : {}),
          ...(depleteHint ? { depleteHint } : {}),
        })
        if (id === 'channel_divinity') appliedChannelResource = true
        out.notes.push(`${item.name || 'предмет'}: ресурс ${id} ×${Math.floor(max)}`)
        continue
      }

      if (type === 'companion') {
        const kind = String((effect as { kind?: unknown }).kind ?? 'other').trim() || 'other'
        const nameRu =
          String((effect as { name_ru?: unknown }).name_ru ?? '').trim() ||
          item.name ||
          'Спутник'
        const abilityId = String((effect as { ability_id?: unknown }).ability_id ?? '').trim()
        const key = abilityId
          ? `gear-companion:${item.id}:${abilityId}`
          : `gear-companion:${item.id}:${kind}`
        const hpMax = asNumber((effect as { hp_max?: unknown }).hp_max)
        const ac = asNumber((effect as { ac?: unknown }).ac)
        const actions = String((effect as { actions?: unknown }).actions ?? '').trim()
        const notes = String((effect as { notes?: unknown }).notes ?? '').trim()
        out.companions.push({
          key,
          kind,
          nameRu,
          itemId: item.id,
          hpMax: hpMax == null ? null : Math.floor(hpMax),
          ac: ac == null ? null : Math.floor(ac),
          actions,
          notes,
        })
        out.notes.push(`${item.name || 'предмет'}: спутник ${nameRu}`)
        continue
      }

      if (type === 'condition_immunity') {
        const name = String((effect as { name?: unknown }).name ?? '').trim()
        const slug = String((effect as { slug?: unknown }).slug ?? '').trim()
        if (!name && !slug) continue
        out.conditionImmunities.push({
          slug: slug || name,
          name: name || slug,
          itemName: item.name || 'предмет',
        })
        out.notes.push(`${item.name || 'предмет'}: иммунитет ${name || slug}`)
        continue
      }

      if (type === 'sheet_flag') {
        const flag = String((effect as { flag?: unknown }).flag ?? '')
        if (flag === 'tool_proficiency') {
          const tool = String((effect as { value?: unknown }).value ?? '').trim()
          if (tool && !out.toolProficiencies.some((row) => row.toLowerCase() === tool.toLowerCase())) {
            out.toolProficiencies.push(tool)
            out.notes.push(`${item.name || 'предмет'}: владение ${tool}`)
          }
        }
        continue
      }

      if (type === 'custom_note' || type === 'weapon_mode' || type === 'artifact_spell') {
        const text = String(
          (effect as { text?: unknown }).text ??
            (effect as { name?: unknown }).name ??
            '',
        ).trim()
        if (text) out.notes.push(`${item.name || 'предмет'}: ${text}`)
        continue
      }

      if (type === 'grant_spell') {
        const slug = String((effect as { slug?: unknown }).slug ?? '').trim()
        if (!slug) continue
        const row = effect as {
          uses?: unknown
          charges?: unknown
          cast_level?: unknown
          charge_per_level?: unknown
          max_level?: unknown
          save_dc?: unknown
          attack_bonus?: unknown
          unlimited?: unknown
          name_ru?: unknown
          restore?: unknown
        }
        const uses = asNumber(row.uses)
        const chargeCostRaw = asNumber(row.charges)
        const unlimited = row.unlimited === true || chargeCostRaw === 0
        const sharedPool = unlimited || (chargeCostRaw != null && chargeCostRaw > 0)
        const reset = readReset(row.restore)
        const castLevel = asNumber(row.cast_level)
        const saveDc = asNumber(row.save_dc)
        const attackBonus = asNumber(row.attack_bonus)
        const maxCast = asNumber(row.max_level)
        const nameRu = String(row.name_ru ?? '').trim()
        const key = `gear-spell:${item.id}:${slug}:${castLevel ?? 'base'}`
        const pool: GearGrantPool = unlimited ? 'unlimited' : sharedPool ? 'charges' : 'uses'
        out.grantSpells.push({
          key,
          slug,
          nameRu,
          uses: !sharedPool && uses != null && uses > 0 ? Math.floor(uses) : null,
          reset: reset === 'short' ? 'short' : 'long',
          itemId: item.id,
          itemName: item.name || 'Предмет',
          pool,
          chargeCost: pool === 'charges' && chargeCostRaw != null ? Math.floor(chargeCostRaw) : 0,
          castLevel: castLevel != null ? Math.max(0, Math.floor(castLevel)) : 0,
          chargePerLevel: row.charge_per_level === true,
          maxCastLevel: maxCast != null ? Math.floor(maxCast) : null,
          saveDc: saveDc != null ? Math.floor(saveDc) : null,
          attackBonus: attackBonus != null ? Math.floor(attackBonus) : null,
          resourceKey: null,
        })
        const costLabel =
          pool === 'unlimited'
            ? 'неограниченно'
            : pool === 'charges'
              ? `${Math.floor(chargeCostRaw ?? 0)} зар.`
              : uses != null && uses > 0
                ? `×${Math.floor(uses)}`
                : ''
        out.notes.push(
          `${item.name || 'предмет'}: ${nameRu || slug}${costLabel ? ` ${costLabel}` : ''}`,
        )
      }
    }

    const chargePool = [...out.resources].reverse().find((row) => row.itemId === item.id)
    if (chargePool) {
      for (const grant of out.grantSpells) {
        if (grant.itemId === item.id && grant.pool === 'charges' && !grant.resourceKey) {
          grant.resourceKey = chargePool.key
        }
      }
    }

    // Legacy catalog rows only had custom_note — still grant devout bonuses by name.
    const devoutBonus = devoutAmuletBonusFromName(item.name || '')
    if (devoutBonus != null) {
      if (!appliedSpellcasting) {
        const classes = classSlugs(item.attunement_classes)
        pushSpellcastingLine(
          out,
          item,
          devoutBonus,
          'both',
          classes.length ? classes : ['cleric', 'paladin'],
        )
        out.active.push({
          effect: {
            type: 'spellcasting_bonus',
            value: devoutBonus,
            applies_to: 'both',
            class_scoped: true,
          },
          itemId: item.id,
          itemName: item.name || 'Без названия',
        })
      }
      if (!appliedChannelResource) {
        pushChannelDivinityResource(out, item)
        out.active.push({
          effect: { type: 'resource', id: 'channel_divinity', max: 1, restore: 'long' },
          itemId: item.id,
          itemName: item.name || 'Без названия',
        })
      }
    }

    const magicBonus = Math.floor(item.magic_bonus ?? 0)
    if (magicBonus) {
      const hasAc = effects.some((row) => row.type === 'ac_bonus')
      const hasAttack = effects.some((row) => row.type === 'attack_bonus')
      const hasDamage = effects.some((row) => row.type === 'damage_bonus')
      if (isArmorOrShield(item) && !hasAc) {
        out.acBonus += magicBonus
        out.notes.push(`${item.name || 'предмет'}: КД +${magicBonus}`)
      }
      if (isWeaponRow(item)) {
        if (!hasAttack) itemAttack += magicBonus
        if (!hasDamage) itemDamage += magicBonus
      }
    }

    if (itemAttack || itemDamage) {
      out.byItem[item.id] = { attackBonus: itemAttack, damageBonus: itemDamage }
      if (itemAttack) {
        out.notes.push(
          `${item.name || 'предмет'}: атака ${itemAttack >= 0 ? '+' : ''}${itemAttack}`,
        )
      }
      if (itemDamage) {
        out.notes.push(
          `${item.name || 'предмет'}: урон ${itemDamage >= 0 ? '+' : ''}${itemDamage}`,
        )
      }
    }
  }

  return out
}

const AC_CONDITIONS: AcBonusCondition[] = ['no_armor_no_shield', 'no_shield', 'no_armor']

function readAcCondition(value: unknown): AcBonusCondition | null {
  return AC_CONDITIONS.includes(value as AcBonusCondition) ? (value as AcBonusCondition) : null
}

function acConditionLabel(condition: AcBonusCondition): string {
  if (condition === 'no_armor_no_shield') return 'без доспеха и щита'
  if (condition === 'no_shield') return 'без щита'
  return 'без доспеха'
}

function isArmorOrShield(item: InventoryItem): boolean {
  return (
    item.armor_kind === 'light' ||
    item.armor_kind === 'medium' ||
    item.armor_kind === 'heavy' ||
    item.armor_kind === 'shield'
  )
}

function isWeaponRow(item: InventoryItem): boolean {
  if (isArmorOrShield(item)) return false
  return item.weapon_grip != null || item.wear_slot === 'held_main' || item.wear_slot === 'held_off'
}

/** Flat magic AC plus conditional bonuses that match what is worn. */
export function resolveGearAcBonus(
  gear: Pick<AggregatedGearEffects, 'acBonus' | 'conditionalAc'>,
  ctx: { wearingArmor: boolean; wearingShield: boolean },
): { total: number; parts: string[] } {
  const parts: string[] = []
  let total = 0
  if (gear.acBonus) {
    total += gear.acBonus
    parts.push(`магия +${gear.acBonus}`)
  }
  for (const row of gear.conditionalAc) {
    const ok =
      (row.condition === 'no_armor_no_shield' && !ctx.wearingArmor && !ctx.wearingShield) ||
      (row.condition === 'no_shield' && !ctx.wearingShield) ||
      (row.condition === 'no_armor' && !ctx.wearingArmor)
    if (!ok || !row.value) continue
    total += row.value
    parts.push(`${row.itemName} +${row.value}`)
  }
  return { total, parts }
}

const TIEFLING_FIRE = 'огонь'

/** Race list, with the PHB tiefling fire resistance when the stored grant is empty. */
export function raceResistanceSources(input: {
  slug?: string | null
  damageResistances?: string[] | null
  /** Dragonborn ancestry damage type when grant list is empty. */
  ancestryDamage?: string | null
}): string[] {
  const listed = (input.damageResistances ?? []).map((row) => row.trim()).filter(Boolean)
  if (listed.length) return listed
  const slug = input.slug?.trim() ?? ''
  if (slug === 'tiefling' || slug.startsWith('tiefling_')) return [TIEFLING_FIRE]
  const ancestry = (input.ancestryDamage || '').trim()
  if (
    ancestry &&
    (slug === 'dragonborn' ||
      slug.startsWith('dragonborn_') ||
      slug.includes('draconblood') ||
      slug.includes('ravenite'))
  ) {
    return [ancestry]
  }
  return []
}

export function sheetDamageProfile(input: {
  raceSlug?: string | null
  raceResistances?: string[] | null
  /** Dragonborn ancestry damage when grant list empty. */
  ancestryDamage?: string | null
  gear?: Pick<AggregatedGearEffects, 'resistances' | 'vulnerabilities' | 'immunities'> | null
  /** B-02: resistances / immunities from combat.effects. */
  effects?: unknown
  /** B-06: Resistant Armor on self (infusion aggregate). */
  infusionResistances?: string[] | null
  /** B-07: feat flag resistances (infernal constitution, giant gifts…). */
  featResistances?: Array<{ type: string; source: string }> | null
}): IncomingDamageProfile {
  const gear = input.gear ?? emptyAggregatedGearEffects()
  const profile = emptyDamageProfile()
  for (const raw of raceResistanceSources({
    slug: input.raceSlug,
    damageResistances: input.raceResistances,
    ancestryDamage: input.ancestryDamage,
  })) {
    addDefense(profile.resistances, raw, 'раса')
  }
  for (const row of gear.resistances) {
    for (const source of row.sources.length ? row.sources : ['предмет']) {
      addDefense(profile.resistances, row.type, source, row.nonmagical)
    }
  }
  for (const row of gear.vulnerabilities) {
    for (const source of row.sources.length ? row.sources : ['предмет']) {
      addDefense(profile.vulnerabilities, row.type, source)
    }
  }
  for (const row of gear.immunities) {
    for (const source of row.sources.length ? row.sources : ['предмет']) {
      addDefense(profile.immunities, row.type, source, row.nonmagical)
    }
  }
  for (const raw of input.infusionResistances ?? []) {
    const type = String(raw || '').trim()
    if (type) addDefense(profile.resistances, type, 'инфузия')
  }
  for (const row of input.featResistances ?? []) {
    const type = String(row.type || '').trim()
    if (type) addDefense(profile.resistances, type, row.source || 'черта')
  }
  if (input.effects != null) {
    for (const row of defensesFromActiveEffects(input.effects)) {
      if (row.kind === 'immunity') {
        addDefense(profile.immunities, row.type, row.source, row.nonmagical)
      } else {
        addDefense(profile.resistances, row.type, row.source, row.nonmagical)
      }
    }
  }
  return profile
}

export function formatSaveAdvantageNote(
  rows: SaveAdvantageLine[],
  extraNotes: string[] = [],
): string {
  const parts: string[] = []
  for (const note of extraNotes) {
    const t = note.trim()
    if (t) parts.push(t)
  }
  const spells = rows.filter((row) => row.against === 'spells')
  const magic = rows.filter((row) => row.against === 'magic')
  if (spells.length) {
    parts.push(`Преимущество против заклинаний: ${spellAdvantageNames(spells)}`)
  }
  if (magic.length) {
    parts.push(
      `Преимущество против заклинаний и магических эффектов: ${spellAdvantageNames(magic)}`,
    )
  }
  return parts.join(' · ')
}

function spellAdvantageNames(rows: SaveAdvantageLine[]): string {
  return rows
    .map((row) => (row.note ? `${row.itemName} (${row.note})` : row.itemName))
    .join(', ')
}

export function formatResistanceSummary(profile: IncomingDamageProfile): string {
  return formatDefenseList(profile.resistances)
}

function applyCappedBonus(score: number, bonus: number, max: number): number {
  if (bonus >= 0) {
    if (score >= max) return score
    return Math.min(score + bonus, max)
  }
  return score + bonus
}

/**
 * Own score (already including the character's +N) plus item +N, then the
 * highest fixed floor. A floor never lowers a higher score. Item order
 * does not matter. `extraFloors` (infusions) share that same floor.
 */
export function applyGearAbilityScores(
  base: Record<AbilityScoreKey, number>,
  gear: Pick<AggregatedGearEffects, 'abilityScores' | 'abilityMods' | 'abilityModCaps'>,
  extraFloors?: Partial<Record<AbilityScoreKey, number>> | null,
): Record<AbilityScoreKey, number> {
  const next = { ...base }
  for (const key of ABILITY_KEYS) {
    const delta = gear.abilityMods[key]
    if (typeof delta === 'number' && delta !== 0) {
      next[key] = (next[key] ?? 10) + delta
    }
  }
  for (const cap of gear.abilityModCaps ?? []) {
    next[cap.ability] = applyCappedBonus(next[cap.ability] ?? 10, cap.value, cap.max)
  }
  for (const key of ABILITY_KEYS) {
    const floors = [gear.abilityScores[key], extraFloors?.[key]].filter(
      (value): value is number => typeof value === 'number',
    )
    if (!floors.length) continue
    next[key] = Math.max(next[key] ?? 10, ...floors)
  }
  return next
}

/** Darkvision feet from gear senses (max). */
export function gearDarkvisionFt(gear: AggregatedGearEffects): number {
  const keys = ['darkvision', 'тёмное зрение', 'темное зрение', 'dark vision']
  let max = 0
  for (const [sense, range] of Object.entries(gear.senses)) {
    if (keys.includes(sense) || sense.includes('darkvision') || sense.includes('зрен')) {
      max = Math.max(max, range)
    }
  }
  return max
}

/** Append magic damage bonus to a dice string: "1d8" + 1 → "1d8+1". */
export function appendDamageBonus(damage: string, bonus: number): string {
  if (!bonus) return damage
  const trimmed = damage.trim()
  if (!trimmed) return bonus >= 0 ? `+${bonus}` : `${bonus}`
  // Already ends with +/-N — fold into that term when possible.
  const match = trimmed.match(/^(.*?)([+-]\d+)\s*$/)
  if (match) {
    const base = match[1].trim()
    const existing = Number(match[2])
    const total = existing + bonus
    if (!base) return total >= 0 ? `+${total}` : `${total}`
    return total === 0 ? base : `${base}${total >= 0 ? '+' : ''}${total}`
  }
  return `${trimmed}${bonus >= 0 ? '+' : ''}${bonus}`
}

const APPLIES_TARGETS: Record<SpellcastingAppliesTo, Array<'spell_dc' | 'spell_attack'>> = {
  attack: ['spell_attack'],
  dc: ['spell_dc'],
  both: ['spell_dc', 'spell_attack'],
}

/**
 * Sheet modifiers plus gear and the enhanced-focus infusion.
 * One list for the spell panel, the book, the cast dialog, and the classic blank.
 * Class-scoped lines use `class_slug` (M3): a wizard bonus does not touch artificer spells,
 * and a spell with no class (race, feat, item, scroll) does not take a class bonus.
 */
export function appendSpellCastModifiers(input: {
  modifiers: BonusLine[]
  gear: Pick<AggregatedGearEffects, 'spellcastingLines'>
  infusionSpellAttack?: number
}): BonusLine[] {
  const extra: BonusLine[] = []
  for (const line of input.gear.spellcastingLines) {
    const classes = line.classes.length ? line.classes : [null]
    for (const classSlug of classes) {
      for (const target of APPLIES_TARGETS[line.appliesTo]) {
        extra.push(
          createBonusLine({
            id: `gear:spell:${line.itemId}:${target}:${classSlug ?? 'all'}`,
            target,
            label: line.label,
            op: '+',
            expr: String(line.value),
            enabled: true,
            source: 'gear',
            ...(classSlug ? { class_slug: classSlug } : {}),
          }),
        )
      }
    }
  }
  const infusion = Math.floor(input.infusionSpellAttack ?? 0)
  if (infusion) {
    extra.push(
      createBonusLine({
        id: 'infusion:spell_attack',
        target: 'spell_attack',
        label: 'Инфузия (фокус)',
        op: '+',
        expr: String(infusion),
        enabled: true,
        source: 'system',
      }),
    )
  }
  return extra.length ? [...input.modifiers, ...extra] : input.modifiers
}
