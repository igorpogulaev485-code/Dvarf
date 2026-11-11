/**
 * Druid circle actions: pick an effect, then spend the charge.
 * Uses the same feature-card atoms as the other class extras.
 */

import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import {
  findFeatureResource,
  spendFeatureUse,
  spendRemaining,
} from '../../shared/dnd/featureResources'
import type { RulesEdition } from '../../shared/api/characters'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Field, Input, Stack, Text } from '../../ui'
import { bestiaryDataToPick } from './bestiaryCompanionStats'
import { haloDice, SYMBIOTIC_ACTIVE_PREFIX } from './featureCombatBonuses'
import { createCompanion, type CompanionEntry } from './companions'
import { abilityModifier } from './sheetTypes'
import { rollDie } from './deskRolls'
import { parseCr, type BestiaryFormPick } from './wildShape'

const PACK07_SPEND = new Set([
  'hidden_paths',
  'walker_in_dreams',
  'spirit_totem',
  'cosmic_omen',
  'fungal_infestation',
  'cauterizing_flames',
  'blazing_revival',
  'faithful_summons',
])

export function pack07CustomSpendFeature(featureId: string): boolean {
  return PACK07_SPEND.has(featureId)
}

type ExtraProps = {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  companions: CompanionEntry[]
  onCompanionsChange?: (companions: CompanionEntry[]) => void
  onToast?: (message: string) => void
  wisdomScore?: number
  hpCurrent?: number | null
  hpMax?: number | null
  onHpChange?: (hp: number) => void
  edition?: RulesEdition
}

const TOTEMS = [
  {
    id: 'bear',
    label: 'Медведь',
    text: 'Существа на выбор в ауре получают временные хиты = 5 + уровень друида. Пока они в ауре — преимущество на проверки и спасброски Силы. 1 минута, бонусным действием.',
  },
  {
    id: 'hawk',
    label: 'Ястреб',
    text: 'Реакцией — преимущество на одну атаку по существу в ауре. Ты и союзники в ауре имеете преимущество на Внимательность. 1 минута.',
  },
  {
    id: 'unicorn',
    label: 'Единорог',
    text: 'Преимущество на проверки, чтобы заметить существ в ауре, и на спасброски против испуга и очарования. Бонусным можно потратить ячейку: лечение 1к6 за её уровень существу в ауре. 1 минута.',
  },
] as const

const DREAM_SPELLS = [
  { id: 'dream', label: 'Сон (ты — посланник)' },
  { id: 'scrying', label: 'Наблюдение' },
  { id: 'teleportation_circle', label: 'Круг телепортации (круг, виденный за год, тот же план)' },
] as const

const FAITHFUL_FALLBACKS: BestiaryFormPick[] = [
  {
    slug: 'polar_bear',
    name_ru: 'Белый медведь',
    cr: '2',
    type: 'beast',
    ac: 12,
    hp: 42,
    speed_walk: 40,
    speed_swim: 30,
    str: 20,
    dex: 10,
    con: 16,
    actions_text: 'Укус и когти.',
  },
  {
    slug: 'saber_toothed_tiger',
    name_ru: 'Саблезубый тигр',
    cr: '2',
    type: 'beast',
    ac: 12,
    hp: 52,
    speed_walk: 40,
    str: 18,
    dex: 14,
    con: 15,
    actions_text: 'Укус и когти.',
  },
  {
    slug: 'rhinoceros',
    name_ru: 'Носорог',
    cr: '2',
    type: 'beast',
    ac: 11,
    hp: 45,
    speed_walk: 40,
    str: 21,
    dex: 8,
    con: 15,
    actions_text: 'Бодание.',
  },
  {
    slug: 'allosaurus',
    name_ru: 'Аллозавр',
    cr: '2',
    type: 'beast',
    ac: 13,
    hp: 51,
    speed_walk: 60,
    str: 19,
    dex: 13,
    con: 17,
    actions_text: 'Укус и когти.',
  },
]

function poolLeft(resources: SheetResource[], classSlug: string, feature: UnlockedFeature): number {
  const poolId = feature.resource?.pool_id
  if (!poolId) return 0
  return spendRemaining(findFeatureResource(resources, classSlug, poolId, feature.classEntryId))
}

function markActive(
  resources: SheetResource[],
  classSlug: string,
  feature: UnlockedFeature,
  label: string,
): SheetResource[] {
  const pool = findFeatureResource(
    resources,
    classSlug,
    feature.resource?.pool_id ?? feature.id,
    feature.classEntryId,
  )
  if (!pool) return resources
  return resources.map((row) => (row.id === pool.id ? { ...row, activeLabel: label } : row))
}

export function Pack07FeatureExtras(props: ExtraProps) {
  const id = props.feature.id
  if (id === 'hidden_paths') return <HiddenPaths {...props} />
  if (id === 'walker_in_dreams') return <WalkerInDreams {...props} />
  if (id === 'spirit_totem') return <SpiritTotem {...props} />
  if (id === 'cosmic_omen') return <CosmicOmen {...props} />
  if (id === 'fungal_infestation') return <FungalInfestation {...props} />
  if (id === 'cauterizing_flames') return <CauterizingFlames {...props} />
  if (id === 'blazing_revival') return <BlazingRevival {...props} />
  if (id === 'faithful_summons') return <FaithfulSummons {...props} />
  if (id === 'halo_of_spores') return <HaloNote {...props} />
  if (id === 'fungal_body') return <FungalBodyNote />
  if (id === 'symbiotic_entity') return <SymbioticEnd {...props} />
  if (id === 'starry_form') return <StarryNote {...props} />
  return null
}

function HiddenPaths(props: ExtraProps) {
  const [mode, setMode] = useState<'self' | 'other'>('self')
  const [target, setTarget] = useState('')
  const left = poolLeft(props.resources, props.classSlug, props.feature)
  return (
    <Stack gap={8}>
      <Text tone="muted">
        Себя — бонусным, до 60 фт. Согласное существо, которого касаешься — действием, до 30 фт.
        Клетка на карте не считается.
      </Text>
      <label className="feature-resource__select">
        <span className="sr-only">Кого телепортировать</span>
        <select className="play-select" value={mode} onChange={(event) => setMode(event.target.value as 'self' | 'other')}>
          <option value="self">Себя, 60 фт., бонусным</option>
          <option value="other">Согласное существо, 30 фт., действием</option>
        </select>
      </label>
      {mode === 'other' ? (
        <Field label="Кого">
          <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Имя существа" />
        </Field>
      ) : null}
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0 || (mode === 'other' && !target.trim())}
          onClick={() => {
            const spent = spendFeatureUse({
              resources: props.resources,
              feature: props.feature,
              classSlug: props.classSlug,
            })
            if (!spent.ok) {
              props.onToast?.(spent.message)
              return
            }
            props.onResourcesChange(spent.resources)
            props.onToast?.(
              mode === 'self'
                ? 'Скрытые тропы: ты телепортируешься до 60 фт. в видимую свободную клетку (бонусным).'
                : `Скрытые тропы: ${target.trim()} телепортируется до 30 фт. в видимую свободную клетку (действием).`,
            )
          }}
        >
          Телепортировать
        </Button>
      </div>
    </Stack>
  )
}

function WalkerInDreams(props: ExtraProps) {
  const [spellId, setSpellId] = useState<(typeof DREAM_SPELLS)[number]['id']>('dream')
  const [target, setTarget] = useState('')
  const left = poolLeft(props.resources, props.classSlug, props.feature)
  const spell = DREAM_SPELLS.find((row) => row.id === spellId) ?? DREAM_SPELLS[0]
  return (
    <Stack gap={8}>
      <Text tone="muted">
        После короткого отдыха не короче 10 минут — одно заклинание без ячейки и без материальных компонентов. Раз за продолжительный отдых.
      </Text>
      <label className="feature-resource__select">
        <span className="sr-only">Заклинание Странника</span>
        <select
          className="play-select"
          value={spellId}
          onChange={(event) => setSpellId(event.target.value as (typeof DREAM_SPELLS)[number]['id'])}
        >
          {DREAM_SPELLS.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <Field label="Цель или круг">
        <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Необязательно" />
      </Field>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0}
          onClick={() => {
            const spent = spendFeatureUse({
              resources: props.resources,
              feature: props.feature,
              classSlug: props.classSlug,
            })
            if (!spent.ok) {
              props.onToast?.(spent.message)
              return
            }
            props.onResourcesChange(spent.resources)
            props.onToast?.(
              `Странник снов: ${spell.label}${target.trim() ? ` · ${target.trim()}` : ''} · без ячейки`,
            )
          }}
        >
          Наложить
        </Button>
      </div>
    </Stack>
  )
}

function SpiritTotem(props: ExtraProps) {
  const [totemId, setTotemId] = useState<(typeof TOTEMS)[number]['id']>('bear')
  const left = poolLeft(props.resources, props.classSlug, props.feature)
  const totem = TOTEMS.find((row) => row.id === totemId) ?? TOTEMS[0]
  const temp = 5 + props.feature.classLevel
  return (
    <Stack gap={8}>
      <Text tone="muted">{totem.text}</Text>
      {totem.id === 'bear' ? (
        <Text tone="muted">Медведь: временные хиты сейчас {temp} (5 + уровень друида).</Text>
      ) : null}
      <label className="feature-resource__select">
        <span className="sr-only">Дух</span>
        <select
          className="play-select"
          value={totemId}
          onChange={(event) => setTotemId(event.target.value as (typeof TOTEMS)[number]['id'])}
        >
          {TOTEMS.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0}
          onClick={() => {
            const spent = spendFeatureUse({
              resources: props.resources,
              feature: props.feature,
              classSlug: props.classSlug,
            })
            if (!spent.ok) {
              props.onToast?.(spent.message)
              return
            }
            const label = `Дух-тотем · ${totem.label} · 1 мин`
            props.onResourcesChange(markActive(spent.resources, props.classSlug, props.feature, label))
            props.onToast?.(`${label}. ${totem.text}`)
          }}
        >
          Призвать духа
        </Button>
      </div>
    </Stack>
  )
}

function CosmicOmen(props: ExtraProps) {
  const [target, setTarget] = useState('')
  const pool = findFeatureResource(
    props.resources,
    props.classSlug,
    props.feature.resource?.pool_id ?? 'cosmic_omen',
    props.feature.classEntryId,
  )
  const omen = pool?.activeLabel?.startsWith('Знамение:') ? pool.activeLabel : ''
  const left = spendRemaining(pool)
  return (
    <Stack gap={8}>
      <Text tone="muted">
        После продолжительного отдыха брось к6: чёт — Weal (бонус), нечёт — Woe (штраф). Реакция тратит заряд и добавляет ещё один к6 к броску в 30 фт.
      </Text>
      <Text>{omen || 'Дневное знамение ещё не брошено.'}</Text>
      <Field label="Чей бросок">
        <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Существо и проверка" />
      </Field>
      <div className="feature-resource__actions">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const roll = rollDie(6)
            const kind = roll % 2 === 0 ? 'Weal' : 'Woe'
            props.onResourcesChange(
              markActive(props.resources, props.classSlug, props.feature, `Знамение: ${kind} (к6=${roll})`),
            )
            props.onToast?.(`Космическое знамение: к6=${roll} → ${kind}. Заряд реакции не потрачен.`)
          }}
        >
          Бросок знамения
        </Button>
        <Button
          type="button"
          disabled={!omen || left <= 0 || !target.trim()}
          onClick={() => {
            const spent = spendFeatureUse({
              resources: props.resources,
              feature: props.feature,
              classSlug: props.classSlug,
            })
            if (!spent.ok) {
              props.onToast?.(spent.message)
              return
            }
            const die = rollDie(6)
            const weal = omen.includes('Weal')
            const label = pool?.activeLabel
            props.onResourcesChange(
              label
                ? markActive(spent.resources, props.classSlug, props.feature, label)
                : spent.resources,
            )
            props.onToast?.(
              `${weal ? 'Weal' : 'Woe'}: ${weal ? '+' : '−'}${die} к броску «${target.trim()}» (к6). Реакция потрачена.`,
            )
          }}
        >
          Реакция, к6
        </Button>
      </div>
    </Stack>
  )
}

function FungalInfestation(props: ExtraProps) {
  const [target, setTarget] = useState('')
  const left = poolLeft(props.resources, props.classSlug, props.feature)
  return (
    <Stack gap={8}>
      <Text tone="muted">
        Реакция, когда гуманоид в 10 фт. умирает. Зомби на 1 час: КД 8, 22 хита, скорость 20, удар +3 (1к6+1). Бонусным действием — команда.
      </Text>
      <Field label="Умерший гуманоид">
        <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Имя" />
      </Field>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0 || !target.trim()}
          onClick={() => {
            const spent = spendFeatureUse({
              resources: props.resources,
              feature: props.feature,
              classSlug: props.classSlug,
            })
            if (!spent.ok) {
              props.onToast?.(spent.message)
              return
            }
            const name = `Зомби · ${target.trim()}`
            const zombie = createCompanion({
              kind: 'other',
              role: 'ally',
              name,
              nature: 'summoned',
              control: 'bonus_action_command',
              active: true,
              stats: { hp: 22, hp_max: 22, ac: 8, speed: 20, str: 13, dex: 6, con: 16 },
              actions: 'Удар: +3 к попаданию, 1к6+1 дробящий. Стойкость нежити.',
              notes: 'Грибковое заражение · гуманоид · 1 час · бонусным командовать.',
              source: {
                kind: 'subclass',
                labelRu: 'Грибковое заражение',
                feature: 'fungal_infestation',
                classEntryId: props.feature.classEntryId,
              },
            })
            props.onResourcesChange(spent.resources)
            props.onCompanionsChange?.([...props.companions, zombie])
            props.onToast?.(`${name}: 22 хита, 1 час. Прежние спутники не затронуты.`)
          }}
        >
          Поднять зомби
        </Button>
      </div>
    </Stack>
  )
}

function CauterizingFlames(props: ExtraProps) {
  const [mode, setMode] = useState<'heal' | 'fire'>('heal')
  const [target, setTarget] = useState('')
  const left = poolLeft(props.resources, props.classSlug, props.feature)
  const wis = abilityModifier(props.wisdomScore ?? 10)
  return (
    <Stack gap={8}>
      <Text tone="muted">
        Реакция, когда существо в 30 фт. от тебя или духа умирает. Потом существо в этой зоне: лечение или огонь 2к10+МУД ({wis >= 0 ? `+${wis}` : wis}).
      </Text>
      <label className="feature-resource__select">
        <span className="sr-only">Лечение или урон</span>
        <select className="play-select" value={mode} onChange={(event) => setMode(event.target.value as 'heal' | 'fire')}>
          <option value="heal">Лечение</option>
          <option value="fire">Урон огнём</option>
        </select>
      </label>
      <Field label="Цель">
        <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Существо в зоне" />
      </Field>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0 || !target.trim()}
          onClick={() => {
            const spent = spendFeatureUse({
              resources: props.resources,
              feature: props.feature,
              classSlug: props.classSlug,
            })
            if (!spent.ok) {
              props.onToast?.(spent.message)
              return
            }
            const a = rollDie(10)
            const b = rollDie(10)
            const total = a + b + wis
            props.onResourcesChange(spent.resources)
            props.onToast?.(
              `Прижигающее пламя · ${mode === 'heal' ? 'лечение' : 'огонь'} «${target.trim()}»: 2к10+МУД = ${total} [${a}+${b}${wis >= 0 ? '+' : ''}${wis}]. Реакция потрачена.`,
            )
          }}
        >
          Применить реакцию
        </Button>
      </div>
    </Stack>
  )
}

function BlazingRevival(props: ExtraProps) {
  const left = poolLeft(props.resources, props.classSlug, props.feature)
  const spirit = props.companions.find(
    (row) => row.source?.feature === 'summon_wildfire_spirit' && row.active && (row.stats.hp ?? 0) > 0,
  )
  const host = Math.max(0, Math.floor(props.hpCurrent ?? 0))
  return (
    <Stack gap={8}>
      <Text tone="muted">
        Если дух в пределах 120 фт. и ты падаешь до 0 хитов, дух уничтожается, а ты встаёшь с половиной максимума хитов. Раз за продолжительный отдых.
      </Text>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0}
          onClick={() => {
            if (!spirit) {
              props.onToast?.('Пылающее возрождение: нет активного духа дикого огня. Заряд не потрачен.')
              return
            }
            if (host > 0) {
              props.onToast?.('Пылающее возрождение срабатывает только при 0 хитах. Заряд не потрачен.')
              return
            }
            const max = Math.max(0, Math.floor(props.hpMax ?? 0))
            const healed = Math.max(1, Math.floor(max / 2))
            const spent = spendFeatureUse({
              resources: props.resources,
              feature: props.feature,
              classSlug: props.classSlug,
            })
            if (!spent.ok) {
              props.onToast?.(spent.message)
              return
            }
            props.onResourcesChange(spent.resources)
            props.onHpChange?.(healed)
            props.onCompanionsChange?.(
              props.companions.map((row) =>
                row.id === spirit.id
                  ? { ...row, active: false, stats: { ...row.stats, hp: 0 } }
                  : row,
              ),
            )
            props.onToast?.(
              `Пылающее возрождение: дух уничтожен, ты на ${healed} хитах (половина максимума ${max}).`,
            )
          }}
        >
          Возродиться
        </Button>
      </div>
    </Stack>
  )
}

function FaithfulSummons(props: ExtraProps) {
  const [beasts, setBeasts] = useState<BestiaryFormPick[]>(FAITHFUL_FALLBACKS)
  const [slug, setSlug] = useState(FAITHFUL_FALLBACKS[0]!.slug)
  const [confirmDespiteHp, setConfirmDespiteHp] = useState(false)
  const left = poolLeft(props.resources, props.classSlug, props.feature)
  const host = Math.max(0, Math.floor(props.hpCurrent ?? 0))
  useEffect(() => {
    let cancelled = false
    void listCatalogEntries({ kind: 'bestiary', edition: props.edition === '2024' ? '2024' : '2014' })
      .then((entries) => {
        if (cancelled) return
        const fromCatalog = entries
          .map((entry) => {
            const data = parseBestiaryData(entry.data)
            if (!data) return null
            return bestiaryDataToPick({
              slug: entry.slug,
              name_ru: entry.name_ru,
              catalog_id: entry.id,
              data,
            })
          })
          .filter((row): row is BestiaryFormPick => {
            if (!row || row.type !== 'beast') return false
            const cr = parseCr(row.cr)
            return cr != null && cr <= 2
          })
        if (fromCatalog.length === 0) return
        const bySlug = new Map(fromCatalog.map((row) => [row.slug, row]))
        for (const fallback of FAITHFUL_FALLBACKS) {
          if (!bySlug.has(fallback.slug)) bySlug.set(fallback.slug, fallback)
        }
        setBeasts([...bySlug.values()].sort((a, b) => a.name_ru.localeCompare(b.name_ru, 'ru')))
      })
      .catch(() => {
        if (!cancelled) setBeasts(FAITHFUL_FALLBACKS)
      })
    return () => {
      cancelled = true
    }
  }, [props.edition])
  const picked = useMemo(
    () => beasts.find((row) => row.slug === slug) ?? beasts[0] ?? FAITHFUL_FALLBACKS[0]!,
    [beasts, slug],
  )
  return (
    <Stack gap={8}>
      <Text tone="muted">
        При 0 хитах или недееспособности: четыре зверя CR 2 или ниже на 1 час, без концентрации. Они защищают тебя, если нет команды.
      </Text>
      <label className="feature-resource__select">
        <span className="sr-only">Зверь CR 2</span>
        <select className="play-select" value={picked.slug} onChange={(event) => setSlug(event.target.value)}>
          {beasts.map((row) => (
            <option key={row.slug} value={row.slug}>
              {row.name_ru} · CR {row.cr}
            </option>
          ))}
        </select>
      </label>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0}
          onClick={() => {
            if (host > 0 && !confirmDespiteHp) {
              setConfirmDespiteHp(true)
              props.onToast?.('Верные призывы — при 0 хитах или недееспособности. Нажми ещё раз, чтобы призвать сейчас.')
              return
            }
            const spent = spendFeatureUse({
              resources: props.resources,
              feature: props.feature,
              classSlug: props.classSlug,
            })
            if (!spent.ok) {
              props.onToast?.(spent.message)
              return
            }
            const summoned = [1, 2, 3, 4].map((index) =>
              createCompanion({
                kind: 'other',
                role: 'ally',
                name: `${picked.name_ru} ${index}`,
                nature: 'summoned',
                control: 'own_initiative',
                active: true,
                stats: {
                  hp: picked.hp,
                  hp_max: picked.hp,
                  ac: picked.ac,
                  speed: picked.speed_walk,
                  ...(picked.speed_fly != null ? { speed_fly: picked.speed_fly } : {}),
                  ...(picked.speed_swim != null ? { speed_swim: picked.speed_swim } : {}),
                  ...(picked.str != null ? { str: picked.str, dex: picked.dex, con: picked.con } : {}),
                },
                actions: picked.actions_text,
                notes: 'Верные призывы · 1 час · без концентрации · защищают, если нет команды.',
                source: {
                  kind: 'subclass',
                  labelRu: 'Верные призывы',
                  feature: 'faithful_summons',
                  classEntryId: props.feature.classEntryId,
                },
              }),
            )
            props.onResourcesChange(spent.resources)
            props.onCompanionsChange?.([...props.companions, ...summoned])
            props.onToast?.(`Верные призывы: четыре «${picked.name_ru}» на 1 час, без концентрации.`)
          }}
        >
          Призвать четырёх
        </Button>
      </div>
    </Stack>
  )
}

function HaloNote(props: ExtraProps) {
  const entity = props.resources.some(
    (row) =>
      row.id.includes(':symbiotic_entity:') &&
      (row.activeLabel ?? '').startsWith(SYMBIOTIC_ACTIVE_PREFIX),
  )
  const base = haloDice(props.feature.classLevel, false)
  const doubled = haloDice(props.feature.classLevel, true)
  return (
    <Text tone="muted">
      Ореол: {base}. Пока Симбиотическая сущность активна и временные хиты больше 0 — {doubled}.
      {entity ? ' Сущность сейчас включена.' : ' Сущность сейчас выключена.'}
    </Text>
  )
}

function FungalBodyNote() {
  return (
    <Text tone="muted">
      Пока есть хотя бы 1 хит: иммунитет к ослеплению, глухоте, испугу и отравлению. Критическое попадание по тебе считается обычным. Ручная отметка такого состояния спросит подтверждение.
    </Text>
  )
}

function SymbioticEnd(props: ExtraProps) {
  const pool = findFeatureResource(
    props.resources,
    props.classSlug,
    'symbiotic_entity',
    props.feature.classEntryId,
  )
  if (!pool?.activeLabel?.startsWith(SYMBIOTIC_ACTIVE_PREFIX)) return null
  return (
    <div className="feature-resource__actions">
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          props.onResourcesChange(
            props.resources.map((row) =>
              row.id === pool.id ? { ...row, activeLabel: undefined } : row,
            ),
          )
          props.onToast?.('Симбиотическая сущность завершена. +1к6 и удвоенный ореол больше не действуют.')
        }}
      >
        Завершить сущность
      </Button>
    </div>
  )
}

function StarryNote(props: ExtraProps) {
  const active = props.companions.find(
    (row) => row.role === 'self_form' && row.active && row.form?.form_source_ref?.startsWith('starry_form:'),
  )
  const ref = active?.form?.form_source_ref ?? ''
  const name = ref.endsWith(':archer')
    ? 'Лучник'
    : ref.endsWith(':chalice')
      ? 'Чаша'
      : ref.endsWith(':dragon')
        ? 'Дракон'
        : ''
  if (!name) return <Text tone="muted">Активного созвездия нет. «Через Дикий облик» запишет выбор в эту карточку.</Text>
  return (
    <Text tone="muted">
      Активно: {name}
      {name === 'Лучник'
        ? `. Атака «Лучистый лук» в списке атак (${props.feature.classLevel >= 10 ? '2к8' : '1к8'}+МУД).`
        : '.'}{' '}
      С 10-го уровня кость Лучника и Чаши — 2к8.
    </Text>
  )
}
