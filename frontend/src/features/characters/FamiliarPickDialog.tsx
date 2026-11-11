/**
 * After casting Find Familiar (or Wild Companion spend) — pick a form.
 * Options depend on mode: spell / pact_chain / wild_companion.
 */

import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import { parseBestiaryData } from '../../shared/dnd/bestiaryCatalog'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'
import type { CompanionEntry } from './companions'
import {
  applyFindFamiliarCompanion,
  familiarModeHintRu,
  familiarModeLabelRu,
  mergeFamiliarCatalogWithFallbacks,
  type FamiliarCastMode,
} from './familiarForms'
import type { SheetSpell } from './spells'
import type { BestiaryFormPick } from './wildShape'

export type FamiliarPickDialogResult = {
  companions: CompanionEntry[]
  toast: string
}

type FamiliarPickDialogProps = {
  open: boolean
  onClose: () => void
  mode: FamiliarCastMode
  spell?: SheetSpell | null
  slotLevel?: number
  companions: CompanionEntry[]
  characterLevel: number
  druidLevel?: number
  edition: '2014' | '2024'
  onConfirm: (result: FamiliarPickDialogResult) => void
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
    actions_text: actions,
  }
}

export function FamiliarPickDialog({
  open,
  onClose,
  mode,
  spell = null,
  slotLevel,
  companions,
  characterLevel,
  druidLevel,
  edition,
  onConfirm,
}: FamiliarPickDialogProps) {
  const [query, setQuery] = useState('')
  const [catalogPicks, setCatalogPicks] = useState<BestiaryFormPick[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const title = familiarModeLabelRu(mode)
  const hint = familiarModeHintRu(mode)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

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

  const options = useMemo(() => {
    const merged = mergeFamiliarCatalogWithFallbacks(catalogPicks, mode)
    const q = query.trim().toLowerCase()
    if (!q) return merged
    return merged.filter(
      (p) =>
        p.name_ru.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q),
    )
  }, [catalogPicks, mode, query])

  const special = useMemo(
    () =>
      mode === 'pact_chain'
        ? options.filter((p) =>
            ['imp', 'quasit', 'sprite', 'pseudodragon'].includes(p.slug),
          )
        : [],
    [mode, options],
  )
  const beasts = useMemo(
    () =>
      options.filter(
        (p) => !['imp', 'quasit', 'sprite', 'pseudodragon'].includes(p.slug),
      ),
    [options],
  )

  function confirmPick(pick: BestiaryFormPick) {
    const applied = applyFindFamiliarCompanion({
      companions,
      pick,
      mode,
      spell,
      slotLevel,
      characterLevel,
      druidLevel,
    })
    onConfirm({
      companions: applied.companions,
      toast: applied.refreshed
        ? `${title}: снова «${applied.name}»`
        : `${title}: «${applied.name}»`,
    })
    onClose()
  }

  return (
    <Dialog
      open={open}
      title={`${title} — выбери форму`}
      size="wide"
      secondaryLabel="Отмена"
      onSecondary={onClose}
      primaryLabel="Закрыть"
      onPrimary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">{hint}</Text>
        <Field label="Поиск">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="сова, бес, спрайт…"
          />
        </Field>
        {loading ? <Text tone="muted">Загрузка бестиария…</Text> : null}
        {catalogError ? (
          <Text tone="muted">
            Бестиарий недоступен ({catalogError}) — показаны запасные статы.
          </Text>
        ) : null}
        {special.length > 0 ? (
          <Stack gap={6}>
            <Text>Особые формы Цепи ({special.length})</Text>
            {special.map((p) => (
              <Button
                key={`special-${p.slug}`}
                type="button"
                variant="secondary"
                onClick={() => confirmPick(p)}
              >
                {p.name_ru} · {p.type} · CR {p.cr} · КД {p.ac} · HP {p.hp}
              </Button>
            ))}
          </Stack>
        ) : null}
        {beasts.length > 0 ? (
          <Stack gap={6}>
            <Text>
              {mode === 'wild_companion' ? 'Облики (как фея)' : 'Звери PHB'} (
              {beasts.length})
            </Text>
            {beasts.map((p) => (
              <Button
                key={p.slug}
                type="button"
                variant="secondary"
                onClick={() => confirmPick(p)}
              >
                {p.name_ru} · {p.type} · CR {p.cr} · КД {p.ac} · HP {p.hp}
                {p.speed_fly ? ` · полёт ${p.speed_fly}` : ''}
              </Button>
            ))}
          </Stack>
        ) : null}
        {!loading && options.length === 0 ? (
          <Text tone="muted">Нет доступных форм.</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
