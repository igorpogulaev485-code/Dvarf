import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Field, Input, Panel, Stack, Text } from '../../ui'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'

export type AttackSourceKind = 'weapon' | 'artifact' | 'custom'

/** B8: ближнее / дальнее — для anti-air и бюджета. */
export type AttackRangeKind = 'melee' | 'ranged' | 'reach' | 'thrown'

/** Режим активации артефакта (заряд → баф на время). */
export type WeaponActivation = {
  id: string
  name: string
  action_cost: string
  duration: string
  duration_rounds: number
  active_damage: string
  active_damage_type: string
  advantage: boolean
  resource_id: string | null
  base_damage: string
  base_damage_type: string
  text?: string
}

export type WeaponAttack = {
  id: string
  name: string
  catalog_id: string | null
  source_kind: AttackSourceKind
  ability: AbilityKey
  is_proficient: boolean
  damage: string
  damage_type: string
  range_kind: AttackRangeKind
  /** Бонус магии к атаке (артефакт +1 и т.п.) */
  magic_bonus?: number
  source_item_id?: string | null
  req_ability?: AbilityKey | null
  req_score?: number | null
  activation?: WeaponActivation | null
  mode_active?: boolean
}

const RANGE_KIND_OPTIONS: Array<{ id: AttackRangeKind; label: string }> = [
  { id: 'melee', label: 'Ближнее' },
  { id: 'ranged', label: 'Дальнее' },
  { id: 'reach', label: 'Досяг.' },
  { id: 'thrown', label: 'Метат.' },
]

const RANGED_NAME_RE =
  /лук|арбалет|пращ|дротик|javelin|bow|crossbow|sling|dart|пистолет|ружь/i

const COST_LABEL: Record<string, string> = {
  action: 'действие',
  bonus: 'бонусное',
  reaction: 'реакция',
  free: 'свободно',
  special: 'особое',
}

export function inferAttackRangeKind(
  name: string,
  data?: Record<string, unknown> | null,
): AttackRangeKind {
  if (data?.ranged === true) return 'ranged'
  if (data?.thrown === true) return 'thrown'
  if (data?.reach === true) return 'reach'
  const props = data?.properties
  if (Array.isArray(props)) {
    const joined = props.map(String).join(' ').toLowerCase()
    if (joined.includes('ammunition') || joined.includes('ranged') || joined.includes('дальн')) {
      return 'ranged'
    }
    if (joined.includes('thrown') || joined.includes('метат')) return 'thrown'
    if (joined.includes('reach') || joined.includes('досяг')) return 'reach'
  }
  if (RANGED_NAME_RE.test(name)) return 'ranged'
  return 'melee'
}

export function isAttackRangeKind(value: unknown): value is AttackRangeKind {
  return value === 'melee' || value === 'ranged' || value === 'reach' || value === 'thrown'
}

type AttacksPanelProps = {
  edition: RulesEdition
  weapons: WeaponAttack[]
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  resources?: SheetResource[]
  onChange: (weapons: WeaponAttack[]) => void
  onResourcesChange?: (resources: SheetResource[]) => void
}

function createAttack(): WeaponAttack {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `attack-${Date.now()}`,
    name: '',
    catalog_id: null,
    source_kind: 'custom',
    ability: 'str',
    is_proficient: true,
    damage: '',
    damage_type: '',
    range_kind: 'melee',
  }
}

function readCatalogAbility(data: Record<string, unknown>): AbilityKey {
  const value = data.ability
  return ABILITY_KEYS.includes(value as AbilityKey) ? (value as AbilityKey) : 'str'
}

function sourceFromCatalog(entry: CatalogEntry): AttackSourceKind {
  if (entry.kind === 'weapon') return 'weapon'
  if (entry.kind === 'item') return 'artifact'
  return 'custom'
}

function sourceLabel(kind: AttackSourceKind): string {
  if (kind === 'weapon') return 'Оружие'
  if (kind === 'artifact') return 'Артефакт'
  return 'Своё'
}

export function AttacksPanel({
  edition,
  weapons,
  abilities,
  proficiencyBonus,
  resources = [],
  onChange,
  onResourcesChange,
}: AttacksPanelProps) {
  function updateAttack(id: string, patch: Partial<WeaponAttack>) {
    onChange(weapons.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function applyCatalog(id: string, value: string, selected: CatalogEntry | null) {
    if (!selected) {
      updateAttack(id, { name: value, catalog_id: null, source_kind: 'custom' })
      return
    }
    const data = selected.data ?? {}
    updateAttack(id, {
      name: selected.name_ru,
      catalog_id: selected.id,
      source_kind: sourceFromCatalog(selected),
      ability: readCatalogAbility(data),
      damage: typeof data.damage === 'string' ? data.damage : '',
      damage_type: typeof data.damage_type === 'string' ? data.damage_type : '',
      range_kind: inferAttackRangeKind(selected.name_ru, data),
    })
  }

  function activateMode(attack: WeaponAttack) {
    const mode = attack.activation
    if (!mode || attack.mode_active) return
    const resource = resources.find((r) => r.id === mode.resource_id)
    if (resource && resource.used >= resource.max) return
    if (resource && onResourcesChange) {
      onResourcesChange(
        resources.map((r) =>
          r.id === resource.id ? { ...r, used: Math.min(r.max, r.used + 1) } : r,
        ),
      )
    }
    const baseDamage = mode.base_damage || attack.damage
    const baseType = mode.base_damage_type || attack.damage_type
    updateAttack(attack.id, {
      mode_active: true,
      damage: mode.active_damage || attack.damage,
      damage_type: mode.active_damage_type || attack.damage_type,
      activation: {
        ...mode,
        base_damage: baseDamage,
        base_damage_type: baseType,
      },
    })
  }

  function deactivateMode(attack: WeaponAttack) {
    const mode = attack.activation
    if (!mode || !attack.mode_active) return
    updateAttack(attack.id, {
      mode_active: false,
      damage: mode.base_damage || attack.damage,
      damage_type: mode.base_damage_type || attack.damage_type,
    })
  }

  return (
    <Panel title="Атаки">
      <Stack gap={12}>
        <Text tone="muted">
          Атака может быть обычным оружием или артефактом — у обоих есть урон. Артефакт с
          режимом: потрать заряд → урон/тип/преимущество на время.
        </Text>

        {weapons.length === 0 ? (
          <Text tone="muted">Пока нет атак — добавь первую.</Text>
        ) : null}

        {weapons.map((attack) => {
          const magic = Math.floor(attack.magic_bonus ?? 0)
          const attackBonus =
            abilityModifier(abilities[attack.ability]) +
            (attack.is_proficient ? proficiencyBonus : 0) +
            magic
          const reqKey = attack.req_ability
          const reqScore = attack.req_score ?? 0
          const reqMet =
            !reqKey || !reqScore
              ? true
              : (abilities[reqKey] ?? 0) >= reqScore
          const mode = attack.activation
          const resource = mode?.resource_id
            ? resources.find((r) => r.id === mode.resource_id)
            : null
          const chargesLeft = resource
            ? Math.max(0, resource.max - resource.used)
            : mode
              ? 1
              : 0
          const canActivate =
            Boolean(mode) &&
            !attack.mode_active &&
            chargesLeft > 0 &&
            Boolean(onResourcesChange || !mode?.resource_id)

          return (
            <div
              key={attack.id}
              className={`attack-card${attack.mode_active ? ' attack-card--mode-on' : ''}`}
            >
              <div className="attack-card__meta">
                <span className={`attack-source attack-source--${attack.source_kind}`}>
                  {sourceLabel(attack.source_kind)}
                </span>
                {attack.mode_active ? (
                  <span className="attack-mode-badge">режим активен</span>
                ) : null}
                {attack.mode_active && mode?.advantage ? (
                  <span className="attack-mode-badge attack-mode-badge--adv">преимущество</span>
                ) : null}
              </div>

              {reqKey && reqScore ? (
                <Text tone={reqMet ? 'muted' : 'danger'}>
                  Требуется {ABILITY_LABELS[reqKey]} {reqScore}+
                  {reqMet ? '' : ` · сейчас ${abilities[reqKey] ?? 0}`}
                </Text>
              ) : null}

              <div className="attack-card__grid">
                <Field label="Оружие или артефакт">
                  <CatalogCombobox
                    kinds={['weapon', 'item']}
                    edition={edition}
                    value={attack.name}
                    placeholder="Боевой молот, Молот бури…"
                    onChange={(value, selected) => applyCatalog(attack.id, value, selected)}
                  />
                </Field>
                <Field label="Характеристика">
                  <select
                    className="ui-input"
                    value={attack.ability}
                    onChange={(event) =>
                      updateAttack(attack.id, {
                        ability: event.target.value as AbilityKey,
                      })
                    }
                  >
                    {ABILITY_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {ABILITY_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Бонус атаки">
                  <Input value={formatModifier(attackBonus)} readOnly />
                </Field>
                <Field label="Урон">
                  <Input
                    value={attack.damage}
                    placeholder="1d8"
                    onChange={(event) => updateAttack(attack.id, { damage: event.target.value })}
                  />
                </Field>
                <Field label="Тип урона">
                  <Input
                    value={attack.damage_type}
                    placeholder="дробящий"
                    onChange={(event) =>
                      updateAttack(attack.id, { damage_type: event.target.value })
                    }
                  />
                </Field>
              </div>

              {mode ? (
                <div className="attack-mode">
                  <Text tone="muted">
                    {mode.name}: {COST_LABEL[mode.action_cost] || mode.action_cost} ·{' '}
                    {mode.duration || `${mode.duration_rounds} раунд.`}
                    {mode.active_damage ? ` · → ${mode.active_damage}` : ''}
                    {mode.active_damage_type ? ` ${mode.active_damage_type}` : ''}
                    {mode.advantage ? ' · преимущество' : ''}
                    {resource ? ` · заряды ${chargesLeft}/${resource.max}` : ''}
                  </Text>
                  <div className="inline-actions">
                    {!attack.mode_active ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canActivate}
                        onClick={() => activateMode(attack)}
                      >
                        Активировать
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => deactivateMode(attack)}
                      >
                        Снять режим
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="attack-card__footer">
                <button
                  type="button"
                  className={`sheet-chip${attack.is_proficient ? ' is-on' : ''}`}
                  onClick={() =>
                    updateAttack(attack.id, { is_proficient: !attack.is_proficient })
                  }
                >
                  {attack.is_proficient ? 'Владение' : 'Без владения'}
                </button>
                <div className="session-gen-chips" aria-label="Дистанция атаки">
                  {RANGE_KIND_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`session-gen-chip${attack.range_kind === opt.id ? ' is-on' : ''}`}
                      onClick={() => updateAttack(attack.id, { range_kind: opt.id })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => onChange(weapons.filter((item) => item.id !== attack.id))}
                >
                  Удалить
                </Button>
              </div>
            </div>
          )
        })}

        <div>
          <Button variant="secondary" onClick={() => onChange([...weapons, createAttack()])}>
            Добавить атаку
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
