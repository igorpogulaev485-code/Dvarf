import { useState } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import {
  findFeatureResource,
  spendFeatureUse,
  spendRemaining,
} from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  BOLSTERING_MAGIC_OPTIONS,
  WILD_SURGE_TABLE,
  wildSurgeByRoll,
} from '../../shared/dnd/wildMagicSurge'
import { Button, Stack, Text } from '../../ui'

type ExtraProps = {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  onToast?: (message: string) => void
  unlocked: UnlockedFeature[]
}

function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides)
}

export function isSunSoulVariableKi(featureId: string): boolean {
  return featureId === 'searing_sunburst' || featureId === 'searing_arc_strike'
}

export function SunSoulKiControls({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  onToast,
}: ExtraProps) {
  const sunburst = feature.id === 'searing_sunburst'
  const min = sunburst ? 0 : 2
  const max = sunburst ? 3 : Math.max(2, Math.floor(feature.classLevel / 2))
  const [cost, setCost] = useState(min)
  const ki = findFeatureResource(resources, classSlug, 'ki', feature.classEntryId)
  const left = spendRemaining(ki)
  const picked = Math.min(max, Math.max(min, cost))
  const preview = sunburst
    ? `урон ${1 + picked}×2к6 лучистого (спас Телосложения, успех — половина)`
    : `сожги ладони ${picked - 1} круга`

  return (
    <div className="feature-resource">
      <Text>
        Ци: <strong>{left}</strong>/{ki?.max ?? 0}. Сначала выбери стоимость, потом подтверди.
      </Text>
      <label className="feature-resource__select">
        <span className="sr-only">Сколько ци</span>
        <select
          className="play-select"
          value={picked}
          onChange={(event) => setCost(Number(event.target.value))}
        >
          {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((n) => (
            <option key={n} value={n}>
              {n} ци
            </option>
          ))}
        </select>
      </label>
      <Text tone="muted">
        {picked} ци · {preview}
        {picked > left ? ` · не хватает ци (есть ${left})` : ''}
      </Text>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={!ki || picked > left}
          onClick={() => {
            const result = spendFeatureUse({
              resources,
              feature,
              classSlug,
              amount: picked,
            })
            if (!result.ok) {
              onToast?.(result.message)
              return
            }
            onResourcesChange(result.resources)
            onToast?.(`${feature.name_ru}: ${picked} ци · ${preview}`)
          }}
        >
          Подтвердить −{picked}
        </Button>
      </div>
    </div>
  )
}

export function Pack09FeatureExtras({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  onToast,
  unlocked,
}: ExtraProps) {
  const [surgeRolls, setSurgeRolls] = useState<number[]>([])
  if (feature.id === 'wild_surge') {
    const controlled = unlocked.some((row) => row.id === 'controlled_surge')
    return (
      <div className="feature-resource">
        <Text tone="muted">Таблица Дикого всплеска (TCE), d8:</Text>
        <Stack gap={4}>
          {WILD_SURGE_TABLE.map((row) => (
            <Text key={row.roll} tone="muted">
              {row.roll}. {row.summaryRu}
            </Text>
          ))}
        </Stack>
        <div className="feature-resource__actions">
          <Button
            type="button"
            onClick={() => {
              if (!controlled) {
                const roll = rollDie(8)
                setSurgeRolls([roll])
                const line = wildSurgeByRoll(roll)
                onToast?.(`Дикий всплеск: ${roll}. ${line?.summaryRu ?? ''}`)
                return
              }
              const first = rollDie(8)
              const second = rollDie(8)
              setSurgeRolls([first, second])
              onToast?.(
                `Контролируемый всплеск: ${first} и ${second}. Выбери один${
                  first === 8 || second === 8 ? ' (8 — любой эффект 1–7)' : ''
                }.`,
              )
            }}
          >
            {controlled ? 'Бросить два d8' : 'Бросить d8'}
          </Button>
        </div>
        {surgeRolls.length > 0 ? (
          <Text>
            Выпало: <strong>{surgeRolls.join(' и ')}</strong>
          </Text>
        ) : null}
      </div>
    )
  }

  if (feature.id === 'bolstering_magic' || feature.id === 'consult_the_spirits') {
    const poolId = feature.resource?.pool_id
    const pool = poolId
      ? findFeatureResource(resources, classSlug, poolId, feature.classEntryId)
      : null
    const left = spendRemaining(pool)
    const options =
      feature.id === 'bolstering_magic'
        ? BOLSTERING_MAGIC_OPTIONS.map((row) => ({
            id: row.id,
            nameRu: row.nameRu,
            detail: row.summaryRu,
          }))
        : [
            {
              id: 'augury',
              nameRu: 'Гадание',
              detail: 'Без ячейки и без компонентов. Мудрость.',
            },
            {
              id: 'clairvoyance',
              nameRu: 'Подсматривание',
              detail:
                'Без ячейки и без компонентов. Вместо сенсора является дух предка. Мудрость.',
            },
          ]
    return (
      <div className="feature-resource">
        <Text>
          {pool?.name ?? feature.name_ru}: <strong>{left}</strong>/{pool?.max ?? 0}
        </Text>
        <Stack gap={6}>
          {options.map((option) => (
            <div key={option.id} className="feature-resource__actions">
              <Button
                type="button"
                disabled={left <= 0}
                onClick={() => {
                  const result = spendFeatureUse({ resources, feature, classSlug })
                  if (!result.ok) {
                    onToast?.(result.message)
                    return
                  }
                  onResourcesChange(result.resources)
                  const die =
                    option.id === 'slot' ? ` d3=${rollDie(3)}.` : ''
                  onToast?.(`${feature.name_ru}: ${option.nameRu}.${die} ${option.detail}`)
                }}
              >
                {option.nameRu}
              </Button>
              <Text tone="muted">{option.detail}</Text>
            </div>
          ))}
        </Stack>
      </div>
    )
  }

  return null
}
