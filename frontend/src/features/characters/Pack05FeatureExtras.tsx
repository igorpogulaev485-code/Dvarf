/**
 * Bard college actions: secrets picker, mantle, spirit session, creation, tales.
 * Uses the same feature-card atoms as the other class extras.
 */

import { useMemo, useState } from 'react'
import {
  proficiencyBonusForTotalLevel,
  type UnlockedFeature,
} from '../../shared/dnd/classFeatures'
import { abilityModifier } from './sheetTypes'
import {
  ADDITIONAL_MAGICAL_SECRETS_ID,
  MAGICAL_SECRETS_PICK_LIMIT,
  bardSecretsMaxSpellLevel,
  isMagicalSecretsFeature,
} from './bardSecretsSync'
import {
  DANCING_ITEM_FEATURE,
  MANTLE_COMMAND_SPELL_ID,
  MANTLE_CONCENTRATION_ID,
  PERFORMANCE_ITEM_MARK,
  SPIRIT_SESSION_SPELL_PREFIX,
  dancingItemHp,
  formatSpiritTaleToast,
  isSpiritSessionSchool,
  pack05CustomSpendFeature,
  performanceGpCap,
  performanceItemCount,
  performanceSizeAllowed,
  spiritSessionMaxSpellLevel,
  spiritSessionParticipantCap,
  spiritTaleByRoll,
  type CreationSize,
} from '../../shared/dnd/bardCollege'
import { rollDie } from './deskRolls'
import {
  findFeatureResource,
  spendFeatureUse,
  spendRemaining,
} from '../../shared/dnd/featureResources'
import {
  getFeaturePickList,
  toggleFeaturePickInList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { spendSpellSlot } from '../../shared/dnd/spells'
import { setConcentration } from '../../shared/dnd/concentration'
import type { ConcentrationState } from '../../shared/dnd/concentration'
import type { SheetResource } from '../../shared/dnd/rest'
import { bundledSpellBySlug, bundledSpellsAtLevel } from './alwaysPreparedSpellEnrichment'
import { createCompanion, type CompanionEntry } from './companions'
import { createInventoryItem, type InventoryItem } from './inventory'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  featureSpellId,
  sheetSpellFromCatalog,
  type SpellsState,
} from './spells'
import { Button, Field, Input, Stack, Text } from '../../ui'

type ExtraProps = {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  spells: SpellsState
  onSpellsChange: (spells: SpellsState) => void
  inventoryItems: InventoryItem[]
  onInventoryChange?: (items: InventoryItem[]) => void
  companions: CompanionEntry[]
  onCompanionsChange?: (companions: CompanionEntry[]) => void
  concentration: ConcentrationState | null
  onConcentrationChange?: (next: ConcentrationState | null) => void
  onToast?: (message: string) => void
  characterLevel: number
  charismaScore?: number
  unlocked: UnlockedFeature[]
}

export { pack05CustomSpendFeature }

export function Pack05FeatureExtras(props: ExtraProps) {
  const id = props.feature.id
  if (isMagicalSecretsFeature(id)) return <SecretsPicker {...props} />
  if (id === 'mantle_of_majesty') return <MantleOfMajesty {...props} />
  if (id === 'spirit_session') return <SpiritSession {...props} />
  if (id === 'performance_of_creation') return <PerformanceOfCreation {...props} />
  if (id === 'animating_performance') return <AnimatingPerformance {...props} />
  if (id === 'tales_from_beyond') return <TalesFromBeyond {...props} />
  return null
}

function inspirationSides(unlocked: UnlockedFeature[], classEntryId: string): number {
  const row = unlocked.find(
    (feature) => feature.id === 'bardic_inspiration' && feature.classEntryId === classEntryId,
  )
  const match = row?.scaleValue?.match(/к\s*(\d+)/i)
  const sides = match ? Number(match[1]) : 6
  return sides === 8 || sides === 10 || sides === 12 ? sides : 6
}

function SecretsPicker({
  feature,
  featurePicks,
  onFeaturePicksChange,
  onToast,
}: ExtraProps) {
  const [query, setQuery] = useState('')
  const maxLevel = bardSecretsMaxSpellLevel(feature.classLevel)
  const outside = feature.id === ADDITIONAL_MAGICAL_SECRETS_ID
  const selected = getFeaturePickList(featurePicks, feature.classEntryId, feature.id)
  const options = useMemo(() => {
    const rows = []
    for (let level = 0; level <= maxLevel; level += 1) rows.push(...bundledSpellsAtLevel(level))
    return rows
  }, [maxLevel])
  const q = query.trim().toLowerCase()
  const filtered = q
    ? options.filter(
        (row) =>
          row.nameRu.toLowerCase().includes(q) ||
          row.slug.toLowerCase().includes(q) ||
          row.slug.replaceAll('_', ' ').includes(q),
      )
    : options.filter((row) => selected.includes(row.slug))
  return (
    <div className="feature-resource">
      <Text tone="muted">
        {outside
          ? 'Два заклинания любого класса, круг не выше ваших ячеек. Вне лимита известных.'
          : 'Два заклинания любого класса, круг не выше ваших ячеек. Входят в число известных.'}{' '}
        Сейчас круг ≤ {maxLevel}. Выбрано {selected.length}/{MAGICAL_SECRETS_PICK_LIMIT}.
      </Text>
      <Field label="Поиск по всем классам">
        <Input
          value={query}
          placeholder="Fireball, Counterspell, огненный шар…"
          onChange={(event) => setQuery(event.target.value)}
        />
      </Field>
      <div className="feature-resource__actions">
        {filtered.slice(0, 40).map((row) => {
          const active = selected.includes(row.slug)
          return (
            <Button
              key={row.slug}
              type="button"
              variant={active ? 'primary' : 'secondary'}
              onClick={() => {
                const next = toggleFeaturePickInList(
                  featurePicks,
                  feature.classEntryId,
                  feature.id,
                  row.slug,
                  MAGICAL_SECRETS_PICK_LIMIT,
                )
                const after = getFeaturePickList(next, feature.classEntryId, feature.id)
                if (!active && after.length === selected.length) {
                  onToast?.(`Уже выбрано ${MAGICAL_SECRETS_PICK_LIMIT}. Снимите одно, затем возьмите другое.`)
                  return
                }
                onFeaturePicksChange(next)
                onToast?.(
                  active
                    ? `${row.nameRu} снят с тайн`
                    : `${row.nameRu} · круг ${row.level} · ${outside ? 'вне лимита' : 'в лимите известных'}`,
                )
              }}
            >
              {active ? '✓ ' : ''}
              {row.nameRu} · {row.level === 0 ? 'заговор' : `${row.level} круг`}
            </Button>
          )
        })}
      </div>
      {!q ? (
        <Text tone="muted">Введите название: ищутся все классы, не только полка барда.</Text>
      ) : null}
      {q && filtered.length === 0 ? <Text tone="muted">Ничего не найдено в этом круге.</Text> : null}
    </div>
  )
}

function MantleOfMajesty({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  spells,
  onSpellsChange,
  concentration,
  onConcentrationChange,
  onToast,
}: ExtraProps) {
  const pool = feature.resource?.pool_id
    ? findFeatureResource(resources, classSlug, feature.resource.pool_id, feature.classEntryId)
    : null
  const left = spendRemaining(pool)
  const active = concentration?.spell_id === MANTLE_CONCENTRATION_ID
  return (
    <div className="feature-resource">
      <Text tone="muted">
        Бонусным действием. Требует концентрацию, как заклинание: прежняя концентрация спадает.
        Пока мантия держится, Приказ кастуется без ячейки. {left}/{pool?.max ?? 1} до прод. отдыха.
        {active ? ' Сейчас мантия активна.' : ''}
      </Text>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0}
          onClick={() => {
            const spent = spendFeatureUse({ resources, feature, classSlug })
            if (!spent.ok) {
              onToast?.(spent.message)
              return
            }
            const entry = bundledSpellBySlug('command')
            const fromCatalog = entry
              ? sheetSpellFromCatalog({
                  id: entry.id,
                  name_ru: entry.name_ru,
                  slug: entry.slug,
                  data: entry.data,
                })
              : { ...createSheetSpell(), name: 'Приказ', level: 1 }
            const command = asAlwaysPreparedSpell(
              {
                ...fromCatalog,
                id: MANTLE_COMMAND_SPELL_ID,
                name: fromCatalog.name || 'Приказ',
                prepared: true,
                class_slug: 'bard',
                class_entry_id: feature.classEntryId,
                concentration: false,
              },
              {
                source_kind: 'feature',
                label: 'Мантия величия',
                class_slug: 'bard',
                class_entry_id: feature.classEntryId,
              },
            )
            command.notes = 'Бесплатно, пока держится концентрация на Мантии величия'
            onResourcesChange(spent.resources)
            onConcentrationChange?.(
              setConcentration({ spellId: MANTLE_CONCENTRATION_ID, name: 'Мантия величия' }),
            )
            onSpellsChange({
              ...spells,
              known: [
                ...spells.known.filter((spell) => spell.id !== MANTLE_COMMAND_SPELL_ID),
                command,
              ],
            })
            onToast?.('Мантия величия: прежняя концентрация снята. Приказ на листе, без ячейки.')
          }}
        >
          Надеть мантию
        </Button>
      </div>
    </div>
  )
}

function SpiritSession({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  spells,
  onSpellsChange,
  onToast,
  characterLevel,
}: ExtraProps) {
  const capPeople = spiritSessionParticipantCap(characterLevel)
  const [people, setPeople] = useState(capPeople)
  const [query, setQuery] = useState('')
  const [slug, setSlug] = useState('')
  const participants = Math.min(capPeople, Math.max(1, Math.floor(people) || 1))
  const maxLevel = spiritSessionMaxSpellLevel({
    participants,
    bardLevel: feature.classLevel,
  })
  const pool = feature.resource?.pool_id
    ? findFeatureResource(resources, classSlug, feature.resource.pool_id, feature.classEntryId)
    : null
  const left = spendRemaining(pool)
  const options = useMemo(() => {
    const rows = []
    for (let level = 0; level <= maxLevel; level += 1) {
      for (const row of bundledSpellsAtLevel(level)) {
        if (!isSpiritSessionSchool(row.school)) continue
        rows.push(row)
      }
    }
    return rows
  }, [maxLevel])
  const q = query.trim().toLowerCase()
  const filtered = options.filter((row) => {
    if (!q) return true
    return row.nameRu.toLowerCase().includes(q) || row.slug.replaceAll('_', ' ').includes(q)
  })
  return (
    <Stack gap={10}>
      <Text tone="muted">
        Ритуал 1 час. Участников до бонуса мастерства ({capPeople}), включая вас. Одно заклинание
        прорицания или некромантии, круг ≤ участников и ≤ ваших ячеек (сейчас ≤ {maxLevel}). Не
        занимает известные. До продолжительного отдыха. Зарядов {left}/{pool?.max ?? 1}.
      </Text>
      <Field label="Участники, включая барда">
        <Input
          value={String(participants)}
          onChange={(event) => setPeople(Number(event.target.value))}
        />
      </Field>
      <Field label="Поиск заклинания">
        <Input
          value={query}
          placeholder="Revivify, оживление…"
          onChange={(event) => setQuery(event.target.value)}
        />
      </Field>
      <label className="feature-resource__select">
        <span className="sr-only">Заклинание сеанса</span>
        <select className="play-select" value={slug} onChange={(event) => setSlug(event.target.value)}>
          <option value="">— заклинание —</option>
          {filtered.slice(0, 80).map((row) => (
            <option key={row.slug} value={row.slug}>
              {row.nameRu} · {row.level === 0 ? 'заговор' : `${row.level} круг`} · {row.school}
            </option>
          ))}
        </select>
      </label>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0 || !slug}
          onClick={() => {
            const entry = bundledSpellBySlug(slug)
            if (!entry) {
              onToast?.('Заклинание не найдено в каталоге')
              return
            }
            const level = typeof entry.data?.level === 'number' ? entry.data.level : 0
            const school = typeof entry.data?.school === 'string' ? entry.data.school : ''
            if (!isSpiritSessionSchool(school) || level > maxLevel) {
              onToast?.('Нужны прорицание или некромантия в пределах круга участников')
              return
            }
            const spent = spendFeatureUse({ resources, feature, classSlug })
            if (!spent.ok) {
              onToast?.(spent.message)
              return
            }
            const fromCatalog = sheetSpellFromCatalog({
              id: entry.id,
              name_ru: entry.name_ru,
              slug: entry.slug,
              data: entry.data,
            })
            const learned = asAlwaysPreparedSpell(
              {
                ...fromCatalog,
                id: featureSpellId('spirit_session', slug),
                class_slug: 'bard',
                class_entry_id: feature.classEntryId,
                prepared: true,
              },
              {
                source_kind: 'feature',
                label: 'Сеанс духов',
                class_slug: 'bard',
                class_entry_id: feature.classEntryId,
              },
            )
            learned.notes = `Сеанс духов · ${participants} участн. · до продолжительного отдыха`
            onResourcesChange(spent.resources)
            onSpellsChange({
              ...spells,
              known: [
                ...spells.known.filter((spell) => !spell.id.startsWith(SPIRIT_SESSION_SPELL_PREFIX)),
                learned,
              ],
            })
            onToast?.(`${learned.name} выучено до продолжительного отдыха`)
          }}
        >
          Провести сеанс
        </Button>
      </div>
    </Stack>
  )
}

const SIZE_LABEL: Record<CreationSize, string> = {
  tiny: 'Крошечный',
  small: 'Маленький',
  medium: 'Средний',
  large: 'Большой',
}

function PerformanceOfCreation({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  spells,
  onSpellsChange,
  inventoryItems,
  onInventoryChange,
  onToast,
  charismaScore,
  characterLevel,
}: ExtraProps) {
  const [name, setName] = useState('')
  const [gp, setGp] = useState('0')
  const [size, setSize] = useState<CreationSize>('small')
  const [slotLevel, setSlotLevel] = useState(2)
  const pool = feature.resource?.pool_id
    ? findFeatureResource(resources, classSlug, feature.resource.pool_id, feature.classEntryId)
    : null
  const left = spendRemaining(pool)
  const cap = performanceGpCap(feature.classLevel)
  const count = performanceItemCount(feature.classLevel, abilityModifier(charismaScore ?? 10))
  const cost = Math.max(0, Math.floor(Number(gp) || 0))
  const slots = [2, 3, 4, 5, 6, 7, 8, 9].filter((level) => (spells.slots[String(level)]?.max ?? 0) > 0)

  function mint(via: 'pool' | 'slot') {
    const trimmed = name.trim()
    if (!trimmed) {
      onToast?.('Назови немагический предмет')
      return
    }
    if (!performanceSizeAllowed(feature.classLevel, size)) {
      onToast?.('До 14 уровня предмет не больше Среднего')
      return
    }
    if (cap != null && cost > cap) {
      onToast?.(`Цена не выше ${cap} зм (20 × уровень барда)`)
      return
    }
    let resourcesNext = resources
    let slotsNext = spells.slots
    if (via === 'pool') {
      const spent = spendFeatureUse({ resources, feature, classSlug })
      if (!spent.ok) {
        onToast?.(spent.message)
        return
      }
      resourcesNext = spent.resources
    } else {
      const spent = spendSpellSlot(spells.slots, slotLevel)
      if (!spent.ok) {
        onToast?.(`Нет ячейки ${slotLevel} круга`)
        return
      }
      slotsNext = spent.slots
    }
    const hours = proficiencyBonusForTotalLevel(characterLevel)
    const withoutOld = inventoryItems.filter((item) => !item.notes.includes(PERFORMANCE_ITEM_MARK))
    const created = []
    for (let index = 0; index < count; index += 1) {
      const item = createInventoryItem()
      item.name = count > 1 ? `${trimmed} ${index + 1}` : trimmed
      item.catalog_id = null
      item.requires_attunement = false
      item.cost_gp = cost
      item.effects = []
      item.notes = `немагический · ${PERFORMANCE_ITEM_MARK} · ${SIZE_LABEL[size]} · ${cost} зм · исчезнет через ${hours} ч.`
      created.push(item)
    }
    onInventoryChange?.([...withoutOld, ...created])
    onResourcesChange(resourcesNext)
    if (via === 'slot') onSpellsChange({ ...spells, slots: slotsNext })
    onToast?.(
      count > 1
        ? `Создано предметов: ${count}. Немагические, на листе.`
        : `«${trimmed}» на листе. Немагический, до ${hours} ч.`,
    )
  }

  return (
    <Stack gap={10}>
      <Text tone="muted">
        Немагический предмет
        {cap == null ? ', без потолка цены' : `, цена ≤ ${cap} зм`}
        {feature.classLevel >= 14
          ? `, до Большого, штук ${count}.`
          : ', не больше Среднего. Один предмет за раз.'}{' '}
        Зарядов {left}/{pool?.max ?? 1}. Повтор — ячейка 2 круга или выше.
      </Text>
      <Field label="Название">
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Цена, зм">
        <Input value={gp} onChange={(event) => setGp(event.target.value)} />
      </Field>
      <label className="feature-resource__select">
        <span className="sr-only">Размер</span>
        <select
          className="play-select"
          value={size}
          onChange={(event) => setSize(event.target.value as CreationSize)}
        >
          {(Object.keys(SIZE_LABEL) as CreationSize[]).map((key) => (
            <option key={key} value={key} disabled={!performanceSizeAllowed(feature.classLevel, key)}>
              {SIZE_LABEL[key]}
            </option>
          ))}
        </select>
      </label>
      <div className="feature-resource__actions">
        <Button type="button" disabled={left <= 0} onClick={() => mint('pool')}>
          Создать
        </Button>
        {slots.length > 0 ? (
          <>
            <label className="feature-resource__select">
              <span className="sr-only">Круг ячейки</span>
              <select
                className="play-select"
                value={slotLevel}
                onChange={(event) => setSlotLevel(Number(event.target.value))}
              >
                {slots.map((level) => (
                  <option key={level} value={level}>
                    Ячейка {level}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" variant="secondary" onClick={() => mint('slot')}>
              Создать за ячейку
            </Button>
          </>
        ) : null}
      </div>
    </Stack>
  )
}

function AnimatingPerformance({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  spells,
  onSpellsChange,
  companions,
  onCompanionsChange,
  onToast,
}: ExtraProps) {
  const [name, setName] = useState('')
  const [slotLevel, setSlotLevel] = useState(3)
  const pool = feature.resource?.pool_id
    ? findFeatureResource(resources, classSlug, feature.resource.pool_id, feature.classEntryId)
    : null
  const left = spendRemaining(pool)
  const hp = dancingItemHp(feature.classLevel)
  const slots = [3, 4, 5, 6, 7, 8, 9].filter((level) => (spells.slots[String(level)]?.max ?? 0) > 0)

  function animate(via: 'pool' | 'slot') {
    const trimmed = name.trim()
    if (!trimmed) {
      onToast?.('Назови предмет размера Большой или меньше')
      return
    }
    let resourcesNext = resources
    let slotsNext = spells.slots
    if (via === 'pool') {
      const spent = spendFeatureUse({ resources, feature, classSlug })
      if (!spent.ok) {
        onToast?.(spent.message)
        return
      }
      resourcesNext = spent.resources
    } else {
      const spent = spendSpellSlot(spells.slots, slotLevel)
      if (!spent.ok) {
        onToast?.(`Нет ячейки ${slotLevel} круга`)
        return
      }
      slotsNext = spent.slots
    }
    const dancer = createCompanion({
      name: trimmed,
      kind: 'ally',
      role: 'ally',
      nature: 'construct',
      active: true,
      control: 'bonus_action_command',
      source: {
        kind: 'feature',
        labelRu: 'Оживляющее выступление',
        classEntryId: feature.classEntryId,
        feature: DANCING_ITEM_FEATURE,
      },
      stats: { hp, hp_max: hp, ac: 16, speed: 30 },
      actions:
        'Танцующий предмет, 1 час. Без команды — Уклонение. Бонусным действием — действие из блока или другое. Иммунитет к яду и психическому урону.',
      notes: 'Large или меньше. Один танцующий предмет за раз.',
    })
    onCompanionsChange?.([
      ...companions.filter((row) => row.source?.feature !== DANCING_ITEM_FEATURE),
      dancer,
    ])
    onResourcesChange(resourcesNext)
    if (via === 'slot') onSpellsChange({ ...spells, slots: slotsNext })
    onToast?.(`«${trimmed}» танцует 1 час · КД 16 · хиты ${hp}`)
  }

  return (
    <Stack gap={10}>
      <Text tone="muted">
        Предмет размера Большой или меньше на 1 час. КД 16, хиты {hp}, скорость 30. Зарядов{' '}
        {left}/{pool?.max ?? 1}. Повтор — ячейка 3 круга или выше.
      </Text>
      <Field label="Предмет">
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <div className="feature-resource__actions">
        <Button type="button" disabled={left <= 0} onClick={() => animate('pool')}>
          Оживить
        </Button>
        {slots.length > 0 ? (
          <>
            <label className="feature-resource__select">
              <span className="sr-only">Круг ячейки</span>
              <select
                className="play-select"
                value={slotLevel}
                onChange={(event) => setSlotLevel(Number(event.target.value))}
              >
                {slots.map((level) => (
                  <option key={level} value={level}>
                    Ячейка {level}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" variant="secondary" onClick={() => animate('slot')}>
              Оживить за ячейку
            </Button>
          </>
        ) : null}
      </div>
    </Stack>
  )
}

function TalesFromBeyond({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  onToast,
  unlocked,
}: ExtraProps) {
  const sides = inspirationSides(unlocked, feature.classEntryId)
  const mystical = feature.classLevel >= 14
  const [pending, setPending] = useState<number[] | null>(null)
  const pool = findFeatureResource(resources, classSlug, 'bardic_inspiration', feature.classEntryId)
  const left = spendRemaining(pool)

  function commit(rolls: number[], chosenRoll: number) {
    const tale = spiritTaleByRoll(chosenRoll)
    if (!tale) return
    onToast?.(formatSpiritTaleToast({ sides, rolls, chosen: tale }))
    setPending(null)
  }

  return (
    <Stack gap={10}>
      <Text tone="muted">
        Бонусным действием тратит кость вдохновения (сейчас {left}/{pool?.max ?? 0}, 1к{sides}) и
        бросает её по таблице сказаний. Результат остаётся в истории бросков.
        {mystical ? ' С 14 уровня — две кости, выбери одну. Совпали — можно взять любой номер.' : ''}
      </Text>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0}
          onClick={() => {
            const spent = spendFeatureUse({ resources, feature, classSlug })
            if (!spent.ok) {
              onToast?.(spent.message)
              return
            }
            onResourcesChange(spent.resources)
            const first = rollDie(sides)
            if (!mystical) {
              commit([first], first)
              return
            }
            const second = rollDie(sides)
            setPending([first, second])
          }}
        >
          Бросить сказание
        </Button>
      </div>
      {pending ? (
        <Stack gap={8}>
          <Text>
            Кости: {pending.join(' и ')}.
            {pending[0] === pending[1] ? ' Совпали — можно выбрать любой рассказ.' : ' Выбери один.'}
          </Text>
          <div className="feature-resource__actions">
            {(pending[0] === pending[1] ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : pending).map(
              (roll) => {
                const tale = spiritTaleByRoll(roll)
                if (!tale) return null
                return (
                  <Button key={`${roll}-${tale.nameRu}`} type="button" onClick={() => commit(pending, roll)}>
                    {roll}. {tale.nameRu}
                  </Button>
                )
              },
            )}
          </div>
        </Stack>
      ) : null}
    </Stack>
  )
}
