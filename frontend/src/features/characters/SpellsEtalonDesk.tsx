import { useMemo, useState } from 'react'

type SpellRow = {
  id: string
  circle: 0 | 1 | 2 | 3
  name: string
  level: string
  dmg?: string
  tags?: string
  meta: string
  ritual?: boolean
  concentration?: boolean
  hidden?: boolean
}

const CIRCLES: Array<{ id: 0 | 1 | 2 | 3; title: string; count: string; slots?: string }> = [
  { id: 0, title: 'Заговоры', count: '1' },
  { id: 1, title: '1-й уровень', count: '5', slots: 'Ячейки 4/4' },
  { id: 2, title: '2-й уровень', count: '3', slots: 'Ячейки 3/3' },
  { id: 3, title: '3-й уровень', count: '0', slots: 'Ячейки 2/2' },
]

const SPELLS: SpellRow[] = [
  { id: 'sacred-flame', circle: 0, name: 'Священное пламя', level: 'заговор', dmg: '2к8 излучение', meta: 'действие · 60 фт · Сл 14 Ловк. · В/С · воплощение' },
  { id: 'bless', circle: 1, name: 'Благословение', level: '1 ур.', dmg: 'союзники +1к4', tags: 'Архетип', meta: 'конц. действие · 30 фт · — · В/С/М · очарование · 1 мин', concentration: true },
  { id: 'cure', circle: 1, name: 'Лечение ран', level: '1 ур.', dmg: '1к8+3 хитов', tags: 'Архетип', meta: 'действие · Касание · — · В/С · воплощение' },
  { id: 'detect', circle: 1, name: 'Обнаружение магии', level: '1 ур.', tags: 'ритуал', meta: 'конц. действие · На себя · — · В/С · прорицание · 10 мин', ritual: true, concentration: true, hidden: true },
  { id: 'sanctuary', circle: 1, name: 'Укрытие', level: '1 ур.', dmg: 'Умение: Убежище верных 1/1', meta: 'бонус · 30 фт · — · В/С/М · ограждение · 1 мин' },
  { id: 'shield-faith', circle: 1, name: 'Щит веры', level: '1 ур. · 2/3 зар.', dmg: 'КД +2', tags: 'Наложение щита 2/3', meta: 'конц. бонус · 60 фт · — · В/С/М · ограждение', concentration: true },
  { id: 'spiritual', circle: 2, name: 'Духовное оружие', level: '2 ур.', dmg: '1к8+3 силовое', tags: 'Архетип', meta: 'бонус · 60 фт · атака · В/С · воплощение · 1 мин' },
  { id: 'lesser', circle: 2, name: 'Малое восстановление', level: '2 ур.', dmg: 'болезнь или состояние', tags: 'Архетип', meta: 'действие · Касание · — · В/С · ограждение' },
  { id: 'prayer', circle: 2, name: 'Молитва лечения', level: '2 ур.', dmg: '2к8+3 хиты, до 6 существ', meta: '10 мин · 30 фт · — · В · воплощение' },
]

type FilterId = 'all' | 'cantrips' | 'rituals' | 'concentration' | '0' | '1' | '2' | '3'

/** Desktop spell column from sheet-desktop.html. Phone keeps PlayDeskSpellsCompact. */
export function SpellsEtalonDesk({
  onClearSplit,
  onOpenSettings,
}: {
  onClearSplit?: () => void
  onOpenSettings?: () => void
}) {
  const [filter, setFilter] = useState<FilterId>('all')
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set())

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SPELLS.filter((spell) => {
      if (spell.hidden && filter === 'all' && !q) return false
      if (filter === 'cantrips' && spell.circle !== 0) return false
      if (filter === 'rituals' && !spell.ritual) return false
      if (filter === 'concentration' && !spell.concentration) return false
      if (filter === '0' || filter === '1' || filter === '2' || filter === '3') {
        if (String(spell.circle) !== filter) return false
      }
      if (!q) return true
      return `${spell.name} ${spell.meta}`.toLowerCase().includes(q)
    })
  }, [filter, query])

  return (
    <>
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
        <button type="button" className="cast-chip is-wis" aria-label="Сл. спас. и атака заклинаний">
          <span className="cast-chip__profile">
            Жрец · <span className="cast-chip__abil">МУД</span> · Сл 14 · +6
          </span>
          <span className="cast-chip__quota">подг. 1/8 · всегда 5</span>
        </button>
      </div>
      <div className="spell-head-tools">
        <button type="button" className="chip is-on" aria-pressed="true">Фокус ✓</button>
        <button type="button" className="chip is-on" aria-pressed="true">Мешочек ✓</button>
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
        <span className="filters-sep" aria-hidden="true" />
        {([0, 1, 2, 3] as const).map((circle) => (
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
        {CIRCLES.map((circle) => {
          const rows = shown.filter((spell) => spell.circle === circle.id && !spell.hidden)
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
                <article key={spell.id} className="plaque is-spell">
                  <div className="plaque__body">
                    <div className="spell-top">
                      <button type="button" className="plaque__name">{spell.name}</button>
                      <span className="spell-level">{spell.level}</span>
                      {spell.dmg ? <span className="spell-dmg">{spell.dmg}</span> : null}
                      {spell.tags ? <span className="spell-level">{spell.tags}</span> : null}
                    </div>
                    <div className="plaque__meta">{spell.meta}</div>
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
