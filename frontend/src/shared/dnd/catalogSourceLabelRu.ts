/** Russian book names for catalog `source` ids (cards, detail panels, filters). */

import { BOOK_SOURCE_CATALOG } from '../../features/lobby/campaignRules'

/** D&D 2024 era sources (backend `catalog_entries.source`). Keys are lowercase. */
const SOURCE_LABEL_RU_2024: Record<string, string> = {
  'srd-5.2': 'СРД 5.2',
  'srd-5.2.1': 'СРД 5.2',
  srd52: 'СРД 5.2',
  ph24: 'Книга игрока 2024',
  dmg24: 'Руководство мастера 2024',
  mm24: 'Бестиарий 2024',
  efa: 'Эберрон: Кузница артефактора',
  frhof: 'Герои Фаэруна',
  fraif: 'Приключения в Фаэруне',
  nsf: 'Падение Нетерила',
  abh: 'Книга голода Астариона',
  lfl: 'Лорвин: Первый свет',
  rtw: 'Равенлофт: Ужасы внутри',
  au: 'Неудержимая магия',
  aud: 'Неудержимая магия: Дедфолл',
}

const FALLBACK_LABEL_RU = 'Другой источник'

function hasCyrillic(value: string): boolean {
  return /[А-Яа-яЁё]/.test(value)
}

/**
 * Human-readable Russian label for a catalog source id.
 * Never returns a bare Latin id (`srd-5.2`, `ph24`) — unknown ids become «Другой источник».
 */
export function catalogSourceLabelRu(source: string | null | undefined): string | null {
  const raw = (source ?? '').trim()
  if (!raw) return null
  const key = raw.toLowerCase()
  const edition2024 = SOURCE_LABEL_RU_2024[key]
  if (edition2024) return edition2024
  for (const book of BOOK_SOURCE_CATALOG) {
    if (book.aliases.some((alias) => alias.toLowerCase() === key)) return book.label_ru
  }
  return hasCyrillic(raw) ? raw : FALLBACK_LABEL_RU
}

export const CATALOG_SOURCE_FALLBACK_RU = FALLBACK_LABEL_RU

/** Ids with an explicit 2024 label (selfcheck / docs). */
export const CATALOG_SOURCE_IDS_2024 = Object.keys(SOURCE_LABEL_RU_2024)
