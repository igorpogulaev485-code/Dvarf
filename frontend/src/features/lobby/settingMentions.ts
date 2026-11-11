/** C6: парсинг и рендер @mentions / [[Title]] в тексте вики. */

import type { SettingPage } from '../../shared/api/lobbies'

function bracketRe() {
  return /\[\[([^\]]{1,200})\]\]/g
}

function atRe() {
  // Имя до пробела/скобки; _ → пробел при normalize.
  // Не используем \w+/u — в JS ломает кириллические @упоминания.
  return /(?<![\p{L}\p{N}_@])@([^\s\[\]@]{1,200})/gu
}

export function normalizeMentionTitle(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?…]+$/u, '')
    .trim()
}

export function extractMentionTitles(body: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const match of body.matchAll(bracketRe())) {
    const title = normalizeMentionTitle(match[1] ?? '')
    const key = title.toLowerCase()
    if (title && !seen.has(key)) {
      seen.add(key)
      out.push(title)
    }
  }
  for (const match of body.matchAll(atRe())) {
    const title = normalizeMentionTitle(match[1] ?? '')
    const key = title.toLowerCase()
    if (title && !seen.has(key)) {
      seen.add(key)
      out.push(title)
    }
  }
  return out
}

export type MentionSegment =
  | { type: 'text'; text: string }
  | {
      type: 'mention'
      raw: string
      title: string
      page: SettingPage | null
      hidden: boolean
    }

/** Разбить body на текст и упоминания для рендера. */
export function segmentMentionBody(
  body: string,
  pages: SettingPage[],
  opts?: { isOwner?: boolean },
): MentionSegment[] {
  const isOwner = opts?.isOwner ?? true
  const byTitle = new Map<string, SettingPage>()
  for (const page of pages) {
    const key = page.title.trim().toLowerCase()
    if (key && !byTitle.has(key)) byTitle.set(key, page)
  }

  type Hit = { start: number; end: number; title: string; raw: string }
  const hits: Hit[] = []
  for (const match of body.matchAll(bracketRe())) {
    if (match.index == null) continue
    hits.push({
      start: match.index,
      end: match.index + match[0].length,
      title: normalizeMentionTitle(match[1] ?? ''),
      raw: match[0],
    })
  }
  for (const match of body.matchAll(atRe())) {
    if (match.index == null) continue
    // Хвостовая пунктуация остаётся в тексте, не в mention
    const raw = match[0].replace(/[.,;:!?…]+$/u, '')
    hits.push({
      start: match.index,
      end: match.index + raw.length,
      title: normalizeMentionTitle(match[1] ?? ''),
      raw,
    })
  }
  hits.sort((a, b) => a.start - b.start)

  const segments: MentionSegment[] = []
  let cursor = 0
  for (const hit of hits) {
    if (hit.start < cursor) continue
    if (hit.start > cursor) {
      segments.push({ type: 'text', text: body.slice(cursor, hit.start) })
    }
    const page = byTitle.get(hit.title.toLowerCase()) ?? null
    const hidden = !isOwner && (!page || !page.revealed)
    segments.push({
      type: 'mention',
      raw: hit.raw,
      title: hit.title,
      page,
      hidden,
    })
    cursor = hit.end
  }
  if (cursor < body.length) {
    segments.push({ type: 'text', text: body.slice(cursor) })
  }
  return segments
}
