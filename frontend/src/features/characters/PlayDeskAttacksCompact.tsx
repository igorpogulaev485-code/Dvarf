import { useMemo, useState } from 'react'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  listCombatConsumables,
  MAX_COMBAT_CONSUMABLE_FAVORITES,
} from './combatConsumables'
import type { ConsumableSpendLogEntry } from './consumableSpend'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import { fightingStyleAttackBonus } from '../../shared/dnd/fightingStyles'
import {
  effectiveMartialArtsDamage,
  isMonkUnarmedAttack,
  isMonkWeaponName,
  monkAttackAbility,
} from '../../shared/dnd/martialArts'
import { formatAttackRoll, type DeskRollMode } from './deskRolls'
import {
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import type { WeaponAttack } from './AttacksPanel'
import type { InventoryItem } from './inventory'
import { isCastableSpellScroll } from './spellScroll'
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
  /** Active fighting style id (archery → +2 on ranged attacks). */
  fightingStyleId?: string | null
  /** Monk Martial Arts die (e.g. "1к10"). */
  martialArtsDie?: string | null
  /** Active Artificer infusion weapon bonuses. */
  infusionAttackBonus?: number
  infusionDamageBonus?: number
  resources: SheetResource[]
  inventoryItems: InventoryItem[]
  favoriteConsumableIds?: string[]
  /** Combat-desk class features (e.g. Reckless Attack). */
  combatFeatures?: UnlockedFeature[]
  /** Fired when a combat feature chip is toggled (e.g. Reckless → advantage). */
  onCombatFeatureToggle?: (featureId: string, active: boolean) => void
  onToggleHeld?: (attack: WeaponAttack) => void
  onSpendResource?: (id: string) => void
  /** Spend N from inventory qty (ammo, potions, …). Default 1. */
  onSpendConsumable?: (itemId: string, amount?: number) => void
  /** Open qty pad (item name → amount → confirm). */
  onOpenConsumableSpendPad?: (itemId: string) => void
  /** Bound spell scroll: open cast flow (consumes on confirm). */
  onCastScroll?: (itemId: string) => void
  onToggleConsumableFavorite?: (itemId: string) => void
  /** Session spend journal (recent, soft-undo). */
  consumableSpendLog?: ConsumableSpendLogEntry[]
  onUndoConsumableSpend?: (logId: string) => void
  onToast?: (message: string) => void
  onOpenSettings: () => void
  rollMode?: DeskRollMode
}

function formatSpendTime(atMs: number): string {
  try {
    return new Date(atMs).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function PlayDeskAttacksCompact({
  weapons,
  abilities,
  proficiencyBonus,
  gearBonusesByItem = {},
  fightingStyleId = null,
  martialArtsDie = null,
  infusionAttackBonus = 0,
  infusionDamageBonus = 0,
  resources,
  inventoryItems,
  favoriteConsumableIds = [],
  combatFeatures = [],
  onCombatFeatureToggle,
  onToggleHeld,
  onSpendResource,
  onSpendConsumable,
  onOpenConsumableSpendPad,
  onCastScroll,
  onToggleConsumableFavorite,
  consumableSpendLog = [],
  onUndoConsumableSpend,
  onToast,
  onOpenSettings,
  rollMode = 'normal',
}: PlayDeskAttacksCompactProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [activeCombatFeatureIds, setActiveCombatFeatureIds] = useState<Set<string>>(
    () => new Set(),
  )
  const named = weapons.filter((row) => row.name.trim())
  const combatResources = resources.filter(
    (row) => row.max > 0 && row.name.trim() && row.used < row.max,
  )
  const deskCombatFeatures = combatFeatures.filter(
    (row) => row.desk === 'combat' && row.name_ru.trim(),
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
  const restoreableLogCount = consumableSpendLog.filter((row) => !row.undone).length

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

      {deskCombatFeatures.length > 0 ? (
        <div className="chip-row" style={{ marginBottom: 8 }}>
          {deskCombatFeatures.map((feature) => {
            const on = activeCombatFeatureIds.has(feature.id)
            return (
              <button
                key={`${feature.classEntryId}:${feature.id}`}
                type="button"
                className={`sheet-chip${on ? ' is-on' : ''}`}
                title={feature.summary_ru}
                onClick={() => {
                  const nextOn = !on
                  setActiveCombatFeatureIds((prev) => {
                    const next = new Set(prev)
                    if (nextOn) next.add(feature.id)
                    else next.delete(feature.id)
                    return next
                  })
                  onCombatFeatureToggle?.(feature.id, nextOn)
                  onToast?.(
                    nextOn
                      ? `${feature.name_ru}: вкл. · ${feature.summary_ru}`
                      : `${feature.name_ru}: выкл.`,
                  )
                }}
              >
                {feature.name_ru}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="play-desk-compact__list play-desk-compact__list--dense">
        {named.length === 0 ? (
          <p className="play-desk-compact__empty">Нет атак — добавь в полной панели</p>
        ) : (
          named.map((attack) => {
            const unarmed = isMonkUnarmedAttack(attack)
            const monkWeapon =
              Boolean(martialArtsDie) &&
              (unarmed || isMonkWeaponName(attack.name))
            const attackAbility = monkWeapon
              ? monkAttackAbility({
                  str: abilities.str,
                  dex: abilities.dex,
                  weaponAbility: attack.ability,
                })
              : attack.ability
            const baseDamage = monkWeapon
              ? effectiveMartialArtsDamage({
                  weaponDamage: attack.damage,
                  martialArtsDie,
                  forceMartialArts: unarmed,
                })
              : attack.damage
            const mod = abilityModifier(abilities[attackAbility])
            const gear = attack.inventory_item_id
              ? gearBonusesByItem[attack.inventory_item_id]
              : undefined
            const styleAtk = fightingStyleAttackBonus({
              styleId: fightingStyleId,
              weaponName: attack.name,
            })
            const infusionAtk = unarmed
              ? 0
              : Math.max(0, Math.floor(infusionAttackBonus))
            const infusionDmg = unarmed
              ? 0
              : Math.max(0, Math.floor(infusionDamageBonus))
            const attackBonus =
              mod +
              (attack.is_proficient || unarmed ? proficiencyBonus : 0) +
              (gear?.attackBonus ?? 0) +
              styleAtk +
              infusionAtk
            const dmgBonus = mod + (gear?.damageBonus ?? 0) + infusionDmg
            const dmg =
              baseDamage +
              (dmgBonus ? `${dmgBonus >= 0 ? '+' : ''}${dmgBonus}` : '')
            const dmgLine = `${dmg || '—'}${attack.damage_type ? ` ${attack.damage_type}` : ''}`
            const iconKind = attackRowIconKind({
              name: attack.name,
              ability: attackAbility,
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
                        damageExpr: dmg || baseDamage,
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
            const scrollCast = isCastableSpellScroll(item) && Boolean(onCastScroll)
            const canSpend =
              qty > 0 && (scrollCast || Boolean(onSpendConsumable))
            const showQtyPad =
              !scrollCast && qty > 1 && Boolean(onOpenConsumableSpendPad) && Boolean(onSpendConsumable)
            return (
              <div
                key={item.id}
                className={`play-desk-compact__cons-row${favorite ? ' is-fav' : ''}${
                  scrollCast ? ' is-scroll' : ''
                }`}
              >
                <div className="play-desk-compact__cons-main">
                  <span className="play-desk-compact__cons-name">
                    {favorite ? (
                      <span className="play-desk-compact__tag is-fav">избр.</span>
                    ) : null}
                    {scrollCast ? (
                      <span className="play-desk-compact__tag">свиток</span>
                    ) : null}
                    {item.name}
                  </span>
                  <b>{qty}</b>
                  <div className="play-desk-compact__cons-actions">
                    {showQtyPad ? (
                      <button
                        type="button"
                        className="play-desk-compact__cons-qty"
                        disabled={!canSpend}
                        title={`Потратить несколько «${item.name}»`}
                        onClick={() => onOpenConsumableSpendPad?.(item.id)}
                      >
                        ×N
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="play-desk-compact__cons-spend"
                      disabled={!canSpend}
                      title={
                        scrollCast
                          ? `Каст со свитка: ${item.scroll_spell?.name ?? item.name}`
                          : canSpend
                            ? `Потратить 1 «${item.name}»`
                            : item.name
                      }
                      onClick={() => {
                        if (!canSpend) {
                          onToast?.(`${item.name}: ×${qty}`)
                          return
                        }
                        if (scrollCast) {
                          onCastScroll?.(item.id)
                          return
                        }
                        onSpendConsumable?.(item.id, 1)
                      }}
                    >
                      {scrollCast ? 'каст' : 'потратить'}
                    </button>
                  </div>
                </div>
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

        {consumableSpendLog.length > 0 ? (
          <div className="play-desk-compact__cons-log">
            <button
              type="button"
              className="play-desk-compact__cons-log-toggle"
              onClick={() => setLogOpen((prev) => !prev)}
            >
              {logOpen ? '▾' : '▸'} Журнал трат
              {restoreableLogCount > 0 ? ` · ${restoreableLogCount}` : ''}
            </button>
            {logOpen ? (
              <ul className="play-desk-compact__cons-log-list">
                {consumableSpendLog.map((entry) => (
                  <li
                    key={entry.id}
                    className={`play-desk-compact__cons-log-row${
                      entry.undone ? ' is-undone' : ''
                    }`}
                  >
                    <span>
                      {formatSpendTime(entry.atMs)} −{entry.amount} «{entry.name}»
                      {entry.undone ? ' · отменено' : ''}
                    </span>
                    {!entry.undone && onUndoConsumableSpend ? (
                      <button
                        type="button"
                        className="play-desk-compact__cons-log-undo"
                        onClick={() => onUndoConsumableSpend(entry.id)}
                      >
                        вернуть
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

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
