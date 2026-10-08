import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { GEAR_RARITY_LABEL_RU, type GearRarity } from '../../shared/dnd/gearCatalog'
import { Dialog, Field, NumberInput, Stack, Text } from '../../ui'
import {
  GEAR_ITEM_CATEGORY_LABEL_RU,
  GEAR_SOURCE_BOOK_LABEL_RU,
  gearSourceBookOf,
  groupGearByFamily,
  inventoryItemFromCatalog,
  summarizeGearEntry,
  type GearAddResult,
  type GearPickerItemCategoryFilter,
  type GearPickerKindFilter,
  type GearPickerSourceBookFilter,
} from './gearFromCatalog'

function RarityBadge({ rarity, label }: { rarity: GearRarity; label: string }) {
  return (
    <span className={`gear-rarity-badge gear-rarity-badge--${rarity}`}>{label}</span>
  )
}

type GearPickerDialogProps = {
  open: boolean
  edition: RulesEdition
  onConfirm: (result: GearAddResult) => void
  onClose: () => void
}

const KIND_TABS: Array<{ id: GearPickerKindFilter; label: string }> = [
  { id: 'all', label: 'Всё' },
  { id: 'weapon', label: 'Оружие' },
  { id: 'armor', label: 'Доспехи' },
  { id: 'item', label: 'Вещи' },
]

const ITEM_CATEGORY_FILTERS: Array<{
  id: GearPickerItemCategoryFilter
  label: string
}> = [
  { id: 'all', label: 'Все вещи' },
  { id: 'tool', label: GEAR_ITEM_CATEGORY_LABEL_RU.tool },
  { id: 'mount', label: GEAR_ITEM_CATEGORY_LABEL_RU.mount },
  { id: 'tack', label: GEAR_ITEM_CATEGORY_LABEL_RU.tack },
  { id: 'vehicle', label: GEAR_ITEM_CATEGORY_LABEL_RU.vehicle },
  { id: 'pack', label: GEAR_ITEM_CATEGORY_LABEL_RU.pack },
  { id: 'wondrous', label: GEAR_ITEM_CATEGORY_LABEL_RU.wondrous },
  { id: 'consumable', label: GEAR_ITEM_CATEGORY_LABEL_RU.consumable },
  { id: 'focus', label: GEAR_ITEM_CATEGORY_LABEL_RU.focus },
  { id: 'other', label: GEAR_ITEM_CATEGORY_LABEL_RU.other },
]

const SOURCE_BOOK_FILTERS: Array<{
  id: GearPickerSourceBookFilter
  label: string
}> = [
  { id: 'all', label: 'Все книги' },
  { id: 'PHB', label: GEAR_SOURCE_BOOK_LABEL_RU.PHB },
  { id: 'DMG', label: GEAR_SOURCE_BOOK_LABEL_RU.DMG },
  { id: 'XGE', label: GEAR_SOURCE_BOOK_LABEL_RU.XGE },
  { id: 'TCE', label: GEAR_SOURCE_BOOK_LABEL_RU.TCE },
  { id: 'EGW', label: GEAR_SOURCE_BOOK_LABEL_RU.EGW },
  { id: 'other', label: GEAR_SOURCE_BOOK_LABEL_RU.other },
]

const RARITY_FILTERS: Array<{ id: GearRarity | 'all'; label: string }> = [
  { id: 'all', label: 'Любая' },
  { id: 'mundane', label: GEAR_RARITY_LABEL_RU.mundane },
  { id: 'common', label: GEAR_RARITY_LABEL_RU.common },
  { id: 'uncommon', label: GEAR_RARITY_LABEL_RU.uncommon },
  { id: 'rare', label: GEAR_RARITY_LABEL_RU.rare },
  { id: 'very_rare', label: GEAR_RARITY_LABEL_RU.very_rare },
  { id: 'legendary', label: GEAR_RARITY_LABEL_RU.legendary },
  { id: 'artifact', label: GEAR_RARITY_LABEL_RU.artifact },
]

function matchesQuery(entry: CatalogEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    entry.name_ru.toLowerCase().includes(q) ||
    (entry.name_en ?? '').toLowerCase().includes(q) ||
    entry.slug.toLowerCase().includes(q)
  )
}

export function GearPickerDialog({
  open,
  edition,
  onConfirm,
  onClose,
}: GearPickerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [kind, setKind] = useState<GearPickerKindFilter>('all')
  const [itemCategory, setItemCategory] =
    useState<GearPickerItemCategoryFilter>('all')
  const [sourceBook, setSourceBook] = useState<GearPickerSourceBookFilter>('all')
  const [rarity, setRarity] = useState<GearRarity | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [equipArmor, setEquipArmor] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setKind('all')
    setItemCategory('all')
    setSourceBook('all')
    setRarity('all')
    setQuery('')
    setSelectedId(null)
    setExpandedFamily(null)
    setQty(1)
    setEquipArmor(true)
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      listCatalogEntries({ kind: 'weapon', edition }),
      listCatalogEntries({ kind: 'armor', edition }),
      listCatalogEntries({ kind: 'item', edition }),
    ])
      .then(([weapons, armor, items]) => {
        if (cancelled) return
        setEntries([...weapons, ...armor, ...items])
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([])
          setError('Не удалось загрузить справочник снаряжения')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, edition])

  const showItemCategoryFilters = kind === 'all' || kind === 'item'

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (!entry.is_active) return false
      if (kind !== 'all' && entry.kind !== kind) return false
      if (!matchesQuery(entry, query)) return false
      const summary = summarizeGearEntry(entry)
      if (!summary) return false
      if (summary.variant_key === 'varies') return false
      if (rarity !== 'all' && summary.rarity !== rarity) return false
      if (sourceBook !== 'all') {
        const book = gearSourceBookOf(entry)
        if (sourceBook === 'other') {
          if (['PHB', 'DMG', 'XGE', 'TCE', 'EGW'].includes(book)) return false
        } else if (book !== sourceBook) {
          return false
        }
      }
      if (itemCategory !== 'all') {
        if (entry.kind !== 'item') return false
        const cat = summary.item_category
        if (itemCategory === 'other') {
          if (
            cat === 'tool' ||
            cat === 'mount' ||
            cat === 'tack' ||
            cat === 'vehicle' ||
            cat === 'pack' ||
            cat === 'wondrous' ||
            cat === 'consumable' ||
            cat === 'focus'
          ) {
            return false
          }
        } else if (cat !== itemCategory) {
          return false
        }
      }
      return true
    })
  }, [entries, kind, itemCategory, query, rarity, sourceBook])

  const groups = useMemo(() => groupGearByFamily(filtered), [filtered])

  const selected = useMemo(
    () => entries.find((row) => row.id === selectedId) ?? null,
    [entries, selectedId],
  )
  const selectedSummary = selected ? summarizeGearEntry(selected) : null

  function pickEntry(entry: CatalogEntry) {
    setSelectedId(entry.id)
    setError(null)
  }

  function handleConfirm() {
    if (!selected) {
      setError('Выбери предмет из списка')
      return
    }
    const result = inventoryItemFromCatalog({
      entry: selected,
      qty,
      equipArmor,
    })
    if (!result) {
      setError('Не удалось добавить этот предмет')
      return
    }
    onConfirm(result)
  }

  return (
    <Dialog
      open={open}
      title="Справочник снаряжения"
      size="wide"
      primaryLabel="Добавить"
      secondaryLabel="Отмена"
      primaryDisabled={!selected || loading}
      onPrimary={handleConfirm}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Оружие, доспехи и вещи 2014. Семьи вариантов (зелья лечения, +1/+2/+3) — как на ТТГ:
          сначала семья, потом конкретный вариант. Оружие попадёт в «Атаки» убранным — «В руках»
          отдельно (двуручное занимает обе руки).
        </Text>

        <div className="chip-row">
          {KIND_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`sheet-chip${kind === tab.id ? ' is-on' : ''}`}
              onClick={() => {
                setKind(tab.id)
                if (tab.id !== 'all' && tab.id !== 'item') {
                  setItemCategory('all')
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showItemCategoryFilters ? (
          <div className="chip-row">
            {ITEM_CATEGORY_FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`sheet-chip${itemCategory === tab.id ? ' is-on' : ''}`}
                onClick={() => {
                  setItemCategory(tab.id)
                  if (tab.id !== 'all' && kind === 'all') setKind('item')
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <Field label="Поиск">
          <input
            className="ui-input"
            value={query}
            placeholder="Название, slug…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>

        <div className="chip-row">
          {SOURCE_BOOK_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`sheet-chip${sourceBook === tab.id ? ' is-on' : ''}`}
              onClick={() => setSourceBook(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="chip-row">
          {RARITY_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`sheet-chip${rarity === tab.id ? ' is-on' : ''}`}
              onClick={() => setRarity(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="gear-picker-list" role="listbox" aria-label="Снаряжение">
          {loading ? <Text tone="muted">Загружаю справочник…</Text> : null}
          {!loading && groups.length === 0 ? (
            <Text tone="muted">Ничего не найдено</Text>
          ) : null}
          {!loading
            ? groups.map((group) => {
                const multi = group.entries.length > 1
                const openFamily = expandedFamily === group.family_slug
                if (!multi) {
                  const entry = group.entries[0]
                  const summary = summarizeGearEntry(entry)
                  if (!summary) return null
                  const active = selectedId === entry.id
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`gear-picker-row${active ? ' is-selected' : ''}`}
                      onClick={() => pickEntry(entry)}
                    >
                      <span className="gear-picker-row__name">
                        {summary.name_ru}
                        <RarityBadge
                          rarity={summary.rarity}
                          label={summary.rarity_label}
                        />
                      </span>
                      <span className="gear-picker-row__meta">
                        {summary.meta_line}
                        {summary.requires_attunement ? ' · нужна настройка' : ''}
                      </span>
                    </button>
                  )
                }
                return (
                  <div key={group.family_slug} className="gear-picker-family">
                    <button
                      type="button"
                      className={`gear-picker-row gear-picker-row--family${
                        openFamily ? ' is-open' : ''
                      }`}
                      onClick={() =>
                        setExpandedFamily(openFamily ? null : group.family_slug)
                      }
                    >
                      <span className="gear-picker-row__name">
                        {group.family_label_ru}
                        <span className="gear-picker-row__badge">
                          {group.entries.length} вар.
                        </span>
                      </span>
                      <span className="gear-picker-row__meta">
                        {openFamily ? 'свернуть' : 'выбрать вариант'}
                      </span>
                    </button>
                    {openFamily
                      ? group.entries.map((entry) => {
                          const summary = summarizeGearEntry(entry)
                          if (!summary) return null
                          const active = selectedId === entry.id
                          const variant =
                            summary.variant_label_ru ||
                            summary.rarity_label ||
                            entry.name_ru
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              role="option"
                              aria-selected={active}
                              className={`gear-picker-row gear-picker-row--variant${
                                active ? ' is-selected' : ''
                              }`}
                              onClick={() => pickEntry(entry)}
                            >
                              <span className="gear-picker-row__name">
                                {variant}
                                <RarityBadge
                                  rarity={summary.rarity}
                                  label={summary.rarity_label}
                                />
                              </span>
                              <span className="gear-picker-row__meta">
                                {entry.name_ru}
                                {summary.meta_line ? ` · ${summary.meta_line}` : ''}
                              </span>
                            </button>
                          )
                        })
                      : null}
                  </div>
                )
              })
            : null}
        </div>

        {selectedSummary ? (
          <div className="gear-picker-selected">
            <Text>
              <strong>{selectedSummary.name_ru}</strong>
              {' · '}
              <RarityBadge
                rarity={selectedSummary.rarity}
                label={selectedSummary.rarity_label}
              />
              {selectedSummary.requires_attunement ? ' · нужна настройка' : ''}
            </Text>
            {selectedSummary.meta_line ? (
              <Text tone="muted">{selectedSummary.meta_line}</Text>
            ) : null}
            {selectedSummary.description_ru ? (
              <Text tone="muted" className="gear-picker-selected__desc">
                {selectedSummary.description_ru}
              </Text>
            ) : null}
          </div>
        ) : null}

        <div className="sheet-grid sheet-grid--2">
          <Field label="Количество">
            <NumberInput
              min={1}
              emptyValue={1}
              value={qty}
              onValueChange={(next) => setQty(Math.max(1, next ?? 1))}
            />
          </Field>
          {selected?.kind === 'armor' ? (
            <Field label="Надеть сразу">
              <button
                type="button"
                className={`sheet-chip${equipArmor ? ' is-on' : ''}`}
                onClick={() => setEquipArmor((prev) => !prev)}
              >
                {equipArmor ? 'Да, надеть' : 'В рюкзак'}
              </button>
            </Field>
          ) : (
            <div />
          )}
        </div>

        {error ? <Text tone="danger">{error}</Text> : null}
        <Text tone="muted">Найдено: {filtered.length}</Text>
      </Stack>
    </Dialog>
  )
}
