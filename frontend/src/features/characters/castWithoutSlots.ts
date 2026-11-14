/**
 * Sheet grants that cast without a spell slot: ritual books, at-will
 * invocations, and ki / feature cards. State stays in the existing spell
 * JSON and inventory — no new column.
 */

import type { AppliedFeatGrant } from '../../shared/dnd/featGrants'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import { getFeaturePickList } from '../../shared/dnd/featurePicks'
import {
  ELEMENTAL_DISCIPLINE_SPELLS,
  elementalDisciplineById,
} from '../../shared/dnd/monkElementalDisciplines'
import {
  halfLevelRoundedUp,
  isRitualCasterList,
  ritualCasterCastingAbility,
  ritualCopyLevelAllowed,
  ritualTranscriptionCost,
} from '../../shared/dnd/ritualBooks'
import { spendGpFromPurse } from '../../shared/dnd/weight'
import {
  INVOCATION_CASTS,
  invocationById,
  type InvocationCastDef,
} from '../../shared/dnd/warlockInvocations'
import {
  bundledRitualOptions,
  bundledSpellBySlug,
  enrichAlwaysPreparedSheetSpell,
  type BundledRitualOption,
} from './alwaysPreparedSpellEnrichment'
import {
  createInventoryItem,
  type InventoryItem,
  type InventoryState,
} from './inventory'
import { isPactChainSpellId } from './pactChainEffects'
import { isPactTomeActive, isWarlockClassName } from './pactTomeEffects'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  featureSpellId,
  type RitualBookEntry,
  type RitualBookKind,
  type RitualBooksState,
  type SheetSpell,
  type SpellsState,
} from './spells'

export type CastWithoutSlotsClass = {
  id: string
  name: string
  level: number
  subclass_name?: string | null
}

export type CastWithoutSlotsInput = {
  spells: SpellsState
  inventory: InventoryState
  featurePicks: FeaturePicksState
  featGrants: readonly AppliedFeatGrant[]
  classes: readonly CastWithoutSlotsClass[]
  subclassSlugByEntryId?: Record<string, string>
  characterLevel: number
}

export type CastWithoutSlotsResult = {
  spells: SpellsState
  inventory: InventoryState
  changed: boolean
  message: string | null
}

const RITUAL_FEAT_PREFIX = 'ritual-book:feat:'
const RITUAL_ANCIENT_PREFIX = 'ritual-book:ancient:'

function ritualSlugOf(spell: SheetSpell): string | null {
  const catalog = spell.catalog_id?.trim()
  if (catalog && bundledSpellBySlug(catalog)) return catalog
  const byName = bundledRitualOptions().find(
    (row) => row.nameRu.trim().toLowerCase() === spell.name.trim().toLowerCase(),
  )
  return byName?.slug ?? null
}

function withoutGrant(spell: SheetSpell): SheetSpell {
  if (!spell.grant_cast) return spell
  const { grant_cast: _drop, ...rest } = spell
  return rest
}

function isRitualBookItem(item: InventoryItem): boolean {
  const slug = (item.catalog_slug ?? '').trim().toLowerCase()
  if (slug === 'ritual_book') return true
  const name = item.name.trim().toLowerCase().replace(/ё/g, 'е')
  return /книга\s+ритуалов/.test(name)
}

function isBookOfShadowsItem(item: InventoryItem): boolean {
  const slug = (item.catalog_slug ?? '').trim().toLowerCase()
  if (slug === 'book_of_shadows' || slug === 'tome') return true
  const name = item.name.trim().toLowerCase().replace(/ё/g, 'е')
  return /книга\s+теней/.test(name)
}

function makeBook(name: string, slug: string, notes: string): InventoryItem {
  return {
    ...createInventoryItem(),
    name,
    catalog_slug: slug,
    notes,
    qty: 1,
    weight_lb: 3,
  }
}

function warlockRow(classes: readonly CastWithoutSlotsClass[]): CastWithoutSlotsClass | null {
  return classes.find((row) => isWarlockClassName(row.name) && row.level > 0) ?? null
}

function invocationsOf(picks: FeaturePicksState, classEntryId: string): string[] {
  return getFeaturePickList(picks, classEntryId, 'eldritch_invocations')
}

function ancientSecretsActive(input: CastWithoutSlotsInput, warlock: CastWithoutSlotsClass | null): boolean {
  if (!warlock) return false
  if (!isPactTomeActive(input.featurePicks, warlock.id)) return false
  return invocationsOf(input.featurePicks, warlock.id).includes('book_of_ancient_secrets')
}

function ritualCasterGrant(grants: readonly AppliedFeatGrant[]): AppliedFeatGrant | null {
  return grants.find((row) => row.slug === 'ritual_caster') ?? null
}

function fourElementsMonk(
  input: CastWithoutSlotsInput,
): CastWithoutSlotsClass | null {
  return (
    input.classes.find((row) => {
      if (!/монах|monk/i.test(row.name) || row.level < 3) return false
      const slug = (input.subclassSlugByEntryId?.[row.id] ?? '').toLowerCase()
      if (slug === 'way_of_the_four_elements') return true
      const name = (row.subclass_name ?? '').toLowerCase()
      return name.includes('стих') || name.includes('four elements')
    }) ?? null
  )
}

function disciplineIds(picks: FeaturePicksState, classEntryId: string): string[] {
  const ids = [
    ...getFeaturePickList(picks, classEntryId, 'elemental_disciplines'),
    ...getFeaturePickList(picks, classEntryId, 'elemental_disciplines_3'),
  ]
  return [...new Set(ids)]
}

function spellFromEnglish(nameEn: string, id: string): SheetSpell {
  const base = enrichAlwaysPreparedSheetSpell(
    { ...createSheetSpell(), id, name: '', level: 1 },
    nameEn,
  )
  return { ...base, id, name: base.name || nameEn }
}

function ritualRow(input: {
  id: string
  entry: RitualBookEntry
  kind: RitualBookKind
  classSlug: string | null
  classEntryId: string | null
  castingAbility: 'int' | 'wis' | 'cha' | null
  label: string
}): SheetSpell {
  const catalog = bundledSpellBySlug(input.entry.slug)
  const seeded = catalog
    ? spellFromEnglish(catalog.name_en || input.entry.name, input.id)
    : { ...createSheetSpell(), id: input.id, name: input.entry.name, level: input.entry.level }
  const locked = asAlwaysPreparedSpell(
    {
      ...seeded,
      id: input.id,
      name: catalog?.name_ru || input.entry.name,
      level: input.entry.level,
      catalog_id: input.entry.slug,
      ritual: true,
    },
    {
      source_kind: input.kind === 'feat' ? 'feat' : 'feature',
      label: input.label,
      class_slug: input.classSlug,
      class_entry_id: input.classEntryId,
    },
  )
  return withoutGrant({
    ...locked,
    ritual: true,
    cast_access: 'ritual_only',
    ritual_book: input.kind,
    ritual_book_role: input.entry.starter ? 'starter' : 'copied',
    ...(input.castingAbility ? { casting_ability: input.castingAbility } : {}),
    notes:
      input.kind === 'feat'
        ? 'Книга ритуалов · только ритуал, без ячейки'
        : 'Книга теней · только ритуал, без ячейки договора',
  })
}

function sameSpellStamp(a: SheetSpell, b: SheetSpell): boolean {
  return (
    a.cast_access === b.cast_access &&
    a.ritual_book === b.ritual_book &&
    a.ritual === b.ritual &&
    a.pact_only === b.pact_only &&
    a.casting_ability === b.casting_ability &&
    a.class_slug === b.class_slug &&
    Boolean(a.grant_cast) === Boolean(b.grant_cast) &&
    a.feature_spend?.poolId === b.feature_spend?.poolId &&
    a.feature_spend?.cost === b.feature_spend?.cost &&
    a.notes === b.notes &&
    a.name === b.name &&
    a.level === b.level &&
    a.catalog_id === b.catalog_id
  )
}

export function ritualBookBlockReason(
  spells: SpellsState,
  spell: SheetSpell,
): string | null {
  if (spell.ritual_book === 'feat') {
    const book = spells.ritual_books?.feat
    if (!book?.itemId || book.lost) {
      return 'Нет книги ритуалов в инвентаре. Ритуал черты недоступен.'
    }
  }
  if (spell.ritual_book === 'ancient_secrets') {
    const book = spells.ritual_books?.ancient_secrets
    if (!book?.itemId || book.lost) {
      return 'Нет Книги теней. Ритуал недоступен.'
    }
  }
  return null
}

export function syncCastWithoutSlotGrants(input: CastWithoutSlotsInput): CastWithoutSlotsResult {
  let items = input.inventory.items
  let message: string | null = null
  const feat = ritualCasterGrant(input.featGrants)
  const warlock = warlockRow(input.classes)
  const ancientOn = ancientSecretsActive(input, warlock)
  const tomeOn = Boolean(warlock && isPactTomeActive(input.featurePicks, warlock.id))
  const books: RitualBooksState = {
    ...(input.spells.ritual_books?.feat ? { feat: { ...input.spells.ritual_books.feat } } : {}),
    ...(input.spells.ritual_books?.ancient_secrets
      ? { ancient_secrets: { ...input.spells.ritual_books.ancient_secrets } }
      : {}),
  }

  if (feat) {
    const boundId = books.feat?.itemId
    const current = items.find((row) => row.id === boundId && isRitualBookItem(row))
    const any = items.find(isRitualBookItem)
    if (books.feat?.lost) {
      // Lost until the player recovers the book. Do not mint a replacement.
    } else if (boundId && !current) {
      books.feat = { ...(books.feat ?? { itemId: null, lost: false }), itemId: boundId, lost: true }
      message = 'Книга ритуалов пропала из инвентаря'
    } else if (!boundId && any) {
      books.feat = { ...(books.feat ?? { itemId: null, lost: false }), itemId: any.id, lost: false }
    } else if (!boundId && !any) {
      const created = makeBook(
        'Книга ритуалов',
        'ritual_book',
        'Книга ритуалов черты «Заклинатель ритуалов»',
      )
      items = [...items, created]
      books.feat = { ...(books.feat ?? { itemId: null, lost: false }), itemId: created.id, lost: false }
      message = 'В инвентаре книга ритуалов'
    }
    const listSlug = feat.picks.enumIds.list ?? books.feat?.listSlug ?? null
    if (books.feat && listSlug) books.feat = { ...books.feat, listSlug }
  }

  if (tomeOn || books.ancient_secrets) {
    const boundId = books.ancient_secrets?.itemId
    const current = items.find((row) => row.id === boundId && isBookOfShadowsItem(row))
    const any = items.find(isBookOfShadowsItem)
    if (books.ancient_secrets?.lost) {
      // keep lost
    } else if (boundId && !current) {
      books.ancient_secrets = {
        ...(books.ancient_secrets ?? { itemId: null, lost: false }),
        lost: true,
      }
      message = message ?? 'Книга теней пропала из инвентаря'
    } else if (tomeOn && !boundId && any) {
      books.ancient_secrets = {
        ...(books.ancient_secrets ?? { itemId: null, lost: false, entries: [] }),
        itemId: any.id,
        lost: false,
      }
    } else if (tomeOn && !any) {
      const created = makeBook(
        'Книга теней',
        'book_of_shadows',
        'Книга теней дара Гримуара. Ритуалы «Книги древних тайн» пишутся сюда.',
      )
      items = [...items, created]
      books.ancient_secrets = {
        ...(books.ancient_secrets ?? { itemId: null, lost: false }),
        itemId: created.id,
        lost: false,
      }
      message = message ?? 'В инвентаре Книга теней'
    }
  }

  const listSlug = isRitualCasterList(books.feat?.listSlug) ? books.feat?.listSlug ?? null : null
  const casting = ritualCasterCastingAbility(listSlug)
  let known = input.spells.known.map((spell) => {
    if (!feat || !spell.id.startsWith(`feat-spell:${feat.id}:`)) return spell
    const next = withoutGrant({
      ...spell,
      ritual: true,
      cast_access: 'ritual_only' as const,
      ritual_book: 'feat' as const,
      ritual_book_role: spell.ritual_book_role ?? 'starter',
      prepared: true,
      prepared_locked: true,
      ...(listSlug ? { class_slug: listSlug } : {}),
      ...(casting ? { casting_ability: casting } : {}),
      notes: 'Книга ритуалов · только ритуал, без ячейки',
    })
    const slug = ritualSlugOf(next)
    return slug ? { ...next, catalog_id: slug } : next
  })

  if (feat && books.feat) {
    const entries = [...(books.feat.entries ?? [])]
    for (const spell of known) {
      if (!spell.id.startsWith(`feat-spell:${feat.id}:`)) continue
      const slug = ritualSlugOf(spell)
      if (!slug || entries.some((row) => row.slug === slug)) continue
      entries.push({
        slug,
        name: spell.name,
        level: spell.level || 1,
        listSlug: listSlug ?? '',
        starter: true,
      })
    }
    books.feat = { ...books.feat, entries }
  }

  known = known.filter(
    (spell) =>
      !spell.id.startsWith(RITUAL_FEAT_PREFIX) &&
      !spell.id.startsWith(RITUAL_ANCIENT_PREFIX) &&
      !spell.id.startsWith('feature-spell:invocation:') &&
      !spell.id.startsWith('feature-spell:elemental:'),
  )

  if (feat && books.feat?.entries) {
    const have = new Set(
      known
        .filter((spell) => spell.id.startsWith(`feat-spell:${feat.id}:`))
        .map((spell) => ritualSlugOf(spell))
        .filter((slug): slug is string => Boolean(slug)),
    )
    for (const entry of books.feat.entries) {
      if (have.has(entry.slug)) continue
      known.push(
        ritualRow({
          id: `${RITUAL_FEAT_PREFIX}${entry.slug}`,
          entry,
          kind: 'feat',
          classSlug: listSlug,
          classEntryId: null,
          castingAbility: casting,
          label: 'Заклинатель ритуалов',
        }),
      )
    }
  }

  if (ancientOn && warlock) {
    for (const entry of books.ancient_secrets?.entries ?? []) {
      known.push(
        ritualRow({
          id: `${RITUAL_ANCIENT_PREFIX}${entry.slug}`,
          entry,
          kind: 'ancient_secrets',
          classSlug: 'warlock',
          classEntryId: warlock.id,
          castingAbility: 'cha',
          label: 'Книга древних тайн',
        }),
      )
    }
  }

  if (warlock) {
    const owned = new Set(invocationsOf(input.featurePicks, warlock.id))
    for (const cast of INVOCATION_CASTS) {
      if (!owned.has(cast.invocationId)) continue
      if (!invocationById(cast.invocationId)) continue
      known.push(invocationSpell(cast, warlock.id, input.spells.known))
    }
  }

  const monk = fourElementsMonk(input)
  if (monk) {
    for (const id of disciplineIds(input.featurePicks, monk.id)) {
      const spell = elementalSpell(id, monk)
      if (spell) known.push(spell)
    }
  }

  known = markKnownWarlockRituals(known, ancientOn)

  const nextSpells: SpellsState = {
    ...input.spells,
    known,
    ritual_books: books.feat || books.ancient_secrets ? books : undefined,
  }
  const nextInventory = items === input.inventory.items ? input.inventory : { ...input.inventory, items }
  const changed =
    !sameBooks(input.spells.ritual_books, nextSpells.ritual_books) ||
    knownChanged(input.spells.known, known) ||
    nextInventory !== input.inventory

  return {
    spells: changed ? nextSpells : input.spells,
    inventory: changed ? nextInventory : input.inventory,
    changed,
    message,
  }
}

function sameBooks(a: RitualBooksState | undefined, b: RitualBooksState | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

function knownChanged(prev: SheetSpell[], next: SheetSpell[]): boolean {
  if (prev.length !== next.length) return true
  const byId = new Map(prev.map((spell) => [spell.id, spell]))
  for (const spell of next) {
    const old = byId.get(spell.id)
    if (!old || !sameSpellStamp(old, spell)) return true
  }
  return false
}

function markKnownWarlockRituals(known: SheetSpell[], active: boolean): SheetSpell[] {
  return known.map((spell) => {
    if (isPactChainSpellId(spell.id)) return spell
    if (spell.ritual_book) return spell
    if (
      spell.cast_access === 'at_will' ||
      spell.cast_access === 'feature' ||
      spell.cast_access === 'ritual_only'
    ) {
      return spell
    }
    const warlock = (spell.class_slug ?? '').toLowerCase() === 'warlock'
    const ritual = Boolean(spell.ritual) && spell.level > 0
    if (active && warlock && ritual) {
      if (spell.cast_access === 'ritual_or_slot') return spell
      return { ...spell, cast_access: 'ritual_or_slot' as const }
    }
    if (!active && warlock && spell.cast_access === 'ritual_or_slot') {
      const { cast_access: _drop, ...rest } = spell
      return rest
    }
    return spell
  })
}

function invocationSpell(
  cast: InvocationCastDef,
  classEntryId: string,
  known: SheetSpell[],
): SheetSpell {
  const id = featureSpellId('invocation', cast.invocationId)
  const previous = known.find((row) => row.id === id)
  const label = invocationById(cast.invocationId)?.nameRu || cast.invocationId
  const seeded = spellFromEnglish(cast.nameEn, id)
  const level = cast.fixedLevel ?? seeded.level
  const atWill = cast.mode === 'at_will'
  const base = asAlwaysPreparedSpell(
    {
      ...seeded,
      id,
      level,
      ritual: false,
      class_slug: 'warlock',
      class_entry_id: classEntryId,
    },
    {
      source_kind: 'feature',
      label,
      class_slug: 'warlock',
      class_entry_id: classEntryId,
    },
  )
  const notes = atWill
    ? cast.selfOnly
      ? 'По желанию, без ячейки. Только на себя.'
      : 'По желанию, без ячейки.'
    : cast.limitPerLongRest
      ? `Ячейка договора. ${cast.limitPerLongRest}/долгий отдых.`
      : 'Ячейка договора, не обычная ячейка.'
  return {
    ...withoutGrant(base),
    ritual: false,
    level,
    ...(atWill ? { cast_access: 'at_will' as const } : { pact_only: true as const }),
    notes,
    ...(cast.limitPerLongRest
      ? {
          grant_cast: {
            max: cast.limitPerLongRest,
            used: Math.min(cast.limitPerLongRest, previous?.grant_cast?.used ?? 0),
            reset: 'long' as const,
            label,
          },
        }
      : {}),
  }
}

function elementalSpell(id: string, monk: CastWithoutSlotsClass): SheetSpell | null {
  const link = ELEMENTAL_DISCIPLINE_SPELLS[id]
  const disc = elementalDisciplineById(id)
  if (!link || !disc || disc.kiCost == null) return null
  if (disc.minLevel != null && monk.level < disc.minLevel) return null
  const spellId = featureSpellId('elemental', id)
  const seeded = spellFromEnglish(link.nameEn, spellId)
  const locked = asAlwaysPreparedSpell(
    { ...seeded, id: spellId, ritual: false, class_slug: 'monk', class_entry_id: monk.id },
    {
      source_kind: 'feature',
      label: disc.nameRu,
      class_slug: 'monk',
      class_entry_id: monk.id,
    },
  )
  return {
    ...locked,
    ritual: false,
    cast_access: 'feature',
    feature_spend: {
      poolId: 'ki',
      classSlug: 'monk',
      classEntryId: monk.id,
      cost: disc.kiCost,
      label: `Ци · ${disc.nameRu}`,
      optionId: id,
    },
    notes: `${disc.kiCost} ци, без ячейки. ${disc.summaryRu}`,
  }
}

export function ritualBookCandidates(input: {
  kind: RitualBookKind
  listSlug: string | null
  maxLevel: number
  taken: string[]
}): BundledRitualOption[] {
  const taken = new Set(input.taken)
  const list = input.listSlug?.trim().toLowerCase() ?? ''
  return bundledRitualOptions().filter((row) => {
    if (taken.has(row.slug)) return false
    if (row.level > input.maxLevel) return false
    if (input.kind === 'feat') {
      if (!list || !row.classes.includes(list)) return false
    }
    return true
  })
}

export function addRitualBookEntry(input: CastWithoutSlotsInput & {
  kind: RitualBookKind
  slug: string
}): CastWithoutSlotsResult & { ok: boolean } {
  const option = bundledRitualOptions().find((row) => row.slug === input.slug)
  if (!option) {
    return { spells: input.spells, inventory: input.inventory, changed: false, ok: false, message: 'Нет такого ритуала в каталоге' }
  }
  const feat = ritualCasterGrant(input.featGrants)
  const warlock = warlockRow(input.classes)
  const books = input.spells.ritual_books ?? {}
  if (input.kind === 'feat') {
    if (!feat) {
      return { spells: input.spells, inventory: input.inventory, changed: false, ok: false, message: 'Нет черты «Заклинатель ритуалов»' }
    }
    const list = books.feat?.listSlug ?? feat.picks.enumIds.list ?? ''
    if (!option.classes.includes(list)) {
      return { spells: input.spells, inventory: input.inventory, changed: false, ok: false, message: 'Ритуал не из выбранного списка' }
    }
    if (!ritualCopyLevelAllowed(option.level, input.characterLevel)) {
      return {
        spells: input.spells,
        inventory: input.inventory,
        changed: false,
        ok: false,
        message: `Круг выше половины уровня (до ${halfLevelRoundedUp(input.characterLevel)})`,
      }
    }
    if (books.feat?.lost || !books.feat?.itemId) {
      return { spells: input.spells, inventory: input.inventory, changed: false, ok: false, message: 'Нет книги ритуалов' }
    }
  } else {
    if (!warlock || !ancientSecretsActive(input, warlock)) {
      return { spells: input.spells, inventory: input.inventory, changed: false, ok: false, message: 'Нет «Книги древних тайн»' }
    }
    if (!ritualCopyLevelAllowed(option.level, warlock.level)) {
      return {
        spells: input.spells,
        inventory: input.inventory,
        changed: false,
        ok: false,
        message: `Круг выше половины уровня колдуна (до ${halfLevelRoundedUp(warlock.level)})`,
      }
    }
    if (books.ancient_secrets?.lost || !books.ancient_secrets?.itemId) {
      return { spells: input.spells, inventory: input.inventory, changed: false, ok: false, message: 'Нет Книги теней' }
    }
  }

  const binding = input.kind === 'feat' ? books.feat : books.ancient_secrets
  const entries = [...(binding?.entries ?? [])]
  if (entries.some((row) => row.slug === option.slug)) {
    return { spells: input.spells, inventory: input.inventory, changed: false, ok: false, message: 'Уже в книге' }
  }
  const starters = entries.filter((row) => row.starter).length
  const free = input.kind === 'ancient_secrets' && option.level === 1 && starters < 2
  let inventory = input.inventory
  let costNote = 'бесплатно (два стартовых ритуала)'
  if (!free) {
    const cost = ritualTranscriptionCost(option.level)
    const paid = spendGpFromPurse(inventory.coins, cost.gp)
    if (!paid.ok) {
      return { spells: input.spells, inventory, changed: false, ok: false, message: paid.message }
    }
    inventory = { ...inventory, coins: paid.coins }
    costNote = `${cost.hours} ч, ${cost.gp} зм`
  }
  const entry: RitualBookEntry = {
    slug: option.slug,
    name: option.nameRu,
    level: option.level,
    listSlug: input.kind === 'feat' ? (books.feat?.listSlug ?? feat?.picks.enumIds.list ?? '') : option.classes[0] ?? '',
    ...(free ? { starter: true } : {}),
  }
  const nextBooks: RitualBooksState = {
    ...books,
    ...(input.kind === 'feat'
      ? { feat: { ...(books.feat ?? { itemId: null, lost: false }), entries: [...entries, entry] } }
      : {
          ancient_secrets: {
            ...(books.ancient_secrets ?? { itemId: null, lost: false }),
            entries: [...entries, entry],
          },
        }),
  }
  const synced = syncCastWithoutSlotGrants({
    ...input,
    spells: { ...input.spells, ritual_books: nextBooks },
    inventory,
  })
  return {
    ...synced,
    changed: true,
    ok: true,
    message: `В книгу: ${option.nameRu} · ${costNote}`,
  }
}

/** Player recovered the physical book. Contents already stored on the sheet return. */
export function recoverRitualBook(input: CastWithoutSlotsInput & {
  kind: RitualBookKind
}): CastWithoutSlotsResult {
  const books = { ...(input.spells.ritual_books ?? {}) }
  if (input.kind === 'feat') {
    books.feat = { ...(books.feat ?? { itemId: null, lost: false, entries: [] }), lost: false, itemId: null }
  } else {
    books.ancient_secrets = {
      ...(books.ancient_secrets ?? { itemId: null, lost: false, entries: [] }),
      lost: false,
      itemId: null,
    }
  }
  const synced = syncCastWithoutSlotGrants({
    ...input,
    spells: { ...input.spells, ritual_books: books },
  })
  return { ...synced, message: synced.message ?? 'Книга снова в инвентаре' }
}
