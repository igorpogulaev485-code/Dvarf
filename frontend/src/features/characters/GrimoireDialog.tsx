import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  buildCastProfiles,
  buildGrimoireShelfSources,
  catalogSpellMatchesAnyShelf,
  catalogSpellMatchesShelf,
  describeGrimoireShelves,
  formatNamedCantripBudgets,
  resolveSpellAcquisitionSlug,
  resolveSpellLearnBudgets,
  totalCantripsBudget,
  type GrimoireShelfSource,
} from '../../shared/dnd/castProfiles'
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
import {
  catalogEntryClasses,
  catalogEntryLevel,
} from '../../shared/dnd/prepareAvailability'
import { parseSpellCatalogData } from '../../shared/dnd/spellCatalog'
import { levelLabel } from '../../shared/dnd/spells'
import {
  formatGpTotal,
  type CoinPurse,
} from '../../shared/dnd/weight'
import {
  spellAccessUiCopy,
  type SpellAccessContext,
} from '../../shared/dnd/spellAccessUi'
import {
  previewSpellbookAddGp,
  remainingFreeSpellbookSlots,
  resolveSpellbookAddPayment,
  resolveWizardCopyMods,
} from '../../shared/dnd/wizardSpellbook'
import { resolveSubclassFeatureSlug } from '../../shared/dnd/classFeatures'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import {
  syncWizardSpellbookWithInventory,
  wizardHasUsableSpellbook,
  wizardSpellbookStatusLabel,
} from './wizardSpellbookInventory'
import { CustomSpellDialog } from './CustomSpellDialog'
import { SpellCatalogDetails } from './SpellCatalogDetails'
import type { InventoryItem } from './inventory'
import {
  addCatalogSpellToKnown,
  addCustomSpellToKnown,
  canRemoveSheetSpell,
  countLearnedCantrips,
  countLearnedCantripsBySlug,
  countLearnedCantripsForSlug,
  countLearnedLeveled,
  countLearnedLeveledForSlug,
  countLockedFeatureCantrips,
  countPreparedLeveled,
  groupSpellsByLevel,
  isCustomSheetSpell,
  knownHasCatalogIdForSlug,
  otherClassBindingsForCatalog,
  setSpellPrepared,
  spellSourceBadge,
  updateCustomSheetSpell,
  type CustomSheetSpellInput,
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
  /** Prefocus class chip (create per-class accordion). */
  initialClassFilter?: string | null
  /** M4 §2.5 verbs: create / level-up / sheet. */
  accessContext?: SpellAccessContext
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
  initialClassFilter = null,
  accessContext = 'sheet',
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
  /** Status chips: replace the old Prepare «Все доступные / Подготовленные» split. */
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'prepared' | 'unprepared' | 'in_book'
  >('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null)

  const customOnSheet = useMemo(
    () => spells.known.filter((spell) => isCustomSheetSpell(spell)),
    [spells.known],
  )
  const editingCustom =
    editingCustomId == null
      ? null
      : (customOnSheet.find((spell) => spell.id === editingCustomId) ?? null)

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
    const profiles =
      activeClasses.length > 0
        ? buildCastProfiles({
            classes: activeClasses,
            subclassCasters,
            abilityModFor: modFor,
            proficiencyBonus: 0,
          })
        : []
    const budgets =
      activeClasses.length > 0
        ? resolveSpellLearnBudgets({
            classes: activeClasses,
            subclassCasters,
            abilityModFor: modFor,
            proficiencyBonus: 0,
          })
        : []
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
      budgets,
      profiles,
      suggestion,
    }
  }, [classes, subclassCasters, learnBudgetProp, abilityModFor])

  const mode = access.budget?.mode ?? (knownCaster ? 'known' : 'prepared_list')
  const maxPrepared = access.budget?.maxPrepared ?? spells.max_prepared
  const learnedCantrips = countLearnedCantrips(spells.known)
  const learnedLeveled = countLearnedLeveled(spells.known)
  const preparedCount = countPreparedLeveled(spells.known)
  const cantripsBySlug = countLearnedCantripsBySlug(spells.known)
  const tomeCantrips = countLockedFeatureCantrips(spells.known)
  const namedCantripMeta = formatNamedCantripBudgets(access.budgets, cantripsBySlug, {
    tomeExtra: tomeCantrips,
  })

  /** M5: one shelf per caster profile (alone-max, not shared slots). */
  const shelves: GrimoireShelfSource[] = useMemo(
    () => buildGrimoireShelfSources(access.profiles),
    [access.profiles],
  )
  const wizardRow = useMemo(() => {
    return (
      classes.find((item) => {
        const name = item.name.trim().toLowerCase()
        return name === 'волшебник' || name === 'wizard' || name === 'маг'
      }) ?? null
    )
  }, [classes])
  const wizardLevel = useMemo(() => {
    if (wizardRow) return Math.max(1, Math.floor(wizardRow.level) || 1)
    if (access.budget?.slug === 'wizard') {
      const leveled = classes.find((item) => item.level > 0)
      return Math.max(1, Math.floor(leveled?.level ?? 1) || 1)
    }
    return 1
  }, [wizardRow, classes, access.budget?.slug])
  const wizardSubclassSlug = useMemo(() => {
    const raw = wizardRow?.subclass_name?.trim() || ''
    if (!raw) return null
    return resolveSubclassFeatureSlug(raw) ?? raw.toLowerCase().replace(/\s+/g, '_')
  }, [wizardRow?.subclass_name])
  const copyMods = useMemo(
    () =>
      resolveWizardCopyMods({
        subclassSlug: wizardSubclassSlug,
        wizardLevel,
      }),
    [wizardSubclassSlug, wizardLevel],
  )
  const freeBookLeft =
    mode === 'spellbook' ? remainingFreeSpellbookSlots(spells.known, wizardLevel) : 0
  const uiCopy = spellAccessUiCopy(mode, accessContext)
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
    const focus = initialClassFilter?.trim().toLowerCase() || null
    if (focus && access.classSlugs.includes(focus)) {
      setClassFilter(focus)
      return
    }
    // Default filter to the character's lists (not the full catalog).
    if (access.classSlugs.length === 1) {
      setClassFilter(access.classSlugs[0]!)
    } else {
      setClassFilter('all')
    }
  }, [open, access.classSlugs.join('|'), initialClassFilter])

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
    const schoolSet = access.schoolGate
      ? new Set(access.schoolGate.map((s) => s.toLowerCase()))
      : null
    const shelfList = shelves.length > 0 ? shelves : []
    return entries.filter((entry) => {
      const parsed = parseSpellCatalogData(entry.data)
      const classSlugs = catalogEntryClasses(entry)
      const level = catalogEntryLevel(entry)

      if (shelfList.length > 0) {
        // Union of all caster shelves with per-class alone-max (M5).
        if (!catalogSpellMatchesAnyShelf(classSlugs, level, shelfList)) return false
      } else {
        const slugSet = new Set(access.classSlugs)
        const onList = parsed.classes.some((slug) => slugSet.has(slug))
        if (!onList) return false
        if (parsed.level > 0 && parsed.level > access.maxSpellLevel) return false
      }

      if (schoolSet && parsed.level > 0) {
        const school = (parsed.school || '').toLowerCase()
        if (!schoolSet.has(school)) return false
      }
      return true
    })
  }, [entries, access, shelves])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return available.filter((entry) => {
      const parsed = parseSpellCatalogData(entry.data)
      if (levelFilter !== 'all' && parsed.level !== levelFilter) return false
      if (classFilter !== 'all' && !parsed.classes.includes(classFilter)) return false
      if (bookFilter !== 'all' && parsed.source_book !== bookFilter) return false

      if (statusFilter !== 'all') {
        const sheet = spells.known.find((spell) => spell.catalog_id === entry.id)
        if (statusFilter === 'prepared') {
          if (!(sheet && sheet.level > 0 && sheet.prepared)) return false
        } else if (statusFilter === 'unprepared') {
          // Class-list / book rows not in today's set (includes not yet on sheet).
          if (parsed.level <= 0) return false
          if (sheet?.prepared) return false
          if (mode === 'spellbook' && sheet && sheet.in_spellbook === false) return false
        } else if (statusFilter === 'in_book') {
          if (!(sheet && sheet.level > 0 && sheet.in_spellbook !== false)) return false
        }
      }

      if (!q) return true
      const hay = `${entry.name_ru} ${entry.name_en ?? ''} ${entry.slug} ${parsed.source_book}`.toLowerCase()
      return hay.includes(q)
    })
  }, [
    available,
    query,
    classFilter,
    levelFilter,
    bookFilter,
    statusFilter,
    spells.known,
    mode,
  ])

  function entriesToLevelGroups(list: CatalogEntry[]) {
    const asSpells = list.map((entry) => {
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
  }

  /**
   * M5: when viewing all classes with ≥2 shelves, group by shelf (полка),
   * then by level. Single class / mono → level groups only.
   */
  const shelfSections = useMemo(() => {
    const showShelves = classFilter === 'all' && shelves.length > 1
    if (!showShelves) {
      const shelf =
        classFilter !== 'all'
          ? shelves.find((row) => row.slug === classFilter) ?? null
          : shelves[0] ?? null
      return [
        {
          shelf,
          groups: entriesToLevelGroups(filtered),
        },
      ]
    }
    return shelves.map((shelf) => {
      const list = filtered.filter((entry) =>
        catalogSpellMatchesShelf(
          catalogEntryClasses(entry),
          catalogEntryLevel(entry),
          shelf,
        ),
      )
      return { shelf, groups: entriesToLevelGroups(list) }
    })
  }, [filtered, shelves, classFilter])

  const levelOptions = useMemo(() => {
    const levels = new Set(available.map(entryLevel))
    return [...levels].sort((a, b) => a - b)
  }, [available])

  function acquisitionSlugForEntry(
    entry: CatalogEntry,
    shelfSlug?: string | null,
  ): string | null {
    if (shelfSlug) return shelfSlug
    const parsed = parseSpellCatalogData(entry.data)
    return resolveSpellAcquisitionSlug({
      catalogClassSlugs: parsed.classes,
      profiles: access.profiles,
      classFilter,
    })
  }

  function shelfModeLabel(shelf: GrimoireShelfSource | null): string {
    if (!shelf?.mode) return ''
    if (shelf.mode === 'known') return 'известные'
    if (shelf.mode === 'spellbook') return 'книга'
    return 'подготовка'
  }

  function cantripCapReached(forSlug?: string | null): boolean {
    if (access.budgets.length > 1) {
      const slug =
        forSlug ??
        (classFilter !== 'all' ? classFilter : null)
      if (slug) {
        const budget = access.budgets.find((row) => row.slug === slug)
        if (!budget) return false
        return countLearnedCantripsForSlug(spells.known, slug) >= budget.cantrips
      }
      const totalCap = totalCantripsBudget(access.budgets)
      return learnedCantrips >= totalCap
    }
    const cap = access.budget?.cantrips
    if (cap == null) return false
    return learnedCantrips >= cap
  }

  function leveledLearnCapReached(forSlug?: string | null): boolean {
    if (access.budgets.length > 1) {
      const slug =
        forSlug ??
        (classFilter !== 'all' ? classFilter : null)
      if (slug) {
        const budget = access.budgets.find((row) => row.slug === slug)
        const cap = budget?.leveledKnown
        if (cap == null) return false
        if (budget?.mode === 'spellbook') {
          if (freeBookLeft > 0) return false
          if (onCoinsChange) return false
          return countLearnedLeveledForSlug(spells.known, slug) >= cap
        }
        return countLearnedLeveledForSlug(spells.known, slug) >= cap
      }
    }
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
      mods: copyMods,
    })
  }

  function prepareCapReached(): boolean {
    if (maxPrepared == null) return false
    return preparedCount >= maxPrepared
  }

  function addSpell(
    entry: CatalogEntry,
    prepare: boolean,
    shelfSlug?: string | null,
  ) {
    const parsed = parseSpellCatalogData(entry.data)
    const level = parsed.level
    if (!access.hasCaster) {
      onToast?.('Нет класса с заклинаниями')
      return
    }
    const acquisitionSlugPreview = resolveSpellAcquisitionSlug({
      catalogClassSlugs: parsed.classes,
      profiles: access.profiles,
      classFilter: shelfSlug?.trim() || classFilter,
    })
    if (knownHasCatalogIdForSlug(spells.known, entry.id, acquisitionSlugPreview)) {
      onToast?.('Уже есть в списке этого класса')
      return
    }
    const onList = parsed.classes.some((slug) => access.classSlugs.includes(slug))
    if (!onList) {
      onToast?.('Нет в списке заклинаний твоих классов')
      return
    }
    if (level > 0) {
      const shelf = acquisitionSlugPreview
        ? shelves.find((row) => row.slug === acquisitionSlugPreview)
        : null
      const aloneCap = shelf?.aloneMaxLevel ?? access.maxSpellLevel
      if (
        shelf
          ? !catalogSpellMatchesShelf(parsed.classes, level, shelf)
          : !catalogSpellMatchesAnyShelf(parsed.classes, level, shelves)
      ) {
        onToast?.(
          aloneCap > 0
            ? `Нет в списке класса / круг выше доступного этому классу (до ${aloneCap})`
            : 'Пока доступны только заговоры этого класса',
        )
        return
      }
    }
    if (access.schoolGate && level > 0) {
      const school = (parsed.school || '').toLowerCase()
      if (!access.schoolGate.map((s) => s.toLowerCase()).includes(school)) {
        onToast?.('Школа недоступна для этого кастера')
        return
      }
    }
    const acquisitionSlug = acquisitionSlugForEntry(entry)
    const acquisitionProfile = access.profiles.find((row) => row.slug === acquisitionSlug)
    if (level <= 0 && cantripCapReached(acquisitionSlug)) {
      const budget = access.budgets.find((row) => row.slug === acquisitionSlug)
      const used = acquisitionSlug
        ? countLearnedCantripsForSlug(spells.known, acquisitionSlug)
        : learnedCantrips
      const cap =
        budget?.cantrips ??
        (access.budgets.length > 1
          ? totalCantripsBudget(access.budgets)
          : access.budget?.cantrips)
      onToast?.(
        namedCantripMeta
          ? `Лимит заговоров (${budget?.labelRu ?? 'класс'}): ${used}/${cap ?? '—'} · ${namedCantripMeta}`
          : `Лимит заговоров: ${used}/${cap ?? '—'}`,
      )
      return
    }
    if (level > 0) {
      const acquireMode = acquisitionProfile?.mode ?? mode
      if (acquireMode === 'prepared_list') {
        // Full-list casters prepare directly from the class list in grimoire.
        if (prepare && prepareCapReached()) {
          onToast?.(
            `Лимит подготовки: ${preparedCount}/${maxPrepared ?? '—'}`,
          )
          return
        }
      } else if (acquireMode !== 'spellbook' && leveledLearnCapReached(acquisitionSlug)) {
        const budget = access.budgets.find((row) => row.slug === acquisitionSlug)
        onToast?.(
          `Лимит известных (${budget?.labelRu ?? 'класс'}): ${
            acquisitionSlug
              ? countLearnedLeveledForSlug(spells.known, acquisitionSlug)
              : learnedLeveled
          }/${budget?.leveledKnown ?? access.budget?.leveledKnown ?? '—'}`,
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
        mods: copyMods,
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
        class_slug: acquisitionSlug,
        class_entry_id: acquisitionProfile?.id ?? null,
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

    const acquireMode = acquisitionProfile?.mode ?? mode
    const siblings = otherClassBindingsForCatalog(
      spells.known,
      entry.id,
      acquisitionSlug,
    )
    const nextKnown = addCatalogSpellToKnown(spells.known, entry, {
      prepare: acquireMode === 'known' ? true : prepare,
      maxPrepared,
      class_slug: acquisitionSlug,
      class_entry_id: acquisitionProfile?.id ?? null,
    })
    onChange({
      ...spells,
      known: nextKnown,
      max_prepared: maxPrepared ?? spells.max_prepared,
    })
    const dualWarn =
      siblings.length > 0 && acquisitionSlug
        ? (() => {
            const budget = access.budgets.find((row) => row.slug === acquisitionSlug)
            const label = budget?.labelRu ?? CLASS_LABELS[acquisitionSlug] ?? acquisitionSlug
            const used =
              level <= 0
                ? countLearnedCantripsForSlug(nextKnown, acquisitionSlug)
                : countLearnedLeveledForSlug(nextKnown, acquisitionSlug)
            const cap =
              level <= 0
                ? budget?.cantrips
                : budget?.leveledKnown
            const cost =
              level <= 0
                ? `займёт 1 заговор (${used}/${cap ?? '—'})`
                : budget?.mode === 'known'
                  ? `займёт 1 из ${cap ?? 'N'} известных`
                  : 'займёт слот подготовки'
            return `Также выбрано как ${label} — ${cost}`
          })()
        : null
    if (level <= 0) {
      onToast?.(
        dualWarn ? `Заговор: ${entry.name_ru}. ${dualWarn}` : `Заговор: ${entry.name_ru}`,
      )
      return
    }
    if (acquireMode === 'known') {
      onToast?.(
        dualWarn ? `Известно: ${entry.name_ru}. ${dualWarn}` : `Известно: ${entry.name_ru}`,
      )
      return
    }
    if (acquireMode === 'prepared_list') {
      onToast?.(
        prepare
          ? dualWarn
            ? `На лист и подготовлено: ${entry.name_ru}. ${dualWarn}`
            : `На лист и подготовлено: ${entry.name_ru}`
          : dualWarn
            ? `На лист: ${entry.name_ru}. ${dualWarn}`
            : `На лист (доступно к подготовке): ${entry.name_ru}`,
      )
      return
    }
    onToast?.(
      prepare
        ? `Подготовлено: ${entry.name_ru}`
        : dualWarn
          ? `Добавлено: ${entry.name_ru}. ${dualWarn}`
          : `Добавлено: ${entry.name_ru}`,
    )
  }

  function togglePrepareOnSheet(entry: CatalogEntry) {
    const existing = knownSpellForCatalog(entry.id)
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

  /** Prefer the binding for the active shelf / class filter / acquisition slug. */
  function knownSpellForCatalog(
    catalogId: string,
    shelfSlug?: string | null,
  ): SheetSpell | undefined {
    const entry = entries.find((row) => row.id === catalogId)
    const slug =
      shelfSlug?.trim() ||
      (entry ? acquisitionSlugForEntry(entry, shelfSlug) : null) ||
      (classFilter !== 'all' ? classFilter : null)
    if (slug) {
      const hit = spells.known.find(
        (spell) =>
          spell.catalog_id === catalogId &&
          (spell.class_slug ?? '').trim().toLowerCase() === slug,
      )
      if (hit) return hit
      if (shelfSlug || classFilter !== 'all') return undefined
    }
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

  function removeCustomSpell(spell: SheetSpell) {
    if (!canRemoveSheetSpell(spell)) {
      onToast?.('Это заклинание нельзя снять с листа')
      return
    }
    onChange({
      ...spells,
      known: spells.known.filter((row) => row.id !== spell.id),
    })
    onToast?.(`Снято с листа: ${spell.name}`)
    setCustomOpen(false)
    setEditingCustomId(null)
  }

  function togglePrepareCustom(spell: SheetSpell) {
    if (spell.level <= 0) return
    const nextPrepared = !spell.prepared
    if (nextPrepared && prepareCapReached()) {
      onToast?.(`Лимит подготовки: ${preparedCount}/${maxPrepared ?? '—'}`)
      return
    }
    onChange({
      ...spells,
      known: setSpellPrepared(spells.known, spell.id, nextPrepared, maxPrepared),
      max_prepared: maxPrepared ?? spells.max_prepared,
    })
  }

  /**
   * Custom spells skip catalog class-list membership (they are not in PHB lists),
   * but keep circle / school / quota / spellbook gates — same as official adds.
   */
  function addCustomSpell(input: CustomSheetSpellInput, prepare: boolean) {
    if (!access.hasCaster) {
      onToast?.('Нет класса с заклинаниями')
      return
    }
    const level = Math.max(0, Math.min(9, Math.floor(input.level)))
    if (level > 0 && level > access.maxSpellLevel) {
      onToast?.(
        access.maxSpellLevel > 0
          ? `Доступен круг до ${access.maxSpellLevel}`
          : 'Пока доступны только заговоры',
      )
      return
    }
    if (access.schoolGate && level > 0) {
      const school = (input.school || '').toLowerCase()
      if (!school || !access.schoolGate.map((s) => s.toLowerCase()).includes(school)) {
        onToast?.('Школа недоступна для этого кастера')
        return
      }
    }
    if (level <= 0 && cantripCapReached(classFilter !== 'all' ? classFilter : null)) {
      onToast?.(
        namedCantripMeta
          ? `Лимит заговоров: ${namedCantripMeta}`
          : `Лимит заговоров: ${learnedCantrips}/${
              access.budgets.length > 1
                ? totalCantripsBudget(access.budgets)
                : (access.budget?.cantrips ?? '—')
            }`,
      )
      return
    }
    if (level > 0) {
      if (mode === 'prepared_list') {
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
        spellSchool: input.school,
        known: spells.known,
        wizardLevel,
        coins: coins ?? null,
        mods: copyMods,
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
      const nextKnown = addCustomSpellToKnown(spells.known, input, {
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
          ? `В книгу${prepSuffix}: ${input.name.trim()} · ${payment.message}`
          : `В книгу${prepSuffix}: ${input.name.trim()} · ${payment.message}`,
      )
      setCustomOpen(false)
      setEditingCustomId(null)
      return
    }

    const nextKnown = addCustomSpellToKnown(spells.known, input, {
      prepare: mode === 'known' ? true : prepare,
      maxPrepared,
    })
    onChange({
      ...spells,
      known: nextKnown,
      max_prepared: maxPrepared ?? spells.max_prepared,
    })
    const label = input.name.trim()
    if (level <= 0) {
      onToast?.(`Заговор: ${label}`)
    } else if (mode === 'known') {
      onToast?.(`Известно: ${label}`)
    } else if (mode === 'prepared_list') {
      onToast?.(
        prepare
          ? `На лист и подготовлено: ${label}`
          : `На лист (доступно к подготовке): ${label}`,
      )
    } else {
      onToast?.(prepare ? `Подготовлено: ${label}` : `Добавлено: ${label}`)
    }
    setCustomOpen(false)
    setEditingCustomId(null)
  }

  function saveCustomSpell(input: CustomSheetSpellInput, options: { prepare: boolean }) {
    if (editingCustom) {
      const nextKnown = spells.known.map((row) =>
        row.id === editingCustom.id ? updateCustomSheetSpell(row, input) : row,
      )
      onChange({ ...spells, known: nextKnown })
      onToast?.(`Сохранено: ${input.name.trim()}`)
      setCustomOpen(false)
      setEditingCustomId(null)
      return
    }
    addCustomSpell(input, options.prepare)
  }

  const shelfHint = describeGrimoireShelves(shelves)
  const accessHint = !access.hasCaster
    ? 'Нет класса с заклинаниями — гримуар пуст.'
    : shelfHint
      ? `Полки по классам: ${shelfHint}.`
      : access.maxSpellLevel > 0
        ? `Список классов · до ${access.maxSpellLevel} круга.`
        : 'Пока только заговоры из списка класса (ячеек ещё нет).'

  const budgetHint = (() => {
    if (!access.budget) return `${uiCopy.grimoireHint} ${accessHint}`
    const b = access.budget
    const cantripPart = namedCantripMeta
      ? namedCantripMeta
      : `заговоры ${learnedCantrips}/${b.cantrips}`
    if (access.budgets.length > 1) {
      return `${cantripPart}. ${uiCopy.grimoireHint} ${accessHint}`
    }
    if (b.mode === 'spellbook') {
      const freePart =
        freeBookLeft > 0
          ? `бесплатно ещё ${freeBookLeft}`
          : onCoinsChange
            ? 'далее — копия за золото из кошелька'
            : 'бесплатный объём исчерпан'
      return `${b.labelRu}: в книге ${learnedLeveled} · ${freePart} (лимит бесплатных ${b.leveledKnown ?? '—'}) · ${cantripPart} · ${uiCopy.readyLabel.toLowerCase()} ${preparedCount}/${b.maxPrepared ?? '—'}. ${uiCopy.grimoireHint} ${accessHint}`
    }
    if (b.mode === 'prepared_list') {
      return `${b.labelRu}: на листе ${learnedLeveled} · не подготовлено ${unpreparedOnSheet} · ${cantripPart} · ${uiCopy.readyLabel.toLowerCase()} ${preparedCount}/${b.maxPrepared ?? '—'}. ${uiCopy.grimoireHint} ${accessHint}`
    }
    return `${b.labelRu}: известные ${learnedLeveled}/${b.leveledKnown ?? '—'} · ${cantripPart}. ${uiCopy.grimoireHint} ${accessHint}`
  })()

  const dialogTitle =
    shelves.length > 1 ? 'Гримуар · полки классов' : uiCopy.grimoireTitle

  return (
    <>
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
            {copyMods.savantLabelRu ? (
              <span
                className="sheet-chip is-on"
                title="Знаток школы — копии этой школы за полцены"
              >
                Знаток: {copyMods.savantLabelRu} ×½
              </span>
            ) : null}
            {copyMods.wizardlyQuill ? (
              <span
                className="sheet-chip is-on"
                title="Перо писца — быстрее переписывать заклинания"
              >
                Перо писца
              </span>
            ) : null}
            {!canWriteToBook ? (
              <Text tone="muted">
                Без книги нельзя вносить заклинания. Добавь «Книга заклинаний» в инвентарь.
              </Text>
            ) : null}
          </div>
        ) : null}

        <div className="grimoire-toolbar grimoire-toolbar--sticky">
          <Field label="Поиск">
            <Input
              value={query}
              placeholder="Название заклинания…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field>
          <Field label="Книга-источник">
            <select
              className="play-select"
              value={bookFilter}
              onChange={(event) => setBookFilter(event.target.value)}
              aria-label="Фильтр по книге-источнику"
            >
              {bookOptions.map((book) => (
                <option key={book} value={book}>
                  {book === 'all' ? 'Все книги' : book}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            className="sheet-chip"
            disabled={!access.hasCaster}
            title={
              access.hasCaster
                ? 'Создать своё заклинание на этом листе'
                : 'Нужен класс с заклинаниями'
            }
            onClick={() => {
              setEditingCustomId(null)
              setCustomOpen(true)
            }}
          >
            Своё
          </button>
        </div>

        {customOnSheet.length > 0 ? (
          <div className="prepare-section">
            <strong>Свои на листе ({customOnSheet.length})</strong>
            <ul className="prepare-list">
              {customOnSheet.map((spell) => {
                const source = spellSourceBadge(spell)
                const needsPrepareToggle =
                  spell.level > 0 && (mode === 'prepared_list' || mode === 'spellbook')
                return (
                  <li key={spell.id} className="prepare-row prepare-row--spell">
                    <div className="prepare-row__main">
                      <div>
                        {spell.name || 'Без названия'}
                        {source ? (
                          <span className="prepare-row__badge is-source" title={source.title}>
                            {source.label}
                          </span>
                        ) : null}
                        {spell.concentration ? (
                          <span className="prepare-row__badge">К</span>
                        ) : null}
                        {spell.ritual ? (
                          <span className="prepare-row__badge">Ритуал</span>
                        ) : null}
                      </div>
                      <Text tone="muted">
                        {[
                          levelLabel(spell.level),
                          spell.casting_time,
                          spell.range,
                          spell.duration,
                          spell.attack_or_save,
                          spell.damage,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </Text>
                    </div>
                    <div className="grimoire-row__actions">
                      {needsPrepareToggle ? (
                        <button
                          type="button"
                          className={`sheet-chip${spell.prepared ? ' is-on' : ''}`}
                          onClick={() => togglePrepareCustom(spell)}
                        >
                          {spell.prepared ? 'Подготовлено' : 'Подготовить'}
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
                      <button
                        type="button"
                        className="sheet-chip"
                        onClick={() => {
                          setEditingCustomId(spell.id)
                          setCustomOpen(true)
                        }}
                      >
                        Изменить
                      </button>
                      {canRemoveSheetSpell(spell) ? (
                        <button
                          type="button"
                          className="sheet-chip"
                          onClick={() => removeCustomSpell(spell)}
                        >
                          Снять
                        </button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

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

        {shelves.some((row) => row.mode === 'prepared_list' || row.mode === 'spellbook') ||
        mode === 'prepared_list' ||
        mode === 'spellbook' ? (
          <div className="chip-row">
            {(
              [
                { id: 'all' as const, label: 'Все доступные' },
                { id: 'prepared' as const, label: 'Подготовленные' },
                { id: 'unprepared' as const, label: 'Не подготовленные' },
                ...(shelves.some((row) => row.mode === 'spellbook') || mode === 'spellbook'
                  ? [{ id: 'in_book' as const, label: 'В книге' }]
                  : []),
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sheet-chip${statusFilter === item.id ? ' is-on' : ''}`}
                onClick={() => setStatusFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="chip-row grimoire-level-chips">
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

        {shelfSections.every((section) => section.groups.length === 0) &&
        !loading &&
        access.hasCaster ? (
          <Text tone="muted">Ничего не найдено.</Text>
        ) : (
          shelfSections.map((section) => (
            <div
              key={section.shelf?.slug ?? 'mono'}
              className="grimoire-shelf"
              data-shelf={section.shelf?.slug ?? ''}
            >
              {section.shelf && shelves.length > 1 && classFilter === 'all' ? (
                <div className="grimoire-shelf__header">
                  <strong>{section.shelf.labelRu}</strong>
                  <Text tone="muted">
                    {[
                      shelfModeLabel(section.shelf),
                      section.shelf.aloneMaxLevel > 0
                        ? `круг 1–${section.shelf.aloneMaxLevel}`
                        : 'заговоры',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </div>
              ) : null}
              {section.groups.length === 0 ? (
                <Text tone="muted">Нет заклинаний на этой полке по фильтру.</Text>
              ) : null}
              {section.groups.map((group) => (
            <div key={`${section.shelf?.slug ?? 'x'}-${group.level}`} className="prepare-section">
              <strong>
                {levelLabel(group.level)} ({group.spells.length})
              </strong>
              <ul className="prepare-list">
                {group.spells.map((spell) => {
                  const entry = entries.find((item) => item.id === spell.catalog_id)
                  if (!entry) return null
                  const rowSlug = acquisitionSlugForEntry(entry, section.shelf?.slug)
                  const onSheet = knownHasCatalogIdForSlug(
                    spells.known,
                    entry.id,
                    rowSlug,
                  )
                  const otherBindings = otherClassBindingsForCatalog(
                    spells.known,
                    entry.id,
                    rowSlug,
                  )
                  const rowMode =
                    access.profiles.find((row) => row.slug === rowSlug)?.mode ??
                    section.shelf?.mode ??
                    mode
                  const parsed = parseSpellCatalogData(entry.data)
                  const expanded = expandedId === entry.id
                  return (
                    <li
                      key={`${section.shelf?.slug ?? 'x'}:${entry.id}`}
                      className="prepare-row prepare-row--spell"
                    >
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
                            const sheetSpell = knownSpellForCatalog(
                              entry.id,
                              section.shelf?.slug,
                            )
                            const prepared = Boolean(sheetSpell?.prepared)
                            const canRemove = sheetSpell ? canRemoveSheetSpell(sheetSpell) : false
                            const needsPrepareToggle =
                              spell.level > 0 &&
                              (rowMode === 'prepared_list' || rowMode === 'spellbook')
                            return (
                              <>
                                {needsPrepareToggle ? (
                                  <button
                                    type="button"
                                    className={`sheet-chip${prepared ? ' is-on' : ''}`}
                                    onClick={() => togglePrepareOnSheet(entry)}
                                    title={
                                      prepared
                                        ? 'Убрать из сегодняшнего набора (останется в пуле)'
                                        : 'В сегодняшний набор'
                                    }
                                  >
                                    {prepared ? 'Подготовлено' : 'Подготовить'}
                                  </button>
                                ) : (
                                  <span className="sheet-chip is-on">
                                    {rowMode === 'spellbook'
                                      ? 'В книге'
                                      : rowMode === 'known'
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
                                      rowMode === 'spellbook'
                                        ? 'Убрать из книги'
                                        : 'Убрать с листа'
                                    }
                                  >
                                    {uiCopy.removeActionLabel}
                                  </button>
                                ) : null}
                              </>
                            )
                          })()
                        ) : rowMode === 'known' || spell.level <= 0 ? (
                          <button
                            type="button"
                            className="sheet-chip"
                            disabled={
                              spell.level <= 0
                                ? cantripCapReached(rowSlug)
                                : leveledLearnCapReached(rowSlug)
                            }
                            title={
                              otherBindings.length > 0
                                ? `Уже есть как ${otherBindings
                                    .map((row) => row.class_slug || 'класс')
                                    .join(', ')} — вторая привязка займёт бюджет`
                                : undefined
                            }
                            onClick={() => addSpell(entry, true, section.shelf?.slug)}
                          >
                            {spell.level <= 0
                              ? cantripCapReached(rowSlug)
                                ? 'Лимит заговоров'
                                : otherBindings.length > 0
                                  ? `Также ${uiCopy.pickActionLabel.toLowerCase()}`
                                  : uiCopy.pickActionLabel
                              : leveledLearnCapReached(rowSlug)
                                ? 'Лимит'
                                : otherBindings.length > 0
                                  ? `Также ${uiCopy.pickActionLabel.toLowerCase()}`
                                  : uiCopy.pickActionLabel}
                          </button>
                        ) : rowMode === 'spellbook' ? (
                          <>
                            <button
                              type="button"
                              className="sheet-chip"
                              disabled={leveledLearnCapReached(rowSlug) || !canWriteToBook}
                              onClick={() => addSpell(entry, false, section.shelf?.slug)}
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
                                : leveledLearnCapReached(rowSlug)
                                  ? 'Книга полна'
                                  : spellbookCopyGp(entry) > 0
                                    ? `В книгу · ${formatGpTotal(spellbookCopyGp(entry))} зм`
                                    : 'В книгу'}
                            </button>
                            <button
                              type="button"
                              className="sheet-chip"
                              disabled={
                                leveledLearnCapReached(rowSlug) ||
                                prepareCapReached() ||
                                !canWriteToBook
                              }
                              onClick={() => addSpell(entry, true, section.shelf?.slug)}
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
                          <button
                            type="button"
                            className="sheet-chip"
                            disabled={prepareCapReached()}
                            onClick={() => addSpell(entry, true, section.shelf?.slug)}
                            title="Добавить в сегодняшний набор (список класса уже доступен)"
                          >
                            {prepareCapReached() ? 'Лимит подготовки' : 'Подготовить'}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
              ))}
            </div>
          ))
        )}
      </Stack>
    </Dialog>
    <CustomSpellDialog
      open={open && customOpen}
      initial={editingCustom}
      mode={mode}
      canWriteToBook={canWriteToBook}
      prepareCapReached={prepareCapReached()}
      cantripCapReached={cantripCapReached()}
      leveledLearnCapReached={leveledLearnCapReached()}
      onClose={() => {
        setCustomOpen(false)
        setEditingCustomId(null)
      }}
      onSave={saveCustomSpell}
      onDelete={
        editingCustom
          ? () => {
              removeCustomSpell(editingCustom)
            }
          : undefined
      }
    />
    </>
  )
}
