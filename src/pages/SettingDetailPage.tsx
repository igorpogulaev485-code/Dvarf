import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppNav } from '../components/AppNav';
import { formatUpdated } from '../lib/format';
import { useTable } from '../store/table';

export function SettingDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const {
    getSetting,
    updateSetting,
    deleteSetting,
    sessionsForSetting,
    createSession,
  } = useTable();
  const setting = getSetting(id);

  if (!setting) {
    return <Navigate to="/settings" replace />;
  }

  const settingSessions = sessionsForSetting(setting.id);

  return (
    <div className="app-shell">
      <header className="toolbar no-print">
        <div className="toolbar__brand">
          <Link to="/settings" className="toolbar__back">
            ← К сеттингам
          </Link>
          <div>
            {setting.name}
            <small>Сеттинг · зона мастера</small>
          </div>
        </div>
        <AppNav />
        <div className="toolbar__controls">
          <button
            type="button"
            onClick={() => {
              const created = createSession({
                name: `${setting.name} — сессия`,
                settingId: setting.id,
              });
              navigate(`/sessions/${created.id}`);
            }}
          >
            + Сессия в этом сеттинге
          </button>
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              if (
                confirm(
                  'Удалить сеттинг? Его сессии останутся ваншотами (без привязки к миру).',
                )
              ) {
                deleteSetting(setting.id);
                navigate('/settings');
              }
            }}
          >
            Удалить
          </button>
        </div>
      </header>

      <main className="list-viewport">
        <section className="card-panel">
          <h1>Мир</h1>
          <p className="card-panel__hint">
            Здесь позже вырастет блок про мир. Пока это заметки мастера — игрокам можно будет
            открыть отдельно.
          </p>
          <div className="card-form">
            <label className="card-form__wide">
              Название
              <input
                value={setting.name}
                onChange={(e) => updateSetting({ ...setting, name: e.target.value })}
              />
            </label>
            <label className="card-form__wide">
              Заметки о мире
              <textarea
                rows={8}
                value={setting.worldNotes}
                onChange={(e) => updateSetting({ ...setting, worldNotes: e.target.value })}
                placeholder="География, фракции, тон кампании…"
              />
            </label>
          </div>
        </section>

        <section className="card-panel stack-gap">
          <h2>Сессии этого сеттинга</h2>
          {settingSessions.length === 0 ? (
            <p className="empty-state empty-state--inline">
              Сессий ещё нет. Откройте стол для сегодняшней игры — или создайте ваншот в разделе
              Сессии, без сеттинга.
            </p>
          ) : (
            <ul className="plain-list">
              {settingSessions.map((session) => (
                <li key={session.id}>
                  <Link to={`/sessions/${session.id}`}>{session.name}</Link>
                  <span>
                    {session.characterIds.length} персонаж(ей) · {formatUpdated(session.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
