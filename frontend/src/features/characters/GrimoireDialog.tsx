import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  characterSpellListSlugs,
  highestSpellSlotLevel,
  resolveSpellLearnBudget,
  suggestSpellcastingFromClasses,
  thirdCasterSchoolGate,
  type SpellLearnBudget,
  type SubclassCasterOverlay,
} from '../../shared/dnd/casterProgression'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { parseSpellCatalogData } from '../../shared/dnd/spellCatalog'
import { levelLabel } from '../../shared/dnd/spells'
import {
  formatGpTotal,
  type CoinPurse,
} from '../../shared/dnd/weight'
import { spellAccessUiCopy } from '../../shared/dnd/spellAccessUi'
import {
  previewSpellbookAddGp,
  remainingFreeSpellbookSlots,
  resolveSpellbookAddPayment,
} from '../../shared/dnd/wizardSpellbook'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import {
  syncWizardSpellbookWithInventory,
  wizardHasUsableSpellbook,
  wizardSpellbookStatusLabel,
} from './wizardSpellbookInventory'
import { SpellCatalogDetails } from './SpellCatalogDetails'
import type { InventoryItem } from './inventory'
import {
  addCatalogSpellToKnown,
  canRemoveSheetSpell,
  countLearnedCantrips,
  countLearnedLeveled,
  countPreparedLeveled,
  groupSpellsByLevel,
  knownHasCatalogId,
  setSpellPrepared,
  type SheetSpell,
  type SpellsState,
} from './spells'

const CLASS_LABELS: Record<string, string> = {
  bard: 'Бард',
  cleric: 'Жрец',
  druid: 'Друид',
  paladin: 'Паладин',
  ranger: 'Следопыт',
  sorcerer: 'Чародей',
  warlock: 'Колдун',
  wizard: 'Волшебник',
  artificer: 'Изобретатель',
}

type GrimoireDialogProps = {
  open: boolean
  edition: RulesEdition
  spells: SpellsState
  /** Known casters: one «Добавить» that also marks ready; no prepare step. */
  knownCaster?: boolean
  /** Override learn budget (create pipeline passes fresh compute). */
  learnBudget?: SpellLearnBudget | null
  abilityModFor?: (ability: 'int' | 'wis' | 'cha') => number
  /** Character classes — restrict list to their spell lists + slot level. */
  classes?: ClassLevelEntry[]
  subclassCasters?: SubclassCasterOverlay[]
  /** Character purse — required to auto-debit paid spellbook copies. */
  coins?: CoinPurse | null
  /** Persist purse after a successful paid copy. */
  onCoinsChange?: (coins: CoinPurse) => void
  /** Inventory — bind/detect physical spellbook for wizard mode. */
  inventoryItems?: InventoryItem[]
  onChange: (spells: SpellsState) => void
  onClose: () => void
  onToast?: (message: string) => void
}

function entryLevel(entry: CatalogEntry): number {
  return parseSpellCatalogData(entry.data).level
}

const SPELL_CATALOG_TIMEOUT_MS = 8_000

let bundledSpells2014: Promise<CatalogEntry[]> | null = null

/** Official 2014 list shipped with the app. Used when /catalog?kind=spell fails. */
function loadBundledSpells2014(): Promise<CatalogEntry[]> {
  if (!bundledSpells2014) {
    bundledSpells2014 = fetch('/spells-2014.json')
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || ''
        if (!response.ok || contentType.includes('text/html')) {
          throw new Error('bundled spells missing')
        }
        const data = (await response.json()) as unknown
        if (!Array.isArray(data)) throw new Error('bundled spells shape')
        return data as CatalogEntry[]
      })
      .catch((err: unknown) => {
        bundledSpells2014 = null
        throw err
      })
  }
  return bundledSpells2014
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

export function GrimoireDialog({
  open,
  edition,
  spells,
  knownCaster = false,
  learnBudget: learnBudgetProp = null,
  abilityModFor,
  classes = [],
  subclassCasters = [],
  coins = null,
  onCoinsChange,
  inventoryItems = [],
  onChange,
  onClose,
  onToast,
}: GrimoireDialogProps) {
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState<'all' | number>('all')
  const [bookFilter, setBookFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const access = useMemo(() => {
    const activeClasses = classes.filter((row) => row.name.trim() && row.level > 0)
    const classSlugs = characterSpellListSlugs(activeClasses, subclassCasters)
    const modFor = abilityModFor ?? (() => 0)
    const suggestion =
      activeClasses.length > 0
        ? suggestSpellcastingFromClasses({
            classes: activeClasses,
            subclassCasters,
            abilityModFor: modFor,
          })
        : null
    const budget =
      learnBudgetProp ??
      (activeClasses.length > 0
        ? resolveSpellLearnBudget({
            classes: activeClasses,
            subclassCasters,
            abilityModFor: modFor,
          })
        : null)
    // Access circle from character rules — sheet slots must not open higher circles.
    const maxSpellLevel = suggestion
      ? highestSpellSlotLevel(suggestion.slots, suggestion.pact_slots)
      : 0
    const schoolGate = thirdCasterSchoolGate(activeClasses, subclassCasters)
    return {
      classSlugs,
      maxSpellLevel,
      schoolGate,
      hasCaster: classSlugs.length > 0,
      budget,
      suggestion,
    }
  }, [classes, subclassCasters, learnBudgetProp, abilityModFor])

  const mode = access.budget?.mode ?? (knownCaster ? 'known' : 'prepared_list')
  const maxPrepared = access.budget?.maxPrepared ?? spells.max_prepared
  const learnedCantrips = countLearnedCantrips(spells.known)
  const learnedLeveled = countLearnedLeveled(spells.known)
  const preparedCount = countPreparedLeveled(spells.known)
  const wizardLevel = useMemo(() => {
    const row = classes.find((item) => {
      const name = item.name.trim().toLowerCase()
      return name === 'волшебник' || name === 'wizard' || name === 'маг'
    })
    if (row) return Math.max(1, Math.floor(row.level) || 1)
    if (access.budget?.slug === 'wizard') {
      const leveled = classes.find((item) => item.level > 0)
      return Math.max(1, Math.floor(leveled?.level ?? 1) || 1)
    }
    return 1
  }, [classes, access.budget?.slug])
  const freeBookLeft =
    mode === 'spellbook' ? remainingFreeSpellbookSlots(spells.known, wizardLevel) : 0
  const uiCopy = spellAccessUiCopy(mode)
  const unpreparedOnSheet = spells.known.filter((s) => s.level > 0 && !s.prepared).length

  // Slice 2: keep physical book binding fresh when dialog opens.
  useEffect(() => {
    if (!open || mode !== 'spellbook') return
    const synced = syncWizardSpellbookWithInventory({
      isWizard: true,
      spells,
      items: inventoryItems,
    })
    if (synced.changed) {
      onChange(synced.spells)
      if (synced.message) onToast?.(synced.message)
    }
    // Only on open / inventory id set — avoid loops on every spells change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, inventoryItems.map((item) => item.id).join('|')])

  const bookStatus = mode === 'spellbook' ? wizardSpellbookStatusLabel(spells) : null
  const canWriteToBook =
    mode !== 'spellbook' || wizardHasUsableSpellbook(spells)

  const classFilters = useMemo(() => {
    if (!access.hasCaster) return []
    const chips = access.classSlugs.map((id) => ({
      id,
      label: CLASS_LABELS[id] ?? id,
    }))
    if (chips.length > 1) {
      return [{ id: 'all', label: 'Мои классы' }, ...chips]
    }
    return chips
  }, [access.classSlugs, access.hasCaster])

  useEffect(() => {
    if (!open) return
    // Default filter to the character's lists (not the full catalog).
    if (access.classSlugs.length === 1) {
      setClassFilter(access.classSlugs[0]!)
    } else {
      setClassFilter('all')
    }
  }, [open, access.classSlugs.join('|')])

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError(null)

    const apply = (items: CatalogEntry[]) => {
      if (!active) return
      if (!Array.isArray(items) || items.length === 0) {
        setEntries([])
        setError('Не удалось загрузить гримуар')
        return
      }
      setEntries(items)
      setError(null)
    }

    withTimeout(listCatalogEntries({ kind: 'spell', edition }), SPELL_CATALOG_TIMEOUT_MS)
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) return items
        if (edition !== '2014') return []
        return loadBundledSpells2014()
      })
      .catch(() => (edition === '2014' ? loadBundledSpells2014() : []))
      .then((items) => {
        apply(items)
      })
      .catch(() => {
        apply([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, edition])

  const bookOptions = useMemo(() => {
    const books = new Set<string>()
    for (const entry of entries) {
      const book = parseSpellCatalogData(entry.data).source_book?.trim()
      if (book) books.add(book)
    }
    const preferred = ['PHB', 'XGE', 'TCE', 'EEPC', 'EGW', 'FTD', 'SCC', 'AI']
    const rest = [...books].filter((b) => !preferred.includes(b)).sort()
    return ['all', ...preferred.filter((b) => books.has(b)), ...rest]
  }, [entries])

  const available = useMemo(() => {
    if (!access.hasCaster) return []
    const slugSet = new Set(access.classSlugs)
    const schoolSet = access.schoolGate
      ? new Set(access.schoolGate.map((s) => s.toLowerCase()))
      : null
    return entries.filter((entry) => {
      const parsed = parseSpellCatalogData(entry.data)
      const onList = parsed.classes.some((slug) => slugSet.has(slug))
      if (!onList) return false
      // Cantrips (0) always if on a known list; leveled need a slot of that level.
      if (parsed.level > 0 && parsed.level > access.maxSpellLevel) return false
      if (schoolSet && parsed.level > 0) {
        const school = (parsed.school || '').toLowerCase()
        if (!schoolSet.has(school)) return false
      }
      return true
    })
  }, [entries, access])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return available.filter((entry) => {
      const parsed = parseSpellCatalogData(entry.data)
      if (levelFilter !== 'all' && parsed.level !== levelFilter) return false
      if (classFilter !== 'all' && !parsed.classes.includes(classFilter)) return false
      if (bookFilter !== 'all' && parsed.source_book !== bookFilter) return false
      if (!q) return true
      const hay = `${entry.name_ru} ${entry.name_en ?? ''} ${entry.slug} ${parsed.source_book}`.toLowerCase()
      return hay.includes(q)
    })
  }, [available, query, classFilter, levelFilter, bookFilter])

  const groups = useMemo(() => {
    const asSpells = filtered.map((entry) => {
      const parsed = parseSpellCatalogData(entry.data)
      return {
        id: entry.id,
        name: entry.name_ru,
        catalog_id: entry.id,
        level: parsed.level,
        prepared: false,
        notes: '',
        casting_time: parsed.casting_time_label,
        range: parsed.range,
        attack_or_save: parsed.attack_or_save,
        damage: parsed.damage,
        concentration: parsed.concentration,
        ritual: parsed.ritual,
        duration: parsed.duration,
        school: parsed.school,
        source_book: parsed.source_book,
      }
    })
    return groupSpellsByLevel(asSpells)
  }, [filtered])

  const levelOptions = useMemo(() => {
    const levels = new Set(available.map(entryLevel))
    return [...levels].sort((a, b) => a - b)
  }, [available])

  function cantripCapReached(): boolean {
    const cap = access.budget?.cantrips
    if (cap == null) return false
    return learnedCantrips >= cap
  }

  function leveledLearnCapReached(): boolean {
    const cap = access.budget?.leveledKnown
    if (cap == null) return false
    if (mode === 'spellbook') {
      // Soft free budget: paid copies may exceed. Block only when no free
      // slots left AND we cannot attempt a paid copy (no purse wiring).
      if (freeBookLeft > 0) return false
      if (onCoinsChange) return false
      return learnedLeveled >= cap
    }
    return learnedLeveled >= cap
  }

  function spellbookCopyGp(entry: CatalogEntry): number {
    if (mode !== 'spellbook') return 0
    const parsed = parseSpellCatalogData(entry.data)
    if (parsed.level <= 0) return 0
    return previewSpellbookAddGp({
      spellLevel: parsed.level,
      spellSchool: parsed.school,
      known: spells.known,
      wizardLevel,
    })
  }

  function prepareCapReached(): boolean {
    if (maxPrepared == null) return false
    return preparedCount >= maxPrepared
  }

  function addSpell(entry: CatalogEntry, prepare: boolean) {
    if (knownHasCatalogId(spells.known, entry.id)) {
      onToast?.('Уже есть в списке')
      return
    }
    const parsed = parseSpellCatalogData(entry.data)
    const level = parsed.level
    if (!access.hasCaster) {
      onToast?.('Нет класса с заклинаниями')
      return
    }
    const onList = parsed.classes.some((slug) => access.classSlugs.includes(slug))
    if (!onList) {
      onToast?.('Нет в списке заклинаний твоих классов')
      return
    }
    if (level > 0 && level > access.maxSpellLevel) {
      onToast?.(
        access.maxSpellLevel > 0
          ? `Доступен круг до ${access.maxSpellLevel}`
          : 'Пока доступны только заговоры',
      )
      return
    }
    if (access.schoolGate && level > 0) {
      const school = (parsed.school || '').toLowerCase()
      if (!access.schoolGate.map((s) => s.toLowerCase()).includes(school)) {
        onToast?.('Школа недоступна для этого кастера')
        return
      }
    }
    if (level <= 0 && cantripCapReached()) {
      onToast?.(
        `Лимит заговоров: ${learnedCantrips}/${access.budget?.cantrips ?? '—'}`,
      )
      return
    }
    if (level > 0) {
      if (mode === 'prepared_list') {
        // Full-list casters: may park on sheet without preparing, or prepare now.
        if (prepare && prepareCapReached()) {
          onToast?.(
            `Лимит подготовки: ${preparedCount}/${maxPrepared ?? '—'}`,
          )
          return
        }
      } else if (mode !== 'spellbook' && leveledLearnCapReached()) {
        onToast?.(
          `Лимит известных: ${learnedLeveled}/${access.budget?.leveledKnown ?? '—'}`,
        )
        return
      } else if (prepare && prepareCapReached()) {
        onToast?.(
          `Лимит подготовки: ${preparedCount}/${maxPrepared ?? '—'}`,
        )
        return
      }
    }

    if (mode === 'spellbook' && level > 0) {
      if (!canWriteToBook) {
        onToast?.(
          spells.wizard_spellbook?.bookLost
            ? 'Книга заклинаний утеряна — нельзя вносить новые заклинания'
            : 'Нужна книга заклинаний в инвентаре (привяжи предмет или возьми стартовую)',
        )
        return
      }
      const payment = resolveSpellbookAddPayment({
        spellLevel: level,
        spellSchool: parsed.school,
        known: spells.known,
        wizardLevel,
        coins: coins ?? null,
      })
      if (!payment.ok) {
        onToast?.(payment.message)
        return
      }
      if (!payment.free) {
        if (!onCoinsChange) {
          onToast?.(
            payment.cost
              ? `Нужно ${formatGpTotal(payment.cost.gp)} зм в кошельке (бесплатный объём книги исчерпан)`
              : 'Нужен кошелёк персонажа для платной копии',
          )
          return
        }
        onCoinsChange(payment.coins)
      }
      const nextKnown = addCatalogSpellToKnown(spells.known, entry, {
        prepare,
        maxPrepared,
        spellbook_acquisition: payment.acquisition,
        in_spellbook: true,
      })
      onChange({
        ...spells,
        known: nextKnown,
        max_prepared: maxPrepared ?? spells.max_prepared,
      })
      const prepSuffix = prepare ? ' и подготовлено' : ''
      onToast?.(
        payment.free
          ? `В книгу${prepSuffix}: ${entry.name_ru} · ${payment.message}`
          : `В книгу${prepSuffix}: ${entry.name_ru} · ${payment.message}`,
      )
      return
    }

    const nextKnown = addCatalogSpellToKnown(spells.known, entry, {
      prepare: mode === 'known' ? true : prepare,
      maxPrepared,
    })
    onChange({
      ...spells,
      known: nextKnown,
      max_prepared: maxPrepared ?? spells.max_prepared,
    })
    if (level <= 0) {
      onToast?.(`Заговор: ${entry.name_ru}`)
      return
    }
    if (mode === 'known') {
      onToast?.(`Известно: ${entry.name_ru}`)
      return
    }
    if (mode === 'prepared_list') {
      onToast?.(
        prepare
          ? `На лист и подготовлено: ${entry.name_ru}`
          : `На лист (доступно к подготовке): ${entry.name_ru}`,
      )
      return
    }
    onToast?.(
      prepare ? `Подготовлено: ${entry.name_ru}` : `Добавлено: ${entry.name_ru}`,
    )
  }

  function togglePrepareOnSheet(entry: CatalogEntry) {
    const existing = spells.known.find((row) => row.catalog_id === entry.id)
    if (!existing || existing.level <= 0) return
    const nextPrepared = !existing.prepared
    if (nextPrepared && prepareCapReached()) {
      onToast?.(`Лимит подготовки: ${preparedCount}/${maxPrepared ?? '—'}`)
      return
    }
    onChange({
      ...spells,
      known: setSpellPrepared(spells.known, existing.id, nextPrepared, maxPrepared),
      max_prepared: maxPrepared ?? spells.max_prepared,
    })
  }

  function knownSpellForCatalog(catalogId: string): SheetSpell | undefined {
    return spells.known.find((spell) => spell.catalog_id === catalogId)
  }

  function removeSpell(entry: CatalogEntry) {
    const onSheet = knownSpellForCatalog(entry.id)
    if (!onSheet) return
    if (!canRemoveSheetSpell(onSheet)) {
      onToast?.('Это заклинание нельзя снять с листа')
      return
    }
    onChange({
      ...spells,
      known: spells.known.filter((spell) => spell.id !== onSheet.id),
    })
    onToast?.(`Снято с листа: ${entry.name_ru}`)
  }

  const accessHint = !access.hasCaster
    ? 'Нет класса с заклинаниями — гримуар пуст.'
    : access.maxSpellLevel > 0
      ? `Список классов · до ${access.maxSpellLevel} круга.`
      : 'Пока только заговоры из списка класса (ячеек ещё нет).'

  const budgetHint = (() => {
    if (!access.budget) return `${uiCopy.grimoireHint} ${accessHint}`
    const b = access.budget
    const cantripPart = `заговоры ${learnedCantrips}/${b.cantrips}`
    if (b.mode === 'spellbook') {
      const freePart =
        freeBookLeft > 0
          ? `бесплатно ещё ${freeBookLeft}`
          : onCoinsChange
            ? 'далее — копия за золото из кошелька'
            : 'бесплатный объём исчерпан'
      return `${b.labelRu}: в книге ${learnedLeveled} · ${freePart} (free-cap ${b.leveledKnown ?? '—'}) · ${cantripPart} · ${uiCopy.readyLabel.toLowerCase()} ${preparedCount}/${b.maxPrepared ?? '—'}. ${uiCopy.grimoireHint} ${accessHint}`
    }
    if (b.mode === 'prepared_list') {
      return `${b.labelRu}: на листе ${learnedLeveled} · не подготовлено ${unpreparedOnSheet} · ${cantripPart} · ${uiCopy.readyLabel.toLowerCase()} ${preparedCount}/${b.maxPrepared ?? '—'}. ${uiCopy.grimoireHint} ${accessHint}`
    }
    return `${b.labelRu}: известные ${learnedLeveled}/${b.leveledKnown ?? '—'} · ${cantripPart}. ${uiCopy.grimoireHint} ${accessHint}`
  })()

  const dialogTitle = uiCopy.grimoireTitle

  return (
    <Dialog
      open={open}
      title={dialogTitle}
      size="wide"
      primaryLabel="Готово"
      onPrimary={onClose}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">{budgetHint}</Text>
        {bookStatus ? (
          <div className="chip-row">
            <span
              className={`sheet-chip${bookStatus.ok ? ' is-on' : ''}`}
              title="Физическая книга в инвентаре (срез 2)"
            >
              {bookStatus.label}
            </span>
            {!canWriteToBook ? (
              <Text tone="muted">
                Без книги нельзя вносить заклинания. Добавь «Книга заклинаний» в инвентарь.
              </Text>
            ) : null}
          </div>
        ) : null}

        <Field label="Поиск">
          <Input
            value={query}
            placeholder="Название или книга…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>

        {classFilters.length > 0 ? (
          <div className="chip-row">
            {classFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sheet-chip${classFilter === item.id ? ' is-on' : ''}`}
                onClick={() => setClassFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="chip-row">
          {bookOptions.map((book) => (
            <button
              key={book}
              type="button"
              className={`sheet-chip${bookFilter === book ? ' is-on' : ''}`}
              onClick={() => setBookFilter(book)}
            >
              {book === 'all' ? 'Все книги' : book}
            </button>
          ))}
        </div>

        <div className="chip-row">
          <button
            type="button"
            className={`sheet-chip${levelFilter === 'all' ? ' is-on' : ''}`}
            onClick={() => setLevelFilter('all')}
          >
            Все ур.
          </button>
          {levelOptions.map((level) => (
            <button
              key={level}
              type="button"
              className={`sheet-chip${levelFilter === level ? ' is-on' : ''}`}
              onClick={() => setLevelFilter(level)}
            >
              {level === 0 ? '0' : String(level)}
            </button>
          ))}
        </div>

        <Text tone="muted">
          {loading
            ? 'Загружаем…'
            : `Найдено: ${filtered.length} / ${available.length} доступных`}
        </Text>
        {error ? <Text tone="danger">{error}</Text> : null}

        {!access.hasCaster && !loading ? (
          <Text tone="muted">Возьми класс с заклинаниями (или архетип вроде Мистического рыцаря).</Text>
        ) : null}

        {groups.length === 0 && !loading && access.hasCaster ? (
          <Text tone="muted">Ничего не найдено.</Text>
        ) : (
          groups.map((group) => (
            <div key={group.level} className="prepare-section">
              <strong>
                {levelLabel(group.level)} ({group.spells.length})
              </strong>
              <ul className="prepare-list">
                {group.spells.map((spell) => {
                  const entry = entries.find((item) => item.id === spell.catalog_id)
                  if (!entry) return null
                  const onSheet = knownHasCatalogId(spells.known, entry.id)
                  const parsed = parseSpellCatalogData(entry.data)
                  const expanded = expandedId === entry.id
                  return (
                    <li key={entry.id} className="prepare-row prepare-row--spell">
                      <div className="prepare-row__main">
                        <div>
                          {entry.name_ru}
                          {entry.name_en ? (
                            <span className="prepare-row__meta"> [{entry.name_en}]</span>
                          ) : null}
                          {parsed.concentration ? (
                            <span className="prepare-row__badge">К</span>
                          ) : null}
                          {parsed.ritual ? (
                            <span className="prepare-row__badge">Ритуал</span>
                          ) : null}
                          {parsed.source_book ? (
                            <span className="prepare-row__meta"> · {parsed.source_book}</span>
                          ) : null}
                        </div>
                        <Text tone="muted">
                          {[
                            parsed.casting_time_label,
                            parsed.range,
                            parsed.duration,
                            parsed.components_label,
                            parsed.attack_or_save,
                            parsed.damage,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </Text>
                        <button
                          type="button"
                          className="spell-catalog-details__toggle"
                          onClick={() =>
                            setExpandedId((current) => (current === entry.id ? null : entry.id))
                          }
                        >
                          {expanded ? 'Свернуть' : 'Подробнее'}
                        </button>
                        {expanded ? <SpellCatalogDetails data={entry.data} /> : null}
                      </div>
                      <div className="grimoire-row__actions">
                        {onSheet ? (
                          (() => {
                            const sheetSpell = knownSpellForCatalog(entry.id)
                            const prepared = Boolean(sheetSpell?.prepared)
                            const canRemove = sheetSpell ? canRemoveSheetSpell(sheetSpell) : false
                            const needsPrepareToggle =
                              spell.level > 0 &&
                              (mode === 'prepared_list' || mode === 'spellbook')
                            return (
                              <>
                                {needsPrepareToggle ? (
                                  <button
                                    type="button"
                                    className={`sheet-chip${prepared ? ' is-on' : ''}`}
                                    onClick={() => togglePrepareOnSheet(entry)}
                                    title={
                                      prepared
                                        ? 'Снять с сегодняшнего набора (останется в пуле)'
                                        : 'Добавить в сегодняшний набор'
                                    }
                                  >
                                    {prepared ? 'Подготовлено' : 'Подготовить'}
                                  </button>
                                ) : (
                                  <span className="sheet-chip is-on">
                                    {mode === 'spellbook'
                                      ? 'В книге'
                                      : mode === 'known'
                                        ? 'Известно'
                                        : 'На листе'}
                                  </span>
                                )}
                                {canRemove ? (
                                  <button
                                    type="button"
                                    className="sheet-chip"
                                    onClick={() => removeSpell(entry)}
                                    title={
                                      mode === 'spellbook'
                                        ? 'Убрать из книги'
                                        : 'Убрать с листа'
                                    }
                                  >
                                    Снять
                                  </button>
                                ) : null}
                              </>
                            )
                          })()
                        ) : mode === 'known' || spell.level <= 0 ? (
                          <button
                            type="button"
                            className="sheet-chip"
                            disabled={
                              spell.level <= 0
                                ? cantripCapReached()
                                : leveledLearnCapReached()
                            }
                            onClick={() => addSpell(entry, true)}
                          >
                            {spell.level <= 0
                              ? cantripCapReached()
                                ? 'Лимит заговоров'
                                : 'Взять заговор'
                              : leveledLearnCapReached()
                                ? 'Лимит'
                                : 'Добавить'}
                          </button>
                        ) : mode === 'spellbook' ? (
                          <>
                            <button
                              type="button"
                              className="sheet-chip"
                              disabled={leveledLearnCapReached() || !canWriteToBook}
                              onClick={() => addSpell(entry, false)}
                              title={
                                !canWriteToBook
                                  ? 'Нужна книга заклинаний в инвентаре'
                                  : spellbookCopyGp(entry) > 0
                                    ? `Платная копия: ${formatGpTotal(spellbookCopyGp(entry))} зм (PHB)`
                                    : freeBookLeft > 0
                                      ? `Бесплатно · осталось слотов исследования: ${freeBookLeft}`
                                      : undefined
                              }
                            >
                              {!canWriteToBook
                                ? 'Нет книги'
                                : leveledLearnCapReached()
                                  ? 'Книга полна'
                                  : spellbookCopyGp(entry) > 0
                                    ? `В книгу · ${formatGpTotal(spellbookCopyGp(entry))} зм`
                                    : 'В книгу'}
                            </button>
                            <button
                              type="button"
                              className="sheet-chip"
                              disabled={
                                leveledLearnCapReached() ||
                                prepareCapReached() ||
                                !canWriteToBook
                              }
                              onClick={() => addSpell(entry, true)}
                              title={
                                !canWriteToBook
                                  ? 'Нужна книга заклинаний в инвентаре'
                                  : spellbookCopyGp(entry) > 0
                                    ? `Платная копия: ${formatGpTotal(spellbookCopyGp(entry))} зм + подготовка`
                                    : undefined
                              }
                            >
                              {spellbookCopyGp(entry) > 0
                                ? `В книгу + подг. · ${formatGpTotal(spellbookCopyGp(entry))} зм`
                                : 'В книгу + подготовить'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="sheet-chip"
                              onClick={() => addSpell(entry, false)}
                              title="На лист без подготовки — появится во «Все доступные»"
                            >
                              На лист
                            </button>
                            <button
                              type="button"
                              className="sheet-chip"
                              disabled={prepareCapReached()}
                              onClick={() => addSpell(entry, true)}
                              title="На лист и сразу в сегодняшний набор"
                            >
                              {prepareCapReached() ? 'Лимит подготовки' : 'Подготовить'}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </Stack>
    </Dialog>
  )
}
