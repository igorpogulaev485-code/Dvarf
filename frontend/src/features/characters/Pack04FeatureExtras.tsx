import { useMemo, useState } from 'react'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import {
  findFeatureResource,
  spendPoolUses,
  spendRemaining,
} from '../../shared/dnd/featureResources'
import {
  getFeaturePick,
  setFeaturePick,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import {
  EYES_OF_THE_DARK_COST,
  EYES_OF_THE_DARK_MIN_LEVEL,
  LUNAR_PHENOMENON_REPEAT_COST,
  LUNAR_PHENOMENON_TEXT,
  LUNAR_PHASE_LABEL,
  LUNAR_PHASE_SCHOOLS,
  PACT_BLADE_FORMS,
  PSIONIC_SORCERY_MIN_LEVEL,
  lunarPhaseFromStores,
  mysticArcanumLevel,
  normalizeLunarPhase,
  pactBladeFormById,
  psionicSorceryPointCost,
  warlockExpandedSlugSet,
  type LunarPhase,
} from '../../shared/dnd/pack04SorcererWarlock'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Field, Input, Stack, Text } from '../../ui'
import { bundledSpellsAtLevel } from './alwaysPreparedSpellEnrichment'
import type { SpellsState } from './spells'

const PHASES: LunarPhase[] = ['full_moon', 'new_moon', 'crescent_moon']

const PHENOMENON_POOL: Record<LunarPhase, string> = {
  full_moon: 'lunar_phenomenon_full',
  new_moon: 'lunar_phenomenon_new',
  crescent_moon: 'lunar_phenomenon_crescent',
}

type ExtraProps = {
  feature: UnlockedFeature
  classSlug: string
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  spells: SpellsState
  onSpellsChange: (spells: SpellsState) => void
  onToast?: (message: string) => void
  onSetConcentration?: (name: string) => void
  subclassSlug?: string | null
}

function sorceryLeft(
  resources: SheetResource[],
  classSlug: string,
  classEntryId: string,
): { left: number; max: number } {
  const pool = findFeatureResource(resources, classSlug, 'sorcery_points', classEntryId)
  return { left: spendRemaining(pool), max: pool?.max ?? 0 }
}

export function Pack04FeatureExtras(props: ExtraProps) {
  const id = props.feature.id
  if (id === 'psionic_sorcery') return <PsionicSorcery {...props} />
  if (id === 'eyes_of_the_dark') return <EyesOfTheDark {...props} />
  if (id === 'lunar_boons') return <LunarBoons {...props} />
  if (id === 'lunar_phenomenon') return <LunarPhenomenon {...props} />
  if (id === 'eldritch_master') return <EldritchMaster {...props} />
  if (mysticArcanumLevel(id) != null) return <MysticArcanum {...props} />
  if (id === 'pact_boon') return <PactBladeWeapon {...props} />
  return null
}

function PsionicSorcery({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  spells,
  onToast,
  onSetConcentration,
}: ExtraProps) {
  const [spellId, setSpellId] = useState('')
  if (feature.classLevel < PSIONIC_SORCERY_MIN_LEVEL) return null
  const options = spells.known.filter(
    (spell) =>
      spell.level >= 1 &&
      spell.class_entry_id === feature.classEntryId &&
      spell.id.includes(':aberrant_mind:'),
  )
  const picked = options.find((spell) => spell.id === spellId) ?? null
  const cost = picked ? psionicSorceryPointCost(picked.level) : 0
  const pool = sorceryLeft(resources, classSlug, feature.classEntryId)
  return (
    <div className="feature-resource">
      <Text tone="muted">
        Выбери псионическое заклинание. Стоимость = его круг. Без В и С; М только если
        компонент расходуется. Очков: {pool.left}/{pool.max}.
      </Text>
      {options.length === 0 ? (
        <Text tone="muted">Нет псионических заклинаний 1+ круга на листе.</Text>
      ) : (
        <label className="feature-resource__select">
          <span className="sr-only">Псионическое заклинание</span>
          <select
            className="play-select"
            value={spellId}
            onChange={(event) => setSpellId(event.target.value)}
          >
            <option value="">— заклинание —</option>
            {options.map((spell) => (
              <option key={spell.id} value={spell.id}>
                {spell.name} · {spell.level} ур. · {psionicSorceryPointCost(spell.level)} очк.
              </option>
            ))}
          </select>
        </label>
      )}
      {picked ? (
        <Text tone="muted">
          {picked.attack_or_save ? `Спас/атака: ${picked.attack_or_save}. ` : ''}
          {picked.damage ? `Урон: ${picked.damage}. ` : ''}
          {picked.range ? `Дистанция: ${picked.range}.` : ''}
        </Text>
      ) : null}
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={!picked || cost > pool.left}
          onClick={() => {
            if (!picked) return
            const spent = spendPoolUses({
              resources,
              classSlug,
              poolId: 'sorcery_points',
              classEntryId: feature.classEntryId,
              amount: cost,
              label: picked.name,
            })
            if (!spent.ok) {
              onToast?.(spent.message)
              return
            }
            onResourcesChange(spent.resources)
            if (picked.concentration) {
              onSetConcentration?.(`${picked.name} · псионика, без В/С`)
            }
            onToast?.(
              `${picked.name}: −${cost} очк. (круг ${picked.level}, без В/С)${
                picked.concentration ? ' · концентрация' : ''
              }`,
            )
          }}
        >
          {picked ? `Каст за ${cost} очк.` : 'Каст'}
        </Button>
      </div>
    </div>
  )
}

function EyesOfTheDark({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  onToast,
  onSetConcentration,
}: ExtraProps) {
  if (feature.classLevel < EYES_OF_THE_DARK_MIN_LEVEL) return null
  const pool = sorceryLeft(resources, classSlug, feature.classEntryId)
  const cost = EYES_OF_THE_DARK_COST
  return (
    <div className="feature-resource">
      <Text tone="muted">
        Тьма за {cost} очка чародейства (не 1). Концентрация. Ты видишь сквозь свою тьму.
        Очков: {pool.left}/{pool.max}. Компоненты заклинания: В, С, М.
      </Text>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={pool.left < cost}
          onClick={() => {
            if (pool.left < cost) {
              onToast?.(`Не хватает очков (нужно ${cost}, есть ${pool.left})`)
              return
            }
            const spent = spendPoolUses({
              resources,
              classSlug,
              poolId: 'sorcery_points',
              classEntryId: feature.classEntryId,
              amount: cost,
              label: 'Тьма',
            })
            if (!spent.ok) {
              onToast?.(spent.message)
              return
            }
            onResourcesChange(spent.resources)
            onSetConcentration?.('Тьма · видишь сквозь свою')
            onToast?.(`Тьма: −${cost} очк. · концентрация · видишь сквозь свою тьму`)
          }}
        >
          Тьма (−{cost})
        </Button>
      </div>
    </div>
  )
}

function LunarBoons({ feature, resources, classSlug, featurePicks }: ExtraProps) {
  const phase =
    lunarPhaseFromStores({
      featurePicks,
      classEntryId: feature.classEntryId,
    }) ?? null
  const pool = findFeatureResource(resources, classSlug, 'lunar_boons', feature.classEntryId)
  const left = spendRemaining(pool)
  return (
    <div className="feature-resource">
      <Text>
        Скидок: <strong>{left}</strong>/{pool?.max ?? 0} (бонус мастерства, до продолжительного
        отдыха).
      </Text>
      <Text tone="muted">
        {phase
          ? `${LUNAR_PHASE_LABEL[phase]}: ${LUNAR_PHASE_SCHOOLS[phase]}. −1 очко к метамагии этих школ (минимум 0).`
          : 'Фаза не выбрана — выбери её в «Лунном воплощении».'}
      </Text>
    </div>
  )
}

function LunarPhenomenon(props: ExtraProps) {
  const { feature, classSlug, resources, onResourcesChange, featurePicks, onFeaturePicksChange, onToast } =
    props
  const [phase, setPhase] = useState<LunarPhase>(
    () =>
      lunarPhaseFromStores({ featurePicks, classEntryId: feature.classEntryId }) ?? 'full_moon',
  )
  const poolId = PHENOMENON_POOL[phase]
  const pool = findFeatureResource(resources, classSlug, poolId, feature.classEntryId)
  const free = spendRemaining(pool)
  const points = sorceryLeft(resources, classSlug, feature.classEntryId)
  return (
    <Stack gap={8}>
      <Text tone="muted">
        Каждая фаза — отдельный бесплатный заряд. Если он потрачен, то же явление стоит{' '}
        {LUNAR_PHENOMENON_REPEAT_COST} очков. Очков сейчас {points.left}/{points.max}.
      </Text>
      <label className="feature-resource__select">
        <span className="sr-only">Фаза явления</span>
        <select
          className="play-select"
          value={phase}
          onChange={(event) => {
            const next = normalizeLunarPhase(event.target.value)
            if (next) setPhase(next)
          }}
        >
          {PHASES.map((id) => (
            <option key={id} value={id}>
              {LUNAR_PHASE_LABEL[id]}
            </option>
          ))}
        </select>
      </label>
      <Text>{LUNAR_PHENOMENON_TEXT[phase]}</Text>
      <Text tone="muted">
        Бесплатно: {free}/{pool?.max ?? 1}. {LUNAR_PHASE_LABEL[phase]}.
      </Text>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={free <= 0}
          onClick={() => {
            if (!pool || free <= 0) {
              onToast?.('Бесплатный заряд этой фазы потрачен — повтори за очки')
              return
            }
            onResourcesChange(
              resources.map((row) =>
                row.id === pool.id ? { ...row, used: Math.min(row.max, row.used + 1) } : row,
              ),
            )
            onFeaturePicksChange(
              setFeaturePick(featurePicks, feature.classEntryId, 'lunar_embodiment', phase),
            )
            onToast?.(`${LUNAR_PHASE_LABEL[phase]}: ${LUNAR_PHENOMENON_TEXT[phase]}`)
          }}
        >
          Бесплатно
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={points.left < LUNAR_PHENOMENON_REPEAT_COST}
          onClick={() => {
            const spent = spendPoolUses({
              resources,
              classSlug,
              poolId: 'sorcery_points',
              classEntryId: feature.classEntryId,
              amount: LUNAR_PHENOMENON_REPEAT_COST,
              label: LUNAR_PHASE_LABEL[phase],
            })
            if (!spent.ok) {
              onToast?.(spent.message)
              return
            }
            onResourcesChange(spent.resources)
            onFeaturePicksChange(
              setFeaturePick(featurePicks, feature.classEntryId, 'lunar_embodiment', phase),
            )
            onToast?.(
              `${LUNAR_PHASE_LABEL[phase]} за ${LUNAR_PHENOMENON_REPEAT_COST} очк.: ${LUNAR_PHENOMENON_TEXT[phase]}`,
            )
          }}
        >
          Повтор (−{LUNAR_PHENOMENON_REPEAT_COST})
        </Button>
      </div>
    </Stack>
  )
}

function EldritchMaster({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  spells,
  onSpellsChange,
  onToast,
}: ExtraProps) {
  const pool = findFeatureResource(resources, classSlug, 'eldritch_master', feature.classEntryId)
  const left = spendRemaining(pool)
  const pact = spells.pact_slots
  const spent = pact ? pact.used : 0
  return (
    <div className="feature-resource">
      <Text tone="muted">
        1 минута молитвы покровителю: все потраченные ячейки договора возвращаются. Арканумы и
        другие дневные ресурсы не тратятся и не восстанавливаются. Заряд: {left}/{pool?.max ?? 1}.
        Договор: {pact ? `${pact.max - pact.used}/${pact.max}` : 'нет'}.
      </Text>
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={left <= 0 || !pact || spent <= 0}
          onClick={() => {
            if (!pool || left <= 0) {
              onToast?.('Мистический мастер уже использован до продолжительного отдыха')
              return
            }
            if (!pact || pact.used <= 0) {
              onToast?.('Ячейки договора и так полны')
              return
            }
            onResourcesChange(
              resources.map((row) =>
                row.id === pool.id ? { ...row, used: Math.min(row.max, row.used + 1) } : row,
              ),
            )
            onSpellsChange({
              ...spells,
              pact_slots: { ...pact, used: 0 },
            })
            onToast?.(
              `Мистический мастер: договор ${pact.max - pact.used}/${pact.max} → ${pact.max}/${pact.max}. Арканумы не тронуты.`,
            )
          }}
        >
          1 минута: вернуть договор
        </Button>
      </div>
    </div>
  )
}

function MysticArcanum({
  feature,
  classSlug,
  resources,
  onResourcesChange,
  featurePicks,
  onFeaturePicksChange,
  onToast,
  onSetConcentration,
  subclassSlug,
}: ExtraProps) {
  const circle = mysticArcanumLevel(feature.id)
  const [query, setQuery] = useState('')
  const genieKind = getFeaturePick(featurePicks, feature.classEntryId, 'genies_vessel')
  const expanded = useMemo(
    () => warlockExpandedSlugSet(subclassSlug, genieKind),
    [subclassSlug, genieKind],
  )
  const options = useMemo(() => {
    if (circle == null) return []
    return bundledSpellsAtLevel(circle).filter((spell) => {
      const onWarlock = spell.classes.some((row) => row.toLowerCase() === 'warlock')
      return onWarlock || expanded.has(spell.slug)
    })
  }, [circle, expanded])
  const chosenSlug = getFeaturePick(featurePicks, feature.classEntryId, feature.id)
  const chosen = options.find((spell) => spell.slug === chosenSlug) ?? null
  const pool = feature.resource?.pool_id
    ? findFeatureResource(resources, classSlug, feature.resource.pool_id, feature.classEntryId)
    : null
  const left = spendRemaining(pool)
  const q = query.trim().toLowerCase()
  const shown = q
    ? options.filter(
        (spell) =>
          spell.nameRu.toLowerCase().includes(q) || spell.slug.includes(q),
      )
    : options
  if (circle == null) return null
  return (
    <div className="feature-resource">
      <Text tone="muted">
        Одно заклинание {circle} круга из списка колдуна (с расширением покровителя). Каст без
        ячейки, 1 раз до продолжительного отдыха. Эти круги не добавляются к ячейкам договора.
      </Text>
      <Field label="Поиск заклинания">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="имя или slug"
        />
      </Field>
      <label className="feature-resource__select">
        <span className="sr-only">Заклинание арканума</span>
        <select
          className="play-select"
          value={chosenSlug ?? ''}
          onChange={(event) => {
            const slug = event.target.value
            onFeaturePicksChange(
              setFeaturePick(featurePicks, feature.classEntryId, feature.id, slug || null),
            )
            const spell = options.find((row) => row.slug === slug)
            if (spell) onToast?.(`Арканум ${circle}: ${spell.nameRu}`)
          }}
        >
          <option value="">— выбрать заклинание —</option>
          {shown.slice(0, 80).map((spell) => (
            <option key={spell.slug} value={spell.slug}>
              {spell.nameRu}
            </option>
          ))}
        </select>
      </label>
      {chosen ? (
        <Text tone="muted">
          {chosen.nameRu}
          {chosen.attackOrSave ? ` · ${chosen.attackOrSave}` : ''}
          {chosen.damage ? ` · ${chosen.damage}` : ''}
          {chosen.range ? ` · ${chosen.range}` : ''}
          {chosen.concentration ? ' · концентрация' : ''}
        </Text>
      ) : (
        <Text tone="muted">Заклинание не выбрано — «Использовать» его не кастует.</Text>
      )}
      <div className="feature-resource__actions">
        <Button
          type="button"
          disabled={!chosen || left <= 0}
          onClick={() => {
            if (!chosen || !pool || left <= 0) return
            onResourcesChange(
              resources.map((row) =>
                row.id === pool.id ? { ...row, used: Math.min(row.max, row.used + 1) } : row,
              ),
            )
            if (chosen.concentration) onSetConcentration?.(chosen.nameRu)
            onToast?.(
              `${chosen.nameRu}: арканум ${circle}, без ячейки${
                chosen.damage ? ` · ${chosen.damage}` : ''
              }${chosen.attackOrSave ? ` · ${chosen.attackOrSave}` : ''}${
                chosen.concentration ? ' · концентрация' : ''
              }`,
            )
          }}
        >
          Каст без ячейки
        </Button>
      </div>
    </div>
  )
}

function PactBladeWeapon({
  feature,
  featurePicks,
  onFeaturePicksChange,
  onToast,
}: ExtraProps) {
  const pact = getFeaturePick(featurePicks, feature.classEntryId, 'pact_boon')
  const [boundDraft, setBoundDraft] = useState(
    () => getFeaturePick(featurePicks, feature.classEntryId, 'pact_blade_bound') ?? '',
  )
  if (pact !== 'blade') return null
  const formId = getFeaturePick(featurePicks, feature.classEntryId, 'pact_blade_form') ?? ''
  const form = pactBladeFormById(formId)
  return (
    <div className="feature-resource">
      <Text tone="muted">
        Действием создай пактное оружие в пустой руке или привяжи магическое оружие ритуалом на 1
        час. Атака появляется в боевых атаках; ты владеешь им, и оно считается магическим.
      </Text>
      <label className="feature-resource__select">
        <span className="sr-only">Форма оружия</span>
        <select
          className="play-select"
          value={formId}
          onChange={(event) => {
            const id = event.target.value
            onFeaturePicksChange(
              setFeaturePick(featurePicks, feature.classEntryId, 'pact_blade_form', id || null),
            )
            const next = pactBladeFormById(id)
            if (next) onToast?.(`Пактное оружие: ${next.nameRu}`)
          }}
        >
          <option value="">— форма оружия —</option>
          {PACT_BLADE_FORMS.map((row) => (
            <option key={row.id} value={row.id}>
              {row.nameRu} · {row.damage} {row.damageType}
            </option>
          ))}
        </select>
      </label>
      <Field label="Привязанное магическое оружие">
        <Input
          value={boundDraft}
          onChange={(event) => setBoundDraft(event.target.value)}
          placeholder="имя предмета, если ритуал привязки"
        />
      </Field>
      <div className="feature-resource__actions">
        <Button
          type="button"
          variant="secondary"
          disabled={!boundDraft.trim() && !form}
          onClick={() => {
            let next = featurePicks
            if (!formId && boundDraft.trim()) {
              next = setFeaturePick(next, feature.classEntryId, 'pact_blade_form', 'longsword')
            }
            onFeaturePicksChange(
              setFeaturePick(
                next,
                feature.classEntryId,
                'pact_blade_bound',
                boundDraft.trim() || null,
              ),
            )
            onToast?.(
              boundDraft.trim()
                ? `Ритуал привязки: ${boundDraft.trim()}`
                : 'Привязка снята',
            )
          }}
        >
          Привязать
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            let next = setFeaturePick(featurePicks, feature.classEntryId, 'pact_blade_form', null)
            next = setFeaturePick(next, feature.classEntryId, 'pact_blade_bound', null)
            onFeaturePicksChange(next)
            setBoundDraft('')
            onToast?.('Пактное оружие отозвано')
          }}
        >
          Отозвать
        </Button>
      </div>
      {form ? (
        <Text tone="muted">
          В руке: {boundDraft.trim() || form.nameRu}, {form.damage} {form.damageType}, владение есть.
        </Text>
      ) : null}
    </div>
  )
}
