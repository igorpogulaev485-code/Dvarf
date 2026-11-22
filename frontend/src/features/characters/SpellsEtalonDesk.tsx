import { useMemo, useState } from 'react'

export type SpellMagicVariant = 'kaedrin' | 'multiclass' | 'warlock' | 'wizard'

type SpellCircle = 0 | 1 | 2 | 3 | 4 | 5

type SpellRow = {
  id: string
  circle: SpellCircle
  name: string
  level: string
  dmg?: string
  tags?: string
  meta: string
  school?: string
  granted?: boolean
  ritual?: boolean
  concentration?: boolean
  bookRitual?: boolean
  hidden?: boolean
}

const CIRCLES: Array<{ id: SpellCircle; title: string; count: string; slots?: string }> = [
  { id: 0, title: 'Заговоры', count: '1' },
  { id: 1, title: '1-й уровень', count: '4', slots: 'Ячейки 4/4' },
  { id: 2, title: '2-й уровень', count: '3', slots: 'Ячейки 3/3' },
  { id: 3, title: '3-й уровень', count: '0', slots: 'Ячейки 2/2' },
]

const SPELLS: SpellRow[] = [
  { id: 'sacred-flame', circle: 0, name: 'Священное пламя', level: 'заговор', dmg: '2к8 излучение', school: 'sch-evocation', meta: 'действие · 60 фт · Сл 14 Ловк. · В/С · воплощение' },
  { id: 'bless', circle: 1, name: 'Благословение', level: '1 ур.', dmg: 'союзники +1к4', tags: 'Архетип', school: 'sch-enchantment', granted: true, meta: 'действие · 30 фт · — · В/С/М · очарование · 1 мин', concentration: true },
  { id: 'cure', circle: 1, name: 'Лечение ран', level: '1 ур.', dmg: '1к8+3 хитов', tags: 'Архетип', school: 'sch-evocation', granted: true, meta: 'действие · Касание · — · В/С · воплощение' },
  { id: 'detect', circle: 1, name: 'Обнаружение магии', level: '1 ур.', school: 'sch-divination', meta: 'действие · На себя · — · В/С · прорицание · 10 мин', ritual: true, concentration: true, hidden: true },
  { id: 'sanctuary', circle: 1, name: 'Укрытие', level: '1 ур.', dmg: 'Умение: Убежище верных 1/1', school: 'sch-abjuration', granted: true, meta: 'бонус · 30 фт · — · В/С/М · ограждение · 1 мин' },
  { id: 'shield-faith', circle: 1, name: 'Щит веры', level: '1 ур. · 2/3 зар.', dmg: 'КД +2', tags: 'Наложение щита 2/3', school: 'sch-abjuration', granted: true, meta: 'бонус · 60 фт · — · В/С/М · ограждение · 10 мин', concentration: true },
  { id: 'spiritual', circle: 2, name: 'Духовное оружие', level: '2 ур.', dmg: '1к8+3 силовое', tags: 'Архетип', school: 'sch-evocation', granted: true, meta: 'бонус · 60 фт · атака · В/С · воплощение · 1 мин' },
  { id: 'lesser', circle: 2, name: 'Малое восстановление', level: '2 ур.', dmg: 'болезнь или состояние', tags: 'Архетип', school: 'sch-abjuration', granted: true, meta: 'действие · Касание · — · В/С · ограждение' },
  { id: 'prayer', circle: 2, name: 'Молитва лечения', level: '2 ур.', dmg: '2к8+3 хиты, до 6 существ', school: 'sch-evocation', meta: '10 мин · 30 фт · — · В · воплощение' },
]

/** Илис Чернильный, Волшебник 10 — лист sheet-desktop.html, data-set-demo-char=ilis. */
const WIZARD_CIRCLES: Array<{ id: SpellCircle; title: string; count: string; slots?: string }> = [
  { id: 0, title: 'Заговоры', count: '6' },
  { id: 1, title: '1-й уровень', count: '7', slots: 'Ячейки 4/4' },
  { id: 2, title: '2-й уровень', count: '3', slots: 'Ячейки 3/3' },
  { id: 3, title: '3-й уровень', count: '5', slots: 'Ячейки 3/3' },
  { id: 4, title: '4-й уровень', count: '3', slots: 'Ячейки 3/3' },
  { id: 5, title: '5-й уровень', count: '1', slots: 'Ячейки 2/2' },
]

const WIZARD_SPELLS: SpellRow[] = [
  { id: 'fire-bolt', circle: 0, name: 'Огненный снаряд', level: 'заговор', dmg: '2к10 огонь', meta: '' },
  { id: 'mage-hand', circle: 0, name: 'Волшебная рука', level: 'заговор', meta: '' },
  { id: 'prestidigitation', circle: 0, name: 'Фокусы', level: 'заговор', meta: '' },
  { id: 'minor-illusion', circle: 0, name: 'Малая иллюзия', level: 'заговор', meta: '' },
  { id: 'ray-frost', circle: 0, name: 'Луч холода', level: 'заговор', dmg: '2к8 холод', meta: '' },
  { id: 'light', circle: 0, name: 'Свет', level: 'заговор', tags: 'Раса: Высший эльф', granted: true, meta: '' },
  { id: 'mage-armor', circle: 1, name: 'Доспехи мага', level: '1 ур.', dmg: 'КД 13 + Ловк.', meta: '' },
  { id: 'magic-missile', circle: 1, name: 'Волшебная стрела', level: '1 ур.', dmg: '3×1к4+1 силовой', meta: '' },
  { id: 'shield', circle: 1, name: 'Щит', level: '1 ур.', dmg: 'КД +5', meta: '' },
  { id: 'w-detect', circle: 1, name: 'Обнаружение магии', level: '1 ур.', meta: '', concentration: true, bookRitual: true },
  { id: 'identify', circle: 1, name: 'Опознавание', level: '1 ур.', meta: '', bookRitual: true },
  { id: 'alarm', circle: 1, name: 'Сигнал тревоги', level: '1 ур.', meta: '', bookRitual: true },
  { id: 'find-familiar', circle: 1, name: 'Поиск фамильяра', level: '1 ур.', meta: '', bookRitual: true },
  { id: 'misty-step', circle: 2, name: 'Туманный шаг', level: '2 ур.', meta: '' },
  { id: 'scorching-ray', circle: 2, name: 'Палящий луч', level: '2 ур.', dmg: '3 луча, 2к6 огонь', meta: '' },
  { id: 'ink-mark', circle: 2, name: 'Метка чернил', level: 'своё 2 ур.', meta: '', concentration: true },
  { id: 'counterspell', circle: 3, name: 'Контрзаклинание', level: '3 ур.', meta: '' },
  { id: 'fireball', circle: 3, name: 'Огненный шар', level: '3 ур.', dmg: '8к6 огонь', meta: '' },
  { id: 'fly', circle: 3, name: 'Полёт', level: '3 ур.', dmg: 'скорость полёта 60 фт', meta: '', concentration: true },
  { id: 'haste', circle: 3, name: 'Ускорение', level: '3 ур.', meta: '', concentration: true },
  { id: 'tiny-hut', circle: 3, name: 'Леомундова хижина', level: '3 ур.', meta: '', bookRitual: true },
  { id: 'polymorph', circle: 4, name: 'Превращение', level: '4 ур.', meta: '', concentration: true },
  { id: 'greater-invis', circle: 4, name: 'Высшая невидимость', level: '4 ур.', meta: '', concentration: true },
  { id: 'dimension-door', circle: 4, name: 'Переносящая дверь', level: '4 ур.', meta: '' },
  { id: 'telekinesis', circle: 5, name: 'Телекинез', level: '5 ур.', meta: '', concentration: true },
]

const CASTER_CHIPS: Record<SpellMagicVariant, Array<{ cls: string; name: string; abil: string; stats: string; quota: string }>> = {
  kaedrin: [{ cls: 'is-wis', name: 'Жрец', abil: 'МУД', stats: 'Сл 14 · +6', quota: 'подг. 1/8 · всегда 5' }],
  multiclass: [
    { cls: 'is-wis', name: 'Жрец', abil: 'МУД', stats: 'Сл 14 · +6', quota: 'подг. 1/8 · всегда 5' },
    { cls: 'is-int', name: 'Волшебник', abil: 'ИНТ', stats: 'Сл 11 · +3', quota: 'подг. 1/8, в книге 8' },
  ],
  warlock: [
    { cls: 'is-cha', name: 'Паладин', abil: 'ХАР', stats: 'Сл 12 · +4', quota: 'подг. 1/8 · всегда 5' },
    { cls: 'is-wis', name: 'Жрец', abil: 'МУД', stats: 'Сл 14 · +6', quota: 'подг. 1/8 · всегда 5' },
    { cls: 'is-int', name: 'Волшебник', abil: 'ИНТ', stats: 'Сл 11 · +3', quota: 'подг. 1/8, в книге 8' },
    { cls: 'is-cha', name: 'Колдун', abil: 'ХАР', stats: 'Сл 12 · +4', quota: 'изв. 8/6' },
  ],
  wizard: [{ cls: 'is-int', name: 'Волшебник', abil: 'ИНТ', stats: 'Сл 16 · +8', quota: 'подг. 14/14, в книге 24' }],
}

type FilterId = 'all' | 'cantrips' | 'rituals' | 'concentration' | '0' | '1' | '2' | '3'

function SchoolSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <symbol id="sch-abjuration" viewBox="0 0 96 96">
        <path d="M48 8 L78 20 L78 46 C78 68 62 82 48 90 C34 82 18 68 18 46 L18 20 Z" />
        <path d="M48 14 L72 24 L72 46 C72 64 58 76 48 82 C38 76 24 64 24 46 L24 24 Z" />
        <circle cx="48" cy="46" r="12" />
        <path d="M48 34 L48 58 M36 46 L60 46" />
        <path d="M40 38 L56 54 M56 38 L40 54" />
      </symbol>
      <symbol id="sch-divination" viewBox="0 0 96 96">
        <circle cx="48" cy="40" r="24" />
        <circle cx="48" cy="40" r="18" />
        <ellipse cx="48" cy="40" rx="14" ry="8" />
        <circle cx="48" cy="40" r="4" />
        <path d="M48 36 L48 44 M46 40 L50 40" />
        <path d="M36 62 L40 72 L56 72 L60 62" />
        <path d="M32 80 L40 72 M64 80 L56 72" />
        <path d="M28 80 L68 80" />
        <path d="M48 16 L48 10 M22 32 L16 28 M74 32 L80 28" />
      </symbol>
      <symbol id="sch-enchantment" viewBox="0 0 96 96">
        <path d="M48 30 C48 22 40 16 32 20 C22 26 22 40 32 50 L48 68 L64 50 C74 40 74 26 64 20 C56 16 48 22 48 30 Z" />
        <ellipse cx="48" cy="40" rx="10" ry="6" />
        <circle cx="48" cy="40" r="2.6" />
        <path d="M20 18 L24 26 L16 24 M76 18 L72 26 L80 24" />
        <path d="M14 48 L20 50 M82 48 L76 50" />
        <path d="M28 76 L32 70 M68 76 L64 70" />
        <path d="M48 74 L48 82 M44 78 L52 78" />
        <path d="M18 66 L22 62 M78 66 L74 62" />
      </symbol>
      <symbol id="sch-evocation" viewBox="0 0 96 96">
        <path d="M48 88 C28 88 22 68 30 54 C26 46 28 36 36 32 C34 44 40 46 42 36 C44 24 50 16 48 8 C62 18 70 32 66 48 C78 50 80 68 66 78 C72 70 62 66 58 72 C54 82 52 88 48 88 Z" />
        <path d="M46 80 C38 72 40 60 48 52 C52 62 58 64 56 74" />
        <path d="M20 30 L14 24 M76 30 L82 24 M16 54 L10 54 M80 54 L86 54 M28 16 L24 10 M68 16 L72 10" />
      </symbol>
    </svg>
  )
}

/** Desktop spell column from sheet-desktop.html. Phone keeps PlayDeskSpellsCompact. */
export function SpellsEtalonDesk({
  variant = 'kaedrin',
  onClearSplit,
  onOpenSettings,
}: {
  variant?: SpellMagicVariant
  onClearSplit?: () => void
  onOpenSettings?: () => void
}) {
  const [filter, setFilter] = useState<FilterId>('all')
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set())

  const catalog = variant === 'wizard' ? WIZARD_SPELLS : SPELLS
  const circles = variant === 'wizard' ? WIZARD_CIRCLES : CIRCLES
  const showBook = variant !== 'kaedrin'
  const circleFilters: SpellCircle[] = variant === 'wizard' ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3]

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((spell) => {
      if (spell.hidden && filter !== 'all' && !q) return false
      if (filter === 'cantrips' && spell.circle !== 0) return false
      if (filter === 'rituals' && !spell.ritual) return false
      if (filter === 'concentration' && !spell.concentration) return false
      if (filter === '0' || filter === '1' || filter === '2' || filter === '3') {
        if (String(spell.circle) !== filter) return false
      }
      if (!q) return true
      return `${spell.name} ${spell.meta}`.toLowerCase().includes(q)
    })
  }, [catalog, filter, query])

  return (
    <>
      <SchoolSprite />
      <h2>
        Заклинания (закреплено)
        <span className="links">
          <button type="button" className="ghost" title="Скрыть магию — основная панель на всю ширину" onClick={onClearSplit}>
            Скрыть магию
          </button>
          <button type="button" className="ghost" title="Магия: подготовка, настройки" onClick={onOpenSettings}>
            Магия
          </button>
        </span>
      </h2>
      <div className="spell-cast-row">
        {CASTER_CHIPS[variant].map((chip) => (
          <button key={`${chip.name}-${chip.stats}`} type="button" className={`cast-chip ${chip.cls}`} aria-label="Сл. спас. и атака заклинаний">
            <span className="cast-chip__profile">
              {chip.name} · <span className="cast-chip__abil">{chip.abil}</span> · {chip.stats}
            </span>
            <span className="cast-chip__quota">{chip.quota}</span>
          </button>
        ))}
      </div>
      <div className="spell-head-tools">
        <button type="button" className="chip is-on" aria-pressed="true">Фокус <span className="chip-mark">✓</span></button>
        <button type="button" className="chip is-on" aria-pressed="true">Мешочек <span className="chip-mark">✓</span></button>
        {showBook ? (
          <button type="button" className="ghost" title="Ритуалы из книги — каст без ячейки">Ритуалы из книги</button>
        ) : null}
      </div>
      <div className="filters">
        {(
          [
            ['all', 'все'],
            ['cantrips', 'заговоры'],
            ['rituals', 'ритуалы'],
            ['concentration', 'концентрация'],
          ] as Array<[FilterId, string]>
        ).map(([id, label]) => (
          <button key={id} type="button" className={`chip${filter === id ? ' is-on' : ''}`} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
        {showBook ? (
          <button type="button" className={`chip${filter === 'rituals' ? '' : ''}`}>ритуалы из книги</button>
        ) : null}
        <span className="filters-sep" aria-hidden="true" />
        {circleFilters.map((circle) => (
          <button
            key={circle}
            type="button"
            className={`chip${filter === String(circle) ? ' is-on' : ''}`}
            onClick={() => setFilter(String(circle) as FilterId)}
          >
            {circle}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="spell-search">Поиск заклинания</label>
      <input
        id="spell-search"
        type="search"
        placeholder="Поиск по названию"
        aria-label="Поиск заклинания"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="spell-collapse-row">
        <button type="button" className="chip" onClick={() => setCollapsed(new Set([0, 1, 2, 3]))}>Свернуть все</button>
        <button type="button" className="chip" onClick={() => setCollapsed(new Set())}>Развернуть все</button>
        <button type="button" className="chip">Сбросить порядок (А–Я)</button>
      </div>
      <div className="list">
        {circles.map((circle) => {
          const rows = shown.filter((spell) => spell.circle === circle.id)
          if (filter !== 'all' && rows.length === 0 && circle.id === 3 && filter !== '3') return null
          if ((filter === 'cantrips' || filter === 'rituals' || filter === 'concentration' || filter === '0' || filter === '1' || filter === '2') && rows.length === 0) return null
          const isCollapsed = collapsed.has(circle.id)
          return (
            <div
              key={circle.id}
              className={`spell-circle${isCollapsed ? ' is-collapsed' : ''}${rows.length === 0 ? ' is-empty' : ''}`}
            >
              <div className="circle-head">
                <button
                  type="button"
                  className="circle-toggle"
                  aria-expanded={!isCollapsed}
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev)
                      if (next.has(circle.id)) next.delete(circle.id)
                      else next.add(circle.id)
                      return next
                    })
                  }
                >
                  <span className="circle-chevron" aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
                  <strong>{circle.title}</strong>
                  <span className="circle-count">{circle.count}</span>
                </button>
                {circle.slots ? (
                  <span className="slots" aria-label={circle.slots}>
                    <span className="slot-count">{circle.slots}</span>
                    {Array.from({ length: Number(circle.slots.match(/(\d+)\/(\d+)/)?.[2] ?? 0) }).map((_, index) => (
                      <button key={index} type="button" className="pip is-on" aria-label={`Ячейка ${index + 1}`} />
                    ))}
                  </span>
                ) : null}
              </div>
              {rows.map((spell) => (
                <article
                  key={spell.id}
                  className={`plaque is-spell${spell.granted ? ' is-granted' : ''}`}
                  hidden={spell.hidden || undefined}
                >
                  {spell.school ? (
                    <div className="plaque-art" aria-hidden="true">
                      <svg viewBox="0 0 96 96" className="icon-ink" width="100%" height="100%">
                        <use href={`#${spell.school}`} />
                      </svg>
                    </div>
                  ) : null}
                  <div className="plaque__body">
                    <div className="spell-top">
                      <button type="button" className="plaque__name">{spell.name}</button>
                      <span className="spell-level">{spell.level}</span>
                      {spell.dmg ? <span className="spell-dmg">{spell.dmg}</span> : null}
                      {spell.tags ? <span className="spell-level">{spell.tags}</span> : null}
                      {spell.concentration ? <span className="spell-flag is-conc">конц.</span> : null}
                      {spell.ritual ? <span className="spell-flag is-ritual">ритуал</span> : null}
                      {spell.bookRitual ? <span className="spell-flag">ритуал · из книги</span> : null}
                    </div>
                    {spell.meta ? <div className="plaque__meta">{spell.meta}</div> : null}
                  </div>
                  <div className="plaque__actions">
                    <button type="button" className="primary">Каст</button>
                  </div>
                </article>
              ))}
            </div>
          )
        })}
      </div>
    </>
  )
}
