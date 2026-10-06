import { Link, useNavigate } from 'react-router-dom';
import { AppNav } from '../components/AppNav';
import { formatUpdated } from '../lib/format';
import { useCharacters } from '../store/characters';
import { useTable } from '../store/table';
import { formatMod, abilityModifier } from '../types/character';

export function CharacterListPage() {
  const { characters, createCharacter, deleteCharacter } = useCharacters();
  const { purgeCharacter } = useTable();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="toolbar no-print">
        <div className="toolbar__brand">
          Dvarf
          <small>Лобби — все персонажи</small>
        </div>
        <AppNav />
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
          Из лобби персонажей берут в сессию. Карточка и классический лист — один персонаж.
        </p>
      </header>

      <main className="list-viewport">
        {characters.length === 0 ? (
          <p className="empty-state">В лобби пока никого нет. Создайте первого персонажа.</p>
        ) : (
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
                      if (confirm(`Удалить «${c.name || 'персонажа'}»?`)) {
                        purgeCharacter(c.id);
                        deleteCharacter(c.id);
                      }
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
