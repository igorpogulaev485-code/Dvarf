/**
 * Copy a found ritual into the Ritual Caster book or the Book of Shadows.
 * Reuses the kit dialog and chips. No new screen.
 */

import { useMemo, useState } from 'react'
import { halfLevelRoundedUp, ritualTranscriptionCost } from '../../shared/dnd/ritualBooks'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'
import {
  addRitualBookEntry,
  recoverRitualBook,
  ritualBookCandidates,
  type CastWithoutSlotsInput,
} from './castWithoutSlots'
import type { RitualBookKind } from './spells'

type Props = {
  open: boolean
  input: CastWithoutSlotsInput
  onClose: () => void
  onApply: (next: { spells: CastWithoutSlotsInput['spells']; inventory: CastWithoutSlotsInput['inventory']; message: string | null }) => void
}

export function ritualBookButtonLabel(input: CastWithoutSlotsInput): string | null {
  const feat = input.featGrants.some((row) => row.slug === 'ritual_caster')
  const warlock = input.classes.find((row) => /колдун|warlock/i.test(row.name) && row.level > 0)
  const ancient = Boolean(
    warlock &&
      (input.featurePicks.values[`${warlock.id}:eldritch_invocations`] ?? '')
        .split(',')
        .includes('book_of_ancient_secrets'),
  )
  if (feat && ancient) return 'Книги ритуалов'
  if (feat) return 'Книга ритуалов'
  if (ancient) return 'Книга теней'
  return null
}

export function RitualBookCopyDialog({ open, input, onClose, onApply }: Props) {
  const feat = input.featGrants.some((row) => row.slug === 'ritual_caster')
  const warlock = input.classes.find((row) => /колдун|warlock/i.test(row.name) && row.level > 0)
  const ancient = Boolean(
    warlock &&
      (input.featurePicks.values[`${warlock.id}:eldritch_invocations`] ?? '')
        .split(',')
        .includes('book_of_ancient_secrets'),
  )
  const [kind, setKind] = useState<RitualBookKind>(feat ? 'feat' : 'ancient_secrets')
  const [query, setQuery] = useState('')
  const active: RitualBookKind = kind === 'feat' && feat ? 'feat' : ancient ? 'ancient_secrets' : 'feat'
  const listSlug =
    active === 'feat'
      ? (input.spells.ritual_books?.feat?.listSlug ??
        input.featGrants.find((row) => row.slug === 'ritual_caster')?.picks.enumIds.list ??
        null)
      : null
  const levelCap =
    active === 'feat'
      ? halfLevelRoundedUp(input.characterLevel)
      : halfLevelRoundedUp(warlock?.level ?? 1)
  const taken = (active === 'feat'
    ? input.spells.ritual_books?.feat?.entries
    : input.spells.ritual_books?.ancient_secrets?.entries
  )?.map((row) => row.slug) ?? []
  const lost =
    active === 'feat'
      ? Boolean(input.spells.ritual_books?.feat?.lost)
      : Boolean(input.spells.ritual_books?.ancient_secrets?.lost)
  const starters = (input.spells.ritual_books?.ancient_secrets?.entries ?? []).filter(
    (row) => row.starter,
  ).length
  const options = useMemo(() => {
    const rows = ritualBookCandidates({
      kind: active,
      listSlug,
      maxLevel: levelCap,
      taken,
    })
    const q = query.trim().toLowerCase()
    return (q ? rows.filter((row) => row.nameRu.toLowerCase().includes(q)) : rows).slice(0, 24)
  }, [active, listSlug, levelCap, taken.join('|'), query])

  function apply(slug: string) {
    const result = addRitualBookEntry({ ...input, kind: active, slug })
    onApply({
      spells: result.spells,
      inventory: result.inventory,
      message: result.message,
    })
    if (result.ok) onClose()
  }

  return (
    <Dialog
      open={open}
      title={active === 'feat' ? 'Книга ритуалов' : 'Книга теней'}
      primaryLabel="Закрыть"
      onPrimary={onClose}
      onSecondary={onClose}
      secondaryLabel="Отмена"
      size="wide"
    >
      <Stack gap={10}>
        {feat && ancient ? (
          <div className="chip-row" role="group" aria-label="Какая книга">
            <Button type="button" variant={active === 'feat' ? 'primary' : 'ghost'} onClick={() => setKind('feat')}>
              Черта
            </Button>
            <Button
              type="button"
              variant={active === 'ancient_secrets' ? 'primary' : 'ghost'}
              onClick={() => setKind('ancient_secrets')}
            >
              Книга теней
            </Button>
          </div>
        ) : null}
        <Text tone="muted">
          {active === 'feat'
            ? `Только ритуалы списка «${listSlug || '—'}», не выше ${levelCap} круга. Вписать: 2 часа и 50 зм за круг.`
            : `Ритуал любого класса, не выше ${levelCap} круга (половина уровня колдуна). ${
                starters < 2 ? `Два первых ритуала 1 круга бесплатно (осталось ${2 - starters}).` : 'Дальше: 2 часа и 50 зм за круг.'
              } Каст только ритуалом.`}
        </Text>
        {lost ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const result = recoverRitualBook({ ...input, kind: active })
              onApply({
                spells: result.spells,
                inventory: result.inventory,
                message: result.message,
              })
            }}
          >
            Книга снова в инвентаре
          </Button>
        ) : null}
        <Field label="Найти ритуал">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название" />
        </Field>
        <div className="chip-row">
          {options.map((row) => {
            const free = active === 'ancient_secrets' && row.level === 1 && starters < 2
            const cost = free ? null : ritualTranscriptionCost(row.level)
            return (
              <button
                key={row.slug}
                type="button"
                className="sheet-chip"
                disabled={lost}
                onClick={() => apply(row.slug)}
              >
                {row.nameRu} · {row.level} круг
                {cost ? ` · ${cost.hours} ч, ${cost.gp} зм` : ' · бесплатно'}
              </button>
            )
          })}
        </div>
        {options.length === 0 ? <Text tone="muted">Нет подходящих ритуалов.</Text> : null}
      </Stack>
    </Dialog>
  )
}
