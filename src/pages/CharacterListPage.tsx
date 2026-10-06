import { Link, useNavigate } from 'react-router-dom';
import { useCharacters } from '../store/characters';
import { formatMod, abilityModifier } from '../types/character';

function formatUpdated(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CharacterListPage() {
  const { characters, createCharacter, deleteCharacter } = useCharacters();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="toolbar no-print">
        <div className="toolbar__brand">
          Dvarf
          <small>Мои персонажи</small>
        </div>
        <div className="toolbar__controls">
          <button
            type="button"
            onClick={() => {
              const created = createCharacter();
              navigate(`/characters/${created.id}`);
            }}
          >
            + Новый персонаж
          </button>
        </div>
        <p className="toolbar__note">
          Как у ЛСС: карточка и классический лист — один персонаж. Правки на листе сразу видны в
          карточке.
        </p>
      </header>

      <main className="list-viewport">
        <div className="character-grid">
          {characters.map((c) => (
            <article className="character-card" key={c.id}>
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
              <p className="character-card__meta">Обновлён {formatUpdated(c.updatedAt)}</p>
              <div className="character-card__actions">
                <Link className="btn btn--primary" to={`/characters/${c.id}`}>
                  Карточка
                </Link>
                <Link className="btn" to={`/characters/${c.id}/sheet`}>
                  Открыть лист
                </Link>
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => {
                    if (confirm(`Удалить «${c.name || 'персонажа'}»?`)) deleteCharacter(c.id);
                  }}
                >
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
