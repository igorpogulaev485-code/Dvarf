import { displayLabel, type TextBlock } from './textBlocks'

const SOCIAL_KEYS = [
  'personality',
  'ideals',
  'bonds',
  'flaws',
  'appearance',
  'background',
  'quests',
] as const

type PlayDeskSocialCompactProps = {
  textBlocks: TextBlock[]
  onOpenFull: () => void
  onToast?: (message: string) => void
}

function previewText(value: string, max = 120): string {
  const flat = value.replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 1)}…`
}

export function PlayDeskSocialCompact({
  textBlocks,
  onOpenFull,
  onToast,
}: PlayDeskSocialCompactProps) {
  const byKey = new Map(textBlocks.map((block) => [block.key, block]))
  const socialBlocks = SOCIAL_KEYS.map((key) => byKey.get(key)).filter(
    (block): block is TextBlock => Boolean(block) && !(block as TextBlock).isHidden,
  )
  const filled = socialBlocks.filter((block) => block.value.trim())
  const customNotes = textBlocks.filter(
    (block) =>
      block.isCustom &&
      !block.isHidden &&
      block.value.trim() &&
      !(SOCIAL_KEYS as readonly string[]).includes(block.key),
  )

  const cards = [...filled, ...customNotes].slice(0, 8)

  return (
    <div className="play-desk-compact">
      <div className="play-desk-compact__head">
        <h3>Тексты и заметки</h3>
        <button type="button" className="play-desk-compact__link" onClick={onOpenFull}>
          полностью
        </button>
      </div>

      <div className="play-desk-compact__cards">
        {cards.length === 0 ? (
          <p className="play-desk-compact__empty">
            Нет заполненных блоков личности — откройте полную панель
          </p>
        ) : (
          cards.map((block) => {
            const label = displayLabel(block)
            const preview = previewText(block.value)
            return (
              <button
                key={block.key}
                type="button"
                className="play-desk-compact__card is-action"
                onClick={() => onToast?.(`${label}: ${preview || 'пусто'}`)}
              >
                <div className="play-desk-compact__card-meta">
                  <span>{label}</span>
                  <span className="play-desk-compact__tag">
                    {block.isCustom ? 'заметка' : 'личность'}
                  </span>
                </div>
                <p>{preview || '—'}</p>
              </button>
            )
          })
        )}
      </div>

      {socialBlocks.length > filled.length ? (
        <p className="play-desk-compact__more">
          Пустых блоков личности: {socialBlocks.length - filled.length} · правка в полной панели
        </p>
      ) : null}
    </div>
  )
}
