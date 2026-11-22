type Skill = { name: string; roll: string; on?: boolean }
type Ability = {
  id: string
  name: string
  score: string
  effective?: string
  check: string
  save: string
  saveOn?: boolean
  skills: Skill[]
}

/** Kaedrin rail as shown by the live sheet-desktop.html after gear. */
const ABILITIES: Ability[] = [
  { id: 'str', name: 'Сила', score: '16', effective: '→ 18', check: '+4', save: '+5', skills: [{ name: 'Атлетика', roll: '+4' }] },
  {
    id: 'dex',
    name: 'Ловкость',
    score: '12',
    check: '+1',
    save: '+2',
    skills: [
      { name: 'Акробатика', roll: '+1' },
      { name: 'Скрытность', roll: '+1' },
      { name: 'Ловкость рук', roll: '+1' },
    ],
  },
  { id: 'con', name: 'Телосложение', score: '15', check: '+2', save: '+3', skills: [] },
  {
    id: 'int',
    name: 'Интеллект',
    score: '10',
    check: '0',
    save: '+1',
    skills: [
      { name: 'Религия', roll: '+3', on: true },
      { name: 'История', roll: '0' },
      { name: 'Магия', roll: '0' },
      { name: 'Природа', roll: '0' },
      { name: 'Анализ', roll: '0' },
    ],
  },
  {
    id: 'wis',
    name: 'Мудрость',
    score: '16',
    check: '+3',
    save: '+7',
    saveOn: true,
    skills: [
      { name: 'Проницательность', roll: '+6', on: true },
      { name: 'Медицина', roll: '+6', on: true },
      { name: 'Внимательность', roll: '+3' },
      { name: 'Выживание', roll: '+3' },
      { name: 'Уход за животными', roll: '+3' },
    ],
  },
  {
    id: 'cha',
    name: 'Харизма',
    score: '13',
    check: '+1',
    save: '+5',
    saveOn: true,
    skills: [
      { name: 'Убеждение', roll: '+4', on: true },
      { name: 'Обман', roll: '+1' },
      { name: 'Запугивание', roll: '+1' },
      { name: 'Выступление', roll: '+1' },
    ],
  },
]

/** Desktop ability rail from sheet-desktop.html. Phone keeps AbilitySkillsColumn. */
export function AbilityEtalonRail() {
  return (
    <aside className="rail desk-rail" data-panel="rail" aria-label="Характеристики">
      <div className="rail-toolbar">
        <button type="button" className="rail-toolbar__help" aria-label="Подсказка рейки">?</button>
      </div>
      <div className="rail-scroll">
        {ABILITIES.map((ability) => (
          <article key={ability.id} className="abil is-open" data-abil={ability.id}>
            <div className="abil__head">
              <div className="abil__label">
                <button type="button" className="abil__name">{ability.name}</button>
                <button type="button" className="abil__chev-btn" aria-expanded="true">
                  <span className="abil__chev" aria-hidden="true" />
                </button>
              </div>
              <div className="abil__meta">
                <span className="abil__score-wrap">
                  <span className="abil__score num">{ability.score}</span>
                  {ability.effective ? <span className="abil__effective is-buffed">{ability.effective}</span> : null}
                </span>
                <button type="button" className="abil__mod num"><span className="abil-mod__tag">Пр</span> {ability.check}</button>
                <span className="abil-mod-pair">
                  <button type="button" className={`abil-prof-pip${ability.saveOn ? ' is-on' : ''}`} aria-pressed={ability.saveOn || false} />
                  <button type="button" className={`abil__mod num${ability.saveOn ? ' is-on' : ''}`}><span className="abil-mod__tag">Сп</span> {ability.save}</button>
                </span>
              </div>
            </div>
            <div className="skills">
              {ability.skills.length === 0 ? <p className="abil-block__empty">—</p> : null}
              {ability.skills.map((skill) => (
                <div key={skill.name} className={`skill${skill.on ? ' is-on' : ''}`}>
                  <button type="button" className={`abil-prof-pip${skill.on ? ' is-on' : ''}`} aria-pressed={skill.on || false} />
                  <button type="button" className="skill__name">{skill.name}</button>
                  <button type="button" className="skill__roll num">{skill.roll}</button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="rail-foot">
        <section className="rail-passives" aria-label="Пассивы">
          <div className="rail-passives__label">Пассивы</div>
          <div className="passive-grid passive-grid--desk">
            <div className="passive-card"><span className="passive-card__label">Внимат.</span><strong className="num">13</strong></div>
            <div className="passive-card"><span className="passive-card__label">Анализ</span><strong className="num">10</strong></div>
            <div className="passive-card"><span className="passive-card__label">Прониц.</span><strong className="num">16</strong></div>
            <button type="button" className="passive-card"><span className="passive-card__label">ТЗ</span><strong className="num">60 фт</strong></button>
          </div>
        </section>
        <section className="ownership-summary is-collapsed" aria-label="Владения">
          <div className="ownership-summary__head">
            <button type="button" className="ownership-summary__open"><span className="ownership-summary__title">Владения</span></button>
            <button type="button" className="ownership-summary__toggle" aria-expanded="false"><span aria-hidden="true">▸</span></button>
          </div>
        </section>
      </div>
    </aside>
  )
}
