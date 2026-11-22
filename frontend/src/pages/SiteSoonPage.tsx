import { Link } from 'react-router-dom'
import { AppShell } from '../features/shell/AppShell'

export function SiteSoonPage() {
  return (
    <AppShell
      section="site"
      title="Сайт КриD20"
      subtitle="Официальный свод ещё готовится. Ниже — летопись того, что уже делается за створками."
    >
      <article className="site-soon">
        <div className="site-soon__illu" aria-hidden="true">
          <span className="site-soon__mark" title="Кирка">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 8.5c4.5-1 8-1 13 3.5" />
              <path d="M8.2 11.2 19.5 21" />
              <path d="M4 7.2l2.2 2.2" />
            </svg>
          </span>
          <span className="site-soon__mark" title="Шестерёнка">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <g className="site-soon__gear">
                <circle cx="12" cy="12" r="3.4" />
                <rect x="10.7" y="2.2" width="2.6" height="3.4" rx="0.5" />
                <rect x="10.7" y="18.4" width="2.6" height="3.4" rx="0.5" />
                <rect x="2.2" y="10.7" width="3.4" height="2.6" rx="0.5" />
                <rect x="18.4" y="10.7" width="3.4" height="2.6" rx="0.5" />
              </g>
            </svg>
          </span>
          <span className="site-soon__mark" title="Свиток">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 6.5c0-1.4 1.2-2.5 2.6-2.5H18v13.2c0 1.2-1 2.2-2.2 2.2H8.8" />
              <path d="M7 6.5v11c0 1.4-1.2 2.5-2.6 2.5S1.8 18.9 1.8 17.5 3 15 4.4 15H7" />
              <path d="M10 9h5.2M10 12h5.2M10 15h3.2" />
            </svg>
          </span>
          <span className="site-soon__mark site-soon__mark--forge" title="Наковальня">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9.2h16l-1.2 3.2H8.2L4 9.2Z" />
              <path d="M6.2 12.4V15H18v-2.6" />
              <path d="M8 15v3.2h8V15" />
              <path d="M7.2 18.2h9.6" />
            </svg>
            <i className="site-soon__spark site-soon__spark--a" />
            <i className="site-soon__spark site-soon__spark--b" />
            <i className="site-soon__spark site-soon__spark--c" />
          </span>
          <span className="site-soon__mark" title="Компас картографа">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <path d="m12 5.5 2.2 6.3L12 18.5 9.8 11.8 12 5.5Z" />
              <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
            </svg>
          </span>
        </div>
        <h2>Пока куются врата</h2>
        <p className="site-soon__lead">
          За этими створками пахнет каменной пылью и тёплым металлом. Место уже задумано — его только доделывают.
        </p>
        <section>
          <h3>Глубины</h3>
          <p>
            Внизу дварфы добывают камень и кладут первые ряды. Кирки стучат ровно, опоры встают без щели: фундамент должен держать весь дом, когда через порог ступит первый гость.
          </p>
        </section>
        <section>
          <h3>Мастерская шестерёнок</h3>
          <p>
            Гномы-изобретатели собирают механизмы. Зубцы сходятся, пружины поют тихо. Здесь рождается то, чем потом будет удобно пользоваться — без лишнего скрипа и без загадок.
          </p>
        </section>
        <section>
          <h3>Свитки справочника</h3>
          <p>
            У высоких столов эльфы-писцы ведут строки справочника: правила, травы, звери, пометки на полях. Перо не спешит. Каждая буква ляжет так, чтобы путник нашёл нужную страницу с первого раза.
          </p>
        </section>
        <section>
          <h3>Горн, карты и баллада</h3>
          <p>
            В кузнице пышет горн: кузнецы куют петли, скобы и кольца для будущих врат. Рядом маг-картограф чертит дороги — от лобби к столу, от кабинета к книге. А в углу бард уже тихо подбирает балладу на тот вечер, когда створки распахнутся.
          </p>
        </section>
        <p className="site-soon__close">Скоро врата откроются…</p>
        <div className="site-soon__actions">
          <Link className="ui-button" to="/characters">
            Вернуться к персонажам
          </Link>
          <Link className="ui-button ui-button--secondary" to="/lobbies">
            Пока загляните в Лобби
          </Link>
        </div>
      </article>
    </AppShell>
  )
}
