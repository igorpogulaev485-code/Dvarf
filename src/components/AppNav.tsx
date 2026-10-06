import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: 'Лобби', end: true },
  { to: '/settings', label: 'Сеттинги', end: false },
  { to: '/sessions', label: 'Сессии', end: false },
] as const;

export function AppNav() {
  return (
    <nav className="app-nav" aria-label="Разделы">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? 'app-nav__link is-active' : 'app-nav__link')}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
