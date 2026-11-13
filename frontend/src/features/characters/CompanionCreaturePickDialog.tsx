/**
 * C-03 post-cast pickers: Find Steed, Animate/Create Undead, Conjure *.
 * Conjure filter is strict (type+CR only). Steed keeps «не по правилам» extras.
 */

import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'
import type { CompanionEntry, SteedSpiritType } from './companions'
import {
  applyConjureBestiaryPick,
  conjureCountForCr,
  conjureFilterForSpell,
  pickMatchesConjureFilter,
  type ConjureSpellKind,
} from './conjureCompanions'
import {
  applyFindSteedCompanion,
  FIND_GREATER_STEED_SLUG,
  FIND_STEED_SLUG,
  steedOfficialSlugs,
} from './steedCompanions'
import {
  ANIMATE_DEAD_OPTIONS,
  animateDeadCreatureLimit,
  applyAnimateOrCreateUndead,
  createUndeadChoices,
  type UndeadKindOption,
} from './undeadCompanions'
import type { SheetSpell } from './spells'
import type { BestiaryFormPick } from './wildShape'

export type CompanionCreaturePickKind =
  | { type: 'steed'; slug: typeof FIND_STEED_SLUG | typeof FIND_GREATER_STEED_SLUG }
  | { type: 'undead'; slug: 'animate_dead' | 'create_undead' }
  | { type: 'conjure'; slug: ConjureSpellKind }

export type CompanionCreaturePickResult = {
  companions: CompanionEntry[]
  toast: string
}

type Props = {
  open: boolean
  onClose: () => void
  kind: CompanionCreaturePickKind
  spell: SheetSpell
  slotLevel: number
  companions: CompanionEntry[]
  edition: '2014' | '2024'
  /** Necromancer Undead Thralls. */
  undeadThralls?: boolean
  wizardLevel?: number
  proficiencyBonus?: number
  onConfirm: (result: CompanionCreaturePickResult) => void
}

function catalogToPick(entry: CatalogEntry): BestiaryFormPick | null {
  const data = parseBestiaryData(entry.data)
  if (!data) return null
  const speed = data.speed || {}
  const actions = (data.actions || [])
    .map((a) => `${a.name_ru}: ${a.text_ru}`)
    .join('\n')
  return {
    slug: entry.slug,
    name_ru: entry.name_ru,
    catalog_id: entry.id,
    cr: data.cr,
    type: data.type,
    ac: data.ac,
    hp: data.hp_average,
    speed_walk: speed.walk ?? 0,
    speed_swim: speed.swim,
    speed_fly: speed.fly,
    speed_climb: speed.climb,
    str: data.abilities?.str,
    dex: data.abilities?.dex,
    con: data.abilities?.con,
    actions_text: actions,
  }
}

export function CompanionCreaturePickDialog({
  open,
  onClose,
  kind,
  spell,
  slotLevel,
  companions,
  edition,
  undeadThralls = false,
  wizardLevel = 1,
  proficiencyBonus = 2,
  onConfirm,
}: Props) {
  const [query, setQuery] = useState('')
  const [catalogPicks, setCatalogPicks] = useState<BestiaryFormPick[]>([])
  const [loading, setLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [spiritType, setSpiritType] = useState<SteedSpiritType>('celestial')
  const [languageRu, setLanguageRu] = useState('Общий')
  const [undeadOption, setUndeadOption] = useState<UndeadKindOption>(
    ANIMATE_DEAD_OPTIONS[0]!,
  )
  const [count, setCount] = useState(1)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSpiritType('celestial')
    setLanguageRu('Общий')
    if (kind.type === 'undead' && kind.slug === 'animate_dead') {
      setUndeadOption(ANIMATE_DEAD_OPTIONS[0]!)
      setCount(animateDeadCreatureLimit(slotLevel, undeadThralls))
    } else if (kind.type === 'undead' && kind.slug === 'create_undead') {
      const choices = createUndeadChoices(slotLevel)
      setUndeadOption(choices[0]!.option)
      setCount(choices[0]!.maxCount)
    } else {
      setCount(1)
    }
  }, [open, kind, slotLevel, undeadThralls])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setCatalogError(null)
    void listCatalogEntries({ kind: 'bestiary', edition })
      .then((entries) => {
        if (cancelled) return
        setCatalogPicks(
          entries
            .map(catalogToPick)
            .filter((p): p is BestiaryFormPick => Boolean(p)),
        )
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setCatalogError(err instanceof Error ? err.message : 'Каталог недоступен')
        setCatalogPicks([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, edition])

  const title =
    kind.type === 'steed'
      ? kind.slug === FIND_GREATER_STEED_SLUG
        ? 'Поиск высшего скакуна'
        : 'Поиск скакуна'
      : kind.type === 'undead'
        ? kind.slug === 'create_undead'
          ? 'Сотворение нежити'
          : 'Восставший труп'
        : spell.name || 'Призыв'

  const steedOfficial = useMemo(() => {
    if (kind.type !== 'steed') return [] as BestiaryFormPick[]
    const slugs = new Set(steedOfficialSlugs(kind.slug))
    return catalogPicks.filter((p) => slugs.has(p.slug))
  }, [kind, catalogPicks])

  const steedOther = useMemo(() => {
    if (kind.type !== 'steed') return [] as BestiaryFormPick[]
    const slugs = new Set(steedOfficialSlugs(kind.slug))
    const q = query.trim().toLowerCase()
    return catalogPicks.filter((p) => {
      if (slugs.has(p.slug)) return false
      if (!q) return true
      return (
        p.name_ru.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
      )
    })
  }, [kind, catalogPicks, query])

  const conjureOptions = useMemo(() => {
    if (kind.type !== 'conjure') return [] as BestiaryFormPick[]
    const filter = conjureFilterForSpell(kind.slug, slotLevel)
    const matched = catalogPicks.filter((p) => pickMatchesConjureFilter(p, filter))
    const q = query.trim().toLowerCase()
    if (!q) return matched
    return matched.filter(
      (p) =>
        p.name_ru.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q),
    )
  }, [kind, catalogPicks, slotLevel, query])

  const createChoices =
    kind.type === 'undead' && kind.slug === 'create_undead'
      ? createUndeadChoices(slotLevel)
      : []

  function confirmSteed(pick: BestiaryFormPick) {
    if (kind.type !== 'steed') return
    const applied = applyFindSteedCompanion({
      companions,
      pick,
      spell,
      slug: kind.slug,
      spiritType,
      languageRu,
      slotLevel,
    })
    onConfirm({
      companions: applied.companions,
      toast: applied.refreshed
        ? `${title}: скакун обновлён («${applied.name}»)`
        : `${title}: «${applied.name}»`,
    })
    onClose()
  }

  function confirmConjure(pick: BestiaryFormPick) {
    if (kind.type !== 'conjure') return
    const max = conjureCountForCr(kind.slug, slotLevel, pick.cr)
    const useCount =
      kind.slug === 'conjure_elemental' ||
      kind.slug === 'conjure_fey' ||
      kind.slug === 'conjure_celestial'
        ? 1
        : Math.min(Math.max(1, count), Math.max(1, max))
    const applied = applyConjureBestiaryPick({
      companions,
      kind: kind.slug,
      spellName: spell.name,
      spellId: spell.id,
      slotLevel,
      pick,
      count: useCount,
    })
    onConfirm({
      companions: applied.companions,
      toast: `${title}: «${applied.name}»`,
    })
    onClose()
  }

  function confirmUndead() {
    if (kind.type !== 'undead') return
    const pick =
      catalogPicks.find((p) => p.slug === undeadOption.slug) ?? null
    const limit =
      kind.slug === 'animate_dead'
        ? animateDeadCreatureLimit(slotLevel, undeadThralls)
        : createUndeadChoices(slotLevel).find(
            (c) => c.option.slug === undeadOption.slug,
          )?.maxCount ?? count
    const useCount = Math.min(Math.max(1, count), limit)
    const applied = applyAnimateOrCreateUndead({
      companions,
      spellSlug: kind.slug,
      spellName: spell.name,
      spellId: spell.id,
      option: undeadOption,
      count: useCount,
      pick,
      mode: 'create',
      undeadThralls: undeadThralls && kind.slug === 'animate_dead',
      wizardLevel,
      proficiencyBonus,
    })
    onConfirm({
      companions: applied.companions,
      toast: `${title}: «${applied.name}»`,
    })
    onClose()
  }

  return (
    <Dialog
      open={open}
      title={`${title} — выбор`}
      size="wide"
      secondaryLabel="Отмена"
      onSecondary={onClose}
      primaryLabel={kind.type === 'undead' ? 'Создать' : 'Закрыть'}
      onPrimary={() => {
        if (kind.type === 'undead') confirmUndead()
        else onClose()
      }}
    >
      <Stack gap={12}>
        {kind.type === 'steed' ? (
          <>
            <Text tone="muted">
              Один скакун на персонажа. Повторный каст обновляет ту же карточку и
              лечит до максимума. Ход всегда с хозяином.
            </Text>
            <Field label="Тип духа">
              <select
                value={spiritType}
                onChange={(e) =>
                  setSpiritType(e.target.value as SteedSpiritType)
                }
              >
                <option value="celestial">Небожитель</option>
                <option value="fey">Фея</option>
                <option value="fiend">Исчадие</option>
              </select>
            </Field>
            <Field label="Язык">
              <Input
                value={languageRu}
                onChange={(e) => setLanguageRu(e.target.value)}
              />
            </Field>
          </>
        ) : null}

        {kind.type === 'conjure' ? (
          <>
            <Text tone="muted">
              В списке только существа по правилам (тип и КР). Одинаковые —
              пачка «Имя ×N».
            </Text>
            {kind.slug === 'conjure_animals' ||
            kind.slug === 'conjure_woodland_beings' ||
            kind.slug === 'conjure_minor_elementals' ? (
              <Field label="Число (в пределах таблицы ячейки)">
                <Input
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value) || 1)}
                />
              </Field>
            ) : null}
          </>
        ) : null}

        {kind.type === 'undead' ? (
          <>
            <Text tone="muted">
              {kind.slug === 'create_undead'
                ? 'Только ночью (пометка). Контроль 24 часа; команда — бонусное.'
                : 'Контроль 24 часа; команда — бонусное. Рабы-нежить считаются сами, если есть умение.'}
            </Text>
            {kind.slug === 'animate_dead' ? (
              <Field label="Тип">
                <select
                  value={undeadOption.slug}
                  onChange={(e) => {
                    const next =
                      ANIMATE_DEAD_OPTIONS.find((o) => o.slug === e.target.value) ??
                      ANIMATE_DEAD_OPTIONS[0]!
                    setUndeadOption(next)
                  }}
                >
                  {ANIMATE_DEAD_OPTIONS.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.nameRu}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Тип">
                <select
                  value={undeadOption.slug}
                  onChange={(e) => {
                    const choice = createChoices.find(
                      (c) => c.option.slug === e.target.value,
                    )
                    if (!choice) return
                    setUndeadOption(choice.option)
                    setCount(choice.maxCount)
                  }}
                >
                  {createChoices.map((c) => (
                    <option key={c.option.slug} value={c.option.slug}>
                      {c.labelRu}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Число">
              <Input
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 1)}
              />
            </Field>
            {undeadThralls && kind.slug === 'animate_dead' ? (
              <Text tone="muted">
                Рабы-нежить: +1 существо, +хиты = ур. волшебника, +урон = БМ.
              </Text>
            ) : null}
          </>
        ) : null}

        {kind.type !== 'undead' ? (
          <Field label="Поиск">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="имя, тип…"
            />
          </Field>
        ) : null}

        {loading ? <Text tone="muted">Загрузка бестиария…</Text> : null}
        {catalogError ? (
          <Text tone="muted">Бестиарий: {catalogError}</Text>
        ) : null}

        {kind.type === 'steed' ? (
          <>
            <Stack gap={6}>
              <Text>Официальные облики ({steedOfficial.length})</Text>
              {steedOfficial.map((p) => (
                <Button
                  key={p.slug}
                  type="button"
                  variant="secondary"
                  onClick={() => confirmSteed(p)}
                >
                  {p.name_ru} · CR {p.cr} · КД {p.ac} · HP {p.hp}
                </Button>
              ))}
            </Stack>
            <Stack gap={6}>
              <Text>Другие (не по правилам)</Text>
              {steedOther.slice(0, 40).map((p) => (
                <Button
                  key={p.slug}
                  type="button"
                  variant="secondary"
                  onClick={() => confirmSteed(p)}
                >
                  {p.name_ru} · {p.type} · CR {p.cr} · не по правилам
                </Button>
              ))}
            </Stack>
          </>
        ) : null}

        {kind.type === 'conjure' ? (
          <Stack gap={6}>
            <Text>Подходящие ({conjureOptions.length})</Text>
            {conjureOptions.map((p) => {
              const max = conjureCountForCr(kind.slug, slotLevel, p.cr)
              return (
                <Button
                  key={p.slug}
                  type="button"
                  variant="secondary"
                  onClick={() => confirmConjure(p)}
                >
                  {p.name_ru} · {p.type} · CR {p.cr} · КД {p.ac} · HP {p.hp}
                  {max > 1 ? ` · до ${max}` : ''}
                </Button>
              )
            })}
            {!loading && conjureOptions.length === 0 ? (
              <Text tone="muted">Нет существ по типу и КР.</Text>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Dialog>
  )
}
