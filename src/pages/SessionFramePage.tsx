import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppNav } from '../components/AppNav';
import { useCharacters } from '../store/characters';
import { useTable } from '../store/table';
import { abilityModifier, formatMod } from '../types/character';

export function SessionFramePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { characters, getById } = useCharacters();
  const {
    getSession,
    getSetting,
    updateSession,
    deleteSession,
    addCharacterToSession,
    removeCharacterFromSession,
  } = useTable();
  const session = getSession(id);

  if (!session) {
    return <Navigate to="/sessions" replace />;
  }

  const setting = session.settingId ? getSetting(session.settingId) : undefined;
  const seated = session.characterIds
    .map((cid) => getById(cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const available = characters.filter((c) => !session.characterIds.includes(c.id));

  return (
    <div className="app-shell">
      <header className="toolbar no-print">
        <div className="toolbar__brand">
          <Link to="/sessions" className="toolbar__back">
            ← К сессиям
          </Link>
          <div>
            {session.name}
            <small>
              {setting ? `Сессия · ${setting.name}` : 'Сессия · ваншот'}
            </small>
          </div>
        </div>
        <AppNav />
        <div className="toolbar__controls">
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              if (confirm('Закрыть и удалить эту сессию? Персонажи в лобби останутся.')) {
                deleteSession(session.id);
                navigate('/sessions');
              }
            }}
          >
            Удалить сессию
          </button>
        </div>
        <p className="toolbar__note">
          Фрейм стола: кто играет сегодня. Бой и лут появятся здесь же. Сеттинг для мира — отдельно
          и необязательно.
        </p>
      </header>

      <main className="list-viewport">
        <section className="card-panel">
          <div className="card-form">
            <label>
              Название
              <input
                value={session.name}
                onChange={(e) => updateSession({ ...session, name: e.target.value })}
              />
            </label>
          </div>
          <p className="session-bind">
            {setting ? (
              <Link to={`/settings/${setting.id}`}>Мир: {setting.name}</Link>
            ) : (
              <span className="badge">Ваншот — без сеттинга</span>
            )}
          </p>
        </section>

        <section className="stack-gap">
          <h2 className="section-title">За столом</h2>
          {seated.length === 0 ? (
            <p className="empty-state">Никого нет. Добавьте персонажей из лобби.</p>
          ) : (
            <div className="character-grid">
              {seated.map((c) => (
                <article className="character-card character-card--frame" key={c.id}>
                  <div className="character-card__top">
                    <h2>{c.name || 'Безымянный персонаж'}</h2>
                    <p>
                      {c.race || '—'} · {c.classAndLevel || 'класс не указан'}
                    </p>
                  </div>
                  <dl className="character-card__stats">
                    <div>
                      <dt>КЗ</dt>
                      <dd>{c.armorClass || '—'}</dd>
                    </div>
                    <div>
                      <dt>Хиты</dt>
                      <dd>
                        {c.hitPointCurrent || '0'}/{c.hitPointMax || '0'}
                      </dd>
                    </div>
                    <div>
                      <dt>Иниц.</dt>
                      <dd>{c.initiative || formatMod(abilityModifier(c.abilities.dexterity))}</dd>
                    </div>
                    <div>
                      <dt>БВ</dt>
                      <dd>+{c.proficiencyBonus}</dd>
                    </div>
                  </dl>
                  <div className="character-card__actions">
                    <Link className="btn" to={`/characters/${c.id}`}>
                      Карточка
                    </Link>
                    <Link className="btn" to={`/characters/${c.id}/sheet`}>
                      Лист
                    </Link>
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => removeCharacterFromSession(session.id, c.id)}
                    >
                      Убрать со стола
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card-panel stack-gap">
          <h2>Добавить из лобби</h2>
          {available.length === 0 ? (
            <p className="card-panel__hint">
              Все персонажи лобби уже за столом.{' '}
              <Link to="/">Создать ещё в лобби</Link>
            </p>
          ) : (
            <ul className="plain-list">
              {available.map((c) => (
                <li key={c.id}>
                  <span>
                    <strong>{c.name || 'Безымянный персонаж'}</strong>
                    <span className="muted">
                      {' '}
                      · {c.classAndLevel || 'без класса'}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => addCharacterToSession(session.id, c.id)}
                  >
                    За стол
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-panel">
          <h2>Бой</h2>
          <p className="card-panel__hint">
            Подготовка боя и лут появятся на этом уровне — в сессии, а не в сеттинге.
          </p>
        </section>
      </main>
    </div>
  );
}
