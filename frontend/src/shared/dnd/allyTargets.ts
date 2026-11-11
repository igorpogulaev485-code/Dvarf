/** Эффекты/способности, которые целят союзников (или включают себя). */

const ALLY_NAME_RE =
  /благословен|bless|ускорен|haste|щит\s*вер|shield of faith|наставлен|guidance|помощ[ьи]|\baid\b|героизм|heroism|вардинг|warding bond|вдохновен|inspiration|инфуз|infusion|усиленн|enhanced (defense|weapon|arcane)|бафф?|\bбаф\b/i

/** catalog_id / slug (shield_of_faith, bless, …) — надёжнее имени. */
const ALLY_CATALOG_RE =
  /shield_of_faith|\bbless\b|\baid\b|\bhaste\b|\bheroism\b|warding_bond|\bguidance\b|beacon_of_hope|enhance_ability/i

/** Ресурсы листа, которые при трате открывают выбор целей (уже чем заклинания). */
const RESOURCE_ALLY_RE = /вдохновен|inspiration|инфуз|infusion/i

/** Сколько слотов целей показать (Bless/Aid = 3); заполнение необязательно. */
const MULTI_TARGET_RE = /благословен|bless|помощ[ьи]|\baid\b/i

const MULTI_CATALOG_RE = /\bbless\b|\baid\b/i

function normName(name: string | null | undefined): string {
  return String(name ?? '').trim()
}

function normCatalogId(catalogId: string | null | undefined): string {
  return String(catalogId ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
}

export function guessAppliesToAllies(
  name: string,
  catalogId?: string | null,
): boolean {
  const id = normCatalogId(catalogId)
  if (id && ALLY_CATALOG_RE.test(id)) return true
  const label = normName(name)
  return Boolean(label) && ALLY_NAME_RE.test(label)
}

/** Авто-флаг ресурса при чтении листа (вдохновение / инфузия). */
export function guessResourceAppliesToAllies(name: string): boolean {
  return RESOURCE_ALLY_RE.test(normName(name))
}

export function guessAllyTargetCount(
  name: string,
  catalogId?: string | null,
): number {
  const id = normCatalogId(catalogId)
  if (id && MULTI_CATALOG_RE.test(id)) return 3
  if (MULTI_TARGET_RE.test(normName(name))) return 3
  return 1
}
