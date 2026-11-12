/**
 * Setting-artifact abilities → the same item.effects the catalog uses.
 * Legacy sheets (bonus baked into the score, no effects array) are repaired
 * on open. No migration: the snapshot or setting_artifact_id is enough.
 */

import type { GearEffect } from '../../shared/dnd/gearCatalog'
import { asRecord } from './sheetTypes'

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
const DEFAULT_MAX = 20

export function gearResourceId(itemId: string, abilityId: string): string {
  return `gear-res:${itemId}:${abilityId}`
}

export function gearCompanionId(itemId: string, abilityId: string): string {
  return `gear-companion:${itemId}:${abilityId}`
}

/** Same mapping as backend effects_from_abilities. */
export function effectsFromAbilities(abilities: Array<Record<string, unknown>>): GearEffect[] {
  const effects: GearEffect[] = []
  for (const ab of abilities) {
    const kind = String(ab.kind || '')
    const name = String(ab.name || '').trim()
    const text = String(ab.text || '').trim()
    const abilityId = String(ab.id || '')
    if (kind === 'passive') {
      const target = String(ab.bonus_target || '')
      const value = num(ab.bonus_value)
      const key = String(ab.ability_key || 'str')
      if (target === 'ac' && value) effects.push({ type: 'ac_bonus', value })
      else if (target === 'attack' && value) effects.push({ type: 'attack_bonus', value })
      else if (target === 'damage' && value) effects.push({ type: 'damage_bonus', value })
      else if (target === 'ability' && value) {
        effects.push({
          type: 'ability_mod',
          ability: key as 'str',
          value,
          max: ab.max_score == null ? DEFAULT_MAX : num(ab.max_score),
        })
      } else if (target === 'save' && value) {
        effects.push({ type: 'save_bonus', ability: key as 'str', value })
      } else if (target === 'speed' && value) {
        effects.push({ type: 'speed', mode: 'walk', value_ft: value })
      } else if (target === 'darkvision' && value) {
        effects.push({ type: 'sense', sense: 'darkvision', range_ft: value })
      }
      continue
    }
    if (kind === 'skill') {
      const value = num(ab.bonus_value)
      const skill = String(ab.skill_key || '')
      if (skill && value) effects.push({ type: 'skill_bonus', skill, value })
      continue
    }
    if (kind === 'tool') {
      const tool = String(ab.tool_name || name).trim()
      if (tool) effects.push({ type: 'sheet_flag', flag: 'tool_proficiency', value: tool })
      continue
    }
    if (kind === 'resource') {
      effects.push({
        type: 'resource',
        id: abilityId || 'charges',
        max: num(ab.charges) || 1,
        restore: (ab.reset as 'long') || 'long',
      })
      continue
    }
    if (kind === 'action') {
      effects.push({ type: 'custom_note', text: text ? `${name || 'Действие'}: ${text}` : name || 'Действие' })
      if (ab.charges) {
        effects.push({
          type: 'resource',
          id: abilityId || 'action',
          max: num(ab.charges) || 1,
          restore: (ab.reset as 'long') || 'long',
        })
      }
      continue
    }
    if (kind === 'mode') {
      effects.push({
        type: 'weapon_mode',
        ability_id: abilityId,
        name: name || 'Активация',
        action_cost: ab.action_cost || 'bonus',
        active_damage: ab.active_damage || '',
        advantage: ab.advantage !== false,
      })
      effects.push({
        type: 'resource',
        id: abilityId || 'mode',
        max: num(ab.charges) || 1,
        restore: (ab.reset as 'short') || 'short',
      })
      continue
    }
    if (kind === 'requirement') {
      effects.push({
        type: 'sheet_flag',
        flag: 'requirement',
        ability: String(ab.ability_key || 'str'),
        min: num(ab.min_score) || 15,
      })
      continue
    }
    if (kind === 'spell_slot') {
      const level = num(ab.slot_level) || 1
      if (level > 0) {
        effects.push({ type: 'spell_slots', level, delta: num(ab.slot_count) || 1 })
      }
      continue
    }
    if (kind === 'spell') {
      effects.push({
        type: 'artifact_spell',
        name: String(ab.spell_name || name || 'Заклинание'),
        level: num(ab.spell_level),
        damage: String(ab.damage || ''),
      })
      continue
    }
    if (kind === 'companion') {
      const bonus = num(ab.attack_bonus)
      const attack = ab.attack_damage
        ? `${bonus >= 0 ? '+' : ''}${bonus} ${ab.attack_damage} ${ab.attack_damage_type || ''}`.trim()
        : ''
      effects.push({
        type: 'companion',
        kind: 'ally',
        ability_id: abilityId,
        name_ru: String(ab.companion_name || name || 'Напарник'),
        hp_max: num(ab.hp_max) || 10,
        ac: num(ab.ac) || 12,
        actions: attack,
        notes: String(ab.duration || text || ''),
      })
      if (ab.charges) {
        effects.push({
          type: 'resource',
          id: abilityId || 'companion',
          max: num(ab.charges) || 1,
          restore: (ab.reset as 'long') || 'long',
        })
      }
      continue
    }
    if (kind === 'resistance') {
      const damageType = String(ab.damage_type || '')
      if (!damageType) continue
      const mode = String(ab.resist_mode || 'resistance')
      const type = mode === 'immunity' ? 'immunity' : mode === 'vulnerability' ? 'vulnerability' : 'resistance'
      effects.push({ type, damage_type: damageType })
      continue
    }
    if (kind === 'condition_immunity') {
      effects.push({
        type: 'condition_immunity',
        slug: String(ab.condition_slug || ''),
        name: String(ab.condition_name || ab.condition_slug || ''),
      })
      continue
    }
    if (kind === 'weapon') {
      const bonus = num(ab.magic_bonus)
      if (bonus) {
        effects.push({ type: 'attack_bonus', value: bonus })
        effects.push({ type: 'damage_bonus', value: bonus })
      }
      const dice = String(ab.damage || '')
      if (name || dice || text) {
        effects.push({
          type: 'custom_note',
          text: [name || 'Атака', dice, String(ab.damage_type || ''), text].filter(Boolean).join(' '),
        })
      }
      continue
    }
    if (kind === 'trait' || name || text) {
      effects.push({ type: 'custom_note', text: text ? `${name || 'Черта'}: ${text}` : name || 'Черта' })
    }
  }
  return effects
}

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.floor(n) : 0
}

function needsHydrate(sheet: Record<string, unknown>): boolean {
  const items = asRecord(sheet.inventory).items
  if (!Array.isArray(items)) return false
  return items.some((raw) => {
    if (!raw || typeof raw !== 'object') return false
    const item = raw as Record<string, unknown>
    if (item.artifact_live === true) return false
    return Boolean(item.artifact_snapshot || item.setting_artifact_id || item.magic_mods)
  })
}

/**
 * Repair a sheet JSON before the editor reads it.
 * Already-live rows (artifact_live) are left alone.
 */
export function hydrateArtifactSheet(sheet: Record<string, unknown>): Record<string, unknown> {
  if (!needsHydrate(sheet)) return sheet
  const next = structuredClone(sheet)
  const inventory = asRecord(next.inventory)
  const items = Array.isArray(inventory.items) ? inventory.items : []
  const attuned = new Set<string>()
  if (Array.isArray(next.attunements)) {
    for (const slot of next.attunements) {
      const id = asRecord(slot).item_id
      if (typeof id === 'string') attuned.add(id)
    }
  }
  const abilitiesBlock = asRecord(next.abilities)
  const combat = asRecord(next.combat)
  const identity = asRecord(next.identity)
  const weapons = Array.isArray(next.weapons) ? next.weapons : []
  const companions = Array.isArray(next.companions) ? next.companions : []
  const resources = Array.isArray(next.resources) ? next.resources : []
  const spells = asRecord(next.spells)

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Record<string, unknown>
    if (item.artifact_live === true) continue
    const snap = asRecord(item.artifact_snapshot)
    const abilities = Array.isArray(snap.abilities)
      ? snap.abilities.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
      : []
    if (!abilities.length) continue
    const existing = item.effects
    if (Array.isArray(existing) && existing.length) {
      item.artifact_live = true
      continue
    }
    const mods = asRecord(item.magic_mods)
    item.effects = effectsFromAbilities(abilities)
    item.item_kind = item.item_kind || 'magic'
    const baked = item.requires_attunement ? attuned.has(String(item.id || '')) : true
    if (baked) {
      unbake(item, mods, abilities, {
        abilitiesBlock,
        combat,
        identity,
        weapons,
        companions,
        resources,
        spells,
      })
      item.equipped = true
    }
    item.artifact_live = true
  }

  next.abilities = abilitiesBlock
  next.combat = combat
  next.identity = identity
  next.weapons = weapons
  next.companions = companions
  next.resources = resources
  next.spells = spells
  inventory.items = items
  next.inventory = inventory
  return next
}

function unbake(
  item: Record<string, unknown>,
  mods: Record<string, unknown>,
  abilities: Array<Record<string, unknown>>,
  ctx: {
    abilitiesBlock: Record<string, unknown>
    combat: Record<string, unknown>
    identity: Record<string, unknown>
    weapons: unknown[]
    companions: unknown[]
    resources: unknown[]
    spells: Record<string, unknown>
  },
) {
  const itemId = String(item.id || '')
  const abilityMax = asRecord(mods.ability_max)
  const deltas = asRecord(mods.abilities)
  for (const key of ABILITY_KEYS) {
    const delta = num(deltas[key])
    if (!delta) continue
    const row = asRecord(ctx.abilitiesBlock[key])
    const score = num(row.score) || 10
    const ceiling = num(abilityMax[key] || row.max_score) || DEFAULT_MAX
    if (score < ceiling) row.score = Math.max(1, score - delta)
    if (ceiling > DEFAULT_MAX) row.max_score = Math.max(num(row.max_score), ceiling)
    ctx.abilitiesBlock[key] = row
  }
  const speedDelta = num(mods.speed)
  if (speedDelta && ctx.combat.speed != null) {
    ctx.combat.speed = Math.max(0, num(ctx.combat.speed) - speedDelta)
  }
  if (num(mods.ac) && ctx.combat.magic_ac_bonus) {
    delete ctx.combat.ac
    delete ctx.combat.magic_ac_bonus
  }
  const dv = num(mods.darkvision)
  if (dv) {
    const seen = Math.max(dv, num(ctx.combat.darkvision || ctx.identity.darkvision))
    ctx.combat.darkvision = seen
    ctx.identity.darkvision = seen
  }
  const dmgBonus = num(mods.damage)
  const suffix = dmgBonus > 0 ? `+${dmgBonus}` : dmgBonus ? String(dmgBonus) : ''
  const modes = abilities.filter((ab) => ab.kind === 'mode')
  const reqs = abilities.filter((ab) => ab.kind === 'requirement')
  for (const raw of ctx.weapons) {
    if (!raw || typeof raw !== 'object') continue
    const weapon = raw as Record<string, unknown>
    const linked = String(weapon.source_item_id || weapon.inventory_item_id || '')
    if (linked !== itemId) continue
    weapon.source_item_id = itemId
    weapon.inventory_item_id = itemId
    if (suffix && String(weapon.damage || '').endsWith(suffix)) {
      weapon.damage = String(weapon.damage).slice(0, -suffix.length)
    }
    if (reqs.length && weapon.req_score == null) {
      weapon.req_ability = String(reqs[0].ability_key || 'str')
      weapon.req_score = num(reqs[0].min_score) || 15
    }
    if (modes.length && !weapon.activation) {
      const ab = modes[0]
      const base = String(weapon.damage || '')
      weapon.activation = {
        id: String(ab.id || ''),
        name: String(ab.name || 'Активация'),
        action_cost: String(ab.action_cost || 'bonus'),
        duration: String(ab.duration || '1 минута'),
        duration_rounds: num(ab.duration_rounds) || 10,
        active_damage: String(ab.active_damage || base),
        active_damage_type: String(ab.active_damage_type || weapon.damage_type || ''),
        advantage: ab.advantage !== false,
        resource_id: gearResourceId(itemId, String(ab.id || 'mode')),
        base_damage: base,
        base_damage_type: String(weapon.damage_type || ''),
        text: String(ab.text || ''),
      }
      weapon.mode_active = weapon.mode_active === true
    }
  }
  for (const raw of ctx.companions) {
    if (!raw || typeof raw !== 'object') continue
    const companion = raw as Record<string, unknown>
    if (String(companion.source_item_id || '') !== itemId) continue
    const match = abilities.find((ab) => ab.kind === 'companion')
    if (!match) continue
    companion.id = gearCompanionId(itemId, String(match.id || 'ally'))
    companion.kind = companion.kind || 'ally'
    companion.role = companion.role || 'ally'
    const hpMax = num(match.hp_max) || num(companion.hp_max) || 10
    const ac = num(match.ac) || num(companion.ac) || 12
    const stats = asRecord(companion.stats)
    companion.stats = {
      hp: typeof stats.hp === 'number' ? stats.hp : num(companion.hp_current) || hpMax,
      hp_max: typeof stats.hp_max === 'number' ? stats.hp_max : hpMax,
      ac: typeof stats.ac === 'number' ? stats.ac : ac,
      speed: stats.speed ?? null,
    }
    if (!companion.actions && match.attack_damage) {
      const bonus = num(match.attack_bonus)
      companion.actions =
        `${bonus >= 0 ? '+' : ''}${bonus} ${match.attack_damage} ${match.attack_damage_type || ''}`.trim()
    }
    if (!companion.notes && match.duration) companion.notes = String(match.duration)
  }
  const deltasSlots = asRecord(ctx.spells.gear_slot_deltas)
  for (const ab of abilities) {
    if (ab.kind !== 'spell_slot') continue
    const level = num(ab.slot_level) || 1
    if (level <= 0) continue
    const count = num(ab.slot_count) || 1
    if (num(deltasSlots[String(level)]) < count) deltasSlots[String(level)] = count
  }
  if (Object.keys(deltasSlots).length) ctx.spells.gear_slot_deltas = deltasSlots
}
