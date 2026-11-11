/**
 * PHB 2014 alignments. Slugs match catalog kind=alignment.
 * The sheet stores the slug; the Russian name is what the player sees.
 */

export type AlignmentSlug =
  | 'lawful_good'
  | 'neutral_good'
  | 'chaotic_good'
  | 'lawful_neutral'
  | 'neutral'
  | 'chaotic_neutral'
  | 'lawful_evil'
  | 'neutral_evil'
  | 'chaotic_evil'
  | 'unaligned'

export type AlignmentEntry = {
  slug: AlignmentSlug
  nameRu: string
  nameEn: string
}

export const ALIGNMENTS: readonly AlignmentEntry[] = [
  { slug: 'lawful_good', nameRu: 'Законно-добрый', nameEn: 'Lawful Good' },
  { slug: 'neutral_good', nameRu: 'Нейтрально-добрый', nameEn: 'Neutral Good' },
  { slug: 'chaotic_good', nameRu: 'Хаотично-добрый', nameEn: 'Chaotic Good' },
  { slug: 'lawful_neutral', nameRu: 'Законно-нейтральный', nameEn: 'Lawful Neutral' },
  { slug: 'neutral', nameRu: 'Нейтральный', nameEn: 'Neutral' },
  { slug: 'chaotic_neutral', nameRu: 'Хаотично-нейтральный', nameEn: 'Chaotic Neutral' },
  { slug: 'lawful_evil', nameRu: 'Законно-злой', nameEn: 'Lawful Evil' },
  { slug: 'neutral_evil', nameRu: 'Нейтрально-злой', nameEn: 'Neutral Evil' },
  { slug: 'chaotic_evil', nameRu: 'Хаотично-злой', nameEn: 'Chaotic Evil' },
  { slug: 'unaligned', nameRu: 'Без мировоззрения', nameEn: 'Unaligned' },
] as const

const BY_SLUG = new Map(ALIGNMENTS.map((row) => [row.slug, row]))

const PHRASES: Record<string, AlignmentSlug> = {}
for (const row of ALIGNMENTS) {
  PHRASES[normalizeAlignmentText(row.nameRu)] = row.slug
  PHRASES[normalizeAlignmentText(row.nameEn)] = row.slug
  PHRASES[normalizeAlignmentText(row.slug)] = row.slug
}
Object.assign(PHRASES, {
  'законопослушный добрый': 'lawful_good',
  'законопослушно добрый': 'lawful_good',
  'нейтральный добрый': 'neutral_good',
  'хаотический добрый': 'chaotic_good',
  'хаотичный добрый': 'chaotic_good',
  'законопослушный нейтральный': 'lawful_neutral',
  'законопослушно нейтральный': 'lawful_neutral',
  'истинно нейтральный': 'neutral',
  'истинный нейтральный': 'neutral',
  'true neutral': 'neutral',
  'хаотический нейтральный': 'chaotic_neutral',
  'хаотичный нейтральный': 'chaotic_neutral',
  'законопослушный злой': 'lawful_evil',
  'законопослушно злой': 'lawful_evil',
  'нейтральный злой': 'neutral_evil',
  'хаотический злой': 'chaotic_evil',
  'хаотичный злой': 'chaotic_evil',
  'без мировоззрения': 'unaligned',
  'нет мировоззрения': 'unaligned',
  'неприсоединившийся': 'unaligned',
} satisfies Record<string, AlignmentSlug>)

const ABBREV: Record<string, AlignmentSlug> = {
  lg: 'lawful_good',
  зд: 'lawful_good',
  ng: 'neutral_good',
  нд: 'neutral_good',
  cg: 'chaotic_good',
  хд: 'chaotic_good',
  ln: 'lawful_neutral',
  зн: 'lawful_neutral',
  n: 'neutral',
  tn: 'neutral',
  ин: 'neutral',
  cn: 'chaotic_neutral',
  хн: 'chaotic_neutral',
  le: 'lawful_evil',
  зз: 'lawful_evil',
  ne: 'neutral_evil',
  нз: 'neutral_evil',
  ce: 'chaotic_evil',
  хз: 'chaotic_evil',
}

export function isAlignmentSlug(value: string): value is AlignmentSlug {
  return BY_SLUG.has(value as AlignmentSlug)
}

export function alignmentNameRu(slug: string | null | undefined): string {
  if (!slug) return ''
  return BY_SLUG.get(slug as AlignmentSlug)?.nameRu ?? ''
}

export function normalizeAlignmentText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[—–_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Catalog slug, or null when the wording must be kept. */
export function recognizeAlignment(value: string | null | undefined): AlignmentSlug | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null
  if (isAlignmentSlug(raw)) return raw
  const phrase = normalizeAlignmentText(raw)
  if (PHRASES[phrase]) return PHRASES[phrase]
  const compact = phrase.replace(/[^a-zа-я0-9]/g, '')
  if (compact.length <= 3 && ABBREV[compact]) return ABBREV[compact]
  return null
}

export function alignmentSheetLabel(input: {
  alignment: string
  alignmentText: string
}): string {
  const named = alignmentNameRu(input.alignment)
  if (named) return named
  return input.alignmentText.trim()
}

export function alignmentNeedsClarification(input: {
  alignment: string
  alignmentText: string
}): boolean {
  return !alignmentNameRu(input.alignment) && Boolean(input.alignmentText.trim())
}

const GOOD = new Set<AlignmentSlug>(['lawful_good', 'neutral_good', 'chaotic_good'])
const EVIL = new Set<AlignmentSlug>(['lawful_evil', 'neutral_evil', 'chaotic_evil'])
const LAWFUL = new Set<AlignmentSlug>(['lawful_good', 'lawful_neutral', 'lawful_evil'])
const CHAOTIC = new Set<AlignmentSlug>(['chaotic_good', 'chaotic_neutral', 'chaotic_evil'])
/** Gray robe: not good and not evil. */
const NEUTRAL_AXIS = new Set<AlignmentSlug>(['lawful_neutral', 'neutral', 'chaotic_neutral'])

export function alignmentMatchesRequirement(slug: string, requirement: string): boolean {
  if (!isAlignmentSlug(slug)) return false
  if (requirement === 'good') return GOOD.has(slug)
  if (requirement === 'evil') return EVIL.has(slug)
  if (requirement === 'lawful') return LAWFUL.has(slug)
  if (requirement === 'chaotic') return CHAOTIC.has(slug)
  if (requirement === 'neutral') return NEUTRAL_AXIS.has(slug)
  return slug === requirement
}
