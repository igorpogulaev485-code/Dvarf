import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppNav } from '../components/AppNav';
import { formatUpdated } from '../lib/format';
import { useTable } from '../store/table';
import { isOneshot } from '../types/table';

export function SessionListPage() {
  const { sessions, settings, createSession } = useTable();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [settingId, setSettingId] = useState<string>('');

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    const linked = settingId || null;
    const setting = linked ? settings.find((s) => s.id === linked) : undefined;
    const created = createSession({
      name:
        name.trim() ||
        (setting ? `${setting.name} — сессия` : 'Ваншот'),
      settingId: linked,
    });
    setName('');
    setSettingId('');
    navigate(`/sessions/${created.id}`);
  };

  return (
    <div className="app-shell">
      <header className="toolbar no-print">
        <div className="toolbar__brand">
          Dvarf
          <small>Сессии — сегодняшний стол</small>
        </div>
        <AppNav />
        <p className="toolbar__note">
          Сессия может быть без сеттинга (ваншот). Бой и лут будут жить здесь.
        </p>
      </header>

      <main className="list-viewport">
        <form className="create-row" onSubmit={onCreate}>
          <label>
            Название сессии
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваншот в таверне, глава 3…"
            />
          </label>
          <label>
            Сеттинг
            <select value={settingId} onChange={(e) => setSettingId(e.target.value)}>
              <option value="">Ваншот — без сеттинга</option>
              {settings.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">+ Открыть сессию</button>
        </form>

        {sessions.length === 0 ? (
          <p className="empty-state">Нет открытых столов. Соберите ваншот или сессию в сеттинге.</p>
        ) : (
          <div className="character-grid">
            {sessions.map((session) => {
              const setting = session.settingId
                ? settings.find((s) => s.id === session.settingId)
                : undefined;
              return (
                <article className="character-card" key={session.id}>
                  <div className="character-card__top">
                    <h2>{session.name}</h2>
                    <p>
                      {isOneshot(session) || !setting ? (
                        <span className="badge">Ваншот</span>
                      ) : (
                        <>Сеттинг: {setting.name}</>
                      )}
                    </p>
                  </div>
                  <p className="character-card__meta">
                    В составе: {session.characterIds.length} · обновлена{' '}
                    {formatUpdated(session.updatedAt)}
                  </p>
                  <div className="character-card__actions">
                    <Link className="btn btn--primary" to={`/sessions/${session.id}`}>
                      Открыть стол
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
