import { useEffect, useRef, useState } from 'react'
import {
  formatSpellComponents,
  parseSpellCatalogData,
  spellSchoolLabelRu,
} from '../../shared/dnd/spellCatalog'
import { levelLabel } from '../../shared/dnd/spells'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { Dialog, Stack, Text } from '../../ui'
import { grantCastRemaining, spellSourceBadge, type SheetSpell } from './spells'

type SpellDetailDialogProps = {
  open: boolean
  spell: SheetSpell | null
  onClose: () => void
  /** Optional: jump to cast flow from the detail sheet. */
  onCast?: () => void
  /** Rules edition for catalog lookup when sheet has no description. */
  edition?: RulesEdition
  /** Persist catalog text onto the sheet row after a successful lookup. */
  onEnrichSpell?: (spellId: string, patch: Partial<SheetSpell>) => void
}

type CatalogText = {
  description: string
  higher_levels: string
  source_book: string
}

function pickCatalogMatch(spell: SheetSpell, rows: CatalogEntry[]): CatalogEntry | null {
  if (spell.catalog_id) {
    const byId = rows.find((row) => row.id === spell.catalog_id)
    if (byId) return byId
  }
  const name = spell.name.trim().toLowerCase()
  if (!name) return null
  const exact = rows.find((row) => row.name_ru.trim().toLowerCase() === name)
  if (exact) return exact
  const en = rows.find((row) => (row.name_en ?? '').trim().toLowerCase() === name)
  return en ?? null
}

/** Full read-only spell card: sheet fields + catalog description. */
export function SpellDetailDialog({
  open,
  spell,
  onClose,
  onCast,
  edition = '2014',
  onEnrichSpell,
}: SpellDetailDialogProps) {
  const [catalogText, setCatalogText] = useState<CatalogText | null>(null)
  const [catalogStatus, setCatalogStatus] = useState<'idle' | 'loading' | 'missing' | 'error'>(
    'idle',
  )
  const enrichRef = useRef(onEnrichSpell)
  enrichRef.current = onEnrichSpell

  useEffect(() => {
    if (!open || !spell) {
      setCatalogText(null)
      setCatalogStatus('idle')
      return
    }
    const hasLocal =
      Boolean(spell.description?.trim()) || Boolean(spell.higher_levels?.trim())
    if (hasLocal) {
      setCatalogText(null)
      setCatalogStatus('idle')
      return
    }

    let cancelled = false
    setCatalogStatus('loading')
    setCatalogText(null)

    const q = spell.name.trim()
    const spellSnapshot = spell
    listCatalogEntries({ kind: 'spell', edition, ...(q ? { q } : {}) })
      .then((rows) => {
        if (cancelled) return
        const match = pickCatalogMatch(spellSnapshot, rows)
        if (!match) {
          setCatalogStatus('missing')
          return
        }
        const parsed = parseSpellCatalogData(match.data)
        const next: CatalogText = {
          description: parsed.description.trim(),
          higher_levels: parsed.higher_levels.trim(),
          source_book: parsed.source_book.trim(),
        }
        if (!next.description && !next.higher_levels) {
          setCatalogStatus('missing')
          return
        }
        setCatalogText(next)
        setCatalogStatus('idle')
        enrichRef.current?.(spellSnapshot.id, {
          ...(next.description ? { description: next.description } : {}),
          ...(next.higher_levels ? { higher_levels: next.higher_levels } : {}),
          ...(next.source_book && !spellSnapshot.source_book
            ? { source_book: next.source_book }
            : {}),
          ...(spellSnapshot.catalog_id ? {} : { catalog_id: match.id }),
        })
      })
      .catch(() => {
        if (!cancelled) setCatalogStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [
    open,
    spell?.id,
    spell?.name,
    spell?.catalog_id,
    spell?.description,
    spell?.higher_levels,
    edition,
  ])

  if (!spell) return null

  const source = spellSourceBadge(spell)
  const grantLeft =
    spell.grant_cast && spell.grant_cast.max > 0 ? grantCastRemaining(spell) : null
  const school = spell.school ? spellSchoolLabelRu(spell.school) : ''
  const comps = spell.components ? formatSpellComponents(spell.components) : ''
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Уровень', value: levelLabel(spell.level) },
    { label: 'Время', value: spell.casting_time.trim() },
    { label: 'Дистанция', value: spell.range.trim() },
    { label: 'Длительность', value: (spell.duration ?? '').trim() },
    { label: 'Компоненты', value: comps },
    { label: 'Школа', value: school },
    { label: 'Атака / спас', value: spell.attack_or_save.trim() },
    { label: 'Урон / эффект', value: spell.damage.trim() },
    {
      label: 'Источник',
      value: (spell.source_book ?? catalogText?.source_book ?? '').trim(),
    },
  ].filter((row) => row.value && row.value !== '—')

  const flags = [
    spell.ritual ? 'ритуал' : '',
    spell.concentration ? 'концентрация' : '',
    source ? source.label : '',
  ].filter(Boolean)

  const description =
    spell.description?.trim() || catalogText?.description?.trim() || ''
  const higherLevels =
    spell.higher_levels?.trim() || catalogText?.higher_levels?.trim() || ''

  return (
    <Dialog
      open={open}
      title={spell.name || 'Заклинание'}
      size="wide"
      primaryLabel={onCast ? 'Каст' : 'Закрыть'}
      secondaryLabel={onCast ? 'Закрыть' : undefined}
      onPrimary={() => {
        if (onCast) onCast()
        else onClose()
      }}
      onSecondary={onCast ? onClose : undefined}
    >
      <Stack gap={12}>
        {flags.length > 0 ? (
          <Text tone="muted">{flags.join(' · ')}</Text>
        ) : null}
        {source ? (
          <Text tone="muted">
            Подготовлено за счёт: <strong title={source.title}>{source.label}</strong>
            {grantLeft != null
              ? ` · ${source.label} ${grantLeft}/${spell.grant_cast!.max} без ячейки`
              : ''}
          </Text>
        ) : null}

        <div className="spell-detail-grid">
          {rows.map((row) => (
            <div key={row.label} className="spell-detail-grid__cell">
              <Text tone="muted">{row.label}</Text>
              <div>{row.value}</div>
            </div>
          ))}
        </div>

        <div className="spell-detail-body">
          <Text tone="muted">Описание</Text>
          {description ? (
            <p className="spell-detail-body__text">{description}</p>
          ) : catalogStatus === 'loading' ? (
            <Text tone="muted">Загружаем текст из справочника…</Text>
          ) : catalogStatus === 'error' ? (
            <Text tone="muted">
              Не удалось загрузить описание. Проверь сеть или открой заклинание из справочника
              на полном листе.
            </Text>
          ) : (
            <Text tone="muted">
              Полного текста на листе пока нет — выбери заклинание из справочника (тогда
              описание сохранится) или допиши в заметках.
            </Text>
          )}
        </div>

        {higherLevels ? (
          <div className="spell-detail-body">
            <Text tone="muted">На больших уровнях</Text>
            <p className="spell-detail-body__text">{higherLevels}</p>
          </div>
        ) : null}

        {spell.notes?.trim() ? (
          <div>
            <Text tone="muted">Заметки</Text>
            <Text>{spell.notes.trim()}</Text>
          </div>
        ) : null}
      </Stack>
    </Dialog>
  )
}
