import { useMemo, useState } from 'react'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  listCombatConsumables,
  MAX_COMBAT_CONSUMABLE_FAVORITES,
} from './combatConsumables'
import { formatAttackRoll, type DeskRollMode } from './deskRolls'
import {
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import type { WeaponAttack } from './AttacksPanel'
import type { InventoryItem } from './inventory'
import {
  IconConsumable,
  IconMelee,
  IconRanged,
  IconResource,
  attackRowIconKind,
} from './attackIcons'

type PlayDeskAttacksCompactProps = {
  weapons: WeaponAttack[]
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  gearBonusesByItem?: Record<string, { attackBonus: number; damageBonus: number }>
  resources: SheetResource[]
  inventoryItems: InventoryItem[]
  favoriteConsumableIds?: string[]
  onToggleHeld?: (attack: WeaponAttack) => void
  onSpendResource?: (id: string) => void
  /** Spend 1 from inventory qty (ammo, potions, …). */
  onSpendConsumable?: (itemId: string) => void
  onToggleConsumableFavorite?: (itemId: string) => void
  onToast?: (message: string) => void
  onOpenSettings: () => void
  rollMode?: DeskRollMode
}

export function PlayDeskAttacksCompact({
  weapons,
  abilities,
  proficiencyBonus,
  gearBonusesByItem = {},
  resources,
  inventoryItems,
  favoriteConsumableIds = [],
  onToggleHeld,
  onSpendResource,
  onSpendConsumable,
  onToggleConsumableFavorite,
  onToast,
  onOpenSettings,
  rollMode = 'normal',
}: PlayDeskAttacksCompactProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const named = weapons.filter((row) => row.name.trim())
  const combatResources = resources.filter(
    (row) => row.max > 0 && row.name.trim() && row.used < row.max,
  )
  const consumables = useMemo(
    () => listCombatConsumables(inventoryItems, favoriteConsumableIds),
    [inventoryItems, favoriteConsumableIds],
  )
  const favoriteCount = favoriteConsumableIds.length
  const pickerOptions = useMemo(() => {
    const favored = new Set(favoriteConsumableIds)
    return inventoryItems.filter(
      (item) =>
        item.name.trim() &&
        !item.parent_id &&
        (item.qty ?? 0) > 0 &&
        !favored.has(item.id),
    )
  }, [inventoryItems, favoriteConsumableIds])

  return (
    <div className="play-desk-compact">
      <div className="play-desk-compact__head">
        <h3>Атаки</h3>
        <div className="play-desk-compact__head-actions">
          <button
            type="button"
            className="play-desk-compact__link play-desk-compact__link--settings"
            onClick={onOpenSettings}
          >
            Настройки
          </button>
        </div>
      </div>

      <div className="play-desk-compact__list play-desk-compact__list--dense">
        {named.length === 0 ? (
          <p className="play-desk-compact__empty">Нет атак — добавь в полной панели</p>
        ) : (
          named.map((attack) => {
            const mod = abilityModifier(abilities[attack.ability])
            const gear = attack.inventory_item_id
              ? gearBonusesByItem[attack.inventory_item_id]
              : undefined
            const attackBonus =
              mod +
              (attack.is_proficient ? proficiencyBonus : 0) +
              (gear?.attackBonus ?? 0)
            const dmgBonus = mod + (gear?.damageBonus ?? 0)
            const dmg =
              attack.damage +
              (dmgBonus ? `${dmgBonus >= 0 ? '+' : ''}${dmgBonus}` : '')
            const dmgLine = `${dmg || '—'}${attack.damage_type ? ` ${attack.damage_type}` : ''}`
            const iconKind = attackRowIconKind({
              name: attack.name,
              ability: attack.ability,
            })
            return (
              <div key={attack.id} className="play-desk-compact__row is-dense is-attack">
                <button
                  type="button"
                  className="play-desk-compact__hit"
                  title="Бросок атаки и урона"
                  onClick={() =>
                    onToast?.(
                      formatAttackRoll({
                        name: attack.name,
                        attackBonus,
                        damageExpr: dmg || attack.damage,
                        damageType: attack.damage_type,
                        mode: rollMode,
                      }),
                    )
                  }
                >
                  <div className="play-desk-compact__row-main">
                    {iconKind === 'ranged' ? (
                      <IconRanged className="play-desk-compact__row-icon" />
                    ) : (
                      <IconMelee className="play-desk-compact__row-icon" />
                    )}
                    <b>{attack.name}</b>
                    {attack.qty != null && attack.qty > 1 ? (
                      <span className="play-desk-compact__tag">×{attack.qty}</span>
                    ) : null}
                    {attack.held ? (
                      <span className="play-desk-compact__tag is-on">в руках</span>
                    ) : null}
                  </div>
                  <span className="play-desk-compact__mod">{formatModifier(attackBonus)}</span>
                  <span className="play-desk-compact__dmg">{dmgLine}</span>
                </button>
                {onToggleHeld && attack.inventory_item_id ? (
                  <button
                    type="button"
                    className={`play-desk-compact__hold${attack.held ? ' is-on' : ''}`}
                    onClick={() => onToggleHeld(attack)}
                    title={attack.held ? 'Убрать из рук' : 'Взять в руки'}
                  >
                    {attack.held ? 'удерж.' : 'взять'}
                  </button>
                ) : null}
              </div>
            )
          })
        )}

        {combatResources.map((row) => {
          const remaining = Math.max(0, row.max - row.used)
          return (
            <div key={row.id} className="play-desk-compact__row is-dense is-resource">
              <button
                type="button"
                className="play-desk-compact__hit"
                disabled={!onSpendResource || remaining <= 0}
                onClick={() => onSpendResource?.(row.id)}
              >
                <div className="play-desk-compact__row-main">
                  <IconResource className="play-desk-compact__row-icon" />
                  <b>{row.name}</b>
                  <span className="play-desk-compact__tag">ресурс</span>
                </div>
                <span className="play-desk-compact__mod">
                  {remaining}/{row.max}
                </span>
                <span className="play-desk-compact__dmg">потратить</span>
              </button>
            </div>
          )
        })}
      </div>

      <div className="play-desk-compact__consumables">
        <div className="play-desk-compact__subhead">
          <span className="play-desk-compact__subhead-label">
            <IconConsumable className="play-desk-compact__tag-icon" />
            Расходники
          </span>
          {favoriteCount > 0 ? (
            <span className="play-desk-compact__subhead-meta">
              избр. {favoriteCount}/{MAX_COMBAT_CONSUMABLE_FAVORITES}
            </span>
          ) : null}
        </div>

        {consumables.length === 0 ? (
          <p className="play-desk-compact__empty">
            Нет расходников — добавь в избранное (до {MAX_COMBAT_CONSUMABLE_FAVORITES})
          </p>
        ) : (
          consumables.map(({ item, favorite }) => {
            const qty = item.qty ?? 0
            const canSpend = Boolean(onSpendConsumable) && qty > 0
            return (
              <div
                key={item.id}
                className={`play-desk-compact__cons-row${favorite ? ' is-fav' : ''}`}
              >
                <button
                  type="button"
                  className="play-desk-compact__cons-main is-action"
                  disabled={!canSpend}
                  title={canSpend ? `Потратить 1 «${item.name}»` : item.name}
                  onClick={() => {
                    if (!canSpend) {
                      onToast?.(`${item.name}: ×${qty}`)
                      return
                    }
                    onSpendConsumable?.(item.id)
                  }}
                >
                  <span className="play-desk-compact__cons-name">
                    {favorite ? (
                      <span className="play-desk-compact__tag is-fav">избр.</span>
                    ) : null}
                    {item.name}
                  </span>
                  <b>{qty}</b>
                  <span className="play-desk-compact__cons-spend">потратить</span>
                </button>
                {onToggleConsumableFavorite ? (
                  <button
                    type="button"
                    className={`play-desk-compact__cons-fav${favorite ? ' is-on' : ''}`}
                    title={
                      favorite
                        ? 'Убрать из избранного'
                        : favoriteCount >= MAX_COMBAT_CONSUMABLE_FAVORITES
                          ? `Уже ${MAX_COMBAT_CONSUMABLE_FAVORITES} избранных`
                          : 'В избранное боя'
                    }
                    disabled={!favorite && favoriteCount >= MAX_COMBAT_CONSUMABLE_FAVORITES}
                    onClick={() => onToggleConsumableFavorite(item.id)}
                  >
                    {favorite ? '★' : '☆'}
                  </button>
                ) : null}
              </div>
            )
          })
        )}

        {onToggleConsumableFavorite && favoriteCount < MAX_COMBAT_CONSUMABLE_FAVORITES ? (
          <div className="play-desk-compact__cons-add">
            {pickerOpen ? (
              <label className="play-desk-compact__cons-picker">
                <span>В избранное</span>
                <select
                  className="play-select"
                  defaultValue=""
                  onChange={(event) => {
                    const id = event.target.value
                    if (!id) return
                    onToggleConsumableFavorite(id)
                    setPickerOpen(false)
                  }}
                >
                  <option value="">выбери предмет…</option>
                  {pickerOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {(item.qty ?? 0) > 1 ? ` ×${item.qty}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="play-desk-compact__link"
                  onClick={() => setPickerOpen(false)}
                >
                  отмена
                </button>
              </label>
            ) : (
              <button
                type="button"
                className="play-desk-compact__link"
                onClick={() => setPickerOpen(true)}
                disabled={pickerOptions.length === 0}
              >
                + в избранное ({favoriteCount}/{MAX_COMBAT_CONSUMABLE_FAVORITES})
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
