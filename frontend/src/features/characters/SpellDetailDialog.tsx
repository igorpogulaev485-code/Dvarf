import { useEffect, useMemo, useRef, useState } from 'react'
import {
  formatSpellComponents,
  parseSpellCatalogData,
  resolveCastEffectSummary,
  spellSchoolLabelRu,
} from '../../shared/dnd/spellCatalog'
import { displayDiceNotation } from '../../shared/dnd/diceNotation'
import { levelLabel } from '../../shared/dnd/spells'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { Dialog, Stack, Text } from '../../ui'
import { withBundledRules } from './alwaysPreparedSpellEnrichment'
import { improvedIllusionsRange2024 } from '../../shared/dnd/wizard2024Features'
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
  /** Same level/mod as cast — for scaled damage line. */
  characterLevel?: number
  spellMod?: number | null
  spellModLabel?: string | null
  elementalAffinity?: { damageType: string; amount: number } | null
  /** 2024 Illusionist (level 3+): Illusion spell range +60 ft. */
  improvedIllusions?: boolean
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

/** Singular «Заговор» in the detail card (group headers keep plural via levelLabel). */
function detailLevelLabel(level: number): string {
  if (level <= 0) return 'Заговор'
  return levelLabel(level)
}

function shortDamage(raw: string): string {
  const t = raw.trim()
  if (!t || t === '—') return ''
  return t.replace(/\s+/g, ' ')
}

/** Full read-only spell card: sheet fields + catalog/bundled description. */
export function SpellDetailDialog({
  open,
  spell,
  onClose,
  onCast,
  edition = '2014',
  onEnrichSpell,
  characterLevel = 1,
  spellMod = null,
  spellModLabel = null,
  elementalAffinity = null,
  improvedIllusions = false,
}: SpellDetailDialogProps) {
  const [catalogText, setCatalogText] = useState<CatalogText | null>(null)
  const [catalogStatus, setCatalogStatus] = useState<'idle' | 'loading' | 'missing' | 'error'>(
    'idle',
  )
  const enrichRef = useRef(onEnrichSpell)
  enrichRef.current = onEnrichSpell
  const bundledEnrichDone = useRef<Set<string>>(new Set())

  const rules = useMemo(() => (spell ? withBundledRules(spell) : null), [spell])

  useEffect(() => {
    if (!open || !spell || !rules) {
      setCatalogText(null)
      setCatalogStatus('idle')
      return
    }
    const hasLocal =
      Boolean(rules.description?.trim()) || Boolean(rules.higher_levels?.trim())
    if (hasLocal) {
      setCatalogText(null)
      setCatalogStatus('idle')
      /* Persist bundled text onto the sheet when the row was empty (once per id). */
      if (
        !spell.description?.trim() &&
        rules.description?.trim() &&
        !bundledEnrichDone.current.has(spell.id)
      ) {
        bundledEnrichDone.current.add(spell.id)
        enrichRef.current?.(spell.id, {
          description: rules.description,
          ...(rules.higher_levels && !spell.higher_levels
            ? { higher_levels: rules.higher_levels }
            : {}),
          ...(rules.range && rules.range !== spell.range ? { range: rules.range } : {}),
          ...(rules.damage_at_character_level && !spell.damage_at_character_level
            ? { damage_at_character_level: rules.damage_at_character_level }
            : {}),
          ...(rules.source_book && !spell.source_book
            ? { source_book: rules.source_book }
            : {}),
        })
      }
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
    rules?.description,
    rules?.higher_levels,
    edition,
  ])

  if (!spell || !rules) return null

  const source = spellSourceBadge(rules)
  const grantLeft =
    rules.grant_cast && rules.grant_cast.max > 0 ? grantCastRemaining(rules) : null
  const school = rules.school ? spellSchoolLabelRu(rules.school) : ''
  const comps = rules.components ? formatSpellComponents(rules.components) : ''

  const level = Math.max(1, Math.floor(characterLevel) || 1)
  const slotLevel = Math.max(rules.level, 1)
  const castSummary = resolveCastEffectSummary(rules, {
    characterLevel: level,
    slotLevel,
    spellMod,
    spellModLabel,
    affinity: elementalAffinity,
  })
  const damageLine =
    shortDamage(castSummary.effect) || shortDamage(rules.damage ?? '') || ''

  const improvedRange = improvedIllusions
    ? improvedIllusionsRange2024(rules, { improvedIllusions: true })
    : null
  const rangeValue = improvedRange ?? (rules.range || '').trim()

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Уровень', value: detailLevelLabel(rules.level) },
    { label: 'Время', value: (rules.casting_time || '').trim() },
    { label: 'Дистанция', value: rangeValue },
    { label: 'Длительность', value: (rules.duration ?? '').trim() },
    { label: 'Компоненты', value: comps },
    { label: 'Школа', value: school },
    { label: 'Атака / спас', value: (rules.attack_or_save || '').trim() },
    { label: 'Урон / эффект', value: damageLine },
    {
      label: 'Источник',
      value: (rules.source_book ?? catalogText?.source_book ?? '').trim(),
    },
  ].filter((row) => row.value && row.value !== '—')

  const flags = [
    rules.ritual ? 'ритуал' : '',
    rules.concentration ? 'концентрация' : '',
    source ? source.label : '',
  ].filter(Boolean)

  const description =
    rules.description?.trim() || catalogText?.description?.trim() || ''
  const higherLevels =
    rules.higher_levels?.trim() || catalogText?.higher_levels?.trim() || ''

  return (
    <Dialog
      open={open}
      title={rules.name || 'Заклинание'}
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
              ? ` · ${source.label} ${grantLeft}/${rules.grant_cast!.max} без ячейки`
              : ''}
          </Text>
        ) : null}

        <div className="spell-detail-grid">
          {rows.map((row) => (
            <div key={row.label} className="spell-detail-grid__cell">
              <Text tone="muted">{row.label}</Text>
              <div>{displayDiceNotation(row.value)}</div>
            </div>
          ))}
        </div>

        <div className="spell-detail-body">
          <Text tone="muted">Описание</Text>
          {description ? (
            <p className="spell-detail-body__text">{displayDiceNotation(description)}</p>
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
            <p className="spell-detail-body__text">{displayDiceNotation(higherLevels)}</p>
          </div>
        ) : null}

        {rules.notes?.trim() ? (
          <div>
            <Text tone="muted">Заметки</Text>
            <Text>{rules.notes.trim()}</Text>
          </div>
        ) : null}
      </Stack>
    </Dialog>
  )
}
