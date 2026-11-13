import { useEffect, useMemo, useState } from 'react'
import {
  emptySubclassPicks,
  subclassChoiceLabel,
  subclassNeedsSetupDialog,
  validateSubclassPicks,
  type SubclassGrantDef,
  type SubclassGrantPicks,
} from '../../shared/dnd/subclassGrants'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import { SKILL_DEFS } from './sheetTypes'
import { LANGUAGE_PRESETS } from './languagesTools'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import { alwaysPreparedSpellNameRu } from '../../shared/dnd/alwaysPreparedSpellNamesRu'
import { presentSubclassCopy } from '../../shared/dnd/subclassPlayerCopy'
import { bestiaryDataToPick } from './bestiaryCompanionStats'
import type { BestiaryFormPick } from './wildShape'

export type SubclassSetupConfirm = {
  picks: SubclassGrantPicks
  companionBestiaryPicks?: Record<string, BestiaryFormPick>
}

type SubclassSetupDialogProps = {
  open: boolean
  def: SubclassGrantDef | null
  onConfirm: (result: SubclassSetupConfirm) => void
  onClose: () => void
  edition?: '2014' | '2024'
}

const BEAST_MASTER_TYPES: Array<{ id: string; label: string }> = [
  { id: 'phb_beast_cr_1_4', label: 'Зверь из Книги игрока' },
  { id: 'beast_of_the_land', label: 'Первобытный спутник · земля' },
  { id: 'beast_of_the_sea', label: 'Первобытный спутник · море' },
  { id: 'beast_of_the_sky', label: 'Первобытный спутник · небо' },
]

function optionLabel(key: string, labels?: Record<string, string>): string {
  if (labels?.[key]) return labels[key]
  const skill = SKILL_DEFS.find((item) => item.key === key)
  if (skill) return skill.label
  return subclassChoiceLabel(key)
}

function catalogToPick(entry: CatalogEntry): BestiaryFormPick | null {
  const data = parseBestiaryData(entry.data)
  if (!data) return null
  return bestiaryDataToPick({
    slug: entry.slug,
    name_ru: entry.name_ru,
    catalog_id: entry.id,
    data,
  })
}

/** CR > 1/4 → soft hint (Н13: still allowed). */
function crAboveQuarter(cr: string): boolean {
  const t = cr.trim().toLowerCase()
  if (!t || t === '0' || t === '1/8' || t === '1/4') return false
  if (t === '1/2' || t === '½') return true
  const n = Number(t)
  return Number.isFinite(n) && n > 0.25
}

export function SubclassSetupDialog({
  open,
  def,
  onConfirm,
  onClose,
  edition = '2014',
}: SubclassSetupDialogProps) {
  const [picks, setPicks] = useState<SubclassGrantPicks>(emptySubclassPicks())
  const [bestiaryPicks, setBestiaryPicks] = useState<BestiaryFormPick[]>([])
  const [bestiaryLoading, setBestiaryLoading] = useState(false)
  const [bestiaryQuery, setBestiaryQuery] = useState('')
  const [selectedBestiary, setSelectedBestiary] = useState<BestiaryFormPick | null>(
    null,
  )

  const hasRangersCompanion = Boolean(
    def?.choices.some((c) => c.id.toLowerCase().includes('rangers_companion')),
  )
  const companionType =
    typeof picks.values.companion_type === 'string'
      ? picks.values.companion_type.trim()
      : ''
  const needsPhbBestiary =
    hasRangersCompanion && companionType === 'phb_beast_cr_1_4'

  useEffect(() => {
    if (!open) return
    setPicks(emptySubclassPicks())
    setSelectedBestiary(null)
    setBestiaryQuery('')
  }, [open, def?.slug])

  // Empty packs (Champion / Moon…): apply immediately so the dialog does not
  // sit waiting for «Отмена». Archetypes with choices still show the form.
  useEffect(() => {
    if (!open || !def) return
    if (subclassNeedsSetupDialog(def)) return
    onConfirm({ picks: emptySubclassPicks() })
    // Intentionally omit onConfirm: parent often passes an inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/def gate the auto-apply
  }, [open, def])

  useEffect(() => {
    if (!open || !needsPhbBestiary) return
    let cancelled = false
    setBestiaryLoading(true)
    void listCatalogEntries({ kind: 'bestiary', edition })
      .then((entries) => {
        if (cancelled) return
        setBestiaryPicks(
          entries
            .map(catalogToPick)
            .filter((p): p is BestiaryFormPick => Boolean(p)),
        )
      })
      .catch(() => {
        if (!cancelled) setBestiaryPicks([])
      })
      .finally(() => {
        if (!cancelled) setBestiaryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, needsPhbBestiary, edition])

  const baseError = useMemo(
    () => (def ? validateSubclassPicks(def, picks) : 'Нет данных'),
    [def, picks],
  )

  const error = useMemo(() => {
    if (baseError) return baseError
    if (hasRangersCompanion && !companionType) {
      return 'Выбери: зверь из Книги игрока или Первобытный спутник'
    }
    if (needsPhbBestiary && !selectedBestiary) {
      return 'Выбери существо из бестиария'
    }
    return null
  }, [
    baseError,
    hasRangersCompanion,
    companionType,
    needsPhbBestiary,
    selectedBestiary,
  ])

  const filteredBestiary = useMemo(() => {
    const q = bestiaryQuery.trim().toLowerCase()
    if (!q) return bestiaryPicks.slice(0, 40)
    return bestiaryPicks
      .filter(
        (p) =>
          p.name_ru.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q),
      )
      .slice(0, 40)
  }, [bestiaryPicks, bestiaryQuery])

  if (!def) return null

  function setSingle(id: string, value: string) {
    setPicks((prev) => ({ values: { ...prev.values, [id]: value } }))
  }

  function toggleMulti(id: string, value: string, count: number) {
    setPicks((prev) => {
      const current = prev.values[id]
      const list = Array.isArray(current) ? [...current] : []
      const idx = list.indexOf(value)
      if (idx >= 0) list.splice(idx, 1)
      else if (list.length < count) list.push(value)
      return { values: { ...prev.values, [id]: list } }
    })
  }

  return (
    <Dialog
      open={open}
      title={`${def.labelRu}: настройка архетипа`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      size="wide"
      primaryDisabled={Boolean(error)}
      onPrimary={() => {
        if (error) return
        const companionBestiaryPicks: Record<string, BestiaryFormPick> = {}
        let nextPicks = picks
        if (selectedBestiary && hasRangersCompanion) {
          companionBestiaryPicks.rangers_companion = selectedBestiary
          // Persist in picks so create-character → sheet grant can rebuild stats.
          nextPicks = {
            values: {
              ...picks.values,
              rangers_companion_bestiary: JSON.stringify({
                slug: selectedBestiary.slug,
                name_ru: selectedBestiary.name_ru,
                catalog_id: selectedBestiary.catalog_id ?? null,
                cr: selectedBestiary.cr,
                type: selectedBestiary.type,
                ac: selectedBestiary.ac,
                hp: selectedBestiary.hp,
                speed_walk: selectedBestiary.speed_walk,
                speed_swim: selectedBestiary.speed_swim,
                speed_fly: selectedBestiary.speed_fly,
                speed_climb: selectedBestiary.speed_climb,
                str: selectedBestiary.str,
                dex: selectedBestiary.dex,
                con: selectedBestiary.con,
                resistances: selectedBestiary.resistances,
                immunities: selectedBestiary.immunities,
                actions_text: selectedBestiary.actions_text,
              }),
            },
          }
        }
        onConfirm({
          picks: nextPicks,
          companionBestiaryPicks:
            Object.keys(companionBestiaryPicks).length > 0
              ? companionBestiaryPicks
              : undefined,
        })
      }}
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Выбери развилки архетипа. При смене архетипа старые выборы снимутся; общие заметки
          персонажа не трогаем.
        </Text>
        {presentSubclassCopy(def.notesRu) ? (
          <Text tone="muted">{presentSubclassCopy(def.notesRu)}</Text>
        ) : null}
        {def.alwaysPreparedSpells.length > 0 ? (
          <Text tone="muted">
            Всегда подготовлены ({def.alwaysPreparedSpells.length}):{' '}
            {def.alwaysPreparedSpells
              .map((spell) => alwaysPreparedSpellNameRu(spell.name))
              .join(', ')}
          </Text>
        ) : null}
        {Object.keys(def.featuresByLevel).length > 0 ? (
          <Stack gap={6}>
            <Text tone="muted">Умения архетипа:</Text>
            {Object.entries(def.featuresByLevel).map(([level, cards]) => (
              <Text key={level} tone="muted">
                {level} ур.: {cards.map((card) => card.titleRu).join(', ')}
                {presentSubclassCopy(cards[0]?.summaryRu)
                  ? ` — ${presentSubclassCopy(cards[0]?.summaryRu)}`
                  : ''}
              </Text>
            ))}
          </Stack>
        ) : null}

        {hasRangersCompanion ? (
          <Field
            label="Тип спутника"
            hint="Н4: без умолчания — зверь PHB или Первобытный спутник Таши"
          >
            <div className="chip-row">
              {BEAST_MASTER_TYPES.map((row) => {
                const on = companionType === row.id
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={`sheet-chip${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => {
                      setSingle('companion_type', row.id)
                      if (row.id !== 'phb_beast_cr_1_4') setSelectedBestiary(null)
                    }}
                  >
                    {row.label}
                  </button>
                )
              })}
            </div>
          </Field>
        ) : null}

        {def.choices.map((choice) => {
          const value = picks.values[choice.id]
          if (choice.kind === 'open_text') {
            return (
              <Field key={choice.id} label={choice.labelRu} hint={presentSubclassCopy(choice.notesRu)}>
                <Input
                  value={typeof value === 'string' ? value : ''}
                  placeholder="Имя / описание"
                  onChange={(event) => setSingle(choice.id, event.target.value)}
                />
              </Field>
            )
          }

          const selected = Array.isArray(value)
            ? value
            : typeof value === 'string' && value
              ? [value]
              : []
          const options =
            choice.from === 'any'
              ? choice.id.toLowerCase().includes('lang')
                ? [...LANGUAGE_PRESETS]
                : SKILL_DEFS.map((skill) => skill.key)
              : choice.from

          return (
            <Field
              key={choice.id}
              label={`${choice.labelRu}${
                choice.kind === 'multi' ? ` (${selected.length}/${choice.count})` : ''
              }`}
              hint={presentSubclassCopy(choice.notesRu)}
            >
              <div className="chip-row">
                {options.map((key) => {
                  const on = selected.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`sheet-chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        if (choice.kind === 'single') setSingle(choice.id, key)
                        else toggleMulti(choice.id, key, choice.count)
                      }}
                    >
                      {optionLabel(key, choice.fromLabelsRu)}
                    </button>
                  )
                })}
              </div>
            </Field>
          )
        })}

        {needsPhbBestiary ? (
          <Field
            label="Существо из бестиария"
            hint="Весь бестиарий. Если КР выше ¼ — подсказка «не по правилам», выбор не запрещён."
          >
            <Stack gap={8}>
              <Input
                value={bestiaryQuery}
                placeholder="Поиск…"
                onChange={(event) => setBestiaryQuery(event.target.value)}
              />
              {bestiaryLoading ? <Text tone="muted">Загрузка каталога…</Text> : null}
              <div className="chip-row">
                {filteredBestiary.map((pick) => {
                  const on = selectedBestiary?.slug === pick.slug
                  const offRules = crAboveQuarter(pick.cr)
                  return (
                    <button
                      key={pick.slug}
                      type="button"
                      className={`sheet-chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        setSelectedBestiary(pick)
                        const nameRaw = picks.values.rangers_companion
                        if (typeof nameRaw !== 'string' || !nameRaw.trim()) {
                          setSingle('rangers_companion', pick.name_ru)
                        }
                      }}
                    >
                      {pick.name_ru}
                      {offRules ? ' · не по правилам' : ''}
                    </button>
                  )
                })}
              </div>
              {selectedBestiary ? (
                <Text tone="muted">
                  Выбрано: {selectedBestiary.name_ru} · КД {selectedBestiary.ac} · HP{' '}
                  {selectedBestiary.hp}
                  {crAboveQuarter(selectedBestiary.cr)
                    ? ' · не по правилам (КР)'
                    : ''}
                </Text>
              ) : null}
            </Stack>
          </Field>
        ) : null}

        {error ? <Text tone="muted">{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}
