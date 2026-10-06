import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppNav } from '../components/AppNav';
import { formatUpdated } from '../lib/format';
import { useTable } from '../store/table';

export function SettingListPage() {
  const { settings, sessions, createSetting } = useTable();
  const navigate = useNavigate();
  const [name, setName] = useState('');

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    const created = createSetting({ name: name.trim() || 'Новый сеттинг' });
    setName('');
    navigate(`/settings/${created.id}`);
  };

  return (
    <div className="app-shell">
      <header className="toolbar no-print">
        <div className="toolbar__brand">
          Dvarf
          <small>Сеттинги — мир и кампания</small>
        </div>
        <AppNav />
        <p className="toolbar__note">
          Сеттинг необязателен: ваншот идёт сразу в сессию. У одного сеттинга может быть несколько
          сессий.
        </p>
      </header>

      <main className="list-viewport">
        <form className="create-row" onSubmit={onCreate}>
          <label>
            Название сеттинга
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Забытые Королевства, своя кампания…"
            />
          </label>
          <button type="submit">+ Создать сеттинг</button>
        </form>

        {settings.length === 0 ? (
          <p className="empty-state">Пока нет сеттингов. Можно играть ваншотом — откройте Сессии.</p>
        ) : (
          <div className="character-grid">
            {settings.map((setting) => {
              const count = sessions.filter((s) => s.settingId === setting.id).length;
              return (
                <article className="character-card" key={setting.id}>
                  <div className="character-card__top">
                    <h2>{setting.name}</h2>
                    <p>{setting.worldNotes.trim() ? setting.worldNotes : 'Мир пока не описан'}</p>
                  </div>
                  <p className="character-card__meta">
                    Сессий: {count} · обновлён {formatUpdated(setting.updatedAt)}
                  </p>
                  <div className="character-card__actions">
                    <Link className="btn btn--primary" to={`/settings/${setting.id}`}>
                      Открыть
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
