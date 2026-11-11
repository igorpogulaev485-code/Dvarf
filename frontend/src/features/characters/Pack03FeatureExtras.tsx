import { useState } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import { domainChannelEffect } from '../../shared/dnd/domainChannelEffect'
import {
  findFeatureResource,
  spendFeatureUse,
  spendRemaining,
} from '../../shared/dnd/featureResources'
import {
  harnessDivinePowerSlotCap,
  restoreOneSpentSlot,
  spentSlotLevels,
} from '../../shared/dnd/harnessDivinePower'
import {
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  toggleFeaturePickInList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { wisdomSaveAlreadyGranted } from '../../shared/dnd/featureSaveProficiency'
import type { AppliedFeatGrant } from '../../shared/dnd/featGrants'
import { proficiencyBonusForTotalLevel } from '../../shared/dnd/classFeatures'
import type { ConcentrationState } from '../../shared/dnd/concentration'
import { setConcentration } from '../../shared/dnd/concentration'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Text } from '../../ui'
import {
  DRUIDIC_WARRIOR_CANTRIPS_ID,
  DRUIDIC_WARRIOR_LIMIT,
  DRUIDIC_WARRIOR_STYLE,
  druidicWarriorCantripOptions,
  isDruidicWarriorActive,
} from './druidicWarrior'
import {
  applyForgeBlessing,
  listForgeBlessingCandidates,
} from './forgeBlessing'
import type { InventoryItem } from './inventory'
import type { SpellsState } from './spells'

type ExtraProps = {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  spells: SpellsState
  onSpellsChange: (spells: SpellsState) => void
  characterLevel: number
  inventoryItems: InventoryItem[]
  onInventoryChange?: (items: InventoryItem[]) => void
  concentration: ConcentrationState | null
  onConcentrationChange?: (next: ConcentrationState | null) => void
  onToast?: (message: string) => void
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  classes: Array<{ name: string }>
  featGrants: Array<Pick<AppliedFeatGrant, 'applied'>>
  unlocked: Array<Pick<UnlockedFeature, 'id' | 'save_proficiency'>>
}

function markActive(
  resources: SheetResource[],
  poolId: string,
  label: string,
): SheetResource[] {
  return resources.map((row) => (row.id === poolId ? { ...row, activeLabel: label } : row))
}

export function isPack03CustomSpend(featureId: string): boolean {
  return (
    featureId === 'cd_harness_divine_power' ||
    featureId === 'blessing_of_the_forge' ||
    domainChannelEffect(featureId) != null
  )
}

export function Pack03FeatureExtras(props: ExtraProps) {
  const effect = domainChannelEffect(props.feature.id)
  if (props.feature.id === 'cd_harness_divine_power') return <HarnessControls {...props} />
  if (props.feature.id === 'blessing_of_the_forge') return <ForgeControls {...props} />
  if (effect) return <ChannelControls {...props} effectTitle={effect.title} />
  if (props.feature.id === 'iron_mind') return <IronMindControls {...props} />
  if (props.feature.id === 'fighting_style_ranger') return <DruidicWarriorCantrips {...props} />
  return null
}

function HarnessControls({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  spells,
  onSpellsChange,
  characterLevel,
  onToast,
}: ExtraProps) {
  const [level, setLevel] = useState(1)
  const daily = feature.resource?.pool_id
    ? findFeatureResource(resources, classSlug, feature.resource.pool_id, feature.classEntryId)
    : null
  const channel = findFeatureResource(
    resources,
    classSlug,
    'channel_divinity',
    feature.classEntryId,
  )
  const cap = harnessDivinePowerSlotCap(proficiencyBonusForTotalLevel(characterLevel))
  const options = spentSlotLevels(spells.slots, cap)
  const dailyLeft = spendRemaining(daily)
  const channelLeft = spendRemaining(channel)
  const picked = options.includes(level) ? level : (options[0] ?? 0)

  return (
    <div className="feature-resource">
      <Text tone="muted">
        Дневных {dailyLeft}/{daily?.max ?? 0} · канал {channelLeft}/{channel?.max ?? 0}. Потолок
        круга: {cap}.
      </Text>
      {options.length === 0 ? (
        <Text tone="muted">Нет потраченных ячеек круга 1–{cap}.</Text>
      ) : (
        <label className="feature-resource__select">
          <span className="sr-only">Потраченная ячейка</span>
          <select
            className="play-select"
            value={picked}
            onChange={(event) => setLevel(Number(event.target.value))}
          >
            {options.map((row) => (
              <option key={row} value={row}>
                {row} круг · потрачено {spells.slots[String(row)]?.used ?? 0}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={!daily || !channel || dailyLeft <= 0 || channelLeft <= 0 || picked <= 0}
          onClick={() => {
            if (!daily || !channel) {
              onToast?.('Пулы Праведного восстановления ещё не синхронизированы')
              return
            }
            const restored = restoreOneSpentSlot(spells.slots, picked, cap)
            if (!restored.ok) {
              onToast?.(restored.reason)
              return
            }
            const spentDaily = spendFeatureUse({ resources, feature, classSlug })
            if (!spentDaily.ok) {
              onToast?.(spentDaily.message)
              return
            }
            const spentChannel = spendFeatureUse({
              resources: spentDaily.resources,
              classSlug,
              feature: {
                ...feature,
                resource: {
                  uses: 1,
                  recharge: 'short_rest',
                  pool_id: 'channel_divinity',
                  pool_name_ru: 'Божественный канал',
                  track: 'spend',
                },
              },
            })
            if (!spentChannel.ok) {
              onToast?.(spentChannel.message)
              return
            }
            onResourcesChange(spentChannel.resources)
            onSpellsChange({ ...spells, slots: restored.slots })
            onToast?.(
              `Праведное восстановление: ячейка ${picked} круга возвращена. Канал и дневной заряд потрачены.`,
            )
          }}
        >
          Вернуть ячейку
        </Button>
      </div>
    </div>
  )
}

function ForgeControls({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  inventoryItems,
  onInventoryChange,
  onToast,
}: ExtraProps) {
  const candidates = listForgeBlessingCandidates(inventoryItems)
  const [itemId, setItemId] = useState(candidates[0]?.id ?? '')
  const pool = feature.resource?.pool_id
    ? findFeatureResource(resources, classSlug, feature.resource.pool_id, feature.classEntryId)
    : null
  const left = spendRemaining(pool)
  const picked = candidates.some((row) => row.id === itemId) ? itemId : (candidates[0]?.id ?? '')

  return (
    <div className="feature-resource">
      <Text tone="muted">
        Немагические оружие или доспех. Заряд тратится только после выбора. Бонус спадает на
        продолжительном отдыхе.
      </Text>
      {candidates.length === 0 ? (
        <Text tone="muted">В инвентаре нет подходящего немагического оружия или доспеха.</Text>
      ) : (
        <label className="feature-resource__select">
          <span className="sr-only">Предмет благословения</span>
          <select
            className="play-select"
            value={picked}
            onChange={(event) => setItemId(event.target.value)}
          >
            {candidates.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {row.kind === 'armor' ? '+1 КД' : '+1 атака и урон'}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={!pool || left <= 0 || !picked || !onInventoryChange}
          onClick={() => {
            const applied = applyForgeBlessing(inventoryItems, picked)
            if (!applied.ok) {
              onToast?.(applied.reason)
              return
            }
            if (!pool) {
              onToast?.('Пул Благословения кузницы ещё не синхронизирован')
              return
            }
            const spent = spendFeatureUse({ resources, feature, classSlug })
            if (!spent.ok) {
              onToast?.(spent.message)
              return
            }
            onInventoryChange?.(applied.items)
            onResourcesChange(markActive(spent.resources, pool.id, applied.message))
            onToast?.(applied.message)
          }}
        >
          Благословить
        </Button>
      </div>
    </div>
  )
}

function ChannelControls({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  concentration,
  onConcentrationChange,
  onToast,
  effectTitle,
}: ExtraProps & { effectTitle: string }) {
  const spec = domainChannelEffect(feature.id)
  const [confirmSwap, setConfirmSwap] = useState(false)
  if (!spec) return null
  const effectSpec = spec
  const pool = feature.resource?.pool_id
    ? findFeatureResource(resources, classSlug, feature.resource.pool_id, feature.classEntryId)
    : null
  const left = spendRemaining(pool)
  const detail = spec.detail(feature.classLevel)
  const needsSwap = Boolean(
    effectSpec.concentration &&
      concentration &&
      concentration.name.trim() !== effectSpec.title,
  )

  function commit() {
    if (!pool) {
      onToast?.('Пул ещё не синхронизирован')
      return
    }
    const spent = spendFeatureUse({ resources, feature, classSlug })
    if (!spent.ok) {
      onToast?.(spent.message)
      return
    }
    onResourcesChange(markActive(spent.resources, pool.id, `${effectSpec.title}: ${detail}`))
    if (effectSpec.concentration) {
      onConcentrationChange?.(
        setConcentration({ spellId: `feature:${feature.id}`, name: effectSpec.title }),
      )
    }
    setConfirmSwap(false)
    onToast?.(`${effectTitle}: ${detail}`)
  }

  return (
    <div className="feature-resource">
      <Text tone="muted">{detail}</Text>
      {pool?.activeLabel ? (
        <Text>
          Сейчас: <strong>{pool.activeLabel}</strong>
        </Text>
      ) : null}
      {confirmSwap ? (
        <Text>
          Сменить концентрацию с «{concentration?.name}» на «{spec.title}»? Заряд спишется после
          подтверждения.
        </Text>
      ) : null}
      <div className="feature-resource__actions">
        {confirmSwap ? (
          <>
            <Button type="button" onClick={commit}>
              Сменить концентрацию
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmSwap(false)}>
              Отмена
            </Button>
          </>
        ) : (
          <Button
            type="button"
            disabled={left <= 0}
            onClick={() => {
              if (needsSwap) {
                setConfirmSwap(true)
                return
              }
              commit()
            }}
          >
            Использовать
          </Button>
        )}
      </div>
    </div>
  )
}

function IronMindControls({
  feature,
  classes,
  featGrants,
  featurePicks,
  onFeaturePicksChange,
  onToast,
  unlocked,
}: ExtraProps) {
  const already = wisdomSaveAlreadyGranted({
    classes,
    featGrants,
    features: unlocked,
  })
  const pick = getFeaturePick(featurePicks, feature.classEntryId, 'iron_mind_save')
  if (!already) {
    return (
      <div className="feature-resource">
        <Text>Спасбросок Мудрости выдан автоматически.</Text>
      </div>
    )
  }
  return (
    <div className="feature-resource">
      <Text tone="muted">
        Владение Мудростью уже есть. Выбери Интеллект или Харизму (XGE).
      </Text>
      <div className="feature-resource__actions">
        {(
          [
            ['intelligence', 'Интеллект'],
            ['charisma', 'Харизма'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            disabled={pick === id}
            onClick={() => {
              onFeaturePicksChange(
                setFeaturePick(featurePicks, feature.classEntryId, 'iron_mind_save', id),
              )
              onToast?.(`Железный разум: спасбросок ${label}`)
            }}
          >
            {pick === id ? `✓ ${label}` : label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function DruidicWarriorCantrips({
  feature,
  featurePicks,
  onFeaturePicksChange,
  onToast,
}: ExtraProps) {
  const style = getFeaturePick(featurePicks, feature.classEntryId, feature.id)
  if (style !== DRUIDIC_WARRIOR_STYLE && !isDruidicWarriorActive(featurePicks, feature.classEntryId)) {
    return null
  }
  const selected = getFeaturePickList(
    featurePicks,
    feature.classEntryId,
    DRUIDIC_WARRIOR_CANTRIPS_ID,
  )
  const options = druidicWarriorCantripOptions()
  return (
    <div className="feature-resource">
      <Text>
        Заговоры друида ({selected.length}/{DRUIDIC_WARRIOR_LIMIT}), базовая характеристика МУД, вне
        лимита. При новом уровне следопыта можно заменить один: сними и выбери другой.
      </Text>
      <div className="feature-resource__actions">
        {options.map((option) => {
          const on = selected.includes(option.id)
          return (
            <Button
              key={option.id}
              type="button"
              onClick={() => {
                const next = toggleFeaturePickInList(
                  featurePicks,
                  feature.classEntryId,
                  DRUIDIC_WARRIOR_CANTRIPS_ID,
                  option.id,
                  DRUIDIC_WARRIOR_LIMIT,
                )
                onFeaturePicksChange(next)
                onToast?.(`Воин-друид: ${option.label}`)
              }}
            >
              {on ? `✓ ${option.label}` : option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
