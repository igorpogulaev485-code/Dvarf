import { useMemo, useState } from 'react'

type Feat = {
  group: string
  name: string
  source: string
  meta: string
  resource?: boolean
}

const GROUPS: Array<{ title: string; items: Feat[] }> = [
  {
    title: 'Горный дварф · 6',
    items: [
      { group: 'race', name: 'Тёмное зрение 60 фт.', source: 'Горный дварф', meta: 'в темноте на 60 фт.' },
      { group: 'race', name: 'Устойчивость дварфов', source: 'Горный дварф', meta: 'У тебя преимущество на спасброски против яда и сопротивление урону ядом.' },
      { group: 'race', name: 'Дварфийская боевая тренировка', source: 'Горный дварф', meta: 'Ты владеешь боевым топором, ручным топором, лёгким и боевым молотом.' },
      { group: 'race', name: 'Владение инструментами', source: 'Горный дварф', meta: 'Ты владеешь одним набором инструментов на выбор: кузнеца, каменщика или пивовара.' },
      { group: 'race', name: 'Знание камня', source: 'Горный дварф', meta: 'Если ты проверяешь Историю, связанную с каменной работой, бонус мастерства удваивается …' },
      { group: 'race', name: 'Владение доспехами дварфов', source: 'Горный дварф', meta: 'Ты владеешь лёгкими и средними доспехами.' },
    ],
  },
  {
    title: 'Прислужник · 1',
    items: [
      { group: 'bg', name: 'Приют для верующих', source: 'Прислужник', meta: 'Вы и ваши спутники можешь рассчитывать на бесплатное лечение и уход в храмах, святынях …' },
    ],
  },
  {
    title: 'Жрец 5 · 5',
    items: [
      { group: 'class', name: 'Божественный домен', source: 'Жрец', meta: 'Пассив' },
      { group: 'class', name: 'Использование заклинаний', source: 'Жрец', meta: 'Пассив' },
      { group: 'class', name: 'Божественный канал', source: 'Жрец', meta: '1/1 · короткий отдых', resource: true },
      { group: 'class', name: 'Изгнание нежити', source: 'Жрец', meta: '1/1 · короткий отдых', resource: true },
      { group: 'class', name: 'Уничтожение нежити', source: 'Жрец', meta: 'Пассив' },
    ],
  },
  {
    title: 'Жизнь · 2',
    items: [
      { group: 'sub', name: 'Ученик жизни', source: 'Жизнь', meta: 'Пассив' },
      { group: 'sub', name: 'Канал: Сохранение жизни', source: 'Жизнь', meta: '1/1 · короткий отдых', resource: true },
    ],
  },
]

type FilterId = 'all' | 'resource' | 'passive'

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'resource', label: 'С ресурсом' },
  { id: 'passive', label: 'Пассивные' },
]

/** Desktop «Способности» from the frozen sheet. Phone keeps ClassFeaturesPanel. */
export function FeaturesEtalonDesk() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')
  const [open, setOpen] = useState(true)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (filter === 'resource' && !item.resource) return false
        if (filter === 'passive' && item.resource) return false
        if (!q) return true
        return `${item.name} ${item.meta} ${item.source}`.toLowerCase().includes(q)
      }),
    })).filter((group) => group.items.length > 0)
  }, [filter, query])

  return (
    <>
      <h2>
        Способности
        <span className="links">
          <button type="button" className="ghost">+ Добавить способность</button>
          <button type="button" className="ghost">+1 уровень</button>
        </span>
      </h2>
      <label className="sr-only" htmlFor="feat-search">Поиск способности</label>
      <input
        id="feat-search"
        className="scene-search"
        type="search"
        placeholder="Избранный, стиль боя…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="filters" role="tablist" aria-label="Фильтр способностей">
        {FILTERS.map((row) => (
          <button
            key={row.id}
            type="button"
            className={`chip${filter === row.id ? ' is-on' : ''}`}
            role="tab"
            aria-selected={filter === row.id}
            onClick={() => setFilter(row.id)}
          >
            {row.label}
          </button>
        ))}
      </div>
      <div className="scene-list">
        <div className="abil-column__toolbar features-panel__collapse-bar">
          <button type="button" className="ghost" onClick={() => setOpen(false)}>▲ Свернуть все</button>
          <button type="button" className="ghost" onClick={() => setOpen(true)}>▼ Развернуть все</button>
        </div>
        {open
          ? groups.map((group) => (
              <div key={group.title} className="feat-group">
                <div className="feat-group__title">
                  {group.title.split(' · ')[0]} <span className="feat-group__count">· {group.items.length}</span>
                </div>
                {group.items.map((item) => (
                  <article key={item.name} className="scene-card is-feat">
                    <div className="scene-card__hit">
                      <span aria-hidden="true" />
                      <button type="button" data-abil-toggle>
                        <span className="scene-card__name">
                          {item.name} <span className="src-tag">{item.source}</span>
                        </span>
                        <span className="scene-card__meta">{item.meta}</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ))
          : null}
      </div>
    </>
  )
}
